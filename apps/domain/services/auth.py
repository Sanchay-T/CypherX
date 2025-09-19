"""Business logic for authentication."""

from __future__ import annotations

import contextlib
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.models.user_account import UserAccount
from apps.domain.schemas.auth import (
    AuthUser,
    LoginRequest,
    LoginResponse,
    SessionResponse,
    SignupRequest,
    SignupResponse,
    TokenEnvelope,
)
from apps.infra.clients.supabase_auth import SupabaseAuthClient, SupabaseAuthError


class AuthService:
    def __init__(self, *, supabase: SupabaseAuthClient, session: AsyncSession) -> None:
        self._supabase = supabase
        self._session = session

    async def signup(self, payload: SignupRequest) -> SignupResponse:
        metadata = {
            "full_name": payload.full_name,
            "team_size": payload.team_size,
        }
        try:
            supabase_user = await self._supabase.create_user(
                email=payload.email,
                password=payload.password,
                metadata=metadata,
            )
        except SupabaseAuthError as exc:  # pragma: no cover - direct mapping
            if exc.status_code in (409, 422):
                raise ValueError("User with this email already exists") from exc
            raise

        supabase_user_id = uuid.UUID(supabase_user["id"])

        user = UserAccount(
            supabase_user_id=supabase_user_id,
            email=payload.email,
            full_name=payload.full_name,
            team_size=payload.team_size,
        )
        self._session.add(user)
        try:
            await self._session.commit()
        except IntegrityError as exc:
            await self._session.rollback()
            with contextlib.suppress(Exception):
                await self._supabase.delete_user(str(supabase_user_id))
            raise ValueError("User with this email already exists") from exc

        token_payload = await self._supabase.sign_in_with_password(
            email=payload.email,
            password=payload.password,
        )
        tokens = self._parse_tokens(token_payload)
        return SignupResponse(user=self._serialize_user(user), **tokens.model_dump())

    async def login(self, payload: LoginRequest) -> LoginResponse:
        try:
            token_payload = await self._supabase.sign_in_with_password(
                email=payload.email,
                password=payload.password,
            )
        except SupabaseAuthError as exc:
            raise ValueError("Invalid email or password") from exc

        supabase_user = token_payload.get("user") or {}
        supabase_id = supabase_user.get("id")
        if not supabase_id:
            raise RuntimeError("Supabase response missing user identifier")

        user = await self._get_or_create_user(
            supabase_user_id=uuid.UUID(supabase_id),
            email=payload.email,
            metadata=supabase_user.get("user_metadata") or {},
        )

        tokens = self._parse_tokens(token_payload)
        return LoginResponse(user=self._serialize_user(user), **tokens.model_dump())

    async def session(self, access_token: str) -> SessionResponse:
        try:
            user_payload = await self._supabase.get_user(access_token=access_token)
        except SupabaseAuthError as exc:
            raise ValueError("Invalid or expired token") from exc

        supabase_user = user_payload.get("user", user_payload)
        supabase_id = supabase_user.get("id")
        if not supabase_id:
            raise ValueError("Unable to resolve Supabase user from token")

        user = await self._get_or_create_user(
            supabase_user_id=uuid.UUID(supabase_id),
            email=supabase_user["email"],
            metadata=supabase_user.get("user_metadata") or {},
        )
        return SessionResponse(user=self._serialize_user(user))

    async def _get_or_create_user(
        self,
        *,
        supabase_user_id: uuid.UUID,
        email: str,
        metadata: dict[str, str],
    ) -> UserAccount:
        result = await self._session.execute(
            select(UserAccount).where(UserAccount.supabase_user_id == supabase_user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.update_profile(
                full_name=metadata.get("full_name"),
                team_size=metadata.get("team_size"),
            )
            await self._session.commit()
            return user

        user = UserAccount(
            supabase_user_id=supabase_user_id,
            email=email,
            full_name=metadata.get("full_name"),
            team_size=metadata.get("team_size"),
        )
        self._session.add(user)
        await self._session.commit()
        return user

    def _parse_tokens(self, payload: dict[str, object]) -> TokenEnvelope:
        return TokenEnvelope(
            access_token=str(payload.get("access_token")),
            refresh_token=str(payload.get("refresh_token")),
            token_type=str(payload.get("token_type", "bearer")),
            expires_in=payload.get("expires_in"),
        )

    @staticmethod
    def _serialize_user(user: UserAccount) -> AuthUser:
        return AuthUser(
            id=user.id,
            supabase_user_id=user.supabase_user_id,
            email=user.email,
            full_name=user.full_name,
            team_size=user.team_size,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
