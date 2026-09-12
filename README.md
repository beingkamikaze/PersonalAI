# PersonaAI

Monorepo for the PersonaAI MVP. Product and build docs:

- `PersonaAI_MVP_Product_Design.md`
- `PersonaAI_Implementation_Plan.md`
- `docs/API.md` — shipped + planned HTTP API
- `docs/AUTH_AND_SUPABASE.md` — login flow and Supabase wiring
- `docs/PHASE_STATUS.md` — phase line-item tracker (done vs pending)
- `docs/SOFT_LAUNCH.md` — Phase 5 invite / feedback checklist

## Layout

```text
apps/web          Next.js (App Router) + Tailwind + Supabase Auth
apps/api          FastAPI → Supabase Postgres
packages/shared   Shared types (stub)
docker-compose.yml  Redis only (Phase 2+); no local Postgres
.cursor/rules     UI + MVP scope rules for the agent
```

## Phase 0 — Supabase hosted DB

### 1. Env files

Copy examples and fill from Supabase dashboard:

```bash
copy apps\web\.env.local.example apps\web\.env.local
copy apps\api\.env.example apps\api\.env
```

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon JWT **or** `sb_publishable_…` key)
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `DATABASE_URL=postgresql+psycopg://…` (Supabase connection string)
- `SUPABASE_URL`

Optional: `SUPABASE_JWT_SECRET` if JWKS verification fails (legacy HS256).

### 2. Schema

Run `apps/api/migrations/001_phase0.sql` in the Supabase SQL Editor (if not already).

### 3. Auth redirects

In Supabase Auth URL config:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

### 4. Run

```bash
# Web
npm install
npm run dev:web

# API (from apps/api)
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Done when:** sign up → `/onboarding/create` → submit → row in `ai_profiles` (draft).

### Phase 1

1. Run `apps/api/migrations/002_phase1.sql` in Supabase SQL Editor.
2. Ensure LLM keys are in `apps/api/.env`.
3. Restart API, complete interview, test `/onboarding/test` or `/app/chat`.

### Phase 2

1. Run `apps/api/migrations/003_phase2.sql` in Supabase SQL Editor.
2. `pip install -r requirements.txt` (from `apps/api`) — needs `pgvector`, `pypdf`, `python-docx`.
3. Azure users: either set `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, **or** `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY` (chat stays on Azure).
4. Restart API → `/onboarding/knowledge` or `/app/knowledge` → upload resume → wait for **Ready** → ask resume questions in chat.

Docs: `docs/API.md`, `docs/AUTH_AND_SUPABASE.md`, `docs/PHASE_STATUS.md`

### Phase 3

1. Run `apps/api/migrations/004_phase3.sql` in Supabase SQL Editor.
2. Restart API → `/app/chat` → state a preference → check `/app/memories` → ask again in a new thread.

### Phase 4

1. Run `apps/api/migrations/005_phase4.sql` in Supabase SQL Editor.
2. Restart API → `/onboarding/publish` → publish → open `/u/{username}` in incognito → chat.
3. Confirm `/app` dashboard visits increase.

### Phase 5

1. Run `apps/api/migrations/006_phase5.sql` in Supabase SQL Editor.
2. Restart API — dashboard shows completeness checklist + free-plan remaining.
3. Soft launch ops: `docs/SOFT_LAUNCH.md` + `/feedback`.

## Notes

- Frontend never calls the LLM; only FastAPI.
- Do not put the Supabase secret key in Next.js.
- Rotate any credentials that were pasted into chat or committed by mistake.
