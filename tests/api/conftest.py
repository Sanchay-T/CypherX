import os
import sys
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load basic env fallbacks for tests
os.environ.setdefault("SUPABASE_URL", "https://raitkzaihgsghqzmrptk.supabase.co")

from apps.main import create_app  # noqa: E402
from apps.domain.models.base import Base  # noqa: E402
from apps.infra.db.session import async_engine  # noqa: E402


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def api_app():
    application = create_app()
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return application


@pytest_asyncio.fixture()
async def api_client(api_app):
    async with httpx.AsyncClient(
        transport=ASGITransport(app=api_app), base_url="http://testserver"
    ) as client:
        yield client
