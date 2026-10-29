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
  - Package `com.ainabler.sunchaser`, host `sun-chaser.vercel.app`, `display: fullscreen`, notifications on, `playBilling` on, `minSdkVersion` 24 (the billing library needs 23; Play's automatic protection needs 24, so Play rejects a bundle with 23).
  - `public/.well-known/assetlinks.json` has the SHA-256 fingerprints of this local key (a sideloaded APK) and of the Play app signing key (`99:59:…:7C:C3`, Play Console → App integrity → App signing; added 2026-10-15). Without the Play key, the app from Play fails the Digital Asset Links check: it shows a URL bar, and Chrome shows the notifications itself, with "Chrome" in the header.
  - Package name decided (2026-10-02): `com.ainabler.sunchaser`. It has the brand and the app name, no personal name and no country domain, because the app is for all countries. It stays fixed after the first Play upload.
  - Distribution for phone tests: the Play Console internal testing track (decided 2026-10-02).
- **Version 2 (2026-10-15):** AAB `2 (1.0.1)` in the internal test, full roll-out. Only changes: version and `minSdkVersion` 24. Play warned that 1,167 device models (Android 6) lose support; decided to accept that (Chrome stopped updating on Android 6 in 2022). Signed with the upload key `4B:9C:…`; Play signs with its app signing key `99:59:…` (both in `assetlinks.json`). The closed test "Alpha" still has version 1. Version 1 files: `~/sun-chaser-android/backup-v1-20261015/`.
- **Status (2026-10-05):** the Play Console app exists. The first AAB (version 1, host `sun-chaser.vercel.app`) is in the internal test, not yet sent to review. The privacy policy is live at `/privacy` (PR #99). Open:
  1. **Move to Cloudflare** (decided 2026-10-05). Why: Vercel Hobby does not allow commercial use, and Premium makes the site commercial; Vercel Pro costs US$20 per month. Cloudflare Pages is free with commercial use, and Cloudflare Registrar sells the domain at cost with free e-mail routing.
     - Done: `public/_headers` has the same security headers as `vercel.json` (PR #103).
     - To do (owner): Cloudflare account with 2FA, buy `sun-chaser.app` (checked free on 2026-10-05), Pages project on the GitHub repo (preset Vite, `npm run build`, output `dist`, `NODE_VERSION=22`, `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`), custom domain. Leave Web Analytics and Rocket Loader off: their injected scripts break the CSP.
     - To do (code): `host` in `~/sun-chaser-android/twa-manifest.json` to `sun-chaser.app`, a new AAB (version 2) as an update to the closed test, `vercel.json` to a permanent redirect to `sun-chaser.app` (then delete its headers and `tests/headers.test.ts`), the privacy policy URL in the Play Console, Cloudflare as the host in the privacy policy. Do this before the production release: the host is in the store app.
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
    - Free dots: `getDotGapMs` (none with the sun at −6° or higher; a gap of 2–4 min in the 2 h after dusk and before dawn, 6–12 min in the middle of the night; 3–6 min since 2026-10-14, as 6–12 min was too rare to see), `makeDotPath` (a straight line across the sky band, 0.1–0.3 %/s, one dot in three fades out over 8 s between 35 % and 70 % of its way), `isSatelliteWeather` (clear or partly cloudy).
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
  - **Moved (item 154, 2026-10-14):** the toggle is now next to the "Satellite tracking" switch, not in the Sunset row.
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

  - With the collection (item 112): the collection badges use the same tiers (`getRarityTier`), so the bat badge is now frequent. ~~An egg card adds no badge (`badgeForTarget` gives null): the egg's badge counts when the egg shows, by the item 112 rules~~ (replaced by item 123: the badge counts on the double tap on the egg, while it shows), and the ghost has no badge. The egg badges show "Ultra rare", like the egg cards (decision 2026-10-09).
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

### 121. A fainter rainbow that takes taps — S — [SUN-CHASER-17](https://ainabler.sentry.io/issues/SUN-CHASER-17) — **✅ Done**

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
- **Decision (2026-10-10, PR #165):** the rainbow is under the clouds, planes, birds and the terrain. Where the arc crosses one of them, a tap opens that thing's card, not the rainbow's.
- **Built:** the new `RainbowLayer` (moved out of `WeatherEffects`, which keeps the fog, the lightning and the heat shimmer at `z-8`) draws the bands at `RAINBOW_OPACITY` 0.2 in a group with a 1.5 px `feGaussianBlur` and a mask (a vertical gradient: 1 at the top, 0.3 at the horizon). The hit path is a second svg: one circle at the middle band's radius, `fill="none"`, a transparent stroke, `pointer-events: stroke`, `touch-manipulation`, `data-scene-hit` (for item 124), and `useDoubleTap` with the ring id `rainbow`. While the card is open, two 1 px circles in `stroke-tier-uncommon/80` outline the arc. No rainbow and no hit path at night (and in the twilights, where it was already at opacity 0). `SunVisualization` renders `RainbowLayer` as its first child with no z-index, so everything after it (satellites, live planes, `CloudLayer` with its planes, clouds, fish, boats and birds, the terrain, the sea) paints over it and takes the tap. Before, the rainbow was in `WeatherEffects` at `z-8`, above the clouds and planes (z auto), the fish (z 5) and the boats (z 7); the birds are z 10. `sceneInfo`: the target `{ type: 'rainbow' }`, the icon id `rainbow` (lucide `Rainbow`, `text-kind-cloud` in `SceneInfoCard`), `RAINBOW_TIER` `uncommon`; the card has the direction opposite the sun, the rarity row and one field note (`info.rainbowFact`, all three facts in one text). `collection`: the badge `rainbow` (group `sky`, 129 badges), first in the sky group because `CollectionView` shows the sky badges without a state row first; `badgeForTarget` maps the rainbow to it, so `SunTracker` collects it on the double tap as before. Keys `scene.rainbow`, `infoKind.weather`, `info.rainbowFact` in 5 languages. Differences from the spec: the hit stroke is 40 px wide, not 28 px (it covers all 6 bands: 5 gaps of 7 px and the 5 px stroke). The pot of gold is not above the hit path; the hit svg instead stops 30 px above the horizon (`RAINBOW_FEET_FREE_PX`), so the rainbow's feet, where the pot stands, take no rainbow taps.
- **Checked:** `RainbowLayer` (the 6 arcs at `xFraction`, nothing when not visible, opacity 0.2, blur and mask; no hit path without `onInfo`; the hit path is a `fill="none"` stroke with `pointer-events: stroke`, `data-scene-hit` and `touch-manipulation`, and its svg ends above the horizon; one tap no card, a double tap opens `{ type: 'rainbow' }`; the ring shows while its card is open; nothing at night), `SunVisualization` (the rainbow layer is the first child, has no z-index, and comes before the terrain and the sea in DOM order), `sceneInfo` (kicker "Weather", icon, title, tier uncommon, the fact, direction opposite the sun), `collection` (129 badges, `badgeForTarget` gives `rainbow`, tier uncommon). Typecheck, lint, build and all 1641 tests pass. Not checked: the browser at 390 × 844 and a real phone (the look of the fainter bow, the tap on the arc, a tap where a cloud or a bird crosses it).

### 122. Fish change size, opacity and speed when they change lanes — M — [SUN-CHASER-18](https://ainabler.sentry.io/issues/SUN-CHASER-18) — **✅ Done**

- **Feedback (2026-10-10):** "Lane changes fish need to change size as well".
- **Cause:** a fish's size comes from its depth (`createFish`: `nearness = 1 − FAR_SHRINK × depth`), and its lane height from the same depth (`y = 67 + (1 − depth) × 26`). A lane change (item 102) only moves the fish (`sceneLaneShift`: `translateY(--shift-dy)`). A fish that moves to a nearer lane keeps its far size, and the other way round.
- **Spec:**
  1. `dodge` stores the scale with the shift: the new depth from the new lane (`1 − (y − 67) / 26`, clamped to 0–1), then `scale = nearness(new) / nearness(old)`.
  2. `sceneLaneShift` animates `translateY(--shift-dy) scale(--shift-scale)` in the same 3 s (`LANE_SHIFT_SEC`), with the transform origin at the fish's centre. The pair's second fish does the same `lag` s later.
  3. The lane plan uses the new size for the box after the change (`fishLane` with the new depth), so a fish that grows does not touch the next lane.
  4. **Decided 2026-10-10: size, opacity and speed all follow the new depth.** The opacity goes to `(1 − 0.3 × depth)` of the new lane in the same 3 s (the night and rain factors stay). The speed: the crossing is one CSS animation, so the fish's crossing splits at the shift. `dodge` gives the fish a second leg: from the shift's end, the rest of the way at `spec.speed × nearness(new)`. The fish keeps one hit area and one id; the lane plan (`ScenePath`) gets the second leg's start and speed, so `firstMeeting` sees the real path. In rewind (item 83) the legs play in the other order.
  5. During time-travel play nothing changes (as item 102).
- **Done when:** a unit test: a shift to a nearer lane gives a scale > 1, to a farther lane < 1, and the scale equals the nearness ratio; the render test sees `--shift-scale`. The box simulation (item 92) still passes.
- **Built:**
  - Depth: `dodge` moves the depth by the lane's move: `depth − Δy / FISH_DEPTH_SPAN` (26 % of the scene), clamped to 0–1. This keeps the fish's ±1 % random height (the spec's `1 − (y − 67) / 26` would lose it). `scale` is the nearness ratio and `fade` the ratio of `1 − 0.3 × depth`; both are stored in `shift` with `at` and `dy`.
  - Speed: one crossing, not two legs. The new util `warpPath` (`scenePaths.ts`) bends the old path on the fish's own clock: rate 1 until the shift, an even change to `scale` over `LANE_SHIFT_SEC`, then `scale`. The result is a new `duration` and a CSS `linear()` curve (a rest stop keeps its stop, at the new speed). The place up to the shift is the same, so the running animation does not jump when it gets the new duration and easing. `xAt` and `firstMeeting` read the curve, so the lane plan sees the real path. A pair's second fish follows the same curve `lag` s later. Rewind plays the curve backwards (same as a rest stop). The speed stays ≤ the near speed of the species, so no fish is faster than the sailboat.
  - Lane plan: the lane is found with the old box, then checked again with the new size and the warped path (no lane then: the fish dives, as before). The new path has the new size; `hold` keeps the old path (old size and speed) until the change.
  - Render: `sceneLaneShift` animates `translateY(--shift-dy) scale(--shift-scale)` and the opacity from `--shift-o0` to `--shift-o1`. The origin is the top left corner (not the centre, as the spec said), so the drawn box is the plan's box. A fish that gets brighter draws at the brighter opacity, and the wrapper dims it to the old opacity until the change.
  - With no depth change (the depth is at 0 or 1 already) the fish keeps its duration and easing.
- **Checked:** `warpPath` tests (same place until the change; 1 → 2 gives 4.5 % in the change and then 2 %/s, and the new end; k < 1 is longer; a rest stop keeps its stop; k = 1 and a change after the end change nothing). `spawnTick` tests: a nearer lane gives `scale` > 1 (the nearness ratio), a farther lane < 1, the `fade` ratio, the new box width, `hold` = the old path, a shorter or longer `duration` with the same place at the shift, a `linear()` easing; a fish at depth 0 that moves nearer keeps its speed. The box simulation (item 92) and the warm-start check (item 93) now read `hold` until the change (the real old box and duration). Typecheck, lint, all 1641 tests pass. Not checked: the browser (a lane change cannot be forced; no render test for `--shift-scale`, as `CloudLayer` cannot be given a fish with a shift). Known limit: when time-travel play starts during the 1–4 s between the plan and the change, the lane change does not start (item 102), but the new speed is already in the crossing.

### 123. Easter eggs collect only on a double tap — M — [SUN-CHASER-19](https://ainabler.sentry.io/issues/SUN-CHASER-19) — **✅ Done**

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
- **Built:**
  - `collection.eggBadgesForTarget(target)` gives the egg badges a double tap can collect: an egg card's badge (`EGG_CARD_BADGES` for the cards with another name: dragon → `lunarNewYear`, black cat → `friday13`, Halloween bat → `halloweenBats`, pumpkin moon → `halloweenPumpkin`, empty tomb → `easter`, pot of gold → `stPatrick`, heart cloud → `valentine`, fireworks → `newYear`, Nowruz → `nowruz` and `equinox`; the other cards have the badge of their own name; the ghost none). The sun carries `solarEclipse`, `greenFlash`, `aprilFools`; the moon `lunarEclipse`, `supermoon`, `blueMoon`; a dressed boat `christmas` and the bunting days; a cloud `holi`.
  - `SunTracker.handleSceneTap` (passed as `onInfo`/`onSceneInfo` to all scene components) opens the card (`handleSceneInfo`) and then collects each of these badges that the scene shows now. The show rules stay those of item 112 (`calendarBadge`, `nowruzEquinoxBadge`, `santaBadge`, `astroBadge`, `nationalBadge`, `buntingBadge`, and the UFO while it flies without reduced motion), but they no longer collect on show. The New Year show counts for 15 s after it starts (`NEW_YEAR_TAP_MS`, the show is 12–13 s). A playful egg counts once the scene reported it (`handleEggShown`) and only on its calendar day. The patient watcher, the sunglasses and the disco do not change.
  - New tap targets (each with `useDoubleTap`, `touch-manipulation` and `data-scene-hit`): the season badge (`CalendarEggs`, new "Solstice" and "Equinox" cards; Nowruz shows the equinox card), and the sky-wide events in `EventSkyTaps`.
  - **Decision 2026-10-10: the event tap areas are in the lowest scene layer.** `EventSkyTaps` is the first child of the scene root (`data-share-root`) in `SunTracker`, with no z-index (as the rainbow of item 121 in `SunVisualization`). It is lower than the rainbow, because the UFO and the national eggs are in `SunTracker` before `SunVisualization`. So every scene thing (the UFO, the national eggs, satellites, planes, clouds, birds, bats, fish, boats, the sun and the moon) takes its own tap, and only a tap on the empty sky opens the event card. It has: the aurora bands' boxes, without their drift (new "Aurora" card; the boxes are in `utils/auroraBands.ts`, shared with `Aurora`); the sky above the horizon during a meteor shower at night, without reduced motion (new "Meteor shower" card); the sky above the horizon while a fireworks show runs (the sunrise, sunset and New Year show opens the new "Fireworks" card, a national show its national-day card). `Fireworks` reports a show's start and end (`onRunningChange`, through `SunVisualization.onFireworksRunning` and `NationalEggs.onFireworksRunning`). The visuals (`Aurora`, `NightStars`, the `Fireworks` canvas) take no taps. New `EggCardKind`s `fireworks`, `aurora`, `meteorShower`, `solstice`, `equinox`, with a fact each.
  - Card rows: the sun card has "Event: Solar eclipse / Green flash", the moon card "Event: Lunar eclipse / Blue moon" (`SceneInfoContext.skyEvent`; the moon card keeps its own supermoon row). A boat on a bunting day, at Día de los Muertos or at Christmas has `dressed` (`useBunting` in `CloudLayer`) and the row "Dressed: Flag bunting / Papel picado / Christmas lights". `Bunting.onShow` is gone (a boat no longer reports its show).
  - Keys in 5 languages: `egg.fireworks`, `eggFact.fireworks|aurora|meteorShower|solstice|equinox`, `info.event`, `info.dressed`, `info.dressedPennant|Picado|Lights`.
  - Differences from the spec: Holi (not in the step 2 list; it tints the clouds) counts on a double tap on a cloud. The national jets and the Guy Fawkes bonfire already had hit areas (item 113), so they did not change. The fireworks, the aurora, the meteor sky and the season badge show no ring (no ring shape, like the terrain). The blue moon label in the season badge takes no taps (the moon tap counts the blue moon).
- **Checked:** `utils.collection` (every egg card but the ghost maps to real badges; the renamed cards; Nowruz gives both; the sun, moon, dressed boat and cloud), `utils.sceneInfo` (the 5 new cards have the ultra rare tier, a title and a fact; the event rows; the dressed row), `CalendarEggs` (one tap on the season badge: nothing; two: the solstice or equinox card; the blue moon label takes no taps), `EventSkyTaps` (no tap areas without an event, no z-index; one tap: nothing; two: the aurora, meteor shower or national fireworks card), `Fireworks` (reports the show's start and end; the canvas stays pointer-events-none), `SunTracker` (the tap layer is the scene root's first child with no z-index, before the UFO, `SunVisualization` and the scene hit areas; Friday the 13th: the cat shows and nothing counts; a tap on an egg that does not show counts nothing; two cat taps count `egg:friday13` once; Santa counts on his tap, not when he flies; the April Fools sun counts on a sun tap only after the scene reported it; a dressed boat's double tap counts the bunting and the Christmas badge, and its card says how it is dressed). Typecheck, lint and all 1648 tests pass. Not checked: the browser and a real phone (the new hit areas on a real show, aurora and meteor shower; that a thing over an event takes its tap is checked by the DOM order only).
- **Follow-up (2026-10-16):** the midnight ghost has a badge now (`egg:ghost`, ultra rare, lucide `Ghost`). It counts on a double tap at 00:00, not in a time preview and not on New Year (the fireworks replace the ghost). `utils.collection` checks that every egg card gives a badge; `SunTracker` checks 00:00 counts and 00:01 does not.

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
- **Done when:** the `index` chunk is 700 kB or less (−25 % from 951 kB), measured with `npm run build`. All tests, lint and typecheck pass. `npm run perf:trace -- --build --screenshots DIR` shows no visual change. In the browser: a German start shows German texts in the first frame; the feedback form opens on the first tap; a forced egg (`?egg=…`) shows; with the network off after one visit, an egg, the info card and the feedback form still load.
- **Built (2026-10-10):** one commit per step. Start size = the entry chunk plus the chunks it imports statically (Rollup moves shared code into such chunks, so the `index` chunk alone reads too low).

  | Step | Change | Start size |
  |---|---|--:|
  | — | Before (main `88157f3`) | 951 kB |
  | 1 | `de`/`es`/`it`/`fr` load with `loadDictionary`; `main.tsx` waits for the start language; a picked language shows when loaded; a failed load falls back to `en` | 835 kB |
  | 2 | Feedback form: `@sentry/feedback` (direct dependency, same version as `@sentry/react`) loads on the first open in `utils/feedback.ts`; `isFeedbackAvailable` checks `getClient()` | 786 kB |
  | 3 | `React.lazy` for `DiscoSky`, `Ufo`, `NationalEggs`, `FestivalEggs` (only on a festival day), `LunarDragon`, `Santa`; ring ids to `hiddenEggs.ts` and `calendarEvents.ts` | 762 kB |
  | 4 | `SceneInfoCard`, `CollectionView` (mounted only while open) and `BadgeUnlocked` (it imports `BadgeArt` from `CollectionView`) lazy; new `LazyPart` wraps every lazy part | 728 kB |
  | — | Not in the spec: drop the unused `TooltipProvider` (Radix Tooltip + floating-ui) from `App.tsx` | **696 kB** (232 kB gzip) |
  | — | Rebased on main `9a2efeb` (PR #168, item 123, adds about 8 kB): main 964 kB → branch | **704 kB** (235 kB gzip), −27 % |

  - The −25 % target is met. The fixed 700 kB is missed by 4 kB, because PR #168 made the start bundle larger after the spec.

  - Not as specced: `getSceneInfo` stays static, because `SunTracker` needs the card's tier for the ring and `collection.ts` imports `sceneInfo.ts`. `MidnightGhost`, `Fireworks`, `PlayfulEggs`, `SkyEggs`, `TemperatureIceberg` and `CalendarEggs` stay static: they are always mounted and decide inside (about 21 kB together).
  - `LazyPart` (request 2026-10-10: "if lazy loading doesnt work just dont show it"): nothing shows while a part loads; a part that fails to load or throws stays hidden, the rest of the app goes on, and the error goes to Sentry.
  - Tests: `tests/setupTests.ts` preloads the dictionaries and makes `React.lazy` components ready before the first render, so the tests stay synchronous. They do not cover the lazy loading itself.
- **Checked (2026-10-10):** 1636 tests, lint and typecheck pass. Production build in Chrome (Playwright, placeholder Sentry DSN): a saved German start loads the `de` chunk and never shows an English text; a switch to Français loads `fr`; `?egg=ufo` loads `Ufo` and shows it; a double tap on it opens the info card (`SceneInfoCard` chunk, ultra rare ring); the feedback button loads the form chunk and opens the form; the collection view opens. Offline after one visit (service worker): the app starts, and the UFO and the collection view load from the precache. No page errors.
- **Screenshots (2026-10-10):** `npm run perf:trace -- --build --seconds 5 --warmup 11 --screenshots DIR` on main `9a2efeb` and on the rebased branch, all 8 scenes, both with the same `.env.local`. 0.04–1.7 % of the pixels differ, all of them moving parts (birds, boats, twinkling stars, rain). The chrome (top-left buttons, panel, player) is the same.
- **Open:** a check on a phone.

### 126. A plane behind a cloud takes the tap — S — **✅ Done**

- **Feedback (2026-10-10):** "cant tap a plane behind a cloud".
- **Cause:** planes (item 96 scene planes and the item 106 live planes) draw before the clouds, so the clouds pass in front of them. Each cloud's hit area is its full box (`SkyClouds`, item 95), so it takes the tap over the plane.
- **Spec:** each plane hit area gets `data-plane-hit`. A tap on a cloud first looks under the tap point (`document.elementsFromPoint`). When a plane hit area is there, the cloud sends the click on to that plane and does not count its own tap. The plane still draws behind the cloud.
- **Built:** `tapPlaneBelow` in `SkyClouds`; `data-plane-hit` on the plane wrapper in `CloudLayer` and the hit span in `LivePlanes`.
- **Checked:** `SkyClouds` test: two taps on a cloud over a plane go to the plane (with the tap point) and open no cloud card; with no plane under it, a double tap opens the cloud card. Not checked: a real phone.

### 127. Radio: replace dead streams, more lo-fi stations — S — **✅ Done** (PR #167)

- **Request (2026-10-10):** "please check the radio streams" and "search for more lo-fi stations that i can add".
- **Found:** two of the four streams were dead: Lofi Hip Hop Radio (`radio.lofihiphop.com` does not resolve) and Chillout Radio (torontocast, connection refused).
- **Lookbook:** [Sun Chaser Radio Lookbook](https://claude.ai/artifact/TyASUsXUa1TpidMCNF7F42) (private). 79 streams checked on 2026-10-10 (the app's four plus all lo-fi and chillhop stations in the Radio Browser directory), each with its status (OK, Limited, Blocked, Down), URL and format. OK = https, audio and a CORS header for the app's origin (the player uses `crossOrigin="anonymous"`). Picks: L5, L6, L7, L8, L9, L11, L12, L15. Not picked: L10, L14, L16 (do not fit), L13 (duplicate of L15).
- **Built:** `MusicPlayer.tsx` has 10 stations: FluxFM Chillhop, ILoveRadio Lo-Fi, Epic Lounge Jazzhop, 0nlineradio Lo-Fi, ISEKOI Chill Zone, laut.fm lofi, REYFM #lofi, Hunter.FM Lo-Fi, CLIAMP Lofi Hip Hop, Hotmix Lo-Fi. No CSP change (`media-src` allows `https:`).
- **Open (owner):** the licence for each station in a paid app (before Premium is on sale, item 16); listen to the new stations on a phone.

### 128. Dressed boat card names the national day — S — **✅ Done**

- **Request (2026-10-10):** pitch B for the bunting: the national-day name on the card.
- **Before:** on a bunting day (`germanUnity`, `fiestaNacional`, `canadaDay`, `australiaDay`, `kingsDay`) a double tap on a dressed boat opens the boat card with the row "Dressed: Flag bunting" (item 123). The card does not say which day it is.
- **Spec:** the boat card also has the row "Event: <day>" (the `egg.<kind>` text). The field note is the day's fact (`eggFact.<kind>`), not the boat's fact. No new texts. The badge rule (item 123, `DRESSED_BADGES`) does not change. Christmas lights and papel picado do not change: they keep the boat's fact and have no event row.
- **Built:** `Bunting.day` (`useBunting`), set by `SunTracker` on a bunting day. `CloudLayer` passes it into the boat target (`{ type: 'boat', dressed, day }`). `getSceneInfo` reads the name and the fact from the national-day egg entry.
- **Checked:** `utils.sceneInfo` test: a dressed boat on German Unity Day has the event row and the day's fact; a boat with Christmas lights and a plain boat have no event row and keep the boat's fact. Not checked: a real phone.

### 129. Fireworks afterglow: drifting smoke you can tap — S — **✅ Done**

- **Request (2026-10-10):** the French and US fireworks show for about 12 s, once per night view. After the show, nothing shows the egg, and the sky tap (item 123) no longer opens its card. Lutz's pick from the pitch: "B, afterglow smoke".
- **Spec:** when a national-day show ends (style `fireworks`: `bastilleDay`, `independenceDay`, `guyFawkes`), faint smoke stays in the band where the bursts were. Five soft, blurred puffs, each tinted with one flag colour at 22 % opacity. They drift 0.5 px/s to the right and 0.15 px/s up (calm-motion rule) and fade out over 180 s. While the smoke shows, the sky tap opens the national-day card, so a double tap still collects the badge. Reduced motion: no show, so no smoke (as before, these badges do not count). New Year's own fireworks do not change.
- **Built:** `NationalEggs` takes the show's start and end from `Fireworks` (`onRunningChange`). It reports `onFireworksRunning(true)` from the start of the show until the smoke has faded (the `national-afterglow` CSS animation ends), and `false` on unmount. `SunTracker` and `EventSkyTaps` do not change. The puffs take no taps (`pointer-events-none`). The colours are the existing `--national-*` tokens.
- **Deviation:** the puffs have fixed places in the burst band of `planShow` (x 15–85 %, y 20–45 %), not the real burst points (a `ponytail:` note).
- **Checked:** `NationalEggs` tests: smoke in the flag colours after the show, the sky tap stays on; the tap ends when the smoke has faded; no smoke with reduced motion. Not checked: a real phone.

### 130. Place name: cache, retry, fallback, offline country — S — **✅ Done**

> summary: the place name and country of the user's location survive a failed or rate-limited reverse-geocode call. A cache, one retry, a softer fallback text, and a country from the device time zone. The national days (which need the country) work for a searched place too.

- **Found (2026-10-10, easter-egg lookbook shoot):** some shots showed "Unknown Location". The BigDataCloud call had no check of `response.ok`, so a 429 or 5xx answer parsed as "no place here". There was no cache (one call for each page load and each language change) and no retry. The national days (`nationalDays.ts`) use the country code of the same call, so a failed call also stopped all national eggs. A searched place had no country code.
- **Decision (Lutz, 2026-10-10):** A cache, B check and retry, C softer fallback text, D offline country. Build and merge.
- **Spec and built:**
  - **A, cache:** `src/utils/placeName.ts` keeps the last answer (`{ name, countryCode }`) in `localStorage` (`place-name`), keyed on the location rounded to 2 decimals (~1 km, the value that goes to BigDataCloud). `InfoPanel` shows the cached answer at once. It calls again only when the entry is older than 24 h or in another language. One entry only (the last place): a user who moves gets one call for each new place.
  - **B, check and retry:** `fetchPlace` treats a non-ok answer as a failure and tries once more after 2 s. When both calls fail, `InfoPanel` keeps the cached answer (also a stale one) and does not clear the name or the country.
  - **C, fallback text:** with no name, the panel shows "Your location" (`location.unknown`; de "Dein Standort", es "Tu ubicación", it "La tua posizione", fr "Votre position") above the coordinates, not "Unknown Location".
  - **D, offline country:** when both calls fail and nothing is cached, the country comes from the device time zone (`deviceCountry`, `countryFromTimeZone`): a map of the IANA zones of the 9 national-day countries (the main zones for US, CA and AU). Other zones give no country. A searched place keeps Open-Meteo's `country_code` (`geocodeUtils` → `PlaceSearch` → `manualLocation`); `SunTracker` uses it while the searched place is set, because `InfoPanel` makes no call for a searched place.
- **Checked:** `utils.placeName` (cache miss, hit, 24 h and language staleness, broken entries; the name rules; one call with the rounded location; a 429 then a retry after 2 s; a throw when the retry also fails; the zone map), `InfoPanel` (a fresh cache makes no call; a stale cache stays on screen when both calls fail and a new answer replaces it; the device zone's country when both calls fail), `utils.geocodeUtils` and `utils.manualLocation` (the country code round trip), `SunTracker` (a searched place in Germany dresses the boats on 3 Oct with no reverse-geocode call). Not checked: a real phone, and a real 429 from BigDataCloud.
- **Limit:** the time-zone country is the device's, not the shown place's. It is wrong only for typed coordinates far away while the call also fails (a `ponytail:` note in `deviceCountry`).

### 131. Satellites: easier to spot, size from magnitude — S — **✅ Done**

- **Request (2026-10-10):** "ive never seen a satellite in the live app". The free dot was 2 px (smaller than most stars, 1–7 px) and moved 0.1–0.3 % of the width per second (about 0.8 px/s on a phone). Lutz: "make them faster and a little bigger, … make it 6x" and "use the magnitude for satellites size in live tracking mode".
- **Lookbook:** [Satellite Spotting Lookbook](https://claude.ai/artifact/BY8YJCkbQHHUgbmeKEqzoW) (private). Ideas A–H, and the magnitude ladder: a satellite is always a point of light, so its size shows as brightness.
- **Spec (free dots):** 3 px (was 2 px), 0.6–1.8 % of the width per second (6× before; slower than the birds' 2.5, the fastest pass the sailboat's 1.2). The gap between dots does not change.
- **Spec (tracking):** each satellite gets the standard magnitude (at 1000 km) of its size class from `getSatelliteSize` (item 120): ISS −1.8, giant (Hubble, Tiangong) +1, rocket body +2.5, other +4, Starlink/OneWeb +6. The magnitude at the real distance sets the dot size (2.5–7 px: `4.5 − 0.65 × magnitude`), the glow (below magnitude 0) and the opacity (as before). Was: ISS 5 px with a glow, all others 3 px.
- **Built:** `getSatelliteMagnitude(id, name, rangeKm)`, `getSatelliteDotPx`, `getSatelliteGlowPx` in `satelliteUtils`; `SkySatellite.magnitude`; `SatelliteDot.magnitude` replaces `iss` in `Satellites`.
- **Deviation:** one magnitude per size class, not per satellite (a `ponytail:` note; McCants' per-satellite list if a known one looks wrong).
- **Checked:** `satelliteUtils` tests: the classes in brightness order, dot size 2.5–7 px, glow only below 0, the new speed. Not checked: a real phone, a live pass.

### 132. Hidden fullscreen controls take no taps — S — **✅ Done**

- **Feedback (2026-10-10):** "double tap still activates buttons in fullscreen".
- **Cause:** in fullscreen the top-left buttons, the info panel and the music player fade out with `opacity-0` only. They still take taps, and they lie above the scene (z-20 to z-40). A double tap on a fish under a hidden control clicks the control. Also, the first tap on a hidden control woke it (its own `onTouchStart`), and the second tap then clicked it. Item 124 stopped only the wake from a scene hit area.
- **Spec:**
  1. A hidden control takes no taps (`pointer-events-none`); the tap goes to the scene below.
  2. After a wake, a control takes taps again only after `TAP_READY_MS` (`DOUBLE_TAP_MS` + 50 ms = 400 ms). The second tap of a double tap cannot click a control that the first tap brought back.
  3. The info panel and the music player use the one idle fade of `SunTracker` (`useIdleHide`), not their own. A tap on the open sky or a mouse move shows all controls; keyboard focus on the panel or the player wakes them.
  4. Outside fullscreen nothing changes.
- **Built:** `useIdleHide` returns `isTappable` and the `IdleHide` type, plus `ALWAYS_SHOWN` for use outside `SunTracker`. `SunTracker` passes `controls` to `InfoPanel` and `MusicPlayer` (replaces their `isFullscreen` prop) and `isTappable` to `TopLeftButtons`.
- **Checked:** `useIdleHide` test: not tappable while hidden, tappable `TAP_READY_MS` after a wake. `SunTracker` fullscreen test: the hidden button column has `pointer-events-none`, a wake keeps it for 400 ms. `TopLeftButtons`, `InfoPanel`, `MusicPlayer` tests. Not checked: a real phone.

### 133. A phone tap's mouse event does not wake the controls — S — **✅ Done**

- **Feedback (2026-10-10, after item 132):** "still doesnt work on the phone".
- **Cause:** a phone tap fires `touchstart` and then compatibility mouse events (`mousemove`, `mousedown`, `click`). Item 124 skips scene hit areas only in the `touchstart` listener; the `mousemove` listener in `SunTracker` woke the controls on each tap, also on a double tap on a fish.
- **Spec:** the fullscreen wake listens to `pointermove` with `pointerType === 'mouse'`, not to `mousemove`. A touch wakes only through the `touchstart` listener (with the item 124 skip).
- **Checked:** `SunTracker` fullscreen test: a `mousemove` and a touch `pointermove` on a scene hit area do not wake, a mouse `pointermove` wakes. Phone emulation (Playwright, touch, production build): a double tap on a scene hit area showed the controls on main, and keeps them hidden with the fix; a tap on the open sky shows them. Not checked: a real phone.

### 134. Stars shine through cloud gaps — S — **✅ Done**

- **Feedback (2026-10-10):** "even with a little cloud cover it seems to not show the stars anymore".
- **Cause:** `getStarCloudFactor` (item 52) dimmed every star by the total cloud cover: 30 % cover dimmed all of them to 70 %, 89 % (Open-Meteo for Ravensburg that night) to 11 %, so with the twinkle and the moon factor nearly none were left. The night clouds are dark and hard to see, so the sky looked only a little cloudy but empty.
- **Spec:** clouds hide a share of the stars (they are behind the clouds), and the others shine at full strength through the gaps. Each star gets a random gap value; it shows while the cloud factor is above it and fades out over a 0.15 band below it (no pop when the cover changes). Clear: all 300 stars; 30 %: about 250; 89 %: about one in eight; a closed deck: none. Twilight and the moon factor do not change. The satellites, the aurora and the sky eggs keep the old factor.
- **Built:** `getStarGapShow` in `weatherEffectsUtils`; `NightStars` stars have a `gap`.
- **Checked:** `weatherEffectsUtils` and `NightStars` tests (star count at 30 % and 89 %); screenshots of the built app at 0/30/60/89 %. Not checked: a real phone.

### 135. Satellites shine through cloud gaps — S — **✅ Done**

- **Request (2026-10-11):** "does this also affect planes and sattelites?", then "build option 1". The satellite layer still dimmed by the total cover (89 % → 11 % opacity), and the free dots came only in clear or mainly clear weather.
- **Spec:** as the stars (item 134): clouds hide a share of the satellites, the others shine at full strength through the gaps (`getStarGapShow`). A tracked satellite's gap comes from its NORAD id, so it stays behind its cloud or in its gap. A free dot gets a random gap; a dot behind the clouds does not come, and one on its way fades with the cover. The free dots now also come in partly cloudy and overcast weather (not in rain, snow, fog or storm); the cover decides how many get through. A hidden tracked satellite takes no tap. Planes do not change (Lutz: option 2 not built).
- **Built:** `Satellites` (no layer opacity; a gap per dot), `isSatelliteWeather`.
- **Checked:** `Satellites` and `satelliteUtils` tests. Not checked: a real phone.

### 136. A single tap on the empty sky hides or shows the controls — S — [SUN-CHASER-1B](https://ainabler.sentry.io/issues/SUN-CHASER-1B) — **✅ Done**

- **Feedback (2026-10-11 15:31 CEST, Ravensburg):** "Single tap on empty screen should hide the controls. Single tap on where the controls are hidden should unhide the controls".
- **Now:** `useIdleHide(isFullscreen)` (`src/hooks/useIdleHide.ts`, item 89) hides the controls only in browser fullscreen and only by a timer: 3 s after the user enters fullscreen (`ENTER_HIDE_MS`), 10 s after a wake (`WAKE_HIDE_MS`). In fullscreen, a `touchstart` on the document calls `wakeCursor` (`SunTracker`). A touch inside `[data-scene-hit]` does not wake (item 124), and a mouse `pointermove` wakes (item 133). So a tap on the empty sky can only show the controls, and no tap hides them. A hidden control takes no taps. After a wake, a control takes taps only after `TAP_READY_MS` (400 ms, item 132). Outside fullscreen nothing hides: `wake` returns at once and `isVisible` stays true. In the installed Play app (display-mode fullscreen) `isFullscreen` is false. iPhone Safari has no Fullscreen API. So in both, the controls never hide. The controls are `TopLeftButtons`, `InfoPanel`, `MusicPlayer` and the compass labels in `SunVisualization` (`showCursor`).
- **Spec:**
  1. `useIdleHide` gets `toggle()`. When the controls show, `toggle()` hides them at once (`isVisible` and `isTappable` false) and clears the timer. When they are hidden, it does the same as `wake()`: the controls show, take taps after `TAP_READY_MS` and hide after `WAKE_HIDE_MS`.
  2. A tap is a `click` on the document (a swipe or a pinch fires no click). A tap toggles only when its target is the empty scene. It does not toggle when its target is inside `[data-scene-hit]`, `[data-share-hide]` (controls, info card, install prompt), `button`, `a`, `input` or `[role="dialog"]`.
  3. A second sky tap within `DOUBLE_TAP_MS` after a toggle does nothing, so a double tap on the sky does not flicker. A double tap on a scene object never toggles (rule 2), so a single tap needs no 350 ms wait.
  4. Remove the `touchstart` wake of item 124. The sky `click` shows the controls. The area of a hidden control is sky (`pointer-events-none`). The mouse `pointermove` wake stays.
  5. A tap that closes an open info card (the outside `pointerdown` in `SceneInfoCard`) only closes the card. It does not toggle.
  6. The toggle is active in browser fullscreen and in the installed app (`isFullscreen || isInstalledApp()`).
- **Check:** `hooks.useIdleHide`: `toggle` hides at once with no taps, then shows, and the controls take taps after 400 ms. `SunTracker` fullscreen: a sky tap hides the controls; the next sky tap shows them; two sky taps 200 ms apart toggle once; a tap on a fish hit area or on a control does not toggle; a tap that closes a card does not toggle. Browser at 390 × 844 with touch emulation.
- **Open:** (a) In the normal browser view: toggle too, or always show the controls? (b) Is the installed app in scope (rule 6)? (c) After a tap hides the controls, do they stay hidden until the next tap? After a tap shows them, does the 10 s idle timer still hide them? (d) Toggle at once (spec), or wait `DOUBLE_TAP_MS` first?
- **Decision (Lutz, 2026-10-11):** Fullscreen and the installed app (rule 6). In the normal browser view the controls always show. A tap that hides the controls keeps them hidden until the next tap. A tap that shows them starts the 10 s idle timer (`WAKE_HIDE_MS`). The toggle acts at once (rule 3).
- **Built:** `useIdleHide` has `toggle()` (rule 1; a hide clears the timer, so the controls stay hidden until the next tap) and a second argument `enterHideMs`. `SunTracker` makes the idle fade active for `isFullscreen || isInstalledApp()`. In browser fullscreen `enterHideMs` is `ENTER_HIDE_MS` (item 89 as before); in the installed app it is `null`: the controls show at start and do not hide by themselves until the first sky tap (the Decision says nothing about a hide at start, and a 3 s hide would run during the loading screen). A document `click` toggles when its target is inside the scene root (`data-share-root`) and not inside `NOT_SKY` (`[data-scene-hit]`, `[data-share-hide]`, `button`, `a`, `input`, `[role="dialog"]`); a second sky tap within `DOUBLE_TAP_MS` after a toggle does nothing. A window capture `pointerdown` notes whether an info card is open, so the tap that closes it (`SceneInfoCard`'s outside `pointerdown`) does not toggle. The `touchstart` wake of item 124 is gone; the mouse `pointermove` wake of item 133 stays. `TopLeftButtons` (no `isFullscreen` prop now) and the compass labels in `SunVisualization` follow `showCursor` and `isTappable` only, as `InfoPanel` and `MusicPlayer` do since item 132, so they also hide in the installed app.
- **Checked:** `hooks.useIdleHide`: `toggle` hides at once with no taps and stays hidden for 60 s; a second `toggle` shows, takes taps after 400 ms and hides after 10 s; a toggle stops the timer of a wake; no effect while not active; with `enterHideMs` `null` the controls stay until the first toggle. `SunTracker`: in fullscreen a sky tap hides for good, the next shows for 10 s, a mouse `pointermove` still wakes; two sky taps 200 ms apart toggle once; a double tap on a `data-scene-hit` element, a tap on a control and a tap outside the scene do not toggle; the tap that closes a sun card only closes it; in the installed app the controls show for 60 s, a sky tap hides them for good, the next shows them for 10 s; in a browser tab a sky tap does nothing. The item 89 test now wakes with a sky tap (a `touchstart` alone does not). `TopLeftButtons` and `SunVisualization` tests follow `showCursor`. Phone emulation (Playwright, 390 × 844, touch, production build, reverse geocoder stubbed): a browser tab keeps the controls; in fullscreen a sky tap hides all controls (still hidden 12 s later), the next shows them and they take taps after 400 ms, a sky double tap toggles once, a double tap on a cloud opens its card and the controls stay hidden, the sky tap that closes the card keeps them hidden; the installed app (`display-mode: fullscreen` stubbed) shows them 6.5 s after load, a sky tap hides them (still hidden 12 s later), the next shows them and they hide 10 s later. Typecheck, lint, build and all 1703 tests pass. Not checked: a real phone, the Play app and an iPhone home-screen app; a mouse in a desktop installed app.

### 137. Place name: a better name rule, no long empty cache, a status in Sentry — S — [SUN-CHASER-1C](https://ainabler.sentry.io/issues/SUN-CHASER-1C) — **✅ Done**

- **Feedback (2026-10-11 15:37 CEST, Ravensburg):** "Why does city name not resolve?".
- **Now:**
  - `InfoPanel` calls `fetchPlace` (`src/utils/placeName.ts`, item 130). It calls `api.bigdatacloud.net/data/reverse-geocode-client` with the location rounded to 2 decimals. On a non-ok answer it tries once more after 2 s. When both calls fail and nothing is cached, the panel shows "Your location" (`location.unknown`). The failure goes only to `console.error`, so Sentry has no data. The feedback event has no linked error and no breadcrumbs.
  - The CSP is correct: `connect-src` in `public/_headers` and `vercel.json` has `https://api.bigdatacloud.net` and `https://api-bdc.io`.
  - A denied GPS is not the cause: it sets New York (`SunTracker`), and New York resolves.
  - **Possible cause 1, IP ban:** BigDataCloud bans an IP that calls the `-client` endpoint from outside a browser. Seen on 2026-10-11 ~22:50 CEST (after the feedback): a `curl` from the spec research got HTTP 400 with body `status: 402 … this endpoint does not support server-side operations … your ip address … is now banned`. The ban covers all calls from that IP, also the browser's, and a retry cannot help. Not confirmed for the feedback at 15:37: an earlier headless run (lookbook shoots) from the same network could have caused a ban, but there is no proof.
  - **Cause 2 (code):** `placeOf` gives `name: null` when `countryName` is empty, also when `city` or `locality` has a value.
  - **Cause 3 (code):** `savePlace` also saves an answer with `name: null` and a country code. `loadPlace` returns it as fresh for 24 h, so the panel shows "Your location" with no new call for 24 h.
  - Possible, not checked: a content blocker blocks `api.bigdatacloud.net`.
- **Spec:**
  1. Name rule: town = `city` → `locality` → `principalSubdivision`. The name is `"<town>, <country>"`, the town alone, or the country alone.
  2. An answer without a town has a max age of 1 h in the cache, not 24 h.
  3. `fetchOnce` throws a `PlaceError` with `httpStatus` and the body's `status` (for example 400/402).
  4. Diagnostic: `InfoPanel` sets a Sentry tag `place` = `ok` | `country-only` | `cached` | `http-<status>[-<bodyStatus>]` | `network`, so a feedback event carries it. Once per session, when both calls fail, send `Sentry.captureMessage('place-name failed', 'warning')` with the same tag. Send no coordinates (`scrubLocation` stays).
  5. Add a CLAUDE.md gotcha: never call `reverse-geocode-client` from curl, scripts or headless runs (the IP gets banned). Tests mock `fetch`. Lookbook shots use a cached `place-name` entry or stubs.
- **Check:** `utils.placeName`: a city with no country; the `principalSubdivision` fallback; an answer without a town is stale after 1 h; `PlaceError` carries 400/402. `InfoPanel`: the tag value for each result; `captureMessage` only once per session.
- **Open:** (a) Lutz: e-mail support@bigdatacloud.com to lift the ban for the home IPv6 network? (b) Add a second provider when BigDataCloud fails (Photon `photon.komoot.io/reverse` or Nominatim; each is a new CSP host and needs attribution)?
- **Decision (Lutz, 2026-10-11):** Spec 1–5, plus a second provider: when both BigDataCloud calls fail, ask Photon (`https://photon.komoot.io/reverse`, OSM data). Add the host to the CSP (`public/_headers` and `vercel.json`). Show "© OpenStreetMap contributors" with a name that comes from Photon. Lutz e-mails BigDataCloud about the ban.
- **Built:**
  - `src/utils/placeName.ts`: `PlaceInfo` gets `hasTown` and `source` (`bigdatacloud` | `photon`); the cache keeps both. The name rule (spec 1) is in `placeOf` and `photonPlaceOf`. An answer without a town is fresh for 1 h (`PLACE_NO_TOWN_MAX_AGE_MS`, spec 2); an item 130 entry with a name counts as a town. A non-ok answer throws `PlaceError` (`httpStatus`, `bodyStatus`, spec 3).
  - Photon: `fetchPhotonPlace` asks `photon.komoot.io/reverse` once, with the location rounded to 2 decimals. Photon supports only `de`, `en` and `fr` (its error answer for `lang=it` lists `default, de, en, fr`), so `it` and `es` get the local names. Town = `city` → the `name` of a place object (`osm_key` `place`) → `state`. `InfoPanel` shows Photon's answer unless it is empty, or it has no town while the cache has one. A name from Photon shows "© OpenStreetMap contributors" (a link to openstreetmap.org/copyright, key `location.osmAttribution` in 5 languages) on the line of the coordinates, so the collapsed panel is not higher (98 px at 390 × 844).
  - Sentry (spec 4): `reportPlace` sets tag `place` (`ok`, `country-only`, `cached`, `http-<status>[-<body status>]`, `network`, and `empty` for an answer with no town and no country) and tag `place-photon` (the same values, only when Photon was asked). Once per session, when both BigDataCloud calls fail, `captureMessage('place-name failed', 'warning')` after the tags. No coordinates in the tags or the message.
  - CSP: `https://photon.komoot.io` in `connect-src` (`public/_headers`, `vercel.json`). The privacy page and the README list Photon. CLAUDE.md has the gotcha (spec 5) and Photon in the `InfoPanel` line.
- **Checked:** `utils.placeName` (the name rule: a city with no country, the locality and `principalSubdivision` fallbacks, the country alone; an answer without a town is stale after 1 h; an item 130 entry; the source in the cache; `PlaceError` with 400/402 and with no JSON body; Photon's answer shape from a real call, a place object, a building's name not used, no feature; the Photon URL with `lang` for en/fr and none for it/es; no Photon retry; the tag values; the warning once per session). `InfoPanel` (tags `ok`, `country-only`, `cached`, `http-429`; Photon after two failed calls, its name, the link and the cache; a cached town kept over Photon's country alone; Photon as the third call in the item 130 tests). Built app (`vite preview`, Playwright at 390 × 844, the production CSP added to the page, BigDataCloud routed to a 400 with body status 402, Photon routed to a stub with the real answer shape): two BigDataCloud calls, then one Photon call with `lang=en`; "Ravensburg, Germany" with the attribution link; no CSP error; after a reload the cached name keeps the link, with no call. Not checked: a real phone, a live Photon call from the app (the browser check used a stub), a real BigDataCloud ban, a tag in a real Sentry event.

### 138. Collection: one card per tap, no base sky badges — M — [SUN-CHASER-1D](https://ainabler.sentry.io/issues/SUN-CHASER-1D) — **✅ Done**

- **Feedback (2026-10-11 15:38 CEST, Ravensburg):** "No achievement just for sun moon terrain no double achievements".
- **Now:**
  - `BADGES` in `src/utils/collection.ts` has 129 badges (`tests/utils.collection.test.ts`).
  - Sun: base `sun` + 5 `SUN_STATES` (dawn, morning, midday, afternoon, evening). At night and in the twilights the sun gives no state.
  - Moon: base `moon` + 8 `MOON_STATES`.
  - Terrain: base `terrain` + 5 `TERRAIN_BANDS`.
  - One double tap collects 2 badges: `SunTracker.handleSceneInfo` collects `badgeForTarget` and then `stateBadgeForTarget`, so `BadgeUnlocked` shows 2 cards. The satellite does the same.
  - There is no badge for a full row and no combo badge.
- **Spec:**
  1. Completion badges (group `sky`, the last cell of each row in `CollectionView`):
     - `complete:sun` "Full day": all 5 sun states.
     - `complete:moon` "Lunar cycle": all 8 phases.
     - `complete:terrain` "Summit collector": all 5 bands.
     - They are ultra rare. `collect(id)` checks the row after each state badge and shows the completion card after the state card.
  2. Old saves: at start, add the completion badge without a card when its row is full already. Its first-seen date is the latest state date.
  3. Combo badges (double tap, not in a time preview):
     - `combo:sunMoon` "Sun and moon": tap the sun or the moon while both discs show.
     - `combo:sunRidge` "Sun on the ridge": tap the sun while its altitude is 0–1° above `horizonAngleAt(profile, azimuth)`.
     - `combo:moonRidge` "Moon on the ridge": the same for the moon.
     - `StateBadgeContext` gets the sun and moon altitude, azimuth and shown flags.
  4. Art: the row art with a gold ring (completion), and two small icons side by side (combo).
  5. New keys `badge.completeSun`, `badge.completeMoon`, `badge.completeTerrain`, `badge.comboSunMoon`, `badge.comboSunRidge`, `badge.comboMoonRidge` in en/de/es/it/fr. Total 129 + 6 = 135 (more when item 140 or 146 is built first).
- **Check:** `utils.collection`: 135 ids; completion only when all states are there; an old full save gets it at load; the combo rules at 0 / 1 / 1.1° above the ridge; none in a time preview. `SunTracker`: the 5th sun state shows 2 cards (state, then "Full day"). `CollectionView`: the completion cell at the end of the row. `tests/i18n.test.ts`.
- **Open:** Which reading is correct? A: "there is no badge for a full sun/moon/terrain row, and no combos" (this spec). B: "no badge just for tapping the sun/moon/terrain; no two badges for one tap". B removes the base badges `sun`, `moon`, `terrain` (and `satellite`) from the grid and the count, and keeps them in storage, so one tap gives one card. B can ship with A.
- **Decision (Lutz, 2026-10-11):** Reading B: one card per tap. Remove the base badges `sun`, `moon`, `terrain` and `satellite` from `BADGES`, the grid and the count. Old saves keep them in storage, but they do not show and do not count. A double tap collects only the state badge. When a target has no state at that time (the sun in twilight), the tap collects nothing. The completion and combo badges (spec 1–5) are not built.
- **Built:** `BADGES` (`src/utils/collection.ts`) has no `sun`, `moon`, `terrain` and `satellite` badge: 125 badges. The sky group shows the rainbow, the plane row (`plane` and its 5 hauls), then one row each of states only: 5 satellite sizes, 5 sun states, 8 moon phases, 5 terrain bands. `badgeForTarget` gives null for the sun, the moon, the terrain and the satellite. `SunTracker.handleSceneInfo` collects `badgeForTarget(target) ?? stateBadgeForTarget(target, ctx)`, so a double tap gives one badge and one card. No state gives nothing: the sun at night, in the twilights and in a time preview; the moon in a time preview; the terrain without ridge data. The satellite always has a size. Old saves: the new type `RetiredBadgeId` lists the 4 old ids. `loadCollection` keeps them, so the next save writes them back. They are not in `BADGES`, so the grid, the "Badge unlocked" card, the tier outlines and `countCollected` (both "n / 125" counters) do not see them. `CollectionView`: no icons for the 4 old ids. No i18n key changes: `scene.sun`, `scene.moon`, `scene.terrain`, `scene.satellite` are still the card titles and button labels. The card text has no badge text, so it does not change. Not changed: a live-plane tap still collects `plane` on the tap, and its haul badge comes later when the route arrives (not in the Decision). A sun or moon tap during its astronomy event can still also collect that egg badge (item 123).
- **Checked:** `utils.collection` (125 ids, none of the 4 old ids; `badgeForTarget` gives null for them; each target gives exactly one of kind badge or state badge; the twilight sun, the terrain without ridge data and the moon in a time preview give none; an old save keeps the 4 ids through load and save, but `countCollected` does not count them). `CollectionView` (state rows with no base cell; an old save with the 4 ids shows and counts 3, not 7). `BadgeUnlocked` (a state badge without a tier). `SunTracker` (a midday sun tap collects only `sun:midday` with one card "1 / 125"; a moon and a satellite tap collect one state badge each; a terrain tap without ridge data and a twilight sun tap collect nothing). Typecheck, lint, build and all 1696 tests pass. Built app (`vite preview`, Playwright 390 × 844, Ravensburg, clock 2026-10-25 20:30 CEST, an old save with `sun`, `moon`, `terrain`, `satellite`, `fish:perch`): a double tap on the moon shows one card "Full Moon · 2 / 125", and no second card follows; a double tap on the terrain shows one card "Low mountains, Frequent · 3 / 125"; the collection view has 125 cells, "2 / 125", no base cells, and the sky rows are as above; the 4 old ids stay in storage. Not checked in the browser: a sun tap and a satellite tap (unit tests only), and a real phone.
- **Follow-up (Lutz, 2026-10-14):** Two cases still gave 2 cards for one tap: a tap on a thing that carries an event egg (sun: solar eclipse, green flash, April Fools; moon: lunar eclipse, supermoon, blue moon; a dressed boat: Christmas or national-day lights; a cloud: Holi) collected its kind or state badge and the egg badge; the Nowruz card collected `egg:nowruz` and `egg:equinox`. Decision: B, the event badge wins. And Nowruz and the equinox show at different times of the March equinox day. The live plane's `plane` + haul badge stays (once per user).
- **Built (follow-up):** `SunTracker.handleSceneTap` takes the first egg badge of the target that is shown and not yet collected, and collects only that badge. With no new egg badge, the tap collects the kind or state badge as before. A second new egg badge on the same target (a supermoon in a lunar eclipse) comes on a later tap. `getCalendarEvent` gives `equinox` on the March equinox day until 12:00 local time and `nowruz` from 12:00 (`getEventDaysPerYear` asks at noon, so the Nowruz card's chance is unchanged). Equinox time: the "Equinox" pill, the sun-path fan and `egg:equinox`. Nowruz time: a "Nowruz" pill (`egg.nowruz`, double tap opens the Nowruz card), the blossoms and `egg:nowruz`; no fan. `NOWRUZ_ALSO` and the Nowruz card's second badge are removed.
- **Checked (follow-up):** `utils.calendarEvents` (March equinox 00:00 and 11:59 `equinox`, 12:00 and 23:59 `nowruz`; the fan on the March equinox, none for Nowruz). `CalendarEggs` (the Nowruz pill text and its Nowruz card). `utils.collection` (the Nowruz card gives only `egg:nowruz`). `SunTracker` (Christmas: the first double tap on a lit boat collects only `egg:christmas` with one card, the next one the boat badge; March equinox 11:00 collects `egg:equinox`, 13:00 `egg:nowruz` with one card). Typecheck, lint, build and all 1884 tests pass. Built app (`vite preview`, Playwright 390 × 844, Ravensburg, 2027-03-20, bigdatacloud stubbed, other hosts blocked): 10:30 shows the "Equinox · day and night are equal" pill and the fan, no blossoms; 14:30 and 19:30 show the "Nowruz" pill and the blossom arc, no fan. The blossom arc (`BLOSSOMS` in `FestivalEggs.tsx`) is pulled in to the short Nowruz pill: the ends 6 px beside it, the others under it, blossoms 28–32 px; checked at 14:30 and 19:30. Not checked: the event-badge tap in the browser (unit tests only), and a real phone.

### 139. Dim the radio controls at night — S — [SUN-CHASER-1E](https://ainabler.sentry.io/issues/SUN-CHASER-1E) — **✅ Done**

- **Feedback (2026-10-11 15:39 CEST, Ravensburg):** "Audio controls too bright at night".
- **Now:** `MusicPlayer` (`src/components/MusicPlayer.tsx`) is a `GLASS_SURFACE` pill (`--panel-background` at 45 %, `src/utils/glassChrome.ts`). It contains a shadcn `Switch` and a shadcn `Slider` in their light-theme defaults (the app has no `.dark` class). Switch: white thumb (`bg-background`, `shadow-lg`), unchecked track `bg-input` (`214.3 31.8% 91.4%`, almost white), checked track `bg-primary` (dark navy). Slider: track `bg-secondary` (`210 40% 96.1%`, almost white), range `bg-primary`, a white 20 px thumb with `border-primary`. The icons are `text-white`, the station name and Next are `text-white/80`, and "rain off" is `text-white/50`. No control dims by time of day: `MusicPlayer` and `TopLeftButtons` get no `timeOfDay`. `InfoPanel` uses `timeOfDay` only to collapse sections. Its two `Switch`es (live planes, satellites) are as bright as the radio switch. `isDarkSky(timeOfDay)` (`src/utils/festivalEvents.ts`: night, astronomical and nautical twilight) exists.
- **Spec:**
  1. `SunTracker` passes `night={isDarkSky(timeOfDay)}` to `MusicPlayer`.
  2. Night look, set from `MusicPlayer` through `className` (do not edit `src/components/ui/`). Switch root: `data-[state=unchecked]:bg-white/15 data-[state=checked]:bg-white/35`; thumb through `*:bg-white/60 *:shadow-none`. Slider root: `[&>span:first-child]:bg-white/15` (track), `[&_span_span]:bg-white/40` (range), `[&_[role=slider]]:bg-white/60 [&_[role=slider]]:border-transparent [&_[role=slider]]:h-4 [&_[role=slider]]:w-4`. Icons `text-white/60`, station name and Next `text-white/50`, "rain off" `text-white/35`.
  3. The glass pill does not change. The focus ring stays `ring-white/70` (accessibility). Day and civil twilight keep the current look.
  4. The look changes through `transition-colors`, so it does not jump at the twilight edge.
- **Check:** `MusicPlayer.test.tsx`: with `night`, the switch root and the slider have the night classes and the icons have `text-white/60`; without `night`, there are no night classes. `SunTracker`: a night `timeOfDay` passes `night`. Screenshot at night, 390 × 844, radio on and off.
- **Open:** (a) Use the dim look at all times (simpler, no prop)? (b) Use the same night tone for the `InfoPanel` switches and the `TopLeftButtons` icons? (c) Include civil twilight?
- **Decision (Lutz, 2026-10-11):** Lutz: "only the two sliders in the audio controls are very bright". First take a screenshot of the player at night and find the two bright parts. Dim only these two (spec 2 for them), at night only (spec 1, 4). Do not change the icons, the text or the other controls.
- **Built:** The night screenshot (390 × 844, 23:30 in Ravensburg) shows the two bright parts: the play `Switch` (white thumb; unchecked track almost white) and the volume `Slider` (white track and white 20 px thumb). `SunTracker` passes `night={isDarkSky}` to `MusicPlayer`. At night, `MusicPlayer` gives them the spec 2 classes through `className`: switch track `bg-white/15` (off) and `bg-white/35` (on), thumb `bg-white/60` with no shadow; slider track `bg-white/15`, range `bg-white/40`, thumb `bg-white/60`, no border, 16 px. The range selector is `[&>span:first-child>span]` (spec: `[&_span_span]`, which also matches the thumb). The colour transitions are always on (switch thumb: `translate`, `background-color`, `box-shadow`; slider track and range: `transition-colors`), so the colours fade in both directions at the twilight edge. The thumb size (20 → 16 px) does not fade. The icons, the text, the glass pill and the focus rings do not change. Day and civil twilight keep the current look.
- **Checked:** `MusicPlayer` tests (night classes and transitions; no night classes by day; focus rings, icons and text unchanged) and `SunTracker` tests (a night time dims the switch and the slider, midday does not). Screenshots of the built app before and after, at night and at midday, radio on and off: by day the computed colours are the same as before; at night both controls are dim and clearly visible, and the keyboard focus ring shows on both. Not checked: a real phone; the fade at the real twilight edge (only the transition classes); the rain button (it is a toggle button, not a slider, and does not change).

### 140. Midwinter: the winter solstice gets its own badge, card and longest-night pill — M — [SUN-CHASER-1F](https://ainabler.sentry.io/issues/SUN-CHASER-1F) — **✅ Done**

- **Feedback (2026-10-11 15:51 CEST, Ravensburg):** "It's there a mid winter Easter egg same as mid summer when the sun is at the lowest points of the year?".
- **Now:**
  - The winter solstice is `solstice-shortest` (`getSeasonEvent` in `src/utils/calendarEvents.ts`). It applies all day, on the local day of the December solstice (north) or the June solstice (south).
  - It shows the sun-path fan (`getSolsticeTraceDates`, `SunVisualization`) and the pill "Solstice · the shortest day of the year" (`egg.seasonShortest`, `CalendarEggs`, horizon + 90 px). A double tap opens the `solstice` card, which has no chance text.
  - Its badge is `egg:solstice`, the same badge as the longest day (`badgeForCalendarEvent`). So the winter day gives nothing new.
  - Midsummer (`festivalEvents.ts`, `isMidsummer`): the Friday of Jun 19–25 and the Saturday after it. 3 glowing bonfires (`BONFIRES` 18/52/83 %) on the far shore in the evening, the twilights and the night (`isLowSun`). They take taps and have their own card (`eggFact.midsummer`) and badge (`egg:midsummer`).
  - `isMidsummer` has no latitude check, so the bonfires also show in June in the south, where it is midwinter.
  - There is no midwinter, Yule, Yalda or Dongzhi code.
- **Spec:**
  1. On the `solstice-shortest` day, from civil twilight after sunset until 23:59: 3 small lanterns with a warm candle glow on the far shore at 12/47/78 % of the width (not on the bonfire places). They use `festival-glow`, 6–8 s alternate, and are static with reduced motion.
  2. After sunset the pill text changes to "Solstice · the longest night of the year" (`egg.seasonLongestNight`).
  3. Badges: `solstice-longest` keeps `egg:solstice`, renamed "Summer solstice". `solstice-shortest` gives the new `egg:midwinter` "Midwinter" all day (the pill shows all day). This is safe: the collection started on 2026-10-09, after the last solstice, so no save has `egg:solstice`.
  4. Card `midwinter` (Special event, "1 day a year" from `getEventDaysPerYear`). The fact covers Yule, Yalda night and Dongzhi. A double tap on a lantern or on the pill opens it.
  5. Midsummer only at latitude ≥ 0 (`getCalendarEvent` passes the latitude).
  6. Add the test link `?egg=midwinter`. It pauses the collection.
  7. Keys in en/de/es/it/fr. +1 badge.
- **Check:** `utils.calendarEvents`: 2026-12-21 in Berlin gives `solstice-shortest`; Sydney 2027-06-21 too. `utils.collection`: shortest → `egg:midwinter`, longest → `egg:solstice`. `utils.festivalEvents`: no Midsummer at −33°. `CalendarEggs`: lanterns only after sunset; the pill text changes; a double tap opens the card; static with reduced motion. `tests/i18n.test.ts`.
- **Open:** (a) Lanterns, a Yule log or a candle wreath? (b) Show it also on the evening before the solstice day (2 days, as Midsummer)?
- **Decision (Lutz, 2026-10-11):** No lanterns. On the winter solstice day, show the sun-path lines as on the summer solstice and the equinoxes. First check in the built app (`?date=` on 2026-12-21) whether `getSolsticeTraceDates` draws them on `solstice-shortest` now; if not, fix it. Keep spec 2 (pill text after sunset), 3 (own badge `egg:midwinter`), 4 (card, opened from the pill), 5 (Midsummer only north), 6 and 7. Solstice day only.
- **Built:**
  - Sun-path lines: no change needed. The built app already draws the fan on `solstice-shortest` as on the June solstice and the equinoxes: the December path bold and gold, the June and equinox paths dashed, and the 3 day-length pills, by day and after sunset. There is no `?date=` parameter; the check used a fake clock.
  - Pill (spec 2): `isLongestNight` in `calendarEvents.ts` is true on the winter solstice day from the flat sunset to local midnight (the `isSantaTime` rules; at polar night from the 18:00 fallback sunset). `SunTracker` passes it through `SunVisualization` to `CalendarEggs`, which then shows "Solstice · the longest night of the year" (`egg.seasonLongestNight`).
  - Badges (spec 3): `solstice-longest` keeps `egg:solstice`, now named "Summer solstice" (the `egg.solstice` text, also the `solstice` card title). `solstice-shortest` gives the new `egg:midwinter` "Midwinter" all day (a snowflake in the collection). 129 → 130 badges.
  - Card (spec 4): `midwinter` in `sceneInfo.ts`, Special event, "1 day a year" (`getEventDaysPerYear('solstice-shortest')`), with a field note on Yule, Yalda night and Dongzhi (`eggFact.midwinter`). A double tap on the winter solstice pill opens it and collects the badge.
  - Midsummer (spec 5): `getFestivalSpan(date, country, latitude)` gives Midsummer only at latitude ≥ 0; `getCalendarEvent` passes the latitude. `?egg=midsummer` still forces it anywhere.
  - Test link (spec 6): `?egg=midwinter` (`isMidwinterForced`) forces `solstice-shortest`. It pauses the collection (`isCollectionPaused`) and gives no calendar badge. On a day that is not a solstice, no fan path is today's, so all 3 paths are dashed.
  - Keys (spec 7): `egg.midwinter`, `egg.seasonLongestNight`, `eggFact.midwinter` in en/de/es/it/fr. The badge is "Mittwinter" in German; Spanish, Italian and French use "winter solstice" ("Solsticio de invierno", "Solstizio d'inverno", "Solstice d'hiver"), as they have no common word for midwinter.
- **Checked:**
  - Tests: `utils.calendarEvents` (2026-12-21 in Berlin and 2027-06-21 in Sydney give `solstice-shortest`; `isLongestNight` at sunset, until midnight, with the day before's sunset, at polar day and at polar night; `isMidwinterForced`), `utils.festivalEvents` (no Midsummer at −33.9°), `utils.collection` (130 badges; shortest → `egg:midwinter`, longest → `egg:solstice`; the `midwinter` card → `egg:midwinter`; `?egg=midwinter` pauses), `utils.sceneInfo` (the `midwinter` card, 1 day a year; "Summer solstice"), `CalendarEggs` (the pill text after sunset, only on the winter solstice, in German, with reduced motion; a double tap opens `midwinter`), `SunVisualization` (the December fan at 12:00 and 20:00, the pill text), `SunTracker` (the badge on a double tap, `longestNight` after sunset, `?egg=midwinter` forces the day and collects nothing), `i18n`.
  - Built app (`vite preview`, headless Chromium 390 × 844, fake clock, Ravensburg): 2026-12-21 at 12:00 and 18:30 (also with reduced motion), 2026-06-21 at 13:30, 2026-09-23 at 13:00 and 2027-03-20 at 12:30 all draw the 3 paths with today's path bold and gold, and the 3 day-length pills. 2026-03-20 draws no fan, because Eid al-Fitr wins that day (item 118). A double tap on the pill opens "Midwinter" (December) or "Summer solstice" (June); in December the toast "Badge unlocked: Midwinter · 1 / 130" shows. Sydney (AEST) 2026-06-21 at 12:00 and 19:00: the June path is gold, the pill changes after sunset, the `midwinter` card opens. Sydney 2026-06-19 at 20:00: no bonfires; Ravensburg 2026-06-19 at 22:00: 3 bonfires. `?egg=midwinter` on 2026-10-11 at 12:00 and 20:00: the pill, the card, no badge toast.
  - Not checked: a real phone; the polar night (the pill from 18:00) in the browser.

### 141. Terrain: tree silhouettes below the treeline — M — [SUN-CHASER-1G](https://ainabler.sentry.io/issues/SUN-CHASER-1G) — **✅ Done**

- **Feedback (2026-10-11 16:02 CEST, Ravensburg):** "Can you show vegetation on the terrain?".
- **Now:**
  - `terrainTiles.ts` loads Terrarium elevation tiles (z12 up to 5 km, z10 up to 50 km).
  - `computeHorizonProfile` (`horizonUtils.ts`) gives `angles`, `ridgeDistances` and `ridgeHeights` per azimuth.
  - `SunVisualization` builds `terrainFillPath` (`buildTerrainSegments` → `buildTerrainFillPath`, `useMemo`). The scale is 1 sample per degree: 360 over the width in static mode, 91 in compass mode (`COMPASS_FOV_DEG = 90`).
  - The path fills with one ridge colour per time of day (`--scene-ridge-*`). `SeaCanvas` mirrors it (`ridgePath`).
  - The app has no land-cover data.
- **Spec (heuristic, recommended):**
  1. Treeline in m by |latitude|, linear between these points: ≤ 30° 3500, 40° 2500, 47° 1900, 55° 1300, 60° 1000, 65° 600, 70° 300, ≥ 72° 0. The density goes to 0 over the last 200 m below the treeline.
  2. Trees only where the angle is > 0 (not the flat sea line), the ridge height is known, and the ridge distance is ≤ 8 km.
  3. Tree height 20 m. Screen height = `atan(20 / d)` × px per degree (~9 px/° on an 844 px screen). Shown only from 1.5 px, at most 14 px.
  4. Forest patches: seeded value noise over the azimuth (seed = rounded location), so about 55 % of the ridge has forest. The same place always looks the same.
  5. Shapes: conifer (triangle) and broadleaf (round crown). Conifer share: 30 % below 600 m, 60 % at 600–1200 m, 90 % above 1200 m.
  6. Season: in winter (Dec–Feb north, Jun–Aug south), broadleaves are bare (thin crown).
  7. Colour: the ridge colour. By day only, a tint of up to 8 %: green from spring to summer, amber in autumn (Sep 20–Nov 10 north), none in winter.
  8. Add the tree shapes to the same `d` as `terrainFillPath`. Then taps, the keyboard and the `SeaCanvas` mirror work with no change.
  9. Performance: in the same `useMemo` (profile, size, heading, month). At most 1 tree per sample in static mode and 3 in compass mode (≤ 360 shapes, ~12 kB path). No animation, no work per frame.
- **Data options (not recommended now):** ESA WorldCover 10 m COGs (S3; needs geotiff.js ~100 kB, range reads, a new CSP host, CORS not checked). Copernicus 100 m land cover. OSM `landuse=forest` through Overpass (rate limits). Each one adds a download and a host for little gain at ≤ 14 px.
- **Check:** `SunVisualization` tests: the treeline at 47/60/72°; no trees above the treeline, beyond 8 km or at angle ≤ 0; the same seed gives the same trees; bare broadleaves in January (north) and July (south); the path is still one `terrain-silhouette`. Frame budget in compass mode.
- **Open:** (a) Trees also in the share image (`ShareCardButton`)? (b) A setting to turn the trees off?
- **Decision (Lutz, 2026-10-11):** Real land-cover data, not the heuristic. First check that a source works from the browser with no own server: ESA WorldCover (COG on AWS S3: CORS, range reads, size) or OSM forest polygons. Load the code and the data lazily (the start bundle does not grow, item 125), cache the data as `terrainTiles` does, and add the host to the CSP. Trees only where the land cover is forest. Shapes, size, season, colour and performance as spec 2–9 (the treeline rule goes). When no source works from the browser, stop and report.
- **Data:** ESA WorldCover 10 m 2021 v200, CC BY 4.0. Attribution in the line-of-sight details, under the terrain line: "Trees: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium" (`terrain.treesAttribution`, five languages). The app reads the Cloud Optimized GeoTIFF copy on Microsoft Planetary Computer: a read-only token from `planetarycomputer.microsoft.com/api/sas/v1/token/esa-worldcover` (about 45 min, kept in memory) and HTTP range reads from `ai4edataeuwest.blob.core.windows.net/esa-worldcover`. Both send CORS headers; the blob accepts the `range` preflight. Not usable from the browser: the AWS copy (`esa-worldcover` bucket: no `Access-Control-Allow-Origin`, the preflight gets 403) and ESA's Terrascope WMTS (empty reply). Each 3° × 3° file has 1024 px tiles (DEFLATE, 8 bit) and 6 overviews. The app reads the 32 kB header and the 40 m overview tiles that hold a ridge point. The 40 m tree share equals the 10 m share (39 % around Ravensburg; 91 % of the points agree). Download per place, measured in the browser: Ravensburg 171 kB (token, header, one tile of 139 kB), Black Forest 48.0, 8.2 210 kB (two files, N45E006 and N48E006, because 48.0 is a file edge). One download per place and eye height; after that, the cache. Risk: Planetary Computer gives no service level for anonymous use. When it fails, the ridge stays bare and the app runs on.
- **Built (2026-10-11):**
  - `src/utils/landCover.ts` (lazy chunk, 3.9 kB): reads the ridge points of spec 2 only (angle > 0, height known, ≤ 8 km). A small TIFF header reader and the browser's `DecompressionStream` decode the tiles, so there is no `geotiff` (about 100 kB). It reads each header and each tile once per load and stops a read that is not a 206 range reply (that would be the whole 100 MB file). An unknown encoding throws. Classes 10 (tree cover) and 95 (mangroves) are trees. The result, 360 × `0`/`1`, goes to `localStorage` (`terrain_tree_cover_v1_<lat>_<lon>_<eye>`, the key of the horizon profile). A missing file (open sea) is no trees and is cached. A failed read is no trees at that point and is not cached, so the next visit tries again. When every read fails, it throws.
  - `src/utils/treeSilhouettes.ts` (lazy chunk, 1.4 kB): spec 2–9 without the treeline rule and the noise (spec 1 and 4). The conifer/broadleaf pick is seeded by the location to 0.01°. The trees stand at fixed world azimuths (every 1/3° in compass mode), so they do not slide along the ridge when the heading turns.
  - `src/hooks/useTreeCover.ts`: loads both modules with `import()` and the cover once the profile is `ready`, never before the first render. It shows no trees of the last profile on a new one.
  - `SunVisualization`: the trees go into the same `d` as `terrainFillPath`, in the same `useMemo` (profile, size, heading, month), so the taps, the keyboard and the `SeaCanvas` mirror take them as terrain. The tint is a second path with the trees only: `fill-opacity` 0.08, `pointer-events: none`, colours `--scene-tree-green` and `--scene-tree-amber` (`src/index.css`).
  - CSP `connect-src`: `https://planetarycomputer.microsoft.com` and `https://ai4edataeuwest.blob.core.windows.net` in `public/_headers` and `vercel.json`.
  - Start bundle (`npm run build`): `index` 622.70 → 624.13 kB (+1.4 kB: the hook, the memo lines, the tint path, the attribution text). Under item 125's 704 kB; the tree code and the reader are not in it.
  - Not as specced: (1) the shapes are narrower than a round crown: conifer 0.4 h wide, broadleaf an oval crown 0.5 h wide and 0.67 h high (bare: 0.25 h wide). In static mode a degree is about 1 px wide but 9 px high, and round crowns 0.7 h wide joined into one cloud. (2) A tree goes 1 px into the ground, not more: the tint covers that part too and showed as a dark band inside the ridge. (3) "By day" for the tint = `morning`, `midday`, `afternoon`.
- **Checked (2026-10-11):**
  - `npm run typecheck`, `npm run lint`, `npm test` (116 files, 1728 tests), `npm run build`. New tests: `utils.treeSilhouettes` (spec 2, the seasons north and south, 1 and 3 trees per degree, 1.5–14 px, the same seed gives the same trees, the conifer share by height, bare crowns, trees fixed when the heading turns, the wrap at north), `utils.landCover` (file names, the header reader, classes from a synthetic COG, one read per tile, the cache, open sea, a failed tile, no 206), `hooks.useTreeCover`, `SunVisualization` (one `terrain-silhouette` path with the trees, the tint by day and season, taps through the tint, compass mode), and the attribution in `InfoPanel`.
  - Browser (`vite preview`, Playwright 390 × 844 at 3×, BigDataCloud stubbed, clock fixed): Ravensburg 47.78, 9.61 and the Black Forest 48.0, 8.2 on Jun 15 (green tint), Oct 10 (amber) and Jan 15 (bare broadleaves, no tint). Compass mode in the Black Forest at heading 120°: 254 trees in view, and a 20° turn (one step per frame) ran at 60 fps. A double tap on a tree top opens the terrain card. The sea mirror shows the ridge with the trees. With the data host blocked, the ridge stays bare and the app runs. No console errors from this item.
  - Data check, Ravensburg: 207 of the 274 ridge degrees of spec 2 are tree cover. The browser result equals a separate Python reader of the same 40 m data on 274 of 274 points, and the 10 m data on 263 of 274.
  - Cost: building the tree path takes 0.20 ms in compass mode (273 trees, 10.6 kB) and 0.34 ms in static mode (360 trees, 14.3 kB), unthrottled on a Mac (expect about 4× on item 91's phone profile). It runs only when the heading, the size, the profile or the month changes, not per frame.
  - Not checked: a real phone (GPU, real compass), a night scene in the browser, the southern hemisphere in the browser (unit tests only), `npm run perf:trace`, an offline start (a visited place has its trees from the cache; a new place offline gets none). Not done: the share card (open a) and a setting to turn the trees off (open b).
  - Seen in the 3× screenshots: on a steep near slope in summer, the oval crowns, all 20 m high, form a regular row of bumps. A ±20 % height spread would look more natural; it is not in the spec, so it is not in.

### 142. Contrails stay in the sky: they start at the plane, stay after it, and last longer — M — [SUN-CHASER-1H](https://ainabler.sentry.io/issues/SUN-CHASER-1H), [SUN-CHASER-1N](https://ainabler.sentry.io/issues/SUN-CHASER-1N) — **✅ Done**

- **Feedback (2026-10-11 17:16 CEST, Ravensburg):** "Make the condensation strip of a plane even longer and longer lasting".
- **Feedback (2026-10-11 17:45 CEST, Ravensburg):** "The condensate strip of a plane should not change position and start only if the plane appears and stay even after the plane is gone for a while".
- **Now:**
  - Scene planes (`CloudLayer` `renderPlane`, `createPlane`): a short or medium trail is one tapered gradient (`plane-trail`), `trailLength` vw wide, inside the plane's wrapper. `moveAcrossX` moves it with the plane, so each point of the trail slides across the sky ("changes position"). Item 109 makes the plane fly on past 101 % (`dx += trailLength`), so the trail slides off the right edge and then the plane goes. Only a `persistent` trail stays in the sky: 12 `getTrailPieces` pieces that grow (`planeTrailGrow`), then spread and fade (`planeTrailSpread`). The plane stays in the list until the last piece fades.
  - Live planes (`LivePlanes` `PlaneBody`): the trail is a div attached to the plane. Its length is `hypot(dx, dy) × min(MAX_TRAIL_SEC 300, lifeSec[0])`, and its angle is the direction 1 s ahead. It is a straight line drawn backwards, not the real past path. It has its full length on the first frame, also when the plane only now shows (it enters the view, rises above 5°, comes out from behind a ridge, or takes a `pickShownPlanes` place). Its length and angle change with the screen speed. At the 360° edge, `dx = 0` makes it jump. When the plane leaves the shown set or the feed drops it (`LIVE_MAX_AGE_MS`), the trail goes in the same render.
  - `CONTRAIL_LOOK` now: short 30 s, medium 180 s, persistent 300–600 s.
- **Spec:**
  1. Every trail is fixed in the sky. A point is made where the plane is, and it never moves after that. The trail grows only from the point where the plane first shows. Nothing is drawn before that point.
  2. Each point fades on its own clock (`lifeSec` from when it was made). After the plane is gone, the trail stays and fades from its older end.
  3. Longer and longer lasting: short 30 → 60 s, medium 180 → 300 s, persistent 300–600 → 600–900 s. The spread stays 1.5 / 2.5 / 8. `MAX_TRAIL_SEC` 300 → 600.
  4. Scene planes: all kinds use the persistent pieces. Remove the `dx += trailLength` overrun (the plane ends at 101 %). The plane stays in the list until its last piece fades, as `persistent` does now. Piece count = clamp(ceil(10 × duration / life), 12, 24), so a short trail fades smoothly, not in steps.
  5. Live planes: keep a trail history per `hex` in a ref. Store sky points (azimuth, elevation, time), one every 5 s, plus the live head. Store sky points, not px, so the compass view and a phone turn project the points again correctly. Draw all trails in one SVG below the planes: one polyline per plane, with the opacity of each segment set by its age. Do not join two points across the 360° edge. When a plane leaves the shown set, keep its history until its newest point fades. When a plane shows again after a gap, start a new history.
  6. Calm: nothing jumps or swings. The trail only grows at the head and fades at the tail.
  7. Performance limits: at most 120 points per live plane. The 40-plane compass limit (`MAX_COMPASS_PLANES`) also applies to fading trails (the oldest goes first). Measure the frame budget (item 91) with `?plane=short|medium|persistent` and 40 compass planes.
  8. Reduced motion: no change for scene planes (there are none). Live trails get only the feed's points, one every 15 s.
- **Check:**
  - `utils.planes`: the new `CONTRAIL_LOOK` values and the piece count.
  - `CloudLayer`: replace "short or medium trail that moves with the plane" with "pieces that stay; the plane ends at 101 %; the last fade removes it".
  - `LivePlanes`: no trail on the first frame; the trail grows from the first point; a point keeps its sky place over ticks and over a compass turn; the trail stays after the plane leaves (swap, ridge, below 5°) and goes after `lifeSec`; no segment across the 360° edge.
  - Frame budget run.
- **Open:** (a) Are the life values right (short 60 s, medium 300 s, persistent 600–900 s)? (b) When the radar is switched off, does a trail stay or go at once?
- **Decision (Lutz, 2026-10-11):** Lifetimes as spec 3 (60 / 300 / 600–900 s, `MAX_TRAIL_SEC` 600). When the live radar is switched off, the planes go at once, but their trails stay and fade on their own clock.
- **Built (2026-10-12):**
  - `planes.ts`: `CONTRAIL_LOOK` short 60 s, medium 300 s, persistent 600–900 s; the spread stays 1.5 / 2.5 / 8. `getTrailPieceCount(duration, life)` = clamp(ceil(10 × duration / life), 12, 24). `getTrailOpacity` (0.9, 0.6 at 40 % of the life, then 0) is shared by both kinds of trail. `getTrailLength` and `PERSISTENT_PIECES` are removed.
  - Scene planes (`CloudLayer`): every plane with a contrail draws the pieces. The moving `plane-trail` and the `dx += trailLength` overrun are removed, so the plane ends at 101 %. The plane stays in the list until its last piece fades; a plane without a contrail goes at the end of its crossing. **Deviation (frame budget):** one animation per piece, not two. `getTrailKeyframes` makes one `@keyframes` rule per plane (in a `<style>` next to its pieces): the piece grows in its part of the crossing (scaleX), then spreads (scaleY) and fades over the life. Before its start a piece waits in the first keyframe as a plain style. With two animations per piece (`planeTrailGrow` + `planeTrailSpread`), `?plane=short` (2 planes × 24 pieces, 95 running animations) cost +40 ms/s main-thread time on the phone; one element per piece with two animations, or a fill mode change, did not help.
  - Live planes: `liveTrails.ts` (new, pure). `updateLiveTrails` keeps a trail per plane in sky points (azimuth, elevation, time, and the engine's px offset from the plane's middle): one every 5 s (`TRAIL_POINT_MS`) plus the live head; with reduced motion one with each answer of the feed. A point never moves. A plane that did not show in the last update (or 30 s ago, `TRAIL_GAP_MS`) starts a new trail. A trail whose plane does not show keeps its last head and fades; a segment fades with its older point, a point goes after its life, and the trail goes with its last point. At most 120 points per trail and 40 trails (`MAX_COMPASS_PLANES`), the oldest fading trail first. `MAX_TRAIL_SEC` (600) moved here. `getTrailPaths` projects the points with the scene's mapping (so a compass turn or a new screen size moves them with the sky) and draws the segments with the opacity and width of their age (from thin to spread × thin) in 20 steps, one SVG path per step. It does not join two points across the 360° edge, and leaves out segments far outside the screen.
  - `LivePlanes`: the trails are React state, updated once per tick and per answer of the feed (state from the previous render). One SVG under the planes: per trail a memoized body (it renders again when a point comes or goes, at a fade step of 1/100 of the life, or with a new projection) and the segment to the head, which is the plane's tail. The plane body has no trail now. The clock: 4 times per second while the radar is on, once per second while only trails fade (every 15 s with reduced motion), none when nothing shows. `SunVisualization` keeps `LivePlanes` mounted while the radar is off (it renders nothing without planes and trails): when the radar is switched off (also by time travel or a lost Premium), the planes go at once and the trails fade.
  - `scripts/perf-trace.mjs`: `--compass DEG` (compass mode facing DEG, the aircraft within 40° of it), `--contrail KIND` (the upper air for that contrail in the forecast stub), `--query` (for example `?plane=short`). The stub aircraft fly on between two answers (their position age grows) instead of jumping back every 15 s.
  - **After item 143 (2026-10-12), the head at the turned tail:** `getTailOffset` (`liveTilt`) gives the tail as the body is drawn, from the plane's middle: in the side view the engine (`PLANE_TRAIL_X/Y`), mirrored with the body for a left-mover (`scaleY(-1)`); from below the end of the fuselage (`PLANE_UNDER_TAIL_X`, 2/40 of the box); both turned by the body's angle. It uses the tilt the body glides to (angle, side, view). Each point keeps the offset of its time, so the turn moves no old point. The head moves to a new offset at most 4 px/s (`TAIL_SHIFT_PX_S`): in the 2 s glide or the 1.5 s roll it lags a little and never jumps; a new trail and reduced motion (15 s between updates) take the offset at once. The merge keeps item 143's body (the tilt ref per hex, the turning layer, the two views, the glide and the roll); a plane's first frame stays first also in the extra render of the trail update.
  - **Deviations:** (1) Spec 5 "one polyline per plane": SVG cannot change the opacity along one polyline, so a trail is one path per fade step (at most 20). (2) The live trail starts at the plane's tail as drawn (see above), not at the middle of the plane. (3) The scene pieces as above.
- **Checked:**
  - Tests: 1,715 (main 1,694). New `utils.liveTrails` (the first point and no trail on the first frame, a point every 5 s that never moves, the trail after the plane goes and its fade from the older end, a new trail after a gap, reduced motion, 120 points, 40 trails, the fade steps, no join across the 360° edge); `utils.planes` (the new lives, the piece count, the keyframes); `CloudLayer` (short and medium pieces that stay, the plane ends at 101 %, the last fade removes it; a plane without a trail goes at the end of its crossing); `LivePlanes` in the real scene (no trail on the first frame, the trail grows from the first place to the engine, the points keep their sky place over ticks and over a compass turn, the trail stays behind a ridge and when the radar is switched off and goes after its life, no segment across the 360° edge, reduced motion stores only the feed's points). Typecheck, lint and build pass.
  - Built app (`vite preview`, Playwright 390 × 844, all other hosts stubbed or blocked). `?plane=short|medium|persistent` with the CSS animations at 20×: 24 / 12 / 12 pieces; the first piece starts where the plane comes in; the left end and the middle line of each piece never move; the growing end stays within 0.5 px of the engine; after the plane leaves (at about 210–260 s) the trail stays and fades from its older end; the plane goes with its last piece (270 s, 490 s and 1,030 s scene time). A stubbed live plane (13 km away, 10.5 km high, short contrail) in compass mode: no trail before the plane shows; after 25 s 7 points, the first never moved, the head 0.2 px from the engine; after switching the radar off the plane went at once, all points stayed in place and faded, and the trail went 60 s later.
  - Frame budget (item 91, phone/day, main-thread busy ms/s; other agents loaded the machine, so the values are noisy): `?plane=short` 72 → 98 (median of 2 interleaved pairs, +0.43 ms per frame; with two animations per piece it was about +40 ms/s), `?plane=medium` 117 → 120, `?plane=persistent` 131 → 120 (34 running animations instead of 54); 40 compass planes (`--live-planes 60 --compass 180 --contrail persistent`) 151 → 156 (+0.08 ms per frame, 148 trail paths). After 10 min (`--warmup 620`): 40 fading trails with 312 paths, 116 ms/s (the stub planes had flown out of view by then). All runs 60 fps, frame p95 16.7–16.8 ms, no long tasks; one branch run with 40 planes had a 100 ms frame maximum.
  - After item 143: tests 1,882 (main 1,852). `utils.liveTilt` `getTailOffset` (level right, climbing 30° right, a left-mover level and climbing, the underside straight up and steep); `utils.liveTrails` (the head moves to a new tail at most 4 px/s, the old points keep theirs, reduced motion at once); `LivePlanes` in the real scene, the head within 0.15 px of the turned tail read from the drawn body: a side view climbing 15–45° to the right, a left-mover, a steep plane from below (with the rotation left out, the climbing case fails). Typecheck, lint and build pass. One full run had a 5 s timeout in an item 93 simulation test while the machine had a load of 17; it passes alone and in the next full run. Built app (390 × 844, compass facing south, stubbed feed, medium contrail): a steep plane from below and a shallow left-mover; at 3, 12 and 25 s each trail head was 0.01–0.11 px from the turned tail; the screenshots show the trail leaving the end of the fuselage of the steep plane and the engine of the left-mover.
  - Not checked: a real phone and the real feed; at night and at sunset; the cost of 40 planes that each carry a full 10 min trail at the same time; time-travel play and rewind with the new piece keyframes; the head during a roll between the two views in the browser (only the unit test). Seen, not changed: at some piece borders a 1-device-px gap shows (the same as the persistent pieces of item 96; pieces 0.5–1 px wider swap the gaps for faint bright dots).

### 143. Live planes point the way they fly on the screen — M — [SUN-CHASER-1J](https://ainabler.sentry.io/issues/SUN-CHASER-1J) — **✅ Done**

- **Feedback (2026-10-11 17:19 CEST, Ravensburg):** "In live tracking a plane needs to be tilted in the direction it flies".
- **Now:**
  - `LivePlanes` `PlaneBody` draws `ScenePlane`, a side view that flies right (40 × 12 grid). The only transform is `flip ? 'scaleX(-1)'` with `flip = dx < 0`. The plane always stays level.
  - The direction is known already: `dx`, `dy` are the projected screen step to 1 s later (`getAircraftView(sec + 1)`, through `projectSky` → `resolveAzimuth` / `altitudeToY`). Only the trail uses it (`trailAngle = atan2(dy, dx)`, rounded to 1/50 rad).
  - The raw adsb.lol `track` cannot give the angle: the screen maps azimuth to x and elevation to y, so a plane on track 090° can move up, down or sideways on the screen.
- **Spec:**
  1. Angle `a = atan2(dy, dx)` from the projected positions, the same value as the trail angle.
  2. The body gets `rotate(a)` around its centre. When the plane moves left (`dx < 0`), add `scaleY(-1)` after the rotate, so the fin stays up. For level flight this is the same as the current `scaleX(-1)`.
  3. Calm: keep the 1/50 rad rounding, so the memoized body renders again only on a change. When the screen speed is below 0.1 px/s, or `dx` is 0 at the 360° edge, keep the last angle and flip per `hex` (in a ref). Change the flip only when `dx` passes ±0.05 px/s, so a plane that moves almost straight up or down does not flip back and forth.
  4. The night lights turn with the body. The tap area (`HitArea`) stays level.
  5. Scene planes do not change: they always cross level from left to right.
- **Check:**
  - `LivePlanes`: a plane that moves up and right gets a rotate with a negative angle; a plane that moves left is upright (`scaleY(-1)`); a still plane in compass mode keeps its last angle; no flip flicker near vertical motion.
  - The trail (item 142) starts at the rotated tail.
- **Open:** Limit the tilt (for example ±60°), or let a plane that flies straight up the screen point straight up?
- **Decision (Lutz, 2026-10-11):** Option H of the [Plane Tilt Lookbook](https://claude.ai/artifact/8GT8CsQQwHu5zLbckPgPzC) ("planes option h is perfect"): glide + underside. Size S → M.
  - Side view up to 60°: the body turns to `atan2(dy, dx)`, at most ±60°, as `rotate(a) scaleY(±1)` (the fin stays up when the plane moves left), with a 2 s ease (`transition: transform 2s ease-in-out`). `a` stays unwrapped per `hex` in a ref, so a plane never turns the long way round. A plane's first frame gets its angle at once, with no transition.
  - Steeper than 60°: the plane rolls over in 1.5 s to the underside view (the side view goes to `scaleY(0)` in 0.75 s, then the underside opens from 0 to 1 in 0.75 s). The underside is a planform seen from below (fuselage, both wings, tailplane, engines) that points exactly along the way, with no limit, also straight up. Back to the side view only below 50°. A left/right turn on a steep way happens in the underside view.
  - Night, in the underside view: the red and green lights and the strobes on the wingtips. Seen from below with the nose up, the left wing's red light is on the viewer's right.
  - Keep the 1/50 rad rounding. Below 0.1 px/s, or with `dx` 0 at the 360° edge, keep the last angle, side and view. The tap area stays level. Scene planes do not change.
- **Built:**
  - `src/utils/liveTilt.ts` (pure): `getLiveTilt(prev, dx, dy)` gives the angle (1/50 rad steps, unwrapped against the last angle), the side (it changes only when `dx` passes ±0.05 px/s), the view (underside above 60°, side view again below 50°) and `first`. Below 0.1 px/s or with `dx` 0 it gives the last tilt.
  - `LivePlanes` keeps the last tilt per `hex` in a ref. A plane that is not shown drops out, so when it shows again it starts fresh. The ref is written during render (one `react-hooks/refs` lint exception): `getLiveTilt` is pure, so a second render with the same step gives the same tilt.
  - `PlaneBody`: the outer element turns (`rotate(a)`, 2 s ease-in-out). In it, the side view (`scaleY(1)` or `scaleY(0)`, with the left/right `scaleY(±1)` in its own element, 2 s) and the underside view (`scaleY(1)` or `scaleY(0)`) roll: the view that goes uses `0.75s ease-in`, the view that comes uses `0.75s ease-out 0.75s`. No transition on a plane's first frame and with reduced motion (the global reduced-motion CSS does not remove `transition-delay`).
  - `ScenePlane` gets `view="under"`: the lookbook's 7 paths on a 40 × 40 grid; at night the two wingtip lights and two strobes.
  - The tap area, the scene planes and the trail code do not change.
  - **Deviations:** (1) The left/right roll keeps its 2 s transition also while the side view is hidden (the lookbook snaps it there), so a side change and a view change at the same time do not jump. (2) The trail still starts at the plane's centre: it is aligned with the turned tail after item 142.
- **Checked:**
  - Tests: `utils.liveTilt` (9: the angle and its steps, a left plane mirrored with the fin up, the side view never past ±60° and the underside exact up to 90°, the 60°/50° hysteresis, the ±0.05 px/s side change, a turn over the top the short way round, the first frame, a still plane and `dx` 0 keep their tilt, the same step gives the same tilt); `ScenePlane` (2: the underside by day; at night red on the right of the nose seen from below, two strobes); `LivePlanes` (6: a left plane mirrored, a steep plane from below, no transition on the first frame and then 2 s / 0.75 s, none with reduced motion, a plane that stops keeps its tilt and the tap area stays level, the night lights per view). Typecheck, lint, all 1,711 tests and the build pass.
  - Built app (`vite preview`, 390 × 844, stubbed feed: a shallow climb, a steep climb, a steep turn, an overflight; compass facing east), by day and at night: in 45 s each plane changed its view at most once and its side at most once. The roll shows the underside going edge-on and then the side view opening. At night the steep planes show green on the left and red on the right. With reduced motion all transitions are off.
  - Note: in the normal 360° view a phone has about 7 times more px per degree up than across (in compass mode about 2 times), so there most live planes move steeply on the screen and show from below. The overflight test plane: 57° and from below in the 360° view, 17° and in the side view in compass mode 2.5 s later.

### 144. A whale that looks like a whale — M — [SUN-CHASER-1K](https://ainabler.sentry.io/issues/SUN-CHASER-1K) — **✅ Done**

- **Feedback (2026-10-11 17:42 CEST, Ravensburg):** "Whale does not look like a whale".
- **Now:** `SHAPES.whale` in `src/components/SceneFish.tsx` (24 px grid, faces right, FS1 two-tone look, item 85). The tail is an upright, forked fish tail (`fin`, x 1.3–4.8, y 9.8–15.2). There is a small fin on the back at x 9.4 and a short fin under the belly at x 13.4. The body is an egg (x 4.2–22.4, y 8.5–17) with a blunt head and no narrow tail stock. Two throat lines (`stripe`), eye at (18.2, 12.3). A vertical gradient goes from `--scene-fish-whale-back` `215 21.3% 16.5%` to `--scene-fish-whale-belly` `215 15% 68.5%`. `FISH.whale` in `CloudLayer.tsx`: size 72, speed 0.4, haze 0.8, `glide`. Depth is always 0.75–1, so the whale is 40–48 px wide at 40–45 % opacity. Result: a big dark fish.
- **Spec:**
  1. A new side-view outline on the same grid (about 22 × 7 units, at least 3:1). Pointed snout at x 22.6. A mouth line from the snout to x 17. The back rises to a hump at about x 11. A small dorsal fin at about x 8.5. The body tapers to a narrow tail stock at x 3.5 (about 1 unit high).
  2. Flukes: horizontal, seen a little from above. A flat crescent about 4.5 units wide and at most 2.2 units high, with a notch in the middle. No upright forked tail.
  3. Pectoral fin: long and swept back, about 5 units, from (15, 14.6) to (10.5, 17.6) (humpback style).
  4. Blowhole: a small dark notch on the top of the head at about (17.5, 10.2). Eye: r 0.85 at about (18.6, 12.9), just above the mouth line. Keep 3 throat grooves on the belly.
  5. Spout: every 25–40 s a white puff (`--scene-glow-white`, 50 %) rises from the sea edge above the blowhole. It grows over 1.5 s and fades over 2 s. No spout with reduced motion, at night or in rain.
  6. Colours closer to the sea hue (`SEA_HUE` 205): back `208 28% 26%`, belly `205 18% 72%`. Size 72 → 84, so the whale is 46–56 px. Speed, depth, haze and `glide` do not change: calm, no body sway.
- **Check:** `SceneFish.test`: the whale's body box is ≥ 3:1, the flukes are wider than tall, there is a blowhole part. `CloudLayer.test`: change the "about the size of the rowboat" whale test (≤ 48 px) to the new size. Spout test: it shows only by day with motion allowed. Browser at 390 × 844 with `?fish=whale`.
- **Open:** (a) Is 84 px OK? Item 62 asked for the size of the rowboat. (b) Is the spout wanted, or the outline only?
- **Decision (Lutz, 2026-10-11):** "whale: D with G and sometimes E and I", from the [Whale lookbook](https://claude.ai/artifact/4k7d2QZPJdSW2jWijFXGym) (private).
  - **D Sperm whale:** a box head and a narrow pale lower jaw are the new `SHAPES.whale` (FS1 two tones, no outline, as the other fish). Size 72 → 84 and haze 0.8 → 0.5: at 0.8 the whale is too faint by day, at 0.5 it is about 50 % visible.
  - **G Surface and blow,** the rare moment: the whale rises slowly until its back breaks the water at its own distance, blows a white spout and sinks again (as the dolphins' roll and `SceneVisitor`: a waterline clip and a glint line). At most about 2.3 px/s. The spout grows over about 3 s, not 1.5 s (calmer). At most once per crossing, in 1 of 2 crossings. No rise with reduced motion.
  - **E Mother and calf,** sometimes: about 1 in 4 whales swims with a calf (about 46 % of the size, a smaller copy of D) in a fixed formation, at the same speed, with no motion of its own.
  - **I Sea sparkle at night:** at night the whale is in the night mix, with a faint cyan glowing outline and a few slowly fading sparks behind the tail. By day it is the plain D.
  - No "blowhole part" test (a notch is not visible at this size).
- **Built:**
  - `SceneFish.tsx`: `SHAPES.whale` is the lookbook's D (flukes, pectoral fin, box-head body, the pale jaw in a new role `flipper` in the belly tone, eye), 3.3 : 1. Tokens `--scene-fish-whale-back` `213 14% 28%` and `--scene-fish-whale-belly` `213 10% 58%`. New props `calf` and `surface`. E: the same parts again in `translate(8.4 .2) scale(.46)`, drawn first. G: the whale is drawn twice, clipped at its own water surface (grid y 7). Under it the whale keeps its hazy opacity; above it, it is crisp at the sea visitors' 95 % (the wrapper has 95 %, the part under the surface 1/1.4 of it). `scene-whale-rise` (3.4 units up in 6 s with a 4° nose-up tilt, 5.5 s at the top, 6 s down with a 4° nose-down tilt, 17.5 s in all), `scene-whale-glint` (the line on the water) and `scene-whale-spout` (white, from the blowhole at the front of the head, 20° forward; it grows to 50 % in 3 s and fades in 2 s while the whale is up) run on one clock, CSS keyframes in 12 steps per move, as the dolphins' roll. I: with its own light, a cyan outline (`--scene-fish-jellyfish-glow`, 0.35 wide, 80 %, a cyan glow filter) and 5 sparks behind the flukes that fade between 15 % and 70 % (`scene-whale-spark`, 2.5 s each way).
  - `CloudLayer.tsx`: `FISH.whale` size 84 (46–56 px) and haze 0.5. `createFish`: 1 in 4 whales gets `calf`; 1 in 2 of the others gets `surface`, the time in the crossing when the whale's middle is at 25–65 % of the width. `fishLane`: the box of a whale that rises reaches 3 grid units above and ahead of the drawing box, for the spout. `renderFish`: a whale that rises has its lane-change and dive wrappers from the start, so a later lane change or dive does not mount it again (the rise would start over); with reduced motion it does not rise. `GLOWING_AT_NIGHT` has the whale.
  - `weatherEffectsUtils.ts`: `NIGHT_FISH_WEIGHTS` gets whale 1; the lanternfish goes from 30 to 29 (sum 100).
  - `sceneInfo.ts`: the whale swims day and night; Latin name *Physeter macrocephalus*. i18n (en, de, es, it, fr): "Sperm whale / Pottwal / Cachalote / Capodoglio / Cachalot", and a new fact: the blow of a sperm whale leans forward.
  - Decisions in the build: (a) A whale with a calf does not rise: the calf swims above the mother's back (E), so it would come out of the water when she rises. For a pair that rises, the calf must swim under or beside her. (b) No rise at night (the whale glows then) or in rain. (c) At night the whale takes its 1 from the lanternfish (a fish with its own light), so the moonlit share stays 24.
- **Checked:** typecheck, lint, build and all 1706 tests pass. New tests: `SceneFish` (the body ≥ 3 : 1, the flukes wider than tall, the pale jaw; the calf; the waterline clips and one clock; from the keyframes, the head of a 56 px whale moves ≤ 2.3 px/s, 3.4 units up, ≤ 4°, the spout grows in 3 s and fades in 2 s while the whale is up; the night outline and 5 sparks), `CloudLayer` (calf 1 in 4 with no rise; rise 1 in 2 at 25–65 % at 390 and 1280 px, at dusk, not at night or in rain; the lane box with the spout; the wrapper opacity and the wrappers from the start; no rise after reduced motion turns on; the night whale with its own light without the moon), `utils.weatherEffectsUtils` (night weights), `utils.sceneInfo` (card, Latin name). The "≤ 48 px" whale test is now 46–56 px. Browser (built app, `vite preview`, 390 × 844, `?fish=whale`, stubbed network): day, evening and night; a forced rise (the animations set through the Web Animations API, 0–17.5 s): the head and the hump break the water with the glint, the spout leans forward and fades, the whale sinks; the top edge moved at most 2.04 px/s (50 px whale, day) and 2.25 px/s (55 px, evening); a mother and calf by day; at night the cyan outline and the sparks, outside the moon pool. No console errors (only the blocked hosts). Not checked: a rise that comes by itself (not waited for in real time), time-travel play during a rise, a wide screen.

### 145. Fish look underwater — M — [SUN-CHASER-1M](https://ainabler.sentry.io/issues/SUN-CHASER-1M) — **✅ Done**

- **Feedback (2026-10-11 17:42 CEST, Ravensburg):** "Some fish don't look as if they are underwater".
- **Now:** all fish are below the surface line already. The sea edge is at 65 % (`seaEdgePath` in `SunVisualization`). The top of a fish box is at `y = 67 + (1 − depth) × 26 ± 1` %, so 66–94 %. But the fish do not look wet:
  - The `CloudLayer` root has no z-index, so the fish wrappers (`zIndex: 5`) draw over the sea fill, the `SeaCanvas` wave lines and foam, and the sun and moon glint bars.
  - The colours are the fish's own tones (for example `--scene-fish-classic-back` at 79.8 % saturation, the trout's red band). They do not mix with `getWaterColors`, and there is no blur.
  - Day opacity is `0.85 × (1 − 0.3 × depth) × (1 − 0.4 × haze)`. The clearest fish: trout (haze 0) 0.85, minnow 0.82, classic fish and jellyfish 0.75. Night fish have no haze (moonlit 0.75, with their own light 0.95).
  - Fish keep their day colours at dusk. The boats dim with `getBoatTone`.
  - The shark and the dolphins visit the surface by design (fin above the water). They do not change.
- **Spec:**
  1. `SunVisualization` passes `water.surface` and `water.deep` to `CloudLayer`, which sets them as CSS vars on the fish layer.
  2. Submersion `s = 0.25 + 0.75 × haze`, so no fish is fully clear. `SceneFish` mixes each fill and stroke with the water colour: `color-mix(in oklab, <tone>, <water> t%)`, with `t = 15 + 40 × s` (trout 25 %, catfish 50 %). Far lanes use the surface colour, near lanes the deep colour.
  3. Each fish wrapper gets the filter `saturate(1 − 0.35 × s) blur(0.6 × s px)`. It is static per fish and never animated.
  4. Day base opacity 0.85 → 0.75. The depth, rain and lane-change factors do not change.
  5. The fish follow the boat light: `getBoatTone` 'sun', 'twilight' and 'night' dim the fish with the boat `TONE_FILTER`. At night, moonlit fish get the tint with the moon colour. Fish with their own light keep their lights without tint.
  6. The top of a fish box is never above 66 % (also after a lane change). No light rays.
- **Check:** `SceneFish.test`: the fills contain `color-mix` with the water var. `CloudLayer.test`: the opacity table, and a filter with `saturate` and `blur` that grows with haze. `utils.sunUtils` does not change. The item 92 box simulation still passes. Browser at 390 × 844 and 1440 × 900: day, evening and night. Frame time with 22 fish (item 91).
- **Open:** (a) Draw the wave lines and glints over the fish (`SeaCanvas` z 6)? Then the canvas mirror and the strong-wind fill (`matte`) hide far fish. (b) Blur OK, or tint only?
- **Decision (Lutz, 2026-10-11):** Option H of the [Underwater Fish Lookbook](https://claude.ai/artifact/4KHZ6rFGw1A5Gacd7ptjdL) ("fish option h"): B's water tint, D's wave lines and glints over the fish, and a sheen. The spec changes:
  - Keep step 1, step 2 (`color-mix(in oklab, <tone>, <water> t%)` with the water colour at the fish's height, t from 25 % for the trout to about 51 % for the catfish) and step 4 (day base opacity 0.85 → 0.75).
  - Drop step 3: no CSS filter on a fish (no `saturate()`, no `blur()`).
  - Step 5: the dusk dimming follows `getBoatTone` as the boats do, but in the colour mix, not as a filter.
  - New: `SeaCanvas` draws on two canvases. Under the fish: the sky mirror, the cat's paws and the strong-wind matte. Over the fish: the ripple lines, the whitecaps and the foam. The sun and moon glint bars move over the fish too (z 6), under the boats.
  - New: a static sheen of the sky colour, about 26 px under the sea line, over the fish and under the boats.
  - Night: moonlit fish mix with the moonlit water (the water colour plus 25 % moon colour). Fish with their own light keep their colours and lights.
  - The shark and the dolphins (surface visitors) do not change.
- **Built:**
  - `SunVisualization` gives `CloudLayer` the sea fill (`sea`: `water.surface`, `water.deep`, the fill's top in px and the scene height). `CloudLayer` sets `--scene-water-surface` and `--scene-water-deep` on its root. Each fish wrapper gets `--scene-fish-water`: the fill's gradient at the middle of the fish (`color-mix(in srgb, surface, deep p%)`, p from the fill's top to the bottom of the scene, as the SVG gradient). A moonlit fish gets the moonlit water (`color-mix(in oklab, <water>, hsl(var(--scene-moon)) 25%)`). The value is set once per fish; a lane change keeps it.
  - `SceneFish` has two new props: `water` (the share in %) and `boatTone`. Each fill, line and gradient stop (back, belly, line, side, eye, the trout's band) is `color-mix(in oklab, <tone>, var(--scene-fish-water) t%)`, t = 15 + 40 × (0.25 + 0.75 × haze): trout and the night fish 25 %, minnow 28 %, classic and jellyfish 34 %, whale 40 % (haze 0.5 since item 144), catfish 50.5 %. The E1 spot, the lights and the fish with their own light keep their colours. Without `water` (the collection grid) nothing changes.
  - The dimming in the mix, for a fish without a night light: brightness b is a mix with black in sRGB (`black (1 − b)`, as CSS `brightness()`); saturation s < 1 is a mix in oklab with the colour's complement (`color-mix(in oklch longer hue, c, c)`, the hue turned 180°) at (1 − s) / 2, which scales the chroma by s. The numbers are the boats' `TONE_FILTER`: sun 0.92 (the boats' `saturate(1.05)` cannot be done with a mix and is left out, under 0.01 in oklab), twilight 0.72 and 0.7, night 0.36 and 0.5. In Chromium the result is within 0.010 (oklab distance) of the lookbook's `saturate(brightness(c))`; brightness alone was up to 0.028 off. A browser that gets the `longer hue` mix wrong only loses the desaturation.
  - `createFish`: the day base opacity is 0.75 (the depth, haze, rain and lane-change factors do not change; moonlit 0.75, own light 0.95, jellyfish 0.6, visitors 0.95 as before).
  - The sperm whale (item 144, merged later): only its body under the water takes the tint. `SceneFish` builds two colour sets: under the water (the water mix and the boat light) and in the air (the boat light only, as the boats). A rising whale draws its part under its own water line with the first and its part above it with the second, so its back is crisp and dry above the water. The spout (white), the glint line, the night sea sparkle (the cyan outline and the sparks) and the E1 spot keep their colours. At night the whale has its own light (item 144), so, as the lanternfish, its body keeps its colours too. The calf takes its mother's (under water) colours. `WHALE_LIFT` uses the new day base (`DAY_FISH_OPACITY` 0.75, shared with `createFish`), so the part above the water stays at the sea visitors' 95 %.
  - `SeaCanvas` renders two canvases and draws both in its one rAF loop (frame ID in a ref). Lower (`sea-canvas`, no z-index, as before): mirror, matte and paws, at 10 fps. Upper (`sea-canvas-over`): ripples, caps and foam, at 30 fps as before. Each visible canvas costs main-thread time per update: with both at 30 fps the 22-fish scene took about 25 ms/s more than one canvas (4× CPU). The mirror (one copy per 2 px slice) and the paws (drifts of at most 3.2 px/s, fades over seconds) change slowly, so 10 fps does not show, and the scene now takes less time than before. Reduced motion: one still frame on both.
  - The sheen (`sea-sheen`): an SVG band from the top of the sea fill to 26 px under the sea line, the sea path filled with `water.sky` at 0.45, 0.26, 0.1 and 0 (the lookbook's stops), so it follows the wave edge.
  - Layers: the sheen, the upper canvas and the glint bars (`water-reflection`, with the pool of moonlight) have z 5 and come after `CloudLayer` in DOM order, so they paint over the fish (z 5, earlier) and under everything at z 6 and up. Not z 6 as the decision says: at z 6 the waves would also draw over the floating festival eggs (krathongs, marigolds, Hanukkah lights: "z-6: on the sea, over the waves"), the hunt splash and the leaves. The boats (z 7) stay on top. The rain mist (no z-index) is now under the upper canvas, so ripple lines near the sea line show through it; the ridge stays hidden.
- **Checked:** 15 new tests, 2 opacity tests updated (1,709 in all); typecheck, lint and build pass. `SceneFish.test`: each fill, line and stop has the water mix, the eye and the band too; the E1 spot, the lights and the own-light fish keep their colours; a moonlit fish gets no night dimming; the dimming strings per boat tone, and the same numbers as the boats' filter. `CloudLayer.test`: the opacity table (trout 0.75, minnow 0.72, classic 0.66, catfish 0.495), the water vars on the layer, the trout's deep share at its middle, the catfish at 50.5 %, the dusk dimming with no filter, the moonlit water, the visitors and the own-light fish unchanged, no change without `sea`. `SunVisualization.test`: the layer order (fish, sheen, lower canvas, upper canvas, glints; z 5 under the floating eggs) and the sheen's box and stops. The item 92 box simulation still passes; `sunUtils` does not change.
  - Browser (`vite preview`, own Chromium with every outside host stubbed or blocked, Ravensburg 2026-09-26, seeded): 390 × 844 and 1440 × 900 at day, sunset (19:00), dusk (19:32), night (22:00, and 04:30 with a moonlit fish in the pool) and 60 km/h wind, before and after. The fish take the water colour (pale bellies and the trout's band go to water blue, the catfish almost melts into the water); ripple lines, caps and glint bars cross the fish; at dusk the fish dim with the boats, and near fish over the dark deep water are hard to see, as the lookbook says; in strong wind the far fish show as before (the matte is under them); the lanternfish keeps its lights. The only console errors come from the blocked hosts (terrain tiles, CelesTrak).
  - Frame budget (item 91 `perf:trace`, day scene, before and after back to back, 2 rounds, main busy ms/s): phone 67/45 → 39/41, desktop 44/33 → 36/40; with `?fish=minnow` (19 fish on the phone, 42 on the desktop) phone 47/43 → 39/34, desktop 40/61 → 40/40. 60 fps, frame p95 16.7–16.8 ms, no long tasks in all runs. The 22-fish scene (1440 × 900 at dusk, 23 fish, 4× CPU, 4 rounds of 25 s): 294/294/297/306 → 218/221/231/222 ms/s, frame p95 16.7–16.8 ms both. Before the 10 fps lower canvas the same scene was about 25 ms/s slower than main.
  - After the merge of main (items 143, 144 and 146): 5 more tests (the part of a rising whale under its water line has the water mix, the part above it, the spout and the glint do not; at dusk the part above is dimmed without the water; the calf has its mother's colours; the night outline, sparks and body keep their colours; in `CloudLayer` a rising whale gets 40 % under its water line only). Item 144's opacity tests use the new day base. Typecheck, lint, build and all 1,852 tests pass. Browser (`?fish=whale`, 390 × 844, built app, own Chromium, outside hosts stubbed or blocked): by day and at dusk a whale's rise set through the Web Animations API at 3, 6.5, 9.2, 12 and 17.5 s: the tinted body under the water, the dark crisp back above it with the glint line, the white spout; at night a whale with its calf in the cyan outline with the sparks. No console errors besides the blocked hosts.
  - Not checked: a real phone, Safari/WebKit (the `longer hue` mix; a wrong result only loses the dusk desaturation), the moonlit tint at the full moon over a whole night, a whale's rise that comes by itself (forced in the browser), and the frame time after the merge (the frame numbers above are from before it).

### 146. New boats for the empty rarity tiers — M — [SUN-CHASER-1P](https://ainabler.sentry.io/issues/SUN-CHASER-1P) — **✅ Done**

- **Feedback (2026-10-11 17:48 CEST, Ravensburg):** "Are there other boats in the other rarity categories?".
- **Now:** `BoatKind` = sailboat, ferry, fishing, rowboat, freighter. `BOAT_WEIGHTS` 35/15/15/10/5 (`weatherEffectsUtils`). `getBoatShare` uses the fair-weather mix. With `RARITY_TIERS` (`sceneInfo`): sailboat 43.8 % common; ferry and fishing 18.8 % and rowboat 12.5 % frequent; freighter 6.3 % uncommon. Rare and very rare have no boat. Ultra rare is for eggs only: a dressed boat (bunting, papel picado, lights) is a normal boat, and its `DRESSED_BADGES` are `egg:*` badges. 129 badges.
- **Spec:**
  1. Three new kinds in the B3 soft-light style (`FLEET` in `SceneBoat.tsx`, 64 × 37 grid, waterline y 36, bow to the right): `kayak`, `paddleSteamer`, `tallShip`.
  2. Weights 4 / 2 / 0.5 (sum 86.5). New shares: sailboat 40.5 % common; ferry and fishing 17.3 % and rowboat 11.6 % frequent; freighter 5.8 % and kayak 4.6 % uncommon; paddle steamer 2.3 % rare; tall ship 0.6 % very rare. No existing boat changes its tier.
  3. Kayak: by day only (not `isSunDown`), fair weather, wind ≤ 20 km/h. Scale 0.8, speed 0.7, no wake, no lights.
  4. Paddle steamer: fair weather, any time. Scale 1.3, speed 1.0. A paddle box on the side, one funnel, gold window lights after sunset, always a wake.
  5. Tall ship: fair weather, wind ≤ 40 km/h (`STRONG_WIND_KMH`). Scale 1.5, speed 1.1. Three masts with square sails, mast lights, a wake as the sailboat.
  6. Add each kind to `BOATS` (`CloudLayer`: scale, speed), `LINES` (`BoatBunting`), `BOATS` in `sceneInfo` and `collection`, and the `CollectionView` art. 132 badges (plus the badges of item 138, if that item is built first). The tier comes from `getRarityTier(getBoatShare)`.
  7. Keys in en/de/es/it/fr: `boat.kayak` (Kayak / Kajak / Kayak / Kayak / Kayak), `boat.paddleSteamer` (Paddle steamer / Raddampfer / Vapor de ruedas / Piroscafo a ruote / Bateau à aubes), `boat.tallShip` (Tall ship / Großsegler / Gran velero / Grande veliero / Grand voilier). Plus `boatFact.*`, for example "A kayak paddle has a blade at each end.", "A paddle steamer turns a big wheel on each side.", "A tall ship can carry more than 20 sails."
- **Check:** `utils.weatherEffectsUtils`: the new shares and tiers, the `pickBoat` filters (no kayak at night or in wind > 20 km/h, no tall ship in wind > 40 km/h, `hasBoatWake`). `utils.collection`: 132 badges and the tiers. `utils.sceneInfo`: the 3 cards. `SceneBoat` and `BoatBunting` render every kind. `i18n.test`. Browser lineup at near size.
- **Open:** (a) Paddle steamer only in May–October (the Lake Constance season)? `getBoatShare` ignores time, wind and season, as for the other boats. (b) A cruise liner instead of the tall ship?
- **Decision (Lutz, 2026-10-11):** All four boats: kayak (uncommon), paddle steamer (rare, May–October only), tall ship (very rare) and a cruise liner (new; big white ship, rows of lit windows after sunset). Set the weights so that each new boat lands in its tier (cruise liner: rare) and no old boat changes its tier. The season filter is in `pickBoat`; `getBoatShare` stays season-free.
- **Decision (Lutz, 2026-10-12, on the two open points of the build):** (1) The tall ship always trails a wake, a light one. (2) South of the equator the paddle steamer sails November–April: OK.
- **Built:**
  - Weights and tiers: `BOAT_WEIGHTS` 35 / 15 / 15 / 10 / 5 / kayak 4 / paddle steamer 2 / cruise liner 1.5 / tall ship 0.5 (sum 88). `getBoatShare` (the fair-weather mix, no season): sailboat 39.8 % common; ferry and fishing 17.0 %, rowboat 11.4 % frequent; freighter 5.7 % and kayak 4.5 % uncommon; paddle steamer 2.3 % and cruise liner 1.7 % rare; tall ship 0.6 % very rare. No old boat changes its tier. 130 badges (126 on main after items 138 and 140, + 4).
  - Rules: `pickBoat(type, wind, r, { sunDown, month, latitude })`. Kayak: fair weather, only while the sun is up (not `isSunDown`), wind ≤ 20 km/h. Paddle steamer: fair weather, any time and wind, May–October. South of the equator its season is November–April (decision 2026-10-12), the half-year shift of the bird seasons (`seasonMonth`, now also used by `isBirdInSeason`). Tall ship: fair weather, ashore above 40 km/h (as the rowboat). Cruise liner: in `BIG_BOATS`, so any weather and wind, as the ferry and the freighter. `hasBoatWake`: the paddle steamer, the cruise liner and the tall ship always, the kayak never. The tall ship's wake is a light one (decision 2026-10-12): `lightWake` in its `FLEET` entry draws the same two lines at opacity 0.5 and 60 % of the length (`LIGHT_WAKE` in `SceneBoat`).
  - `CloudLayer` `BOATS` (scale, speed in %/s): kayak 0.8 / 0.7, paddle steamer 1.3 / 1.0, cruise liner 1.6 / 1.4, tall ship 1.5 / 1.1. The kayak is the slowest boat; no boat is faster than the ferry (1.8).
  - `FLEET` drawings (B3, 64 × 37, waterline y 36, bow right): kayak (a yellow shell with a red deck line, the paddler in the rower colour, a navy paddle with a blade at each end; no lights); paddle steamer (a tall red funnel, a white deck house, a white paddle box with spokes and the bridge on top, a stern flag, a foremast; 9 windows and the foremast light glow gold after sunset); cruise liner (a white hull with a navy boot top and a red line, three decks stepped back, a red funnel, a mast; 44 windows in 4 rows and the mast light glow after sunset); tall ship (a navy hull with a white band and gun ports, three masts with three square sails each on their yards, a jib to the bowsprit, a flag; a light on each masthead). New helper `squareSail`.
  - `BoatBunting` `LINES`: kayak stern → raised paddle blade → bow (it has no mast); paddle steamer stern flag → funnel → foremast → bow; cruise liner stern → funnel → mast → bow; tall ship stern → the three mastheads → bowsprit. The pennants, the papel picado and the Christmas lights work on all four.
  - Cards and collection: `sceneInfo` `BOATS` and `collection` `BOATS` (badges `boat:kayak`, `boat:paddleSteamer`, `boat:cruiseLiner`, `boat:tallShip`); the `CollectionView` art is `SceneBoat`, so it needed no change. Keys `boat.*` and `boatFact.*` in 5 languages, as in the spec; the cruise liner is Cruise liner / Kreuzfahrtschiff / Crucero / Nave da crociera / Paquebot de croisière, with the fact "A big cruise liner has restaurants, pools and a theatre on board."
  - Test link `?boat=<kind>`, or a list (`?boat=kayak,sailboat`, one kind by chance for each boat): `getBoatOverride`. It skips the weather, wind, time and season rules, and it pauses the collection, as `?fish=`.
- **Checked:** unit tests: `utils.weatherEffectsUtils` (all 9 kinds in fair, calm July weather; 40 of 100 picks are sailboats; rain, fog, snow and storm send only the ferry, the freighter and the cruise liner; no kayak at night or in wind > 20 km/h; no tall ship in wind > 40 km/h; paddle steamer months 5–10 in the north and 11–4 in the south, also at night and in any wind; the shares and tiers of all 9; `getBoatOverride`; `hasBoatWake`), `utils.collection` (130 badges, the 4 tiers, `?boat=` pauses), `utils.sceneInfo` (the 4 cards; the freighter is now 5.7 % and the fishing boat 17 %), `SceneBoat` (each new kind on the grid; lights at night: kayak 0, paddle steamer 10, cruise liner 45, tall ship 3; the tall ship's wake is light: opacity 0.5, 60 % of the paddle steamer's length), `BoatBunting` (pennants and Christmas lights on all 9), `CloudLayer` (the spawn rules reach `pickBoat`: no kayak at night or in 25 km/h wind, no paddle steamer in December; `?boat=` in the spawn tick and from the address). Typecheck, lint, build and all 1802 tests (116 files, after the merge of main with items 136–141) pass. Built app (`vite preview`, headless Chrome, 390 × 844, Ravensburg on 16 Sep 2026, network stubbed): each new boat next to a sailboat at 14:00 and at 19:50 (17 min after sunset, lights on), and alone at 22:30; the card of each new boat (double tap: name, tier, share, fact, tier ring); the collection boat row (130 in all, the tier outlines, the silhouettes of the missing badges); after the merge, the tall ship's light wake by day and at dusk; a lineup of all 9 boats at the same depth (day near and far, night), drawn by `SceneBoat`. Not checked: a real phone; the dressed new boats in the app on a real national day or at Christmas (checked only in the component render).

### 147. Controls: a tap shows or hides them where the user expects — S — [SUN-CHASER-1Q](https://ainabler.sentry.io/issues/SUN-CHASER-1Q) — **✅ Done**

- **Feedback (2026-10-13 18:20 CEST, Ravensburg):** "The controls hide and unhide still didn't work as expected".
- **Now (item 136):**
  - The fade is active only in browser fullscreen and in the installed app (`isFullscreen || isInstalledApp()`, `SunTracker`). In a Chrome tab nothing hides.
  - A document `click` toggles only when its target is in the scene root and not in `NOT_SKY` (`[data-scene-hit]`, `[data-share-hide]`, `button`, `a`, `input`, `[role="dialog"]`). A tap on a scene object does nothing.
  - Much of the sky is not "sky". Each cloud is a rectangular hit box (`SkyClouds`), and stratus and altostratus rows cover the full width. Birds, planes, fish, boats and satellites have 44 px moving hit boxes. The terrain ridge is a scene object. During a fireworks show the top 65 % of the sky is one hit area (`EventSkyTaps`). On a cloudy evening most taps do nothing.
  - A hidden control is `pointer-events-none`. A tap where the panel was lands on the cloud, sun or satellite below it, so the controls do not show.
  - After a show, the 10 s timer (`WAKE_HIDE_MS`) runs. Only a new focus restarts it; a scroll in the panel or a tap on a control that has focus does not. The panel can fade while the user uses it.
  - From 350 to 400 ms after a show, a tap on a control goes through to the sky and hides everything again (`TAP_READY_MS` 400 ms, `DOUBLE_TAP_MS` 350 ms).
- **Spec (options):**
  - **T1 Any single tap toggles:** a single tap on a scene object also toggles. The toggle waits `DOUBLE_TAP_MS` on a scene object only; a double tap opens the card and does not toggle. A tap on the empty sky still toggles at once.
  - **T2 The hidden panel area wakes:** while the controls are hidden, a tap inside the rectangle of a hidden control (`InfoPanel`, `MusicPlayer`, `TopLeftButtons`) shows them, whatever is below it.
  - **T3 Use keeps them:** a `pointerdown`, `wheel`, `scroll` or `keydown` inside a shown control restarts the 10 s timer.
  - **T4 No auto-hide after a show:** the controls stay until the next tap (the 3 s hide on entering fullscreen stays).
  - **T5 No pass-through:** `TAP_READY_MS` = `DOUBLE_TAP_MS`, so no window exists where a control tap hides the controls.
- **Check:** `hooks.useIdleHide` and `SunTracker` tests for each chosen rule (a tap on a cloud toggles after 350 ms; a double tap on a cloud opens its card and does not toggle; a tap on the hidden panel area over a cloud shows the controls; a scroll in the panel at 9 s keeps them 10 s more). Browser at 390 × 844 with touch, in fullscreen and as installed app.
- **Open:** (a) Which mode (Chrome tab, fullscreen button, Play app)? (b) What was tapped (empty sky, a cloud, the place of the hidden panel)? (c) "Didn't work" = nothing happened, or the controls hid during use? (d) Which of T1–T5?
- **Decision (Lutz, 2026-10-14):** A tap on the sky did nothing, and a tap on the place of the hidden panel did nothing. Build T1 and T2. T3, T4 and T5 not now.
- **Built:**
  - T1 (`SunTracker`, the document `click` of item 136): a tap on the scene is a tap on the empty sky or on a scene thing (`[data-scene-hit]`; the sun is a `button` with it). The empty sky toggles at once, as before. A scene thing starts a toggle that waits `DOUBLE_TAP_MS` (350 ms). A second tap in that time (anywhere) stops it: a double tap opens the card and collects as before, and does not toggle. A tap within `DOUBLE_TAP_MS` after a toggle does nothing (item 136 rule 3, now also on a scene thing), so a double tap does not flicker. A keyboard click (detail 0) opens a card at once: when the wait ends with a card open, it does not toggle. The tap that closes a card only closes it (as before). The scene things keep their own tap (`useDoubleTap`, the cloud's hand-on to a plane).
  - A cloud that hands its tap to a plane under it (item 126) now stops its own click (`stopPropagation`), so the document sees one tap (the plane's), not a double tap.
  - T2: `TopLeftButtons`, `InfoPanel` and `MusicPlayer` have `data-idle-control`. While the controls are hidden, a window capture `click` checks the tap point against their boxes (`getBoundingClientRect`). A tap in a box that lands on the scene shows the controls at once and stops there: the scene thing below takes no tap (no card, no start of a double tap). A toast or a card on top of the box (the badge toast is at the top, over the panel) keeps its tap.
- **Checked:** `SunTracker`: in fullscreen a single tap on a `data-scene-hit` element hides the controls after 350 ms (not at 349 ms) and the next one shows them after 350 ms; a double tap on the sun (200 ms apart) opens its card and does not toggle, with the controls shown and hidden; a keyboard click on the sun opens the card and does not toggle; while hidden, a tap on the sun inside the box of the top-left buttons shows the controls at once, and a second tap there 200 ms later opens no card (the first tap did not reach the sun); with the controls shown the same tap toggles after 350 ms; a toast (`data-share-hide`) on top of the hidden box keeps its tap and the controls stay hidden; the three controls carry `data-idle-control`. The item 136 test "a tap on a scene thing does not toggle" is now "a double tap on a scene thing …" (it tapped twice, 100 ms apart, and still passes); the item 89 and other item 136 tests pass as they are. `SkyClouds`: a cloud tap handed to a plane reaches the document once, with the plane as target. Phone emulation (Playwright, headless Chromium, 390 × 844, touch, production build, every other host stubbed and BigDataCloud stubbed before the load, installed app with `display-mode: fullscreen` stubbed, partly cloudy): a tap on a cloud hid the controls 354 ms after the click; a double tap on a cloud (120 ms apart) opened its card and the controls stayed hidden; the sky tap that closed the card kept them hidden; a tap on the badge toast over the hidden panel opened the collection and the controls stayed hidden; with a cloud moved under the hidden panel, a tap there showed the controls 2 ms after the click and a second tap 165 ms later opened no card; a sky tap hid them 2 ms after the click. Typecheck, lint, build and all 1889 tests (118 files) pass. Not checked: a real phone, the Play app and an iPhone home-screen app; browser fullscreen on a phone (only the installed-app mode was emulated); a mouse.

### 148. More weather to tap: halos, sun dogs and more, each with its rarity — M — [SUN-CHASER-1R](https://ainabler.sentry.io/issues/SUN-CHASER-1R) — **✅ Done**

- **Feedback (2026-10-13 18:20 CEST, Ravensburg):** "Are there other tappable weather phenomena besides the rainbow with different rarities? At the moment it's badge sits a little forlorn in it's row".
- **Now:**
  - The rainbow (item 121) is the only weather badge. Its tier is fixed at uncommon (`sceneInfo`). `groupRows` (`CollectionView`) puts every sky badge that is not in a state row into the first sky row, so the rainbow is alone there.
  - Clouds (11 types) have their own group. Rain, drizzle, snow, hail, fog, storm lightning and heat shimmer are not tappable (`RainCanvas`, `WeatherEffects` are `pointer-events-none`). Green flash, aurora, noctilucent clouds and the meteor shower are egg badges (ultra rare).
  - Data the app has: current cloud cover, wind, precipitation and `weatherType`; hourly low, mid and high cloud cover, visibility and 2 m temperature (`weatherUtils`); the sun and moon position and the moon phase.
- **Spec:**
  1. New sky optics, drawn as static SVG that fades in and out over 5 s (no new motion, calm rule). Each one is tappable as the rainbow: a double tap opens its card and collects the badge. Each badge goes into the rainbow's row ("Light in the sky"). Fixed tiers, as the rainbow.

     | Phenomenon | Tier | Trigger (all from current data) |
     |---|---|---|
     | Crepuscular rays | common | sun −3° to 8°, low + mid cloud 20–70 % (gaps), visibility < 20 km; faint fixed light wedges from the sun |
     | Sun dogs | frequent | high cloud ≥ 20 %, low + mid < 50 %, sun 0–30°; two soft glows 22° left and right of the sun |
     | 22° halo | uncommon | high cloud ≥ 50 %, low < 30 %, sun > 0°; a faint ring of 22° around the sun |
     | Double rainbow | rare | the rainbow shows and precipitation ≥ 1 mm/h; a second bow at 51°, colours reversed, fainter |
     | Fog bow | rare | fog or visibility 300–2000 m, low cloud < 50 %, sun 0–40°; a broad white bow |
     | Moonbow | very rare | rain or drizzle at night, moon 0–42°, illumination > 80 %; a pale white bow opposite the moon |

  2. Optional: a sun pillar (rare: sun −2° to 6°, high cloud ≥ 30 %, 2 m temperature < 0 °C) and a moon halo (rare).
  3. Each one gets a card with a fact (keys in 5 languages) and a badge drawing in `CollectionView`. Reuse `getRainbowGeometry` for the bows.
  4. A test link `?optic=<kind>` shows one, as `?fish=` and `?boat=`, and pauses the collection.
- **Lookbook first:** a private claude.ai page with each optic over the real sky gradients (golden hour, evening, overcast day, night), phone and wide view, 2 strengths each.
- **Check:** `utils` tests for each trigger (inside and outside each limit), the tiers and the badge count. Browser shots with `?optic=` for each kind at 390 × 844. Frame budget (item 91) with all optics shown.
- **Open:** (a) Which phenomena (all 6, plus pillar and moon halo)? (b) Lookbook first, or build at once?
- **Decision (Lutz, 2026-10-14):** A lookbook with all 8 (the 6 in the table, the sun pillar and the moon halo). Lutz picks after the lookbook.
- **Decision (Lutz, 2026-10-14, lookbook):** all 8 optics; halo O3G, moonbow O6E, sun dogs O2C (closer scale, 5 px per degree), the others at strength B; the moon halo on the same closer scale.
- **Built:**
  - Triggers: the new pure util `skyOptics.ts`. `OPTICS` has each kind with its name key, fact key and fixed tier: crepuscular rays common, sun dogs frequent, 22° halo uncommon, double rainbow, fog bow, sun pillar and moon halo rare, moonbow very rare. `getSkyOptics` applies the table: a range "a to b" includes both ends, "low + mid" is the sum of the two layers. The rays need a known visibility (manual weather has none, so no rays). The moonbow and the moon halo need a dark sky (night, astronomical or nautical twilight, the moon's own rule). The moon halo uses the lookbook's proposal: moon > 0°, illumination ≥ 50 %, high ≥ 50 %, low < 30 %. The inputs are the layers the scene draws (`getCloudLayers`: measured, else the weather type's own), the visibility of the forecast hour (new `getVisibilityAt` in `weatherUtils`; `SunTracker` passes `visibilityM`, null in manual weather), the 2 m temperature, `getRainMmH`, the sun and moon altitude, the moon illumination, and whether the rainbow shows.
  - Drawing: the new `SkyOpticsLayer`, right after `RainbowLayer` in `SunVisualization`, with no z-index, so the clouds, the sun, planes, birds and the terrain paint over it and take the tap. One static svg per optic, as high as the sky. It fades in over 5 s (`animate-optic-in`, the `fade-in` keyframes); an optic that ends stays 5 s more and fades out (`animate-optic-out`), with no hit path. Reduced motion: no fade. The shapes and colours are the lookbook's: O1B (7 wedges, peak 16 %, 5 px blur), O2C (a spot 110 px each side of the sun with a white tail, 62 %), O3G (the golden ring at 110 px, a darker sky inside, 60 %), O4B (the second bow at 9° more than the first, on the rainbow's scale, the spectrum reversed, 9 px apart, 12 %, Alexander's dark band), O5B (a 46 px white bow at 39° with tinted edges, 36 %), O6E (a 56 px pale band and a 3 px inner rim, 30 %), O7B (a 15° pillar), O8B on the closer scale (110 px around the moon). The bows use `getRainbowGeometry`: the sun's for the double rainbow and the fog bow, the moon's for the moonbow; the rings, the dogs and the pillar use the dot place of the sun or the moon. All places are whole pixels, so the 1 s scene tick does not repaint the blurred shapes.
  - Taps: thin hit paths only, as the rainbow's: a band along each ring and bow (28 px on a ring, the band's width on a bow), a 28 px beam along each ray (from 48 px out to half its length; the sun keeps its own tap) and along the pillar, a 44 px spot on each sun dog. `pointer-events: stroke` (`fill` on a spot), `data-scene-hit`, `touch-manipulation`, `useDoubleTap` with the ring id `optic:<kind>`. The hit svg of a bow stops 30 px above the horizon, as the rainbow's. While the card is open, the hit path's outline shows in the tier colour (`TIER_RING_STROKE`, new in `rarityTier`).
  - Cards: the target `{ type: 'optic', kind }`, kicker "Weather" with the optic's badge icon in `text-kind-cloud`, the direction to look (the sun, the point opposite the sun, the point opposite the moon, or the moon), the fixed tier and the fact.
  - Badges: 8 badges `optic:<kind>` right after the rainbow in the sky group (138 badges); `badgeForTarget` maps the optic to its badge. The badge drawings of the lookbook are lucide-grid icons (`opticIcons.ts`, also the card's kicker icon) in `text-brand-gold-light`, `text-white`, `text-slate-100`, `text-scene-moon` and `text-brand-peach`. `groupRows` puts them in the rainbow's row: 9 badges, 3 full rows on a phone, 4 + 4 + 1 from 640 px. The collection has no row labels, so no new label.
  - Test link `?optic=<kind>` or a list (`?optic=halo,sunDogs`): `getOpticOverride`. It skips the weather rules (a bow still needs the sun or the moon 0–42°, a ring its body on the screen), and it pauses the collection. `?optic=doubleRainbow` also draws the first bow.
  - Keys `optic.*` (after `scene.rainbow`) and `opticFact.*` (after `info.rainbowFact`) in 5 languages. Difference from the lookbook: the halo's fact says that the sky inside the ring is darker, not that its inner edge is red, because O3G has no red edge.
  - Start bundle (`npm run build`): `index` 651.1 → 666.6 kB on main at PR #205 (+15.5 kB: the layer, the util and 80 texts); 667.4 kB after PR #206. Under item 125's 704 kB.
- **Checked:** unit tests: `utils.skyOptics` (each trigger inside and outside each limit, two at once, the tiers, `?optic=`), `SkyOpticsLayer` (each optic draws a static blurred svg that fades in; the halo, the sun dogs and the moon halo at 110 px in whole pixels; the second bow at 51° and the fog bow at 39° on the rainbow scale, the moonbow opposite the moon, the feet mask; nothing without the body or the bow geometry; only thin hit paths, none without `onInfo`, the bow hit svg ends above the horizon; for each optic one tap opens no card and a double tap opens `{ type: 'optic', kind }`; the tier outline; an ended optic fades out for 5 s without a hit path and then goes; reduced motion), `SunVisualization` (thin high cloud gives sun dogs and the halo, a clear sky none, a frosty sunset the pillar, haze with gaps the rays; an ended optic is marked as leaving; 1.5 mm/h rain gives the double rainbow after the rainbow's layer; the moonbow and the moon halo at night; `?optic=`; the layer's place and no z-index), `SunTracker` (the forecast hour's visibility reaches the scene, null in manual weather; an optic tap opens "22° halo · Uncommon" and collects `optic:halo` with "Badge unlocked"), `utils.sceneInfo` (the cards), `utils.collection` (138 badges, the order, the tiers, `?optic=` pauses), `CollectionView` (the row of 9, found and missing cells), `utils.weatherUtils` (`getVisibilityAt`), `i18n.test`. Typecheck, lint, build and all 1976 tests (122 files, after the rebase on PR #206) pass. Built app (`vite preview`, headless Chrome, 390 × 844 and 1280 × 720, Ravensburg, the clock set to each lookbook scene, every other host stubbed or blocked, BigDataCloud routed to a stub before the load): the stubbed forecast of each lookbook scene shows its optic with no test link (the halo scene also the sun dogs, as the table says); `?optic=` shots of all 8 at both sizes look as the picks O1B, O2C, O3G, O4B, O5B, O6E, O7B, O8B; a double tap on the halo, the double rainbow and the moonbow opens its card with the tier outline; the collection row at 390 and 700 px. Frame time with all 8 shown (a low sun and the waxing moon, 22 Oct 2026 17:40): p95 16.7 ms with and without them, on the phone (4× CPU throttle) and on the desktop; main thread 70 → 75 ms/s on the phone, 27 → 26 ms/s on the desktop. Not checked: a real phone, a real halo/moonbow day; the raster and GPU time of the blurs (only as frame time). Found, not changed: a found badge with a 2-line name and a 2-line date does not fit its 128 px cell in `CollectionView`, so the name's second line is cut: "Crepuscular rays" now, "International Space Station" before (and "Ultra long haul" from 640 px).

### 149. Starlings that look like birds, not stars — S — [SUN-CHASER-1T](https://ainabler.sentry.io/issues/SUN-CHASER-1T) — **✅ Done**

- **Feedback (2026-10-13 18:27 CEST, Ravensburg):** "The starlings look like literal stars, is that on purpose?".
- **Now:**
  - Each starling is a four-pointed sparkle (`SceneBird` `starlings` path), the standard "star" icon.
  - The size is 7 px (`CloudLayer` `BIRDS`), but `far` sets the depth to 0.8–1, and `FAR_SHRINK` (0.45) makes each bird 4 px, so the sparkle is about 2 × 1.3 px.
  - 18–30 birds are scattered at random in an ellipse 8 × 3.2 bird widths. The colour is the silhouette token (black) at an opacity of about 0.42–0.46, so they look grey. They come only in the hour before sunset, when the first stars come out.
- **Spec:**
  1. A bird glyph: a small swept-wing shape (body plus two wings angled back), no flapping (calm rule).
  2. Starlings are drawn at 6–7 px: no `FAR_SHRINK` for the `far` flock (the flock stays far by its height and speed).
  3. Opacity 0.7 for starlings, so they read as dark silhouettes against the glow.
  4. Option M: a murmuration: 40–80 round dots of 1.5–2 px, densest in the middle, so the flock reads as one dark cloud. A slow "breathing" of the flock shape (10–15 s) is new motion; only with a lookbook.
- **Check:** `SceneBird` renders the new path; `CloudLayer` starlings are 6–7 px. Browser shot at 18:30 with a starling flock at 390 × 844.
- **Open:** (a) Bird glyph (1–3), or the murmuration (M)? (b) A small lookbook first?
- **Decision (Lutz, 2026-10-14):** A lookbook first: the starling glyphs and the murmuration, plus alternatives for the gull (the standard bird glyph).
- **Decision (Lutz, 2026-10-14, lookbook):** B0 glyph with the B5 breathing; gulls G1.
- **Built:**
  - Starlings keep B0: the four-pointed sparkle, its size (7 px, 4 px far out with `FAR_SHRINK`), 18–30 birds, the colour and the opacity do not change.
  - The flock breathes (B5): each bird moves from its spot in the long, flat flock to a rounder shape that arches, with the front end up, and back (`breathOffset` in `CloudLayer`: 0.71x as long, 1.45x as tall, an arch of 0.066 x², tilted by 0.14 rad, as the lookbook's B shape). `createBird` puts the move in px on each spot of the flock (`group[].breath`); no other group gets it. A bird moves at most about 3.5 bird widths (14 px at 4 px), the lookbook's share of the flock length. The `starlingBreath` keyframe is a CSS transform only (`translate(var(--tx), var(--ty))`), 6.5 s each way (13 s per breath), ease-in-out, infinite alternate, the same delay for all birds, so the flock breathes in step on top of the straight glide. No per-frame JS. With `prefers-reduced-motion` the birds have no breathing animation (and no flocks spawn, as before).
  - Gulls are G1: a soft "m" seen from the front, thin tapered arches with drooping tips, a small body and head where the wings meet, on the 48 × 24 grid of the other birds (`SceneBird`). The old 120 × 60 `box` is gone (no bird uses it now). Size (34 px) and speed (2.5 %/s) do not change. The `CollectionView` badge art is `SceneBird`, so it shows the new gull with no change. The shared view (item 78) captures the live scene, so it shows it too; the drawn share card has no birds. No other file had the old gull path.
- **Checked:** unit tests: `SceneBird` (the G1 paths on the 48 × 24 grid at 34 × 17 px; the starling keeps the B0 sparkle), `CloudLayer` (each starling has a move of at most 4 bird widths; the breathed flock is shorter and taller, the front bird rises against the rear bird; geese have no move; a spawned evening flock in October: every bird has `starlingBreath 6.5s ease-in-out infinite alternate`; after a switch to reduced motion the flock glides on with no breathing). Typecheck, lint, build and all 1888 tests (119 files) pass. Built app (`vite preview`, headless Chrome, 390 × 844, Ravensburg on 14 Oct 2026 at 18:05, 32 min before sunset, clear, network stubbed): a flock of 27 starlings with 27 breathing animations, all at the same time, 6.5 s, alternate; its birds spread over 56 × 23 px at 0 s and 39 × 34 px at 6.5 s (shots of both); a G1 gull near (33 px) and far (22 px). Not checked: a real phone; a frame-time trace (item 91) with a breathing flock (the perf scenes have no evening).

### 150. Vegetation: a lookbook of tree styles — M — [SUN-CHASER-1V](https://ainabler.sentry.io/issues/SUN-CHASER-1V) — **✅ Done**

- **Feedback (2026-10-13 18:33 CEST, Ravensburg):** "I don't like the vegetation can you do a lookbook with different styles, be creative".
- **Now (item 141):** trees stand where ESA WorldCover has tree cover or mangroves, within 8 km on the ridge (`treeSilhouettes`). A conifer is a triangle, a broadleaf is a trunk with an oval crown (half as wide in winter). One tree per degree (3 in compass mode), 1.5–14 px high. The trees join the terrain path and take the ridge colour; only by day an 8 % green or amber tint is on top. At 18:33 ("evening") there is no tint, so the trees are ridge-coloured bumps in a regular row (item 141 noted this).
- **Spec:** a lookbook (private claude.ai page, as earlier lookbooks) on the real Ravensburg ridge and tree cover, at day, golden hour, evening and night, phone and wide view. Styles:

  | # | Style | How | Cost |
  |---|---|---|---|
  | V1 | Paper-cut layers | a second, lighter tree band 1–2 px higher with another seed, behind the main band | +1 path |
  | V2 | Canopy skin | one soft bumpy line along each forest stretch (±20 % height), not single bumps | smaller path |
  | V3 | Ink-wash conifers | tall spruces with 3 stepped tiers and height jitter; a far ridge softened by 0.5 px blur | low–medium |
  | V4 | Sunset rim light | a 1 px warm edge on the side to the sun, fading with the distance to the sun's azimuth (golden hour and evening) | +1 stroke |
  | V5 | Autumn mosaic | broadleaf crowns in 3–4 tints (amber, rust, ochre, green) at 20–30 %; conifers dark; gold larches above 1200 m in October | 4 paths |
  | V6 | Lone sentinels | a thin forest band plus a few larger single trees (lime, oak) on peaks and forest edges | low |

  Combinations to show: V2 + V3, V2 + V4, V1 + V5. Then Lutz picks one; the pick is built in `treeSilhouettes` and `SunVisualization`.
- **Check (build):** `utils.treeSilhouettes` tests for the new shapes; browser shots at the four times; frame budget (item 91).
- **Open:** (a) More or other directions for the lookbook? (b) The tree tint by night and evening too?
- **Decision (Lutz, 2026-10-14):** The lookbook as specced (V1–V6 and the combinations).
- **Decision (Lutz, 2026-10-14, lookbook):** V6 + V4 (lone sentinels with the sunset rim light).
- **Built:**
  - `treeSilhouettes.ts` (lazy chunk, 1.4 → 5.0 kB) in three steps. `planTrees` lays out the trees on the full circle in world positions (1 per degree in static mode, 3 in compass mode) with no heading: the tree heights (spec 2–4), the forest stretches (a stretch over north is one stretch), the band bumps and the sentinels. `buildTreeScene` puts the plan on the screen for one heading; a stretch or a sentinel on the static seam draws on both edges. `buildRimPath` makes the rim path for the sun's azimuth.
  - Band (V6, the lookbook's values): one bumpy canopy line per forest stretch at half the tree height (so at most 7 px), each bump ±15 %, the valley between two bumps at 75 % of the lower one, a bump 1.3 × the band height wide (3–10 px). The jitter is seeded by the location to 0.01°. The band joins the terrain path, so the taps, the keyboard and the sea mirror take it as terrain (item 141).
  - Sentinels (V6, the lookbook's rule): candidates are the highest point (horizon angle) of each stretch of 3 or more trees, scored by its tree height + 3 px, and both ends of each stretch of 6 or more, scored by their tree height. The best first, each at least 14° from the others, at most 9 on the full circle; a tie goes to the smaller azimuth. Height 2 × the tree height, 7–24 px. The species uses the conifer share of spec 5, seeded by the azimuth: a spruce in 3 stepped tiers (1.1 × the height), or a lime or oak crown of three round lobes on a trunk. In winter (spec 6) the crown is half as wide. In the terrain path.
  - Rim light (V4): one path, stroked 1 px, `pointer-events: none`, over the ridge and under the sea. It has the sun-side edge of each sentinel (the spruce tiers from the top down; the crown outline over the top lobe and the side lobe), the top of each band bump (not across a sentinel's foot), and the bare ridge (not the flat sea line), each within 80° of the sun's azimuth. A gradient centred on the sun's x fades it to nothing at 75° on each side (`spreadMethod="repeat"`, one period = the full circle, so it wraps across the static seam; in compass mode the period is 4 × the width). Tones: `--scene-tree-rim-golden` (44 100% 72%, opacity 0.9) while the sun is above 3°, `--scene-tree-rim-evening` (40 100% 70%, opacity 1) below. Only in `dawn` and `evening` (the first hour after sunrise and the last hour before sunset), and only while the sun shines (`sunShines`: not overcast, fog, rain or storm).
  - `SunVisualization`: a `treePlan` memo (profile, size, compass on or off, month, place) and the terrain memo (adds the heading). The rim memo changes with the whole-degree sun azimuth. The 8 % day tint stays, now on the band and the sentinels.
  - Start bundle (`npm run build`): `index` 649.75 → 650.95 kB.
  - Not as in the lookbook: (1) the sentinels are the same 9 (14° apart) in both modes, not 4 per compass view (5° apart): a pick per view and the stretch ends at the screen edge changed while the heading turned. (2) The band is laid out in world positions, not per stretch on the screen, for the same reason. (3) The rim also shows in the hour after sunrise (`dawn`); the lookbook showed the evening only. (4) No rim while clouds hide the sun. (5) The band has no season; only the sentinels' crowns change in winter.
- **Checked:**
  - `npm run typecheck`, `npm run lint`, `npm test` (119 files, 1920 tests), `npm run build`. Tests: `utils.treeSilhouettes` (the thin band at half the tree height and only over the tree cover, the 7 px cap, a stretch over north, the same seed gives the same trees, the bumps fixed when the compass heading turns, the sentinel pick on peaks and stretch ends, no sentinel from a stretch under 3 trees, at most 9 and 14° apart, 7–24 px, the species by ridge height, bare crowns, the same sentinels in compass mode, the rim on the sun side, only within 80°, the bare ridge but not the forest or the sea line), `SunVisualization` (the trees path, compass mode, the rim only at dawn and in the evening and not by day, in twilight or at night, none under overcast or rain, the gradient centred on the sun with 0 at ±75°, the two tones, the compass period), `hooks.useTreeCover`.
  - Browser (`vite preview`, Playwright headless at 390 × 844 at 3× and 1280 × 720, BigDataCloud and the forecast stubbed (clear), real terrain tiles and land cover, clock fixed): Ravensburg 47.78, 9.61 on 13 Oct 2026 at 13:30 (amber tint, no rim), 17:55 (rim, golden tone), 18:33 (rim, evening tone) and 21:45 (no rim); compass mode facing 275° at 17:55. The sentinels stand where the lookbook's V6 has them (the crowns in the east, the two spruces on the peaks, the small trees in the west); the rim is brightest at the sun and fades out to each side. No console errors from this item.
  - Frame time (compass mode, phone, 4× CPU throttle, 17:55, a 20° sweep with one 1° step per frame for 6 s, 3 runs each, one after the other): main p95 29–31 ms and 608–640 ms/s scripting; this item p95 27–32 ms and 618–643 ms/s. The same within the noise of the runs. A first version that built the whole layout for each heading cost about 40 ms/s more; hence the plan. `scripts/perf-trace.mjs` uses a flat terrain tile, so it draws no trees; not run.
  - Not checked: a real phone.

### 151. Rotating the phone: no black screen — S — [SUN-CHASER-1W](https://ainabler.sentry.io/issues/SUN-CHASER-1W) — **✅ Done**

- **Feedback (2026-10-13 18:35 CEST, Ravensburg):** "While changing from portrait to landscape the app has a black screen for several seconds".
- **Now:**
  - The body background is near-black `#0F1016` (`bg-brand-night`, `index.css`; also the manifest and `index.html`). Until the scene draws its first frame at the new size, this colour fills the screen.
  - A rotation fires `resize` (no debounce; Android often fires several as the system bars settle). Each one:
    - `SkyClouds`: the layout key has `${width}x${height}`, so a rotation builds a new cloud layout (each cloud with a CSS `blur()`), and the old layout stays and cross-fades for 3 s (`LAYOUT_FADE_MS`): two blurred layouts at once.
    - `SunVisualization`: new container size, so the sea path, the terrain and the trees are built again.
    - `SeaCanvas` reallocates two canvases (up to 2× pixel density) and its mirror canvas. `NightStars` and `RainCanvas` reallocate theirs. `Fireworks` resizes its canvas with no cap on the pixel density.
  - `use-mobile` changes at 768 px, which moves the radio.
  - At 18:35 the sunset fireworks may have run (Ravensburg sunset ≈ 18:35).
- **Spec:**
  1. Measure first: `scripts/perf-trace.mjs` with a rotation from 390 × 844 to 844 × 390 at 4× CPU throttle (time to the first frame, long tasks), before and after.
  2. The body background follows the sky: `SunTracker` sets a CSS variable with the top colour of the current sky gradient, and `body` uses it. A missing frame then shows sky colour, not black.
  3. A size change swaps the cloud layout at once, without the 3 s cross-fade (the cross-fade stays for weather and day changes).
  4. One shared `useViewportSize` hook with a 150 ms trailing debounce for `SunVisualization`, `SkyClouds`, `SeaCanvas`, `NightStars` and `RainCanvas`, so the bars settling cause one rebuild.
  5. `Fireworks` caps the pixel density at 2, as `SeaCanvas`.
- **Done when:** the trace shows the first frame at the new size within 500 ms (4× throttle), and no black frame (a dark sky frame is OK).
- **Open:** (a) Pure black, or very dark blue? Also when rotating back? Chrome tab or Play app? (b) Spec 1–5 together, or spec 1 first and then decide?
- **Decision (Lutz, 2026-10-14):** Measure first (spec 1). Decide the fixes from the numbers.
- **Measured (2026-10-14):** headless Chrome, 390 × 844 @3x, 4× CPU throttle, a rotation each way (a scratch script after `scripts/perf-trace.mjs`). The first frame at the new size comes after 70–160 ms; no frame is fully black. React 18 treats `resize` as a discrete event: each `setState` in a resize listener renders at once, with its effects, inside the event, before Chrome can paint the new size. Until then the old portrait frame stays in the landscape viewport, and the rest shows the body colour `#0F1016`. Android fires several resizes while the bars settle, and each one builds the scene again. In one resize task: style recalc 19 ms, React render and commit 17 ms, `SunVisualization` `updateDimensions` 13–21 ms (`clientWidth` forces a layout), the `SeaCanvas` effect 12 ms (new canvases; `toRgb` calls `getComputedStyle`, which forces a style recalc of 8–13 ms), the new `SkyClouds` layout 4–10 ms, `use-mobile` 2–4 ms.
- **Decision (Lutz, 2026-10-14):** spec 2 and spec 4, plus the keyboard: interactive-widget=resizes-visual (the feedback form's keyboard also resizes the screen). Spec 3 and 5 not now.
- **Built:**
  - `useViewportSize` (`src/hooks`), now the only `resize` listener of the app. A `resize` only starts one shared timer again. 150 ms (`VIEWPORT_DEBOUNCE_MS`) after the last one, the timer reads the size of each user and sets its state, so all users change in one render, after Chrome has painted the new size. The same size again gives no render. `SkyClouds`, `NightStars` and `RainCanvas` use the window size (`innerWidth`, `innerHeight`); `RainCanvas` starts its effect again and measures its canvas there. `SunVisualization` gives the hook its container: the hook measures the `h-dvh` box (`clientWidth`, `clientHeight`) at mount and in the timer, not in the event, and not `innerHeight`: with `resizes-visual` the keyboard can make `innerHeight` smaller, but not the box. `SeaCanvas` gets its size from `SunVisualization`.
  - `SeaCanvas` resolves its four colours (crest, trough, ridge, sky) to RGB once and keeps them in a ref, with the colour strings as the key. A resize only makes new canvases; `getComputedStyle` runs again only when a colour changes (time of day, weather).
  - The sky behind the scene: `SunTracker` sets `--sky-top` on `<html>` to the first stop of the scene's sky gradient (after the weather's grey mix, so the value the scene draws). `html` and `body` have `background-color: var(--sky-top, hsl(var(--brand-night)))`: night before the app mounts (the splash, item 39), then the sky. The app sets no `theme-color` at run time, so that meta stays `#0F1016`; the manifest is not changed.
  - The keyboard: `interactive-widget=resizes-visual` in the viewport meta (`index.html`). Chrome Android 108+ already uses `resizes-visual` when the key is missing (Chrome blog, "Prepare for viewport resize behavior changes coming to Chrome on Android"); the key makes it explicit. Nothing in the app needs the layout viewport to get smaller for the keyboard: the place search is at the top of the InfoPanel, and the Sentry feedback form is a dialog with its text field at the top.
- **Checked:**
  - Unit tests: `hooks.useViewportSize` (no render inside the resize event; one render after a burst of 3 resizes; no change at 149 ms, the new size at 150 ms; the same size again gives no render; one listener and one render for two users; the listener and the timer go with the last user; the element variant measures its box, also when only the window gets smaller), `SeaCanvas` (`getComputedStyle` at mount and after a colour change, not after a size change), `SunTracker` (`--sky-top` is the first colour of the scene's gradient and goes on unmount), `tailwind.tokens` (`html, body` use `--sky-top`, night as the fallback), `indexHtml` (the viewport meta has `interactive-widget=resizes-visual` and keeps `viewport-fit=cover`), `SunVisualization` (Santa starts after the debounced measure). Typecheck, lint, build and all 2006 tests (125 files) pass.
  - Rotation, built app, the scratch trace on origin/main and on the branch (390 × 844 @3x, 4× CPU throttle, Ravensburg, 13 Oct 18:30). The resize task: clouds 64 / 62 ms → 21 / 19 ms (P→L / L→P), clear sky 37 / 40 → 19 / 15 ms, burst (3 resizes 150 ms apart) 3 tasks of 55–60 / 34–50 ms → one of 18 / 25 ms. The first frame at the new size (from the rotation): clouds 103 / 102 ms → 59 / 61 ms, clear sky 79 / 88 → 55 / 47 ms, burst 99 / 91 → 64 / 68 ms. On the branch the scene is built again once, about 190 ms after the rotation (two tasks of 15–17 and 30–41 ms; after a burst at about 470 ms); no long task in 5 s (main: one per rotation with clouds, three after the P→L burst). Between the first frame and the rebuild, the old scene stays on the sky gradient at the new size (in landscape without the sea for that time). Screencast frames: no frame with `#0F1016` on the branch. On main, after L→P every frame has a `#0F1016` strip (22 % of the frame) where the page shows its own background (an area of the headless screencast next to the viewport); on the branch the strip has the sky colour.
  - The keyboard, emulated as a height-only resize 390 × 844 → 390 × 500 with the field focused (4× throttle, 14:00): the place search and the feedback form (a build with a test DSN, network stubbed). Main builds the scene inside the resize event; the branch once, 170–190 ms later; no long task on both. The field stays focused and in view, typing works, and the form's Send button stays on screen at 500 px. The page behind the scene is the sky colour (`#0EA5E9`) on the branch, `#0F1016` on main.
  - Not checked: a real phone, the Play app, an iPhone. Headless Chrome has no keyboard, so `resizes-visual` itself was not checked: the emulation makes the layout viewport smaller (as `resizes-content`).

### 152. The sunset countdown: louder, warmer, heard over the radio — M — [SUN-CHASER-1X](https://ainabler.sentry.io/issues/SUN-CHASER-1X), [SUN-CHASER-20](https://ainabler.sentry.io/issues/SUN-CHASER-20) — **✅ Done**

- **Feedback (2026-10-13 18:49 CEST, Ravensburg):** "I still didn't hear the countdown although there was radio playing, so the app had the general permission to send audio. Please check if the audio can be played over the sound of the radio".
- **Feedback (2026-10-14 18:33 CEST, Ravensburg):** "Without the radio I could hear the sunset sound but it was very faint and not really vibing. Can you please analyse and come up with some alternatives".
- **Now (items 43, 98, 108):**
  - The bell toggle is off by default, and the radio does not turn it on. With the bell off, the pill shows a `BellOff` button only in the last 10 s. A tap then is too late: the tones are scheduled 10–11.5 s before the target, so the user gets one check tick and no countdown. This is the most likely cause of 1X; 20 (next day, sound heard) fits a bell saved as on.
  - Sound (`useSunsetCountdown`): ten ticks, each a pure 660 Hz sine of 80 ms, and a "chime" that is one sine stepping 660 → 990 Hz over 1.2 s. Peak gain 0.2 (−14 dBFS), linear fades, straight to `ctx.destination`, no compressor. An 80 ms pure sine is shorter than the ear's loudness window and has no harmonics where phone speakers are loud, so it sounds faint and thin.
  - Radio: a separate `<audio>` element. During the countdown its volume drops to 0.3 × the slider (about −10 dB) in one step. iOS ignores `audio.volume`, so there is no duck on an iPhone.
  - The CD3 toast "Tap to turn on the sunset sound" (item 98) was not built. The unlock listener re-arms only when the bell changes, so after Android suspends the audio context (screen off, a call, Bluetooth) the ticks are silent and nothing tells the user.
- **Spec:**
  1. **A soundbook first:** a private claude.ai page with play buttons, the same Web Audio code as the app, a "radio" loop to test against. Options:
     - **S1 Glass bell:** each tick a bell (partials 1, 2.0, 2.76, 5.4), notes rising on a pentatonic scale (E5 → D6), 0.6–0.9 s decay; at T0 an E5 + B5 + E6 chord, 3 s.
     - **S2 Kalimba or marimba:** each tick a pluck (fundamental, a partial at × 3.9 or × 5.9, a 2 ms click at 3 kHz), 300 ms; at T0 an A-major-9 chord strummed 60 ms apart.
     - **S3 Swell and singing bowl:** a pad rises over the 10 s (3 detuned voices, a low-pass opening from 600 Hz to 3 kHz) with soft plucks for the count; at T0 a singing bowl (beating partials, 6–8 s).
     - **S4 A bundled sound:** a CC0 bowl or kalimba file (about 150 kB, −14 LUFS) from the app's own origin.
  2. **Louder, the same for every option:** all cues through one master bus (gain 0.7 → `DynamicsCompressor` −18 dB, 4:1) to a peak of 0.6–0.8; each tone ≥ 250 ms; fundamentals 400–1000 Hz.
  3. **Duck deeper and softer:** from T−11 s the radio goes to 0.1 × the slider over 300 ms, and back up over 1 s after the last note.
  4. **The bell when the radio plays:** (B1) the bell is on by default; or (B2) starting the radio turns the countdown sound on (the radio tap unlocks the audio); or (B3) at T−60 s with the bell off, a toast "Hear the sunset countdown?" with the bell.
  5. **Fail visibly (CD3):** with the bell on, if the audio context is not running at T−60 s, a toast "Tap to turn on the sunset sound"; any tap resumes it.
  6. Optional: `navigator.vibrate(30)` on each tick (Android).
- **Check:** `hooks.useSunsetCountdown` tests (the master bus and the peak; the tones of the chosen option scheduled at the right times; the duck ramp from T−11 s and back; the toast at T−60 s when the context is suspended). Phone check: audible over the radio at slider 0.5 and 1.0, and without the radio (ROADMAP Verification item 43).
- **Open:** (a) Soundbook first? Which options in it? (b) B1, B2 or B3? (c) Vibration?
- **Decision (Lutz, 2026-10-14):** A soundbook first with S1–S4. B2: starting the radio turns the countdown sound on. Spec 2 (master bus), 3 (deeper duck) and 5 (CD3 toast) are built in any case. Vibration (spec 6) not now.
- **Decision (Lutz, 2026-10-14, soundbook):** S3, the swell and singing bowl.
- **Built (part 1, 2026-10-14):** spec 2, 3, 4 (B2) and 5. The tones keep their shape and frequencies (660 Hz ticks of 80 ms, the 660 → 990 Hz chime) until the soundbook decides the sound; "each tone ≥ 250 ms" of spec 2 comes with it.
  - Master bus (`useSunsetCountdown`): one per `AudioContext` (a `WeakMap`), gain 0.7 → `DynamicsCompressor` (threshold −18 dB, knee 6 dB, ratio 4, attack 3 ms, release 150 ms) → the speakers. Every tick, the chime and the bell's check tick go through it; the rain sound does not. The knee is set to 6 dB: with the default 30 dB knee the compressor barely acts at −18 dB. Tone peak 2 (was 0.2), so 1.4 into the compressor: output peak 0.675 (ticks) and 0.669 (chime) in Chrome with an `OfflineAudioContext`, 0.69 in the app (an analyser after the compressor). That is about +11 dB over the old 0.2.
  - Duck (`MusicPlayer`): `DUCK_FACTOR` 0.3 → 0.1. From the scheduling at T−11 s the radio's `audio.volume` ramps to 0.1 × the slider over 300 ms, and back to the slider over 1 s when the tones end (an interval in 50 ms steps, linear, from the level it has at that moment). The rain sound ducks to 0.1 × with its own 3 s ramp. iOS still ignores `audio.volume`.
  - B2: the radio's play tap (`onPlay`) turns the bell on and saves it (`sunset-countdown`), also when the user turned it off before. The tap starts the `AudioContext` without the check tick: the stream starts at the same moment, and a beep before the music would sound like an error. Pause does not change the bell.
  - CD3: with the bell on, live time and the page visible, if the `AudioContext` does not run from T−60 s to T−11.5 s, one toast per target: "Tap to turn on the sunset sound" (`scene.countdownTapToHear`, 5 languages). It stays until the tap or the target. While the bell is on, every `pointerdown` and `pointerup` anywhere starts a suspended context (was once, re-armed only when the bell changed) and closes the toast. `pointerup` because a touch gives the page its user activation only at `pointerup`.
- **Checked:** `hooks.useSunsetCountdown` (one bus and one compressor with the settings above, every tone and the check tick into it, the peak into the compressor; 11 tones 1 s apart, T0 10.7 s ahead; the radio tap's prime plays no tick; every tap starts a suspended context, also after a later suspend; the toast at T−60 s when suspended, also after a late page open, closed by the tap; no toast when running, with the bell off, in a preview, with the page hidden or after T−11 s), `MusicPlayer` (the 300 ms ramp to 0.05 at slider 0.5, the 1 s ramp back, a duck that ends early ramps up from its level; play calls `onPlay`, pause does not), `SunTracker` (the radio turns the bell on without a check tone, also after the user turned it off, and the countdown then plays). Typecheck, lint, build and all 1892 tests pass. Built app (`vite preview`, headless Chrome, 390 × 844, touch, Ravensburg 2026-10-14, 72 s before the 18:37:51 sunset, network stubbed): bell saved on, no tap: no `AudioContext`, the toast at T−60 s; a tap starts the context and closes the toast; the pill shows "Sunset in 10 s"; one compressor (knee 6 dB), 11 oscillators 1 s apart, the chime at the sunset ± 5 ms, output peak 0.69. Bell off: the radio tap turns it on (`sunset-countdown` = on, the context runs, no tick); `audio.volume` goes 0.5 → 0.05 in about 300 ms from T−10.8 s and back to 0.5 in about 1 s after the chime. Not checked: a real phone (audible over the radio at slider 0.5 and 1.0, iOS without the duck); the sound design (soundbook).
- **Built (part 2):** S3 of the soundbook, ported as it is (`playSwellBowl` in `useSunsetCountdown`). It replaces the 660 Hz ticks and the 660 → 990 Hz chime.
  - Sound: from T−10 s a pad of three sawtooth voices (A4 −7 cents, E5, A4 +7 cents) through a low-pass that opens from 600 Hz to 3 kHz (exponential) at T0. The pad's gain rises from 0 to 0.12 at T0 and then falls (time constant 0.5 s); its voices stop at T0 + 3 s. From T−10 s to T−1 s one pluck per second: A5 (880 Hz, peak 1.5, 0.7 s) and its third harmonic (2640 Hz, peak 0.225, 0.2 s), 3 ms attack, exponential decay. At T0 the bowl: four modes of A4 (× 1, 2.71, 5.15, 8.21; 7, 5, 3 and 1.6 s), each a pair of sines 0.8–3.4 Hz apart that beat. 31 oscillators in all.
  - Level: every voice goes through the master bus of part 1, with the gains of the soundbook. Output peak in Chrome (`OfflineAudioContext`): plucks 0.60–0.64, the bowl 0.72–0.73.
  - Stop: each countdown has one output gain into the bus. Toggle off, a preview or unmount ramps it from 1 to 0 over 80 ms and stops every oscillator at the end of the ramp, also the pad, the bowl and the voices still to come (a voice stopped before its start time does not play).
  - Check sound: the bell tap (`primeCountdownAudio`) plays one S3 pluck (2 oscillators) through the bus. The radio's play tap still plays none.
  - Duck: `isSounding` ends 3 s after T0 (was the end of the chime, T0 + 1.2 s). At that time the pad has stopped and the bowl is about 30 dB below its start (output RMS −10 dBFS at T0, −28 dBFS at T0 + 2 s, −46 dBFS at T0 + 3 s). The radio then comes back over 1 s, over the quiet tail of the bowl. With 2 s, the bowl would still be clearly audible when the radio is back at full volume.
- **Checked:** unit tests: `hooks.useSunsetCountdown` (31 voices: the pad from T−10 s to T0 + 3 s, the 10 plucks 1 s apart with their harmonic, the 8 bowl voices at T0 ± 5 ms with their frequencies and lengths; the low-pass 600 Hz → 3 kHz and the pad gain 0 → 0.12, then the fade; every voice through one output, one bus and one compressor; the peak into the compressor for each cue (pluck 1.21, bowl 1.17) in the range that Chrome makes 0.6–0.8; toggle off, a preview and unmount ramp the output to 0 over 80 ms and stop all 31 oscillators; the check pluck; `isSounding` until T0 + 3 s), `SunTracker` (the check pluck is 2 voices; the countdown is 31 voices, the plucks 1 s apart, the bowl at T0). Typecheck, lint, build and all 1915 tests pass. Built app (`vite preview`, headless Chrome, 390 × 844, touch, Ravensburg 2026-10-14, 70 s before the 18:37:51 sunset, network and BigDataCloud stubbed): a tap starts the context; the pill shows "Sunset in 10 s"; 31 oscillators: the pad at T−10 s, the plucks from T−10 s to T−1 s 1 s apart, the low-pass 600 Hz at T−10 s → 3 kHz at T0, the bowl (440, 440.8 … 3615.8 Hz) at the sunset + 0.2 ms; the fireworks at T0; output peak 0.75 (an analyser after the compressor). The app's countdown rendered in an `OfflineAudioContext` (the app's code builds the graph): output peak 0.73, plucks 0.64, silent after T0 + 8 s. Radio: `audio.volume` 0.5 → 0.05 from T−10.8 s in 250 ms, back up from T0 + 3.2 s to 0.5 at T0 + 4.1 s. Bell off at T−5 s: silent from 150 ms after the tap, the bowl does not play. Not checked: a real phone, the sound over the radio on a phone.

### 153. Data sources in the app, not only on the privacy page — S — [SUN-CHASER-1Y](https://ainabler.sentry.io/issues/SUN-CHASER-1Y) — **✅ Done**

- **Feedback (2026-10-13 22:07 CEST, Ravensburg):** "Open street map contribution only in the privacy page".
- **Now:**
  - "© OpenStreetMap contributors" shows in `InfoPanel` only when the place name came from Photon (item 137).
  - Open-Meteo and adsb.lol (ODbL) are named only on the privacy page; the live plane card's "Data: adsb.lol" line was removed (item 111, "the privacy page only"). Mapzen / AWS Terrain Tiles and ESA WorldCover show only in the line-of-sight details. CelesTrak is named nowhere.
  - The app has no link to the privacy page.
  - Licences: ODbL (OSM, adsb.lol) asks for a credit where the data is shown, linked to the licence; Open-Meteo and ESA WorldCover are CC BY 4.0 (credit required). A privacy page that the app does not link is probably not enough.
- **Spec:**
  1. A "Data" row at the end of the expanded panel (after Feedback): "Weather: Open-Meteo · Places: © OpenStreetMap contributors · Planes: adsb.lol (ODbL) · Satellites: CelesTrak · Terrain: Mapzen/AWS · Trees: ESA WorldCover", each a link, plus a "Privacy" link to `/privacy`. Small, muted text.
  2. Under the "Live planes" switch, while it is on: "Data: adsb.lol (ODbL)".
  3. The Photon line (item 137) stays.
  4. The privacy page lists CelesTrak.
  5. Keys in 5 languages (the names stay as they are).
- **Check:** `InfoPanel` test: the row and its links; the adsb.lol line only with the radar on. `i18n.test`.
- **Open:** (a) A row in the panel (spec 1), or a "Data sources" dialog behind one link? (b) Spec 2 too?
- **Decision (Lutz, 2026-10-14):** A "Data sources" link in the panel opens a dialog with all credits and the privacy link (instead of the row of spec 1). Spec 2 not now. Spec 3–5 stay.
- **Built:**
  - A "Data sources" link (database icon, small and muted like the Feedback row) at the end of the expanded panel, after Feedback. It opens `DataSourcesDialog`: a hand-built modal like `PremiumDialog` (the shadcn dialog would add `@radix-ui/react-dialog`), in a portal to `<body>` (the panel's backdrop blur would hold a `fixed` overlay inside the panel). Escape, the close button and a tap outside close it. Every link opens in a new tab.
  - The list: Weather: Open-Meteo (CC BY 4.0). Places: BigDataCloud · Photon · © OpenStreetMap contributors (ODbL), linked to openstreetmap.org/copyright. Place search: Open-Meteo · GeoNames (CC BY 4.0). Planes: adsb.lol (ODbL). Satellites: CelesTrak. Terrain: Mapzen / AWS Terrain Tiles, linked to the tilezen attribution page (it lists the required source credits). Trees: the ESA WorldCover wording of `TREE_COVER_SOURCE` (CC BY 4.0). Radio: the 10 station names, without links (the list moved from `MusicPlayer` to `utils/radioStreams.ts`). Then "Privacy", a link to `/privacy/`: with the slash, because `vite preview` gives the app shell for `/privacy` and Cloudflare Pages redirects it.
  - 10 new keys `dataSources.*` in 5 languages; the close button uses `collection.close`; the provider names are not translated. Spec 2 not built (decision). Spec 3: the Photon line stays. Spec 4: the privacy page names CelesTrak (Satellite tracking or ISS passes on; the request has no place), "Last updated: 14 October 2026".
- **Checked:** unit tests: `InfoPanel` (the link opens the dialog; the providers and their links, openstreetmap.org/copyright, 3 CC BY and 2 ODbL links, `/privacy/`; the dialog is outside the panel; the close button), `DataSourcesDialog` (every link in a new tab with `noopener noreferrer`; every radio station named, without a link; the French labels; Escape and a tap outside close it, a tap inside does not), `i18n`. Typecheck, lint, build and all 1889 tests (119 files) pass. Built app (`vite preview`, headless Chromium, 390 × 844, Ravensburg, BigDataCloud stubbed, other external hosts blocked): the link at the end of the panel; the dialog (358 × 527 px) fits the screen without scrolling; Escape closes it; the Privacy link opens the policy page in a new tab, with CelesTrak. Not checked: a real phone; `/privacy/` on Vercel and Cloudflare Pages (checked only in `vite preview`).

### 154. ISS passes: the switch moves to satellite tracking — S — [SUN-CHASER-1Z](https://ainabler.sentry.io/issues/SUN-CHASER-1Z) — **✅ Done**

- **Feedback (2026-10-13 22:09 CEST, Ravensburg):** "ISS. Notification icon move to satellite tracking".
- **Now:** the ISS pass reminder is an icon button in the Sunset row, after the sunset reminder's alarm clock (`InfoPanel`, item 97 decision 2026-10-06). The "Satellite tracking" switch is lower in the expanded panel.
- **Spec:**
  1. Remove the icon button from the Sunset row.
  2. Directly under "Satellite tracking": an "ISS passes" row with a `Switch` and the hint `issReminder.toggle`. The same behaviour: `requirePremium`, the notification permission flow, off by default, saved as `iss-pass-reminder`, hidden without the Notification API, works with the tracking off.
  3. No new texts (the `issReminder.*` keys exist).
  4. Tests: `InfoPanel` (the row under the tracking switch; role `switch`), `SunTracker` (`getByRole('switch', { name: 'ISS passes' })`). A note under item 97's decision.
- **Open:** a `Switch` row (spec), or keep the icon button next to the tracking switch?
- **Decision (Lutz, 2026-10-14):** Keep the icon button and move it next to the "Satellite tracking" switch (spec 1, 3, 4; no `Switch` row).
- **Built:** the "ISS passes" icon button (satellite icon with the gold plus) moved from the Sunset row to the "Satellite tracking" row, directly left of the switch (`ml-auto`, 8 px gap). The behaviour does not change: `requirePremium`, the notification permission flow, off by default, `iss-pass-reminder`, hidden without the Notification API, independent of the tracking switch. No new texts. The button shows only in the tracking row (`SunTracker` always gives `onSatelliteTrackingToggle`). A note under item 97's decision.
- **Checked:** unit test `InfoPanel`: the button is next to the tracking switch, in its row, and not in the Sunset row; the gate and the toggle as before. The `SunTracker` ISS tests find the button by its name and pass without a change. Built app (as item 153): one "ISS passes" button, 8 px left of the switch, on the same centre line; none in the Sunset row. Not checked: a real phone.

### 155. Live planes you can see without the compass — S — [SUN-CHASER-21](https://ainabler.sentry.io/issues/SUN-CHASER-21) — **✅ Done**

- **Feedback (2026-10-14 18:33 CEST, Ravensburg):** "There is nearly no cloud coverage but I still can't see any live planes. Is it working correctly?".
- **Now:**
  - The feed works: on 2026-10-14 at 20:20 CEST, `/api/planes` for Ravensburg answered 200 in 1.6 s with 27 aircraft within 100 km.
  - Without the compass the screen shows all 360°, so a plane moves very slowly on a phone. Item 110 shows only the 2 nearest planes that move ≥ 1 px/s (`MIN_SCREEN_SPEED_PX_S`, `MAX_NORMAL_PLANES`). Its decision note: only 4.2 % of the planes qualify on a phone, "so on a phone the radar often shows 0 or 1 plane without the compass". This is the most likely cause.
  - With the radar on, the decorative planes stop (`CloudLayer`), so the sky is empty.
  - Planes below 5° elevation or behind the terrain are hidden (`MIN_ELEVATION_DEG`). Near sunset they are 11–18 px dark silhouettes against a bright sky.
  - A failed fetch is silent (`useLivePlanes`): no toast, no count, no Sentry tag. The feedback event cannot tell if the switch was on.
- **Spec (options):**
  - **P1 Always 2:** without the compass, show the 2 nearest visible planes; the ones that move ≥ 1 px/s come first, but a slow one is shown when there is no other. (Partly reverses item 110's "don't hang static in the air".)
  - **P2 Keep the decor:** when no live plane is shown, the decorative planes fly as before.
  - **P3 A status line** under the "Live planes" switch: "27 nearby · 0 in view · the compass shows all", or "Live radar unavailable" after a failed fetch.
  - **P4 Sentry tag** `live-planes` = `off` | `ok-<shown>/<nearby>` | `error`, as the `place` tag (item 137).
  - **P5 Easier to see:** a soft light outline around a plane silhouette against a bright sunset sky.
- **Check:** `utils.liveRadar` tests for the chosen rule; `InfoPanel` test for the status texts; `useLivePlanes` test for the error state and the tag. Browser with a stubbed feed at 390 × 844 at sunset.
- **Open:** (a) Which of P1–P5? (b) P1: 2 planes, or 1?
- **Decision (Lutz, 2026-10-14):** P2, P3 and P4. P1 and P5 not now.
- **Built:**
  - The count: `LivePlanes` reports the number of planes it draws (the result of `pickShownPlanes`) with `onShownChange`, only when the number changes, and 0 when the layer goes away (fog, overcast, rain, a storm). `SunTracker` keeps it (`liveShown`) and passes it to `SunVisualization` and `InfoPanel`.
  - P2: `CloudLayer`'s `livePlanes` is true only while one or more live planes are drawn (`SunVisualization`: the radar is on and `livePlanesShown > 0`). Then `spawnTick` starts no decorative plane, and the ones in flight fly on (before, they were taken away at once). With the radar on and no live plane drawn, the decorative planes fly as before.
  - P3: `useLivePlanes` returns `{ state, status }`. `status` (`LiveStatus` in `liveRadar`) is `loading` until the first answer after the switch goes on (or after a move to another 0.1° cell), then `ok` or `error` by the last request. An HTTP error, no network or an answer without an aircraft list is `error`. The last answer still stays for up to a minute.
  - `InfoPanel` shows a line under the switch while the switch is on and the radar runs (`liveRadarStatus`): "Looking for planes…"; "27 nearby · 0 in view", plus "· the compass shows all" when fewer are drawn than nearby, compass mode is off and the compass button shows (`compassStatus` `idle`); "Live radar unavailable" after a failed request. Nearby: the aircraft in the last answer. Keys `radar.loading`, `radar.status`, `radar.compassAll` and `radar.unavailable` in 5 languages.
  - P4: `getLivePlanesTag` (`liveRadar`, pure) gives `off`, `loading`, `error` or `ok-<shown>/<nearby>`. `SunTracker` sets the Sentry tag `live-planes` when the value changes, not on each tick. `off` while the radar does not run (switch off, Premium locked, no place yet, time preview). The tag holds no coordinates.
  - **Deviations:** (1) The tag also has `loading` (the spec lists `off`, `ok` and `error`): the 1–2 s before the first answer. (2) The compass hint shows only when the compass button shows. Without a compass (`unsupported` or `unavailable`) the hint would point to a button that is not there.
- **Checked:** unit tests: `hooks.useLivePlanes` (loading until the first answer, then ok; error after a 502, no network or a broken answer, and ok again after an answer; loading again after off and on), `utils.liveRadar` (the tag values), `LivePlanes` (the count goes up when it changes, not on each tick; 0 in the 360° view for still planes, with the radar off and in fog), `CloudLayer` (no decorative plane starts while a live plane shows; the one in flight stays; the next one comes when none shows), `SunVisualization` (radar on with 0 shown: a decorative plane after 20 s; with 1 shown: none), `InfoPanel` (the texts, the hint rule, no line while the switch is off or the radar does not run), `SunTracker` (tag `off` → `loading` → `ok-0/2` and back to `off`; `error` and "Live radar unavailable" after a 502). Typecheck, lint, build and all 1893 tests (118 files) pass. Built app (`vite preview`, headless Chromium, 390 × 844, Ravensburg on 16 Sep 2026 at 14:00, BigDataCloud and `/api/planes` stubbed, each answer 1.5 s late, `?plane=none`): with 27 aircraft at 40–100 km, "Looking for planes…", then "27 nearby · 0 in view · the compass shows all", 0 live planes and decorative planes at 20 s and 40 s; with one more plane 5 km away at 3 km, "28 nearby · 1 in view · the compass shows all", 1 live plane and no decorative plane in 45 s; with a 502, "Live radar unavailable" and decorative planes at 15 s and 35 s. Not checked: a real phone, the live feed, the look at sunset (P5 is not built).
- **Open:** in fog, overcast, rain or a storm no live plane shows, but the line still adds "· the compass shows all", and the compass does not help then.

### 156. Sunset countdown and fireworks: today's sunset stays the target until it is over — S — [SUN-CHASER-25](https://ainabler.sentry.io/issues/SUN-CHASER-25) — **✅ Done**

- **Feedback (2026-10-15 18:33 CEST, Ravensburg):** "Today no Sunset countdown and no firework was triggered".
- **Now:**
  - `SunTracker` computes the line-of-sight sun times for `sunPassDay = passTimes?.sunrise ?? date`. `passTimes` comes from `getSunArcLabels` → `findSunPass` (`sunUtils`), which ends the day's pass when the geometric altitude (suncalc, no refraction) reaches 0°. It is evaluated again each minute.
  - In Ravensburg on 2026-10-15 the geometric altitude is 0° at 18:29:41, so the pass changes at the 18:30 tick. From then on `terrainSunTimes` holds the times of 16 October. The flat sunset was 18:35:56; a line-of-sight horizon below about 0.65° gives a sunset after 18:30.
  - `getCountdownTarget` and `getNextSunEvent` (`sunEvents`) use the line-of-sight sunset before the flat one, so both go to 16 October. `watchSunEvent` arms tomorrow's sunrise before today's sunset is over: no fireworks, and no "fired" or "skipped" breadcrumb.
  - The panel's Sunset row also goes to tomorrow about 6 min before the sunset.
  - The bug is from 19c7575 (2026-09-28, audit C-17), not from the last updates. The weather gates (#210), item 151 and item 152 do not touch the targets (checked in the diffs). The `SunTracker` tests run without a horizon profile, so the switch is not tested.
- **Spec:** the pass of today stays until today's line-of-sight sunset is over (the flat sunset when there is no profile). Only then do the pass, the panel and the targets go to the next day.
- **Check:** a `SunTracker` test with a mocked flat horizon profile that ticks through the sunset (Ravensburg, 2026-10-15) and expects the countdown pill and the fireworks trigger; `utils.sunUtils` / `utils.sunEvents` tests for the switch time. Polar day and polar night keep their behaviour.
- **Decision (Lutz, 2026-10-15):** switch the day after the sunset.
- **Built:**
  - `findSunPass` (`sunUtils`) has a new optional argument `sunset`. When the sun is below 0° and that sunset is still ahead, the pass that set last stays: its rise and its 0° set do not change. The pass changes only after the sunset. Without the argument, the sunset is the flat sunset (SunCalc) of the solar day around the time. At polar day and polar night there is no flat sunset and no 0° crossing, so the pass stays null as before. A sunset 12 h or more after the last set belongs to the coming pass (the morning), so it does not keep the last pass.
  - `getSunArcLabels` (`arcLabels`) gives `sunset` to `findSunPass`. All rise and set times of the sun go through these two functions: the panel, the arc labels, the arc and `sunPassDay`, from which `SunTracker` computes the line-of-sight times for the countdown and the fireworks.
  - `SunTracker` computes the line-of-sight sunset of the solar day (`lineOfSightSunset`, from the solar noon of `sunTimes`) and gives it to `getSunArcLabels` for the panel. It is a separate memo: `terrainSunTimes` comes from the pass day, so it cannot choose the pass. `SunVisualization` gives `terrainSunTimes.sunset` to its arc labels. Until the sunset this is the same day, so the panel and the arc labels agree.
  - `getSunPathAround` (the arc) and the solstice fan use the flat sunset, without the line-of-sight one. The arc is computed again only each hour, as before.
- **Checked:**
  - Measured (Ravensburg, 2026-10-15): the 0° set is at 18:29:42 CEST and the flat sunset at 18:35:56. Before the fix the pass changed at 18:29:42, so at the 18:30 tick. Over a flat 0° profile the line-of-sight sunset is 18:34:49; over a horizon 0.3° below the flat one it is 18:37:04. After the fix the pass changes at the first tick after the flat sunset, or after the line-of-sight one.
  - Unit tests: `utils.sunUtils` (today's pass at 18:31; the switch within 5 s after the flat sunset, and after a given line-of-sight sunset; in the morning the coming pass; null at polar day and polar night with a sunset), `utils.arcLabels` (today's rise and set until the sunset, also with a line-of-sight sunset after the flat one), `SunVisualization` (the set label stays today's between the flat and the line-of-sight sunset), `SunTracker` (a flat 0° profile from the terrain cache: the app opens before the 0° set, the clock goes past it, and the pill shows "Sunset in 7 s" before the line-of-sight sunset, the fireworks start after it, and the next minute tick moves the line-of-sight times to 16 October). Before the fix all of these failed, except the morning and polar tests (guards). Typecheck, lint, build and all 2027 tests (125 files) pass.
  - A scan of 2026 in 7-min steps (Ravensburg, Tromsø, lat 78, Sydney): the kept pass ends at most 7 min before the time in Ravensburg and 6 min in Sydney, up to 1 h near the polar edges; the flat sunset was always still ahead. About 0.03 ms per call.
  - Not checked: a real phone, the live app at sunset, a real horizon profile.

### 157. Hidden controls: a double tap reaches the scene again — S — [SUN-CHASER-22](https://ainabler.sentry.io/issues/SUN-CHASER-22) — **✅ Done**

- **Feedback (2026-10-15 17:58 CEST, Ravensburg):** "Now after the last update, items that are behind controls are not double tappable anymore - please find a solution for all of the needed cases".
- **Now:**
  - Item 147 T2 (PR #200): while the controls are hidden, a window capture `click` in the box of a hidden control (`TopLeftButtons`, `InfoPanel`, `MusicPlayer`; `data-idle-control`) shows the controls and stops the tap. The scene thing below gets no first tap.
  - The second tap comes before `TAP_READY_MS` (400 ms), so it reaches the thing, but only as a first tap. A third tap lands on the control. A double tap there is not possible, and the 7-tap eggs cannot count.
  - Before item 147, hidden controls let all taps through (items 132, 136).
  - With the controls shown, they cover the things below them. This was always so (not part of this item).
  - #215 added tappable satellite dots in the top sky, where the `InfoPanel` is, so this case is more frequent.
  - Things often below a control: the sun, the moon, satellites, planes, sun dogs and halo, the UFO (`InfoPanel`); boats, fish, birds, the terrain (`MusicPlayer`).
- **Spec:**
  - While the controls are hidden, a tap on a scene thing (`[data-scene-hit]`) in a hidden control's box goes to the thing, as before item 147. A double tap opens its card, and an egg counts the tap.
  - A single tap on the thing shows the controls (T1: after `DOUBLE_TAP_MS`, if no second tap comes).
  - A tap on the empty sky in the box shows the controls at once (T2, as now).
- **Check:** `SunTracker` tests: with the controls hidden, a double tap on the sun in the box of the top-left buttons opens its card, and the controls stay hidden; a single tap there shows them after 350 ms; a tap on the empty sky in the box shows them at once. The item 147 test that expects the swallowed tap changes.
- **Decision (Lutz, 2026-10-15):** only while the controls are hidden, and a single tap there shows the controls. The pass-through of shown controls is not now.
- **Built:** T2 (`SunTracker`, the window capture `click` of item 147) now stops only a tap on the empty sky in the box of a hidden control, and shows the controls at once. A tap on a scene thing (`[data-scene-hit]`) in the box goes on to the thing, as before item 147: a double tap opens its card and collects, the eggs count the tap, and a single tap shows the controls by T1 after `DOUBLE_TAP_MS`. The second tap of a double tap also reaches the thing: the T1 toggle waits, so the controls are still hidden. Shown controls cover the things below them, as before.
- **Checked:** `SunTracker` tests in fullscreen, with the box of the top-left buttons mocked: while hidden, a double tap on the sun in the box (200 ms apart) opens its card and the controls stay hidden; a single tap there shows them after 350 ms (not at 349 ms); shown, after a 1.5 s pause, the same tap hides them after 350 ms; a tap on the empty sky in the box shows them at once; a toast on top of the hidden box keeps its tap. These tests replace the item 147 test that expected the swallowed tap. Phone emulation (Playwright, headless Chromium, 390 × 844, touch, production build, installed app with `display-mode: fullscreen` stubbed, BigDataCloud stubbed before the load and every other host blocked, Ravensburg on 21 June 2026 at 13:20, the sun under the box of the hidden `InfoPanel`): a sky tap hid the controls; a double tap on the sun in the box (133 ms apart) opened its card and the controls stayed hidden; the sky tap that closed the card kept them hidden; a single tap on the sun in the box showed them 353 ms after the click; a tap on the empty sky in the box showed them 1 ms after the click. Typecheck, lint, build and all 2029 tests (125 files) pass. Not checked: a real phone, the Play app and an iPhone home-screen app; browser fullscreen on a phone; things under the `MusicPlayer` (boats, fish).
- **Open:** the badge toast of a new badge (top, 4 s) lies over the box of the `InfoPanel` and keeps its taps (item 147 rule). After the first card of a thing there, a tap on the thing goes to the toast until it is gone.

### 158. Sun and moon: one tap, two taps, seven taps — S — [SUN-CHASER-24](https://ainabler.sentry.io/issues/SUN-CHASER-24) — **✅ Done**

- **Feedback (2026-10-15 18:05 CEST, Ravensburg):** "7 tap of sun or moon shouldn't trigger the panel on and off".
- **Now:**
  - The sun (sunglasses) and the moon (disco) count 7 taps with gaps of at most 1500 ms (`registerSunTap`, `SUN_TAP_GAP_MS`, `hiddenEggs`). Each tap also goes to `useDoubleTap` and to the item 147 T1 toggle.
  - Slow taps (gaps of 350–1500 ms): each tap starts the 350 ms toggle and no second tap stops it. The 7 taps flip the controls 7 times.
  - Fast taps (gaps under 350 ms): taps 2, 4 and 6 open the card, and taps 3, 5 and 7 close it on `pointerdown`. The tap that closes a card returns (`downClosesCardRef`) before the pending toggle is stopped, so the toggles of taps 4 and 6 still run. This is so for 4 or more fast taps on any scene thing.
- **Spec (Lutz):**
  - A sequence is taps on the same body with gaps of at most `SUN_TAP_GAP_MS`.
  - 1 tap: shows or hides the controls (after `DOUBLE_TAP_MS`, as T1).
  - 2 taps (the second within `DOUBLE_TAP_MS`): the info card.
  - Taps 3–6: nothing. No toggle, and the card stays as it is.
  - Tap 7: the egg.
  - Only the first tap of a sequence can toggle the controls. With slow taps, tap 1 toggles and taps 2–6 do nothing.
  - The tap that closes a card also stops a pending toggle (for all scene things).
- **Check:** `SunTracker` tests in fullscreen: 7 fast taps and 7 slow taps on the sun and on the moon give the egg, and the controls change at most once (only from tap 1 of a slow sequence); 1 tap toggles; 2 fast taps open the card and do not toggle; 4 fast taps on a cloud do not toggle.
- **Decision (Lutz, 2026-10-15):** "single tap on the sun, shows/ hides controls, double tap shows info, 3-6 tap does nothing, 7 easter egg".
- **Built:**
  - The sequence: `handleSunTap` and `handleMoonTap` (`SunTracker`) keep the last sun or moon tap in `bodyTapRef`: the click, the button and the egg count of `registerSunTap`. The count is the place of the tap in its sequence (gaps of at most `SUN_TAP_GAP_MS`). After the egg the count starts again.
  - The toggle: T1 starts no toggle for a sun or moon click with a count other than 1. Tap 1 toggles after `DOUBLE_TAP_MS`, and a fast tap 2 stops it, as before.
  - The card: `onSunTap` and `onMoonTap` (`SunVisualization`) now get the click and return true only for taps 1 and 2. For taps 3 to 7 the button does not call `useDoubleTap`, so no card opens. A window capture `pointerdown` (in all modes) stops the pointerdown of taps 3 to 7 on the same button before `SceneInfoCard`'s outside close, so the card of tap 2 stays. It is the same card, and its 15 s timer runs on.
  - All scene things: the tap that closes a card now also stops a pending toggle (T1 stops it before the `downClosesCardRef` return).
  - **Deviations:** (1) A double tap within 1.5 s after a single tap is tap 2 and tap 3 of a sequence, so it opens no card. A pause of 1.5 s starts a new sequence. (2) Tap 7 also keeps the card (the spec does not say). (3) Tap 8 is tap 1 of a new count (`registerSunTap`) and can toggle. (4) The check "4 fast taps on a cloud" passed before the change: the bug needs a 5th tap that closes the card of tap 4 while the toggle of tap 4 waits. The test uses 5 fast taps on a fish (the `SunTracker` test scene has no cloud with a card).
- **Checked:** `SunTracker` tests in the installed app (no 3 s hide): 7 fast taps (200 ms) on the sun and on the moon give the card at tap 2, the same card through tap 7, the egg (sunglasses, disco) and no change of the controls; 7 slow taps (600 ms) give no card, the egg and one change (tap 1); 1 tap toggles after 350 ms (not at 349 ms); 2 fast taps open the card and do not toggle; 5 fast taps on a fish open and close its card and do not toggle. `SunVisualization`: a sun or moon tap whose handler returns false opens no card (double tap and keyboard click), and the handler gets the button as `currentTarget`. Changed tests: item 116 "the sun still counts 7 taps" now expects the card of the double tap to stay; item 116 "one tap opens no card" waits 1.6 s before its double tap; the direct `onSunTap` and `onMoonTap` calls give a click. Phone emulation (the item 157 setup, Ravensburg on 15 October 2026 at 13:00, the sun at 34°): 7 taps 162–167 ms apart on the sun: the card mounted 19 ms after tap 2 and stayed the same up to 1 s after tap 7, sunglasses at tap 7, no change of the controls; 7 taps 616 ms apart: the controls hid 352 ms after tap 1 and did not change again, no card, sunglasses at tap 7. Typecheck, lint, build and all 2029 tests (125 files) pass. Not checked: the moon in the browser, a real phone, the Play app, an iPhone home-screen app, a mouse.
- **Open:** with slow taps on the sun or the moon under a control, tap 1 shows the controls, and from 400 ms after the show (`TAP_READY_MS`) they cover the body, so slow taps there cannot reach 7. Fast taps can. Shown controls cover things by Lutz's item 157 decision.

### 159. Live planes: fade in and out, and a size that follows the distance — M — [SUN-CHASER-23](https://ainabler.sentry.io/issues/SUN-CHASER-23) — **✅ Done**

- **Feedback (2026-10-15 18:03 CEST, Ravensburg):** "Planes sometime just plop of the screen, they should slowly fade in or out and also get bigger and smaller depending on the flight direction".
- **Now:**
  - Without the compass, `pickShownPlanes` (`liveRadar`) picks the 2 nearest visible planes that move at least 1 px/s, again on each 250 ms tick, with no memory of the last pick. A third plane that comes nearer, or a speed near 1 px/s, swaps a plane at once. The Sentry tag was `ok-2/69`.
  - `LivePlanes` renders the planes with `key={ac.hex}`. A plane that is not picked, is not in an answer, goes below 5° or behind the ridge, or is older than 60 s unmounts in the same render. Only its trail fades. The weather gate unmounts the whole layer. A new plane shows at full opacity on its first frame.
  - The size: `getLivePlaneWidth` goes from 18 px (20 km or nearer) to 11 px (100 km) by the ground distance, in whole px, with no transition. At 450 kt this is about 1 px per minute, so the size change is not visible.
  - `slantDistanceM` and the view 1 s later (`getShown`) give the closing speed. `speedKt`, `track` and `altM` are in the feed.
  - The decorative planes enter and leave off the screen edges, so they do not plop. The weather gate takes them away at once (`CloudLayer`, `planes = []`).
- **Spec (options for the lookbook):**
  - **Stickier pick:** a shown plane stays while it is visible; its speed limit drops to about 0.6 px/s; a new plane replaces it only when it is about 25 % nearer.
  - **Fade:** a new plane fades in; a leaving plane flies on (dead reckoning) and fades out, then goes. The same for the weather gate, the 60 s stale drop and the switch. Lengths to pick in the lookbook.
  - **Size from the slant distance:** a scale that grows while the plane comes nearer and gets smaller while it flies away, smoothed per plane, as a `transform: scale()` on a wrapper. Ranges to pick in the lookbook.
  - Reduced motion: no fade and no smoothing.
- **Decision (Lutz, 2026-10-15):** a lookbook first.
- **Lookbook:** https://claude.ai/artifact/QmnhwPPAem2fvE6Vos8z8Y (F0–F3 fade, Z0–Z3 size, S0/S1 pick, a combined tile; private).
- **Decision (Lutz, 2026-10-15):** F3, Z3 and S1.
- **Built:**
  - F3, a new plane: it comes out of a soft haze over 3 s. Its opacity is a CSS animation (`animate-plane-fade-in`: the `fade-in` keyframes on the smoothstep curve, `cubic-bezier(0.33, 0, 0.67, 1)`, the lookbook's `ease`). Its blur goes from 1.4 px to none on the same curve, set by the 4 Hz clock (`getHazePx`). An animated blur repaints the plane in each frame: a first build with the blur in the keyframes cost +40 ms/s of paint on the throttled phone (below).
  - F3, a plane that leaves: dropped from the pick, missing from an answer, below 5° or behind the terrain, the radar switched off, or the stale answer dropped after 60 s. It flies on from its last data (`Flight`: the aircraft, the lag and the time of its answer) and fades out over 4 s (an opacity transition on its wrapper, no blur). It takes no tap, `onShownChange` does not count it, and it goes after 4 s. Its trail goes on while it fades, as in the lookbook. A plane that comes back while it fades out fades in again over 3 s, with no new haze.
  - The weather gate: `SunVisualization` keeps `LivePlanes` mounted in all weather and passes `skyOpen` (`isPlaneWeather`). When the sky closes, the whole layer (planes and trails) fades out over 4 s, with no taps and a count of 0. Then it goes, and its trails go too. A sky that opens again within the 4 s fades the layer in over 3 s. After that, the planes come back with the haze. A sky that is closed at the start shows no layer.
  - Z3, the size: `getLivePlaneScale` (`liveRadar`, pure) is (25 km / slant)^0.8, from 0.4 to 1.8 × the 18 px silhouette: about 8 px at 71 km, 24 px at 17 km, 32 px at 12 km or nearer. `smoothPlaneScale` follows it with a 1 s time constant, so a new answer that moves the plane does not change its size in one step. The scale is a `transform: scale()` on a wrapper inside the translate div. `PlaneBody` keeps its 18 px and renders again only when its look changes. The tail of the trail and its width use the drawn size. The tap area (`PlaneHit`, now outside the scaled wrapper) stays 44 × 44 px. `getLivePlaneWidth` is removed. The opacity by distance (0.5 → 0.35) stays.
  - S1, the pick: `pickShownPlanes` gets the hex codes that the last update showed. In the normal view a shown plane stays while it is visible, in view and moves at least 0.6 px/s (`STICKY_SCREEN_SPEED_PX_S`). A new plane needs 1 px/s, and it takes the place of the farthest shown plane only at 0.75 × its slant distance or nearer (`SWAP_NEARER_RATIO`). After the compass view, the 2 nearest stay. The compass view does not change.
  - `LivePlanes` keeps the last update and the one before it in a ref. A second render of the same update starts from the one before, so it gives the same pick, fade, turn and size. A new answer is a new update. The planes render in hex order, so React does not move an element (a move starts its fade again).
  - Reduced motion: no fade (a plane and the layer go at once), no haze and no smoothing.
  - **Deviations:** (1) At north in the 360° view the way across the screen was 0 (the point 1 s later is on the other side), so the speed there was too low, and S1 dropped the plane for about 1 s. The speed now goes across the edge, and a new trail starts on the other side, as before. (2) The blur of the haze changes 4 times per second, not in each frame (above). (3) A plane that comes back after a long weather gate comes with the haze. In the lookbook it comes with the layer's fade only.
- **Checked:** unit tests: `utils.liveRadar` (the scale and its smoothing; the sticky pick: a shown plane stays, the 25 % rule, 0.6 px/s, at most 2 after the compass view), `LivePlanes` (a new plane: the fade-in class and its scale on the first frame, the haze 1.4 → 0.70 px → none on the 4 Hz clock; a plane missing from an answer flies on and fades out over 4 s with no tap and no count, then goes; one that comes back fades in again; the weather fades the layer out and goes, and a clear sky fades it in again; the size grows while a plane comes nearer and is smooth after a new answer; the sticky pick in the scene; a plane over north stays picked with no fade; reduced motion, also the trails after the weather gate; the ridge, switch-off and tail tests at the new size and fade). Typecheck, lint, build and all 2064 tests (127 files) pass. The `index` chunk is 673.6 kB (main 671.5 kB; limit 700 kB, item 125). Built app (`vite preview`, headless Chrome, 390 × 844, Ravensburg on 16 Sep 2026 at 14:00, BigDataCloud and all other hosts stubbed before the load, a scripted `/api/planes`): in the compass view facing south, a new plane went from opacity 0.01 and 1.4 px blur to 1 and no blur in 3 s; a plane missing from an answer flew on 6 px and faded from 1 to 0 in 3.8 s, with no tap, and went after 4 s; a plane that came nearer from 45 km grew from 0.62 to 0.96 × in 90 s. In the 360° view, a third plane 15 % nearer than the farther shown plane did not show; at 40 % nearer it came in with the haze, and the farther plane faded out over 4 s. Frame cost (`npm run perf:trace -- --live-planes 60 --compass 180 --scenes day --profiles phone`, 40 planes in view, 3 runs each, back to back): origin/main 66–67 ms/s main-thread busy, the branch 73–75 ms/s (+7 ms/s, about 0.12 ms per frame; paint 18–19 → 19–20 ms/s); 60 fps and frame p95 16.7 ms on both. The first build, with the blur in the keyframes, in an earlier pair of runs: 101 → 156 ms/s (paint 26 → 66 ms/s). Not checked: a real phone, the live feed, the weather gate in the browser, the look at night and at sunset.

### 160. Satellites: real ones bright enough, and the night catalogue — M — **✅ Done**

- **Feedback (Lutz, 2026-10-15 23:00 CEST):** "not ever have I seen one real satellite only decorative ones". And: "when I am out on my balcony I can see satellites through all of the night".
- **Analysis (47.65° N / 9.48° E, 15 Oct 2026, the app's code with live CelesTrak data):**
  - The data and the visibility rule work: 446 satellites, 5–10 visible at once in the ~2.5 h after dusk and before dawn. The Earth-shadow test agrees with an independent sun formula to 0.2°.
  - 86 % of the visible real satellites (magnitude ≥ 3) were 2.5 px at opacity 0.35. A decorative dot is 3 px at 0.8. Real dots move 0.09–0.46 % of the width per second (decorative: 0.6–1.8).
  - From 23:00 to 04:30 the sun is at about −48°: a satellite below ~550 km is in the Earth's shadow. Satellites at 800–2000 km stay lit, but the three groups (`stations`, `visual`, `last-30-days`) have few of them: 0.4 at once on average. CelesTrak's `active` group (16,000 more) has them: Qianfan, Hulianwang, Iridium, Gonets, Cosmos, Yaogan, Globalstar.
- **Built:**
  - Brightness (PR #220): `getSatelliteOpacity` at least 0.8, `getSatelliteDotPx` at least 3 px (the decorative dot).
  - The night catalogue: `api/satellites.ts` (Vercel Edge) wraps `handleSatellitesRequest` (`satelliteFeed`). It fetches `active` (7 MB) and returns the satellites with the whole orbit in 700–2000 km, without Starlink and OneWeb (`isNightSatellite`): about 1,000, 360 kB. The edge keeps the answer for a day (`s-maxage=86400`), so CelesTrak gets about one request a day per edge cache. A failure is an empty list that the edge keeps for 2 h, because CelesTrak blocks a client that repeats a request after an error.
  - `loadSatelliteData` fetches `/api/satellites` after the three groups, once a day with them. A failed night catalogue leaves it out until the next daily fetch (a `ponytail:` note).
  - A naked-eye limit: the scene shows a satellite only up to magnitude `NAKED_EYE_MAGNITUDE` = 5.5 (`isShownInScene`). Average at once with the night catalogue: after dusk 18 (limit 6: 28; no limit: 38), 23:00–04:30 0.7 (limit 6: 2.7).
  - `npm run dev` and `vite preview` serve `/api/satellites` through the `edgeApi` plugin (was `planesApi`).
- **Limits:** the magnitude is per size class from the name (item 131), not per satellite. A cubesat in a 700–2000 km orbit is shown as bright as a large satellite. The per-second sky with ~1,480 satellites: 1.4 ms every 30 s and 0.3 ms per second on a Mac.
- **Checked:** unit tests `utils.satelliteFeed` (orbit heights, the filter, the answer and its cache, the error answer, 405), `api.satellites`, `utils.satelliteData` (the night catalogue after the groups; a failure keeps the groups), `utils.satelliteUtils` (the limit: the same orbit as a Starlink-class satellite shows near and not far). Not checked: the Vercel Edge function against CelesTrak (its egress IPs may be blocked), a real phone.

### 161. Iceberg: an easter egg card and a collection badge — S — **✅ Done**

- **Feedback (Lutz, 2026-10-16):** "add one for the iceberg". The iceberg (below 0 °C) had no tap, no card and no badge.
- **Built:**
  - `TemperatureIceberg` takes a double tap like the midnight ghost (`useDoubleTap`, `HitArea` 96 × 96 px, `data-scene-hit`, `touch-manipulation`, `aria-hidden`) and shows the ring while its card is open (`ICEBERG_RING`). Without `onInfo` it stays `pointer-events-none`.
  - Card: `EggCardKind` `iceberg`, kicker "Easter egg", the ultra rare tier alone (no chance: it follows the temperature). Keys `egg.iceberg`, `eggFact.iceberg` in 5 languages.
  - Badge: `egg:iceberg` (ultra rare). The collection shows the scene drawing (`IcebergShape`, exported from `TemperatureIceberg`). It counts on a double tap while the iceberg floats (real weather below 0 °C), not in a time preview.
- **Checked:** `TemperatureIceberg` (one tap: nothing; two: the card; the ring; no taps without `onInfo`), `utils.sceneInfo` (the card text, the kicker), `utils.collection` (140 badges, 53 eggs, every egg card gives a badge), `SunTracker` (−5 °C: a double tap opens the card and counts `egg:iceberg`; 20 °C: no iceberg, nothing counts).

### 162. Satellites: no slide across the screen at north, and fewer dots at once — S — [SUN-CHASER-27](https://ainabler.sentry.io/issues/SUN-CHASER-27) — **✅ Done**

- **Feedback (2026-10-18 14:00 CEST, about the evening of 17 Oct in Stuttgart Vaihingen):** "Yesterday I finally had some satellites in Stuttgart Vaihingen but there were a lot on the screen at the same time. Some went by really fast under a second over the whole screen".
- **Analysis:** the sky of 17 Oct 2026, 18:30–06:30 CEST, at 48.73° N / 9.10° E, computed with the app's code (`getCandidateSatellites`, `getSkySatellites`, one step per second) and the data of 19 Oct (the three CelesTrak groups and `/api/satellites`: 1,475 satellites), on a 390 × 844 screen. Terrain and clouds not included.
  - **The slide (a bug):** in the 360° view, x is azimuth / 360 × width, so north is at both edges. A tracked dot moves to its next place with `transition: transform 1000ms linear` (`Satellites`, `stepMs`). When a satellite crosses north, x jumps from one edge to the other, and the transition slides the dot across the whole screen in 1 s. That night had 197 such slides (167 satellites), most from 19:00 to 21:00: about 1 per minute. Most satellites of the night catalogue (item 160) have polar orbits (Hulianwang, Centispace, Cosmos, Iridium), so they often cross north. No other step was faster than 100 px/s. The compass view has no transition (`stepMs` 0). The time play (`PLAY_TICK_MS`) has the same slide.
  - **The count:** the dots at once, by the magnitude limit (`NAKED_EYE_MAGNITUDE` is 5.5 now):

    | Hour (CEST) | ≤ 4.0 avg / max | ≤ 4.5 | ≤ 5.0 | ≤ 5.5 (now) |
    |---|---|---|---|---|
    | 19 | 3.8 / 12 | 7.9 / 16 | 13.9 / 26 | 22.8 / 36 |
    | 20 | 2.4 / 6 | 6.1 / 13 | 11.8 / 20 | 20.0 / 30 |
    | 21 | 0.5 / 3 | 2.0 / 5 | 5.6 / 22 | 11.1 / 32 |
    | 22 | 0.1 / 1 | 0.4 / 2 | 1.3 / 7 | 3.7 / 12 |
    | 23–03 | 0–0.4 | 0–0.2 | 0–0.3 | 0–1.1 |
    | 05 | 2.8 / 7 | 6.0 / 14 | 10.8 / 17 | 17.2 / 26 |

  - The 360° view puts the whole sky on one phone screen: 4 times the sky of the compass view (`COMPASS_FOV_DEG` 90°). A person who looks in one direction sees a part of these dots.
- **Spec:**
  1. **The slide:** a step in which x changes by more than half the screen width has no transition. The dot goes out at one edge and comes in at the other, as the live plane trails at north (item 159, deviation 1). The same in the time play.
  2. **The count (options):**
     - **N1 A lower limit:** `NAKED_EYE_MAGNITUDE` 4.5 (a town sky): 19:00–21:00 6–8 dots on average, at most 16. This also removes dots late in the evening (22:00: 0.4 instead of 3.7).
     - **N2 A cap:** at most 8 tracked dots at once, the brightest first. A shown dot stays until it goes (into the Earth's shadow, below 10°, behind the terrain). A new one takes a free place, so no dot is removed while it is in the sky. The limit 5.5 stays, so the late evening and the morning keep their dots. In the compass view the cap counts only the dots in the field of view.
     - **N3 Both:** the limit 5.0 and a cap of 8.
- **Check:** `Satellites` test: a dot that goes from x 380 to x 5 has no transform transition in that render, and the next step has it again. `utils.satelliteUtils` test for the chosen rule (N2: the brightest first, a shown dot stays, no more than the cap). The analysis again with the rule: no slides, and no more dots at once than the cap.
- **Open:** (a) N1, N2 or N3? (b) N2: 8 dots, or another number?
- **Decision (Lutz, 2026-10-19):** spec 1 (the slide) and N2 with a cap of 8.
- **Built:**
  - The slide: `Satellites` keeps the last update of the tracked dots (the `tracked` list and the cloud factor) in a `TrackedStep`. A dot whose x changed by more than half the width since the last update steps with no transform transition (only the opacity transition stays). It goes out at one edge and comes in at the other. The next update has the transition again. This is in `Satellites`, so it is the same in the time play (`PLAY_TICK_MS`). The compass view and reduced motion have no transform transition, as before.
  - The cap: `pickShownSatellites` (`satelliteUtils`, pure) gets the dots and the ids that the last update showed. A shown dot stays while its `shown` is true. A new dot takes a free place only, the brightest (lowest magnitude) first, up to `MAX_SHOWN_SATELLITES` = 8. A dot that fades out takes no place. `Satellites` applies it to the `tracked` list. `SunVisualization` drops the dots outside the compass field of view, so in the compass view only the dots in it count. `SunVisualization` does not change.
  - The memory is React state that changes during the render when the update changes (the pattern of `SkyOpticsLayer` and `MidnightGhost`), not a ref. A second render of the same update (StrictMode, a ring, a decorative dot) uses the same step, so it gives the same pick and the same transitions.
  - A dot without a place stays in the scene at opacity 0 and takes no tap, as a dot behind a cloud. When it gets a place, it fades in over 5 s (the opacity transition). A dot that comes into the sky with a free place shows at once, as before.
  - `trackedShows` (the decorative dots) does not change: when a tracked dot shows, the pick has at least one shown dot.
  - **Deviations:** (1) A dot behind a cloud (item 135) takes no place, so the cap counts the dots that the user sees. Else 8 dots behind a cloud could keep all places while a dot in a gap stays hidden, and `trackedShows` would stop the decorative dots. (2) The memory is state, not a ref as in `LivePlanes` (item 159): no ref is read or written in the render, and no lint rule is turned off.
- **Checked:** unit tests: `utils.satelliteUtils` (`pickShownSatellites`: at most 8, the brightest first, in the order of the list; a shown dot stays while brighter dots rise; a free place goes to the brightest new dot only; a dot that fades out takes no place; the same update gives the same pick; no more than the cap when more were shown before), `Satellites` (in StrictMode: the step x 380 → 5 has no transform transition, the other dot keeps it, a second render of the same update has none, the next step 5 → 7 has it again; the time play 10 → 385 → 360; 10 dots: the 8 brightest show, a brighter new dot waits, a dot that goes into the Earth's shadow frees its place and the brightest waiting dot fades in; a dot in a cloud gap shows when 8 brighter dots are behind the cloud). With the edge rule off, the two edge tests fail. Typecheck, lint, build and all 2078 tests (127 files) pass. The `index` chunk is 675.1 kB (limit 700 kB, item 125). The analysis again (the night above, 18:30–06:30 CEST, one step per second, through the `Satellites` component in jsdom, 360° view, 390 × 844, clear sky, no terrain): 0 slides; 202 steps across the edge with no transform transition (the spec's 197 plus the dots that fade out or wait); the fastest step with a transform transition 92 px/s; at most 8 dots at once (up to 38 in the sky); no shown dot hidden while it was in the sky. Dots at once on average (in the sky): 19 h 7.6 (22.8), 20 h 8.0 (20.0), 21 h 7.5 (11.1), 22 h 3.6 (3.7), 23–03 h 0–1.1 (the same), 04 h 7.2 (9.8), 05 h 8.0 (17.2). Headless Chromium (a static page, not the app, all requests blocked): a dot that moves 370 → 380 with the transition and then gets x 5 with no transform in the transition is at 5 on the next frame (the running transition stops); the next step 5 → 15 moves again (8 px after 300 ms). Not checked: the app in a browser (the tracking needs orbit data), a real phone, the compass view and the time play in a browser.

### 163. The controls stay while the info panel scrolls — S — [SUN-CHASER-26](https://ainabler.sentry.io/issues/SUN-CHASER-26) — **✅ Done**

- **Feedback (2026-10-17 17:54 CEST):** "Don't hide controls while scrolling the info panel".
- **Now:**
  - `useIdleHide`: in browser fullscreen the controls fade 3 s after fullscreen starts (`ENTER_HIDE_MS`) and 10 s after a wake (`WAKE_HIDE_MS`). In the installed app no timer runs before the first hide (a sky tap). After the first hide, each wake starts the 10 s timer there too.
  - These are wakes: a mouse move (item 133: a touch `pointermove` is not a wake), a tap on the empty sky in the box of a hidden control (item 147 T2), a sky tap that shows the controls (item 136), and a focus in the panel (`onFocus={handleFocus}`).
  - A touch scroll in the panel's `ScrollArea` gives no click and no focus, and its pointer moves are touch moves. So the timer runs on while the user scrolls and reads, and the panel fades under the finger after 10 s or less. A tap on a button in the panel is a wake only when the button takes the focus (Chrome does, Safari does not).
- **Spec:**
  1. Use of a control is a wake: a `pointerdown`, a `scroll` (in the capture phase, so the scroll in the `ScrollArea` counts), a `wheel` or a `keydown` in a `[data-idle-control]` element (the panel, the top-left buttons, the radio). The controls stay, and the hide timer starts again. Hidden controls take no taps (item 132), so this does not change how they come back.
  2. Option: while the panel is open, no timer. Only a sky tap hides the controls.
- **Check:** `SunTracker` test in fullscreen: a scroll event in the panel each 2 s for 20 s keeps the controls; 10 s after the last scroll they hide. A `pointerdown` on the radio starts the timer again. Phone emulation (390 × 844, touch, browser fullscreen): a long touch scroll in the open panel, and the panel stays.
- **Open:** (a) Spec 1 only, or with option 2? (b) "Controls" is read here as the fading controls (items 89, 147). It is not a part inside the panel that scrolls away: the panel head (the place and the collapse button) is already outside the scroll area.
- **Decision (Lutz, 2026-10-19):** spec 1 only (use of a control is a wake). Option 2 not now.
- **Built:**
  - `SunTracker` (the effect of the items 133–158): a window listener in the capture phase takes `pointerdown`, `scroll`, `wheel` and `keydown` (`CONTROL_USE_EVENTS`). When the controls show and the target of the event is in a `[data-idle-control]` element (`InfoPanel`, `TopLeftButtons`, `MusicPlayer`), it calls `wakeCursor`: the controls stay, and the hide timer starts again. This is T3 of item 147. A scroll does not bubble, so the listener uses the capture phase. It is `passive`, so it does not slow the scroll.
  - While the controls are hidden, the listener does nothing. A scroll that runs on after a sky tap hid the controls (a fling) does not show them. How hidden controls come back does not change (items 132, 136, 147, 157).
  - On shown controls that take taps, a wake sets the same state: they keep their taps (`isTappable`), and React stops before it renders. After another state change, React can run `SunTracker` once more for the first wake, but it renders no child. `useIdleHide` does not change.
  - **Deviations:** none from spec 1. Two results of "a use is a wake": (1) Before the first hide in browser fullscreen, a wake starts `ENTER_HIDE_MS` again (item 89). So a scroll in the first 3 s after the user enters fullscreen keeps the controls 3 s after the last scroll, not 10 s. In the installed app no timer runs before the first hide. (2) In the 400 ms after a show (`TAP_READY_MS`) the controls take no pointer. Only a scroll that runs on or a key can reach a control then, and it starts the 400 ms again, as each wake does.
- **Checked:**
  - `SunTracker` tests in fullscreen: a scroll 2 s after the user enters fullscreen hides the controls 3 s after the scroll (item 89). After a hide and a sky tap, a scroll in the panel each 2 s for 20 s keeps the controls, they keep their taps, and they hide 10 s after the last scroll (not at 9999 ms). A `pointerdown` on the radio, a `wheel` and a `keydown` in the panel each start the 10 s again, and the top-left buttons keep their taps. 100 scroll events in the panel give `SunVisualization` no new props. Hidden controls do not show on a scroll, a wheel, a key or a `pointerdown` in them (60 s). With the controls shown, a `pointerdown` on the sky, a scroll of the page and a key on the body do not keep them. Without the listener, the first two tests fail. `hooks.useIdleHide`: 100 wakes on shown controls render the hook at most once, keep the taps and start the 10 s again. The tests of the items 89, 136, 147, 157 and 158 pass as they are.
  - Phone emulation (Playwright, headless Chrome, 390 × 844, touch, CPU 4 × slower, production build, BigDataCloud and the forecast stubbed before the load and every other host blocked, Ravensburg on 16 September 2026 at 14:00, real browser fullscreen, the panel open): the controls were hidden 3.8 s after the user entered fullscreen, and a sky tap showed them. Ten drags in the panel, about one each 2 s for 21 s (90 scroll events), kept the panel. It hid 10.0 s after the last scroll. One finger on the panel for 17.7 s, moved up and down (one `pointerdown`, 138 scroll events), kept the panel. It hid 10.0 s after the last scroll. The drags gave no click. The same steps on a build without the change: the panel hid 9.4 s after the show, during the drags and under the moving finger. Script time for the ten drags: 0.57–0.61 s in fullscreen (with the listener) and 0.51–0.56 s in a browser tab (no listener). The difference is about the spread of the two tab runs.
  - Typecheck, lint, build and all 2073 tests (127 files) pass. The `index` chunk is 674.7 kB (limit 700 kB, item 125).
  - Not checked: a real phone, the Play app, the installed-app mode in the browser, an iPhone home-screen app; a mouse wheel and keys in a desktop browser (unit tests only).

### 164. Live planes and satellite tracking: a red icon and a refresh when the data does not come — M — **✅ Done**

- **Feedback (Lutz, 2026-10-19):** "add a feature for live planes and satellite tracking that it shows a red icon in the info panel if it is not working, ideally with a refresh option like the weather".
- **Now:**
  - Weather: a refresh button (`RefreshCw`, it turns while the request runs) in the head of the weather section; `handleWeatherRefresh` fetches again. "Real weather unavailable" in peach when the forecast fails.
  - Live planes (item 155): `useLivePlanes` gives `loading`, `ok` or `error`. In `error` the line under the switch says "Live radar unavailable", in the normal text colour. The hook asks again every 15 s, so the radar comes back by itself within 15 s after the feed works again. The SUN-CHASER-27 event (2026-10-18 14:00) had the tag `live-planes: error`. On 2026-10-19 12:05 `/api/planes` answered 200 in 1.7 s, and `/api/satellites` answered 200.
  - Satellites: no status. A failure is silent: satellite.js does not load (a `console.error` only), `loadSatelliteData` gives null (no cached data and CelesTrak failed), or the data is more than 3 days from its epoch (`isNearEpoch`). Then `sky` is null, and the scene shows the decorative dots, which look like real ones. A failed night catalogue (item 160) is silent too: fewer satellites until the next daily fetch.
  - CelesTrak blocks a client that asks again after an error. `loadSatelliteData` waits `RETRY_MS` (2 h) after a failed try. A refresh button must not skip this wait.
- **Spec:**
  1. **Live planes:** in `error`, a red alert icon (lucide `CircleAlert`, 14 px, `text-red-400`, with the text "Live radar unavailable" as its label) next to "Live planes", the status line in red, and a refresh button (as the weather's) in the row. The refresh asks the feed at once (`useLivePlanes` gives `refresh`); the button turns until the answer comes. With `ok` or `loading`, no icon and no button: the hook asks every 15 s.
  2. **Satellites:** `useSatelliteTracking` gives a status: `loading` while satellite.js or the data loads, `ok` with data near its epoch, `error` when satellite.js does not load, no data comes, or the data is too old. In `error`: the same red icon next to "Satellite tracking", a line under the row "Satellite data unavailable" in red, and the refresh button. Only while the switch is on.
  3. **The satellite refresh (options):**
     - **R-a Keep the wait:** the refresh loads satellite.js again if it failed, and asks for the data again. The CelesTrak groups are asked again only when `RETRY_MS` is over since the last try. Before that, the line says "Next try at 21:40", and the button is disabled.
     - **R-b Through our server:** `/api/satellites` also gives the three groups (the Edge function asks CelesTrak, and the edge cache keeps the answer as it keeps the night catalogue now). The app then never asks CelesTrak itself, so a refresh can always try, and `celestrak.org` goes out of the CSP `connect-src`. Larger: the Edge function, its cache rules and `loadSatelliteData` change.
  4. **A Sentry tag** `satellites`: `off`, `loading`, `error` or `ok-<shown>`, set only when it changes, as `live-planes` (item 155 P4). So a feedback event shows the state.
  5. New keys in 5 languages: `satellite.unavailable`, `satellite.nextTry` (R-a), and the label of the refresh buttons.
  6. Option: a small red dot on the panel's expand button while one of the two is in `error`, so a closed panel shows it too.
- **Check:** `hooks.useLivePlanes`: `refresh` asks at once and stops the request that runs. `useSatelliteTracking`: the status for each failure (no satellite.js, no data, old data) and `ok` after a refresh. `utils.satelliteData` (R-a): a refresh within `RETRY_MS` does not ask CelesTrak. `InfoPanel`: the red icon, the red line and the refresh button only in `error` and only with the switch on; the button turns while it loads. `SunTracker`: the tag `satellites`. `i18n`. Browser (`vite preview`, 390 × 844, `/api/planes` and the satellite data stubbed to fail, then to work): the icon, a tap on refresh, the icon goes.
- **Open:** (a) Satellite refresh: R-a or R-b? (b) Option 6, the red dot on the closed panel? (c) A missing night catalogue only (the groups work): `ok`, or a status of its own?
- **Decision (Lutz, 2026-10-19):** (a) R-a, the 2 h wait stays. (b) Yes, option 6. (c) Not decided: a missing night catalogue alone stays `ok`.
- **Built:**
  - Live planes: `useLivePlanes` gives `refresh` and `refreshing`. `refresh` starts a request at once and stops the request that runs. `refreshing` is true until the next answer (ok or error). The poll every 15 s stays.
  - Satellites: `useSatelliteTracking` gives `status` (`SatelliteStatus`: `loading`, `ok` or `error`), `refresh`, `refreshing` and `nextTryAt`. `loading` until satellite.js and the first answer of the cache come. `error` when satellite.js does not load, `loadSatelliteData` gives null, no record gives a satellite, or the first record (the ISS) is not near its epoch (`isNearEpoch`, 3 days) at the real time. The hook sets the real time with each answer of the cache and once a minute (`Date.now()` is impure in render). A time preview far from the epoch stays `ok`: the scene shows the decorative dots, as before. A missing night catalogue alone stays `ok` (decision (c)).
  - R-a: `getNextSatelliteTry` (`satelliteData`) gives the time of the next CelesTrak try from the cache: 24 h after the last full fetch, and not before 2 h after the last try; null when a fetch is due. `loadSatelliteData` uses the same rule (`nextTryAt`), so the two cannot differ. The refresh loads satellite.js again when it failed, and calls `loadSatelliteData`, which asks CelesTrak only when the wait is over. So the refresh cannot skip the 2 h. The hook gives `nextTryAt` only while the wait runs and satellite.js is loaded. Then the line says "Satellite data unavailable · next try at 21:40", and the button is disabled. When the browser blocks `localStorage`, the cache stays in the page (`pageCache`), so the wait holds there too.
  - `InfoPanel`, only with the switch on and the status `error`: a red `CircleAlert` (14 px, `text-red-400`, `role="img"`, labelled "Live radar unavailable" or "Satellite data unavailable") next to the name, and a refresh button as the weather's (`RefreshCw` in `ICON_TOGGLE`; it turns and is disabled while the refresh runs) next to the switch. Live planes: the status line is red. Satellites: a red line under the row. The icon is outside the "Live planes" label, so the switch keeps its name. With `ok` or `loading`: no icon and no button.
  - Option 6: a red dot (8 px, `bg-red-400`) on the expand button of the closed panel while one of the two switches is on and its status is `error`. The open panel shows the rows instead.
  - The Sentry tag `satellites` (`getSatellitesTag`): `off`, `loading`, `error` or `ok-<n>`. `SunTracker` sets it only when the value changes, as `live-planes`. `off` while the switch is off or no place is loaded. n is the number of satellites in the hook's `sky` with `visible` true. It is not the drawn count: the scene hides satellites behind the terrain, and item 162 adds a cap.
  - `red-400` is in the `@theme` block of `src/index.css` (`#f87171`). Keys `radar.refresh`, `satellite.unavailable`, `satellite.nextTry` and `satellite.refresh` in 5 languages.
  - **Deviations:** (1) "next try at 21:40" starts lowercase after " · ", as `radar.compassAll` in the radar line. (2) The refresh button is next to the switch in both rows; the spec says "in the row".
- **Checked:** unit tests: `hooks.useLivePlanes` (the refresh asks at once and stops the request that runs; `refreshing` until the answer; nothing while off), `hooks.useSatelliteTracking` (loading until satellite.js and the data come, then ok; error without data, and ok after a refresh with data; error with data more than 3 days old at the real time, while a scene time near the epoch still draws the ISS; ok in a time preview far from the epoch; the next try while the wait runs, and null when the minute clock passes it; error when satellite.js does not load, then no wait, and ok after a refresh loads it; the tag values), `utils.satelliteData` (a refresh within `RETRY_MS` after an error does not ask CelesTrak; the next try after an error, after a full fetch, and for a cache from the future; the wait with blocked storage), `InfoPanel` (the icon, the red line and the button only in `error` and with the switch on; the button turns and is disabled while it loads; the next try disables it; the switch keeps its name; the red dot only on the closed panel), `SunTracker` (live planes: a 502 shows the icon, the refresh asks at once, and the icon goes with the answer; satellites: the tag `error`, the icon, the line with the next try and the disabled button, then a refresh after the wait brings the ISS and the tag `ok-1`; the same value is never set twice in a row). Typecheck, lint, build and all 2085 tests (127 files) pass. The `index` chunk is 677.6 kB (limit 700 kB, item 125). Built app (`vite preview`, headless Chrome, 390 × 844, touch, Ravensburg, BigDataCloud stubbed before the load, all other hosts stubbed or blocked; first `/api/planes` 502, CelesTrak 403 and `/api/satellites` 503, then all 200): the closed panel showed the red dot. In the open panel both rows showed the red icon (rgb(248, 113, 113)), "Live radar unavailable" in red with a refresh, and "Satellite data unavailable · next try at 14:45" with the refresh disabled. CelesTrak got 1 request, and a tap on the disabled button sent none. With the feeds working, a tap on the live refresh asked `/api/planes` at once, and the icon went after 92 ms ("3 nearby · 0 in view · the compass shows all"). The page clock went 2 h 1 min forward: the satellite refresh was enabled 59 s later (the hook's minute clock), with no CelesTrak request before the tap. The tap asked the 3 groups and `/api/satellites`, and the icon, the line and the dot went. No page errors. Not checked: a real phone, the live feeds, a failed satellite.js chunk in a browser, data more than 3 days old in a browser, the other languages in a browser.
- **Open:** (a) At 390 × 844 the label "Satellite tracking" takes two lines while the icon and the refresh show (the row also has the ISS passes toggle). (b) A browser can keep a failed dynamic import. Then the refresh cannot load satellite.js again, and only a reload helps.

### 165. Launch check: five first-time users in a real browser — M — **✅ Done**

- **Request (Lutz, 2026-10-19):** from an [X post](https://x.com/RoundtableSpace/status/2111717667228770611) (2026-10-18): before the launch, five sub-agents use the app as five different first-time users. Real first users do not say why they leave.
- **Now:** the [Verification](#verification-2026-09-28) and the visual review check each item against its spec. No check follows a new user from the first load.
- **Spec:**
  1. Five sub-agents open the built app (`vite preview`) in Playwright, each as one user:
     - **P1 Impatient:** skims, taps the first thing that looks like a button, and stops at the first error or long wait. Denies location.
     - **P2 Skeptic:** reads the privacy page and the data sources (item 153) before it allows location. Compares the network requests with the privacy page.
     - **P3 Mobile:** 375 × 667, touch, slow 3G and a 4× slower CPU (Chrome DevTools). Notes the time to the first sky.
     - **P4 Non-native speaker:** browser language `pt` (the app falls back to `en`), then `de`, `es`, `it` and `fr`. Follows only what the UI says. Notes cut or overflowing text, and English text in another language.
     - **P5 Breaker:** junk and very long text in the place search, back during a flow, double and triple taps, a rotation, offline during use, location denied and then allowed.
  2. The goal of each user: from the first load to the first success, which is the sun and the moon at the right place for the user's location or a searched place, and one card opened by a tap.
  3. Each user takes a screenshot at each point where it is confused, stuck or annoyed, with one line of text.
  4. Each run routes `**/api.bigdatacloud.net/**` to a stub before the app loads (BigDataCloud bans the IP, see CLAUDE.md). The other hosts stay live.
  5. One list of findings, ranked by the number of users that hit each one, with the screenshots, goes into this item. A finding of size S is fixed here. A larger finding gets its own item.
  6. After the fixes, the five users run again.
- **Depends on:** none. Do it before the production release (item 16).
- **Done when:** the ranked list is in this item, each finding is fixed or has its own item, and the second run does not find the fixed findings again.
- **Run 1 (2026-10-19, `main` at `d7f1079`):** the built app in `vite preview`. Each user is one sub-agent with its own headless Chrome (`playwright-core`, `channel: 'chrome'`) and a new browser context for each script run (a true first visit). BigDataCloud is answered by a stub (an answer built from Photon's reverse geocoder) and is also blocked by a `--host-resolver-rules` entry, so no request can reach it. The other hosts are live. All five users reached the goal. The sun and the moon were at the right place for each place: P3 compared them with its own calculation (sun 31.8° / 189.9° against 31.8° / 189.7°, moon −18.2° / 100.2° against −18.8° / 100.1°).
- **Findings (run 1), ranked by the number of users:**

  | # | Finding | Users | Result |
  |---|---|---|---|
  | 1 | The moon is below the horizon, and nothing in the sky says so. The Moon card (closed while the moon is down) shows only a negative altitude. | 5 (P1–P5) | Card: fixed here. Sky: item 168. |
  | 2 | "Use my location" is a blank white pill: white text on the white fill of the `outline` button. | 4 (P1, P2, P4, P5) | Fixed. |
  | 3 | A place in another time zone shows its times in the device's clock, with no zone: New York "Sunrise 13:12, Sunset 00:11" in Berlin, Tokyo "Sunrise 22:52". | 4 (P1, P2, P4, P5) | Item 169. |
  | 4 | Location denied: at 0.3 s a red "Location unavailable … Please enable location services", and New York with "Dawn" at 13:37 Berlin time. Location allowed later: nothing changes. With no place name the header says "Your location 40.7128°, −74.0060°". | 3 (P1, P2, P5) | Item 170. |
  | 5 | The weather service answers 503: "Check your connection" with a good connection, no new try for 30 min, and the default 20 °C under "Weather unavailable". | 3 (P1, P3, P5) | Fixed: a new try each minute, one toast. The default temperature: item 176. |
  | 6 | Yellow "+" badges on about 10 controls. The meaning is only in a hover tooltip, which a phone does not show. | 3 (P1, P3, P4) | Item 171. |
  | 7 | One tap on the sun does nothing. Only a double tap opens its card (item 116). | 3 (P3, P4, P5) | Item 172. |
  | 8 | A tap on a card title ("Moon Information") does nothing. Only the 26 px chevron opens the card. | 2 (P1, P3) | Fixed. |
  | 9 | Enter in the place search closes the form and keeps the old place: Enter submits the form with the coordinate fields. | 2 (P1, P5) | Fixed. |
  | 10 | After a place change the weather of the previous place can stay: when its answer comes last, it stays until the 30-minute refresh. | 2 (P1, P2) | Fixed. |
  | 11 | Two sunrise times: the sky label (line of sight) and the panel (flat horizon), and no reason shows. | 2 (P1, P4) | Item 176. |
  | 12 | Pills in the scene: the solar-noon pill on the sun disc, the N and NE pills touch at the left edge, the altitude pill ("+31.8°") has no label. | 2 (P3, P4) | Item 176. |
  | 13 | "Satellite data unavailable" (CelesTrak 403). | 2 (P4, P5) | Test setup: many first visits from one IP in 30 min. No change. Run 2 answers CelesTrak with an empty group. |
  | 14 | Number and date fields with German formats ("40,7128", "19.10.2026") in the English UI. | 2 (P1, P4) | Test setup: the UI language of the test Chrome is German. No change. |
  | 15 | Slow 3G and a 4× slower CPU: a plain dark screen for about 10 s (first paint 4.8 s, the sky at 10.0 s). | 1 (P3) | Fixed in part: the mark shows from the first paint. The first bundle: item 174. |
  | 16 | Privacy: the link is only at the end of Data sources. The first load contacts 6 hosts before any consent. The page names the IP only for adsb.lol, CelesTrak and the radio. It does not name the Azure blob host or Sentry. The Live planes text leaves out our server. The device keeps more than §5 lists. | 1 (P2) | Item 175. |
  | 17 | Phone: Back leaves the app while the panel, the search or a dialog is open (P5). A tap beside the open panel does not close it, and tap targets are 16–40 px (P3). | 1 each | Item 173. |
  | 18 | "Midday" at 08:44 in São Paulo: the middle half of the daylight is "midday". | 1 (P4) | Item 176. |
  | 19 | The open date field goes past the right edge of a phone (fr, es, pt). | 1 (P4) | Fixed. |
  | 20 | The search hint is "e.g. Friedrichshafen" in all languages. | 1 (P4) | Fixed. |
  | 21 | Two dash styles in time ranges: "17:17 – 18:05" and "18:05 - 18:40". | 1 (P4) | Fixed. |
  | 22 | English text in de/es/it/fr: the Copernicus attribution, and "Easter Eggs" in de/it/fr. | 1 (P4) | No change: the attribution is the licence text, and "Easter Eggs" is the usual loanword. |
  | 23 | 14 more findings of 1 user each. | 1 | Item 176, lines 5–18. |

- **Run 2 (2026-10-19, the run-1 fixes built):** the same five users, new sub-agents. None of the fixed findings came back: "Use my location" was readable and worked (P2, P5); Enter in the search picked the first result (P1, P5); after a fast change A → B the weather belonged to B (P5); a failed weather came back by itself after about 60 s (P5); a tap on a card title opened the card (P1, P3); the Moon card said "below the horizon" (all); the mark showed at the first paint, 4.9 s (P3); no text went past a phone's edge (P4). Run 2 found 4 more findings of size S, fixed here (see Built): the cursor started in the latitude field (P1, P3); the fallback 20 °C read as real (P1, P2, P4, P5); Enter while "Searching…" was ignored (P5); the old place's weather showed under the new name for 3–9 s (P1, P5). Its other findings are in items 168–176. A last check of the final build in one browser: the cursor starts in the search, "Use my location" is white on transparent, and Enter before the results picks Hamburg.
- **Screenshots:** [the findings page](https://claude.ai/artifact/QgWsBkKxLRpNKzYAxUXP1T) (private; Lutz shares it) has the ranked list with 17 screenshots, before and after.
- **Built:**
  - #1: the altitude row of the Moon card says "· below the horizon" after a negative altitude (`moon.belowHorizon`, 5 languages).
  - #2: the "Use my location" button is transparent with a white border at 40 %.
  - #5: `SunTracker` asks for the weather again 1, 2 and 5 min after a failed answer (`isRealWeather` false, `WEATHER_RETRY_MS`); after that only the 30-minute refresh asks, so a failure that lasts costs 2 requests an hour. A good answer, a place change or a refresh tap starts the series again. Only the first failure shows the toast. The toast says "Showing default weather. Trying again in a minute." (5 languages), not "Check your connection".
  - #8: the chevron of each card (Moon, Golden & Blue Hour, twilight, Sun position) covers its header row with an `after:` element (`SECTION_TOGGLE`), so a tap on the title opens the card. The button and its label stay the same.
  - #9: Enter in the place search picks the first result of the text in the field (`resultsFor`), and never submits the form. Enter before the results of that text come picks the first result when they come; a change of the text after Enter cancels this. "Change location" puts the cursor in the place search, not in the latitude field (run 2: a typed place and Enter in the latitude field set the old coordinates again).
  - #10: `fetchWeatherData` numbers its requests. An answer of an older request is dropped. While a request runs, the weather rows are at 50 % opacity (`aria-busy`), so the old place's weather does not read as the new one's (run 2).
  - #5 (run 2): with the fallback weather, the temperature row shows "–", not the default 20 °C.
  - #15: `index.html` has the loading screen's mark inline in `#root` (inline SVG, inline styles, the first frame of the rise with the sun under the water), so it shows with the first paint. React replaces it.
  - #19: the "Current time" row wraps, and the controls stay on the right.
  - #20: the search hint is "Lisbon", "Sevilla", "Firenze" and "Marseille" (de keeps "Friedrichshafen").
  - #21: all twilight ranges use the en dash.
- **Checked:** new tests: `InfoPanel` (Enter with the results of the text; Enter with the results of an older text; Enter before the results, then the pick when they come; no pick when the text changed after Enter; the cursor in the place search; "–" for the fallback temperature), `SunTracker` (a new try after 60 s and one toast; an older place's answer that comes last is dropped). Each new `SunTracker` test fails without its fix. Typecheck, lint and all tests pass.
- **Test setup notes:** five users from one IP at the same time gave Open-Meteo 503 answers (3 users) and CelesTrak 403 answers (2 users). CelesTrak answers a repeated download within 2 h with 403 and can block the IP, so run 2 answered it with an empty group (and a host-resolver rule blocked the host), and kept repeated third-party answers in a disk cache, except in the slow-3G run. Photon sometimes limited the stub, and then the app showed the coordinate fallback. The test Chrome formats native number and date fields in its own UI language (German).
- **Follow-up (Lutz, 2026-10-19):** one PR per item, in this order: 170, 169, 173, 171, 176, 174, 175. No second persona check after them.

### 166. Google Play: the developer name and the address on the store — S (owner)

- **Request (Lutz, 2026-10-19):** from an [X post](https://x.com/MaxHirsch13/status/2111623992692138313) (2026-10-18): a personal name under the app looks like an amateur's app. The question: can the name and the address stay off the store?
- **Research (2026-10-19, Play Console help: [account types](https://support.google.com/googleplay/android-developer/answer/13634885), [required information](https://support.google.com/googleplay/android-developer/answer/13628312), [account information](https://support.google.com/googleplay/android-developer/answer/13634081)):**
  - **Personal account:** Play shows the legal name, the country and the developer e-mail. An account that monetizes (a paid app or in-app purchases) also shows the full legal address. Google checks this address with documents, so an address service cannot replace the home address.
  - **Organization account:** Play shows the organization name and address (they must agree with the D-U-N-S record), a developer phone and a developer e-mail. It needs a D-U-N-S number (free). It has no closed test with 12 testers for 14 days.
  - The developer name is free text for both account types (Play reviews a change).
- **Now:** the Sun Chaser Play account is a personal account. Premium (items 14 and 45) uses Play Billing, so Play shows the home address when Premium goes on sale. The address service of item 16 step 2 is for the privacy page, not for the Play listing.
- **Options:**

  | Option | Name on Play | Home address on Play | Cost |
  |---|---|---|---|
  | O1 Personal account, monetized | own name | shown | €0 |
  | O2 Personal account, no in-app purchase on Play | own name | not shown | €0, but no Premium income from Play (item 45 changes) |
  | O3 Sole trader (Freiberufler, and probably a Gewerbe for the app sales) + D-U-N-S + virtual office + organization account | own name (a sole trader's D-U-N-S record has the person's name) | the virtual office, if Google accepts it (not confirmed) | about €10–50 per month, Gewerbeanmeldung €20–65 |
  | O4 UG (haftungsbeschränkt) + D-U-N-S + virtual office + organization account | company name | the virtual office | about €500–700 once, €1,000–3,000 per year, 6–12 weeks |

  - O4: the Impressum still names the managing director, and the Handelsregister shows the name, the birth date and the city. The virtual office must be the business address from the start, because the Handelsregister shows it.
  - Not taken: a foreign company (US LLC, Estonian OÜ, UK Ltd). Managed from Germany, it pays German tax, a US LLC needs US forms each year (Form 5472, US$25,000 penalty), and the Impressum still names the manager.
- **Spec:**
  1. All options: set the developer name to the brand (Developer account → About you). Set the store listing contact to the e-mail of item 16 step 2 and the website `https://sun.chaser.page/` (item 16, PR #193).
  2. O3 and O4: get the D-U-N-S number first (upik.de, up to about 30 days). Make the organization account (US$25), then transfer `com.ainabler.sunchaser` to it. Before the transfer, check what moves with the app: the in-app product `premium`, the closed test, the testers and the signing keys (`assetlinks.json`).
  3. O3 and O4: ask a Steuerberater: Freiberufler or Gewerbe for the app sales, and a UG or not.
- **Depends on:** item 16 (domain and e-mail). Decide before Premium goes on sale (item 14, `PREMIUM_ENFORCED`).
- **Done when:** the Play listing shows the chosen developer name, and the home address does not show, or a Decision line here accepts it.
- **Open:** (a) O1, O2, O3 or O4? (b) The developer name: `ainabler` (as in the package name) or another?

### 167. Search: Search Console, Bing and a landing page in five languages — M

- **Request (Lutz, 2026-10-19):** from an [X post](https://x.com/IndieBeaverHere/status/2111812808782295369) (2026-10-18): the lowest-effort marketing is a landing page in the store listing, Google Search Console and Bing Webmaster Tools, then pages for the searches that give impressions, in more languages.
- **Now:**
  - `/` is the app. `index.html` has the title "Sun Chaser", one English description, and Open Graph title, description and type. It has no `og:image`, no canonical link and no `hreflang`. There is no sitemap. `robots.txt` allows all.
  - The site is not in Search Console or in Bing Webmaster Tools. The domain moves to `sun.chaser.page` (item 16, PR #193).
  - `/privacy` is a static page in `public/`, outside the service worker's navigation fallback (`navigateFallbackDenylist` in `vite.config.ts`).
- **Spec:**
  1. After the move to `sun.chaser.page`: verify the domain in Search Console (a DNS TXT record at Cloudflare). Then import it to Bing Webmaster Tools from Search Console.
  2. A static landing page for each app language (`en`, `de`, `es`, `it`, `fr`) at `/<lang>/`, as `/privacy`: in `public/`, in `navigateFallbackDenylist`, and inside the CSP of `public/_headers`. Content: what the app does in one line, 3–4 features, 3 screenshots from `store/screenshots/`, the Google Play badge, a link to the web app at `/`, and the privacy link. `hreflang` links between the five pages, `x-default` to `/en/`. The text comes from the Play listing text (item 67 step 7).
  3. `public/sitemap.xml` with the five pages, and its URL in `robots.txt`.
  4. `index.html`: `og:image` (`store/feature-graphic.png`, 1024 × 500) and a canonical link.
  5. The website field of the Play listing: `https://sun.chaser.page/`.
  6. Not in this item: pages for the searches with impressions (for example "sunset time <city>", "golden hour today", "sun dog", "ISS pass tonight"). Only after 4–8 weeks of Search Console data shows them. More languages only when the app has them.
- **Depends on:** item 16 (the domain move) and item 67 step 7 (the Play listing text).
- **Check:** built site: each `/<lang>/` page loads with no CSP error, has the right `lang` and the `hreflang` links; `/` still opens the app; the service worker does not serve the app for `/<lang>/`. Lighthouse SEO audit on each page.
- **Done when:** Search Console and Bing show the domain as verified and the sitemap as read with no errors.

### 168. The moon below the horizon: a mark at the horizon — S — **Closed: no change**

- **Finding (item 165, #1):** 5 of 5 first users asked "where is the moon?" while it was below the horizon. The sky had no hint. The Moon card (closed while the moon is down) showed only "Altitude: −17.9°". Item 165 adds "· below the horizon" to that row.
- **Spec:** while the moon is below the horizon, a pill on the horizon line at the moon's azimuth, as the sunrise and sunset pills: the `Moon` icon and the next moonrise ("rises 15:43"). A double tap opens the Moon card, as the sun (item 116). When the azimuth is outside the view (compass mode), no pill.
- **Open:** (a) the pill at the azimuth, or one line under the time-of-day heading of the panel ("Moon below the horizon · rises 15:43")?
- **Done when:** with the moon below the horizon, the scene shows where and when it rises; a unit test for the pill time and position.
- **Decision (Lutz, 2026-10-19):** no change. The "· below the horizon" in the Moon card (item 165) is enough; nothing new in the sky or the panel.

### 169. A place in another time zone: its times in its own clock — M — **✅ Done**

- **Finding (item 165, #3):** 4 of 5 first users saw the times of another place in the device's clock, with no zone: New York "Sunrise 13:12, Sunset 00:11" in Berlin, Tokyo "Sunrise 22:52", London "08:31" from Madrid. The default place after a denied location (New York, item 170) makes the first screen look broken.
- **Now:** all times use the device's time zone. The Open-Meteo geocoding results and the forecast (`timezone=auto`) give the IANA zone of the place; the app does not read it.
- **Spec:** keep the place's zone with the place (the search result's `timezone`, or the forecast's for coordinates and a located position). Show all clock times (panel, scene pills, time travel field) in that zone with `Intl.DateTimeFormat`'s `timeZone`. When it differs from the device's zone, the panel says so under the place name ("Local time in New York, 6 h behind you").
- **Open:** (a) the place's clock (recommended), or the device's clock with the zone label only?
- **Done when:** a searched place in another zone shows its own sunrise and sunset clock times and the zone line; unit tests for the formatting across a date line.
- **Decision (Lutz, 2026-10-19):** (a) the place's own clock: all times in the place's zone, and a line under the place name ("Local time · 6 h behind you").
- **Built:**
  - `src/utils/timeZone.ts`: `isValidTimeZone`, `wallTime`, `zoneOffsetMinutes`, `fromWallTime` (two passes, for a time next to a daylight-saving change), `startOfDayIn` and `placeClockDifferenceMinutes`. `undefined` is the device's zone everywhere.
  - The zone of a searched place comes from the Open-Meteo geocoding result (`timezone`, checked with `isValidTimeZone`) through `PlaceSearch`, `InfoPanel` and `LoadingScreen` to `SunTracker`, and `manualLocation` keeps it. A located position uses the device's zone.
  - `SunTracker` gives the zone through the language context (`timeZone`). `formatTime` (and so the panel, the sky pills, the scene cards, the share card, the sunset and ISS reminders), the Current Time row, the moon dates, the terrain rows and the time travel field (`toDateTimeLocalValue`, `fromDateTimeLocalValue`) use it. `getMoonTimes` looks for rise and set in the place's day.
  - Under the place name: "Local time · 6 h behind you" or "· 5 h 30 min ahead of you" when the place's clock differs from the device's. A place set by hand with no known zone (typed coordinates, or a place saved before this item) keeps the device's clock and says "Times in your time zone". New keys `common.hours`, `location.clockAhead`, `location.clockBehind`, `location.clockYours` in 5 languages.
  - **Not changed:** the calendar and festival eggs and the midnight ghost keep the device's date and clock; the time travel range stays today ± 1 year in the device's days.
- **Checked:** unit tests (`utils.timeZone`: offsets with daylight saving and half hours, wall time back to the moment on a change day, the place's day start, the time travel value both ways, `formatTime` in a zone, moon rise or set inside the place's day; the zone from geocoding and in storage), `InfoPanel` (the note behind, ahead with half hours, none in the device's zone, "Times in your time zone"; the clock and sunrise in New York time), `SunTracker` (a saved place with its zone: the note and the clock). Typecheck, lint and all 2121 tests pass. Browser (built app, from Ravensburg): no note at home; after a search for New York the heading says "Morning" at 09:53 New York time, the clock shows 09:53:32 (15:53:32 in Berlin), sunrise 07:12 and sunset 18:11 in the panel and the sky, and "Local time · 6 h behind you".

### 170. Location denied: ask for a place, not New York — M — **✅ Done**

- **Finding (item 165, #4):** 3 of 5 first users. A user who says no to location gets a red "Location unavailable … Please enable location services" at 0.3 s and New York in Berlin time ("Dawn" at 13:37). Location allowed later changes nothing; only the "Use my location" button in Change location or a reload helps. With no place name the header says "Your location 40.7128°, −74.0060°".
- **Now:** `SunTracker` sets New York and the toast on any geolocation error. The loading screen's "Choose a place" (item 39) shows only while the request waits (after 3 s), behind the Premium gate.
- **Spec:**
  1. On `PERMISSION_DENIED`: no toast. Keep the loading screen and show "Choose a place" at once, with a line "No location: choose a place".
  2. On a timeout or `POSITION_UNAVAILABLE`: the same, with "Location not found".
  3. Watch `navigator.permissions.query({ name: 'geolocation' })`: when the state turns `granted` and the user has not chosen a place, ask for the position.
  4. The header says "Your location" only for a real position. A typed point says "Chosen point" (run 2, P5).
  5. "Use my location" while location is blocked: the toast says how to allow it in the browser, not only "Could not get your current location" (run 2, P5).
- **Open:** (a) "Choose a place" free for this first place (no Premium gate)? (b) A "Skip" that shows New York, or no default place at all?
- **Done when:** denied location shows "Choose a place" with no red toast; allowing location later moves the scene to it without a reload; component tests for both.
- **Decision (Lutz, 2026-10-19):** (a) yes: "Choose a place" is free for the first place; a later change of the place stays Premium. (b) No default place: no "Skip" and no New York.
- **Decision (Lutz, 2026-10-19, while building):** "Use my location" is always free, so a free first place never blocks the real location later.
- **Built:**
  - `SunTracker`: on a startup geolocation error there is no default place and no toast. `locationProblem` (`denied` for code 1, else `unavailable`) goes to `LoadingScreen`, which stays and shows "Choose a place" at once with "No location: choose a place" or "Location not found: choose a place" (`loading.denied`, `loading.notFound`). The 10 s timeout gives `unavailable`.
  - `LoadingScreen`: "Choose a place" has no Premium gate and no gold plus (the first place is free).
  - `SunTracker` listens to `navigator.permissions.query({ name: 'geolocation' })`: when the state turns `granted` and no place was chosen, it asks for the position and the scene opens there. No Permissions API: nothing (the panel's "Use my location" still works).
  - `InfoPanel`: "Change location" opens the form for everyone. "Use my location" is free; a search pick and "Set location" go through `requirePremium`.
  - A typed point with no place name says "Chosen point" (`location.chosenPoint`, `isChosenPoint` from `SunTracker`'s `isManualLocation`), not "Your location".
  - "Use my location" with location blocked (code 1): the toast says "Location is blocked for this site. Allow it in your browser's site settings, then try again." (`toast.locationBlocked`).
  - New keys in 5 languages; `toast.locationUnavailableDefault` removed. **Deviation:** with no geolocation API at all (no real browser; jsdom tests) New York and its toast stay.
- **Checked:** component tests: denied keeps the loading screen with the free "Choose a place", no toast and no scene; a permission change to `granted` opens the scene at the position; a timeout says "Location not found"; "Use my location" while blocked gives the site-settings toast; typed coordinates say "Chosen point"; while Premium is locked, "Use my location" runs and "Set location" goes through `requirePremium`. Typecheck, lint and all 2107 tests pass. Browser (built app, 390 × 844, location denied): "No location: choose a place" and the button, no red toast, no scene; after the permission was granted the scene opened at Ravensburg without a reload.

### 171. The "+" badge on a phone: what it means — S — **✅ Done**

- **Finding (item 165, #6):** 3 of 5 first users did not know what the yellow "+" on about 10 controls means. "Premium feature, free for now" is only in a hover tooltip, which a phone does not show. A tap on the badge of the compass button turned the compass on.
- **Options:** (a) the first tap on a control with a badge shows a toast "Premium feature, free for now" once; (b) one line at the end of the panel: "+ Premium feature, free for now"; (c) no badges until Premium is on sale (item 16, `PREMIUM_ENFORCED`).
- **Open:** (a), (b) or (c)?
- **Done when:** a first user on a phone can learn what the badge means without hover.
- **Decision (Lutz, 2026-10-19):** (a) the first tap on a control with a badge shows "Premium feature · free for now" once (kept on the device); the control still works.
- **Built:** `requirePremium` (`usePremium`), which every gold-plus control calls, shows the toast "Premium feature, free for now" (the existing `common.premium` text, 5 languages) on the first call while Premium is free and the plus shows, then runs the action as before. `localStorage` `premium-badge-hint` keeps it to once per device (`loadBadgeHintShown`, `saveBadgeHintShown` in `utils/premium.ts`). No toast when Premium is bought (no plus) or locked (the Premium dialog opens).
- **Checked:** `hooks.usePremium`: the first call shows the toast once and runs the action each time, a new start on the same device shows none, none when bought or locked. Typecheck, lint and all 2131 tests pass. Browser (built app, 390 × 844): the first tap on "Manual" showed "Premium feature, free for now" and turned manual weather on; a second tap and a tap after a reload showed no toast.

### 172. A single tap on the sun or another scene thing — S — **Closed: no change**

- **Finding (item 165, #7):** 3 of 5 first users tapped the sun once and saw nothing. Only a double tap opens its card (item 116, which keeps a single sky tap for the controls of item 136).
- **Options:** (a) a single tap on a scene thing shows a short hint at the tap point ("Double-tap for info"), the first 3 times; (b) a single tap opens the card of the sun and the moon only, and the other scene things keep the double tap.
- **Open:** (a) or (b)?
- **Done when:** a single tap on the sun gives a visible answer; a component test.
- **Decision (Lutz, 2026-10-19):** no change. The double tap of item 116 stays the only way to open a scene card.

### 173. Phone: Back, a tap beside the panel, and tap targets — M — **✅ Done**

- **Finding (item 165, #17):** Back leaves the app while the panel, the search, the collection or Data sources is open (P5). A tap on the sky beside the open panel (it covers about 80 % of a 375 px screen) does not close it (P3). Tap targets of 16–40 px: "Next station" 16 px, the volume knob 20 px, the panel chevron 30 px, the card chevrons 26 px (P3).
- **Spec:**
  1. Back closes the open layer first: a history entry when a dialog, the search or the expanded panel opens on a phone; `popstate` closes it.
  2. Tap targets at least 44 × 44 px, with a larger hit area (padding or an `after:` element), not a larger icon.
- **Open:** (a) a tap beside the open panel on a phone: close the panel, or keep the item 136 rule (it hides or shows the controls)?
- **Done when:** on a 375 px phone, Back closes each open layer and a second Back leaves; no tap target under 44 px in the panel and the radio bar.
- **Decision (Lutz, 2026-10-19):** (a) a tap on the sky beside the open panel on a phone closes the panel. With the panel closed, the item 136 rule stays.
- **Built:**
  - `src/hooks/useBackToClose.ts`: on a phone (`useIsMobile`, < 768 px) each open layer adds a history entry (same URL). Back (`popstate`) closes the top layer only. A layer closed in the UI takes its entry back with `history.back()`, and that `popstate` is skipped, so after the last layer a Back leaves the app. Layers: the expanded panel, the location search, Data sources (`InfoPanel`), a scene card, the collection and the Premium dialog (`SunTracker`).
  - `InfoPanel`, on a phone with the panel open: a tap on the empty sky (`isEmptySkyTap` in the new `src/utils/sceneTap.ts`, which also holds item 147's `isSceneTap`) closes the panel and stops there (document capture), so the item 136 toggle does not run.
  - `TAP_TARGET` (`glassChrome.ts`): an empty 44 × 44 px `after:` box centred on a small control. On `ICON_TOGGLE`, `INLINE_ICON_TOGGLE`, `GLASS_ICON_BUTTON` (fullscreen, compass), the radio bar's switch, next-station and rain buttons, the °C/°F, Real/Manual and language buttons (also `min-w-11`), the clock, "Change location", the switches, the twilight labels, Collection and Data sources. The volume slider's tap area reaches 12 px above and below. The card toggles cover their whole header row.
  - So that the boxes do not overlap: the rows with a control are at least 44 px high (`min-h-11`: temperature, weather mode, live planes, current time, sunrise, sunset, the twilight rows, satellite tracking, the card headers); the Sunset bell, alarm and share are 44 px apart (`ml-[26px]`); the time controls have `gap-3.5`; the ISS toggle has `mr-1.5`; the panel header has `pb-3`.
- **Checked:** unit tests (`hooks.useBackToClose`: one entry per layer, Back closes the top one only, a UI close takes its entry back and that popstate closes nothing, off on a desktop), `InfoPanel` on a 390 px phone (a sky tap beside the open panel closes it and goes no further, a tap inside does not; Back closes the search, then the panel). Typecheck, lint and all 2129 tests pass. Browser (built app, 390 × 844, touch): Back closes the search, then the panel; Back closes Data sources and keeps the panel; a sky tap beside the panel closes it; the next Back leaves the app. Tap areas measured at 375 × 667 (the box around each control's centre where `elementFromPoint` returns the control): every control in the radio bar, the top-left buttons and the panel is 42–44 px or more, except at the panel's right edge, where the probe meets the scroll bar (the card toggles, whose tap area is their 44 px row, and "FR").
- **Follow-up (Lutz, 2026-10-19, [lookbook](https://claude.ai/artifact/DnNWeBma2gcHxYXv62JvtY)):** of four panel densities (A spacious, B medium, C compact with a "⋯" menu, D original) Lutz kept A, the 44 px rows. Round 2, option A2, built: a closed card (Moon, Golden & Blue Hour, twilight, Sun position) is one row of a compact list (`cardSection`, `cardHeaderRow`, `cardTitle`: no gap, a faint line, a 16 px semibold title, 44 px high; the first card keeps 16 px above it); an open card keeps its 24 px gap and big title. Less space after the card list (`mt-2 pt-2`). Satellite tracking, Collection and Language are headings like Live planes (the whole Collection row opens it); the language buttons are on a second line. Panel at 390 × 844 with the Moon card open: 1230 px (1374 px before).

### 174. First load on slow 3G: a smaller first bundle — M — **Closed: (b) and (c) reverted**

- **Finding (item 165, #15):** at 375 × 667 with slow 3G (2 s RTT, 400 kbit/s) and a 4× slower CPU the first paint came at 4.8 s and the sky at 10.0 s. Item 165 shows the mark from the first paint. A second visit loads in 0.4 s (service worker).
- **Now:** the first bundle is 678 kB (226 kB gzip), the stylesheet 79 kB (15 kB gzip), plus the language chunk.
- **Spec:** find what the first sky does not need (dialogs, the collection, the radio, satellites, easter eggs, the time travel) and load it with `lazy()`. Measure the bundle with `vite build` and a source map once; no new dependency in the build.
- **Done when:** the P3 setup of item 165 shows the sky in 6 s or less.
- **Measured (2026-10-25, main `48ba5e0`, then with this build):** a script outside the repo (`playwright-core` with Chrome, a static server with gzip and HTTP/2, a fresh `vite build` with a fake Sentry DSN). Phone P3: 375 × 667, touch, 2000 ms RTT, 50 000 B/s (`Network.emulateNetworkConditions`), 4× CPU, no cache, no service worker. Every other host gets a stub that answers after 2 s (a stub does not pass the throttle, a real answer does) or is aborted; no real API is called. Clock fixed at 2026-09-16 14:00 in Ravensburg. Median of 3 runs.

  | | First paint | Sky | Place name |
  |---|--:|--:|--:|
  | Before (main `48ba5e0`) | 4.84 s | 9.81 s | 11.85 s |
  | After | **2.12 s** | **8.94 s** | 11.00 s |

  | | Before | After |
  |---|--:|--:|
  | First JS (entry and the chunks it preloads) | 754 kB (252 kB gzip), 2 files | 554 kB (193 kB gzip), 21 files |
  | Stylesheet | 79 kB (15 kB gzip) | 79 kB (15 kB gzip), no longer blocks the paint |
  | Bytes before the sky (gzip, with the HTML) | 275 kB | 209 kB |

  The 6-s target is **not met**. The sky time is `4.0 s + bytes / 50 000 + 0.8 s`: two requests in a row (the HTML, then the script and the stylesheet) cost 2 × 2 s of RTT before one byte of the app arrives, and the script runs for 0.8 s at 4× CPU. What is left after the 4.0 s is 209 kB = 4.2 s of transfer. Even a start with no app code at all (React and React DOM 45 kB, the English texts 12 kB, the stylesheet 15 kB) is 4.0 s + 1.5 s + 0.3 s = about 5.8 s. So 6 s cannot be met with two hops. Options for Lutz: (a) put the first script into the HTML (one hop, about 2 s less; the CSP has `script-src 'self'`, so it needs a build-time hash in `public/_headers` and `vercel.json`, which `tests/headers.test.ts` keeps equal); (b) a lighter first sky that React replaces (more code to keep in step with the real scene); (c) a lazy panel body (about 0.4 s more).
- **Built:**
  1. **Stylesheet:** `asyncCss` in `vite.config.ts` marks the `<link>` with `media="print"` in a build, and `main.tsx` sets `media="all"` after the sheet loads and before the first render. The first paint is the mark of item 165 at 2.1 s, not at 4.8 s.
  2. **Sentry (about 88 kB raw):** `utils/monitoring.ts` is the only door to Sentry (`setTag`, `addBreadcrumb`, `captureMessage`, `captureException`). `main.tsx` starts it on idle after the first render (`startMonitoring`, max 4 s); a call before that waits and runs in order; an error before that is kept and sent. `utils/sentryEntry.ts` names the six calls, so the `import()` does not keep replay, tracing and profiling (a plain `import('@sentry/react')` gave 450 kB). `AppErrorBoundary` replaces `Sentry.ErrorBoundary`. `isFeedbackAvailable` checks the DSN.
  3. **Lazy parts, each with its own `LazyPart`:** the radio, the Toaster, the midnight ghost (only at 00:00) and the iceberg (only below 0 °C); in `SunVisualization` the rainbow (only with a rainbow), the sky optics, the satellites and the live planes (`useEverTrue`: they mount when they can show and stay, so a fade-out ends), the fireworks (from the first trigger), the calendar eggs, the sky eggs and the playful eggs (only on an event); in `CloudLayer` the drawings of the fish, boats, birds and the shark and dolphins (`utils/sceneSizes.ts` keeps their sizes for the lanes); in `InfoPanel` the data sources dialog, the line of sight details and the place search (they open on a tap).
  4. A clear day view loads no egg, satellite or optics chunk; the first sea creatures come with their chunk after the sky.
- **Checked:**
  - `npm run typecheck`, `npm run lint` and `npx vitest run` pass (133 files, 2150 tests). New tests: `utils.monitoring`, `hooks.useEverTrue`, `AppErrorBoundary`, `utils.sceneSizes`. The tests of `SunTracker`, `InfoPanel`, `LazyPart` and `placeName` call `preloadMonitoring()` first, so a tag or breadcrumb arrives at once; no test changed in meaning. The "March equinox" collection test did not fail in these runs.
  - In Chrome, 375 × 667, 14:00 in Ravensburg: the same sky as before (screenshots side by side), fish, boats and birds come, the feedback button shows, and an error after the start (`setTimeout(() => { throw … })`) reaches the Sentry host (a stub).
  - HTTP/1.1 with 6 connections made the 21 chunks wait (sky 11.9 s). The numbers above use HTTP/2, as Vercel and Cloudflare do.

- **Decision (Lutz, 2026-10-25):** option (a) is out: Vercel reads `vercel.json` before the build, so a build-time CSP hash cannot reach it, and the CSP stays strict (no `'unsafe-inline'` for scripts). Try (b) and (c). The inline script goes to a new item for after the move to Cloudflare (item 181).
- **Built (follow-up, 2026-10-25):**
  1. **(c) The panel body in its own chunk:** `InfoPanelBody.tsx` holds everything below the panel header (weather, time travel, sun and moon cards, twilight, golden hour, satellites, radar, language, data sources). `InfoPanel.tsx` keeps the header, the place name lookup, the location form, the cards' open and closed state and the Back handling, so the state survives a close. The body loads with the first open; `SunTracker` also loads it after the full scene is in, so a tap finds it. `LazyPart` got an optional `fallback`: the body's space is kept (`h-[calc(100dvh-120px)]`, the ScrollArea's own limit), so the panel does not grow when the body arrives.
  2. **(b) A light first sky:** `LightSky.tsx` (3 kB) draws the sky gradient (SunTracker's own), the sea and horizon, the sun with its glow, the moon with its phase, and the compass labels. `SunVisualization` (with `CloudLayer`, the sea canvas, rain, terrain, fish, boats, birds and eggs) is a lazy chunk now. Its load starts with the app, not with the location. The geometry and the sun look moved from `SunVisualization.tsx` to `utils/skyLook.ts` (the azimuth and altitude mapping, the sea path, the compass pills, the sun colour and glow); both drawings call it, so the sun, the moon, the horizon and the labels sit at the same place. `SunVisualization` still exports the names its tests use. When the scene has loaded it fades in over the light sky (`SceneHandoff`, 0.7 s); the light sky stays opaque under it, then fades out (0.4 s) and goes (`useSceneHandoff`): no dip, no jump. The loading screen (item 170) is unchanged. If the scene chunk fails, the light sky stays and `LazyPart` reports the error.
- **Measured (same P3 script, main `8923693` as before; median of 3 to 5 runs; "Sky" is now the light sky with the sea line and the sun, or the full scene's sun and sea where there is no light sky):**

  | | First paint | Sky | Place name | Full scene | First JS |
  |---|--:|--:|--:|--:|--|
  | Before (main `8923693`) | 2.11 s | 9.08 s | 11.15 s | 9.1 s | 555 kB (193 kB gzip), 21 files |
  | (c) panel body lazy | 2.11 s | 8.64 s | 10.71 s | 8.6 s | 498 kB (178 kB gzip), 18 files |
  | (c) + (b) light first sky | **2.12 s** | **8.01 s** | 10.03 s | 12.07 s | 415 kB (149 kB gzip), 19 files |

  (c) helps by 0.4 s and (b) by another 0.6 s: 1.1 s together. Both are kept. (b) costs time elsewhere: the full scene (clouds, fish, boats, birds) arrives 3.5 s after the light sky, because its chunk loads after the first bundle on the same 50 kB/s line. The bytes are the same; their order changed.
- **Checked (follow-up):** `npm run typecheck`, `npm run lint` and `npx vitest run` pass. New tests: `InfoPanelBody` (no static import of the chunk in `src`; the header stays outside it; a closed panel draws no body; a card the user opened stays open after a close and an open), `LazyPart` (the fallback shows while a part loads), `LightSky` (the sun, the moon, the sea path and the compass pills equal the full scene's at four places and two screen sizes, north and south of the equator, in a polar night; no sun where the weather hides it; no taps; the hand-over stages and times; no static import of `SunVisualization` in `src`; the light sky imports none of the heavy scene code), `SunTracker` (the light sky shows with the scene, then only the scene). A screenshot pair at 375 × 667, 14:00 in Ravensburg, shows the light sky and the full scene with the sun, the horizon and the labels at the same pixels.
- **Decision (Lutz, 2026-10-25):** drop (b) and (c); both are reverted (PR #252 reverted), so the full scene shows first again. Item 174 ends at the state of PR #251: on the P3 setup the first paint comes at about 2.1 s (the mark) and the sky at about 9 s; the 6-s target is not met. The one change that can close the gap, the first script inline (about 2 s), is item 181, after the move to Cloudflare (item 16).

### 175. Privacy page: every host, the IP and the storage — S (owner) — **✅ Done**

- **Finding (item 165, #16, P2 Skeptic):**
  - The privacy link is only at the end of the Data sources dialog, at the end of the panel.
  - The first load, before any consent, contacts api.open-meteo.com, BigDataCloud, celestrak.org, s3.amazonaws.com (terrain tiles), planetarycomputer.microsoft.com and ai4edataeuwest.blob.core.windows.net. The page says "Like any web server, they receive your IP address" only for adsb.lol, CelesTrak and the radio.
  - The page names "Microsoft Planetary Computer" but not the Azure blob host. Data sources names neither Microsoft nor Sentry nor our own server.
  - The Live planes text says "Sends your place … to adsb.lol". The request goes to our server, which forwards it (the privacy page says this).
  - §5 says the app keeps settings and caches weather and terrain. It also keeps the place name with its coordinates, terrain keys with 3-decimal coordinates for each place, and the satellite data.
  - Matched: the weather and the place name use about 1 km; the planes about 11 km; the terrain z12 tiles about 10 km; CelesTrak gets no position.
- **Spec:** one line per host with what it gets, and "your IP address" for each; the Azure host under Planetary Computer; Sentry; the Live planes text names our server; §5 lists each kept item; a "Privacy" link in the panel next to Data sources. Lutz checks the text.
- **Depends on:** item 16 (the privacy policy in five languages) uses the new text.
- **Done when:** each host in a first-load request log of item 165's P2 is on the page with what it gets.
- **Decision (Lutz, 2026-10-19):** Claude drafts the text and the panel link; Lutz reviews it in the PR before the merge (no auto-merge for this PR).
- **Built:** `public/privacy/index.html` section 1 lists each host with what it gets, when, and that it gets the IP address: Open-Meteo (forecast, place search), BigDataCloud, Photon, AWS terrain tiles, Microsoft Planetary Computer with its Azure blob host, CelesTrak, our server (`/api/satellites`, `/api/planes`, adsb.lol), the ten radio hosts and Sentry (section 3: what goes in a report and what the scrub removes). It says that there is no consent screen and that the first load contacts the hosts as soon as the app has a place. Section 5 lists every `localStorage` key and the `sessionStorage` key, with the rounding of each. The Live planes hint names our server in five languages. The panel has a "Privacy" link next to "Data sources" (key `dataSources.privacy`, no new key). The Data sources dialog adds Microsoft Planetary Computer, Vercel (`dataSources.hosting`) and Sentry (`dataSources.errors`). `tests/privacyPage.test.ts` fails when a CSP `connect-src` host, a radio host or a storage key is missing from the page.
- **Checked:** `npm run typecheck`, `npm run lint`, `npx vitest run` (130 files) and `npm run build` pass; `tests/headers.test.ts` is unchanged. Waiting for Lutz's review of the privacy text.
- **Found while writing (the page says it, Lutz decides):** (a) adsb.lol and the CelesTrak copy behind `/api/satellites` get the IP of our server, not the user's: the old text said the user's IP. (b) `terrain_horizon_profile_v2_*` and `terrain_tree_cover_v1_*` have no age limit and no clean-up: one entry per place (about 100 m) stays until the user clears the storage. (c) The WorldCover file name (a 3-degree square) is in a Sentry breadcrumb: the scrub covers only query values and terrain tile paths. (d) Sentry gets the IP with each report. Lutz keeps Sentry's default settings (2026-10-25); the app sets `dataCollection.userInfo: false` (`src/main.tsx`), so the SDK (v11.1, `BrowserClient`) sends `infer_ip: "never"` and Sentry does not take the IP from the request. The page says so.
- **Decision (Lutz, 2026-10-25):** the text is approved and merged. Sentry keeps its default settings. Open as follow-ups: an age limit for the terrain and tree caches (b), and the WorldCover file name in Sentry breadcrumbs (c). The "short time" of Vercel's request logs is carried over unverified; it goes away with the move to Cloudflare (item 16).

### 176. Launch check: small findings — S each — **✅ Done**

- **Findings (item 165, 1–2 users each):**
  1. Two sunrise times: the sky label (line of sight) and the panel (flat horizon), and no reason shows (P1, P4).
  2. Scene pills: the solar-noon pill on the sun disc, the N and NE pills touch at the left edge, the altitude pill ("+31.8°") has no label (P3, P4).
  3. "Midday" at 08:44 in São Paulo, and "Mittag" at 14:30 in Berlin: `getTimeOfDay` calls the middle half of the daylight "midday" (P4, runs 1 and 2). Option: solar noon ± 2 h.
  4. "Weather unavailable" showed the default 20 °C (68 °F) as the temperature (P1, P5): fixed in item 165 (run 2).
  5. "Sunset score 1/10 · clear sky" next to "Condition: Overcast": the score is for the sky at sunset, the text does not say so (P4).
  6. Labels in two lines: "Seguimiento de satélites", "Satelliten-Tracking" (P4; item 164 Open (a)).
  7. Taps with no visible answer: "Share this view" in a browser without a share sheet, the countdown bell, the twilight rows (P4).
  8. The screen-reader label "Notifications (F8)" of the toasts is English in all languages (P4).
  9. The Spanish search shows "Londres, Inglaterra, Reino Unido" twice (P4).
  10. The "Badge unlocked" banner lies on the panel header, and the texts mix (P5).
  11. Compass on a device without a compass: "Calibrating compass…", then the button goes away with no reason (P5).
  12. A double tap on the music switch: "Playback failed. Click anywhere on the page first" (P5).
  13. Offline: no hint; "Refresh weather" gives no answer; the search says "Could not search for places" (P5).
  14. North Pole: "Sun does not rise" and a sunset score (P5).
  15. The panel jumps about 1.5 s after it opens, when the weather block comes in (P5).
  16. A searched place name stays in the old language after a language switch (P5).
  17. The sticky panel header covers half a row while the panel scrolls (P2).
  18. The main screen shows the weather only as clouds; the temperature is in the panel (P3). A question, not a defect.
  19. Run 2: a long place name is cut ("Hamburg, Free and Hanseatic …"), and the search for "Hamburg" lists "Grafton, Wisconsin" third (P1).
  20. Run 2: the twilight rows say "Click or hover for degree information", and a tap shows nothing (P3).
  21. Run 2: "Satellite data unavailable · next try at 14:14" while the clock shows 14:15, a next try in the past (P2).
  22. Run 2: the first weather of a first visit takes up to 5 s, and the weather block is not there until then, with no loading sign (P2).
  23. Run 2: a closed card ("Moon Information", "Golden & Blue Hour") leaves an empty gap under its title (P4).
  24. Run 2: on an overcast desktop the sun is only a faint outline behind the clouds (P4).
  25. Run 2: at the first load in Paris the sky is clear while the panel says "Pluie faible"; the rain comes later (P4).
- **Done when:** each line is fixed, or has a Decision line that keeps it.
- **Decision (Lutz, 2026-10-19):** line 3: "Midday" is solar noon ± 2 h; the clear lines are built, the design lines came back with a proposal. Design lines: line 1: the panel shows both times; line 2: only the overlaps; line 5: no change; lines 18 and 24: no change; line 19: one line, no change; line 16: search the name again; line 6: shorter texts.
- **Built:**
  1. Under the Sunrise and Sunset time of the panel, "over hills 08:17" (`sun.overHills`, 5 languages) when the line-of-sight time differs by 2 min or more.
  2. The noon pill steps below the sun when it would lie on the sun and its rays (**deviation:** below the sun, not above the apex, which is under the closed panel on a phone). Two compass pills that would touch keep one: a main direction (N, E, S, W) before a between one, else the one at its true place (N stays, NE goes at the left edge of a 390 px screen).
  3. "Midday" is solar noon ± 2 h (`MIDDAY_HALF_MS`), inside the hour after sunrise and the hour before sunset; it was the middle half of the daylight.
  4. Built in item 165 (run 2): "–" for the fallback temperature.
  6. Shorter labels: "Satelliten", "Satélites", "Satelliti", "Satellites".
  7. Share without a share sheet: the toast "Picture saved" with the file name. The countdown bell, turned on: a toast that says what comes (`sun.countdownOn`). A twilight label: a tap opens its degrees (only a mouse hovers, only a keyboard focus opens; a tap's focus and touch events had opened it and the click closed it again).
  9. Search results with the same label: the first one stays.
  10. The "Badge unlocked" banner: 85 % glass instead of 58 %, so the panel header does not show through.
  11. A compass that gives no heading after a tap: the toast "Compass not available".
  12. A radio start cut short by a pause or a new station (`AbortError`): no "Playback failed".
  13. Offline: a refresh tap says "You are offline"; the search says "No connection".
  14. No sunset score on a polar day or night.
  15/22. The weather block shows "–" before the first answer, so the panel does not jump.
  16. On a language switch, the searched place's name is searched once more in the new language; the result within about 5 km of the place gives the name.
  21. The satellite "next try" goes when its time comes (a timer at that time), not at the next minute step.
  23. Built in the item 173 follow-up (#239): closed cards are a compact list.
- **Perf check (Lutz asked, 2026-10-19):** a sub-agent compared main before (`bfae352`) and after today's merges (`308b55e`) with `npm run perf:trace` (day and night, phone and desktop, panel open, a place with its own time zone, CPU profiles) and with SunTracker test times. No slower render: the cost per clock tick was 3.9–4.4 ms before and 3.8–4.1 ms after; scripting and frame times within noise. The 40-minute retry test takes about 10 s because it runs 2400 ticks. The one new cost: `wallTime` built a new `Intl.DateTimeFormat` on each call (0.34 ms/s on a 4× slower phone CPU with a zoned place); it now keeps one formatter per zone.
- **Checked:** new tests (Midday window; duplicate search results; the satellite next try drops at its time; the place name after a language switch; no "Playback failed" for an interrupted start; "Compass not available"; "Picture saved"; the countdown toast; a tap on a twilight label; NE hidden next to N at a 390 px edge). Typecheck, lint and all 2139 tests pass. Browser (built app, 390 × 844, Ravensburg at 13:04 CEST): "Midday"; the "↑ 13:07" pill below the sun, clear of its rays; compass pills N E SE S SW W NW (no NE next to N); "over hills 08:17" and "over hills 18:19" under the panel times; a tap on "Civil:" opens its degrees; offline, a refresh tap shows "You are offline".
- **Not changed:**
  - 5, 18, 19, 24: Decision above. Line 19's "Grafton, Wisconsin" for "Hamburg" is Open-Meteo's data.
  - 8: the label "Notifications (F8)" is the default of the shadcn toaster in `src/components/ui` (not hand-edited), which renders outside the language context.
  - 17: the panel header is not sticky over the rows; the scroll area cuts a row at its top edge, as any scroll list.
  - 25: not reproduced in this item; the next live check watches for it.

### 177. Satellite data: our server as the fallback for all groups — M — [SUN-CHASER-28](https://ainabler.sentry.io/issues/SUN-CHASER-28) — **✅ Done**

- **Feedback (2026-10-24 18:25 CEST, Ravensburg):** "This evening live data for satellites and planes isn't working can you please analyze why this fails?".
- **Analysis (2026-10-25):**
  - The four feedback events of 24 and 25 Oct (SUN-CHASER-28, 29, 2A, 2B, all Ravensburg, release `48ba5e0`) have the tag `satellites: error` (item 164). So the tracking failed for at least a day. No error event has the tag, so Sentry cannot show other places.
  - **Planes:** `live-planes: error` at 18:25:17, then `ok-0/28` at 18:25:57 and `ok-2/36` on 25 Oct. A short outage that the 15 s poll repaired. `/api/planes` answered 200 in 115 ms on 25 Oct. No change needed beyond item 164.
  - **Satellites:** from this computer, a request to `celestrak.org` gets no connection (it fails after 10.5 s). DNS resolves the host, and two outside checkers report CelesTrak up (HTTP 200). So CelesTrak's firewall blocks this IP. The likely start: the item 165 launch check on 19 Oct, with about 60 CelesTrak downloads from one IP in 30 minutes (item 165, finding 13: CelesTrak 403).
  - The app asks CelesTrak itself for the three groups (`loadSatelliteData`). A failed group keeps the cached records and waits 2 h. After 3 days the cached data is too old (`isNearEpoch`), so the status is `error`. The night catalogue comes from our server (`/api/satellites`, 1,109 satellites, an edge cache hit in 123 ms), but `loadSatelliteData` does not ask for it when a group fails. So the server's working data is not used.
  - Any user can get this: each browser downloads the groups from its own IP. Satellite tracking is on by default, so each first visit contacts CelesTrak before any consent (item 165, finding 16). Several devices behind one router, or a reload loop, can reach CelesTrak's limit.
- **Spec options:** **S1 Server only** (the app never asks CelesTrak; `celestrak.org` leaves the CSP). **S2 Direct first, the server as the fallback** for all groups (CelesTrak stays in the CSP and on the privacy page).
- **Decision (Lutz, 2026-10-25):** S2: "do direct calls but fallback via server for all groups". And help to get the home IP unblocked (owner task below).
- **Spec (S2):**
  1. **The server has all groups:** `/api/satellites?all=1` gives one list: the three groups (`stations`, `visual`, `last-30-days`), then the night catalogue, without duplicates (`dedupeRecords`; the ISS stays first). The Edge function asks CelesTrak for the four lists once per edge cache and day (`s-maxage=86400`, `stale-while-revalidate`). After the first failed list it stops and returns what it has, with the 2 h error cache. `/api/satellites` without `all` stays the night catalogue (old app versions).
  2. **Direct first:** `loadSatelliteData` asks CelesTrak for the three groups as now, each with a timeout of 8 s (a firewall block gives no answer, so a fetch without a timeout hangs). The 2 h wait after a failed direct try stays: the app does not ask CelesTrak again within 2 h.
  3. **The fallback:** when a direct group fails, or while the 2 h wait runs and the cached data is too old or missing, `loadSatelliteData` asks `/api/satellites?all=1` at once and uses its list. A failed server try waits 15 min. After a direct success, the night catalogue comes from `/api/satellites` as now.
  4. **Status and refresh (item 164):** the status is `error` only when the direct groups and the server both give no usable data. The refresh asks the server at once when the direct wait runs. The "next try at" line shows only when both wait.
- **Check:** `utils.satelliteFeed`: `?all=1` gives the four lists in one answer, the ISS first, no duplicates; the stop after a failed list; the cache headers; without `all` the night catalogue as before. `utils.satelliteData`: a direct 403, a network error and a timeout each lead to one server request and its records; no CelesTrak request within 2 h after a failed one; the 15 min server wait. `useSatelliteTracking`: `ok` from the server data while CelesTrak fails. Browser (built app, CelesTrak mapped to NOTFOUND, `/api/satellites?all=1` stubbed): the tracking shows `ok` with satellites.
- **Owner:** ask CelesTrak to unblock the home IP (an e-mail draft is in this session; the IP does not go into this public repo). Done: CelesTrak removed the IP from the firewall on 2026-10-29, after item 183.
- **Open:** Vercel's edge IPs are shared with other customers, so CelesTrak can block one of them too. Then the edge keeps the last good answer for up to a day (`stale-while-revalidate`). After item 16 (Cloudflare), the same logic runs as a Pages Function.
- **Built:**
  1. `/api/satellites?all=1` (`satelliteFeed`): the three groups, then the night catalogue, from CelesTrak in sequence, one list with `dedupeRecords` (the ISS stays first). The first failed list stops the run: the answer holds what came so far, with the 2 h error cache. A full run has the daily cache. `/api/satellites` without `all` is unchanged. The `edgeApi` plugin already passes the query string (it builds the `Request` from `req.url`): no change in `vite.config.ts`.
  2. `loadSatelliteData`: each direct group request has an 8 s timeout. When a group fails, the server list replaces the direct result at once. While the 2 h wait runs and the cached data is too old (the first record, the ISS, is more than 3 days from the real time) or missing, the server list is asked at once. A failed server try (no 200, no usable records, an error, 30 s timeout) waits 15 min (`serverTriedAt` in the cache). A usable server list is cached with the old `fetchedAt`, so CelesTrak is asked again after the 2 h wait. After a direct success, the night catalogue comes from `/api/satellites` as before.
  3. `getNextSatelliteTry`: with usable data it gives the CelesTrak time as before. With data that cannot be used, it gives the earlier end of the two waits, and null when the server can be asked now. So the "next try at" line shows only when both wait, and the refresh asks the server at once while only CelesTrak waits. `useSatelliteTracking` and `InfoPanel` need no code change: the status is `error` when `loadSatelliteData` gives no usable data (item 176's timer is unchanged; only a comment changed).
  4. The cache format is compatible: `serverTriedAt` is optional, an old entry works as it is.
  5. Review (2026-10-25): a server list counts as a full fetch (`fetchedAt`), so after it the app asks CelesTrak again after 24 h, not after 2 h. A blocked IP then asks CelesTrak once a day, not 12 times. Test: no direct request at 2 h after a server success, one at 24 h.
- **Checked:** new tests: `utils.satelliteFeed` (`?all=1`: four lists in sequence, ISS first, no duplicates, trimmed, daily cache; stop after a failed list with the 2 h cache; empty list when the first list fails; no `all`: the night catalogue as before), `utils.satelliteData` (a direct 403, a network error and a timeout each give one server request and its records; each direct request has a timeout signal; no CelesTrak request within 2 h and the server asked for too old data; usable data without a server request; the 15 min server wait; an old cache entry; the night catalogue after a direct success), `useSatelliteTracking` (`ok` from the server data while CelesTrak fails, `error` when the server fails too). Existing `satelliteData` tests changed for the extra server request. Typecheck, lint, build and all 2153 tests pass (one `SunTracker` badge test failed once under load and passed on the rerun). Browser (built app, 390 × 844, `celestrak.org` mapped to NOTFOUND, `/api/satellites?all=1` stubbed): one direct request, then one server request; the cache holds the server record (1 record), no CelesTrak request after it. Run with an empty server answer: no records, `serverTriedAt` set.
- **Not checked:** the red status line and the refresh in the browser (the panel did not show the status in the headless run: not looked into; the hook and `InfoPanel` tests cover them); the real Vercel Edge function against CelesTrak (no request to `celestrak.org` from this computer); a real firewall block (the 8 s timeout is tested only as a signal on the request). **Deviation:** the 3-day data age limit exists twice (`satelliteUtils` and `satelliteData`): the `satelliteData` tests mock the module, so a shared constant would break them, and the Edge bundle takes only `satelliteData`.

### 178. Collection: no base badge for the plane — S — [SUN-CHASER-29](https://ainabler.sentry.io/issues/SUN-CHASER-29) — **✅ Done**

- **Feedback (2026-10-24 18:25 CEST, Ravensburg):** "Badges for standard air plane and satellite can be removed I think".
- **Now:**
  - The collection has 140 badges (`tests/utils.collection.test.ts`), 53 of them eggs.
  - Item 138 retired the base badges `sun`, `moon`, `terrain` and `satellite` (`RETIRED_IDS`, `collection.ts`). They are not in `BADGES`. An old save keeps them in storage; they do not show and do not count (`countCollected`).
  - `plane` is the one base badge left: group sky, no rarity, name `plane.airliner`. It is the first cell of the plane row (`CollectionView`, 6 cells). A double tap on a decorative plane or on a live plane gives it (`badgeForTarget`: `plane` and `livePlane`). A live plane also gives a haul badge (`plane:regional` … `plane:ultraLong`, common to very rare) when its route comes (`badgeForRoute`).
  - Satellites: the tracked satellites give a size badge (`satellite:small|medium|large|giant|iss`, common to very rare). The decorative dot gives no badge (Lutz, 2026-10-15). There is no base satellite badge now.
  - So "standard air plane" is most likely `plane`. "Standard satellite" has no badge now. It can mean the old base badge (gone since item 138) or the common `satellite:small`.
- **Spec (options):**
  - **A Remove the base `plane` badge** (as item 138 did for the others): `plane` goes to `RetiredBadgeId` and `RETIRED_IDS`; `badgeForTarget` gives no badge for `plane` and `livePlane`. The decorative plane opens its card and gives no badge. A live plane gives its haul badge when the route comes. 139 badges; the plane row has 5 cells. Old saves keep the id, hidden and not counted.
  - **B A and the satellite sizes:** also retire the 5 `satellite:*` badges. 134 badges. The satellite card stays.
- **Check:** `utils.collection`: 139 badges; no `plane` id; `badgeForTarget` null for `plane` and `livePlane`; an old save with `plane` counts 139 at most. `CollectionView`: the plane row has 5 cells. `SunTracker`: a double tap on a decorative plane opens the card and shows no "Badge unlocked". `i18n.test` (the key `plane.airliner` stays in use by the card).
- **Open:** (a) A or B? (b) Is "standard satellite" the size badge `satellite:small`, or only the old base badge?
- **Decision (Lutz, 2026-10-25):** A, the base `plane` badge only. The satellite size badges stay.
- **Built:** `plane` moves to `RetiredBadgeId` and `RETIRED_IDS` (`src/utils/collection.ts`). It is not in `BadgeId` and not in `BADGES`: 139 badges. `badgeForTarget` gives null for `plane` and `livePlane`; a live plane gives its haul badge (`plane:regional` … `plane:ultraLong`) when its route comes (`badgeForRoute`, not changed). A double tap on a decorative plane opens the card and gives no badge. The cards do not change: the key `plane.airliner` is still the card title. `CollectionView`: the plane row has the 5 haul cells and no base cell. `isStateRow` and the row filter no longer test for a base badge id (the `plane` entry of `STATE_BASES` stays, it is the `base` of the hauls). The unused `plane` case of `BadgeArt` is removed. Old saves: `loadCollection` keeps the `plane` id, so the next save writes it back. It does not show and `countCollected` does not count it. The satellite size badges stay.
- **Checked:** `utils.collection` (139 ids, unique; no `plane` id; `badgeForTarget` null for `plane` and `livePlane`, and no state badge for them; an old save with `plane` keeps it through load and save and counts without it; `countCollected` counts `plane:long` and not `plane`). `CollectionView` (the plane row is the 5 hauls, no `plane` cell; an old save with the 5 retired ids shows and counts 3). `SunTracker` (a double tap on a decorative plane opens the "Airliner" card, no "Badge unlocked", nothing in storage). `tests/i18n.test.ts` passes. Typecheck, lint, build and all 2140 tests pass (2139 before; 2 `SunTracker` tests timed out once under load, and passed on a rerun). Not checked: the built app in a browser, a live plane tap with a real route, and a real phone.

### 179. Rotating the phone: fish stay below the horizon — S — [SUN-CHASER-2A](https://ainabler.sentry.io/issues/SUN-CHASER-2A) — **✅ Done**

- **Feedback (2026-10-24 18:26 CEST, Ravensburg):** "When rotating from portrait to landscape sometimes fish or boats can end up above the horizon".
- **Now (`CloudLayer`):**
  - Each fish and boat is at `top: y%` of the layer, so a rotation lays them out again at once. The sea follows `containerDimensions.height × 0.65` within about 150 ms (debounced).
  - **Fish lane change (item 102):** the move to the new lane is in px, computed once at the start: `shift.dy = (y − path.y) × window.innerHeight / 100` → `--shift-dy: …px` → `translateY(var(--shift-dy))`, `3 s ease-in-out … both`. With `both`, the fish keeps the move for the rest of its crossing. The hunt moves of the minnows (`--hunt-dy`) are px too. A move can be up to about 26 % of the height (`FISH_DEPTH_SPAN`).
  - **Boats:** `y` is 67 % or more, so the waterline is always below the horizon (65 %). No px offset found. A tall hull (cargo ship, tall ship) stands above the horizon by design.
- **Root cause:** a lane move in px keeps its size when the height changes. Example: in portrait (844 px) a fish moves up 20 % = −169 px. In landscape (390 px) the same −169 px is −43 %: a fish at 70 % goes to 27 %, far above the horizon. Landscape to portrait gives a fish that is too low, not too high. It happens only when the rotation comes during or after a lane change of a fish that is still crossing, so "sometimes".
- **Reproduced:** by calculation. A browser run (390 × 844 → 844 × 390, 3 runs, all hosts stubbed) had a fish and a boat but no lane change at the rotation; both stayed below the horizon.
- **Spec:** the lane move and the hunt moves are in % of the layer height, not in px (for example `calc(var(--shift-p) * 1cqh)` with the layer as the size container). A rotation then scales the move with the layout, with no jump. Both directions are fixed.
- **Check:** a `CloudLayer` test: the lane and hunt variables have no `px`; a fish that moved 20 % up at 844 px is still 20 % up after a resize to 390 px. Browser: a rotation during a lane change (forced with the test hooks), the fish box stays below `0.65 × height` at 0.1, 0.4, 1.5 and 4 s.
- **Open:** (a) Boats: the code keeps them below the horizon. Was it a tall hull above the horizon line (by design), or is there a screenshot?
- **Decision (Lutz, 2026-10-25):** fix the fish only. Boats stay as they are.
- **Built:**
  - The lane move (`shift.dy`, `--shift-dy`) and the minnows' hunt moves (`dy` in `planPreyHunt`, `--hunt-dy`) are now a number in % of the layer height, with no unit. The keyframes `sceneLaneShift` and `sceneHuntShift` use `translateY(calc(var(--… -dy) * var(--layer-h, 100vh) / 100))`. The 3 s easing, the `both` fill, the scale and fade, and the hunt timing are as before.
  - `--layer-h` is the layer's height in px. `CloudLayer` sets it on the layer root from `clientHeight` at mount, and again on each `ResizeObserver` callback (a `resize` listener when there is no `ResizeObserver`). It sets the property on the node and does not render again. A rotation changes the height, and a move in progress scales with it.
  - **Why not `cqh`:** a size container applies layout containment. That makes the layer a stacking context, and the z-order of the fish (5), the water layers (5 and 6) and the boats (7) in the scene would change. A custom property has no such effect.
  - Boats are not changed (decision).
  - **Deviations:** (1) The browser check used a probe element with the real `sceneLaneShift` animation, not a real fish: the test hooks (`?fish=`, `?hunt=`) cannot force a lane change, which needs a boat that meets a fish on its fallback lane. (2) The `CloudLayer` test checks the variables and the keyframes text, and does not run a lane change in jsdom (jsdom has no layout).
- **Checked:** unit tests: `CloudLayer` (the H3 minnows' `--hunt-dy` has no `px`; `--layer-h` is 844 px at mount and 390 px after a resize callback; the keyframes use the calc with `--layer-h` and no bare `translateY(var(--shift-dy))`; the plan's `shift.dy` is 50 for a move of 50 %), `utils.sharkHunt` (the minnow speed limit, now with `dy` in %). Browser (headless Chromium against `vite preview`, BigDataCloud stubbed, CelesTrak not resolved, other hosts blocked): a probe at `top: 70%` with `sceneLaneShift` and `--shift-dy: -20`, 390×844, then 844×390 0.5 s into the move. After the rotation the probe was at 267, 258, 212 and 195 px at 0.1, 0.4, 1.5 and 4 s; 195 px is 50 % of 390 px, so the move stayed 20 % of the height. Not checked: a real fish lane change during a rotation, a real device, landscape to portrait (it uses the same variable).

### 180. Radio: Play works after a pause outside the app — S — **✅ Done** — [SUN-CHASER-2B](https://ainabler.sentry.io/issues/SUN-CHASER-2B)

- **Feedback (2026-10-25 18:53 CET, Ravensburg):** "Play after pause outside the app not possible for radio".
- **Now:**
  - `MusicPlayer` makes one `<audio>` element (`preload="none"`). It sets `src` at the start and on a station change, never on a pause or a play.
  - The React state `isPlaying` is the only state. One effect calls `play()` or `pause()` when `isPlaying` changes. The element has listeners only for `error` and `canplay`, none for `pause`, `play`, `ended` or `stalled`.
  - Media Session (item 90): the `play` handler is `setIsPlaying(true)`, the `pause` handler `setIsPlaying(false)`. `playbackState` follows `isPlaying`, not the element.
  - **Pause in the notification or on the lock screen:** `isPlaying` goes false and the element pauses. Play then calls `play()` on the same element with the same `src`. A paused live HTTP stream often does not continue: the server closes the idle connection, and the element stays silent or stalls. Nothing loads the `src` again.
  - **Pause by the OS** (a headset button, another app takes the audio, a call): the element pauses itself, but `isPlaying` stays true and the switch shows "on". Play in the notification sets `isPlaying` to true again: no change, so the effect does not run and `play()` is never called. In the app, the first tap on the switch turns it off, and only the second plays.
- **Root cause (likely, both):** (1) the state and the element go out of sync after an OS pause, so Play does nothing; (2) a play after a pause uses the stale live stream. Both need a real phone to confirm.
- **Spec:**
  1. **A new stream on each start:** when the radio starts (switch, notification Play, a station change), set `src` from the current station, then `play()`. On a pause, also remove the `src` and call `load()`: this closes the stream and saves data.
  2. **The switch follows the element:** `pause` and `play` listeners set `isPlaying` to the element's real state. The Media Session `play` handler always runs the start of spec 1. `playbackState` follows the element. A `pause` event during a station change does not turn the radio off.
  3. After a call or another app, the radio does not start by itself: it waits for a tap.
  4. The item 176 rule stays: an `AbortError` gives no "Playback failed".
- **Check:** `MusicPlayer` tests with a fake audio element: after a pause and a play, `src` is set again before `play()`; a `pause` event from the element turns the switch off; the Media Session `play` calls `play()` when the element is paused but `isPlaying` is true; no toast for an `AbortError`; a station change keeps the radio on. Real phone (Play test app): pause in the notification, wait 1 min and 10 min, Play; pause by a headset button, a call and another app (YouTube), then Play in the notification and in the app; screen off; Wi-Fi and mobile data; five quick pause/play pairs.
- **Open:** (a) Should a pause close the stream (spec 1: saves data, a start takes 1–2 s), or keep it for a faster start when the pause is short? (b) Spec 3: wait for a tap (recommended), or start again by itself after a call?
- **Decision (Lutz, 2026-10-25):** a pause closes the stream (spec 1), and after a call or another app the radio waits for a tap (spec 3).
- **Decision change (Lutz, 2026-10-25, review):** a pause keeps the `src`. Chrome on Android shows the media notification only while the page has a media player. A pause without `src` and with `load()` ends the player, so the notification and its Play button would go. A start still sets `src` again, so Play gives a fresh stream. A paused live stream uses little data: Chrome stops reading, and the station closes the idle connection.
- **Built:** `MusicPlayer.tsx` only.
  - `startStream(index, reportFailure)` sets `src` from the station, then `play()`. The switch, the notification Play and a station change or error skip use it. The switch and Play show the "Playback failed" toast; a station change or error skip only logs. An `AbortError` gives no toast (item 176).
  - A pause (switch off, notification Pause, or an OS pause) calls `pause()` on a playing element. The `src` stays (decision change above), so the notification keeps its Play button. A paused element is not paused again.
  - `pause` and `play` listeners on the element set `isPlaying` to its real state. After an OS pause the switch turns off and the radio waits for a tap: no automatic restart.
  - Media Session `play` runs `startStream` when `isPlaying` is true (element paused by the OS), and sets `isPlaying` when it is false (the effect then starts). `playbackState` follows `isPlaying`, which follows the element.
  - Guard for our own `src` change: `ignorePauseRef` is set before the new `src` and cleared by the `play` event of that start. A `pause` event in between (a station change on a playing element, or a late event of an earlier pause) does not turn the radio off.
  - Deviation: the first `src` is no longer set when the player mounts (the old mount call of `playStream`). The radio sets it at the first start.
  - The `play` listener sets only the switch, not the rain sound (a station change must not turn the rain button on again).
- **Checked:** unit tests with a fake element (`play`, `pause`, `load` spies): a pause keeps the `src` and calls no `load()`; after a pause and a play, `src` is set again before `play()` (a stale value is replaced); an element `pause` turns the switch off and starts nothing; Media Session `play` calls `play()` when the element is paused and `isPlaying` is true; a `pause` event of a station change does not turn the radio off, a later one does; `playbackState` follows the element events; an `AbortError` gives no toast. Typecheck, lint, build and all 2145 tests (129 files; 2139 before) pass. Not checked: a real phone. The `pause` event on a `src` change differs between browsers: the guard covers both cases, but only a real Chrome on Android shows it. The phone checks of the **Check** line (pause in the notification and check that its Play button stays and plays, 1 and 10 min wait, headset button, a call, YouTube, screen off, Wi-Fi and mobile data, five quick pause/play pairs) are open.

### 181. Cloudflare: the first script inline, with its CSP hash in dist/_headers — M

- **Why:** on slow 3G, one request costs one round trip (2 s on the P3 setup of item 174). Today two requests run in a row before the app starts: the HTML, then the script. An inline first script removes the second one.
- **Evidence (2026-10-25, item 174):** the CSP has `script-src 'self'`, so an inline script needs its hash in the CSP, and the CSP stays strict (no `'unsafe-inline'` for scripts). Vercel reads `vercel.json` before the build, so a hash made at build time cannot reach it (tested with Vercel CLI 65.2.0). Cloudflare Pages reads `dist/_headers` after the build, so a build step can write the hash there.
- **Expected gain:** about 2 s on the sky: P3 sky 8.0 s (after item 174) to about 6 s. The first-load graph is 19 files (415 kB, 149 kB gzip), so the first-load code must be bundled into one inline script of about 150 kB gzip. The lazy chunks stay files. The HTML then carries the script and is not cached apart from it: a second visit relies on the service worker.
- **Spec:**
  1. A Vite build step (no new dependency) bundles the first-load code (the entry and its static imports) into one script and puts it inline in `index.html`.
  2. The step computes the SHA-256 of the inline script and writes `'sha256-...'` into `script-src` in `dist/_headers`. The headers of `public/_headers` for every other directive stay as they are.
  3. `tests/headers.test.ts` checks, on a build, that `dist/_headers` holds the hash of the inline script and that `script-src` has no `'unsafe-inline'`.
  4. Check the service worker: the precache holds the new `index.html`, an update replaces it, and the offline start works.
  5. Measure with the P3 script of item 174: first paint, sky, place name.
- **Depends on:** item 16 (the move to Cloudflare, PR #194).
- **Done when:** the P3 setup shows the sky in 6 s or less; the CSP has the hash and no `'unsafe-inline'` for scripts; a change in the source gives a new hash in the build with no manual step; the offline start and a service worker update work; the tests pass.

### 182. Native iOS app for the App Store — M

- **Why:** Lutz (2026-10-25): "create a native iOS app … 1 to 1 copy of the original PWA, all permissions granted", for an App Store release.
- **Depends on:** item 16 (the host: the TWA and the iOS app use the same one; change both with the move to Cloudflare, PR #194).
- **Spec:**
  1. A Swift WKWebView shell in `ios/` that shows the live PWA from the TWA host (`sun-chaser.vercel.app`), as the Play app does: a web deploy updates the app with no store release. Bundle ID `com.ainabler.sunchaser`, iPhone and iPad, all orientations, iOS 16 or later.
  2. The app behaves as the home-screen PWA: `navigator.standalone` is true (no install prompt), the screen stays on, the page draws under a light status bar, other sites open in an in-app Safari view.
  3. Permissions with one system prompt each, no second web prompt: location (Core Location, with the Permissions API `change` event of item 170), the compass (granted), notifications (UserNotifications behind `Notification` and `showNotification`), saving the share picture to Photos.
  4. The radio plays in the background (`UIBackgroundModes: audio`). The service worker runs (app-bound domain), so the app opens offline after the first start; the first start with no connection says so.
  5. App Store (guideline 4.2): reminders also come while the app is closed. The page gives iOS the sunset reminders of the next 14 days (`getLaterSunsets`, the countdown's line-of-sight rule, no polar days) and the next ISS pass (`window.sunChaserReminders`, `getNativeReminders`). Each start replaces them. A browser keeps the page reminder.
  6. Premium through the App Store (guideline 3.1.1): the page script answers usePremium's Digital Goods API and Payment Request with StoreKit 2. Product `com.ainabler.sunchaser.premium`, non-consumable, €3.99 / US$3.99 (item 45). While `PREMIUM_ENFORCED` is off, nothing is locked.
  7. Privacy manifest as `/privacy`; launch screen, icon, native texts in the five languages.
- **Done when:** the app builds; in the simulator it shows the current production bundle, with the place at the simulated location and no web prompt; a denied location shows "choose a place" and a later grant opens the scene; the compass permission resolves `granted`; a notification and a scheduled reminder arrive, also with the app closed; the service worker controls the page; links open in Safari; German shows German. Then the release steps in `ios/README.md`.
- **Built:** `ios/` (see `ios/README.md`): `App.swift` (app and scene delegates, the banner while open), `WebViewController.swift` (host, links, compass permission, offline page, the debug test-run switches), `Bridge.swift` (Core Location, UserNotifications, StoreKit, the page script), `Store.swift` (StoreKit 2), `SunChaser.storekit` and `SunChaserTests`, `Info.plist`, `PrivacyInfo.xcprivacy`, the string catalogs, the icon from `store/play-icon.svg`. Web: `getNativeReminders` and the `place` argument of `useSunsetReminder`, `getLaterSunsets` and `REMINDER_DAYS` (`sunsetReminder.ts`), the native path of `useSatellitePassReminder`. In the iOS app the reminder toggles and their toasts say "also when the app is closed" (`reminder.toggleClosed`, `reminder.onDescriptionClosed`, `issReminder.toggleClosed`, `issReminder.onDescriptionClosed`; five languages).
- **Checked (2026-10-25, Xcode 27.1, iOS 27.0 simulator, iPhone 17 Pro and iPad Pro 13", test-run mode):**
  - The page is the production bundle (`index-C_8G10gB.js`). `navigator.standalone` true, the service worker controls the page, Web Share with files, Media Session and Wake Lock present, no Fullscreen API (as Safari on iPhone).
  - First start: one iOS location prompt with our text, the loading screen "Waiting for location access", then Ravensburg. Denied: "No location: choose a place"; a grant while the app runs opens the scene with no reload. In German the prompt, the page and the compass labels are German.
  - Compass permission `granted` with no prompt. Notification prompt from `Notification.requestPermission()`; a reminder through `showNotification` shows as a banner with the app open; a scheduled reminder arrives with the app quit.
  - Share: "Share this view" captures the scene (a 517 KB PNG) and opens the iOS share sheet; "Save Image" asks once and saves to Photos. A `target="_blank"` link opens the in-app Safari view.
  - The fullscreen button enters and leaves the Fullscreen API (WKWebView's `isElementFullscreenEnabled`; without it the page showed a button that did nothing).
  - The radio plays on with the app in the background (page hidden, timers run, Media Session `playing`). Landscape and the iPad show the wide layout. A first start with no connection shows "No connection" and "Try again".
  - Web: typecheck, lint, all tests pass (two satellite status tests are flaky under load, also on `main`).
  - StoreKit (`SunChaserTests`, local `SunChaser.storekit`): the details give `premium` at 3.99 USD; a purchase is listed with its token; a refund and a failed purchase are not; an unknown SKU throws. In the app, the page's `getDigitalGoodsService` gets the product, an unknown provider is refused, and a Payment Request reaches StoreKit and rejects on its error (the page then shows "purchase failed").
  - After the merge (2026-10-26, live bundle `index-BvNdkfJb.js`): turning on the sunset reminder in the app gives iOS 14 reminders, today 16:52 ("Sunset in 15 minutes, at 17:07", the line-of-sight sunset) to 8 November.
  - Web tests that waited too briefly on a loaded machine: the satellite status tests (also on `main`) and the 40-minute weather test.
- **Open:** real iPhone: compass heading, the lock-screen radio controls, a reminder on a locked phone, a sandbox purchase and restore (Xcode's StoreKit test environment answered an app purchase with ASDServerErrorDomain 537 without a development team). The App Store steps in `ios/README.md` (developer account, the in-app purchase, listing, screenshots, review).

### 183. CelesTrak usage policy: stop after an error, report it, cache on disk — S — **✅ Done**

- **Why:** CelesTrak's answer to the unblock request of item 177 (Dr. T.S. Kelso, 2026-10-26). The home IP went into the firewall on 2026-10-19 11:49 UTC for "ignoring over 50 HTTP 403 errors in under 2 hours". Between 11:36 and 11:45 UTC the IP asked for `stations`, `visual` and `last-30-days` 54 times, and for `GROUP=active` 46 times. A repeat of the same query before the data updates (every 2 h) gets a 403. CelesTrak removes the IP from the firewall when we confirm three actions: (1) read the usage policy and the GP documentation, (2) software checks for a non-200 answer, stops, and reports it to a person, (3) a central server keeps the data in a cache on disk, not in memory.
- **Root cause of the `active` requests:** in `npm run dev` and `vite preview`, the `edgeApi` plugin runs `handleSatellitesRequest` on the developer's computer, with no cache. Each page load at night downloaded `GROUP=active` (7 MB) from the home IP. The item 165 persona runs opened the app as a first visit many times. The Playwright stub of `celestrak.org` stopped only the browser requests, not this server request.
- **Now (before this item):**
  - The app (`loadSatelliteData`) and the server (`satelliteFeed`) accept only a 200 and stop at the first failed list. The app waits 2 h (24 h after a server success), the edge keeps an error answer 2 h. Nothing reports an error to a person.
  - The edge cache has two entries that download `active`: `/api/satellites` (the night catalogue after a direct success) and `/api/satellites?all=1` (item 177).
  - Two loads at the same time (the tracking switched on twice, a refresh during a load) send the same requests twice. The Vercel log of 2026-10-25 22:56 shows two edge cache misses 2 s apart from one phone.
- **Spec:**
  1. **Dev server:** each CelesTrak URL comes from a file in `~/.cache/sun-chaser-celestrak` (all worktrees use the same folder), downloaded at most once a day. Requests at the same time wait for one download. A failed download (no 200, a timeout) writes a `.stop` file with the reason. Then no download of that URL starts until a person deletes the file. The console shows the reason and the file.
  2. **Report to a person:** the app reports a direct non-200 answer to Sentry (`CelesTrak: HTTP 403 for stations`, warning). The server sends the reason of a failed list in the header `X-Celestrak-Status` (`HTTP 403 for active`, `TimeoutError for stations`) and in the function log. The app reports the header to Sentry (`CelesTrak: server: …`). A network error in the browser (offline, a firewall drop) is not reported: it is not an answer from CelesTrak.
  3. **One download of `active` per edge cache:** after a direct success, the app takes the night catalogue from `?all=1` (`dedupeRecords` keeps the newer direct copy of the groups). The plain `/api/satellites` (older app versions) answers 308 to `?all=1`, with the daily cache, and downloads nothing.
  4. **One load at a time:** a call of `loadSatelliteData` while a load runs gets the same promise.
- **Check:** `scripts.celestrakDiskCache`: one download for two requests at once and for a second dev server; a new download after a day; after a 403 no download until the `.stop` file is deleted; other hosts pass through. `utils.satelliteData`: the report of a direct 403 with its group, no report for a network error; the report of the server header; two loads at once make one set of requests; the night catalogue from `?all=1`. `utils.satelliteFeed`: the plain path gives 308 to `?all=1` with no download; the header and the log name the failed list and the reason (403, network error, timeout); no header after a full run.
- **Owner:** after the merge, confirm the actions to CelesTrak (e-mail draft in this session). After the unblock, delete the `.stop` files in `~/.cache/sun-chaser-celestrak` that the blocked IP wrote. Done: Lutz confirmed on 2026-10-26, CelesTrak removed the IP from the firewall on 2026-10-29, and the four `.stop` files were deleted the same day.
- **Open:** Vercel's edge may not combine two cache misses at the same time, so two regions or two misses can each download `active` (one 403 at most per miss, then the 2 h error cache). After item 16 (Cloudflare), `/api/satellites` needs the same cache (the Cache API or KV), because a Worker's `fetch` does not use the edge cache by itself.
- **Built:** `scripts/celestrakDiskCache.ts` (`celestrakFromDisk`), used by `vite.config.ts` for `/api/satellites`. `satelliteFeed`: `fetchList` gives the reason of a failure; `handleAllRequest` sets `X-Celestrak-Status` and logs it; the plain path answers 308. `satelliteData`: `loadSatelliteData(now, fetch, report)` with one load at a time; `NIGHT_CATALOGUE_URL` and `fetchNightCatalogue` are removed (the night catalogue comes from `ALL_GROUPS_URL`). `useSatelliteTracking` reports through `monitoring.captureMessage`.
- **Checked:** the tests above, typecheck (app and `tsconfig.node.json`), lint, build. On this computer 13 tests in other files (Sentry tags, the place name, the sunset show) also fail on `main` (Node 23 here, Node 22 in CI, where `main` is green).

### 186. Turning points: daylight ticker, countdown card, horizon calendar, polar countdown — L

- **Feedback (2026-10-26):** "New feature idea: track sunset times over the year, how long until the next equinox or midwinter / midsummer. Create some creative ideas and pitch them to me in a lookbook."
- **Lookbook:** [Turning Points](https://claude.ai/artifact/MQfftJH9eTZQ78En9Gabg6) (private), 17 ideas: countdowns C1–C4, year views Y1–Y5, moments M1–M4, add-ons X1–X4.
- **Picks (Lutz, 2026-10-28):** "C2, C4, Y4, M4, X1, X2, X3 - polar countdown only available if your in that region, y4 able to turn on and off in c2 field".
- **Decisions (Lutz, 2026-10-28):** X1 was written for Y1 and Y3 (not picked): it goes to C2, C4 and Y4. X3 named ideas that were not picked: Premium is Y4, C4 and X1; C2, M4 and X2 are free. Spec, then build.
- **Spec:**
  1. **Daylight card (C2):** a new card "Daylight" in the panel, after Golden & Blue Hour, closed at the start (like item 24). Its body loads with `lazy()` when it opens (item 174). It shows:
     - Today's daylight ("9 h 41 min") and the change against yesterday in minutes and seconds ("▼ 3 min 12 s less than yesterday"). The change is always from the flat horizon.
     - A sparkline of the daylight from 45 days ago to 45 days ahead, with a dot for today.
     - "Shorter every day until the solstice in 55 days." and "That is 60 % of the longest day (16 h 2 min)." By hemisphere.
     - A row with the next turning point (midsummer, midwinter, spring or autumn equinox, by hemisphere), its day and time in the place's time zone, and how many days until it. The C4 share button is in this row.
     - The Y4 switch "Sunset points on the horizon".
     - Polar night or polar day: the value is "Polar night" or "Midnight sun", without the change line.
  2. **X1 in C2:** with a line-of-sight profile, the value is the daylight behind the ridge (terrain sunrise to terrain sunset), with the gold plus and "flat horizon 9 h 41 min" under it. The sparkline then has two lines: behind the ridge (bright, one sample per week, as a terrain day costs about 0.3 ms on a Mac) and the flat horizon (faint, one sample per day).
  3. **Countdown share card (C4, Premium):** a 1080 × 1350 PNG on a canvas, like item 68: the number of days (big), "days until midwinter", the place name, the day and time of the turning point, the year's daylight curve with today's dot, the app mark. On the day: "Midwinter" and "is today". X1: with a profile, the curve is behind the ridge (weekly samples), the flat curve is faint. The button uses `requirePremium` and `shareOrDownload`, as `ShareCardButton`.
  4. **Horizon calendar (Y4, Premium):** with the switch on, the scene shows where the sun sets on the turning points. Three dashed gold marks stand on the horizon at the sunset azimuths of the June solstice, the September equinox and the December solstice of this year, each with a small icon pill on the water (sun: midsummer, half circle: equinox, snowflake: midwinter). One dot per week (26 weeks back and 26 ahead) on the water at that day's sunset azimuth: the dots bunch up at the solstices. Ahead: gold; behind: faint white; today: a white dot. Nothing moves (calm motion): the layer fades in and out with the cardinal labels. Compass mode uses the same azimuth mapping. A polar day or night has no sunset: no dot and no mark for that day.
  5. **X1 in Y4:** with a profile, each mark starts on the ridge at its azimuth, not on the flat horizon.
  6. **Y4 switch:** in the Daylight card, with the gold plus, through `requirePremium`. Off at the start; the choice is saved (`turningPoints.ts`). While Premium is locked, the scene shows no marks.
  7. **Polar countdown (M4):** only at a place with a polar night or a midnight sun in the next 366 days (no Tromsø example elsewhere; no scan below 65° latitude). In the Daylight card: the next event ("Last sunset before the polar night in 30 days", "The sun is back in 12 days", "Midnight sun starts …", "The sun sets again …") with its day and time, and the windows ("Polar night: 27 Nov – 15 Jan (50 days)", "Midnight sun: …").
  8. **"Full circle" badge (X2):** an egg badge for the app open (live, not in a time preview) on all four turning-point days within one year. The days count by the device clock, as the season eggs (`calendarEvents`). The last day of each turning point is saved; the badge comes when the four saved days are within 365 days.
  9. **Texts:** all new texts in en, de, es, it, fr.
- **Check:** `utils.turningPoints`: names by hemisphere; the next turning point and its days in the place's time zone (on the day: 0); daylight and its change; the ridge samples; the horizon calendar (three marks, 52 dots, none on a polar day); the polar countdown (Tromsø: polar night and midnight sun windows; Ravensburg: none); the Full circle rule (four days within a year: yes; a gap of more than a year: no). `shareCard`: the countdown card data. Components: the card opens and shows the texts; the switch calls the toggle; the marks render in the scene with the switch on and not with it off. Browser (built app, 390 × 844, Ravensburg and Tromsø, BigDataCloud and CelesTrak stubbed): the card, the marks, the share PNG.
- **Built:** `src/utils/turningPoints.ts` (the next turning point, the daylight and its ridge samples, the year curve, the horizon calendar, the polar countdown, the saved switch and the Full circle days), `src/utils/countdownCard.ts` (C4 texts and canvas; `shareCard.ts` exports `token`, `FONT`, `drawAppMark`, `toPng` for it), `src/components/DaylightDetails.tsx` (the card body, a lazy chunk of 8 kB). `InfoPanel` has the card after Golden & Blue Hour. `SunVisualization` draws the Y4 layer (`horizonCalendar` prop) under the cardinal pills: the dots 30 px and the icons 56 px below the horizon. `SunTracker` keeps the switch (`isHorizonCalendarOn`, off while Premium is locked) and checks the Full circle days once a day. The badge `egg:fullCircle` (icon `IterationCw`) is in the egg group. 41 new texts in five languages.
- **Deviations:** the change against yesterday is always the flat value (a terrain time comes from a bisection with a 10 s tolerance, so its change would jump). "That is … % of the longest day" is left out at a place with a midnight sun ("24 h 0 min" says little; the polar countdown says more). The mark icons have no text: at 390 px the three marks are 37 px apart (Ravensburg), so a name would not fit; the card names the turning points.
- **Checked:** new tests `utils.turningPoints` (19), `utils.countdownCard` (3), `DaylightDetails` (5), `SunVisualization` horizon calendar (2); `utils.collection` counts 140 badges. Typecheck, lint, build and all 2227 tests pass. Browser (built app, `vite preview`, 390 × 844, every host but the app stubbed or blocked, a stub terrain tile with a western ridge): Ravensburg 28 Oct 2026: 10 h 12 min flat, 8 h 55 min behind the ridge, "▼ 3 min 12 s", midwinter in 54 days; the switch shows 3 marks (SW, W, NW) and 52 dots and is saved; the share button saves `sun-chaser-midwinter-2026-12-21.png` ("54 days until midwinter", both curves). Tromsø: the polar block ("Last sunset before the polar night in 30 days", Fri 27 Nov 11:56; polar night 28 Nov – 15 Jan, 49 days; midnight sun 19 May – 26 Jul, 69 days), only the equinox mark. No console errors except the blocked tree-cover host.
- **Not checked:** a real phone, the Full circle badge over a real year (unit tests only), the Web Share sheet (headless Chrome saves the PNG), compass mode with the marks (same azimuth mapping as the other horizon labels).

### 187. Horizon calendar: an info card on each mark — S

- **Feedback (Lutz, 2026-10-29):** "the sunset points of y4 need an info when clicked on the icon equinox, midsummer and midwinter solstice".
- **Spec:**
  1. Each icon pill of the horizon calendar (item 186, Y4) opens an info card (item 95), with the same double tap as every scene thing (item 116). The keyboard (Enter, Space) opens it at once. The tap target is 44 × 44 px around the pill, and the open card draws the ring around it.
  2. The card: kicker "Horizon" with the mark's icon; the title is the turning point (by hemisphere; the equinox mark is named after the next equinox, spring or autumn); "Direction" is the sunset azimuth of the mark; "Next" is the day and the countdown ("Sat, Mar 20 (in 143 days)", in the place's time zone); a field note on what the mark means. No rarity row and no badge: a date is not a find.
  3. The marks take taps only while the layer shows (it fades with the cardinal labels).
  4. Texts in en, de, es, it, fr.
- **Check:** `utils.sceneInfo` (the card), `utils.turningPoints` (each mark's next day), `SunVisualization` (a double tap calls the card with the ring id, the ring shows, no tap while faded). Browser: a double tap on a mark opens the card.
- **Built:** `getHorizonCalendar` gives each mark its `next` turning point. A new scene target `horizonMark` (`sceneInfo.ts`) with its card and the icons `turning:*`. `src/components/turningIcons.ts` holds the mark icons for the scene and the card's kicker. In `SunVisualization` each mark is a 44 px button with `data-scene-hit`, so a tap on it does not toggle the sky (item 136). `badgeForTarget` gives no badge. 5 new texts in five languages.
- **Checked:** new tests in `utils.sceneInfo` (1), `SunVisualization` (1), and the next days in `utils.turningPoints`. Typecheck, lint, build and all 2229 tests pass. Browser (built app, `vite preview`, 390 × 844, every host but the app stubbed or blocked), Ravensburg on 28 Oct 2026:
  - One tap opens no card. A double tap on the snowflake opens "Midwinter, SW (235°), Mon, Dec 21 (in 54 days)" with the ring.
  - The equinox mark gives "Spring equinox, W (271°), Sat, Mar 20 (in 143 days)". The sun mark gives "Midsummer, NW (308°), Mon, Jun 21 (in 236 days)".
  - No console errors except the blocked tree-cover host.
- **Not checked:** a real phone, compass mode, the southern hemisphere in the browser (unit tests only).
- **Follow-up (Lutz, 2026-10-29):** "the middle icon info text now only reads spring equinox, but isnt that a icon for both equinoxes?" Yes, it is.
  - The equinox mark's card is now titled "Equinox" (the button's name too) and has one row for each equinox, soonest first: "Spring: Mar 20 (in 143 days)" and "Autumn: Sep 23 (in 330 days)".
  - The short row names ("Frühling", "Herbst") and a date without the weekday keep each row on one line in German too.
  - `getHorizonCalendar` gives each mark a list `next`, and `getMarkName` names the mark.
  - Checked: all 2237 tests pass. Browser in en and de: both cards fit with no wrapped row.

### 188. Share cards: a short text with a deep link to the place and the moment — S

- **Why:** a shared card (item 68, view share item 78, countdown card item 186) sent only the picture. A friend who gets it in WhatsApp, a mail or a social post had no way to open the app at that sky.
- **Spec:**
  1. **Text:** `shareOrDownload` sends `text` with the files: `share.text` ("See this in Sun Chaser: {url}") in the five languages. The link goes in `text`, not in `url`: with files, share targets often drop `url`, but apps that take a caption or a body keep `text`. A target that takes no text (Save to Photos) ignores it. The download fallback has no text.
  2. **Link:** `buildShareLink` (`src/utils/shareLink.ts`): `{origin}/?v=<id>`, for example `?v=NDc2Nnw5NDh8aHNsdml8RXVyb3BlL0JlcmxpbnxjYndnbG4`. The id is base64url of `latitude×100|longitude×100|minutes since 1970 (base 36)|zone|check`; the check is FNV-1a (`hashSeed`) of a salt and the rest. The origin is the current host, so the link follows the move to `sun.chaser.page` (item 16). Latitude and longitude have two decimals (about 1 km); the card already names the town. The zone only when the sender knows it (a searched place). The moment (UTC minutes) only on the view card (the moment on screen, also during time travel); the countdown card has the place only.
  3. **No free Premium by URL:** a place set by hand and time travel are Premium (items 14, 170). Plain `lat`, `lon` or `t` params are not read, and an id with a wrong check value is ignored, so nobody opens a chosen place or time by editing the address. The salt is in the bundle, as is the Premium gate itself; a server-signed id helps only once Premium is checked on a server.
  4. **Open:** `SunTracker` reads the link once at start (`parseShareLink`). The place shows like a typed place (no geolocation request), with the zone from the id. The moment is a time preview (clamped to the time-travel range). The place is not saved: the recipient's saved place and the place-name language switch stay as they were. Then the id leaves the address (`withoutShareParams`; other params such as `egg` stay), so a reload or the next start shows the recipient's own place.
  5. A broken id or a wrong check value ignores the link. A bad zone is dropped alone.
- **Feedback (Lutz, 2026-10-29):** the text only "See this in Sun Chaser: LINK"; no plain deep-link params that anyone can use, but an id for the place and the time. Done in spec points 1–3.
- **Check:** `utils.shareLink`: an opaque id; rounding, the UTC minute, a zone with `+`, no zone and no moment; plain params, an edited, made-up or broken id are ignored; the id removed. `utils.shareCard`: the text goes to the share sheet. `ShareCardButton` and `DaylightDetails`: the exact text and link. `SunTracker`: a link opens its place, zone and moment, with no geolocation request, the saved place unchanged and the id removed.
- **Open:** a located (GPS) place has no `tz` in the link, so a recipient in another zone sees its clock times in their own zone (as for a typed place). The share title stays "Sunset" also on the countdown card.

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
  - **Country source:** the `countryCode` of the BigDataCloud reverse-geocode answer that `InfoPanel` already gets for the place name. `InfoPanel` passes it up with `onCountryChange`; `SunTracker` keeps it in state. No second call and no new CSP host. Since item 130: a cached answer, then the device time zone when the call fails, and Open-Meteo's `country_code` for a searched place. Still unknown: no national egg. The app does not guess the country from the language.
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
  - **Taps (item 123):** a double tap on a dressed boat opens the boat card, which names the day (item 128). During the French and US fireworks show, a tap on the empty sky opens the day's card (`EventSkyTaps`).
  - **Open:** none. A searched place keeps Open-Meteo's `country_code` (item 130).
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
