"""AI profile CRUD — Phase 0."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.logging_config import get_logger
from app.models import AiProfile, User
from app.ownership import get_owned_profile
from app.schemas import AiProfileCreate, AiProfileOut, AiProfileUpdate

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


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
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    logger.info("profile updated id=%s fields=%s", profile.id, list(data.keys()))
    return profile
