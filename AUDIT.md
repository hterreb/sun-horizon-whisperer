# Sun Chaser — Repository Audit

> summary: Audit of the Sun Chaser repository (a React/Vite PWA that shows sun and moon positions and live weather, plus unused Supabase/Stripe edge functions).
> It lists findings by area (security, correctness, performance, build/CI, dependencies, accessibility, docs) with severity, file location, and a recommended fix.
> The top of the file has the verification results and a prioritized quick-win list.
> Audit date: 2026-09-24. Commit audited: `365d8a7` (main). Re-verified 2026-09-28 at `a9882c4`: 44 fixed, 5 partly fixed, 10 new open findings (see the status notes in §3). As of 2026-10-01, all findings are fixed; none is open.

## 1. Verification results

Audit run, 2026-09-24 (`365d8a7`):

| Check | Command | Result |
|---|---|---|
| Tests | `npx vitest run` | ✅ 16 files, 63 tests pass. Noise: jsdom `HTMLMediaElement.pause` "not implemented" errors from `MusicPlayer`. |
| Lint | `npx eslint .` | ❌ 25 problems (12 errors, 13 warnings). |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit` | ✅ 0 errors (but `strict: false`). With `--strict`: only 2 errors. |
| Build | `npx vite build` | ✅ One JS chunk, 415 kB (130 kB gzip). PWA precache 16 entries / 762 KiB. |
| Dependency audit | `npm audit --omit=dev` | ❌ 24 vulnerabilities (16 high, 6 moderate, 2 low) in the production tree: `vite`, `rollup`, `react-router(-dom)`, `@remix-run/router`, `postcss`, `nanoid`, `lodash`, `glob`, `minimatch`, `serialize-javascript`, others. `npm audit fix` is available. |

Re-verification, 2026-09-28 (`a9882c4`):

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | ✅ 36 files, 487 tests pass. |
| Lint | `npm run lint` | ✅ 0 errors, 1 warning (`react-refresh/only-export-components` in the shadcn file `src/components/ui/button.tsx`). |
| Typecheck | `npm run typecheck` | ✅ 0 errors, `strict: true`. |
| Build | `npm run build` | ✅ One JS chunk, 576 kB (188 kB gzip), above Vite's 500 kB warning. PWA precache 25 entries / 672 KiB. |
| Dependency audit | `npm audit --omit=dev` | ✅ 0 vulnerabilities. |

## 2. Severity scale

- **High** — security risk, data loss, or visible wrong behavior for many users.
- **Medium** — wrong behavior in edge cases, resource leaks, noticeable performance cost.
- **Low** — maintainability, hygiene, polish.

## 3. Quick wins (do these first)

> **Status 2026-09-24:** fixed: S-1…S-7, C-1…C-4, C-6, C-7, C-9, C-12, C-13, P-1…P-6 (P-4 except `CloudLayer`), B-1…B-7, M-1…M-4. Each fixed bug has a test that failed before the fix.
> Partial: D-1: 4 production advisories remain (1 high, 3 moderate). They need major upgrades: `vite` 5→8 (esbuild), `react-router-dom` 6→7.
> **Status 2026-09-25:** also fixed: S-8, C-5, C-8, C-10, C-11, D-2, D-3, D-4, A-1, A-2, A-3, A-5; A-4 partial (locale time format; no manual location input).
> **Status 2026-09-25 (branch `chore/upgrades`):** D-1 done (`npm audit`: 0 vulnerabilities after vite 8, react-router 7, vitest 4, eslint 10). A-4 done (manual location input). P-4 `CloudLayer` done (CSS movement, no per-frame state).
> **Status 2026-09-27:** S-9 done (`subscribers` migration + RLS). D-5 decided: keep the backend, feature on [ROADMAP.md](ROADMAP.md). React Compiler rules re-enabled, 0 hits. Duplicated `ScrollArea` removed. No open findings.
> New required secret for the Supabase functions: `SITE_URL`.
> **Status 2026-09-28 (re-verification):** each finding was checked again in the code, the tests and the running app. In §4, ✅ = fixed and verified, 🟡 = partly fixed, ⬜ = new, open. New findings: C-14 (Medium, sun arc drops out at night), C-15, C-16, C-17, P-7, B-8, A-6 … A-9 (all Low). Open parts of the partly fixed findings:
> - C-7: `showManualInstructions` in `PWAInstallPrompt.tsx` still calls `alert()`. The shadcn `Dialog` was deleted in D-3, so add it back with `npx shadcn add dialog`.
> - P-4: `Fireworks` still sets React state on each animation frame (it runs only for a few seconds at sunrise/sunset). `TemperatureIceberg` restarts its interval on each temperature change.
> - P-6: the hourly update check is done, but `onNeedRefresh` still calls `updateSW(true)` at once. Reload on the next `visibilitychange` instead.
> - B-6: all functions use `Deno.serve`, but `eslint.config.js` still lints `supabase/` with browser globals. Add a Deno override or ignore the folder.
> - D-4: one toast system now, but two import paths: `@/hooks/use-toast` (`MusicPlayer.tsx`) and `@/components/ui/use-toast` (`SunTracker.tsx`).
>
> Notes: A-2 is covered by the global `prefers-reduced-motion` rule in `index.css` plus `usePrefersReducedMotion` for the JS loops. A-4 uses a fixed 24-hour format by decision (`6856be1`), not the locale format. S-1 … S-9 have no automated tests; Deno tests for the functions are ROADMAP item 14, step 7.

> **Status 2026-09-28 (fixes):** fixed: C-14 (PR #21); C-15, C-17, A-8 (PR #22); C-7 (install steps shown in the prompt card instead of `alert()`, no Dialog needed), P-4 (`TemperatureIceberg` interval depends on `shouldReset` only; `Fireworks` per-frame state accepted with a `ponytail:` comment, it runs a few seconds), P-6 (reload on the next `visibilitychange` to hidden), B-6 (`supabase/` ignored by ESLint), B-8 (fast-refresh rule off for `src/components/ui/**`), D-4 (one import path, `src/components/ui/use-toast.ts` deleted), A-9 (rainbow spectrum marked as a deliberate exception). Open: C-16, A-6, A-7 (ROADMAP item 39), P-7.
> P-7 step 1: react-router (one page) and date-fns (3 format calls, now `Intl`) removed. Bundle 580 → 524 kB (190 → 171 kB gzip). The rest of the gap is Sentry (~125 kB, feedback form 38 kB).
> P-7 step 2: decided to keep one chunk; `build.chunkSizeWarningLimit: 600` on purpose. P-7 done. Open: C-16, A-6, A-7 (ROADMAP item 39).
> C-16, A-6, A-7: fixed by ROADMAP item 39 (loading screen). None of the re-verification findings is open.
> P-4 `Fireworks`: fixed by ROADMAP item 41 (one canvas, particles and rAF id in refs, no React state per frame).

1. Remove the third-party `gptengineer.js` script from production HTML (S-1).
2. Run `npm audit fix` and commit the lockfile (D-1).
3. Delete the `console.log` calls that run on every render and on every animation frame (P-1, P-2).
4. Fix the `getSunTimes` date mutation (C-1) and the wake-lock re-acquire bug (C-2).
5. Add `lint`, `typecheck`, `build` steps to CI and add a `test` script (B-1, B-2).
6. Decide on the Supabase/Stripe functions: finish the feature or delete the folder (S-2 … S-6).

## 4. Findings

### 4.1 Security and privacy

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ S-1 | High | `index.html:46` | Production page loads `https://cdn.gpteng.co/gptengineer.js` (Lovable editor script). A remote script with full page access, no SRI, no pinning. Supply-chain risk. | Remove it from production builds (inject only in dev via a Vite plugin, or drop it if you no longer edit in Lovable). |
| ✅ S-2 | High | `supabase/functions/create-checkout/index.ts:52-54` | Every checkout gets `trial_period_days: 7`, and nothing checks `trial_used`. A user can cancel and re-subscribe to get unlimited trials. | Read `subscribers.trial_used` (or Stripe subscription history) and omit the trial when it was used. |
| ✅ S-3 | Medium | all 3 functions, `corsHeaders` | `Access-Control-Allow-Origin: *` on authenticated payment endpoints. | Restrict to the app origin(s). |
| ✅ S-4 | Medium | `create-checkout/index.ts:55-56`, `customer-portal/index.ts:52` | Redirect URLs come from the client `Origin` header; fallback `http://localhost:3000`. | Use a configured `SITE_URL` env var. |
| ✅ S-5 | Medium | `check-subscription/index.ts:44`, `customer-portal/index.ts:42` | Logs user e-mail and IDs (PII) on every call; error messages from Stripe/Supabase go back to the client verbatim. | Log only user ID; return generic error text, keep details in server logs. |
| ✅ S-6 | Medium | `create-checkout/index.ts:21-27` | No check for missing `Authorization` header (non-null assertion → `TypeError` → 500) and no check for missing `STRIPE_SECRET_KEY`. `getUser` error is ignored. | Match the checks in `check-subscription` (return 401 for missing/invalid auth). |
| ✅ S-7 | Low | `check-subscription/index.ts:51,101` | `upsert` results are not checked, so DB write failures are silent. | Check `{ error }` and fail visibly. |
| ✅ S-8 | Low | `src/components/InfoPanel.tsx:130`, `src/utils/weatherUtils.ts:106` | Exact GPS coordinates go to `api.bigdatacloud.net` and `api.open-meteo.com`. No privacy notice. | Round coordinates to 2 decimals (~1 km) before sending; add a short privacy note. |
| ✅ S-9 | Low | `supabase/` | No migrations for the `subscribers` table, no `config.toml`, no RLS definition in repo. Stripe identity is matched by e-mail only. | Commit schema + RLS policies; store and match `stripe_customer_id` per `user_id`. |

### 4.2 Correctness

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ C-1 | High | `src/utils/sunUtils.ts:86-94` | Fallback branches call `date.setHours(...)`, which **mutates the caller's `Date`** (the `date` state in `SunTracker`). Each fallback also overwrites the previous one. Triggers at high latitudes (polar day/night), where SunCalc returns invalid dates. | Use `new Date(date)` copies (`const d = new Date(date); d.setHours(...)`). Add a test with latitude 78° in June. |
| ✅ C-2 | Medium | `src/hooks/useWakeLock.ts:32` | When the tab is hidden the browser releases the lock, but `wakeLockRef.current` stays non-null. On return the hook does not re-acquire it → screen sleeps in fullscreen after a tab switch. | Set the ref to `null` on the sentinel's `release` event (or check `sentinel.released`). |
| ✅ C-3 | Medium | `src/components/SunVisualization.tsx:109-110` | Azimuth maps linearly 0°→left, 360°→right. In the southern hemisphere the sun culminates at north (0°/360°), so at noon it jumps from the right edge to the left edge. | Center the map on the hemisphere's culmination azimuth (180° north, 0° south). |
| ✅ C-4 | Medium | `src/utils/sunUtils.ts:196-216` | `getRelevantTwilightTimes`: after astronomical dusk it shows *today's* dawn times (already past) as "upcoming dawn". | Use tomorrow's `getSunTimes` after dusk. |
| ✅ C-5 | Medium | `src/utils/sunUtils.ts:86-94` | At polar day/night the fallbacks show invented sunrise 06:00 / sunset 18:00 as real data. | Show "No sunrise today" / "Sun does not set" instead of fake times. |
| ✅ C-6 | Medium | `src/components/SunTracker.tsx:190-215` | Midnight effect: the `setInterval` created inside `setTimeout` is never cleared (the returned cleanup is discarded) → interval leak. The effect is also redundant: the 30 s timer already recomputes `sunTimes`. | Delete the effect. |
| ✅ C-7 | Medium | `src/components/PWAInstallPrompt.tsx:56,67,77` | Effect depends on `showPrompt` / `deferredPrompt`; the `setTimeout`s are never cleared and restart on every dependency change. Fallback prompt shows on any narrow desktop window. `alert()` for instructions. | One effect with cleared timers; fallback only for iOS Safari; replace `alert` with the existing `Dialog`. |
| ✅ C-8 | Low | `src/components/SunVisualization.tsx:28-45` | Fireworks trigger needs rounded altitude to hit exactly `0.0` within a 30 s sample. It fires unreliably or not at all. | Trigger on sign change (`prev < 0 !== cur < 0`). |
| ✅ C-9 | Low | `src/components/MusicPlayer.tsx:67-75,94-97` | Stream list contains dead endpoints (Radionomy shut down in 2020). When a stream fails during playback, the next `src` is set but `play()` is not called again. | Verify streams, drop dead ones, call `play()` after switching when `isPlaying`. Check stream licensing. |
| ✅ C-10 | Low | `src/utils/sunUtils.ts:27-37,172` | `'dusk'` `TimeOfDay` is never returned by `getTimeOfDay` → dead branch in gradients/labels. | Remove it, or return it. |
| ✅ C-11 | Low | `src/components/InfoPanel.tsx:103-122` | Auto-collapse overrides the user's manual expand/collapse choice at every time-of-day change. | Apply auto state only until the user toggles a section. |
| ✅ C-12 | Low | `src/components/TemperatureIceberg.tsx:53` | `z-6` is not a Tailwind class (no effect). | Use `z-[6]` or an existing step. |
| ✅ C-13 | Low | `src/components/FullscreenButton.tsx:25` | iPhone Safari has no Fullscreen API; the button silently does nothing. | Hide the button when `document.fullscreenEnabled` is false. |
| ✅ C-14 | Medium | `src/utils/sunUtils.ts` `findSunPass`, `src/utils/moonUtils.ts` `findMoonPass` | When the body is below the horizon, the set search starts at the bisected rise time, which is only within ±5 s of the crossing. When that time lands just below 0°, the search finds the same rise again and returns a pass of zero length (for example 05:22–05:22 UTC). At night the sun arc then collapses to one point and its zenith label disappears, every other minute (seen at 22:30 in Ravensburg). | In both functions, start the set search after the rise crossing (for example at `startMs + HORIZON_BISECT_TOLERANCE_MS`). Test: for each minute of one night, the pass is longer than 6 h and has a zenith. ROADMAP item 37. |
| ✅ C-15 | Low | `src/components/SunVisualization.tsx` arc-label geometry | When the moon culminates high, its zenith label lands under the collapsed InfoPanel (390×844 on `499ce9e`: panel at y 0–112 px, x ≥ 90 px; label at y 78–100 px on 30 Sep, 21:30). | Move a label that overlaps the collapsed panel below the panel's bottom edge, or beside the apex. ROADMAP item 38. |
| ✅ C-16 | Low | `src/components/SunTracker.tsx` startup `getCurrentPosition` | No `timeout` option. When the user leaves the location prompt open, "Locating…" stays on screen, and there is no way to choose a place instead. | Pass `{ timeout: 10000 }`. On timeout, use the default location with the existing toast. After 3 s, offer "Choose a place". ROADMAP item 39. |
| ✅ C-17 | Low | `src/components/InfoPanel.tsx` sun and moon times, `src/utils/arcLabels.ts` | After sunset the panel still shows today's sunrise, sunset and moonset, which are past, while the arc labels show the next pass. At 22:30: panel 07:17 / 19:09 and moonset 09:25, arcs 07:18 / 19:07 and 10:47. The comment in `arcLabels.ts` says the labels always match the panel. | After sunset, show the next sunrise and sunset in the panel (as `getRelevantTwilightTimes` does for twilight, C-4), and the next moonset after today's has passed. Or mark past times as "today". |

### 4.3 Performance

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ P-1 | High | `src/components/CloudLayer.tsx:27-29` + animation loop | `debugLog` → `console.log` runs **every animation frame** (~60/s) plus on each spawn/removal. Heavy CPU and memory on a long-running display app. | Remove `debugLog` or gate it behind `import.meta.env.DEV`. |
| ✅ P-2 | Medium | `src/components/SunTracker.tsx:55-59` | Four `console.log` lines on every render; the component re-renders every second. | Delete. Same for `[Weather Debug]`, `[PWA Debug]`, SW logs in `main.tsx`. |
| ✅ P-3 | Medium | `src/components/NightStars.tsx:125` | Effect depends on the `moonPosition` object (new every 30 s) → 300 stars are re-randomized, so the sky "jumps" every 30 s. The rAF loop also runs in daytime only to `clearRect`. | Depend on `moonPosition.illumination`; create stars once (`useRef`); stop the loop when not night. |
| ✅ P-4 | Medium | `src/components/CloudLayer.tsx:105-285`, `Fireworks.tsx:96-113`, `MidnightGhost.tsx`, `TemperatureIceberg.tsx` | Animations use React `setState` per frame / per 100 ms. Fireworks stores the rAF id in state (stale in cleanup, loop may not stop). Ghost/Iceberg call `setDirection` inside a `setPosition` updater and recreate the interval on every direction change. | Prefer CSS animations; keep rAF ids in `useRef`; keep direction in the position state. |
| ✅ P-5 | Low | `src/components/SunTracker.tsx:314` → `FullscreenButton.tsx:23` | `handleFullscreenChange` is a new function every render → the `fullscreenchange` listener is removed and re-added every second. | Pass `setIsFullscreen` directly (stable). |
| ✅ P-6 | Low | `src/main.tsx:19-26` | Service worker update check every 60 s and `onNeedRefresh → updateSW(true)` with `skipWaiting` → page reloads under the user on each deploy. | Check hourly; reload on next visibility change, not immediately. |
| ✅ P-7 | Low | build output (`npm run build`) | One JS chunk of 576 kB (188 kB gzip), above Vite's 500 kB warning. | Find the largest modules (for example with `rollup-plugin-visualizer`). Load the terrain code and the Sentry feedback form with `import()` when they are needed, or set `build.chunkSizeWarningLimit` on purpose. |

### 4.4 Build, CI, and tooling

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ B-1 | Medium | `.github/workflows/ci.yml` | CI runs only `vitest`. No lint, typecheck, build, or audit. Lint is already red (12 errors) and nobody sees it. | Add `npm run lint`, `npx tsc -p tsconfig.app.json`, `npm run build`. Fix the 12 lint errors first. |
| ✅ B-2 | Low | `package.json` | No `test` / `typecheck` scripts; package name `vite_react_shadcn_ts`, version `0.0.0`. | Add scripts; rename to `sun-chaser`. |
| ✅ B-3 | Medium | `tsconfig*.json` | `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`. Enabling `--strict` gives only 2 errors today. | Enable `strict` now while it is cheap. |
| ✅ B-4 | Low | repo root | Two lockfiles: `bun.lockb` and `package-lock.json`. CI uses npm. | Delete `bun.lockb` (or pick bun and delete the npm lock). |
| ✅ B-5 | Low | `.gitignore` | Commits `a74da3f`/`503e2a8` show a `vite.config.ts.timestamp-*.mjs` file got committed. | Add `vite.config.ts.timestamp-*` to `.gitignore`. |
| ✅ B-6 | Low | `supabase/functions/*` | Deno functions use `std@0.190.0` `serve` (deprecated) and are linted by the browser ESLint config (3 lint errors). No tests. | Use `Deno.serve`; exclude `supabase/` from the Vite ESLint config or give it a Deno config. |
| ✅ B-7 | Low | `tests/` | jsdom lacks `HTMLMediaElement.play/pause` → stack traces in test output. `test-cases.md` checklist is all unchecked and stale. | Stub `play`/`pause` in `tests/setupTests.ts`; delete or update `test-cases.md`. |
| ✅ B-8 | Low | `src/components/ui/button.tsx:56` | `npm run lint` shows 1 warning (`react-refresh/only-export-components`) for the shadcn `buttonVariants` export. The file is generated and must not be edited by hand. | Turn the rule off for `src/components/ui/**` in `eslint.config.js`, so the lint output stays clean. |

### 4.5 Dependencies and dead code

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ D-1 | High | `package-lock.json` | 16 high-severity advisories in production deps (see §1). | `npm audit fix`; re-run tests + build. |
| ✅ D-2 | Low | `package.json` | Unused runtime deps: `recharts`, `react-hook-form`, `@hookform/resolvers`, `zod`, `next-themes`, `cmdk`, `vaul`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`. `@tanstack/react-query` is mounted but has no queries. `vite-plugin-pwa` belongs in `devDependencies`. | Remove unused packages (smaller install, fewer advisories). |
| ✅ D-3 | Low | `src/components/ui/` | ~48 shadcn components, ~14 used. Tree-shaking keeps the bundle clean, but they add maintenance and lint noise. | Delete unused files; re-add with `npx shadcn add` when needed. |
| ✅ D-4 | Low | `src/App.tsx:14-15`, `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts` | Two toast systems mounted (`Toaster` + `Sonner`); Sonner is never called. Toast is imported from two different paths (`@/hooks/use-toast` and `@/components/ui/use-toast`). | Keep one system and one import path. |
| ✅ D-5 | Low | `supabase/functions/*` | Stripe functions have no caller in `src/` and `/success`, `/pricing` routes do not exist. The "Premium: line-of-sight terrain analysis" product is not implemented. | Finish the feature on a branch, or delete the functions from `main`. |

### 4.6 Accessibility and UX

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ A-1 | Medium | `src/components/InfoPanel.tsx:420-515` | Twilight labels are `<span onClick>`: not focusable, no keyboard access, info only on hover. | Use `<button>` or the existing `Tooltip` component. |
| ✅ A-2 | Medium | all animated components | No `prefers-reduced-motion` handling for stars, clouds, birds, fireworks, ghost. | Disable or slow animations under `motion-reduce`. |
| ✅ A-3 | Low | `FullscreenButton.tsx`, `MusicPlayer.tsx`, `InfoPanel.tsx` | Controls fade to `opacity-0` but stay focusable and clickable; reappear only on mouse hover (no touch/keyboard path). Music `Switch` has no accessible label. | Show on focus/touch too; add `aria-label`s. |
| ✅ A-4 | Low | `src/utils/sunUtils.ts:105`, `SunTracker.tsx:233-236` | 12-hour clock and °C are hard-coded; default location is New York with no way to set a location manually. | Use `Intl`/locale for time; add a manual location input. |
| ✅ A-5 | Low | `src/components/SunTracker.tsx:144-155` | A toast appears on every weather refresh (every 30 min, and on cache hits). | Toast only on failure. |
| ✅ A-6 | Low | `src/components/SunTracker.tsx` loading branch | The loading screen always shows a daytime sky. The Android splash before it uses the manifest `background_color` `#0F1016`, so a start at night goes dark, then bright blue, then dark again. It is a generic spinner with no brand. | Replace it with the Rising Mark loading screen on `#0F1016` (ROADMAP item 39). |
| ✅ A-7 | Low | `src/components/SunTracker.tsx` loading branch | The top-left buttons (fullscreen, compass, feedback) and the radio show on the loading screen, before there is a scene to control. | Show them only when the scene is ready, with a fade-in (ROADMAP item 39). |
| ✅ A-8 | Low | `src/components/SunVisualization.tsx` cardinal labels | In the static 360° view, the label at the 0°/360° edge (N in the northern hemisphere, S in the southern) sits on the screen edge and is cut in half (seen at 390 px). | Move edge labels inside the screen, as the arc labels already do, or show the edge label once. |
| ✅ A-9 | Low | `src/components/WeatherEffects.tsx:27` | The six rainbow band colours are hex literals. Item 15 moved the other scene colours to tokens. The `Fireworks` confetti colours are a documented exception; the rainbow has no such comment. | Add `--scene-rainbow-*` tokens, or add a comment that marks the spectrum as a deliberate exception. |

### 4.7 Documentation and metadata

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| ✅ M-1 | Low | `README.md` | Lovable boilerplate; no description of features, APIs used, env vars, Supabase setup, or deploy. | Rewrite with a summary block, setup, scripts, architecture, external services. |
| ✅ M-2 | Low | `index.html:9,36-40` | `author: Lovable`, OG/Twitter image and `@lovable_dev` handle belong to Lovable, not this app. | Replace with own metadata and an OG image. |
| ✅ M-3 | Low | `vite.config.ts:36-47,61-86` | Manual cache-busting (`?v=2.0`, `icons-cache-v2`); icon runtime-cache regex matches every origin; maskable icons reuse the "any" icons (probably cropped). | Rely on Workbox revisioning; anchor the regex to same-origin; add real maskable icons. |
| ✅ M-4 | Low | repo root | No `CLAUDE.md` / contributor notes. | Add a short one (commands, architecture, conventions). |

## 5. Suggested order of work

1. **Security + deps (½ day):** S-1, D-1, S-2 … S-6 (or delete `supabase/` per D-5).
2. **Correctness (1 day):** C-1, C-2, C-3, C-4, C-6, each with one test that fails before the fix.
3. **Performance (½ day):** P-1 … P-5.
4. **CI hardening (½ day):** B-1, B-3, B-4, B-5, lint to green.
5. **Cleanup + a11y + docs (1 day):** D-2 … D-4, A-1 … A-3, M-1 … M-3.
6. **Re-verification findings, 2026-09-28 (1 day):** C-14 first (visible every night), then C-15, C-17, A-8. A-6, A-7 and C-16 together with ROADMAP item 39 (loading screen). Then the open parts of C-7, P-4, P-6, B-6, D-4, and P-7, B-8, A-9.
