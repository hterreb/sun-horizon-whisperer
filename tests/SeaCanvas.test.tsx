import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SeaCanvas from '../src/components/SeaCanvas';

// A 2D context that takes every call: the drawing itself is checked in the browser.
const fakeContext = () => {
  const state: Record<string | symbol, unknown> = { fillStyle: '#000000' };
  return new Proxy(state, {
    get: (target, key) => (key in target ? target[key] : () => ({ addColorStop: () => {} })),
    set: (target, key, value) => { target[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
};

const props = (over: Partial<React.ComponentProps<typeof SeaCanvas>> = {}): React.ComponentProps<typeof SeaCanvas> => ({
  width: 390,
  height: 844,
  seaPath: 'M0,549 L390,549 L390,844 L0,844 Z',
  seaEdgePath: 'M0,549 L390,549',
  ridgePath: 'M0,549 L390,540',
  ridgeColor: 'hsl(var(--scene-ridge))',
  skyColor: '#fec6a1',
  crestColor: 'hsl(var(--scene-glow-white))',
  troughColor: '#1a3a5c',
  gain: 1,
  windKmh: 3, // calm: the mirror is built, so all four colours are read
  driftDirection: 1,
  ...over,
});

describe('SeaCanvas', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeContext() as never);
    vi.stubGlobal('Path2D', class {});
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ROADMAP item 151: a rotation only reallocates the canvases. Reading the CSS colours
  // (getComputedStyle) forced a style recalc of 8-13 ms inside each resize.
  it('reads the CSS colours at mount and when a colour changes, not on a resize', () => {
    const style = vi.spyOn(window, 'getComputedStyle');
    const { rerender, getByTestId } = render(<SeaCanvas {...props()} />);
    expect(style).toHaveBeenCalled();
    expect((getByTestId('sea-canvas') as HTMLCanvasElement).width).toBe(390 * Math.min(2, window.devicePixelRatio || 1));

    style.mockClear();
    rerender(<SeaCanvas {...props({ width: 844, height: 390, seaPath: 'M0,253 L844,253 L844,390 L0,390 Z' })} />);
    expect(style).not.toHaveBeenCalled();
    expect((getByTestId('sea-canvas') as HTMLCanvasElement).width).toBe(844 * Math.min(2, window.devicePixelRatio || 1));

    rerender(<SeaCanvas {...props({ width: 844, height: 390, crestColor: 'hsl(var(--scene-moon))' })} />);
    expect(style).toHaveBeenCalled();
  });
});
