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

    # LLM provider: "openai" (default) or "azure"
    llm_provider: str = "openai"

    # Public OpenAI (platform.openai.com)
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # Azure OpenAI — set LLM_PROVIDER=azure and these three
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str | None = None
    azure_openai_api_version: str = "2024-08-01-preview"

    # Embeddings (Phase 2 RAG) — defaults match text-embedding-3-small (1536 dims)
    openai_embedding_model: str = "text-embedding-3-small"
    # Azure: separate embedding deployment name (when embedding provider is azure)
    azure_openai_embedding_deployment: str | None = None
    # Optional override: "openai" | "azure" | blank (= same as LLM_PROVIDER)
    # Lets you keep chat on Azure and embeddings on platform OpenAI.
    embedding_provider: str | None = None
    embedding_dimensions: int = 1536

    # Local file storage for knowledge uploads (avatars use R2 when configured)
    upload_dir: str = "uploads"
    max_upload_bytes: int = 8 * 1024 * 1024  # 8 MB
    max_avatar_bytes: int = 2 * 1024 * 1024  # 2 MB

    # Cloudflare R2 (S3-compatible) — avatars
    r2_account_id: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket_avatars: str | None = None
    r2_public_base_url: str | None = None

    # RAG retrieval
    rag_top_k: int = 6

    # Phase 3 — memory extract / retrieve thresholds (0–1)
    memory_min_importance: float = 0.55
    memory_min_confidence: float = 0.6
    memory_top_k: int = 8

    # Phase 4 — public chat rate limit (in-process; Redis later)
    public_chat_rate_limit: int = 20
    public_chat_rate_window_seconds: int = 3600

    # Phase 5 — safety + free-plan caps (billing later)
    chat_max_input_chars: int = 2000
    chat_max_output_chars: int = 2500
    free_owner_chats_per_day: int = 40
    free_max_documents: int = 8
    # Skip temperature on first LLM call for models that only allow default (e.g. gpt-5)
    llm_omit_temperature: bool = False

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

    @property
    def effective_llm_provider(self) -> str:
        """Normalize provider; prefer azure when azure endpoint+key are set and provider says azure."""
        provider = (self.llm_provider or "openai").strip().lower()
        if provider in ("azure", "azure_openai", "azure-openai"):
            return "azure"
        return "openai"

    @property
    def chat_model_id(self) -> str:
        """Model id for OpenAI, or deployment name for Azure."""
        if self.effective_llm_provider == "azure":
            return (self.azure_openai_deployment or self.openai_model).strip()
        return self.openai_model

    @property
    def effective_embedding_provider(self) -> str:
        """Provider used only for embeddings (can differ from chat)."""
        override = (self.embedding_provider or "").strip().lower()
        if override in ("azure", "azure_openai", "azure-openai"):
            return "azure"
        if override in ("openai", "platform", "oai"):
            return "openai"
        return self.effective_llm_provider

    @property
    def embedding_model_id(self) -> str:
        """Embedding model id (OpenAI) or Azure embedding deployment name."""
        if self.effective_embedding_provider == "azure":
            return (
                self.azure_openai_embedding_deployment
                or self.openai_embedding_model
            ).strip()
        return self.openai_embedding_model.strip()

    @property
    def upload_path(self) -> Path:
        """Absolute path for local document uploads."""
        path = Path(self.upload_dir)
        if not path.is_absolute():
            path = _API_ROOT / path
        return path

    @property
    def r2_configured(self) -> bool:
        """True when uploads can go to Cloudflare R2."""
        return all(
            (
                (self.r2_account_id or "").strip(),
                (self.r2_access_key_id or "").strip(),
                (self.r2_secret_access_key or "").strip(),
                (self.r2_bucket_avatars or "").strip(),
            )
        )

    @property
    def r2_endpoint_url(self) -> str:
        account = (self.r2_account_id or "").strip()
        return f"https://{account}.r2.cloudflarestorage.com"

    @property
    def r2_public_base(self) -> str:
        return (self.r2_public_base_url or "").strip().rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
