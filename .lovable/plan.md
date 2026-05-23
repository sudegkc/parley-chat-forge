## Goal
Let you view the Business profile form (the same UI as the logged-in dashboard) without signing in, pre-filled with realistic sample data.

## Approach
Create a new public route `/dashboard-preview` that renders the exact same form UI as `/dashboard`, but:
- Skips the auth check and Supabase data fetch
- Pre-fills the form with sample data
- Replaces "Save changes" with a disabled "Save changes (preview)" button
- Shows a small "Preview mode" badge in the header instead of the user email / Sign out

## Sample data used
- Business name: Brew & Bean Café
- Owner name: Sarah Chen
- Email: sarah@brewandbean.com
- Phone: +1 415 555 0123
- Category: Café & Bakery
- Website: https://brewandbean.com
- Telegram ID: @brewandbean
- Address: 482 Valencia Street, San Francisco, CA 94103

## Files
- **New** `src/routes/dashboard-preview.tsx` — public route, reuses the same layout, grid, and `Field` helper as `dashboard.tsx`, no Supabase calls.

## Notes
- No changes to auth, the real dashboard, or the database.
- After approval, open `/dashboard-preview` in the preview so you can see it immediately.
