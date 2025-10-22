"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.routers import api_router
from apps.core.config import settings
from apps.domain.models.base import Base
from apps.infra.db.session import async_engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/health/live")
    async def live() -> dict[str, str]:  # pragma: no cover - simple health endpoint
        return {"status": "live"}

    @app.get("/health/ready")
    async def ready() -> dict[str, str]:  # pragma: no cover - simple health endpoint
        return {"status": "ready"}

    return app


app = create_app()
