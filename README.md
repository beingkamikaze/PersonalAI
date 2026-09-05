# PersonaAI

Monorepo for the PersonaAI MVP. Product and build docs:

- `PersonaAI_MVP_Product_Design.md`
- `PersonaAI_Implementation_Plan.md`

## Layout

```text
apps/web          Next.js (App Router) + Tailwind
apps/api          FastAPI
packages/shared   Shared types (stub)
docker-compose.yml  Postgres+pgvector + Redis
.cursor/rules     UI + MVP scope rules for the agent
```

## Phase 0 — run locally

### Web

```bash
npm install
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000). Routes match Implementation Plan §5.

### API

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: [http://localhost:8000/health](http://localhost:8000/health)

### Data services

```bash
docker compose up -d
```

## Next

1. Wire Clerk or Supabase Auth
2. `users` + `ai_profiles` CRUD on FastAPI
3. Connect onboarding create form to API
