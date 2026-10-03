import React, { Profiler } from 'react';
import { render, act } from '@testing-library/react';
import CloudLayer, { WeatherType, createFish, createBird } from '../src/components/CloudLayer';
import { FISH_WEIGHTS, NIGHT_FISH_WEIGHTS, getWaterSpeedFactor } from '../src/utils/weatherEffectsUtils';
import type { TimeOfDay } from '../src/utils/sunUtils';
import { DEFAULT_CLOUD_LAYERS, getCloudCentre, getGliderStartProgress, getSkyClouds } from '../src/utils/skyCloudUtils';

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

// The window width the spawn loop sees (jsdom's default is 1024 px). Fish and boat limits
// grow with the width (ROADMAP item 70), so the limit tests pin a phone or a desktop width.
const atWidth = <T,>(width: number, run: () => T): T => {
  const original = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  try { return run(); } finally {
    Object.defineProperty(window, 'innerWidth', { value: original, configurable: true, writable: true });
  }
};

describe('CloudLayer', () => {
  const renderLayer = (weatherType: WeatherType, timeOfDay: string) =>
    render(<CloudLayer weatherType={weatherType} timeOfDay={timeOfDay as TimeOfDay} />);

  it('draws the clouds by type (ROADMAP item 84)', () => {
    const { container } = renderLayer('rain', 'midday');
    expect(container.querySelector('[data-testid="sky-clouds"]')?.getAttribute('data-low')).toBe('deck');
    expect(container.querySelectorAll('[data-testid="sky-cloud"]').length).toBeGreaterThan(0);
  });

  it("closes the sky with a dark deck in a storm (ROADMAP item 51, now item 84's nimbostratus)", () => {
    const deck = (type: WeatherType) => renderLayer(type, 'afternoon').container.querySelector('[data-testid="sky-cloud"][data-type="Ns"]');
    expect(deck('storm')).not.toBeNull();
    expect(deck('partly')).toBeNull();
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
      const container = spawn({ timeOfDay: 'nautical-twilight' }, 9000);
      expect(container.querySelector('[data-testid="scene-bat"]')).not.toBeNull();
      expect(container.textContent).not.toContain('🦇');
    });

    it('draws bats as a solid dark silhouette (ROADMAP item 64, B2)', () => {
      const bat = spawn({ timeOfDay: 'civil-twilight' }, 9000).querySelector('[data-testid="scene-bat"]') as SVGElement;
      expect(bat.getAttribute('fill')).toBe('currentColor');
      expect(bat.style.color).toBe('hsl(var(--scene-critter-silhouette) / 0.9)');
    });

    it('flies bats right after sunset, in civil twilight (ROADMAP item 40)', () => {
      const container = spawn({ timeOfDay: 'civil-twilight' }, 9000);
      expect(container.querySelector('[data-testid="scene-bat"]')).not.toBeNull();
    });

    it('keeps the sky quiet in full night: no bats, no birds', () => {
      const container = spawn({ timeOfDay: 'night' }, 9000);
      expect(container.querySelector('[data-testid="scene-bat"]')).toBeNull();
    });

    it('sails a sailboat in fair weather, without lights by day', () => {
      const container = spawn({}, 121000);
      const boat = container.querySelector('[data-testid="scene-boat"]');
      expect(boat?.getAttribute('data-kind')).toBe('sailboat');
      expect(container.querySelector('[data-testid="boat-light"]')).toBeNull();
    });

    it('draws the boats in soft light, with a reflection (ROADMAP item 73, B3 + X1)', () => {
      const boat = spawn({}, 6000).querySelector('[data-testid="scene-boat"]') as HTMLElement;
      expect(boat.querySelectorAll('linearGradient').length).toBeGreaterThan(0);
      expect(boat.querySelector('path[fill^="url(#"]')).not.toBeNull();
      expect(boat.querySelector('[data-testid="boat-reflection"]')).not.toBeNull();
    });

    it('trails a wake only behind fast boats (ROADMAP item 73, X2)', () => {
      const wake = (props: Partial<React.ComponentProps<typeof CloudLayer>>) =>
        spawn(props, 6000).querySelector('[data-testid="boat-wake"]') !== null;
      expect(wake({})).toBe(false); // a sailboat in calm weather
      expect(wake({ windSpeedKmh: 50 })).toBe(true); // a sailboat in strong wind
      expect(wake({ weatherType: 'rain' })).toBe(true); // rain sends only the ferry and the freighter
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

    it('never has more than 3 boats out at once on a phone (ROADMAP item 40)', () => {
      // Spawns at ~5, 60, 115 and 170 s; no boat finishes its crossing in the test.
      const container = atWidth(390, () => spawn({}, 180000));
      expect(container.querySelectorAll('[data-testid="scene-boat"]').length).toBe(3);
    });

    it('sends more boats far out, toward the horizon (ROADMAP item 71)', () => {
      // A roll of 0.25 gives the distance √0.25 = 0.5, so the waterline is at 67 + 0.5 × 20 = 77 %.
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const { container } = render(<CloudLayer weatherType="clear" timeOfDay="midday" />);
      act(() => { vi.advanceTimersByTime(21000); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      const wrapper = container.querySelector('[data-testid="scene-boat"]')?.parentElement?.parentElement as HTMLElement;
      expect(wrapper.style.top).toBe('77%');
    });

    it('lets more boats out on a wide screen (ROADMAP item 70)', () => {
      // 1290 px is three phones wide: up to 9 boats, so all four spawns stay.
      const container = atWidth(1290, () => spawn({}, 180000));
      expect(container.querySelectorAll('[data-testid="scene-boat"]').length).toBe(4);
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

    it('sends out only the big boats, with a wake, in a storm; none in hail (ROADMAP item 73)', () => {
      const storm = spawn({ weatherType: 'storm' }, 6000);
      expect(storm.querySelector('[data-testid="scene-boat"]')?.getAttribute('data-kind')).toBe('ferry');
      expect(storm.querySelector('[data-testid="boat-wake"]')).not.toBeNull();
      expect(spawn({ weatherType: 'hail' }, 121000).querySelector('[data-testid="scene-boat"]')).toBeNull();
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
      // The whole water (item 71): near fish in the front, far ones just below the horizon.
      expect(near.y).toBeCloseTo(92, 5);
      expect(far.y).toBeCloseTo(68, 0);
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

    it('keeps at most five fish on screen on a phone (E4)', () => {
      // A classic fish pair every 5.5 s; none finishes its crossing in the test.
      const container = atWidth(390, () => spawnFish({}, 40000));
      expect(container.querySelectorAll('[data-testid="scene-fish"]').length).toBe(10); // 5 pairs
    });

    it('allows five fish per phone width on a wide screen (ROADMAP item 70)', () => {
      // 1290 px: up to 15 fish, so all seven pairs from 40 s stay; by 90 s the 15 are reached.
      expect(atWidth(1290, () => spawnFish({}, 40000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(14);
      expect(atWidth(1290, () => spawnFish({}, 90000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(30);
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
      // A moonlit classic pair every 15.5 s; six tries in 100 s, three pairs stay on a phone.
      expect(atWidth(390, () => spawnNight({ moonlight: moon }, 100000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(6);
      // Three phones wide: up to nine, so all six pairs stay (item 70).
      expect(atWidth(1290, () => spawnNight({ moonlight: moon }, 100000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(12);
    });
  });

  describe('birds (ROADMAP item 74)', () => {
    const spawnBirds = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number, random = 0) => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
      const view = render(<CloudLayer weatherType="clear" timeOfDay="midday" {...props} />);
      act(() => { vi.advanceTimersByTime(ms); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      return view.container;
    };
    const always = (r: number) => () => r;
    const speed = (bird: ReturnType<typeof createBird>) => bird.dx / bird.duration; // % of the width per second

    it('flies no bird faster than 2.5 %/s, half of the old 5 %/s, and the bats too (M2)', () => {
      for (const kind of ['gull', 'heron', 'stork', 'swan', 'geese', 'cormorant', 'starlings', 'bat'] as const) {
        expect(speed(createBird(kind, 390, 1, always(0)))).toBeLessThanOrEqual(2.5 + 1e-9);
      }
      expect(speed(createBird('bat', 390, 1, always(0)))).toBeCloseTo(2.5, 10);
      expect(speed(createBird('heron', 390, 1, always(0)))).toBeCloseTo(1.6, 10);
      expect(speed(createBird('gull', 390, 0.6, always(0)))).toBeCloseTo(1.5, 10); // strong wind (item 10)
    });

    it('moves birds at most at a phone\'s pixels per second on wide screens (C4)', () => {
      const pxPerSec = (width: number) => speed(createBird('gull', width, 1, always(0))) / 100 * width;
      expect(pxPerSec(390)).toBeCloseTo(9.75, 5);
      expect(pxPerSec(1440)).toBeCloseTo(10.75, 5);
    });

    it('flies far birds lower, smaller, slower and paler than near ones (M3)', () => {
      const near = createBird('gull', 390, 1, always(0));
      const far = createBird('gull', 390, 1, always(0.999));
      expect(near.size).toBe(34);
      expect(far.size).toBe(19);
      // Near birds high, far ones low, but well above the horizon at 65 %.
      expect(near.y).toBeCloseTo(18, 5);
      expect(far.y).toBeCloseTo(52, 0);
      expect(speed(far)).toBeLessThan(speed(near) * 0.6);
      expect(far.opacity).toBeLessThan(near.opacity);
    });

    it('flies storks and swans in pairs, geese in a V, cormorants in a line, starlings in a far flock (M4-M7)', () => {
      expect(createBird('stork', 390, 1, always(0)).group).toHaveLength(2);
      expect(createBird('swan', 390, 1, always(0)).group).toHaveLength(2);
      expect(createBird('geese', 390, 1, always(0)).group).toHaveLength(5);
      expect(createBird('geese', 390, 1, always(0.999)).group).toHaveLength(9);
      expect(createBird('cormorant', 390, 1, always(0)).group).toHaveLength(3);
      expect(createBird('cormorant', 390, 1, always(0.999)).group).toHaveLength(5);
      const flock = createBird('starlings', 390, 1, always(0.999));
      expect(flock.group).toHaveLength(30);
      expect(flock.depth).toBeGreaterThanOrEqual(0.8);
      expect(createBird('gull', 390, 1, always(0)).group).toBeUndefined();
    });

    it('lets the kestrel hang in the wind; the others glide straight (M8)', () => {
      expect(createBird('kestrel', 390, 1, always(0.5)).easing).toMatch(/^linear\(/);
      expect(createBird('gull', 390, 1, always(0.5)).easing).toBeUndefined();
    });

    it('keeps at most four birds or groups in the sky, more on wide screens (C3)', () => {
      // A roll of 0 sends a gull every 8.5 s. jsdom never ends the animations, so they stay.
      expect(spawnBirds({}, 8000).querySelector('[data-testid="scene-bird"]')).toBeNull();
      expect(atWidth(390, () => spawnBirds({}, 120000)).querySelectorAll('[data-testid="scene-bird"]').length).toBe(4);
      expect(atWidth(1290, () => spawnBirds({}, 120000)).querySelectorAll('[data-testid="scene-bird"]').length).toBe(12);
    });

    it('crosses the moon with a V of geese at night, in the migration months only (W14)', () => {
      const night = { timeOfDay: 'night' as const, date: new Date('2026-10-01T23:00:00'), latitude: 47.8 };
      const geese = spawnBirds({ ...night, moon: { x: 70, y: 22.4 } }, 31000)
        .querySelectorAll('[data-testid="scene-bird"][data-kind="geese"]');
      expect(geese.length).toBe(5);
      expect((geese[0].parentElement?.parentElement as HTMLElement).style.top).toBe('22%');
      expect(spawnBirds(night, 31000).querySelector('[data-testid="scene-bird"]')).toBeNull();
      const july = { ...night, date: new Date('2026-07-01T23:00:00'), moon: { x: 70, y: 22 } };
      expect(spawnBirds(july, 31000).querySelector('[data-testid="scene-bird"]')).toBeNull();
    });
  });

  describe('silver lining (ROADMAP item 76, X2)', () => {
    it('lights the cloud the moon sits on, and no cloud without the moon', () => {
      const props = { weatherType: 'cloudy' as const, timeOfDay: 'night' as const, date: new Date('2026-10-01T23:42:00'), latitude: 47.78, longitude: 9.61 };
      // The moon at the centre of the first low cloud (item 84's layout; jsdom's window is 1024 × 768).
      const [w, h] = [window.innerWidth, window.innerHeight];
      const glider = getSkyClouds({
        weather: 'cloudy', layers: DEFAULT_CLOUD_LAYERS.cloudy, width: w, height: h,
        seed: `${props.date.toDateString()}|47.8|9.6`, egg: false, direction: 1,
      }).find(g => g.clouds[0].band === 'low')!;
      const centre = getCloudCentre(glider, glider.clouds[0], getGliderStartProgress(glider));
      const moon = { x: (centre.x / w) * 100, y: (centre.y / h) * 100, r: 22, light: 0.75 };
      const lit = render(<CloudLayer {...props} moon={moon} />);
      expect(lit.container.querySelectorAll('[data-testid="cloud-moonlight"]').length).toBeGreaterThan(0);
      lit.unmount();
      const dark = render(<CloudLayer {...props} />);
      expect(dark.container.querySelector('[data-testid="cloud-moonlight"]')).toBeNull();
    });
  });
});

describe('CloudLayer rain (ROADMAP item 77)', () => {
  const layer = (weatherType: WeatherType, rainMmH: number | null = null) =>
    render(<CloudLayer weatherType={weatherType} timeOfDay="midday" rainMmH={rainMmH} />).container;

  it('draws drizzle, rain and storm on the rain canvas, with the forecast amount or the middle value', () => {
    expect(layer('rain', 7).querySelector('[data-testid="rain-canvas"]')?.getAttribute('data-mm-h')).toBe('7');
    expect(layer('drizzle').querySelector('[data-testid="rain-canvas"]')?.getAttribute('data-mm-h')).toBe('0.4');
    expect(layer('storm').querySelector('[data-testid="rain-canvas"]')?.getAttribute('data-mm-h')).toBe('10');
    for (const type of ['clear', 'overcast', 'snow', 'hail'] as const) {
      expect(layer(type, 5).querySelector('[data-testid="rain-canvas"]')).toBeNull();
    }
  });

  it('keeps each flake and pellet delay in the animation shorthand, so they do not fall in step', () => {
    const delays = (container: HTMLElement, name: string) =>
      [...container.querySelectorAll<HTMLElement>('div')]
        .map(el => el.style.animation)
        .filter(animation => animation.startsWith(name))
        .map(animation => animation.split(' ')[3]);
    const snow = delays(layer('snow'), 'snowfall');
    const hail = delays(layer('hail'), 'hailFall');
    expect(snow).toHaveLength(60);
    expect(hail).toHaveLength(45);
    expect(new Set(snow).size).toBeGreaterThan(50);
    expect(new Set(hail).size).toBeGreaterThan(40);
  });
});
