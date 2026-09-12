"""Memory API — list / edit / delete (Phase 3). Owner only."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.logging_config import get_logger
from app.models import Memory, User
from app.ownership import get_owned_profile
from app.schemas import MemoryOut, MemoryUpdate

logger = get_logger(__name__)

router = APIRouter(tags=["memories"])

_ALLOWED_TYPES = {"preference", "fact", "boundary", "project", "other"}


@router.get("/ai/{profile_id}/memories", response_model=list[MemoryOut])
def list_memories(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Memory]:
    profile = get_owned_profile(db, user, profile_id)
    rows = (
        db.query(Memory)
        .filter(Memory.ai_profile_id == profile.id)
        .order_by(Memory.importance.desc(), Memory.created_at.desc())
        .all()
    )
    logger.debug("memories list profile_id=%s count=%s", profile.id, len(rows))
    return rows


@router.patch("/memories/{memory_id}", response_model=MemoryOut)
def update_memory(
    memory_id: UUID,
    body: MemoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Memory:
    mem = db.query(Memory).filter(Memory.id == memory_id).one_or_none()
    if mem is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    get_owned_profile(db, user, mem.ai_profile_id)

    data = body.model_dump(exclude_unset=True)
    if "memory_type" in data and data["memory_type"] is not None:
        mt = str(data["memory_type"]).strip().lower()
        if mt not in _ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"memory_type must be one of: {', '.join(sorted(_ALLOWED_TYPES))}",
            )
        data["memory_type"] = mt
    if "content" in data and data["content"] is not None:
        data["content"] = str(data["content"]).strip()

    for key, value in data.items():
        setattr(mem, key, value)

    db.commit()
    db.refresh(mem)
    logger.info("memory updated id=%s profile_id=%s", mem.id, mem.ai_profile_id)
    return mem


@router.delete("/memories/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(
    memory_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    mem = db.query(Memory).filter(Memory.id == memory_id).one_or_none()
    if mem is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    get_owned_profile(db, user, mem.ai_profile_id)
    profile_id = mem.ai_profile_id
    db.delete(mem)
    db.commit()
    logger.info("memory deleted id=%s profile_id=%s", memory_id, profile_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
