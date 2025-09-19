"""Auth endpoints."""

from fastapi import APIRouter, Depends, Header, HTTPException, status

from apps.api.dependencies.auth import get_auth_service
from apps.domain.schemas.auth import (
    LoginRequest,
    LoginResponse,
    SessionResponse,
    SignupRequest,
    SignupResponse,
)
from apps.domain.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> SignupResponse:
    try:
        return await auth_service.signup(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    try:
        return await auth_service.login(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get("/session", response_model=SessionResponse)
async def session(
    authorization: str | None = Header(default=None, convert_underscores=False),
    auth_service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        return await auth_service.session(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
