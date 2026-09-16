# UI motion plan — one page at a time

Work **one screen, then stop**. Do not restyle the whole app in one pass.

Shared stack (install when we start page 1):

- Motion (`motion/react`) — transitions, lists, chat, steps
- React Bits — landing atmosphere + headline only (and onboarding `Stepper` later)
- `lucide-react` — icons in chrome, not decoration

Always respect `prefers-reduced-motion`. No neon, no particle cursors, no docks.

## Order

| # | Route | Motion / Bits | Icons |
| --- | --- | --- | --- |
| 1 | `/` Landing | Silk or Soft Aurora + BlurText/SplitText headline + CTA magnet. Hero stagger. | None required |
| 2 | `/pricing` | Fade-up of plans on scroll. Soft hover on a plan row. | Check on included lines later |
| 3 | `/sign-up` | Single form fade. Nothing flashy. | Mail, lock, Google |
| 4 | `/sign-in` | Same as sign-up. Shared auth layout if it stays DRY. | Same |
| 5 | `/onboarding/create` | Step enter (fields stagger). Progress → Bits `Stepper`. | Continue |
| 6 | `/onboarding/interview` | Question crossfade. Answer bubble. | Send / back |
| 7 | `/onboarding/knowledge` | Upload row enter. Status list stagger. | Upload, trash, link |
| 8 | `/onboarding/test` | Chat message enter + typing fade. | Send |
| 9 | `/onboarding/publish` | Preview card fade. Copy-link confirmation. | Copy, check, share |
| 10 | `/app` Dashboard | Stat count-up. Quiet `layoutId` nav pill. | Nav set |
| 11 | `/app/knowledge` | Same list motion as step 7. | Same as 7 |
| 12 | `/app/memories` | Row add/remove layout. Empty state. | Edit, trash |
| 13 | `/app/chat` | Same chat motion as step 8. | Send |
| 14 | `/app/conversations` | Thread list stagger. | Message |
| 15 | `/app/settings` | Form fade. Save confirmation. | Save |
| 16 | `/u/[username]` | Profile entrance, then questions, then chat. Optional faint Silk **or** light avatar tilt — not both. | Send, mail, calendar |

## How to view screens

Set `NEXT_PUBLIC_UI_PREVIEW=true` in `apps/web/.env.local`, restart Next.js, open `/preview`.

Turn the flag off when you need real login and API writes.
