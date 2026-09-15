# PersonaAI — MVP Product Design

**Status:** Ideation → ready to build  
**Build doc:** `PersonaAI_Implementation_Plan.md` (tech stack, schema, APIs, phases, screens)

This document is the **product** source of truth: vision, users, MVP scope, experience, and evolution. Implementation detail lives in the companion plan — do not diverge from it without updating both.

---

## 1. Product vision

**PersonaAI** lets common professionals create a personalized AI representation of themselves and share it with anyone.

**Core promise**

> Create your AI in 10–15 minutes. Give it your knowledge, personality, and boundaries. Share a public link so others can understand you when you’re busy.

**Strategic progression (locked)**

```text
Now:   Common professionals → AI that represents me (public link)
Next:  Categories (templates + CTAs)
Later: Email/calendar + permissions → AI that acts for me
```

Mapped to product stages:

1. **Knows me** — knowledge, personality, memory (owner-facing foundation)
2. **Represents me** — shareable public AI (MVP focus + growth loop)
3. **Acts for me** — authorized tools (email, calendar, workflows) — post-MVP

The MVP ships **Knows me + Represents me**. It does **not** ship **Acts for me**.

---

## 2. Problem

Generic AI assistants know the world but not the individual. Professionals repeatedly re-explain:

- Background and skills
- How they work
- What they’re open to
- Project context
- Communication preferences

Most chatbot builders optimize for **business bots**, not a **persistent personal professional presence**.

PersonaAI creates a **Personal AI Identity** for professionals — especially useful when they are in meetings, offline, or can’t answer every inbound question.

---

## 3. Target users

### Beachhead (MVP)

**Common professionals** — people whose work runs on email, calendar, meetings, and docs, and who are often unavailable when others need context.

Examples:

- Individual contributors and light managers
- Freelancers and independent consultants
- Specialists who get repetitive “what do you do / are you a fit?” questions
- Job-seeking professionals who want a richer link than a static resume

**Not the first beachhead:** pure consumers, students-as-hobby, enterprises, influencers-at-scale (those can come via category packs later).

### Anti-ICP (for now)

- Users who only want a private ChatGPT wrapper with no share intent
- Teams needing SSO / admin controls on day one
- Anyone requiring inbox send or calendar write in v1

### Later (category expansion)

Same core product, different onboarding + suggested questions + CTAs:

- Job seekers
- Freelancers / consultants
- Coaches / educators
- Sales / recruiters
- Internal team “ask about me” (private links)

---

## 4. MVP value proposition

**User-facing promise**

> Build an AI that represents you.

The user should be able to:

1. Create an account
2. Complete a short AI-guided professional interview
3. Upload resume / docs / notes
4. Get a structured personal profile
5. Test the AI privately
6. Review and manage memories
7. Publish and share a public URL

Example:

```text
https://persona.ai/u/mayank
```

Visitors ask questions; the AI answers from the professional’s knowledge and boundaries.

**Primary share moment**

```text
LinkedIn / email signature
        │
        v
"Talk to my AI" → persona.ai/u/mayank
```

---

## 5. Core product experience

```text
Sign Up
   │
   v
Create AI profile
   │
   v
Personality interview (professional script)
   │
   v
Add knowledge (PDF, DOCX, TXT, URL, notes)
   │
   v
Test AI (private)
   │
   v
Publish + choose username
   │
   v
Share public link
```

Onboarding target: **5–15 minutes**.

---

## 6. MVP features (product scope)

### 6.1 Authentication

- Email/password and/or Google OAuth via managed auth (Clerk or Supabase)
- Session, logout, password reset
- Do not build custom auth infrastructure

### 6.2 AI profile

Each user owns one primary AI profile in MVP (many later).

Contains:

- Display name, headline, bio, avatar
- Public username
- Visibility (`draft` | `published`)
- Personality + structured facts
- Knowledge + memories
- External CTAs only: contact email / booking link (no calendar OAuth yet)
- Conversation history

### 6.3 Personality interview

Interview the user; do not force a complex prompt UI.

MVP uses a **fixed professional question script** (see Implementation Plan §6). The LLM converts answers into:

- Structured personality fields
- Structured facts (role, skills, preferences, boundaries, openness)

Personality is stored as **structured data**, not only a freeform system prompt.

### 6.4 Knowledge

**MVP sources**

- PDF, DOCX, TXT
- URLs
- Manual notes

**Not in MVP:** Google Drive, Notion, Gmail, LinkedIn sync, Instagram, YouTube.

### 6.5 Memory

RAG alone is not enough. Three categories:

| Type | What | Storage |
| --- | --- | --- |
| Semantic knowledge | Docs / notes / URLs | Embeddings + RAG |
| Structured personal info | Role, skills, prefs, boundaries | Postgres / JSON |
| Episodic memory | Important facts from owner chats | Explicit memory rows |

Users must **view, edit, and delete** memories.

Public visitor chats do **not** write memories in MVP.

### 6.6 Public AI

Every published AI gets a unique public URL.

Public page includes:

- Avatar, name, headline, short bio
- Chat interface
- Suggested professional questions
- Optional contact / book links (external)
- Conversation / rate limits

### 6.7 Dashboard

- Your AI status + completeness
- Knowledge
- Memories
- Conversations (visitor threads, read-only first)
- Simple analytics (visits, conversations, messages)
- Profile (photo, name, headline, bio, personality)
- Settings (username, CTAs, publish/unpublish, delete)

---

## 7. Screens (product map)

Only these surfaces are in MVP. Routes and build order: Implementation Plan §5–7.

1. **Landing** — “Your AI presence for when you’re busy.” CTA: Create My AI  
2. **Auth** — Sign up / login  
3. **Onboarding: Create** — name, headline, avatar  
4. **Onboarding: Interview** — guided professional interview  
5. **Onboarding: Knowledge** — uploads + notes  
6. **Onboarding: Test** — private chat  
7. **Onboarding: Publish** — username + share  
8. **App dashboard**  
9. **Knowledge / Memories / Chat / Conversations / Profile / Settings**  
10. **Public AI page**  

---

## 8. Viral growth loop

The public URL is the primary MVP growth mechanism.

```text
Professional creates AI
        │
        v
Publishes public URL
        │
        v
Adds link to LinkedIn / portfolio / email signature
        │
        v
Others interact (recruiters, clients, teammates, peers)
        │
        v
Discover PersonaAI → create their own AI
```

Product must make **share + copy link + signature blurb** extremely easy.

---

## 9. Pricing hypothesis

Validate product before optimizing revenue.

| Plan | Price | Knowledge | Public AI |
| --- | ---: | --- | --- |
| Free | ₹0 | Limited (e.g. 100 MB) | Yes (rate limited) |
| Plus | ₹499/month | Higher | Yes |
| Pro | ₹1,499/month | Higher | Yes |
| Business | ₹4,999+/month | Highest | Yes |

Key question:

> Will professionals pay to keep a public AI presence that others actually use?

---

## 10. Business model opportunities (later)

- **Professional:** representation link for discovery and inbound context  
- **Category packs:** job seeker, freelancer, coach, etc.  
- **Creator:** audience Q&A at scale  
- **Enterprise:** internal employee agents (far future)

MVP proves the professional public-link loop first.

---

## 11. Product moat

The LLM is not the moat. RAG is not the moat.

The moat becomes the **continuously evolving representation of a person** — profile, documents, preferences, memories, conversation corrections — that gets harder to replace over time.

That only matters if users **publish, share, and return** to improve the AI.

---

## 12. Product evolution

### V1 — Knows me + Represents me (MVP)

```text
Interview + personality
+ Knowledge (RAG)
+ Memory (owner)
+ Public URL + share loop
+ External contact/book links
```

### V2 — Categories (Next)

```text
Templates per category
+ Tailored interview + suggested questions
+ Stronger CTAs / lead capture
+ Billing
```

### V3 — Acts for me (Later)

```text
Email / calendar with permission engine
+ Draft before send
+ Audit logs
+ Messaging / voice as separate bets
```

**Permission principle (when tools arrive):** the LLM never directly executes privileged actions. A permission engine allows / denies / asks the user. See Implementation Plan Phase 7.

---

## 13. Features to avoid in MVP

Do not build until post-validation:

- Gmail / Calendar OAuth or send
- Instagram / WhatsApp / voice clone
- Autonomous agents / workflow builder
- Fine-tuned personal models
- Mobile app
- Marketplace
- Enterprise SSO
- Multiple LLM providers
- Complex tool execution
- Category-specific packs (Phase 6)

---

## 14. Success metrics

Do not measure only signups.

### Activation

- % who complete onboarding
- % who upload knowledge
- % with first successful owner chat
- % who publish
- Time to first useful answer

### Sharing (critical for this beachhead)

- % of users publishing
- Public visits
- Public conversations
- Share-to-signup conversion

### Engagement

- Conversations per published AI
- Return rate to improve knowledge/memories
- Memories created (owner)

### Monetization (after billing)

- Free → paid conversion
- MRR, churn, ARPU

### North star

> **Weekly meaningful public conversations with a published professional AI.**

A meaningful conversation is more than a greeting — it tests whether representation is useful to visitors.

---

## 15. Initial killer use case

> Create an AI version of yourself as a professional and share it.

Example:

```text
LinkedIn
   │
   v
"Talk to my AI"
   │
   v
persona.ai/u/mayank
```

A visitor (recruiter, client, peer) can ask:

- What does Mayank do?
- What are his main skills?
- How does he prefer to work?
- What kind of work is he open to?
- Tell me about recent projects.

Answers come from verified personal knowledge and stated boundaries — not invented claims.

---

## 16. MVP principle

**Start narrow.**

```text
Common professional
        │
        v
Interview + knowledge + memory
        │
        v
Personal AI
        │
        v
Public URL + share
```

Prove that professionals will **publish and share** an AI that represents them before building category packs or an agent ecosystem.

---

## 17. Final product thesis

PersonaAI should not become another generic chatbot builder.

> A persistent digital representation of a professional that understands their knowledge, personality, preferences, and memories — and can be shared with the world.

```text
                 PERSONAL AI
                      │
          +-----------+-----------+
          │                       │
       KNOWS ME              REPRESENTS ME   ← MVP
          │                       │
       Memory                  Public AI
       Knowledge               Share loop
       Personality             External CTAs
          │                       │
          +-----------+-----------+
                      │
                  ACTS FOR ME   ← Later
                      │
               Tools + permissions
               Email / Calendar
```

For build order, schema, APIs, stack, and week-by-week phases, follow **`PersonaAI_Implementation_Plan.md` only**.
