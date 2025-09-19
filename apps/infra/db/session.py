"""Async SQLAlchemy engine/session helpers."""

from __future__ import annotations

from typing import AsyncIterator

from urllib.parse import quote

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from apps.core.config import settings


def _normalise_password(dsn: str) -> str:
    if "@" not in dsn:
        return dsn
    scheme, rest = dsn.split("://", 1)
    if "@" not in rest:
        return dsn
    credentials, host_part = rest.rsplit("@", 1)
    if ":" not in credentials:
        return dsn
    username, password = credentials.split(":", 1)
    if "%" not in password:
        password = quote(password, safe="")
    return f"{scheme}://{username}:{password}@{host_part}"


def _build_async_dsn(dsn: str) -> str:
    url = make_url(_normalise_password(dsn))
    if url.drivername.startswith("postgresql+asyncpg"):
        return str(url)
    if not url.drivername.startswith("postgresql"):
        raise ValueError("Unsupported database DSN; expected postgresql://")
    async_url = url.set(drivername="postgresql+asyncpg")
    return async_url.render_as_string(hide_password=False)


async_engine: AsyncEngine = create_async_engine(
    _build_async_dsn(settings.database_dsn),
    poolclass=NullPool,
    future=True,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db_session() -> AsyncIterator[AsyncSession]:  # pragma: no cover - dependency helper
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()
