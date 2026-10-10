import React from 'react';
import { render, screen, act } from '@testing-library/react';
import WeatherEffects from '../src/components/WeatherEffects';
import type { TimeOfDay } from '../src/utils/sunUtils';

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

const baseProps = {
  timeOfDay: 'midday' as TimeOfDay,
  temperatureC: 15,
  windSpeedKmh: 0,
  sunAltitude: 30,
  containerWidth: 800,
  containerHeight: 600,
};

describe('WeatherEffects (ROADMAP item 10)', () => {
  it('shows a fog band for fog weather, not otherwise', () => {
    const { container, rerender } = render(<WeatherEffects {...baseProps} weatherType="fog" />);
    const fog = container.querySelector<HTMLElement>('[data-testid="fog-band"]');
    expect(fog).not.toBeNull();
    // Low over the horizon (at 65% of 600 px = 390 px), not down over the water.
    const top = parseFloat(fog!.style.top);
    const height = parseFloat(fog!.style.height);
    expect(top).toBeLessThan(390);
    expect(top + height).toBeGreaterThan(390);

    rerender(<WeatherEffects {...baseProps} weatherType="clear" />);
    expect(container.querySelector('[data-testid="fog-band"]')).toBeNull();
  });

  it('flashes lightning for storm within the frequency cap, none under reduced motion', () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0); // always "flashes" when checked

    const { container } = render(<WeatherEffects {...baseProps} weatherType="storm" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector('.bg-white.absolute.inset-0')).not.toBeNull();

    randomSpy.mockRestore();
    vi.useRealTimers();
  });

  it('never flashes under prefers-reduced-motion', () => {
    vi.useFakeTimers();
    const mediaSpy = mockReducedMotion(true);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const intervalSpy = vi.spyOn(window, 'setInterval');

    render(<WeatherEffects {...baseProps} weatherType="storm" />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const lightningIntervals = intervalSpy.mock.calls.filter(([, delay]) => delay === 1000);
    expect(lightningIntervals.length).toBe(0);

    intervalSpy.mockRestore();
    randomSpy.mockRestore();
    mediaSpy.mockRestore();
    vi.useRealTimers();
  });

  it('shows heat shimmer above 30°C, not at/below it', () => {
    const { container, rerender } = render(<WeatherEffects {...baseProps} weatherType="clear" temperatureC={31} />);
    expect(container.querySelector('[data-testid="heat-shimmer"]')).not.toBeNull();

    rerender(<WeatherEffects {...baseProps} weatherType="clear" temperatureC={30} />);
    expect(container.querySelector('[data-testid="heat-shimmer"]')).toBeNull();
  });

  it('draws the heat shimmer as a 40 px band above the horizon with a slow 7 s wave (ROADMAP item 56)', () => {
    const { container } = render(<WeatherEffects {...baseProps} weatherType="clear" temperatureC={35} />);
    const band = container.querySelector('[data-testid="heat-shimmer"]') as SVGSVGElement;
    expect(band.getAttribute('height')).toBe('40');
    expect(band.style.top).toBe(`${baseProps.containerHeight * 0.65 - 40}px`);
    expect(band.querySelector('animate')?.getAttribute('dur')).toBe('7s');
    expect(band.querySelector('[filter="url(#heat-wave)"]')).not.toBeNull();
  });

  it('keeps only a still haze band for the heat shimmer under reduced motion (ROADMAP item 56)', () => {
    const mediaSpy = mockReducedMotion(true);
    const { container } = render(<WeatherEffects {...baseProps} weatherType="clear" temperatureC={35} />);
    const band = container.querySelector('[data-testid="heat-shimmer"]') as SVGSVGElement;
    expect(band).not.toBeNull();
    expect(band.querySelector('[filter="url(#heat-wave)"]')).toBeNull();
    mediaSpy.mockRestore();
  });
});
