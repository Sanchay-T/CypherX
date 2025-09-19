from fastapi import APIRouter

from apps.api.routers import auth

api_router = APIRouter()
api_router.include_router(auth.router)


@api_router.get("/ping", tags=["debug"])
async def ping():
    return {"pong": True}
