"""Supabase Auth HTTP client."""

from __future__ import annotations

from typing import Any

import httpx

from apps.core.config import settings

JsonDict = dict[str, Any]


class SupabaseAuthError(RuntimeError):
    def __init__(self, *, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class SupabaseAuthClient:
    def __init__(self, *, base_url: str, anon_key: str, service_role_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self._anon_headers = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json",
        }
        self._admin_headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    async def create_user(self, *, email: str, password: str, metadata: JsonDict) -> JsonDict:
        payload = {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": metadata,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/v1/admin/users",
                json=payload,
                headers=self._admin_headers,
                timeout=15,
            )
        if response.status_code >= 400:
            raise SupabaseAuthError(status_code=response.status_code, message=response.text)
        body = response.json()
        return body.get("user", body)

    async def delete_user(self, user_id: str) -> None:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/auth/v1/admin/users/{user_id}",
                headers=self._admin_headers,
                timeout=10,
            )
        if response.status_code >= 400 and response.status_code != 404:
            raise SupabaseAuthError(status_code=response.status_code, message=response.text)

    async def sign_in_with_password(self, *, email: str, password: str) -> JsonDict:
        payload = {"email": email, "password": password}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/v1/token?grant_type=password",
                json=payload,
                headers=self._anon_headers,
                timeout=15,
            )
        if response.status_code >= 400:
            raise SupabaseAuthError(status_code=response.status_code, message=response.text)
        return response.json()

    async def get_user(self, *, access_token: str) -> JsonDict:
        headers = self._anon_headers | {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/auth/v1/user",
                headers=headers,
                timeout=10,
            )
        if response.status_code >= 400:
            raise SupabaseAuthError(status_code=response.status_code, message=response.text)
        return response.json()


supabase_auth_client = SupabaseAuthClient(
    base_url=settings.supabase_url,
    anon_key=settings.supabase_anon_key,
    service_role_key=settings.supabase_service_key,
)
