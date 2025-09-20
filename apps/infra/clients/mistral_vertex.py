"""Async client for Mistral OCR via Vertex AI rawPredict."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from google.auth import default
from google.auth.credentials import Credentials
from google.auth.transport.requests import Request


class MistralVertexClient:
    """Minimal client to call the Mistral OCR rawPredict endpoint."""

    _SCOPES = ("https://www.googleapis.com/auth/cloud-platform",)

    def __init__(self, *, model_path: str, request_timeout: float = 120.0) -> None:
        self._model_path = model_path.rstrip(":rawPredict")
        self._model_id = self._model_path.split("/models/")[-1]
        self._timeout = request_timeout
        self._credentials: Credentials | None = None
        self._token_lock = asyncio.Lock()

    async def _load_credentials(self) -> Credentials:
        credentials, _ = await asyncio.to_thread(default, self._SCOPES)
        return credentials

    async def _refresh_credentials(self, credentials: Credentials) -> None:
        await asyncio.to_thread(credentials.refresh, Request())

    async def _get_credentials(self) -> Credentials:
        async with self._token_lock:
            if self._credentials is None:
                self._credentials = await self._load_credentials()

            if not self._credentials.valid or self._credentials.expired:
                await self._refresh_credentials(self._credentials)

            if not self._credentials.token:
                await self._refresh_credentials(self._credentials)

            return self._credentials

    async def _get_access_token(self) -> str:
        credentials = await self._get_credentials()
        if not credentials.token:
            raise RuntimeError("Failed to acquire Vertex access token.")
        return credentials.token

    async def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        token = await self._get_access_token()
        url = f"{self._model_path}:rawPredict"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, headers=headers, json=payload)

        response.raise_for_status()
        return response.json()

    @property
    def model_id(self) -> str:
        return self._model_id
