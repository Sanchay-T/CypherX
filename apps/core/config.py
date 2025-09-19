"""Application configuration."""

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env",),
        case_sensitive=False,
        extra="ignore",
    )

    api_title: str = "CypherX API"
    api_version: str = "0.1.0"
    api_env: Literal["development", "staging", "production"] = "development"

    supabase_url: str = Field(alias="SUPABASE_URL")
    supabase_anon_key: str = Field(alias="SUPABASE_ANON_KEY")
    supabase_service_role: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE")
    supabase_service_role_legacy: str | None = Field(
        default=None, alias="SUPABSE_SERVICE_ROLE"
    )

    supabase_direct_url: str | None = Field(default=None, alias="SUPABASE_DIRECT_URL")
    supabase_direct_url_legacy: str | None = Field(
        default=None, alias="SUPABSE_DIRECT_URL"
    )

    supabase_session_pooler_url: str | None = Field(
        default=None, alias="SUPABASE_SESSION_POOLER"
    )
    supabase_session_pooler_url_legacy: str | None = Field(
        default=None, alias="SUPABSE_SESSION_POOLER"
    )
    supabase_transaction_pooler_url: str | None = Field(
        default=None, alias="SUPABASE_TRANSACTION_POOLER"
    )
    supabase_transaction_pooler_url_legacy: str | None = Field(
        default=None, alias="SUPABSE_TRANSACTION_POOLER"
    )

    database_url: str | None = Field(default=None, alias="DATABASE_URL")

    supabase_jwt_secret: str | None = Field(default=None, alias="SUPABASE_JWT_SECRET")
    legacy_jwt_secret: str | None = Field(default=None, alias="LEGACY_JWT_KEY")

    def model_post_init(self, __context: object) -> None:  # pragma: no cover - simple wiring
        if not self.supabase_service_role and self.supabase_service_role_legacy:
            object.__setattr__(
                self, "supabase_service_role", self.supabase_service_role_legacy
            )
        if not self.supabase_direct_url and self.supabase_direct_url_legacy:
            object.__setattr__(
                self, "supabase_direct_url", self.supabase_direct_url_legacy
            )
        if (
            not self.supabase_session_pooler_url
            and self.supabase_session_pooler_url_legacy
        ):
            object.__setattr__(
                self,
                "supabase_session_pooler_url",
                self.supabase_session_pooler_url_legacy,
            )
        if (
            not self.supabase_transaction_pooler_url
            and self.supabase_transaction_pooler_url_legacy
        ):
            object.__setattr__(
                self,
                "supabase_transaction_pooler_url",
                self.supabase_transaction_pooler_url_legacy,
            )
        if not self.supabase_jwt_secret and self.legacy_jwt_secret:
            object.__setattr__(self, "supabase_jwt_secret", self.legacy_jwt_secret)

    @property
    def supabase_service_key(self) -> str:
        if not self.supabase_service_role:
            raise RuntimeError(
                "Supabase service role key is required. Set SUPABASE_SERVICE_ROLE or SUPABSE_SERVICE_ROLE."
            )
        return self.supabase_service_role

    @property
    def jwt_secret(self) -> str | None:
        return self.supabase_jwt_secret

    @property
    def database_dsn(self) -> str:
        if self.supabase_session_pooler_url:
            return self.supabase_session_pooler_url
        if self.supabase_direct_url:
            return self.supabase_direct_url
        if self.database_url:
            return self.database_url
        raise RuntimeError(
            "Database DSN not configured. Provide SUPABASE_SESSION_POOLER, SUPABASE_DIRECT_URL, or DATABASE_URL."
        )


settings = Settings()
