import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
});
