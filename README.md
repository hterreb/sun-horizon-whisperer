# Sun Chaser

> summary: Sun Chaser is a React/Vite PWA. It shows live sun and moon position, sunrise/sunset/twilight times, and current weather for your location. This file covers setup, scripts, project structure, external services, and the (currently unused) Stripe/Supabase subscription functions.

## Features

- Live sun and moon position, based on your device location.
- Sunrise, sunset, and twilight times (civil, nautical, astronomical).
- Current weather, with a background that matches time of day and weather.
- Fullscreen mode with wake lock (the screen stays on).
- Lo-fi radio streams.
- Installable as a PWA, with offline caching.

## Tech stack

- React 18, TypeScript, Vite.
- Tailwind CSS, shadcn-ui (Radix UI primitives).
- `suncalc` for sun/moon position and times.
- `vite-plugin-pwa` (Workbox) for the service worker and manifest.
- Vitest + Testing Library + jsdom for tests.
- Supabase Edge Functions (Deno) for a Stripe subscription — see below.

## Setup

```sh
npm ci
npm run dev
```

The dev server runs at `http://localhost:8080`.

## Scripts

- `npm run dev` — start the dev server.
- `npm run build` — production build.
- `npm run build:dev` — development-mode build (useful for debugging a build issue).
- `npm run preview` — preview a production build locally.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run the TypeScript compiler in check-only mode.
- `npm test` — run the Vitest test suite.

## Project structure

```
src/
  components/       app components (SunTracker is the root state owner)
  components/ui/    shadcn-generated primitives (do not hand-edit; see CLAUDE.md)
  hooks/            useWakeLock, useIsMobile, useToast
  utils/            pure functions: sunUtils, moonUtils, weatherUtils
  pages/            route-level pages (Index, NotFound)
tests/              Vitest + jsdom tests, one file per source file
supabase/functions/ Stripe subscription Edge Functions (Deno, not yet wired to the frontend)
```

## External services

- **Open-Meteo** (`api.open-meteo.com`) — current weather. No API key. The app sends your exact latitude/longitude.
- **BigDataCloud** (`api.bigdatacloud.net`) — reverse geocoding (place name for your coordinates). No API key. The app sends your exact latitude/longitude.
- Lo-fi radio streams — third-party internet radio endpoints played through an `<audio>` element.
- **Sentry** (sentry.io, org `ainabler`, project `sun-chaser`) — error reports and anonymous feedback (no name, email or screenshot). No tracing, no replay. Location query values (`latitude`, `longitude`, `lat`, `lon`, `name`) are removed before sending (`src/utils/sentryScrub.ts`).
  - Run `npm run setup:keys` to enter both keys (hidden input). They go to `.env.local` (gitignored) and, if you want, to the GitHub Actions secrets.
  - `VITE_SENTRY_DSN` — set at build time to turn Sentry on. Without it, the app sends nothing to Sentry.
  - `SENTRY_AUTH_TOKEN` — CI only. When set, `npm run build` uploads hidden source maps and then deletes them from `dist/`. Never commit it.

## PWA notes

The app installs as a PWA. `vite-plugin-pwa` generates the service worker and web manifest at build time and precaches the app shell (JS, CSS, HTML, icons). Weather API responses are cached with a 30-minute network-first strategy so the app stays usable offline with stale weather data.

## Supabase Edge Functions (Stripe subscription)

Three Deno Edge Functions implement a Stripe subscription backend. **The frontend does not call them yet** — they exist but are not wired into the UI.

- `check-subscription` — looks up the caller's Stripe customer by e-mail and returns subscription status. Upserts the result into a `subscribers` table.
- `create-checkout` — creates a Stripe Checkout session for the "Sun Chaser Premium" subscription (with a first-time trial).
- `customer-portal` — creates a Stripe Billing Portal session so a subscriber can manage their subscription.

Required secrets (set with `supabase secrets set`):

- `STRIPE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SITE_URL` — used for CORS and Stripe redirect URLs.

The `subscribers` table and its RLS policy are in `supabase/migrations/`. Apply them with `supabase db push` before you deploy the functions. The premium feature and its frontend are planned; see [ROADMAP.md](ROADMAP.md).

## Lovable

This project was scaffolded with Lovable. The Lovable editor script (`cdn.gpteng.co/gptengineer.js`) is injected only in the dev server, not in production builds — see the `lovableEditorScript` plugin in `vite.config.ts`.
