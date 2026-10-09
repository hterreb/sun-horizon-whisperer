import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlayfulEggs from '../src/components/PlayfulEggs';
import SunVisualization from '../src/components/SunVisualization';
import SkyClouds from '../src/components/SkyClouds';
import { APRIL_FOOLS_DELAY_MS, APRIL_FOOLS_FADE_MS, APRIL_FOOLS_HOLD_MS } from '../src/utils/playfulEggs';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches, media: '', onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  } as unknown as MediaQueryList);

const RAINBOW = { visible: true, xFraction: 0.5, apexHeightDeg: 21 };
const base = { event: null, easterMorning: false, width: 1000, horizonY: 500, sunX: 200, sunLight: 1, rainbow: RAINBOW };

describe('PlayfulEggs (ROADMAP item 117)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the empty tomb on Easter morning only, and reports it', () => {
    const onShown = vi.fn();
    const { rerender } = render(<PlayfulEggs {...base} event="easter" easterMorning={false} onShown={onShown} />);
    expect(screen.queryByTestId('empty-tomb')).toBeNull();
    expect(onShown).not.toHaveBeenCalled();
    rerender(<PlayfulEggs {...base} event="easter" easterMorning onShown={onShown} />);
    const tomb = screen.getByTestId('empty-tomb');
    // On the horizon line, on the side away from the sun (sun left -> tomb at 90 %).
    expect(parseFloat(tomb.style.left) + 36).toBeCloseTo(900);
    expect(parseFloat(tomb.style.top) + 44 - 2).toBe(500);
    expect(onShown).toHaveBeenCalledWith('easter');
    rerender(<PlayfulEggs {...base} event="valentine" easterMorning onShown={onShown} />);
    expect(screen.queryByTestId('empty-tomb')).toBeNull();
  });

  it('is static: no animation, also shown with reduced motion', () => {
    mockReducedMotion(true);
    render(<PlayfulEggs {...base} event="easter" easterMorning />);
    const tomb = screen.getByTestId('empty-tomb');
    expect(tomb.style.animation).toBe('');
    expect(tomb.innerHTML).not.toMatch(/animate-/);
  });

  it('puts the pot of gold at the rainbow end on St Patrick\'s Day, and nothing without a rainbow', () => {
    const onShown = vi.fn();
    const { rerender } = render(<PlayfulEggs {...base} event="st-patrick" onShown={onShown} />);
    const pot = screen.getByTestId('pot-of-gold');
    expect(parseFloat(pot.style.left) + 15).toBeCloseTo(737.5);
    expect(onShown).toHaveBeenCalledWith('stPatrick');
    rerender(<PlayfulEggs {...base} event="st-patrick" rainbow={{ ...RAINBOW, visible: false }} />);
    expect(screen.queryByTestId('pot-of-gold')).toBeNull();
    rerender(<PlayfulEggs {...base} event="valentine" />);
    expect(screen.queryByTestId('pot-of-gold')).toBeNull();
  });

  it('opens the egg card on a double tap (item 116)', () => {
    const onInfo = vi.fn();
    render(<PlayfulEggs {...base} event="easter" easterMorning onInfo={onInfo} />);
    const tomb = screen.getByTestId('empty-tomb');
    fireEvent.click(tomb);
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(tomb);
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'emptyTomb' }, expect.anything(), 'egg-tomb');
  });
});

describe('April Fools swap (SunVisualization)', () => {
  const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalWidth);
    if (originalHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalHeight);
  });

  const dayProps = {
    sunPosition: { azimuth: 150, altitude: 30 },
    moonPosition: { azimuth: 230, altitude: 20, phase: 0.2, illumination: 0.4, visible: true },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    cloudCoverPercent: 0,
    latitude: 48,
    longitude: 11,
    date: new Date('2027-04-01T10:00:00Z'),
  };
  const sunLeft = () => screen.getByTestId('sun-dot').style.left;

  it('swaps the drawn sun and moon for one minute with a slow fade, then swaps back', () => {
    const onEggShown = vi.fn();
    render(<SunVisualization {...dayProps} calendarEvent="april-fools" onEggShown={onEggShown} />);
    const before = sunLeft();
    expect(screen.queryByTestId('moon-disc')).toBeNull(); // no moon by day
    act(() => { vi.advanceTimersByTime(APRIL_FOOLS_DELAY_MS); });
    // Fade out: the sun keeps its place, the moon is there but transparent.
    expect(sunLeft()).toBe(before);
    expect(screen.getByTestId('sun-dot').querySelector('svg')?.style.opacity).toBe('0');
    expect(screen.getByTestId('sun-dot').querySelector('svg')?.style.transition).toMatch(/opacity 3s/);
    expect(screen.getByTestId('moon-disc').style.opacity).toBe('0');
    expect(onEggShown).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(APRIL_FOOLS_FADE_MS); });
    // Swapped: the moon is where the sun was, the sun somewhere else; both fade in.
    expect(screen.getByTestId('moon-disc').style.left).toBe(before);
    expect(sunLeft()).not.toBe(before);
    expect(Number(screen.getByTestId('moon-disc').style.opacity)).toBeGreaterThan(0);
    expect(onEggShown).toHaveBeenCalledWith('aprilFools');
    act(() => { vi.advanceTimersByTime(APRIL_FOOLS_HOLD_MS + 2 * APRIL_FOOLS_FADE_MS); });
    expect(sunLeft()).toBe(before);
    expect(screen.queryByTestId('moon-disc')).toBeNull();
  });

  it('does not swap with reduced motion, and the badge does not count', () => {
    mockReducedMotion(true);
    const onEggShown = vi.fn();
    render(<SunVisualization {...dayProps} calendarEvent="april-fools" onEggShown={onEggShown} />);
    const before = sunLeft();
    act(() => { vi.advanceTimersByTime(APRIL_FOOLS_DELAY_MS + APRIL_FOOLS_FADE_MS + 1000); });
    expect(sunLeft()).toBe(before);
    expect(screen.queryByTestId('moon-disc')).toBeNull();
    expect(onEggShown).not.toHaveBeenCalled();
  });

  it('does not swap when the moon is below the horizon or on another day', () => {
    const onEggShown = vi.fn();
    render(<SunVisualization {...dayProps} moonPosition={{ ...dayProps.moonPosition, altitude: -5, visible: false }} calendarEvent="april-fools" onEggShown={onEggShown} />);
    render(<SunVisualization {...dayProps} calendarEvent={null} onEggShown={onEggShown} />);
    act(() => { vi.advanceTimersByTime(APRIL_FOOLS_DELAY_MS + APRIL_FOOLS_FADE_MS + 1000); });
    expect(onEggShown).not.toHaveBeenCalled();
  });
});

describe('Valentine heart cloud (SkyClouds)', () => {
  const sky = (props: Partial<React.ComponentProps<typeof SkyClouds>>) =>
    render(
      <SkyClouds
        weatherType="partly"
        timeOfDay="midday"
        date={new Date('2027-02-14T12:00:00')}
        latitude={47.78}
        longitude={9.61}
        cloudLayers={null}
        windDirectionDeg={270}
        sun={{ x: 30, y: 40, altitude: 20 }}
        moon={null}
        skyGradient={null}
        egg={false}
        {...props}
      />
    ).container;

  it('draws one day cloud as a heart and reports it', () => {
    const onHeartShown = vi.fn();
    const hearts = sky({ heart: true, onHeartShown }).querySelectorAll('[data-heart]');
    expect(hearts).toHaveLength(1);
    expect(onHeartShown).toHaveBeenCalledWith('valentine');
  });

  it('draws no heart at night, on another day or without clouds', () => {
    const onHeartShown = vi.fn();
    expect(sky({ heart: true, onHeartShown, sun: { x: 30, y: 80, altitude: -10 } }).querySelector('[data-heart]')).toBeNull();
    expect(sky({ heart: false, onHeartShown }).querySelector('[data-heart]')).toBeNull();
    expect(sky({ heart: true, onHeartShown, weatherType: 'clear' }).querySelector('[data-heart]')).toBeNull();
    expect(onHeartShown).not.toHaveBeenCalled();
  });

  it('opens the heart\'s egg card on a double tap', () => {
    const onInfo = vi.fn();
    const heart = sky({ heart: true, onInfo }).querySelector<HTMLElement>('[data-heart]')!;
    fireEvent.click(heart);
    fireEvent.click(heart);
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'heartCloud' }, expect.anything(), expect.stringMatching(/^cloud-/));
  });

  it('keeps the heart with reduced motion (still clouds)', () => {
    mockReducedMotion(true);
    expect(sky({ heart: true }).querySelectorAll('[data-heart]')).toHaveLength(1);
    vi.restoreAllMocks();
  });
});
