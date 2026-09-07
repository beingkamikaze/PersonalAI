from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_API_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_API_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    supabase_url: str
    # Same publishable/anon key as the web app (for Auth /user verify)
    supabase_anon_key: str | None = None
    # Legacy HS256 secret (optional if project still has shared secret)
    supabase_jwt_secret: str | None = None
    cors_origins: str = "http://localhost:3000"
    # Phase 1 — OpenAI (change OPENAI_MODEL in .env to switch models)
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    # DEBUG | INFO | WARNING | ERROR
    log_level: str = "INFO"

    @property
    def sqlalchemy_database_url(self) -> str:
        """Ensure SQLAlchemy uses the psycopg3 driver."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def auth_user_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/user"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
