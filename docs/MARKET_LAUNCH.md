# PersonaAI — Market launch review

**Status:** MVP product loop is built. Not ready to sell as a finished product.  
**Audience:** Mayank, before a public paid launch.  
**Sources:** `PersonaAI_MVP_Product_Design.md`, `PersonaAI_Implementation_Plan.md`, `docs/PHASE_STATUS.md`, and the code in `apps/web` and `apps/api` as of 2026-10-09.

This document answers three questions:

1. What product do we actually have?
2. What else has to exist before people pay for it in the open market?
3. What has to be polished so the first public users trust it?

It does **not** reopen Phase 7 (email, calendar, voice, WhatsApp, agents). Those stay later. A market launch of *this* product means: a professional can create an AI that represents them, share a link that looks credible, and pay to keep it — without the company getting taken down by cost, abuse, or a wrong answer.

---

## 1. Verdict

Ship a **paid public beta**, not a “category platform.”

The core promise is already in the product:

> Create an AI in one sitting. Give it knowledge, personality, and boundaries. Share `/u/{username}` so other people can ask about you when you are busy.

Phases 0–5 of the implementation plan are implemented in code: auth, interview, knowledge + RAG, owner memory, public page, share helpers, free caps, feedback. Phase 5’s *ops* bar is not done (deploy is still pending; the ~20-person seed in `docs/SOFT_LAUNCH.md` is empty).

What is missing is the layer that turns a working local product into something you can charge for and leave running:

- a production home (domain, HTTPS, hosted web + API)
- money (real plans, not a “Soon” price)
- trust (legal pages, AI disclosure, abuse, data rights)
- reliability (jobs, rate limits, and limits that survive a restart)
- proof the share loop works (link previews, visitor quality, owner sees what happened)

Do that before category packs, lead marketplaces, or “acts for me.”

---

## 2. What is already a product

| Area | What a user can do today | Launch note |
| --- | --- | --- |
| Auth | Email/password, Google, session, logout, password reset, delete account | Email confirmation before publish is not enforced |
| Onboarding | Name, headline, avatar → 10-question interview → docs/notes/URL → private test → username + publish | Target is 5–15 minutes; drop-off is not measured |
| Personality | Structured fields from the interview; editable on Profile and Settings | Good. This is the right model (data, not a raw prompt box) |
| Knowledge | PDF, DOCX, TXT, URL, notes; status pending → ready/failed; chunks in pgvector | Ingest runs in the API process. A restart can drop a job |
| Memory | Owner chat can create memories; owner can view, edit, delete; public chat does not write memories | Correct for v1 |
| Owner chat | Private preview that uses profile + RAG + memories | Free cap: 40/day |
| Public AI | `/u/{username}`, suggested questions, contact email, booking link, 20 messages/hour/IP | Page is client-rendered. Shared links will not unfurl well |
| Share | Copy link, LinkedIn blurb, email signature text | The growth loop’s weak point is the *preview*, not the copy button |
| Dashboard | Completeness, checklist, visit / conversation / message counters | Counters only. No top questions, no referrer, no funnel |
| Conversations | Owner can read visitor threads | Read-only. No “that answer was wrong” |
| Safety | Injection phrases wrapped, reply length capped, prompt says not to invent secrets | Heuristic. A confident wrong biography is still the real risk |
| Plans | Free caps in the API. `/pricing` shows Free and “Plus — Soon” | No checkout, no invoices, no plan on the user |
| Feedback | `/feedback` | Useful for a seed cohort, not a support system |
| Files | Avatars and knowledge docs on Cloudflare R2 when configured | Local leftovers still served |

**North star from the product design is still the right one:** weekly meaningful public conversations on a published professional AI. Do not replace it with signups.

---

## 3. What “end to end in the market” requires

Three layers. Build them in this order. Do not start layer 3 until layer 1 is live and a handful of real public conversations have happened.

### Layer 1 — Safe to put on the internet (ship blockers)

These are not new product ideas. Without them, a public launch creates legal, cost, or trust problems.

**1. Production runtime**

- Hosted Next.js and FastAPI on a real domain (the product promise is `persona.ai/u/{name}`, or whatever domain you actually own).
- HTTPS, production Supabase Auth redirect URLs, CORS locked to that origin.
- Separate env for production. No localhost defaults.
- Postgres backups you have restored once.
- Health check that fails the deploy if the API cannot reach the database and the LLM.

Phase status still says “Deploy empty app — Pending.” That is the first engineering task, not a feature.

**2. Jobs that finish**

Knowledge ingest and memory extraction use FastAPI background tasks. Redis is in Docker and unused. On one process that is fine for you. For customers it means: upload a resume, the tab looks stuck, a deploy kills the job, the document stays `pending` forever.

Move ingest (and memory extract) to a worker. Redis is already the planned queue. Show failed jobs with a retry on `/app/knowledge`.

**3. Limits that hold under more than one server**

Public chat rate limit and free-plan counters that live in process memory reset on restart and do not add up across two API instances. Put public rate limits in Redis before the second instance. Keep per-user daily chat and document caps in Postgres (they already are, if usage is DB-backed — confirm they are the source of truth in production).

Add a **hard spend ceiling**: max owner chats, max public chats, and max embedding calls per profile per day, with a kill switch in config. One viral public page should not produce an unbounded LLM bill.

**4. Legal and disclosure (India-first)**

Pricing is in rupees. Treat the Digital Personal Data Protection Act as the baseline, plus ordinary consumer expectations.

- Terms of use and a privacy policy, linked from the landing page, sign-up, and the public AI page.
- Say what you store: account, interview, documents, memories, visitor messages, IP for rate limits.
- Say visitor chats are visible to the profile owner.
- Account deletion already exists. Add **export** of profile, facts, memories, and documents (a zip or JSON download in Settings). Deletion without export is a support incident waiting to happen.
- On every public page, a visible line: this is an AI speaking *as* the person, it can be wrong, and it is not the person.
- Cookie note if you add product analytics.

Have a lawyer read the two pages. Do not ship a copied template as if it were advice.

**5. Abuse**

A public URL is also a public impersonation surface.

- Report control on `/u/{username}` (reason + optional email). Store it. Email you.
- Reserved usernames (`admin`, `support`, `persona`, brand names, common public figures).
- Unpublish and suspend from your side without asking the user to cooperate.
- Block publish until the account email is verified.
- A one-page acceptable-use rule: no impersonation, no sexual content involving minors, no scams, no medical or legal advice presented as licensed.

You do not need a moderation team on day one. You need a way to take a page down the same day someone emails you.

**6. Errors you can see**

- Error tracking on web and API (Sentry or equivalent).
- Alert when error rate, LLM failures, or daily token spend jumps.
- Uptime check on `/health` and on one published page.
- Request IDs already exist. Surface them in the UI error state so a user can send you a code.

**7. A test you can rerun**

There is no automated test suite. Before launch, cover the paths that would embarrass you:

- stranger cannot chat with a draft profile
- owner cannot read another owner’s documents, memories, or chats
- delete account removes profile data and stored files
- public rate limit returns 429
- a resume chunk is retrieved for a question that is actually in the file
- prompt refuses to invent an employer or a phone number that was never provided (fixture, not a vibe check)

**8. Share preview**

`/u/[username]` is a client component. `generateMetadata` / Open Graph is absent. Pasting the link into LinkedIn or WhatsApp will show a generic “PersonaAI” card, or nothing useful.

This is the product’s distribution. The public page needs server-rendered title, description, and an image: avatar, name, headline, “Talk to {name}’s AI”.

### Layer 2 — Worth paying for (the market product)

Build these once Layer 1 is up and a few professionals have shared a link. This is the gap between “free MVP” and “I would put this in my email signature and pay.”

**1. Billing**

Hypothesis in the product design is still right. Do not launch four tiers.

| Plan | Price to test | What changes |
| --- | --- | --- |
| Free | ₹0 | Publish allowed. Tight caps: daily owner chats, document count, public messages/day on that profile |
| Plus | ₹499/month | Higher caps, email when someone has a real conversation, custom suggested questions |

Pro (₹1,499) and Business (₹4,999) wait until someone asks for a limit Plus does not cover.

Use Razorpay for India cards and UPI. Stripe only if you are charging outside India in the same launch. Enforce the plan in the API, not only in the UI. Handle failed payment by dropping to Free caps, not by deleting the AI. Show invoices and cancel in Settings.

**2. The correction loop**

The moat in the product design is a representation that gets harder to replace because the person keeps fixing it. Today the owner can edit memories and facts by hand, and can read visitor threads. They cannot say “that answer was wrong” and have the AI learn.

Minimum version:

- On a visitor message, owner marks “Wrong” or “Don’t say this.”
- That writes a memory or a boundary the prompt must honor.
- Optional: owner edits the suggested reply and saves it as a known fact.

This is more important than a new knowledge source.

**3. “Someone talked to you”**

Owners will not live in the dashboard. Email (or a daily digest) when a visitor conversation passes a bar: more than a greeting, or a question you could not answer. Link to the thread.

Without this, public chats happen and the owner never improves the AI. The north star dies quietly.

**4. Questions the owner cares about**

Dashboard should show, for the last 7 days:

- visits, conversations, messages (already there)
- top visitor questions
- questions the AI declined or had no knowledge for
- whether the visit came from the copied link (even a `?ref=` on the share URLs is enough)

“No knowledge” is the to-do list for the owner. That is the retention feature.

**5. Custom suggested questions**

The public page ships a fixed professional set. Let the owner write 3–5 questions that match how *they* get asked (“Are you open to contract work?”, “What stack do you use?”). Pre-fill from the interview so the empty state is not blank.

**6. Lead on the public page — only after the chat is trusted**

Phase 6 in the plan: visitor can leave an email or a short note, delivered to the owner’s contact email. Useful for freelancers. Dangerous if the AI is still inventing facts, because the lead trusts a wrong pitch.

Ship lead capture after the correction loop and the disclosure line, not before.

**7. Support**

Replace “hope they find `/feedback`” with a support email in the footer and Settings, and a short help page: how publish works, what the AI will not answer, how to delete data, how limits work.

### Layer 3 — After people pay (do not build for launch)

Kept here so they do not sneak into the launch backlog.

- Category packs (job seeker, coach, freelancer templates)
- Multiple AI profiles per account
- Custom domain (`ai.theirsite.com`)
- White-label or team seats
- Gmail, Calendar, WhatsApp, voice, fine-tuning, mobile app, marketplace
- Another LLM provider

The product design already marked these post-validation. A market launch does not change that.

---

## 4. Polish before you charge anyone

Quality work on what already exists. Do this in parallel with Layer 1. None of it is a new surface.

### Trust of the answer

The prompt already says: do not invent employers, salaries, or private contacts; say when you do not know; prefer facts, memories, and excerpts. Public visitors will still get smooth, specific, wrong answers. That is the failure mode for “this represents me.”

Before launch, run a fixed script against two real profiles (yours and one other profession):

- Ask for salary, phone, home address, private client names — must refuse.
- Ask for a skill that is not in the docs — must say it does not have that, not guess.
- Ask a question that *is* in the resume — must answer from it.
- Ask the owner to correct a fact, then ask again in a **new** chat — must use the correction.
- Ask the same question as a stranger on `/u/…` — same facts, no owner-only memories that were marked private (if you add a private flag; until then, do not put secrets in owner chat).

Add a “Sources” hint on the public reply when an excerpt was used (“From your resume”). Owners and visitors both calm down when the answer is tied to a document.

### Onboarding

- Show time left (“about 8 minutes”) and let people skip knowledge and add it later. Publishing with only the interview should be allowed and obviously incomplete, not blocked forever.
- If ingest fails, say why (password-protected PDF, empty URL, file too large) in the status row.
- After publish, the next screen is the share card with the real URL and a “open public page” link, not a dashboard dump.

### Public page

- Works on a phone in one thumb: messages, composer, contact, book. Test a real LinkedIn in-app browser.
- Loading and “unavailable” states already exist. Add a clear unpublished vs missing username vs rate-limit message. Rate limit should say when they can try again.
- Avatar, name, and headline readable before the first token streams.
- No layout jump when the keyboard opens.

### Owner app

- Visitor conversation list: search, and empty copy that points at the share button.
- Settings: plan, usage remaining, export, delete. Delete already asks for the email. Keep that.
- Personality editing is fine. Do not add sliders.

### Marketing site

- Landing already explains the job. Add privacy, terms, pricing that matches the live plan, and a real example public page (a demo profile you control, clearly labeled demo).
- Pricing page must not say “soft launch” or “billing comes later” on the day you charge.
- One sentence on who it is for: professionals who get the same questions repeatedly. Leave influencers and enterprises off the page.

### Engineering hygiene

- Migrations `001`–`006` applied by a repeatable command, not only the Supabase SQL editor from memory.
- CI: lint, typecheck, and the small API tests on every push.
- Secrets only in host env. Rotate anything that has lived in chat or a committed file.
- Fonts: self-host Fraunces and Figtree so the first paint does not depend on Google and you are not sending every visitor IP there.
- Remove or hide dev preview routes (`/dev-*`, `/preview`) in production.

### Copy

Read every user-facing string once. The product should sound like a professional presence, not an internal phase tracker. Words to remove from production UI: “Phase”, “soft launch”, “billing comes later”, “scaffold”.

---

## 5. Recommended sequence

| When | Outcome | Done when |
| --- | --- | --- |
| Now | Production deploy of the current MVP on the real domain | You can sign up on the public URL, publish, and a stranger can chat |
| Same week | Legal pages, AI disclosure, report button, email verification, OG tags, error tracking, spend ceiling | A bad public page can be taken down, and a shared link looks like a person |
| Next | Worker queue, Redis rate limit, export, the answer-quality script above | A resume still becomes Ready after a deploy; you have rerun the trust script |
| Then | 10–20 professionals (the existing soft-launch checklist) | At least some meaningful public conversations; notes in `docs/SOFT_LAUNCH.md` |
| After that signal | Razorpay Plus, visitor-email alert, “this was wrong”, top questions, custom suggested questions | One stranger pays, or you have a written reason the free product is enough to keep iterating |
| Not this launch | Category packs, leads-at-scale, inbox, calendar, voice | — |

If the 20-person cohort does not produce public conversations, do not build billing to “complete the product.” Fix the answer quality and the share preview, then ask again. The implementation plan’s success test is still the right one.

---

## 6. Launch bar

Call it launched when all of these are true:

1. A new user on the production domain can finish create → interview → one document → test → publish without you in the room.
2. Their link unfurls on LinkedIn with their name and headline.
3. A stranger gets answers that match the document, and gets a refusal on salary and private contact.
4. The owner receives a note that the conversation happened and can mark a bad answer.
5. Terms, privacy, disclosure, report, and account export exist.
6. You can unpublish a profile, see errors, and stop LLM spend the same day.
7. Free and one paid plan are enforced by the API. The pricing page matches them.

Until then it is a strong MVP on the way to market, not the market product.
