from fastapi import APIRouter

from apps.api.routers import (
    auth,
    claude,
    gemini,
    mistral,
    statements,
    entities,
    pdf_verification,
    financial_intelligence,
)
from apps.prototypes.doc_insights import router as doc_insights_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(claude.router)
api_router.include_router(gemini.router)
api_router.include_router(mistral.router)
api_router.include_router(statements.router)
api_router.include_router(entities.router)
api_router.include_router(pdf_verification.router)
api_router.include_router(financial_intelligence.router)
api_router.include_router(doc_insights_router)


@api_router.get("/ping", tags=["debug"])
async def ping():
    return {"pong": True}
