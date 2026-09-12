"""Soft-launch feedback capture (Phase 5).

Auth optional — signed-in users are linked when a valid Bearer token is sent.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth import decode_supabase_token
from app.config import get_settings
from app.db import get_db
from app.logging_config import get_logger
from app.models import Feedback, User
from app.schemas import FeedbackIn, FeedbackOut

logger = get_logger(__name__)

router = APIRouter(tags=["feedback"])
_optional_bearer = HTTPBearer(auto_error=False)


def _optional_user(
    db: Session,
    credentials: HTTPAuthorizationCredentials | None,
) -> User | None:
    """Best-effort user resolve; never raises 401 for feedback."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        settings = get_settings()
        claims = decode_supabase_token(credentials.credentials, settings)
        return (
            db.query(User)
            .filter(User.auth_provider_id == claims.sub)
            .one_or_none()
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("feedback optional auth skipped error=%s", exc)
        return None


@router.post(
    "/feedback",
    response_model=FeedbackOut,
    status_code=201,
)
def submit_feedback(
    body: FeedbackIn,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
) -> FeedbackOut:
    """Store qualitative feedback for soft launch."""
    user = _optional_user(db, credentials)
    source = (body.source or "app").strip().lower()
    if source not in ("app", "public", "landing"):
        source = "app"

    row = Feedback(
        user_id=user.id if user else None,
        email=(body.email.strip() if body.email else None) or (user.email if user else None),
        message=body.message.strip()[:4000],
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    logger.info(
        "feedback saved id=%s source=%s user_id=%s chars=%s",
        row.id,
        source,
        user.id if user else None,
        len(row.message),
    )
    return FeedbackOut(id=row.id, created_at=row.created_at)
