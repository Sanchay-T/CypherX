"""PDF Verification Job model for persisting verification jobs."""

from __future__ import annotations

import uuid

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from apps.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PdfVerificationJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """PDF verification job with persistent storage."""

    __tablename__ = "pdf_verification_jobs"

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued", index=True)

    # Verification results
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100
    overall_verdict: Mapped[str | None] = mapped_column(String(50), nullable=True)  # verified, suspicious, fraudulent

    # Report path
    report_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Security
    download_token: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        default=uuid.uuid4,
    )

    # Detailed findings and metadata stored as JSON
    findings: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # Array of finding objects
    pdf_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # PDF metadata extracted

    # Job payload and results
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For future multi-tenant support
    # user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    def __repr__(self) -> str:
        return f"<PdfVerificationJob id={self.id} file_name={self.file_name} status={self.status} verdict={self.overall_verdict}>"

    def as_dict(self) -> dict:
        """Convert to dict format for API responses."""
        return {
            "job_id": str(self.id),
            "file_name": self.file_name,
            "status": self.status,
            "risk_score": self.risk_score,
            "overall_verdict": self.overall_verdict,
            "findings": self.findings,
            "metadata": self.pdf_metadata,  # Expose as 'metadata' in API for cleaner interface
            "payload": self.payload,
            "result": self.result,
            "error": self.error,
            "download_token": str(self.download_token),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
