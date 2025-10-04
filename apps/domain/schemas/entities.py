"""Pydantic schemas for custom entity APIs."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EntityBase(BaseModel):
    name: str = Field(..., max_length=255)
    type: str = Field(..., description="Category of the entity, e.g. person/company")
    aliases: List[str] = Field(default_factory=list)


class EntityCreate(EntityBase):
    pass


class EntityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    type: Optional[str] = Field(default=None)
    aliases: Optional[List[str]] = None


class EntityResponse(EntityBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    match_count: int = 0
    created_at: datetime
    updated_at: datetime
