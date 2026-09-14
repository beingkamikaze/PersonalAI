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

**Session lifecycle (web, not FastAPI):**

| Action | Where | API endpoint? |
| --- | --- | --- |
| Sign-up / sign-in / OAuth | Next.js → Supabase Auth | No |
| Logout | Next.js `supabase.auth.signOut()` | No — cookies cleared client-side; next Bearer call fails with `401` |
| Password reset | Next.js `resetPasswordForEmail` + `updateUser` (`/forgot-password`, `/update-password`) | No |

There is **no** `POST /auth/logout` or password-reset route on this API. Session changes are Supabase Auth only. Tracker: `docs/PHASE_STATUS.md` → Auth.

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
| `avatar_url` | string \| null | no | `POST /ai/{id}/avatar`, or a Google photo URL |

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

### `POST /ai/{profile_id}/avatar` — Shipped

Multipart image upload (`file`). Stores the photo on **Cloudflare R2** when `R2_*` env is set; otherwise local disk. `avatar_url` is `/media/avatars/{profile_id}?v=…` (FastAPI streams the object from R2).

JPEG, PNG, WebP, or GIF. Max 2 MB. Owner only.

**Response `200`** — `AiProfile`

**Errors:** `400` (type/size), `401`, `403`, `404`, `502` (R2 upload failed)

---

### `DELETE /ai/{profile_id}/avatar` — Shipped

Clears `avatar_url` and deletes the stored file. Owner only.

**Response `200`** — `AiProfile`

---

### `GET /media/avatars/{profile_id}` — Shipped

Public file for the stored photo (no auth). Reads R2 first-or-local leftover. Used by the owner UI and `/u/[username]`.

**Errors:** `404`

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

Prompt = system rules + identity + personality + structured facts + **memories** + **retrieved document chunks (if any)** + last messages.

When the profile has no ready chunks / no memories, those sections are omitted (Phase 1 behavior).

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

## 6. Publish — Shipped (Phase 4)

### `POST /ai/{profile_id}/publish` — Shipped

Sets `visibility=published`. Requires a unique username (in body or already on profile). Optionally updates CTAs / bio / headline in the same request.

**Body (all optional)**

```json
{
  "username": "mayank",
  "contact_email": "you@example.com",
  "calendar_link": "https://cal.com/you",
  "bio": "Short public bio",
  "headline": "Optional headline"
}
```

**Errors:** `400` (missing/invalid username), `409` (username taken)

---

### `POST /ai/{profile_id}/unpublish` — Shipped

Sets `visibility=draft`. Public page returns 404 until published again.

---

### `PATCH /ai/{profile_id}` — also accepts (Phase 4)

`username`, `contact_email`, `calendar_link` in addition to name/headline/bio/avatar.

---

## 7. Knowledge / RAG — Shipped (Phase 2)

Files are stored on **Cloudflare R2** (`docs/{profile_id}/…`) when `R2_*` env is set; otherwise `apps/api/uploads/`. Ingest reads the object, then extract → chunk → embed → `document_chunks` (pgvector). Existing local `file_url` rows still ingest from disk.

Supported upload types: `.pdf`, `.docx`, `.txt`, `.md`, `.html` (max 8 MB).

### `POST /ai/{profile_id}/documents` — Shipped

Multipart form field `file`. Returns a document with `status=pending`; poll `GET …/documents` until `ready` or `failed`.

**Auth:** required · owner only

**Response `201`** — `Document`

**Errors:** `400` (type/size), `401`, `403`, `404`, `502` (R2 upload failed)

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

## 8. Memory — Shipped (Phase 3)

Episodic memories are extracted **after** owner chat turns (background). Only rows that clear importance/confidence thresholds are stored. Public visitor chats do **not** write memories.

### `GET /ai/{profile_id}/memories` — Shipped

List memories (importance desc). Owner only.

---

### `PATCH /memories/{memory_id}` — Shipped

Update `content`, `memory_type`, `importance`, and/or `confidence`.

**Body (all optional)**

```json
{
  "content": "Prefers async Slack updates over meetings",
  "memory_type": "preference",
  "importance": 0.8,
  "confidence": 0.9
}
```

`memory_type`: `preference` | `fact` | `boundary` | `project` | `other`

---

### `DELETE /memories/{memory_id}` — Shipped

**Response `204`**

---

### `Memory` response schema

```json
{
  "id": "uuid",
  "ai_profile_id": "uuid",
  "memory_type": "preference",
  "content": "…",
  "importance": 0.8,
  "confidence": 0.9,
  "source": "owner_chat | manual",
  "created_at": "ISO-8601",
  "last_accessed": "ISO-8601"
}
```

**Thresholds (env):** `MEMORY_MIN_IMPORTANCE` (default 0.55), `MEMORY_MIN_CONFIDENCE` (default 0.6), `MEMORY_TOP_K` (default 8).

---

## 9. Public — Shipped (Phase 4)

No auth. Only profiles with `visibility=published` are visible.

### `GET /public/{username}` — Shipped

Returns public profile + suggested questions. Increments daily **visits**.

---

### `POST /public/{username}/chat` — Shipped

Visitor chat (JSON reply). **Does not write memories.** Rate limit: 20 messages / hour / IP+username (configurable).

**Body**

```json
{
  "message": "What does Mayank do?",
  "conversation_id": null,
  "visitor_id": "optional-client-id"
}
```

**Response:** same shape as owner `ChatOut`.

**Errors:** `404` (not published), `429` (rate limited), `502`

---

## 10. Analytics — Shipped (Phase 4 + 5)

### `GET /ai/{profile_id}/analytics/summary` — Shipped

Owner-only rollup (Phase 5 adds checklist + free-plan usage):

```json
{
  "visibility": "published",
  "username": "mayank",
  "completeness_score": 85,
  "completeness_checklist": {
    "profile_basics": true,
    "interview_completed": true,
    "personality": true,
    "knowledge_ready": true,
    "has_memory": true,
    "username_set": true,
    "published": true
  },
  "visits_today": 2,
  "visits_7d": 10,
  "conversations_7d": 3,
  "messages_7d": 12,
  "public_url_path": "/u/mayank",
  "owner_chats_used_today": 3,
  "owner_chats_limit": 40,
  "owner_chats_remaining": 37,
  "documents_used": 2,
  "documents_limit": 8,
  "documents_remaining": 6
}
```

---

## 11. Feedback — Shipped (Phase 5)

### `POST /feedback` — Shipped

Auth optional. Soft-launch qualitative notes.

**Body**

```json
{
  "message": "Public chat felt slow but answers were accurate.",
  "email": "optional@example.com",
  "source": "app"
}
```

`source`: `app` | `public` | `landing`

**Response `201`**

```json
{ "id": "uuid", "created_at": "ISO-8601", "message": "Thanks — we received your feedback." }
```

---

## 12. Phase 5 safety / free limits (behavior)

| Control | Default | Where |
| --- | --- | --- |
| Input truncate | 2000 chars | `CHAT_MAX_INPUT_CHARS` |
| Output truncate | 2500 chars | `CHAT_MAX_OUTPUT_CHARS` |
| Injection heuristic wrap | — | `app/safety.py` (does not hard-block) |
| Owner chats / day | 40 | `FREE_OWNER_CHATS_PER_DAY` → `429` |
| Max documents | 8 | `FREE_MAX_DOCUMENTS` → `429` |
| Public chat rate | 20 / hour / IP+username | Phase 4 |

Owner chat, RAG, and memories still work under these caps; exceeding returns `429` with a clear message.

---

## 13. Authorization rules

| Surface | Who | Writes memories? |
| --- | --- | --- |
| Owner `/ai/...` | `ai_profile.user_id == current_user` | Yes (owner chat only) |
| Public (Phase 4) | `visibility == published` | No in MVP |

Missing / expired Bearer → `401`. Client logout clears the session; subsequent `apiFetch` calls fail with `401` until the user signs in again (see Auth session lifecycle above).

---

## 14. Phase map

| Phase | API focus | Status |
| --- | --- | --- |
| **0** | Health, AI profile CRUD | Done |
| **1** | Interview, personality, owner chat | Done |
| **2** | Documents + RAG in owner chat | Done |
| **3** | Memories | Done |
| **4** | Publish, public chat, analytics | Done |
| **5** | Harden + soft launch | Done (ops: seed 20 users) |

### SQL migrations

- `apps/api/migrations/001_phase0.sql`
- `apps/api/migrations/002_phase1.sql`
- `apps/api/migrations/003_phase2.sql` ← documents + pgvector chunks
- `apps/api/migrations/004_phase3.sql` ← memories table
- `apps/api/migrations/005_phase4.sql` ← analytics_daily
- `apps/api/migrations/006_phase5.sql` ← feedback table

When you add an endpoint, update this file and mark it **Shipped**. Also update `docs/PHASE_STATUS.md`.
