"""Domain service providing Claude Sonnet 4 chat helpers."""

from __future__ import annotations

import httpx

from apps.domain.schemas.claude import ClaudeChatRequest, ClaudeChatResponse
from apps.infra.clients.claude_vertex import ClaudeVertexClient


class ClaudeService:
    """High-level operations for Claude Sonnet 4 chat invocations."""

    def __init__(self, client: ClaudeVertexClient) -> None:
        self._client = client

    async def chat(self, payload: ClaudeChatRequest) -> ClaudeChatResponse:
        try:
            response_data = await self._client.invoke(payload.to_vertex_payload())
        except httpx.HTTPStatusError as exc:  # network/Vertex error passthrough
            detail = exc.response.text
            raise RuntimeError(f"Claude Vertex request failed: {detail}") from exc
        except Exception as exc:  # pragma: no cover - network exceptions
            raise RuntimeError(f"Claude Vertex request error: {exc}") from exc

        return ClaudeChatResponse.model_validate(response_data)
