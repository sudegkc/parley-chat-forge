## Problem

In `src/routes/index.tsx`, when the sponsor sends any message the bot ignores the text and inserts the hardcoded `CAMPAIGN_DRAFT` from `src/lib/parley-script.ts` (Kioko Matcha Bar, iced matcha latte, 100, Turin). The confirmation copy and reward dispatch are also hardcoded. We need real extraction driven by the sponsor's actual message via OpenAI, with no "matcha" defaults and a follow-up question if the brand is missing.

## Approach

1. **New server function** `src/lib/parley.functions.ts` → `extractCampaign({ message })`.
   - Uses `createServerFn` (no auth middleware — the demo route `/` is public).
   - Calls OpenAI Chat Completions (`gpt-4o-mini`) with `OPENAI_API_KEY`, using tool-calling for structured output (per the AI knowledge: don't ask for JSON in text — use a tool schema).
   - Schema fields: `product` (string|null), `quantity` (integer|null), `vibe` (string[]), `location` (string|null), `brand` (string|null).
   - System prompt explicitly: extract only from the user's message, do not invent values, do not default to "matcha"; set fields to null/empty when not stated; return `brand: null` if not mentioned.
   - Server-side validation: confirm each non-null extracted token (product, quantity, location, brand) appears in the source text (whitespace-insensitive, case-insensitive). If not, null it out — prevents hallucinations like "matcha".
   - Returns `{ campaign, error }`.

2. **Wire extraction into the chat flow** in `src/routes/index.tsx`:
   - Add `campaignRef` (and state) for the live extracted `Campaign`.
   - In `handleSponsorSend` for stage `intro`/`awaiting_request`:
     - Show "Reading that…", call `extractCampaign({ message: text })`.
     - On error → bot apologises and stays in `awaiting_request`.
     - Build a `Campaign` from the result (quantity falls back to 0 only for display; vibe defaults to `[]`).
     - Append an `extraction` message with that real campaign.
     - **If `brand` is null**: ask "What brand should this campaign run under?" and move to a new stage `awaiting_brand`. Do NOT advance to expiry yet.
     - **If brand present**: ask the expiry question and move to `awaiting_expiry` (current behaviour).
   - New branch for stage `awaiting_brand`: save `text` as `campaign.brand`, re-emit the extraction card with brand filled, then ask the expiry question.

3. **Stop using `CAMPAIGN_DRAFT` for confirmation and rewards**:
   - `handleSponsorSend` `awaiting_expiry` confirmation copy: build from `campaignRef.current` — `"Campaign: {quantity} {product}, {vibe.join('/')} vibe, {location}, expires {text}. Confirm to launch?"` with graceful fallbacks when a field is empty.
   - `dispatchRewards` reward construction: use `campaignRef.current.brand` and `.product` instead of `CAMPAIGN_DRAFT`.
   - Final "All N rewards delivered" line uses real quantity (or matched user count when quantity is missing).

4. **Keep `CAMPAIGN_DRAFT` and `SUGGESTED_PROMPT`** in `parley-script.ts`:
   - `SUGGESTED_PROMPT` (the chip) stays as the example prompt.
   - Update `SUGGESTED_PROMPT` to the new lattes example so the suggestion chip matches the requested behaviour: `"I wanna give 10 iced lattes to study girls in Turin."`
   - `CAMPAIGN_DRAFT` is no longer read by `index.tsx` after this change; remove its imports there but leave the export untouched to avoid breaking other consumers.

5. **`start.ts`**: already registers `attachSupabaseAuth` (added in a previous turn) — unrelated, the new server fn is unauthenticated so this doesn't matter. No change.

## Technical details

- Server fn shape (createServerFn → `.inputValidator(zod).handler(...)`); no `requireSupabaseAuth`.
- OpenAI request body uses `tools: [{ type: "function", function: { name: "save_campaign", parameters: { ... } } }]` and `tool_choice: { type: "function", function: { name: "save_campaign" } }`. Parse `choices[0].message.tool_calls[0].function.arguments`.
- Error handling: 401/429/5xx → return `{ campaign: null, error: "..." }`; never throw to the client.
- Validation helper (per the "validateExtraction" pattern in the knowledge): strip whitespace, lowercase, `String(quantity)` for the number check.
- Brand follow-up: only one round-trip; after the sponsor replies in `awaiting_brand` we accept whatever they typed verbatim as the brand (no second extraction call).
- No DB tables, no migrations, no new packages — uses existing `OPENAI_API_KEY` secret and `fetch`.

## Files

- **Create** `src/lib/parley.functions.ts` — `extractCampaign` server function.
- **Edit** `src/routes/index.tsx` — wire extraction, add `awaiting_brand` stage, drop `CAMPAIGN_DRAFT` reads, use real campaign in confirmation/rewards.
- **Edit** `src/lib/parley-script.ts` — update `SUGGESTED_PROMPT` to the lattes example.
