"""Celery tasks for financial intelligence analysis."""

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
    name="process_financial_intelligence",
    max_retries=3,
    default_retry_delay=60,
    soft_time_limit=900,
    time_limit=1200,
)
def process_financial_intelligence_task(
    self,
    job_id: str,
    file_path: str,
    file_name: str,
    analysis_type: str | None = None,
) -> dict[str, Any]:
    """
    Process financial intelligence analysis asynchronously.

    Args:
        job_id: UUID of the analysis job
        file_path: Path to the uploaded file
        file_name: Original filename
        analysis_type: Type of analysis to perform

    Returns:
        dict: Analysis result
    """
    try:
        logger.info(f"Starting financial intelligence task for job {job_id}")

        result = asyncio.run(
            _process_financial_intelligence_async(
                job_id=job_id,
                file_path=file_path,
                file_name=file_name,
                analysis_type=analysis_type,
                session_factory=self.session_factory,
            )
        )

        logger.info(f"Completed financial intelligence task for job {job_id}")
        return result

    except Exception as exc:
        logger.error(
            f"Failed to process financial intelligence {job_id}: {exc}", exc_info=True
        )
        raise self.retry(exc=exc)


async def _process_financial_intelligence_async(
    job_id: str,
    file_path: str,
    file_name: str,
    analysis_type: str | None,
    session_factory,
) -> dict[str, Any]:
    """
    Async implementation of financial intelligence analysis.

    TODO: Implement actual analysis logic similar to statement processing.
    """
    import uuid
    from datetime import datetime, timezone

    from apps.domain.repositories.financial_analysis import (
        FinancialAnalysisJobRepository,
    )

    job_uuid = uuid.UUID(job_id)

    async with session_factory() as session:
        repo = FinancialAnalysisJobRepository(session)

        # Update job status
        await repo.update_fields(job_uuid, status="running")
        await session.commit()

        try:
            # TODO: Implement financial intelligence analysis logic here
            # For now, just mark as completed
            result = {
                "file_name": file_name,
                "analysis_type": analysis_type or "general",
                "status": "analyzed",
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
            logger.exception(f"Financial intelligence job {job_id} failed: {exc}")
            await repo.update_fields(
                job_uuid,
                status="failed",
                error=str(exc),
            )
            await session.commit()
            raise
