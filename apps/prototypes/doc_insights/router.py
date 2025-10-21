"""FastAPI router exposing sandbox document extraction endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from apps.prototypes.doc_insights.dependencies import get_document_pipeline
from apps.prototypes.doc_insights.pipeline import PrototypeDocumentPipeline
from apps.prototypes.doc_insights.schemas import PrototypeExtractionEnvelope

router = APIRouter(prefix="/prototypes/doc-insights", tags=["prototypes"])

SUPPORTED_TYPES = {
    "invoice": "Structured extraction for GST/tax invoices.",
    "cheque": "Cheque parsing with fraud indicators.",
    "pan": "PAN card KYC extraction.",
    "aadhaar": "Aadhaar (masked/unmasked) details.",
}


@router.get("/", summary="List available prototype extractors")
async def list_extractors() -> dict[str, str]:
    return SUPPORTED_TYPES


async def _read_file(file: UploadFile) -> bytes:
    if file.content_type not in {
        "application/pdf",
        "application/octet-stream",
        "image/png",
        "image/jpeg",
    }:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Supported content types: PDF, PNG, JPEG.",
        )
    document_bytes = await file.read()
    if not document_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    return document_bytes


async def _run_extraction(
    *,
    document_type: str,
    file: UploadFile,
    pipeline: PrototypeDocumentPipeline,
) -> PrototypeExtractionEnvelope:
    document_bytes = await _read_file(file)
    try:
        result = await pipeline.run(
            document_type=document_type,
            document_bytes=document_bytes,
            file_name=file.filename,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc
    return result


@router.post(
    "/invoice",
    response_model=PrototypeExtractionEnvelope,
    summary="Extract invoice details",
)
async def extract_invoice(
    file: UploadFile = File(...),
    pipeline: PrototypeDocumentPipeline = Depends(get_document_pipeline),
) -> PrototypeExtractionEnvelope:
    return await _run_extraction(document_type="invoice", file=file, pipeline=pipeline)


@router.post(
    "/cheque",
    response_model=PrototypeExtractionEnvelope,
    summary="Extract cheque details",
)
async def extract_cheque(
    file: UploadFile = File(...),
    pipeline: PrototypeDocumentPipeline = Depends(get_document_pipeline),
) -> PrototypeExtractionEnvelope:
    return await _run_extraction(document_type="cheque", file=file, pipeline=pipeline)


@router.post(
    "/kyc/{document_type}",
    response_model=PrototypeExtractionEnvelope,
    summary="Extract KYC document",
)
async def extract_kyc_document(
    document_type: str,
    file: UploadFile = File(...),
    pipeline: PrototypeDocumentPipeline = Depends(get_document_pipeline),
) -> PrototypeExtractionEnvelope:
    if document_type not in {"pan", "aadhaar"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC extractor supports 'pan' or 'aadhaar'.",
        )
    return await _run_extraction(
        document_type=document_type, file=file, pipeline=pipeline
    )
