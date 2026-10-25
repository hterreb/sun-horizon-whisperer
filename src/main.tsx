import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { scrubLocation } from './utils/sentryScrub'
import { startMonitoring, watchEarlyErrors } from './utils/monitoring'
import { loadDictionary, translate } from './i18n'
import { loadLanguage } from './utils/language'

// Error reports + anonymous feedback (ROADMAP item 21). Off when no DSN is set
// (local dev, tests). No tracing, no replay, no user identity, no coordinates.
// Sentry loads after the first render, not in the start bundle (ROADMAP item 174, see
// utils/monitoring.ts); an error before that is kept and sent when it runs.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  watchEarlyErrors()
  const start = () =>
    startMonitoring({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      // Sentry v11 replaced sendDefaultPii with dataCollection: collect no user info,
      // cookies, headers or bodies, and drop the location query params.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: { deny: ['latitude', 'longitude', 'lat', 'lon', 'name'] },
      },
      beforeSend: (event) => scrubLocation(event),
      beforeBreadcrumb: (breadcrumb) => scrubLocation(breadcrumb),
      // The feedback form loads on its first open (utils/feedback.ts, ROADMAP item 125).
    })
  // After the first frames: a slow phone has the line and the main thread for the sky first.
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 })
  else setTimeout(start, 1000)
}

// The error page is outside SunTracker's language context (ROADMAP item 67).
const fallbackLanguage = loadLanguage(navigator.language)
const errorFallback = (
  <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-background text-foreground">
    <p>{translate(fallbackLanguage, 'error.text')}</p>
    <button className="underline" onClick={() => window.location.reload()}>{translate(fallbackLanguage, 'error.reload')}</button>
  </div>
)

// The stylesheet loads without blocking the first paint (async-css in vite.config.ts, item 174):
// wait for it, then apply it, before the first render. A failed load renders anyway.
const stylesheetsReady = Promise.all(
  Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-async-css]')).map(
    (link) =>
      new Promise<void>((resolve) => {
        const apply = () => {
          link.media = 'all'
          resolve()
        }
        if (link.sheet) apply()
        else {
          link.addEventListener('load', apply, { once: true })
          link.addEventListener('error', apply, { once: true })
        }
      }),
  ),
)

// The first frame is in the start language (ROADMAP item 125). If the dictionary
// fails to load, render anyway: translate() falls back to en.
Promise.all([loadDictionary(fallbackLanguage).catch(() => {}), stylesheetsReady]).finally(() => {
  createRoot(document.getElementById("root")!).render(
    <AppErrorBoundary fallback={errorFallback}>
      <App />
    </AppErrorBoundary>
  );
});

// Register PWA service worker with immediate updates
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Reload when the user leaves the tab, not under them (AUDIT P-6).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) updateSW(true)
    })
  },
  onOfflineReady() {
  },
  onRegisteredSW(swUrl, r) {
    if (r) {
      // Force update check every hour
      setInterval(() => {
        r.update()
      }, 60 * 60 * 1000)
    }
  },
})
