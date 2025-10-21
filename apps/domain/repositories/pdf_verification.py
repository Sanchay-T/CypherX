"""Persistence helpers for PDF verification jobs."""

from __future__ import annotations

import uuid
from typing import Any

import sqlalchemy as sa
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.models import PdfVerificationJob


class PdfVerificationJobRepository:
    """Database operations for ``PdfVerificationJob`` records."""

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
    ) -> PdfVerificationJob:
        job = PdfVerificationJob(
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

    async def get(self, job_id: uuid.UUID) -> PdfVerificationJob | None:
        return await self._session.get(PdfVerificationJob, job_id)

    async def get_by_token(self, download_token: uuid.UUID) -> PdfVerificationJob | None:
        """Get job by download token for secure file access."""
        stmt = select(PdfVerificationJob).where(
            PdfVerificationJob.download_token == download_token
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_jobs(self, *, limit: int | None = None) -> list[PdfVerificationJob]:
        stmt: Select[tuple[PdfVerificationJob]] = select(PdfVerificationJob).order_by(
            PdfVerificationJob.created_at.desc()
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_fields(
        self,
        job_id: uuid.UUID,
        **fields: Any,
    ) -> PdfVerificationJob:
        if not fields:
            result = await self._session.execute(
                select(PdfVerificationJob).where(PdfVerificationJob.id == job_id)
            )
            job = result.scalar_one_or_none()
            if job is None:
                raise LookupError(f"PDF verification job {job_id} not found")
            return job

        fields.setdefault("updated_at", sa.func.now())
        stmt = (
            sa.update(PdfVerificationJob)
            .where(PdfVerificationJob.id == job_id)
            .values(**fields)
            .returning(PdfVerificationJob)
        )
        result = await self._session.execute(stmt)
        job = result.scalar_one_or_none()
        if job is None:
            raise LookupError(f"PDF verification job {job_id} not found")
        return job

    async def delete(self, job_id: uuid.UUID) -> None:
        await self._session.execute(
            sa.delete(PdfVerificationJob).where(PdfVerificationJob.id == job_id)
        )
        await self._session.flush()
