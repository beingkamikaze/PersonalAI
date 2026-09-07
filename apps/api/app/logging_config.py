"""Central logging setup for the PersonaAI API.

Usage:
    from app.logging_config import get_logger
    logger = get_logger(__name__)
    logger.info("event", extra={...})  # or plain message with %s

Never log secrets: API keys, JWTs, passwords, full Authorization headers.
"""

from __future__ import annotations

import logging
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.config import Settings

_CONFIGURED = False


def setup_logging(settings: Settings | None = None) -> None:
    """Configure root logging once (safe to call on reload)."""
    global _CONFIGURED
    level_name = "INFO"
    if settings is not None:
        level_name = (settings.log_level or "INFO").upper()

    level = getattr(logging, level_name, logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)

    # Avoid duplicate handlers when uvicorn --reload re-imports the app
    if not any(
        isinstance(h, logging.StreamHandler) and getattr(h, "_personaai", False)
        for h in root.handlers
    ):
        handler = logging.StreamHandler(sys.stdout)
        handler._personaai = True  # type: ignore[attr-defined]
        handler.setLevel(level)
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        root.addHandler(handler)

    # Quiet noisy third-party loggers unless debugging
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    _CONFIGURED = True
    logging.getLogger("app").info("Logging configured (level=%s)", level_name)


def get_logger(name: str) -> logging.Logger:
    """Return a module logger (prefer __name__)."""
    return logging.getLogger(name)
