"""Async clients for Google Gemini endpoints on Vertex AI."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from google.auth import default
from google.auth.credentials import Credentials
from google.auth.transport.requests import Request


class _VertexAuthManager:
    """Handles application default credential refresh with async helpers."""

    _SCOPES = ("https://www.googleapis.com/auth/cloud-platform",)

    def __init__(self) -> None:
        self._credentials: Credentials | None = None
        self._lock = asyncio.Lock()

    async def _ensure_credentials(self) -> Credentials:
        async with self._lock:
            if self._credentials is None:
                self._credentials, _ = await asyncio.to_thread(default, self._SCOPES)

            if not self._credentials.valid or self._credentials.expired:
                await asyncio.to_thread(self._credentials.refresh, Request())

            if not self._credentials.token:
                await asyncio.to_thread(self._credentials.refresh, Request())

            return self._credentials

    async def get_token(self) -> str:
        credentials = await self._ensure_credentials()
        if not credentials.token:
            raise RuntimeError("Failed to acquire Vertex access token.")
        return credentials.token


class GeminiGenerativeClient:
    """Client for Gemini :generateContent endpoints."""

    def __init__(self, *, model_path: str, request_timeout: float = 60.0) -> None:
        self._model_path = model_path
        self._timeout = request_timeout
        self._auth = _VertexAuthManager()

    async def generate(self, payload: dict[str, Any], *, stream: bool = False) -> dict[str, Any]:
        if stream:
            raise NotImplementedError("Gemini streaming is not implemented yet.")

        token = await self._auth.get_token()
        url = f"{self._model_path}:generateContent"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, headers=headers, json=payload)

        response.raise_for_status()
        return response.json()


class GeminiEmbeddingClient:
    """Client for Gemini embedding :predict endpoint."""

    def __init__(self, *, model_path: str, request_timeout: float = 60.0) -> None:
        self._model_path = model_path
        self._timeout = request_timeout
        self._auth = _VertexAuthManager()

    async def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        token = await self._auth.get_token()
        url = f"{self._model_path}:predict"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, headers=headers, json=payload)

        response.raise_for_status()
        return response.json()
