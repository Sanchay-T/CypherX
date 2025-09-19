from fastapi import APIRouter

router = APIRouter()


@router.get("/ping", tags=["debug"])
async def ping():
    return {"pong": True}
