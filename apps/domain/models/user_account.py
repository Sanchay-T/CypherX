"""User account ORM model."""

from __future__ import annotations

from typing import Optional
import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from apps.domain.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_accounts"

    supabase_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    team_size: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    def update_profile(self, *, full_name: Optional[str], team_size: Optional[str]) -> None:
        if full_name:
            self.full_name = full_name
        if team_size:
            self.team_size = team_size
