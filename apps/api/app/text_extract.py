"""Text extraction and chunking for knowledge ingest (Phase 2)."""

from __future__ import annotations

import io
import re
from html.parser import HTMLParser
from pathlib import Path

from app.logging_config import get_logger

logger = get_logger(__name__)

# Rough target size for each RAG chunk (characters, not tokens)
CHUNK_SIZE = 900
CHUNK_OVERLAP = 120


class _HTMLTextExtractor(HTMLParser):
    """Minimal HTML → visible text (no BeautifulSoup dependency)."""

    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        if tag in ("script", "style", "noscript"):
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip = False
        if tag in ("p", "div", "br", "li", "h1", "h2", "h3", "tr"):
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip and data.strip():
            self._parts.append(data)

    def text(self) -> str:
        return re.sub(r"\n{3,}", "\n\n", "".join(self._parts)).strip()


def extract_text_from_bytes(data: bytes, filename: str, mime_type: str | None) -> str:
    """Extract plain text from PDF / DOCX / TXT / HTML bytes."""
    name = filename.lower()
    mime = (mime_type or "").lower()

    if name.endswith(".pdf") or "pdf" in mime:
        return _extract_pdf(data)
    if name.endswith(".docx") or "wordprocessingml" in mime:
        return _extract_docx(data)
    if name.endswith((".html", ".htm")) or "text/html" in mime:
        return html_to_text(data.decode("utf-8", errors="replace"))
    # Default: treat as UTF-8 text (txt, md, notes, etc.)
    return data.decode("utf-8", errors="replace").strip()


def html_to_text(html: str) -> str:
    parser = _HTMLTextExtractor()
    try:
        parser.feed(html)
    except Exception as exc:  # noqa: BLE001
        logger.warning("html parse soft-fail error=%s", exc)
        return re.sub(r"<[^>]+>", " ", html)
    return parser.text()


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as exc:  # noqa: BLE001
            logger.warning("pdf page extract failed page=%s error=%s", i, exc)
            continue
        if text.strip():
            parts.append(text)
    return "\n\n".join(parts).strip()


def _extract_docx(data: bytes) -> str:
    from docx import Document as DocxDocument

    doc = DocxDocument(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()


def chunk_text(text: str, *, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping character windows for embedding."""
    cleaned = re.sub(r"[ \t]+", " ", text.replace("\r\n", "\n")).strip()
    if not cleaned:
        return []
    if len(cleaned) <= size:
        return [cleaned]

    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(start + size, len(cleaned))
        # Prefer breaking on a paragraph or sentence boundary
        window = cleaned[start:end]
        if end < len(cleaned):
            for sep in ("\n\n", "\n", ". ", "? ", "! "):
                idx = window.rfind(sep)
                if idx > size // 3:
                    end = start + idx + len(sep)
                    window = cleaned[start:end]
                    break
        piece = window.strip()
        if piece:
            chunks.append(piece)
        if end >= len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks


def read_file_bytes(path: Path) -> bytes:
    return path.read_bytes()
