import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { scrubLocation } from './utils/sentryScrub'
import { translate } from './i18n'
import { loadLanguage } from './utils/language'

// Error reports + anonymous feedback (ROADMAP item 21). Off when no DSN is set
// (local dev, tests). No tracing, no replay, no user identity, no coordinates.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
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
    integrations: [
      Sentry.feedbackIntegration({
        autoInject: false, // opened from the InfoPanel, so no floating button over the scene
        showName: false,
        showEmail: false,
        isNameRequired: false,
        isEmailRequired: false,
        enableScreenshot: false, // a screenshot would show the location in the InfoPanel
        showBranding: false,
      }),
    ],
  })
}

// The error page is outside SunTracker's language context (ROADMAP item 67).
const fallbackLanguage = loadLanguage(navigator.language)
const errorFallback = (
  <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-background text-foreground">
    <p>{translate(fallbackLanguage, 'error.text')}</p>
    <button className="underline" onClick={() => window.location.reload()}>{translate(fallbackLanguage, 'error.reload')}</button>
  </div>
)

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={errorFallback}>
    <App />
  </Sentry.ErrorBoundary>
);

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
