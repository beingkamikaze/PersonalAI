"""Embedding helpers for Phase 2 RAG (OpenAI or Azure OpenAI)."""

from __future__ import annotations

import time
from typing import Sequence

from app.config import Settings, get_settings
from app.llm import get_embedding_client
from app.logging_config import get_logger

logger = get_logger(__name__)


def embed_texts(
    texts: Sequence[str],
    *,
    settings: Settings | None = None,
) -> list[list[float]]:
    """Return one embedding vector per input text (same order).

    Empty strings are replaced with a single space so the API never gets [].
    Uses EMBEDDING_PROVIDER when set (can differ from chat LLM_PROVIDER).
    """
    settings = settings or get_settings()
    if not texts:
        return []

    cleaned = [t if t.strip() else " " for t in texts]
    client = get_embedding_client(settings)
    model = settings.embedding_model_id
    provider = settings.effective_embedding_provider

    if provider == "azure" and not settings.azure_openai_embedding_deployment:
        raise RuntimeError(
            "Azure embeddings need AZURE_OPENAI_EMBEDDING_DEPLOYMENT, or set "
            "EMBEDDING_PROVIDER=openai with OPENAI_API_KEY for platform embeddings."
        )

    logger.info(
        "embed request provider=%s model=%s count=%s approx_chars=%s",
        provider,
        model,
        len(cleaned),
        sum(len(t) for t in cleaned),
    )
    start = time.perf_counter()
    try:
        response = client.embeddings.create(model=model, input=list(cleaned))
    except Exception:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "embed failed provider=%s model=%s duration_ms=%.1f",
            provider,
            model,
            elapsed_ms,
        )
        raise

    # API may return items out of order — sort by index
    sorted_data = sorted(response.data, key=lambda item: item.index)
    vectors = [list(item.embedding) for item in sorted_data]
    elapsed_ms = (time.perf_counter() - start) * 1000
    dims = len(vectors[0]) if vectors else 0
    logger.info(
        "embed ok provider=%s model=%s duration_ms=%.1f count=%s dims=%s",
        provider,
        model,
        elapsed_ms,
        len(vectors),
        dims,
    )
    return vectors


def embed_query(text: str, *, settings: Settings | None = None) -> list[float]:
    """Embed a single chat query for similarity search."""
    vectors = embed_texts([text], settings=settings)
    return vectors[0]
