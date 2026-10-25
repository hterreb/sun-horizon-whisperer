// The Sentry calls the app uses, and nothing else (ROADMAP item 174). monitoring.ts loads this
// file with `import()`. A dynamic import of '@sentry/react' itself keeps every export of the
// package (replay, tracing, profiling: 450 kB); this list lets the build drop the rest.
export { addBreadcrumb, addIntegration, captureException, captureMessage, init, setTag } from '@sentry/react';
