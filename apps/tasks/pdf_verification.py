"""Celery tasks for PDF verification."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from celery import Task

from apps.celery_app import celery_app

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database dependencies."""

    _session_factory = None

    @property
    def session_factory(self):
        if self._session_factory is None:
            from apps.infra.db.session import async_session_factory
            self._session_factory = async_session_factory
        return self._session_factory


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="process_pdf_verification",
    max_retries=3,
    default_retry_delay=60,
    soft_time_limit=600,
    time_limit=900,
)
def process_pdf_verification_task(
    self,
    job_id: str,
    file_path: str,
    file_name: str,
) -> dict[str, Any]:
    """
    Process PDF verification asynchronously.

    Args:
        job_id: UUID of the verification job
        file_path: Path to the uploaded PDF file
        file_name: Original filename

    Returns:
        dict: Verification result
    """
    try:
        logger.info(f"Starting PDF verification task for job {job_id}")

        result = asyncio.run(
            _process_pdf_verification_async(
                job_id=job_id,
                file_path=file_path,
                file_name=file_name,
                session_factory=self.session_factory,
            )
        )

        logger.info(f"Completed PDF verification task for job {job_id}")
        return result

    except Exception as exc:
        logger.error(f"Failed to verify PDF {job_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _process_pdf_verification_async(
    job_id: str,
    file_path: str,
    file_name: str,
    session_factory,
) -> dict[str, Any]:
    """
    Async implementation of PDF verification.

    TODO: Implement actual verification logic similar to statement processing.
    """
    import uuid
    from datetime import datetime, timezone

    from apps.domain.repositories.pdf_verification import PdfVerificationJobRepository

    job_uuid = uuid.UUID(job_id)

    async with session_factory() as session:
        repo = PdfVerificationJobRepository(session)

        # Update job status
        await repo.update_fields(job_uuid, status="running")
        await session.commit()

        try:
            # TODO: Implement PDF verification logic here
            # For now, just mark as completed
            result = {
                "file_name": file_name,
                "status": "verified",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }

            await repo.update_fields(
                job_uuid,
                status="completed",
                result=result,
            )
            await session.commit()

            return result

        except Exception as exc:
            logger.exception(f"PDF verification job {job_id} failed: {exc}")
            await repo.update_fields(
                job_uuid,
                status="failed",
                error=str(exc),
            )
            await session.commit()
            raise
