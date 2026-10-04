"""Profile completeness scoring (Phase 5).

Single source of truth so interview / ingest / publish don't drift.
Returns 0–100 plus a checklist for the dashboard UI.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import exists
from sqlalchemy.orm import Session

from app.logging_config import get_logger
from app.models import (
    AiProfile,
    Document,
    InterviewSession,
    Memory,
    PersonalityProfile,
)

logger = get_logger(__name__)


@dataclass
class CompletenessReport:
    score: int
    checklist: dict[str, bool]


def compute_completeness(db: Session, profile: AiProfile) -> CompletenessReport:
    """Derive completeness from current DB state (idempotent).

    Checklist flags are one SELECT of EXISTS clauses. The score column is
    persisted only by refresh_completeness, which mutations call.
    """
    has_basics = bool(profile.name and (profile.headline or profile.bio))
    flags = db.query(
        exists()
        .where(
            InterviewSession.ai_profile_id == profile.id,
            InterviewSession.status == "completed",
        )
        .label("has_interview"),
        exists()
        .where(PersonalityProfile.ai_profile_id == profile.id)
        .label("has_personality"),
        exists()
        .where(
            Document.ai_profile_id == profile.id,
            Document.status == "ready",
        )
        .label("has_doc"),
        exists()
        .where(Memory.ai_profile_id == profile.id)
        .label("has_memory"),
    ).one()
    has_interview = bool(flags.has_interview)
    has_personality = bool(flags.has_personality)
    has_doc = bool(flags.has_doc)
    has_memory = bool(flags.has_memory)
    has_username = bool(profile.username)
    is_published = profile.visibility == "published"

    checklist = {
        "profile_basics": has_basics,
        "interview_completed": has_interview,
        "personality": has_personality,
        "knowledge_ready": has_doc,
        "has_memory": has_memory,
        "username_set": has_username,
        "published": is_published,
    }

    # Weighted toward the share loop; optional memory is a small bonus
    score = 0
    if has_basics:
        score += 10
    if has_interview:
        score += 25
    if has_personality:
        score += 10
    if has_doc:
        score += 20
    if has_memory:
        score += 5
    if has_username:
        score += 10
    if is_published:
        score += 20
    score = min(100, score)

    return CompletenessReport(score=score, checklist=checklist)


def refresh_completeness(db: Session, profile_id: UUID) -> CompletenessReport:
    """Recompute and persist completeness_score on the profile.

    Flushes pending inserts/deletes first so this transaction's changes are
    visible. Does not commit — the caller does.
    """
    db.flush()
    profile = db.query(AiProfile).filter(AiProfile.id == profile_id).one_or_none()
    if profile is None:
        return CompletenessReport(score=0, checklist={})
    report = compute_completeness(db, profile)
    if profile.completeness_score != report.score:
        logger.info(
            "completeness updated profile_id=%s old=%s new=%s",
            profile_id,
            profile.completeness_score,
            report.score,
        )
        profile.completeness_score = report.score
        db.flush()
    return report
