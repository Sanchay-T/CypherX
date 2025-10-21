from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[2]))

import pytest

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


from apps.domain.schemas.mistral import (
    MistralOcrCostEstimate,
    MistralOcrDimensions,
    MistralOcrPage,
    MistralOcrResponse,
    MistralOcrUsage,
)
from apps.prototypes.doc_insights.pipeline import (
    DocumentExtractorConfig,
    PrototypeDocumentPipeline,
    invoice_insights,
)
from apps.prototypes.doc_insights.schemas import InvoiceExtraction


@dataclass
class FakeMistral:
    markdown: str

    async def analyze(
        self, *, document: bytes, options
    ):  # pragma: no cover - struct is simple
        return MistralOcrResponse(
            model="test-mistral",
            pages=[
                MistralOcrPage(
                    index=0,
                    markdown=self.markdown,
                    dimensions=MistralOcrDimensions(width=100, height=100, dpi=300),
                    images=None,
                )
            ],
            usage=MistralOcrUsage(
                pages_processed=1,
                doc_size_bytes=len(document),
                doc_size_mb=0.01,
                base64_size=128,
            ),
            cost=MistralOcrCostEstimate(
                page_cost=0.001, size_cost=0.002, estimated_total_cost=0.002
            ),
            aggregated_markdown=self.markdown,
        )


class FakeOpenAI:
    def __init__(self, payload):
        self._payload = payload
        self.chat = self.Chat(self)

    class Chat:
        def __init__(self, outer):
            self.completions = self.Completions(outer)

        class Completions:
            def __init__(self, outer):
                self._outer = outer

            def create(self, *, model, temperature, response_format, messages):  # noqa: ANN001,S101
                import json

                content = json.dumps(self._outer._payload)

                class Message:
                    def __init__(self, content):
                        self.content = content

                class Choice:
                    def __init__(self, content):
                        self.message = Message(content)

                return type("Response", (), {"choices": [Choice(content)]})()


@pytest.mark.anyio
async def test_invoice_pipeline_generates_envelope():
    mistral = FakeMistral("Invoice #123 for ₹10,000 due on 2024-08-15")
    openai_payload = {
        "document_type": "invoice",
        "invoice_type": "tax_invoice",
        "invoice_number": "INV-123",
        "invoice_date": "2024-08-01",
        "due_date": "2024-08-15",
        "vendor_details": {"name": "Acme Corp"},
        "buyer_details": {"name": "CypherX"},
        "line_items": [],
        "subtotal": 9500.0,
        "cgst": 250.0,
        "sgst": 250.0,
        "igst": 0.0,
        "total_tax": 500.0,
        "total_amount": 10000.0,
        "payment_terms": "Net 14",
        "bank_details": {},
        "currency": "INR",
        "validation_errors": [],
        "confidence": 0.92,
    }
    openai = FakeOpenAI(openai_payload)

    pipeline = PrototypeDocumentPipeline(
        mistral_service=mistral,
        openai_client=openai,  # type: ignore[arg-type]
        extractors=[
            DocumentExtractorConfig(
                document_type="invoice",
                schema=InvoiceExtraction,
                system_prompt="",
                user_prompt="{ocr_text}",
                insight_builder=invoice_insights,
            )
        ],
    )

    envelope = await pipeline.run(
        document_type="invoice",
        document_bytes=b"dummy",
        file_name="invoice.pdf",
    )

    assert envelope.document_type == "invoice"
    assert envelope.structured_result.invoice_number == "INV-123"
    assert any(insight.title == "Invoice Value" for insight in envelope.insights)
