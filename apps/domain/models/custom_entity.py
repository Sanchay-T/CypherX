"""Custom Entity model for user-defined entities."""

from __future__ import annotations

from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from apps.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CustomEntity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User-defined entities to track in statements."""

    __tablename__ = "custom_entities"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # person, company, business
    aliases: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
    match_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    # For future multi-tenant support
    # user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    __table_args__ = (
        Index("ix_custom_entities_name_lower", "name", postgresql_ops={"name": "text_pattern_ops"}),
    )

    def __repr__(self) -> str:
        return f"<CustomEntity id={self.id} name={self.name} type={self.type}>"