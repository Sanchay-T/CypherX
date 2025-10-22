"""Celery tasks for statement processing."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any
import uuid

from celery import Task

from apps.celery_app import celery_app

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database and service dependencies."""

    _session_factory = None
    _workspace_dir = None

    @property
    def session_factory(self):
        if self._session_factory is None:
            from apps.infra.db.session import async_session_factory
            self._session_factory = async_session_factory
        return self._session_factory

    @property
    def workspace_dir(self) -> Path:
        if self._workspace_dir is None:
            self._workspace_dir = Path(".cypherx/statement_jobs")
            self._workspace_dir.mkdir(parents=True, exist_ok=True)
        return self._workspace_dir


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="process_statement",
    max_retries=3,
    default_retry_delay=60,
    soft_time_limit=1500,
    time_limit=1800,
)
def process_statement_task(
    self,
    job_id: str,
    download_token: str,
    file_path: str,
    file_name: str,
    bank_name: str | None,
    password: str | None,
    financial_year: str | None,
    prompt: str | None,
    template: str | None,
) -> dict[str, Any]:
    """
    Process a bank statement asynchronously.

    Args:
        job_id: UUID of the statement job
        download_token: Token for downloading results
        file_path: Path to the uploaded PDF file
        file_name: Original filename
        bank_name: Bank name for the statement
        password: PDF password if encrypted
        financial_year: Financial year for the statement
        prompt: Custom AI report prompt
        template: Report template selection

    Returns:
        dict: Processing result with status and artifacts
    """
    try:
        logger.info(f"Starting statement processing task for job {job_id}")

        # Run async processing in sync Celery context
        result = asyncio.run(
            _process_statement_async(
                job_id=job_id,
                download_token=download_token,
                file_path=file_path,
                file_name=file_name,
                bank_name=bank_name,
                password=password,
                financial_year=financial_year,
                prompt=prompt,
                template=template,
                session_factory=self.session_factory,
                workspace_dir=self.workspace_dir,
            )
        )

        logger.info(f"Completed statement processing task for job {job_id}")
        return result

    except Exception as exc:
        logger.error(f"Failed to process statement {job_id}: {exc}", exc_info=True)
        # Mark job as failed in database
        try:
            asyncio.run(_mark_job_failed(job_id, str(exc), self.session_factory))
        except Exception as db_exc:
            logger.error(f"Failed to mark job {job_id} as failed: {db_exc}")

        # Retry the task
        raise self.retry(exc=exc)


async def _process_statement_async(
    job_id: str,
    download_token: str,
    file_path: str,
    file_name: str,
    bank_name: str | None,
    password: str | None,
    financial_year: str | None,
    prompt: str | None,
    template: str | None,
    session_factory,
    workspace_dir: Path,
) -> dict[str, Any]:
    """
    Async implementation of statement processing.

    This replicates the logic from StatementPipelineService._run_job but is
    designed to run in a Celery worker context.
    """
    from datetime import datetime, timezone

    from apps.domain.repositories import EntityRepository, StatementJobRepository
    from apps.domain.schemas.mistral import MistralOcrResponse
    from apps.domain.services.custom_entities import CustomEntityService
    from apps.domain.services.entity_extraction import EntityExtractionService
    from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
    from apps.domain.services.reports import AiReportService
    from apps.domain.services.statements import StatementJobContext
    from apps.infra.clients.mistral_vertex import mistral_vertex_client
    from apps.legacy_bridge.adapter import run_legacy

    job_uuid = uuid.UUID(job_id)
    job_dir = workspace_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = Path(file_path)

    # Initialize services
    mistral_service = MistralOcrService(client=mistral_vertex_client)
    report_service = AiReportService()
    entity_extractor = EntityExtractionService()

    logger.info(f"Job {job_id} accepted (file={file_name})")
    stages: list[dict[str, Any]] = []
    started_at = datetime.now(timezone.utc)

    async with session_factory() as session:
        repo = StatementJobRepository(session)
        entity_repo = EntityRepository(session)
        entity_service = CustomEntityService(session)

        # Update job status to running
        await repo.update_fields(job_uuid, status="running")
        await session.commit()

        result: dict[str, Any] = {
            "file_name": file_name,
            "excel": {"path": None, "download_token": download_token},
            "report": None,
            "ocr": None,
            "preview": None,
            "stages": stages,
            "started_at": started_at.isoformat(),
            "completed_at": None,
            "report_template": template,
        }

        logger.debug(f"Job {job_id} stage=queued payload={result}")
        await repo.update_fields(job_uuid, result=result)
        await session.commit()

        try:
            # Stage 1: OCR & parsing
            ocr_result: MistralOcrResponse | None = None
            try:
                stage_start = datetime.now(timezone.utc)
                ocr_result = await mistral_service.analyze(
                    pdf_path, options=MistralOcrOptions()
                )
                result["ocr"] = _trim_ocr_payload(ocr_result)
                stages.append(_create_stage("OCR & parsing", stage_start))
                logger.info(f"Job {job_id} OCR complete")
                await repo.update_fields(job_uuid, result=result)
                await session.commit()
            except Exception as ocr_error:
                logger.warning(f"Job {job_id} OCR skipped: {ocr_error}")

            # Stage 2: Legacy extraction
            stage_start = datetime.now(timezone.utc)
            context = StatementJobContext(
                job_id=job_uuid,
                download_token=uuid.UUID(download_token),
                file_path=pdf_path,
                file_name=file_name,
                bank_name=bank_name,
                password=password,
                financial_year=financial_year,
                prompt=prompt,
                template=template,
            )
            start_date, end_date = context.parse_financial_year()

            excel_path, legacy_summary = run_legacy(
                [str(pdf_path)],
                ocr=False,
                bank_names=[bank_name] if bank_name else None,
                start_dates=[start_date] if start_date else None,
                end_dates=[end_date] if end_date else None,
            )

            # Move excel to job directory
            excel_final = job_dir / f"{pdf_path.stem}.xlsx"
            import shutil
            shutil.copy(excel_path, excel_final)

            # Extract preview
            preview = _extract_preview(legacy_summary)

            result["excel"] = {
                "path": str(excel_final),
                "download_token": download_token,
            }
            result["preview"] = preview
            result["sheets_available"] = bool(legacy_summary.get("sheets_data"))
            stages.append(_create_stage("Ledger normalisation", stage_start))
            logger.info(f"Job {job_id} ledger normalised (excel={excel_final})")
            await repo.update_fields(job_uuid, result=result)
            await session.commit()

            # Stage 3: Entity extraction
            stage_start = datetime.now(timezone.utc)
            entity_count = await _perform_entity_matching(
                session=session,
                entity_service=entity_service,
                entity_repo=entity_repo,
                entity_extractor=entity_extractor,
                job_id=job_uuid,
                excel_path=excel_final,
            )
            if entity_count > 0:
                result["entity_count"] = entity_count
                stages.append(_create_stage("Entity extraction", stage_start))
                logger.info(
                    f"Job {job_id} entities extracted (found in {entity_count} descriptions)"
                )
                await repo.update_fields(job_uuid, result=result)
                await session.commit()

            # Stage 4: AI Report (if available)
            if report_service.available() and ocr_result:
                stage_start = datetime.now(timezone.utc)
                report_payload = await asyncio.to_thread(
                    _build_report,
                    report_service,
                    legacy_summary,
                    ocr_result,
                    prompt,
                    template,
                    job_uuid,
                )
                if report_payload:
                    result["report"] = report_payload
                    stages.append(_create_stage("AI custom report", stage_start))
                    logger.info(f"Job {job_id} AI report generated")
                    await repo.update_fields(job_uuid, result=result)
                    await session.commit()

            # Job completed successfully
            completed_at = datetime.now(timezone.utc)
            result["completed_at"] = completed_at.isoformat()
            result["total_duration_ms"] = int(
                (completed_at - started_at).total_seconds() * 1000
            )

            logger.info(f"Job {job_id} completed")
            await repo.update_fields(
                job_uuid,
                status="completed",
                result=result,
            )
            await session.commit()

            return result

        except Exception as exc:
            logger.exception(f"Job {job_id} failed: {exc}")
            await repo.update_fields(
                job_uuid,
                status="failed",
                error=str(exc),
            )
            await session.commit()
            raise


async def _mark_job_failed(job_id: str, error: str, session_factory) -> None:
    """Mark a job as failed in the database."""
    from apps.domain.repositories import StatementJobRepository

    job_uuid = uuid.UUID(job_id)
    async with session_factory() as session:
        repo = StatementJobRepository(session)
        await repo.update_fields(job_uuid, status="failed", error=error)
        await session.commit()


def _create_stage(name: str, started_at) -> dict[str, Any]:
    """Create a stage record with timing info."""
    from datetime import datetime, timezone

    finished = datetime.now(timezone.utc)
    duration_ms = int((finished - started_at).total_seconds() * 1000)
    return {
        "name": name,
        "duration_ms": duration_ms,
        "finished_at": finished.isoformat(),
    }


def _trim_ocr_payload(ocr: Any) -> dict[str, Any]:
    """Trim OCR payload for storage."""
    if hasattr(ocr, "model_dump"):
        return ocr.model_dump()
    return {}


def _extract_preview(legacy_summary: dict) -> dict[str, Any] | None:
    """Extract preview data from legacy summary."""
    if not legacy_summary:
        return None

    sheets = legacy_summary.get("sheets_data", {})
    if not sheets:
        return None

    # Get first sheet for preview
    first_sheet_name = next(iter(sheets.keys()), None)
    if not first_sheet_name:
        return None

    first_sheet = sheets[first_sheet_name]
    return {
        "sheet_name": first_sheet_name,
        "row_count": len(first_sheet.get("data", [])),
        "sample_rows": first_sheet.get("data", [])[:5],  # First 5 rows
    }


async def _perform_entity_matching(
    session,
    entity_service,
    entity_repo,
    entity_extractor,
    job_id: uuid.UUID,
    excel_path: Path,
) -> int:
    """Perform entity extraction and matching."""
    import pandas as pd

    try:
        df = pd.read_excel(excel_path)
        if "Description" not in df.columns:
            return 0

        descriptions = df["Description"].dropna().tolist()
        if not descriptions:
            return 0

        # Extract entities
        extracted = entity_extractor.extract_batch(descriptions)
        if not extracted:
            return 0

        # Get master keywords
        master_keywords = await entity_service.get_all_master_keywords()
        if not master_keywords:
            return 0

        # Match and store
        match_count = 0
        for description, entities in extracted.items():
            for entity in entities:
                matched = await entity_repo.find_or_create_match(
                    job_id=job_id,
                    description=description,
                    extracted_keyword=entity.text,
                    master_keywords=master_keywords,
                )
                if matched:
                    match_count += 1

        await session.commit()
        return match_count

    except Exception as e:
        logger.error(f"Entity matching failed: {e}")
        return 0


def _build_report(
    report_service,
    legacy_summary: dict,
    ocr_result,
    prompt: str | None,
    template: str | None,
    job_id: uuid.UUID,
) -> dict[str, Any] | None:
    """Build AI report synchronously."""
    try:
        # This would call the actual report generation service
        # For now, return None if not implemented
        return None
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return None
