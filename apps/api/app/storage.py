"""Local filesystem helpers for uploaded knowledge files (Phase 2).

Files live under apps/api/uploads/{profile_id}/{document_id}_{safe_name}.
Object storage (S3/R2/Supabase Storage) can replace this later without changing
the documents.file_url contract — store a path or signed URL string.
"""

from __future__ import annotations

import re
from pathlib import Path
from uuid import UUID

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)

_SAFE_NAME = re.compile(r"[^a-zA-Z0-9._-]+")


def ensure_upload_root() -> Path:
    """Create the upload root directory if missing."""
    root = get_settings().upload_path
    root.mkdir(parents=True, exist_ok=True)
    return root


def safe_filename(name: str) -> str:
    """Strip path separators and odd characters from a user-supplied filename."""
    base = Path(name).name.strip() or "file"
    cleaned = _SAFE_NAME.sub("_", base).strip("._") or "file"
    return cleaned[:180]


def document_path(profile_id: UUID, document_id: UUID, filename: str) -> Path:
    """Absolute path where a document's bytes should live."""
    root = ensure_upload_root()
    folder = root / str(profile_id)
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{document_id}_{safe_filename(filename)}"


def save_bytes(profile_id: UUID, document_id: UUID, filename: str, data: bytes) -> str:
    """Write bytes to disk; return a relative path string for documents.file_url."""
    path = document_path(profile_id, document_id, filename)
    path.write_bytes(data)
    # Store path relative to upload root so the API can move the root later
    rel = str(path.relative_to(get_settings().upload_path)).replace("\\", "/")
    logger.info(
        "storage saved profile_id=%s document_id=%s bytes=%s path=%s",
        profile_id,
        document_id,
        len(data),
        rel,
    )
    return rel


def resolve_file_url(file_url: str | None) -> Path | None:
    """Resolve a stored file_url to an absolute Path, or None if missing."""
    if not file_url:
        return None
    # Absolute paths (legacy) or relative to upload root
    candidate = Path(file_url)
    if not candidate.is_absolute():
        candidate = get_settings().upload_path / file_url
    if not candidate.is_file():
        logger.warning("storage missing file path=%s", candidate)
        return None
    return candidate


def delete_file(file_url: str | None) -> None:
    """Best-effort delete of a stored file."""
    path = resolve_file_url(file_url)
    if path is None:
        return
    try:
        path.unlink(missing_ok=True)
        logger.info("storage deleted path=%s", path)
    except OSError as exc:
        logger.warning("storage delete failed path=%s error=%s", path, exc)
