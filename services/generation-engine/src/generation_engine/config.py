from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    engine_database_url: str = "postgresql+asyncpg://rumah3d:rumah3d@localhost:5432/rumah3d"
    log_level: str = "info"
    sentry_dsn: str | None = None
    engine_version: str = "0.1.0-stub"


@lru_cache
def get_settings() -> Settings:
    return Settings()
