# Test Cases for Sun Chaser App

## 1. SunTracker & Main App Flow
- [ ] App loads and displays loading state while detecting location.
- [ ] App uses geolocation if available; falls back to default location if not.
- [ ] App fetches and displays real weather if available; falls back to default weather if not.
- [ ] App updates sun and moon positions every 30 seconds.
- [ ] App updates background gradient based on time of day and weather.
- [ ] App handles manual weather change and toggling between real/manual weather.
- [ ] App handles manual weather refresh.
- [ ] App enters and exits fullscreen mode, hiding cursor as appropriate.

## 2. SunVisualization & CloudLayer
- [ ] Sun, moon, and horizon are rendered according to calculated positions and time of day.
- [ ] Sun is visible only when above -18° altitude and not during storms.
- [ ] Moon is visible only at night/twilight and when above -6° altitude.
- [ ] Fireworks trigger when sun crosses the horizon.
- [ ] Clouds, rain, snow, and storm effects are rendered according to weather.
- [ ] Fishes are visible during clear, cloudy, overcast, and rain (but not at night/twilight or during storm/snow).
- [ ] Birds are visible during clear, cloudy, and overcast (not during rain/storm/snow or at night).
- [ ] Ships are visible in all weather except storms.
- [ ] Fishes, birds, and ships spawn, move, and are removed when off-screen or when weather/time changes.

## 3. InfoPanel
- [ ] InfoPanel displays sun, moon, twilight, and weather information correctly.
- [ ] InfoPanel collapses/expands sections as expected.
- [ ] InfoPanel fades out in fullscreen after timeout, reappears on mouse enter.
- [ ] Weather options and icons are displayed and selectable.
- [ ] Twilight and sun position labels are correct for all time-of-day transitions.

## 4. MusicPlayer
- [ ] MusicPlayer is visible and can be toggled in and out of fullscreen.
- [ ] Music can be played/paused, and volume adjusted.
- [ ] MusicPlayer tries fallback streams if one fails.
- [ ] MusicPlayer displays error toast if all streams fail.
- [ ] MusicPlayer displays correct icon for mute/unmute.

## 5. NightStars
- [ ] Stars are visible only at night/twilight.
- [ ] Star visibility is reduced by moon brightness.
- [ ] Shooting stars occasionally appear at night.

## 6. PWAInstallPrompt
- [ ] PWA install prompt appears when appropriate (not already installed, not recently dismissed).
- [ ] Prompt can be dismissed and does not reappear within 24 hours.
- [ ] Manual install instructions are shown for iOS/Android/Desktop as appropriate.
- [ ] Native install prompt is triggered if available.

## 7. MidnightGhost
- [ ] Ghost appears at exactly midnight and disappears after 10 seconds.
- [ ] Ghost floats and bounces within bounds.

## 8. Utility Functions & Hooks
- [ ] `getSunPosition`, `getSunTimes`, and `getTimeOfDay` return correct values for edge cases (e.g., polar day/night, invalid dates).
- [ ] `getMoonPosition` and `getMoonPhaseLabel` return correct values for all moon phases.
- [ ] `fetchCurrentWeather` uses cache if available and valid, otherwise fetches from API.
- [ ] Weather cache is invalidated after 30 minutes or significant location change.
- [ ] `useWakeLock` requests and releases wake lock as fullscreen is toggled.
- [ ] `useIsMobile` returns correct value for different screen sizes.
- [ ] Toasts are displayed, updated, and dismissed as expected.

## 9. UI Components (Button, Card, Tabs, etc.)
- [ ] All UI components render with correct styles and respond to props (variant, size, etc.).
- [ ] Accessibility: All interactive elements are keyboard accessible and have appropriate ARIA attributes. 