"""Domain service wrapping Mistral OCR."""

from __future__ import annotations

import base64
from dataclasses import dataclass

import httpx

from apps.domain.schemas.mistral import MistralOcrResponse
from apps.infra.clients.mistral_vertex import MistralVertexClient


@dataclass(frozen=True)
class MistralOcrOptions:
    pages: str | None = None


class MistralOcrService:
    """Coordinates payload preparation and result parsing for Mistral OCR."""

    PAGE_COST_RATE = 0.10  # USD per 1,000 pages processed
    SIZE_COST_RATE = 0.05  # USD per MB processed

    def __init__(self, client: MistralVertexClient) -> None:
        self._client = client

    async def analyze(self, *, document: bytes, options: MistralOcrOptions | None = None) -> MistralOcrResponse:
        if not document:
            raise ValueError("Document payload is empty.")

        base64_pdf = base64.b64encode(document).decode("utf-8")
        payload: dict[str, object] = {
            "model": self._client.model_id,
            "document": {
                "type": "document_url",
                "document_url": f"data:application/pdf;base64,{base64_pdf}",
            },
        }

        if options and options.pages:
            payload["pages"] = options.pages

        try:
            response_data = await self._client.predict(payload)
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(exc.response.text) from exc
        except Exception as exc:  # pragma: no cover - network edge cases
            raise RuntimeError(f"Mistral OCR request error: {exc}") from exc

        return MistralOcrResponse.from_vertex(
            response_data,
            base64_size=len(base64_pdf),
            page_cost_rate=self.PAGE_COST_RATE,
            size_cost_rate=self.SIZE_COST_RATE,
        )
