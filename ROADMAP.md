# Sun Chaser — Roadmap

> summary: Prioritized list of Sun Chaser features, done and open, each with a short spec. The Status line says which items are done.
> P0 = quick fixes and polish, P1 = core sky features, P2 = line-of-sight terrain analysis (Premium later, free now),
> P3 = redesign and Google Play release, Version 2.0 = a livelier, smarter sky (items 89–97). An ongoing easter-egg batch and a backlog follow.
> Each item has Why, Spec, Done when, Size (S = hours to 1 day, M = days, L = 1+ weeks) and dependencies.

Status: last updated 2026-10-04. Done: items 1–15, 17–44, 47–88 (item 14: the Play-app code, with `PREMIUM_ENFORCED` off until item 16), item 46 rolled back (marked **✅ Done** in the heading; items 1–13, 15 and 17–30 re-verified on 2026-09-28, see [Verification](#verification-2026-09-28)). Easter eggs: all built (the whale in item 62). Open: item 16 and item 101 (YouTube channel and the store preview video) (with item 16: turn on `PREMIUM_ENFORCED`, and check with a licence tester that a purchase is still there after 3 days, see item 14 "Acknowledge"; item 67 step 7, the store listing and privacy policy in five languages, moves to item 16), a native-speaker review of the de/es/it/fr texts (item 67), [Version 2.0](#version-20--a-livelier-smarter-sky) (items 89–97, specced 2026-10-04; item 94 needs a lookbook first), the device and dashboard checks listed under Verification (status 2026-10-01). [AUDIT.md](AUDIT.md) has no open findings.

## Verification (2026-09-28)

- **Method:** each done item was checked against its Spec and Done-when in the code and the tests (`main` at `a9882c4`: 487 tests, lint, typecheck and build pass). It was also checked in the running app with Playwright: 390×844 and 360×640, Ravensburg by day and at night, Sydney, fullscreen idle and wake, compass mode with synthetic headings, denied geolocation, place search.
- **Result:** items 1–13, 15 and 17–30 are built as specified, or as a later item changed them. The check found two new bugs (items 37 and 38). Items 31–36 were built after this check and are not part of it.
- **Checks (table updated 2026-10-01):**

| Item | Check | Status |
|---|---|---|
| 2 | Touch scroll in the panel does not pan the scene. | Open: real device |
| 4 | The installed PWA shows no browser bars and no gaps (Android); it draws under the status bar (iOS). | Open: real device |
| 8, 19 | Labels match a hardware compass within about 10°. Pointing the phone at the sun puts it at screen centre; a 45° turn moves it to the edge. | Open: real Android phone and iPhone |
| 9 | Moon times match timeanddate.com within 2 minutes. | ✅ Done 2026-10-01: all 12 times within 1 minute |
| 13 | An alpine sunset matches PeakFinder or an observation within 5 minutes. | ✅ Done 2026-10-01: Sion within 4.3 minutes (second-hand PeakFinder value) |
| 15 | The maskable icon is not cropped on a launcher. | Open: real Android device |
| 21 | A thrown test error has readable stack frames and no coordinates; a feedback message has no name or email. Sentry in the privacy policy (item 16). | Open: Sentry dashboard |
| 23 | In fullscreen on a phone, a tap shows the feedback button and it opens the form. | Open: real device |
| 14, 16 | Not started. Item 45 decides the billing: Premium in the Play app only, web free. | Open: build |
| 37, 38 | Built (AUDIT C-14, C-15). | ✅ Done |
| 39 | Built. The hand-off from the Android splash to the loading screen on a phone. | Open: real device |
| 40 | Built. Look at the boat speeds and sizes on a phone. | Open: real device |
| 41–44 | Built (Sentry feedback round 3). | ✅ Done |
| 43 | The ticks are audible with the radio on and off, and the chime sounds at T0 ± 0.5 s on a real phone. | Open: real device |
| 45 | Decided: Premium in the Play app only, web free. | ✅ Done |

- **Results (2026-10-01):**
  - **Item 9, moon times:** the app times come from `getMoonTimes` (`moonUtils.ts`), run in Vitest with the zone of each city. The reference times come from timeanddate.com (`/moon/germany/ravensburg` and `/moon/australia/sydney`, October 2026). timeanddate.com shows whole minutes. All 12 app times are 0–57 s after the reference minute, so each delta is less than 1 minute. Pass.

    | City | Date | Event | App | timeanddate.com | Delta |
    |---|---|---|---|---|---|
    | Ravensburg (47.78, 9.61) | 5 Oct | Rise | 00:49:36 | 00:49 | +36 s |
    | | | Set | 16:44:36 | 16:44 | +36 s |
    | | 15 Oct | Rise | 13:09:27 | 13:09 | +27 s |
    | | | Set | 20:40:23 | 20:40 | +23 s |
    | | 28 Oct | Set | 10:11:57 | 10:11 | +57 s |
    | | | Rise | 18:09:08 | 18:09 | +8 s |
    | Sydney (−33.87, 151.21) | 5 Oct | Rise | 03:05:32 | 03:05 | +32 s |
    | | | Set | 13:15:23 | 13:15 | +23 s |
    | | 15 Oct | Rise | 08:34:08 | 08:34 | +8 s |
    | | | Set | 23:46:47 | 23:46 | +47 s |
    | | 28 Oct | Set | 06:51:47 | 06:51 | +47 s |
    | | | Rise | 21:59:08 | 21:59 | +8 s |

    The dates include days after a clock change (Sydney 4 Oct, Ravensburg 25 Oct).
  - **Item 13, line-of-sight sunset:** reference: a PeakFinder value for Sion, Switzerland (46.22746, 7.35933), 22 May 2025, quoted in a [Home Assistant forum post](https://community.home-assistant.io/t/use-peakfinder-for-exact-sunrise-sunset-hours/893259): sunrise 06:21, sunset 19:57 (flat: 05:49, 21:05). The app (`loadHorizonProfile` with real AWS tiles, eye height 1.7 m, then `getTerrainSunTimes`) gives sunrise 06:18:31 (horizon 3.8° at azimuth 64°) and sunset 20:01:20 (horizon 9.4° at azimuth 290°). The deltas are −2.5 min and +4.3 min. Pass within 5 minutes. The reference is second-hand: the post does not give the eye height or the PeakFinder version. A first-hand PeakFinder check or an observation can make it stronger.
  - **Item 21, Sentry:** no `sentry` CLI and no Sentry MCP tool is available. The check needs the Sentry dashboard.

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
- **Follow-up (field feedback, 2026-09-28 night):** "I don't see any of the new ships with lights." The first boat came only 2 min after load (then one every 2–4 min). It now sails out about 5–15 s after load (the `ships` start value of `lastSpawnTimeRef` in `CloudLayer.tsx`). Checked in real time in Ravensburg at night: first boat after 7–14 s in 5 of 6 reloads, with its lights on (the 6th hit the 10 % skip roll).
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
  - Not part of this item: weather from the Open-Meteo hourly forecast for the next 7 days (built in item 86).
- **Done when:**
  - Tests: an offset of +6 h gives `getSunPosition(now + 6 h)`. Play forward moves `date` by 10 min per second (fake timers). "Back to now" returns to live. A preview does not fetch the weather again. No countdown and no fireworks during a preview.
  - In the browser: play through a sunset. The sun moves along its arc, the sky colours change, and the panel times follow. One play tick takes less than 16 ms in the profiler.
- **Built:**
  - `SunTracker` has `timeOffsetMs` and `playDirection` state. The clock sets `date = Date.now() + offset`, every 1 s live and every 100 ms during play; during play each tick adds `(direction × 600 − 1) × elapsed` to the offset, so `date` moves exactly 10 min per second. One `useMemo` keyed on the 30 s step and the location derives sun and moon position, sun times, golden and blue hour and time of day from `date`; the 30 s interval and the location-change block are removed.
  - `isTimePreview` (`timeOffsetMs !== 0`) in `SunTracker` is the preview flag. It gates the fireworks and the countdown (item 43). The weather fetch still uses its own `new Date()`, so a preview does not fetch again, and the sunset score and the spawns stay live.
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
  - Keep the Stripe subscription functions in `supabase/functions`, unused, for a possible later web sale (item 14).
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
- **Fix (2026-09-30):** with a manually picked weather, the stars, the moon and the clouds still used the real cloud cover, while the sky ignored it (a manual "Clear" under a real 100 % cover showed no stars). `SunTracker` now passes one `cloudCover` to the sky, `NightStars` and `SunVisualization`: `null` for manual weather, so all follow the weather type alone.

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
- **Built:** `getWaterColors` sends both colours through `toSea` (`sunUtils.ts`): a sea blue (hue 205°) with the sky colour's saturation and lightness, with 35 % of the sky colour mixed in (`SKY_TINT`). The lightness stays the sky's, so night, storm and weather dimming work as before. The sun's reflection bars (item 53) give the warm reflection.

### Fish lookbook (2026-09-30)

### 62. Fish: 13 species, calm swimming patterns — M — **✅ Done**

- **Feedback:** "Please ideate and create a lookbook for adding a lot of different fish with different swimming patterns."
- **Lookbook:** [Fish & Currents](https://claude.ai/artifact/FoeCu4oaNTnoiBfwqXpUjk) (private). Picks: F1–F13, P1, P3, P4, P5, P6, P8, P9, E1, E2, E3, E4.
- **Now:** one fish (lucide `Fish`, 20 px, `text-blue-400` at 70 %) glides left to right at 2.5 % of the width per second, at a random height between 70 % and 85 % of the screen (`CloudLayer.tsx`).
- **Species** (sizes and speeds are for a near fish; crossing = time to cross a phone; share = part of all spawns):

  | ID | Species | Icon | Size | Speed (%/s) | Crossing | Share | Pattern | Haze | Tint (E3) |
  |---|---|---|---|---|---|---|---|---|---|
  | F1 | Classic fish | lucide `Fish` | 20 px | 2.5 | 44 s | 25 | Glide, P6 | 0.3 | 213 94% 68% (today's blue) |
  | F2 | Minnow school | new `Minnow` | 10 px each | 3 | 37 s | 18 | P5 | 0.1 | 200 70% 82% |
  | F3 | Perch | new `Perch` | 22 px | 2.2 | 50 s | 14 | Glide, P6 | 0.35 | 88 40% 50% |
  | F4 | Pike | new `Pike` | 32 px | 2 | 55 s + rest | 8 | P8 | 0.45 | 70 30% 42% |
  | F5 | Carp | new `Carp` | 26 px | 1.6 | 69 s | 10 | Glide | 0.65 | 40 80% 56% |
  | F6 | Catfish (wels) | new `Catfish` | 34 px | 1.1 | 100 s | 4 | Glide | 0.85 | 30 18% 40% |
  | F7 | Trout | new `Trout` | 22 px | 2.8 | 39 s | 12 | Glide | 0 | 350 55% 76% |
  | F8 | Ray | new `Ray` | 30 px | 1.5 | 73 s | 2 | Glide | 0.75 | 215 20% 35% |
  | F9 | Turtle | lucide `Turtle` | 26 px | 1.2 | 92 s + rest | 2 | P8, not in E4 | 0.5 | 150 35% 38% |
  | F10 | Jellyfish | new `Jellyfish` | 18 px | 0.5 | 220 s | 2 | Glide, not in E4 | 0.3 | 285 70% 82% |
  | F11 | Seahorse | new `Seahorse` | 18 px | 0.4 | 275 s | 1 | Glide | 0.4 | 30 85% 60% |
  | F12 | Whale | new `Whale` | 72 px | 0.8 | 138 s | 1 | Glide, always far | 0.8 | 215 25% 30% |
  | F13 | Pufferfish | new `Pufferfish` | 20 px | 1 | 110 s + rest | 1 | P8 | 0.4 | 50 90% 58% |

- **Spec:**
  - **Icons:** add the new icons to `sceneIcons.ts` with `createLucideIcon`, with the path data from the lookbook (24 px grid, 2 px round strokes, no fill). F1 and F9 come with lucide.
  - **Mix:** `FISH_WEIGHTS` and `pickFish(r)` in `weatherEffectsUtils.ts`, built like `pickBoat`. The weights are the share column (sum 100).
  - **P3 Distance:** each fish gets a random `depth` from 0 (near) to 1 (far), like the boats. Size and speed × (1 − 0.45 × depth) (`FAR_SHRINK`), opacity × (1 − 0.3 × depth). A far fish swims at 70 % of the screen height, a near fish at 85 % (today's band), ±1 %. Far fish are drawn first. The whale always has a depth of 0.75–1, so it is 40–48 px on screen, about the size of the rowboat.
  - **P4 Own pace:** the speed column replaces `FISH_RATE_PERCENT_PER_SEC`.
  - **P5 School:** a minnow spawn is one entity with 4–7 minnows in a fixed formation. The offsets, in minnow widths × 1.15, are (0, 0), (−1.4, −0.9), (−1.6, 0.9), (−2.9, −0.1), (−3.1, 1.6), (−4.2, −1.1) and (−4.5, 0.7). The formation does not change during the crossing.
  - **P6 Companions:** a classic fish or a perch has a 35 % chance of a second fish of the same species, 2–4 s behind, at the same depth, ±1.4 % of the screen height.
  - **P8 Rest stop:** the pike, the turtle and the pufferfish glide in, slow to a stop over 3 s at 30–65 % of the width, hold still for 5–8 s, speed up over 3 s and glide out. The speed changes, the direction never. To keep movement out of React state (as with today's CSS animation), use the Web Animations API (`element.animate`) with keyframe offsets from this profile.
  - **P9 Depth haze:** opacity × (1 − 0.4 × haze), with the haze column. The water is drawn in perspective, so height on screen shows distance, and paleness shows depth.
  - **E1 Twilight glow:** fish show until the end of civil twilight. When the sun is below the horizon, 35 % of the fish get a small gold glow spot at the body centre: a circle of r 1.3 on the 24 px grid, `--brand-gold-light`, with the same glow as the boat lights. Full night stays without fish.
  - **E2 Rain:** in rain and drizzle, the spawn chance goes from 70 % to 35 %, and the fish opacity × 0.75.
  - **E3 Tints:** each species uses its tint column, as `--scene-fish-<species>` tokens in `index.css`, at today's 70 % base opacity. This replaces `text-blue-400`.
  - **E4 At most five:** no new spawn while five fish entities are on screen. A school or a companion pair counts as one. The turtle and the jellyfish are not fish, so they do not count, and they can spawn when five fish are on screen.
  - **Unchanged:** fish swim left to right only (P2 not picked). The spawn check runs every 5–8 s. Fish show from dawn to the end of civil twilight, in clear, partly cloudy, cloudy, overcast, rain and drizzle. With reduced motion there are no fish.
  - **Not picked:** P2 (both ways), P7 (long curve: the carp and the ray glide straight), P10 (drift), P11 (turn back).
  - **Motion rule** (item 15): the fish never jump, dart, wag the tail, blow bubbles or chase each other.
- **Decision (2026-09-30):** no drift. The jellyfish and the seahorse glide straight at their own pace: 220 s and 275 s per crossing. The turtle and the jellyfish do not count toward E4.
- **Done when:**
  - Tests: the weights sum to 100 and `pickFish` returns every species; the rest-stop keyframes hold still for the hold time; E4 blocks a sixth fish but not a turtle or a jellyfish; E2 halves the spawn chance; the whale is always far.
  - In the headless scene capture at 390×844 in Ravensburg: each species is seen once, the minnow school keeps its shape, the pike stops and goes on, fish glow at 19:15 after sunset, and rain has fewer and paler fish.
- **Built:**
  - `sceneIcons.ts`: 11 new icons (`Minnow`, `Perch`, `Pike`, `Carp`, `Catfish`, `Trout`, `Ray`, `Jellyfish`, `Seahorse`, `Whale`, `Pufferfish`). `index.css`: 13 `--scene-fish-*` tint tokens.
  - `weatherEffectsUtils.ts`: `FISH_WEIGHTS`, `pickFish` (shares `pickWeighted` with `pickBoat`), `canSpawnFish` (E4, turtle and jellyfish exempt) and `getRestStopMotion` (P8). The rest stop is a CSS `linear()` easing on the existing `moveAcrossX` animation, so no movement goes through React state. A browser without `linear()` ignores the easing, and the fish glides straight.
  - `CloudLayer.tsx`: the `FISH` table and `createFish` (distance, school, rest stop, haze, rain, glow, companion). A pair is one entry; the companion is the same fish with an animation delay, and its `onAnimationEnd` removes the pair. `FISH_RATE_PERCENT_PER_SEC` is gone.
- **Checked:** 14 new unit tests (588 in all), lint, typecheck and build pass. In Chromium at 390×844, Ravensburg, clear weather: all 13 species swam across, at 70–85 % of the height (the whale 43 px wide, far and pale; a school of 5 minnows). The pike stopped at 33 % of the width for about 8 s and swam on. At 19:15 (civil twilight), 2 of 5 fish had the gold glow. There were no console errors.

### 63. Line-of-sight moonrise and moonset on the moon arc — S — **✅ Done**

- **Feedback (2026-09-30):** "moonrise and set dont have the line of sight times on the arc yet it is only for the sun at the moment please add".
- **Now:** item 42 shows the line-of-sight sunrise and sunset on the sun arc. The moon arc shows only the flat moonrise and moonset. The line-of-sight moon times (`terrainExtras.terrainMoonTimes`) show only in the panel.
- **Spec:** the item 42 rules on the moon arc: a moon-colour pill with the `Mountain` icon and the gold plus, just above the point where the moon arc meets the ridge. Only with line of sight on, a ready profile, and the moon arc drawn. A flat moon pill that overlaps the terrain pill of the same kind, or shows the same minute, is dropped.
- **Done when:** unit test with a 5° ridge: the labels have the `getTerrainMoonTimes` times, at about 5° altitude. Component tests: the labels render with a profile and terrain times, not without a profile or while the moon arc is hidden, and a flat pill with the same minute is dropped. In the browser at Innsbruck, 390×844 and 360×800: no pills overlap.
- **Built:** `getTerrainMoonArcLabels` (`arcLabels.ts`) returns the moon position at each terrain time. `SunTracker` passes `terrainMoonTimes` to `SunVisualization`. Test ids: `arc-label-moon-terrain-rise` and `arc-label-moon-terrain-set`. Fix on the way: a moon pill that overlaps a sun pill now steps up until it is clear (max. 3 steps), not only once. Before, at 360×800 the flat moonset pill overlapped the terrain sunset pill. Innsbruck, 2026-09-30 21:00: terrain moonrise 21:01 (flat 20:23), terrain moonset 11:37 (flat 13:19); no pills overlap at 390×844 and 360×800.

### 64. Darker bats — S — **✅ Done**

- **Feedback (2026-09-30):** "bats are not dark enough, give me five different bat versions to choose from".
- **Lookbook:** [Dusk Bats](https://claude.ai/artifact/2LWnCSmscEHtj2mfRjoMeo) (private), versions B1–B5. Pick: **B2, solid silhouette**.
- **Now:** the dusk bats (item 36) and the Halloween bats are a pale grey line at 60 %. They fade into the lavender civil-twilight sky.
- **Spec:** the same `Bat` shape, filled with the bird/bat silhouette colour (`--scene-critter-silhouette`) at 90 %, 0.6 stroke. The Halloween bats get the same look.
- **Done when:** tests: the dusk bat and the Halloween bat have `fill="currentColor"` and the silhouette colour. In the browser at Innsbruck, 390×844: the bats show as dark shapes in civil and nautical twilight and on Halloween night.
- **Built:** `CloudLayer` and `CalendarEggs` render `Bat` with `fill="currentColor"` and `color: hsl(var(--scene-critter-silhouette) / 0.9)`. Checked at Innsbruck on 2026-09-30 at 19:20 and 19:50 (civil and nautical twilight) and on 2026-10-31 at 22:00 (Halloween night).

### 65. Night fish: moonlight and glowing fish — M — **✅ Done**

- **Feedback (2026-09-30):** "I also want some night fish - any ideas?"
- **Lookbook:** [Fish & Currents, Night waters](https://claude.ai/artifact/FoeCu4oaNTnoiBfwqXpUjk#night) (private). Picks: NF1, NF2, NF4, NF5, NF6, NF7, NR1, NR2, NR3, and NF3 (added the same evening).
- **Now:** fish swim from dawn to the end of civil twilight (item 62). In nautical and astronomical twilight and at night there are no fish. The night water is almost black, so a night fish needs light: the moon's, or its own.
- **Night fish** (sizes and speeds are for a near fish; crossing = time to cross a phone; share = part of all night spawns):

  | ID | Night fish | Icon | Size | Speed (%/s) | Crossing | Share | Light | Pattern |
  |---|---|---|---|---|---|---|---|---|
  | NF1 | Moonlit day fish | the item 62 icons (lake species without the minnow school) | as by day | as by day | as by day | 25 | Moon | As by day |
  | NF2 | Burbot | new `Burbot` | 30 px | 1.2 | 92 s | 15 | Moon | Glide |
  | NF3 | Eel | new `Eel` | 36 px | 1.4 | 79 s | 12 | Moon | Glide, no wiggle |
  | NF4 | Lanternfish | new `Lanternfish` | 16 px | 2.2 | 50 s | 30 | Own | Glide, P6 |
  | NF5 | Glowing jellyfish | `Jellyfish` | 18 px | 0.5 | 220 s | 8 | Own | Glide, not in the fish limit |
  | NF6 | Anglerfish | new `Anglerfish` | 26 px | 0.9 | 122 s + rest | 5 | Own | P8 |
  | NF7 | Firefly squid | blue light points, no outline | 7 px each | 2 | 55 s | 5 | Own | School of 4–7 (P5 formation) |

- **Spec:**
  - **NR2 When:** night fish swim in nautical twilight, astronomical twilight and night, in the evening and in the morning. The day fish keep dawn to civil twilight. So there is no gap. The weather rules are the same as by day (item 62: clear to overcast, rain and drizzle; E2 in rain). At the switch from one mix to the other, the fish on screen swim on; only new spawns come from the other mix.
  - **Mix:** `NIGHT_FISH_WEIGHTS` and `pickNightFish(r)` in `weatherEffectsUtils.ts`, built like `pickFish`. The weights are the share column (sum 100). A moonlit day fish (NF1) then picks its species with the day weights of the lake species without the minnow.
  - **Moonlight pool (NF1–NF3):** the moonlit fish are drawn in `--scene-moon` at 70 % opacity (× the distance factor). They show only in a pool under the moon: fully within ±9 % of the width from the moon's x, fading out to ±20 % (a CSS mask on a moonlit layer in `CloudLayer`). A faint light cone on the water shows the pool: 40 % of the width, from the horizon down, `--scene-moon` at 10 %. `SunVisualization` passes the moon's x (as a fraction of the width) and the pool strength to `CloudLayer`.
  - **NR3 Moon phase:** the pool strength = the moon's illuminated fraction (`getMoonPosition().illumination`) × `getMoonCloudFactor`. When the moon is below the horizon or hidden by clouds (strength 0), there is no pool, and no moonlit fish spawn.
  - **Own light (NF4–NF7):** these show anywhere. The outlines are in the moon tone at 45 % stroke opacity. The lanternfish has 5 gold belly lights and the anglerfish one gold lure light, all in `--brand-gold-light` with the boat-light glow. The jellyfish line is pale cyan with a 3 px glow (new token `--scene-fish-jellyfish-glow`). The squid points are blue with a glow (new token `--scene-fish-squid`). Paths for `Burbot`, `Eel`, `Lanternfish` and `Anglerfish` come from the lookbook.
  - **Distance (P3):** as by day. Size and speed × (1 − 0.45 × depth), opacity × (1 − 0.3 × depth), 70–85 % of the height.
  - **NR1 Quiet night:** a spawn check every 15–25 s instead of every 5–8 s (70 % chance, 35 % in rain). At most three fish on screen. A pair or a school counts as one, and the jellyfish does not count.
  - **Motion rule** (item 15): every night fish glides straight. The anglerfish rests on the way, like the pike (P8). There is no drift.
  - **Not picked:** NF8 (glow trail).
- **Done when:**
  - Tests: the night weights and `pickNightFish`; night fish only in nautical twilight, astronomical twilight and night; no moonlit spawn when the pool strength is 0; NR1 blocks a fourth fish but not a jellyfish; the lanternfish and anglerfish lights render.
  - In Chromium at 390×844 in Ravensburg, on a night with the moon up: the moonlit fish show only in the pool under the moon, the lanternfish lights glow, and with the moon down only the glowing fish swim.
- **Built:**
  - `sceneIcons.ts`: `Burbot`, `Eel`, `Lanternfish`, `Anglerfish` and `FireflySquid` (a filled point). `index.css`: `--scene-fish-jellyfish-glow` and `--scene-fish-squid`.
  - `weatherEffectsUtils.ts`: `NIGHT_FISH_WEIGHTS`, `pickNightFish`, `pickMoonlitDayFish` and `MAX_NIGHT_FISH`. `canSpawnFish` takes the limit as a parameter.
  - `SunVisualization.tsx`: the pool strength (`moonPool` = illumination × `getMoonCloudFactor` × `getReflectionFade`) and the light cone (a radial gradient on a rect twice the water's height, so it has no hard edge). It passes `moonlight` (x and strength) to `CloudLayer`.
  - `CloudLayer.tsx`: the night mix from nautical twilight on, with a check every 15–25 s. `createFish` takes a `night` flag: `light` is `'moon'` or `'own'`, with no depth haze and no E1 spot. The moonlit fish swim in a layer masked around the moon, at the pool's opacity. The layer is always rendered, so a fish can always finish its crossing and be removed. The glowing fish carry `lights` (gold circles, like the boat lights) or a `drop-shadow` halo (jellyfish, squid).
- **Checked:** 9 new unit tests (699 in all), lint, typecheck and build pass. In Chromium at 390×844, Ravensburg, clear, 2026-09-27 00:30 (full moon at 47°): all seven night kinds spawned. The moonlit day fish (classic, trout), the burbot and the eel were in the pool layer, whose mask was centred on the moon (46 % of the width) at full strength. A lanternfish pair showed its 10 gold lights. The first cone had hard side edges; it now fades out softly.


### 66. Calm fish: slower, and phone speed on wide screens — S — **✅ Done**

- **Feedback (2026-10-01):** "some fish are very fast, that it doesnt really feel very calm anymore, please analyze and challenge". Seen on a desktop Mac.
- **Analysis:**
  - Item 40 slowed the boats to 0.9–1.8 % of the width per second, but the fish kept the old 2.5 %/s, and item 62 added faster ones (trout 2.8, minnow school 3.0). 89 % of the day spawns were faster than the sailboat (1.2 %/s). The night fish repeated this (lanternfish 2.2, squid 2.0).
  - Speeds are a share of the width, so a wide screen moves 3–5× more pixels per second than a phone. At 1440 px, a near trout moved 40 px/s.
  - The fastest fish was 7.5× the slowest, all in one 15 %-high band, so fish kept overtaking each other. Minnows and squid covered more than one body length per second, which looks like darting.
  - Density is not the cause: the five-fish limit (E4) was already full all the time (without it, about 10 fish would be on screen), and it stays full at the new speeds. Only the turnover halves.
- **Spec:**
  - No fish faster than the sailboat: every speed × 0.45, at most 1.2 %/s, at least 0.4 %/s (fish already slower keep their speed). Day: classic 1.15, minnow 1.2, perch 1, pike 0.9, carp 0.7, catfish 0.5, trout 1.2, ray 0.7, turtle 0.55, jellyfish 0.4, seahorse 0.4, whale 0.4, pufferfish 0.45. Night: burbot 0.55, eel 0.65, lanternfish 1, anglerfish 0.4, squid 0.9. These replace the speed columns of items 62 and 65.
  - Wide screens: fish and boats move at most at a 430 px phone's pixels per second (`getWaterSpeedFactor` = min(1, 430 / window width)). Phones are not affected. Birds and leaves are not changed.
- **Built:** the speeds in `FISH` (`CloudLayer.tsx`); `PHONE_WIDTH_PX` and `getWaterSpeedFactor` (`weatherEffectsUtils.ts`), applied in `createFish` and to the boat crossing time.
- **Checked:** 4 new tests (704 in all), lint, typecheck and build pass. In Chromium at 1440×900 (Ravensburg, 11:00): a near minnow school moved 4.6 px/s and a far trout 3.3 px/s, as planned. On this width a near fish now takes about 4–5 min to cross, and a near sailboat about 5 min.

### Backlog promoted (2026-10-01)

- **Decision (2026-10-01):** "put german, spanish, italian and french on the roadmap and the share card feature as premium and the sunset reminder notification".

### 67. UI in five languages: English, German, Spanish, Italian, French — L — **✅ Done**

- **Now:** all UI text is English and hard-coded in the components.
- **Spec:**
  1. Languages: `en` (fallback), `de`, `es`, `it`, `fr`. One flat dictionary per language in `src/i18n/<lang>.ts`, with the same keys. A small `t(key, vars)` function and a `useLanguage` context. No new dependency.
  2. The default comes from `navigator.language` (the first two letters). Languages that are not in the list use `en`.
  3. A language picker in the InfoPanel. Save the choice in `localStorage` (`language`), with try/catch.
  4. Translate all visible text, the `aria-label`s, the tooltips, the toasts, the loading screen and the feedback form.
  5. Dates, times and numbers use `Intl` with the chosen language. The place names use the language parameter of BigDataCloud (`localityLanguage`) and the Open-Meteo geocoding API (`language`).
  6. Set `<html lang>` to the chosen language. The manifest stays English.
  7. Item 16: the Play Store listing and the privacy policy in the same five languages.
- **Done when:** a test fails when a key is missing in a dictionary or is not used. In the browser, `de-DE`, `es-ES`, `it-IT` and `fr-FR` show the full UI in that language, with no English left, and the panel layout does not break with the longest strings (390×844 and 360×640).
- **Note:** this touches almost every component. Build it alone, not in parallel with other UI items. A native speaker should review the four translations.
- **Built:**
  - `src/i18n/en.ts` is the source of the keys (229 flat keys, for example `reminder.toggle`). `de.ts`, `es.ts`, `it.ts` and `fr.ts` are typed `Record<keyof typeof en, string>`, so a missing or extra key is a type error. `translate(language, key, vars)` (`src/i18n/index.ts`) fills `{name}` placeholders and leaves a placeholder without a value visible. `formatNumber` gives the decimal separator of the language. No new dependency.
  - `src/utils/language.ts`: `getDefaultLanguage` (the first two letters of `navigator.language`, else `en`), `loadLanguage` / `saveLanguage` (`localStorage` `language`, with try/catch), the same pattern as `temperatureUnit.ts`.
  - `SunTracker` holds the language in state, sets `<html lang>`, and gives `{ language, setLanguage, t }` to the components below it through `LanguageContext` (`useLanguage`). Without a provider (tests) the texts are English. The 404 page and the error page are outside SunTracker and read the saved language directly.
  - The picker is a row "Language" at the bottom of the InfoPanel, above "Send feedback": `EN DE ES IT FR` in the style of the °C/°F toggle, each button with the language's own name as `aria-label` and tooltip.
  - Translated: all panel text, `aria-label`s and tooltips, the toasts, the loading screen, the install prompt, the radio, the scene (sun button, compass chips such as `NO`/`SO` in German, the sun altitude pill, the countdown pill, the moon pill), the reminder notification, the share card, the Sentry feedback form (through `createForm` options) and the error and 404 pages. "Sun Chaser" stays as it is.
  - Pure utils return keys instead of English text: `getTimeOfDayLabel`, `getMoonPhaseLabel`, the WMO weather map (`WeatherData.conditionKey`) and the sunset score (`clouds` and `horizon` keys, shown with `getScoreReason`). A weather cache entry from before this item has English text, so it counts as a miss.
  - Dates, times and numbers use `Intl` with the language: `formatTime(date, language)` (24-hour in all five languages, as before), the moon dates, the time-travel clock, the share-card date, the coordinates, the altitudes and azimuths and the moon illumination (`70 %` in German and French).
  - Place names: BigDataCloud gets `localityLanguage` and runs again when the language changes. The Open-Meteo search gets `language`. A place picked from the search before keeps the name in the language it was saved in.
  - Fix on the way: the open Moon section with the line-of-sight block was taller than its `max-h-64` and ran into the next section (also in English); it is now `max-h-[40rem]`.
  - Not built here: spec step 7 (the Play Store listing and the privacy policy in five languages) belongs to item 16, which has no listing or policy text yet.
- **Checked:** 26 new tests (766 in all): every dictionary has exactly the keys of `en` and the same placeholders, every `en` key is used in `src/`, `translate` and `formatNumber`, the language default and storage, the share card and the reminder text in German, the Open-Meteo `language` parameter, the old weather cache, and in `SunTracker` a `de-DE` browser starts in German, sets `<html lang="de">` and a tap on "Français" switches and saves `fr`. Lint, typecheck and build pass. In headless Chromium with the context locale `en-US`, `de-DE`, `es-ES`, `it-IT` and `fr-FR` (Ravensburg, 2026-10-01 18:20 and 23:30, all sections open, manual weather, both line-of-sight blocks): the full panel at 390×844 and 360×640, and the loading screen, show no English text in the four languages, and no row breaks out of the panel. The longest rows ("Sonnenuntergang", "Coucher du soleil" with three buttons) stay on one line at 360 px. The translations still need a review by native speakers.

### 68. Share card: today's sunset as an image — M — Premium — **✅ Done**

- **Spec:**
  1. A "Share" button in the Sunset row of the InfoPanel, with the gold plus (item 35). Free while `PREMIUM_ENFORCED` is false. Item 14 adds it to the gated list.
  2. Draw a 1080×1350 PNG in a `<canvas>` (no DOM screenshot, no new dependency): the sky gradient of the sunset, the sun disc on the horizon, the terrain silhouette when line of sight has a profile, the place name, the date, the sunset time (the line-of-sight time when there is one, plus the flat time), the sunset score, and the app mark.
  3. Share the file with the Web Share API (`navigator.canShare({ files })`). When it is not available, download the PNG.
  4. No coordinates on the card, only the place name.
  5. Colours come from the scene tokens, so the card looks like the app.
- **Done when:** unit tests for the card layout data (texts, which times show). In the browser, the button gives a PNG with the expected content for Ravensburg (flat) and Sion (terrain). On an Android phone the share sheet opens.
- **Built:** `getShareCardData` (`shareCard.ts`) selects the texts: the place name (no coordinates), the date, the line-of-sight sunset with the flat time and the difference, or only the flat time when there is no profile, and the score of the day of the shown sunset. `drawShareCard` draws the 1080×1350 PNG with the scene tokens (`getComputedStyle`): the dusk sky, the sun disc on the horizon or the ridge, the ridge (90° around the sunset azimuth), and the app mark. `shareOrDownload` uses `navigator.canShare({ files })`, else it downloads the PNG; a cancelled share sheet ends quietly. `ShareCardButton` (lucide `Share2`, gold plus) sits after the bell in the Sunset row. It does not show at polar day or night. `SunTracker` passes `horizonProfile` to the InfoPanel.
- **Checked:** 13 new tests (720 in all), lint, typecheck and build pass. In headless Chromium at 390×844, 2026-10-01 14:00: the Share button sits in the Sunset row. Ravensburg: the card shows line of sight 18:55, flat 19:03 (−9 min), a low ridge and the score. Sion: line of sight 18:36, flat 19:13 (−37 min), with the real ridge from AWS terrain tiles. Headless Chromium has no `canShare`, so both cards came as a download. The Android share sheet is not checked yet.

### 69. Sunset reminder notification — S — **✅ Done**

- **Decision (2026-10-01):** "no i dont want a server part, specify item 69 without server just a po up notification a fixed time before the sunset".
- **Spec:**
  1. A bell option in the Sunset row: "Remind me 15 minutes before sunset". The lead time is fixed (`SUNSET_REMINDER_MIN = 15`). The app asks for the notification permission only when the user turns it on. Save the choice in `localStorage` (`sunset-reminder`), with try/catch.
  2. No server and no Web Push. The app sets a timer to the next reminder time (the line-of-sight sunset when there is one, else the flat sunset, minus 15 minutes). At that time it shows a system notification with `registration.showNotification` of the service worker: "Sunset in 15 minutes, at HH:MM". A tap opens or focuses the app.
  3. Browsers slow down timers in background tabs. So the app also checks the time on `visibilitychange` and once a minute, and shows the notification when the reminder time has passed by less than 5 minutes and it has not shown it for that sunset yet.
  4. After the sunset, set the timer for the next day. Time travel (item 44) does not trigger a reminder. No sunset (polar day or night): no reminder.
  5. When the browser has no Notification API, or the permission is denied, hide the option or show it as off with a short hint.
- **Limit:** the reminder only comes while the app is open, also in the background. When the user closes the app or the system stops it, no reminder comes. The option text says this: "while the app is open".
- **Done when:** unit tests for the reminder time (line-of-sight and flat sunset, time zones, no sunset, a reminder time that has passed). In the browser with a fake clock, the notification shows 15 minutes before sunset, once. On an Android phone, the notification comes with the app in the background.
- **Built:**
  - `src/utils/sunsetReminder.ts`: `SUNSET_REMINDER_MIN = 15`, `getReminderTime` (the sunset minus 15 min, null without a sunset), `isReminderDue` (the reminder time has passed by less than 5 min and the reminder for that sunset day is not shown yet) and `getReminderText` ("Sunset in 15 minutes, at 18:57").
  - `src/hooks/useSunsetReminder.ts` sets a timeout to the reminder time, checks once a minute and on `visibilitychange`, and shows the notification with `registration.showNotification`. Without a service worker registration (the dev server) it uses `new Notification`. One key per sunset day, so a line-of-sight time that comes in after the flat one does not show a second reminder.
  - `public/sw-notification-click.js` (loaded with workbox `importScripts`) focuses an open app window on a tap, else opens the app.
  - `SunTracker` owns the toggle (`localStorage` `sunset-reminder`) and uses the countdown target from item 43 (`getCountdownTarget`), so the reminder follows the line-of-sight sunset when there is one. The reminder runs only in live time (`isTimePreview`). After the sunset there is no target until the day changes; then the sunset of the new day sets the next timer.
  - InfoPanel Sunset row: an `AlarmClock` button (`AlarmClockCheck` when on) next to the countdown bell, `aria-label` and tooltip "Remind me 15 minutes before sunset (while the app is open)". The tap that turns it on asks for the permission and shows a toast with the "while the app is open" limit. Without the Notification API the button is hidden. With the permission denied it stays off and a toast tells the user to allow notifications in the browser settings.
- **Checked:** 17 new tests (724 in all), lint, typecheck and build pass. In Chromium at 390×844 with a fake clock (Ravensburg, 2026-09-30, from 18:30): the line-of-sight sunset is 18:57:14. One notification "Sunset in 15 minutes, at 18:57" came at 18:42:13, and no second one until 19:07. At 360×640 the row fits with both buttons. The Android check with the app in the background is still open.

### Fish follow-up (2026-10-01)

### 70. More room on wide screens — S — **✅ Done**

- **Feedback (2026-10-01):** "as they are so slow we can raise the limit for fish and boats, what do you propose?" Then: "build the full rule and lets review it if it gets too crowded".
- **Now:** since item 66, a crossing on a wide screen takes as long as the width needs at phone speed (3.35× longer at 1440 px). The limits (5 fish, 3 at night, 3 boats) stayed, so at 1440 px there was one fish per 290 px of water (a phone has one per 80 px), and a new fish came only about every 100 s.
- **Spec:** the limits count per 430 px of width (`getWaterLimit` = round(limit / `getWaterSpeedFactor`)). A phone keeps 5 fish, 3 night fish and 3 boats. At 1280 px: 15, 9, 9. At 1440 px: 17, 10, 10. At 1920 px: 22, 13, 13. The spawn timing does not change: at 1440 px a new fish comes about every 30 s. The boats come about once a minute, so they stay at about 6 on average, below their limit.
- **Review:** Lutz checks on his Mac whether it gets too crowded. If it does, the fallback is half the rule (8 fish, 5 night fish, 5 boats at 1440 px).
- **Built:** `getWaterLimit` (`weatherEffectsUtils.ts`), used for the fish limit (day and night) and the boat limit in `CloudLayer`.
- **Checked:** 4 new tests (707 in all), lint, typecheck and build pass. The limit tests now pin a phone width (390 px) or a wide one (1290 px), because jsdom's window is 1024 px. In Chromium at 1440×900, after two simulated minutes: 12 fish groups (25 fish) on screen.

### 71. Fish and boats over the whole water — S — **✅ Done**

- **Feedback (2026-10-01, on the item 70 preview):** "i like it but it feels a bit crowded vertically in the middle, so no fish or boats near the horizon and no fish in the front".
- **Now:** the water runs from the horizon (65 % of the height) to the bottom of the screen. The fish used only a band from 70 % to 85 %, and the boats' waterlines were spread evenly over 67–87 % (94 % in fullscreen). Everything met in the middle, and the front (85–100 %) stayed empty.
- **Spec:**
  - Fish use the whole water: far fish just below the horizon (67 %), near ones in the front (93 %), ±1 %. Day and night.
  - More boats far out: the distance is √random, so 44 % of the boats sail in the farthest quarter, small and pale near the horizon, and big near boats mid-water are rarer. The waterline range stays (67–87 %, 94 % in fullscreen), so boats still go below the music player only in fullscreen.
- **Built:** `createFish` (`y` = 67 + (1 − depth) × 26 ± 1) and the boat spawn (`depth = Math.sqrt(Math.random())`) in `CloudLayer.tsx`.
- **Checked:** 1 new test, the fish height test updated (708 in all); lint and typecheck pass. In Chromium at 1440×900, after six simulated minutes: 22 fish groups at 68–94 % of the height, 5 boats at 70–79 %.

### 72. Overcast: a faint sun in the light patch — S — **✅ Done**

- **Feedback (2026-10-01):** "somehow the sund and moon are not visible anymore seems like there is a layer over it". Friedrichshafen, 11:27, weather code 3 (overcast) at 100 % cloud cover. Item 50 hides the disc when overcast, so only the white light patch showed. Then: "it still is too visible, make different versions with 5%, 10% and 20% visibility", and after the comparison: "do the 30%".
- **Bug found:** the sun button's `animate-glow` animates its opacity (1 ↔ 0.8), and that overrode the inline cloud opacity on the same element. So the disc never dimmed: cloudy (item 50, 80 %), drizzle and snow (item 59, 70 %) all showed at 80–100 %.
- **Spec:**
  - Overcast: the disc at 30 % opacity, mixed 60 % toward the overcast grey (`getSunVisibility('overcast')` = disc 0.3, halo 0.6, haloScale 1.2, pale 0.6). Fog and rain still hide the disc.
  - A faint disc (below 50 %) keeps the white light patch and gets no water glints, as with no disc.
  - The cloud opacity sits on the `Sun` icon, not on the animated button.
- **Built:** `getSunVisibility` (`weatherEffectsUtils.ts`); `sunShines` and the opacity on the `Sun` icon (`SunVisualization.tsx`).
- **Checked:** 1 new test (726 in all), lint and typecheck pass. In Chromium at 390×844 (Friedrichshafen, 2026-10-01 11:27, overcast): versions at 5, 10, 20 and 30 % compared; 30 % shows the rays faintly in the light patch.

### 73. Fleet in soft light — S — **✅ Done**

- **Feedback (2026-10-01):** "I dont like the ships design, can you do a lookbook with different style options".
- **Lookbook:** [Fleet Styles](https://claude.ai/artifact/LUB956QVNV8UDZy6g4ii5S) (private), styles B1–B6 and add-ons X1–X2. Picks: **B3, X1, X2**, with a rule for X2: "wake only if a ship goes really fast, like a sailboat with a lot of wind in the storm, never for the canoe, ferries and freighters can always have it".
- **Now:** the five boats (item 36) are lucide line icons in one grey ink. Next to the soft sun, the blurred clouds and the solid birds and bats they look like UI icons, and at sunset the grey line almost disappears into the water.
- **Spec:**
  - **B3 Soft light:** new drawings of the same five boats on one 64 × 37 grid (waterline y 36, bow to the right), in flat colours with soft gradients lit from the upper left. New tokens `--scene-boat-*`. Each hull keeps the length of its old icon (`BOATS` scale: sailboat, fishing boat and rowboat 1, ferry 1.1, freighter 1.4).
  - The light: one palette all day, dimmed by a CSS filter (`getBoatTone`): day as drawn; dawn and evening ('sun') slightly dimmer, with peach sails; civil twilight 72 %; nautical twilight to night 36 %. The gold lights (item 36, V3) stay bright: mast lights, and the windows of the ferry, the fishing boat and the freighter.
  - **X1 Reflection:** every boat has a faint, still mirror image under the waterline (28 %, slightly blurred, fading out downward).
  - **X2 Wake:** two thin pale lines from under the stern (`hasBoatWake`). The ferry and the freighter always; the sailboat only in strong wind (> 40 km/h); the rowboat never. The fishing boat was not named and has none.
  - **Storm:** then: "only ferries and freighters in a storm but no sail boats". A storm now sends out the ferry and the freighter, each with its wake (`pickBoat`). Hail still has no boats.
  - **Strong wind in manual weather:** "is there a weather option for fair weather with strong wind?" Manual Weather gets a "Strong wind" switch under the ten types (`weather.strongWind`, in all five languages). On, the wind is 50 km/h: leaves, slower birds, no rowboat and the sailboat's wake. Off, manual mode is calm (0 km/h). Before, manual mode used the last real wind reading.
  - The motion does not change: the same straight glide at the same speeds.
- **Built:** `SceneBoat.tsx` (drawings, gradients, reflection, wake, lights); `hasBoatWake` and `getBoatTone` (`weatherEffectsUtils.ts`); `CloudLayer` renders `SceneBoat` and lets boats out in a storm; the "Strong wind" switch in `InfoPanel`, with `MANUAL_STRONG_WIND_KMH` in `SunTracker`. The line icons `LakeFerry`, `FishingBoat`, `Rowboat` and `Freighter` are removed from `sceneIcons.ts`.
- **Checked:** 9 new tests (775 in all after merging item 67), lint and typecheck pass. In Chromium at Ravensburg with faked weather: at 1280×800, 2026-10-01 18:30 (evening, clear, wind 50 km/h), 7 sailboats and a ferry sailed with peach sails, reflections and a wake, and a fishing boat without one. At 390×844, 21:40 (night, wind 10 km/h), a sailboat and a rowboat sailed dark, with their gold lights and no wake. In manual mode at 1280×800, midday: Clear with "Strong wind" on brought leaves, and the sailboats and the ferry had a wake (the fishing boat none); with the switch off the sailboats' wakes went away; Storm sent out only ferries and freighters, each with a wake.


### 74. Birds: species, calm flight patterns and seasons — M — **✅ Done**

- **Feedback (2026-10-01):** "I also want some different bird options please create a lookbook". After the picks: "implement, check, then commit & merge".
- **Lookbook:** [Birds & Skies](https://claude.ai/artifact/EwCnAdSnNQajofsY4s6VDm) (private). Picks: W1, W3, W4, W5, W6, W7, W9, W10, W14, M1–M8, C1–C4.
- **Now:** one gull shape (black at 60 %, 34 px) flies straight across at 5 % of the width per second: 4× the sailboat, and 72 px/s on a 1440 px Mac. A check every 3–5 s (80 %), so about five birds are in the sky. The bats fly at the same pace.
- **Birds** (a near bird on a phone; crossing = time to cross a phone; share = part of the day spawns):

  | ID | Bird | Size | Speed (%/s) | Crossing | Share | Group | Months (C1) |
  |---|---|---|---|---|---|---|---|
  | W1 | Black-headed gull | 34 px, today's shape | 2.5 | 44 s | 38 | alone | all year |
  | W3 | Grey heron | 46 px | 1.6 | 69 s | 10 | alone | all year |
  | W4 | White stork | 50 px | 1.8 | 61 s | 8 | pair (M4) | Mar–Aug |
  | W5 | Mute swan | 46 px | 2.2 | 50 s | 8 | pair (M4) | all year |
  | W6 | Greylag geese | 22 px each | 2.2 | 50 s | 10 | V of 5–9 (M5) | Mar–Apr, Sep–Nov |
  | W7 | Cormorant | 30 px each | 2.4 | 46 s | 10 | line of 3–5 (M6) | all year |
  | W9 | Kestrel | 24 px | 2 | 55 s + stop | 8 | alone, hangs in the wind (M8) | all year |
  | W10 | Starling flock | 7 px each, always far | 2 | about 90 s | 8 | cloud of 18–30 (M7) | Sep–Nov, the hour before sunset only (C2) |
  | W14 | Geese across the moon | 20 px each | 2 | 55 s | night only | V of 5–9 (M5) | Mar–Apr, Sep–Nov |

- **Spec:**
  - **Silhouettes:** `SceneBird.tsx`, side view, facing right, wings raised in a glide, on a 48 × 24 grid, filled with `--scene-critter-silhouette`. The gull keeps today's shape. The colour and the opacity sit on the whole bird or group, so overlapping wings show no darker seams.
  - **Mix:** `BIRD_WEIGHTS` and `pickBird` (`weatherEffectsUtils.ts`), with `pickWeighted` like the fish and boats. The shares are the lookbook shares of the picked birds, scaled to 100.
  - **M2 Calmer pace:** the speed column replaces 5 %/s for all. The bats fly 2.5 %/s. Strong wind still slows every flyer to 60 % (item 10).
  - **M3 Distance:** a random depth, like the fish and boats: size and speed × (1 − 0.45 × depth), opacity 0.6 × (1 − 0.3 × depth). Near birds fly high (centre at 20 % of the height), far ones lower (50 %), ±2 %, well above the horizon (65 %). Far birds are drawn first. The bats keep today's look: near, at 20–50 %.
  - **M4–M7 Groups:** fixed shapes in bird widths, the leader in front. Pair: (0, 0) and (−1.15, −0.32). V: two arms of 2–4 at (−0.8 i, ∓0.38 i). Line: 3–5 at (−1.05 i, 0.3 i). Flock: 18–30 at random in an 8 × 3.2 ellipse. A group is one spawn.
  - **M8 Hang in the wind:** the kestrel slows down over 3 s, stops with its left edge at 35–65 % of the width for 3–5 s, and glides on (`getRestStopMotion`, as the fish rest stop P8).
  - **C1 Seasons:** `isBirdInSeason`, by the month of the shown date. South of the equator the months shift by six.
  - **C2 Evening flight:** in the hour before sunset (`'evening'`), the spawn chance is 93 % instead of 70 %. The starling flocks come only then.
  - **C3 At most four:** a check every 8–12 s (was 3–5 s), 70 %. At most `getWaterLimit(4, width)` birds or groups: 4 on a phone, 13 at 1440 px. The bats count too.
  - **C4 Wide screens:** speeds × `getWaterSpeedFactor`, like the fish and boats (item 66).
  - **W14 Geese across the moon:** in full night, in fair weather, in the geese months, while the moon disc shows (the new `moon` prop from `SunVisualization`, in % of the scene). A check every 30 s, 12 % (about every four minutes), one V at a time. The V flies at the moon's height, dark at 90 %, so it shows against the moon. Full night has no other flyers.
  - **Not picked:** W2 swallow, W8 red kite, W11 osprey, W12 bearded vulture, W13 barn owl, M9 thermal circle, C5 white birds.
  - **Motion rule** (item 15): the birds never flap, dive, swirl, chase each other or fly right to left.
- **Bug found:** since item 62 the fish style set `animationTimingFunction: fishItem.easing`. For a fish without a rest stop that is `undefined`, and React writes it as an empty value. That wiped the `linear` of the `animation` shorthand, so these fish moved with CSS's default `ease`: quick at first, slow near the right edge. Now the longhand is set only with a stop, for fish and birds. jsdom does not expand the shorthand, so only the browser check shows this.
- **Built:** `SceneBird.tsx`; `BirdKind`, `BIRD_WEIGHTS`, `isBirdInSeason`, `pickBird` and `MAX_BIRDS` (`weatherEffectsUtils.ts`); `BIRDS`, `createBird` and the bird spawn and render in `CloudLayer.tsx` (`BIRD_RATE_PERCENT_PER_SEC` is gone); the `moon` prop in `SunVisualization.tsx`.
- **Checked:** 10 new tests, and 3 bat tests moved to the new timing (785 in all); lint and typecheck pass. In Chromium, Ravensburg, clear, 2026-10-01:
  - 390×844, 11:00, about 7 simulated minutes: gulls, geese, a heron, swans, cormorants and kestrels flew; no storks (out of season) and no starlings (midday); never more than 4 groups.
  - 18:25, the hour before sunset: starling flocks of 18 and 28, a V of 7 geese and a swan pair, at 36–46 % of the height.
  - 00:30, night: a V of 8 geese crossed the moon at its height (35 %).
  - 19:15, civil twilight: 4 bats, 38 px, 2.5 %/s.
  - 1440×900, 11:00: birds at 5–11 px/s (was 72 px/s). After the fix, every bird, fish and boat moved linearly at its planned speed.
  - No console errors.

### 75. Chrome's auto dark mode darkens the scene — S — **✅ Done**

- **Feedback (2026-10-01, Sentry SUN-CHASER-H):** "I have dark mode in my chrome and the halo around the sun's is not white but dark". Then: "its the same with the white of the boats".
- **Now:** the app has no dark mode of its own (`darkMode: ["class"]`, and nothing sets `.dark`) and does not declare a `color-scheme`. Chrome's "Auto Dark Mode for Web Contents" then repaints the page: the light sun halo turns dark, the boats' white cabins turn dark and their navy roofs and masts turn pale. The compass ticks, the label rings and the music switch change too.
- **Spec:** `:root { color-scheme: only light; }` (`src/index.css`). `only light` tells Chrome that the page must not be darkened. The scene already paints its own day and night.
- **Built:** the one line in `src/index.css`.
- **Checked:** in Chrome with `--enable-features=WebContentsForceDark` and a dark system theme, Ravensburg, 2026-10-01 13:00, clear: before the fix the halo was a dark ring; after it, the halo is pale yellow-white as in light mode. On a near fishing boat at 3× scale, the fix restores the white cabin, the navy roof and the navy mast. Lint, typecheck and tests pass.

### Feedback round (2026-10-02)

Four Sentry reports from the evening and night of 2026-10-01, all from Ravensburg on release `6e12461`. Request: "please spec all 4 of them, lets make a comparison of moon visibility, completely redo the rain animations, create a lookbook and spec a screenshot like behaviour for the share feature, and create a lookbook as well for different wave options depending on wind strength". Items 76, 77 and 79 have a lookbook, with Lutz's picks (2026-10-02) in each item. Item 78 has a full spec.

### 76. The moon stays findable behind clouds — S — [SUN-CHASER-M](https://ainabler.sentry.io/issues/SUN-CHASER-M) — **✅ Done**

- **Feedback (2026-10-01 23:42):** "Can't see the moon anymore". Then: "lets make a comparison of moon visibility".
- **Now:** not a regression. Item 57 works as built: `getMoonCloudFactor` uses the stars' cloud factor (1 − cover), with a floor of 0.15 under partial cover, cloudy and overcast; storm and fog hide the moon. At the reported time Ravensburg had light rain (code 61) at 97 % cover. The moon was 21° high and 69 % lit, and showed at 11 % opacity (76 % on a clear night). Manual weather has no cover value, so manual rain, drizzle, snow and hail give 0: the moon is not drawn at all. The moon div paints above the clouds (DOM order, no z-index), so the clouds never cover it; the factor fades it. The moon arc and the altitude chip show in every weather.
- **Comparison:** [Moon Visibility](https://claude.ai/artifact/Wp4kWonKagqoTXLpw6dX2m) (private): 11 weathers × 6 options, a phase slider, a phone close-up. Options: MV1 today; MV2 a floor of 0.35; MV3 the moon behind passing clouds (clouds above the moon, new slow crossing motion); MV4 glow through clouds; MV5 a halo ring in partly and cloudy weather; MV6 at least 0.5. Add-ons: X1 a "Behind clouds" chip, X2 a silver lining on clouds near the moon, X3 a brighter moon arc while the moon is dim.
- **Disc opacity at the reported phase** (live mode, CloudLayer's default cover per type):

  | Weather | MV1 | MV2 | MV3 (under a cloud) | MV4 | MV6 |
  |---|---|---|---|---|---|
  | clear | 76 | 76 | 76 | 76 | 76 |
  | partly | 57 | 57 | 76 (61) | 57 | 57 |
  | cloudy | 34 | 34 | 76 (56) | 34 + glow | 38 |
  | overcast, rain, hail | 11 | 26 | 53 (15–22) | 19 + glow | 38 |
  | drizzle, snow | 15 | 26 | 53 (26–28) | 19 + glow | 38 |
  | fog | 0 | 0 | 0 | glow only | 0 |
  | storm | 0 | 0 | 0 | 0 | 0 |

- **Picks (2026-10-02):** "Moon picks: MV4, X2".
- **Spec:**
  - **MV4 Glow through clouds:** the disc keeps at least 0.25 of its clear opacity in every weather except storm (manual rain included). When the item-57 factor is below 0.5, a soft corona in `--scene-moon` (radius 3.5 × the disc radius) shows around the disc. Fog: the corona only, 5 × the radius, no disc. Storm: no moon, as now.
  - **X2 Silver lining:** clouds within 4.5 × the disc radius of the moon get a pale rim in `--scene-moon`. `CloudLayer` already has the moon's place (the `moon` prop, item 74).
  - The cloud motion, the moon arc and the chip do not change. The moon reflection and the moonlight pool keep the item-57 factor.
- **Done when:** a test for the disc floor and the corona per weather type (live and manual). In the browser at 23:42 on 2026-10-01 (rain, 97 %), the moon is findable at a glance; in fog only the glow shows; in a storm nothing shows.
- **Built:**
  - `getMoonLook` (`weatherEffectsUtils.ts`) gives the disc factor (the item-57 factor, at least 0.25 except in storm and fog) and the corona (strength 1 at 3.5 radii while the factor is below 0.5; fog 0.5 at 5 radii; storm none).
  - `SunVisualization` draws the corona (`data-testid="moon-corona"`, a radial gradient in `--scene-moon`: 0.32 × strength × brightness at the centre, 0.13 at 40 %, 0 at the edge) under the disc (`data-testid="moon-disc"`). The reflection bars and the moonlight pool keep `getMoonCloudFactor`. The Halloween pumpkin moon follows the disc. `CloudLayer` gets `moon` while the disc or the corona shows, now with the radius (px) and the brightness; the night geese still fly only in fair weather.
  - `getCloudMoonlight` (`cloudLayoutUtils.ts`) maps the moon into each cloud's 120 × 60 svg units. A cloud within reach gets a second copy of its path, filled with a radial gradient in `--scene-moon` (0.85 × brightness at the centre, 0.32 at half the radius, 0 at 4.5 radii), as in the lookbook.
- **Deviations:** the silver lining brightens the parts of a cloud near the moon (as in the lookbook), not only its edge ("rim" in the spec). It is placed from the cloud's resting place, so the light rides along the cloud's ±6 vw sway (a `ponytail:` note in `getCloudMoonlight`).
- **Checked:** 10 new tests (825 in all), lint, typecheck and build pass. In Chrome at 1280×800, Ravensburg, 2026-10-01 23:42 (moon 21° high, 69 % lit, disc radius 22 px): clear 0 %: disc 0.756, no corona. Live rain at 97 % cover: disc 0.189 (was 0.11), a 155 px corona, 2 lit clouds; the moon is findable at a glance. Manual Rain: disc 0.189 and the corona (was no moon at all). Manual Overcast: 0.189 and the corona. Manual Cloudy: disc 0.302 and the corona, 1 lit cloud. Manual Fog: no disc, a 222 px corona (faint under the fog band). Manual Storm: nothing. No console errors.

### 77. Rain, redone — M — [SUN-CHASER-J](https://ainabler.sentry.io/issues/SUN-CHASER-J) — **✅ Done**

- **Feedback (2026-10-01 19:51):** "Rain should be a constant drizzle not stopping every few seconds and depending on how much rain falls more or less and depending on the wind straight or from the side". Then: "completely redo the rain animations, create a lookbook".
- **Now:**
  - **The gaps (bug):** each drop's style sets `animationDelay`, then the `animation` shorthand (`CloudLayer.tsx` ~861). The shorthand resets the delay: in Chrome `getComputedStyle(drop).animationDelay` is `0s` on all 80 drops, so they fall in step. The drops also start 10–110 % of the height above the top and fall 100vh per loop. Measured every 100 ms, the drops on screen climb from 2 to 73 of 80 and drop to 0, every 2.5 s (drizzle every 3 s). 7 drops never come into view. Snow and hail set their delay the same way and fall in step too.
  - **Amount:** only by type (drizzle 35 drops, rain 80, storm 100). The forecast amount is not fetched.
  - **Wind:** `--slant` moves the drops sideways by at most 60 px over the fall (about 4°). The streaks are never tilted.
- **Lookbook:** [Rain Styles](https://claude.ai/artifact/9ct7DNppTsMoHdzNQNzjcp) (private), with live intensity, wind and time-of-day controls. Styles: R1 steady CSS streaks in 3 layers; R2 canvas rain with depth; R3 a soft veil for drizzle; R4 rain curtains toward the horizon; R5 canvas rain with rings on the water; R6 depth layers. Add-ons: X1 the amount from the forecast, X2 the wind angle, X3 rings on the water, X4 horizon mist, X5 darker with more rain, X6 gusts.
- **Picks (2026-10-02):** "Rain picks: R6, X1, X2, X3, X4, X5".
- **Spec:**
  - **R6 Depth layers:** one `<canvas>` for drizzle, rain and storm, with one `requestAnimationFrame` loop (the frame ID in a `useRef`, CLAUDE.md gotcha). Three layers: a far veil band that thickens toward the horizon, middle streaks that end on the water at their depth, and a few soft near streaks. A drop that leaves the scene starts again at the top, so the amount on screen never changes. No rain: no canvas, no loop. Reduced motion: one still frame. The `precipDrops` divs, their `PRECIP_COUNT` entries and `@keyframes fall` go.
  - **X1 Amount from the forecast:** add `precipitation` to `current=` (`weatherUtils.ts`). It is in mm per `current.interval` (900 s), so mm/h = value × 4. Without a value, the weather code sets it: 51/53/55 → 0.2/0.4/0.8, 61/63/65 → 1.5/4/10, 80/81/82 → 2/6/20, thunderstorm 10 mm/h. Manual weather uses the code values (drizzle 0.4, rain 4, storm 10). With t = (log10 mm/h + 1) / (log10 20 + 1), clamped to 0–1, per 430 px of width: drops = 60 + 320t, near streak 6 + 18t px long and 1 + 0.8t px wide, opacity 0.28 + 0.37t, fall time 3 − 1.4t s per scene height (far drops up to 1.8× longer). At most 1200 drops.

    | Class | mm/h | t | Drops | Near streak | Opacity | Fall | Sky grey (X5) | Mist (X4) |
    |---|---|---|---|---|---|---|---|---|
    | Drizzle | 0.2 | 0.13 | 102 | 8 px | 33 % | 2.8 s | 0.45 | 0.32 |
    | Light | 1 | 0.43 | 199 | 14 px | 44 % | 2.4 s | 0.55 | 0.47 |
    | Moderate | 4 | 0.70 | 283 | 19 px | 54 % | 2.0 s | 0.64 | 0.60 |
    | Heavy | 10 | 0.87 | 338 | 22 px | 60 % | 1.8 s | 0.70 | 0.68 |
    | Downpour | 20 | 1 | 380 | 24 px | 65 % | 1.6 s | 0.75 | 0.75 |

  - **X2 Wind angle:** the streaks tilt along their path, angle = min(35°, 0.6° per km/h); drizzle tilts 1.4× as much, up to 45°. The rain falls away from the side the wind comes from (the sign of `getCloudDriftDirection`). This replaces `getPrecipitationSlantPx` for the rain; hail keeps it.
  - **X3 Rings on the water:** where a middle streak ends on the water, a small flat ring (an ellipse, height 0.3 × width) widens and fades out in 0.8 s. Radius (1 + (2 + 7z) × f) × 1.6 px, opacity 0.55 × (1 − f) × (0.4 + 0.6z), with z the depth (0 at the horizon, 1 at the bottom) and f the ring's age / 0.8 s. So the rings are smaller, flatter and fainter toward the horizon. At most 120 rings. On the same canvas.
  - **X4 Horizon mist:** a pale band over the horizon (from 50 % to 80 % of the height, strongest at the middle) in the horizon colour, lighter and less saturated (saturation × 0.35, lightness × 1.06 + 8, at most 90). Opacity 0.25 + 0.5t, so heavy rain hides the far shore. A CSS gradient, no animation.
  - **X5 Darker with more rain:** the sky's grey mix for rain and drizzle (`SKY_OVERCAST_MIX`, item 50) becomes 0.4 + 0.35t (today drizzle 0.45, rain 0.6), times the cloud cover as now.
  - **Snow and hail:** fix the same delay bug (set the delay after the shorthand, or only longhands). Their look does not change.
- **Done when:** tests for the mm/h mapping, the code fallback, the angle and the drop reset (the count stays constant). In the browser at 390×844 and 1440×900: rain never pauses (sampled for 30 s), drizzle at 0.2 mm/h and a downpour at 20 mm/h look clearly different, 0 km/h falls straight and 50 km/h falls from the side, the rings sit where the streaks end, and in a downpour the mist hides the far shore. One frame takes under 1 ms on a phone.
- **Built:**
  - `src/utils/rainUtils.ts`: `getPrecipitationMmH` (the amount per interval to mm/h, else the code value), `getRainMmH` (null without rain; manual weather and old cache entries get drizzle 0.4, rain 4, storm 10), `getRainIntensity` (t), `getRainLook` (X1, per 430 px, at most 1200 drops), `getRainMistOpacity` (X4), `getRainSkyMix` (X5), `getRainAngleDeg` (X2), and the drops: `getRainWaterY`, `placeRainDrop`, `stepRainDrops`.
  - `src/components/RainCanvas.tsx`: one canvas (`zIndex` 8: over the sea and the boats, under the chips) with one rAF loop (frame ID in a `useRef`). Far: 0.5 × the drops as short faint dashes in the band from 26 % of the height above the horizon down to it, in 8 slices that get stronger toward the horizon. Middle: 0.72 × the drops, ending on the water at their depth, with rings (at most 120, in 5 opacity batches). Near: 0.05 × the drops (at least 4), long and soft. The rain's grey haze over the horizon is the canvas's CSS background. Reduced motion: one still frame. Colours: the new tokens `--scene-rain-day`, `--scene-rain-dusk`, `--scene-rain-night`, with the lookbook's light factor (day 1, dusk 0.95, night 0.75).
  - `weatherUtils`: `current=…,precipitation`, `precipitationMmH` in `WeatherData` and the cache (null in an older entry). `SunTracker` passes `rainMmH` (null in manual mode) to `getSkyOvercastMix` and `SunVisualization` → `CloudLayer`. `getWaterColors` also returns `mist`; the mist band sits in `SunVisualization` after the sea (over the ridge and the sea, under the boats).
  - `CloudLayer`: the `precipDrops` divs, their `PRECIP_COUNT` entries and `@keyframes fall` are gone; hail keeps `getPrecipitationSlantPx` and `--slant`. Snow and hail now put their delay in the `animation` shorthand.
  - Before, the drops had no z-index and the sea path covered them: the rain showed only in the sky. Now it falls onto the water.
  - **Deviations:** the far veil is short dashes on the same canvas, not the lookbook's moving pattern tile (no pattern or `DOMMatrix`). The haze is CSS, not a canvas gradient. The ring opacity is rounded to 5 levels (one stroke per level). The freezing codes get the lookbook values (56/57 → 0.2/0.8, 66/67 → 1.5/10). Drizzle's 1.4 × tilt follows the weather type, not mm/h < 0.5. In the table above, t at 1 mm/h is 0.43 (it said 0.44).
- **Checked:** 25 new tests (840 in all); lint, typecheck and build pass. In Chrome, Ravensburg, mocked Open-Meteo with `precipitation` and `interval` 900:
  - 390×844, 12:00, 4 mm/h: over 30 s (60 samples) the lit sky pixels of the canvas stayed between 4157 and 7423 (mean 5699); the rain never paused.
  - Drizzle (code 51, 0.2 mm/h): 710 lit sky pixels, mist 0.32. Downpour (code 82, 20 mm/h): 8979, mist 0.75; long streaks, rings on the water, the far shore faint, the sky greyer.
  - Wind 0 km/h: 0°, straight down. 50 km/h from the west: 30°, falling to the right. From the east: −30°, to the left.
  - Night (2026-10-01 23:42, 1.6 mm/h): faint, calm streaks and rings on the dark water. 1440×900 downpour at 30 km/h: 18°, the mist hides the ridge.
  - Reduced motion: the same frame after 3 s (a still frame, no loop).
  - Snow: 60 flakes with 60 different delays, none 0 s. Manual hail: 45 pellets, 45 different delays.
  - Frame cost with 4× CPU throttling in a downpour: 390×844 median 0.8 ms (p95 1.2 ms), 1440×900 median 1.2 ms (p95 1.8 ms). No console errors.

### 78. Share the current view — M — Premium — [SUN-CHASER-N](https://ainabler.sentry.io/issues/SUN-CHASER-N) — **✅ Done**

- **Feedback (2026-10-01 23:44):** "Share feature should include a screenshot of the actual view". Then: "spec a screenshot like behaviour for the share feature".
- **Now:** the Share button (item 68) draws a 1080×1350 sunset card on a `<canvas>`: the dusk sky, the sun on the horizon or the ridge, the place, the date, the sunset times and the score. It does not show what the user sees (the current sky, the moon, the clouds, the boats, the birds).
- **Feasibility (checked 2026-10-02, Chrome, 390×844 at 2×, Ravensburg):** two DOM-capture libraries rendered the scene root (`div.relative.min-h-dvh`) to a PNG.
  - Both match a real screenshot for the evening sky (blurred clouds, gradients, ridge, sun glow) and the night sky (the `NightStars` canvas, the moon, the arcs), in 0.2–0.4 s.
  - **html-to-image** restarts the CSS animations in its copy: the boats show at their start, cut off at the left edge.
  - **modern-screenshot** (4.7.0, MIT, no dependencies, about 14 kB gzipped) keeps the boats where they are on screen.
- **Spec:**
  1. **Capture:** a tap on Share loads `modern-screenshot` with a dynamic `import()` (no cost at app start) and renders the scene root with `domToPng` at `devicePixelRatio` (at most 2). The image is the view as the user sees it, labels and arcs included.
  2. **Without the controls:** elements with `data-share-hide` stay out of the image (`filter` option): the InfoPanel, the top-left buttons, the music player, the install prompt and the toasts.
  3. **Footer:** below the capture, a band one fifth of the image width high, drawn on a canvas in the card's colours: the place name, the date and time of the view, the sunset time (line of sight and flat, as in item 68), the score and the app mark. No coordinates. `getShareCardData` gives the texts; the view time is new.
  4. **Size:** the screen's aspect ratio, with the long side at most 2400 px; PNG.
  5. **Moment:** the image shows the time on screen, also during time travel (item 44); the footer shows that time.
  6. **Fallback:** when the import or the capture fails (an old browser, no network for the chunk), the button draws the item-68 card as now. A failed share shows the toast as now.
  7. **Text:** the button label "Share sunset card" (`share.button`) becomes "Share this view", in all five languages.
  8. Premium as now: the gold plus and `requirePremium` (item 14) around the tap.
- **Done when:** tests for the footer data (the view time, no coordinates), the `data-share-hide` filter, and the fallback to the card when the capture throws. In the browser (Chrome 390×844 and 1440×900): the image matches the screen without the controls, with moving boats and birds in place, at midday, at sunset and at night. On an Android phone the share sheet opens with the image. On iOS Safari the capture works or falls back to the card.
- **Built:**
  - `modern-screenshot` (^4.7.0) is a new dependency, loaded with `import()` inside `captureShareView` (`shareCard.ts`), so it is a separate 22 kB chunk (8.5 kB gzipped), not in the main bundle. The service worker precaches it, so it also works offline.
  - `captureShareView` renders the scene root (`data-share-root` on the `SunTracker` root div) with `domToCanvas` at `getShareViewScale` (the pixel ratio, at most 2, with the long side at most 2400 px). It then draws the footer band (`getShareFooterHeight`, one fifth of the width) under it and returns a PNG. The filter `isSharedNode` leaves out every node with `data-share-hide`.
  - `data-share-hide` is on the InfoPanel, the top-left buttons, the music player, the install prompt and the time-travel "Back to now" button. The toasts (`App.tsx`), the loading screen and the Premium dialog render outside the scene root, so the capture never sees them.
  - The footer: the place name and the view time (`viewText`, new in `getShareCardData`) on the left, with the app mark under them. The sunset label and time, the flat time and the score are on the right. Sizes are the card's at 1080 px, scaled to the width. The app mark drawing is shared with the card (`drawAppMark`).
  - `ShareCardButton` finds the scene root from the button (`closest('[data-share-root]')`), captures it and shares it as `sun-chaser-YYYY-MM-DD-HHMM.png` (`viewFileName`). When there is no root, or the import or the capture throws, it draws the item-68 card under its old file name. `share.button` is "Share this view" in all five languages.
  - **Deviations:** `domToCanvas` instead of `domToPng`, because the footer is drawn on the same canvas. Point 4: the capture part has the screen's aspect ratio, and the footer makes the image one fifth of the width taller (390×844 → 780×1844).
- **Checked:** 6 new tests (821 in all); lint, typecheck and build pass. In Chrome (Ravensburg, 2026-10-01, faked weather), a tap on "Share this view" gave the shared PNG in 0.2–0.4 s on a phone and 0.9 s on desktop:
  - 390×844 at 2×: 780×1844 at 11:04 (three boats on the water), 18:50 (sunset) and 23:42 (night, moon 21°). 1440×900 at 1×: 1440×1188 at 11:05.
  - Against a screenshot with the controls hidden, the capture differs by 0.1–0.37 of 255 on average. 0.24 % of the pixels differ by more than 40, only at midday, where boats and birds moved in the 0.5 s between the two shots. The boats sit where they are on screen.
  - No InfoPanel, buttons or music player in the image. The footer shows "Ravensburg", "October 1, 2026, 18:50", the line-of-sight sunset 18:55, the flat time 19:03 (−9 min), the score and the app mark.
  - With the capture chunk blocked, the button shares the item-68 card (1080×1350).
  - No console errors.
  - This Chrome has the Web Share API, and its headless share sheet never answers, so the check caught the shared file instead. The Android share sheet and iOS Safari are not checked yet.

### 79. Waves by wind strength — M — [SUN-CHASER-K](https://ainabler.sentry.io/issues/SUN-CHASER-K) — **✅ Done**

- **Feedback (2026-10-01 19:52):** "Waves on the water depending on wind strength". Then: "create a lookbook as well for different wave options depending on wind strength".
- **Now:** the sea (`data-testid="sea"`) is a gradient under a fixed bumpy top edge that never changes. Wind changes only the sailboat's wake (item 73), the leaves and the birds' pace. `SunVisualization` already gets `windSpeedKmh` and `windDirectionDeg`; the sea has no wind input. Storm darkens the water and hides the reflection. Manual weather gives 0 or 50 km/h. Gusts are not fetched.
- **Lookbook:** [Waves](https://claude.ai/artifact/1nRuLQgjvmkgpeRkEDzRRA) (private), with a wind slider (0–80 km/h, bands calm < 6, light 6–19, moderate 20–38, strong 39–61, storm 62+), day, sunset and night. Options: WV1 ripple lines; WV2 whitecaps; WV3 slow swell bands; WV4 cat's paws; WV5 a choppy sea edge; WV6 mirror to matte. Add-ons: X1 the reflection follows the wind, X2 boat reflections follow the wind, X3 foam in a storm, X4 sailboats heel. All drifts are at or below the sailboat's pace (5.2 px/s on a phone, the same px/s on a 1440 px screen).
- **Picks (2026-10-02):** "Wave picks: WV1, WV2, WV4, WV6, X1, X2, X3".
- **Spec:**
  - **One sea canvas** over the sea path, under the boats and fish, with one `requestAnimationFrame` loop at about 30 fps (the frame ID in a `useRef`). Reduced motion: one still frame. Drifts go downwind (`getCloudDriftDirection`), in phone px/s on wide screens. Every value below is set at five wind stops and interpolated linearly in between (below 3 km/h the first value, above 70 the last):

    | Wind (km/h) | 3 | 12 | 28 | 50 | 70 |
    |---|---|---|---|---|---|
    | WV1 lines | 8 | 30 | 60 | 95 | 130 |
    | WV1 length (px) | 30–70 | 6–14 | 8–18 | 10–24 | 12–28 |
    | WV1 opacity | 0.11 | 0.2 | 0.26 | 0.31 | 0.36 |
    | WV1 drift (px/s) | 0.3 | 1.2 | 2.2 | 3.2 | 4 |
    | WV2 whitecaps | 0 | 2 | 18 | 45 | 80 |
    | WV2 size (px) | 6 | 6 | 8 | 10 | 12 |
    | WV2 opacity | 0 | 0.55 | 0.65 | 0.75 | 0.85 |
    | WV2 drift (px/s) | 0 | 0.6 | 1.2 | 1.6 | 2 |
    | WV4 patches | 0 | 6 | 12 | 18 | 24 |
    | WV4 stretch (× length) | 1 | 1 | 1.7 | 3.2 | 4.2 |
    | WV4 darkness | 0 | 0.13 | 0.15 | 0.17 | 0.19 |
    | WV4 drift (px/s) | 0 | 1 | 1.8 | 2.6 | 3.2 |
    | WV6 mirror strength | 0.5 | 0.3 | 0.11 | 0.03 | 0 |
    | WV6 break-up | 0 | 0.28 | 0.55 | 0.75 | 1 |
    | WV6 matte (darker by) | 0 | 3 % | 9 % | 15 % | 20 % |
    | X1 bar rows | 10 | 7 | 9 | 11 | 12 |
    | X1 pieces per row | 1 | 1 | 2 | 2.6 | 3 |
    | X2 boat reflection | 42 % | 28 % | 20 % | 13 % | 8 % |

  - **WV1 Ripple lines:** thin pale lines in perspective, smaller toward the horizon. Calm water shows a few long glassy streaks; with wind they get shorter, more numerous and brighter. From 14 km/h each line has a dark trough under it. Each line fades in, drifts downwind and fades out over 9–15 s.
  - **WV2 Whitecaps:** small white crests at random places that fade in, hold and fade out (opacity only). The first ones come at 12 km/h.
  - **WV4 Cat's paws:** soft darker patches that drift downwind and fade. With more wind they stretch into long wind streaks; in a storm light and dark streaks alternate. Calm water has none.
  - **WV6 Mirror to matte:** calm water mirrors the ridge (the terrain path, flipped at the sea line, `Path2D` from the same SVG path) and the glow of the sky. A breeze breaks the mirror into thin slices that fade in and out. From moderate wind the mirror is gone and the sea turns matte and darker.
  - **X1 The reflection follows the wind:** the sun and moon bars change their layout, not their place over time: calm a tight column of 10 bars, light today's 7, then more, smaller pieces that spread sideways (up to ±16 px) and get fainter.
  - **X2 Boat reflections follow the wind:** the boats' mirror image (item 73, X1) is sharp in calm water, as today in light air, then striped and broken (a CSS mask) and fainter. No motion.
  - **X3 Foam in a storm:** from 55 km/h, long thin white foam streaks along the wind that drift with it (at most 3 px/s), and a foam line along the sea's top edge. None below 55 km/h.
  - **Storm:** a storm uses at least the strong band (50 km/h) when the measured wind is lower.
- **Done when:** tests for the wind-band mapping and the counts per band. In the browser at 0, 15, 30, 50 and 70 km/h, on 390×844 and 1440×900: the sea reads calm at every band, every drift is at most 5.2 px/s (the sailboat's pace), calm water mirrors the ridge, foam shows only from 55 km/h, and one frame takes under 1 ms on a phone.
- **Built:**
  - `src/utils/waveUtils.ts`:
    - `atWindStops` interpolates between the five stops, exact at each stop.
    - `getWaveLook` holds every value of the table.
    - `getReflectionBars` (X1) and `getBoatReflection` (X2) lay out the reflections.
    - `getSeaWindKmh` sets the storm minimum.
    - `getWindBand` gives the five bands.
    - `waveHash` is the lookbook's stable hash.
  - `src/components/SeaCanvas.tsx` is the one sea canvas. It draws WV6, WV4, WV1, WV2 and X3, clipped to the sea path (`Path2D`), at 30 fps, with the frame ID in a `useRef`. Reduced motion draws one still frame.
    - The mirror (sky glow plus the flipped ridge) is drawn once into an offscreen canvas and copied in 2 px slices.
    - When a slice has no offset, its crossfade draws one copy at full strength, so calm water stays still.
  - `SunVisualization`:
    - Renders `SeaCanvas` right after the sea path: above the sea fill, and under CloudLayer's fish (z 5) and boats (z 7).
    - Splits the sea path into its top edge (for the foam line) and the closed fill. The `d` of `data-testid="sea"` does not change.
    - Lays out the reflection bars from `getReflectionBars`.
    - Crest colour: `--scene-moon` at night, else `--scene-glow-white`, with a gain of 0.6 at night, 0.9 at dawn, evening and civil twilight, and 1 otherwise. Trough colour: the deep water colour.
  - `getWaterColors` also returns `sky`, the sky colour at the horizon line, for the mirror.
  - `SceneBoat` gets `seaWindKmh` for its reflection; `CloudLayer` passes `getSeaWindKmh`.
- **Deviations from the spec:**
  1. **Whitecaps:** none below 12 km/h. Linear interpolation between 0 (at 3 km/h) and 2 (at 12 km/h) would give the first cap at 7.5 km/h, but the text says "the first ones come at 12 km/h".
  2. **Counts scale with width:** the counts are per 430 px of width (`getWaterLimit`, as in item 70), because the lookbook scenes were phone-sized. A 1440 px sea has 3.35 × as many lines, caps, paws and foam streaks. The drifts are px/s, the same on every width.
  3. **No wind reading yet:** the sea uses 12 km/h, today's look with the 7 bars. Manual weather without "Strong wind" is 0 km/h, so it shows calm water.
  4. **X2 beyond opacity:** from the lookbook, the blur (0 to 1.6 px) and the height of the image (70 % to 36 %) also follow the wind. The stripes come in three steps, from 28, 50 and 70 km/h.
  5. **Foam ramp:** the foam fades in from 55 to 66 km/h. The lookbook started at 50.
  6. **Bar opacity:** the X1 bars use the lookbook's opacity, (base + the wind's offset − 0.04 per row) × item 58's fade × item 57's moon factor. In light air the rows fade by 0.04 each, not by today's 0.05.
  7. **No extra WV6 ripples:** the lookbook added faint ripples to WV6 from 20 km/h. They are left out, because WV1 draws the ripples.
- **Checked:** 14 new tests (829 in all); lint, typecheck and build pass. In Chrome, Ravensburg (terrain profile loaded), with the live wind mocked at 0, 15, 30, 50 and 70 km/h, on 2026-10-02 at 13:00, 18:45 and 23:30 local time, at 390×844 and 1440×900:
  - **Calm:** the water mirrors the ridge and the sky glow; 10 bars.
  - **15 km/h:** the mirror breaks into slices; 7 bars.
  - **30 km/h:** the sea is matte, with ripples, troughs and the first caps; the bars split into 18 pieces.
  - **50 and 70 km/h:** dense ripples and caps; 33 and 36 bar pieces.
  - **Foam:** a foam line along the sea edge at 70 km/h, none at 50.
  - **Frame cost** at 4× CPU throttle, daytime (mean per frame):
    - 390×844: 0.53 ms at 0 km/h, 0.40 ms at 70 km/h.
    - 1440×900: 0.62 ms and 1.34 ms.
  - **Drift**, measured from the canvas rectangles of two frames 1 s apart: at most 3.99 px/s at 70 km/h on both widths, and 0.27 px/s in calm water.
  - **Boat reflections (X2):** at 0 km/h 42 % and sharp, at 15 km/h 26.5 %, at 50 km/h 13 % with stripes.
  - **Manual mode at 1280×800:**
    - Clear with "Strong wind" (50 km/h): ripples and caps, 33 bar pieces, no foam.
    - Clear with the switch off: calm water with the mirror and 10 bars.
    - Storm: dark water at the strong band and no reflection.
  - No console errors.

### Feedback round (2026-10-03)

Six open Sentry feedback reports from 2026-10-02 20:48 to 2026-10-03 18:58, all on release `b7de009`, from Ravensburg and Stuttgart. Sentry has no new errors for sun-chaser in 90 days (only the setup test, SUN-CHASER-1, resolved). Request: "check sentry for all errors and user feedback, analyze, spec it out and pitch me ideas how to solve". Items 80–83 have a recommended spec. Items 84 and 85 are design work, with a lookbook first. Decisions (2026-10-03): "80, no only on sunset, 83 yes thats ok, 84&85 yes please". Integration (2026-10-04): items 80–85 merged together with no logic conflicts (CloudLayer and SunVisualization kept both sides; item 82's day-opacity test moved to the FS1 value 0.85). 939 tests, lint, typecheck and build pass. In the built app at 390×844, the item-84 clouds and the boats, fish and birds run at 8× in forward play and −8× in rewind, and at 1 after pause; the clouds stay on screen in rewind; no console errors.

### 80. Fireworks you do not miss — S — [SUN-CHASER-V](https://ainabler.sentry.io/issues/SUN-CHASER-V) — **✅ Done**

- **Feedback (2026-10-03 18:58 CEST, Ravensburg):** "Today the firework didn't work".
- **Now:** `Fireworks.tsx` and `sunEvents.ts` have not changed since item 41/43 (2026-09-30). A show starts only when one clock tick of at most 5 s (`MAX_CLOCK_STEP_MS`) passes the next sunrise or sunset, in live mode, without reduced motion. The trigger uses the line-of-sight sunset. The feedback came 55 s before the flat sunset (18:59:41), so the line-of-sight sunset behind the western hills had passed without a show. SUN-CHASER-T (13:59) has the same trace ID: one page load, open for 5 h on a phone.
- **Cause:** not provable from Sentry (no replay, no breadcrumbs, no error). In order of likelihood:
  1. The app was hidden at the sunset: screen off, or the camera open for the sunset photo. A mobile browser stops the timers of a hidden page. The first tick after the return is a step of more than 5 s, so `passesSunEvent` returns false and there is no show.
  2. A time preview (item 44) was on: no show, as specified. The same user tests fast forward (SUN-CHASER-R).
  3. Reduced motion is on in the phone settings: no show, as specified.
- **Options:**
  - **FW1 Catch-up (recommended):** one show per sun event, at the first live, visible tick in the 15 min after the event. This includes the first tick after a return from the camera. A ref keeps the last celebrated event, so a show never repeats. The 5 s step rule goes.
  - **FW2:** FW1, plus a "Replay fireworks" chip for 15 min after the event.
  - **FW3 Diagnose only:** a Sentry breadcrumb `fireworks` with "fired" or "skipped" and the reason (hidden step, preview, reduced motion). Cheap, but it fixes nothing.
- **Pick (2026-10-03):** FW1 with the FW3 breadcrumb. "no only on sunset": a cold app start after the sunset gives no show. The catch-up is only for a page that was open at the sunset and comes back within 15 min (a hidden page whose clock stopped).
- **Done when:** unit tests for the catch-up rule: hidden at the event and back after 3 min gives one show; back after 20 min gives none; the next tick gives no second show; a preview gives none. In the browser, a clock jump over the sunset gives one show.
- **Built:**
  - `watchSunEvent` (`sunEvents.ts`) replaces `passesSunEvent` and the 5 s step rule (`MAX_CLOCK_STEP_MS` is gone). A live tick arms the next sunrise or sunset (the terrain time when there is one). The first live tick after the armed event starts one show when it comes at most 15 min (`CATCH_UP_MS`) after the event. The watch keeps the last celebrated event, so a show never repeats.
  - A cold start after the event has nothing armed: no show. A preview tick only marks the watch, so the return to live after the event gives no show either; the preview clock never arms an event.
  - `SunTracker` keeps the watch in a ref. It skips the check on a hidden tick (a desktop tab still ticks), so the show waits for the first visible tick. New Year is unchanged.
  - FW3: each fired or skipped show adds `Sentry.addBreadcrumb({ category: 'fireworks', level: 'info' })` with the message `fired`, `skipped: preview` (the event passed while a preview was on), `skipped: too late` or `skipped: reduced motion`. No place and no time in it. Reduced motion still gives no show.
- **Deviations:** sunrise shows use the same catch-up rule as the sunset (one rule for both events). A 1 s tick over the sunrise still starts the show as before; a page hidden at the sunrise now also gets it within 15 min.
- **Checked:** 15 new tests (886 in all), lint, typecheck and build pass. Unit cases: hidden at the event and back after 3 min: one show; the next tick: no second show; back after 20 min: none; cold start after the sunset: none; preview: none; live, then a preview across the sunset, then live: none. In headless Chromium at 390×844 with touch, Ravensburg, terrain tiles blocked (flat sunset 18:59:41), Playwright's fake clock: the page opens at 18:58:41, the clock stops at 18:59:11 (timers frozen, as on a hidden phone page) and jumps to 19:02:41 without a tick; the first tick after the resume starts a show (the fireworks canvas is lit) and adds the breadcrumb `fired`. A jump to 19:19:41: no show, `skipped: too late`. A hidden tab whose clock ticks across the sunset: no show while hidden, a show on the first visible tick. No console errors apart from the blocked tiles. The item-44 test "does not start the fireworks during a preview" now commits every 10 s instead of every 1 s (a 10 s step past the event would start a show, so the test still catches a broken preview guard, checked by mutation). It takes 0.5–0.8 s instead of 1.9–2.1 s; 5 of 5 runs and two full suites pass. Under a load average above 80 (parallel agents on the same machine), this and other `SunTracker` tests can still exceed the 5 s timeout, on the spec branch too.

### 81. Glass icons stay visible when tapped — S — [SUN-CHASER-Q](https://ainabler.sentry.io/issues/SUN-CHASER-Q) — **✅ Done**

- **Feedback (2026-10-02 20:53):** "Icons disappear when pressing them full screen or feedback".
- **Now (cause found in the code):** the round glass buttons use the shadcn `variant="ghost"`, which adds `hover:text-accent-foreground`. The app has no `.dark` class, so this is the light token `222 47% 11%`: near-black on the dark glass. On a phone, `:hover` stays after a tap, so the icon stays near-black until the next tap somewhere else. Affected: `FullscreenButton`, `CompassToggle`, the feedback button in `TopLeftButtons`, and the Restore and Close buttons in `PremiumDialog`. `PWAInstallPrompt` already has `hover:text-white` and does not show the bug.
- **Spec:** add `hover:text-white` to `GLASS_ICON_BUTTON` (`glassChrome.ts`). The active `CompassToggle` adds `hover:text-brand-sky`. The two ghost buttons in `PremiumDialog` add `hover:text-white`. tailwind-merge then drops the ghost class. Do not edit `src/components/ui/`.
- **Done when:** a test shows that the three top-left buttons have no `hover:text-accent-foreground` class. In the browser at 390×844 with touch: after a tap, each icon stays white (the active compass stays sky blue).
- **Built:** `GLASS_ICON_BUTTON` gets `hover:text-white`. The active `CompassToggle` adds `hover:text-brand-sky`. The Restore and Cancel buttons in `PremiumDialog` add `hover:text-white hover:bg-white/10`. tailwind-merge drops the ghost `hover:text-accent-foreground` (and in the dialog `hover:bg-accent`). `src/components/ui/` is not edited.
- **Deviations:** the two `PremiumDialog` buttons also get `hover:bg-white/10`. The ghost `hover:bg-accent` is the light token `210 40% 96.1%` (near-white), so `hover:text-white` alone gives white text on a near-white pill after a tap. `PWAInstallPrompt` uses the same hover.
- **Checked:** 4 new tests (the three top-left buttons, the active compass, the dialog buttons, `GLASS_ICON_BUTTON`). In headless Chromium at 390×844 with touch, after a tap `:hover` stays on the button: fullscreen, compass (idle) and feedback are `rgb(255, 255, 255)`; the active compass is sky blue `rgb(14, 165, 233)`; in the Premium dialog (`?premium=enforce` with a Play Billing stub) Restore is white on `rgba(255, 255, 255, 0.1)`.

### 82. Jellyfish: a softer night glow — S — [SUN-CHASER-P](https://ainabler.sentry.io/issues/SUN-CHASER-P) — **✅ Done**

- **Feedback (2026-10-02 20:48):** "Jellyfish is a little too bright at night".
- **Now:** at night the jellyfish has its own light (item 65): `--scene-fish-jellyfish-glow` (`190 90% 80%`) at opacity 0.95, with a 3 px drop-shadow halo. The other night fish with their own light are outlines at stroke opacity 0.45 with small gold lights. The jellyfish is the brightest thing in the night water.
- **Options:**
  - **J1 Dimmer (recommended):** opacity 0.95 → 0.6 for the jellyfish, halo 3 → 2 px. Two numbers in `CloudLayer.tsx`.
  - **J2:** J1, plus a slow glow that breathes between 0.4 and 0.65 over 5 s. Opacity only, no motion, so it keeps the calm-motion rule.
  - **J3:** the bell as an outline in the moon tone at 0.45, like the lanternfish; only the bell rim glows cyan.
- **Done when:** a test for the jellyfish night opacity. A night screenshot with a jellyfish beside a lanternfish.
- **Built (J1):** `createFish` gives the jellyfish with its own light 0.6 instead of 0.95 (before the distance fade), and its halo is `drop-shadow(0 0 2px)` instead of 3 px. The lanternfish, anglerfish and squid do not change.
- **Checked:** 1 new test (the night jellyfish at 0.6, the other fish with their own light at 0.95, the day jellyfish unchanged). In headless Chromium at 390×844, Ravensburg, 2026-10-03 22:30 (moon down): a jellyfish at opacity 0.547 (0.6 at depth 0.29) with a 2 px halo, a soft cyan glow. No lanternfish came in the same shot (the moon was down, and the spawns are random).

### 83. The scene follows fast forward and rewind — M — [SUN-CHASER-R](https://ainabler.sentry.io/issues/SUN-CHASER-R) — **✅ Done**

- **Feedback (2026-10-02 22:31):** "During fast forward all elements boats fish birds should go a lot faster as well and backwards when going back".
- **Now:** play (item 44) moves only the clock (`PLAY_SPEED` 600, 10 min per second). Boats, fish, birds, leaves and clouds are CSS animations (`moveAcrossX`, `cloudDrift`) in `CloudLayer` with fixed durations. `CloudLayer` does not get `playDirection`. The sea and the rain are canvas loops with their own clocks.
- **Options:**
  - **SP1 Playback rate (recommended):** `CloudLayer` gets `playDirection`. An effect sets `playbackRate = direction × 8` on each animation in the scene (`container.getAnimations({ subtree: true })`, the Web Animations API, no new dependency), again on each play tick so new spawns follow. Rewind uses a negative rate: CSS animations then run backwards natively. In rewind, a new spawn starts at its end (`currentTime = duration`), so it comes in from the right. The spawn timers divide their interval by 8, so the scene does not empty. Pause and live: rate 1.
  - **SP2:** SP1, plus a speed input for the wave and rain clocks in `SeaCanvas` and `RainCanvas`.
  - **SP3:** all elements 8× faster in both play directions, always moving forward. Smallest, but no "backwards".
- **Factor:** 8×. A sailboat at 1.2 %/s then crosses in about 10 s; 600× would be a flash. The calm-motion rule is for live mode; play is the exception (confirmed 2026-10-03: "83 yes thats ok").
- **Done when:** tests for the rate (direction −1 → −8, 0 → 1, 1 → 8) and for the rewind spawn. In the browser: in forward play a near boat crosses in at most 12 s; in rewind all elements move right to left; after pause the scene is at live speed.
- **Built (SP1):**
  - `timeTravel.ts`: `SCENE_PLAY_FACTOR` (8), `getScenePlaybackRate` (−1 → −8, 0 → 1, 1 → 8) and `getSpawnGapFactor` (1/8 during play, else 1). `SunTracker` passes `playDirection` through `SunVisualization` to `CloudLayer`.
  - `useScenePlaybackRate` (`src/hooks/`) runs after each `CloudLayer` render (each 100 ms play tick and each spawn) and sets the rate on each animation in the scene container (`getAnimations({ subtree: true })`), with no list of animation names, so new scene animations (item 84's clouds) follow. A direction change turns the animations where they are. In rewind, an animation that was not there at the last call starts at its end (`currentTime` = its end time, delay included), so it comes in from the right. A reversed animation fires `animationend` at its start (checked in Chrome), so the entities leave and are removed as in live mode. An infinite animation (the cloud drift) stops at its start when reversed and loses its transform, so in rewind it keeps an hour of animation time in reserve (whole periods, so the phase does not jump). Live: the hook does nothing; after play it sets rate 1 once.
  - `CloudLayer`: the spawn gaps of birds, the night geese, fish, boats and leaves, and the 500 ms spawn check, are multiplied by `getSpawnGapFactor`. A fish pair is removed by the companion in forward and live mode, by the lead in rewind (the lead reaches its start last).
- **Deviations:** snow and hail keep live speed (`data-live-speed`, skipped by the hook), as the rain canvas (SP2 not picked). CSS transitions (the 5 s cloud colour fades) also keep rate 1, so a colour change does not run back. A fish pair that spawns in rewind swims side by side (each swimmer starts at its own end). The factor stays 8: a crossing is 116 % of the width, not 100 %, so a near sailboat on a phone takes 12.1 s (about 10 s in the spec), a near rowboat 16 s, a near ferry 8 s; wide screens keep the item-66 pixel cap, so crossings there take width ÷ 430 times longer.
- **Checked:** 14 new tests (884 in all), lint, typecheck and build pass. In Chromium at 390×844 (Ravensburg, live weather, jump to 2026-10-04 08:00), sampled every 200 ms: live 12 s at rate 1; forward 40 s: the boat, fish and bird animations and the cloud drift at rate 8, all 38 entities left to right. A near sailboat (Math.random pinned low) crossed in 12.2 s (97.1 s live) and left the screen after about 11.3 s. Rewind 30 s: rate −8, all 41 entities right to left; 28 spawns came in at the right edge (x 383–421 px); each entity from before the rewind left at the left edge and was removed; the clouds kept their transform. Pause 10 s: rate 1, 16 entities left to right at 1–8 px/s, as in live mode. At 1280×800 the same (63 entities right to left in rewind). No console errors.

### 84. Clouds by type — M — [SUN-CHASER-T](https://ainabler.sentry.io/issues/SUN-CHASER-T) — **✅ Done**

- **Feedback (2026-10-03 13:59, Stuttgart):** "Redo cloud design with different cloud types and looks".
- **Now:** two SVG paths: a flat blanket for storm, rain, overcast, hail, drizzle and fog, and one puff for partly, cloudy and snow. One flat colour per weather and time of day (item 10 matrix); fair clouds are brand-peach at dawn, morning and evening. The weather fetch already gets `cloud_cover_low`, `cloud_cover_mid` and `cloud_cover_high` per hour, but only the sunset score uses them.
- **Pitch:**
  - **C1 Real cloud layers (the core):** the cloud types come from the cover per layer of the current hour. High: cirrus wisps, high and slow. Mid: altocumulus, a field of small puffs. Low: cumulus in fair weather, stratocumulus or stratus at high cover. Rain: a nimbostratus base with rain shafts. Storm: a cumulonimbus anvil on the horizon. 5–6 shapes, 2–3 variants each.
  - **C2 Lit by the sun:** a gradient to the sun's side. In the golden hour the cloud bases go peach to pink to purple. After sunset the high clouds keep their colour longest, as in nature. This is the picture people chase sunsets for, and it matches the sunset score.
  - **C3 Depth:** three bands (high, mid, low) with their own drift speed and size; far clouds smaller and paler near the horizon.
  - **C4 Soft fills:** blurred gradient fills instead of one flat colour, in the D palette.
  - **X1:** mammatus or lenticular clouds as rare easter eggs.
- **Bug found (2026-10-03):** `getCloudColor` has no `civil-twilight` case, so in civil twilight fair clouds fall back to day white and overcast to day grey. C2 replaces this matrix; without C2, add the case.
- **Lookbook:** [Cloud Types](https://claude.ai/artifact/RbsfFkWCy3TNhDAXNBgbi5) (private). Controls: weather (8 types), time of day (5) and sliders for low, mid and high cover, plus a wide view and a 390 × 844 phone. Options:
  - **C0** today's two shapes.
  - **C1** real cloud layers: cirrus, or a cirrostratus veil from high 60 %; an altocumulus field, or an altostratus sheet from mid 70 %; cumulus, then stratocumulus from low 45 % and stratus from 75 %; a nimbostratus deck with rain shafts; a cumulonimbus anvil on the horizon in a storm. 2–4 shapes per type.
  - **C2** lit by the sun.
  - **C3** depth: three bands, gliding at 0.35, 0.7 and 1.2–2.4 px/s (phone; the sailboat is 5.2 px/s).
  - **C4** soft gradient fills with a 2.6 px edge.
  - **Add-ons:** X1 rare lenticular clouds (still over the ridge) or mammatus after a storm; X2 cloud shadows on the sea; X3 sun rays through the gaps; X4 a 22° halo under a thin high veil; X5 noctilucent clouds in summer twilight; X6 clouds in the calm-water mirror (WV6).
  - **Recommended:** C1, C2, C3, C4, X1, X3. The new shapes stay in today's 120 × 60 box, so the item-76 silver lining works on them. With C3 the clouds glide across the screen, so the silver lining must follow the cloud's current place (the lookbook updates it once per second).
- **Picks (2026-10-03):** "Cloud picks: C1, C2, C3, C4, X1, X2".
- **Spec:**
  - **C1 Real cloud layers:** `weatherUtils` keeps the hourly sample nearest the fetch time as `cloudLayers` (`{ low, mid, high }` in %), null without hourly data and in an older cache entry. `SunTracker` passes it in live mode. Manual weather and a missing sample use the type's own layers (low/mid/high, the lookbook presets; hail is new): clear 0/0/0, partly 25/10/20, cloudy 55/35/40, overcast 90/50/30, fog 95/10/10, drizzle 80/30/20, rain 70/85/50, storm 80/70/95, snow 60/80/30, hail 90/70/40.
  - The types, as in the lookbook:

    | Layer | When | Type |
    |---|---|---|
    | High | 5–59 % | cirrus wisps (2 shapes) |
    | High | from 60 % | a cirrostratus veil |
    | Mid | 5–69 % | an altocumulus field (3 shapes) |
    | Mid | from 70 % | an altostratus sheet |
    | Low | rain, storm, snow or hail, with low or mid from 50 % | a nimbostratus deck (3 shapes) with rain shafts, none in snow |
    | Low | rain, storm or hail below that | towering cumulus with one shower shaft |
    | Low | fog | a stratus band over the horizon |
    | Low | from 75 % (drizzle from 50 %) | stratus rows over stratocumulus |
    | Low | 45–74 % | stratocumulus, and cumulus in fair weather |
    | Low | 5–44 % | cumulus (3 shapes) in fair weather (clear, partly, cloudy), else stratocumulus |
    | Storm | always | a still cumulonimbus anvil on the horizon |

    A closed deck lets the layers above it show at 0.15 (a stratus deck at 0.15–0.7). A mid sheet halves the high clouds. Fog keeps 0.15 of them. The cover sets the count per 430 px of width; the type sets the density (0.4–0.97). Each shape stays in the 120 × 60 box; a sheet or a deck is a row of boxes. The layout is seeded by the day and the place.
  - **C2 Lit by the sun:** each cloud has a gradient from its shade side to its lit side, toward the sun (above −12°), else the moon, else the top of the sky. Five palettes per band (day from 12°, golden hour at 5°, sunset at 0°, civil twilight at −4°, night from −12°) blend by the sun's altitude. Wet weather mutes them toward grey. The overcast veil at the top of the sky takes the low clouds' lit colour. This replaces `getCloudColor`: civil twilight gets purple low clouds and pink-orange high clouds, not day white and day grey.
  - **C3 Depth:** high 0.35, mid 0.7 and low 2.4 px/s at the top of the sky, half that at the horizon. The same px/s on every width (× height / 480 below 480 px of height). Downwind (`getCloudDriftDirection`). Each cloud glides across and comes around; a sheet or a deck glides as one row. Toward the horizon a cloud is smaller (× 1.2 → 0.65), paler (−40 %) and takes on up to 40 % of the sky colour. Reduced motion: no glide. The glides are CSS animations inside CloudLayer, so item 83's play rate reaches them.
  - **C4 Soft fills:** by day and at night a shaded base; from the golden hour to civil twilight a warm glow on the sun side. Edge blur 2.6 px × the cloud's scale (high × 0.6, mid × 0.75).
  - **X1:** one day in 30 per place, seeded by the day and the place (like the green flash). Clear, partly or cloudy: two lenticular lenses stand still over the ridge. Storm: mammatus pouches hang under the deck, and the deck has no rain shafts. `?egg=lenticular` and `?egg=mammatus` force the day; the weather still picks the egg.
  - **X2 Cloud shadows:** in clear, partly and cloudy weather each cumulus and stratocumulus throws a soft patch in the deep water colour on the sea, which glides with it: 0.5 by day, 0.28 in the golden hour, none from sunset. The patch moves away from the sun by 0.12 (day) to 0.3 (golden hour) × the cloud's distance to the sun. A far cloud's shadow lies near the horizon.
  - **Silver lining (item 76):** `getCloudMoonlight` takes the cloud's current centre and scale. Once a second `SkyClouds` reads each glide's progress (Web Animations API) and moves the lining with it, as the lookbook does. The C2 light direction (in 10° steps) and the X2 shadow follow the same tick.
  - **Structure:** `SkyClouds.tsx`, mounted first in CloudLayer, so the clouds stay behind the moon disc. The shapes are in `cloudShapes.ts`, the layout, colours and motion in `skyCloudUtils.ts`. CloudLayer loses `getCloudColor`, the overcast layer, the item-51 storm deck and the old clouds; its `cloudCoverPercent` prop becomes `cloudLayers`.
- **Done when:** tests for the type choice per weather type (live and manual), the colour per time of day with civil twilight, the band speeds in px/s, the X1 rarity and the lining on a moving cloud. In Chrome at 390×844 and 1280×800: partly, cloudy, overcast, rain, storm, fog and snow by day, in the golden hour, at sunset, in civil twilight and at night with the moon; no console errors. The frame cost at 4× CPU throttle at 390×844 and 1440×900 against the old clouds.
- **Built:**
  - `src/utils/cloudShapes.ts`: the lookbook's shapes (Ci 2, Cs 1, Ac 3, As 1, Cu 3, Sc 2, St 2, Ns 3, Cb 3, Len 1, Mam 1), each one path in the 120 × 60 box, with rain shafts on Ns and the towering Cu.
  - `src/utils/skyCloudUtils.ts`:
    - C1: `DEFAULT_CLOUD_LAYERS`, `getCloudLayers`, `getCloudTypes`, and `getSkyClouds`, the layout as gliders (one cloud, or a row of tiles), seeded by the day and the place.
    - C3: `getCloudSpeed` and the glide helpers (`getGliderOffset`, `getGliderStartProgress`, `getCloudCentre`).
    - C2 and C4: `getCloudLight`, `getCloudColors`, `getCloudFill`, `getCloudVeil`, `getLightAngle`, `getSkyColorAt`.
    - X2: `getCloudShadowLook`, `getCloudShadowBox`. X1: `isCloudEggDay`, `isCloudEggForced`.
  - `src/components/SkyClouds.tsx` draws the veil, the gliders and the shadows (z 4: over the sea and the waves, under the fish).
    - Each glide is a CSS animation (`skyGlideRight` or `skyGlideLeft`): the glider is as wide as its track and moves by its own width.
    - One memoized `CloudSvg` per cloud.
    - A 1 s tick reads each glide's progress (`getAnimations()[0].effect.getComputedTiming()`) and sets the lining, the light direction and the shadow shift. It skips the update while no glider moved by 1.5 px. Reduced motion: no glide, no tick.
  - `cloudLayoutUtils.getCloudMoonlight` takes the cloud's current centre and scale in px. `getCloudLayout`, `getCloudCount`, `getCloudOpacity` and `getCloudDriftDurationSec` went with the old clouds.
  - `CloudLayer` mounts `SkyClouds` where the veil, the storm deck and the clouds were, and gets `cloudLayers`, `sun`, `skyGradient` and `cloudEgg`. `weatherUtils` adds `cloudLayers` to `WeatherData`. `SunTracker` passes it in live mode and sets `cloudEgg`. `SunVisualization` passes the sun (in %, with its altitude) and the sky gradient.
- **Deviations:**
  1. The overcast veil takes the C2 colour. The lookbook kept the old matrix colour for it, and with it the civil-twilight bug.
  2. Hail (not in the lookbook) has its own layers (90/70/40) and is a deck weather with shafts; without a deck it gets showers.
  3. Clear weather is fair weather (cumulus, lenticulars, shadows), like partly and cloudy. The lookbook had no clear sky.
  4. The palettes blend by the sun's altitude (12°, 5°, 0°, −4°, −12°), not five fixed times. Without the sun's position, each time of day stands for one altitude.
  5. The C2 light direction and the X2 shadow shift follow the gliding cloud (the 1 s tick; the light in 10° steps). The lookbook set them once, from the laid-out place.
  6. A sheet or a deck glides as one row (one animated element), not each tile on its own loop: the same look with fewer animated layers (overcast at 1440×900: 143 clouds in 33 glides).
  7. The wind speed no longer sets the cloud pace (the old sway took 70–240 s by wind); only the wind direction counts.
  8. On a mammatus day the rain canvas keeps falling (it is the live weather); only the deck's rain shafts go. The lookbook stopped the rain.
  9. The old CloudLayer snapshot (ten copies of the blanket path) is gone; the test now checks the deck.
- **Checked:** 34 new tests (886 in all; the 18 tests of the removed helpers went); lint, typecheck and build pass. Main chunk 568.0 kB (185.0 kB gzipped), was 553.2 kB (178.6 kB). In Chrome, Ravensburg, mocked Open-Meteo with the lookbook layers:
  - **Look:** 70 screenshots at 390×844 and 1280×800 of partly, cloudy, overcast, rain, storm, fog and snow, on 2026-10-03 at 13:00 (day, sun 38°), 18:20 (golden hour, 5.5°), 18:53 (sunset, 0°) and 19:20 (civil twilight, −4.5°), and on 2026-10-01 at 23:42 (night, moon 21°, 69 % lit). The types and colours match the lookbook in every weather. Civil twilight: purple low clouds, pink-orange cirrus and a dark violet-grey veil (was day white and day grey). No console errors.
  - **Glide** over 10 s: 390×844 and 1440×900 give the same px/s per type (high 0.29–0.36, mid 0.47–0.64, low 1.41–2.36), at most 2.36 px/s (the sailboat: 5.2), and within 0.005 px/s of the layout on a quiet machine. Wind from the east: the clouds glide to the left.
  - **Silver lining** at night (cloudy, overcast): over 8 s the lit clouds glided 10–16 px, and the moon position that each lining implies stayed within 2 px of the moon disc.
  - **X1:** `?egg=lenticular` in partly weather at 18:20: two lenses over the ridge. `?egg=mammatus` in a storm: lit pouches under the deck, no shafts. **X2:** shadows on the sea by day (cloudy: 5 at 390 px, 16 at 1280 px), fainter in the golden hour, none from sunset.
  - **Reduced motion:** no glide runs; the clouds stand at their laid-out places. Without hourly data the type's own layers apply.
  - **Frame cost** at 4× CPU throttle: the main-thread time per frame with and without the clouds in the same page (median of five 4 s windows each), against the old clouds measured the same way. All runs at 60–63 fps.

    | | New clouds | Old clouds |
    |---|---|---|
    | 390×844 cloudy (10 clouds) | 0.01 ms | 0.37 ms |
    | 390×844 overcast (60) | 0.25 ms | 0.29 ms |
    | 390×844 storm (27) | 0.33 ms | 0.75 ms |
    | 1440×900 partly (18) | 0.32–0.76 ms | 0.21–0.66 ms |
    | 1440×900 cloudy (35) | 0.63–0.70 ms | 0.36–0.42 ms |
    | 1440×900 overcast (143) | 0.25 ms | 0.59 ms |

    A storm at 1440×900 runs at 18–22 fps at 4× throttle with the old and the new clouds alike (20–26 ms per frame, from the rain and storm effects); the clouds' share is below the noise. A Chrome trace shows every glide on the compositor, with no compositing failures.
  - **Not checked:** a real phone, the GPU cost of the blurred layers, a live Open-Meteo response, and item 83's play rate on the glides (not merged yet).

### 85. Fish redone, with rare sharks and dolphins — M — [SUN-CHASER-S](https://ainabler.sentry.io/issues/SUN-CHASER-S) — **✅ Done**

- **Feedback (2026-10-03 09:59):** "Redo fish design and add sharks and dolphins as very rare fish".
- **Now:** 13 day and 5 night species as 24 px line icons (lucide stroke style, no fill; items 62 and 65). `FISH_WEIGHTS` sums to 100; the whale (1) is the rare sea visitor, always far out.
- **Pitch (style):**
  - **F1 Silhouettes:** filled bodies in two tones (dark back, pale belly), no outline. At 10–30 px they read better than 2 px strokes.
  - **F2 Refined line art:** keep the lucide style, which matches the UI icons, and redraw with fins and a gill line. The smallest change.
  - **F3 Shadows under water:** soft dark shapes below the surface; only near fish show detail. The calmest look.
- **Pitch (sharks and dolphins):**
  - **Shark:** a dorsal fin cuts the surface, with a faint body below; a slow, straight glide (0.5 %/s). Weight 0.5.
  - **Dolphins:** a pod of 2–3 that rolls at the surface in slow arcs (back and fin only). The calm-motion rule forbids jumping, so no leaps. Weight 0.5.
  - Both use the whale mechanism (`FISH_WEIGHTS`, far out), so "very rare" is about 1 in 200 fish each.
- **Lookbook:** [Fish Redone](https://claude.ai/artifact/9xfwzHXufL3zvZsRiJA6TJ) (private), with all 18 species at real size and 3× by day, at sunset and at night, live strips and a 390 × 844 phone. The codes FS, SH and DO are new; F1–F13 are item 62's. Styles:
  - **FS0** today's line icons.
  - **FS1** two-tone silhouettes (dark back, pale belly).
  - **FS2** refined line art with fins, a gill line and species marks.
  - **FS3** soft shadows under water; only near fish keep detail.
  - **Sharks** (0.5 %/s): SH1 a fin and a faint body below; SH2 two fins (dorsal fin and tail tip); SH3 a deep shadow, no fin.
  - **Dolphins:** DO1 a rolling pod (a slow 4.5 s arc); DO2 backs that surface and fade, opacity only; DO3 the pod below the surface, only the fin tips break it.
  - **Add-ons:** X1 a ripple above near fish; X2 blur on far fish; X3 a sunset rim light; X4 a V-wake behind sharks and dolphins; X5 night visitors in the moon pool; X6 closer visitors (depth 0.3–1).
  - **Rarity:** shark 0.5 and dolphin pod 0.5; the classic fish goes from 25 to 24, so the weights still sum to 100. Both swim far out, like the whale. About 1 in 200 fish each, or one of each about every 1¾ hours (a simulation of today's spawn loop).
- **Picks (2026-10-03):** "Fish picks: FS1, SH1, DO1, X4, X5, X6".
- **Spec:**
  - **FS1 Silhouettes:** a new `SceneFish` component draws all 18 species (13 day, 5 night) with the lookbook's FS1 paths on the 24 px grid: the fins in the dark back tone, the body in a vertical gradient from the back tone (to 36 %) to the pale belly tone (from 66 %), side fins in the middle tone, then stripes, spots and the eye. No outline, no gill line. The ray has a radial gradient, the seahorse a horizontal one, and the jellyfish a pale bell that fades into its tint. The fish line icons in `sceneIcons.ts` and lucide's `Fish` and `Turtle` go. Opacity: 85 % by day (was 70 %), × the distance, haze (P9) and rain (E2) factors as before. The E1 gold spot after sunset stays, at the centre of the new body.
  - **Colours:** each day species gets `--scene-fish-<species>-back` (its item 62 tint at 0.85 × the saturation and 0.55 × the lightness, at least 16 %) and `--scene-fish-<species>-belly` (0.6 × the saturation, the lightness 55 % of the way to white, at most 92 %). They replace the E3 tints. The middle tone is a `color-mix` of the two. The jellyfish keeps its tint for the bell rim and the arms. The trout's band and a shared eye colour get their own tokens.
  - **Night (item 65) stays as it is:** moonlit fish (NF1–NF3) in a moon-tone pair (`--scene-fish-moon-back`, `--scene-fish-moon-belly`) at 75 %, only in the moon pool. The lanternfish and the anglerfish: a dark body (`--scene-fish-own-back`, `--scene-fish-own-belly`) at 95 %, with their gold lights. The firefly squid: a small dark body with four blue light points and a 3 px halo. The jellyfish: the glow tone at 60 % with a 2 px halo (item 82, J1).
  - **SH1 Shark:** a new `SceneVisitor` component, on a 48-unit grid, facing right. Above the waterline only the dorsal fin shows, in the back tone, with a pale glint line on the water. Below the waterline the whole shark shows as a soft blurred shadow (30 % by day, 14 % at night). 60 px wide when near, 0.5 %/s, a straight glide.
  - **DO1 Dolphins:** a pod of 2 or 3 (even chance) in the lookbook's fixed formation, each dolphin 40 px wide when near, 0.7 %/s. Each dolphin rolls its back and fin through the surface in a 4.5 s arc (from 9 grid units under the surface up and back down, tilted by up to 12°), then stays under the surface until its next roll. The dolphins roll one after the other: 1.5 s apart, plus 0–0.6 s. A faint shadow shows below, and a glint line on the water while the back is up. No leaps. The roll is a CSS animation inside the scene, like every other movement.
  - **X4 V-wake:** two thin lines that open back from the shark's fin and from each dolphin's back, in the glint colour at 60 %. A dolphin's wake shows only while it rolls.
  - **Rarity:** `FISH_WEIGHTS` gets shark 0.5 and dolphins 0.5, and the classic fish goes from 25 to 24 (sum 100). A shark or a pod counts as one fish in the limit (E4), like the whale.
  - **X5 Night visitors:** the shark and the pod also swim from nautical twilight on, with moonlit fins (`--scene-fish-visitor-moon`), only in the moon pool layer and only while the pool strength is above 0, like the moonlit fish (NR3). `NIGHT_FISH_WEIGHTS` gets shark 0.5 and dolphins 0.5, and the moonlit day fish go from 25 to 24 (sum 100).
  - **X6 Closer visitors:** the shark and the pod pass at a depth of 0.3–1, not 0.75–1. A near one is up to 1.4× bigger and lower on the screen (a shark is 33–52 px). The whale stays at 0.75–1.
  - **Light:** the visitors use the day colours by day, the dusk colours (a darker back, a gold glint) at dawn, in the evening and in civil twilight (`getBoatTone` gives `sun` or `twilight`), and the moon colours at night. New tokens: `--scene-fish-shark`, `--scene-fish-dolphin` (the back tones), their `-belly`, `-dusk` and shadow tones, and the glint tones.
  - **Place:** like all fish, from 67 % (far) to 93 % (near) of the height, ±1 %. For a visitor this is the waterline.
  - **Test override:** `?fish=<species>` (for example `?fish=shark` or `?fish=dolphins`) makes every spawn that species, like `?egg=` for the eggs. The weather, time, moon and limit rules still apply. Until now the whale was tested only through `createFish`.
  - **Motion rule** (item 15): every fish, shark and pod glides straight at most at 1.2 %/s, at a phone's pixels per second on wide screens (item 66). The roll moves a dolphin only up and down, about 4 px on a phone.
  - **Not picked:** FS0, FS2, FS3, SH2, SH3, DO2, DO3, X1 (ripple), X2 (blur on far fish), X3 (rim light).
- **Done when:**
  - Tests: the day and night weights sum to 100, with the shark and the dolphins at 0.5; the shark's and the pod's depth (X6) and speed; the night visitors only in the moon pool (X5); FS1 renders all 18 species.
  - In Chromium at 390×844 and 1280×800: day, sunset and night fish (with a jellyfish at night), a forced shark and a forced pod with the wake. No fish, shark or dolphin moves faster than the sailboat in px/s. No console errors.
- **Built:**
  - `SceneFish.tsx`: the FS1 shapes of all 18 species from the lookbook (fins, limbs, body, side fins, band, stripes, spikes, spots, whiskers, eyes; no gill lines), drawn by role, back to front, with the body gradient, the night palettes, the gold or blue light points and the E1 spot. The E1 spot of the turtle moved to the centre of its new shell. `sceneIcons.ts` keeps only `Bat`.
  - `SceneVisitor.tsx`: SH1 (two clip paths: the dorsal fin above the waterline, the blurred shadow below), DO1 (per dolphin a clip above and below, and a `scene-dolphin-roll` and `scene-dolphin-glint` CSS animation, keyframes made from the roll curve in 12 steps) and the X4 wake. The svg lifts itself so the waterline is the swimmer's `y`.
  - `index.css`: back and belly tokens for 12 species and a belly for the jellyfish (they replace 12 of the 13 E3 tints; the jellyfish keeps its tint), the trout band, the eye, the night pairs and 11 visitor tokens.
  - `weatherEffectsUtils.ts`: `shark` and `dolphins` in `FishKind`, `FISH_WEIGHTS` and `NIGHT_FISH_WEIGHTS`; `getFishOverride`.
  - `CloudLayer.tsx`: the `FISH` table without icons, plus the shark (60 px, 0.5 %/s) and the pod (40 px each, 0.7 %/s, pattern `pod`); `createFish` gives the visitors depth 0.3–1, the pod size and roll delays, and the FS1 opacities; the spawn loop reads `?fish=`; `renderFish` uses `SceneFish` and `SceneVisitor` (tone from `getBoatTone`). The swimmer now ends only on its own `animationend`: a dolphin's roll end bubbles up to it, and before this it removed the pod mid-crossing (seen in the browser when a roll clock was set back; item 83's backward play would do the same).
- **Deviations:**
  - Each dolphin rolls every 11 s; the lookbook varied this from 9 to 13 s per dolphin. One keyframes rule keeps the roll at exactly 4.5 s and a pure CSS animation.
  - One shared eye colour (`--scene-fish-eye`) for all species, where the lookbook tinted it per species; at night the visitors' glint is the moon tone (`--scene-moon`), not the lookbook's slightly lighter 92 %. At 10–60 px no difference shows.
  - With `?fish=` by day, a night species swims in the moon tone (it has no day colours).
- **Checked:** 23 new tests (893 in all); lint, typecheck and build pass. In headless Chromium at 390×844 and 1280×800, Ravensburg, clear (stubbed forecast), 15 runs, no console errors:
  - Day (2026-10-03 12:00) and evening (18:50): FS1 classic pairs, minnow schools, perch, pike, carp, catfish, trout and ray read as two-tone shapes, as in the lookbook.
  - Night (2026-09-27 00:30, full moon at 47°): the moonlit burbot and eel only in the pool layer (opacity 1.0); a forced jellyfish glows at 0.59 with the 2 px halo.
  - `?fish=shark`: the fin with its glint, the faint body and the V-wake, 33–52 px wide; at night only in the moon pool, with moonlit fins. `?fish=dolphins`: pods of 2 and 3; held mid-roll, the leader's back and fin are above the water with the glint and the wake, the next one rising (day, dusk with the gold glint, and in the moon pool at night).
  - Speeds on the animation clock: the fastest fish 4.27 px/s at 390 px (a near classic fish, 1.15 %/s) and 4.73 px/s at 1280 px (a near trout); a near sailboat is 4.68 and 5.16 px/s. Sharks 1.15–1.62 px/s, pods 1.8–2.6 px/s.

### 86. Time travel shows the forecast weather — S — **✅ Done**

- **Feedback (2026-10-04):** "while fast forwarding the weather stays the same, it should change the weather from weather forecasts".
- **Now:** item 44 keeps the live weather in a preview. The weather request already gets hourly cloud layers and visibility for 2 days (for the sunset score), but no weather code, temperature, wind or rain per hour.
- **Spec:**
  - Add `temperature_2m`, `weather_code`, `cloud_cover`, `wind_speed_10m`, `wind_direction_10m` and `precipitation` to `hourly=`, with `past_days=1&forecast_days=7` (yesterday to 6 days ahead, 192 hours). Keep the hourly block in `WeatherData` and in the cache; a cache entry without it is refetched.
  - A pure `getWeatherAt(data, at)` (`weatherUtils.ts`) returns the forecast hour nearest `at`: temperature, weather type and condition, cloud cover and layers, wind, rain (mm in the hour = mm/h). Outside the forecast it returns the live weather unchanged.
  - `SunTracker`: in a preview, `weatherData` and (in Real mode) `weatherType` come from `getWeatherAt`, memoized on the hour, so play changes the weather once per forecast hour (every 6 s at 10 min/s), not per tick. Manual weather stays manual. No new request in a preview.
  - InfoPanel: the weather heading reads "Forecast" while it shows a forecast hour (new key `weather.forecast` in 5 languages).
- **Not changed:** the sunset score stays today's and tomorrow's. The cloud layout is new when the layers change, so in play the clouds change at each forecast hour (cross-fade: item 87).
- **Checked:** 4 new tests (945 in all); lint and typecheck pass. In headless Chromium at 390×844, Ravensburg, real Open-Meteo forecast, 2026-10-04 02:26: play forward for 60 s showed "Mainly clear" → "Fog" (05:26–10:26) → "Mainly clear", with the temperature following the hours; a jump to 2026-10-08 10:00 showed rain; "Back to now" returned to "Current Weather". No weather request during the preview.

### 87. Clouds cross-fade to a new layout — S — **✅ Done**

- **Feedback (2026-10-04):** "add the fading" (after item 86: in play the clouds jump to a new layout at each forecast hour).
- **Now:** `SkyClouds` keys its clouds, shadows and veil on `layoutKey` (the day, the weather, the layer cover, the screen, the wind side). A new key replaces the old layout at once.
- **Spec:**
  - The old layout stays mounted for `LAYOUT_FADE_MS` (3 s) and fades to 0; its glides go on. The new layout fades in from 0 (`@starting-style`, Tailwind `starting:opacity-0`). Clouds, sea shadows and the overcast veil fade together.
  - CSS transitions, so item 83's play rate does not speed the fade up or run it back (a forecast hour lasts 6 s in play). Reduced motion: no fade.
  - The fading layout keeps the glide progress of its last tick, so its light and silver lining do not jump.
- **Not changed:** the sky gradient (the overcast mix of item 50) still changes at once; a gradient cannot transition in CSS.
- **Checked:** 2 new tests (947 in all); lint, typecheck and build pass. In headless Chromium at 390×844, Ravensburg, real forecast, play from 2026-10-04 04:15: at the switch to fog, the old layout went 1 → 0 and the fog layout 0 → 1 in about 3 s, also at the next hour (fog to fog with new layers). No new console errors.

### 88. Clouds without box edges — S — **✅ Done**

- **Feedback (2026-10-04):** "some of the clouds look very rectangular, can you please check and propose different design options?"
- **Now (item 84):** three things show the 120 × 60 box of a cloud:
  1. The rain shafts (nimbostratus deck, towering cumulus) are trapezoids with hard sides: 30–40 px wide columns down to the horizon on a phone.
  2. A sheet or a deck is a row of tiles that overlap. Each tile has its own light gradient and its own glow toward the sun, and each tile is see-through, so the overlaps are denser. The row shows vertical bands with straight edges.
  3. The altocumulus "Rows" and "Waves" fill their box with an even grid of puffs, and the cirrus "Streaks" are four lines of the same length. The box outline shows.
- **Lookbook:** [Cloud Edges](https://claude.ai/artifact/SLHaFsy2GvstVC84VZz1w6) (private), on the real cloud layer captured from the app (390 × 844): S0–S3 for the shafts (soft curtains, rain strands, no shafts), D0–D3 for the rows (one light per sheet, light from above, ragged deck), G0–G2 for the fields (oval edge, round shapes only).
- **Picks (2026-10-04):** "s2,d1,g1".
- **Spec:**
  - **S2 Rain strands:** `getShaftStrands` (`cloudShapes.ts`) draws each shaft as 8 thin slanted strands, spread across the shaft's width, 0.5–1 × its 110 units long, 0.8–1.7 units wide, seeded by the shaft. The shaft gradient strokes them, so each strand fades along its own length.
  - **D1 One light per sheet:** `getRowSpan` (`skyCloudUtils.ts`) lays one gradient across the screen, toward the light seen from the screen's middle, and maps it into each tile's units (half-unit steps). The glow sits at the lit end. The tiles are solid (alpha 1, opacity 1); the row carries the opacity (`getRowOpacity`: density × band alpha). The tick moves the gradient with the glide, as it does the silver lining.
  - **G1 Oval edge:** the puffs of "Rows" and "Waves" get smaller toward an oval (58 × 24 units) and drop out at its edge, with a seeded jitter of place, size and turn. The four "Streaks" get their own lengths (0.45, 0.85, 1, 0.6 × the full one) and offsets.
- **Deviations:** no extra 0.7-unit blur on the strands (the lookbook had one): the cloud's own edge blur (2.6 px × scale) already softens them.
- **Checked:** 7 new tests (954 in all); lint and typecheck pass. In headless Chromium at 390 × 844, Ravensburg, manual weather (rain at dusk, storm and overcast by day, partly at dusk), before and after: the rain columns and the vertical bands in the decks are gone, the altocumulus field is an oval. No console errors.

### Feedback round (2026-10-05)

Three Sentry feedback reports, all on release `d79d115` (the current `main`), from Ravensburg. SUN-CHASER-W and -X share a trace ID: one page load on 2026-10-04. SUN-CHASER-Y (2026-10-05 22:15) is archived ("ignored forever") in Sentry. Sentry has no new errors for sun-chaser in 30 days (only the setup test). Request: "check sentry for all errors and user feedback, analyze, spec it out and pitch me ideas how to solve". Item 98 is a fix with a recommended spec. Items 99 and 100 are design work, with a lookbook first.

### 98. The countdown you do not miss — S — [SUN-CHASER-W](https://ainabler.sentry.io/issues/SUN-CHASER-W) — **✅ Done**

- **Feedback (2026-10-04 18:49 CEST, Ravensburg):** "Fireworks are working now but I didn't hear the countdown".
- **Now:** the fireworks (items 41, 80) and the countdown (item 43) are two features. The fireworks always run at the line-of-sight sunset. The countdown runs at the same sunset, but only when the bell toggle in the Sunset row is on. The toggle is off by default, and the app shows no countdown at all when it is off. With the toggle saved as on, a page load creates the `AudioContext` without a user gesture: the browser keeps it suspended, `resume()` fails, and the ticks are silent. Nothing tells the user.
- **Cause:** not provable from Sentry (a feedback event has no breadcrumbs). In order of likelihood:
  1. The bell toggle was off (the default). The user expects the countdown to be part of the fireworks.
  2. The toggle was on from an earlier visit. The page was loaded again and not tapped before the sunset, so the `AudioContext` stayed suspended.
- **Options:**
  - **CD1 Silent pill for everyone (recommended):** the altitude pill shows "Sunset in 10 s … 1 s" before each fireworks sunset, also with the toggle off. The sound stays opt-in.
  - **CD2 Unlock on the first tap (recommended):** with the toggle on, the first `pointerdown` anywhere on the page resumes the `AudioContext` (one listener, removed after it runs).
  - **CD3 Fail visibly (recommended):** with the toggle on, if the `AudioContext` is not `running` 60 s before the target, show a toast: "Tap to turn on the sunset sound". The tap resumes it.
  - **CD4 Teach the bell:** after the first fireworks show with the toggle off, one toast: "Want to hear the countdown next time?" with the bell. Once per device (`localStorage`).
  - **CD5 Fireworks sound:** soft Web Audio pops with the show. Only with the toggle on.
- **Pick (2026-10-05):** "cd1". CD2–CD5 are not done.
- **Spec (CD1):** `useSunsetCountdown(target, now, live, soundOn)` returns the seconds left (10 to 1) in live time, with or without the sound. It schedules the tones only with `soundOn` (the bell toggle) and the page visible. `SunTracker` passes `!isTimePreview` and `isCountdownOn`. A preview shows no pill.
- **Checked:** the item-43 test "toggle off" now expects the pill ("Sunset in 7 s") and no tones; the preview test expects no pill. 954 tests, lint and typecheck pass.

### 99. Bats like the birds: smaller, near and far, a natural flight — M — [SUN-CHASER-X](https://ainabler.sentry.io/issues/SUN-CHASER-X) — **✅ Done**

- **Feedback (2026-10-04 19:06 CEST, Ravensburg):** "Bats should be a little lighter and also behave more like the birds be closer and in the distance and have natural flight paterns".
- **Now (`CloudLayer.tsx`, `createBird`):** a bat is always near (`depth` 0), always 38 px, always alone, 90 % silhouette black (item 64), on a straight line at 2.5 %/s, 20–50 % down the sky. It is bigger than the gull (34 px), although a real bat is much smaller. So the bats look heavy and all the same.
- **Options:**
  - **BT1 Depth like the birds:** a random `depth`; far bats smaller, paler and lower, as the birds (`FAR_SHRINK`, `0.6 × (1 − 0.3 × depth)` haze). Near bats stay dark enough for civil twilight (item 64).
  - **BT2 Lighter weight:** a near bat 24 px instead of 38 px (a pipistrelle is smaller than a gull).
  - **BT3 Small groups:** sometimes 2–4 loose bats (fixed shape, like the bird groups).
  - **BT4 Gentle swoop:** one slow, shallow dip per crossing (2–4 % of the height, eased), not a wiggle.
  - **BT5 Slow bob:** a soft up and down of 1–2 % of the height, 3–4 s per wave.
  - **BT6 Real bat flight:** quick zig-zags and turns. Most natural, but against the calm-scene rule (item 15: no wiggle, no turns), so not recommended.
- **Lookbook:** [Dusk Bats 2](https://claude.ai/artifact/FVVMW5TnATvS1QkPhjXEVC) (private). Controls: colour (today / birds' look), size (38 / 28 / 24 px), depth, groups, motion (BT0, BT4, BT5, BT6), civil or nautical twilight; a phone and a wide view.
- **Recommended:** BT1 + BT2 + BT3, then BT4 or BT5 by eye in the lookbook. Motion must stay at or below 2.5 %/s and phone px/s on wide screens.
- **Decision (2026-10-05):** "lighter colour just a little like the birds": the bats take the birds' silhouette opacity, `0.6 × (1 − 0.3 × depth)`, instead of 90 %. Size, depth, groups and motion are picked in the lookbook.
- **Picks (2026-10-05, lookbook):** birds' look, 24 px (BT2), near and far (BT1), alone (no BT3), BT5 slow bob.
- **Spec:** in `createBird` (`CloudLayer.tsx`) a bat is like a bird: a random `depth`, the birds' `y` (20 % + depth × 30 %) and opacity `0.6 × (1 − 0.3 × depth)`; `BIRDS.bat.size` is 24. The `Bat` icon takes the group's silhouette colour (no own 90 %). BT5: each bat gets `bob` (1–2 vh, 3–4 s per wave, a random phase); the `batBob` keyframes move the icon up and down, `ease-in-out`, `alternate`. The Halloween bats (`CalendarEggs`) stay as they are.
- **Checked:** a new `createBird` test (near and far size, opacity, `y`, bob ranges; no bob on a gull); the item-64 test now expects the birds' colour and the bob. 955 tests, lint and typecheck pass. Headless Chromium, 390 × 844, Ravensburg 19:12 (civil twilight): bats spawn every 9 s, 15–20 px wide, opacity 0.46–0.53, each moves about ±8 px up and down, about 7 px/s across. No console errors.

### 100. A dragon at Lunar New Year — M — [SUN-CHASER-Y](https://ainabler.sentry.io/issues/SUN-CHASER-Y) — **✅ Done**

- **Feedback (2026-10-05 22:15 CEST, Ravensburg):** "A dragon on Chinese lunar new year". Archived in Sentry: confirm that it is a request.
- **Now:** `calendarEvents.ts` has New Year, solstice, Halloween, Christmas and Friday the 13th. There is no Lunar New Year.
- **Spec:**
  - `getCalendarEvent` returns `'lunar-new-year'` on the day of Lunar New Year, from a fixed date list (as the eclipse list in `astroEvents.ts`): 2027-02-06, 2028-01-26, 2029-02-13, 2030-02-03, 2031-01-23, 2032-02-11, 2033-01-31, 2034-02-19, 2035-02-08 (check against the Hong Kong Observatory table).
  - A dragon glides once across the sky per page view on that day, in one straight, slow line (like the black cat on Friday the 13th). Its body is a fixed S shape; it does not wiggle. `?egg=dragon` shows it at once. Reduced motion: no dragon. One special event at a time.
- **Lookbook:** [Lunar New Year](https://claude.ai/artifact/8qZ4mdiMtMtcAPgJodZhAz) (private), by day, at sunset and at night, with Z1 for 2027 and 2028.
- **Feedback on the lookbook (2026-10-05):** "i want a real dragon that flies through the sky". The lookbook now shows RD1 a Chinese lóng (no wings; red-gold or jade-gold) and RD2 a winged Western dragon; motion M1 fixed S, M2 a slow body wave (5 s), M3 a shallow rise and dip, M4 slow wing beats (RD2; against the calm rule); F1 a cloud trail, F2 a pearl (RD1). DR1–DR4 and Z1 below are replaced.
- **Lookbook options:** DR1 a red paper-kite dragon by day; DR2 a gold-red parade dragon with a lantern string; DR3 a dragon of stars at night; DR4 a dragon-shaped cloud (subtle, all day).
- **Open question:** a dragon every Lunar New Year, or the zodiac animal of each year (2027 goat, 2028 monkey, …)? Answered by the picks: a dragon every year.
- **Picks (2026-10-05):** RD1 lóng, M2 body wave, M3 rise and dip, F1 cloud trail, F2 pearl; "but make the color random, red, jade, or complete gold". M2 is a deliberate exception to the calm-scene rule (no wiggle) for this once-a-year event.
- **Spec as built:**
  - `calendarEvents.ts`: `'lunar-new-year'` for the whole local day of the dates above, after the New Year minute and before Friday the 13th. `?egg=dragon` forces it (`SunTracker`).
  - `LunarDragon.tsx`: the lookbook's RD1 drawing (SVG built once, the body redrawn in one rAF loop; the frame ID in a `useRef`). Colour per page view, at random: red-gold, jade-gold or gold (`DRAGON_PALETTES`). Light by time of day: day, sunset (civil twilight, dawn, evening), night. 224 px long (0.66 px per unit), 23 % down the sky, 1.6 %/s capped at 6.24 px/s (a phone crossing takes about 108 s). M3: ±3 % of the height over the crossing, nose along the path. F1: a wisp every 18 px, fading over 20 s.
  - `CalendarEggs`: one flight per page view (`dragonDone`); none under reduced motion.
- **Checked:** tests: the date list (whole day, 2027 and 2035, not the day after); the dragon gets one of the three colours, still flies at 100 s on a 390 px phone, is gone at 160 s; no dragon under reduced motion. 957 tests, lint (our files) and typecheck pass. Headless Chromium, Ravensburg, 2027-02-06, after 45 s: a red dragon at 13:00 (390 × 844), a gold one at 17:40 (civil twilight), a gold one at 21:00 (1280 × 800, night light). No console errors.

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

### 13. Line of sight with terrain — L — **✅ Done**

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
- **Checked (2026-10-01):** Sion (CH) against a second-hand PeakFinder value: sunrise −2.5 min, sunset +4.3 min, inside the 5-min target. A first-hand PeakFinder check or an observation would make it stronger (see Verification).

### 14. Premium gating (deferred) — M — **✅ Done** (Play-app code; enforcement off until item 16)

- **Status:** the Play-app steps 1–5 below are built; `PREMIUM_ENFORCED` stays `false` until item 16. The Stripe backend below is ready but only needed for a later web sale.
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
  4. Gate the gold-plus features only where the Digital Goods API exists and `PREMIUM_ENFORCED` is true. This includes the share card (item 68).
  5. Tests with a mocked Digital Goods service: no API → unlocked; API without a purchase → locked; API with a purchase → unlocked.
- **Built:**
  - `hooks/usePremium.ts`: `usePremium(language)` gets the Play Billing service, calls `listPurchases()` and `getDetails(['premium'])` at start, and returns `isPremium`, `isBillingAvailable`, `isLocked`, `price` (Intl, in the chosen language), `buy`, `restore` and `requirePremium(action)`. `localStorage` `premium-owned` is only a start hint; the purchase list overwrites it. Without the API, or when `getDigitalGoodsService` rejects (Chrome outside the Play app), Premium is unlocked.
  - The gate is in one place: `SunTracker` provides the hook through `PremiumContext`, and each gold-plus control calls `requirePremium`: change location (panel and loading screen), manual weather, time travel (play and the time picker), the sunset score, both line-of-sight buttons, the compass and the share card. While locked, line of sight is off (no terrain fetch), the score shows only its label, and a tap opens `PremiumDialog` (title, what Premium includes, the local price, Buy, Restore, Cancel).
  - Buy: `PaymentRequest` for `premium`; a cancel (`AbortError`) is quiet, other errors show a toast. After a purchase `PremiumBadge` is gone everywhere. The web keeps the plus (item 35).
  - Pure helpers in `utils/premium.ts` (`isPremiumLocked`, `ownsPremium`, `formatPrice`, the hint). Types in `src/digital-goods.d.ts`. New texts `premium.*` in all five dictionaries.
  - `PREMIUM_ENFORCED` stays `false`. For screenshots and manual checks, the dev server takes `?premium=enforce` (`import.meta.env.DEV` only; the production build drops it).
  - The dialog is hand-built: `components/ui` has no dialog, and the shadcn dialog would add `@radix-ui/react-dialog`.
- **Acknowledge (open, blocks item 16):** Digital Goods API v2 has no client `acknowledge()`. The [Chrome docs](https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing) and [chromeos.dev](https://chromeos.dev/en/publish/pwa-play-billing) acknowledge on a backend with the Play Developer API (`purchases.products.acknowledge`). `paymentResponse.complete('success')` only closes the payment UI. The code calls the v1 `acknowledge(token, 'onetime')` where the browser still has it. Before the release, test with a licence tester that a purchase is still there after 3 days. If not, add a small backend function (for example a Supabase Edge Function) that acknowledges the token.
- **Checked:** 30 new tests (815 in all), lint, typecheck and build pass. In Chromium at 390×844 with a fake Digital Goods service and `?premium=enforce`: "Change location" opens the purchase dialog (en and de, €3.99 / 3,99 €) and not the form; after Buy the dialog closes, no gold plus is left (9 → 0) and the form opens. Without the query (enforcement off), web and fake Play app: no dialog, the form opens, the plus stays.
- **Left for item 16:** create the managed product `premium` in the Play Console, turn on `playBilling` in Bubblewrap, solve the acknowledge point above, set `PREMIUM_ENFORCED = true`, and test buy, restore and refund with a licence tester.
- **Later, only for a web sale (not planned):**
  1. Supabase Auth in the frontend (sign-in, session handling, `@supabase/supabase-js` client).
  2. Upgrade UI: pricing dialog → call `create-checkout` → redirect to Stripe.
  3. Handle the return URLs `/?checkout=success` and `/?checkout=cancel` (toast + call `check-subscription`).
  4. Gate the premium features on `check-subscription` (`subscribed: true`) when `PREMIUM_ENFORCED` is true. The features marked with the gold plus (item 35): change location, manual weather, the sunset score, line of sight and compass.
  5. A "Manage subscription" button → `customer-portal`.
  6. Optional: a Stripe webhook function that updates `subscribers` without polling.
  7. Tests for the edge functions (Deno test with mocked Stripe).
- **Gold plus (scene review R22, 2026-09-30):** the plus on each Premium feature (item 35) is on purpose and stays. After a purchase the plus goes away. When `PREMIUM_ENFORCED` is true and the user has not bought Premium, a tap on a feature with the plus opens the purchase: the Play Billing flow in the Play app (item 45). Outside the Play app there is no gate. Until then, all features stay free for development and testing.
- **Note:** paying for digital features inside an Android app requires Google Play Billing. Stripe is only allowed for web purchases. Decided in item 45: Play Billing in the Play app, the web free.

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
- **Test APK (2026-10-02):** a signed test APK exists, for a phone check before the Play release.
  - The Bubblewrap project is in `~/sun-chaser-android/`, outside git. It has the keystore and its password file. Do not commit them.
  - Package `com.ainabler.sunchaser`, host `sun-chaser.vercel.app`, `display: fullscreen`, notifications on, `playBilling` on, `minSdkVersion` 23 (the billing library needs 23).
  - `public/.well-known/assetlinks.json` has the SHA-256 fingerprint of this local key. With Play App Signing, add the Play app signing key's fingerprint from the Play Console to this file.
  - Package name decided (2026-10-02): `com.ainabler.sunchaser`. It has the brand and the app name, no personal name and no country domain, because the app is for all countries. It stays fixed after the first Play upload.
  - Distribution for phone tests: the Play Console internal testing track (decided 2026-10-02).
- **Status (2026-10-05):** the Play Console app exists. The first AAB (version 1, host `sun-chaser.vercel.app`) is in the internal test, not yet sent to review. The privacy policy is live at `/privacy` (PR #99). Open:
  1. **Move to Cloudflare** (decided 2026-10-05). Why: Vercel Hobby does not allow commercial use, and Premium makes the site commercial; Vercel Pro costs US$20 per month. Cloudflare Pages is free with commercial use, and Cloudflare Registrar sells the domain at cost with free e-mail routing.
     - Done: `public/_headers` has the same security headers as `vercel.json` (PR #103).
     - To do (owner): Cloudflare account with 2FA, buy `sun-chaser.app` (checked free on 2026-10-05), Pages project on the GitHub repo (preset Vite, `npm run build`, output `dist`, `NODE_VERSION=22`, `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`), custom domain. Leave Web Analytics and Rocket Loader off: their injected scripts break the CSP.
     - To do (code): `host` in `~/sun-chaser-android/twa-manifest.json` to `sun-chaser.app`, a new AAB (version 2) as an update to the closed test, the Play app signing SHA-256 in `assetlinks.json`, `vercel.json` to a permanent redirect to `sun-chaser.app` (then delete its headers and `tests/headers.test.ts`), the privacy policy URL in the Play Console, Cloudflare as the host in the privacy policy. Do this before the production release: the host is in the store app.
     - To do (code, live radar of item 96): a Pages Function for `/api/planes` (`functions/api/planes.ts`) that wraps `handlePlanesRequest` from `src/utils/planeFeed.ts`. The redirect in `vercel.json` must not take `/api/planes` before the move is done (decided 2026-10-06).
  2. **Contact e-mail and address service.** The privacy page shows the private gmail address now. Replace it with `hello@sun-chaser.app` (Cloudflare Email Routing to the private inbox). An alias alone is not enough for the GDPR (Art. 13 needs the controller's identity), so the name stays. Before Premium goes on sale: book an address service (a "ladungsfähige Anschrift", about €5–15 per month), so the home address does not appear in the Play listing, the privacy policy or an imprint.
  3. **Closed test with 12 testers for 14 days.** Production access needs at least 12 testers who opt in and stay opted in for 14 days in a row. Start as early as possible: a new AAB during the test does not restart the 14 days. Track "Alpha", the same AAB, an e-mail list with 12 or more Google accounts (plus spares), and a feedback address. After 14 days, apply for production access in the Console (review about 7 days).
  4. **Live radar (item 96) before the Premium release.** To do (owner): e-mail the adsb.lol operator (production use in a paid app, about one request per user per 15 s per 0.1° cell, the planned API key). The Cloudflare wrapper of the proxy is in the move checklist above.

### 101. YouTube account and the store preview video — S

- **Why:** the Play store listing takes its preview video only as a YouTube link. The 30 s ad (`store/preview-video/`) is ready but has no place to be published.
- **Depends on:** item 16 (the store listing).
- **Spec:**
  1. Make a new YouTube channel for Sun Chaser. Use a brand account, not a personal channel, so no personal name is shown.
  2. Upload `sun-chaser-ad.mp4` (1080×1920, 30 s). Make it public or unlisted, embeddable, not age-restricted, and with ads off. Use the title "Sun Chaser" and use `store/preview-video/cover.jpg` as the thumbnail.
  3. Put the clean video URL (`https://www.youtube.com/watch?v=<id>`) in the "Preview video" field of the Play store listing.
  4. If YouTube raises a Content ID claim on the music, dispute it with the Mixkit track page and `store/preview-video/AUDIO-LICENSES.md`.
- **Done when:** the video plays on the Play store listing, with no ads and no open claim.

---

## Version 2.0 — A livelier, smarter sky

Request (2026-10-04): "shark attacking and eating other fish; fish & bird collision avoidance, at the moment some fish swim right at top of each other or at boats and birds can sometimes also fly directly at each other; planes that leave cloud strips in the distance, with a flight radar connection; satellites in the night, with satellite tracking; sea is a bit crowded now, maybe too many fish, and it takes a while until it fills up, pitch some ideas how to circumnavigate; clickable elements, get infos when you click on a boat, fish, bird, plane, satellite, cloud, the sun, the moon, the terrain; performance improvements; faster fade out, 10s is too much when switching to fullscreen, but ok if I activate it by clicking when already in full-screen mode; keep alive in the android app".

Decisions (2026-10-04):

- **Premium:** the live flight radar (item 96) and the satellite tracking (item 97). All other parts are free. As item 45 decided, the gate works only in the Play app; the web gets all features free.
- **Keep alive:** both the screen and the background (item 90).
- **Shark hunt:** a lookbook first (item 94).
- **Sea fill:** warm start, busy and quiet phases, lower caps (item 93). Not picked: a density setting.

Order: the fixes first (items 89–91). Item 91 measures a baseline, so items 92–97 each have a frame budget. Item 92's lane planner comes before items 93 and 94, which use it. Items 89 and 90 are small and help the Play release (item 16), so they can ship before the rest.

Frame budget for items 92–97: each new scene feature adds at most 0.5 ms per frame on item 91's phone profile. For comparison, the clouds of item 84 added 0.25–0.30 ms.

### 89. Faster fade when entering fullscreen — S — **✅ Done**

- **Feedback (2026-10-04):** "faster fade out, 10s is too much when switching to fullscreen, but ok if I activate it by clicking when already in full-screen mode".
- **Now:** in fullscreen, `SunTracker` hides the cursor and the chrome (`showCursor`) after 10 s without a mouse move or a tap. Entering fullscreen starts the same 10 s timer. On a desktop the pointer moves a little after the click on the fullscreen button, and each move starts the 10 s again.
- **Spec:**
  1. Two constants: `ENTER_HIDE_MS = 3000` and `WAKE_HIDE_MS = 10000`.
  2. On entering fullscreen, the chrome hides after 3 s. A mouse move or a tap before this first hide starts the 3 s again, not 10 s.
  3. After the first hide, a mouse move or a tap shows the chrome and hides it after 10 s, as today.
  4. Leaving fullscreen shows the chrome, as today.
- **Done when:** a test with fake timers: enter → hidden at 3 s; a move at 2 s → hidden at 5 s; a tap after the hide → visible, hidden 10 s later. In the browser on a desktop and on a phone, the chrome fades 3 s after entering fullscreen.
- **Built (2026-10-04):** the new hook `useIdleHide` (`src/hooks/useIdleHide.ts`) has the two constants and the rules 2–4. `SunTracker` (the cursor and the top-left buttons), `InfoPanel` and `MusicPlayer` use it. The panel and the radio had their own 10 s timers, which the spec did not name. Without the change, they faded 7 s after the rest. A move or a tap anywhere wakes the top-left buttons; the panel and the radio wake on a hover, a focus or a tap on them, as before. Tests: the three "Done when" cases for the hook and for `SunTracker`; the panel and radio tests now hide at 3 s (6 new tests, 960 in all). Lint and typecheck pass. Open: the check in the browser on a desktop and on a phone.

### 90. Keep alive in the Android app: screen on, radio in the background — M — **✅ Done**

- **Feedback (2026-10-04):** "keep alive in the android app". Decision: both, the screen and the background.
- **Now:**
  - `useWakeLock(isFullscreen)` keeps the screen on only in Fullscreen-API fullscreen. `isFullscreen` comes from `document.fullscreenElement` (`FullscreenButton`). The Play app (TWA, `display: fullscreen`) is fullscreen through the manifest's display mode, and there `document.fullscreenElement` stays null. So the wake lock never starts, and the phone sleeps after its screen timeout.
  - The radio (`MusicPlayer`, an `HTMLAudioElement`) has no Media Session. Android shows no lock-screen controls, and it can stop the audio sooner in the background.
  - When Android stops the app in the background, the next start shows the loading screen again.
- **Spec:**
  1. **K1 Screen on:** a pure helper `isInstalledApp()`: true when `matchMedia('(display-mode: fullscreen)')` or `matchMedia('(display-mode: standalone)')` matches. `SunTracker` calls `useWakeLock(isFullscreen || isInstalledApp())`. The hook already gets the lock again on `visibilitychange`. A normal browser tab does not change: there the lock stays fullscreen only.
  2. **K2 Radio in the background:** while the radio plays, set `navigator.mediaSession.metadata` (the station name, "Sun Chaser", the app icon as artwork), `playbackState`, and the action handlers `play`, `pause` and `nexttrack` (the next station, as the Next button of item 5). The audio plays on with the screen off and in another app. The lock screen and the notification shade show the controls.
  3. **K3 Fast return:** save the time the app was last visible in `sessionStorage` (`last-visible`, with try/catch). When the page loads and that time is less than 30 min ago, skip the iris and use the `fade` reveal. When the system stopped the app fully, the app starts fresh, as today.
- **Not in scope:** a "Keep screen on" switch. Add one when users ask for it; the power button still turns the screen off.
- **Done when:** unit tests for `isInstalledApp` and for the K3 reveal choice. On an Android phone with the Play test build: the app open for 10 min without a touch → the screen stays on; the radio plays for 10 min with the screen off, and the lock screen shows the station with play, pause and next; 2 min in another app and back → no iris (this also checks that `sessionStorage` is still there after a reload by the system).
- **Built (2026-10-04):**
  - **K1:** `isInstalledApp()` (`src/utils/installedApp.ts`) replaces the display-mode check in `PWAInstallPrompt`, which now uses it too. It keeps the two other checks of `PWAInstallPrompt`: iOS `navigator.standalone` and an `android-app://` referrer (a page that the TWA opens). `SunTracker` calls `useWakeLock(isFullscreen || isInstalledApp())`. A desktop browser in fullscreen (F11 or the Fullscreen API) can also match `display-mode: fullscreen`. There the screen stays on and the install prompt does not show.
  - **K2:** `MusicPlayer` sets the Media Session: the station name, "Sun Chaser" and the manifest's `any` icons (`icon-192.png`, `icon-512.png`) as metadata, `playbackState`, and the handlers `play`, `pause` and `nexttrack` (the function of the Next button). It clears them on unmount. `playStream` and `handleNext` are now `useCallback`s, so the handlers stay the same between renders.
  - **K3:** `src/utils/fastReturn.ts`: `saveLastVisible` (on `visibilitychange` and `pagehide`), `loadLastVisible`, `isFastReturn` (less than 30 min ago, not in the future) and `getStartReveal`, the pure reveal choice. `SunTracker` reads the time once, at load.
  - **Checked:** 14 new tests (974 in all): `isInstalledApp`, the K3 choice and storage, the Media Session on a fake session, and in `SunTracker` the wake lock in the installed app and the fade after a fast return. Lint, typecheck and build pass. Open: the phone checks of "Done when" on the Play test build.

### 91. Performance: measure, then fix the hot spots — M

- **Request (2026-10-04):** "performance improvements".
- **Now (from the code, not measured yet):**
  - **H1 The clock tick renders everything:** `SunTracker` ticks every second (every `PLAY_TICK_MS` during play) and renders the whole tree: `InfoPanel` (1,277 lines), `SunVisualization` (1,294 lines) and `CloudLayer` with every fish, bird and boat. Only `SkyClouds` uses `React.memo`. `CloudLayer` uses the date only for its month and its seeds.
  - **H2 Glass over moving content:** the glass buttons and the panel use `backdrop-blur-md`. When the sea, the rain or the fish move behind them, the browser blurs again on every frame.
  - **H3 Filters on moving things:** the jellyfish and squid halos (`drop-shadow`), the boat lights, the shark's blurred shadow and others are filters on moving elements. They repaint on every frame.
  - **H4 Canvas loops:** `SeaCanvas` (about 30 fps), `RainCanvas` and `NightStars` draw at up to 2× device pixels.
  - **H5 One large bundle:** the last local build has one JS chunk of 695 KB (before gzip). The easter eggs, the share card and the place search load at start.
- **Baseline (2026-10-05, main d79d115):** `npm run perf:trace -- --runs 2`, headless Chrome 154 on an Apple Silicon Mac. Each value is the median of 2 runs of 60 s, because other jobs used the CPU at the same time. Script and Render (style + layout) and Main busy come from CDP `Performance.getMetrics`; Paint (PrePaint + Layerize on the main thread) and Off-main (compositor, viz and GPU threads) come from the trace. Values are ms per second. Phone = 390×844 @3x with 4× CPU throttle; desktop = 1280×800 @1x.

  | Profile | Scene | Script | Render | Paint | Off-main | Main busy | Frame p95 ms | Frame max ms | Long tasks/min | Heap MB |
  |---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
  | phone | day | 19 | 19 | 9 | 100 | 92 | 16.8 | 225 | 0 | 7.2 |
  | phone | night | 100 | 12 | 8 | 135 | 176 | 16.8 | 17 | 0 | 10.2 |
  | phone | rain | 45 | 25 | 11 | 117 | 138 | 16.7 | 100 | 0 | 7.7 |
  | phone | fullscreen | 20 | 19 | 8 | 38 | 91 | 16.7 | 33 | 0 | 7.2 |
  | desktop | day | 9 | 7 | 3 | 146 | 38 | 16.8 | 17 | 0 | 7.4 |
  | desktop | night | 32 | 3 | 3 | 172 | 57 | 16.8 | 25 | 0 | 8.5 |
  | desktop | rain | 27 | 9 | 5 | 191 | 70 | 16.7 | 17 | 0 | 8.4 |
  | desktop | fullscreen | 11 | 8 | 4 | 73 | 48 | 16.8 | 17 | 0 | 7.7 |

  - All scenes run at 60 FPS, and the p95 frame time already meets the targets. Headless Chrome does not wait for the GPU, so the GPU cost shows in Off-main and not in the frame times.
  - Start bundle (`npm run build`): `index` JS 581.34 kB (190.11 kB gzip) + `workbox-window` 5.65 kB (2.20 kB gzip) = 586.99 kB (192.31 kB gzip). The share card (`modern-screenshot`, 22.22 kB) already loads later. CSS: 56.08 kB (11.24 kB gzip).
  - **Hot spots (CPU profile, phone):** at night, the `NightStars` frame loop takes 73 ms/s of 176 ms/s. It sets `fillStyle` and `shadowBlur` for each star on every frame (60 fps), and `fill` and the GC add 18 ms/s more. By day, JS is small (about 16 ms/s): `SeaCanvas` (`drawImage`, `drawMirror`) 9 ms/s, React and the clock (`formatTime`) 4 ms/s. The glass is the largest cost by day: when fullscreen hides it, Off-main falls from 100 to 38 ms/s (phone) and from 146 to 73 ms/s (desktop).
  - **Order by expected gain:** H2 (glass blur), then the `NightStars` loop (new; draw the stars to a cached layer and twinkle fewer of them, or at a lower rate), then H4 (`SeaCanvas`), H1 and H3. H5 changes only the start time.
- **Spec:**
  1. **Measure first.** A script `scripts/perf-trace.mjs` (Playwright with the Chrome DevTools Protocol) opens fixed scenes with a stubbed forecast and a fixed clock: Ravensburg, clear by day with fish, boats and birds; at night with stars; in rain; in fullscreen idle. It runs each scene for 60 s at 390×844 with 4× CPU throttle (the phone profile) and at 1280×800 without throttle. It writes per second: scripting, rendering and painting time, the p95 frame time, long tasks and the JS heap. Run it on `main` and write the baseline into this item.
  2. **Fix the hypotheses in order, one commit each, and measure after each.** Keep a fix only when it gives a gain:
     - H1: `React.memo` on `CloudLayer` and the other scene parts. Give them the date rounded to the minute where they need no seconds.
     - H2: a smaller blur radius, or a solid glass colour without blur while the chrome is hidden in fullscreen.
     - H3: replace the filters on moving things with drawn glows (a radial gradient in the SVG), and give the moving wrappers `will-change: transform`, so the compositor moves them.
     - H4: draw the sea at 1× device pixels (it is soft anyway), and at 20 fps in fullscreen idle.
     - H5: `React.lazy` for the easter eggs, the share card and the place search.
  3. No visual change: compare screenshots of each scene before and after.
- **Done when:** the baseline and the numbers after each fix are in this item. Targets, to check against the baseline: on the phone profile at least 30 % less main-thread time per second and a p95 frame time of 33 ms or less; at 1280×800 a p95 frame time of 16.7 ms or less (60 fps); a start bundle at least 25 % smaller. All tests pass, and the screenshots show no difference. The trace script stays in `scripts/`, so items 92–97 can check their frame budget.
- **New reference (2026-10-06, main f092dfc + the `--screenshots` flag):** items 92–95 merged after the baseline. Same setup, median of 2 runs of 60 s. The machine was quieter than on 2026-10-05, so the phone values are lower than the baseline for the same code; compare a fix only with runs on the same day.

  | Profile | Scene | Script | Render | Paint | Off-main | Main busy | Frame p95 ms | Frame max ms | Long tasks/min | Heap MB |
  |---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
  | phone | day | 15 | 9 | 5 | 72 | 59 | 16.8 | 17 | 0 | 8.8 |
  | phone | night | 71 | 5 | 4 | 92 | 114 | 16.8 | 17 | 0 | 7.6 |
  | phone | rain | 25 | 8 | 6 | 73 | 70 | 16.8 | 17 | 0 | 8.5 |
  | phone | fullscreen | 11 | 4 | 2 | 19 | 38 | 16.7 | 17 | 0 | 6.4 |
  | desktop | day | 15 | 14 | 6 | 239 | 69 | 16.7 | 17 | 0 | 8.4 |
  | desktop | night | 53 | 5 | 4 | 259 | 92 | 16.8 | 17 | 0 | 12.5 |
  | desktop | rain | 38 | 15 | 8 | 255 | 103 | 16.7 | 17 | 0 | 9.1 |
  | desktop | fullscreen | 18 | 17 | 8 | 131 | 82 | 16.7 | 17 | 0 | 6.7 |

  - Start bundle: `index` JS 643.20 kB (212.21 kB gzip) + `workbox-window` 5.65 kB (2.20 kB gzip) = 648.85 kB (214.41 kB gzip), 62 kB more than the baseline. CSS: 57.00 kB (11.36 kB gzip).
  - **Frame budget of items 92–95:** the baseline build (d79d115) and main (f092dfc), back to back, 2 rounds each (main-thread ms/s, then ms per frame at 60 fps): phone day 39 → 34 (−0.08 ms), phone night 106 → 106 (0), desktop day 59 → 77 (+0.30 ms), desktop night 92 → 91 (0). The desktop-day value of main was 61 and 62 in two later sessions with the same day code, so the +0.30 ms is mostly noise. All within the 0.5 ms budget.
  - **Noise:** between two runs of the same build, main busy varies by up to ±5 ms/s on the phone and ±15 ms/s on the desktop; desktop off-main varies by up to ±90 ms/s. A fix counts only when it beats that.
- **Fixes (2026-10-06), each an A/B against main, back to back, 2 rounds (ms/s, median):**
  - **H2 glass blur (dropped, Lutz's decision 2026-10-06: "Keep as is"):** the blur radius changes the look, so Lutz decided. Phone day off-main: 56 (12 px, now) → 46 (4 px) → 18 (no blur, the glass colour at 0.65 instead of 0.45). Desktop day off-main: 196 → 186 → 125. Main busy does not change (phone 37 → 35 → 33). Fullscreen idle does not change (the chrome is hidden, and a hidden glass costs nothing already). The screenshots (phone and desktop, day; `--screenshots`) went to Lutz with the question. Without blur the panel and the buttons are darker and show no frost over the fish and the waves.
  - **NightStars sprite atlas (dropped):** each star drawn once to an atlas, then `drawImage` with `globalAlpha` (the same pixels: mean alpha difference 0.5 of 255). Script falls from 65 to 35 ms/s on the phone, but the canvas work moves out of script, and main busy stays the same (phone 104 → 104, desktop 92 → 108). Copying only the star's own square did not help either. A build that draws no stars has 31 ms/s at night on the phone: the 300 draw calls per frame cost about 73 ms/s, whatever the draw call.
  - **NightStars twinkle at 30 fps (kept, Lutz's decision 2026-10-06: "Yes, 30 fps twinkle"):** the stars draw on every second frame; a shooting star still draws at 60 fps. Phone night main busy 104 → 71 (−32 %), desktop 92 → 72 (−22 %); off-main 86 → 73 and 252 → 207. A still frame looks the same; the twinkle moves in 30 steps per second instead of 60. With the atlas added, 30 fps gives no more gain (phone 73), so only the frame skip is in. Two new tests drive the loop at 60 Hz: 30 drawn frames per second, and every frame while a shooting star flies.
  - **H4 SeaCanvas at 1× device pixels and 20 fps in fullscreen idle (dropped):** phone day main busy 37 → 34, fullscreen 35 → 32; off-main 56 → 54 and 18 → 18. Within the noise, and the sea is softer on a 3× screen.
  - **H1 `React.memo` on `CloudLayer` (dropped):** the date to the minute and the object props memoized in `SunVisualization`. Phone day main busy 34 → 34, desktop 62 → 60: within the noise. The sun and moon positions already change only every 30 s (`sunStepKey`), so the 1 s render is small.
  - **H3 filters on moving things (not tried):** without the glass, phone day off-main is 18 ms/s and main busy 33 ms/s; the profile shows no filter hot spot.
  - **H5 `React.lazy` (dropped):** the easter eggs (`LunarDragon` 11.4 kB, `TemperatureIceberg` 5.4 kB, `CalendarEggs` 3.5 kB, `MidnightGhost`, `Fireworks`, `Ufo`, `DiscoSky`, `SunSunglasses`), the share card (6.5 kB) and the place search (2.7 kB) are about 36 kB of the 643 kB `index` chunk (6 %), less than the 10 % threshold. Larger parts: `react-dom` 129 kB and the five languages 79 kB (the four not shown are 64 kB, 10 %: loading only the shown language would reach the threshold).
  - **Against "Done when":** p95 frame time ≤ 33 ms on the phone and 16.7–16.8 ms on the desktop: met. 30 % less main-thread time on the phone: met at night only (104 → 71 ms/s, −32 %); open by day, in rain and in fullscreen, where no kept fix gives a gain beyond the noise (the glass blur, the largest day cost, stays as is). Start bundle 25 % smaller: open; a possible later step is loading only the shown language (the four others are 64 kB, 10 % of the `index` chunk). Screenshots: the 30 fps twinkle shows the same still frame.

### 92. No overlaps: fish, birds and boats plan their lanes — M — **✅ Done**

- **Feedback (2026-10-04):** "fish & bird collision avoidance, at the moment some fish swim right at top of each other or at boats and birds can sometimes also fly directly at each other".
- **Now:** every fish, bird and boat crosses from left to right at its own constant speed (the `moveAcrossX` CSS animation). Its height (`y`) is random at spawn, and nothing checks the others. A faster fish catches up with a slower one at the same height and swims through it. Near fish (67–93 % of the height) cross the boat hulls (67–87 %, 94 % in fullscreen). A gull (2.5 %/s) overtakes a heron (1.6 %/s) at the same height, and other birds fly through the hovering kestrel.
- **Pitch:**
  - **A1 Lanes planned at spawn (recommended):** all motion is known when a thing spawns: the start, the speed and the rest-stop easing. So the app can calculate where each thing is at any time, and give the new one a free height. No per-frame code, the glide stays straight, and the calm-motion rule holds.
  - **A2 Steering (boids):** on each frame, each animal turns away from the others. This needs a rAF loop and per-frame state for every animal (against the CSS architecture), costs frame time, and makes the animals wiggle. Not recommended.
- **Spec (A1):**
  1. A pure util `src/utils/scenePaths.ts`. `xAt(entity, t)` gives the left edge in % at time t: linear, or along the rest-stop curve of `getRestStopMotion`. `findLane(candidate, others, now)` tests heights near the random pick, in steps of a quarter of the candidate's height and within the type's band. It gives the nearest height where the candidate's box touches no other box during the shared time, with a margin of 25 % of the smaller height. It samples every 0.5 s: at most a few thousand box checks per spawn, a few times per minute.
  2. Fish check against all fish and all boats; a boat's box includes the hull and its reflection. Birds check against all birds, the bats and the night geese included. Boats check against boats and fish. A pair (P6) or a school uses its whole box, with the lag.
  3. No free height: skip this spawn. The next check tries again.
  4. Time-travel play (item 83) changes the rate of all animations by the same factor, so the plan holds, also backwards.
  5. Item 93's warm start places its first set with `findLane` too.
- **Done when:** unit tests for `xAt` (linear and with a rest stop) and for `findLane` (a free height, a full band, a pair). A simulation test: 30 min of spawns with the real rules and a fixed seed → no two boxes touch, and the spawn rate drops by 15 % or less. In the browser at 390×844 and 1280×800, 10 min each by day and at night: no overlaps.
- **Built (2026-10-04):** `src/utils/scenePaths.ts`: `xAt`, `findLane` and a scene clock that runs at the play rate of item 83, so the lanes hold in fast forward and in rewind. A rewind spawn plans its whole crossing. `getRestStopMotion` also returns its curve. The spawn rules moved from the `CloudLayer` effect into the pure `spawnTick`, so the simulation test runs the same code. Each fish, bird and boat stores its path. The boat box is the hull plus the calm reflection (70 %); the box of a shark or a pod is the whole svg. When no height is free, the spawn does not occur, and the gap clock does not move on: the next 500 ms check tries again. Simulation (30 min, seed 92, live): 0 touching boxes (43–130 without the plan); 2–10 % fewer spawns. On a 1280 px screen, item 70's ×3 caps fill the band with fish: boats spawn 8–69 % less often, mostly far ones. Item 93's lower caps reduce this to 0–20 % in most runs. The browser check is still open.
- **Boats have the right of way (2026-10-05):** feedback: "i dont want 69% less boats, the fish should avoid the boats not the other way round". A boat takes a lane clear of the fish when there is one, else any lane clear of the other boats. The fish never stop a boat; new fish plan around it. Simulation (30 min): no fewer boats than without the plan; at most 3 fish meet a boat (fish that swam when a boat took a full band). Browser check at 1280×800 (2026-10-05): no overlaps of birds, of fish or of boats.

### 93. A calmer sea that is full from the start — M — **✅ Done**

- **Feedback (2026-10-04):** "sea is a bit crowded now, maybe too many fish, and it takes a while until it fills up, pitch some ideas how to circumnavigate".
- **Now:** a phone shows at most 5 fish (3 at night), 3 boats and 4 birds. Turtles and jellyfish do not count against the fish limit. `getWaterLimit` grows the limits with the width (item 70): ×3 at 1280 px, so 15 fish, 9 boats and 12 birds. Everything enters at the left edge: the first fish comes after 5–8 s, the first boat after 5 s, and on a desktop it takes 4–5 min until animals are spread over the whole width.
- **Pitch:**
  - **S1 Warm start:** the scene opens full. The first set starts part of the way across.
  - **S2 Lower caps:** fewer fish and boats, and less growth on wide screens.
  - **S3 Busy and quiet phases:** the target number follows the time of day, with slow lulls.
  - **S4 A density setting:** Calm / Normal / Lively in the panel.
  - **S5 Both directions:** half of the animals cross from the right. More natural, but head-on meetings need item 92, and every drawing needs a mirrored form.
- **Picks (2026-10-04):** "Warm start, Busy and quiet phases, Lower caps" (S1, S3, S2).
- **Spec:**
  1. **S1 Warm start:** at load, and when a group starts again (for example the day fish after rain), spawn the group's target number at once. Each one gets a random progress p of 0.1–0.9 and a negative `animation-delay` of −p × its duration, so it starts p of the way across. The rest-stop easing works with a negative delay too. Each one gets its height from `findLane` (item 92). Then the normal spawn loop continues.
  2. **S2 Lower caps:** `MAX_FISH` 5 → 3, `MAX_NIGHT_FISH` 3 → 2, `MAX_BOATS` 3 → 2; `MAX_BIRDS` stays 4. Turtles and jellyfish count against the fish limit. `getWaterLimit` grows the limits with the width up to ×1.5, not ×3 (1280 px: 5 fish, 3 boats, 6 birds). This takes back part of item 70.
  3. **S3 Busy and quiet phases:** a pure util `getSceneDensity(date, sunTimes, seed)` gives a factor of 0.3–1. The base curve: 1 in the hour around sunrise and around sunset (feeding time, and the birds fly to their roost), 0.7 by day, 0.5 at night. A slow lull on top: a seeded noise in 10-minute steps (the seed is the day and the rounded place, as for the clouds) takes away 0–40 %. The factor multiplies the caps (rounded, at least 1) and the spawn chance. When the target goes down, nothing is removed: the animals on screen swim on.
  4. The calm-motion rule stays: no speed changes.
- **Not picked:** S4 (a density setting) and S5 (both directions).
- **Depends on:** item 92.
- **Done when:** unit tests for the caps, the width growth and `getSceneDensity` (the curve, the lull range, the same value for the same seed). A simulation test: 1 s after load the sea has at least 60 % of its target; over a simulated day the mean number on screen follows the curve. In the browser at 390×844 and 1280×800: the sea is full at load and quieter than today.
- **Built (2026-10-05):**
  - **S2:** `MAX_FISH` 3, `MAX_NIGHT_FISH` 2, `MAX_BOATS` 2, `MAX_BIRDS` 4. `canSpawnFish` counts each fish, turtles and jellyfish included. The new `getSceneLimit` (`weatherEffectsUtils.ts`) grows the limits with the width up to ×1.5 (1280 px: 5 fish, 3 boats, 6 birds) and multiplies them by the density (rounded, at least 1). `getWaterLimit` stays for the waves and the foam of the sea canvas, so the water does not change.
  - **S3:** `getSceneDensity` (`src/utils/sceneDensity.ts`): the curve (1 within 30 min of sunrise and sunset, 0.7 by day, 0.5 at night; polar day 0.7, polar night 0.5) times 1 − 0.4 × a lull. The lull is a seeded value per 10-minute step with straight lines between the steps. The seed is `getDaySeed` (the day and the place rounded to 0.1°), which `SkyClouds` now uses too. `SunTracker` passes the sun times through `SunVisualization` to `CloudLayer`; without them the density is 1. The density multiplies the limits and the spawn chances of fish, boats and birds. Nothing is removed when it goes down.
  - **S1:** in `spawnTick`, a group (birds, fish, boats) that did not show at the last check fills to its limit at once: at load, and when the weather or the time lets it back (for example the fish after a storm). Each one gets a progress p of 0.1–0.9, a path that started p × duration ago, a height from `findLane`, and `animation-delay` −p × duration. CSS applies the rest-stop easing to the progress, so a resting fish starts on its curve. `CloudLayer` runs one check at mount, so the scene is full before the first 500 ms tick.
  - **Fade-in (follow-up):** at load the scene's reveal covers the warm start. A group that starts later (after a storm, at dawn) fades in: each warm-started animal gets a second CSS animation, `sceneFadeIn` (opacity 0 to its own opacity, 2 s, ease-out). The crossing keeps its speed and delay. Only the end of `moveAcrossX` removes a fish, bird or boat (`endsCrossing`), so the fade's `animationend` does not.
  - **Time-travel play (item 83):** no warm start during play; the 8× shorter gaps fill the scene. A rewind warm start is not needed and would not work: the playback hook starts each new animation at its end, which would overwrite the negative delay, and a rewind spawn must plan its whole crossing from its end. When play stops, the groups that show keep what they have.
- **Checked:** 18 new tests (988 in all), lint and typecheck pass. Item 70's and item 65's limit tests now expect the new limits. The tests of the spawn loop pass `warmStart={false}`, so the scene starts empty as before. Simulation, seeds 1–10, live, density 1: 1 s after load the sea has 100 % of its target (390 px: 3 fish and 2 boats; 1280 px: 5 and 3; at night 2 and 2, 3 and 3). Over a simulated day (Friedrichshafen, 2026-10-05, phone) fish and boats on screen: 3.7 at sunrise and sunset, 2.4 by day, 1.3 at night; the hourly mean follows the density (r = 0.98). Item 92's simulation with the new limits (30 min, seeds 1–10): boats spawn −5 to 9 % less often with the lane plan at 390 px, and −15 to 18 % at 1280 px (item 92: 8–69 %). A negative value is more boats with the plan. The browser check is still open.

### 94. Shark hunt — M — lookbook first — **✅ Done**

- **Feedback (2026-10-04):** "shark attacking and eating other fish".
- **Conflict:** the calm-motion rule (items 15, 62 and 66): slow straight glides, no fish faster than the sailboat (1.2 %/s), no jumping. An attack is fast by nature. Decision (2026-10-04): a lookbook first.
- **Now:** a shark (item 85, SH1) is 1 in 200 fish, by day and at night (in the moon pool). It glides at 0.5 %/s at a depth of 0.3–1 and does not touch other fish.
- **Lookbook (to build):**
  - **H1 Gentle gulp:** the shark keeps its glide. Its lane is planned to meet a small fish, and the fish fades into the shark's shadow with a few bubbles.
  - **H2 Short chase:** the shark speeds up to at most 1.2 %/s for a few seconds; nearby small fish turn away.
  - **H3 The school splits:** a minnow school opens around the shark and closes behind it. No fish is eaten.
  - **H4 Near miss:** the fish sinks into the dark water just in time.
  - **H5 From below:** the shark rises from the deep haze under a fish; a ring of bubbles, and the fish is gone.
  - **Add-ons:** X1 a ripple ring on the surface; X2 small fish keep away from the shark's lane for a while; X3 the shark slows down after a meal; X4 a hunt on some sharks only (for example 1 in 2).
  - Each variant on a day, a dusk and a moon-pool night strip, at real size and at 3×, and on a 390×844 phone.
- **Mechanics (all variants):** a hunt is a planned meeting. When a shark spawns, item 92's `xAt` finds a small fish (a minnow school, a classic fish, a perch, a trout) in the same depth band whose path the shark meets on screen (at 20–80 % of the width). The shark takes that lane. At the meeting time a timeout plays the hunt on that fish. No per-frame code. No hunts during time-travel play (item 83).
- **Depends on:** item 92.
- **Done when:** the lookbook is built and the picks are in this item. Then the spec, the build and the tests.
- **Picks (2026-10-05):** "Shark hunt picks: H1, H2, H3, H4, X1, X2, X3, X4". Not H5.
- **Spec:**
  1. **Who hunts (X4):** 1 in 2 new sharks hunt. A hunting shark picks one of H1–H4 at random, with equal weights, from the variants that have a prey and a meeting. With no such variant, the shark only glides (item 85).
  2. **The prey:** H1 a classic fish, H2 a perch, H3 a minnow school, H4 a trout. The prey is one fish (no pair, P6) at the shark's depth, so it has the shark's size factor and its pixel speed. At night (item 85, X5) the prey is a moonlit fish in the moon pool; no minnow school swims at night (item 65), so there is no H3 at night.
  3. **The meeting:** a new shark starts at the left edge, and every prey is faster than the shark (1.0–1.2 against 0.5 %/s). So a fish that is on screen already is ahead of the shark and never meets it. The plan therefore makes the prey part of the hunt: at the shark's spawn, the plan picks a meeting point at 20–80 % of the width (at night within ±9 % of the moon's x; with no such point, no hunt). It calculates the shark's path to that point and the prey's path from the left edge, so that the prey's centre meets the shark's nose there (`xAt`). The prey swims at the shark's body line. It spawns with the shark and waits behind the left edge (a positive `animation-delay`) until its start. Both lanes must pass `findLane` against everything else (the shark against the fish and boats, the prey against the fish and boats but not its shark). Fish and boats that spawn later plan around both. The prey does not count against the fish limit (item 93).
  4. **Speed changes are part of the path:** H2 and X3 are in the shark's crossing as a CSS `linear()` easing, as the rest stop (P8). So `xAt` and the lane plan see the real motion. H2: from 0.5 to 1.2 %/s over 2 s, 8 s before the meeting; 1.2 %/s until the meeting. X3 after a meal (H1, H2): the shark eases to 0.35 %/s over 3 s (H1 from 0.5 s after the meeting; H2 from the meeting, from 1.2 %/s). All speeds × the depth factor and × item 66's phone factor, as for every fish.
  5. **The hunt plays at a timeout:** at its start time a timeout gives the prey its hunt. The hunt is CSS animations of opacity, filter and offset inside the prey's wrapper; the crossing animation does not change. No per-frame code.
     - **H1 Gentle gulp:** from 1.5 s before the meeting, the fish slows to the shark's speed over 1.5 s (an offset inside the wrapper). From 1.2 s before the meeting it fades into the shark's shadow over 2 s: opacity 0, blur 1.5 px, brightness 65 %. Four bubbles (0.6–1.1 px) rise 5.4 grid units in 2.2 s behind the nose, from 0.3 s before the meeting, 0–1.6 s apart. Then the fish is removed.
     - **H2 Short chase:** the shark keeps pace with the perch (step 4). From 1.5 s before the meeting the perch fades as in H1. Then it is removed.
     - **H3 The school splits:** each minnow moves up (above the shark) or down (below its fins) when it is 55 grid units behind the nose, over 15 grid units of the school's gain on the shark. It holds, and comes back to its place when it is 4–13 grid units past the nose. At most 15 grid units from its place; on a phone at most 4 px/s up or down. No fish is eaten.
     - **H4 Near miss:** from 2 s before the meeting the trout fades to 30 % over 2 s and swims on. No blur and no darkening: the trout stays on screen, and a lasting filter on a moving thing costs frame time (item 91, H3).
  6. **X1 Ripple ring:** H1, H2 and H4. A thin ring in the glint colour opens on the surface above the meeting, 7.4 grid units behind the nose: from 2.8 to 16.6 grid units wide, 0.28 as high, in 3.5 s, and fades out. A ripple and the bubbles stay where they start (they do not move with the shark). Item 85's glint colours by light (day, dusk, moon).
  7. **X2 Keep away:** for 60 s from the meeting, new small fish (classic, minnow, perch, trout) do not take a lane in the shark's box (its height, across the whole width).
  8. **No hunt during time-travel play (item 83)** and none with `prefers-reduced-motion` (there are no moving things then). A hunt that is planned when play starts does not play; the shark and the prey swim on. No hunting shark in item 93's warm start: it starts part of the way across.
  9. **The shark keeps its card (item 95):** the shark and the prey take taps as before; a card stays open when its fish is eaten.
  10. **Test override:** `?hunt=H1` … `?hunt=H4` makes every shark hunt with that variant (with `?fish=shark`, every spawn is a shark).
  11. **Calm motion (items 15, 66):** nothing faster than 1.2 %/s × the depth factor, no jump, no wiggle, no U-turn. No blood, no teeth, no open jaws.
  12. **Cost:** the frame budget of item 91 (≤ 0.5 ms per frame). Only a fish that fades out gets a filter, for 2 s.
  13. **A fish dives under a boat (item 92 follow-up, coordinator 2026-10-05):** boats have the right of way, so a boat on its fallback lane (no lane clear of the fish) can meet a fish that swims already. At the boat's spawn, `xAt` finds each fish whose box the boat's box meets, and the first time of that meeting. 2 s before it, the fish plays the H4 dive: it fades to 30 % over 2 s and swims on behind the boat. Only live, as the hunts.
- **Built (2026-10-05):**
  - `src/utils/sharkHunt.ts` (pure): the variants and their prey, `pickMeetX` (20–80 %, at night ±9 % of the moon), `planMeeting` (the shark's time to the meeting point and the prey's start), the speed profiles of H2 and X3 (`sharkKnots`, `distanceAt`: smoothstep ramps, integrated exactly) as a `linear()` easing (`pathFromKnots`), `planPreyHunt` (the timeline: H1's slow-down offset, H3's per-minnow delays and moves, the ripple and the bubbles), `getKeepAwayPath` (X2) and `getHuntOverride`.
  - `spawnTick`: a new shark hunts with a chance of 1 in 2. For each variant it plans the meeting, places the shark with its curve (`findLane`), and checks the prey's lane at the shark's body line. One of the variants that pass, at random. The prey joins the fish list at once with a positive `animation-delay`, so later spawns plan around it. `last.keepAway` holds the X2 lanes. A boat on its fallback lane gives each fish that it meets (`firstMeeting`, new in `scenePaths.ts`) a dive time.
  - `CloudLayer`: one timeout per planned hunt and per dive, on the scene clock. At its time the prey gets `hunted`, and `renderFish` wraps it in a div with `sceneHuntSlow` and `sceneHuntFade` (H1), `sceneHuntFade` (H2) or `sceneHuntFaint` (H4, dive); H3 gives each minnow `sceneHuntShift`. The end of `sceneHuntFade` removes the fish. Play (item 83) clears the timeouts and drops the planned hunts. `SceneHuntFx` draws the ripple and the bubbles at the meeting point, in the moon pool layer at night; the ripple's end removes them.
  - **How often (simulation, 1,000 h each, `spawnTick` with a fixed seed):** a phone by day (density 0.7): 216 sharks, 101 hunts (H1 25, H2 26, H3 24, H4 26), so about 1 hunt per 10 h of daylight. 1280 px: 57 hunts (1 per 17 h; fewer sharks spawn there, as the crossings are longer). Night, full pool at the middle: 38 hunts (no H3). Dives under a boat: 0.06 per hour on a phone, 0.6 per hour at 1280 px.
  - **Calm:** the fastest shark speed on a curve: 1.03 %/s (H2 at depth 0.3; the cap is 1.2 × the depth factor). H3 moves a minnow at most 4 px/s up or down on a phone.
  - **Deviations:** (1) the lookbook said "xAt finds a small fish" on screen. No fish on screen can meet a new shark (step 3), so the prey is planned and spawned with its shark. (2) The prey can be one fish above the fish limit. (3) No veering pair in H2: item 92's lanes already keep the other fish apart, and a veer would change their planned paths. (4) H4 and the dive have no blur and no darkening (step 5). (5) A dolphin pod or a shark can dive under a boat too: the item 92 simulation found a pod that met a boat. (6) The bubbles and the ripple scale with the shark (grid units), not the lookbook's fixed px.
  - **Item 92 follow-up:** the item 92 simulation now counts a fish–boat meeting only when the fish does not dive: 0 in all four scenes (it was "at most 3").
  - **Checked:** 31 new tests (1,074 in all); lint and typecheck pass. Test: `?fish=shark&hunt=H1` (… `H4`): every spawn a hunting shark with its prey; a far shark meets its prey after up to 6 min. The browser check (frame budget of item 91, the look at 390×844) is still open.
- **Decision (2026-10-06):** the shark share stays at 1 in 200 fish ("the shark-share is fine i want this to be a rare occurance"). A phone sees about 1 hunt per 10 h of daylight.

### 95. Info cards: tap anything in the scene — L — **✅ Done**

- **Feedback (2026-10-04):** "clickable elements, get infos when you click on a boat, fish, bird, plane, satellite, cloud, the sun, the moon, the terrain". Free.
- **Now:** the scene layer (`CloudLayer`) is `pointer-events-none`. Only the sun is a button: 7 taps give it sunglasses (hidden egg). The fish are 7–60 px wide, many smaller than a finger.
- **Spec:**
  1. **Hit areas:** each fish, bird, boat, plane and satellite wrapper gets `pointer-events-auto` and an invisible hit area of at least 44 × 44 px around it (the WCAG 2.5.5 target size). The rest of the scene stays `pointer-events-none`: a tap on empty water does nothing, and touch scrolling in the panel (item 2) does not change.
  2. **Card:** a small glass card (the glass style, 18 px corners) shows above the tapped point, inside the screen. It closes on a tap outside, on Escape, or after 15 s. One card at a time.
  3. **Follow, do not stop:** the tapped thing moves on (a stop would break item 92's lane plan and item 94's hunt). A thin ring follows it as a child of its wrapper, so the same CSS animation moves it. When the thing leaves the screen, the card stays until it closes.
  4. **Content** (every text in `en.ts`, `de.ts`, `es.ts`, `it.ts` and `fr.ts`):
     - **Fish:** the species, one fact (for example "Lanternfish make their own light"), and day or night fish.
     - **Bird:** the species, one fact (for example "Geese fly in a V to save energy"), and its season (item 74).
     - **Boat:** the type (sailboat, ferry, fishing boat, rowboat, freighter) and one fact.
     - **Cloud:** the cloud type (item 84), its layer (low, middle, high) and the cover in % from the forecast.
     - **Sun:** the altitude and the direction, the next event with a countdown ("Sunset in 2 h 13 min"), and the golden hour. The 7-tap egg stays: each tap counts, and the card opens on the first.
     - **Moon:** the phase name, the lit part in %, rise and set, and the distance (supermoon).
     - **Terrain:** the direction, the horizon angle, and the distance and height of the ridge point. Today `computeHorizonProfile` stores only the angle per azimuth; it also stores the distance and the height of the point that gives the angle. Peak names (OpenStreetMap `natural=peak`) are a later step.
     - **Plane and satellite:** items 96 and 97 add their cards.
  5. **Accessibility:** the sun, the moon and the terrain are buttons with an `aria-label` and work with the keyboard. The moving things are pointer-only and `aria-hidden`.
  6. With `prefers-reduced-motion` there are no moving things, so only the sun, moon, cloud and terrain cards.
- **Done when:** unit tests for the card content per type and for the ridge distance and height. Component tests: a tap on a fish opens its card; a tap outside closes it; the sun still counts 7 taps. In the browser at 390×844: each type can be tapped, the card stays inside the screen, and the frame budget holds (item 91).
- **Built (2026-10-05):** `src/utils/sceneInfo.ts` returns the card rows per type as dictionary keys and formatted values; `SceneInfoCard` shows them. SunTracker keeps one card and passes `onSceneInfo` and the ring id down through `SunVisualization` to `CloudLayer` and `SkyClouds`. In `CloudLayer` only the render changed: each fish, bird and boat wrapper gets `pointer-events-auto`, `aria-hidden` and a hit area of at least 44 × 44 px with the ring inside. A cloud takes taps on its own box; its ring is a sibling in the glider, outside the blur. The sun keeps its egg count; the moon is a button of at least 44 px; the terrain path is a button (`role="button"`, Enter and Space pick the highest ridge on screen). `computeHorizonProfile` stores `ridgeDistances` and `ridgeHeights`; the cache key is now `v2`, so an old profile loads again once. Differences from the spec: the bird season is a word (all year, spring and summer, migration, autumn, at dusk), not months, so it holds in both hemispheres. A moonlit fish outside the moon pool is not visible but takes taps. With an overcast deck, a tap in the sky opens a cloud card, so only Escape, the timer or a tap on the sea closes the card. The browser check at 390×844 is still open.

### 96. Planes with contrails; live flight radar — L — Premium (the live radar) — **✅ Done** (free part; the live radar waits for the proxy decision)

- **Feedback (2026-10-04):** "planes that leave cloud strips in the distance, with a flight radar connection". Decision: the live radar is Premium.
- **Spec, free: planes and contrails:**
  1. A small airliner silhouette crosses high and far (y 8–30 %), at 0.3–0.6 %/s, about one every 3–6 min by day. At night only its lights show: a white light that blinks slowly (every 2 s) and the red or green wing light. No planes in fog, overcast, storm or rain: they cannot be seen.
  2. **Contrails from the real upper air:** the forecast request gets `temperature_250hPa` and `relative_humidity_250hPa` (about 10.4 km high). A pure util `getContrail(tempC, rhPercent)`:
     - warmer than −40 °C: no contrail;
     - −40 °C or colder, RH below 40 %: a short trail that fades in about 10 s;
     - RH 65 % or more: the air is about saturated with respect to ice, so the trail stays, spreads slowly to a band and fades over 5–10 min;
     - between: a medium trail (about 1 min).
     The thresholds are constants, to tune against photos of the real sky.
  3. The trail is a thin line behind the plane. It grows with the plane (CSS, the same animation clock), and widens and fades slowly. It takes the light of the sky: white by day, pink and gold at sunset (the clouds' light, item 84).
  4. Planes get their lanes with the birds (item 92).
- **Spec, Premium: live flight radar:**
  1. **Source:** the adsb.lol API (open ADS-B data). The free OpenSky API is for non-commercial use only, so a Premium feature cannot use it. Before the build, check the adsb.lol endpoint, CORS, rate limits and licence terms (ODbL attribution). When CORS is closed, a Vercel Edge function forwards the request.
  2. **Request:** the aircraft within 100 km, every 15 s, only while the app is visible and the live radar is on. Send the place rounded to 0.1° (about 11 km), not the exact place.
  3. **Place on the screen:** from the observer to each aircraft, the bearing gives x (`getAzimuthScreenFraction`, or the compass field of view in compass mode, item 19), and the elevation angle gives y (the altitude scale of the sun arc). An aircraft below 1° or behind the terrain (`horizonAngleAt`) does not show. Between two requests each aircraft moves on with its speed and track, so the motion is smooth. A jet 50 km away moves about 0.3°/s, which is calm.
  4. The contrail rule of the free part applies to each aircraft above 8 km.
  5. **Card (item 95):** the callsign, the airline, the aircraft type, the altitude, the speed, and the route when adsb.lol has one; "Data: adsb.lol".
  6. A "Live planes" switch in the panel with the gold plus (item 35). Off by default, because it sends the rounded place to a third party. `usePremium` gates it in the Play app; on the web it is free (item 45).
  7. CSP: add the host to `connect-src` in `vercel.json`. The privacy policy (item 16) names adsb.lol.
- **Source check (2026-10-06):**
  - **Endpoint:** `GET https://api.adsb.lol/v2/point/{lat}/{lon}/{radius}` (also `/v2/lat/{lat}/lon/{lon}/dist/{radius}`). The radius is in nautical miles: 100 km = 54 nm. A test at Ravensburg (47.8, 9.6, 54 nm) gave 50 aircraft. Each has `hex`, `flight` (the callsign), `r` (registration), `t` (type code, for example `BCS3`), `alt_baro` and `alt_geom` (ft), `gs` (kt), `track` (°), `lat`, `lon`, `seen_pos` (s), `dst` (nm) and `dir` (°). There is no airline name: the app must map the callsign prefix (ICAO airline code) to a name. The route is a second request, `POST /api/0/routeset` (callsign and position); it gave no route for a test callsign.
  - **CORS: closed.** The GET answers have no `Access-Control-Allow-Origin` header for any origin tested (`https://sun-chaser.app`, `http://localhost:8080`, `null`), and a preflight (`OPTIONS`) gives 405. A browser cannot read the answer, so the app needs a proxy.
  - **Rate limits:** none in the docs and no rate-limit headers. The terms (OpenAPI `info` at `api.adsb.lol/api/openapi.json`): "You can use the API for free. In the future, you will require an API key which you can get by feeding to adsb.lol. If you want to use the API for production purposes, please contact me so I do not break your application by accident."
  - **Licence:** ODbL 1.0 for the API and all its data (the OpenStreetMap licence). Commercial use is allowed. The planes on screen are a "produced work": they need the attribution ("Data: adsb.lol", with a link to the ODbL). Share-alike applies only to a database made from the data, which the app does not publish.
  - **Result:** the licence allows the Premium radar, but the build stops here (coordinator rule). Open decisions: (1) the proxy: the spec says a Vercel Edge function, but the site moves to Cloudflare Pages (item 16), so a Cloudflare Pages Function at `/api/planes` is the likely choice; (2) contact the adsb.lol operator for production use, and plan for the future API key ("by feeding": a receiver station). Only the free part (planes and contrails) is built.
- **Built (2026-10-06), the free part:**
  - `src/utils/planes.ts` (pure): `getContrail(tempC, rhPercent)` with the thresholds as constants (`CONTRAIL_MAX_TEMP_C` −40, `CONTRAIL_DRY_RH` 40, `CONTRAIL_ICE_RH` 65); without the upper air, no contrail. `CONTRAIL_LOOK`: a short trail lasts 10 s, a medium one 60 s, a persistent one 300–600 s (random per plane) and spreads to 8× its width. `getPlaneLook` (depth 0 = near: top edge 8 %, 0.6 %/s, 18 px; depth 1: 30 %, 0.3 %/s, 11 px), `getTrailLength`, `getTrailPieces`, `getPlaneOverride`.
  - The forecast request gets `temperature_250hPa` and `relative_humidity_250hPa`; `getUpperAirAt` (`weatherUtils`) reads the hour nearest the scene's time, so time travel (item 86) shows the forecast's contrails too. `SunTracker` passes `contrail` through `SunVisualization` to `CloudLayer`. Manual weather has no upper air: planes without contrails.
  - `spawnTick`: a plane every 3–6 min (the gap is rolled once per plane, not on each check), at most 2 crossing at once, day and night. The speed × the wide-screen factor (item 66), as for the birds. Planes and birds plan their lanes against each other (item 92). With no free lane, the next check tries again.
  - `ScenePlane`: a small airliner silhouette (the critter colour at 50 %, less far out). From nautical twilight on, only the lights: a white strobe that flashes once every 2 s (`planeStrobe`) and one steady red or green wing light.
  - The trail is in the high clouds' light (`getCloudColors('Ci', 'high', …)`, item 84): white by day, gold and pink at sunset, dim at night. A short or medium trail is a fixed tapered gradient inside the plane's wrapper, so the same `moveAcrossX` animation moves it: thin at the engine, wider and fainter behind, as long as its life × the speed. A persistent trail stays in the sky: 12 pieces along the crossing; each grows (`scaleX`) while the plane passes it, on the crossing's clock, then spreads (`scaleY`) and fades over its life. Only transform and opacity animate. The plane stays in the list until the last piece fades; in rewind (item 83) this end also comes last.
  - The planes are drawn before the clouds, so the clouds pass in front of them. Card (item 95): "Airliner", one fact, "Altitude: 9–12 km (cruise)" and the contrail kind.
  - **Deviations:** (1) no planes in drizzle, snow or hail either (the spec names fog, overcast, storm and rain): these fall from a cloud deck. (2) The lights show from nautical twilight on, not in civil twilight (the same switch as the night fish, item 65). (3) Test override `?plane=persistent` (or `medium`, `short`, `none`): a plane every 20 s with that contrail.
  - **Checked:** 27 new tests (1,107 in all), lint and typecheck pass. Item 92's simulation now checks the planes against the birds too: 0 touching boxes. The item 94 H3 test now counts only fish that fade into a shark (the planes take random numbers, so in that seeded run a fish dives under a boat). Frame budget (item 91, phone/day, 2 runs): before 127 ms/s main-thread busy; after 108 (the seeded scene changed: no boat); after with `?plane=persistent` (two planes with persistent trails, 51 animations) 133 ms/s, 60 fps, frame p95 16.7 ms: at most +25 ms/s = 0.42 ms per frame. Screenshots (perf trace, 390×844): by day two silhouettes with their trails; at night the wing lights and a faint trail. The real look at sunset and the night lights' size are still open.
- **Decision (2026-10-06):** the radar proxy is a Vercel Edge function (not Cloudflare). "Look for another source" before the app commits to adsb.lol.
- **Source options (2026-10-06):** the volume is 1 request per active Premium user per 15 s = 240 requests per user-hour; 100 user-hours per month = 24,000 requests. A 100 km circle has about 50–70 aircraft (tests at Ravensburg: adsb.lol 50, adsb.fi 66). Every source below needs the proxy: a key must not be in the app, and no tested community feed sends CORS headers.
  - **adsb.lol:** `GET api.adsb.lol/v2/point/{lat}/{lon}/{nm}`, no key (today). Licence ODbL ([openapi.json](https://api.adsb.lol/api/openapi.json)): commercial use allowed, with attribution. Free. No published rate limit. CORS closed. Callsign, registration, type code; no airline name; route only through `POST /api/0/routeset` (empty in the test). Terms: an API key "by feeding" later, and "contact me" for production use.
  - **adsb.fi:** `GET opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{nm}`, no key, 1 request/s ([github.com/adsbfi/opendata](https://github.com/adsbfi/opendata)). "For personal, non-commercial use only"; commercial use by request. Attribution with a link. CORS closed. Same fields as adsb.lol (`t`, `desc`, `r`, `flight`); no airline, no route.
  - **airplanes.live:** `/v2/point/{lat}/{lon}/{nm}` ([api-archive](https://github.com/airplanes-live/api-archive), archived 2026-04-29). The API now answers 403: "Please contact us at contact@airplanes.live …". Non-commercial; commercial data on request ([airplanes.live/commercial-use](https://airplanes.live/commercial-use/), price not public).
  - **ADS-B Exchange:** the Community API ([RapidAPI](https://rapidapi.com/adsbx/api/adsbexchange-com1/pricing), US$10 per month, 10,000 requests) is non-commercial: "any use within a product or service made available to third parties" needs written permission ([developer hub](https://www.adsbexchange.com/community/developer-hub/)). Commercial: Enterprise API, price on request.
  - **OpenSky:** "Any use by a for-profit or commercial entity requires written permission and a license", and "Operational use of the REST API in any live product … also requires a written license" ([terms](https://opensky-network.org/about/terms-of-use)). Price on request.
  - **FlightAware AeroAPI:** `GET /flights/search` with `-latlong "lat1 lon1 lat2 lon2"` (a box). The Personal tier is "personal or academic purposes only"; Standard (commercial B2C) has a US$100 monthly minimum, 5 result sets/s ([aeroapi](https://www.flightaware.com/commercial/aeroapi/)). A result set is 15 flights at US$0.005–0.05 depending on the endpoint, so 50 aircraft = 4 sets per request: 24,000 requests ≈ US$480–4,800 per month. Has operator, origin and destination.
  - **Flightradar24 API:** live flight positions in a box (`bounds`), key required. Explorer US$9 (30,000 credits, hobby), Essential US$90 (333,000 credits, "ideal for commercial use"), Advanced US$900 (4,050,000 credits) ([subscriptions](https://fr24api.flightradar24.com/subscriptions-and-credits), [credit overview](https://fr24api.flightradar24.com/docs/credit-overview), [commercial use](https://support.fr24.com/support/solutions/articles/3000128176-can-the-api-be-used-for-commercial-purposes-)). Light positions cost 6 credits per returned flight: 50 aircraft = 300 credits per request; 24,000 requests = 7.2 million credits ≈ US$2,200 per month. Has airline and route (full: 8 credits per flight).
  - **AirLabs:** `GET airlabs.co/api/v9/flights?bbox=…` with key ([docs](https://airlabs.co/docs/flights)). Returns `airline_iata`/`airline_icao`, `dep_iata`, `arr_iata`. Free plan 1,000 queries for personal use; commercial from Developer about US$49 (25,000 queries) and Business about US$99 (100,000 queries) per month (third-party listings; the pricing page did not load without JavaScript). 1 query per request, whatever the number of aircraft. The update rate of the positions is not documented: check it before the build.
  - **aviationstack:** commercial from Basic US$49.99 per month (10,000 requests) ([pricing](https://aviationstack.com/pricing)), but the flights endpoint has no radius or box query and updates every 30–60 s: not usable for a radar.
  - **Recommendation:** adsb.lol stays the first choice. It is the only free feed whose licence (ODbL) allows the paid app, and its data is the raw ADS-B position every second. Do this before the build: e-mail the operator (production use, the volume, the future key; a receiver to feed costs about €50), and cache in the Edge function per 0.1° cell for 15 s. Airline names: a static ICAO airline table in the app from the callsign prefix; the route only where `routeset` has one. Fallback: AirLabs Business (about US$99 per month up to 100,000 requests; airline and route included) if adsb.lol says no or the key is not possible. FlightAware and Flightradar24 cost US$500–2,000+ per month at 24,000 requests, because they bill per aircraft. adsb.fi, airplanes.live, ADS-B Exchange and OpenSky need a commercial licence on request.
- **Decision (2026-10-06):** "adsb.lol + I e-mail them". Lutz contacts the operator before the release.
- **To do (Lutz):** e-mail the adsb.lol operator before the Premium release (also in item 16).
- **Built, live radar (2026-10-06):**
  - **Proxy:** `api/planes.ts`, a Vercel Edge function (`runtime: 'edge'`; Vercel deploys each file in `/api` as a function, also in a Vite project; `vercel.json` has no rewrites, so nothing takes `/api/*`). It wraps `handlePlanesRequest` in `src/utils/planeFeed.ts`, a pure module with relative imports only, so a Cloudflare Pages Function can wrap it later. `GET /api/planes?lat=..&lon=..`: two plain decimal numbers (anything else: 400; another method: 405), clamped and rounded to 0.1°. It asks `api.adsb.lol/v2/point/{lat}/{lon}/54` with a 6 s timeout and returns only `hex`, `callsign`, `type`, `altM`, `speedKt`, `track`, `lat`, `lon`, `ageSec` and the data time `now`; aircraft on the ground (about a third of the answer at Ravensburg) are left out. `Cache-Control: public, max-age=0, s-maxage=15, stale-while-revalidate=15`: one upstream request per 0.1° cell per 15 s. An upstream error, bad JSON or the timeout: 502 with no body and `no-store`. `npm run dev` and `vite preview` serve the same handler through a small plugin in `vite.config.ts`. `api/` is in the typecheck.
  - **Client:** `useLivePlanes` asks `/api/planes` at once and every 15 s, only while the switch is on and the page is visible (and at once when it is visible again); a failed request keeps the last answer for up to a minute. `src/utils/liveRadar.ts` (pure): `deadReckon` (speed and track, from the position's age and the time since the answer), `distanceAndBearing`, the elevation angle with the curvature and refraction of `elevationAngleDeg` (item 13; the eye height from the terrain profile), `isAircraftVisible` (1° or more, above `horizonAngleAt`), `getLiveContrail` (the forecast's contrail above 8 km), `getAirlineName` (67 ICAO airline codes common over Europe).
  - **Scene:** `LivePlanes` in `SunVisualization`, drawn before the clouds, the terrain and the sea, so a plane that flies behind a ridge is hidden on the way. x from the sun's azimuth mapping (`getAzimuthScreenFraction`, or the compass field of view), y from the sun arc's altitude scale. Silhouettes by day (11–18 px by distance, facing their way across the screen), only the lights from nautical twilight on, the trail along the way across the screen. The decorative planes stop while the radar is on (`CloudLayer` `livePlanes`). No live planes in fog, overcast, rain or a storm (as the decorative ones) and none during time travel (the scene shows another time; the decorative planes fly).
  - **Motion and the frame budget:** a CSS animation per plane cost +3.5 ms per frame with 60 planes (phone, item 91): Blink updates each animated element's style in each main frame, also for a compositor animation (about 21 µs per plane per frame on the throttled phone). So the layer moves the planes 4 times per second instead, from the dead-reckoned place: steps of under a pixel in the 360° view (a far jet moves about 0.3°/s), up to about 1 px in compass mode. The plane body is memoized; only the wrapper's transform changes on a tick. The strobe flashes from the same clock (one tick in every 2 s). With `prefers-reduced-motion` the planes move only with each answer.
  - **Card (item 95):** "Live plane": callsign, airline (from the callsign; "—" when not in the table), aircraft type (ICAO code), altitude (km), speed (km/h), "Data: adsb.lol (ODbL)". **No route:** `POST /api/0/routeset` answers 201 with an empty body for live callsigns (tested 2026-10-06), so the proxy does not ask for routes.
  - **Switch:** "Live planes" with the gold plus in the panel (below the weather mode), with the hint "Sends your place, rounded to about 11 km, to adsb.lol". Off by default; the setting is saved as `live-planes` in localStorage (with try/catch, as `satellite-tracking`), so the next start keeps it. Turning it on goes through `requirePremium`; while Premium is locked the radar is off.
  - **CSP and privacy:** the proxy is same-origin, so `connect-src 'self'` covers it; `vercel.json`, `public/_headers` and `tests/headers.test.ts` are unchanged. The privacy page (English only) names the switch, the rounding to about 11 km, our server, adsb.lol (ODbL), and Vercel's request logs.
  - **Checked:** 37 new tests (1,144 in all), lint and typecheck pass: the handler (validation, rounding, field mapping, upstream error, timeout, the Edge wrapper), dead reckoning, bearing and distance for known places (Ravensburg to Zurich 92.0 km at 241.2°, to Munich 151.5 km at 74.1°, to Friedrichshafen 17.3 km at 215.3°), the elevation angle, the 1° and terrain rules, the poll loop (15 s, only visible, keeps the last answer for a minute), and a stubbed feed in the real scene: the right direction and height, compass mode, hidden behind a ridge and below the horizon, the trail above 8 km, the lights at night, the card. `npm run perf:trace -- --live-planes N` turns the switch on and answers `/api/planes` with N aircraft. Frame budget (phone, 2 runs each, same build): day 112 → 139 ms/s main-thread busy with 60 aircraft (+0.45 ms per frame), night 188 → 217 (+0.48 ms per frame); 60 fps, frame p95 16.7 ms.
  - **Open:** the check with the real feed in Ravensburg (the directions against a flight-radar website, within about 2°).
- **Decisions (Lutz, 2026-10-06):** (1) show the 12 nearest aircraft: `MAX_LIVE_PLANES` (12) in `liveRadar.ts`; `pickNearestVisible` takes the aircraft that pass the visibility rules (1° or more, not behind the terrain) and keeps the nearest by slant distance (along the ground and up). The pick runs on each tick, so a plane that falls back to 13th leaves and the next one comes in. (2) The Cloudflare wrapper comes with the move (item 16, move checklist); no Cloudflare code now. (3) The switch remembers its setting (`live-planes`), off by default. Tests: the pick (nearest by slant distance, a high plane overhead against a low one beside it, an invisible one leaves its place to the next), 12 of 20 in the scene, the saved switch and a blocked storage.
- **Depends on:** item 92; item 95 for the card.
- **Done when:** unit tests for `getContrail`, the bearing and the elevation angle (known places), the dead reckoning, and the rounding of the place. In the browser with a stubbed feed: the planes show at the right direction and height, also in compass mode, and hide behind the terrain. With the real feed in Ravensburg: the directions match a flight-radar website within about 2°. The frame budget holds (item 91).

### 97. Satellites at night; satellite tracking — L — Premium (the tracking) — **✅ Done**

- **Feedback (2026-10-04):** "satellites in the night, with satellite tracking". Decision: the tracking is Premium.
- **Background:** a satellite is visible only when it is dark on the ground and the satellite is still in sunlight. That is mostly in the 1–2 h after dusk and before dawn. A satellite fades out when it enters the Earth's shadow.
- **Spec, free: satellites:**
  1. When the sun is below −6° and the sky is clear or partly cloudy, a small white dot crosses the sky in a straight line at 0.1–0.3 %/s. About one every 2–4 min in the 2 h after dusk and before dawn, fewer in the middle of the night. Some fade out in the middle of the sky (into the Earth's shadow). No blinking: that is a plane.
  2. The clouds dim the dots with the stars' cloud factor (item 52).
- **Spec, Premium: satellite tracking:**
  1. **Data:** the CelesTrak GP data (orbits as OMM JSON) for the groups `stations` (ISS, Tiangong), `visual` (about 100 bright satellites) and `last-30-days` (for a fresh Starlink train). Fetch once a day and cache it in `localStorage`, as the weather. CelesTrak updates the data every 2 h and blocks clients that fetch the same data more often.
  2. **Orbits:** SGP4 with `satellite.js` (MIT), a new dependency, loaded with a dynamic `import()` only when the tracking is on. SGP4 is too much code to write by hand.
  3. **Visibility:** a satellite shows when its elevation is above 10°, the sun is below −6° at the observer, and the satellite is in sunlight (a cylinder test against the Earth's shadow, with the sun direction from `sunUtils`). The brightness comes from the distance; the ISS is brighter.
  4. **Place on the screen:** as for the planes (item 96): the azimuth gives x, the elevation gives y, and the terrain hides it. A new position every second, with CSS in between. The ISS crosses the sky in about 5 min, which is calm.
  5. **Pass reminder:** "ISS visible at 20:14, from W to SE, up to 54°", 10 min before, with the notification of item 69 (while the app is open).
  6. **Card (item 95):** the name, the altitude, the speed, the time until it enters the Earth's shadow, and the next pass.
  7. A "Satellite tracking" switch in the panel with the gold plus. On by default for Premium: it sends no place, because the data is global. `usePremium` gates it in the Play app; on the web it is free (item 45).
  8. CSP: add `celestrak.org` to `connect-src`.
- **Depends on:** item 95 for the card.
- **Done when:** unit tests for the shadow test, the visibility rule and the pass search (against a known ISS pass from heavens-above.com, within 1 min and 2°). In the browser with a fixed clock on the evening of a known ISS pass: the ISS crosses at the right time and in the right direction, and fades into the shadow. The frame budget holds (item 91).
- **Source check (2026-10-06):**
  - **Endpoint:** `https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=json` returns OMM JSON. `stations`: 23 records (the docked modules POISK and NAUKA repeat the ISS orbit under their own ids). `visual`: 156. `last-30-days`: 170, 80 of them Starlink. About 145 kB in all.
  - **CORS:** open. With `Origin: https://sun-chaser.vercel.app` the answer has `access-control-allow-origin: *`. No proxy is needed, also after the move to Cloudflare Pages.
  - **Usage rules** (CelesTrak, "Why am I getting blocked"): CelesTrak checks for new GP data once every 2 h, so a client must not ask more often. On any answer other than HTTP 200 a client must stop: a 403 or 404 does not change on a repeat. More than 50 errors (301, 403 or 404) from one IP address in 2 h put the address in the firewall. Each browser has its own address, so one fetch per group per day is far below the limits.
  - **satellite.js:** MIT. 7.1.0 reads OMM (`json2satrec`), but its index also loads its WebAssembly build, which has a top-level `await` that the Vite build cannot bundle. 6.0.2 (MIT, OMM through `json2satrec`, no WebAssembly) builds, so the app uses 6.0.2.
  - **Reference passes:** heavens-above.com, ISS over Sydney, elements of 5 Oct 2026 (the same element set as the CelesTrak fixture). Ravensburg has only one visible pass in the next 10 days (15 Oct, 17° high), too far from the epoch for a test.
- **Built (2026-10-06):**
  - `satelliteData.ts`: one fetch per group, at most once in 24 h, cached in `localStorage` (`satellite-gp`) with only the fields SGP4 and the card need, one record per id and per orbit. After an error (not 200, or no network) the next try waits 2 h and the old data stays.
  - `satelliteUtils.ts` (pure; satellite.js comes in as an argument, so the start chunk does not load it):
    - Free dots: `getDotGapMs` (none with the sun at −6° or higher; a gap of 2–4 min in the 2 h after dusk and before dawn, 6–12 min in the middle of the night), `makeDotPath` (a straight line across the sky band, 0.1–0.3 %/s, one dot in three fades out over 8 s between 35 % and 70 % of its way), `isSatelliteWeather` (clear or partly cloudy).
    - Tracking: `sunDirectionEcf` (the sun's azimuth and altitude from `sunUtils` as an Earth-fixed vector), `isInEarthShadow` (cylinder with the WGS 84 radius), `isSatelliteVisible` (above 10°, sun below −6°, in sunlight), the magnitude from the distance (ISS −1.8, others +3 at 1000 km) and the dot opacity from it (0.25–1), `getSkySatellites` (the visible ones, and for 6 s the ones that stop being visible, so they fade), `getCandidateSatellites` (all every 30 s; each second only the ones above −12°), `findNextPass` (20 s steps, bisection to 1 s, the top in 5 s steps), `getSatelliteDetails` and `getSatelliteCard`, and the reminder (`isPassReminderDue`, `getPassReminderText`).
  - `useSatelliteTracking` (in `SunTracker`): the dynamic `import('satellite.js')` and the data load only while the tracking is on; the sky once per second of the app clock (time travel moves the satellites), nothing while the sun is above −6°, and nothing more than 3 days from the data's epoch. The next ISS pass every 5 min while the reminder is on. `useSatellitePassReminder`: item 69's notification (`showReminderNotification`, now shared with the sunset reminder) 10 min before the pass, once per pass.
  - `Satellites.tsx`, first in `SunVisualization` (behind the clouds and everything else). Tracked satellites: a 44 px tap target with a 5 px dot for the ISS (soft glow) and 3 px for the others, the place by the sun and moon mapping (compass field of view included), hidden behind the terrain (`horizonAngleAt`). A transform transition of 1 s, linear (100 ms during play; none in compass mode or with reduced motion), and a 5 s opacity fade. Free dots: Web Animations on transform and opacity, so the compositor moves them; they follow item 83's play rate and spawn-gap factor; none with reduced motion. The layer's opacity is the stars' cloud factor (item 52).
  - Card: "Satellite", the name, the altitude (km), the speed (km/s), "Into Earth's shadow" (in N min, now, or —) and the next pass (the time, with the weekday when it is not today).
  - Panel: a "Satellite tracking" switch with the gold plus, above the language row, through `requirePremium`; saved as `satellite-tracking`, on by default. The Premium dialog text lists satellite tracking.
  - CSP: `https://celestrak.org` in `connect-src` of `vercel.json` and `public/_headers`. 10 new texts in 5 languages.
- **Deviations:**
  - satellite.js 6.0.2, not 7.x (see the source check).
  - The free dots stop while the tracking shows real satellites, and come back when it has no data (off, loading, failed, or a time more than 3 days from the data).
  - The "clear or partly cloudy" rule is for the free dots only; the tracked satellites are dimmed by the cloud factor alone.
- **Decision (2026-10-06), twilight fade:** the satellites fade in and out over about 1 min around the sun's −6°, by opacity only, instead of a cut-off.
  - **Built:** `getTwilightFade` (1 with the sun below −6.1°, 0 above −5.9°, linear in between; the sun takes about 1 min for these 0.2° at mid latitudes). In the twilight band `getSkySatellites` replaces the sun part of the visibility rule by the fade and multiplies each tracked satellite's opacity by it, checked each second. The free dots: the layer's opacity follows the fade with a 1 min linear transition (the sun's altitude comes in 30 s steps); after −6° no new dot comes, and the dots on their way fade out and finish their crossing. The pass search and the reminder keep the strict −6° rule.
- **Decision (2026-10-06), "ISS passes":** the ISS pass reminder gets its own switch, "ISS passes", next to the sunset reminder, off by default, Premium-gated like the tracking; free on the web (item 45). (The first build tied it to the sunset reminder's switch.)
  - **Built:** a satellite toggle with the gold plus after the sunset reminder's alarm clock in the Sunset row, through `requirePremium`; saved as `iss-pass-reminder`, off by default; hidden without the Notification API. The tap that turns it on asks for the notification permission (item 69's flow, with its own texts); without the permission it stays off. It works with the tracking off too: `useSatelliteTracking` then loads satellite.js and the data for the pass search only, and shows no satellites. 5 new texts in 5 languages; the tracking switch's hint no longer mentions the reminder. Tests: the toggle in `InfoPanel`, the reminder in `SunTracker` (Sydney, 7 Oct: "ISS visible at …, from NW to NW, up to 23°", once, with the tracking off), the denied permission, and the data load in the hook.
- **Checked:**
  - 51 new tests (1141 in all); lint, typecheck and build pass. The pass search against heavens-above (ISS, Sydney): start within 8 s, top and end within 8 s, the highest elevation within 1.7°, the start and end directions right, for 4 passes: a full pass (6 Oct 18:43 UTC), one that starts out of the Earth's shadow at 41° (7 Oct 17:59), one that starts out of the shadow at 24° (6 Oct 17:10), and one that ends in the shadow at 23° (7 Oct 09:47).
  - In Chrome at 390 × 844 (built app, CelesTrak answered from the fixture data, clock set to Sydney 7 Oct 09:45:50 UTC): the ISS appears at 09:46:27 near the NW label at 10°, climbs about 1 px/s, and fades out at 09:47:53 at 23° (the Earth's shadow); 4 other satellites in the sky. Three requests to CelesTrak, one per group, and no console errors from the app.
  - Bundle: the start chunk 645.9 → 658.9 kB (gzip 213.3 → 218.2 kB: the app code and the texts); satellite.js is a separate 24.1 kB chunk (gzip 11.8 kB), loaded only with the tracking on.
  - Frame budget (`npm run perf:trace -- --scenes night --profiles phone --runs 2`; CelesTrak blocked there, so the free dots): main busy 174 → 187 ms/s (+0.22 ms per frame), script 78 → 82 ms/s, 60 fps, frame p95 16.7 → 16.8 ms. One frame of 67 ms in one run (the one-time load of the satellite.js chunk). Tracking on with 10 satellites in the sky (Ravensburg 6 Oct 20:30, 4× CPU, own script, 2 runs each): main busy about +23 ms/s (+0.38 ms per frame), within the 0.5 ms budget; noisy (the off runs differ by 29 ms/s).

### 102. More fish and boats again; fish change lanes — S — **✅ Done**

- **Feedback (2026-10-06):** "the latest changes drastically reduced the number of birds ships and fish". Then: "leave density that is still valid, make fish change lanes when a lane is full but spawn anyway, and up the base limits again to a value in between, when a fish meets a boat, the fish can also dive away or change the lane if it is free".
- **Cause:** item 93 lowered the base limits, and the density (0.42–0.7 by day) scales both the limits and the spawn chances. On a phone by day this gave 1 boat and 1–2 fish.
- **Built:** `MAX_FISH` 4 (item 93: 3, before: 5), `MAX_NIGHT_FISH` 2.5 (2 / 3), `MAX_BOATS` 2.5 (2 / 3). `getSceneLimit` rounds the base times the width and the density. The density stays as it is. A fish that meets a boat on its fallback lane changes to a free lane (`findLane` from 4 s before the meeting, a 3 s `sceneLaneShift`), else it dives (the H4 fade). Live, a new fish with no free lane spawns anyway at its pick and dodges the first thing it meets in the same way. A hunting shark and its prey keep their lane. During time-travel play nothing changes.
- **Checked:** 2 new tests, the limit tests and the box simulations (items 92 and 93) updated: a fish that changes lane counts on its old lane until the change, a diving fish has no box after its dive. Simulation (30 min, seeds 1–5, mean on screen): phone at density 0.7, fish 1.9 → 2.8 and boats 0.6 → 1.1; 1280 px at density 0.7, fish 3.0 → 3.9 and boats 1.7 → 2.3. Birds unchanged.

### 103. A fuller scene on wide screens — S — **✅ Done**

- **Feedback (2026-10-06):** "on my macbook i have 1 fish 1 boat and three birds". Then: "please fix A and raise the limit once more".
- **Cause:** at 1512 px the limits grew only to 1.5× a phone's (item 93), for 3.5 phones of width. At density 0.55: 3 fish, 2 boats, 3 birds over the whole width, each taking 5–10 min to cross (item 66).
- **Built:** `SCENE_LIMIT_MAX_GROWTH` 2.5 (it was 1.5). `MAX_FISH` 5, `MAX_NIGHT_FISH` 3, `MAX_BOATS` 3, `MAX_BIRDS` 5. A lane change (item 102) keeps its old lane (`hold`) in the lane plan, and a boat that meets a fish on its old lane before the change makes it dive.
- **Checked:** the limit tests updated, all tests pass. Simulation (30 min, seeds 1–5, mean on screen, 1512 px, density 0.55): birds 2.7 → 5.9, fish 2.9 → 6.8, boats 1.6 → 2.7. Phone at 0.55: birds 1.5 → 2.0, fish 1.8 → 2.8, boats 0.6 → 0.9. Boats still refill slowly (gap 55–115 s); not changed.

### 104. More space between pair fish — S — [SUN-CHASER-Z](https://ainabler.sentry.io/issues/SUN-CHASER-Z) — **✅ Done**

- **Feedback (2026-10-06):** "two fish that swim close together are a bit too close and should have a little more space inbetween them".
- **Cause:** the second fish of a pair (P6) swam a fixed 2–4 s behind the lead and 0–1.4 % lower or higher. A fish swims slowly (0.4–1.2 % of the width per s, item 66). A near classic fish (20 px) on a phone moves 4.5 px per s, so after 2 s it was only 9 px ahead: the two fish touched or overlapped, and `dy` could be 0.
- **Built:** `createFish` gets the lag from the fish's width and speed: at least `(PAIR_GAP + 1)` widths divided by the speed, plus 0–2 s. `PAIR_GAP` is 1.5, so 1.5 fish widths of water stay between the lead's tail and the second fish's nose. `dy` is at least `PAIR_DY` (0.6) fish heights, plus 0–1.4 %, with a random sign. `createFish` takes the scene height for this. The speeds and the paths do not change. The lane plan gets the new `lag` and `dy` as before (`fishLane`), so it keeps the whole pair free.
- **Checked:** 1 new test: for a phone and a 1290 px screen and 6 random values, the gap is at least 1.5 widths and `|dy|` at least 0.6 heights. The P6 render test updated. Example: a near classic fish on a phone now swims about 11 s behind (50 px of water), at least 1.4 % lower or higher. The box simulation's boat check (item 92) now allows 15 % fewer boats, like the spawn check: with seeds 1–12 it failed in 10 of 12 runs before this change too, because both runs share one random stream. All tests pass.

### 105. Info cards: rarity and spawn share — S — [SUN-CHASER-11](https://ainabler.sentry.io/issues/SUN-CHASER-11) — **✅ Done**

- **Feedback (2026-10-06):** "infocards should tell the rarity and spawn probability percentage or time". Decision: the tier and the percent, for example "Very rare · 0.5 %".
- **Built:** the fish, bird and boat cards (item 95) have one more row, "Rarity: <tier> · <share> %". `getFishShare`, `getFlyerShare` and `getBoatShare` in `weatherEffectsUtils` calculate the share from the spawn weights (`FISH_WEIGHTS`, `NIGHT_FISH_WEIGHTS`, `BIRD_WEIGHTS`, `BOAT_WEIGHTS`); no percent is in the code. The tiers are in `RARITY_TIERS` (`sceneInfo`): common ≥ 10 %, uncommon ≥ 3 %, rare ≥ 1 %, very rare < 1 %. The share has at most one decimal, "<0.1" below that.
  - Fish: the pool that swims now. `SceneInfoContext` now has `timeOfDay`, and `isNightWater` (now shared with `CloudLayer`) selects the day or the night mix. At night a day fish is the 'moonlit' share times its share of the moonlit day fish (perch 4.7 %). A fish that is not in the current pool (it swims on at the switch) gets the share of the other pool.
  - Birds: the share of all day birds, all seasons together. The season filter (month, latitude) and the evening-only starlings are not applied, because `SceneInfoContext` has no latitude. Bats: 100 % (after sunset all flyers are bats).
  - Boats: the share of the fair-weather mix (all boats). The weather and wind filter of `pickBoat` is not applied, because `SceneInfoContext` has no wind.
  - No time estimate ("one every N min"): the spawn gap depends on the screen width and the density. Planes, live planes, satellites, clouds, sun, moon and terrain have no rarity row.
- **Checked:** 2 new tests, the fish, bird and boat card tests updated: shark very rare 0.5 % (day and night), classic fish common 24 %, perch at night uncommon 4.7 %, German "Sehr selten · 0,5 %"; no row on the cloud, sun, moon, plane and terrain cards. All tests pass.
- **Changed in item 113:** six tiers now: common ≥ 25 %, frequent 10–25 %, uncommon 3–10 %, rare 1–3 %, very rare < 1 %, and ultra rare for the easter eggs only. The tiers in the table below are the old ones.
- **Changed in item 107:** the bats are no longer 100 %. `getBatShare` gives their share of the day's flying time (astronomical dawn to sunrise and sunset to astronomical dusk, against sunrise to sunset), and the birds share the rest by their weights. At Lake Constance this is about 23 % (common), so the bird rows in the table below are now 77 % of the values shown.

| Kind | Share | Tier |
|---|---|---|
| Fish by day: classic 24, minnow 18, perch 14, trout 12, carp 10 | 10–24 % | Common |
| Fish by day: pike 8, catfish 4 | 4–8 % | Uncommon |
| Fish by day: ray, turtle, jellyfish 2; seahorse, whale, pufferfish 1 | 1–2 % | Rare |
| Fish by day and night: shark, dolphins | 0.5 % | Very rare |
| Fish at night: lanternfish 30, burbot 15, eel 12 | 12–30 % | Common |
| Fish at night: jellyfish 8, anglerfish 5, squid 5; moonlit classic 8, perch 4.7, trout 4, carp 3.3 | 3.3–8 % | Uncommon |
| Fish at night: moonlit pike 2.7, catfish 1.3 | 1.3–2.7 % | Rare |
| Birds: gull 38, heron, geese, cormorant 10 | 10–38 % | Common |
| Birds: stork, swan, kestrel, starlings 8 | 8 % | Uncommon |
| Boats: sailboat 43.8, ferry 18.8, fishing 18.8, rowboat 12.5 | 12.5–43.8 % | Common |
| Boats: freighter | 6.3 % | Uncommon |

### 106. Info cards: a fact per cloud type — S — [SUN-CHASER-12](https://ainabler.sentry.io/issues/SUN-CHASER-12) — **✅ Done**

- **Feedback (2026-10-06):** "for the cloud infocards some cloud type facts".
- **Built:** one fact per cloud type (`cloudFact.Ci`, `Cs`, `Ac`, `As`, `Cu`, `Sc`, `St`, `Ns`, `Cb`, `Len`, `Mam`) in all 5 languages, one short sentence like the fish facts. The cloud card shows it as the first row, without a label (like the fish fact), above the layer and the cover.
- **Checked:** 1 new test (every cloud type has a fact sentence), the cloud card test updated. All tests pass.
- A card redesign (item 107, lookbook first) follows and can change the style of the rows of items 105 and 106.

### 107. Info cards: field guide look — M — [SUN-CHASER-10](https://ainabler.sentry.io/issues/SUN-CHASER-10) — **✅ Done**

- **Feedback (2026-10-06):** "the info cards are a bit plain, please do a lookbook".
- **Lookbook:** [Info card lookbook](https://claude.ai/artifact/MinHW6ZN1ru6ohph4eYE5A). Pick: K4, with the tier colour as a faint outline on the card and the ring.
- **Built:**
  - `SceneInfoCard` is an almanac entry: a kicker (type icon and type name, uppercase, in the type colour), the title, the Latin name in italics, a thin rule, label-value rows with dotted leaders, a 4-step meter on the rarity row, and the fact as a "Field note" ("Cloud fact" on clouds) at the end. Max width 16 rem. It fades in over 200 ms from 96 % (`animate-card-in`); with reduced motion it only fades.
  - The card glass is 58 % (`GLASS_CARD_SURFACE`); the other panels keep 45 %.
  - `sceneInfo` stays pure. It now returns `kicker`, `icon`, `latin`, `fact` and `tier`; the fact is no longer a row. Latin names are plain strings, only for kinds that are one species, and the WMO names for clouds (the card hides the Latin name when it is the same as the title).
  - Rarity tiers (`rarityTier.ts`, tokens `--color-tier-*`): common `#cbd5e1`, uncommon `#5eead4`, rare `#60a5fa`, very rare `#f5b82e`. The card has a 1 px outline in the tier colour at 50 %; the ring around the tapped fish, bird or boat (item 95) has it at 80 %. Things without a tier keep the neutral border and the white ring. `SunTracker` passes the tier of the open card through `SunVisualization` to `CloudLayer` (`infoRingTier`).
  - Kicker icons are lucide icons and the scene's `Bat`; colours are the `--color-kind-*` tokens. 12 new texts in all 5 languages.
  - Bats (item 105): `getBatShare(sunTimes)` in `weatherEffectsUtils`. `SceneInfoContext.sceneSunTimes` gives the day's sun times.
- **Checked:** new and updated tests for the card (kicker, Latin line, field note, tier border, 58 % glass), the `sceneInfo` data (kicker, Latin names, fact, tier), `getBatShare` and `getFlyerShare`, the tier classes, and the ring colour with and without a tier (`CloudLayer`, `SunTracker`). Typecheck, lint and all tests pass. In the browser at 390 × 844 (Konstanz): perch card by day and sailboat card at night show the new look and the grey common ring.

### 108. The countdown you hear over the radio — S — [SUN-CHASER-14](https://ainabler.sentry.io/issues/SUN-CHASER-14) — **✅ Done**

- **Feedback (2026-10-06 19:15 CEST, Ravensburg):** "I didn't hear the countdown to sunset as I had sound on but was playing the radio station does this interfere? The visual count down worked".
- **Cause:** since item 98 the pill shows for everyone, but the sound plays only with the bell on (off by default). The ticks were soft (gain 0.08) under a radio at 0.5. With the bell saved as on, a page load leaves the `AudioContext` suspended until a tap (CD2 of item 98 was not built).
- **Pick (2026-10-07):** all four, A–D.
- **Built:**
  - A: with the bell on, one `pointerdown` listener on `window` (capture, once) creates or resumes the `AudioContext`. The radio's play tap counts.
  - B: `useSunsetCountdown` returns `{ seconds, isSounding }`. While the tones play (from T−11 s to the end of the chime), `SunTracker` passes `duck` to `MusicPlayer`, which plays at 30 % of the slider volume. The slider does not change.
  - C: tick and chime gain 0.2 (was 0.08).
  - D: with the bell off, the pill is a button with a `BellOff` icon ("Turn on the countdown sound", 5 languages). A tap turns the bell on, like the bell in the Sunset row.
- **Checked:** new `tests/hooks.useSunsetCountdown.test.ts` (A, `isSounding`), duck test in `MusicPlayer`, pill button tests in `SunVisualization` and `SunTracker`. All tests pass. Not checked on a phone.

### 109. Longer contrails — S — [SUN-CHASER-13](https://ainabler.sentry.io/issues/SUN-CHASER-13) — **✅ Done**

- **Feedback (2026-10-06 19:14 CEST, Ravensburg):** "Condensate cloud strip from plane should be longer and last a long time before it fades away".
- **Built:** `CONTRAIL_LOOK` short 10 → 30 s, medium 60 → 180 s; persistent stays 300–600 s. `MAX_TRAIL_SEC` (live planes) 120 → 300. A scene plane with a short or medium trail flies on until the end of its trail is off the screen too (`dx` grows by the trail length; same speed).
- **Checked:** `utils.planes` and `CloudLayer` tests updated, one new test (the trail's end leaves at 101 %). All tests pass.

### 110. Live planes: all with the compass, two moving ones without — S — [SUN-CHASER-13](https://ainabler.sentry.io/issues/SUN-CHASER-13) — **✅ Done**

- **Feedback (2026-10-06):** "In compass mode show all planes in line of sight, in normal mode only the nearest two that are really visible and don't hang static in the air. Don't show planes that are too close to the horizon".
- **Built:** `MIN_ELEVATION_DEG` 1 → 5 in both modes. `pickShownPlanes(nearest, compass)` in `liveRadar`: with the compass (`SunVisualization` passes `compass`), every visible plane in the field of view, at most `MAX_COMPASS_PLANES` (40, for performance). Without it, the 2 nearest that move at least `MIN_SCREEN_SPEED_PX_S` (1 px/s) on the screen; a plane that is too slow is skipped and the next nearest takes its place. `MAX_LIVE_PLANES` is removed.
- **Decision (2026-10-09):** 1 px/s, not 3. Simulation (planes within 100 km, ≥ 5°): 4.2 % move 1 px/s or more on a phone, 22 % at 1600 px; at 3 px/s only 0.4 %. So on a phone the radar often shows 0 or 1 plane without the compass.
- **Checked:** `utils.liveRadar` tests for 5°, both modes and the 40 limit; `LivePlanes` tests for below 5°, compass (20 in view shown, 1 behind hidden) and normal mode (a still plane and a slow far plane skipped). All tests pass.

### 111. The route on the live plane card — M — [SUN-CHASER-13](https://ainabler.sentry.io/issues/SUN-CHASER-13) — **✅ Done**

- **Feedback (2026-10-06):** "Plane info card destination but not data source". Decision (2026-10-07): add the route, remove the data-source line. Attribution (2026-10-09): the privacy page only.
- **Source:** adsb.lol `POST /api/0/routeset` answers 201 with an empty body (checked 2026-10-07). The proxy uses adsb.lol's static route data, `https://vrs-standing-data.adsb.lol/routes/<first 2>/<CALLSIGN>.json` (schedule-based, no `plausible` flag).
- **Built:** `GET /api/planes?route=<callsign>&lat=&lon=` (`planeFeed`) returns `{ route: { from, to } | null }`, cached 1 h. The server keeps the leg that passes nearest the user's rounded place (detour at most 20 % of the leg + 250 km), else null. Callsign `^[A-Z0-9]{3,8}$` and a valid place, else 400 with no upstream call; an upstream error gives 502. Only the callsign goes to adsb.lol. `useLiveRoute` asks once when a live plane card opens; a failure leaves the line out. The card shows "Route: Paris (CDG) → Tel Aviv (TLV)" (codes only when a name is longer than 12 characters). `info.dataAdsbLol` is replaced by `info.route`. One sentence on the privacy page. No CSP change.
- **Limits:** the route is from schedules, so near an airport a wrong leg can still show. The endpoint is the target of a deprecated adsb.lol redirect; if it moves, the line goes away.
- **Checked:** route mapping (near and far place, stops, ICAO fallback, bad data), request handling (URL, User-Agent, cache, 404, input check, 502), card lines, `useLiveRoute`. Dev server against the real adsb.lol: ELY326 gave CDG → TLV. All tests pass.

### 112. Collection: a badge for every kind you tapped or found — M — **✅ Done**

- **Request (2026-10-09):** "collect taps and easter eggs, add badges for every fish, boat, cloud, easter egg that I already tapped / collected".
- **Why:** the rarity row (item 105) makes a rare fish worth a look. A collection gives a reason to come back and find the rest.
- **Spec:**
  1. A tap that opens an info card (item 95) collects that kind: each fish, bird, bat, boat, plane, cloud type (item 106), satellite, sun, moon, terrain. A live plane counts as "plane"; no per-flight badges.
  2. An easter egg or special event (Ongoing section) collects its badge when it shows on the screen. Hidden eggs (sunglasses, UFO, disco) count only when triggered for real, not by `?egg=`.
  3. A pure util `collection.ts` saves the set of collected ids and the first-seen date in `localStorage` (`collection`), with try/catch on read and write, like the other utils. No server, no account.
  4. A first find shows a small toast ("New: Seahorse") in the 5 languages.
  5. A "Collection" view (from the InfoPanel) shows a grid of all badges, with a counter "23 / 61". A collected badge shows the kind in colour, its name, the rarity tier (item 105) and the first-seen date. A missing badge hides its name: a scene kind shows only a grey outline of its shape; an easter egg shows only a "?".
  6. The badges reuse the scene's own SVG shapes, so no new artwork.
- **Decisions (2026-10-09):** every missing badge hides its name. Missing scene kinds: grey outline only. Missing easter eggs: "?" only. One badge per fish kind, day and night pools together (a moonlit perch is the perch badge). Free (no Premium gate).
- **Done when:** util tests (add, duplicates, corrupt storage, `?egg=` does not count); a tap on a fish adds its badge and shows the toast once; the grid shows the right count and hides missing names; `tests/i18n.test.ts` passes. Frame budget: no per-frame work (the collect runs on tap or on event start).
- **Depends on:** item 95 (cards), item 105 (tiers). Item 107 (card redesign) can set the badge style.
- **Built:** 69 badges in `collection.ts` (`BADGES`): 20 fish, 8 birds + bat, 5 boats, plane, sun, moon, terrain, satellite, 11 cloud types, 19 eggs. Halloween gives 2 badges (pumpkin, bats), Christmas gives 2 (lights, Santa); both solstices give 1. `SunTracker.collect(id)` adds a new badge, saves it and shows one toast. It runs on a card tap (`badgeForTarget`), on the 7th sun tap, on the 7th moon tap or the Konami code (disco), when the UFO shows, when a calendar egg shows (`badgeForCalendarEvent`, `badgeForSanta`, the `CalendarEggs` rules) and when an astronomy event shows. New Year counts where the fireworks start. A test link (`?egg=`, `?fish=`, `?hunt=`) pauses the collection. Calendar and astronomy badges do not count in a time preview. An egg that reduced motion hides (UFO, fireworks, dragon, Halloween bats, Santa, meteor shower) does not count then. `CollectionView` opens from the InfoPanel row "Collection". `getRarityTier` in `sceneInfo`; `UfoShape` from `Ufo`, `SantaShape` from `Santa`.
- **Checked:** `utils.collection`, `utils.sceneInfo`, `CollectionView`, `SunTracker` (a fish tap collects with one toast "New: Seahorse"; `?egg=ufo` collects nothing; the InfoPanel button opens the view) and `InfoPanel` tests. Dev server at 390 × 844: grid, outlines, toast. All tests pass.

### 113. Easter egg info cards; tiers "frequent" and "ultra rare" — M — **✅ Done**

- **Feedback (2026-10-09):** "bats for me would be uncommon because only during dusk and dawn…", "maybe another category then between common and rare", "are eastereggs ultra-rare?"
- **Decision:** 6 tiers. Common ≥ 25 %, frequent 10–25 %, uncommon 3–10 %, rare 1–3 %, very rare < 1 % (`RARITY_TIERS` in `sceneInfo`). Ultra rare is only for the easter eggs; no share gives it. Colours (static, no shimmer): common `#cbd5e1` grey, frequent `#a7d3b5` sage (new), uncommon `#5eead4` teal, rare `#60a5fa` blue, very rare `#f5b82e` gold, ultra rare `#d8a0f5` violet (new).
- **Built:**
  - Tiers: `RarityTier` has `frequent` and `ultraRare`; `TIER_ORDER` in `rarityTier.ts`; tokens `--color-tier-frequent` and `--color-tier-ultra-rare` in `index.css`. The card meter has 6 bars. New tier results: bats 22.8 % frequent; gull 29.3 % common; heron, geese, cormorant 7.7 % uncommon; classic fish, minnow, perch, trout, carp frequent; burbot, eel frequent; lanternfish common; ferry, fishing boat, rowboat frequent; sailboat common.
  - Egg cards: `SceneInfoTarget` has `{ type: 'egg', kind }`. The kicker is "Easter egg" (lucide `Egg`) for a hidden egg and "Special event" (lucide `PartyPopper`) for a calendar egg, in the ultra rare colour. Each card has a title, one field note and the row "Ultra rare · <chance>". The chance comes from the code: `UFO_CHANCE` per night, or `getEventDaysPerYear` (`calendarEvents`), which counts the days that `getCalendarEvent` gives over the years of the Lunar New Year list (2027–2035).
  - Each egg thing takes taps like a fish (item 95): `pointer-events-auto` wrapper, `aria-hidden`, a hit area of at least 44 × 44 px with the ring inside the moving wrapper, and the thing moves on. The UFO is now `z-1`, so it is above the scene layer and takes taps. The dragon's hit area is a box that its rAF loop moves with it. The pumpkin moon takes the tap over the moon button.

| Egg | Kicker | Chance text |
|---|---|---|
| UFO | Easter egg | 0.5 % per night |
| Midnight ghost | Easter egg | none (it shows each night at 00:00): the tier alone |
| Lunar New Year dragon | Special event | 1 day a year |
| Black cat (Friday the 13th) | Special event | 1.6 days a year |
| Halloween bat | Special event | 0.8 days a year |
| Pumpkin moon | Special event | 1 day in 5 years |

  - With the collection (item 112): the collection badges use the same tiers (`getRarityTier`), so the bat badge is now frequent. An egg card adds no badge (`badgeForTarget` gives null): the egg's badge counts when the egg shows, by the item 112 rules, and the ghost has no badge. The egg badges show "Ultra rare", like the egg cards (decision 2026-10-09).
  - No card: the fireworks (a sky-wide canvas, also at each sunrise and sunset), the disco sky, the Christmas lights on the boats, the solstice and equinox badge (text), the sunglasses (7 taps on the sun) and the disco triggers (7 taps on the moon, the Konami code) (hidden triggers; the sun and the moon keep their own cards). The astronomy events (eclipses, supermoon, blue moon, meteor showers, aurora, green flash) are real sky events, not eggs: the sun and moon cards cover them. The whale (item 62) and the lenticular and mammatus clouds (item 84) keep their fish and cloud cards. The frost iceberg is weather, not an egg.
- **Checked:** tests for the thresholds (25 / 10 / 3 / 1 %, bats frequent, gull common), no share gives ultra rare, the 6 classes and tokens, each egg card (kicker, title, fact, tier, chance text in English and German), the days a year, and taps on the UFO, the ghost, the dragon, the cat, a bat and the pumpkin (component tests, and the UFO card in `SunTracker`). Typecheck, lint and all tests pass. In the browser at 390 × 844 (Konstanz): the UFO (`?egg=ufo`), the dragon (`?egg=dragon`), the cat (clock on 2026-11-13), a Halloween bat (2026-10-31), the pumpkin moon (2028-10-31) and the ghost (00:00) each take a tap and show their card with the violet ring. On a phone the chance text can wrap to a second line.
- **Follow-up (2026-10-09):** (1) The solstice and equinox badge text is in the 5 languages (keys `egg.seasonLongest`, `egg.seasonShortest`, `egg.seasonEquinox`). (2) The midnight ghost does not pulse. It breathes slowly: `animate-ghost-breathe` (opacity 1 to 0.8 and back, 8 s cycle). With reduced motion it is static. (3) The UFO has no z-index again, so it draws behind the sun, the moon, the arcs and the clouds. Cause of the old `z-1`: the `SunVisualization` root (full screen) took the tap. The root is now `pointer-events-none`; the sun, moon and countdown buttons are `pointer-events-auto`. Checked in the browser at 390 × 844 with `?egg=ufo`: the sun button is above the UFO, and a tap on the UFO opens its card. (4) The collection's egg badges are ultra rare (`rarity.ultraRare`), like the egg cards.

### 114. Collection: a new badge shows like a game achievement — S — [SUN-CHASER-15](https://ainabler.sentry.io/issues/SUN-CHASER-15) — **✅ Done**

- **Feedback (2026-10-09, release `e8e9f21`, Ravensburg):** "The new collection popup should look more like a game achievement maybe with a little animation".
- **Now:** a first find shows the plain shadcn toast "New: Seahorse" (`SunTracker.collect`, `toast({ title: t('collection.new') })`).
- **Spec:**
  1. A new component `BadgeUnlocked` replaces the toast for a new badge. Other toasts (weather, location) do not change.
  2. **Look:** a glass card (the glass style, 18 px corners) at the top centre, below the safe area. Left: the badge as in the collection grid (item 112), in colour, with the tier ring (item 113). Right: the kicker "Badge unlocked" (lucide `Award`), the badge name, the tier word in the tier colour, and the counter "24 / 87".
  3. **Animation (calm, see the scene-motion rule):** the card slides down 12 px and fades in (400 ms, ease-out). Then one soft light sweep crosses the badge (800 ms, once). The tier ring glows once in the tier colour (fade in and out, 1.2 s). No bounce, no shake, no confetti, no sound. With `prefers-reduced-motion`: fade in only, no sweep, no glow.
  4. **Close:** after 4 s it fades out (300 ms). A tap on the card opens the collection view at that badge. A swipe up or Escape closes it.
  5. Two new badges in a short time show one after the other, not stacked (a queue in `SunTracker`, one card at a time).
  6. **Accessibility:** `role="status"`, `aria-live="polite"`. The text is "Badge unlocked: Seahorse, rare".
  7. Every text in `en.ts`, `de.ts`, `es.ts`, `it.ts`, `fr.ts`.
- **Done when:** component tests (shows name, tier and counter; closes after 4 s; a tap opens the collection; two badges show in sequence; reduced motion has no sweep class). `tests/i18n.test.ts` passes. Browser check at 390 × 844. Frame budget (item 91): CSS animation only, no rAF.
- **Open:** a lookbook with 2–3 looks before the build, or build this spec directly. Decided: build the spec directly, no lookbook.
- **Built:** `BadgeUnlocked` replaces the "New: …" toast (the key `collection.new` is gone; the other toasts do not change). `SunTracker.collect(id)` keeps its signature. It puts each new badge with its count in a queue (`unlockedQueue`); the card shows the first one, and the next one shows when it closes. The card uses `BadgeArt` from `CollectionView` (now exported), `GLASS_CARD_SURFACE`, `rounded-panel` and the tier outline and ring of `rarityTier.ts`. A badge without a tier (sun, moon, clouds, plane) has the neutral ring and no tier word. The motion tokens are in the `@theme` block of `index.css`: `animate-badge-in` (12 px down and fade in, 400 ms), `animate-badge-sweep` (800 ms, once), `animate-badge-glow` (a `currentColor` shadow in the tier colour, 1.2 s, once), `animate-badge-fade` (reduced motion) and `animate-badge-out` (300 ms). A tap opens `CollectionView` with `focusId`, which scrolls to that badge. A swipe up (24 px) or Escape closes the card. New keys `badgeUnlocked.kicker`, `.label`, `.labelNoTier`, `.open` in the 5 languages.
- **Checked:** `BadgeUnlocked` tests (name, tier in its colour, counter; status text "Badge unlocked: Seahorse, Rare"; closes after 4 s plus the 300 ms fade; a tap opens the collection; Escape and a swipe up close it; reduced motion has no sweep and no glow; German text). `SunTracker` tests (a fish tap shows the card and no toast; two badges show one after the other with counts 1 and 2; a tap on the card opens the collection) and a `CollectionView` test (it scrolls to the focus badge). Typecheck, lint and all tests pass. In the browser at 390 × 844 (Konami code): the card shows at the top centre with the violet ring, "Disco", "Ultra rare · 1 / 68". Not checked on a real phone: the swipe up, and whether a screen reader reads the status.
- **Changed (2026-10-09):** the card moved to the bottom centre, just above the music bar (7.5rem up on phones, 4.5rem on wide screens, plus the safe area), so it no longer covers the place header. It slides up 12 px as it fades in, and a swipe down closes it. While time travel is on, it covers the "Back to now" button for its 4 s.

### 115. Collection: terrain heights, sun and moon states — M — [SUN-CHASER-16](https://ainabler.sentry.io/issues/SUN-CHASER-16) — **✅ Done**

- **Feedback (2026-10-09, release `e8e9f21`, Ravensburg):** "Terrain shouldn't just be terrain but also at which height as a. Collection item. So should the sun and the moon in different states".
- **Now:** the sun, the moon and the terrain have one badge each (`BADGES` in `collection.ts`, `rarity: null`).
- **Assumption:** "height" is the height of the ridge point that the tap hits (the terrain card's height row, `ridgeHeights`), not the eye height.
- **Spec:**
  1. The three base badges (`sun`, `moon`, `terrain`) stay, so no saved badge is lost. The first tap still collects the base badge.
  2. **Terrain heights:** a tap on the terrain also collects the badge of the height band of the ridge point. Bands: hills < 500 m, low mountains 500–1000 m, mountains 1000–2000 m, high mountains 2000–3000 m, alpine peaks ≥ 3000 m. Ids `terrain:hills` … `terrain:alpine`. The badge shows the ridge shape with 1–5 peaks.
  3. **Sun states:** a tap on the sun collects the badge of the time of day (`getTimeOfDay`): dawn, morning, midday, afternoon, evening. Ids `sun:dawn` … `sun:evening`. The badge shows the sun in the colour of that time's sky gradient.
  4. **Moon states:** a tap on the moon collects the badge of the phase (`getMoonPhaseIndex`, 8 phases). Ids `moon:new` … `moon:waningCrescent`. The badge uses `getMoonPhasePath`, so no new artwork.
  5. A tap can collect two badges (base and state). The pop-up (item 114) shows them one after the other.
  6. The grid groups the states under their base badge (one row each for sun, moon, terrain). A missing state shows a grey outline, by the item 112 rules.
  7. The time preview and test links do not collect (item 112 rules).
  8. Badge total: 68 + 5 + 5 + 8 = 86 (87 with the Santa badge).
- **Check in the build:** a new moon is dark. If the moon button does not take a tap then, the new-moon badge cannot be collected. Fix: the button stays tappable at a new moon (the card exists already).
- **Done when:** util tests (band per height at the limits 500 / 1000 / 2000 / 3000 m; state per time of day and per phase; base and state on one tap; old saves load). Component test: a sun tap at midday collects `sun` and `sun:midday`. `tests/i18n.test.ts` passes.
- **Depends on:** items 112, 95. Item 114 is good to have first (two badges on one tap).
- **Built:** 86 badges. `collection.ts` has `SUN_STATES`, `MOON_STATES` and `TERRAIN_BANDS`; each state badge has `base` (`sun`, `moon`, `terrain`) and comes after its base badge in `BADGES`. `getTerrainBand` (a limit belongs to the higher band: 500 m is low mountains), `getSunState` (null at night and in the twilights, so a tap then gives the base badge only), `getMoonState` (`getMoonPhaseIndex`). `stateBadgeForTarget` gives the state badge of a sun, moon or terrain tap; the terrain band uses `ridgeAt` (the card's ridge height), and no ridge data gives no band. `SunTracker.handleSceneInfo` calls `collect` twice: the base badge, then the state badge; `collect(id)` does not change. A time preview gives no sun or moon state (they depend on the time); the ridge height does not depend on the time, so the terrain band counts. Test links pause all, as before. `CollectionView`: the sky group has one grid for the plane and the satellite, then one row each for the sun, the moon and the terrain (base badge, then its states). Art: the lucide sun with a stroke in the 3 stops of that time's sky gradient (`getSkyGradientStops`, new in `sunUtils`); the moon disc with `getMoonPhasePath` at the middle of each phase; a ridge with 1 to 5 peaks. Names: `badge.sunDawn` … `badge.sunEvening`, `badge.terrainHills` … `badge.terrainAlpine` in the 5 languages; the moon states use the `moonPhase.*` keys. Old saves load: the ids of item 112 do not change.
- **Checked:** `utils.collection` tests (86 badges; the states after their base; the bands at 499.9 / 500 / 999 / 1000 / 1999 / 2000 / 2999 / 3000 m; the sun state per time of day; the moon state per phase; no sun or moon state in a time preview; base and state on one tap; an old save loads). `CollectionView` tests (one row each for sun, moon, terrain; a found state shows its name; a missing state is a grey outline). `SunTracker`: a sun tap at midday collects `sun` and `sun:midday`, with 2 "New" toasts. New moon: the moon button does not depend on the illumination (opacity 0.2 at a new moon), so it takes a tap (`SunVisualization` test). But the moon shows only at night and in the astronomical and nautical twilight, and a new moon is near the sun, so the new-moon badge is possible only for a short time near a dark-enough dusk or dawn. No code change for this. Typecheck, lint and all tests pass. Not checked in the browser.

### 116. Info cards and collecting work only on a double tap — S — **✅ Done**

- **Request (2026-10-09):** "the infopanel and collection should only work on doubletap".
- **Assumption:** "infopanel" means the info cards of item 95 (a tap on a thing in the scene), not the InfoPanel buttons. "Collection" means collecting a badge on that tap (item 112).
- **Why:** a single touch (phone in the hand, a scroll, a child) opens a card and collects a badge by accident.
- **Spec:**
  1. A double tap opens the card and collects: two taps on the same target within 350 ms. One shared hook (`useDoubleTap`) in all scene hit areas (fish, birds, bats, boats, planes, satellites, clouds, eggs, sun, moon, terrain), so the rule is in one place.
  2. A single tap opens nothing and collects nothing. It shows the thin ring (item 95) for 600 ms, so the user sees that the thing takes taps.
  3. The second tap must hit the same target. A moving thing keeps its hit area in its moving wrapper, so this holds.
  4. The hit areas get `touch-action: manipulation`, so the browser does not zoom on a double tap.
  5. With a mouse, a double click works in the same way.
  6. Keyboard (sun, moon, terrain buttons): Enter and Space still open the card at once (accessibility).
  7. The sun egg (7 taps for the sunglasses) counts each single tap, as now. A double tap counts 2 taps.
  8. The InfoPanel row "Collection" and the buttons in the InfoPanel do not change (one tap).
- **Done when:** component tests (one tap: no card, no badge, ring shows; two taps in 350 ms: card and badge; two taps 500 ms apart: nothing; two taps on different targets: nothing; Enter opens at once; the sun egg still counts 7). In the browser at 390 × 844: no zoom on a double tap.
- **Built:** the hook `useDoubleTap` (`src/hooks/useDoubleTap.ts`) has the rule: `DOUBLE_TAP_MS` 350, `HINT_MS` 600. It keeps the last tap (ring id and time). A second tap on the same ring id in 350 ms calls `onSceneInfo`; any other tap sets `hint` to its ring id for 600 ms. An `immediate` tap (a keyboard click, `event.detail === 0`) calls `onSceneInfo` at once. Each component with hit areas calls the hook once: `CloudLayer` (fish, birds, bats, boats, planes), `SkyClouds` (clouds), `Satellites`, `LivePlanes`, `CalendarEggs` (cat, Halloween bats, pumpkin moon, and the dragon through `LunarDragon`), `Ufo`, `MidnightGhost` and `SunVisualization` (sun, moon, terrain). A thing shows its ring when its card is open or when `hint` has its ring id; the tier colour is only for the open card. The sun and the moon have a ring now, but only for the hint. Each hit area has `touch-manipulation`. `SunTracker` does not change: it opens and collects on each `onSceneInfo` call, as before. Differences from the spec: the terrain shows no ring on a single tap (a path across the screen has no ring shape). A satellite is a focusable button, so a keyboard click on it also opens at once. Each component keeps its own last tap, so a tap on a thing in one component and then on a thing in another component is no double tap, as the spec says; but a tap on A, a tap on B in another component and a tap on A, all in 350 ms, opens A.
- **Checked:** `hooks.useDoubleTap` (one tap: no card, ring for 600 ms; two taps at 350 ms: card; 500 ms apart: nothing; different targets: nothing; immediate: at once). `CloudLayer` (the same rules on a fish, `touch-manipulation` on each hit area), `SunVisualization` (sun and moon: a single tap shows the ring, a double tap opens; 7 single sun taps count 7 and open nothing; a keyboard click and Enter on the terrain open at once), `SunTracker` (one sun tap: no card, no badge, ring for 600 ms; a double tap: card and the `sun` badge; the sunglasses after 7 taps; a keyboard click opens at once), and the tap tests of `Satellites`, `LivePlanes`, `CalendarEggs`, `Ufo` and `MidnightGhost`, now with double taps. Typecheck, lint and all tests pass. Not checked: the browser at 390 × 844 and a real phone (no zoom on a double tap).
- **Follow-up (2026-10-09):** a single tap shows nothing: no ring. `useDoubleTap` returns only `tap` (no `hint`, no `HINT_MS`); a ring shows only while the card is open. The sun and moon hint rings are gone. Cloud types have a fixed rarity tier (`CLOUD_TIERS` in `sceneInfo.ts`: Cu, Sc, St common; Ci, Ac, As frequent; Cs, Ns uncommon; Cb rare; Len, Mam very rare), on the cloud card, its ring and the collection badge. A found badge in `CollectionView` has a 2 px outline in its tier colour (`badgeTier`, `TIER_RING_BORDER`); a badge without a tier keeps the white outline.

- **Merge with Santa (item from #133):** the Santa sleigh hit area also uses `useDoubleTap` and `touch-manipulation`.

### 117. Playful eggs: April Fools, the empty tomb, a heart cloud, a pot of gold, the patient watcher — M — **✅ Done**

> summary: Five new collection badges (`egg:aprilFools`, `egg:easter`, `egg:valentine`, `egg:stPatrick`, `egg:patientWatcher`), each ultra rare. Four show a calm thing in the scene on a calendar day; the patient watcher is a badge only. Trigger logic in `src/utils/playfulEggs.ts`, drawing in `src/components/PlayfulEggs.tsx`, `SkyClouds` and `SunVisualization`.

- **Request (2026-10-09):** a "Playful" pack. April Fools: the sun and the moon swap places for one minute. Easter Sunday: not an egg, but the empty tomb, quiet and respectful. Valentine's Day: a heart cloud. St Patrick's Day: a pot of gold at the end of the rainbow. Patient watcher: a badge for watching the whole sunset.
- **Spec:**

| Egg | Day and time | What shows | Reduced motion |
|---|---|---|---|
| April Fools | Apr 1, whether the sun and the moon are up or not | 10 s after the page opens, both fade out (3 s), swap their sky places (azimuth and altitude), fade in and stay for 60 s, then fade back the same way. Once per page view. Each body is drawn where the other one is and shows when that place passes its own rule (the sun above −18°, the moon above −6°) and is on the screen; below the horizon the sea hides it. By day with the moon down, the moon shows at the sun's place and the sun is hidden. Only the sun and the moon move; their light on the water and the clouds stays. The badge counts only when at least one swapped body can be seen: its place is above the horizon and on the screen, and clouds do not hide its disc (no badge at night with both down, or in fog). | No swap, no badge |
| Easter | Easter Sunday, from the sunrise until 12:00 (polar day: from 00:00; polar night: no) | A small rock tomb on the far shore (the horizon line), near the edge away from the sun (10 % or 90 % of the width). The round stone is rolled away from the dark entrance. The sun side has a soft warm light (its strength follows the sun disc). A soft, warm glow comes out of the open entrance and around the tomb. Static, no text. | Shows (static) |
| Valentine | Feb 14, the sun above the horizon | One day cloud is a heart: the first single Cu, Sc or Ac cloud of the layout (not a row tile, not a cirrus). It glides like the other clouds. No cloud of these types: no heart. | Shows (the clouds are still) |
| St Patrick | Mar 17, all day | A soft green tint over the sky, down to the horizon line, and the same green on the water (0.08 at the horizon to 0.22 at the bottom, under the wave canvas); the badge counts when it shows. When the rainbow shows (rain or drizzle, sun 0–42°): also a small pot of gold on the horizon line at the right end of the rainbow, else at the left end. Neither end on the screen: no pot. | Shows (static) |
| Patient watcher | Any day with a sunset | Badge only. The app is open and visible without a break from 2 min before the sunset to 10 min after it. The sunset is the line-of-sight sunset when there is one, like the fireworks. A hidden page, or more than 90 s between two clock ticks (a frozen page), starts the watch again. Live time only. Nothing is saved but the badge. | Not affected |

  - Easter Sunday: `getEasterSunday(year)`, the anonymous Gregorian algorithm (Meeus, ch. 8). `getCalendarEvent` gives `easter`, `april-fools`, `valentine` and `st-patrick` after the season events. Easter wins over April Fools (Apr 1 2029 and 2040).
  - A badge counts when the egg really shows: the scene calls `onEggShown(kind)` (`PlayfulEggs`, `SkyClouds`, the April Fools swap) and `SunTracker.handleEggShown` collects `badgeForPlayfulEgg` (none in a time preview). `badgeForCalendarEvent` gives null for these 4 days. Test links pause the collection (item 112).
  - Info cards (items 95, 113, 116): a double tap on the tomb, the pot or the heart opens a "Special event" card (`emptyTomb`, `potOfGold`, `heartCloud`), "Ultra rare · 1 day a year", with a field note. April Fools has no card (the sun and the moon keep their own cards).
  - Test override: `?egg=aprilFools|easter|valentine|stPatrick` sets that day. `?egg=easter` shows the tomb at any time. `?egg=aprilFools` swaps at any time, `?egg=stPatrick` tints at any time. The heart needs a day cloud, the pot needs a rainbow (pick manual rain).
  - Colours: `--scene-tomb-rock`, `--scene-tomb-entrance`, `--scene-tomb-light`, `--scene-tomb-glow`, `--scene-st-patrick`, `--scene-pot`, `--scene-gold`, `--scene-gold-dark` in `src/index.css`. The heart uses the cloud's own fill.
  - Names and facts in the 5 languages: `egg.aprilFools`, `egg.easter`, `egg.valentine`, `egg.stPatrick`, `egg.patientWatcher`, `eggFact.emptyTomb`, `eggFact.potOfGold`, `eggFact.heartCloud`. Collection icons (lucide): `ArrowLeftRight`, `Sunrise`, `Heart`, `Coins`, `Hourglass`.
- **Built:** `src/utils/playfulEggs.ts` (Easter, the morning rule, the override, the April Fools phases, the pot position, the patient watch), `src/hooks/useAprilFoolsSwap.ts` (one timeout per phase), `src/components/PlayfulEggs.tsx` (tomb, pot), `HEART_SHAPE` in `cloudShapes.ts`, `getHeartGliderId` in `skyCloudUtils.ts`. 92 badges, 24 eggs.
- **Checked:** `tests/utils.playfulEggs.test.ts` (Easter 2026-04-05, 2027-03-28, 2028-04-16, 2029-04-01, the limits 2038-04-25 and 2285-03-22; the morning rule; the day rules; the override; the April Fools phases; the pot ends; the patient watch: earned from −2 to +10 min, not when late, early, hidden or after a gap, not without a sunset; the badges; the heart cloud choice). `tests/PlayfulEggs.test.tsx` (tomb on Easter morning only; pot at the rainbow end only; static with reduced motion; double tap opens the card; the April Fools swap in `SunVisualization` with fake timers, none with reduced motion or with the moon down; the heart in `SkyClouds` by day only, its card, also with reduced motion). The egg cards in `utils.sceneInfo`. In the browser at 390 × 844 (Konstanz, `?egg=easter`, 08:30): the tomb on the shore. Not checked in the browser: the heart, the pot and the swap (the live weather had rain and no single clouds).
- **Changed (2026-10-09):** on request, the April Fools swap no longer needs both bodies up, on the screen and clear of clouds; the tomb has a warm glow; St Patrick's Day tints the sky and the water green all day (the user picked this from 4 screenshot variants), and the badge counts on the tint, not on the pot. The April Fools badge needs at least one swapped body in sight. Checked: `tests/PlayfulEggs.test.tsx` (the swap with the moon below the horizon: the moon fades in at the sun's place, the hidden sun is not a tap target; no badge when neither body can be seen, at night or in fog; the tomb glow; the green tint without a rainbow counts the badge, also with reduced motion; the green water in `SunVisualization`). In the browser at 390 × 844 (Konstanz, 09:30 and 21:45): the tomb glow, the green sky, the swap (the thin moon at the sun's place).
- **Open:** the swap repeats on a reload on Apr 1 (once per page view, no storage). On a phone the rainbow is often wider than the screen, so the pot shows mostly when the sun is higher (a smaller rainbow).

### 118. Cultural festivals: an easter-egg pack — M — **✅ Done**

> summary: 12 calendar eggs for festivals of communities around the world (Loy Krathong, Diwali, Eid al-Fitr, Mid-Autumn, Hanami, Tanabata, Día de los Muertos, Holi, Hanukkah, Nowruz, Midsummer, Carnival). Each egg has a date rule, a calm scene effect, a badge, an info card and a `?egg=` test link. This item gives the rules, the priority and what was built.

- **Request (2026-10-09):** a "Cultural festivals" egg pack. The eggs show for everyone, as Lunar New Year does. Exception: Hanami shows only in Japan when the country is known.
- **Why:** the app is used around the world. A festival of the user's own community in the scene makes the day special; a festival of another community is a small discovery, and the info card tells what it is.
- **Rules for all festival eggs:**
  - The trigger logic is in the pure util `festivalEvents.ts` (tables and rules) and in `easterDate.ts` (Easter). `getCalendarEvent` returns the festival id. Local time, the whole local day.
  - The tables give the main day for 2026–2035. Extend them in 2035, with the Lunar New Year list.
  - The drawing is in `FestivalEggs.tsx`. Holi tints the clouds in `SkyClouds`; Día de los Muertos adds bunting to the boats in `SceneBoat` (`CloudLayer` gives both the event).
  - Calm motion: slow straight drifts, rises and falls, a soft glow of 4 s or longer. Nothing jumps, flaps, rotates or flickers fast.
  - Reduced motion: things that float or glow stay, without motion (krathongs, diyas, lanterns, marigolds, bonfires). Things that only drift or fall are hidden (cherry petals, confetti).
  - Badge: `egg:<kind>`, ultra rare, in `EGGS` of `collection.ts`. It counts only when the scene really draws the egg (`isFestivalShown`, the same rule for the drawing and the badge). Not in a time preview, not with a `?egg=` link.
  - Info card: a "Special event" card with a field note and the days a year (`getEventDaysPerYear`). A double tap (item 116) on a krathong, diya, the Eid moon glow, a lantern, a petal, Vega or Altair, a marigold, a Hanukkah candle, a Nowruz blossom, a bonfire or a confetti piece opens it. Holi has no card: its clouds keep their cloud cards (like the Christmas snow, item 113).
  - Test link: `?egg=<kind>` with the kind of the table below (any case), for example `?egg=diwali`. It forces the festival and collects nothing.
  - Colours: tokens `--scene-festival-*` in `src/index.css`.
  - Texts: names, facts and the two pills in `en`, `de`, `es`, `it`, `fr`. The facts for religious festivals give the meaning in neutral words, without a judgement.

| Egg (`?egg=`) | Trigger | Scene | Shows when (badge counts) |
|---|---|---|---|
| Loy Krathong (`loyKrathong`) | Table: the full moon of the 12th Thai lunar month (TAT dates to 2030, later years from the full moon in Thai time and the 19-year moon cycle) | 5 candle-lit krathongs drift slowly on the sea (±36 px over 70–114 s) | Dark sky |
| Diwali (`diwali`) | Table: the Lakshmi Puja day (Drik Panchang, New Delhi) | 9 diyas along the far shore at the horizon, soft glow 4–6 s | Dark sky |
| Eid al-Fitr (`eidAlFitr`) | Table: 1 Shawwal, Umm al-Qura calendar (the local day can differ by 1 day where the moon sighting decides; 2033 has two) | A soft golden glow over the moon disc; the pill "Eid al-Fitr · Eid Mubarak" on the water | All day (the pill) |
| Mid-Autumn (`midAutumn`) | Table: 15th day of the 8th Chinese lunar month | 6 red lanterns rise slowly (150–200 s to the top); a faint rabbit shape on the moon | Dark sky |
| Hanami (`hanami`) | Mar 25 – Apr 10. With a country code: Japan (`JP`) only. Without one: everyone | 14 cherry petals drift across the day sky (110 vw in 70–100 s) | Not a dark sky, no reduced motion |
| Tanabata (`tanabata`) | Jul 7 | Vega and Altair bright, a faint Milky Way band between them (fixed places, not the real sky positions) | Dark sky |
| Día de los Muertos (`diaDeMuertos`) | Nov 1–2 | 14 marigolds float on the water; papel picado on the boats with a mast (not the rowboat) | All day |
| Holi (`holi`) | Table: the day of colours (Dhulandi), after the Phalguna full moon | The day clouds get soft pink, yellow and green washes | Not a dark sky, weather not `clear` |
| Hanukkah (`hanukkah`) | Table: from the eve of 25 Kislev, 8 days | 1 to 8 plain cream candles on small floating holders, in an even row on the water below the horizon labels, each with a short reflection: one more each night, no shamash; a very slow bob (2 px, 6–8 s) and a soft flame flicker (4–5 s); static with reduced motion | Dark sky |
| Nowruz (`nowruz`) | The March equinox day (`getSeasonEvent`) | The equinox pill stays; 7 big five-petal blossoms in a gentle arc frame it, a few petals sink slowly (hidden under reduced motion) | All day. Also collects the equinox badge (`NOWRUZ_ALSO`) |
| Midsummer (`midsummer`) | Midsummer Eve (the Friday of Jun 19–25) and the Saturday after it | 3 small bonfires on the far shore, soft glow; the pill "Midnight sun" at latitude 60° N or more | Evening, twilight or night (at 60° N in June the sky does not get dark) |
| Carnival (`carnival`) | Easter − 52 to Easter − 47 (the Thursday before Shrove Tuesday to Shrove Tuesday; `getEasterSunday`, anonymous Gregorian algorithm) | 18 pastel confetti pieces fall slowly (110 vh in 50–71 s) | Not a dark sky, no reduced motion |

- **Priority (one event a day, `getCalendarEvent`):** the shortest event wins; on a tie, the first in this list wins.
  1. The New Year minute.
  2. Lunar New Year.
  3. The one-day festivals, in this order: Eid al-Fitr, Diwali, Holi, Loy Krathong, Mid-Autumn, Tanabata.
  4. Friday the 13th.
  5. Solstice, equinox, Nowruz (the March equinox).
  6. Halloween.
  7. Christmas (3 days).
  8. The festivals of several days, shortest first: Midsummer (2), Día de los Muertos (2), Carnival (6), Hanukkah (8), Hanami (17).
- **Known collisions 2026–2035:** Eid al-Fitr and the March equinox on 2026-03-20 (Eid shows); Holi and the March equinox on 2030-03-20 (Holi shows; no Nowruz that year); Holi in Hanami on 2032-03-27 (Holi); Diwali on 2032-11-02 and Loy Krathong on 2028-11-02, the second day of Día de los Muertos (Diwali, Loy Krathong); Lunar New Year in Carnival on 2027-02-06 (Lunar New Year); Hanukkah and Christmas on 2027-12-24 to 26 and 2035-12-25 to 26 (Christmas; Hanukkah shows the nights after with the right count); the June solstice on a Midsummer day (the solstice; Midsummer shows on the other day).
- **Country:** `getCalendarEvent(date, latitude, country?)` takes an optional ISO 3166 code. `SunTracker` has no country yet, so Hanami shows for everyone. Pass the code there when the place's country is known (another branch adds it).
- **Other egg packs:** `getEasterSunday` (`src/utils/easterDate.ts`) is shared, for example for an Easter Sunday egg.
- **Done when:** util tests for every table (each year 2026–2035), the rules and the priority; Easter against published dates; the badge rules; a render test per egg; reduced motion; `tests/i18n.test.ts` passes.
- **Built:** `src/utils/festivalEvents.ts`, `src/utils/easterDate.ts`, `src/components/FestivalEggs.tsx`; changes in `calendarEvents.ts` (12 new ids, priority), `collection.ts` (12 badges: 99 in all, 31 eggs), `sceneInfo.ts` (11 cards), `CollectionView.tsx` (lucide icons), `CalendarEggs.tsx` (the equinox pill on Nowruz), `SkyClouds.tsx`, `SceneBoat.tsx`, `CloudLayer.tsx`, `SunVisualization.tsx`, `SunTracker.tsx`, the 5 dictionaries, `index.css`.
- **Checked:** `utils.festivalEvents`, `utils.easterDate`, `utils.calendarEvents`, `utils.collection`, `utils.sceneInfo`, `FestivalEggs`, `SkyClouds`, `SceneBoat` and `SunTracker` tests. Typecheck, lint and all tests pass.
- **Open:** a check of the Loy Krathong dates after 2030 and the Holi dates against an official calendar (they can be one day off); real sky positions for Vega and Altair; the look of each egg in the browser and on a phone; a native-speaker review of the new de/es/it/fr texts (item 67).


### 119. A calm rain sound when it rains — S — **✅ Done**

- **Request (2026-10-09):** "lo-fi calm low rain sound when it is raining". Then: "make it play with the radio but also make it able to play on its own, button should be in the audio control panel".
- **Now:** the rain is only seen (item 77). The only sounds are the radio (`MusicPlayer`, lo-fi streams) and the countdown (`useSunsetCountdown`, Web Audio tones). The audio control panel is the radio pill at the bottom left: switch, `Music` icon, station name, next, volume icon, slider.
- **Spec:**
  1. **Sound:** synthesized with Web Audio, no audio file: a looped noise buffer (pink or brown noise) through a low-pass filter (about 1–2 kHz), so it is a soft, low hiss and not a white-noise rush. No thunder, no single drop clicks. No new host, so no CSP change and no licence.
  2. **When it rains:** the weather type is `drizzle`, `rain` or `thunderstorm` (live or manual weather, and the time-travel forecast of item 86). Snow and hail: no sound.
  3. **Button:** a toggle button in the radio pill, after the next button: lucide `CloudRain`, `aria-pressed`, `aria-label` "Rain sound" (key `music.rain` in the 5 languages). The same style as the next button; pressed is full white, not pressed is `text-white/50`. It shows only while it rains (point 2).
  4. **One state, `rainOn`** (in `MusicPlayer`, not saved, off at page load):
     - The radio switch on sets `rainOn` true, so the rain plays with the radio. The radio switch off sets it false.
     - The rain button toggles `rainOn` alone. With the radio off, it plays the rain on its own. With the radio on, it turns the rain off under the music.
     - The rain sound plays when `rainOn` and it rains. Rain that stops fades the sound out; rain that comes back while `rainOn` is still true fades it in.
     - Not saved, because a browser does not play sound before a tap. The tap on the switch or the button is the user gesture.
  5. **Level:** the slider sets both. The rain gain is slider × 0.25 with the radio on (quiet under the music) and slider × 0.6 alone. Slider at 0 mutes both. More rain is a little louder: × 0.6 at drizzle up to × 1 at a storm (item 77's `t`). No level jumps: each change ramps over 3 s, and start and stop fade over 3 s.
  6. **Shared context:** one `AudioContext` for the app. Move `getAudioContext` from `useSunsetCountdown.ts` to a small util and use it in both places.
  7. **Background (item 90):** with the radio on, the rain goes on in the background with it. Rain alone has no Media Session, so a phone can stop it in the background. Accepted; no Media Session for rain alone.
- **Done when:** util tests (rain types give a gain, other types 0; the gain grows with `t`; radio on 0.25×, alone 0.6×; slider 0 gives 0). `MusicPlayer` tests with a mocked `AudioContext`: the rain button shows only while it rains; the radio switch on presses it and starts the noise with a 3 s ramp; the button alone with the radio off plays the rain; the button off with the radio on stops only the rain; the radio switch off stops both. `tests/i18n.test.ts` passes. By ear on a phone: calm, low, under the music, no click at the loop point.
- **Built:** `useRainSound(gain)` (`src/hooks/useRainSound.ts`): a 2 s looped white-noise buffer through two 1200 Hz low-pass filters (white noise has no drift, so the loop point has no click). Each gain change ramps over 3 s; at 0 the noise fades out and stops. `getRainSoundGain` in `rainUtils.ts` (0.25× with the radio, 0.6× alone, × 0.6–1 by `t`); the countdown duck also lowers the rain. `MusicPlayer` gets `rainMmH` (`getRainMmH(weatherType, rainMmH)` from `SunTracker`) and the `CloudRain` toggle; the radio switch and the Media Session play and pause set `rainOn` with the radio. `src/utils/audioContext.ts` holds the shared `getAudioContext` and `getRunningAudioContext` (moved from `useSunsetCountdown`; Santa's bells import it from there). Key `music.rain` in the 5 languages.
- **Checked:** util tests (no rain or off gives 0; 0.25× / 0.6× at a storm; grows with `t`; slider 0 gives 0). `MusicPlayer` tests with a fake `AudioContext` (button only while it rains; the radio switch presses it and starts the noise, off stops both with a 3 s fade; the button alone plays the rain, louder than with the radio; the button off with the radio on stops only the rain; no rain, no noise). Typecheck, lint and all tests pass. Browser at 390 × 844 (live rain, Ravensburg): the button shows in the pill, a tap presses it and the `AudioContext` runs. Not checked: the sound by ear on a phone.
---

### 120. Collection: rarer terrain, plane hauls and satellite sizes — M — **✅ Done**

- **Request (2026-10-09):** "terrain should get a rarity for higher = rarer, and planes and satellites should have different badges for further destinations and bigger satellites with different rarities".
- **Built:** fixed tiers in `sceneInfo.ts` (these things are not rolled): `TERRAIN_TIERS` (hills common → alpine very rare), `HAUL_TIERS` with `getPlaneHaul` (route leg < 800 km regional, < 2000 short, < 4500 medium, < 9000 long, else ultra long: common → very rare), `SATELLITE_TIERS` with `getSatelliteSize` (from the CelesTrak name: Starlink/OneWeb small, the rest medium, rocket bodies large, Hubble and the Chinese station giant, the ISS: common → very rare; follow-up: 5 classes each, like the terrain). `getTerrainBand` moved to `sceneInfo` (re-exported by `collection`). The terrain, live-plane (once the route is known) and satellite cards have a rarity row and the tier ring. `LiveRoute` has `km` (the leg length, `planeFeed.mapRoute`). 10 new state badges (`plane:*`, `satellite:*`, item 115 rows), 128 in all; the haul badge counts when the route comes (`badgeForRoute`, SunTracker), the size badge on the satellite double tap (`stateBadgeForTarget`). Art: the plane and the satellite icon grow with the step. Keys `badge.plane*`, `badge.satellite*` in 5 languages.
- **Checked:** tests for the limits, the badges, the card rows and the route km; typecheck, lint, all tests. Browser at 390 × 844: the plane and satellite rows and the tier outlines. Not checked: a real live-plane route or satellite tap in the scene. Satellite size by name is an approximation (no size data in the GP records).

### 121. A fainter rainbow that takes taps — S — [SUN-CHASER-17](https://ainabler.sentry.io/issues/SUN-CHASER-17)

- **Feedback (2026-10-10):** "Rainbow needs to be a lot fainter and should also be tapable".
- **Now:** `WeatherEffects` draws 6 solid bands (5 px stroke, 7 px apart) at opacity 0.5 by day, in a `pointer-events-none` layer (`z-8`). The rainbow has no card and no badge.
- **Spec:**
  1. Fainter: opacity 0.5 → **0.2** (decided 2026-10-10). The band edges get a soft blur (an SVG `feGaussianBlur`, 1.5 px), and the arc fades out toward its feet (a vertical mask: 100 % at the top, 30 % at the horizon), as a real rainbow does.
  2. Taps: one invisible hit path along the arc (the circle at the middle band's radius, stroke 28 px, `pointer-events: stroke`, `touch-manipulation`), so only the arc takes taps and the sky inside it does not. It uses `useDoubleTap` (item 116). The ring is the arc's outline in its tier colour while the card is open.
  3. Card: a new target `{ type: 'rainbow' }`, kicker "Weather", lucide `Rainbow` icon. Field notes: it is always opposite the sun; the bow is 42° around the point opposite the sun, so it shows only when the sun is lower than 42°; red is outside, violet inside. Rarity row: the fixed tier **uncommon** (decided 2026-10-10); the rainbow is not rolled, it needs rain and a low sun.
  4. Badge: a new badge `rainbow` (129 in all), counted on the double tap, with the tier of step 3.
  5. The pot of gold (item 117) stays above the hit path, so its tap still opens its own card.
  6. Keys in 5 languages; no tap and no card at night (the rainbow is hidden then).
- **Done when:** component tests: opacity 0.2, the hit path is a stroke with `pointer-events: stroke`, one tap no card, double tap card and the `rainbow` badge; the pot keeps its tap. The card test in `sceneInfo`. Browser at 390 × 844 with rain and a low sun: fainter, and the card opens.

### 122. Fish change size, opacity and speed when they change lanes — M — [SUN-CHASER-18](https://ainabler.sentry.io/issues/SUN-CHASER-18)

- **Feedback (2026-10-10):** "Lane changes fish need to change size as well".
- **Cause:** a fish's size comes from its depth (`createFish`: `nearness = 1 − FAR_SHRINK × depth`), and its lane height from the same depth (`y = 67 + (1 − depth) × 26`). A lane change (item 102) only moves the fish (`sceneLaneShift`: `translateY(--shift-dy)`). A fish that moves to a nearer lane keeps its far size, and the other way round.
- **Spec:**
  1. `dodge` stores the scale with the shift: the new depth from the new lane (`1 − (y − 67) / 26`, clamped to 0–1), then `scale = nearness(new) / nearness(old)`.
  2. `sceneLaneShift` animates `translateY(--shift-dy) scale(--shift-scale)` in the same 3 s (`LANE_SHIFT_SEC`), with the transform origin at the fish's centre. The pair's second fish does the same `lag` s later.
  3. The lane plan uses the new size for the box after the change (`fishLane` with the new depth), so a fish that grows does not touch the next lane.
  4. **Decided 2026-10-10: size, opacity and speed all follow the new depth.** The opacity goes to `(1 − 0.3 × depth)` of the new lane in the same 3 s (the night and rain factors stay). The speed: the crossing is one CSS animation, so the fish's crossing splits at the shift. `dodge` gives the fish a second leg: from the shift's end, the rest of the way at `spec.speed × nearness(new)`. The fish keeps one hit area and one id; the lane plan (`ScenePath`) gets the second leg's start and speed, so `firstMeeting` sees the real path. In rewind (item 83) the legs play in the other order.
  5. During time-travel play nothing changes (as item 102).
- **Done when:** a unit test: a shift to a nearer lane gives a scale > 1, to a farther lane < 1, and the scale equals the nearness ratio; the render test sees `--shift-scale`. The box simulation (item 92) still passes.

### 123. Easter eggs collect only on a double tap — M — [SUN-CHASER-19](https://ainabler.sentry.io/issues/SUN-CHASER-19)

- **Feedback (2026-10-10):** "Easter eggs also need to be double tapped to count as collected".
- **Now:** item 116 made the scene things collect on a double tap. The eggs do not: by the item 113 decision an egg card adds no badge (`badgeForTarget` gives `null` for `egg`), and the egg's badge counts when the egg **shows** (`SunTracker`: `calendarBadge`, `santaBadge`, `nationalBadge`, `astroBadge`, the UFO, the New Year, `handleEggShown` for the April Fools sun, the empty tomb, the green St Patrick's sky and the heart cloud).
- **Spec:**
  1. An egg with a tappable thing collects its badge on the double tap that opens its card, not when it shows: UFO, Lunar New Year dragon, Santa, black cat, Halloween bat, pumpkin moon, the sky eggs (Matariki, conjunction, noctilucent clouds, midnight sun, polar night), the national-day eggs, the empty tomb, the pot of gold, the heart cloud and the festival eggs. `badgeForTarget({ type: 'egg', kind })` maps each egg card kind to its badge id (one table, with a test that each egg card kind with a badge maps to it).
  2. **Decided 2026-10-10: the eggs with no tappable thing get one** (option B). Proposal, per egg:
     - Fireworks (New Year, national-day fireworks): while a show plays, the fireworks canvas takes double taps (`pointer-events-auto` only during the show) and opens a "Fireworks" egg card.
     - Eclipses, supermoon, blue moon, green flash: the sun or moon double tap during the event collects the event badge, and the sun or moon card gets an event row.
     - Aurora: the aurora band gets a hit area (like the clouds) and an egg card.
     - Meteor shower: a shooting star is too small and fast to hit, so the star field takes the double tap during a shower and opens a "Meteor shower" card.
     - Solstice and equinox: the badge text takes the double tap and opens a card.
     - Christmas boat lights, national-day bunting: the boat's double tap collects the badge; the boat card gets a row.
     - April Fools sun: the sun's double tap while it shows. St Patrick's green sky: the pot of gold's double tap. National-day jets: a hit area on the jets.
     - Patient watcher: an achievement for watching, not a thing; it stays as now (collects when earned).
     Size with step 2: M.
  3. The sunglasses and the disco (7 taps, the Konami code) are gestures already; they do not change.
  4. The rules of item 112 stay: no badge in a time preview, with reduced motion, or for a forced `?egg=`.
- **Done when:** tests: an egg that shows does not collect; a double tap on it collects its badge once; a single tap collects nothing; the eggs of step 2 follow the chosen option. Item 113's "an egg card adds no badge" is marked as replaced.

### 124. A double tap does not wake the controls — S — [SUN-CHASER-1A](https://ainabler.sentry.io/issues/SUN-CHASER-1A) — **✅ Done**

- **Feedback (2026-10-10):** "Double tap shouldn't activate controls".
- **Meaning (confirmed 2026-10-10):** in fullscreen, each `touchstart` anywhere calls `wakeCursor` (`SunTracker`, item 89 `useIdleHide`), so the fullscreen, compass, feedback and top-left buttons fade in. Since item 116 a card needs a double tap, and these two taps also bring back all the controls over the scene and the card.
- **Spec:**
  1. Each scene hit area (the 17 `touch-manipulation` hit areas of item 116, and the rainbow of item 121) gets `data-scene-hit`.
  2. The wake listener skips a touch that starts on a scene hit area (`event.target.closest('[data-scene-hit]')`). A tap on the open sky or the sea still wakes the controls; a mouse move still wakes them.
  3. Outside fullscreen nothing changes.
- **Done when:** a `SunTracker` test in fullscreen: a touch on a fish hit area does not wake, a touch on the empty scene wakes. On a phone: a double tap on a fish opens its card and the controls stay hidden.
- **Built:** each existing scene hit area has `data-scene-hit`: `CloudLayer` (`tappable`: fish, birds, bats, boats, planes), `SkyClouds`, `SunVisualization` (sun, moon, terrain), `Satellites`, `LivePlanes`, `Ufo`, `MidnightGhost`, `Santa`, `LunarDragon` and each `tapClass` element of `CalendarEggs`, `FestivalEggs`, `PlayfulEggs`, `NationalEggs` and `SkyEggs`. In fullscreen the `touchstart` listener in `SunTracker` returns when the touch target is inside `[data-scene-hit]`; else it calls `wakeCursor` as before. `mousemove` is unchanged. The rainbow (item 121) and the new egg hit areas (item 123) add the attribute in their own items.
- **Checked:** `SunTracker` fullscreen test: two touches inside a `data-scene-hit` element keep the controls hidden, a touch on the document wakes them. `CloudLayer` and `SunVisualization` tests check the attribute on the fish, sun, moon and terrain hit areas. Typecheck, lint and all 1634 tests pass. Not checked: a real phone.

### 125. Lazy load: a smaller start bundle — M — item 91 H5

- **Request (2026-10-10):** "spec the lazy load", before the Play release (item 16).
- **Now (measured 2026-10-10, main `da73b15`):** `npm run build` gives one `index` chunk of 951 kB (316 kB gzip). The item 91 baseline was 581 kB. Minified bytes per part (`source-map-explorer` on a `--sourcemap` build):

  | Part | kB | Needed at start? |
  |---|--:|---|
  | i18n, five dictionaries | 140 | One only |
  | `react-dom` + `react` | 133 | Yes |
  | Sentry (`core`, `browser`, `browser-utils`) | 88 | Yes, to catch start errors |
  | `@sentry/feedback` | 38 | No, only when the feedback form opens |
  | Easter-egg components and their own utils (`Fireworks`, `LunarDragon`, `Santa` + `santaFlight` + `sleighBells`, `CalendarEggs`, `FestivalEggs`, `PlayfulEggs`, `NationalEggs`, `MidnightGhost`, `TemperatureIceberg`, `Ufo`, `DiscoSky`, `sharkHunt`) | 60 | No, only on their day or trigger |
  | Info card (`SceneInfoCard`, `sceneInfo`) | 19 | No, only after a double tap |
  | Collection (`CollectionView`, `BadgeUnlocked`, `collection`) | 19 | `collection` yes (badges are counted), the view no |
  | `PlaceSearch` + `geocodeUtils` | 3 | No, but too small to split |

- **Spec:** one commit per step. Build after each step and write the `index` size into this item. Keep a step only when the chunk gets smaller.
  1. **Dictionaries (−112 kB):** `en` stays static (it gives `MessageKey` and is the default). `de`, `es`, `it` and `fr` load with `import()`. `main.tsx` waits for the saved language (`loadLanguage()`) before `render`, so the first frame has the right texts and no English flash. A language change in `SunTracker` waits for its dictionary before it sets the language. `tests/i18n.test.ts` keeps its static imports.
  2. **Feedback form (−38 kB):** remove `feedbackIntegration` from `Sentry.init`. `openFeedback` (`src/utils/feedback.ts`) does `import('@sentry/feedback')` on the first open, `Sentry.addIntegration(...)` with the same options, then `createForm`. `isFeedbackAvailable` checks the DSN, not `getFeedback()`. Check that `@sentry/feedback` is its own chunk; if `@sentry/react` pulls it back in, drop this step. Do not use `lazyLoadIntegration`: it loads a script from Sentry's CDN, and the CSP (and item 6) do not allow that.
  3. **Easter eggs (−~55 kB):** `React.lazy` for each egg component, in `<Suspense fallback={null}>`. The decision utils (`calendarEvents`, `nationalDays`, `playfulEggs`, `hiddenEggs`, `festivalEvents`, `easterDate`) stay static, so `SunTracker` decides without a load. `GHOST_RING` and `UFO_RING` move from the component files to `hiddenEggs.ts`, because a static import of a constant keeps the whole component in `index`.
  4. **Info card and collection view (−~25 kB):** `React.lazy` for `SceneInfoCard` and `CollectionView`. `getSceneInfo` moves into the lazy card, so `sceneInfo.ts` goes with it. `BadgeUnlocked` and `collection.ts` stay static.
  5. **Offline:** the lazy chunks are `.js` files in `dist/assets`, so the PWA precache keeps them. The install size stays the same; the gain is less parse and run time at start.
- **Not in scope:** `react-dom`, the Sentry core, `PlaceSearch` (3 kB), `lucide-react` and `tailwind-merge` (already tree-shaken).
- **Done when:** the `index` chunk is 700 kB or less (−25 % from 951 kB), measured with `npm run build`. All tests, lint and typecheck pass. `npm run perf:trace -- --screenshots` shows no visual change. In the browser: a German start shows German texts in the first frame; the feedback form opens on the first tap; a forced egg (`?egg=…`) shows; with the network off after one visit, an egg, the info card and the feedback form still load.

## Ongoing — Easter eggs and special events (S each, pick any time)

Rules for all items:

- Respect `prefers-reduced-motion`.
- Keep the rAF id in a `useRef`.
- Put the trigger logic (date and astronomy checks) in a pure util with tests.
- Show at most one special event at a time.
- Test override: `?egg=<kind>` forces one astronomy event (`solarEclipse`, `lunarEclipse`, `greenFlash`, `supermoon`, `blueMoon`, `meteorShower`, `aurora`, and the sky eggs `matariki`, `conjunction`, `noctilucent`, `midnightSun`, `polarNight`), or one festival (item 118).

Items:

- **Calendar:**
  - ✅ New Year: fireworks at 00:00 on Jan 1 (reuse `Fireworks`). Done: the clock tick starts the show when it enters 00:00; the midnight ghost stays away.
  - ✅ Solstice and equinox: a small badge and the longest/shortest-day text. Done: a glass pill on the water, text by hemisphere.
  - ✅ Halloween: a pumpkin moon when the full moon is within 3 days of Oct 31. Otherwise bats all night. Done: pumpkin over the moon; 5 slow gliding bats.
  - ✅ Christmas: light snow on Dec 25–26 (changed 2026-10-09 from Dec 24–26: Christmas Eve is Santa's), even when the weather is clear. Done: slow small flakes, off when it already snows. Changed 2026-10-09: falling Christmas ornaments (baubles and a few stars) instead of snow; same days and rules; badge id `egg:christmas` kept. Changed again 2026-10-09: Christmas lights on the boats instead of the falling ornaments. Every boat gets a string of small warm bulbs (warm white, amber, soft red, gold) along the bunting lines and a small gold star above the masthead or funnel top: shape `'lights'` in `BoatBunting.tsx`, through `BuntingContext` (SunTracker), drawn above the boat's dimming filter like the mast lights. The bulbs glow when the boat is lit (night) and then twinkle very slowly (opacity, 6 s); reduced motion keeps them still. They show in any weather and with reduced motion. The badge id `egg:christmas` is kept (name "Christmas lights") and counts when a lit boat shows (like the bunting days), not in a time preview.
  - ✅ Friday the 13th: a black cat walks along the horizon once. Done: a 45 s straight glide, no bounce. Redesigned as "Moon-watcher": the cat sits on a shore rock on the left of the horizon all day, seen from behind; only its tail sways (6 s, ±6°). Reduced motion: the cat stays, without the tail sway, and its badge counts.
  - ✅ Christmas Eve: Santa in his sleigh with his reindeer flies once across the night sky on Dec 24, between sunset and midnight. A slow straight glide high in the sky, like the UFO (no bounce, no flapping legs; calm-motion speed limit). No snow on Christmas Eve (decision 2026-10-09): Santa flies without the `christmas` event, and `?egg=santa` forces only Santa. A tap opens an info card. Collection: a new "Santa" egg badge (item 112), counted when he shows. `?egg=santa`. Done: `Santa.tsx`, a dark sleigh and 4 reindeer with Rudolph's red nose; one glide per page view at 11 % height, random direction, 2.5 %/s capped at 9.75 px/s (about 52 s on a 390 px phone); `isSantaTime` in `calendarEvents.ts` (the sunset must be on Dec 24); also when it snows; a flight that is on at midnight ends at the edge.
    - **Lookbook (2026-10-09):** S2 across the moon, S4 far-away fallback, S6 rest stop, S9 bells, S7 tracker card. They replace the S1 glide. He flies on Christmas Eve without the `christmas` event (Dec 25–26), and `?egg=santa` still forces only him.
    - **Built:**
      - S2: when the moon disc is drawn (`SunVisualization`'s `isMoonDiscShown`: up, at night or in nautical or astronomical twilight, in view, not fully hidden by clouds) at his start (the scene must be measured first: `CalendarEggs` waits for `measured`), he flies at the moon's centre height, in front of the disc. Width = moon radius × 54/28 (lookbook: radius 28 → 54 px; about 46–53 px on a phone). He follows the moon's latest place; the stop point is fixed when he starts to slow down.
      - S4: else 24 px wide, 23 % down the sky, 0.45 × the S1 speed, with a red (#FF5050) blurred glow (r 2.4 px) on Rudolph's nose. The tap target stays at least 44 × 44 px.
      - S6: halfway he slows to a stop over 3 s, holds 5 s, and speeds up over 3 s (`santaFlight.ts`, pure). Stop point: on the moon (S2), or the middle of the screen (S4). During the hold "Ho ho ho!" (`egg.santaGreeting`) fades in and out over 1 s, above him (above the disc in S2).
      - S9: with the countdown sound on (the bell, item 108) and the app's `AudioContext` already running (`getRunningAudioContext`), 7 soft bell hits when he enters the screen (`sleighBells.ts`, peak gain 0.035, so the radio does not duck). Else nothing plays.
      - S7: his card looks like the live plane card (item 111): "SANTA 1", the route "North Pole → <town>" (the InfoPanel's place name, no new lookup; "your sky" without one), altitude 10,700 m, the rarity row, and two counters that tick once per second while the card is open (`santaTracker.ts`: seconds since 10:00 UTC on Dec 24, at least 0, × 131,000 presents and × 15,200 cookies). Then the field note, "Just for fun, not real data" and a link to noradsanta.org (new tab). A plain link needs no CSP change.
    - **Checked:** unit tests for the flight path (phase limits, hold, end, mirror), the bells (fake `AudioContext`, sound off, suspended, errors) and the counters; component tests for both modes, the card, the link and the interval cleanup. Headless Chromium at 390 × 844 with `?egg=santa`: S2 on the Dec 24, 2026 full moon, the hold with "Ho ho ho!", the card, and S4.
  - ✅ Playful pack (item 118): April Fools (the sun and the moon swap places for one minute), Easter Sunday morning (the empty tomb), Valentine's Day (a heart cloud), St Patrick's Day (a pot of gold at the rainbow's end) and the patient-watcher badge.
- **National days** (`nationalDays.ts`, `NationalEggs.tsx`, `BoatBunting.tsx`): ✅ Done 2026-10-09.
  - **Summary:** each national day shows only in its own country, on its local day. One row per country in `NATIONAL_DAYS` (country code, date, style, flag colours). A new country is one row.
  - **Country source:** the `countryCode` of the BigDataCloud reverse-geocode answer that `InfoPanel` already gets for the place name. `InfoPanel` passes it up with `onCountryChange`; `SunTracker` keeps it in state. No second call and no new CSP host. Unknown country (no answer, an error, a searched place): no national egg. The app does not guess the country from the language.
  - **Eggs:**

    | Country | Day | Egg | Style |
    |---|---|---|---|
    | IT | Jun 2, Festa della Repubblica | `festaRepubblica` | Frecce Tricolori: nine small jets fly once across the day sky (dawn to evening), 2 %/s capped at 7.8 px/s. Each jet trails smoke: the top three green, the middle three white, the bottom three red. The smoke stays, then fades out over 40 s. |
    | FR | Jul 14, Bastille Day | `bastilleDay` | One `Fireworks` show in the flag colours per night view (dark sky). |
    | US | Jul 4, Independence Day | `independenceDay` | The same, in red, white and blue. |
    | GB | Nov 5, Guy Fawkes Night | `guyFawkes` | The same, and a soft, still bonfire glow on the shore at night. |
    | DE | Oct 3, Tag der Deutschen Einheit | `germanUnity` | Bunting: a static string of small pennants in the flag colours on every boat. |
    | ES | Oct 12, Fiesta Nacional | `fiestaNacional` | Bunting. |
    | CA | Jul 1, Canada Day | `canadaDay` | Bunting. |
    | AU | Jan 26, Australia Day | `australiaDay` | Bunting. |
    | NL | Apr 27, Koningsdag (Apr 26 when Apr 27 is a Sunday) | `kingsDay` | Bunting, mostly orange. |

  - **Rules:** a calendar event wins the day (Lunar New Year on Australia Day 2028): one special event at a time. The flag colours are the `--national-*` tokens in `src/index.css`. `Fireworks` takes a `palette` prop. The sky eggs draw behind the scene, like the UFO. A double tap on the jets or the bonfire opens the egg card (Special event, 1 day a year).
  - **Reduced motion:** no jets and no fireworks, and their badges do not count. The bunting and the bonfire are static, so they stay and count.
  - **Collection:** one ultra rare badge `egg:<kind>` per national day. The jets count by day, the fireworks at night (`badgeForNationalDay`). The bunting counts when a decorated boat shows (`useBunting`: `SceneBoat` calls `onShow`), because a bunting day without a boat on the screen shows nothing. Never in a time preview.
  - **Test links:** `?egg=<kind>` (for example `?egg=bastilleDay`) forces that day in any country on any date; the time-of-day rules still apply. `?country=XX` sets the country. Both pause the collection.
  - **Open:** the bunting and the French and US fireworks have no tap target, so their cards do not open yet. A searched place has no country code (Open-Meteo gives `country_code`, but the saved place keeps only the name).
- **Astronomy:**
  - ✅ Solar and lunar eclipses: a darkened sun or red moon at the correct time (hardcoded date list for 10 years). Done: NASA GSFC list 2026–2035 in `astroEvents.ts`; solar only within ~3500 km of the greatest-eclipse point.
  - ✅ Supermoon: a bigger moon when the full moon is near perigee. Done: 14 % bigger moon when the full moon is closer than 360 000 km (Meeus distance).
  - ✅ Blue moon: the second full moon in a month has a faint blue tint. Done: `MoonTint`, ±1 day around the full moon.
  - ✅ Meteor showers: more shooting stars at night, via `NightStars`, during the Perseids (~Aug 12), Geminids (~Dec 14) and Quadrantids (~Jan 3). Done: 8× the shooting-star rate on the 3 peak days.
  - ✅ Aurora: green curtains at night when |latitude| > 60°. Later, add live data from the NOAA Kp index. Done: static rule, `Aurora` with a slow CSS drift; Kp index still open.
  - ✅ Green flash: 1 in 20 chance of a short green flash at a clear sunset. Done: `GreenFlash`, 4 s after the (line-of-sight) sunset, roll seeded per day and place.
- **Sky (sky egg pack) — ✅ Done:**
  > summary: five sky eggs in `astroEvents.ts`: Matariki (the Pleiades before dawn), a planet conjunction, noctilucent clouds, midnight sun and polar night. Each has a pure check with tests, a `?egg=` override, an info card, and an ultra rare badge `egg:<kind>`. `SkyEggs.tsx` draws them; all are static.
  - **Request (2026-10-09):** a "Sky and astronomy" egg pack in the style of the astronomy eggs.
  - **Rules for the pack:** static drawings (calm-motion rule), so reduced motion needs no change. Colours are tokens in `src/index.css`: `--scene-pleiades`, `--scene-planet`, `--scene-noctilucent`, `--scene-midnight-sun`. Clouds hide the sky things like the stars (`getStarCloudFactor`); the polar pills stay. The sky things use the sun's screen mapping, so they follow the compass view. A double tap opens the egg card (item 116); the kicker is "Special event", the rarity row is "Ultra rare" without a chance text. Each egg collects its badge when it shows (item 112 rules: not in the time preview, not with `?egg=`). Badge total: 87 + 5 = 92.
  - ✅ **Matariki** (`matariki`): the Pleiades as a small blue-white cluster of 7 stars, low in the east-north-east (altitude 7°, azimuth 65°), with the pill "Matariki". When: from 3 days before to 3 days after the NZ public holiday, in the last 90 min before sunrise, with the sun below −3°. Shows for everyone. Dates 2026–2035 (`MATARIKI_DATES`): Te Kāhui o Matariki Public Holiday Act 2022, Schedule 1 (all Fridays).
  - ✅ **Planet conjunction** (`conjunction`): two of Venus, Mars, Jupiter and Saturn less than 2° apart, both higher than 3°, both at least 15° from the sun, with the sun below −4°. The closest pair wins. Two bright dots at the real positions, with the pill "Venus and Jupiter". Under 2° the dots are only 1–2 px apart on the 360° screen, so the drawing spreads them to 14 px along the line between them. Method: computed, not a table. `planets.ts` uses the JPL approximate Keplerian elements (Standish, 1800–2050). A check against astronomy-engine (VSOP87) gave separations within 0.05° and altitude/azimuth within 0.9° for 2020–2035 (J2000 frame, no precession). `?egg=conjunction` draws demo planets (Venus and Jupiter low in the west).
  - ✅ **Noctilucent clouds** (`noctilucent`): 6 faint electric-blue wisps low over the pole-side horizon (north; south in the southern hemisphere). When: June–July at latitude 50–65° N, or December–January at 50–65° S; clear sky; 60–120 min after sunset or 60–120 min before sunrise (today's flat-horizon times from `getSunTimes`). No pill.
  - ✅ **Midnight sun** (`midnightSun`) and **polar night** (`polarNight`): `getSunTimes(...).polar` is `day` or `night`. A glass pill "Midnight sun" or "Polar night" on the water, 130 px below the horizon (below the season badge at 90 px). For the midnight sun, the sun arc is the whole day (already sampled over 24 h when there is no sunrise) and is drawn brighter in `--scene-midnight-sun`; it does not reach the horizon.
  - **Priority in `getAstroEvent`** (one event at a time; `?egg=` always wins): solar eclipse → lunar eclipse → green flash → supermoon → blue moon → **conjunction** → meteor shower → **Matariki** → **noctilucent clouds** → aurora → **midnight sun** → **polar night**. Why: a conjunction is rarer than a meteor-shower night. Matariki is one week a year, noctilucent clouds two months. Midnight sun and polar night last all day, so they come last; in the polar night the aurora shows at night and the "Polar night" pill in the twilight hours.
  - **Input:** `AstroInput.sunTimes` (today's `sunrise`, `sunset`, `polar`) is new and optional. It is not the line-of-sight `sunset`: after sunset the line-of-sight times are already the next pass.
  - **Checked:** `utils.astroEvents` (Matariki dates are Fridays, the ±3-day week, the 90-min window, Wellington before sunrise on 10 Jul 2026; Venus–Jupiter 12 Aug 2025, Jupiter–Saturn 21 Dec 2020, Mars–Jupiter 14 Aug 2024, none by day or when no pair is close; noctilucent windows, months, latitudes, weather, Edinburgh 90 min after a June sunset; Tromsø midnight sun 21 Jun and polar night 21 Dec; the 24-h midnight-sun path stays above the horizon; overrides), `utils.planets`, `utils.collection` (92 badges, the 5 badge ids), `utils.sceneInfo` (5 egg cards), `SkyEggs` (drawing, pills, compass/cloud hiding, double tap), `SunVisualization` (midnight-sun arc).
  - **Open:** (1) After midnight, the noctilucent window uses today's sunset, so a window that runs past midnight (above ~57° N) ends at 00:00. (2) The Pleiades and the noctilucent clouds use a fixed sky position, not a computed one. (3) The conjunction ignores Mercury and the moon.
- **Cultural festivals (item 118):**
  - ✅ Loy Krathong, Diwali, Eid al-Fitr, Mid-Autumn, Hanami, Tanabata, Día de los Muertos, Holi, Hanukkah, Nowruz, Midsummer, Carnival. Done: rules, priority and looks in [item 118](#117-cultural-festivals-an-easter-egg-pack--m--done); `?egg=<kind>`.
- **Hidden:**
  - ✅ Tap the sun 7 times: it wears sunglasses for one minute. (The sun is now a button; `?egg=sunglasses`.)
  - ✅ A UFO crosses the night sky (1 in 200 chance per night view). (40 s straight glide; `?egg=ufo`.)
  - A whale instead of fish (1% chance). → Item 62 (F12).
  - ✅ The Konami code (desktop) or 7 taps on the moon, each within 1.5 s of the one before (phone), give a disco sky for 10 seconds. (Soft colour spots, one slow hue turn; `?egg=disco`.)

---

## Backlog (not prioritized)

- German and English UI (i18n): now item 67, with Spanish, Italian and French.
- Share card: an image of today's sunset with the time and score: now item 68 (Premium).
- Sunset reminder notification: now item 69.
- Date/time scrubber to preview any day or time of the year: now item 44.

### Unit toggle °C/°F — S — **✅ Done**

- **Now:** the app shows temperatures in °C only.
- **Spec:**
  1. Add a small °C/°F segmented toggle to the "Current Weather" section of the InfoPanel. Use the same style as the "Real / Manual" weather-mode toggle.
  2. The default comes from the locale: °F for `en-US` and the other Fahrenheit regions (US, LR, MM, BS, KY, PW, FM, MH). °C for all other regions.
  3. Save the choice in `localStorage` (`temperature-unit`). Wrap the read and the write in try/catch.
  4. The toggle changes only the display. The effects keep °C internally: the iceberg below 0 °C, the frost, the heat shimmer above 30 °C.
  5. If there is a manual weather temperature input, it shows and accepts the chosen unit.
- **Done when:** unit tests for the conversion, the format and the locale default. In the browser, `en-US` shows °F and `de-DE` shows °C, and a toggled choice stays after a reload.
- **Built:** `src/utils/temperatureUnit.ts` has the pure functions: `getDefaultTemperatureUnit` (region from `Intl.Locale(...).maximize()`, so `en` also gives °F), `loadTemperatureUnit` / `saveTemperatureUnit` (try/catch), `celsiusToFahrenheit` and `formatTemperature` (whole degrees). `SunTracker` holds the unit in state (default from `navigator.language`) and gives it to `InfoPanel`. The toggle is next to the temperature value. The weather data and all effect thresholds stay in °C. The manual weather mode has no temperature input, so spec step 5 has no work.
