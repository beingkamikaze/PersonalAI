"""Thin OpenAI Chat Completions wrapper.

Model name comes from Settings.openai_model (env OPENAI_MODEL) so we can
switch models without code changes.
"""

from __future__ import annotations

import json
import time
from typing import Any

from openai import OpenAI

from app.config import Settings, get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)


def get_openai_client(settings: Settings | None = None) -> OpenAI:
    settings = settings or get_settings()
    if not settings.openai_api_key:
        logger.error("OPENAI_API_KEY missing — cannot create OpenAI client")
        raise RuntimeError(
            "OPENAI_API_KEY is not set in apps/api/.env — required for Phase 1"
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
    client = get_openai_client(settings)
    kwargs: dict[str, Any] = {
        "model": settings.openai_model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    msg_count = len(messages)
    approx_chars = sum(len(m.get("content") or "") for m in messages)
    logger.info(
        "openai request model=%s json_mode=%s messages=%s approx_chars=%s",
        settings.openai_model,
        json_mode,
        msg_count,
        approx_chars,
    )
    start = time.perf_counter()
    try:
        response = client.chat.completions.create(**kwargs)
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "openai failed model=%s duration_ms=%.1f error=%s",
            settings.openai_model,
            elapsed_ms,
            exc,
        )
        raise

    elapsed_ms = (time.perf_counter() - start) * 1000
    content = response.choices[0].message.content or ""
    usage = getattr(response, "usage", None)
    logger.info(
        "openai ok model=%s duration_ms=%.1f reply_chars=%s prompt_tokens=%s completion_tokens=%s",
        settings.openai_model,
        elapsed_ms,
        len(content),
        getattr(usage, "prompt_tokens", None),
        getattr(usage, "completion_tokens", None),
    )
    return content


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
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(
            "openai json parse failed error=%s raw_preview=%s",
            exc,
            raw[:200],
        )
        raise
