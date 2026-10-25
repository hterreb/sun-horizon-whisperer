import React from 'react';
import { captureException } from '@/utils/monitoring';

// The error page for a render error (ROADMAP item 67). Replaces Sentry.ErrorBoundary, which
// would put the whole SDK in the start bundle (item 174); the error still goes to Sentry.
class AppErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    captureException(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default AppErrorBoundary;
