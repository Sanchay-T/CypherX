"""Caching decorators for Redis."""

from __future__ import annotations

import hashlib
import json
import logging
from functools import wraps
from typing import Any, Callable

from apps.core.config import settings
from apps.infra.cache.redis_client import redis_client

logger = logging.getLogger(__name__)


def cache_result(ttl: int | None = None, key_prefix: str = ""):
    """
    Cache async function results in Redis.

    Args:
        ttl: Time to live in seconds. Defaults to settings.cache_default_ttl
        key_prefix: Optional prefix for the cache key

    Returns:
        Decorator function

    Example:
        @cache_result(ttl=600, key_prefix="user")
        async def get_user_by_id(user_id: str) -> dict:
            return await db.query(...)
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Skip caching if disabled or Redis not available
            if not settings.cache_enabled or redis_client is None:
                return await func(*args, **kwargs)

            # Generate cache key from function name and arguments
            cache_key = _generate_cache_key(key_prefix, func.__name__, args, kwargs)

            try:
                # Try to get from cache
                cached = await redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Cache HIT: {cache_key}")
                    return json.loads(cached)

                logger.debug(f"Cache MISS: {cache_key}")

            except Exception as e:
                logger.warning(f"Cache read failed for {cache_key}: {e}")
                # Continue without cache on error
                return await func(*args, **kwargs)

            # Execute function and cache result
            result = await func(*args, **kwargs)

            try:
                cache_ttl = ttl or settings.cache_default_ttl
                await redis_client.setex(cache_key, cache_ttl, json.dumps(result))
                logger.debug(f"Cache SET: {cache_key} (ttl={cache_ttl}s)")
            except Exception as e:
                logger.warning(f"Cache write failed for {cache_key}: {e}")
                # Don't fail the request if caching fails

            return result

        return wrapper

    return decorator


def _generate_cache_key(prefix: str, func_name: str, args: tuple, kwargs: dict) -> str:
    """
    Generate a unique cache key based on function and arguments.

    Args:
        prefix: Key prefix
        func_name: Function name
        args: Positional arguments
        kwargs: Keyword arguments

    Returns:
        Cache key string
    """
    # Create a stable representation of the arguments
    # Skip 'self' or 'cls' if present (first arg of instance/class methods)
    args_to_hash = args
    if args and hasattr(args[0], "__class__"):
        # Likely a self/cls parameter, skip it
        args_to_hash = args[1:]

    # Create a deterministic string from args and kwargs
    key_data = f"{func_name}:{args_to_hash}:{sorted(kwargs.items())}"

    # Hash to keep keys a reasonable length
    key_hash = hashlib.md5(key_data.encode()).hexdigest()

    # Build final cache key
    if prefix:
        return f"cache:{prefix}:{func_name}:{key_hash}"
    return f"cache:{func_name}:{key_hash}"


async def invalidate_cache(pattern: str) -> int:
    """
    Invalidate cache entries matching a pattern.

    Args:
        pattern: Redis key pattern (e.g., "cache:user:*")

    Returns:
        Number of keys deleted

    Example:
        # Invalidate all user caches
        await invalidate_cache("cache:user:*")
    """
    if redis_client is None:
        return 0

    try:
        # Find matching keys
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)

        if not keys:
            return 0

        # Delete keys
        deleted = await redis_client.delete(*keys)
        logger.info(f"Invalidated {deleted} cache entries matching '{pattern}'")
        return deleted

    except Exception as e:
        logger.error(f"Cache invalidation failed for pattern '{pattern}': {e}")
        return 0


async def get_cache_stats() -> dict[str, Any]:
    """
    Get Redis cache statistics.

    Returns:
        dict: Cache statistics including memory usage, keys, hits/misses
    """
    if redis_client is None:
        return {"status": "unavailable"}

    try:
        info = await redis_client.info("stats")
        memory = await redis_client.info("memory")

        return {
            "status": "connected",
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "used_memory": memory.get("used_memory_human", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
        }

    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {"status": "error", "error": str(e)}
