## Goal

Make the OpenAI extraction return all 7 structured fields the user listed — `brand`, `product`, `quantity`, `vibe`, `audience`, `location`, `expiry` — each `null` when not stated. Stop conflating audience with vibe, and stop asking for expiry when the sponsor already wrote it.

## Changes

### 1. `src/lib/parley.functions.ts`
- Extend `ExtractedCampaign`:
  ```ts
  type ExtractedCampaign = {
    brand: string | null;
    product: string | null;
    quantity: number | null;
    vibe: string[];          // [] when absent
    audience: string | null; // who the campaign is for ("study girls")
    location: string | null;
    expiry: string | null;   // verbatim time phrase ("in 7 days", "end of month", "Friday")
  };
  ```
- Update the `save_campaign` tool schema: add `audience` (string|null) and `expiry` (string|null); keep all 7 in `required`; `additionalProperties: false`.
- Tighten the system prompt: `vibe` = adjectives/mood words; `audience` = who receives it; never invent; default to `null` / `[]`.
- `validate()`: keep substring guard for `product`/`location`/`brand`/`audience`/`vibe` items; relax for `expiry` (time phrases like "next Friday" pass through if non-empty); keep numeric digit guard for `quantity`.

### 2. `src/lib/parley-types.ts`
- Update `Campaign` so every field can be null:
  ```ts
  type Campaign = {
    brand: string | null;
    product: string | null;
    quantity: number | null;
    vibe: string[];
    audience: string | null;
    location: string | null;
    expiry: string | null;
  };
  ```

### 3. `src/routes/index.tsx`
- `campaignRef` initial: all nulls / `[]`.
- After extraction, store the AI campaign verbatim (no `?? ""` / `?? 0` coercion).
- Stage logic:
  - If `brand` is null → ask brand (`awaiting_brand`).
  - Else if `expiry` is null → `askExpiry()` (`awaiting_expiry`).
  - Else → skip straight to confirmation.
- `awaiting_expiry` writes the typed text into `campaignRef.current.expiry` (not a separate `expiryRef`).
- Confirmation summary builds from non-null fields only; include `audience` when present (`"for <audience>"`).
- Dispatch uses `campaignRef.current.quantity ?? MOCK_USERS.length`.

### 4. Extraction bubble UI
- Wherever the `extraction` message card renders fields, render `—` (or hide the row) when the value is `null` / `[]`, so missing data is visible instead of faked. Show `audience` as its own row.

## Out of scope
- No new routes, no auth changes, no DB migrations. Pure extraction + display refinement.
