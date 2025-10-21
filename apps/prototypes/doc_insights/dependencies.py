"""FastAPI dependencies for the document insights prototype."""

from __future__ import annotations

from functools import lru_cache

from openai import OpenAI

from apps.api.dependencies.mistral import get_mistral_service
from apps.infra.clients.openai_client import get_openai_client
from apps.prototypes.doc_insights.pipeline import (
    DocumentExtractorConfig,
    PrototypeDocumentPipeline,
    cheque_insights,
    invoice_insights,
    kyc_insights,
)
from apps.prototypes.doc_insights.schemas import (
    AadhaarExtraction,
    InvoiceExtraction,
    PanCardExtraction,
    ChequeExtraction,
)


@lru_cache(maxsize=1)
def get_openai() -> OpenAI:
    client = get_openai_client()
    if not client:
        raise RuntimeError(
            "OpenAI is disabled. Set OPENAI_API_KEY before using prototypes."
        )
    return client


@lru_cache(maxsize=1)
def get_document_pipeline() -> PrototypeDocumentPipeline:
    mistral_service = get_mistral_service()
    openai_client = get_openai()

    extractors = [
        DocumentExtractorConfig(
            document_type="invoice",
            schema=InvoiceExtraction,
            system_prompt=(
                "You are CypherX's accounts receivable specialist. Extract every field from invoices with "
                "great attention to tax details, buyer/seller metadata, line items, and compute totals. "
                "Return strictly valid JSON that matches the provided schema."
            ),
            user_prompt=(
                "File name: {file_name}\n\n"
                "OCR TEXT:\n{ocr_text}\n\n"
                "If information is missing, set the value to null and include a message inside 'validation_errors'."
            ),
            insight_builder=invoice_insights,
        ),
        DocumentExtractorConfig(
            document_type="cheque",
            schema=ChequeExtraction,
            system_prompt=(
                "You are CypherX's cheque operations expert. Parse cheque instruments, detect fraud indicators, "
                "and normalise monetary values. Output JSON only, conforming to the schema."
            ),
            user_prompt=(
                "File name: {file_name}\n\n"
                "OCR TEXT:\n{ocr_text}\n\n"
                "Highlight overwriting, mismatched amounts, or missing signatures inside 'fraud_indicators' and "
                "'validation_errors'."
            ),
            insight_builder=cheque_insights,
        ),
        DocumentExtractorConfig(
            document_type="pan",
            schema=PanCardExtraction,
            system_prompt=(
                "You review Indian PAN cards for KYC onboarding. Extract name, PAN, father name, "
                "birth date, and signal format or quality issues. Respond with JSON only."
            ),
            user_prompt=(
                "OCR TEXT:\n{ocr_text}\n\n"
                "Check if the PAN number conforms to the pattern AAAAAXXXXX and note masking or blur."
            ),
            insight_builder=kyc_insights,
        ),
        DocumentExtractorConfig(
            document_type="aadhaar",
            schema=AadhaarExtraction,
            system_prompt=(
                "You verify Aadhaar documents. Extract the demographic information, indicate if the number is masked, "
                "and report on QR code presence. Output only JSON that matches the schema."
            ),
            user_prompt=(
                "OCR TEXT:\n{ocr_text}\n\n"
                "Mention any missing fields inside 'validation_errors'."
            ),
            insight_builder=kyc_insights,
        ),
    ]

    return PrototypeDocumentPipeline(
        mistral_service=mistral_service,
        openai_client=openai_client,
        extractors=extractors,
    )
