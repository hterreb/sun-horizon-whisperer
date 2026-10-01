import React, { Profiler } from 'react';
import { render, act } from '@testing-library/react';
import CloudLayer, { WeatherType, createFish } from '../src/components/CloudLayer';
import { FISH_WEIGHTS, NIGHT_FISH_WEIGHTS, getWaterSpeedFactor } from '../src/utils/weatherEffectsUtils';
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

    it('draws bats as a solid dark silhouette (ROADMAP item 64, B2)', () => {
      const bat = spawn({ timeOfDay: 'civil-twilight' }, 6000).querySelector('[data-testid="scene-bat"]') as SVGElement;
      expect(bat.getAttribute('fill')).toBe('currentColor');
      expect(bat.style.color).toBe('hsl(var(--scene-critter-silhouette) / 0.9)');
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
      // Near boats (depth 0) cross 116 % of the width: a sailboat at 1.2 %/s, a ferry at 1.8 %/s,
      // slowed to phone speed on jsdom's 1024 px wide window (item 66).
      const crossingSec = (props: Partial<React.ComponentProps<typeof CloudLayer>>) => {
        const wrapper = spawn(props, 6000).querySelector('[data-testid="scene-boat"]')?.parentElement?.parentElement as HTMLElement;
        return parseFloat(wrapper.style.animation.split(' ')[1]);
      };
      const wide = getWaterSpeedFactor(window.innerWidth);
      expect(crossingSec({})).toBeCloseTo(116 / (1.2 * wide), 1);
      expect(crossingSec({ weatherType: 'rain' })).toBeCloseTo(116 / (1.8 * wide), 1);
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

  // ROADMAP item 62 (Fish & Currents lookbook picks F1-F13, P1, P3-P6, P8, P9, E1-E4).
  describe('fish (ROADMAP item 62)', () => {
    const spawnFish = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number, random = 0) => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
      const view = render(<CloudLayer weatherType="clear" timeOfDay="midday" {...props} />);
      act(() => { vi.advanceTimersByTime(ms); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      return view.container;
    };
    const always = (r: number) => () => r;

    it('sends the whale always far out, about the size of the rowboat', () => {
      expect(createFish('whale', false, false, 390, always(0)).depth).toBe(0.75);
      const farthest = createFish('whale', false, false, 390, always(0.999));
      expect(farthest.depth).toBeGreaterThan(0.99);
      expect(createFish('whale', false, false, 390, always(0)).size).toBeLessThanOrEqual(48);
    });

    it('draws far fish smaller, slower, paler and higher than near ones (P3)', () => {
      const near = createFish('trout', false, false, 390, always(0));
      const far = createFish('trout', false, false, 390, always(0.999));
      expect(near.size).toBe(22);
      expect(far.size).toBe(12);
      expect(far.duration).toBeGreaterThan(near.duration * 1.7);
      expect(far.opacity).toBeLessThan(near.opacity);
      expect(near.y).toBeCloseTo(84, 5);
      expect(far.y).toBeCloseTo(71, 0);
    });

    it('swims minnows in a school of 4 to 7, and deep fish paler (P5, P9)', () => {
      expect(createFish('minnow', false, false, 390, always(0)).school).toHaveLength(4);
      expect(createFish('minnow', false, false, 390, always(0.999)).school).toHaveLength(7);
      expect(createFish('catfish', false, false, 390, always(0)).opacity)
        .toBeLessThan(createFish('trout', false, false, 390, always(0)).opacity);
    });

    it('stops the pike, the turtle and the pufferfish on the way (P8)', () => {
      for (const kind of ['pike', 'turtle', 'pufferfish'] as const) {
        expect(createFish(kind, false, false, 390, always(0)).easing).toMatch(/^linear\(/);
      }
      expect(createFish('classic', false, false, 390, always(0)).easing).toBeUndefined();
    });

    it('draws a fish of the first species in the mix, in its own tint (E3)', () => {
      const container = spawnFish({}, 9000);
      const fishIcon = container.querySelector('[data-testid="scene-fish"]');
      expect(fishIcon?.getAttribute('data-kind')).toBe('classic');
      expect((fishIcon?.parentElement as HTMLElement).style.color).toBe('hsl(var(--scene-fish-classic))');
    });

    it('sends a companion 2 to 4 s behind (P6)', () => {
      const container = spawnFish({}, 9000);
      const [lead, companion] = [...container.querySelectorAll('[data-testid="scene-fish"]')]
        .map(icon => (icon.parentElement as HTMLElement).style.animation);
      expect(lead).toContain('linear 0s');
      expect(companion).toContain('linear 2s');
    });

    it('lights a glow on the fish after sunset only (E1)', () => {
      expect(spawnFish({ timeOfDay: 'civil-twilight' }, 9000).querySelector('[data-testid="fish-glow"]')).not.toBeNull();
      expect(spawnFish({}, 9000).querySelector('[data-testid="fish-glow"]')).toBeNull();
    });

    it('sends half as many fish in rain (E2)', () => {
      // A roll of 0.5 passes the 70 % chance in fair weather, but not the 35 % in rain.
      expect(spawnFish({}, 9000, 0.5).querySelector('[data-testid="scene-fish"]')).not.toBeNull();
      expect(spawnFish({ weatherType: 'rain' }, 9000, 0.5).querySelector('[data-testid="scene-fish"]')).toBeNull();
      expect(spawnFish({ weatherType: 'drizzle' }, 9000, 0.5).querySelector('[data-testid="scene-fish"]')).toBeNull();
    });

    it('builds night fish in the moon tone or with their own light (ROADMAP item 65)', () => {
      expect(createFish('burbot', false, false, 390, always(0), true).light).toBe('moon');
      expect(createFish('eel', false, false, 390, always(0), true).light).toBe('moon');
      expect(createFish('lanternfish', false, false, 390, always(0), true).light).toBe('own');
      expect(createFish('jellyfish', false, false, 390, always(0), true).light).toBe('own');
      const moonlitClassic = createFish('classic', true, false, 390, always(0), true);
      expect(moonlitClassic.light).toBe('moon');
      expect(moonlitClassic.glow).toBe(false); // no E1 spot on a night fish
      expect(createFish('lanternfish', false, false, 390, always(0), true).opacity).toBeCloseTo(0.95, 5);
      expect(createFish('classic', false, false, 390, always(0)).light).toBeUndefined();
    });

    it('swims no fish faster than the sailboat, none slower than 0.4 %/s (ROADMAP item 66)', () => {
      const kinds = [...FISH_WEIGHTS.map(([kind]) => kind), ...NIGHT_FISH_WEIGHTS.map(([kind]) => kind).filter(k => k !== 'moonlit')];
      for (const kind of kinds) {
        const near = createFish(kind as Parameters<typeof createFish>[0], false, false, 390, always(0), true);
        // The species' own speed in % of the width per second, without the distance slow-down
        // (the whale is always far out). A rest stop only lowers it.
        const speed = near.dx / near.duration / (1 - 0.45 * near.depth);
        expect(speed).toBeLessThanOrEqual(1.2 + 1e-9);
        if (!near.easing) expect(speed).toBeGreaterThanOrEqual(0.4 - 1e-9);
      }
    });

    it('slows fish to phone speed in pixels on a wide screen (ROADMAP item 66)', () => {
      const phone = createFish('classic', false, false, 390, always(0));
      const desktop = createFish('classic', false, false, 1290, always(0));
      // The same pixels per second: 1.15 % of 430 px each second on both.
      expect(phone.dx / phone.duration).toBeCloseTo(1.15, 5);
      expect((desktop.dx / desktop.duration) * 1290).toBeCloseTo(1.15 * 430, 5);
    });

    it('keeps at most five fish on screen (E4)', () => {
      // A classic fish pair every 5.5 s; none finishes its 42 s crossing in the test.
      const container = spawnFish({}, 40000);
      expect(container.querySelectorAll('[data-testid="scene-fish"]').length).toBe(10); // 5 pairs
    });
  });

  // ROADMAP item 65 (Night waters lookbook picks NF1-NF7, NR1-NR3).
  describe('night fish (ROADMAP item 65)', () => {
    const moon = { x: 0.5, strength: 1 };
    const spawnNight = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number, random = 0) => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
      const view = render(<CloudLayer weatherType="clear" timeOfDay="night" {...props} />);
      act(() => { vi.advanceTimersByTime(ms); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      return view.container;
    };

    it('swims moonlit day fish from nautical twilight on, in the pool layer (NF1, NR2)', () => {
      for (const timeOfDay of ['nautical-twilight', 'astronomical-twilight', 'night'] as const) {
        const fishIcon = spawnNight({ timeOfDay, moonlight: moon }, 16000)
          .querySelector('[data-testid="moonlit-fish"] [data-testid="scene-fish"]');
        expect(fishIcon?.getAttribute('data-kind')).toBe('classic');
        expect((fishIcon?.parentElement as HTMLElement).style.color).toBe('hsl(var(--scene-moon))');
      }
    });

    it('sends no fish lit by the moon while the moon is down (NR3)', () => {
      expect(spawnNight({}, 16000).querySelector('[data-testid="scene-fish"]')).toBeNull();
      expect(spawnNight({ moonlight: { x: 0.5, strength: 0 } }, 16000).querySelector('[data-testid="scene-fish"]')).toBeNull();
    });

    it('sends glowing fish without the moon, with their lights (NF4)', () => {
      // A roll of 0.6 picks the lanternfish (60 of 100), passes the 70 % chance and sets a 21 s gap.
      const container = spawnNight({}, 22000, 0.6);
      expect(container.querySelector('[data-testid="scene-fish"]')?.getAttribute('data-kind')).toBe('lanternfish');
      expect(container.querySelectorAll('[data-testid="fish-light"]').length).toBe(5);
    });

    it('keeps the night quiet: a check every 15-25 s, at most three fish (NR1)', () => {
      expect(spawnNight({ moonlight: moon }, 14000).querySelector('[data-testid="scene-fish"]')).toBeNull();
      // A moonlit classic pair every 15.5 s; six tries in 100 s, three pairs stay.
      expect(spawnNight({ moonlight: moon }, 100000).querySelectorAll('[data-testid="scene-fish"]').length).toBe(6);
    });
  });
});
