# PersonaAI — Phase implementation tracker

Living checklist against `PersonaAI_Implementation_Plan.md`. Update this file whenever a line item ships or is deferred.

Last updated: 2026-09-12 (Phase 5 harden + soft-launch tooling shipped)

---

## Auth (Product Design §6.1)

Track auth line items here even though they span Phase 0+. Details: `docs/AUTH_AND_SUPABASE.md`.

| Line item | Status | Notes |
| --- | --- | --- |
| Email/password sign-up | Done | `/sign-up` → Supabase |
| Email/password sign-in | Done | `/sign-in` |
| Google OAuth | Done | Needs Google enabled in Supabase project |
| Session (cookie + middleware) | Done | `@supabase/ssr`; protects `/app/*`, `/onboarding/*` |
| Logout | Done | Sidebar + onboarding → `supabase.auth.signOut()` → `/sign-in` |
| Password reset | Done | `/forgot-password` → email → `/auth/callback?next=/update-password` → `/update-password` |

**Password reset setup (Supabase dashboard)**

1. Auth → URL configuration: allow `http://localhost:3000/**` (and production origin).
2. Ensure redirect includes `/auth/callback`.
3. Auth → Email templates → Reset password uses the project’s Site URL / redirect.

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
| Extract PDF/DOCX/TXT → chunk → embed → pgvector | Done | Background task; Azure `text-embedding-ada-002` |
| Notes ingest | Done | `POST /ai/:id/notes` |
| URL ingest (fail gracefully) | Done | `POST /ai/:id/knowledge/url` |
| Owner chat uses RAG + profile | Done | Soft no-op if no ready chunks; validated with resume Q&A |
| Knowledge UI with processing states | Done | Onboarding + `/app/knowledge` |
| S3 / R2 / Supabase Storage | Deferred | Local disk OK for MVP; swap `storage.py` later |
| Redis / RQ worker | Deferred | FastAPI `BackgroundTasks` for now |

**Done when:** resume questions answered from uploaded file. ✅ (validated 2026-09-12 — ada-002 embeddings + RAG hits in owner chat)

**Setup**

1. Run `apps/api/migrations/003_phase2.sql` in Supabase SQL Editor.
2. `pip install -r apps/api/requirements.txt` (adds `pgvector`, `pypdf`, `python-docx`).
3. Embeddings: Azure deployment that exists on the resource (this project uses `text-embedding-ada-002`), **or** `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY`.
4. Restart API; upload a resume on `/onboarding/knowledge` or `/app/knowledge`; wait for **Ready**; ask about it in `/onboarding/test`.

---

## Phase 3 — Memory

| Line item | Status | Notes |
| --- | --- | --- |
| Post-owner-chat memory extraction | Done | Background after owner `/chat`; thresholds in config |
| Memories UI (view/edit/delete) | Done | `/app/memories` |
| Retrieval in prompt | Done | importance × recency; top-k into system prompt |

**Done when:** AI recalls a stated preference in a later chat. ✅ (validated 2026-09-12 — extract written=1, later chat memories=1)

**Setup**

1. Run `apps/api/migrations/004_phase3.sql` in Supabase SQL Editor.
2. Restart API.
3. In `/app/chat`, say a clear preference (e.g. “Remember: I prefer async updates, not meetings”).
4. Wait a few seconds → open `/app/memories` (should list it).
5. Start a **new** chat (refresh) and ask “How do I prefer to communicate?” — answer should use the memory.

---

## Phase 4 — Public AI + share loop

| Line item | Status | Notes |
| --- | --- | --- |
| Username + publish / unpublish | Done | `POST /ai/:id/publish` + unpublish; Settings + onboarding |
| Public page + anon chat + rate limits | Done | `/u/[username]` → `/public/:username` (+ chat); 20/hr/IP |
| Suggested questions (live) | Done | From API `suggested_questions` |
| Dashboard analytics counters | Done | `GET /ai/:id/analytics/summary` |
| Share helpers + CTA fields | Done | Copy link / LinkedIn / email sig; contact_email + calendar_link |

**Done when:** stranger uses `/u/{username}`; owner sees stats. ✅ (validated by owner)

**Setup**

1. Run `apps/api/migrations/005_phase4.sql` in Supabase SQL Editor.
2. Restart API.
3. `/onboarding/publish` → choose username → Publish.
4. Open `/u/{username}` in a private/incognito window → ask a question.
5. Dashboard should show visits / conversations climbing.

---

## Phase 5 — Harden + soft launch

| Line item | Status | Notes |
| --- | --- | --- |
| Prompt-injection basics / safety | Done | `safety.py` + stronger system prompt; output/input caps |
| Empty/error states, completeness % | Done | Checklist on dashboard; `refresh_completeness` single source |
| Free-plan usage limits | Done | Owner chats/day + max documents (429); public rate limit kept |
| Landing copy polish | Done | Professionals-focused hero + how-it-works section |
| Seed ~20 users + feedback | Partial | `/feedback` + `feedback` table + `docs/SOFT_LAUNCH.md` checklist |

**Done when:** 20 professionals publish; feedback captured. → ops in `docs/SOFT_LAUNCH.md`

**Setup**

1. Run `apps/api/migrations/006_phase5.sql` in Supabase SQL Editor.
2. Restart API.
3. Confirm dashboard shows checklist + free-plan remaining.
4. Use `/feedback` during soft launch; track invites in `docs/SOFT_LAUNCH.md`.

---

## Out of MVP (do not start)

Gmail/Calendar, voice, WhatsApp, autonomous agents, fine-tuning, mobile, marketplace, multi-LLM routing, category packs.
