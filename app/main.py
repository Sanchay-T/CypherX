from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routers import router as api_router


app = FastAPI(title=settings.api_title, version=settings.api_version)

# cors for local dev testing right now

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


@app.get("/health/live")
async def live():
    return {"status": "live"}


@app.get("/health/ready")
async def live():
    return {"status": "ready"}
