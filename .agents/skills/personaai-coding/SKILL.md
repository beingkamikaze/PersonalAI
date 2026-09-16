---
name: personaai-coding
description: >-
  PersonaAI full-stack coding for Next.js (frontend/) + FastAPI (apps/api) +
  Postgres/pgvector + Redis jobs. Use when building MVP screens, APIs, RAG,
  chat, onboarding, public /u/[username], or any frontend/backend work in this
  monorepo. Prefer this over generic SaaS/Next-only stacks.
paths: frontend/**/*,apps/**/*,PersonaAI_*.md
---

# PersonaAI coding

## Stack lock

| Layer | Use |
| --- | --- |
| Web | Next.js App Router + TypeScript + Tailwind in `frontend/` |
| API | FastAPI in `apps/api` |
| DB | PostgreSQL + pgvector |
| Jobs | Redis + RQ/Celery |
| Auth | Clerk or Supabase Auth (JWT verified in FastAPI) |

**Hard rules**

1. Frontend never calls the LLM. All AI goes through FastAPI.
2. Only screens in `PersonaAI_Implementation_Plan.md` §5.
3. Do not expand MVP (Gmail, voice, WhatsApp, agents, fine-tuning, mobile, marketplace, multi-LLM, category packs).
4. Build Phase 0 → 5 in order; next phase only after the previous deliverable works.

## Which skill to load

| Work | Also apply |
| --- | --- |
| `frontend/` React frontend | `/front` (+ `react`, `nextjs-react-typescript`, `tailwindcss`) |
| Visual / layout feel | Project rule `personaai-ui` (cool ink + teal; Fraunces + Figtree) |
| `apps/api` routes/services | `fastapi-python` |
| Schema, SQL, embeddings tables | `postgresql-best-practices` |
| Ingest queues, rate limits, cache | `redis-best-practices` |

## Frontend patterns

- Call FastAPI with authenticated fetch/client helpers — never OpenAI/Anthropic SDKs in the browser.
- Prefer Server Components; `'use client'` only for chat composers, forms, uploads.
- Public page: `/u/[username]` — avatar, headline, bio, suggested Qs, chat, Contact/Book links.
- Owner app: `/app`, knowledge, memories, chat, conversations, settings.
- Onboarding is linear: create → interview → knowledge → test → publish.

## Backend patterns

- Owner routes: `ai_profile.user_id == current_user`.
- Public routes: published + username match; visitor chats do not write memories in MVP.
- Pydantic v2 request/response models; dependency-injected auth and DB session.
- RAG/chunking/memory extraction stay in FastAPI + workers, not Next.js API routes.

## Sources of truth

- Product: `PersonaAI_MVP_Product_Design.md`
- Build: `PersonaAI_Implementation_Plan.md`
