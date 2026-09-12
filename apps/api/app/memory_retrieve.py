"""Retrieve top memories for the owner-chat prompt (Phase 3).

Score = importance × recency decay. Touches last_accessed for returned rows.
Returns [] when the profile has no memories — Phase 1/2 chat unchanged.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import get_settings
from app.logging_config import get_logger
from app.models import Memory

logger = get_logger(__name__)

# Half-life-ish decay: score halves roughly every ~14 days of age
_RECENCY_DAYS = 14.0


def retrieve_memories(
    db: Session,
    profile_id: UUID,
    *,
    top_k: int | None = None,
) -> list[Memory]:
    """Return highest-scoring memories for prompt injection."""
    settings = get_settings()
    k = top_k or settings.memory_top_k

    rows = (
        db.query(Memory)
        .filter(Memory.ai_profile_id == profile_id)
        .all()
    )
    if not rows:
        logger.debug("memory retrieve none profile_id=%s", profile_id)
        return []

    now = datetime.now(timezone.utc)
    scored: list[tuple[float, Memory]] = []
    for mem in rows:
        created = mem.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - created).total_seconds() / 86400.0)
        recency = math.exp(-age_days / _RECENCY_DAYS)
        score = float(mem.importance) * recency
        scored.append((score, mem))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = [m for _, m in scored[:k]]

    # Mark accessed (best-effort; do not fail chat if flush has issues)
    for mem in top:
        mem.last_accessed = now
    try:
        db.flush()
    except Exception:  # noqa: BLE001
        logger.warning("memory last_accessed flush failed profile_id=%s", profile_id)

    logger.info(
        "memory retrieved profile_id=%s total=%s hits=%s",
        profile_id,
        len(rows),
        len(top),
    )
    return top
