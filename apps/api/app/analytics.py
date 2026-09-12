"""Analytics daily counters (Phase 4)."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.logging_config import get_logger
from app.models import AnalyticsDaily

logger = get_logger(__name__)


def _row(db: Session, profile_id: UUID, day: date) -> AnalyticsDaily:
    row = (
        db.query(AnalyticsDaily)
        .filter(
            AnalyticsDaily.ai_profile_id == profile_id,
            AnalyticsDaily.date == day,
        )
        .one_or_none()
    )
    if row is None:
        row = AnalyticsDaily(
            ai_profile_id=profile_id,
            date=day,
            visits=0,
            conversations=0,
            messages=0,
        )
        db.add(row)
        db.flush()
    return row


def bump_visit(db: Session, profile_id: UUID) -> None:
    row = _row(db, profile_id, date.today())
    row.visits += 1
    logger.debug("analytics visit profile_id=%s day=%s", profile_id, row.date)


def bump_conversation(db: Session, profile_id: UUID) -> None:
    row = _row(db, profile_id, date.today())
    row.conversations += 1
    logger.debug(
        "analytics conversation profile_id=%s day=%s", profile_id, row.date
    )


def bump_message(db: Session, profile_id: UUID) -> None:
    row = _row(db, profile_id, date.today())
    row.messages += 1
    logger.debug("analytics message profile_id=%s day=%s", profile_id, row.date)


def summarize(db: Session, profile_id: UUID) -> dict[str, int]:
    """Return visits_today + 7-day rollups."""
    today = date.today()
    start = today - timedelta(days=6)
    rows = (
        db.query(AnalyticsDaily)
        .filter(
            AnalyticsDaily.ai_profile_id == profile_id,
            AnalyticsDaily.date >= start,
            AnalyticsDaily.date <= today,
        )
        .all()
    )
    visits_today = 0
    visits_7d = 0
    conversations_7d = 0
    messages_7d = 0
    for row in rows:
        visits_7d += row.visits
        conversations_7d += row.conversations
        messages_7d += row.messages
        if row.date == today:
            visits_today = row.visits
    return {
        "visits_today": visits_today,
        "visits_7d": visits_7d,
        "conversations_7d": conversations_7d,
        "messages_7d": messages_7d,
    }
