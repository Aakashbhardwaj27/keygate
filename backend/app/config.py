"""Application configuration via environment variables."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──
    app_name: str = "KeyGate"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"  # development | staging | production

    # ── Server ──
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Database ──
    database_url: str = "sqlite+aiosqlite:///./keygate.db"
    # For production, use PostgreSQL:
    # database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/keygate"

    # ── Auth ──
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    admin_email: str = "admin@keygate.dev"
    admin_password: str = "changeme"

    # ── Encryption ──
    encryption_key: Optional[str] = None  # Fernet key for encrypting vendor secrets

    # ── Vendor: OpenAI ──
    openai_admin_key: Optional[str] = None
    openai_org_id: Optional[str] = None

    # ── Vendor: Anthropic ──
    anthropic_admin_key: Optional[str] = None
    anthropic_org_id: Optional[str] = None

    # ── Vendor: Azure OpenAI ──
    azure_subscription_id: Optional[str] = None
    azure_resource_group: Optional[str] = None
    azure_tenant_id: Optional[str] = None

    # ── Vendor: Google Vertex AI ──
    gcp_project_id: Optional[str] = None
    gcp_region: str = "us-central1"
    gcp_service_account_json: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
