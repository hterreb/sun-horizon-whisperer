import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Ufo, { UFO_CROSSING_MS } from '@/components/Ufo';

const setReducedMotion = (reduce: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
};

describe('Ufo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('crosses once and then calls onDone', () => {
    setReducedMotion(false);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onDone = vi.fn();
    render(<Ufo onDone={onDone} />);
    expect(screen.getByTestId('ufo')).toBeInTheDocument();
    frames.shift()!(0);
    frames.shift()!(UFO_CROSSING_MS / 2);
    expect(screen.getByTestId('ufo').style.transform).not.toBe('translateX(-56px)');
    expect(onDone).not.toHaveBeenCalled();
    frames.shift()!(UFO_CROSSING_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('with reduced motion shows nothing and ends at once', () => {
    setReducedMotion(true);
    const onDone = vi.fn();
    render(<Ufo onDone={onDone} />);
    expect(screen.queryByTestId('ufo')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
