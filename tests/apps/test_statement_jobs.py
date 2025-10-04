"""Tests for statement job repository persistence semantics."""

from __future__ import annotations

import uuid

import pytest

from apps.domain.repositories import StatementJobRepository
from apps.infra.db.session import async_session_factory


@pytest.mark.asyncio
async def test_statement_job_repository_persistence():
    payload = {"file_name": "sample.pdf"}

    async with async_session_factory() as session:
        repo = StatementJobRepository(session)
        job = await repo.create_job(
            file_name="sample.pdf",
            bank_name="Test Bank",
            payload=payload,
            download_token=uuid.uuid4(),
        )
        await session.commit()
        job_id = job.id

    async with async_session_factory() as session:
        repo = StatementJobRepository(session)
        await repo.update_fields(
            job_id,
            status="running",
            result={"excel": {"path": "/tmp/example.xlsx"}},
        )
        await session.commit()

    async with async_session_factory() as session:
        repo = StatementJobRepository(session)
        persisted = await repo.get(job_id)
        assert persisted is not None
        assert persisted.status == "running"
        assert persisted.result["excel"]["path"] == "/tmp/example.xlsx"
        await repo.delete(job_id)
        await session.commit()
