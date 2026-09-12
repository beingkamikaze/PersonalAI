"""AI profile CRUD + publish/unpublish + analytics (Phase 0 + 4)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.analytics import summarize
from app.auth import get_current_user
from app.completeness import refresh_completeness
from app.db import get_db
from app.logging_config import get_logger
from app.models import AiProfile, User
from app.ownership import get_owned_profile
from app.schemas import (
    AiProfileCreate,
    AiProfileOut,
    AiProfileUpdate,
    AnalyticsSummaryOut,
    PublishIn,
)
from app.usage import usage_snapshot
from app.usernames import validate_username

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


def _apply_username(db: Session, profile: AiProfile, raw: str) -> None:
    """Normalize, validate, and set username; raise 400/409 on conflict."""
    try:
        username = validate_username(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    clash = (
        db.query(AiProfile)
        .filter(AiProfile.username == username, AiProfile.id != profile.id)
        .one_or_none()
    )
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )
    profile.username = username


@router.post("", response_model=AiProfileOut, status_code=status.HTTP_201_CREATED)
def create_ai_profile(
    body: AiProfileCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiProfile:
    existing = (
        db.query(AiProfile)
        .filter(AiProfile.user_id == user.id)
        .order_by(AiProfile.created_at.asc())
        .first()
    )
    if existing is not None:
        logger.warning("create profile conflict user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has an AI profile",
        )

    profile = AiProfile(
        user_id=user.id,
        name=body.name.strip(),
        headline=body.headline.strip() if body.headline else None,
        avatar_url=body.avatar_url,
        visibility="draft",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    logger.info("profile created id=%s user_id=%s", profile.id, user.id)
    return profile


@router.get("/me", response_model=AiProfileOut)
def get_my_ai_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiProfile:
    profile = (
        db.query(AiProfile)
        .filter(AiProfile.user_id == user.id)
        .order_by(AiProfile.created_at.asc())
        .first()
    )
    if profile is None:
        logger.debug("get /ai/me no profile user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI profile yet",
        )
    return profile


@router.patch("/{profile_id}", response_model=AiProfileOut)
def update_ai_profile(
    profile_id: UUID,
    body: AiProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiProfile:
    profile = get_owned_profile(db, user, profile_id)
    data = body.model_dump(exclude_unset=True)

    if "username" in data:
        raw = data.pop("username")
        if raw is None or not str(raw).strip():
            # Clearing username while published is not allowed
            if profile.visibility == "published":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unpublish before clearing username",
                )
            profile.username = None
        else:
            _apply_username(db, profile, str(raw))

    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(profile, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        ) from exc
    db.refresh(profile)
    logger.info("profile updated id=%s fields=%s", profile.id, list(body.model_dump(exclude_unset=True).keys()))
    return profile


@router.post("/{profile_id}/publish", response_model=AiProfileOut)
def publish_ai(
    profile_id: UUID,
    body: PublishIn | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiProfile:
    """Set visibility=published. Requires a unique username."""
    profile = get_owned_profile(db, user, profile_id)
    payload = body or PublishIn()
    data = payload.model_dump(exclude_unset=True)

    if "username" in data and data["username"]:
        _apply_username(db, profile, str(data["username"]))
    for key in ("contact_email", "calendar_link", "bio", "headline"):
        if key in data:
            value = data[key]
            if isinstance(value, str):
                value = value.strip() or None
            setattr(profile, key, value)

    if not profile.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose a username before publishing",
        )

    profile.visibility = "published"
    # Persist real completeness from checklist (publish is one checklist item)
    refresh_completeness(db, profile.id)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        ) from exc
    db.refresh(profile)
    logger.info(
        "profile published id=%s username=%s completeness=%s",
        profile.id,
        profile.username,
        profile.completeness_score,
    )
    return profile


@router.post("/{profile_id}/unpublish", response_model=AiProfileOut)
def unpublish_ai(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiProfile:
    profile = get_owned_profile(db, user, profile_id)
    profile.visibility = "draft"
    db.commit()
    db.refresh(profile)
    logger.info("profile unpublished id=%s username=%s", profile.id, profile.username)
    return profile


@router.get("/{profile_id}/analytics/summary", response_model=AnalyticsSummaryOut)
def analytics_summary(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnalyticsSummaryOut:
    profile = get_owned_profile(db, user, profile_id)
    report = refresh_completeness(db, profile.id)
    stats = summarize(db, profile.id)
    usage = usage_snapshot(db, profile.id)
    path = f"/u/{profile.username}" if profile.username else None
    db.commit()
    logger.debug(
        "analytics summary profile_id=%s visits_7d=%s completeness=%s",
        profile.id,
        stats["visits_7d"],
        report.score,
    )
    return AnalyticsSummaryOut(
        visibility=profile.visibility,
        username=profile.username,
        completeness_score=report.score,
        completeness_checklist=report.checklist,
        visits_today=stats["visits_today"],
        visits_7d=stats["visits_7d"],
        conversations_7d=stats["conversations_7d"],
        messages_7d=stats["messages_7d"],
        public_url_path=path,
        owner_chats_used_today=usage["owner_chats_used_today"],
        owner_chats_limit=usage["owner_chats_limit"],
        owner_chats_remaining=usage["owner_chats_remaining"],
        documents_used=usage["documents_used"],
        documents_limit=usage["documents_limit"],
        documents_remaining=usage["documents_remaining"],
    )
