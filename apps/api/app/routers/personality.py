"""Personality + structured facts read/update — Phase 1.

Personality PATCH is unchanged (tone fields only).
Facts have a dedicated PATCH so Profile can edit Known facts without
touching personality scalars or the interview extract path.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.logging_config import get_logger
from app.models import PersonalityProfile, StructuredFact, User
from app.ownership import get_owned_profile
from app.schemas import FactsOut, FactsUpdate, PersonalityOut, PersonalityUpdate

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["personality"])


def _facts_list(facts: list[StructuredFact]) -> list[dict[str, str]]:
    return [{"key": f.key, "value": f.value} for f in facts]


def _load_facts(db: Session, profile_id: UUID) -> list[StructuredFact]:
    return (
        db.query(StructuredFact)
        .filter(StructuredFact.ai_profile_id == profile_id)
        .order_by(StructuredFact.created_at.asc())
        .all()
    )


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
        facts=_facts_list(facts),
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
    return _to_out(profile.id, personality, _load_facts(db, profile.id))


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

    # Tone / preference fields only — never mutate structured_facts here.
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(personality, key, value)

    db.commit()
    db.refresh(personality)
    logger.info(
        "personality updated profile_id=%s fields=%s", profile.id, list(data.keys())
    )
    return _to_out(profile.id, personality, _load_facts(db, profile.id))


@router.patch("/{profile_id}/facts", response_model=FactsOut)
def update_facts(
    profile_id: UUID,
    body: FactsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FactsOut:
    """Upsert Known facts used in the chat prompt (Profile editor).

    - Existing keys: update value; mark source=manual so re-interview extract
      does not wipe owner corrections (see extract.py interview-only delete).
    - Empty value: delete that key.
    - Keys omitted from the body are left unchanged.
    """
    profile = get_owned_profile(db, user, profile_id)
    existing = {
        f.key: f
        for f in db.query(StructuredFact)
        .filter(StructuredFact.ai_profile_id == profile.id)
        .all()
    }

    updated = 0
    created = 0
    deleted = 0
    for item in body.facts:
        key = item.key.strip()[:120]
        value = item.value.strip()
        if not key:
            continue
        row = existing.get(key)
        if not value:
            if row is not None:
                db.delete(row)
                deleted += 1
            continue
        if row is not None:
            row.value = value
            # Owner edit — preserve across future interview re-extract.
            row.source = "manual"
            updated += 1
        else:
            db.add(
                StructuredFact(
                    ai_profile_id=profile.id,
                    key=key,
                    value=value,
                    source="manual",
                )
            )
            created += 1

    db.commit()
    facts = _load_facts(db, profile.id)
    logger.info(
        "facts updated profile_id=%s updated=%s created=%s deleted=%s total=%s",
        profile.id,
        updated,
        created,
        deleted,
        len(facts),
    )
    return FactsOut(ai_profile_id=profile.id, facts=_facts_list(facts))
