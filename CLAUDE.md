# CLAUDE.md

> summary: Agent guide for Sun Chaser, a React/Vite PWA showing sun/moon position and live weather. Covers commands, architecture, conventions, and gotchas for anyone editing this repo.

## Commands

- `npm run dev` — dev server on port 8080.
- `npm run build` — production build.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — Vitest.

## Architecture

- `src/components/SunTracker.tsx` is the root state owner. It holds location, date, sun/moon position, sun times, time-of-day, and weather in state, and passes them down as props. Child components do not fetch or compute this state themselves.
- `src/utils/*.ts` are pure functions. They take inputs, return outputs, and do not touch React state. Exceptions that do I/O:
  - `weatherUtils` (fetch and the weather cache) and `terrainTiles` (tile fetch, canvas decode, the horizon profile cache).
  - `manualLocation`, `temperatureUnit` and `compassUtils` read and write one `localStorage` key each. Every access is in a try/catch, because `localStorage` can throw (private mode, quota).
- `src/components/ui/` is shadcn-generated. Do not hand-edit these files. Regenerate with `npx shadcn add <component>` instead.
- `supabase/functions/*` are independent Deno Edge Functions for a Stripe subscription. The frontend does not call them yet.

## Conventions

- Tests live in `tests/`, one file per source file, using Vitest + jsdom + Testing Library.
- Use the `@/` alias for imports from `src/` (for example `@/components/ui/button`).
- Do not commit debug `console.log` calls. Gate any dev-only log behind `import.meta.env.DEV`.

## Gotchas

- Do not mutate `Date` arguments. Copy first: `const d = new Date(date); d.setHours(...)`. `sunUtils.getSunTimes` does this for its fallback times.
- Most scene motion is CSS animation. The `requestAnimationFrame` loops are in `Fireworks`, `Ufo` and `useCompassHeading`, which keep the frame ID in a `useRef`, and in `NightStars`, which keeps it in a local variable of its effect. In both cases the effect cleanup cancels the current frame. Never keep a frame ID in React state.
- Supabase functions are Deno, not Node. Each function is self-contained (its own imports, no shared `src/` code) and runs in its own directory under `supabase/functions/`.
