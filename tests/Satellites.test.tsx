import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import Satellites, { type SatelliteDot } from '@/components/Satellites';

const setReducedMotion = (reduce: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
};

const iss: SatelliteDot = { id: 25544, name: 'ISS (ZARYA)', x: 100, y: 50, opacity: 1, shown: true, magnitude: -3.7 };
const fading: SatelliteDot = { id: 1, name: 'SL-8 R/B', x: 200, y: 80, opacity: 0.4, shown: false, magnitude: 3 };
const base = { width: 390, height: 844, cloudFactor: 1, stepMs: 1000 };

describe('Satellites (ROADMAP item 97)', () => {
  beforeEach(() => setReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('places each tracked satellite and moves it with a 1 s transition, no blinking', () => {
    render(<Satellites {...base} tracked={[iss, fading]} gapMs={null} />);
    const [a, b] = screen.getAllByTestId('satellite-tracked');
    expect(a.style.transform).toBe('translate(78px, 28px)');
    expect(a.style.transition).toContain('transform 1000ms linear');
    expect(a.style.opacity).toBe('1');
    // A satellite going into the Earth's shadow fades out.
    expect(b.style.opacity).toBe('0');
    expect(b.style.transition).toContain('opacity 5000ms');
    expect(a.className).not.toMatch(/animate-/);
  });

  it('dims all satellites with the stars\' cloud factor', () => {
    render(<Satellites {...base} cloudFactor={0.4} tracked={[iss]} gapMs={null} />);
    expect(screen.getByTestId('satellites').style.opacity).toBe('0.4');
  });

  it('opens the info card of a tracked satellite, with its ring', () => {
    const onInfo = vi.fn();
    const { rerender } = render(<Satellites {...base} tracked={[iss]} gapMs={null} onInfo={onInfo} />);
    // Item 116: a pointer tap shows no ring; the second tap opens the card.
    const button = screen.getByRole('button', { name: 'ISS (ZARYA)' });
    expect(button.className).toContain('touch-manipulation');
    fireEvent.click(button, { detail: 1 });
    expect(onInfo).not.toHaveBeenCalled();
    expect(screen.queryByTestId('scene-info-ring')).toBeNull();
    fireEvent.click(button, { detail: 2 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'satellite', id: 25544, name: 'ISS (ZARYA)' }, expect.any(Object), 'satellite-25544');
    rerender(<Satellites {...base} tracked={[iss]} gapMs={null} onInfo={onInfo} infoRing="satellite-25544" />);
    expect(screen.getByTestId('scene-info-ring')).toBeInTheDocument();
  });

  it('a keyboard click (Enter, Space: detail 0) opens the card at once (item 116)', () => {
    const onInfo = vi.fn();
    render(<Satellites {...base} tracked={[iss]} gapMs={null} onInfo={onInfo} />);
    fireEvent.click(screen.getByRole('button', { name: 'ISS (ZARYA)' }), { detail: 0 });
    expect(onInfo).toHaveBeenCalledTimes(1);
  });

  it('has no move transition in compass mode (step 0)', () => {
    render(<Satellites {...base} stepMs={0} tracked={[iss]} gapMs={null} />);
    expect(screen.getByTestId('satellite-tracked').style.transition).not.toContain('transform');
  });

  it('with reduced motion: tracked dots step without a transition, and no decorative dots', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    const { rerender } = render(<Satellites {...base} tracked={[iss]} gapMs={null} />);
    expect(screen.getByTestId('satellite-tracked').style.transition).not.toContain('transform');
    rerender(<Satellites {...base} tracked={null} gapMs={[120_000, 240_000]} />);
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(screen.queryByTestId('satellite-decor')).toBeNull();
  });

  it('sends a decorative dot within the first gap when nothing is tracked', () => {
    vi.useFakeTimers();
    // A fixed roll: first dot at 30 s, then a 180 s gap. With free rolls, two 120 s gaps
    // can put a third dot inside the 300 s, and the test failed now and then.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(<Satellites {...base} tracked={null} gapMs={[120_000, 240_000]} />);
    expect(screen.queryByTestId('satellite-decor')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getAllByTestId('satellite-decor')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(240_000);
    });
    expect(screen.getAllByTestId('satellite-decor')).toHaveLength(2);
  });

  it('fades the decorative dots out over 1 min at the sun\'s -6°, without a cut-off', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Satellites {...base} tracked={null} gapMs={[120_000, 240_000]} twilight={1} />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getAllByTestId('satellite-decor')).toHaveLength(1);
    // Dawn: no new dots, the one on its way stays and fades with the layer.
    rerender(<Satellites {...base} tracked={null} gapMs={null} twilight={0} />);
    const layer = screen.getByTestId('satellite-decor-layer');
    expect(layer.style.opacity).toBe('0');
    expect(layer.style.transition).toBe('opacity 60000ms linear');
    expect(screen.getAllByTestId('satellite-decor')).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(screen.getAllByTestId('satellite-decor')).toHaveLength(1);
  });

  it('sends no decorative dots by day, behind full clouds or while tracking', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Satellites {...base} tracked={null} gapMs={null} />);
    const wait = () => act(() => {
      vi.advanceTimersByTime(600_000);
    });
    wait();
    rerender(<Satellites {...base} tracked={null} cloudFactor={0} gapMs={[120_000, 240_000]} />);
    wait();
    rerender(<Satellites {...base} tracked={[]} gapMs={[120_000, 240_000]} />);
    wait();
    expect(screen.queryByTestId('satellite-decor')).toBeNull();
  });
});
