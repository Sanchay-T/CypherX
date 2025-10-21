"""Pydantic models for prototype document extractions."""

from __future__ import annotations

from datetime import date
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator, validator


class ExtractionBase(BaseModel):
    """Common fields shared across document extraction responses."""

    document_type: str
    confidence: float | None = Field(
        default=None,
        description="Optional model supplied confidence score between 0 and 1.",
        ge=0.0,
        le=1.0,
    )
    validation_errors: list[str] = Field(default_factory=list)


class InvoiceLineItem(BaseModel):
    item_description: str | None = Field(
        default=None, description="Primary description of the line item."
    )
    quantity: float | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None)
    tax_rate: float | None = Field(default=None)
    line_total: float | None = Field(default=None)
    hsn_code: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _fill_description(cls, data: Any) -> Any:
        if isinstance(data, dict):
            description = (
                data.get("item_description")
                or data.get("description")
                or data.get("item")
                or data.get("narration")
            )
            if description:
                data.setdefault("item_description", description)
        return data

    @validator("line_total", always=True)
    def _infer_line_total(
        cls, value: float | None, values: dict[str, Any]
    ) -> float | None:
        qty = values.get("quantity")
        unit_price = values.get("unit_price")
        if value is None and qty is not None and unit_price is not None:
            return round(qty * unit_price, 2)
        return value


class PartyDetails(BaseModel):
    name: str | None = None
    address: str | None = None
    gstin: str | None = None
    pan: str | None = None
    contact: str | dict[str, Any] | list[Any] | None = None

    @validator("contact", pre=True)
    def _normalise_contact(cls, value: Any) -> Any:
        if isinstance(value, dict):
            parts = [
                f"{key}: {val}" for key, val in value.items() if val not in (None, "")
            ]
            return ", ".join(parts) if parts else None
        if isinstance(value, list):
            parts = [str(item) for item in value if item not in (None, "")]
            return ", ".join(parts) if parts else None
        return value


class InvoiceExtraction(ExtractionBase):
    document_type: Literal["invoice"]
    invoice_type: Literal[
        "tax_invoice", "proforma", "credit_note", "debit_note", "other"
    ] = "other"
    invoice_number: str | None = None
    invoice_date: str | None = None
    due_date: str | None = None
    vendor_details: PartyDetails = Field(default_factory=PartyDetails)
    buyer_details: PartyDetails = Field(default_factory=PartyDetails)
    line_items: list[InvoiceLineItem] = Field(default_factory=list)
    subtotal: float | None = None
    cgst: float | None = None
    sgst: float | None = None
    igst: float | None = None
    total_tax: float | None = None
    total_amount: float | None = None
    payment_terms: str | None = None
    bank_details: dict[str, Any] = Field(default_factory=dict)
    currency: str | None = None

    @validator("total_tax", always=True)
    def _calculate_total_tax(
        cls, value: float | None, values: dict[str, Any]
    ) -> float | None:
        if value is not None:
            return value
        taxes = [
            values.get("cgst") or 0.0,
            values.get("sgst") or 0.0,
            values.get("igst") or 0.0,
        ]
        total = sum(taxes)
        return round(total, 2) if total else None


class ChequeExtraction(ExtractionBase):
    document_type: Literal["cheque"]
    bank_name: str | None = None
    branch_name: str | None = None
    ifsc_code: str | None = None
    micr_code: str | None = None
    cheque_number: str | None = None
    account_number: str | None = None
    account_holder_name: str | None = None
    date: str | None = None
    amount_in_words: str | None = None
    amount_in_numbers: float | None = None
    payee_name: str | None = None
    signature_present: bool | None = None
    is_cancelled: bool | None = None
    is_post_dated: bool | None = None
    is_stale: bool | None = None
    crossing_type: Literal["account_payee", "bearer", "order", "not_marked"] | None = (
        None
    )
    fraud_indicators: list[str] = Field(default_factory=list)


class PanCardExtraction(ExtractionBase):
    document_type: Literal["pan_card"]
    pan_number: str | None = None
    name: str | None = None
    father_name: str | None = None
    date_of_birth: str | None = None
    is_valid_format: bool | None = None
    is_masked: bool | None = None
    document_quality: Literal["clear", "blurry", "low_quality", "unknown"] | None = None


class AadhaarExtraction(ExtractionBase):
    document_type: Literal["aadhaar"]
    aadhaar_number: str | None = None
    name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    address: str | None = None
    is_masked: bool | None = None
    qr_code_present: bool | None = None
    is_valid_format: bool | None = None


class PrototypeInsight(BaseModel):
    title: str
    detail: str | None = None
    severity: Literal["info", "warning", "critical"] = "info"


class PrototypeExtractionEnvelope(BaseModel):
    """Wrapper returned by sandbox endpoints."""

    request_id: str
    document_type: str
    structured_result: ExtractionBase | dict[str, Any]
    insights: list[PrototypeInsight] = Field(default_factory=list)
    ocr_preview_markdown: str | None = None
    ocr_usage: dict[str, Any] | None = None
    ocr_cost: dict[str, Any] | None = None
    raw_model_response: dict[str, Any] | None = None


PrototypeSchemas = {
    "invoice": InvoiceExtraction,
    "cheque": ChequeExtraction,
    "pan": PanCardExtraction,
    "aadhaar": AadhaarExtraction,
}


def get_schema_for_document(document_type: str) -> type[ExtractionBase]:
    schema = PrototypeSchemas.get(document_type)
    if not schema:
        raise KeyError(
            f"No prototype schema registered for document type '{document_type}'"
        )
    return schema
