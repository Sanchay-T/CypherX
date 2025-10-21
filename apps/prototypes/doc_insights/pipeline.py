"""Prototype pipeline that chains Mistral OCR with GPT-4o structured parsing."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from datetime import date
from typing import Callable, Dict, Iterable, Optional
from uuid import uuid4

from openai import OpenAI

from apps.core.config import settings
from apps.domain.schemas.mistral import MistralOcrResponse
from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
from apps.prototypes.doc_insights import schemas

InsightBuilder = Callable[[schemas.ExtractionBase], list[schemas.PrototypeInsight]]


@dataclass(frozen=True)
class DocumentExtractorConfig:
    document_type: str
    schema: type[schemas.ExtractionBase]
    system_prompt: str
    user_prompt: str
    insight_builder: InsightBuilder | None = None


def _default_insights(_: schemas.ExtractionBase) -> list[schemas.PrototypeInsight]:
    return []


class PrototypeDocumentPipeline:
    """Coordinates OCR + GPT extraction for sandbox endpoints."""

    def __init__(
        self,
        *,
        mistral_service: MistralOcrService,
        openai_client: OpenAI,
        extractors: Iterable[DocumentExtractorConfig],
    ) -> None:
        if not openai_client:
            raise RuntimeError(
                "OpenAI client is required for document insights prototype."
            )

        self._mistral = mistral_service
        self._openai = openai_client

        self._extractors: Dict[str, DocumentExtractorConfig] = {
            config.document_type: config for config in extractors
        }

    def _get_extractor(self, document_type: str) -> DocumentExtractorConfig:
        try:
            return self._extractors[document_type]
        except KeyError as exc:
            raise KeyError(
                f"Unsupported prototype document type '{document_type}'"
            ) from exc

    async def _call_mistral(self, document: bytes) -> MistralOcrResponse:
        return await self._mistral.analyze(
            document=document, options=MistralOcrOptions()
        )

    async def _call_openai(
        self,
        *,
        extractor: DocumentExtractorConfig,
        ocr_text: str,
        file_name: str | None,
    ) -> schemas.ExtractionBase:
        """OpenAI call is synchronous; run in the default executor to keep FastAPI happy."""

        schema_json = extractor.schema.model_json_schema()
        schema_json["required"] = list(schema_json.get("properties", {}).keys())
        schema_repr = json.dumps(
            schema_json["properties"], ensure_ascii=False, indent=2
        )

        def _invoke() -> schemas.ExtractionBase:
            response = self._openai.chat.completions.create(
                model=settings.openai_model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"{extractor.system_prompt}\n\n"
                            "You MUST respond with a JSON object that includes every field defined below. "
                            "If a value is missing, set it to null and add a note in 'validation_errors'.\n"
                            f"Schema properties:\n{schema_repr}"
                        ),
                    },
                    {
                        "role": "user",
                        "content": extractor.user_prompt.format(
                            ocr_text=ocr_text,
                            file_name=file_name or "uploaded document",
                        ),
                    },
                ],
            )
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("OpenAI returned empty response content.")
            payload = json.loads(content)
            return extractor.schema.model_validate(payload)

        loop = asyncio.get_running_loop()
        try:
            return await loop.run_in_executor(None, _invoke)
        except Exception as exc:  # pragma: no cover - external failure
            raise RuntimeError(f"OpenAI extraction failed: {exc}") from exc

    async def run(
        self,
        *,
        document_type: str,
        document_bytes: bytes,
        file_name: str | None = None,
    ) -> schemas.PrototypeExtractionEnvelope:
        extractor = self._get_extractor(document_type)

        ocr_response = await self._call_mistral(document_bytes)
        if not ocr_response.aggregated_markdown:
            aggregated_text = "\n\n".join(
                page.markdown for page in ocr_response.pages if page.markdown
            )
        else:
            aggregated_text = ocr_response.aggregated_markdown

        structured = await self._call_openai(
            extractor=extractor,
            ocr_text=aggregated_text,
            file_name=file_name,
        )

        insight_builder = extractor.insight_builder or _default_insights
        insights = insight_builder(structured)

        preview = next(
            (page.markdown for page in ocr_response.pages if page.markdown), None
        )

        return schemas.PrototypeExtractionEnvelope(
            request_id=str(uuid4()),
            document_type=document_type,
            structured_result=structured,
            insights=insights,
            ocr_preview_markdown=preview,
            ocr_usage=ocr_response.usage.model_dump(),
            ocr_cost=ocr_response.cost.model_dump() if ocr_response.cost else None,
            raw_model_response={
                "ocr_model": ocr_response.model,
                "gpt_model": settings.openai_model,
            },
        )


def invoice_insights(
    payload: schemas.InvoiceExtraction,
) -> list[schemas.PrototypeInsight]:
    insights: list[schemas.PrototypeInsight] = []
    if payload.total_amount:
        insights.append(
            schemas.PrototypeInsight(
                title="Invoice Value",
                detail=f"Total due: {payload.currency or '₹'} {payload.total_amount:,.2f}",
            )
        )
    overdue = _detect_overdue(payload.due_date)
    if overdue:
        insights.append(
            schemas.PrototypeInsight(
                title="Invoice is overdue",
                detail=f"Due date {payload.due_date} appears to be in the past.",
                severity="warning",
            )
        )
    if payload.validation_errors:
        insights.append(
            schemas.PrototypeInsight(
                title="Validation Issues",
                detail="; ".join(payload.validation_errors),
                severity="warning",
            )
        )
    return insights


def cheque_insights(
    payload: schemas.ChequeExtraction,
) -> list[schemas.PrototypeInsight]:
    insights: list[schemas.PrototypeInsight] = []
    if payload.amount_in_numbers:
        insights.append(
            schemas.PrototypeInsight(
                title="Cheque Amount",
                detail=f"₹ {payload.amount_in_numbers:,.2f}",
            )
        )
    if payload.fraud_indicators:
        insights.append(
            schemas.PrototypeInsight(
                title="Fraud Indicators",
                detail=", ".join(payload.fraud_indicators),
                severity="critical",
            )
        )
    if payload.is_post_dated:
        insights.append(
            schemas.PrototypeInsight(
                title="Post-dated Cheque",
                detail="Cheque date appears to be in the future.",
                severity="warning",
            )
        )
    return insights


def kyc_insights(payload: schemas.ExtractionBase) -> list[schemas.PrototypeInsight]:
    if not payload.validation_errors:
        return [
            schemas.PrototypeInsight(
                title="Document looks valid",
                detail="No critical validation errors detected.",
            )
        ]
    return [
        schemas.PrototypeInsight(
            title="Validation Issues",
            detail="; ".join(payload.validation_errors),
            severity="warning",
        )
    ]


def _detect_overdue(due_date: Optional[str]) -> bool:
    if not due_date:
        return False
    try:
        parsed = date.fromisoformat(due_date)
    except ValueError:
        return False
    return parsed < date.today()
