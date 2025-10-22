"""Redis caching infrastructure."""

from apps.infra.cache.redis_client import redis_client, get_redis, check_redis_health
from apps.infra.cache.decorators import cache_result

__all__ = [
    "redis_client",
    "get_redis",
    "check_redis_health",
    "cache_result",
]
