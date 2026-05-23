"""Niro backend configuration. Loaded from .env via pydantic-settings.

All env vars are documented in docs/env-vars.md. Never read os.environ directly
elsewhere in the codebase — go through this Settings object instead.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = "dev"
    app_secret: str = Field(min_length=32)

    # AI provider
    ai_provider: str = "azure"
    azure_openai_endpoint: str = "https://ai-for-security.services.ai.azure.com/openai/v1"
    azure_openai_deployment: str = "gpt-chat-latest"
    azure_openai_key: str = Field(min_length=10)

    # DB
    database_url: str = "postgresql+psycopg://niro:niro@localhost:5432/niro"

    # Storage
    storage_backend: str = "local"
    storage_local_path: str = str(REPO_ROOT / ".data" / "blobs")

    # Audit
    audit_retention_days: int = 365


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
