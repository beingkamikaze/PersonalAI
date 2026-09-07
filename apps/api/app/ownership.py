"""Ownership helpers — never trust client-sent user ids alone."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.logging_config import get_logger
from app.models import AiProfile, User

logger = get_logger(__name__)


def get_owned_profile(db: Session, user: User, profile_id: UUID) -> AiProfile:
    """Load an AI profile and ensure it belongs to the authenticated user."""
    profile = db.query(AiProfile).filter(AiProfile.id == profile_id).one_or_none()
    if profile is None:
        logger.warning("profile not found id=%s user_id=%s", profile_id, user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI profile not found",
        )
    if profile.user_id != user.id:
        logger.warning(
            "profile forbidden profile_id=%s owner=%s requester=%s",
            profile_id,
            profile.user_id,
            user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this profile",
        )
    return profile


def get_primary_profile(db: Session, user: User) -> AiProfile | None:
    """MVP: first (oldest) profile for the user."""
    return (
        db.query(AiProfile)
        .filter(AiProfile.user_id == user.id)
        .order_by(AiProfile.created_at.asc())
        .first()
    )
