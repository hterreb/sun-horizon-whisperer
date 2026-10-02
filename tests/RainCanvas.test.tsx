import React from 'react';
import { render } from '@testing-library/react';
import RainCanvas from '../src/components/RainCanvas';

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

describe('RainCanvas (ROADMAP item 77)', () => {
  afterEach(() => vi.restoreAllMocks());

  const renderRain = (props: Partial<React.ComponentProps<typeof RainCanvas>> = {}) =>
    render(<RainCanvas weatherType="rain" mmH={4} windSpeedKmh={0} windDirectionDeg={270} timeOfDay="midday" {...props} />);

  it('tilts the rain with the wind, away from the side it comes from (X2)', () => {
    const angle = (props: Partial<React.ComponentProps<typeof RainCanvas>>) =>
      renderRain(props).container.querySelector('canvas')?.getAttribute('data-angle');
    expect(angle({ windSpeedKmh: 0 })).toBe('0.0');
    expect(angle({ windSpeedKmh: 50, windDirectionDeg: 270 })).toBe('30.0');
    expect(angle({ windSpeedKmh: 50, windDirectionDeg: 90 })).toBe('-30.0');
    expect(angle({ weatherType: 'drizzle', windSpeedKmh: 50 })).toBe('42.0');
  });

  it('runs one animation loop and cancels it on unmount', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = renderRain();
    expect(rafSpy).toHaveBeenCalledTimes(1);
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });

  it('draws one still frame and runs no loop with reduced motion', () => {
    mockReducedMotion(true);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    renderRain();
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('greys the horizon haze with the rain and the light', () => {
    const haze = (props: Partial<React.ComponentProps<typeof RainCanvas>>) =>
      (renderRain(props).container.querySelector('canvas') as HTMLElement).style.background;
    expect(haze({ mmH: 20 })).toContain('--scene-rain-day');
    expect(haze({ mmH: 20, timeOfDay: 'night' })).toContain('--scene-rain-night');
    expect(haze({ mmH: 20, timeOfDay: 'evening' })).toContain('--scene-rain-dusk');
  });
});
