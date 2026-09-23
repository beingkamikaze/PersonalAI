"""Account deletion — wipe owner data, files, and the Supabase Auth user."""

from __future__ import annotations

import shutil

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import delete as sa_delete
from sqlalchemy.orm import Session

from app.auth import bearer_scheme, get_current_user
from app.config import Settings, get_settings
from app.db import get_db
from app.logging_config import get_logger
from app.models import AiProfile, Document, User
from app.schemas import AccountDeleteIn
from app.storage import delete_avatar_files, delete_file

logger = get_logger(__name__)

router = APIRouter(tags=["account"])


def _expected_confirmation(user: User) -> str:
    email = (user.email or "").strip().lower()
    return email or "delete"


def _delete_auth_user(
    auth_id: str,
    credentials: HTTPAuthorizationCredentials | None,
    settings: Settings,
) -> None:
    """Best-effort Auth user delete. App data is already gone if this fails."""
    base = settings.supabase_url.rstrip("/")
    service_key = (settings.supabase_service_role_key or "").strip()
    headers: dict[str, str]
    url: str

    if service_key:
        url = f"{base}/auth/v1/admin/users/{auth_id}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
        }
    elif credentials is not None and credentials.credentials:
        url = f"{base}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {credentials.credentials}",
            "apikey": settings.supabase_anon_key or "",
        }
    else:
        logger.warning("auth user delete skipped — no service role or user token")
        return

    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.delete(url, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("auth user delete request failed auth_id=%s error=%s", auth_id, exc)
        return

    if res.status_code >= 400:
        logger.warning(
            "auth user delete failed auth_id=%s status=%s body=%s",
            auth_id,
            res.status_code,
            res.text[:300],
        )
        return
    logger.info("auth user deleted auth_id=%s", auth_id)


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    body: AccountDeleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> Response:
    expected = _expected_confirmation(user)
    got = (body.confirmation or "").strip().lower()
    if got != expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation does not match.",
        )

    profiles = db.query(AiProfile).filter(AiProfile.user_id == user.id).all()
    for profile in profiles:
        docs = (
            db.query(Document).filter(Document.ai_profile_id == profile.id).all()
        )
        for doc in docs:
            delete_file(doc.file_url)
        delete_avatar_files(profile.id)
        folder = settings.upload_path / str(profile.id)
        if folder.is_dir():
            shutil.rmtree(folder, ignore_errors=True)

    auth_id = user.auth_provider_id
    user_id = user.id
    # Drop loaded related rows from the session so flush does not try to
    # nullify NOT NULL FKs (ai_profiles.user_id). DB CASCADE removes them.
    db.expunge_all()
    db.execute(sa_delete(User).where(User.id == user_id))
    db.commit()
    logger.info("account deleted user_id=%s auth_id=%s", user_id, auth_id)
    _delete_auth_user(auth_id, credentials, settings)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
