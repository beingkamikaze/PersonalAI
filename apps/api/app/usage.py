"""Free-plan usage limits (Phase 5). Billing can wait — enforce soft caps."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.logging_config import get_logger
from app.models import Conversation, Document, Message

logger = get_logger(__name__)


def count_owner_messages_today(db: Session, profile_id: UUID) -> int:
    """Count user-role messages in owner conversations since UTC midnight."""
    start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return (
        db.query(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .filter(
            Conversation.ai_profile_id == profile_id,
            Conversation.channel == "owner",
            Message.role == "user",
            Message.created_at >= start,
        )
        .scalar()
        or 0
    )


def count_documents(db: Session, profile_id: UUID) -> int:
    return (
        db.query(func.count(Document.id))
        .filter(Document.ai_profile_id == profile_id)
        .scalar()
        or 0
    )


def assert_owner_chat_allowed(db: Session, profile_id: UUID) -> int:
    """Raise 429 if free daily owner-chat quota is exhausted. Returns remaining."""
    settings = get_settings()
    limit = settings.free_owner_chats_per_day
    used = count_owner_messages_today(db, profile_id)
    remaining = max(0, limit - used)
    if used >= limit:
        logger.warning(
            "usage owner chat limit profile_id=%s used=%s limit=%s",
            profile_id,
            used,
            limit,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Free plan limit: {limit} chats with your AI per day. "
                "Try again tomorrow (billing comes later)."
            ),
        )
    return remaining


def assert_document_allowed(db: Session, profile_id: UUID) -> int:
    """Raise 429 if document count would exceed free plan max."""
    settings = get_settings()
    limit = settings.free_max_documents
    used = count_documents(db, profile_id)
    remaining = max(0, limit - used)
    if used >= limit:
        logger.warning(
            "usage document limit profile_id=%s used=%s limit=%s",
            profile_id,
            used,
            limit,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Free plan limit: {limit} knowledge sources. "
                "Delete one to add another (billing comes later)."
            ),
        )
    return remaining


def usage_snapshot(db: Session, profile_id: UUID) -> dict[str, int]:
    settings = get_settings()
    chats_used = count_owner_messages_today(db, profile_id)
    docs_used = count_documents(db, profile_id)
    return {
        "owner_chats_used_today": chats_used,
        "owner_chats_limit": settings.free_owner_chats_per_day,
        "owner_chats_remaining": max(
            0, settings.free_owner_chats_per_day - chats_used
        ),
        "documents_used": docs_used,
        "documents_limit": settings.free_max_documents,
        "documents_remaining": max(0, settings.free_max_documents - docs_used),
    }
