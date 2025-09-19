"""FastAPI dependency helpers for Claude integrations."""

from functools import lru_cache

from apps.core.config import settings
from apps.domain.services.claude import ClaudeService
from apps.infra.clients.claude_vertex import ClaudeVertexClient


@lru_cache(maxsize=1)
def get_claude_vertex_client() -> ClaudeVertexClient:
    """Return a memoized Claude Vertex client instance."""

    try:
        model_path = settings.claude_vertex_model_path
    except RuntimeError as exc:  # defer configuration errors to runtime failure
        raise RuntimeError("Claude Vertex configuration incomplete") from exc

    return ClaudeVertexClient(model_path=model_path)


def get_claude_service() -> ClaudeService:
    """Provide a Claude domain service wired with the Vertex client."""

    return ClaudeService(get_claude_vertex_client())
