import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Ufo, { UFO_CROSSING_MS, UFO_RING } from '@/components/Ufo';

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

  it('a tap opens its info card; the ring shows while the card is open (item 113)', () => {
    setReducedMotion(false);
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onInfo = vi.fn();
    const { rerender } = render(<Ufo onDone={vi.fn()} onInfo={onInfo} />);
    const ufo = screen.getByTestId('ufo');
    expect(ufo.className).toContain('pointer-events-auto');
    // No z-index: it draws behind the sun, the moon and the clouds (item 113 follow-up).
    expect(ufo.className).not.toMatch(/\bz-/);
    const hit = ufo.querySelector<HTMLElement>('[data-testid="scene-hit"]')!;
    expect(parseFloat(hit.style.height)).toBeGreaterThanOrEqual(44);
    // Item 116: one tap shows the ring only; the second tap opens the card.
    fireEvent.click(hit, { clientX: 60, clientY: 140, detail: 1 });
    expect(onInfo).not.toHaveBeenCalled();
    expect(ufo.querySelector('[data-testid="scene-info-ring"]')).not.toBeNull();
    fireEvent.click(hit, { clientX: 60, clientY: 140, detail: 2 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'ufo' }, { x: 60, y: 140 }, UFO_RING);
    expect(ufo.querySelector('[data-testid="scene-info-ring"]')).toBeNull();
    rerender(<Ufo onDone={vi.fn()} onInfo={onInfo} ringOn ringTier="ultraRare" />);
    expect(ufo.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
  });

  it('with reduced motion shows nothing and ends at once', () => {
    setReducedMotion(true);
    const onDone = vi.fn();
    render(<Ufo onDone={onDone} />);
    expect(screen.queryByTestId('ufo')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
