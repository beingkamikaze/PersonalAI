"""Chat Completions wrapper — OpenAI platform or Azure OpenAI.

Provider is selected via LLM_PROVIDER in apps/api/.env:
  - openai  → OPENAI_API_KEY + OPENAI_MODEL
  - azure   → AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_DEPLOYMENT
"""

from __future__ import annotations

import json
import time
from typing import Any

from openai import AzureOpenAI, OpenAI

from app.config import Settings, get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


def get_chat_client(settings: Settings | None = None) -> OpenAI | AzureOpenAI:
    """Build the correct SDK client for chat (LLM_PROVIDER)."""
    settings = settings or get_settings()
    return _client_for_provider(settings.effective_llm_provider, settings)


def get_embedding_client(settings: Settings | None = None) -> OpenAI | AzureOpenAI:
    """Build the SDK client for embeddings (EMBEDDING_PROVIDER or LLM_PROVIDER)."""
    settings = settings or get_settings()
    return _client_for_provider(settings.effective_embedding_provider, settings)


def _client_for_provider(
    provider: str, settings: Settings
) -> OpenAI | AzureOpenAI:
    if provider == "azure":
        if not settings.azure_openai_endpoint or not settings.azure_openai_api_key:
            logger.error("Azure OpenAI missing endpoint or api key")
            raise RuntimeError(
                "Azure embeddings/chat require AZURE_OPENAI_ENDPOINT and "
                "AZURE_OPENAI_API_KEY in apps/api/.env"
            )
        logger.debug(
            "Using AzureOpenAI endpoint=%s api_version=%s",
            settings.azure_openai_endpoint,
            settings.azure_openai_api_version,
        )
        return AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint.rstrip("/"),
        )

    if not settings.openai_api_key:
        logger.error("OPENAI_API_KEY missing — cannot create OpenAI client")
        raise RuntimeError(
            "OPENAI_API_KEY is not set in apps/api/.env. "
            "For Azure chat + OpenAI embeddings, set EMBEDDING_PROVIDER=openai "
            "and OPENAI_API_KEY=sk-..."
        )
    return OpenAI(api_key=settings.openai_api_key)


def chat_completion(
    messages: list[dict[str, str]],
    *,
    settings: Settings | None = None,
    temperature: float = 0.4,
    json_mode: bool = False,
) -> str:
    """Return the assistant message content as a string."""
    settings = settings or get_settings()
    client = get_chat_client(settings)
    model = settings.chat_model_id
    provider = settings.effective_llm_provider

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    msg_count = len(messages)
    approx_chars = sum(len(m.get("content") or "") for m in messages)
    logger.info(
        "llm request provider=%s model=%s json_mode=%s messages=%s approx_chars=%s",
        provider,
        model,
        json_mode,
        msg_count,
        approx_chars,
    )
    start = time.perf_counter()
    try:
        response = client.chat.completions.create(**kwargs)
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        # Some Azure deployments reject temperature / json_mode — retry once without extras
        if provider == "azure" and _should_retry_without_extras(exc):
            logger.warning(
                "llm azure retry without temperature/json_mode error=%s",
                exc,
            )
            bare = {"model": model, "messages": messages}
            try:
                response = client.chat.completions.create(**bare)
            except Exception as retry_exc:
                elapsed_ms = (time.perf_counter() - start) * 1000
                logger.error(
                    "llm failed provider=%s model=%s duration_ms=%.1f error=%s",
                    provider,
                    model,
                    elapsed_ms,
                    retry_exc,
                )
                raise
        else:
            logger.error(
                "llm failed provider=%s model=%s duration_ms=%.1f error=%s",
                provider,
                model,
                elapsed_ms,
                exc,
            )
            raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    content = response.choices[0].message.content or ""
    usage = getattr(response, "usage", None)
    logger.info(
        "llm ok provider=%s model=%s duration_ms=%.1f reply_chars=%s prompt_tokens=%s completion_tokens=%s",
        provider,
        model,
        elapsed_ms,
        len(content),
        getattr(usage, "prompt_tokens", None),
        getattr(usage, "completion_tokens", None),
    )
    return content


def _should_retry_without_extras(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        token in text
        for token in (
            "temperature",
            "response_format",
            "json_object",
            "unsupported_parameter",
            "unsupported value",
        )
    )


def chat_completion_json(
    messages: list[dict[str, str]],
    *,
    settings: Settings | None = None,
    temperature: float = 0.2,
) -> dict[str, Any]:
    """Ask the model for JSON and parse it."""
    raw = chat_completion(
        messages, settings=settings, temperature=temperature, json_mode=True
    )
    # If the model ignored json_mode, try to extract a JSON object from the text
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError as exc:
                logger.error(
                    "llm json parse failed error=%s raw_preview=%s",
                    exc,
                    raw[:200],
                )
                raise
        logger.error("llm json parse failed raw_preview=%s", raw[:200])
        raise
