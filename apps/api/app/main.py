"""FastAPI app entry — CORS, routers, logging, request timing."""

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.logging_config import get_logger, setup_logging
from app.routers import (
    account,
    ai,
    chat,
    feedback,
    interview,
    knowledge,
    media,
    memory,
    personality,
    public,
)

settings = get_settings()
setup_logging(settings)
logger = get_logger(__name__)

app = FastAPI(title="PersonaAI API", version="0.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(account.router)
app.include_router(ai.router)
app.include_router(interview.router)
app.include_router(personality.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(media.router)
app.include_router(memory.router)
app.include_router(public.router)
app.include_router(feedback.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log method/path/status/duration; attach a short request id for correlation."""
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:8]
    request.state.request_id = request_id
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "request crashed method=%s path=%s request_id=%s duration_ms=%.1f",
            request.method,
            request.url.path,
            request_id,
            elapsed_ms,
        )
        raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    # Skip noisy health probes at INFO; still visible at DEBUG
    if request.url.path == "/health":
        logger.debug(
            "request method=%s path=%s status=%s request_id=%s duration_ms=%.1f",
            request.method,
            request.url.path,
            response.status_code,
            request_id,
            elapsed_ms,
        )
    else:
        level = logger.warning if response.status_code >= 400 else logger.info
        level(
            "request method=%s path=%s status=%s request_id=%s duration_ms=%.1f",
            request.method,
            request.url.path,
            response.status_code,
            request_id,
            elapsed_ms,
        )
    response.headers["X-Request-ID"] = request_id
    return response


@app.on_event("startup")
def on_startup() -> None:
    provider = settings.effective_llm_provider
    logger.info(
        "API startup supabase_url=%s llm_provider=%s chat_model=%s "
        "embedding_provider=%s embedding_model=%s upload_dir=%s "
        "openai_key_set=%s azure_key_set=%s azure_endpoint_set=%s cors=%s "
        "r2_avatars=%s r2_bucket=%s",
        settings.supabase_url,
        provider,
        settings.chat_model_id,
        settings.effective_embedding_provider,
        settings.embedding_model_id,
        settings.upload_path,
        bool(settings.openai_api_key),
        bool(settings.azure_openai_api_key),
        bool(settings.azure_openai_endpoint),
        settings.cors_origin_list,
        settings.r2_configured,
        (settings.r2_bucket_avatars or "").strip() or None,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
