# Sun Chaser — Roadmap

> summary: Prioritized list of Sun Chaser features that are not built yet, each with a short spec.
> P0 = quick fixes and polish, P1 = core sky features, P2 = line-of-sight terrain analysis (Premium later, free now),
> P3 = redesign and Google Play release. An ongoing easter-egg batch and a backlog follow.
> Each item has Why, Spec, Done when, Size (S = hours to 1 day, M = days, L = 1+ weeks) and dependencies.

Status: last updated 2026-10-01. Done: items 1–13, 15, 17–44 and 47–61, item 46 rolled back (marked **✅ Done** in the heading; items 1–13, 15 and 17–30 re-verified on 2026-09-28, see [Verification](#verification-2026-09-28)). Open: items 14 and 16 (item 45 decided: Premium in the Play app only, web free), the checks listed under Verification, the new findings in [AUDIT.md](AUDIT.md) (§3, status 2026-09-28), easter eggs, backlog.

## Verification (2026-09-28)

- **Method:** each done item was checked against its Spec and Done-when in the code and the tests (`main` at `a9882c4`: 487 tests, lint, typecheck and build pass). It was also checked in the running app with Playwright: 390×844 and 360×640, Ravensburg by day and at night, Sydney, fullscreen idle and wake, compass mode with synthetic headings, denied geolocation, place search.
- **Result:** items 1–13, 15 and 17–30 are built as specified, or as a later item changed them. The check found two new bugs (items 37 and 38). Items 31–36 were built after this check and are not part of it.
- **Still open:**

| Item | Open point | Needs |
|---|---|---|
| 2 | Touch scroll in the panel does not pan the scene. | Real device |
| 4 | The installed PWA shows no browser bars and no gaps (Android); it draws under the status bar (iOS). | Real device |
| 8, 19 | Labels match a hardware compass within about 10°. Pointing the phone at the sun puts it at screen centre; a 45° turn moves it to the edge. | Real Android phone and iPhone |
| 9 | Moon times match timeanddate.com within 2 minutes. | External reference |
| 13 | An alpine sunset matches PeakFinder or an observation within 5 minutes. | External reference |
| 15 | The maskable icon is not cropped on a launcher. | Real Android device |
| 21 | A thrown test error has readable stack frames and no coordinates; a feedback message has no name or email. Sentry in the privacy policy (item 16). | Sentry dashboard |
| 23 | In fullscreen on a phone, a tap shows the feedback button and it opens the form. | Real device |
| 14, 16 | Not started. Decide Stripe or Google Play Billing before item 16 (proposal: item 45). | Decision |
| 37, 38 | New bugs, see below (AUDIT C-14, C-15). | Fix |
| 39 | Built. The hand-off from the Android splash to the loading screen on a phone. | Real device |
| 40 | Built. Look at the boat speeds and sizes on a phone. | Real device |
| 41–45 | New, from Sentry feedback round 3, see below. | Build; decision for 45 |

## Priority rules

1. Fix visible bugs before adding features (P0).
2. Pick the design direction before building new visuals, so they don't need restyling later (item 7 comes before items 8–10).
3. Line of sight is the flagship feature. Build it free behind `PREMIUM_ENFORCED = false`. Turn on the paywall later.
4. Don't publish to Google Play until the tech-debt sweep (item 6) and the redesign (item 15) are done.

---

## P0 — Quick wins (fixes and polish)

### 1. InfoPanel always on top — S — **✅ Done**

- **Why:** fish, ships, birds, the iceberg and the midnight ghost draw over the InfoPanel. The panel root (`InfoPanel.tsx:267`) has no z-index. The scene elements use z 5–30.
- **Spec:**
  - Give the InfoPanel root `z-30`.
  - Keep scene animations at z ≤ 10. Move `MidnightGhost` from `z-30` to `z-10`.
  - Keep the FullscreenButton (`z-40`), PWA prompt (`z-50`) and toasts (`z-[100]`) above the panel.
  - The MusicPlayer sits under the panel (`z-20`), so it never hides panel rows on narrow screens.
- **Done when:** no scene element draws over the panel, at day or night, with the panel open or collapsed.

### 2. Scrollable InfoPanel on mobile — S — **✅ Done**

- **Why:** the panel height uses `max-h-[calc(100vh-120px)]` (`InfoPanel.tsx:359`). On mobile, `100vh` includes the browser bars, so the lower sections can't be reached.
- **Spec:**
  - Replace `100vh` with `100dvh` in the panel.
  - Make sure touch scrolling works in the Radix `ScrollArea` and does not pan the scene.
  - Add bottom padding equal to `env(safe-area-inset-bottom)`.
- **Done when:** on a 360×640 viewport, with all sections expanded, the last section can be scrolled into view.

### 3. Remove the location success toast — S — **✅ Done**

- **Why:** the "Location detected" toast at startup adds no information.
- **Spec:**
  - Delete the success toast in `SunTracker.tsx` (~195–236).
  - Shorten the loading text "Detecting your location..." to a spinner with the text "Locating…".
  - Keep the "Location unavailable → using default location" toast. The user must know about the fallback.
- **Done when:** a successful start shows no toast, and a failed start still shows the fallback toast.

### 4. True fullscreen on mobile — S — **✅ Done**

- **Why:** there is no `viewport-fit=cover` and no safe-area handling, the app uses `h-screen`/`100vh`, `requestFullscreen` has no webkit fallback, and the manifest uses `display: standalone`.
- **Spec:**
  - `index.html`: set `viewport-fit=cover` in the viewport meta.
  - Replace `h-screen` with `h-dvh` in the app shell.
  - Pad the UI chrome (not the sky) with `env(safe-area-inset-*)`.
  - `vite.config.ts` manifest: add `display_override: ["fullscreen", "standalone"]`.
  - `FullscreenButton.tsx`: fall back to `webkitRequestFullscreen`. Hide the button when no fullscreen API exists.
  - Note: iPhone Safari has no Fullscreen API. On iOS, the only fullscreen path is the installed PWA. On Android, it is the installed PWA or the TWA (item 16).
- **Done when:**
  - The installed PWA on Android shows no browser bars and no gaps at the notch or home indicator.
  - On iOS, the installed PWA draws under the status bar.

### 5. Radio: Next button — S — **✅ Done**

- **Why:** `MusicPlayer.tsx` has 4 lo-fi radio streams. It only moves to the next stream when one fails. The user can't choose.
- **Spec:**
  - Turn the stream list into `{ name, url }` entries.
  - Add a Next button (lucide `SkipForward`, `aria-label="Next station"`). It moves to the next station and wraps around after the last one.
  - Show the current station name.
  - Save the last station index in `localStorage` (wrap reads/writes in try/catch).
  - Keep the auto-skip on error.
- **Done when:** Next cycles through all 4 stations and back to the first, and a reload resumes the last station.

### 6. Tech-debt sweep — S *(suggestion)* — **✅ Done**

- **Why:** these issues are small, but they block the store release or cause wrong output.
- **Spec:**
  - Remove the Lovable/gptengineer script injection in `vite.config.ts:10-15`. It loads third-party code, which is a privacy risk and a problem for the Play Store.
  - Fix the moon phase mismatch: `getMoonPhaseIcon` (`SunVisualization.tsx:202-212`) and `getMoonPhaseLabel` (`moonUtils.ts:28-39`) use different thresholds. Make one function the only source for the thresholds.
  - Delete the unused `public/mountain-day.svg`, `public/mountain-night.svg` and their references in `sunUtils.ts:202-205`.
  - Add maskable icons (`purpose: "maskable"`) to the manifest.
- **Done when:** the build contains no third-party script, and a test shows that the moon icon and label match for all 8 phases.

### Field findings (2026-09-28)

Found on a real phone after items 8–11 shipped. Items 17–20 are bugs or UX fixes, item 21 is error reporting.

### 17. Sun arc, and fix the arc line — S — **✅ Done**

- **Why:**
  - "Sun is not on the line": the only arc in the scene is the **moon's** path (`moonArcPath` in `SunVisualization.tsx`). There is no sun path. The moon arc is also drawn by day, when the moon is not shown.
  - "Parabolic line is broken on portrait": `buildArcPath` connects consecutive points with `L`, also when the path crosses the azimuth wrap (0°/360°, or 180° in the southern hemisphere, or any angle with a compass offset). The line then jumps straight across the screen. The x/y clamp to `[30, size − 30]` in `getScreenPosition` also flattens the arc ends into the screen edge. Both show most on narrow (portrait) screens.
- **Decision (2026-09-28):** add a sun arc and keep the moon arc.
- **Spec:**
  - Add `getSunPathAround(date, lat, lon, steps = 48)` to `sunUtils.ts`, the same shape as `moonUtils.getMoonPathAround` (±12 h around `date`). Compute it in `SunTracker` and pass it down as a prop, like `moonPath`.
  - Draw the sun arc with `buildArcPath` and `getScreenPosition`, the same mapping as the sun dot, in a warm token color (for example `brand-sunset`), stronger than the moon arc.
  - Draw the moon arc only while the moon is shown (`isMoonVisible`).
  - `buildArcPath`: start a new segment (`M`) when the x distance between two neighbor points is more than half the width (a wrap).
  - Do not clamp arc points. Clamp only the sun and moon dots, so the arc runs off-screen cleanly.
- **Done when:**
  - A test shows that the sun dot's x/y is a point on the sun arc path (the center sample of `getSunPathAround` is `date` itself).
  - A test shows that a path across the wrap gives two segments and no line across the screen.
  - At 390×844 (portrait), in both hemispheres and with a compass offset, no arc draws a straight line across the screen. If the portrait bug still shows after this, get a screenshot and reopen.

### 18. Hide the compass toggle in fullscreen — S — **✅ Done**

- **Why:** `FullscreenButton` fades out in fullscreen. `CompassToggle` has no hide logic, so it stays on screen.
- **Spec:**
  - Pass `isFullscreen` and the existing idle state `showCursor` from `SunTracker` to `CompassToggle`.
  - In fullscreen, fade the toggle out with the same classes as `FullscreenButton` (`transition-opacity duration-300`, `opacity-0`). Show it again on mouse move, tap or keyboard focus.
  - The toggle must stay reachable: `opacity-0` only, not `display: none`, and focus makes it visible.
- **Done when:** in fullscreen both buttons fade out together, and a tap or mouse move brings both back.

### 19. Compass mode rework — M — **✅ Done**

- **Why:** "all the directions move quite a lot and cluster together". Three causes in the code:
  1. **No real field of view.** The scene always maps 360° to the screen width. On a 390 px portrait phone, the 8 labels sit about 49 px apart, and 1° of phone turn moves the scene about 1 px. The labels do not match what the camera sees, except at screen center.
  2. **CSS transition fights the live heading.** The sun, moon and labels have `transition-all duration-1000` (or `transition-transform`). The heading changes on each sensor event, so each update restarts a 1 s animation. At the 359°→0° wrap, the offset jumps by 360°, and all labels slide across the screen at the same time and pass over each other.
  3. **Too many renders.** `useCompassHeading` calls `setHeading` on each event (up to 60 Hz), and the whole scene re-renders each time.
- **Decision (2026-09-28):** in compass mode, show a real field of view of about 90°. The static mode keeps the 360° view.
- **Spec:**
  - **Field of view:**
    - Add a compass-mode mapping in `SunVisualization.tsx`: `x = 0.5 + shortestDelta(heading, azimuth) / fov` with `fov = 90`. Use the signed shortest delta (from `compassUtils`), so there is no wrap jump.
    - Use this mapping for all azimuth consumers: sun and moon dots, both arcs (item 17), cardinal labels, and the rainbow.
    - Hide elements outside the field of view. Do not clamp them to the edge.
    - Replace the offset-based `headingToAzimuthOffset` path with the new mapping. Delete what is then unused.
    - Keep the value `COMPASS_FOV_DEG = 90` as a named constant, so it can be tuned on real devices.
  - **Off-screen sun hint:** when the sun (by night: the moon) is outside the field of view, show a small arrow at the left or right edge that points the short way to it.
  - **Smooth motion:**
    - While compass mode is active, remove the CSS transitions from the moving elements. The low-pass filter does the smoothing.
    - Update the heading state at most once per animation frame (keep the rAF id in a `useRef`, see CLAUDE.md).
  - **Heading check on devices:** the Android formula in `headingFromDeviceOrientationEvent` uses beta and gamma. Test it with the phone upright (beta ≈ 90°), where Euler alpha is unstable. Add a unit test that the heading changes smoothly for beta from 80° to 100° at a fixed direction.
- **Done when:**
  - On a real Android phone and a real iPhone, in portrait: pointing the phone at the sun puts the sun at screen center. Turning the phone by 45° moves the sun to the screen edge.
  - The labels match real directions (check against a hardware compass within about 10°), and they do not slide or bunch up at the 0°/360° wrap.
  - Unit tests cover the field-of-view mapping, including the wrap and the hide-when-outside rule.

### 20. Golden and blue hour: show only the next pair — S — **✅ Done**

- **Why:** the InfoPanel shows 4 rows (morning and evening, golden and blue). Only the next ones are useful.
- **Decision (2026-09-28):** show the next blue hour and the next golden hour, from the same part of the day.
- **Spec:**
  - Add a pure util `getNextGoldenBlueHours(now, lat, lon)` to `sunUtils.ts`. It returns `{ part: 'morning' | 'evening', day: 'today' | 'tomorrow', golden, blue }`. Follow the pattern of `getRelevantTwilightTimes`:
    - Before the morning golden hour ends: today's morning pair.
    - Before the evening blue hour ends: today's evening pair.
    - Else: tomorrow's morning pair.
  - InfoPanel: show 2 rows, in time order (morning: blue, then golden; evening: golden, then blue). Put the part in the heading, for example "Golden & Blue Hour · this evening" or "· tomorrow morning".
  - Mark a window that is running now (for example "now, until 19:42").
  - Polar day or night (a window is `null`): keep the current "—" output.
- **Done when:** unit tests cover 4 times of day (before sunrise, midday, during the evening golden hour, after dusk) and one polar case, and the panel shows 2 rows.

### 21. Sentry: error reports and anonymous feedback — S — **✅ Done** (except the release to-dos below)

- **Why:** field bugs like 17–19 were found by hand. We need crash reports from real devices, and a simple way for users to report a problem.
- **Decision (2026-09-28):** errors and anonymous user feedback only. No performance tracing, no session replay.
- **Spec:**
  - Add `@sentry/react`. Call `Sentry.init` in `src/main.tsx` only when `VITE_SENTRY_DSN` is set. With no DSN (local dev, tests), Sentry is off.
  - Wrap the app in `Sentry.ErrorBoundary` with a simple fallback ("Something went wrong — reload").
  - **Privacy (location is personal data):**
    - `sendDefaultPii: false`. Do not call `setUser`.
    - In `beforeSend` and `beforeBreadcrumb`, remove `latitude`/`longitude` query values from URLs (the Open-Meteo and geocoding requests carry them) and drop the manual-location `localStorage` values. Put the scrub logic in a pure function with a test.
  - **Feedback:** add `Sentry.feedbackIntegration` with `showName: false`, `showEmail: false`, `isNameRequired: false`, `isEmailRequired: false`. Open it from a "Send feedback" entry in the InfoPanel, not a floating button (`autoInject: false`), so it doesn't cover the scene.
  - **Source maps:** upload with `@sentry/vite-plugin` only when `SENTRY_AUTH_TOKEN` is set (CI). Keep the token out of git.
  - Set `release` from the package version and `environment` from `import.meta.env.MODE`.
  - Document `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` in the README.
  - Item 16: list Sentry in the privacy policy and the data-safety form ("crash logs, diagnostics", not linked to identity).
- **Sentry project:** org `ainabler`, project `sun-chaser`, on sentry.io (SaaS). The project's region is still to be confirmed.
- **Built (2026-09-28), differences from the spec:**
  - Sentry v11 has no `sendDefaultPii`. `dataCollection` is used instead (no user info, cookies, headers or bodies; location query params denied).
  - Sentry does not read `localStorage`, so there was nothing to drop for the manual location.
  - `release` is not set by hand. The Vite plugin sets it (git SHA) when it uploads the source maps.
  - The screenshot option in the feedback form is off, because a screenshot would show the location.
- **Release to-dos:** set `VITE_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` in the deploy/CI environment, and add Sentry to the privacy policy (item 16).
- **Setup note:** do not use `npx @sentry/wizard -i reactRouter`. It is for React Router v7 *framework mode*, and this app uses the router as a plain library in a Vite SPA. Add `@sentry/react` by hand as specified above. For the source-map upload only, use `npx @sentry/wizard@latest -i sourcemaps --saas --org ainabler --project sun-chaser`.
- **Done when:**
  - A thrown test error shows up in Sentry with readable stack frames and no coordinates in the event.
  - A feedback message sent from the InfoPanel shows up in Sentry with no name or email.
  - With no DSN set, the app makes no request to Sentry.

### Sentry feedback (2026-09-28)

Eight feedback reports from production (Ravensburg, releases `afb9e52` and `f490f32`) and one test error, analyzed on `main` at `f490f32` with code reading and a 390×844 browser check at 47.78° N, 9.61° E. Items 22–30 map one-to-one to Sentry issues (29 and 30 added in a second check at 21:45). Put `Fixes SUN-CHASER-n` in each commit, so Sentry closes the issue on merge.

**Dependency:** item 15 (redesign) is in progress in worktrees and changes `InfoPanel.tsx`, `FullscreenButton.tsx`, `CompassToggle.tsx`, `SunVisualization.tsx` and `sunUtils.ts`. Merge item 15 first, or build these items on top of it, to prevent conflicts.

### 22. Top-left buttons stay together in fullscreen — S — **✅ Done** — [SUN-CHASER-2](https://ainabler.sentry.io/issues/SUN-CHASER-2)

- **Feedback:** "Compass icon under the full screen not next to it."
- **Cause (confirmed in the browser):** the two buttons use different visibility rules in fullscreen.
  - `FullscreenButton` has its own `isVisible` state. It shows only on hover, focus or touch on the button itself.
  - `CompassToggle` uses the shared idle state `showCursor` from `SunTracker`.
  - Result: after a tap or mouse move, the compass shows (opacity 1) and the fullscreen button stays hidden (opacity 0). The compass then looks out of place.
  - The positions (`left: 1rem` and `left: 4rem`, both `top: 1rem`) are the same in fullscreen and normal mode. If the real phone also shows a different position, get a screenshot.
- **Spec:**
  - Put both buttons in one `fixed` flex row in `SunTracker` (with `gap-2` and the safe-area insets), so they cannot move apart.
  - Use one visibility rule for the row: visible when not in fullscreen, or `showCursor` is true, or a button in the row has focus. Remove the separate hover state from `FullscreenButton`.
- **Done when:** in fullscreen, a tap or mouse move shows both buttons side by side, and both fade out together after the idle timeout.

### 23. Feedback available in fullscreen — S — **✅ Done** — [SUN-CHASER-5](https://ainabler.sentry.io/issues/SUN-CHASER-5)

- **Feedback:** "Feedback not available in full screen."
- **Cause:** the only way to send feedback is the "Send feedback" link at the bottom of the InfoPanel. In fullscreen the panel fades out after 10 s (`InfoPanel.tsx`, `setIsVisible(false)`). A tap on the scene brings back the top-left buttons (`showCursor`), but not the panel. On a phone, the user sees no way to send feedback. The Sentry form itself works in fullscreen (checked: it attaches to `body`, and the fullscreen element is `<html>`).
- **Spec:**
  - Add a feedback button (lucide `MessageSquare`, `aria-label="Send feedback"`) to the top-left button row from item 22. It uses the same visibility rule. Show it only when `getFeedback()` returns an integration, the same condition as the panel link.
  - Keep the panel link.
  - Move the open logic (`createForm`, `appendToDom`, `open`) into one small helper, used by the button and the link.
- **Done when:** in fullscreen on a phone, a tap on the scene shows the feedback button, and the button opens the form.

### 24. Golden and blue hour: below the sun and moon times, collapsed by default — S — **✅ Done** — [SUN-CHASER-3](https://ainabler.sentry.io/issues/SUN-CHASER-3)

- **Feedback:** "Golden & blue hour needs to go below sun and moon times and be collapsed on default."
- **Current order in the panel:** Weather → Weather mode → Time (sunrise, sunset, sunset score) → Line of Sight → **Golden & Blue Hour** → Moon Information (moonrise, moonset) → Twilight → Sun Position → Send feedback.
- **Spec:**
  - Move the Golden & Blue Hour section to after Moon Information, before Twilight.
  - Make it collapsible, like Moon Information: a chevron button with `aria-expanded`, and state in `isGoldenBlueCollapsed`, `true` by default.
  - Keep the heading text with the part of the day (for example "Golden & Blue Hour · this evening") visible when collapsed.
  - Do not add it to the time-of-day auto-collapse effect. It stays collapsed until the user opens it.
- **Done when:** a test shows the section after the moon section, collapsed at start, and expanded after one click.

### 25. Hide the coordinates and the weather update time — S — **✅ Done** — [SUN-CHASER-4](https://ainabler.sentry.io/issues/SUN-CHASER-4)

- **Feedback:** "No need for location coordinates - please hide them and as well as weather update time."
- **Where:** coordinates in the panel header (`InfoPanel.tsx`, `location.latitude.toFixed(4)`); "Updated: HH:mm" in Current Weather.
- **Spec:**
  - Show the coordinates only when there is no place name (reverse geocode failed or is still loading), so the user still sees which location is used.
  - Remove the "Updated: HH:mm" line. Keep the "Real weather unavailable" warning and the refresh button.
  - Keep the coordinates in the "Change location" form fields.
- **Done when:** with a place name, the header shows the name and no coordinates, and Current Weather has no update time. Without a place name, the coordinates show.

### 26. Sun and moon arcs reach the horizon — S — **✅ Done** — [SUN-CHASER-6](https://ainabler.sentry.io/issues/SUN-CHASER-6)

- **Feedback:** "Arc not going to the horizon."
- **Cause (confirmed in the browser):** two gaps in `getSunPathAround` / `getMoonPathAround` and `buildArcPath`.
  1. **Coarse steps.** The path has 48 steps over 24 h (one sample every 30 min). `buildArcPath` drops every point below 0°, so the arc ends at the last sample above the horizon, up to 30 min before rise or set. At 47.8° N that is up to about 5° of altitude, a visible gap above the horizon.
  2. **Fixed ±12 h window.** A pass longer than the rest of the window is cut. Example: at 21:40 the moon arc ends at about 9° altitude (the window end, 09:40), not at moonset. In summer the sun's pass (up to 16 h) is cut the same way in the early morning.
- **Spec:**
  - `buildArcPath`: where two neighbor samples are on different sides of 0°, add the point at 0° by linear interpolation of altitude and azimuth (use the shortest azimuth delta across 0°/360°). Draw from there, so each arc starts and ends on the flat horizon line.
  - Sample the current pass, not a fixed window: from the last rise before `date` to the next set after `date`. Search at most ±24 h, so polar day and polar night still end. If the body is below the horizon, sample the next pass. Keep the center-sample test from item 17 true for the sun dot, or replace it with a test that the dot lies on the path.
  - With a terrain profile loaded, the silhouette is drawn over the arc, so the arc looks like it goes behind the terrain. No extra work.
- **Done when:**
  - Unit tests: the first and last points of an arc have altitude 0 (±0.1°), and a moon pass that runs past `date + 12 h` is complete.
  - At 390×844, by day and by night, both arcs touch the flat horizon line (or go behind the terrain).

### 27. Sea visible at the horizon — S — **✅ Done** — [SUN-CHASER-7](https://ainabler.sentry.io/issues/SUN-CHASER-7)

- **Feedback:** "Sea is missing at the horizon." (sent at 21:27, night, with the terrain profile on)
- **Cause (seen in the browser):**
  - The terrain silhouette (item 13) is filled from its ridge down to the flat horizon y and drawn **after** the sea. It covers the sea's wave crests (up to 12 px above the horizon line), so where there is terrain the sea has no visible edge.
  - At night the sea color (`getHorizonColor`, `#0F0E11`, reflection opacity 0.1) is almost the same as the terrain fill (`--brand-night`) and the night sky. The sea is not visible at all. By day the sea shows, but the terrain edge replaces the wave line.
- **Open question:** "sea" can mean the water band below the horizon (the fish area) or the wave line at the horizon. The spec covers both. Confirm before building.
- **Spec:**
  - Draw the sea after the terrain, so the wave line always sits on top of the terrain base.
  - Give the sea a visible night color that differs from `--brand-night` and the night sky, for example a dark blue scene token, plus a thin lighter line on the wave crest. Take the colors from the item 15 scene tokens when they are merged, not new hex values.
  - Keep the terrain silhouette above the horizon line unchanged.
  - Check first after item 15 merges: `feat/redesign` adds water and ridge colour tokens and a water reflection, which can fix part of this.
- **Done when:** at 390×844, at night and by day, with and without terrain, the sea and its wave line are visible below the horizon.

### 28. Sentry scrub: filter location values anywhere in a string — S — **✅ Done** — [SUN-CHASER-1](https://ainabler.sentry.io/issues/SUN-CHASER-1)

- **Finding:** the setup test error "Sentry test from sun-chaser setup (latitude=47.65&longitude=[Filtered]" shows the latitude. `LOCATION_PARAM` in `src/utils/sentryScrub.ts` only matches a key after `?` or `&`. Real request URLs always have one of these, so the risk is low, but a key at the start of a string or after `(` or a space is not filtered.
- **Spec:**
  - Match the key after any non-word character or at the string start: `\b(?:latitude|longitude|lat|lon|name)=`. Filtering too much is acceptable, filtering too little is not.
  - Add the test string above to `tests/utils.sentryScrub.test.ts`.
  - Resolve SUN-CHASER-1 in Sentry after the merge (it is a test event from `localhost`).
- **Done when:** the test shows `latitude=[Filtered]&longitude=[Filtered]` for the test string, and the existing tests still pass.

### 29. Direction labels fade out in fullscreen — S — **✅ Done** — [SUN-CHASER-9](https://ainabler.sentry.io/issues/SUN-CHASER-9)

- **Feedback:** "Direction labels should also fade out in full screen."
- **Cause:** the cardinal labels (item 8) in `SunVisualization.tsx` are always drawn. `SunVisualization` gets neither `isFullscreen` nor the idle state `showCursor` from `SunTracker`, so the labels cannot fade with the buttons.
- **Spec:**
  - Pass `isFullscreen` and `showCursor` from `SunTracker` to `SunVisualization`.
  - In fullscreen, when idle, fade the label container (`data-testid="cardinal-labels"`) to `opacity-0` with the same `transition-opacity duration-300` as the buttons (item 22). A tap or mouse move shows the labels again.
  - Keep the labels visible in compass mode, where they are needed to aim the phone.
- **Done when:** in fullscreen, the labels fade out together with the buttons and come back on a tap. A test covers the visible and hidden states.

### 30. Line of Sight as an icon at the sun and moon times — S — **✅ Done** — [SUN-CHASER-8](https://ainabler.sentry.io/issues/SUN-CHASER-8)

- **Feedback:** "Line of sight should be a separate icon that adds that info panel when clicked on at the moon or at the sun times."
- **Now:** Line of Sight is its own panel section (between the sun times and Golden & Blue Hour) with four rows: terrain sunrise, sunset, moonrise and moonset. At 390 px the values ("behind terrain 07:44 (+27 min)") are wider than the value column, wrap and move the labels out of line (seen in the browser).
- **Spec:**
  - Remove the separate Line of Sight section.
  - Add a small icon button (lucide `Mountain`, `aria-label="Show line of sight"`, `aria-expanded`) next to the sunrise/sunset rows and next to the moonrise/moonset rows. Show it only when `terrainStatus` is not `idle`.
  - A click opens the Line of Sight details below those rows: for the sun, the terrain sunrise and sunset; for the moon, the terrain moonrise and moonset. Show "Loading terrain…" and "Terrain unavailable" there, as the section does now.
  - Show the eye-height input and the terrain attribution inside the opened details (once per opened block).
  - Keep the values short, for example "07:44 (+27 min)", with "behind terrain" once as a note, so each row fits on one line at 360 px.
  - Closed by default. The sun and moon details open and close separately.
- **Done when:** a test shows no Line of Sight section at start, and a click on the sun icon shows the terrain sunrise and sunset. At 360 px width each row fits on one line.

### Field feedback, round 2 (2026-09-28)

Five findings from use after items 22–30, checked on `main` at `046abff` with a 390×844 and 1280×800 browser check at 47.78° N, 9.61° E.

### 31. Top-left buttons in a vertical column, and a working fade in fullscreen — S — **✅ Done**

- **Feedback:** "The three icons for full-screen, compass and feedback need to be vertical not horizontal and should fade out when in full-screen."
- **Cause (confirmed in the browser):** the row's `focus-within:opacity-100` also matches after a mouse click or tap. The clicked fullscreen button keeps focus, so the row never faded out in fullscreen.
- **Fix:**
  - `TopLeftButtons` is a `flex-col` column.
  - Keyboard focus only brings the column back: `has-[:focus-visible]:opacity-100` replaces `focus-within:opacity-100`.
  - The column (3.5rem wide) fits beside the 300 px panel from 364 px width. The panel offset under the buttons now applies only below 364 px (10rem instead of 4rem), not below 480 px.
- **Checked:** after a click on "Enter fullscreen" the button has focus, and the column goes to opacity 0 after the 10 s idle timeout. Tab shows it again.

### 32. Sea without an outline — S — **✅ Done**

- **Feedback:** "Remove the outline of the sea."
- **Fix:** removed the item-27 wave-crest stroke (`getWaveCrestColor`) from the sea path. The dark-navy night sea (item 27 follow-up) already reads apart from the ridge and the sky.

### 33. Golden & Blue Hour: no tag line in the heading — S — **✅ Done**

- **Feedback:** "Golden & blue hours needs no additional tag line in the heading, the line break does not look good. Move it into the collapsed space."
- **Fix:** the heading is only "Golden & Blue Hour". "This evening" / "Tomorrow morning" is the first line of the collapsible body.

### 34. Line-of-sight icon with a premium feel — S — **✅ Done**

- **Feedback:** "The terrain logo needs a more premium feel, add a little gold plus to it to make it pop out."
- **Fix:** the `Mountain` buttons get the gold plus of item 35 at the top-right corner.

### 35. Premium features marked with a gold plus, still free — S — **✅ Done**

- **Feedback:** "Change location, manual weather, the scores, line of sight and compass should all be premium features and get a little golden plus icon, but are free as of now."
- **Fix:**
  - New `PremiumBadge` component: a small gold-gradient circle with a dark plus and a soft gold glow. New tokens `--brand-gold` and `--brand-gold-light`.
  - Badge on: "Change location", the "Manual" weather toggle, "Sunset score", both line-of-sight buttons and the compass button.
  - Decorative only (`aria-hidden`, tooltip "Premium feature, free for now"). No feature is gated. `PREMIUM_ENFORCED` stays `false`; item 14 gates this list later.

### 36. Bats and boats: line icons and a mixed fleet — S — **✅ Done**

- **Feedback:** "The bat emojis seem weird on macOS, and I like the style of the ship, but it still could use a little diversity."
- **Lookbook:** [Bats & Boats](https://claude.ai/artifact/PQH9vEKvGh49GNAd82yXFd) (private). Picks: N2, R1, S2, S3, S4, S5, S6, V2, V3, V4, L1.
- **Fix** (all motion stays a slow, straight glide):
  - **N2 Line bat:** the 🦇 emoji is replaced by a `Bat` line icon (`src/components/sceneIcons.ts`, lucide's 24 px grid) in the night-ship tone.
  - **R1 Bats at twilight only:** bats fly in nautical and astronomical twilight. Full night (`'night'`) has no flyers. Item 40 adds civil twilight, so bats fly right after sunset.
  - **S2–S6 Fleet:** lucide `Sailboat` plus new `LakeFerry`, `FishingBoat`, `Rowboat` and `Freighter` icons. The old `Ship` (S1) is out. Mix: sailboat 35, ferry 15, fishing boat 15, rowboat 10, freighter 5 (`pickBoat` in `weatherEffectsUtils`).
  - **V2 Distance:** each boat gets a random distance. The farthest boat sits on the horizon at 55 % of the size, opacity and speed.
  - **V3 Lights:** once the sun is below the horizon (civil twilight to night), each boat shows small gold lights (`--brand-gold-light`).
  - **V4 Weather-aware mix:** rain, drizzle, fog and snow leave only the ferry and the freighter. Wind above 40 km/h keeps the rowboat ashore. Storm and hail still have no boats.
  - **L1 Line leaf:** the 🍃 emoji is replaced by lucide `Leaf` in the boat tone.
  - Not picked: V1 (both directions). Boats still sail from left to right.
- **Checked:** in the browser at 20:05 in Ravensburg (nautical twilight), the line bats flew, a ferry and a sailboat sailed with gold lights, and a far freighter sat on the horizon. No emoji was rendered.
- **Follow-up (field feedback, 2026-09-28 night):** "I don't see any of the new ships with lights." The first boat came only 2 min after load (then one every 2–4 min). It now sails out about 5–15 s after load (`FIRST_BOAT_HEAD_START_MS` in `CloudLayer.tsx`). Checked in real time in Ravensburg at night: first boat after 7–14 s in 5 of 6 reloads, with its lights on (the 6th hit the 10 % skip roll).
  - Then: "there can also be more than one boat" and "boats can be lower on the screen, closer to the front edge". A new boat now comes every 30–90 s (was 2–4 min); a crossing takes 46–84 s, so often 1–2 boats (now and then 3) are out at once. Far boats are drawn first, so a near boat sails in front. The waterline now spans 67 % (far, at the horizon) to 87 % (near, just above the music player; was 77 %). Checked in real time at 390×844: first boat after about 10 s, two boats at once twice in 100 s.
  - Then, on going lower than the music player: "only in full screen". In fullscreen, where the chrome fades away, near boats sail down to 94 % (`isFullscreen` from `SunVisualization` into `CloudLayer`). A boat keeps its waterline for its whole crossing; only new boats use the new range. Checked at 390×844 in fullscreen: a near sailboat at y 791 of 844.

### Verification findings (2026-09-28)

Items 37 and 38 were found in the browser check of the verification above (on `a9882c4`, before items 31–36). Item 39 is the new loading screen, requested in the same check.

### 37. Sun arc drops out at night every other minute — S — AUDIT C-14 — **✅ Done**

- **Found:** Ravensburg, 22:30, 390×844. After a reload the sun arc has its zenith label (13:13). One minute later the label is gone.
- **Cause:** `findSunPass` (`sunUtils.ts`) and `findMoonPass` (`moonUtils.ts`) have the same bug. When the body is below the horizon, the set search starts at the bisected rise time. That time is only within ±5 s of the crossing. When it lands just below 0°, the search finds the same rise again and returns a pass of zero length (for example 05:22–05:22 UTC). `getSunPathAround` then returns 49 identical points (no arc), and `getSunArcLabels` finds no zenith. The result changes from minute to minute.
- **Spec:**
  - In both functions, start the set search after the rise crossing (for example at `startMs + HORIZON_BISECT_TOLERANCE_MS`).
  - Add a test: for each minute of one night, the sun pass is longer than 6 h and the arc labels have a zenith.
- **Done when:** the test passes, and at night the sun arc and its zenith label stay on screen across minute changes.

### 38. Moon zenith label under the collapsed panel — S — AUDIT C-15 — **✅ Done**

- **Found:** Ravensburg, 390×844. When the moon culminates high, its zenith label falls under the collapsed panel. Rechecked after item 31 (panel at the top from 364 px, `main` at `499ce9e`): the collapsed panel covers y 0–112 px at x ≥ 90 px, and the moon zenith label is at y 78–100 px on 30 Sep, 21:30, and at y 72–94 px on 1 Oct, 22:00. The sun label was moved below the apex for this reason, but a high moon apex still falls under the panel.
- **Spec:** move an arc label that overlaps the collapsed panel's box below the panel's bottom edge, or place it beside the apex. Do not hide it.
- **Done when:** at 390×844, day and night, the collapsed panel covers no arc label.

### 39. Loading screen: Rising Mark (variant A) — S — AUDIT A-6, A-7, C-16 — **✅ Done**

- **Why:** the loading screen always shows a daytime sky, but the Android splash before it is Night (`#0F1016`). A start at night goes dark, then bright blue, then dark again. The top-left buttons and the radio show before there is a scene. When the location prompt stays open, "Locating…" never ends, and there is no way to choose a place. The spinner has no brand.
- **Decision (2026-09-28):** variant **A, Rising Mark**. Design: <https://claude.ai/artifact/YbVzMgv8ncwoh7TEah1Dfk> (private artifact, variants A–D; open it with `#locating`, `#waiting` or `#found-night` to see one state).
- **Spec:**
  - Add `src/components/LoadingScreen.tsx`. `SunTracker` shows it while `location.loaded` is false, in place of the spinner branch.
  - **Layout:** background `--brand-night` (`#0F1016`, the same as the manifest `background_color`). The app mark from `public/logo-mark.svg` (inline SVG, 136 px) centred at about 36 % of the height. Below it the "Sun Chaser" wordmark (reuse the outlined paths from `store/wordmark-sun-chaser.svg`, so no web font loads) in `--brand-peach`, then the caption "Locating…" (body size).
  - **Motion:** the mark's sun, with its stripes, rises once from below the water line to its logo position: 2.6 s, ease-out. The two reflection bars on the water fade in after 1.3 s. No loop.
  - **Hand-off:** when the location arrives, the scene shows through a circle that grows from the mark (`clip-path: circle()` from 68 px to the full screen, 1 s). If the location arrives before the rise ends, start the circle at once. Do not add a wait.
  - **Controls:** show the top-left buttons and the radio only after the hand-off, with a 0.5 s fade-in.
  - **Prompt left open:** after 3 s with no location, the sun stops half-risen, the caption changes to "Waiting for location access", and a "Choose a place" button (glass pill, search icon) opens the place search of the manual-location form.
  - **Timeout:** call `getCurrentPosition` with `{ timeout: 10000 }`. On a timeout, use the default location with the existing "Location unavailable" toast.
  - **Fast start:** with a saved manual location, or a location in less than 400 ms, skip the rise and fade the scene in (200 ms).
  - **Reduced motion:** with `usePrefersReducedMotion`, no rise and no circle. A 200 ms fade only.
  - Colours from the tokens only (item 15). No new hex values.
- **Done when:**
  - Tests show: the loading screen renders while the location is not loaded; the top-left buttons and the radio are not rendered then; after 3 s the "Choose a place" button shows and opens the place search; a timeout gives the default location and the toast; with reduced motion no rise or circle animation is applied.
  - At 390×844, a start at night shows no blue frame between the Android splash and the scene.
- **Built:**
  - "Choose a place" shows the place search on the loading screen. The search moved from InfoPanel's form into `PlaceSearch.tsx`, which both use. The chosen place starts the hand-off, and a late geolocation answer or timeout does not replace it.
  - The rise starts after 0.4 s, so a location that arrives sooner never shows it. The rise then ends at 3 s: at that point the sun sinks to half-risen (1 s) and the reflection bars fade out.
  - Two tokens for the mark colours that had none: `--brand-mark-dusk` and `--brand-mark-sun`.
  - The `body` background is Night, so the first paint before the app mounts also continues the splash.
  - The 200 ms fade stays 200 ms under reduced motion (the global rule in `index.css` cuts all other animations to 0).
  - Browsers start the 10 s geolocation timeout only after permission is granted. An open prompt is covered by "Choose a place".
- **Checked:** headless Chromium at 390×844, Ravensburg at 22:30, dev server and production build. The first paint (JavaScript off) is Night. The sun rises, the circle opens when the location arrives after 2 s, and the buttons and the radio fade in after it. With no location, "Waiting for location access" and "Choose a place" show at 3 s, and the place search opens with focus. With reduced motion the mark stands still and the scene fades in.

### Sentry feedback, round 3 (2026-09-29)

Seven feedback reports from production (Ravensburg, release `6da35c1`, 29 Sep 16:57–17:09), analyzed on `main` at `6da35c1` by reading the code. Items 40–45 map to SUN-CHASER-A to F. Put `Fixes SUN-CHASER-n` in each commit, so Sentry closes the issue on merge. SUN-CHASER-G ("After sunset birds are still flying when will the bats occur?") was archived as working as designed, but on 2026-09-30 the request came to fly bats right after sunset: done in item 40.

**Order:** build 41 → 42 → 43 → 44 (40 is done). Item 43 uses the sunset time from item 41. Item 44 turns off items 41 and 43 while it shows another time. Item 45 is a decision for items 14 and 16.

### 40. Boats slower, each type at its own speed; smaller fish; bats from sunset — S — [SUN-CHASER-A](https://ainabler.sentry.io/issues/SUN-CHASER-A), [SUN-CHASER-G](https://ainabler.sentry.io/issues/SUN-CHASER-G) — **✅ Done**

- **Feedback:** "Boats slower, fish smaller." Then (2026-09-30): "bats should fly directly after sunset please, boats should have different speeds depending on the type of boat - check the sizes and speeds after implementing." The second request reverses the archive of SUN-CHASER-G.
- **Before (`CloudLayer.tsx`):**
  - Boats and fish had one speed, `WATER_RATE_PERCENT_PER_SEC = 2.5` (% of the width per second, about 10 px/s at 390 px). A near boat crossed in 46 s, the farthest boat in 84 s.
  - A fish was lucide `Fish` at 36 px in a `scale(1.2)` wrapper, so about 43 px: as large as a near rowboat (47 px).
  - Bats flew in nautical and astronomical twilight only (item 36, R1). In civil twilight, right after sunset, birds still flew.
- **Built:**
  - **Speed per type:** `speed` in `BOATS` is a near boat's rate in % of the width per second. Far boats keep 55 % of it (`FAR_SHRINK`). Fish keep 2.5 %/s (`FISH_RATE_PERCENT_PER_SEC`).

    | Type | Speed (%/s) | Near, 390 px | Crossing near / far |
    |---|---|---|---|
    | Ferry | 1.8 | 7.0 px/s | 64 s / 117 s |
    | Fishing boat | 1.5 | 5.9 px/s | 77 s / 141 s |
    | Freighter | 1.3 | 5.1 px/s | 89 s / 162 s |
    | Sailboat | 1.2 | 4.7 px/s | 97 s / 176 s |
    | Rowboat | 0.9 | 3.5 px/s | 129 s / 234 s |

  - **Sizes (near, checked in a lineup):** rowboat 47 px, sailboat 64 px, fishing boat 64 px, ferry 81 px (scale 1.1 → 1.2), freighter 101 px (1.25 → 1.5). Before, the freighter was hardly larger than the ferry. Fish: 20 px, no wrapper.
  - **Count:** a new boat at least every 55 s (was 30 s), and at most 3 boats at once (`MAX_BOATS`). So about 1–2 boats are out on average, as before. The random part of the gap is re-rolled on every 500 ms check, so most gaps end within about 10 s of the minimum. The earlier comment "every 30–90 s" was wrong for this reason.
  - **Bats from sunset:** bats fly whenever the sun is below the horizon in twilight: civil, nautical and astronomical, in the evening and in the morning. Full night still has no flyers. Bats and boat lights share one flag, `isSunDown`.
- **Checked:** headless Chromium, 390×844, Ravensburg, clear weather. For 70 spawns, each boat's measured speed and crossing time match the table. The lineup at near size shows rowboat < sailboat ≈ fishing boat < ferry < freighter, with the fish clearly the smallest. At 19:15 (civil twilight, 12 min after sunset) bats fly and the boats show their lights.
- **Tests:** bats in civil twilight, a speed per type (sailboat against ferry), no fourth boat, a 20 px fish.

### 41. Fireworks: a 10 s show at the visible sunrise and sunset — S — [SUN-CHASER-D](https://ainabler.sentry.io/issues/SUN-CHASER-D) — **✅ Done**

- **Feedback:** "Redo firework animation not really visible and too short - should go at least 10s."
- **Cause (`Fireworks.tsx`, from the code):**
  - The spark speed is in % of the screen **per frame**: 4–9 % per frame, so 240–540 % per second at 60 Hz. A spark leaves the screen after about 0.2–0.4 s, although its `life` is 400–600 frames (7–10 s). The 8 bursts all start within 2.1 s, so the show is visible for about 2.5 s.
  - The motion depends on the frame rate. On a 120 Hz phone it is twice as fast.
  - The yellow and red sparks (`#feca57`, `#ff6b6b`) have little contrast against a sunset sky.
  - **Trigger:** `SunVisualization` starts the show when the sun's altitude changes sign between two 30 s samples. This is up to 30 s late, and it uses the flat horizon, not the terrain (item 13).
  - Each spark is a `div` with three `box-shadow`s, updated with `setState` in every frame (AUDIT P-4). This is acceptable for 2 s, but not for a longer show.
  - **Most bursts never start** (scene review R1, 2026-09-30): `SunVisualization` sets the trigger back to `false` after 100 ms. The effect's cleanup (`Fireworks.tsx:102`) then clears the staggered timeouts, so only the first of the 8 bursts runs. The new show must not depend on how long the trigger stays `true`.
- **Spec:**
  - **Show:** about 14 bursts over 10 s, one every 0.6–0.9 s, and a larger last burst at about 9 s. Each burst starts as a rocket: a thin trail rises slowly from the water line for about 1 s, then bursts. The sparks fade out over 2.5–3.5 s, so the show ends after 12–13 s. Keep it slow and calm: sparks drift and fall slowly, with no flashing.
  - **Physics per second, not per frame:** use the frame time (`dt`). Burst speed 60–140 px/s, gravity about 30 px/s², light drag. Use px, so the bursts are round (the % units make them oval on a portrait phone).
  - **Visible:** sparks of 2–3 px with a short fading trail, drawn with `globalCompositeOperation = 'lighter'`. Use colours that stand out on a sunset sky: a white-gold core with cyan, magenta, violet and green. No yellow or orange.
  - **Drawing:** one `<canvas>`, sized to the container and to `devicePixelRatio`. Keep the particles in a `useRef` and the rAF id in a `useRef` (CLAUDE.md). No React state per frame. This closes AUDIT P-4 for the fireworks; remove the `ponytail:` note.
  - **Trigger:** add a pure `getNextSunEvent(now, flatTimes, terrainTimes)` in `src/utils/sunEvents.ts`, with tests. It returns the next sunrise or sunset: the line-of-sight time when the terrain profile is ready and has one, else the flat time. `SunTracker` starts the show when the 1 s clock passes that time, and passes the trigger to `SunVisualization`. It does not start when the clock step was longer than 5 s (a wake from sleep, or a time jump in item 44). Remove the altitude-sign effect in `SunVisualization`, but keep `crossesHorizon`, because the arc path uses it too.
  - **Reduced motion:** no fireworks, as now.
- **Done when:**
  - Unit tests: the show plan spans at least 10 s. `getNextSunEvent` gives the terrain time when there is one, else the flat time. A clock step longer than 5 s does not start the show.
  - In the browser (390×844, fixed clock 15 s before sunset): the show starts at sunset, runs for at least 10 s, and the bursts are clearly visible against the sunset sky.
- **Built:**
  - `Fireworks.tsx` draws the show on one `<canvas>` (sized to `devicePixelRatio`). The sparks and the rAF id are in `useRef`s. The physics uses the frame time in px/s. `planShow` gives 13 bursts 0.62 s apart and a larger last burst at 9.1 s. Each burst starts as a rocket that rises from the water line for 1 s.
  - The trigger is the start time of the show, not a boolean. Only a new show or unmount stops the loop, so all bursts run.
  - `getNextSunEvent` and `passesSunEvent` in `src/utils/sunEvents.ts` select the terrain time when there is one, else the flat time. `SunTracker` starts the show when the 1 s clock passes that time, but not after a clock step longer than 5 s. The altitude-sign effect in `SunVisualization` is removed.
  - Browser check (Ravensburg, 2026-09-30, 390×844): with the terrain profile, the show starts at 18:57:14 (terrain sunset) and ends at 18:57:27. Without the profile, it starts at 19:05:50 (flat sunset 19:05:49) and ends at 19:06:03. The sparks are clearly visible on the orange sky.

### 42. Line-of-sight sunrise and sunset on the sun arc — S — [SUN-CHASER-C](https://ainabler.sentry.io/issues/SUN-CHASER-C) — **✅ Done**

- **Feedback:** "For premium show sunrise and sunset line of sight times on the arc."
- **Now:** the sun arc has three labels: rise, zenith and set (from `getSunArcLabels`). Rise and set sit on the flat horizon line and show the flat SunCalc times. The line-of-sight times (`getTerrainSunTimes`, computed in `SunTracker` as `terrainExtras.terrainSunTimes`) show only in the panel, behind the `Mountain` button (item 30).
- **Spec:**
  - Pass `terrainSunTimes` from `SunTracker` to `SunVisualization`. Do not compute them a second time.
  - Add a pure `getTerrainArcLabels(terrainSunTimes, latitude, longitude)` in `arcLabels.ts`. For each time that is not null, it returns the sun's azimuth and altitude at that time (`getSunPosition`). This is the point where the arc meets the terrain silhouette.
  - Draw a label just above that point: the arc-label pill in the sun colour, with a 10 px `Mountain` icon, the time, and the gold plus from item 35 at the corner. Test ids: `arc-label-sun-terrain-rise` and `arc-label-sun-terrain-set`.
  - Keep the flat rise and set labels. When a terrain label overlaps the flat label of the same kind, or shows the same minute (for example on a flat coast), show only the terrain label.
  - Show the terrain labels only when `isLineOfSightEnabled()` is true and the profile is ready. Show no label when the sun does not clear the terrain that day (a null time, for example Viganella in winter).
  - Apply the rules of the other arc labels: hide a label outside the compass field of view, fade it in fullscreen (item 29), and move it below the collapsed panel (item 38).
  - The moon arc is not part of this item. The feedback asks only for the sun.
- **Done when:**
  - Unit test with a synthetic profile (a 5° ridge in the west): the set label has the `getTerrainSunTimes` sunset time and an altitude of 5° ± 0.5°.
  - Component tests: the terrain labels render with a profile and terrain times, and do not render without them. When the minute is the same, only the terrain label renders.
  - In the browser at Innsbruck (sunset about 31 min early, item 13), 390×844: the set label sits on the arc where the arc meets the ridge. At 360 px no labels overlap.
- **Built:** `SunTracker` passes `terrainExtras.terrainSunTimes` to `SunVisualization`. `getTerrainArcLabels` (`arcLabels.ts`) returns the sun position at each terrain time. `getArcLabelGeometry` has a new `onHorizon` flag, so the terrain pills sit 22 px above their true altitude, on the ridge. A flat rise/set pill that overlaps the terrain pill of the same kind, or shows the same minute, is dropped. The moon collision check includes the terrain pills. Innsbruck, 2026-09-30 17:30: terrain set 18:29, flat set 18:58, terrain rise 07:44, flat rise 07:12; no pill boxes overlap at 390×844 and 360×800.

### 43. Sunset countdown: 10 s of sound — S — [SUN-CHASER-B](https://ainabler.sentry.io/issues/SUN-CHASER-B) — **✅ Done**

- **Feedback:** "10s acoustics count down for sunset, premium version to sunset line of sight times."
- **Depends on:** item 41 (`getNextSunEvent`).
- **Now:** the only sound is the radio (`MusicPlayer`, an `<audio>` element). There is no countdown.
- **Spec:**
  - **Toggle:** a bell button (lucide `Bell` / `BellRing`, `aria-label="Sunset countdown"`, `aria-pressed`) in the panel's Sunset row. Off by default. Save the choice in `localStorage` (`sunset-countdown`). The tap that turns it on creates or resumes an `AudioContext` (browsers allow sound only after a user gesture) and plays one soft tone as a check.
  - **Target:** the next sunset from `getNextSunEvent`. Free version: the flat sunset. Premium (gold plus): the line-of-sight sunset, when the terrain profile is ready. While `PREMIUM_ENFORCED` is false, all users get the line-of-sight target.
  - **Sound (Web Audio, no audio files):** from T−10 s to T−1 s, one soft tick per second (a sine at about 660 Hz, 80 ms, low volume, short fade in and out). At T0, a soft two-note chime (about 660 Hz and 990 Hz, 1.2 s fade). When the 1 s clock reaches T−11 s, schedule all 11 tones at once on the `AudioContext` clock, so the ticks are exact.
  - **Visual:** during the 10 s, the sun-altitude pill shows "Sunset in 7 s". It shows the `Mountain` icon and the gold plus when the target is the line-of-sight sunset. At T0 the fireworks from item 41 start.
  - **Only when someone watches:** no countdown when the page is hidden at T−11 s, or during a preview (item 44). In fullscreen, the wake lock (`useWakeLock`) keeps the screen on. A locked phone gets no countdown; the backlog item "Sunset reminder notification" covers that case.
  - The radio keeps playing. Lower its volume during the countdown only if the ticks get lost under it.
- **Done when:**
  - Unit test: the target is the terrain sunset when there is one and line of sight is enabled, else the flat sunset.
  - Component test (fake timers, mocked `AudioContext`): with the toggle on, 11 tones are scheduled at T−11 s, 1 s apart. With the toggle off, or with the page hidden, none are scheduled.
  - On a phone: the ticks are audible with the radio on and off, and the chime sounds at the target time ± 0.5 s.
- **Built:**
  - `getCountdownTarget` in `src/utils/sunEvents.ts` reuses `getNextSunEvent` with the sunsets only: the line-of-sight sunset when `isLineOfSightEnabled()` and the terrain profile has one, else the flat sunset.
  - `src/hooks/useSunsetCountdown.ts` holds the Web Audio code. `primeCountdownAudio` (the toggle tap) creates or resumes the one `AudioContext` and plays one tick. The hook schedules the 10 ticks (660 Hz, 80 ms) and the chime (one oscillator, 660 Hz then 990 Hz, 1.2 s fade) at once when the 1 s clock is 10 to 11.5 s before the target, and returns the seconds left. Toggle off, a preview or unmount stops the tones still to come.
  - `SunTracker` owns the toggle (`localStorage` `sunset-countdown`) and passes it to the bell button in the `InfoPanel` Sunset row, and the seconds to the `SunVisualization` altitude pill ("Sunset in 7 s", `Mountain` icon and gold plus for line of sight).
  - Browser check (Ravensburg, 2026-09-30, 390×844): the line-of-sight sunset is 18:57:14. With the bell on, 11 oscillators start 1 s apart (T0 10.8 s ahead on the audio clock), the pill shows "Sunset in 7 s" at 18:57:07, and the fireworks start at T0. The radio volume is not changed; the phone check (ticks audible over the radio, chime ± 0.5 s) is still open.

### 44. Time travel: set the time, play it forward and backward — M — [SUN-CHASER-F](https://ainabler.sentry.io/issues/SUN-CHASER-F) — **✅ Done**

- **Feedback:** "Another premium feature to set time or fast forward and backward in time." This item replaces the backlog item "Date/time scrubber".
- **Now (`SunTracker.tsx`):**
  - `date` is set to `new Date()` every second.
  - Sun and moon position, sun times, golden and blue hour, and time of day come from a separate 30 s interval with its own `new Date()`, and once from `date` when the location changes.
  - The arcs, pass times, arc labels and terrain times already follow `date` (keyed on the minute, hour or day).
  - The weather is the live current weather.
- **Spec:**
  - **One time source:** a `timeOffsetMs` state (0 = live). The clock tick sets `date = new Date(Date.now() + timeOffsetMs)`.
  - Derive sun and moon position, sun times, golden and blue hour, and time of day from `date`, with a memo keyed on the 30 s step and the location. This replaces the 30 s interval and the location-change block, so a time jump updates the scene at once. Live mode keeps its 30 s rhythm.
  - **Controls (Time section, "Current Time" row):**
    - `Rewind` (`aria-label="Play time backward"`) and `FastForward` (`aria-label="Play time forward"`). A tap plays time at 10 min per second (one day in about 2.4 min). A second tap pauses. During play, the clock ticks every 100 ms, so the motion is smooth.
    - A tap on the time opens a native `<input type="datetime-local">` (min and max: today ± 1 year) to jump to any date and time.
    - The gold plus from item 35 on the row. The feature stays free while `PREMIUM_ENFORCED` is false.
  - **Preview (offset not 0):** the row shows the date and time, for example "Oct 3, 18:42" (reuse `formatMoonDate` in `InfoPanel.tsx`). A "Back to now" glass pill at the bottom centre, above the radio, stays visible in fullscreen. It sets the offset to 0 and stops play.
  - **Stays live:** the weather and the sunset score (there is no weather for other times), and the spawns of birds, fish and boats. The countdown (item 43) and the fireworks (item 41) run only in live mode.
  - Not part of this item: weather from the Open-Meteo hourly forecast for the next 7 days.
- **Done when:**
  - Tests: an offset of +6 h gives `getSunPosition(now + 6 h)`. Play forward moves `date` by 10 min per second (fake timers). "Back to now" returns to live. A preview does not fetch the weather again. No countdown and no fireworks during a preview.
  - In the browser: play through a sunset. The sun moves along its arc, the sky colours change, and the panel times follow. One play tick takes less than 16 ms in the profiler.
- **Built:**
  - `SunTracker` has `timeOffsetMs` and `playDirection` state. The clock sets `date = Date.now() + offset`, every 1 s live and every 100 ms during play; during play each tick adds `(direction × 600 − 1) × elapsed` to the offset, so `date` moves exactly 10 min per second. One `useMemo` keyed on the 30 s step and the location derives sun and moon position, sun times, golden and blue hour and time of day from `date`; the 30 s interval and the location-change block are removed.
  - `isTimePreview` (`timeOffsetMs !== 0`) in `SunTracker` is the preview flag. It gates the fireworks, and item 43 (countdown, not built) can use the same flag. The weather fetch still uses its own `new Date()`, so a preview does not fetch again, and the sunset score and the spawns stay live.
  - `src/utils/timeTravel.ts`: `getTimeTravelRange` (start of today − 1 year to end of today + 1 year), `clampTimeOffset` (play stops at the range edge) and `toDateTimeLocalValue`.
  - InfoPanel row: Rewind, the time and FastForward (`aria-pressed` on the playing direction), plus the gold plus. A tap on the time shows a `datetime-local` input; blur closes it. In a preview the row reads "Time" and `formatMoonDate` ("Sep 30, 19:08"), because "Current Time" plus the date does not fit on one line at 390 px. The "Back to now" glass pill is fixed at the bottom centre, above the radio, and does not fade in fullscreen.
  - Browser check (Ravensburg, 2026-09-30 18:30, 1280×800 and 390×844): the play runs through the sunset (18:44 → 20:09); the sun sets along its arc, the sky goes from orange to civil and nautical twilight, and the sunrise/sunset rows follow the next pass. "Back to now" returns to the live clock. The jump to Dec 24 16:30 shows the winter arc (sunset 16:34). No weather request during the preview. With a real clock, play adds about 9 ms of main-thread work per 100 ms tick, with no frame gap above 16.8 ms and no long task.

### 45. Premium as a one-time purchase on Google Play: price and billing — S *(decision)* — **✅ Decided** — [SUN-CHASER-E](https://ainabler.sentry.io/issues/SUN-CHASER-E)

- **Feedback:** "Premium buy once in play store - what would be a good pricing start point?"
- **Conflict:** item 14 is built for a Stripe subscription (US$1.99 per month, 7-day trial). The feedback asks for a one-time purchase in the Play Store. Inside an Android app, digital features must use Google Play Billing (see the note in item 14), so Stripe covers only the web. Decide this before items 14 and 16.
- **Market (Google Play, US, one-time prices, checked 2026-09-30):** PhotoPills $9.99, Sun Surveyor $9.99 (with a free Lite version), Sun Seeker $6.99, PeakFinder $4.99. The first three are planning tools for photographers. PeakFinder (the terrain horizon) is the closest to line of sight. Sources: [havecamerawilltravel.com](https://havecamerawilltravel.com/apps-for-tracking-the-sun/), [fstoppers.com](https://fstoppers.com/apps/outdoor-photography-apps-i-wont-leave-home-without-299365).
- **Proposal: €3.99 / US$3.99, one-time.**
  - This is below PeakFinder and far below the photographer tools. Sun Chaser is a calm sky app with one pro feature, not a planning tool.
  - After 19 % German VAT and the 15 % Play fee (on the first US$1 M per year), about €2.85 per sale.
  - The free app is the trial, because Play has no trial for one-time products. Later, test €2.99 against €4.99 with a Play Console price experiment.
- **Billing plan (replaces steps 1–5 of item 14 for the Play app):**
  - One managed one-time product, `premium`. Build with Bubblewrap with Play Billing on (`playBilling` in the TWA manifest).
  - In the PWA ([Chrome docs](https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing)): the Digital Goods API (`getDigitalGoodsService('https://play.google.com/billing')`) for the local price and for `listPurchases()` at start (this restores the purchase on a new phone), and the Payment Request API to buy. Needs Chrome 101 or later.
  - `PREMIUM_ENFORCED` gates the features only where the Digital Goods API exists, so only in the Play app. The web stays free for now: without an account, a purchase cannot move between devices. Trade-off: a Play user can use the same features free in the browser. Web sales later need Stripe one-time Checkout and the Supabase Auth from item 14.
  - No backend for the first version. Before the release, check how the Digital Goods API acknowledges a one-time purchase: Play refunds a purchase that is not acknowledged within 3 days.
  - Keep the Stripe subscription functions in `supabase/functions`, unused. Do not delete them until this decision is final.
- **Done when:** the price and the billing plan are decided, and items 14 and 16 are updated to match.
- **Decision (2026-09-30):** Premium is sold only in the Play app, as the one-time product `premium`. The web stays free, with all features and no gate. The billing plan above applies. The working price is €3.99 / US$3.99; confirm it in the Play Console before the release. Items 14 and 16 are updated.

### Scene review (2026-09-30)

A visual review of `main` at `6da35c1`. The method: 47 scene states in headless Chromium (390×844 and 1280×800, Ravensburg, a fixed clock and faked Open-Meteo data). The states: every day phase from 03:00 to 23:30, 14 weather types by day and night, −15 °C to 35 °C, and the easter eggs. Lutz marked each finding Roadmap, Later or Skip on the [review page](https://claude.ai/artifact/NaCVFCvuThdaobbvKQMYUc). "R n" in a heading is the finding number there.

- **Roadmap:** items 46–56 below. R1 (fireworks) goes to item 41. R22 (Premium badges) is on purpose, see item 14.
- **Skip:** R10 (rainbow next to the sun), R15 (the sun covers the zenith label), R16 (chips in a night storm), R17 (the iceberg comes in late), R18 (fish contrast), R19 (boats under the chip row).
- **Order:** 46 → 50 → 53, because each one changes the sky or the sun that the next one tints. The other items are independent.
- **Rule:** all motion stays slow and calm (see item 10).

### 46. A filled sun that shows in golden hour — S — R2, R20 — **↩ Rolled back**

- **Now:** the sun is the lucide `Sun` outline icon, `strokeWidth={1}` (`SunVisualization.tsx:859`). Between 0° and 10° it is `text-orange-400` (`getSunColor`), so on the orange evening sky only the glow shows. At +2.4° and +4.9° the sun is not visible.
- **Spec:**
  - Draw the sun as a filled disc (about 56 px, a `div` or SVG circle) with a soft rim, over the halo that is there now. No rays. This is the "soft glowing sun" of direction D (item 15).
  - Colour per altitude band: above 10° a pale warm white-yellow; 0–10° a deep gold-to-red that is darker and more saturated than the sky behind it; below 0° (the upper limb) deep red. Add the colours as `--scene-sun-*` tokens in `index.css`.
  - Keep the halo, the `drop-shadow` glow and `animate-glow`.
- **Done when:** in the browser at 18:30 and 18:45 (Ravensburg, clear), the disc is clearly visible against the evening sky. A test checks the colour token per altitude band.
- **Built:** the sun is a 56 px filled disc with a soft 6 px rim shadow, over the halo. The halo, the `drop-shadow` glow and `animate-glow` stay. `getSunDiscToken` sets the fill: `--scene-sun-high` (pale white-yellow) above 10°, `--scene-sun-low` (deep red-orange) from 0° to 10°, `--scene-sun-horizon` (deep red) below 0°. At 18:30 (+4.9°) and 18:45 (+2.4°) the disc is clearly visible on the orange sky.
- **Rolled back (2026-09-30):** on request ("the sun and the reflection looked better in the version before"), the sun is the line sun with rays again: lucide `Sun`, 96 px above the horizon and 80 px below, `text-yellow-300` above 10°, `text-orange-400` from 0° to 10°, `text-amber-600` below 0°. The dimming from item 50 stays: the sun's opacity is `getSunVisibility().disc`. `getSunDiscToken` and the `--scene-sun-high/low/horizon` tokens are gone. Trade-off: in golden hour the line sun is faint against the orange sky, which was the reason for this item.

### 47. Collapsed panel: hide "Change location" — S — R3 — **✅ Done**

- **Now:** the collapsed panel shows the title, the place and "Change location". On a phone "Astronomical Twilight" wraps to two lines, so the panel is 145 px tall. `COLLAPSED_PANEL_HEIGHT = 112` in `SunVisualization.tsx` assumes 112 px, so the arc labels can move under the panel.
- **Spec:** show "Change location" only when the panel is expanded. Keep the title and the place when it is collapsed.
- **Done when:** at 360 and 390 px, the collapsed panel is at most `COLLAPSED_PANEL_HEIGHT` tall for every time-of-day title, including "Astronomical Twilight". A test checks that the link does not render in the collapsed state.
- **Built:** `InfoPanel` renders "Change location" and its form only when the panel is expanded. Removing the link alone gave 122 px for "Astronomical Twilight", so the title also has `leading-none` (line height 28 px). Measured collapsed height at 360 and 390 px: 110 px for "Astronomical Twilight", 82 px for all one-line titles.

### 48. Sun altitude pill: no "-0.0°", hidden at night — S — R4, R14 — **✅ Done**

- **Now:** the pill shows `altitude.toFixed(1)` (`SunVisualization.tsx:1036`), so a value just below 0 reads "-0.0°". It shows at night too (for example "-37.1°"), next to the "Moon:" line.
- **Spec:**
  - When the rounded value is 0, show "0.0°" (no sign).
  - Hide the pill when `timeOfDay` is `night`. It stays in twilight, when the sun is still near the horizon.
- **Done when:** tests: −0.04° gives "0.0°", +0.04° gives "0.0°", −3.1° gives "-3.1°". The pill does not render at night.
- **Built:** `formatSunAltitude` gives "0.0°" when the rounded value is 0, and "+" only for positive values. The pill does not render when `timeOfDay` is `night`, and stays in twilight.

### 49. Frost: one threshold and a visible icy edge — S — R5 — **✅ Done**

- **Now:** `getWeatherEffects` returns `showFrost` (`weatherEffectsUtils.ts:53`), but nothing uses it. `InfoPanel.tsx:354` checks its own `temperature < -5`. At −12 °C the icy glow on the panel cannot be seen.
- **Spec:**
  - Use `showFrost` from `getWeatherEffects` as the only source. Remove the second `-5`.
  - Make the frost visible: a white-blue inner edge about 6 px wide on the panel, plus a few static crystal marks (CSS or an inline SVG) in two corners. No animation.
- **Done when:** a test checks that the panel shows the frost at −6 °C and not at −4 °C. At −12 °C in the browser the frost is visible on the collapsed and on the expanded panel.
- **Built:** `InfoPanel` calls `getWeatherEffects` and uses `showFrost`. The own `-5` check is removed. The frost shows as a white-blue inset shadow about 6 px wide and two static inline-SVG ice crystals, top left and bottom right. Checked in the browser at −12 °C at 390 and 1280 px.

### 50. Clouds dim the sun and the sky — M — R6, R9 — **✅ Done**

- **Now:** overcast, fog, drizzle, rain and snow keep a bright cyan sky and the full sun with its halo. Only a storm hides the sun. `WEATHER_GRADIENT_SHIFT` (`SunTracker.tsx`) changes the sky only a little. On a phone the snowflakes cannot be seen against the bright sky.
- **Spec:**
  - **Sky:** per weather type, mix the time-of-day gradient toward a grey (a `--scene-sky-overcast` token). Clear 0 %, partly 10 %, cloudy 25 %, drizzle and snow 45 %, overcast, fog and rain 60 %, storm and hail 75 %. When the weather has a `cloudCoverPercent`, use it to set the mix.
  - **Sun (item 46):** clear and partly: full. Cloudy: disc 80 %, halo 60 %. Drizzle and snow: a pale disc at 50 %, a small halo. Overcast, fog and rain: no disc, only a soft light patch where the sun is. Storm and hail: nothing, as now.
  - **Snow on the phone:** give the flakes a thin, darker blue-grey outline, or make them larger (at least 10 px), so they read on the greyer sky.
- **Done when:** tests for the sky mix and the sun visibility per weather type. In the browser at 11:00, clear, overcast, rain and snow look clearly different, and snowflakes are visible at 390 px.
- **Built:** `getSkyOvercastMix` (`weatherEffectsUtils.ts`) gives the mix per weather type, multiplied by the cloud cover when there is one (only for real weather, not for a weather picked by hand). `mixGradientTowardOvercast` (`sunUtils.ts`) replaces `shiftGradientBrightness` and `WEATHER_GRADIENT_SHIFT`. It mixes each stop toward `--scene-sky-overcast` (#8A949D), but the grey is never lighter than the stop, so night skies stay dark. `getSunVisibility` gives the disc and halo opacity and the halo size. With no disc, the halo is a white light patch and the water reflection is hidden. Hail now hides the sun like a storm. Snowflakes are at least 10 px, with a thin `--scene-snow-outline`.

### 51. Storm: a closed cloud deck and dark water — S — R7 — **✅ Done**

- **Depends on:** item 50 (the sky mix).
- **Now:** a storm shows a few small dark clouds, with blue sky between them and bright water.
- **Spec:**
  - A dark cloud deck across the top third of the sky: large, overlapping, slightly blurred cloud shapes with no gaps. Keep the drifting clouds below it.
  - Darken the water by about 40 % during a storm, and give it a slight grey tint.
  - Keep the lightning (`WeatherEffects.tsx`).
- **Done when:** in the browser at 15:00 with code 95, no blue sky shows through the deck, and the water is darker than in rain.
- **Built:** `CloudLayer` draws a `storm-deck` SVG in a storm: a solid dark band with two rows of large overlapping ellipses along its lower edge, blurred 4 px, across the top ~35 % of the sky. In a storm the drifting clouds move down to 30–50 % of the height, below the deck. `getWaterColors(skyGradient, storm)` darkens both water stops by 40 % and cuts their saturation by 30 % (grey tint). The lightning is unchanged.

### 52. Stars: dimmed by clouds and fewer in twilight — S — R8, R23 — **✅ Done**

- **Now:** `NightStars` gets only `timeOfDay` and `moonPosition`. In nautical and astronomical twilight each star has 60 % opacity, so the sky has the same number of stars as at night. Under overcast, rain, snow, fog and storms all stars shine.
- **Spec:**
  - Pass `weatherType` (and `cloudCoverPercent` when there is one) to `NightStars`.
  - **Clouds:** star opacity × (1 − cover). With no cover value: overcast, fog, rain, snow, storm and hail 0; cloudy 0.4; partly 0.8.
  - **Twilight:** nautical shows only the brightest 15 % of the stars at 40 %, astronomical the brightest 50 % at 70 %, night all of them. No shooting stars in twilight.
  - The rain streaks and snowflakes stay visible at night.
- **Done when:** tests for the opacity per weather type and the star share per twilight phase. In the browser at 22:30, overcast and rain show no stars. At 19:55 (nautical) only a few stars show.
- **Built:** `SunTracker` passes `weatherType` and `cloudCoverPercent` to `NightStars`. Two pure helpers in `weatherEffectsUtils.ts` set the values: `getStarCloudFactor` gives the cloud factor, and `getTwilightStars` gives the star share and opacity per phase. A star shows when its `brightness` is in the top share. Shooting stars show only at night. When the factor is 0, the canvas stays empty and no animation loop runs. Drizzle counts as covered (0), the same as rain.

### 53. The water follows the sky — M — R11, R12 — **✅ Done**

- **Now:** `getHorizonColor` and `getWaterDeepColor` (`SunVisualization.tsx:666`) have five buckets. `dawn` is a grey (`--scene-horizon-dawn: 264 3.9% 25.3%`), and `morning`, `evening` and `civil-twilight` fall to `day`, a bright cyan. So dawn has an orange sky over grey-black water, and the evening has an orange or lilac sky over midday water.
- **Spec:**
  - **Water colour:** give the water the lower sky stop of the current gradient, reflected: the surface stop is the sky's horizon colour, darkened by about 15 % and a little more saturated. The deep stop is a dark version of the sky's top colour. Take both from the same gradient that paints the sky (after item 50's weather mix), so the sky and the water always change together. Remove the fixed per-bucket water tokens that this replaces.
  - **Reflection:** replace the ladder of short dashes (`data-testid="water-reflection"`) with a soft glitter strip under the sun or the moon. The strip is a vertical band about the width of the disc, getting narrower and fainter with depth, made of short, blurred horizontal highlights. It shimmers slowly (a 4–6 s cycle, opacity only). With reduced motion it stays still.
- **Done when:** a test checks that the water colours come from the sky gradient for each `timeOfDay`. In the browser at 07:25, 18:45 and 19:20, the water is warm or lilac like the sky above it, and the reflection reads as light on water.
- **Built:** `SunTracker` computes the mixed sky gradient once (`skyGradient`) and passes it to `SunVisualization`. `getWaterColors` (`sunUtils.ts`) reads the gradient's hex stops. Surface: the sky colour at the horizon line (65 % of the height, between the 62 % and 100 % stops), 15 % darker but at least 5 points of lightness, so the night sea still reads against the night sky, and saturation × 1.3. Deep: the top stop at 45 % lightness. The sky colour at the horizon line is used, not the 100 % stop, because the 100 % stop is under the water (at dawn it is cyan under a peach sky). The `--scene-horizon-*` and `--scene-water-deep-*` tokens are gone. The reflection is a soft tapering light band (disc width) plus 12 rows of two short, blurred highlights that get narrower and fainter with depth. Each highlight runs `animate-shimmer` (5 s, opacity only) with a staggered delay; the global reduced-motion rule stops it. The sun strip uses `--scene-sun-high`, the moon strip `--scene-moon`. No sun strip when the disc is hidden (item 50).
- **Reflection rolled back (2026-09-30):** on request, the reflection is the 7 short bars again (`--scene-sun-glow-low` under the sun, `--scene-moon` under the moon). `GLINT_OFFSETS` and `animate-shimmer` are gone. The water colours from the sky stay, and the bars stay hidden when clouds hide the sun (item 50).

### 54. Moon line a few pixels lower — S — R13 — **✅ Done**

- **Now:** the "Moon: 22.7° | 80%" line (`SunVisualization.tsx:1043`, `bottom-1/4 -translate-y-12`) touches the SE, S and SW compass chips.
- **Spec:** move the moon line down until there are at least 6 px between it and the bottom of the compass chips at 360, 390 and 1280 px. Leave all other horizon labels as they are.
- **Done when:** in the browser at 22:30 at those widths, the moon line and the chips do not touch.
- **Built:** the moon line is now anchored 30 px below the horizon line (`top-[calc(65%+30px)]`), not to the bottom of the screen. The gap to the chips is 11 px at 360, 390 and 1280 px.

### 55. The panel opens collapsed on a phone — S — R21 — **✅ Done**

- **Now:** `isCollapsed` starts as `false` (`InfoPanel.tsx:139`). On a phone the open panel covers about 75 % of the screen, so the first view hides the scene.
- **Spec:** start collapsed when the window is narrower than 640 px (Tailwind `sm`). Wider screens start expanded, as now. Read the width once, at mount. Do not follow resizes.
- **Done when:** tests: at 390 px the panel starts collapsed, at 1280 px it starts expanded.
- **Built:** `isCollapsed` starts as `window.innerWidth < 640`, read once at mount.

### 56. Heat shimmer that can be seen — S — R24 — **✅ Done**

- **Now:** above 30 °C (`showHeatShimmer`, `WeatherEffects.tsx:101`) there is almost no visible change. Only the sun glow looks larger.
- **Spec:** a band about 40 px high just above the horizon, with a slow vertical wave distortion (an SVG `feTurbulence` + `feDisplacementMap` filter on a copy of the horizon strip, or a CSS mask with a slow translate). A 6–8 s cycle. Only in daylight, as now. With reduced motion: a still, pale haze band.
- **Done when:** at 35 °C and 14:00 in the browser, the shimmer over the ridge can be seen in a screenshot, and it moves slowly.
- **Built:** `WeatherEffects` draws a 40 px SVG band on the horizon: a pale haze gradient plus thin light lines. An `feTurbulence` + `feDisplacementMap` filter bends the lines, and an `feOffset` moves the noise over a 7 s cycle. With reduced motion, only the still haze shows. The old CSS keyframes are removed.

### Scene re-check (2026-09-30)

These items come from the re-shoot of all states after items 46–56.

### 57. Clouds hide the moon — S — **✅ Done**

- **Now:** at night in rain, fog and storm (100 % cover), the moon shows at full brightness. The stars are already dimmed (item 52).
- **Spec:** dim the moon disc and its glow with the same cloud factor as the stars (`getStarCloudFactor`). Keep a faint light patch where the moon is (at least 15 % opacity) when the cover is not 100 %, or when the weather type is cloudy or overcast. Storm and fog: moon hidden.
- **Done when:** a test for the moon opacity per weather type. In the browser at 22:30, the moon cannot be seen in rain, fog and storm, and it shows at full brightness when the sky is clear.
- **Built:** `getMoonCloudFactor` (`weatherEffectsUtils.ts`) starts from `getStarCloudFactor`. Storm and fog give 0. Cover below 100 %, cloudy and overcast give at least 0.15. `SunVisualization` multiplies the moon opacity (disc and glow) by the factor and does not draw the disc at 0. The old fixed storm opacity (0.3) is gone. The moon line and the moon arc stay.

### 58. No reflection when the sun or moon is below the horizon — S — **✅ Done**

- **Now:** the glitter strip (item 53) shows in nautical twilight at −9°, under the moon at −3.1°, and at −1° after sunset. Since 2026-09-30 the reflection is the bars again (item 53); the same rule applies to them.
- **Spec:** show the sun or moon strip only when that body's altitude is above 0°. Fade the strip out between +2° and 0°. Clouds also hide the moon strip (item 57).
- **Done when:** a test for the strip visibility by altitude. In the browser at 06:30, 19:20 and 19:55, there is no strip under a body that is below the horizon.
- **Built:** `getReflectionFade(altitude)` (`sunUtils.ts`) gives 0 at or below 0°, 1 from +2°, and a linear fade between. `SunVisualization` multiplies the strip opacity by it; for the moon strip also by `getMoonCloudFactor` (item 57). At 0 the strip is not drawn.

### 59. Drizzle and snow: a pale sun — S — **✅ Done**

- **Now:** drizzle and snow set the disc to 50 % opacity (item 50). On the light sky the disc still looks almost fully bright. Since the item 46 rollback the sun is the line icon again: mix its line colour instead.
- **Spec:** in drizzle and snow, mix the disc colour toward the sky's grey (`--scene-sky-overcast`) by about 50 % instead of only lowering the opacity, and blur its edge a little. Keep the small halo.
- **Done when:** in the browser at 11:00, the sun in drizzle and snow is clearly paler than in the cloudy state, and it can still be seen.
- **Built:** `getSunVisibility` has a new `pale` value: 0.5 for drizzle and snow, else 0. The disc colour is `color-mix()` of the disc token and `--scene-sky-overcast` by `pale`, with a 1.5 px blur on the edge. The disc opacity for drizzle and snow goes from 0.5 to 0.7, because the grey mix now does the dimming. The halo is unchanged.
- **After the item 46 rollback:** the line sun's colour is mixed the same way (`color-mix` of the band colour and `--scene-sky-overcast` by `pale`), without the blur, because a blur washes out the 1 px lines.

### 60. Fog: labels stay readable — S — **✅ Done**

- **Now:** the fog veil covers the compass chips and the sun time labels, so they are hard to read.
- **Spec:** put the compass chips, the time labels and the altitude pill above the fog veil in z-order. The fog still covers the ridge, the water and the sun.
- **Done when:** in the browser at 11:00 with fog, the chips and labels are as sharp as in clear weather.
- **Built:** the compass chips, the arc time labels (sun and moon) and the altitude pill get `z-[9]`, one above the fog veil (`WeatherEffects`, `z-[8]`). The ridge, the water and the sun have no z-index, so the fog still covers them.

### 61. The sea stays blue at dusk — S — **✅ Done**

- **Now:** the water takes the sky's hue 1:1 (item 53), with 1.3× saturation. At dusk the sea is saturated orange-red.
- **Spec:** the water can mirror the sky, but keeps a blue tone.
- **Done when:** a test that the water hue stays blue in every time of day. In the browser at 18:45, the sea is blue under the orange sky.
- **Built:** `getWaterColors` sends both colours through `toSea` (`sunUtils.ts`): a sea blue (hue 205°) with the sky colour's saturation and lightness, with 35 % of the sky colour mixed in (`SKY_TINT`). The lightness stays the sky's, so night, storm and weather dimming work as before. The sun's glitter strip gives the warm reflection.

---

## P1 — Core sky features

### 7. Pick the design direction and tokens — S *(decision)* — **✅ Done**

- **Why:** items 8–10 add many new visuals. If we build them in the current style, we must restyle them in item 15.
- **Decision (2026-09-27):** direction **D, Polished Classic**, with the **badge logo from F** (see item 15).
- **Spec:**
  - Define the tokens only: colors, type scale, fonts and scene palette, in `index.css` and `tailwind.config.ts`.
  - The full restyle stays in item 15.
- **Done when:** the tokens exist, and items 8–10 use them.

### 8. Cardinal directions (Himmelsrichtungen) — M — **✅ Done**

- **Why:** the scene shows where the sun is, but not which direction that is. Azimuth only shows as numbers in the panel.
- **Spec:**
  - **Static labels (always on):**
    - Show ticks and labels N, NE, E, SE, S, SW, W, NW on the horizon.
    - Place them with `getAzimuthScreenFraction` (`SunVisualization.tsx:23`), including its southern-hemisphere shift.
    - Show only the labels that fit the visible azimuth range.
  - **Live compass mode (opt-in, phones):**
    - A toggle button starts the compass.
    - Read the heading from `DeviceOrientationEvent` (`deviceorientationabsolute` on Android). On iOS, call `DeviceOrientationEvent.requestPermission()` and use `webkitCompassHeading`.
    - The scene pans so that the direction the phone points to is at screen center. Smooth the heading with a low-pass filter.
    - Show a one-time "move your phone in a figure 8" calibration hint.
    - If permission is denied or there is no sensor, keep the static labels and hide the toggle.
  - Put the heading math (smoothing, wrap-around at 0/360°) in a pure util with tests.
- **Done when:**
  - The labels match real directions in both hemispheres.
  - In compass mode, pointing the phone at the sun puts the sun at screen center.

### 9. Moon upgrade — M — **✅ Done**

- **Why:** the moon is a lucide icon with an emoji on top. It has no rise/set times and no path.
- **Spec:**
  - **Rise/set times:** add moonrise, moonset, next full moon and next new moon to the moon section of the InfoPanel. Use `SunCalc.getMoonTimes` (suncalc is already used in `moonUtils.ts`). Handle days where the moon doesn't rise or set (`alwaysUp` / `alwaysDown`).
  - **Arc in the sky:** draw the moon's path for the current day, the same way as the sun's arc, in a paler color.
  - **Real phase shape:** an SVG moon with the lit part from `illumination.fraction` and `angle` (`SunCalc.getMoonIllumination`). Mirror the lit side in the southern hemisphere. It replaces the icon and the emoji.
  - **Line of sight:** covered by item 13.
- **Done when:** the times match a reference source (for example timeanddate.com) within 2 minutes, and the phase shape is correct on 4 test dates (new, first quarter, full, last quarter).

### 10. Weather-dependent clouds and weather illustrations — M — **✅ Done**

- **Why:** `WeatherType` has only 6 values (`CloudLayer.tsx:7`). Fog maps to `overcast` and thunder maps to `storm` (`weatherUtils.ts:34-47`). The clouds sit at fixed positions.
- **Spec:**
  - **More weather types:** `clear | partly | cloudy | overcast | fog | drizzle | rain | storm | snow | hail`. Map each Open-Meteo WMO code to exactly one type, with a mapping test.
  - **Clouds:**
    - Cloud count and opacity come from the `cloud_cover` %.
    - Drift speed and direction come from `wind_speed_10m` / `wind_direction_10m`.
    - Cloud positions come from a random generator seeded by date and location, so they are stable between renders.
  - **New illustrations:**
    - Fog: soft bands low over the horizon. The sun and moon glow through them.
    - Storm: lightning flashes, with a cap on flash frequency.
    - Drizzle vs. rain: fewer and thinner drops for drizzle, slanted by wind.
    - Hail: bouncing pellets.
    - Strong wind (> 40 km/h): blowing leaves, and birds fly slower.
    - Heat (> 30 °C): heat shimmer above the horizon.
    - Frost (< −5 °C): ice crystals on the panel edges.
    - Rainbow: when it rains or drizzles and the sun is up with altitude < 42°, draw a rainbow opposite the sun's azimuth.
  - All animations respect `prefers-reduced-motion`, and the rAF id lives in a `useRef` (see CLAUDE.md).
- **Done when:** each weather type has its own look, and the mapping test covers all WMO codes.

### 11. Golden hour, blue hour and a sunset score — M *(suggestion)* — **✅ Done**

- **Why:** people who chase sunsets care about two things: when the light is good, and whether the sunset will be colorful. This is the core use case of the app.
- **Spec:**
  - **Golden and blue hour:** show the time windows in the InfoPanel, from suncalc `goldenHour` / `goldenHourEnd` and the sun altitude between −4° and −6°.
  - **Sunset score (0–10) for today and tomorrow:** fetch hourly `cloud_cover_low`, `cloud_cover_mid`, `cloud_cover_high` and `visibility` from Open-Meteo for the hour of sunset. High and mid clouds raise the score, low clouds and fog lower it. Keep the formula in a pure util with tests.
  - Candidate for Premium later.
- **Done when:** the score shows next to the sunset time, with a short reason (for example "high clouds, clear horizon").

### 12. Place-name search — S — **✅ Done**

- **Why:** the manual location only accepts lat/lon.
- **Spec:**
  - Add a search field to the manual-location form.
  - Use the Open-Meteo geocoding API (free, no key). Show up to 5 results. Selecting a result sets lat/lon and the place name.
  - Debounce the input by 300 ms.
- **Done when:** typing "Friedrichshafen" and selecting a result moves the sun calculation to that place.

---

## P2 — Flagship: line of sight (Premium later, free now)

### 13. Line of sight with terrain — L — **✅ Done** (alpine 5-min reference check still open)

- **Why:** the astronomical sunset is for a flat horizon. In the mountains, the sun disappears behind a ridge much earlier. At a high viewpoint, it sets later. No free web app shows this well.
- **Spec:**
  - **Elevation data:**
    - Use AWS Terrain Tiles in Terrarium format: free, no API key, attribution required.
    - Decode the PNG tiles on a canvas: `h = R·256 + G + B/256 − 32768`.
    - Zoom 10–12, about 9–25 tiles per location.
  - **Horizon profile:**
    - For each azimuth 0–359° (1° step), sample the terrain at log-spaced distances from 50 m to 50 km.
    - Elevation angle at distance d: `atan((h − h0 − eye − d²/(2R)·(1 − k)) / d)`, with Earth radius R = 6 371 km and refraction coefficient k ≈ 0.13.
    - The horizon angle for each azimuth is the maximum over all samples.
  - **Observer height:** an input for eye height above ground (default 1.7 m), for example a building floor or a tower. It changes `eye`.
  - **Horizon silhouette:** replace the flat horizon line in the scene with the real profile. Reuse the azimuth-to-x mapping.
  - **Adjusted rise/set times:**
    - Find the time when the sun's upper limb crosses the horizon angle at the sun's current azimuth. Use a bisection search over suncalc positions.
    - Show the result next to the astronomical time, for example "Sunset behind terrain 18:42 (−23 min)".
    - Do the same for moonrise and moonset (moon part of item 9).
  - **Cache:** store the profile per location (lat/lon rounded to 3 decimals) plus eye height in `localStorage`.
  - **Code:**
    - Put the pure math in `src/utils/horizonUtils.ts`, with tests in `tests/horizonUtils.test.ts` (use a synthetic terrain, such as a single ridge at a known angle).
    - Put the tile fetch and decode in a separate small module.
  - **Gate:** add the flag `PREMIUM_ENFORCED = false`. While it is false, all users get the feature.
  - Show the attribution: "Terrain: Mapzen / AWS Terrain Tiles".
- **Done when:**
  - At a known alpine location, the adjusted sunset matches a reference (PeakFinder or a real observation) within 5 minutes.
  - At the coast, the adjusted and astronomical sunset times differ by less than 2 minutes.

- **Built (2026-09-28), differences from the spec:**
  - Samples start at 200 m, not 50 m. Closer samples sit within a few z12 DEM pixels (~26 m), so DEM noise blocked the horizon by several degrees (a pixel beside the Zugspitze summit read as 8°).
  - Checked with real tiles: beaches (Guincho, Sylt) differ from the astronomical sunset by 0 min. Zugspitze summit sets 9 min later. Innsbruck sets 31 min earlier.
  - Viganella: no sun from 5 Nov to 6 Feb (documented: about 11 Nov to 2 Feb). Rattenberg: no sun on 21 Dec.
  - Tiles are not cached by the service worker. Only the computed profile is cached (`localStorage`).
- **Open:** compare an alpine sunset with PeakFinder or a real observation (5-min target).

### 14. Premium gating (deferred) — M

- **Status:** backend ready, frontend not started. Only start this when `PREMIUM_ENFORCED` should become `true`.
- **Update (2026-09-30), decision in item 45:** Premium is a one-time Google Play purchase in the Play app only. The web stays free. The Stripe steps below are not needed for the first release. They are kept for a possible later web sale.
- **Depends on:** item 13.
- **Exists today:**
  - `supabase/functions/create-checkout`: Stripe Checkout session, $1.99/month, 7-day trial for new customers only.
  - `supabase/functions/check-subscription`: syncs Stripe status to the `subscribers` table.
  - `supabase/functions/customer-portal`: Stripe billing portal session.
  - `supabase/migrations/20260927000000_create_subscribers.sql`: table + RLS.
- **To build (Play app, first release):**
  1. A `usePremium` check: when the Digital Goods API exists (`getDigitalGoodsService('https://play.google.com/billing')`), call `listPurchases()` at start and cache the result. When the API does not exist (the web), Premium is always unlocked.
  2. Buy: a tap on a feature with the gold plus opens the Payment Request API for the product `premium`, with the local price from `getDetails()`. After the purchase, the plus goes away.
  3. Acknowledge the purchase. Play refunds a purchase that is not acknowledged within 3 days (see item 45).
  4. Gate the gold-plus features only where the Digital Goods API exists and `PREMIUM_ENFORCED` is true.
  5. Tests with a mocked Digital Goods service: no API → unlocked; API without a purchase → locked; API with a purchase → unlocked.
- **Later, only for a web sale (not planned):**
  1. Supabase Auth in the frontend (sign-in, session handling, `@supabase/supabase-js` client).
  2. Upgrade UI: pricing dialog → call `create-checkout` → redirect to Stripe.
  3. Handle the return URLs `/?checkout=success` and `/?checkout=cancel` (toast + call `check-subscription`).
  4. Gate the premium features on `check-subscription` (`subscribed: true`) when `PREMIUM_ENFORCED` is true. The features marked with the gold plus (item 35): change location, manual weather, the sunset score, line of sight and compass.
  5. A "Manage subscription" button → `customer-portal`.
  6. Optional: a Stripe webhook function that updates `subscribers` without polling.
  7. Tests for the edge functions (Deno test with mocked Stripe).
- **Gold plus (scene review R22, 2026-09-30):** the plus on each Premium feature (item 35) is on purpose and stays. After a purchase the plus goes away. When `PREMIUM_ENFORCED` is true and the user has not bought Premium, a tap on a feature with the plus opens the purchase: the Play Billing flow in the Play app (item 45), else the Play Store listing. Until then, all features stay free for development and testing.
- **Note:** paying for digital features inside an Android app requires Google Play Billing. Stripe is only allowed for web purchases. Decide on this before item 16.

---

## P3 — Brand and distribution

### 15. Redesign: logo, CI and look & feel — L — **✅ Done** (badge unreadable at 48 px → app icon uses the text-free mark)

- **Status quo:**
  - UI colors are the stock shadcn tokens (`index.css`, `tailwind.config.ts`). The app has no palette of its own.
  - No custom font; the system sans stack is used.
  - The theme color `#33C3F0` is a generic cyan that doesn't fit a sun/dusk app.
  - The icons are plain PNGs (144/192/512) with `purpose: any` only. There is no vector logo.
  - Scene colors are hardcoded in components (for example the horizon colors at `SunVisualization.tsx:183-196`) and are not linked to the UI tokens.
  - The easter eggs (ghost, iceberg, fish, fireworks) each have their own look. They don't share one visual language.
  - The dark panel with blur is readable, but generic.
- **Three directions:**

  | | A — Golden Hour Instrument | B — Paper Sky Diorama | C — Retro Almanac |
  |---|---|---|---|
  | Mood | Calm, precise, premium | Cozy, playful, handmade | Nostalgic 70s travel poster |
  | Palette | Ink navy, one amber accent, cool greys | Warm dusk: apricot, rose, plum, deep teal | Duotone gradients (orange/teal, pink/navy) with grain |
  | Type | Geometric sans + tabular mono numerals (e.g. Space Grotesk + JetBrains Mono) | Rounded serif + soft sans (e.g. Fraunces + Nunito) | Bold condensed display + clean sans (e.g. Bebas Neue + Inter) |
  | Logo idea | Half-disc on a horizon line with an azimuth tick | Sun peeking over layered paper hills | Round badge with a sunburst and a mountain |
  | Scene | Thin lines, gradients, compass rose | Layered paper-cut hills, soft shadows; the terrain silhouette becomes paper layers | Flat shapes, halftone, risograph grain |
  | Easter eggs | Subtle, few | Recurring characters (ghost, fish, whale…) in one paper style | Stamps and stickers |
  | Fits | A paid tool | The current playful soul | Store screenshots and social sharing |

- **Decision (2026-09-27): D, Polished Classic, with the badge logo from F.** Style book: <https://claude.ai/artifact/Q6rTg9xQLPhG9SNcaz68Bj> (private artifact, directions A–F).
  - **From D:**
    - Palette: Sunset `#F97316`, Peach `#FEC6A1`, Sky `#0EA5E9`, Cyan `#33C3F0`, Night `#0F1016`, Coral `#E8625A`.
    - Today's sky gradients with a third color stop, the soft glowing sun, the soft blurred clouds and the water reflection.
    - The dark glass InfoPanel with a thin light border and 18 px corners.
    - The system font with one type scale (12 / 14 / 17 / 28 / 34 px) and tabular numbers.
    - Pill-shaped labels and buttons.
  - **From F:**
    - The round badge logo: the name around the edge, and a striped sun over water in the D colors.
    - The simpler round icon without text, for the maskable Android icon.
    - The Shrikhand wordmark, used for the logo lockup only.
  - **To check:** the badge text may not be readable at 48 px on a home screen. If it isn't, use the round icon without text as the app icon, and keep the badge for the splash screen and the store listing.
  - **Not taken:** F's outlined sticker UI and sticker sprites. The birds, bats, fish, ships, iceberg and ghost stay in D's soft style.
- **Deliverables:**
  - Logo SVG and app icons (any + maskable), plus a favicon.
  - Tokens for UI and scene in one place.
  - The scene color refactor: hardcoded colors → tokens.
  - Restyle of the InfoPanel, the buttons and the easter eggs.
  - Play Store graphics: 512 px icon, 1024×500 feature graphic, phone screenshots.
- **Must keep: the living scene.** Every direction keeps all moving elements and their random spawn rules from `CloudLayer.tsx` and `TemperatureIceberg.tsx`: birds (bats at night), fish, ships, the iceberg below 0 °C, and drifting clouds. The redesign changes how they look, not whether or how often they appear. All movement stays slow and calm, for relaxed watching: things glide straight across, with no jumping fish, flapping or wiggling. `prefers-reduced-motion` still turns them off.

### 16. Google Play release (TWA via Bubblewrap) — M

- **Depends on:** item 6 (no third-party script), item 15 (icon and store graphics), and the billing decision in items 14 and 45.
- **Spec:**
  1. Deploy the PWA to a production HTTPS domain.
  2. Serve `/.well-known/assetlinks.json` with the app signing key's SHA-256 fingerprint, so the TWA shows no URL bar.
  3. Run `bubblewrap init --manifest https://<domain>/manifest.webmanifest`, then `bubblewrap build`. Set `display: fullscreen` for true fullscreen.
  4. Use Play App Signing. Keep the upload key out of git.
  5. Turn on Play Billing in the TWA (`playBilling` in the Bubblewrap manifest), and create the managed one-time product `premium` in the Play Console at the price from item 45.
  6. Store listing: privacy policy (location use, no tracking), data-safety form, content rating, and the graphics from item 15.
  7. Note: new personal developer accounts must run a closed test with 12+ testers for 14 days before the production release. Plan for this time.
- **Done when:** the app is live on Google Play, opens fullscreen without a URL bar, and web deploys update it without a new store release.

---

## Ongoing — Easter eggs and special events (S each, pick any time)

Rules for all items:

- Respect `prefers-reduced-motion`.
- Keep the rAF id in a `useRef`.
- Put the trigger logic (date and astronomy checks) in a pure util with tests.
- Show at most one special event at a time.
- Test override: `?egg=<kind>` forces one astronomy event (`solarEclipse`, `lunarEclipse`, `greenFlash`, `supermoon`, `blueMoon`, `meteorShower`, `aurora`).

Items:

- **Calendar:**
  - New Year: fireworks at 00:00 on Jan 1 (reuse `Fireworks`).
  - Solstice and equinox: a small badge and the longest/shortest-day text.
  - Halloween: a pumpkin moon when the full moon is within 3 days of Oct 31. Otherwise bats all night.
  - Christmas: light snow on Dec 24–26, even when the weather is clear.
  - Friday the 13th: a black cat walks along the horizon once.
- **Astronomy:**
  - ✅ Solar and lunar eclipses: a darkened sun or red moon at the correct time (hardcoded date list for 10 years). Done: NASA GSFC list 2026–2035 in `astroEvents.ts`; solar only within ~3500 km of the greatest-eclipse point.
  - ✅ Supermoon: a bigger moon when the full moon is near perigee. Done: 14 % bigger moon when the full moon is closer than 360 000 km (Meeus distance).
  - ✅ Blue moon: the second full moon in a month has a faint blue tint. Done: `MoonTint`, ±1 day around the full moon.
  - ✅ Meteor showers: more shooting stars at night, via `NightStars`, during the Perseids (~Aug 12), Geminids (~Dec 14) and Quadrantids (~Jan 3). Done: 8× the shooting-star rate on the 3 peak days.
  - ✅ Aurora: green curtains at night when |latitude| > 60°. Later, add live data from the NOAA Kp index. Done: static rule, `Aurora` with a slow CSS drift; Kp index still open.
  - ✅ Green flash: 1 in 20 chance of a short green flash at a clear sunset. Done: `GreenFlash`, 4 s after the (line-of-sight) sunset, roll seeded per day and place.
- **Hidden:**
  - Tap the sun 7 times: it wears sunglasses for one minute.
  - A UFO crosses the night sky (1 in 200 chance per night view).
  - A whale instead of fish (1% chance).
  - The Konami code gives a disco sky for 10 seconds.

---

## Backlog (not prioritized)

- Unit toggle °C/°F.
- German and English UI (i18n).
- Share card: an image of today's sunset with the time and score.
- Sunset reminder notification (after item 16, when notifications are practical).
- Date/time scrubber to preview any day or time of the year: now item 44.
