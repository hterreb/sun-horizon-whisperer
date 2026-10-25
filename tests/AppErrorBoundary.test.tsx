import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { preloadMonitoring } from '../src/utils/monitoring';
import AppErrorBoundary from '../src/components/AppErrorBoundary';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
import { captureException } from '@sentry/react';

const Broken = (): React.ReactElement => {
  throw new Error('render failed');
};

describe('AppErrorBoundary (ROADMAP item 174)', () => {
  beforeAll(preloadMonitoring);

  it('shows its children', () => {
    render(<AppErrorBoundary fallback={<p>error page</p>}><p>app</p></AppErrorBoundary>);
    expect(screen.getByText('app')).toBeInTheDocument();
  });

  it('shows the error page for a render error and reports it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the caught error
    render(<AppErrorBoundary fallback={<p>error page</p>}><Broken /></AppErrorBoundary>);
    expect(screen.getByText('error page')).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(expect.objectContaining({ message: 'render failed' }));
  });
});
