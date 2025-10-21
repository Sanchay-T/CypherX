"""Persistence helpers for financial analysis jobs."""

from __future__ import annotations

import uuid
from typing import Any

import sqlalchemy as sa
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.models import FinancialAnalysisJob


class FinancialAnalysisJobRepository:
    """Database operations for ``FinancialAnalysisJob`` records."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_job(
        self,
        *,
        file_name: str,
        file_path: str | None = None,
        payload: dict[str, Any],
        status: str = "queued",
        download_token: uuid.UUID | None = None,
    ) -> FinancialAnalysisJob:
        job = FinancialAnalysisJob(
            file_name=file_name,
            file_path=file_path,
            status=status,
            payload=payload,
        )
        if download_token is not None:
            job.download_token = download_token
        self._session.add(job)
        await self._session.flush()
        return job

    async def get(self, job_id: uuid.UUID) -> FinancialAnalysisJob | None:
        return await self._session.get(FinancialAnalysisJob, job_id)

    async def get_by_token(self, download_token: uuid.UUID) -> FinancialAnalysisJob | None:
        """Get job by download token for secure file access."""
        stmt = select(FinancialAnalysisJob).where(
            FinancialAnalysisJob.download_token == download_token
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_jobs(self, *, limit: int | None = None) -> list[FinancialAnalysisJob]:
        stmt: Select[tuple[FinancialAnalysisJob]] = select(FinancialAnalysisJob).order_by(
            FinancialAnalysisJob.created_at.desc()
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_fields(
        self,
        job_id: uuid.UUID,
        **fields: Any,
    ) -> FinancialAnalysisJob:
        if not fields:
            result = await self._session.execute(
                select(FinancialAnalysisJob).where(FinancialAnalysisJob.id == job_id)
            )
            job = result.scalar_one_or_none()
            if job is None:
                raise LookupError(f"Financial analysis job {job_id} not found")
            return job

        fields.setdefault("updated_at", sa.func.now())
        stmt = (
            sa.update(FinancialAnalysisJob)
            .where(FinancialAnalysisJob.id == job_id)
            .values(**fields)
            .returning(FinancialAnalysisJob)
        )
        result = await self._session.execute(stmt)
        job = result.scalar_one_or_none()
        if job is None:
            raise LookupError(f"Financial analysis job {job_id} not found")
        return job

    async def delete(self, job_id: uuid.UUID) -> None:
        await self._session.execute(
            sa.delete(FinancialAnalysisJob).where(FinancialAnalysisJob.id == job_id)
        )
        await self._session.flush()
