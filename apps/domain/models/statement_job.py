"""Statement Job model for persisting processing jobs."""

from __future__ import annotations

import uuid

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from apps.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class StatementJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Statement processing job with persistent storage."""

    __tablename__ = "statement_jobs"

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued", index=True)

    # File paths
    excel_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Security
    download_token: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        default=uuid.uuid4,
    )

    # Job payload and results stored as JSON
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For future multi-tenant support
    # user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    def __repr__(self) -> str:
        return f"<StatementJob id={self.id} file_name={self.file_name} status={self.status}>"

    def as_dict(self) -> dict:
        """Convert to dict format matching InMemoryJobStore format."""
        return {
            "job_id": str(self.id),
            "status": self.status,
            "payload": self.payload,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
