"""Gemini endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status

from apps.api.dependencies.gemini import get_gemini_service
from apps.domain.schemas.gemini import (
    GeminiEmbeddingRequest,
    GeminiEmbeddingResponse,
    GeminiGenerateRequest,
    GeminiGenerateResponse,
)
from apps.domain.services.gemini import GeminiService

router = APIRouter(prefix="/ai/gemini", tags=["ai"])


@router.post("/generate", response_model=GeminiGenerateResponse)
async def generate_content(
    payload: GeminiGenerateRequest,
    service: GeminiService = Depends(get_gemini_service),
) -> GeminiGenerateResponse:
    try:
        return await service.generate(payload)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post("/embeddings", response_model=GeminiEmbeddingResponse)
async def create_embeddings(
    payload: GeminiEmbeddingRequest,
    service: GeminiService = Depends(get_gemini_service),
) -> GeminiEmbeddingResponse:
    try:
        return await service.embed(payload)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
