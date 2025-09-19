"""FastAPI dependency providers for auth."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.services.auth import AuthService
from apps.infra.clients.supabase_auth import supabase_auth_client
from apps.infra.db.session import get_db_session


async def get_auth_service(
    session: AsyncSession = Depends(get_db_session),
) -> AuthService:
    return AuthService(supabase=supabase_auth_client, session=session)
