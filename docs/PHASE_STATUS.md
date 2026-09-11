# PersonaAI — Phase implementation tracker

Living checklist against `PersonaAI_Implementation_Plan.md`. Update this file whenever a line item ships or is deferred.

Last updated: 2026-09-12 (Phase 2 knowledge + RAG)

---

## Phase 0 — Foundation

| Line item | Status | Notes |
| --- | --- | --- |
| Monorepo (`apps/web`, `apps/api`) | Done | |
| Docker Compose Redis | Done | Postgres is Supabase-hosted |
| Next.js shell + Tailwind | Done | |
| FastAPI `/health` | Done | |
| Supabase Auth → JWT on API | Done | |
| `users` + `ai_profiles` CRUD | Done | `POST /ai`, `GET /ai/me`, `PATCH /ai/:id` |
| Deploy empty app | Pending | Local-first for now |

**Done when:** signed-in user can create a draft AI profile. ✅

---

## Phase 1 — Personality interview

| Line item | Status | Notes |
| --- | --- | --- |
| Fixed professional interview script | Done | `interview_script.py` (10 Qs) |
| `interview/answer` → LLM extract → DB | Done | Personality + structured facts |
| Simple personality editor | Done | `/app/settings` |
| Prompt builder v1 (identity + personality) | Done | Extended in Phase 2 with RAG |
| Owner chat (no RAG) | Done | Still works when no docs |

**Done when:** two profiles answer with different tone/facts. ✅ (validated)

---

## Phase 2 — Knowledge + RAG

| Line item | Status | Notes |
| --- | --- | --- |
| Document upload + statuses | Done | Local `uploads/`; statuses pending→ready/failed |
| Extract PDF/DOCX/TXT → chunk → embed → pgvector | Done | Background task (no Redis worker yet) |
| Notes ingest | Done | `POST /ai/:id/notes` |
| URL ingest (fail gracefully) | Done | `POST /ai/:id/knowledge/url` |
| Owner chat uses RAG + profile | Done | Soft no-op if no ready chunks |
| Knowledge UI with processing states | Done | Onboarding + `/app/knowledge` |
| S3 / R2 / Supabase Storage | Deferred | Local disk OK for MVP; swap `storage.py` later |
| Redis / RQ worker | Deferred | FastAPI `BackgroundTasks` for now |

**Done when:** resume questions answered from uploaded file. → verify after running `003_phase2.sql`

**Setup**

1. Run `apps/api/migrations/003_phase2.sql` in Supabase SQL Editor.
2. `pip install -r apps/api/requirements.txt` (adds `pgvector`, `pypdf`, `python-docx`).
3. Embeddings: create `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` **or** set `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY`.
4. Restart API; upload a resume on `/onboarding/knowledge` or `/app/knowledge`; wait for **Ready**; ask about it in `/onboarding/test`.

---

## Phase 3 — Memory

| Line item | Status | Notes |
| --- | --- | --- |
| Post-owner-chat memory extraction | Pending | |
| Memories UI (view/edit/delete) | Pending | Shell at `/app/memories` |
| Retrieval in prompt | Pending | |

---

## Phase 4 — Public AI + share loop

| Line item | Status | Notes |
| --- | --- | --- |
| Username + publish / unpublish | Pending | UI shell only on `/onboarding/publish` |
| Public page + anon chat + rate limits | Pending | `/u/[username]` is placeholder |
| Suggested questions (live) | Pending | Static copy on public shell |
| Dashboard analytics counters | Pending | |
| Share helpers + CTA fields | Pending | |

---

## Phase 5 — Harden + soft launch

| Line item | Status | Notes |
| --- | --- | --- |
| Prompt-injection basics / safety | Pending | Basic safety copy already in system prompt |
| Empty/error states, completeness % | Partial | Completeness bumps on interview + first ready doc |
| Free-plan usage limits | Pending | |
| Landing copy polish | Partial | |
| Seed ~20 users + feedback | Pending | |

---

## Out of MVP (do not start)

Gmail/Calendar, voice, WhatsApp, autonomous agents, fine-tuning, mobile, marketplace, multi-LLM routing, category packs.
