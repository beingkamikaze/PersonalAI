"""In-process rate limiter for public chat (Phase 4).

MVP: single API process memory. Swap for Redis when scaling horizontally.
Default: 20 messages / hour / (IP + username).
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)

_lock = threading.Lock()
# key -> deque of unix timestamps
_hits: dict[str, deque[float]] = defaultdict(deque)


def check_public_chat_rate(ip: str, username: str) -> tuple[bool, int]:
    """Return (allowed, remaining). Prunes timestamps older than 1 hour."""
    settings = get_settings()
    limit = settings.public_chat_rate_limit
    window = settings.public_chat_rate_window_seconds
    key = f"{ip}|{username.lower()}"
    now = time.time()
    cutoff = now - window

    with _lock:
        q = _hits[key]
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= limit:
            logger.warning(
                "public rate limited ip=%s username=%s count=%s limit=%s",
                ip,
                username,
                len(q),
                limit,
            )
            return False, 0
        q.append(now)
        remaining = max(0, limit - len(q))
        return True, remaining
