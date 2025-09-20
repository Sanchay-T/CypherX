"""Simple in-memory job store for demo workflows."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

JobStatus = str  # queued, running, completed, failed


@dataclass
class JobRecord:
    """Represents the lifecycle of a background job."""

    job_id: str
    status: JobStatus
    payload: dict[str, Any] = field(default_factory=dict)
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def as_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "payload": self.payload,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class InMemoryJobStore:
    """A concurrency-safe in-memory store for short-lived jobs."""

    def __init__(self) -> None:
        self._jobs: Dict[str, JobRecord] = {}
        self._lock = asyncio.Lock()

    async def create(self, *, payload: dict[str, Any]) -> JobRecord:
        job_id = uuid4().hex
        record = JobRecord(job_id=job_id, status="queued", payload=payload)
        async with self._lock:
            self._jobs[job_id] = record
        return record

    async def update(self, job_id: str, **fields: Any) -> JobRecord:
        async with self._lock:
            record = self._jobs[job_id]
            for key, value in fields.items():
                setattr(record, key, value)
            record.updated_at = datetime.now(timezone.utc)
            return record

    async def get(self, job_id: str) -> JobRecord:
        async with self._lock:
            if job_id not in self._jobs:
                raise KeyError(job_id)
            return self._jobs[job_id]

    async def list(self) -> list[JobRecord]:
        async with self._lock:
            return list(self._jobs.values())


store = InMemoryJobStore()
