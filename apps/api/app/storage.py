"""Upload helpers — Cloudflare R2 when configured, local disk otherwise.

Knowledge: R2 key `docs/{profile_id}/{document_id}_{safe_name}` (or local uploads/).
Avatars: R2 key `{profile_id}/avatar.*` (or local); served via GET /media/avatars/{id}.
"""

from __future__ import annotations

import re
import time
from functools import lru_cache
from pathlib import Path
from uuid import UUID

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger(__name__)

_SAFE_NAME = re.compile(r"[^a-zA-Z0-9._-]+")
_R2_DOC_PREFIX = "docs/"

_DOC_MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
}


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


def document_object_key(profile_id: UUID, document_id: UUID, filename: str) -> str:
    return f"{_R2_DOC_PREFIX}{profile_id}/{document_id}_{safe_filename(filename)}"


def is_r2_document_url(file_url: str | None) -> bool:
    return bool(file_url and file_url.startswith(_R2_DOC_PREFIX))


def save_bytes(profile_id: UUID, document_id: UUID, filename: str, data: bytes) -> str:
    """Store knowledge bytes; return R2 object key or local relative path."""
    settings = get_settings()
    if settings.r2_configured:
        return _save_bytes_r2(profile_id, document_id, filename, data)
    return _save_bytes_local(profile_id, document_id, filename, data)


def _save_bytes_local(
    profile_id: UUID, document_id: UUID, filename: str, data: bytes
) -> str:
    path = document_path(profile_id, document_id, filename)
    path.write_bytes(data)
    rel = str(path.relative_to(get_settings().upload_path)).replace("\\", "/")
    logger.info(
        "storage saved local document profile_id=%s document_id=%s bytes=%s path=%s",
        profile_id,
        document_id,
        len(data),
        rel,
    )
    return rel


def _save_bytes_r2(
    profile_id: UUID, document_id: UUID, filename: str, data: bytes
) -> str:
    settings = get_settings()
    bucket = (settings.r2_bucket_avatars or "").strip()
    key = document_object_key(profile_id, document_id, filename)
    ext = Path(filename).suffix.lower()
    mime = _DOC_MIME.get(ext, "application/octet-stream")
    try:
        _r2_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=mime,
            CacheControl="private, max-age=0",
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception(
            "storage r2 document upload failed profile_id=%s document_id=%s",
            profile_id,
            document_id,
        )
        raise RuntimeError("Could not store document in object storage") from exc
    logger.info(
        "storage saved r2 document profile_id=%s document_id=%s bytes=%s",
        profile_id,
        document_id,
        len(data),
    )
    return key


def resolve_file_url(file_url: str | None) -> Path | None:
    """Resolve a stored local file_url to an absolute Path, or None if missing."""
    if not file_url or is_r2_document_url(file_url):
        return None
    candidate = Path(file_url)
    if not candidate.is_absolute():
        candidate = get_settings().upload_path / file_url
    if not candidate.is_file():
        logger.warning("storage missing file path=%s", candidate)
        return None
    return candidate


def read_document_bytes(file_url: str | None) -> bytes | None:
    """Load knowledge file bytes from R2 or local disk."""
    if not file_url:
        return None
    if is_r2_document_url(file_url):
        return _read_document_r2(file_url)
    path = resolve_file_url(file_url)
    if path is None:
        return None
    return path.read_bytes()


def _read_document_r2(key: str) -> bytes | None:
    settings = get_settings()
    bucket = (settings.r2_bucket_avatars or "").strip()
    try:
        obj = _r2_client().get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()
    except ClientError as exc:
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code in ("NoSuchKey", "404", "NotFound"):
            return None
        logger.warning("storage r2 document fetch failed key=%s error=%s", key, exc)
        return None
    except BotoCoreError as exc:
        logger.warning("storage r2 document fetch failed key=%s error=%s", key, exc)
        return None


def delete_file(file_url: str | None) -> None:
    """Best-effort delete of a stored knowledge file (R2 or local)."""
    if not file_url:
        return
    if is_r2_document_url(file_url):
        _delete_document_r2(file_url)
        return
    path = resolve_file_url(file_url)
    if path is None:
        return
    try:
        path.unlink(missing_ok=True)
        logger.info("storage deleted path=%s", path)
    except OSError as exc:
        logger.warning("storage delete failed path=%s error=%s", path, exc)


def _delete_document_r2(key: str) -> None:
    settings = get_settings()
    bucket = (settings.r2_bucket_avatars or "").strip()
    try:
        _r2_client().delete_object(Bucket=bucket, Key=key)
        logger.info("storage deleted r2 document key=%s", key)
    except (BotoCoreError, ClientError) as exc:
        logger.warning("storage r2 document delete failed key=%s error=%s", key, exc)


# --- Avatars (local disk; same upload root as knowledge files) ---

AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
AVATAR_MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
AVATAR_EXT_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def avatar_public_url(profile_id: UUID, version: int | None = None) -> str:
    """Local FastAPI path used when R2 is not configured."""
    path = f"/media/avatars/{profile_id}"
    if version is not None:
        return f"{path}?v={version}"
    return path


def avatar_object_key(profile_id: UUID, ext: str) -> str:
    return f"{profile_id}/avatar{ext}"


@lru_cache
def _r2_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=(settings.r2_access_key_id or "").strip(),
        aws_secret_access_key=(settings.r2_secret_access_key or "").strip(),
        region_name="auto",
        config=BotoConfig(signature_version="s3v4"),
    )


def _avatar_folder(profile_id: UUID) -> Path:
    folder = ensure_upload_root() / str(profile_id)
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def find_avatar_file(profile_id: UUID) -> Path | None:
    """Return the stored avatar file for a profile, if any."""
    folder = ensure_upload_root() / str(profile_id)
    if not folder.is_dir():
        return None
    matches = sorted(
        p
        for p in folder.glob("avatar.*")
        if p.is_file() and p.suffix.lower() in AVATAR_EXTENSIONS
    )
    return matches[0] if matches else None


def fetch_avatar_from_r2(profile_id: UUID) -> tuple[bytes, str] | None:
    """Download avatar bytes from R2, or None if missing."""
    settings = get_settings()
    if not settings.r2_configured:
        return None
    bucket = (settings.r2_bucket_avatars or "").strip()
    prefix = f"{profile_id}/"
    try:
        client = _r2_client()
        listed = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        keys = [
            obj["Key"]
            for obj in listed.get("Contents") or []
            if Path(obj["Key"]).name.startswith("avatar")
        ]
        if not keys:
            return None
        key = sorted(keys)[0]
        obj = client.get_object(Bucket=bucket, Key=key)
        body = obj["Body"].read()
        suffix = Path(key).suffix.lower()
        mime = (
            obj.get("ContentType")
            or AVATAR_EXT_TO_MIME.get(suffix, "application/octet-stream")
        )
        return body, mime
    except (BotoCoreError, ClientError) as exc:
        logger.warning(
            "storage r2 avatar fetch failed profile_id=%s error=%s",
            profile_id,
            exc,
        )
        return None


def delete_avatar_files(profile_id: UUID) -> None:
    """Remove avatar objects in R2 (if configured) and any leftover local files."""
    settings = get_settings()
    if settings.r2_configured:
        bucket = (settings.r2_bucket_avatars or "").strip()
        prefix = f"{profile_id}/"
        try:
            client = _r2_client()
            listed = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
            keys = [
                {"Key": obj["Key"]}
                for obj in listed.get("Contents") or []
                if Path(obj["Key"]).name.startswith("avatar")
            ]
            if keys:
                client.delete_objects(Bucket=bucket, Delete={"Objects": keys})
                logger.info(
                    "storage deleted r2 avatars profile_id=%s count=%s",
                    profile_id,
                    len(keys),
                )
        except (BotoCoreError, ClientError) as exc:
            logger.warning(
                "storage r2 avatar delete failed profile_id=%s error=%s",
                profile_id,
                exc,
            )
    _delete_local_avatar_files(profile_id)


def _delete_local_avatar_files(profile_id: UUID) -> None:
    """Best-effort delete of on-disk avatar files."""
    folder = get_settings().upload_path / str(profile_id)
    if not folder.is_dir():
        return
    for path in folder.glob("avatar.*"):
        if not path.is_file() or path.suffix.lower() not in AVATAR_EXTENSIONS:
            continue
        try:
            path.unlink(missing_ok=True)
            logger.info("storage deleted local avatar path=%s", path)
        except OSError as exc:
            logger.warning(
                "storage local avatar delete failed path=%s error=%s", path, exc
            )


def extension_for_avatar(filename: str, content_type: str | None) -> str | None:
    """Pick a safe image extension from MIME or filename, else None."""
    mime = (content_type or "").split(";")[0].strip().lower()
    if mime in AVATAR_MIME_TO_EXT:
        return AVATAR_MIME_TO_EXT[mime]
    ext = Path(filename or "").suffix.lower()
    if ext in AVATAR_EXTENSIONS:
        return ".jpg" if ext == ".jpeg" else ext
    return None


def save_avatar(profile_id: UUID, ext: str, data: bytes) -> str:
    """Store avatar bytes; return a public URL (R2) or local /media path."""
    if ext not in AVATAR_EXTENSIONS:
        raise ValueError(f"Unsupported avatar extension: {ext}")
    settings = get_settings()
    if settings.r2_configured:
        return _save_avatar_r2(profile_id, ext, data)
    return _save_avatar_local(profile_id, ext, data)


def _save_avatar_r2(profile_id: UUID, ext: str, data: bytes) -> str:
    settings = get_settings()
    bucket = (settings.r2_bucket_avatars or "").strip()
    key = avatar_object_key(profile_id, ext)
    mime = AVATAR_EXT_TO_MIME.get(ext, "application/octet-stream")
    delete_avatar_files(profile_id)
    try:
        _r2_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=mime,
            CacheControl="public, max-age=3600",
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception("storage r2 avatar upload failed profile_id=%s", profile_id)
        raise RuntimeError("Could not store photo in object storage") from exc
    version = int(time.time())
    rel = avatar_public_url(profile_id, version)
    logger.info(
        "storage saved r2 avatar profile_id=%s bytes=%s bucket=%s",
        profile_id,
        len(data),
        bucket,
    )
    return rel


def _save_avatar_local(profile_id: UUID, ext: str, data: bytes) -> str:
    _delete_local_avatar_files(profile_id)
    path = _avatar_folder(profile_id) / f"avatar{ext}"
    path.write_bytes(data)
    version = int(path.stat().st_mtime)
    rel = avatar_public_url(profile_id, version)
    logger.info(
        "storage saved local avatar profile_id=%s bytes=%s path=%s",
        profile_id,
        len(data),
        rel,
    )
    return rel
