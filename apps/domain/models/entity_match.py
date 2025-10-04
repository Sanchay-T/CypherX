"""Entity Match model for tracking entity matches in statements."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from apps.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class EntityMatch(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks where entities were matched in statements (for analytics)."""

    __tablename__ = "entity_matches"

    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("custom_entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    statement_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("statement_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    description: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # user_defined, ai_detected

    # Relationships
    entity: Mapped["CustomEntity"] = relationship("CustomEntity", lazy="joined")
    statement_job: Mapped["StatementJob"] = relationship("StatementJob", lazy="joined")

    __table_args__ = (
        Index("ix_entity_matches_entity_statement", "entity_id", "statement_job_id"),
    )

    def __repr__(self) -> str:
        return f"<EntityMatch id={self.id} entity_id={self.entity_id} source={self.source}>"