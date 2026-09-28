# Sun Chaser — Roadmap

> summary: Prioritized list of Sun Chaser features that are not built yet, each with a short spec.
> P0 = quick fixes and polish, P1 = core sky features, P2 = line-of-sight terrain analysis (Premium later, free now),
> P3 = redesign and Google Play release. An ongoing easter-egg batch and a backlog follow.
> Each item has Why, Spec, Done when, Size (S = hours to 1 day, M = days, L = 1+ weeks) and dependencies.

Status: last updated 2026-09-28. Done: items 1–13 and 17–21 (marked **✅ Done** in the heading; real-device checks for 17 and 19 and the Sentry release to-dos are still open). Open: items 14–16, 22–30 (Sentry feedback), easter eggs, backlog.

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

### 22. Top-left buttons stay together in fullscreen — S — [SUN-CHASER-2](https://ainabler.sentry.io/issues/SUN-CHASER-2)

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

### 23. Feedback available in fullscreen — S — [SUN-CHASER-5](https://ainabler.sentry.io/issues/SUN-CHASER-5)

- **Feedback:** "Feedback not available in full screen."
- **Cause:** the only way to send feedback is the "Send feedback" link at the bottom of the InfoPanel. In fullscreen the panel fades out after 10 s (`InfoPanel.tsx`, `setIsVisible(false)`). A tap on the scene brings back the top-left buttons (`showCursor`), but not the panel. On a phone, the user sees no way to send feedback. The Sentry form itself works in fullscreen (checked: it attaches to `body`, and the fullscreen element is `<html>`).
- **Spec:**
  - Add a feedback button (lucide `MessageSquare`, `aria-label="Send feedback"`) to the top-left button row from item 22. It uses the same visibility rule. Show it only when `getFeedback()` returns an integration, the same condition as the panel link.
  - Keep the panel link.
  - Move the open logic (`createForm`, `appendToDom`, `open`) into one small helper, used by the button and the link.
- **Done when:** in fullscreen on a phone, a tap on the scene shows the feedback button, and the button opens the form.

### 24. Golden and blue hour: below the sun and moon times, collapsed by default — S — [SUN-CHASER-3](https://ainabler.sentry.io/issues/SUN-CHASER-3)

- **Feedback:** "Golden & blue hour needs to go below sun and moon times and be collapsed on default."
- **Current order in the panel:** Weather → Weather mode → Time (sunrise, sunset, sunset score) → Line of Sight → **Golden & Blue Hour** → Moon Information (moonrise, moonset) → Twilight → Sun Position → Send feedback.
- **Spec:**
  - Move the Golden & Blue Hour section to after Moon Information, before Twilight.
  - Make it collapsible, like Moon Information: a chevron button with `aria-expanded`, and state in `isGoldenBlueCollapsed`, `true` by default.
  - Keep the heading text with the part of the day (for example "Golden & Blue Hour · this evening") visible when collapsed.
  - Do not add it to the time-of-day auto-collapse effect. It stays collapsed until the user opens it.
- **Done when:** a test shows the section after the moon section, collapsed at start, and expanded after one click.

### 25. Hide the coordinates and the weather update time — S — [SUN-CHASER-4](https://ainabler.sentry.io/issues/SUN-CHASER-4)

- **Feedback:** "No need for location coordinates - please hide them and as well as weather update time."
- **Where:** coordinates in the panel header (`InfoPanel.tsx`, `location.latitude.toFixed(4)`); "Updated: HH:mm" in Current Weather.
- **Spec:**
  - Show the coordinates only when there is no place name (reverse geocode failed or is still loading), so the user still sees which location is used.
  - Remove the "Updated: HH:mm" line. Keep the "Real weather unavailable" warning and the refresh button.
  - Keep the coordinates in the "Change location" form fields.
- **Done when:** with a place name, the header shows the name and no coordinates, and Current Weather has no update time. Without a place name, the coordinates show.

### 26. Sun and moon arcs reach the horizon — S — [SUN-CHASER-6](https://ainabler.sentry.io/issues/SUN-CHASER-6)

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

### 27. Sea visible at the horizon — S — [SUN-CHASER-7](https://ainabler.sentry.io/issues/SUN-CHASER-7)

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

### 28. Sentry scrub: filter location values anywhere in a string — S — [SUN-CHASER-1](https://ainabler.sentry.io/issues/SUN-CHASER-1)

- **Finding:** the setup test error "Sentry test from sun-chaser setup (latitude=47.65&longitude=[Filtered]" shows the latitude. `LOCATION_PARAM` in `src/utils/sentryScrub.ts` only matches a key after `?` or `&`. Real request URLs always have one of these, so the risk is low, but a key at the start of a string or after `(` or a space is not filtered.
- **Spec:**
  - Match the key after any non-word character or at the string start: `\b(?:latitude|longitude|lat|lon|name)=`. Filtering too much is acceptable, filtering too little is not.
  - Add the test string above to `tests/utils.sentryScrub.test.ts`.
  - Resolve SUN-CHASER-1 in Sentry after the merge (it is a test event from `localhost`).
- **Done when:** the test shows `latitude=[Filtered]&longitude=[Filtered]` for the test string, and the existing tests still pass.

### 29. Direction labels fade out in fullscreen — S — [SUN-CHASER-9](https://ainabler.sentry.io/issues/SUN-CHASER-9)

- **Feedback:** "Direction labels should also fade out in full screen."
- **Cause:** the cardinal labels (item 8) in `SunVisualization.tsx` are always drawn. `SunVisualization` gets neither `isFullscreen` nor the idle state `showCursor` from `SunTracker`, so the labels cannot fade with the buttons.
- **Spec:**
  - Pass `isFullscreen` and `showCursor` from `SunTracker` to `SunVisualization`.
  - In fullscreen, when idle, fade the label container (`data-testid="cardinal-labels"`) to `opacity-0` with the same `transition-opacity duration-300` as the buttons (item 22). A tap or mouse move shows the labels again.
  - Keep the labels visible in compass mode, where they are needed to aim the phone.
- **Done when:** in fullscreen, the labels fade out together with the buttons and come back on a tap. A test covers the visible and hidden states.

### 30. Line of Sight as an icon at the sun and moon times — S — [SUN-CHASER-8](https://ainabler.sentry.io/issues/SUN-CHASER-8)

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
- **Depends on:** item 13.
- **Exists today:**
  - `supabase/functions/create-checkout`: Stripe Checkout session, $1.99/month, 7-day trial for new customers only.
  - `supabase/functions/check-subscription`: syncs Stripe status to the `subscribers` table.
  - `supabase/functions/customer-portal`: Stripe billing portal session.
  - `supabase/migrations/20260927000000_create_subscribers.sql`: table + RLS.
- **To build:**
  1. Supabase Auth in the frontend (sign-in, session handling, `@supabase/supabase-js` client).
  2. Upgrade UI: pricing dialog → call `create-checkout` → redirect to Stripe.
  3. Handle the return URLs `/?checkout=success` and `/?checkout=cancel` (toast + call `check-subscription`).
  4. Gate line of sight (and maybe the sunset score) on `check-subscription` (`subscribed: true`) when `PREMIUM_ENFORCED` is true.
  5. A "Manage subscription" button → `customer-portal`.
  6. Optional: a Stripe webhook function that updates `subscribers` without polling.
  7. Tests for the edge functions (Deno test with mocked Stripe).
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

- **Depends on:** item 6 (no third-party script), item 15 (icon and store graphics), and the billing decision in item 14.
- **Spec:**
  1. Deploy the PWA to a production HTTPS domain.
  2. Serve `/.well-known/assetlinks.json` with the app signing key's SHA-256 fingerprint, so the TWA shows no URL bar.
  3. Run `bubblewrap init --manifest https://<domain>/manifest.webmanifest`, then `bubblewrap build`. Set `display: fullscreen` for true fullscreen.
  4. Use Play App Signing. Keep the upload key out of git.
  5. Store listing: privacy policy (location use, no tracking), data-safety form, content rating, and the graphics from item 15.
  6. Note: new personal developer accounts must run a closed test with 12+ testers for 14 days before the production release. Plan for this time.
- **Done when:** the app is live on Google Play, opens fullscreen without a URL bar, and web deploys update it without a new store release.

---

## Ongoing — Easter eggs and special events (S each, pick any time)

Rules for all items:

- Respect `prefers-reduced-motion`.
- Keep the rAF id in a `useRef`.
- Put the trigger logic (date and astronomy checks) in a pure util with tests.
- Show at most one special event at a time.

Items:

- **Calendar:**
  - New Year: fireworks at 00:00 on Jan 1 (reuse `Fireworks`).
  - Solstice and equinox: a small badge and the longest/shortest-day text.
  - Halloween: a pumpkin moon when the full moon is within 3 days of Oct 31. Otherwise bats all night.
  - Christmas: light snow on Dec 24–26, even when the weather is clear.
  - Friday the 13th: a black cat walks along the horizon once.
- **Astronomy:**
  - Solar and lunar eclipses: a darkened sun or red moon at the correct time (hardcoded date list for 10 years).
  - Supermoon: a bigger moon when the full moon is near perigee.
  - Blue moon: the second full moon in a month has a faint blue tint.
  - Meteor showers: more shooting stars at night, via `NightStars`, during the Perseids (~Aug 12), Geminids (~Dec 14) and Quadrantids (~Jan 3).
  - Aurora: green curtains at night when |latitude| > 60°. Later, add live data from the NOAA Kp index.
  - Green flash: 1 in 20 chance of a short green flash at a clear sunset.
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
- Date/time scrubber to preview any day or time of the year.
