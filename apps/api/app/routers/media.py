"""Public media — avatar files from R2 (or leftover local disk).

Auth is not required so public profile pages can render the photo.
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, Response

from app.logging_config import get_logger
from app.storage import AVATAR_EXT_TO_MIME, fetch_avatar_from_r2, find_avatar_file

logger = get_logger(__name__)

router = APIRouter(tags=["media"])


@router.get("/media/avatars/{profile_id}", response_model=None)
def get_avatar_file(profile_id: UUID):
    path = find_avatar_file(profile_id)
    if path is not None:
        mime = AVATAR_EXT_TO_MIME.get(path.suffix.lower(), "application/octet-stream")
        return FileResponse(
            path,
            media_type=mime,
            headers={"Cache-Control": "public, max-age=3600"},
        )

    remote = fetch_avatar_from_r2(profile_id)
    if remote is not None:
        body, mime = remote
        return Response(
            content=body,
            media_type=mime,
            headers={"Cache-Control": "public, max-age=3600"},
        )

    logger.debug("avatar miss profile_id=%s", profile_id)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Avatar not found",
    )
