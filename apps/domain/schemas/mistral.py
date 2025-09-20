"""Pydantic models for Mistral OCR responses."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class MistralOcrDimensions(BaseModel):
    """Physical layout metadata for a processed page."""

    width: int | None = None
    height: int | None = None
    dpi: int | None = None


class MistralOcrPage(BaseModel):
    """Single page extracted by the OCR engine."""

    index: int
    markdown: str
    dimensions: MistralOcrDimensions | None = None
    images: list[Any] | None = None


class MistralOcrUsage(BaseModel):
    """Usage metrics returned by the OCR service."""

    pages_processed: int = Field(default=0)
    doc_size_bytes: int = Field(default=0)
    doc_size_mb: float = Field(default=0.0)
    base64_size: int = Field(default=0)


class MistralOcrCostEstimate(BaseModel):
    """Rough cost estimate for informational purposes only."""

    page_cost: float
    size_cost: float
    estimated_total_cost: float
    currency: str = "USD"


class MistralOcrResponse(BaseModel):
    """Normalized OCR response payload."""

    model: str | None = None
    pages: list[MistralOcrPage]
    usage: MistralOcrUsage
    cost: MistralOcrCostEstimate | None = None
    aggregated_markdown: str = Field(default="")
    document_annotation: dict[str, Any] | None = None

    @classmethod
    def from_vertex(
        cls,
        payload: dict[str, Any],
        *,
        base64_size: int,
        page_cost_rate: float,
        size_cost_rate: float,
    ) -> "MistralOcrResponse":
        model = payload.get("model")
        pages_payload = payload.get("pages", [])

        pages = []
        aggregated_markdown: list[str] = []

        for page in pages_payload:
            dimensions_data = page.get("dimensions") or {}
            page_model = MistralOcrPage(
                index=page.get("index", 0),
                markdown=page.get("markdown", ""),
                dimensions=MistralOcrDimensions(**dimensions_data)
                if dimensions_data
                else None,
                images=page.get("images"),
            )
            aggregated_markdown.append(page_model.markdown)
            pages.append(page_model)

        usage_payload = payload.get("usage_info", {})
        doc_size_bytes = usage_payload.get("doc_size_bytes", 0)
        doc_size_mb = doc_size_bytes / (1024 * 1024) if doc_size_bytes else 0.0
        pages_processed = usage_payload.get("pages_processed", len(pages))

        usage = MistralOcrUsage(
            pages_processed=pages_processed,
            doc_size_bytes=doc_size_bytes,
            doc_size_mb=round(doc_size_mb, 6),
            base64_size=base64_size,
        )

        page_cost = (pages_processed / 1000) * page_cost_rate
        size_cost = doc_size_mb * size_cost_rate
        estimated_total_cost = max(page_cost, size_cost)

        cost = None
        if estimated_total_cost > 0:
            cost = MistralOcrCostEstimate(
                page_cost=round(page_cost, 6),
                size_cost=round(size_cost, 6),
                estimated_total_cost=round(estimated_total_cost, 6),
            )

        return cls(
            model=model,
            pages=pages,
            usage=usage,
            cost=cost,
            aggregated_markdown="\n\n".join(filter(None, aggregated_markdown)),
            document_annotation=payload.get("document_annotation"),
        )
