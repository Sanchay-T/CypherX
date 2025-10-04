"""Persistence helpers for statement processing jobs."""

from __future__ import annotations

import uuid
from typing import Any

import sqlalchemy as sa
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.models import StatementJob


class StatementJobRepository:
    """Database operations for ``StatementJob`` records."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_job(
        self,
        *,
        file_name: str,
        bank_name: str | None,
        payload: dict[str, Any],
        status: str = "queued",
        download_token: uuid.UUID | None = None,
    ) -> StatementJob:
        job = StatementJob(
            file_name=file_name,
            bank_name=bank_name,
            status=status,
            payload=payload,
        )
        if download_token is not None:
            job.download_token = download_token
        self._session.add(job)
        await self._session.flush()
        return job

    async def get(self, job_id: uuid.UUID) -> StatementJob | None:
        return await self._session.get(StatementJob, job_id)

    async def list_jobs(self, *, limit: int | None = None) -> list[StatementJob]:
        stmt: Select[tuple[StatementJob]] = select(StatementJob).order_by(
            StatementJob.created_at.desc()
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_fields(
        self,
        job_id: uuid.UUID,
        **fields: Any,
    ) -> StatementJob:
        if not fields:
            result = await self._session.execute(
                select(StatementJob).where(StatementJob.id == job_id)
            )
            job = result.scalar_one_or_none()
            if job is None:
                raise LookupError(f"Statement job {job_id} not found")
            return job

        fields.setdefault("updated_at", sa.func.now())
        stmt = (
            sa.update(StatementJob)
            .where(StatementJob.id == job_id)
            .values(**fields)
            .returning(StatementJob)
        )
        result = await self._session.execute(stmt)
        job = result.scalar_one_or_none()
        if job is None:
            raise LookupError(f"Statement job {job_id} not found")
        return job

    async def delete(self, job_id: uuid.UUID) -> None:
        await self._session.execute(
            sa.delete(StatementJob).where(StatementJob.id == job_id)
        )
        await self._session.flush()
