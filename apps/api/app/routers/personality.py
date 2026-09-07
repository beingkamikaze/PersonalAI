"""Personality read/update — Phase 1."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.logging_config import get_logger
from app.models import PersonalityProfile, StructuredFact, User
from app.ownership import get_owned_profile
from app.schemas import PersonalityOut, PersonalityUpdate

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["personality"])


def _to_out(
    profile_id: UUID, personality: PersonalityProfile, facts: list[StructuredFact]
) -> PersonalityOut:
    return PersonalityOut(
        ai_profile_id=profile_id,
        communication_style=personality.communication_style,
        formality=personality.formality,
        humor=personality.humor,
        verbosity=personality.verbosity,
        directness=personality.directness,
        languages=personality.languages or [],
        traits=personality.traits or [],
        preferences_json=personality.preferences_json or {},
        values_json=personality.values_json or {},
        boundaries_json=personality.boundaries_json or {},
        facts=[{"key": f.key, "value": f.value} for f in facts],
    )


@router.get("/{profile_id}/personality", response_model=PersonalityOut)
def get_personality(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PersonalityOut:
    profile = get_owned_profile(db, user, profile_id)
    personality = (
        db.query(PersonalityProfile)
        .filter(PersonalityProfile.ai_profile_id == profile.id)
        .one_or_none()
    )
    if personality is None:
        logger.debug("personality missing profile_id=%s", profile.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No personality yet — complete the interview first",
        )
    facts = (
        db.query(StructuredFact)
        .filter(StructuredFact.ai_profile_id == profile.id)
        .order_by(StructuredFact.created_at.asc())
        .all()
    )
    return _to_out(profile.id, personality, facts)


@router.patch("/{profile_id}/personality", response_model=PersonalityOut)
def update_personality(
    profile_id: UUID,
    body: PersonalityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PersonalityOut:
    profile = get_owned_profile(db, user, profile_id)
    personality = (
        db.query(PersonalityProfile)
        .filter(PersonalityProfile.ai_profile_id == profile.id)
        .one_or_none()
    )
    if personality is None:
        personality = PersonalityProfile(ai_profile_id=profile.id)
        db.add(personality)
        logger.info("personality created via PATCH profile_id=%s", profile.id)

    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(personality, key, value)

    db.commit()
    db.refresh(personality)
    logger.info(
        "personality updated profile_id=%s fields=%s", profile.id, list(data.keys())
    )
    facts = (
        db.query(StructuredFact)
        .filter(StructuredFact.ai_profile_id == profile.id)
        .order_by(StructuredFact.created_at.asc())
        .all()
    )
    return _to_out(profile.id, personality, facts)
