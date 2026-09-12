# Soft launch checklist (Phase 5)

Ops checklist for seeding ~20 professionals and collecting feedback.
Product code for hardening lives in the API/web apps; this file tracks the launch process.

## Before inviting people

- [ ] Run migrations `001`–`006` in Supabase SQL Editor
- [ ] API + web env configured (Supabase + Azure chat + embedding deployment)
- [ ] Smoke test: create → interview → knowledge → test → publish → public chat
- [ ] Confirm free limits feel sane (`FREE_OWNER_CHATS_PER_DAY`, `FREE_MAX_DOCUMENTS`)
- [ ] Feedback form works at `/feedback`

## Invite cohort (~20)

- [ ] Invite professionals (ICs, freelancers, specialists)
- [ ] Ask them to publish and share `/u/{username}` with one peer
- [ ] Point them to `/feedback` after first publish

## Capture

| # | Name / email | Published? | Public chat tried? | Feedback note |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| … | | | | |
| 20 | | | | |

Feedback rows also land in the `feedback` table (`POST /feedback`).

## Success criteria (Implementation Plan)

- [ ] ~20 professionals published
- [ ] Qualitative feedback captured
- [ ] North star signal: at least some public conversations happened

When done, mark Phase 5 **Done when** in `docs/PHASE_STATUS.md`.
