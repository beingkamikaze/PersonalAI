# PersonaAI — End-to-End Implementation Plan

This is the **build document**. Follow it in order. If a feature is not listed here, it waits.

Companion product doc: `PersonaAI_MVP_Product_Design.md`

---

## 0. Product lock (do not expand MVP)

```text
Now:   Common professionals → AI that represents me (public link)
Next:  Categories (templates + CTAs)
Later: Email/calendar + permissions → AI that acts for me
```

**MVP promise**

> Create your professional AI in 10–15 minutes. Share a public link. Others learn who you are when you’re busy.

**Out of MVP**

- Gmail / Calendar read-write or send
- Voice cloning
- WhatsApp / messaging bots
- Autonomous agents / tool execution
- Fine-tuning
- Mobile app
- Marketplace
- Multi-LLM provider routing
- Category packs (job seeker, coach, etc.) — Phase 6

---

## 1. Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Dashboard + public `/{username}` pages |
| Auth | Clerk **or** Supabase Auth | Google OAuth + email; no custom auth |
| Backend API | FastAPI (Python) | RAG, chunking, memory extraction |
| Database | PostgreSQL + pgvector | Profiles, memories, embeddings |
| Cache / jobs | Redis + RQ **or** Celery | Document ingest + memory extraction |
| Object storage | S3 **or** Cloudflare R2 | Resumes, PDFs |
| LLM | One provider (OpenAI or Anthropic) | Chat, interview extract, memory extract |
| Embeddings | `text-embedding-3-small` (or equivalent) | |
| Payments | Razorpay (India) or Stripe | After core loop; Phase 5/6 |
| Hosting | Web: Vercel · API: Railway/Render/Fly · DB: Neon/Supabase | |
| Observability | Sentry + request logs | |

**Rule:** Frontend never calls the LLM directly. All AI goes through FastAPI.

### Monorepo layout

```text
persona-ai/
  apps/web/           # Next.js
  apps/api/           # FastAPI
  packages/shared/    # optional shared types
  docker-compose.yml  # postgres + redis locally
```

---

## 2. System design

### 2.1 High-level architecture

```text
Browser
  │
  ├─ Next.js (landing, auth UI, dashboard, public page)
  │     │
  │     └─ REST → FastAPI
  │
  FastAPI
  ├─ Auth verify (Clerk/Supabase JWT)
  ├─ Profile / Knowledge / Memory / Chat / Publish
  ├─ Prompt assembly
  ├─ LLM provider
  └─ Enqueue jobs → Redis workers
        ├─ document ingest (extract → chunk → embed)
        └─ memory extraction (post-chat)

PostgreSQL + pgvector
S3/R2
```

### 2.2 Domains

1. **Identity** — user, auth  
2. **AI Profile** — one primary profile per user in MVP (schema allows many later)  
3. **Personality** — structured JSON from interview  
4. **Knowledge** — documents + chunks + embeddings  
5. **Memory** — episodic facts (extract + user edit/delete)  
6. **Chat** — owner private test + public visitor chat  
7. **Publish** — username, visibility, rate limits  
8. **Analytics** — visits, conversations, messages (simple counters)

### 2.3 Chat / prompt pipeline

```text
1. AuthZ (owner OR public + published)
2. Load ai_profile + personality + structured facts
3. Embed query → pgvector top-k chunks
4. Retrieve top memories (importance × recency)
5. Load last N messages
6. Assemble layered prompt
7. Stream LLM tokens → client
8. Persist messages
9. Async: extract memories (owner chats only in MVP)
```

### 2.4 Layered prompt

```text
System rules
+ Safety (“do not invent employer secrets / private contacts”)
+ AI identity (“You represent {Name}, a professional…”)
+ Personality (summarized structured data)
+ Structured profile facts
+ Relevant memories
+ RAG chunks
+ Conversation history
+ Current question
```

### 2.5 Multi-tenancy & public access

Every row scoped by `ai_profile_id`.

- Owner routes: `ai_profile.user_id == current_user`
- Public routes: `visibility == published` and username match
- Never trust client-sent `ai_profile_id` alone

| Surface | Who | Writes memories? | Rate limit |
| --- | --- | --- | --- |
| `/app/chat` | Owner | Yes | Normal |
| Public username page | Visitor (anon OK) | No in MVP | Strict (IP + username) |

---

## 3. Data model (MVP)

```text
users
  id, auth_provider_id, email, name, created_at

ai_profiles
  id, user_id, name, username (unique), headline, bio,
  avatar_url, visibility (draft|published),
  contact_email, calendar_link,          -- external CTAs only (no OAuth)
  completeness_score, created_at, updated_at

personality_profiles
  id, ai_profile_id,
  communication_style, formality, humor, verbosity, directness,
  languages jsonb, traits jsonb,
  preferences_json, values_json, boundaries_json

structured_facts
  id, ai_profile_id, key, value, source (interview|manual|doc)

documents
  id, ai_profile_id, filename, file_url, mime_type,
  status (pending|processing|ready|failed), created_at

document_chunks
  id, document_id, ai_profile_id, content, embedding vector,
  chunk_index, metadata jsonb

memories
  id, ai_profile_id, memory_type, content,
  importance, confidence, source, created_at, last_accessed

conversations
  id, ai_profile_id, channel (owner|public),
  visitor_id (nullable), created_at, updated_at

messages
  id, conversation_id, role (user|assistant|system),
  content, token_count, created_at

analytics_daily
  ai_profile_id, date, visits, conversations, messages
```

**Indexes:** unique `username`; vector index on `document_chunks.embedding`; FK indexes on `ai_profile_id`.

---

## 4. API surface (build only these)

```text
# Auth: Clerk/Supabase on frontend; JWT verified on API

AI
  POST   /ai
  GET    /ai/me
  PATCH  /ai/:id
  POST   /ai/:id/publish
  POST   /ai/:id/unpublish

Interview
  POST   /ai/:id/interview/start
  POST   /ai/:id/interview/answer
  GET    /ai/:id/personality
  PATCH  /ai/:id/personality

Knowledge
  POST   /ai/:id/documents
  GET    /ai/:id/documents
  DELETE /documents/:id
  POST   /ai/:id/notes
  POST   /ai/:id/knowledge/url

Memory
  GET    /ai/:id/memories
  PATCH  /memories/:id
  DELETE /memories/:id

Chat
  POST   /ai/:id/chat                 # owner, streaming
  GET    /ai/:id/conversations
  GET    /conversations/:id

Public
  GET    /public/:username
  POST   /public/:username/chat       # streaming, rate limited

Account
  DELETE /account                     # owner; confirm email

Analytics
  GET    /ai/:id/analytics/summary
```

Streaming: SSE or HTTP chunked stream from FastAPI.

---

## 5. Screens (exact MVP UI map)

### Marketing

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | Landing | “Your AI presence for when you’re busy.” CTA: Create Your AI |
| `/pricing` | Pricing | Free / Plus hypothesis (static OK at first) |

### Auth

| Route | Screen |
| --- | --- |
| `/sign-up`, `/sign-in` | Clerk/Supabase hosted or embedded |

### Onboarding (linear wizard)

| Step | Route | Screen | Done when |
| --- | --- | --- | --- |
| 1 | `/onboarding/create` | Name, display name, headline, avatar | Profile created |
| 2 | `/onboarding/interview` | Chat-style interview (~8–12 Qs) | Personality + facts saved |
| 3 | `/onboarding/knowledge` | Resume/PDF/TXT + notes + optional URL | ≥1 source ready (or skip w/ warning) |
| 4 | `/onboarding/test` | Private “Test your AI” chat | First useful answer |
| 5 | `/onboarding/publish` | Username, preview, Publish + copy link | `visibility=published` |

### App (logged-in)

| Route | Screen | Contents |
| --- | --- | --- |
| `/app` | Dashboard | Status, completeness, visits, Share / Test |
| `/app/knowledge` | Knowledge | Docs list, status, upload, delete |
| `/app/memories` | Memories | List / edit / delete |
| `/app/chat` | Private chat | Owner testing |
| `/app/conversations` | Visitor threads | Read-only first |
| `/app/profile` | Profile | Photo, name, headline, bio, personality |
| `/app/settings` | Settings | Username, CTAs, publish/unpublish, delete |

### Public

| Route | Screen | Contents |
| --- | --- | --- |
| `/u/[username]` | Public AI | Avatar, headline, bio, suggested Qs, chat, Contact/Book links |

**Suggested questions (common professionals)**

- What does {Name} do?
- What are their main skills?
- How do they prefer to work?
- What kind of work are they open to?
- Tell me about recent projects.

---

## 6. Interview script (MVP — common professional)

Fixed sequence; LLM only structures answers into personality + `structured_facts`.

1. Full name + what should people call you?
2. Current role and what you do day to day?
3. Top skills / domains?
4. Recent projects or outcomes you’re proud of?
5. Who usually reaches out (recruiters, clients, teammates)?
6. How do you prefer to communicate (async, calls, short/long)?
7. What should your AI never say or invent?
8. What opportunities are you open to right now?
9. Anything people always misunderstand about your work?
10. One-line headline for your public page?

---

## 7. Implementation phases

Do not start the next phase until the previous deliverable works.

### Phase 0 — Foundation (3–5 days)

- Monorepo, Docker Compose (Postgres+pgvector, Redis)
- Next.js shell + Tailwind
- FastAPI health endpoint
- Auth → JWT validation on API
- `users` + `ai_profiles` CRUD
- Deploy empty app (Vercel + API host + managed Postgres)

**Done:** signed-in user can create a draft AI profile.

### Phase 1 — Personality interview (3–5 days)

- Fixed professional interview script
- `interview/answer` → LLM extract → DB
- Simple personality editor
- Prompt builder v1 (identity + personality only)
- Owner chat (no RAG yet)

**Done:** two profiles answer with different tone/facts.

### Phase 2 — Knowledge + RAG (5–7 days)

- S3/R2 upload + document statuses
- Worker: extract PDF/DOCX/TXT → chunk → embed → pgvector
- URL ingest (simple; fail gracefully)
- Chat uses RAG + profile
- Knowledge UI with processing states

**Done:** resume questions answered from uploaded file.

### Phase 3 — Memory (3–4 days)

- Post-owner-chat extraction (importance/confidence thresholds)
- Memories UI (view/edit/delete)
- Retrieval in prompt

**Done:** AI recalls a stated preference in a later chat.

### Phase 4 — Public AI + share loop (4–5 days)

- Username + publish/unpublish
- Public page + anon chat + rate limits
- Suggested questions
- Dashboard analytics counters
- Share helpers: copy link, LinkedIn blurb, email signature text
- External CTA fields only: `calendar_link`, `contact_email`

**Done:** stranger uses `/u/{username}`; owner sees stats.

### Phase 5 — Harden + soft launch (3–5 days)

- Prompt-injection basics, output limits, safety copy
- Empty/error states, completeness %
- Free-plan usage limits (billing can wait)
- Landing copy for common professionals
- Seed ~20 users; collect qualitative feedback

**Done:** 20 professionals publish; feedback captured.

### Phase 6 — Next (post-validation)

- Category templates (job seeker / freelancer / coach): interview variants + CTAs + suggested Qs
- Lead capture on public page
- Billing (Razorpay/Stripe)

### Phase 7 — Later (acts for me)

- OAuth Google / Microsoft
- Permission engine (read vs draft vs send)
- Calendar “propose times” before “create event”
- Audit logs

---

## 8. Metrics

Instrument from Phase 0/1 (PostHog or DB events):

| Funnel | Event |
| --- | --- |
| Activation | Signup → profile created → interview done → ≥1 doc ready → first owner chat → published |
| Sharing | Share clicked → public visit → public message |
| Engagement | Conversations / week per published AI |

**North star:** weekly meaningful *public* conversations per published AI (≥1).

---

## 9. Security checklist (MVP minimum)

- HTTPS everywhere
- JWT on all owner APIs
- Publish gate on public chat
- Rate limit public chat (e.g. 20 msgs/hour/IP/username)
- Signed / short-lived file URLs
- Account + AI deletion path
- System prompt: do not invent employers, salaries, private contacts
- No tool execution in MVP
- Tenant isolation on every query

---

## 10. Rough calendar (solo / small team)

| Week | Focus |
| --- | --- |
| 1 | Phase 0 + start Phase 1 |
| 2 | Finish Phase 1 + start Phase 2 |
| 3 | Finish Phase 2 |
| 4 | Phase 3 + start Phase 4 |
| 5 | Finish Phase 4 |
| 6 | Phase 5 + 20-user launch |

---

## 11. Day-to-day build rules

1. Implement **Phase 0 → 5 only** until soft launch.
2. If a feature is not in Screens (§5) or API (§4), it waits.
3. Category packs and email/calendar are **Phase 6–7**.
4. Do not swap the stack mid-MVP unless blocked.
5. Prefer shipping the share loop over polishing personality sliders.

### Immediate first coding steps

1. Create repo structure + `docker-compose.yml` (Postgres+pgvector, Redis).
2. Scaffold `apps/web` + `apps/api`.
3. Wire auth → create `ai_profiles`.
4. Do not start RAG until owner chat with personality works.
