"""Statement processing pipeline combining OCR, ledger extraction, and AI reporting."""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import warnings
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd

from apps.domain.schemas.mistral import MistralOcrResponse
from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
from apps.domain.services.reports import AiReportService
from apps.infra.jobs.store import InMemoryJobStore
from apps.legacy_bridge.adapter import run_legacy

try:  # pandas optional import for warnings
    from pandas.errors import SettingWithCopyWarning
except Exception:  # pragma: no cover
    SettingWithCopyWarning = Warning  # type: ignore[assignment]


LOGGER = logging.getLogger(__name__)


@dataclass
class StatementJobContext:
    job_id: str
    file_path: Path
    file_name: str
    prompt: str | None
    template: str | None


class StatementPipelineService:
    """Coordinates OCR, legacy extraction, and AI reporting for statements."""

    def __init__(
        self,
        *,
        mistral_service: MistralOcrService,
        report_service: AiReportService,
        job_store: InMemoryJobStore,
        workspace_dir: Path,
    ) -> None:
        self._mistral = mistral_service
        self._reports = report_service
        self._jobs = job_store
        self._workspace = workspace_dir
        self._workspace.mkdir(parents=True, exist_ok=True)

    def _job_dir(self, job_id: str) -> Path:
        job_dir = self._workspace / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    async def create_job(
        self,
        *,
        file_bytes: bytes,
        file_name: str,
        prompt: str | None,
        template: str | None,
    ) -> dict[str, Any]:
        job = await self._jobs.create(payload={"file_name": file_name, "prompt": prompt, "template": template})
        job_dir = self._job_dir(job.job_id)
        pdf_path = job_dir / file_name
        pdf_path.write_bytes(file_bytes)

        context = StatementJobContext(
            job_id=job.job_id,
            file_path=pdf_path,
            file_name=file_name,
            prompt=prompt,
            template=template,
        )

        asyncio.create_task(self._run_job(context))
        return job.as_dict()

    async def _run_job(self, context: StatementJobContext) -> None:
        LOGGER.info("Job %s accepted (file=%s)", context.job_id, context.file_name)
        await self._jobs.update(context.job_id, status="running")
        stages: list[dict[str, Any]] = []
        started_at = datetime.now(timezone.utc)
        job_dir = self._job_dir(context.job_id)

        try:
            download_token = uuid4().hex
            result: dict[str, Any] = {
                "file_name": context.file_name,
                "excel": {"path": None, "download_token": download_token},
                "report": None,
                "ocr": None,
                "preview": None,
                "stages": stages,
                "started_at": started_at.isoformat(),
                "completed_at": None,
                "report_template": context.template,
            }
            LOGGER.debug("Job %s stage=queued payload=%s", context.job_id, result)
            await self._jobs.update(context.job_id, result=result)

            stage_start = datetime.now(timezone.utc)
            ocr_result = await self._run_ocr(context)
            result["ocr"] = self._trim_ocr_payload(ocr_result)
            stages.append(self._stage("OCR & parsing", stage_start))
            LOGGER.info("Job %s OCR complete", context.job_id)
            LOGGER.debug("Job %s stages=%s", context.job_id, stages)
            await self._jobs.update(context.job_id, result=result)

            stage_start = datetime.now(timezone.utc)
            excel_path, legacy_summary, preview = await asyncio.to_thread(
                self._run_legacy,
                context,
                job_dir,
            )
            result["excel"] = {"path": excel_path, "download_token": download_token}
            result["preview"] = preview
            stages.append(self._stage("Ledger normalisation", stage_start))
            LOGGER.info("Job %s ledger normalised (excel=%s)", context.job_id, excel_path)
            LOGGER.debug("Job %s stages=%s preview_rows=%s", context.job_id, stages, len(preview.get("transactions", [])))
            await self._jobs.update(context.job_id, result=result)

            report_payload = None
            if self._reports.available():
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
                    LOGGER.info("Job %s AI report generated", context.job_id)
                    LOGGER.debug("Job %s report plan keys=%s", context.job_id, report_payload.keys())
                    await self._jobs.update(context.job_id, result=result)

            completed_at = datetime.now(timezone.utc)
            result["completed_at"] = completed_at.isoformat()
            result["total_duration_ms"] = int((completed_at - started_at).total_seconds() * 1000)

            LOGGER.info("Job %s completed", context.job_id)
            await self._jobs.update(context.job_id, status="completed", result=result)
        except Exception as exc:  # pragma: no cover - best effort demo error handling
            LOGGER.exception("Job %s failed: %s", context.job_id, exc)
            await self._jobs.update(context.job_id, status="failed", error=str(exc))

    def _stage(self, name: str, started_at: datetime) -> dict[str, Any]:
        finished = datetime.now(timezone.utc)
        duration_ms = int((finished - started_at).total_seconds() * 1000)
        return {"name": name, "duration_ms": duration_ms, "finished_at": finished.isoformat()}

    async def get_job(self, job_id: str) -> dict[str, Any]:
        record = await self._jobs.get(job_id)
        return record.as_dict()

    async def list_jobs(self) -> list[dict[str, Any]]:
        records = await self._jobs.list()
        return [record.as_dict() for record in records]

    async def read_excel(self, job_id: str, token: str) -> Path:
        record = await self._jobs.get(job_id)
        if not record.result:
            raise FileNotFoundError("Job not completed")
        excel_info = record.result.get("excel", {})
        if excel_info.get("download_token") != token:
            raise PermissionError("Invalid download token")
        path_raw = excel_info.get("path")
        if not path_raw:
            raise FileNotFoundError("Excel export not ready")
        path = Path(path_raw)
        if not path.exists():
            raise FileNotFoundError(path)
        return path

    async def read_report(self, job_id: str) -> Path:
        record = await self._jobs.get(job_id)
        if not record.result:
            raise FileNotFoundError("Job not completed")
        report_info = record.result.get("report")
        if not report_info:
            raise FileNotFoundError("Report not available")
        path = Path(report_info["pdf_path"])
        if not path.exists():
            raise FileNotFoundError(path)
        return path

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
            excel_path, summary = run_legacy([str(context.file_path)])

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
        job_id: str,
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

    def cleanup(self, job_id: str) -> None:
        job_dir = self._job_dir(job_id)
        shutil.rmtree(job_dir, ignore_errors=True)
