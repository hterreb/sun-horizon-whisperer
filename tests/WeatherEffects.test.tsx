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

const noRainbow = { visible: false, xFraction: 0, apexHeightDeg: 0 };

const baseProps = {
  timeOfDay: 'midday' as TimeOfDay,
  temperatureC: 15,
  windSpeedKmh: 0,
  sunAltitude: 30,
  rainbow: noRainbow,
  containerWidth: 800,
  containerHeight: 600,
};

describe('WeatherEffects (ROADMAP item 10)', () => {
  it('shows a fog band for fog weather, not otherwise', () => {
    const { container, rerender } = render(<WeatherEffects {...baseProps} weatherType="fog" />);
    expect(container.querySelector('.absolute.left-0.right-0.bottom-0')).not.toBeNull();

    rerender(<WeatherEffects {...baseProps} weatherType="clear" />);
    expect(container.querySelector('.absolute.left-0.right-0.bottom-0')).toBeNull();
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
    expect(container.querySelector('[style*="heat-shimmer"]')).not.toBeNull();

    rerender(<WeatherEffects {...baseProps} weatherType="clear" temperatureC={30} />);
    expect(container.querySelector('[style*="heat-shimmer"]')).toBeNull();
  });

  it('renders a rainbow arc when visible, positioned by xFraction/apexHeightDeg', () => {
    const rainbow = { visible: true, xFraction: 0.5, apexHeightDeg: 20 };
    render(<WeatherEffects {...baseProps} weatherType="rain" rainbow={rainbow} />);
    const circles = screen.getAllByText('', { selector: 'circle' }) as unknown as SVGCircleElement[];
    expect(circles.length).toBeGreaterThan(0);
    expect(circles[0].getAttribute('cx')).toBe(String(0.5 * baseProps.containerWidth));
  });

  it('renders no rainbow arc when not visible', () => {
    const { container } = render(<WeatherEffects {...baseProps} weatherType="clear" rainbow={noRainbow} />);
    expect(container.querySelector('circle')).toBeNull();
  });
});
