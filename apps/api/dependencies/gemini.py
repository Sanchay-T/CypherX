"""FastAPI dependencies for Gemini services."""

from functools import lru_cache

from apps.core.config import settings
from apps.domain.services.gemini import GeminiService
from apps.infra.clients.gemini_vertex import (
    GeminiEmbeddingClient,
    GeminiGenerativeClient,
)


@lru_cache(maxsize=1)
def get_gemini_generative_client() -> GeminiGenerativeClient:
    try:
        model_path = settings.gemini_model_path
    except RuntimeError as exc:
        raise RuntimeError("Gemini generative configuration incomplete") from exc
    return GeminiGenerativeClient(model_path=model_path)


@lru_cache(maxsize=1)
def get_gemini_embedding_client() -> GeminiEmbeddingClient:
    try:
        model_path = settings.gemini_embedding_model_path
    except RuntimeError as exc:
        raise RuntimeError("Gemini embedding configuration incomplete") from exc
    return GeminiEmbeddingClient(model_path=model_path)


def get_gemini_service() -> GeminiService:
    return GeminiService(get_gemini_generative_client(), get_gemini_embedding_client())
