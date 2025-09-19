"""Pydantic schemas for authentication flows."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    team_size: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class AuthUser(BaseModel):
    id: UUID
    supabase_user_id: UUID
    email: EmailStr
    full_name: Optional[str]
    team_size: Optional[str]
    created_at: datetime
    updated_at: datetime


class TokenEnvelope(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None


class SignupResponse(TokenEnvelope):
    user: AuthUser


class LoginResponse(TokenEnvelope):
    user: AuthUser


class SessionResponse(BaseModel):
    user: AuthUser
