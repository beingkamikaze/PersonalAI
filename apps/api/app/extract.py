"""Interview answer → structured personality + facts via OpenAI.

The model only structures what the user said; it must not invent employers,
contacts, or secrets.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.completeness import refresh_completeness
from app.db import SessionLocal
from app.llm import chat_completion_json
from app.logging_config import get_logger
from app.models import AiProfile, PersonalityProfile, StructuredFact

logger = get_logger(__name__)

EXTRACT_SYSTEM = """You extract structured professional profile data from interview Q&A.
Return ONLY a JSON object with this shape:
{
  "personality": {
    "communication_style": "string or null",
    "formality": "string or null",
    "humor": "string or null",
    "verbosity": "string or null",
    "directness": "string or null",
    "languages": ["string"],
    "traits": ["string"],
    "preferences_json": {},
    "values_json": {},
    "boundaries_json": {}
  },
  "facts": [{"key": "snake_case_key", "value": "concise fact"}],
  "headline": "optional one-line headline or null",
  "display_name": "optional preferred name or null"
}
Rules:
- Only use information present in the answers. Do not invent employers, emails, phones, or secrets.
- Prefer concise facts (role, skills, projects, audience, openness, boundaries).
- Merge thoughtfully: later answers can refine earlier fields.
"""


def run_interview_extract(
    profile_id: UUID,
    answers: list[dict[str, Any]],
    *,
    refresh: bool = False,
) -> None:
    """Background entrypoint — opens its own DB session (like memory extract)."""
    db = SessionLocal()
    try:
        profile = db.query(AiProfile).filter(AiProfile.id == profile_id).one_or_none()
        if profile is None:
            logger.warning("interview extract missing profile_id=%s", profile_id)
            return
        extract_and_persist(db, profile, answers)
        if refresh:
            refresh_completeness(db, profile.id)
        db.commit()
    except Exception:
        logger.exception("interview extract crashed profile_id=%s", profile_id)
        db.rollback()
    finally:
        db.close()


def extract_and_persist(
    db: Session,
    profile: AiProfile,
    answers: list[dict[str, Any]],
) -> PersonalityProfile:
    """Run LLM extract over all answers so far and upsert personality + facts."""
    logger.info(
        "extract start profile_id=%s answer_count=%s",
        profile.id,
        len(answers),
    )

    qa_text = "\n\n".join(
        f"Q{item.get('question_index', i) + 1}: {item.get('question')}\n"
        f"A: {item.get('answer')}"
        for i, item in enumerate(answers)
    )

    data = chat_completion_json(
        [
            {"role": "system", "content": EXTRACT_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Profile display name so far: {profile.name}\n"
                    f"Headline so far: {profile.headline or ''}\n\n"
                    f"Interview answers:\n{qa_text}"
                ),
            },
        ]
    )

    personality_data = data.get("personality") or {}
    personality = (
        db.query(PersonalityProfile)
        .filter(PersonalityProfile.ai_profile_id == profile.id)
        .one_or_none()
    )
    created = personality is None
    if personality is None:
        personality = PersonalityProfile(ai_profile_id=profile.id)
        db.add(personality)

    # Scalar personality fields
    for field in (
        "communication_style",
        "formality",
        "humor",
        "verbosity",
        "directness",
    ):
        value = personality_data.get(field)
        if value:
            setattr(personality, field, str(value))

    if isinstance(personality_data.get("languages"), list):
        personality.languages = personality_data["languages"]
    if isinstance(personality_data.get("traits"), list):
        personality.traits = personality_data["traits"]
    for json_field in ("preferences_json", "values_json", "boundaries_json"):
        raw = personality_data.get(json_field)
        if isinstance(raw, dict):
            setattr(personality, json_field, raw)

    # Replace interview-sourced facts with the latest extract (keep manual/doc for later)
    deleted = (
        db.query(StructuredFact)
        .filter(
            StructuredFact.ai_profile_id == profile.id,
            StructuredFact.source == "interview",
        )
        .delete()
    )

    fact_count = 0
    for fact in data.get("facts") or []:
        key = str(fact.get("key") or "").strip()
        value = str(fact.get("value") or "").strip()
        if not key or not value:
            continue
        db.add(
            StructuredFact(
                ai_profile_id=profile.id,
                key=key[:120],
                value=value,
                source="interview",
            )
        )
        fact_count += 1

    # Optional profile polish from extract
    headline = data.get("headline")
    if isinstance(headline, str) and headline.strip():
        profile.headline = headline.strip()[:500]
    display_name = data.get("display_name")
    if isinstance(display_name, str) and display_name.strip():
        profile.name = display_name.strip()[:200]

    db.flush()
    logger.info(
        "extract done profile_id=%s personality_created=%s facts_written=%s facts_deleted=%s",
        profile.id,
        created,
        fact_count,
        deleted,
    )
    return personality
