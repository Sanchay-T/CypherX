"""Domain service wrappers for Gemini content generation and embeddings."""

from __future__ import annotations

import httpx

from apps.domain.schemas.gemini import (
    GeminiEmbeddingRequest,
    GeminiEmbeddingResponse,
    GeminiGenerateRequest,
    GeminiGenerateResponse,
)
from apps.infra.clients.gemini_vertex import (
    GeminiEmbeddingClient,
    GeminiGenerativeClient,
)


class GeminiService:
    """Provides high-level operations for Gemini endpoints."""

    def __init__(
        self,
        generative_client: GeminiGenerativeClient,
        embedding_client: GeminiEmbeddingClient,
    ) -> None:
        self._generative = generative_client
        self._embedding = embedding_client

    async def generate(self, payload: GeminiGenerateRequest) -> GeminiGenerateResponse:
        try:
            response_data = await self._generative.generate(payload.to_vertex_payload())
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(exc.response.text) from exc
        except Exception as exc:  # pragma: no cover - network errors
            raise RuntimeError(f"Gemini request error: {exc}") from exc

        return GeminiGenerateResponse.model_validate(response_data)

    async def embed(self, payload: GeminiEmbeddingRequest) -> GeminiEmbeddingResponse:
        try:
            response_data = await self._embedding.predict(payload.to_vertex_payload())
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(exc.response.text) from exc
        except Exception as exc:  # pragma: no cover - network errors
            raise RuntimeError(f"Gemini embedding request error: {exc}") from exc

        return GeminiEmbeddingResponse.model_validate(response_data)
