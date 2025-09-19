"""Configuration management and environment loading.

Includes the runtime settings object for the FastAPI service. These defaults mirror the
values used by the legacy ingestion tooling so we can run the application locally while
the rest of the infrastructure is being wired up.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_title: str = "CypherX API"
    api_version: str = "0.1.0"
    storage_dir: str = "./.storage"
    legacy_base_dir: str = "old_endpoints/backend"

    class Config:
        env_file = ".env"


settings = Settings()
