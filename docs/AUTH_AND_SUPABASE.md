# Auth & Supabase — How it works

This document describes PersonaAI’s login flow and how Supabase connects to Next.js and FastAPI behind the scenes.

Related: `docs/API.md` · `PersonaAI_Implementation_Plan.md`

---

## 1. Architecture (high level)

```text
┌─────────────────┐     Auth only      ┌──────────────────────┐
│  Next.js web    │◄──────────────────►│  Supabase Auth       │
│  apps/web       │   (session cookie) │  (hosted)            │
└────────┬────────┘                    └──────────┬───────────┘
         │                                        │
         │  Authorization: Bearer <access_token>  │
         ▼                                        │
┌─────────────────┐     verify token              │
│  FastAPI        │◄──────────────────────────────┘
│  apps/api       │     (Auth /user · JWKS · secret)
└────────┬────────┘
         │
         │  SQLAlchemy
         ▼
┌─────────────────┐
│  Supabase       │
│  Postgres       │  tables: users, ai_profiles, …
│  (hosted)       │
└─────────────────┘
```

**Split of responsibilities**

| Layer | Owns |
| --- | --- |
| Supabase Auth | Sign up, sign in, email confirm, Google OAuth, JWT/session |
| Next.js | UI, session cookies via `@supabase/ssr`, route protection |
| FastAPI | Business API, JWT verification, `users` / `ai_profiles` CRUD |
| Supabase Postgres | App data (not queried directly from the browser for MVP) |

Frontend **does not** use the anon key to read/write `ai_profiles`. That goes through FastAPI only.

---

## 2. Environment variables

### Web — `apps/web/.env.local`

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key (`sb_publishable_…` or legacy JWT) |
| `NEXT_PUBLIC_API_URL` | FastAPI base (`http://localhost:8000`) |

### API — `apps/api/.env`

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `postgresql+psycopg://…@db.<ref>.supabase.co:5432/postgres` |
| `SUPABASE_URL` | Same Project URL as web |
| `SUPABASE_ANON_KEY` | Same publishable/anon key (for Auth `/user` verify) |
| `SUPABASE_JWT_SECRET` | Optional legacy HS256 fallback |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional; deletes the Auth user on `DELETE /account` |
| `CORS_ORIGINS` | `http://localhost:3000` |

**Do not** put the Supabase **secret** key in Next.js. The API may use `SUPABASE_SERVICE_ROLE_KEY` only to delete the Auth user when the owner deletes their account.

If `SUPABASE_URL` does not resolve in DNS (`getaddrinfo` / `NXDOMAIN`), auth API calls fail with 401. Copy the Project URL from the dashboard; verify with `nslookup <ref>.supabase.co`.

---

## 3. Login / sign-up flow (browser)

### 3.1 Email + password sign-up

```text
User → /sign-up
  → supabase.auth.signUp({ email, password, options.data.full_name })
  → If email confirmation required:
       Supabase emails link → /auth/callback?code=…
       → exchangeCodeForSession
       → redirect /onboarding/create
  → If session returned immediately:
       → redirect /onboarding/create
```

Code: `apps/web/src/app/sign-up/page.tsx`  
Callback: `apps/web/src/app/auth/callback/route.ts`

### 3.2 Email + password sign-in

```text
User → /sign-in
  → supabase.auth.signInWithPassword({ email, password })
  → Session stored in cookies (via @supabase/ssr)
  → router.push(next || /app)
```

Code: `apps/web/src/app/sign-in/sign-in-form.tsx`

### 3.3 Google OAuth

```text
User clicks “Continue with Google”
  → supabase.auth.signInWithOAuth({ provider: "google", redirectTo: /auth/callback?next=… })
  → Google → Supabase → redirect to /auth/callback?code=…
  → exchangeCodeForSession
  → /app after sign-in, /onboarding/create after sign-up
```

Requires Google provider enabled in Supabase Auth, and redirect URL allowlist including:

- Site URL: `http://localhost:3000`
- Redirect: `http://localhost:3000/**` (and `/auth/callback`)

---

## 4. Session & route protection (Next.js)

### Clients

| File | When used |
| --- | --- |
| `src/lib/supabase/client.ts` | Browser (`createBrowserClient`) |
| `src/lib/supabase/server.ts` | Server Components / route handlers |
| `src/lib/supabase/middleware.ts` | Edge middleware session refresh + guards |
| `src/middleware.ts` | Entrypoint for all matched routes |

### Middleware behavior

On each request (when env is set):

1. Create a cookie-aware Supabase server client
2. `supabase.auth.getUser()` — refreshes session if needed
3. If path is `/onboarding/*` or `/app/*` and **no user** → redirect `/sign-in?next=…`
4. If path is `/update-password` and **no user** → redirect `/forgot-password`
5. If user is signed in and path is `/sign-in` or `/sign-up` → redirect `/app`
6. If user is signed in and path is `/forgot-password` → redirect `/update-password`
7. Public routes (`/`, `/pricing`, `/u/*`, `/forgot-password` when logged out) stay open
8. `/update-password` is **not** redirected away when signed in (recovery lands here)

Session lives in **HTTP cookies**, not `localStorage`, so SSR and middleware can see it.

### 4.1 Logout (shipped)

Logout is **client-only** (no FastAPI endpoint). Clearing the Supabase session cookies is enough; the next API call without a Bearer token gets `401`.

```text
User clicks “Sign out” (AppNav or onboarding header)
  → supabase.auth.signOut()
  → session cookies cleared
  → router.replace(/sign-in) + router.refresh()
  → middleware sees no user on /app/* or /onboarding/*
```

| Piece | Path |
| --- | --- |
| Helper + `[auth]` logs | `apps/web/src/lib/auth.ts` |
| Button | `apps/web/src/components/sign-out-button.tsx` |
| App shell | `apps/web/src/components/app-nav.tsx` |
| Onboarding chrome | `apps/web/src/app/onboarding/layout.tsx` |

### 4.2 Password reset (shipped)

```text
User → /forgot-password
  → supabase.auth.resetPasswordForEmail({ redirectTo: /auth/callback?next=/update-password })
  → Email link → /auth/callback?code=…&next=/update-password
  → exchangeCodeForSession
  → /update-password
  → supabase.auth.updateUser({ password })
  → /app
```

| Piece | Path |
| --- | --- |
| Request email UI | `apps/web/src/app/forgot-password/page.tsx` |
| Set new password UI | `apps/web/src/app/update-password/page.tsx` |
| Helpers | `requestPasswordReset`, `updatePassword` in `lib/auth.ts` |
| Sign-in link | “Forgot password?” on `/sign-in` |

**Supabase config:** Redirect URLs must allow `{origin}/auth/callback` (see Site URL + Additional Redirect URLs).

---

## 5. Calling FastAPI with the session (create profile)

```text
/onboarding/create (client)
  → apiFetch("/ai/me" | "/ai")
       → supabase.auth.getSession()
       → access_token
       → fetch(API_URL + path, {
            headers: { Authorization: "Bearer " + access_token }
          })
```

Code: `apps/web/src/lib/api.ts`, `apps/web/src/app/onboarding/create/page.tsx`

Typical Phase 0 path:

1. `GET /ai/me` → `404` if no profile yet (form stays)
2. User submits name / headline
3. `POST /ai` → `201` draft profile
4. Navigate to `/onboarding/interview`

---

## 6. What FastAPI does with the token

Code: `apps/api/app/auth.py` → `get_current_user`

```text
Authorization: Bearer <access_token>
        │
        ▼
decode_supabase_token()
  1. GET {SUPABASE_URL}/auth/v1/user
       Headers: Authorization + apikey (SUPABASE_ANON_KEY)
       → { id, email, user_metadata }
  2. Else verify via JWKS
       GET {SUPABASE_URL}/auth/v1/.well-known/jwks.json
  3. Else verify via SUPABASE_JWT_SECRET (legacy HS256)
        │
        ▼
Upsert users row
  auth_provider_id = Supabase user id (sub / id)
  email, name from claims
        │
        ▼
Handler uses User for ownership checks
```

Then e.g. `POST /ai` inserts `ai_profiles` with `user_id = users.id`, `visibility = draft`.

**Important:** `users.id` (our UUID) ≠ Supabase auth id. We store Supabase id in `users.auth_provider_id`.

---

## 7. Data model touchpoints (auth-related)

```text
Supabase Auth user (id = UUID)
        │
        │  first authenticated API call
        ▼
users
  id                 ← our primary key
  auth_provider_id   ← Supabase Auth user id
  email, name
        │
        ▼
ai_profiles
  user_id → users.id
  visibility = draft | published
```

Schema SQL: `apps/api/migrations/001_phase0.sql`

---

## 8. JWKS URL (what it is)

Not a second product URL. Always:

```text
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```

Example:

```text
https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

Used to verify asymmetrically signed access tokens (ECC/RSA).  
If the **Project URL host** fails DNS, JWKS and Auth `/user` both fail.

With `SUPABASE_ANON_KEY` set, Phase 0 prefers Auth `/user` first; JWKS is fallback.

---

## 9. Sequence diagrams

### Sign-in then create profile

```text
Browser          Supabase Auth       Next.js MW        FastAPI         Postgres
   │                   │                 │                │               │
   │ signInWithPassword│                 │                │               │
   │──────────────────►│                 │                │               │
   │◄── session/cookies│                 │                │               │
   │                   │                 │                │               │
   │ GET /onboarding/create              │                │               │
   │────────────────────────────────────►│ getUser() OK   │               │
   │◄────────────────────────────────────│                │               │
   │                   │                 │                │               │
   │ POST /ai + Bearer token             │                │               │
   │─────────────────────────────────────────────────────►│               │
   │                   │◄── GET /auth/v1/user ────────────│               │
   │                   │── user json ────────────────────►│               │
   │                   │                 │                │ upsert user   │
   │                   │                 │                │──────────────►│
   │                   │                 │                │ insert profile│
   │                   │                 │                │──────────────►│
   │◄────────────── 201 AiProfile ────────────────────────│               │
```

---

## 10. Common failures

| Symptom | Likely cause |
| --- | --- |
| `getaddrinfo failed` / browser `NXDOMAIN` | Wrong or unreachable `SUPABASE_URL` host |
| `401` on `/ai` after login | Token verify failed; check `SUPABASE_URL` + `SUPABASE_ANON_KEY`; restart API after `.env` change |
| Redirect loop on `/sign-in` | Middleware + missing/invalid Supabase env |
| `409` on `POST /ai` | Profile already exists — use `GET /ai/me` |
| Signup email never arrives | Confirm email provider settings; check spam; Auth → Providers |
| Reset email never arrives | Same as signup; also confirm Redirect URLs include `/auth/callback` |
| Reset link opens then dumps to sign-in | Code exchange failed; check Site URL / allowlist; try request again |
| `/update-password` instantly → forgot | No session yet — open the email link (don’t paste `/update-password` alone) |

---

## 11. Security checklist

- [ ] Secret key never in `NEXT_PUBLIC_*` or client bundles
- [ ] All mutating profile APIs require Bearer token + ownership check
- [ ] App tables not exposed to the browser via Supabase client (no direct PostgREST for MVP)
- [ ] CORS limited to the web origin
- [ ] Rotate any credentials that were pasted into chat or committed

---

## 12. Key files

| Path | Role |
| --- | --- |
| `apps/web/src/app/sign-in/*` | Sign-in UI |
| `apps/web/src/app/sign-up/page.tsx` | Sign-up UI |
| `apps/web/src/app/forgot-password/page.tsx` | Request password-reset email |
| `apps/web/src/app/update-password/page.tsx` | Set new password after recovery |
| `apps/web/src/components/sign-out-button.tsx` | Sign-out UI |
| `apps/web/src/lib/auth.ts` | Client `signOut` / `requestPasswordReset` / `updatePassword` |
| `apps/web/src/app/auth/callback/route.ts` | OAuth / email / recovery code exchange |
| `apps/web/src/middleware.ts` | Session + route guards |
| `apps/web/src/lib/api.ts` | Bearer token → FastAPI |
| `apps/api/app/auth.py` | Token verify + user upsert |
| `apps/api/app/routers/ai.py` | Profile CRUD |
| `apps/api/app/config.py` | Env + JWKS / Auth URLs |

---

## 13. Auth feature status

See **Auth** section in `docs/PHASE_STATUS.md` (sign-in, logout, password reset shipped).
