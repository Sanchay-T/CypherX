"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from apps.api.exceptions import register_exception_handlers
from apps.api.middleware import (
    RequestTrackingMiddleware,
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
)
from apps.api.routers import api_router
from apps.core.config import settings
from apps.domain.models.base import Base
from apps.infra.cache.redis_client import check_redis_health, close_redis
from apps.infra.db.session import async_engine

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute", "1000/hour"],
    storage_uri=settings.redis_url,
    strategy="fixed-window",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Lifecycle manager for FastAPI application."""
    # Startup
    logger.info("Starting up CypherX API...")

    # Initialize database tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Check Redis connection
    redis_status = await check_redis_health()
    if redis_status:
        logger.info("Redis connection: OK")
    else:
        logger.warning("Redis connection: FAILED - Caching and rate limiting may not work")

    yield

    # Shutdown
    logger.info("Shutting down CypherX API...")
    await close_redis()


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title=settings.api_title,
        version=settings.api_version,
        description="""
        CypherX API - Financial Statement Processing Platform

        ## Features
        - Bank statement parsing and normalization
        - OCR processing with AI models
        - Entity extraction and classification
        - Financial reporting and analysis
        - Background job processing with Celery

        ## Authentication
        Most endpoints require JWT authentication.
        Include the token in the Authorization header: `Bearer <token>`
        """,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        swagger_ui_parameters={
            "defaultModelsExpandDepth": -1,
            "displayRequestDuration": True,
            "filter": True,
        },
    )

    # Configure CORS
    allowed_origins = [settings.frontend_url]
    if settings.api_env == "development":
        allowed_origins.extend(["http://localhost:3000", "http://localhost:3001"])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        max_age=600,
    )

    # Add compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Add custom middleware (order matters - first added = outermost)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestTrackingMiddleware)

    # Add logging middleware only in development
    if settings.api_env == "development":
        app.add_middleware(RequestLoggingMiddleware)

    # Register exception handlers
    register_exception_handlers(app)

    # Register rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Include API routers
    app.include_router(api_router)

    # Health check endpoints
    @app.get("/health/live", tags=["health"])
    async def liveness() -> dict[str, str]:
        """Liveness probe - indicates the service is running."""
        return {"status": "live"}

    @app.get("/health/ready", tags=["health"])
    async def readiness() -> dict[str, str | dict]:
        """
        Readiness probe - indicates the service is ready to accept traffic.

        Checks:
        - Database connection
        - Redis connection
        """
        checks = {
            "database": False,
            "redis": False,
        }

        # Check database
        try:
            async with async_engine.connect() as conn:
                await conn.execute("SELECT 1")
            checks["database"] = True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")

        # Check Redis
        checks["redis"] = await check_redis_health()

        # Determine overall status
        all_healthy = all(checks.values())
        status_code = "ready" if all_healthy else "not_ready"

        return {
            "status": status_code,
            "checks": checks,
        }

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        """Root endpoint - API information."""
        return {
            "name": settings.api_title,
            "version": settings.api_version,
            "environment": settings.api_env,
            "docs": "/docs",
            "health": "/health/ready",
        }

    return app


app = create_app()
