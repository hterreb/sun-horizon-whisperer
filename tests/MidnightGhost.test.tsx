import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MidnightGhost, { GHOST_RING } from '../src/components/MidnightGhost';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);

describe('MidnightGhost', () => {
  it('shows ghost at midnight', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { container } = render(<MidnightGhost currentTime={midnight} />);
    expect(container.innerHTML).toMatch(/ghost/i);
  });

  it('stays below the InfoPanel (z-10, not z-30) (ROADMAP item 1)', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { container } = render(<MidnightGhost currentTime={midnight} />);
    const ghost = container.firstChild as HTMLElement;
    expect(ghost.className).toContain('z-10');
    expect(ghost.className).not.toContain('z-30');
  });

  it('breathes slowly instead of pulsing, only without reduced motion (item 113 follow-up)', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { container } = render(<MidnightGhost currentTime={midnight} />);
    expect(container.querySelector('.motion-safe\\:animate-ghost-breathe')).not.toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  // More tests for disappearance, animation, etc.

  it('ghost floats and bounces within bounds', () => {
    // Simulate animation and check position stays within bounds
  });

  it('creates the float interval only once per visibility, even as direction changes (P-4)', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    render(<MidnightGhost currentTime={midnight} />);

    // Ghost starts at x=50 moving +0.5/tick; advancing well past the x=80 bounce
    // (direction flips) would previously tear down and recreate the interval.
    vi.advanceTimersByTime(100 * 70);

    const floatIntervalCalls = setIntervalSpy.mock.calls.filter(call => call[1] === 100);
    expect(floatIntervalCalls.length).toBe(1);

    setIntervalSpy.mockRestore();
    vi.useRealTimers();
  });

  it('clamps the vertical float to a sane band under sustained drift (P-4)', () => {
    vi.useFakeTimers();
    // Force the sine term to its maximum positive value on every tick.
    vi.spyOn(Date, 'now').mockReturnValue(Math.PI / 2 / 0.002);

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { container } = render(<MidnightGhost currentTime={midnight} />);

    vi.advanceTimersByTime(100 * 200);

    const ghostEl = container.querySelector('div[style*="top"]') as HTMLElement;
    const topValue = parseFloat(ghostEl.style.top);
    expect(topValue).toBeLessThanOrEqual(50);

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('stays static (no floating interval) when reduced motion is preferred (A-2)', () => {
    const mediaSpy = mockReducedMotion(true);
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    render(<MidnightGhost currentTime={midnight} />);

    const floatIntervalCalls = setIntervalSpy.mock.calls.filter(call => call[1] === 100);
    expect(floatIntervalCalls.length).toBe(0);

    setIntervalSpy.mockRestore();
    mediaSpy.mockRestore();
    vi.useRealTimers();
  });

  it('a tap opens its info card; the ring shows while the card is open (item 113)', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const onInfo = vi.fn();
    const { rerender } = render(<MidnightGhost currentTime={midnight} onInfo={onInfo} />);
    const ghost = screen.getByTestId('midnight-ghost');
    expect(ghost.className).toContain('pointer-events-auto');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    // Item 116: one tap shows no ring; the second tap opens the card.
    const hit = ghost.querySelector('[data-testid="scene-hit"]')!;
    fireEvent.click(hit, { clientX: 200, clientY: 250, detail: 1 });
    expect(onInfo).not.toHaveBeenCalled();
    expect(ghost.querySelector('[data-testid="scene-info-ring"]')).toBeNull();
    fireEvent.click(hit, { clientX: 200, clientY: 250, detail: 2 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'ghost' }, { x: 200, y: 250 }, GHOST_RING);
    rerender(<MidnightGhost currentTime={midnight} onInfo={onInfo} ringOn ringTier="ultraRare" />);
    expect(ghost.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
  });

  it('takes no taps without onInfo', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    render(<MidnightGhost currentTime={midnight} />);
    expect(screen.getByTestId('midnight-ghost').className).toContain('pointer-events-none');
  });
});
