"""Financial Analysis Job model for bank statement intelligence."""

from __future__ import annotations

import uuid

from sqlalchemy import Integer, String, Text, Float
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from apps.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FinancialAnalysisJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Financial analysis job with persistent storage."""

    __tablename__ = "financial_analysis_jobs"

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued", index=True)

    # Analysis results
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100
    verdict: Mapped[str | None] = mapped_column(String(50), nullable=True)  # approved, review, rejected
    credit_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Report path
    report_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Security
    download_token: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        default=uuid.uuid4,
    )

    # Analysis data stored as JSON
    income_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    expense_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    risk_assessment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_insights: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    transactions: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Job payload and results
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<FinancialAnalysisJob id={self.id} file_name={self.file_name} status={self.status} verdict={self.verdict}>"

    def as_dict(self) -> dict:
        """Convert to dict format for API responses."""
        return {
            "job_id": str(self.id),
            "file_name": self.file_name,
            "status": self.status,
            "overall_score": self.overall_score,
            "verdict": self.verdict,
            "credit_limit": self.credit_limit,
            "confidence": self.confidence,
            "income_analysis": self.income_analysis,
            "expense_analysis": self.expense_analysis,
            "risk_assessment": self.risk_assessment,
            "ai_insights": self.ai_insights,
            "recommendations": self.recommendations,
            "transactions": self.transactions,
            "payload": self.payload,
            "result": self.result,
            "error": self.error,
            "download_token": str(self.download_token),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
