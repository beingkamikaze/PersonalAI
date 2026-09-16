---
name: front
description: >-
  PersonaAI React frontend in frontend/ (Next.js App Router + TypeScript +
  Tailwind). Use when building landing, auth, onboarding, dashboard, public
  /u/[username], chat UI, forms, or any React component/page work.
paths: frontend/**/*
---

# PersonaAI front (React)

Build the frontend in **React** via Next.js App Router under `frontend/`.

## Stack

- React + TypeScript
- Next.js App Router (Server Components by default)
- Tailwind CSS + project UI tokens (`personaai-ui` rule)
- Data/AI only through FastAPI — never call LLMs from the browser

## Load with this skill

| Need | Skill |
| --- | --- |
| React components / hooks | `react` |
| Next.js App Router / RSC | `nextjs-react-typescript` |
| Styling | `tailwindcss` |
| Motion (landing/public) | `framer-motion` |
| A11y | `accessibility-a11y` |

Installed alongside this skill at `.cursor/skills/` (`react`, `nextjs-react-typescript`, `tailwindcss`, `framer-motion`, `accessibility-a11y`).

## MVP screens only

Marketing: `/`, `/pricing`  
Auth: `/sign-up`, `/sign-in`  
Onboarding: `/onboarding/create|interview|knowledge|test|publish`  
App: `/app`, knowledge, memories, chat, conversations, settings  
Public: `/u/[username]`

## Patterns

- Prefer Server Components; `'use client'` for chat composer, forms, uploads, motion
- Named exports, kebab-case files under `frontend/`
- Chat: message list + composer; suggested questions as plain text buttons
- Follow `PersonaAI_Implementation_Plan.md` §5 — no extra routes
