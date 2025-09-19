from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    api_title: str = "CypherX API"
    api_version: str = "0.1.0"
    storage_dir: str = "./storage"
    legacy_base_dir: str = "old_endpoints/backend"

    class Config:
        env_file = ".env"


settings = Settings()

print(settings.api_title)
print(settings.legacy_base_dir)
