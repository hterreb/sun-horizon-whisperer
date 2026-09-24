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
- `src/utils/*.ts` (`sunUtils`, `moonUtils`, `weatherUtils`) are pure functions. They take inputs, return outputs, and do not touch React state or `localStorage` beyond the weather cache in `weatherUtils`.
- `src/components/ui/` is shadcn-generated. Do not hand-edit these files. Regenerate with `npx shadcn add <component>` instead.
- `supabase/functions/*` are independent Deno Edge Functions for a Stripe subscription. The frontend does not call them yet.

## Conventions

- Tests live in `tests/`, one file per source file, using Vitest + jsdom + Testing Library.
- Use the `@/` alias for imports from `src/` (for example `@/components/ui/button`).
- Do not commit debug `console.log` calls. Gate any dev-only log behind `import.meta.env.DEV`.

## Gotchas

- Do not mutate `Date` arguments. Copy first: `const d = new Date(date); d.setHours(...)`. `sunUtils.getSunTimes` does this for its fallback times.
- Animation loops (`CloudLayer`, `Fireworks`, `MidnightGhost`, `TemperatureIceberg`, `NightStars`) keep their `requestAnimationFrame` ID in a `useRef`, not in state, so cleanup can always cancel the current frame.
- Supabase functions are Deno, not Node. Each function is self-contained (its own imports, no shared `src/` code) and runs in its own directory under `supabase/functions/`.
