"""Post-owner-chat memory extraction (Phase 3).

Runs in a background task after a successful owner chat turn.
Only stores memories that clear importance + confidence thresholds.
Public visitor chats must never call this.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.completeness import refresh_completeness
from app.config import get_settings
from app.db import SessionLocal
from app.llm import chat_completion_json
from app.logging_config import get_logger
from app.models import Memory

logger = get_logger(__name__)

_ALLOWED_TYPES = {"preference", "fact", "boundary", "project", "other"}

EXTRACT_SYSTEM = """You extract durable episodic memories about a professional from an owner chat turn.
Return ONLY JSON:
{
  "memories": [
    {
      "memory_type": "preference|fact|boundary|project|other",
      "content": "one concise first-person or third-person lasting fact",
      "importance": 0.0-1.0,
      "confidence": 0.0-1.0
    }
  ]
}
Rules:
- Only extract information the USER stated or clearly confirmed in this turn.
- Skip small talk, greetings, and one-off questions with no lasting preference/fact.
- Do not invent employers, emails, phones, salaries, or secrets.
- Prefer preferences (how they like to work), boundaries, and durable facts.
- If nothing worth remembering, return {"memories": []}.
- Keep content under 240 characters each. Max 3 memories per turn.
"""


def extract_memories_from_turn(
    profile_id: UUID,
    user_message: str,
    assistant_reply: str,
) -> None:
    """Background entrypoint — opens its own DB session."""
    db = SessionLocal()
    try:
        _extract(db, profile_id, user_message, assistant_reply)
    except Exception:
        logger.exception(
            "memory extract crashed profile_id=%s", profile_id
        )
        db.rollback()
    finally:
        db.close()


def _extract(
    db: Session,
    profile_id: UUID,
    user_message: str,
    assistant_reply: str,
) -> None:
    settings = get_settings()
    # Skip trivial ultra-short messages to save LLM cost
    if len(user_message.strip()) < 12:
        logger.debug(
            "memory extract skip short message profile_id=%s", profile_id
        )
        return

    logger.info(
        "memory extract start profile_id=%s user_chars=%s reply_chars=%s",
        profile_id,
        len(user_message),
        len(assistant_reply),
    )

    # Existing memories help the model avoid near-duplicates
    existing = (
        db.query(Memory)
        .filter(Memory.ai_profile_id == profile_id)
        .order_by(Memory.importance.desc())
        .limit(40)
        .all()
    )
    existing_blob = "\n".join(f"- {m.content}" for m in existing) or "(none)"

    data = chat_completion_json(
        [
            {"role": "system", "content": EXTRACT_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Existing memories (do not duplicate):\n{existing_blob}\n\n"
                    f"User said:\n{user_message.strip()}\n\n"
                    f"Assistant replied:\n{assistant_reply.strip()[:1500]}"
                ),
            },
        ],
        temperature=0.2,
    )

    raw_list = data.get("memories") if isinstance(data, dict) else None
    if not isinstance(raw_list, list):
        logger.warning("memory extract bad shape profile_id=%s", profile_id)
        return

    existing_norms = {_normalize(m.content) for m in existing}
    written = 0
    skipped = 0

    for item in raw_list[:3]:
        if not isinstance(item, dict):
            skipped += 1
            continue
        content = str(item.get("content") or "").strip()
        if not content:
            skipped += 1
            continue
        try:
            importance = float(item.get("importance", 0))
            confidence = float(item.get("confidence", 0))
        except (TypeError, ValueError):
            skipped += 1
            continue

        if importance < settings.memory_min_importance:
            skipped += 1
            continue
        if confidence < settings.memory_min_confidence:
            skipped += 1
            continue

        mem_type = str(item.get("memory_type") or "fact").strip().lower()
        if mem_type not in _ALLOWED_TYPES:
            mem_type = "other"

        norm = _normalize(content)
        if not norm or _is_duplicate(norm, existing_norms):
            skipped += 1
            continue

        db.add(
            Memory(
                ai_profile_id=profile_id,
                memory_type=mem_type,
                content=content[:2000],
                importance=max(0.0, min(1.0, importance)),
                confidence=max(0.0, min(1.0, confidence)),
                source="owner_chat",
            )
        )
        existing_norms.add(norm)
        written += 1

    if written:
        refresh_completeness(db, profile_id)
        db.commit()
    logger.info(
        "memory extract done profile_id=%s written=%s skipped=%s",
        profile_id,
        written,
        skipped,
    )


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def _is_duplicate(norm: str, existing: set[str]) -> bool:
    """Cheap near-duplicate check — exact or one contains the other (≥ 24 chars)."""
    if norm in existing:
        return True
    for other in existing:
        if len(norm) >= 24 and (norm in other or other in norm):
            return True
    return False
