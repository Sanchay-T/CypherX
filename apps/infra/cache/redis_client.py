"""Redis client configuration and health checks."""

from __future__ import annotations

import logging

from apps.core.config import settings

logger = logging.getLogger(__name__)

# Import Redis async client
try:
    from redis.asyncio import Redis, ConnectionPool

    # Connection pool for better performance
    redis_pool = ConnectionPool.from_url(
        settings.redis_url,
        max_connections=settings.redis_max_connections,
        decode_responses=True,
        socket_timeout=settings.redis_socket_timeout,
        socket_connect_timeout=settings.redis_socket_connect_timeout,
    )

    redis_client = Redis(connection_pool=redis_pool)

    async def get_redis() -> Redis:
        """Dependency injection for Redis client."""
        return redis_client

    async def check_redis_health() -> bool:
        """Health check for Redis connection."""
        try:
            await redis_client.ping()
            logger.debug("Redis health check: OK")
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False

    async def close_redis():
        """Close Redis connection pool."""
        await redis_client.close()
        await redis_pool.disconnect()

except ImportError:
    logger.warning(
        "redis package not installed. Install with: pip install redis"
    )

    # Provide mock implementations if Redis is not available
    redis_client = None  # type: ignore

    async def get_redis():  # type: ignore
        """Mock Redis client."""
        raise RuntimeError("Redis is not installed")

    async def check_redis_health() -> bool:
        """Mock health check."""
        return False

    async def close_redis():
        """Mock close."""
        pass
