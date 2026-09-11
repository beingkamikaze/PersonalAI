"""RAG retrieval — top-k document chunks by cosine similarity (Phase 2).

Returns an empty list when the profile has no ready embeddings so Phase 1
owner chat keeps working unchanged.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.embeddings import embed_query
from app.logging_config import get_logger

logger = get_logger(__name__)


def retrieve_chunks(
    db: Session,
    profile_id: UUID,
    query: str,
    *,
    top_k: int | None = None,
) -> list[str]:
    """Embed the query and return the most similar ready chunk texts."""
    settings = get_settings()
    k = top_k or settings.rag_top_k

    # Fast path: skip embedding call when this profile has zero ready chunks
    has_ready = db.execute(
        text(
            """
            SELECT 1
            FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.ai_profile_id = :profile_id
              AND d.status = 'ready'
              AND c.embedding IS NOT NULL
            LIMIT 1
            """
        ),
        {"profile_id": str(profile_id)},
    ).first()
    if has_ready is None:
        logger.debug("rag skip no ready chunks profile_id=%s", profile_id)
        return []

    try:
        vector = embed_query(query.strip())
    except Exception:
        logger.exception("rag embed query failed profile_id=%s", profile_id)
        # Fail soft — chat still works with personality + facts only
        return []

    # pgvector cosine distance operator: <=>  (lower = more similar)
    # Pass embedding as a literal vector string for psycopg compatibility
    vector_literal = "[" + ",".join(str(float(x)) for x in vector) + "]"
    rows = db.execute(
        text(
            """
            SELECT c.content
            FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.ai_profile_id = :profile_id
              AND d.status = 'ready'
              AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
            """
        ),
        {
            "profile_id": str(profile_id),
            "embedding": vector_literal,
            "top_k": k,
        },
    ).fetchall()

    chunks = [str(row[0]) for row in rows if row[0]]
    logger.info(
        "rag retrieved profile_id=%s top_k=%s hits=%s query_chars=%s",
        profile_id,
        k,
        len(chunks),
        len(query.strip()),
    )
    return chunks
