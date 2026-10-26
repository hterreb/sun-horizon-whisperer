# Sun Chaser for iOS

> summary: The native iOS app (ROADMAP item 182). A WKWebView shell that shows the live PWA
> (`https://sun-chaser.vercel.app/`), as the Android TWA does (item 16). A web deploy updates
> the app with no App Store release. Native bridges give location, compass, reminders that
> come also when the app is closed, background radio and a screen that stays on. This file
> covers build, run, the PWA → iOS mapping and the App Store release.

## Build and run

- Needs Xcode 16 or later (the project uses synchronized folders). Open `ios/SunChaser.xcodeproj`.
- Simulator: `xcodebuild -project ios/SunChaser.xcodeproj -scheme SunChaser -destination 'platform=iOS Simulator,name=iPhone 17' build`.
- Phone: set your team in Signing & Capabilities (`DEVELOPMENT_TEAM`), then Run.
- Automated simulator checks: launch a debug build with `-SunChaserTestRun YES` (`xcrun simctl launch booted com.ainabler.sunchaser -SunChaserTestRun YES`). It blocks BigDataCloud and CelesTrak, which ban or throttle the caller's IP (CLAUDE.md). The place name then comes from Photon. `-SunChaserTestLandscape YES` turns the app to landscape.
- Simulator runtimes: Xcode 27 has no Simulator.app (DeviceHub has no window). iOS 27.1 runs only the iPhone Duo; the other iPhones and iPads need iOS 27.0 (`xcodebuild -downloadPlatform iOS -buildVersion 24A434`).
- Page checks: `ios_webkit_debug_proxy -s unix:$(xcrun simctl getenv <udid> RWI_LISTEN_SOCKET)` gives the page's Web Inspector protocol on `localhost:9222`. Taps on system prompts: `axe touch -x <x> -y <y> --down --up --delay 0.3 --udid <udid>` (AXe; `axe tap` does not close them).
- Unit tests (StoreKit): `xcodebuild test -project ios/SunChaser.xcodeproj -scheme SunChaser -destination 'id=<udid>' -parallel-testing-enabled NO` (clones of the simulator hang on a loaded Mac; Xcode 27.1 can hang after `Executed`). To try a purchase from Xcode: Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration → `SunChaser.storekit`.
- Debug builds are inspectable: Safari → Develop → the simulator or phone → `sun-chaser.vercel.app`.
- Bundle ID `com.ainabler.sunchaser` (as the Play app). Version `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the target's build settings.

## Files

| File | Content |
|---|---|
| `SunChaser/App.swift` | App and scene delegates; shows a reminder while the app is open. |
| `SunChaser/WebViewController.swift` | The web view: host, links, compass permission, offline first start. |
| `SunChaser/Bridge.swift` | Core Location, UserNotifications and StoreKit for the page, and the page script. |
| `SunChaser/Store.swift` | Premium through StoreKit 2, behind the page's Digital Goods API. |
| `SunChaser.storekit` | Local StoreKit configuration: `com.ainabler.sunchaser.premium`, non-consumable, US$3.99. |
| `SunChaserTests/StoreTests.swift` | Unit tests of `Store` against the local configuration. |
| `SunChaser/Info.plist` | Location text, background audio, app-bound domain, launch screen, orientations. |
| `SunChaser/PrivacyInfo.xcprivacy` | Privacy manifest: coarse location, crash and diagnostic data, feedback; no tracking. |
| `SunChaser/*.xcstrings` | Native texts in en, de, es, it, fr. |

## The host

The host is in two places: `WebViewController.appURL` and `WKAppBoundDomains` in `Info.plist`.
Change both with the move to Cloudflare (item 16), together with the TWA host.

## PWA → iOS

| PWA (iOS home-screen app) | iOS app |
|---|---|
| `navigator.standalone` is true | Set by the page script, so `isInstalledApp()` is true: no install prompt. |
| Screen Wake Lock (installed app) | `isIdleTimerDisabled`: the screen stays on while the app is open. |
| `navigator.geolocation.getCurrentPosition` | Core Location: one system prompt. WKWebView would ask again on each start. |
| Permissions API `geolocation` + `change` | The Core Location state. A location allowed later in Settings opens the scene there (item 170). |
| `DeviceOrientationEvent.requestPermission()` (compass) | Granted with no prompt (`WKUIDelegate`). |
| `Notification`, `showNotification` (sunset and ISS reminders) | UserNotifications. A tag replaces the shown notification. Shown also while the app is open. |
| Reminder only while the page runs | Better than the PWA: `window.sunChaserReminders` (`getNativeReminders`) gives iOS the sunset reminders of the next 14 days (`getLaterSunsets`) and the next ISS pass ahead of time, so they come also when the app is in the background or closed. Each start replaces them. |
| Share card "Save Image" | `NSPhotoLibraryAddUsageDescription`: iOS asks once, then saves to Photos. |
| Radio in the background, lock-screen controls | `UIBackgroundModes: audio`. |
| Service worker, offline start | App-bound domain (`WKAppBoundDomains`): the service worker runs. A first start with no connection shows "No connection" and "Try again". |
| Links to other sites | An in-app Safari view; `mailto:` opens Mail. |
| Fullscreen button (`FullscreenButton`) | `isElementFullscreenEnabled`: the Fullscreen API works, as in Chrome on Android. (The iPhone home-screen PWA has no Fullscreen API and hides the button; without the setting WKWebView showed a button that did nothing.) |
| `black-translucent` status bar | Light status bar text; the page draws under it and pads with `env(safe-area-inset-*)`. |
| Splash | Launch screen: the logo mark on `#0F1016`, as the loading screen. |
| Premium (Play Billing: Digital Goods API, Payment Request) | The page script answers the same calls with StoreKit 2 (`Store.swift`): `getDetails` → the App Store product, `listPurchases` → the current entitlements, the Payment Request → a purchase (cancelled = `AbortError`). The App Store product ID is the bundle ID plus the Play SKU. While `PREMIUM_ENFORCED` is off, nothing is locked, as on Android. |

## App Store release

1. **Apple Developer Program** (99 USD per year), as an organization with the D-U-N-S number of the Play account (317376308), so the store shows the brand, not a private name.
2. **App Store Connect:** a new app, bundle ID `com.ainabler.sunchaser`, primary language English, category Weather (second: Navigation). Privacy policy URL `https://sun-chaser.vercel.app/privacy`.
3. **App Privacy** (the labels): the same as `PrivacyInfo.xcprivacy`. Data not linked to the user, no tracking: Coarse Location, Crash Data, Other Diagnostic Data, Customer Support. All for App Functionality.
4. **Signing:** set the team in the target, then Product → Archive → Distribute App → App Store Connect.
5. **Screenshots:** iPhone 6.9" and iPad 13" (the app supports iPad).
6. **Review notes** (paste into App Review Information), against guideline 4.2:
   > Sun Chaser shows the sun, the moon and the weather in a live sky scene for the user's location. Native features: Core Location for the user's position; the device compass (Core Motion) turns the sky with the phone; the daily sunset reminders (two weeks ahead) and the ISS-pass reminders are local notifications scheduled with the system, so they arrive while the app is closed; the lo-fi radio plays in the background with lock-screen controls; the app works offline after the first start. No account is needed. All features are free in this version.
7. **Premium:** create the non-consumable in-app purchase `com.ainabler.sunchaser.premium` (€3.99 / US$3.99, item 45) in App Store Connect and submit it with the release that turns on `PREMIUM_ENFORCED`. Before that, check a sandbox purchase and a restore on a phone: the Xcode test environment answered an app purchase with ASDServerErrorDomain 537 when the app had no development team (`StoreTests.swift`).
8. **Real-device checks:** compass heading, a reminder with the app closed, the radio on the lock screen.
