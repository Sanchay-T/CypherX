"""FastAPI dependencies for Mistral OCR."""

from functools import lru_cache

from apps.core.config import settings
from apps.domain.services.mistral import MistralOcrService
from apps.infra.clients.mistral_vertex import MistralVertexClient


@lru_cache(maxsize=1)
def get_mistral_client() -> MistralVertexClient:
    try:
        model_path = settings.mistral_model_path
    except RuntimeError as exc:
        raise RuntimeError("Mistral configuration incomplete") from exc
    return MistralVertexClient(model_path=model_path)


def get_mistral_service() -> MistralOcrService:
    return MistralOcrService(get_mistral_client())
