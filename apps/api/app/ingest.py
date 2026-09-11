"""Document ingest pipeline: extract → chunk → embed → pgvector (Phase 2).

Runs in a FastAPI BackgroundTask so upload endpoints return quickly.
Uses a fresh DB session (do not reuse the request session).
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.embeddings import embed_texts
from app.logging_config import get_logger
from app.models import AiProfile, Document, DocumentChunk
from app.storage import resolve_file_url
from app.text_extract import chunk_text, extract_text_from_bytes, read_file_bytes

logger = get_logger(__name__)

# Batch size for embedding API calls
_EMBED_BATCH = 32


def process_document(document_id: UUID) -> None:
    """Background entrypoint — safe to call from FastAPI BackgroundTasks."""
    db = SessionLocal()
    try:
        _ingest(db, document_id)
    except Exception:
        logger.exception("ingest crashed document_id=%s", document_id)
        try:
            doc = db.query(Document).filter(Document.id == document_id).one_or_none()
            if doc is not None:
                doc.status = "failed"
                doc.error_message = "Ingest crashed unexpectedly"
                doc.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:  # noqa: BLE001
            logger.exception("ingest failed to mark failed document_id=%s", document_id)
            db.rollback()
    finally:
        db.close()


def _ingest(db: Session, document_id: UUID) -> None:
    doc = db.query(Document).filter(Document.id == document_id).one_or_none()
    if doc is None:
        logger.warning("ingest skip missing document_id=%s", document_id)
        return

    logger.info(
        "ingest start document_id=%s profile_id=%s source=%s filename=%s",
        doc.id,
        doc.ai_profile_id,
        doc.source_type,
        doc.filename,
    )
    doc.status = "processing"
    doc.error_message = None
    doc.updated_at = datetime.now(timezone.utc)
    db.commit()

    try:
        path = resolve_file_url(doc.file_url)
        if path is None:
            raise RuntimeError("Stored file not found on disk")

        raw = read_file_bytes(path)
        text = extract_text_from_bytes(raw, doc.filename, doc.mime_type)
        if not text.strip():
            raise RuntimeError("No extractable text in document")

        chunks = chunk_text(text)
        if not chunks:
            raise RuntimeError("Chunking produced no content")

        logger.info(
            "ingest extracted document_id=%s chars=%s chunks=%s",
            doc.id,
            len(text),
            len(chunks),
        )

        # Replace any prior chunks (re-ingest / retry)
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.flush()

        vectors: list[list[float]] = []
        for i in range(0, len(chunks), _EMBED_BATCH):
            batch = chunks[i : i + _EMBED_BATCH]
            vectors.extend(embed_texts(batch))

        for index, (content, vector) in enumerate(zip(chunks, vectors, strict=True)):
            db.add(
                DocumentChunk(
                    document_id=doc.id,
                    ai_profile_id=doc.ai_profile_id,
                    content=content,
                    embedding=vector,
                    chunk_index=index,
                    metadata_={
                        "filename": doc.filename,
                        "source_type": doc.source_type,
                    },
                )
            )

        doc.status = "ready"
        doc.error_message = None
        doc.updated_at = datetime.now(timezone.utc)
        _bump_completeness(db, doc.ai_profile_id)
        db.commit()
        logger.info(
            "ingest done document_id=%s profile_id=%s chunks=%s",
            doc.id,
            doc.ai_profile_id,
            len(chunks),
        )
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        # Re-load and mark failed in a clean transaction
        doc = db.query(Document).filter(Document.id == document_id).one_or_none()
        if doc is not None:
            doc.status = "failed"
            doc.error_message = str(exc)[:500]
            doc.updated_at = datetime.now(timezone.utc)
            db.commit()
        logger.exception(
            "ingest failed document_id=%s error=%s", document_id, exc
        )


def _bump_completeness(db: Session, profile_id: UUID) -> None:
    """Raise completeness once the profile has at least one ready document."""
    profile = db.query(AiProfile).filter(AiProfile.id == profile_id).one_or_none()
    if profile is None:
        return
    ready_count = (
        db.query(Document)
        .filter(Document.ai_profile_id == profile_id, Document.status == "ready")
        .count()
    )
    # Interview ≈ 40; first ready doc nudges toward 60+
    if ready_count >= 1 and profile.completeness_score < 60:
        profile.completeness_score = 60
        logger.info(
            "completeness bumped profile_id=%s score=%s",
            profile_id,
            profile.completeness_score,
        )
