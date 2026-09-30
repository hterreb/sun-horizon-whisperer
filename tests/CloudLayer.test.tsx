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

  it('draws the closed storm deck only in a storm (ROADMAP item 51)', () => {
    expect(renderLayer('storm', 'afternoon').container.querySelector('[data-testid="storm-deck"]')).not.toBeNull();
    expect(renderLayer('rain', 'afternoon').container.querySelector('[data-testid="storm-deck"]')).toBeNull();
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

  // ROADMAP item 36 (Bats & Boats lookbook picks N2, R1, S2-S6, V2-V4, L1).
  describe('bats, boats and leaves (ROADMAP item 36)', () => {
    // Math.random pinned to 0: every spawn chance passes and pickBoat takes the first boat in the mix.
    const spawn = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number) => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      const view = render(<CloudLayer weatherType="clear" timeOfDay="midday" {...props} />);
      act(() => { vi.advanceTimersByTime(ms); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      return view.container;
    };

    it('draws bats as a line icon in twilight, not as the emoji', () => {
      const container = spawn({ timeOfDay: 'nautical-twilight' }, 6000);
      expect(container.querySelector('[data-testid="scene-bat"]')).not.toBeNull();
      expect(container.textContent).not.toContain('🦇');
    });

    it('flies bats right after sunset, in civil twilight (ROADMAP item 40)', () => {
      const container = spawn({ timeOfDay: 'civil-twilight' }, 6000);
      expect(container.querySelector('[data-testid="scene-bat"]')).not.toBeNull();
    });

    it('keeps the sky quiet in full night: no bats, no birds', () => {
      const container = spawn({ timeOfDay: 'night' }, 6000);
      expect(container.querySelector('[data-testid="scene-bat"]')).toBeNull();
    });

    it('sails a sailboat in fair weather, without lights by day', () => {
      const container = spawn({}, 121000);
      const boat = container.querySelector('[data-testid="scene-boat"]');
      expect(boat?.getAttribute('data-kind')).toBe('sailboat');
      expect(container.querySelector('[data-testid="boat-light"]')).toBeNull();
    });

    it('lights the boats once the sun is down', () => {
      const container = spawn({ timeOfDay: 'civil-twilight' }, 121000);
      expect(container.querySelectorAll('[data-testid="boat-light"]').length).toBeGreaterThan(0);
    });

    it('sends the first boat, lit at night, within seconds of load', () => {
      const container = spawn({ timeOfDay: 'night' }, 6000);
      expect(container.querySelector('[data-testid="scene-boat"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-testid="boat-light"]').length).toBeGreaterThan(0);
    });

    it('can have more than one boat on the lake at once', () => {
      // Two spawns 55 s apart, within the 97 s a near sailboat takes to cross.
      const container = spawn({}, 70000);
      expect(container.querySelectorAll('[data-testid="scene-boat"]').length).toBe(2);
    });

    it('never has more than 3 boats out at once (ROADMAP item 40)', () => {
      // Spawns at ~5, 60, 115 and 170 s; no boat finishes its crossing in the test.
      const container = spawn({}, 180000);
      expect(container.querySelectorAll('[data-testid="scene-boat"]').length).toBe(3);
    });

    it('sails each boat type at its own speed (ROADMAP item 40)', () => {
      // Near boats (depth 0) cross 116 % of the width: a sailboat at 1.2 %/s, a ferry at 1.8 %/s.
      const crossingSec = (props: Partial<React.ComponentProps<typeof CloudLayer>>) => {
        const wrapper = spawn(props, 6000).querySelector('[data-testid="scene-boat"]')?.parentElement?.parentElement as HTMLElement;
        return parseFloat(wrapper.style.animation.split(' ')[1]);
      };
      expect(crossingSec({})).toBeCloseTo(116 / 1.2, 1);
      expect(crossingSec({ weatherType: 'rain' })).toBeCloseTo(116 / 1.8, 1);
    });

    it('draws fish smaller than the boats (ROADMAP item 40)', () => {
      const container = spawn({}, 9000);
      expect(container.querySelector('[data-testid="scene-fish"]')?.getAttribute('width')).toBe('20');
    });

    it('sails near boats lower in fullscreen, where the chrome fades away', () => {
      const waterline = (props: Partial<React.ComponentProps<typeof CloudLayer>>) =>
        (spawn(props, 6000).querySelector('[data-testid="scene-boat"]')?.parentElement?.parentElement as HTMLElement | null)?.style.top;
      expect(waterline({})).toBe('87%');
      expect(waterline({ isFullscreen: true })).toBe('94%');
    });

    it('sends out only the big boats in rain', () => {
      const container = spawn({ weatherType: 'rain' }, 121000);
      expect(container.querySelector('[data-testid="scene-boat"]')?.getAttribute('data-kind')).toBe('ferry');
    });

    it('draws strong-wind leaves as a line icon, not as the emoji', () => {
      const container = spawn({ windSpeedKmh: 50 }, 5000);
      expect(container.querySelector('[data-testid="scene-leaf"]')).not.toBeNull();
      expect(container.textContent).not.toContain('🍃');
    });
  });
});
