"""FastAPI middleware for request tracking, security, and logging."""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Add request ID and timing to all requests.

    Adds:
    - X-Request-ID header (generates if not provided)
    - X-Process-Time header showing request duration
    - Logs all requests with timing info
    """

    async def dispatch(self, request: Request, call_next):
        # Generate or use existing request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        # Track request timing
        start_time = time.time()

        # Process request
        response = await call_next(request)

        # Calculate process time
        process_time = time.time() - start_time

        # Add headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.3f}"

        # Log request
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={process_time:.3f}s "
            f"request_id={request_id}"
        )

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Log request and response details.

    Logs:
    - Request method, path, client IP, user agent
    - Useful for debugging and monitoring
    """

    async def dispatch(self, request: Request, call_next):
        # Log incoming request
        request_id = getattr(request.state, "request_id", "unknown")

        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"client={request.client.host if request.client else 'unknown'} "
            f"user_agent={request.headers.get('user-agent', 'unknown')} "
            f"request_id={request_id}"
        )

        response = await call_next(request)

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.

    Adds:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Strict-Transport-Security (HSTS)
    - Content-Security-Policy (basic)
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS - Only for HTTPS
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        # Basic CSP - adjust based on your needs
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response


class CORSDebugMiddleware(BaseHTTPMiddleware):
    """
    Debug CORS requests by logging headers.

    Useful for debugging CORS issues in development.
    """

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            logger.debug(f"CORS preflight request: {request.url.path}")
            logger.debug(f"Origin: {request.headers.get('origin')}")
            logger.debug(
                f"Access-Control-Request-Method: "
                f"{request.headers.get('access-control-request-method')}"
            )
            logger.debug(
                f"Access-Control-Request-Headers: "
                f"{request.headers.get('access-control-request-headers')}"
            )

        response = await call_next(request)

        if request.method == "OPTIONS":
            logger.debug(
                f"CORS preflight response: {response.headers.get('access-control-allow-origin')}"
            )

        return response
