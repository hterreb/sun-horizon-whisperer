# Sun Chaser — Roadmap

> summary: Planned features for Sun Chaser that are not built yet.
> Main item: "Sun Chaser Premium", a paid subscription for line-of-sight sunrise/sunset analysis with terrain data.
> The backend (Stripe edge functions + `subscribers` table) exists; the frontend and the premium feature do not.

## Premium subscription (planned)

**Status:** backend ready, frontend not started.

**Exists today:**
- `supabase/functions/create-checkout`: Stripe Checkout session, $1.99/month, 7-day trial for new customers only.
- `supabase/functions/check-subscription`: syncs Stripe status to the `subscribers` table.
- `supabase/functions/customer-portal`: Stripe billing portal session.
- `supabase/migrations/20260927000000_create_subscribers.sql`: table + RLS.

**To build:**
1. Define the premium feature: line-of-sight sunrise/sunset with terrain data (elevation source, e.g. an open DEM API; horizon profile per azimuth; adjusted rise/set times).
2. Supabase Auth in the frontend (sign-in, session handling, `@supabase/supabase-js` client).
3. Upgrade UI: pricing dialog → call `create-checkout` → redirect to Stripe.
4. Handle return URLs `/?checkout=success` and `/?checkout=cancel` (toast + call `check-subscription`).
5. Gate the premium feature on `check-subscription` (`subscribed: true`).
6. "Manage subscription" button → `customer-portal`.
7. Optional: Stripe webhook function to update `subscribers` without polling.
8. Tests for the edge functions (Deno test with mocked Stripe).

## Other ideas

- Place-name search for the manual location (geocoding).
- Real maskable PWA icons.
- Unit toggle °C/°F.
