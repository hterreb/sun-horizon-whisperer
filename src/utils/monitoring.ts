import type { BrowserOptions, SeverityLevel } from '@sentry/react';

// Sentry is not in the start bundle (ROADMAP item 174): `startMonitoring` loads and starts it
// after the first render. The app calls Sentry only through this file. A call made before the
// start waits and then runs; a call with no DSN (dev, tests) goes straight to the module, which
// does nothing without `init`. Once the SDK is ready, a call runs at once (not in a later tick).
// A failed call never throws into the app.
type SentryModule = typeof import('./sentryEntry');

const hasDsn = Boolean(import.meta.env.VITE_SENTRY_DSN);
const loadSentry = (): Promise<SentryModule> => import('./sentryEntry');

// The SDK, once calls can run at once: after `init`, or (no DSN) once the module is loaded.
let ready: SentryModule | null = null;

let markStarted: (sentry: SentryModule) => void = () => {};
const started = new Promise<SentryModule>((resolve) => {
  markStarted = resolve;
});
const sentry = (): Promise<SentryModule> => (hasDsn ? started : loadSentry().then((sdk) => (ready = sdk)));

// Loads the SDK module without `init`; for a build with no DSN (tests) so that calls run at once.
export const preloadMonitoring = async (): Promise<void> => {
  if (!hasDsn) await sentry();
};

// Errors that happen before Sentry starts: kept, then sent once it runs.
const earlyErrors: unknown[] = [];
const onEarlyError = (event: ErrorEvent) => earlyErrors.push(event.error ?? event.message);
const onEarlyRejection = (event: PromiseRejectionEvent) => earlyErrors.push(event.reason);
export const watchEarlyErrors = (): void => {
  if (!hasDsn) return;
  window.addEventListener('error', onEarlyError);
  window.addEventListener('unhandledrejection', onEarlyRejection);
};

export const startMonitoring = async (options: BrowserOptions): Promise<void> => {
  try {
    const sdk = await loadSentry();
    sdk.init(options);
    window.removeEventListener('error', onEarlyError);
    window.removeEventListener('unhandledrejection', onEarlyRejection);
    ready = sdk;
    markStarted(sdk);
    earlyErrors.splice(0).forEach((error) => sdk.captureException(error));
  } catch {
    // The chunk did not load (offline): the app runs without error reports.
  }
};

const run = (call: (sdk: SentryModule) => void): void => {
  try {
    if (ready) call(ready);
    else sentry().then(call).catch(() => {});
  } catch {
    // Monitoring must not break the app.
  }
};

export const setTag: SentryModule['setTag'] = (key, value) => run((sdk) => sdk.setTag(key, value));
export const addBreadcrumb: SentryModule['addBreadcrumb'] = (breadcrumb) => run((sdk) => sdk.addBreadcrumb(breadcrumb));
export const captureMessage = (message: string, level?: SeverityLevel): void => run((sdk) => sdk.captureMessage(message, level));
export const captureException = (error: unknown): void => run((sdk) => sdk.captureException(error));

// For the feedback form: the SDK, once it runs.
export const whenMonitoringStarted = (): Promise<SentryModule> => sentry();
