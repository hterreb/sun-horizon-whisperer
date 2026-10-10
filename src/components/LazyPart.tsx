import React, { Suspense } from 'react';
import * as Sentry from '@sentry/react';

// A part of the app that loads on demand (ROADMAP item 125). Nothing shows while it
// loads. If it fails (its chunk does not load, for example offline before the precache
// is complete, or it throws), it stays hidden and the rest of the app goes on. The
// error still goes to Sentry, so a broken part is not silent.
class LazyPart extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    Sentry.captureException(error);
  }

  render() {
    return this.state.failed ? null : <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}

export default LazyPart;
