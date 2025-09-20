from fastapi import APIRouter

from apps.api.routers import auth, claude, gemini, mistral

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(claude.router)
api_router.include_router(gemini.router)
api_router.include_router(mistral.router)


@api_router.get("/ping", tags=["debug"])
async def ping():
    return {"pong": True}
