"""Mistral OCR endpoints."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from apps.api.dependencies.mistral import get_mistral_service
from apps.domain.schemas.mistral import MistralOcrResponse
from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService

router = APIRouter(prefix="/ai/mistral", tags=["ai"])


@router.post("/ocr", response_model=MistralOcrResponse)
async def mistral_ocr(
    file: UploadFile = File(...),
    pages: str | None = Form(default=None),
    service: MistralOcrService = Depends(get_mistral_service),
) -> MistralOcrResponse:
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported.",
        )

    document_bytes = await file.read()
    if not document_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")

    try:
        return await service.analyze(
            document=document_bytes,
            options=MistralOcrOptions(pages=pages),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
