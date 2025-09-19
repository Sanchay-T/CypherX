import asyncio
import os
import sys
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("SUPABASE_URL", "https://raitkzaihgsghqzmrptk.supabase.co")

from apps.main import create_app  # noqa: E402
from apps.domain.models.base import Base  # noqa: E402
from apps.domain.models.user_account import UserAccount  # noqa: E402
from apps.infra.db.session import async_engine, async_session_factory  # noqa: E402
from apps.core.config import settings  # noqa: E402


@pytest_asyncio.fixture(scope="session")
async def app():
    application = create_app()
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return application


@pytest_asyncio.fixture()
async def client(app):
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as test_client:
        yield test_client


@pytest_asyncio.fixture()
async def db_session():
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()


@pytest.fixture(scope="session")
def supabase_admin_headers() -> dict[str, str]:
    service_key = settings.supabase_service_key
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


@pytest.fixture()
def random_email() -> str:
    return f"test-{uuid.uuid4().hex[:8]}@cypherx.dev"


@pytest.fixture()
def password() -> str:
    return "TestPass123!"


@pytest_asyncio.fixture()
async def cleanup_supabase_user(supabase_admin_headers: dict[str, str]):
    created_users: list[str] = []

    def register(user_id: str) -> None:
        created_users.append(user_id)

    yield register

    base_url = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient() as http_client:
        for user_id in created_users:
            resp = await http_client.delete(
                f"{base_url}/auth/v1/admin/users/{user_id}",
                headers=supabase_admin_headers,
            )
            if resp.status_code not in (200, 204, 404):
                raise RuntimeError(
                    f"Failed to delete Supabase user {user_id}: {resp.status_code} {resp.text}"
                )


@pytest_asyncio.fixture(autouse=True)
async def clear_user_accounts():
    yield
    async with async_session_factory() as session:
        await session.execute(UserAccount.__table__.delete())
        await session.commit()
