# PersonaAI API Documentation

Base URL (local): `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`  
Source of truth for MVP scope: `PersonaAI_Implementation_Plan.md` §4

**Rule:** The Next.js frontend never calls the LLM. All AI traffic goes through this FastAPI service.

**Auth:** Protected routes require:

```http
Authorization: Bearer <supabase_access_token>
```

The API verifies the token (Supabase Auth `/user`, then JWKS, then optional JWT secret), upserts a row in `users`, and scopes data by that user.

**LLM (Phase 1+):** configured in `apps/api/.env`

- `LLM_PROVIDER=openai` → `OPENAI_API_KEY` + `OPENAI_MODEL` (default `gpt-4o-mini`) + `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`)
- `LLM_PROVIDER=azure` → `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_DEPLOYMENT` (+ optional `AZURE_OPENAI_API_VERSION`)
- **Embeddings without Azure embedding deployment:** set `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY` (chat stays on Azure)

Frontend never calls the LLM.

---

## Status legend

| Status | Meaning |
| --- | --- |
| **Shipped** | Implemented and usable |
| **Planned** | In Implementation Plan; not built yet |

---

## 1. Health

### `GET /health` — Shipped

No auth.

**Response `200`**

```json
{ "status": "ok" }
```

---

## 2. AI profile — Shipped (Phase 0)

### `POST /ai` — Shipped

Create the owner’s draft AI profile. MVP: **one profile per user**.

**Auth:** required

**Body**

```json
{
  "name": "Mayank Sandilya",
  "headline": "Software Engineer building AI Products",
  "avatar_url": null
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | 1–200 chars |
| `headline` | string \| null | no | max 500 |
| `avatar_url` | string \| null | no | upload in Phase 2 |

**Response `201`** — `AiProfile`

**Errors:** `401`, `409` (already has profile)

---

### `GET /ai/me` — Shipped

Return the current user’s primary AI profile.

**Errors:** `401`, `404`

---

### `PATCH /ai/{profile_id}` — Shipped

Update `name`, `headline`, `avatar_url`, `bio`. Owner only.

**Errors:** `401`, `403`, `404`

---

### `AiProfile` response schema

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "username": null,
  "headline": "string | null",
  "bio": "string | null",
  "avatar_url": "string | null",
  "visibility": "draft | published",
  "contact_email": "string | null",
  "calendar_link": "string | null",
  "completeness_score": 0,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

---

## 3. Interview — Shipped (Phase 1)

Fixed 10-question script (`app/interview_script.py`). LLM only **structures** answers into personality + facts.

### `POST /ai/{profile_id}/interview/start` — Shipped

Creates or resumes an `interview_sessions` row.

**Response `200`**

```json
{
  "session_id": "uuid",
  "status": "in_progress",
  "current_index": 0,
  "total_questions": 10,
  "question": "What's your full name…?",
  "completed": false
}
```

---

### `POST /ai/{profile_id}/interview/answer` — Shipped

**Body**

```json
{ "answer": "People call me Mayank. I'm a software engineer…" }
```

**Behavior**

1. Append Q&A to session transcript  
2. Call OpenAI to extract/merge personality + interview facts  
3. Advance `current_index`; on last question set `status=completed` and bump `completeness_score` (≥ 40)

**Response `200`**

```json
{
  "session_id": "uuid",
  "status": "in_progress",
  "current_index": 1,
  "total_questions": 10,
  "question": "What's your current role…?",
  "completed": false,
  "extracted": true
}
```

**Errors:** `400` (not started), `401`, `403`, `404`, `502` (LLM failure)

---

## 4. Personality — Shipped (Phase 1)

### `GET /ai/{profile_id}/personality` — Shipped

Returns structured personality + interview facts.

**Response `200`**

```json
{
  "ai_profile_id": "uuid",
  "communication_style": "…",
  "formality": "…",
  "humor": "…",
  "verbosity": "…",
  "directness": "…",
  "languages": [],
  "traits": [],
  "preferences_json": {},
  "values_json": {},
  "boundaries_json": {},
  "facts": [{ "key": "role", "value": "…" }]
}
```

**Errors:** `404` if interview has not produced a personality row yet

---

### `PATCH /ai/{profile_id}/personality` — Shipped

Manual edit of personality scalar/JSON fields (not facts list in MVP).

---

## 5. Owner chat — Shipped (Phase 1 + RAG in Phase 2)

Prompt = system rules + identity + personality + structured facts + **retrieved document chunks (if any)** + last messages. Memories still Phase 3.

When the profile has no ready chunks, chat behaves exactly as Phase 1 (RAG is a no-op).

### `POST /ai/{profile_id}/chat` — Shipped

Non-streaming JSON reply (streaming can come later).

**Body**

```json
{
  "message": "What do I do professionally?",
  "conversation_id": null
}
```

Pass `conversation_id` to continue a thread; omit/`null` to start a new owner conversation.

**Response `200`**

```json
{
  "conversation_id": "uuid",
  "reply": "I'm a software engineer…",
  "messages": [
    { "id": "uuid", "role": "user", "content": "…", "created_at": "…" },
    { "id": "uuid", "role": "assistant", "content": "…", "created_at": "…" }
  ]
}
```

**Errors:** `401`, `403`, `404`, `502`

---

### `GET /ai/{profile_id}/conversations` — Shipped

List owner conversations (newest first).

---

### `GET /conversations/{conversation_id}` — Shipped

Conversation detail + messages. Owner of the profile only.

---

## 6. Publish — Planned (Phase 4)

| Method | Path | Status |
| --- | --- | --- |
| `POST` | `/ai/{id}/publish` | Planned |
| `POST` | `/ai/{id}/unpublish` | Planned |

---

## 7. Knowledge / RAG — Shipped (Phase 2)

Files are stored under `apps/api/uploads/` (local). Ingest runs in a FastAPI background task: extract → chunk → embed → `document_chunks` (pgvector).

Supported upload types: `.pdf`, `.docx`, `.txt`, `.md`, `.html` (max 8 MB).

### `POST /ai/{profile_id}/documents` — Shipped

Multipart form field `file`. Returns a document with `status=pending`; poll `GET …/documents` until `ready` or `failed`.

**Auth:** required · owner only

**Response `201`** — `Document`

**Errors:** `400` (type/size), `401`, `403`, `404`

---

### `GET /ai/{profile_id}/documents` — Shipped

List documents newest first (includes status + `error_message` when failed).

---

### `DELETE /documents/{document_id}` — Shipped

Deletes document, chunks, and local file. Owner of the parent profile only.

**Response `204`**

---

### `POST /ai/{profile_id}/notes` — Shipped

**Body**

```json
{ "content": "I led the checkout redesign…", "title": "notes" }
```

Stored as a `text/plain` document (`source_type=notes`) and ingested like an upload.

---

### `POST /ai/{profile_id}/knowledge/url` — Shipped

**Body**

```json
{ "url": "https://example.com/about" }
```

Fetches the URL (20s timeout). HTML is stripped to text; PDF/text supported. Soft-fails with `400` if fetch or content is unusable.

---

### `Document` response schema

```json
{
  "id": "uuid",
  "ai_profile_id": "uuid",
  "filename": "resume.pdf",
  "file_url": "profile-id/doc-id_resume.pdf",
  "mime_type": "application/pdf",
  "source_type": "upload | notes | url",
  "source_url": null,
  "status": "pending | processing | ready | failed",
  "error_message": null,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

**Embeddings:** `text-embedding-3-small` (1536 dims). Azure needs `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` pointing at an embedding deployment.

---

## 8. Memory — Planned (Phase 3)

| Method | Path | Status |
| --- | --- | --- |
| `GET` | `/ai/{id}/memories` | Planned |
| `PATCH` | `/memories/{id}` | Planned |
| `DELETE` | `/memories/{id}` | Planned |

---

## 9. Public — Planned (Phase 4)

| Method | Path | Status |
| --- | --- | --- |
| `GET` | `/public/{username}` | Planned |
| `POST` | `/public/{username}/chat` | Planned |

---

## 10. Analytics — Planned (Phase 4/5)

| Method | Path | Status |
| --- | --- | --- |
| `GET` | `/ai/{id}/analytics/summary` | Planned |

---

## 11. Authorization rules

| Surface | Who | Writes memories? |
| --- | --- | --- |
| Owner `/ai/...` | `ai_profile.user_id == current_user` | Phase 3+ |
| Public (Phase 4) | `visibility == published` | No in MVP |

---

## 12. Phase map

| Phase | API focus |
| --- | --- |
| **0** | Health, AI profile CRUD |
| **1** | Interview, personality, owner chat |
| **2** (current) | Documents + RAG in owner chat |
| **3** | Memories |
| **4** | Publish, public chat, analytics |
| **5** | Harden + soft launch |

### SQL migrations

- `apps/api/migrations/001_phase0.sql`
- `apps/api/migrations/002_phase1.sql`
- `apps/api/migrations/003_phase2.sql` ← run in Supabase SQL Editor for documents + pgvector chunks

When you add an endpoint, update this file and mark it **Shipped**. Also update `docs/PHASE_STATUS.md`.
