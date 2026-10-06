# CLAUDE.md

> summary: Agent guide for Sun Chaser, a React/Vite PWA showing sun/moon position and live weather. Covers commands, architecture, conventions, and gotchas for anyone editing this repo.

## Commands

- `npm run dev` — dev server on `localhost:8080`. Add `-- --host` to reach it from a phone on the same Wi-Fi.
- `npm run build` — production build.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — Vitest.

## Architecture

- `src/components/SunTracker.tsx` is the root state owner. It holds location, date, sun/moon position, sun times, time-of-day, and weather in state, and passes them down as props. Child components do not fetch or compute this state themselves. Two children fetch other data: `InfoPanel` (the place name from BigDataCloud) and `PlaceSearch` (search results through `geocodeUtils`).
- `src/utils/*.ts` (`sunUtils`, `moonUtils`, `weatherUtils`, …) are pure functions. They take inputs, return outputs, and do not touch React state. Only these utils use `localStorage`: `weatherUtils` (weather cache), `terrainTiles` (terrain profile cache), `manualLocation`, `compassUtils`, `temperatureUnit` and `language` (saved choices), `premium` (the Premium start hint). `fastReturn` uses `sessionStorage` (the time the app was last visible).
- `src/components/ui/` is shadcn-generated. Do not hand-edit these files. Regenerate with `npx shadcn add <component>` instead.
- `api/planes.ts` is a Vercel Edge function: the live radar's proxy to adsb.lol (ROADMAP item 96). Its logic is in `src/utils/planeFeed.ts` (relative imports only, so the Edge bundle and a later Cloudflare Pages Function can use it). `npm run dev` and `vite preview` serve it through the `planesApi` plugin in `vite.config.ts`.
- `supabase/functions/*` are independent Deno Edge Functions for a Stripe subscription. The frontend does not call them. The first Premium release uses Google Play Billing instead (ROADMAP items 14 and 45).

## Conventions

- Tests live in `tests/`, one file per source file, using Vitest + jsdom + Testing Library.
- Use the `@/` alias for imports from `src/` (for example `@/components/ui/button`).
- UI text is not hard-coded. Add the key to `src/i18n/en.ts` and to `de.ts`, `es.ts`, `it.ts`, `fr.ts`, and show it with `useLanguage().t(key)` (`SunTracker` provides the language). `tests/i18n.test.ts` fails on a missing or unused key.
- Do not commit debug `console.log` calls. Gate any dev-only log behind `import.meta.env.DEV`.
- The repo is public, so every commit e-mail is public. Commit only as `Lutz Berreth <lutz.berreth@gmail.com>` (set in the repo's git config). `.githooks/pre-push` blocks a push with any other author or committer e-mail. Enable it once per clone: `git config core.hooksPath .githooks`.
- Tailwind CSS v4: theme tokens (colours, type scale, radii, animations) are in the `@theme` block of `src/index.css`; there is no `tailwind.config.ts`. Opacity goes in the colour (`bg-white/10`): v3's `bg-opacity-*`, `border-opacity-*` and `text-opacity-*` no longer exist, and v4 drops them without an error (the colour turns solid).
- Security headers (CSP and others) are in `public/_headers` (Cloudflare Pages) and, until the move from Vercel is done, also in `vercel.json`. `tests/headers.test.ts` fails if the two differ. A new external host (API, stream, script) must go into the CSP, or the browser blocks it.

## Gotchas

- Do not mutate `Date` arguments. Copy first: `const d = new Date(date); d.setHours(...)`. `sunUtils.getSunTimes` does this for its fallback times.
- `requestAnimationFrame` loops (`Fireworks`, `Ufo`, `useCompassHeading`) keep their frame ID in a `useRef`, not in state, so cleanup can always cancel the current frame. `NightStars` keeps it in a local variable of its effect, which the cleanup closes over. `CloudLayer` moves things with CSS animations, and `MidnightGhost` and `TemperatureIceberg` use an interval.
- Supabase functions are Deno, not Node. Each function is self-contained (its own imports, no shared `src/` code) and runs in its own directory under `supabase/functions/`, with its own `deno.json` and `deno.lock`. Regenerate a lock with the Edge runtime's Deno version (command in README), not with the local Deno: a newer lock format makes the function fail to boot.
