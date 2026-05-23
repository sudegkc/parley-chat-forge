## Goal

Make the QR code in the user's reward chat auto-claim when "scanned" in the demo, instead of requiring a separate "Claim reward" button tap.

## Behavior change

In `QRRewardCard`, the QR itself becomes the action surface:

- The QR canvas is wrapped in a button. Tapping/clicking it simulates a scan.
- On scan: the card immediately transitions to a "Claimed ✓" state (QR dimmed, big check overlay, subtle success animation), and `onClaim` fires so the sponsor analytics update as today.
- The separate "Claim reward" button at the bottom of the card is removed.
- A small hint label under the QR ("Tap QR to scan") makes the interaction discoverable in the demo.
- Already-claimed cards are non-interactive.

No changes to the conversation engine, analytics flow, sponsor side, or scripted timings — `onClaim(msgId)` still drives the same state updates in `src/routes/index.tsx`.

## Files touched

- `src/components/QRRewardCard.tsx` — restructure card: clickable QR, remove bottom button, add claimed overlay + hint text. Keep props (`reward`, `claimed`, `onClaim`) unchanged so callers are untouched.

## Out of scope

- No real camera/scan integration (still a simulated tap).
- No changes to sponsor panel, analytics card, or matching logic.
- No copy changes elsewhere in the bot script.
