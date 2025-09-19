"""Claude Sonnet 4 endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status

from apps.api.dependencies.claude import get_claude_service
from apps.domain.schemas.claude import ClaudeChatRequest, ClaudeChatResponse
from apps.domain.services.claude import ClaudeService

router = APIRouter(prefix="/ai/claude", tags=["ai"])


@router.post("/sonnet-4", response_model=ClaudeChatResponse)
async def invoke_claude_sonnet4(
    payload: ClaudeChatRequest,
    claude_service: ClaudeService = Depends(get_claude_service),
) -> ClaudeChatResponse:
    try:
        return await claude_service.chat(payload)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
