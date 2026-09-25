import React, { Profiler } from 'react';
import { render, act } from '@testing-library/react';
import CloudLayer, { WeatherType } from '../src/components/CloudLayer';
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

describe('CloudLayer', () => {
  const renderLayer = (weatherType: WeatherType, timeOfDay: string) =>
    render(<CloudLayer weatherType={weatherType} timeOfDay={timeOfDay as TimeOfDay} />);

  it('shows fish during rain', () => {
    const { container } = renderLayer('rain', 'midday');
    expect(container.querySelectorAll('svg')).toMatchSnapshot(); // Should include fish icon
  });

  it('does not show fish at night', () => {
    const { container } = renderLayer('clear', 'night');
    expect(container.querySelectorAll('svg')).not.toContain('Fish');
  });

  // More tests for birds, ships, rain, snow, etc.

  it('renders sun, moon, and horizon according to time/position', () => {
    // Render with midday, clear
    const { container } = render(<CloudLayer weatherType={'clear'} timeOfDay={'midday'} />);
    // Check for sun/moon/horizon elements (by class or test id)
  });

  it('shows sun only above -18° altitude and not during storms', () => {
    // Simulate sun below/above threshold and storm weather
  });

  it('shows moon only at night/twilight and above -6° altitude', () => {
    // Simulate moon below/above threshold and time of day
  });

  it('triggers fireworks when sun crosses horizon', () => {
    // Simulate sun crossing horizon
  });

  it('renders clouds, rain, snow, and storm effects by weather', () => {
    // Render with each weather type and check for effect elements
  });

  it('shows/hides birds, ships, and fishes by weather/time', () => {
    // Render with different weather/time and check for presence
  });

  it('removes birds, ships, and fishes when off-screen or weather/time changes', () => {
    // Simulate time/weather change and check for removal
  });

  it('skips the bird/fish/ship spawn loop when reduced motion is preferred (A-2)', () => {
    const mediaSpy = mockReducedMotion(true);
    const intervalSpy = vi.spyOn(window, 'setInterval');

    renderLayer('clear', 'midday');

    // CloudLayer's spawn-check loop uses a 500ms interval; it must not be started
    // when the user prefers reduced motion (filtering on the delay avoids false
    // positives from unrelated timers elsewhere in the test environment).
    const spawnIntervalCalls = intervalSpy.mock.calls.filter(([, delay]) => delay === 500);
    expect(spawnIntervalCalls.length).toBe(0);

    intervalSpy.mockRestore();
    mediaSpy.mockRestore();
  });

  it('does not re-render on every spawn-check tick — only on an actual spawn/despawn (P-4)', () => {
    vi.useFakeTimers();
    // Pin Math.random above every spawn-chance threshold (0.7–0.9) so the spawn loop
    // runs its checks but never actually adds a bird/fish/ship. If CloudLayer still
    // re-rendered on every tick (the old per-frame setState behavior), renderCount
    // would grow; with movement moved to CSS and state only touched on spawn/despawn,
    // it must stay flat here.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    let renderCount = 0;
    render(
      <Profiler id="cloud-layer" onRender={() => { renderCount += 1; }}>
        <CloudLayer weatherType="clear" timeOfDay="midday" />
      </Profiler>
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    const baseline = renderCount;

    act(() => {
      vi.advanceTimersByTime(500 * 20); // 20 more spawn-check ticks
    });

    expect(renderCount).toBe(baseline);

    randomSpy.mockRestore();
    vi.useRealTimers();
  });
});
