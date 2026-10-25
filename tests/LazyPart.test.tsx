import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { preloadMonitoring } from '../src/utils/monitoring';
vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  captureException: vi.fn(),
}));
import { captureException } from '@sentry/react';
import LazyPart from '../src/components/LazyPart';

const Broken = (): React.ReactElement => {
  throw new Error('chunk failed');
};

describe('LazyPart (ROADMAP item 125)', () => {
  // Sentry is behind utils/monitoring (item 174): load it once, so the call runs at once.
  beforeAll(preloadMonitoring);

  it('shows its child', () => {
    render(<LazyPart><p>egg</p></LazyPart>);
    expect(screen.getByText('egg')).toBeInTheDocument();
  });

  it('hides a part that fails, keeps the rest of the app, and reports the error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the caught error
    render(<div><p>scene</p><LazyPart><Broken /></LazyPart></div>);
    expect(screen.getByText('scene')).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(expect.objectContaining({ message: 'chunk failed' }));
  });

  it('shows its fallback while the part loads, then the part (item 174)', async () => {
    let release: (module: { default: React.ComponentType }) => void = () => {};
    const Slow = React.lazy(() => new Promise<{ default: React.ComponentType }>((resolve) => { release = resolve; }));
    render(<LazyPart fallback={<p>reserved</p>}><Slow /></LazyPart>);
    expect(screen.getByText('reserved')).toBeInTheDocument();
    await act(async () => { release({ default: () => <p>arrived</p> }); });
    expect(screen.getByText('arrived')).toBeInTheDocument();
    expect(screen.queryByText('reserved')).not.toBeInTheDocument();
  });
});
