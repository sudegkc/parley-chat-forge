# Parley Telegram Bot Demo — MVP Plan

A single-page web simulator that mimics Telegram. No backend, no dashboard, no extra routes. Everything is a scripted conversation simulator with mock state.

## Layout

Single route: `/` (replace placeholder in `src/routes/index.tsx`).

```
┌─────────────────────────────────────────────────────────────┐
│  Parley  •  Telegram Demo                          [Reset]  │
├──────────────────────────┬──────────────────────────────────┤
│  Sponsor ↔ Parley bot    │  Matched users (tabs)            │
│  (phone frame)           │  [Giulia] [Marta] [Chiara] ...   │
│                          │  (phone frame, switches chat)    │
│  [chat bubbles]          │  [chat bubbles + QR reward card] │
│                          │                                  │
│  [input bar]             │  [Claim reward] button (mock)    │
└──────────────────────────┴──────────────────────────────────┘
```

Two side-by-side phone-like frames. Left = sponsor chat. Right = tabbed view of matched-user chats so the demo can show personalized rewards going out.

## Components (src/components/)

- `PhoneFrame.tsx` — rounded device shell with Telegram-style header (avatar, name, "online").
- `ChatWindow.tsx` — scrollable bubble list + typing indicator + composer.
- `MessageBubble.tsx` — variants: bot, user, system; rounded, tail, timestamp.
- `QRRewardCard.tsx` — inline bubble card with brand, product, QR svg, expiry, "Claim" button.
- `SponsorPanel.tsx` — wires sponsor side to the scripted state machine.
- `UsersPanel.tsx` — tab strip + per-user `ChatWindow`.
- `TypingDots.tsx` — animated three-dot indicator.

## Conversation engine (src/lib/parley-script.ts)

A small scripted state machine, not real AI. Steps:

1. `greeting` — bot welcome.
2. `awaiting_request` — sponsor sends the matcha example (suggested chip available).
3. `extracting` — bot shows a "thinking" bubble, then a structured extraction card: brand, product, quantity, vibe, location, expiry. Mark `expiry` as missing.
4. `clarify_expiry` — bot asks "When should this expire?" Sponsor replies (chip: "7 days").
5. `confirm` — bot summarizes campaign, sponsor taps "Confirm".
6. `matching` — bot streams: "Found 100 matches… top vibe tags: study, matcha, Turin". Right panel populates 3–5 user tabs (Giulia, Marta, Chiara, Sofia, Aurora) each with vibe tags.
7. `dispatching` — bot says "Rewards sent." Right panel chats animate in: greeting + `QRRewardCard` (unique code per user, generated client-side).
8. `idle_analytics` — sponsor can tap chip "How is my campaign doing?" → bot replies with analytics bubble (claimed X/100, top neighborhoods, avg claim time). Some user tabs show a "Claimed ✓" state after a delay to back this up.

State stored in a single `useReducer` in the page; advance via send + scripted bot replies with `setTimeout` for realism.

## QR generation

Use `qrcode` npm package to render unique strings like `parley://r/{nanoid}` into an `<svg>`. Add `qrcode` and `nanoid` via bun.

## Design tokens (src/styles.css)

Premium minimal black/white per brand:
- Background near-white, surfaces white, sponsor bubbles black on white, bot bubbles light gray, user-side bot bubbles same.
- Single accent reserved for QR card border + Claim button (kept neutral / subtle).
- Rounded-2xl bubbles, soft shadow on phone frames, Inter or system sans, tight tracking on headings.
- Subtle fade+slide-up animation on new bubbles, typing dots pulse.

Will replace the default oklch tokens to a clean B/W scale and add `--bubble-bot`, `--bubble-sponsor`, `--phone-shadow`, `--radius` adjustments.

## Out of scope (explicit)

- No Supabase / backend / real Telegram integration.
- No auth, no routes other than `/`.
- No real AI — the "extraction" is a hand-authored object revealed step by step.
- No sponsor dashboard or separate pages.

## Technical notes

- TanStack Start, replace `src/routes/index.tsx` content.
- Add SEO head: title "Parley — Telegram bot demo", description, single H1 visually hidden.
- Mobile: stack panels vertically (left on top, users below) under `md`.
- Add `bun add qrcode nanoid` + `bun add -d @types/qrcode`.

## Deliverable in this first pass

Only the simulator structure + scripted matcha flow end-to-end (steps 1–9, with 10 as a follow-up chip). Polished visuals, animations, QR rendering, 3–5 mock users with personalized messages.
