"""Knowledge API — upload, notes, URL ingest, list, delete (Phase 2)."""

from __future__ import annotations

import uuid
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.db import get_db
from app.ingest import process_document
from app.logging_config import get_logger
from app.models import Document, DocumentChunk, User
from app.ownership import get_owned_profile
from app.schemas import DocumentOut, NotesIn, UrlIn
from app.storage import delete_file, save_bytes
from app.text_extract import html_to_text
from app.usage import assert_document_allowed

logger = get_logger(__name__)

router = APIRouter(tags=["knowledge"])

_ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".html", ".htm"}
_ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml",
    "text/",
)


async def _run_ingest(document_id: UUID) -> None:
    """Run blocking ingest off the event loop."""
    await run_in_threadpool(process_document, document_id)


def _enqueue(background: BackgroundTasks, document_id: UUID) -> None:
    """Schedule ingest without blocking the HTTP response."""
    background.add_task(_run_ingest, document_id)
    logger.info("ingest enqueued document_id=%s", document_id)


def _store_bytes(
    profile_id: UUID, document_id: UUID, filename: str, data: bytes
) -> str:
    try:
        return save_bytes(profile_id, document_id, filename, data)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


@router.post(
    "/ai/{profile_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    profile_id: UUID,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Document:
    """Multipart file upload → pending document → background ingest."""
    profile = get_owned_profile(db, user, profile_id)
    settings = get_settings()
    assert_document_allowed(db, profile.id)

    filename = (file.filename or "upload.bin").strip()
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in _ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(_ALLOWED_EXTENSIONS))}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large (max {settings.max_upload_bytes // (1024 * 1024)} MB)",
        )

    mime = file.content_type
    if mime and not any(mime.startswith(p) for p in _ALLOWED_MIME_PREFIXES):
        # Soft check — extension already validated
        logger.warning(
            "upload unusual mime profile_id=%s mime=%s filename=%s",
            profile.id,
            mime,
            filename,
        )

    doc_id = uuid.uuid4()
    rel = _store_bytes(profile.id, doc_id, filename, data)
    doc = Document(
        id=doc_id,
        ai_profile_id=profile.id,
        filename=filename[:300],
        file_url=rel,
        mime_type=mime,
        source_type="upload",
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    logger.info(
        "document uploaded id=%s profile_id=%s filename=%s bytes=%s",
        doc.id,
        profile.id,
        filename,
        len(data),
    )
    _enqueue(background, doc.id)
    return doc


@router.get("/ai/{profile_id}/documents", response_model=list[DocumentOut])
def list_documents(
    profile_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Document]:
    profile = get_owned_profile(db, user, profile_id)
    rows = (
        db.query(Document)
        .filter(Document.ai_profile_id == profile.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    logger.debug(
        "documents list profile_id=%s count=%s", profile.id, len(rows)
    )
    return rows


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    doc = db.query(Document).filter(Document.id == document_id).one_or_none()
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    get_owned_profile(db, user, doc.ai_profile_id)
    file_url = doc.file_url
    # Chunks cascade via FK; delete explicitly for clarity in logs
    chunk_count = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id)
        .delete()
    )
    db.delete(doc)
    db.commit()
    delete_file(file_url)
    logger.info(
        "document deleted id=%s chunks_removed=%s",
        document_id,
        chunk_count,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post(
    "/ai/{profile_id}/notes",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_notes(
    profile_id: UUID,
    body: NotesIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Document:
    """Save freeform notes as a text document and ingest."""
    profile = get_owned_profile(db, user, profile_id)
    assert_document_allowed(db, profile.id)
    title = (body.title or "notes").strip() or "notes"
    filename = f"{title}.txt" if not title.lower().endswith(".txt") else title
    doc_id = uuid.uuid4()
    data = body.content.encode("utf-8")
    rel = _store_bytes(profile.id, doc_id, filename, data)
    doc = Document(
        id=doc_id,
        ai_profile_id=profile.id,
        filename=filename[:300],
        file_url=rel,
        mime_type="text/plain",
        source_type="notes",
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    logger.info(
        "notes created id=%s profile_id=%s chars=%s",
        doc.id,
        profile.id,
        len(body.content),
    )
    _enqueue(background, doc.id)
    return doc


@router.post(
    "/ai/{profile_id}/knowledge/url",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def ingest_url(
    profile_id: UUID,
    body: UrlIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Document:
    """Fetch a public URL, extract text, store as a document, then ingest.

    Failures return 400 with a clear message (do not crash the API).
    """
    profile = get_owned_profile(db, user, profile_id)
    assert_document_allowed(db, profile.id)
    url = body.url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://",
        )

    logger.info("url ingest start profile_id=%s url=%s", profile.id, url)
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            resp = client.get(
                url,
                headers={"User-Agent": "PersonaAI-KnowledgeBot/0.1"},
            )
            resp.raise_for_status()
            content_type = (resp.headers.get("content-type") or "").split(";")[0].strip()
            raw = resp.content
    except httpx.HTTPError as exc:
        logger.warning("url fetch failed profile_id=%s url=%s error=%s", profile.id, url, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not fetch URL: {exc}",
        ) from exc

    settings = get_settings()
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Remote page too large",
        )

    # Prefer text; for HTML strip tags before storing so ingest is simple
    if "html" in content_type or url.lower().endswith((".html", ".htm")):
        text = html_to_text(raw.decode("utf-8", errors="replace"))
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL returned no usable text",
            )
        data = text.encode("utf-8")
        mime = "text/plain"
        filename = f"url-{parsed.netloc}.txt"
    elif content_type.startswith("text/") or url.lower().endswith((".txt", ".md")):
        data = raw
        mime = content_type or "text/plain"
        filename = f"url-{parsed.netloc}.txt"
    elif "pdf" in content_type or url.lower().endswith(".pdf"):
        data = raw
        mime = "application/pdf"
        filename = f"url-{parsed.netloc}.pdf"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type from URL: {content_type or 'unknown'}",
        )

    doc_id = uuid.uuid4()
    rel = _store_bytes(profile.id, doc_id, filename, data)
    doc = Document(
        id=doc_id,
        ai_profile_id=profile.id,
        filename=filename[:300],
        file_url=rel,
        mime_type=mime,
        source_type="url",
        source_url=url[:2000],
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    logger.info(
        "url document created id=%s profile_id=%s bytes=%s",
        doc.id,
        profile.id,
        len(data),
    )
    _enqueue(background, doc.id)
    return doc
