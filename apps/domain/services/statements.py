"""Statement processing pipeline combining OCR, ledger extraction, and AI reporting."""

from __future__ import annotations

import asyncio
import logging
import shutil
import warnings
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import uuid

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from apps.domain.repositories import EntityRepository, StatementJobRepository
from apps.domain.schemas.mistral import MistralOcrResponse
from apps.domain.services.custom_entities import CustomEntityService
from apps.domain.services.entity_extraction import EntityExtractionService
from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
from apps.domain.services.reports import AiReportService
from apps.legacy_bridge.adapter import run_legacy

try:  # pandas optional import for warnings
    from pandas.errors import SettingWithCopyWarning
except Exception:  # pragma: no cover
    SettingWithCopyWarning = Warning  # type: ignore[assignment]


LOGGER = logging.getLogger(__name__)


@dataclass
class StatementJobContext:
    job_id: uuid.UUID
    download_token: uuid.UUID
    file_path: Path
    file_name: str
    bank_name: str | None
    password: str | None
    financial_year: str | None
    prompt: str | None
    template: str | None

    def parse_financial_year(self) -> tuple[str, str]:
        """Parse financial year (e.g., '2022-2023') into start and end dates.

        Returns:
            Tuple of (start_date, end_date) in format 'DD-MM-YYYY'
            For Indian FY: start is 01-04-YYYY, end is 31-03-YYYY+1
        """
        if not self.financial_year:
            return ("", "")

        try:
            # Handle formats like "2022-2023" or "2022-23"
            parts = self.financial_year.split("-")
            start_year = int(parts[0])

            if len(parts[1]) == 2:
                end_year = int(f"20{parts[1]}")
            else:
                end_year = int(parts[1])

            # Indian Financial Year: April 1 to March 31
            start_date = f"01-04-{start_year}"
            end_date = f"31-03-{end_year}"

            return (start_date, end_date)
        except (ValueError, IndexError):
            LOGGER.warning(f"Invalid financial year format: {self.financial_year}, using empty dates")
            return ("", "")


class StatementPipelineService:
    """Coordinates OCR, legacy extraction, and AI reporting for statements."""

    def __init__(
        self,
        *,
        mistral_service: MistralOcrService,
        report_service: AiReportService,
        session_factory: async_sessionmaker[AsyncSession],
        workspace_dir: Path,
    ) -> None:
        self._mistral = mistral_service
        self._reports = report_service
        self._entity_extractor = EntityExtractionService()
        self._session_factory = session_factory
        self._workspace = workspace_dir
        self._workspace.mkdir(parents=True, exist_ok=True)

    def _job_dir(self, job_id: uuid.UUID) -> Path:
        job_dir = self._workspace / str(job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    async def create_job(
        self,
        *,
        file_bytes: bytes,
        file_name: str,
        bank_name: str | None,
        password: str | None,
        financial_year: str | None,
        prompt: str | None,
        template: str | None,
    ) -> dict[str, Any]:
        download_token = uuid.uuid4()
        payload = {
            "file_name": file_name,
            "bank_name": bank_name,
            "password": password,
            "financial_year": financial_year,
            "prompt": prompt,
            "template": template,
        }

        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            job = await repo.create_job(
                file_name=file_name,
                bank_name=bank_name,
                payload=payload,
                download_token=download_token,
            )
            await session.commit()
            await session.refresh(job)
            job_snapshot = job.as_dict()

        job_dir = self._job_dir(job.id)
        pdf_path = job_dir / file_name
        pdf_path.write_bytes(file_bytes)

        context = StatementJobContext(
            job_id=job.id,
            download_token=download_token,
            file_path=pdf_path,
            file_name=file_name,
            bank_name=bank_name,
            password=password,
            financial_year=financial_year,
            prompt=prompt,
            template=template,
        )

        # Enqueue Celery task for background processing
        from apps.tasks.statements import process_statement_task

        process_statement_task.apply_async(
            kwargs={
                "job_id": str(job.id),
                "download_token": str(download_token),
                "file_path": str(pdf_path),
                "file_name": file_name,
                "bank_name": bank_name,
                "password": password,
                "financial_year": financial_year,
                "prompt": prompt,
                "template": template,
            },
            task_id=str(job.id),  # Use job ID as task ID for tracking
        )

        return job_snapshot

    async def _run_job(self, context: StatementJobContext) -> None:
        job_id_str = str(context.job_id)
        LOGGER.info("Job %s accepted (file=%s)", job_id_str, context.file_name)
        stages: list[dict[str, Any]] = []
        started_at = datetime.now(timezone.utc)
        job_dir = self._job_dir(context.job_id)

        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            entity_repo = EntityRepository(session)
            entity_service = CustomEntityService(session)

            await repo.update_fields(context.job_id, status="running")
            await session.commit()

            result: dict[str, Any] = {
                "file_name": context.file_name,
                "excel": {"path": None, "download_token": str(context.download_token)},
                "report": None,
                "ocr": None,
                "preview": None,
                "stages": stages,
                "started_at": started_at.isoformat(),
                "completed_at": None,
                "report_template": context.template,
            }
            LOGGER.debug("Job %s stage=queued payload=%s", job_id_str, result)
            await repo.update_fields(context.job_id, result=result)
            await session.commit()

            try:
                ocr_result: MistralOcrResponse | None = None
                if self._mistral and hasattr(self._mistral, "analyze"):
                    try:
                        stage_start = datetime.now(timezone.utc)
                        ocr_result = await self._run_ocr(context)
                        result["ocr"] = self._trim_ocr_payload(ocr_result)
                        stages.append(self._stage("OCR & parsing", stage_start))
                        LOGGER.info("Job %s OCR complete", job_id_str)
                        await repo.update_fields(context.job_id, result=result)
                        await session.commit()
                    except Exception as ocr_error:
                        LOGGER.warning("Job %s OCR skipped: %s", job_id_str, ocr_error)

                stage_start = datetime.now(timezone.utc)
                excel_path, legacy_summary, preview = await asyncio.to_thread(
                    self._run_legacy,
                    context,
                    job_dir,
                )
                result["excel"] = {
                    "path": excel_path,
                    "download_token": str(context.download_token),
                }
                result["preview"] = preview
                result["sheets_available"] = bool(legacy_summary.get("sheets_data"))
                stages.append(self._stage("Ledger normalisation", stage_start))
                LOGGER.info("Job %s ledger normalised (excel=%s)", job_id_str, excel_path)
                await repo.update_fields(context.job_id, result=result)
                await session.commit()

                stage_start = datetime.now(timezone.utc)
                entity_count = await self._perform_entity_matching(
                    session=session,
                    entity_service=entity_service,
                    entity_repo=entity_repo,
                    job_id=context.job_id,
                    excel_path=excel_path,
                )
                if entity_count > 0:
                    result["entity_count"] = entity_count
                    stages.append(self._stage("Entity extraction", stage_start))
                    LOGGER.info(
                        "Job %s entities extracted (found in %d descriptions)",
                        job_id_str,
                        entity_count,
                    )
                    await repo.update_fields(context.job_id, result=result)
                    await session.commit()

                if self._reports.available() and ocr_result:
                    stage_start = datetime.now(timezone.utc)
                    report_payload = await asyncio.to_thread(
                        self._build_report,
                        legacy_summary,
                        ocr_result,
                        context.prompt,
                        context.template,
                        context.job_id,
                    )
                    if report_payload:
                        result["report"] = report_payload
                        stages.append(self._stage("AI custom report", stage_start))
                        LOGGER.info("Job %s AI report generated", job_id_str)
                        await repo.update_fields(context.job_id, result=result)
                        await session.commit()

                completed_at = datetime.now(timezone.utc)
                result["completed_at"] = completed_at.isoformat()
                result["total_duration_ms"] = int(
                    (completed_at - started_at).total_seconds() * 1000
                )

                LOGGER.info("Job %s completed", job_id_str)
                await repo.update_fields(
                    context.job_id,
                    status="completed",
                    result=result,
                )
                await session.commit()
            except Exception as exc:  # pragma: no cover - best effort demo error handling
                LOGGER.exception("Job %s failed: %s", job_id_str, exc)
                await repo.update_fields(
                    context.job_id,
                    status="failed",
                    error=str(exc),
                )
                await session.commit()

    def _stage(self, name: str, started_at: datetime) -> dict[str, Any]:
        finished = datetime.now(timezone.utc)
        duration_ms = int((finished - started_at).total_seconds() * 1000)
        return {"name": name, "duration_ms": duration_ms, "finished_at": finished.isoformat()}

    async def get_job(self, job_id: str) -> dict[str, Any]:
        job_uuid = uuid.UUID(job_id)
        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            job = await repo.get(job_uuid)
            if not job:
                raise KeyError(job_id)
            return job.as_dict()

    async def list_jobs(self) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            jobs = await repo.list_jobs()
            return [job.as_dict() for job in jobs]

    async def read_excel(self, job_id: str, token: str) -> Path:
        job_uuid = uuid.UUID(job_id)
        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            job = await repo.get(job_uuid)
            if not job or not job.result:
                raise FileNotFoundError("Job not completed")
            if str(job.download_token) != token:
                raise PermissionError("Invalid download token")
            excel_info = job.result.get("excel", {})
            path_raw = excel_info.get("path")
            if not path_raw:
                raise FileNotFoundError("Excel export not ready")
            path = Path(path_raw)
            if not path.exists():
                raise FileNotFoundError(path)
            return path

    async def read_report(self, job_id: str) -> Path:
        job_uuid = uuid.UUID(job_id)
        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            job = await repo.get(job_uuid)
            if not job or not job.result:
                raise FileNotFoundError("Job not completed")
            report_info = job.result.get("report")
            if not report_info:
                raise FileNotFoundError("Report not available")
            path = Path(report_info["pdf_path"])
            if not path.exists():
                raise FileNotFoundError(path)
            return path

    async def get_excel_data(self, job_id: str, token: str) -> dict[str, Any]:
        """Read Excel file and return all sheets with their data as JSON."""
        job_uuid = uuid.UUID(job_id)
        async with self._session_factory() as session:
            repo = StatementJobRepository(session)
            job = await repo.get(job_uuid)
            if not job or not job.result:
                raise FileNotFoundError("Job not completed")
            if str(job.download_token) != token:
                raise PermissionError("Invalid download token")
            excel_info = job.result.get("excel", {})
            path_raw = excel_info.get("path")
            if not path_raw:
                raise FileNotFoundError("Excel export not ready")
            path = Path(path_raw)
            if not path.exists():
                raise FileNotFoundError(path)

        # Read all sheets from Excel file
        excel_file = pd.ExcelFile(path)
        sheets_data = {}

        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(excel_file, sheet_name=sheet_name)
            # Convert DataFrame to dict with proper handling of NaN values
            sheets_data[sheet_name] = {
                "columns": df.columns.tolist(),
                "data": df.fillna("").to_dict(orient="records"),
                "row_count": len(df),
                "column_count": len(df.columns),
            }

        return {
            "job_id": job_id,
            "file_name": job.result.get("file_name", "statement.xlsx"),
            "sheets": sheets_data,
            "sheet_names": excel_file.sheet_names,
        }

    async def _run_ocr(self, context: StatementJobContext) -> MistralOcrResponse:
        with context.file_path.open("rb") as pdf_file:
            document_bytes = pdf_file.read()
        return await self._mistral.analyze(document=document_bytes, options=MistralOcrOptions())

    def _run_legacy(
        self,
        context: StatementJobContext,
        job_dir: Path,
    ) -> tuple[str, dict[str, Any], dict[str, Any]]:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=FutureWarning)
            warnings.filterwarnings("ignore", category=UserWarning)
            warnings.filterwarnings("ignore", category=SettingWithCopyWarning)

            # Parse financial year into start/end dates
            start_date, end_date = context.parse_financial_year()

            # Prepare parameters for legacy system (all must be lists)
            bank_names = [context.bank_name] if context.bank_name else None
            passwords = [context.password] if context.password else None
            start_dates = [start_date] if start_date else None
            end_dates = [end_date] if end_date else None

            excel_path, summary = run_legacy(
                [str(context.file_path)],
                bank_names=bank_names,
                passwords=passwords,
                start_dates=start_dates,
                end_dates=end_dates,
            )

        target_excel = job_dir / "statement.xlsx"
        try:
            shutil.copyfile(excel_path, target_excel)
        except FileNotFoundError:
            target_excel = Path(excel_path)

        summary["excel_path"] = str(target_excel)
        preview = self._build_preview(summary)
        summary["preview"] = preview
        return str(target_excel), summary, preview

    def _trim_ocr_payload(self, ocr: MistralOcrResponse) -> dict[str, Any]:
        first_page = ocr.pages[0] if ocr.pages else None
        return {
            "model": ocr.model,
            "usage": ocr.usage.model_dump(),
            "cost": ocr.cost.model_dump() if ocr.cost else None,
            "first_page_markdown": first_page.markdown if first_page else "",
        }

    def _build_preview(self, summary: dict[str, Any]) -> dict[str, Any]:
        excel_path = summary["excel_path"]
        transactions_preview: list[dict[str, Any]] = []
        totals = {"credits": 0.0, "debits": 0.0}
        try:
            df = pd.read_excel(excel_path, sheet_name="Transactions")
            totals["credits"] = float(df.get("Credit", pd.Series(dtype=float)).fillna(0).sum())
            totals["debits"] = float(df.get("Debit", pd.Series(dtype=float)).fillna(0).sum())
            transactions_preview = df.head(10).fillna("-").to_dict(orient="records")
        except Exception:  # pragma: no cover - defensive
            transactions_preview = []
        return {
            "totals": totals,
            "transactions": transactions_preview,
            "legacy": summary.get("legacy"),
        }

    def _build_report(
        self,
        summary: dict[str, Any],
        ocr_result: MistralOcrResponse,
        prompt: str | None,
        template: str | None,
        job_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        workspace = self._job_dir(job_id) / "report"
        workspace.mkdir(parents=True, exist_ok=True)
        statement_summary = {
            "excel_path": summary.get("excel_path"),
            "legacy": summary.get("legacy"),
            "ocr_usage": ocr_result.usage.model_dump(),
            "ocr_cost": ocr_result.cost.model_dump() if ocr_result.cost else None,
            "preview": summary.get("preview"),
            "pdfs": summary.get("pdfs"),
            "template": template,
        }
        return self._reports.build_report(
            statement_summary=statement_summary,
            prompt=prompt,
            template=template,
            workspace=workspace,
        )

    async def _perform_entity_matching(
        self,
        *,
        session: AsyncSession,
        entity_service: CustomEntityService,
        entity_repo: EntityRepository,
        job_id: uuid.UUID,
        excel_path: str,
    ) -> int:
        try:
            df = pd.read_excel(excel_path, sheet_name="Transactions")
        except Exception as exc:
            LOGGER.warning("Entity extraction skipped for %s: %s", excel_path, exc)
            return 0

        if "Description" not in df.columns:
            LOGGER.warning("Transactions sheet missing Description column; skipping entity extraction")
            return 0

        descriptions = [
            str(value).strip()
            for value in df["Description"].dropna().tolist()
            if str(value).strip()
        ]
        if not descriptions:
            LOGGER.info("No descriptions available for entity extraction")
            return 0

        custom_matches = await entity_service.match_entities_with_entities(
            descriptions,
            increment_counters=True,
        )

        unmatched = [desc for desc, entity in custom_matches.items() if not entity]
        ai_matches = {}
        if unmatched:
            ai_matches = self._entity_extractor.extract_entities_from_descriptions(unmatched)

        combined: dict[str, str] = {}
        for description in descriptions:
            entity = custom_matches.get(description)
            if entity:
                combined[description] = entity.name
            else:
                combined[description] = ai_matches.get(description, "")

        def resolve_source(raw_description: Any) -> str:
            description = str(raw_description).strip()
            if not description:
                return "-"
            entity = custom_matches.get(description)
            if entity:
                return "User Defined"
            match_text = combined.get(description, "")
            return "AI Detected" if match_text else "-"

        df["Entity"] = df["Description"].map(lambda value: combined.get(str(value).strip(), ""))
        df["Entity"] = df["Entity"].replace("", "-")
        df["Entity Source"] = df["Description"].map(resolve_source)

        with pd.ExcelWriter(
            excel_path,
            engine="openpyxl",
            mode="a",
            if_sheet_exists="replace",
        ) as writer:
            df.to_excel(writer, sheet_name="Transactions", index=False)

        match_records = []
        for _, row in df.iterrows():
            description = str(row.get("Description", "")).strip()
            if not description:
                continue
            entity = custom_matches.get(description)
            if not entity:
                continue
            match_records.append((description, entity))

        for description, entity in match_records:
            await entity_repo.record_match(
                entity_id=entity.id,
                statement_job_id=job_id,
                description=description,
                source="user_defined",
            )
        if match_records:
            await session.commit()

        entity_count = sum(1 for value in combined.values() if value)
        return entity_count

    def cleanup(self, job_id: str) -> None:
        job_dir = self._job_dir(job_id)
        shutil.rmtree(job_dir, ignore_errors=True)
