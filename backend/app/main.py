"""Application bootstrap placeholder.

This module will eventually expose a ``create_app`` factory that wires middleware,
routers, and lifecycle hooks for the FastAPI ASGI service. Actual implementation is
intentionally deferred until configuration and infrastructure layers are finalized.
"""

# from fastapi import FastAPI  # noqa: F401 - reserved for future implementation


def create_app():
    """Return a configured FastAPI application instance.

    The body will be implemented once dependency wiring, middleware, and configuration
    settings are ready. Keeping the callable defined helps type-checkers and tooling
    while ensuring we do not commit premature logic.
    """
    raise NotImplementedError("Application factory will be implemented in the next phase.")
