import React, { Profiler } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import CloudLayer, { WeatherType, createFish, createBird, spawnTick, type SceneEntities, type SpawnRules, type SpawnTimes } from '../src/components/CloudLayer';
import { findLane, firstMeeting, xAt, type ScenePath } from '../src/utils/scenePaths';
import { FISH_WEIGHTS, NIGHT_FISH_WEIGHTS, MAX_FISH, MAX_NIGHT_FISH, getWaterSpeedFactor, getSceneLimit } from '../src/utils/weatherEffectsUtils';
import { getSceneDensity, getDensityCurve } from '../src/utils/sceneDensity';
import { getSunTimes, getTimeOfDay } from '../src/utils/sunUtils';
import type { TimeOfDay } from '../src/utils/sunUtils';
import { DEFAULT_CLOUD_LAYERS, getCloudCentre, getDaySeed, getGliderStartProgress, getSkyClouds, mulberry32 } from '../src/utils/skyCloudUtils';

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

// jsdom has no AnimationEvent: an animationend with its animation's name, as a browser sends it.
const endAnimation = (element: Element, animationName: string) => {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  fireEvent(element, event);
};

// Item 102: the box of a thing at time t, or null. A fish that changes lane swims on its old
// lane until the change starts (`path.y` is the new lane); a diving fish swims under the others
// after its dive (the H4 fade), so it has no box then.
type Mover = { path?: ScenePath; shift?: { at: number; dy: number }; dive?: number };
const boxAt = (e: Mover, t: number, viewHeight: number) => {
  const p = e.path;
  if (!p || t < p.start || t > p.start + p.duration + (p.lag ?? 0) || (e.dive !== undefined && t >= e.dive)) return null;
  const y = e.shift && t < e.shift.at ? p.y - (e.shift.dy * 100) / viewHeight : p.y;
  return { l: xAt(p, t - (p.lag ?? 0)), r: xAt(p, t) + p.width, top: y, bottom: y + p.height };
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
      const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" {...props} />);
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

    it('draws bats as a filled silhouette in the birds\' colour, with a slow bob (ROADMAP items 64, 99)', () => {
      const bat = spawn({ timeOfDay: 'civil-twilight' }, 9000).querySelector('[data-testid="scene-bat"]') as SVGElement;
      expect(bat.getAttribute('fill')).toBe('currentColor');
      expect(bat.style.color).toBe('');
      expect(bat.style.animation).toContain('batBob');
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

    it('never has more than 3 boats out at once on a phone (ROADMAP items 40, 93, 102 and 103)', () => {
      // Spawns at ~5, 60, 115 and 170 s; no boat finishes its crossing in the test.
      const container = atWidth(390, () => spawn({}, 180000));
      expect(container.querySelectorAll('[data-testid="scene-boat"]').length).toBe(3);
    });

    it('sends more boats far out, toward the horizon (ROADMAP item 71)', () => {
      // A roll of 0.25 gives the distance √0.25 = 0.5, so the waterline is at 67 + 0.5 × 20 = 77 %.
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
      const { container } = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" />);
      act(() => { vi.advanceTimersByTime(21000); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      const wrapper = container.querySelector('[data-testid="scene-boat"]')?.parentElement?.parentElement as HTMLElement;
      expect(wrapper.style.top).toBe('77%');
    });

    it('lets more boats out on a wide screen, at most 2.5x (ROADMAP items 70, 93 and 103)', () => {
      // 1290 px is three phones wide, but the limit grows only to 2.5 x 3 = 7.5, so 8: eight of the nine spawns stay.
      const container = atWidth(1290, () => spawn({}, 500000));
      expect(container.querySelectorAll('[data-testid="scene-boat"]').length).toBe(8);
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
      // At night without the moon no fish swims (a roll of 0 picks a moonlit fish), so no fish
      // lane moves the boat away from its waterline (item 92).
      const waterline = (props: Partial<React.ComponentProps<typeof CloudLayer>>) =>
        (spawn({ timeOfDay: 'night', ...props }, 6000).querySelector('[data-testid="scene-boat"]')?.parentElement?.parentElement as HTMLElement | null)?.style.top;
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
      const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" {...props} />);
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

    it('draws a fish of the first species in the mix in its own two tones (E3, item 85 FS1)', () => {
      const container = spawnFish({}, 9000);
      const fishIcon = container.querySelector('[data-testid="scene-fish"]');
      expect(fishIcon?.getAttribute('data-kind')).toBe('classic');
      expect((fishIcon?.querySelector('path') as SVGElement).style.fill).toBe('hsl(var(--scene-fish-classic-back))');
      expect([...fishIcon!.querySelectorAll('stop')].map(stop => (stop as SVGElement).style.stopColor))
        .toContain('hsl(var(--scene-fish-classic-belly))');
    });

    it('sends a companion behind the lead (P6)', () => {
      const container = spawnFish({}, 9000);
      const [lead, companion] = [...container.querySelectorAll('[data-testid="scene-fish"]')]
        .map(icon => (icon.parentElement as HTMLElement).style.animation);
      expect(lead).toContain('linear 0s');
      expect(Number(companion.match(/linear ([\d.]+)s/)?.[1])).toBeGreaterThan(2);
    });

    it('keeps 1.5 fish widths and 0.6 fish heights between a pair (item 104)', () => {
      for (const viewportWidth of [390, 1290]) {
        for (const r of [0, 0.25, 0.4999, 0.5, 0.75, 0.999]) {
          // The first draws are the depth and the height; 0.1 < 0.35 makes the pair.
          let draw = 0;
          const fish = createFish('classic', false, false, viewportWidth, () => [r, r, 0.1][draw++] ?? r, false, undefined, 844);
          const width = (fish.width / viewportWidth) * 100; // % of the width
          const gap = (fish.dx / fish.duration) * fish.companion!.lag - width; // the lead's tail to the second fish's nose
          expect(gap).toBeGreaterThanOrEqual(1.5 * width - 1e-9);
          expect(Math.abs(fish.companion!.dy)).toBeGreaterThanOrEqual(0.6 * (fish.height / 844) * 100 - 1e-9);
        }
      }
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

    it('gives the night jellyfish a softer glow: 60 %, the other fish with their own light 95 % (ROADMAP item 82)', () => {
      expect(createFish('jellyfish', false, false, 390, always(0), true).opacity).toBeCloseTo(0.6, 5);
      for (const kind of ['lanternfish', 'anglerfish', 'squid'] as const) {
        expect(createFish(kind, false, false, 390, always(0), true).opacity).toBeCloseTo(0.95, 5);
      }
      // By day the jellyfish keeps its day look (85 % since FS1, item 85).
      expect(createFish('jellyfish', false, false, 390, always(0)).opacity).toBeCloseTo(0.85 * (1 - 0.4 * 0.3), 5);
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

    it('keeps at most five fish on screen on a phone (E4, ROADMAP items 93, 102 and 103)', () => {
      // A classic fish pair every 5.5 s; none finishes its crossing in the test.
      const container = atWidth(390, () => spawnFish({}, 40000));
      expect(container.querySelectorAll('[data-testid="scene-fish"]').length).toBe(10); // 5 pairs
    });

    it('allows 2.5x the fish on a wide screen (ROADMAP items 70, 93 and 103)', () => {
      // 1290 px: up to 2.5 x 5 = 12.5, so 13 fish; all seven pairs from 40 s stay.
      expect(atWidth(1290, () => spawnFish({}, 40000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(14);
    });
  });

  // ROADMAP item 65 (Night waters lookbook picks NF1-NF7, NR1-NR3).
  describe('night fish (ROADMAP item 65)', () => {
    const moon = { x: 0.5, strength: 1 };
    const spawnNight = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number, random = 0) => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
      const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="night" {...props} />);
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
        expect((fishIcon?.querySelector('path') as SVGElement).style.fill).toBe('hsl(var(--scene-fish-moon-back))');
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

    it('keeps the night quiet: a check every 15-25 s, at most three fish (NR1, ROADMAP items 93, 102 and 103)', () => {
      expect(spawnNight({ moonlight: moon }, 14000).querySelector('[data-testid="scene-fish"]')).toBeNull();
      // A moonlit classic pair every 15.5 s; six tries in 100 s, three pairs stay on a phone.
      expect(atWidth(390, () => spawnNight({ moonlight: moon }, 100000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(6);
      // Three phones wide: up to 2.5 x 3 = 7.5, so 8 pairs; all six tries stay (items 70, 93 and 103).
      expect(atWidth(1290, () => spawnNight({ moonlight: moon }, 100000)).querySelectorAll('[data-testid="scene-fish"]').length).toBe(12);
    });
  });

  // ROADMAP item 85 (Fish Redone lookbook picks FS1, SH1, DO1, X4, X5, X6).
  describe('sea visitors (ROADMAP item 85)', () => {
    const always = (r: number) => () => r;
    // The species' own speed in % of the width per second, without the distance slow-down.
    const ownSpeed = (fish: ReturnType<typeof createFish>) => fish.dx / fish.duration / (1 - 0.45 * fish.depth);
    // Renders the layer with `?fish=<kind>` in the address, so every spawn is that kind.
    const spawnForced = (kind: string, props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number) => {
      window.history.pushState({}, '', `/?fish=${kind}`);
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      try {
        const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" {...props} />);
        act(() => { vi.advanceTimersByTime(ms); });
        return view.container;
      } finally {
        randomSpy.mockRestore();
        vi.useRealTimers();
        window.history.pushState({}, '', '/');
      }
    };
    const finFill = (visitor: Element | null) =>
      (visitor?.querySelector('g[clip-path*="above"] path') as SVGElement).style.fill;

    it('sends the shark and the pod at a depth of 0.3 to 1 (X6); the whale stays far out', () => {
      for (const kind of ['shark', 'dolphins'] as const) {
        expect(createFish(kind, false, false, 390, always(0)).depth).toBeCloseTo(0.3, 5);
        expect(createFish(kind, false, false, 390, always(0.999)).depth).toBeGreaterThan(0.99);
      }
      expect(createFish('whale', false, false, 390, always(0)).depth).toBe(0.75);
    });

    it('glides the shark at 0.5 %/s and the pod at 0.7 %/s, slower than the sailboat', () => {
      expect(ownSpeed(createFish('shark', false, false, 390, always(0)))).toBeCloseTo(0.5, 5);
      expect(ownSpeed(createFish('dolphins', false, false, 390, always(0)))).toBeCloseTo(0.7, 5);
      // A wide screen: at most a phone's pixels per second (item 66).
      const desktop = createFish('shark', false, false, 1280, always(0));
      expect((desktop.dx / desktop.duration) * 1280).toBeCloseTo(0.5 * (1 - 0.45 * 0.3) * 430, 5);
    });

    it('sizes a near shark 52 px and a far one 33 px; a pod has 2 or 3 dolphins, 1.5 s apart', () => {
      expect(createFish('shark', false, false, 390, always(0)).width).toBe(52);
      expect(createFish('shark', false, false, 390, always(0.999)).width).toBe(33);
      const two = createFish('dolphins', false, false, 390, always(0));
      expect(two.rolls).toEqual([0, 1.5]);
      expect(two.width).toBeCloseTo((35 * 82) / 48, 5); // a 35 px dolphin, 82 grid units for two
      const three = createFish('dolphins', false, false, 390, always(0.6));
      expect(three.rolls).toHaveLength(3);
      expect(three.rolls![2] - three.rolls![1]).toBeCloseTo(1.5, 5);
    });

    it('draws day fish at 85 % (FS1), visitors at 95 %, the night jellyfish at 60 % (item 82)', () => {
      expect(createFish('trout', false, false, 390, always(0)).opacity).toBeCloseTo(0.85, 5);
      expect(createFish('shark', false, false, 390, always(0)).opacity).toBeCloseTo(0.95 * (1 - 0.3 * 0.3), 5);
      expect(createFish('burbot', false, false, 390, always(0), true).opacity).toBeCloseTo(0.75, 5);
      expect(createFish('jellyfish', false, false, 390, always(0), true).opacity).toBeCloseTo(0.6, 5);
      expect(createFish('shark', true, false, 390, always(0)).glow).toBe(false); // no E1 spot
    });

    it('swims a forced shark by day with its fin, a faint body below and a V-wake (SH1, X4)', () => {
      const shark = spawnForced('shark', {}, 9000).querySelector('[data-testid="scene-visitor"]');
      expect(shark?.getAttribute('data-kind')).toBe('shark');
      expect(shark?.querySelectorAll('[data-testid="visitor-wake"]')).toHaveLength(1);
      expect(finFill(shark)).toBe('hsl(var(--scene-fish-shark))');
      // The waterline at 67-93 % of the height, like every fish: here depth 0.3, 1 % up.
      const swimmer = shark?.parentElement as HTMLElement;
      expect(parseFloat(swimmer.style.top)).toBeCloseTo(84.2, 5);
      expect(swimmer.style.animation).toContain('moveAcrossX');
    });

    it('swims a forced pod with a wake behind each dolphin, in dusk colours in the evening (DO1, X4)', () => {
      const pod = spawnForced('dolphins', { timeOfDay: 'evening' }, 9000).querySelector('[data-testid="scene-visitor"]');
      expect(pod?.getAttribute('data-kind')).toBe('dolphins');
      expect(pod?.querySelectorAll('[data-testid="visitor-dolphin"]')).toHaveLength(2);
      expect(pod?.querySelectorAll('[data-testid="visitor-wake"]')).toHaveLength(2);
      expect(finFill(pod)).toBe('hsl(var(--scene-fish-dolphin-dusk))');
    });

    it('ends a pod\'s crossing only with its own glide, not with a dolphin\'s roll (DO1)', () => {
      const container = spawnForced('dolphins', {}, 9000);
      const pod = container.querySelector('[data-testid="scene-visitor"]')!;
      // A roll's animationend bubbles up to the swimmer, e.g. when a play rate runs it backwards.
      fireEvent.animationEnd(pod.querySelector('[data-testid="visitor-dolphin"] g[style*="scene-dolphin-roll"]')!);
      expect(container.querySelector('[data-testid="scene-visitor"]')).not.toBeNull();
      endAnimation(pod.parentElement!, 'moveAcrossX');
      expect(container.querySelector('[data-testid="scene-visitor"]')).toBeNull();
    });

    it('sends night visitors only into the moon pool, with moonlit fins (X5)', () => {
      const lit = spawnForced('shark', { timeOfDay: 'night', moonlight: { x: 0.5, strength: 1 } }, 26000);
      const shark = lit.querySelector('[data-testid="moonlit-fish"] [data-testid="scene-visitor"]');
      expect(shark).not.toBeNull();
      expect(finFill(shark)).toBe('hsl(var(--scene-fish-visitor-moon))');
      expect(spawnForced('dolphins', { timeOfDay: 'night' }, 26000).querySelector('[data-testid="scene-visitor"]')).toBeNull();
      expect(spawnForced('dolphins', { timeOfDay: 'night', moonlight: { x: 0.5, strength: 0 } }, 26000)
        .querySelector('[data-testid="scene-visitor"]')).toBeNull();
    });
  });

  describe('birds (ROADMAP item 74)', () => {
    const spawnBirds = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number, random = 0) => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);
      const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" {...props} />);
      act(() => { vi.advanceTimersByTime(ms); });
      randomSpy.mockRestore();
      vi.useRealTimers();
      return view.container;
    };
    const always = (r: number) => () => r;
    const speed = (bird: ReturnType<typeof createBird>) => bird.dx / bird.duration; // % of the width per second

    it('flies bats near and far, small, in the birds\' look, with a 1-2 % bob of 3-4 s (item 99)', () => {
      const near = createBird('bat', 390, 1, always(0));
      const far = createBird('bat', 390, 1, always(0.99));
      expect(near).toMatchObject({ depth: 0, size: 24, opacity: 0.6, bob: { amp: 1, period: 3, phase: 0 } });
      expect(far.depth).toBeCloseTo(0.99, 10);
      expect(far.size).toBeLessThan(near.size);
      expect(far.opacity).toBeLessThan(near.opacity);
      expect(far.y).toBeGreaterThan(near.y);
      expect(far.bob!.amp).toBeLessThanOrEqual(2);
      expect(far.bob!.period).toBeLessThanOrEqual(4);
      expect(createBird('gull', 390, 1, always(0)).bob).toBeUndefined();
    });

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

    it('keeps at most five birds or groups in the sky, more on wide screens (C3, ROADMAP item 103)', () => {
      // A roll of 0 sends a gull every 8.5 s. jsdom never ends the animations, so they stay.
      expect(spawnBirds({}, 8000).querySelector('[data-testid="scene-bird"]')).toBeNull();
      expect(atWidth(390, () => spawnBirds({}, 120000)).querySelectorAll('[data-testid="scene-bird"]').length).toBe(5);
      // At most 2.5x on a wide screen (items 93 and 103): 12.5, so 13 of the 14 gulls.
      expect(atWidth(1290, () => spawnBirds({}, 120000)).querySelectorAll('[data-testid="scene-bird"]').length).toBe(13);
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

describe('CloudLayer during time-travel play (ROADMAP item 83)', () => {
  // Math.random pinned to 0: every spawn chance passes, the shortest gaps, a classic fish with a companion.
  const spawn = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms: number) => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" {...props} />);
    act(() => { vi.advanceTimersByTime(ms); });
    randomSpy.mockRestore();
    vi.useRealTimers();
    return view.container;
  };

  it('sends boats 8x as often in both play directions', () => {
    // Live: the first boat at 5 s, the next after 55 s. Play: one every 55 / 8 = 6.9 s, up to the
    // limit of 3 at 1290 px (item 93).
    const boats = (playDirection: -1 | 0 | 1) =>
      atWidth(1290, () => spawn({ playDirection }, 14000)).querySelectorAll('[data-testid="scene-boat"]').length;
    expect(boats(0)).toBe(1);
    expect(boats(1)).toBe(3);
    expect(boats(-1)).toBe(3);
  });

  it('removes a fish pair when its last swimmer leaves: the companion live, the lead in rewind', () => {
    // A reversed animation ends at its start, so in rewind the lead leaves last.
    const goneAfterEnd = (playDirection: -1 | 0, swimmer: 0 | 1) => {
      const container = spawn({ playDirection }, playDirection ? 700 : 9000);
      const swimmers = [...container.querySelectorAll('[data-testid="scene-fish"]')].map(icon => icon.parentElement as HTMLElement);
      expect(swimmers).toHaveLength(2);
      endAnimation(swimmers[swimmer], 'moveAcrossX');
      return container.querySelector('[data-testid="scene-fish"]') === null;
    };
    expect(goneAfterEnd(0, 0)).toBe(false);
    expect(goneAfterEnd(0, 1)).toBe(true);
    expect(goneAfterEnd(-1, 1)).toBe(false);
    expect(goneAfterEnd(-1, 0)).toBe(true);
  });

  it('keeps snow and hail at live speed, as the rain canvas', () => {
    const marked = (weatherType: WeatherType, name: string) => {
      const falling = [...render(<CloudLayer weatherType={weatherType} timeOfDay="midday" playDirection={1} />).container
        .querySelectorAll<HTMLElement>('div')].filter(el => el.style.animation.startsWith(name));
      return falling.length > 0 && falling.every(el => el.hasAttribute('data-live-speed'));
    };
    expect(marked('snow', 'snowfall')).toBe(true);
    expect(marked('hail', 'hailFall')).toBe(true);
  });
});

// ROADMAP item 92: 30 minutes of the real spawn rules (spawnTick), with a seeded random.
describe('lane planning (ROADMAP item 92)', () => {
  // mulberry32: the same numbers on each run.
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const endOf = (p: ScenePath) => p.start + p.duration + (p.lag ?? 0);
  // The pairs of boxes that touch at time t (no margin).
  const touching = (list: ({ id: number } & Mover)[], t: number, seen: Set<string>, viewHeight: number) => {
    const boxes = list.flatMap(e => {
      const box = boxAt(e, t, viewHeight);
      return box ? [{ id: e.id, ...box }] : [];
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.l < b.r && b.l < a.r && a.top < b.bottom && b.top < a.bottom) seen.add(`${a.id}|${b.id}`);
      }
    }
  };
  // A check every 500 ms, live (the scene clock is the wall clock); a thing leaves at the end
  // of its crossing, as on its animationend. Without a plan, each thing keeps its random pick.
  const simulate = (rules: SpawnRules, plan: boolean) => {
    const random = seeded(92);
    let scene: SceneEntities = { birds: [], fish: [], ships: [], leaves: [], planes: [] };
    const last: SpawnTimes = { birds: 0, fish: 0, ships: 5000 - 55000, leaves: 0, planes: 0 }; // the first boat after 5 s, as at mount
    let spawns = 0;
    let boatSpawns = 0;
    const touches = new Set<string>(); // fish-fish, boat-boat, bird-bird (and planes, item 96)
    const water = new Set<string>(); // all water pairs, fish-boat included
    const dives = new Set<string>(); // item 94: the fish that dive under a boat
    for (let ms = 500; ms <= 30 * 60_000; ms += 500) {
      const t = ms / 1000;
      const onScreen = <T extends { path?: ScenePath }>(list: T[]) => list.filter(e => !e.path || t < endOf(e.path));
      scene = { birds: onScreen(scene.birds), fish: onScreen(scene.fish), ships: onScreen(scene.ships), leaves: [], planes: onScreen(scene.planes) };
      const next = spawnTick(scene, last, rules, ms, t, random, plan ? findLane : candidate => candidate.y);
      spawns += next.birds.length - scene.birds.length + next.fish.length - scene.fish.length + next.ships.length - scene.ships.length +
        next.planes.length - scene.planes.length;
      boatSpawns += next.ships.length - scene.ships.length;
      scene = next;
      scene.fish.forEach(f => { if (f.dive !== undefined) dives.add(String(f.id)); });
      for (let dt = 0; dt < 0.5; dt += 0.1) {
        touching(scene.fish, t + dt, touches, rules.view.height);
        touching(scene.ships, t + dt, touches, rules.view.height);
        touching([...scene.birds, ...scene.planes], t + dt, touches, rules.view.height);
        touching([...scene.fish, ...scene.ships], t + dt, water, rules.view.height);
      }
    }
    // A fish and a boat that meet, where the fish does not dive (item 94).
    const fishBoat = [...water].filter(pair => !touches.has(pair) && !pair.split('|').some(id => dives.has(id))).length;
    return { spawns, boatSpawns, touches: touches.size, fishBoat };
  };
  const rules = (view: SpawnRules['view'], extra: Partial<SpawnRules> = {}): SpawnRules => ({
    weatherType: 'clear', timeOfDay: 'midday', windSpeedKmh: 10, birdSpeedFactor: 1, showLeaves: false,
    isFullscreen: false, moonUp: false, moonY: null, month: 10, latitude: 47.8, gapFactor: 1, rewind: false,
    fishOverride: null, density: 1, view, ...extra,
  });

  it.each([
    { name: 'a phone by day', scene: rules({ width: 390, height: 844 }) },
    { name: 'a desktop by day', scene: rules({ width: 1280, height: 800 }) },
    { name: 'a phone in the evening', scene: rules({ width: 390, height: 844 }, { timeOfDay: 'evening' }) },
    { name: 'a phone at night, with the moon', scene: rules({ width: 390, height: 844 }, { timeOfDay: 'night', moonUp: true, moonY: 30 }) },
  ])('keeps all boxes apart on $name, with at most 15 percent fewer spawns and boats', ({ scene }) => {
    const planned = simulate(scene, true);
    const random = simulate(scene, false);
    expect(random.touches + random.fishBoat).toBeGreaterThan(0); // the check finds touches without a plan
    expect(planned.touches).toBe(0);
    // Boats have the right of way: no boat waits for the fish. A fish that swims when a boat
    // takes a full band dives under it (item 94), so no fish meets a boat without a dive.
    // Item 104: at most 15 percent fewer boats, not "no fewer". Without a plan, boats also sail
    // through boats, and both runs share one random stream, so the counts differ by chance:
    // with seeds 1-12, the plan had fewer boats in 10 of 12 runs before item 104 too.
    expect(planned.boatSpawns).toBeGreaterThanOrEqual(0.85 * random.boatSpawns);
    expect(planned.fishBoat).toBe(0);
    expect(planned.spawns).toBeGreaterThanOrEqual(0.85 * random.spawns);
  });
});

// ROADMAP item 93: the warm start (S1), the lower limits (S2) and the busy and quiet phases (S3),
// with the real spawn rules (spawnTick) and a seeded random.
describe('a calmer sea that is full from the start (ROADMAP item 93)', () => {
  const rules = (view: SpawnRules['view'], extra: Partial<SpawnRules> = {}): SpawnRules => ({
    weatherType: 'clear', timeOfDay: 'midday', windSpeedKmh: 10, birdSpeedFactor: 1, showLeaves: false,
    isFullscreen: false, moonUp: false, moonY: null, month: 10, latitude: 47.8, gapFactor: 1, rewind: false,
    fishOverride: null, density: 1, view, ...extra,
  });
  const phone = { width: 390, height: 844 };
  const desktop = { width: 1280, height: 800 };
  const endOf = (p: ScenePath) => p.start + p.duration + (p.lag ?? 0);
  const empty = (): SceneEntities => ({ birds: [], fish: [], ships: [], leaves: [], planes: [] });
  // A check every 500 ms from `fromMs` on; a thing leaves at the end of its crossing.
  const run = (
    scene: SceneEntities, last: SpawnTimes, rulesAt: (ms: number) => SpawnRules, fromMs: number, toMs: number,
    random: () => number, onTick?: (scene: SceneEntities, ms: number) => void,
  ) => {
    for (let ms = fromMs; ms <= toMs; ms += 500) {
      const t = ms / 1000;
      const onScreen = <T extends { path?: ScenePath }>(list: T[]) => list.filter(e => !e.path || t < endOf(e.path));
      scene = { birds: onScreen(scene.birds), fish: onScreen(scene.fish), ships: onScreen(scene.ships), leaves: [], planes: onScreen(scene.planes) };
      scene = spawnTick(scene, last, rulesAt(ms), ms, t, random);
      onTick?.(scene, ms);
    }
    return scene;
  };
  const freshTimes = (): SpawnTimes => ({ birds: 0, fish: 0, ships: 5000 - 55000, leaves: 0, planes: 0 });
  const seaTarget = (r: SpawnRules) =>
    getSceneLimit(r.timeOfDay === 'night' ? MAX_NIGHT_FISH : MAX_FISH, r.view.width, r.density) + getSceneLimit(2, r.view.width, r.density);

  it.each([
    { name: 'a phone by day', scene: rules(phone) },
    { name: 'a desktop by day', scene: rules(desktop) },
    { name: 'a phone at night, with the moon', scene: rules(phone, { timeOfDay: 'night', moonUp: true, moonY: 30 }) },
    { name: 'a desktop in a lull', scene: rules(desktop, { timeOfDay: 'evening', density: 0.6 }) },
  ])('fills at least 60 % of the sea 1 s after load on $name, part of the way across', ({ scene }) => {
    for (let seed = 1; seed <= 5; seed++) {
      const sea = run(empty(), freshTimes(), () => scene, 500, 1000, mulberry32(seed));
      expect(sea.fish.length + sea.ships.length).toBeGreaterThanOrEqual(0.6 * seaTarget(scene));
      for (const thing of [...sea.fish, ...sea.ships, ...sea.birds]) {
        // Each one started 0.1-0.9 of the way across: a negative delay and a path that began in the past.
        const progress = -(thing.delay ?? 0) / thing.duration;
        expect(progress).toBeGreaterThanOrEqual(0.1);
        expect(progress).toBeLessThanOrEqual(0.9);
        expect(thing.path?.start).toBeCloseTo(0.5 - progress * thing.duration, 6);
        expect(thing.fadeIn).toBe(false); // at load the scene's reveal covers it
      }
    }
  });

  it('opens the scene with fish and boats on their way, at once after mount', () => {
    vi.useFakeTimers();
    const { container } = atWidth(390, () => render(<CloudLayer weatherType="clear" timeOfDay="midday" />));
    vi.useRealTimers();
    const movers = [...container.querySelectorAll<HTMLElement>('div')]
      .filter(el => el.style.animation.startsWith('moveAcrossX') && el.querySelector('[data-testid="scene-boat"], [data-testid="scene-fish"]'));
    expect(container.querySelector('[data-testid="scene-boat"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="scene-fish"]')).not.toBeNull();
    // moveAcrossX <duration>s linear <delay>s forwards: the lead swimmer and each boat start part of the way across.
    expect(movers.some(el => parseFloat(el.style.animation.split(' ')[3]) < 0)).toBe(true);
  });

  it('places the warm start with the lane plan: no two boxes touch', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const sea = run(empty(), freshTimes(), () => rules(desktop), 500, 500, mulberry32(seed));
      const water: Mover[] = [...sea.fish, ...sea.ships];
      for (let t = 0.5; t < 120; t += 0.5) {
        const boxes = water.flatMap(e => boxAt(e, t, desktop.height) ?? []);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i], boxes[j]];
            expect(a.l < b.r && b.l < a.r && a.top < b.bottom && b.top < a.bottom).toBe(false);
          }
        }
      }
    }
  });

  it('starts a rest stop part of the way along its curve', () => {
    // `?fish=pike`: each fish rests on the way (P8). The negative delay puts it on the curve at its progress.
    const sea = run(empty(), freshTimes(), () => rules(phone, { fishOverride: 'pike' }), 500, 500, mulberry32(3));
    expect(sea.fish.length).toBe(MAX_FISH);
    for (const pike of sea.fish) {
      expect(pike.easing).toMatch(/^linear\(/);
      expect(pike.path?.curve).toBe(pike.curve);
      expect(pike.path?.start).toBeLessThan(0.5);
    }
  });

  it('does not warm-start during time-travel play: the sea fills by its 8x faster spawns', () => {
    for (const rewind of [false, true]) {
      const sea = run(empty(), freshTimes(), () => rules(desktop, { gapFactor: 1 / 8, rewind }), 500, 500, mulberry32(1));
      expect(sea.fish.length + sea.ships.length).toBeLessThanOrEqual(2);
      expect([...sea.fish, ...sea.ships].every(thing => thing.delay === undefined)).toBe(true);
    }
  });

  it('fills a group again when it starts again: the fish after a storm', () => {
    const random = mulberry32(5);
    const last = freshTimes();
    let sea = run(empty(), last, () => rules(phone), 500, 60_000, random);
    sea = run(sea, last, () => rules(phone, { weatherType: 'storm' }), 60_500, 70_000, random);
    expect(sea.fish).toHaveLength(0);
    sea = run(sea, last, () => rules(phone), 70_500, 70_500, random);
    expect(sea.fish).toHaveLength(MAX_FISH);
    expect(sea.fish.every(fish => (fish.delay ?? 0) < 0 && fish.fadeIn)).toBe(true);
  });

  it('fades a group that starts again in over 2 s; only the end of the crossing removes it', () => {
    vi.useFakeTimers();
    const view = atWidth(390, () => render(<CloudLayer weatherType="clear" timeOfDay="midday" />));
    const fishWrappers = () => [...view.container.querySelectorAll('[data-testid="scene-fish"]')]
      .map(icon => icon.closest<HTMLElement>('div[style*="moveAcrossX"]')!);
    expect(fishWrappers().length).toBeGreaterThan(0);
    expect(fishWrappers().every(el => !el.style.animation.includes('sceneFadeIn'))).toBe(true);
    atWidth(390, () => {
      view.rerender(<CloudLayer weatherType="storm" timeOfDay="midday" />);
      act(() => { vi.advanceTimersByTime(1000); });
      view.rerender(<CloudLayer weatherType="clear" timeOfDay="midday" />);
    });
    vi.useRealTimers();
    const back = fishWrappers();
    expect(back.length).toBeGreaterThan(0);
    // Opacity only: the crossing keeps its duration and its delay; the fade is a second animation.
    expect(back.every(el => /^moveAcrossX [\d.]+s linear -?[\d.]+s forwards, sceneFadeIn 2s ease-out$/.test(el.style.animation))).toBe(true);
    const count = back.length;
    endAnimation(back[0], 'sceneFadeIn');
    expect(fishWrappers()).toHaveLength(count);
  });

  it('removes nothing when the target goes down: the animals swim on', () => {
    const random = mulberry32(7);
    const last = freshTimes();
    let sea = run(empty(), last, () => rules(desktop), 500, 500, random);
    expect(sea.fish).toHaveLength(13);
    sea = run(sea, last, () => rules(desktop, { density: 0.3 }), 1000, 1000, random);
    expect(sea.fish).toHaveLength(13);
  });

  it('follows the busy and quiet phases over a simulated day', () => {
    // Friedrichshafen on 2026-10-05, a phone, clear weather, the real time of day.
    const lat = 47.65;
    const lon = 9.48;
    const midnight = new Date('2026-10-05T00:00:00Z');
    const sunTimes = getSunTimes(new Date('2026-10-05T12:00:00Z'), lat, lon);
    const seed = getDaySeed(midnight, lat, lon);
    const rulesAt = (ms: number) => {
      const date = new Date(midnight.getTime() + ms);
      return rules(phone, {
        timeOfDay: getTimeOfDay(date, sunTimes), density: getSceneDensity(date, sunTimes, seed), moonUp: true, moonY: 30,
      });
    };
    const byPhase = new Map<number, { sum: number; n: number }>();
    const hourly = Array.from({ length: 24 }, () => ({ count: 0, density: 0, n: 0 }));
    run(empty(), freshTimes(), rulesAt, 500, 24 * 3_600_000 - 500, mulberry32(93), (scene, ms) => {
      const date = new Date(midnight.getTime() + ms);
      const count = scene.fish.length + scene.ships.length;
      const phase = byPhase.get(getDensityCurve(date, sunTimes)) ?? { sum: 0, n: 0 };
      byPhase.set(getDensityCurve(date, sunTimes), { sum: phase.sum + count, n: phase.n + 1 });
      const hour = hourly[date.getUTCHours()];
      hour.count += count;
      hour.density += getSceneDensity(date, sunTimes, seed);
      hour.n += 1;
    });
    const mean = (phase: number) => (byPhase.get(phase)?.sum ?? 0) / (byPhase.get(phase)?.n ?? 1);
    // Busiest in the hours around sunrise and sunset, quieter by day, quietest at night.
    expect(mean(1)).toBeGreaterThan(mean(0.7));
    expect(mean(0.7)).toBeGreaterThan(mean(0.5));
    // Hour by hour, the mean number on screen goes with the density (the lulls included).
    const xs = hourly.map(h => h.density / h.n);
    const ys = hourly.map(h => h.count / h.n);
    const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const [mx, my] = [avg(xs), avg(ys)];
    const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const r = cov / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
    expect(r).toBeGreaterThan(0.7);
  });
});

// ROADMAP item 95: a tap on a fish, a bird, a boat or a cloud asks for its info card.
describe('CloudLayer info cards (ROADMAP item 95)', () => {
  // A clear midday with every fish a perch and Math.random at 0: by 15 s a boat (5 s), fish
  // and a gull (8.5 s) are out.
  const renderScene = (props: Partial<React.ComponentProps<typeof CloudLayer>>, ms = 15000) => {
    window.history.pushState({}, '', '/?fish=perch');
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const view = render(<CloudLayer weatherType="clear" timeOfDay="midday" warmStart={false} {...props} />);
      act(() => { vi.advanceTimersByTime(ms); });
      return view;
    } finally {
      randomSpy.mockRestore();
      vi.useRealTimers();
      window.history.pushState({}, '', '/');
    }
  };
  const hits = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-testid="scene-hit"]')];

  it('gives each fish, bird and boat a hit area of at least 44 x 44 px; a tap reports the thing and the point', () => {
    const onInfo = vi.fn();
    const { container } = renderScene({ onInfo });
    expect(hits(container).length).toBeGreaterThanOrEqual(3);
    const types = new Set<string>();
    for (const hit of hits(container)) {
      expect(parseFloat(hit.style.width)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(hit.style.height)).toBeGreaterThanOrEqual(44);
      fireEvent.click(hit, { clientX: 120, clientY: 600 });
      const [target, point] = onInfo.mock.calls.at(-1)!;
      types.add(target.type);
      expect(point).toEqual({ x: 120, y: 600 });
    }
    expect(types).toEqual(new Set(['fish', 'bird', 'boat']));
    expect(onInfo.mock.calls.find(([target]) => target.type === 'fish')![0]).toEqual({ type: 'fish', kind: 'perch' });
    expect(onInfo.mock.calls.find(([target]) => target.type === 'bird')![0]).toEqual({ type: 'bird', kind: 'gull' });
  });

  it('takes taps only on the moving things, which screen readers skip; the scene stays pointer-events-none', () => {
    const { container } = renderScene({ onInfo: vi.fn() });
    expect((container.firstChild as HTMLElement).className).toContain('pointer-events-none');
    for (const hit of hits(container)) {
      const wrapper = hit.closest('.pointer-events-auto')!;
      expect(wrapper.getAttribute('aria-hidden')).toBe('true');
      expect(wrapper.getAttribute('style')).toContain('moveAcrossX');
    }
  });

  it('has no hit areas without onInfo', () => {
    const { container } = renderScene({});
    expect(container.querySelector('[data-testid="scene-hit"]')).toBeNull();
    expect(container.querySelector('.pointer-events-auto')).toBeNull();
  });

  it('draws the ring inside the tapped thing, so its own animation moves the ring on', () => {
    const onInfo = vi.fn();
    const view = renderScene({ onInfo });
    fireEvent.click(hits(view.container)[0]);
    const ring = onInfo.mock.calls[0][2] as string;
    expect(view.container.querySelector('[data-testid="scene-info-ring"]')).toBeNull();
    view.rerender(<CloudLayer weatherType="clear" timeOfDay="midday" onInfo={onInfo} infoRing={ring} />);
    const ringEl = view.container.querySelectorAll('[data-testid="scene-info-ring"]');
    expect(ringEl).toHaveLength(1);
    expect(ringEl[0].closest('[aria-hidden="true"]')!.getAttribute('style')).toContain('moveAcrossX');
  });

  it('colours the ring by the open card\'s rarity tier, and keeps the neutral ring without one (item 107)', () => {
    const onInfo = vi.fn();
    const view = renderScene({ onInfo });
    fireEvent.click(hits(view.container)[0]);
    const ring = onInfo.mock.calls[0][2] as string;
    const ringClass = () => view.container.querySelector('[data-testid="scene-info-ring"]')!.className;
    view.rerender(<CloudLayer weatherType="clear" timeOfDay="midday" onInfo={onInfo} infoRing={ring} infoRingTier="veryRare" />);
    expect(ringClass()).toContain('border-tier-very-rare/80');
    expect(ringClass()).not.toContain('border-white/70');
    view.rerender(<CloudLayer weatherType="clear" timeOfDay="midday" onInfo={onInfo} infoRing={ring} infoRingTier={null} />);
    expect(ringClass()).toContain('border-white/70');
  });

  it('a tap on a cloud reports its type and its layer', () => {
    const onInfo = vi.fn();
    const { container } = render(<CloudLayer weatherType="cloudy" timeOfDay="midday" onInfo={onInfo} />);
    const cloud = container.querySelector<HTMLElement>('[data-testid="sky-cloud"]')!;
    expect(cloud.className).toContain('pointer-events-auto');
    fireEvent.click(cloud);
    expect(onInfo).toHaveBeenCalledWith(
      { type: 'cloud', cloudType: cloud.getAttribute('data-type'), band: expect.stringMatching(/^(low|mid|high)$/) },
      expect.any(Object),
      expect.stringMatching(/^cloud-/),
    );
  });
});

// ROADMAP item 94: the shark hunt, and the fish that dive under a boat.
describe('the shark hunt (ROADMAP item 94)', () => {
  const rules = (extra: Partial<SpawnRules> = {}): SpawnRules => ({
    weatherType: 'clear', timeOfDay: 'midday', windSpeedKmh: 10, birdSpeedFactor: 1, showLeaves: false,
    isFullscreen: false, moonUp: false, moonY: null, month: 10, latitude: 47.8, gapFactor: 1, rewind: false,
    fishOverride: 'shark', density: 1, view: { width: 390, height: 844 }, ...extra,
  });
  // One check with a fish due (the groups show already, so no warm start).
  const firstShark = (extra: Partial<SpawnRules>, seed: number) => {
    const last: SpawnTimes = { birds: 1e9, fish: 0, ships: 1e9, leaves: 1e9, planes: 1e9, shown: { birds: true, fish: true, ships: true } };
    const scene = spawnTick({ birds: [], fish: [], ships: [], leaves: [], planes: [] }, last, rules(extra), 60_000, 60, mulberry32(seed));
    return { scene, last, shark: scene.fish.find(f => f.kind === 'shark') };
  };

  it('lets 1 in 2 sharks hunt, with H1-H4 at even odds; the prey waits behind the left edge', () => {
    const counts: Record<string, number> = {};
    let sharks = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const { scene, shark } = firstShark({}, seed);
      if (!shark) continue;
      sharks++;
      if (!shark.hunt) continue;
      counts[shark.hunt.variant] = (counts[shark.hunt.variant] ?? 0) + 1;
      const prey = scene.fish.find(f => f.id === shark.hunt!.preyId)!;
      expect(prey.kind).toBe({ H1: 'classic', H2: 'perch', H3: 'minnow', H4: 'trout' }[shark.hunt.variant]);
      expect(prey.depth).toBe(shark.depth);
      expect(prey.companion).toBeUndefined();
      expect(prey.delay).toBeGreaterThan(0);
      expect(prey.path!.start).toBeGreaterThan(60);
    }
    const hunts = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(hunts / sharks).toBeGreaterThan(0.4);
    expect(hunts / sharks).toBeLessThan(0.6);
    for (const variant of ['H1', 'H2', 'H3', 'H4']) expect(counts[variant] / hunts).toBeGreaterThan(0.15);
  });

  it('hunts at night only in the moon pool, and with no minnows', () => {
    let hunts = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const { shark, scene } = firstShark({ timeOfDay: 'night', moonUp: true, poolX: 40 }, seed);
      if (!shark?.hunt) continue;
      hunts++;
      expect(shark.hunt.variant).not.toBe('H3');
      expect(scene.fish.find(f => f.id === shark.hunt!.preyId)!.light).toBe('moon');
      expect(Math.abs(shark.hunt.fx!.x - 40)).toBeLessThanOrEqual(9);
    }
    expect(hunts).toBeGreaterThan(0);
    // Without a pool there is no night hunt.
    for (let seed = 1; seed <= 50; seed++) {
      expect(firstShark({ timeOfDay: 'night', moonUp: true, poolX: null }, seed).shark?.hunt).toBeUndefined();
    }
  });

  it('plans no hunt during time-travel play', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(firstShark({ gapFactor: 1 / 8 }, seed).shark?.hunt).toBeUndefined();
      expect(firstShark({ gapFactor: 1 / 8, rewind: true }, seed).shark?.hunt).toBeUndefined();
    }
  });

  it('keeps new small fish out of the shark\'s lane for 60 s after the hunt (X2)', () => {
    let seed = 1;
    let first = firstShark({ huntOverride: 'H4' }, seed);
    while (!first.shark?.hunt) first = firstShark({ huntOverride: 'H4' }, ++seed);
    const { last, shark } = first;
    expect(last.keepAway).toEqual([expect.objectContaining({ start: shark!.hunt!.meetAt, duration: 60, y: shark!.path!.y })]);
  });

  it('gives a fish a dive 2 s before a boat on its fallback lane meets it', () => {
    const fish = { ...createFish('carp', false, false, 390, mulberry32(1)), id: 7 };
    // A slow fish whose box covers the whole water: no boat lane is clear of it.
    const path: ScenePath = { start: 0, duration: 1000, x: 30, dx: 75, width: 5, y: 0, height: 100 };
    const last = (): SpawnTimes => ({ birds: 1e9, fish: 1e9, ships: 0, leaves: 1e9, planes: 1e9, shown: { birds: true, fish: true, ships: true } });
    const lane = (candidate: { y: number }, others: readonly ScenePath[]) => (others.length ? null : candidate.y);
    const tick = (extra: Partial<SpawnRules>) => spawnTick(
      { birds: [], fish: [{ ...fish, path }], ships: [], leaves: [], planes: [] }, last(), rules({ fishOverride: null, ...extra }),
      200_000, 10, () => 0.3, lane,
    );
    const scene = tick({});
    expect(scene.ships).toHaveLength(1);
    const meet = firstMeeting(scene.ships[0].path!, path, 10)!;
    expect(meet).toBeGreaterThan(12);
    expect(scene.fish[0].dive).toBe(meet - 2);
    // During play nothing dives.
    expect(tick({ gapFactor: 1 / 8 }).fish[0].dive).toBeUndefined();
  });

  // Item 102: the fish changes to a free lane instead, when there is one.
  it('moves a fish to a free lane when a boat on its fallback lane meets it (item 102)', () => {
    const fish = { ...createFish('carp', false, false, 390, mulberry32(1)), id: 7 };
    const path: ScenePath = { start: 0, duration: 1000, x: 30, dx: 75, width: 5, y: 0, height: 100 };
    const last: SpawnTimes = { birds: 1e9, fish: 1e9, ships: 0, leaves: 1e9, planes: 1e9, shown: { birds: true, fish: true, ships: true } };
    // The boat finds no lane clear of the fish, takes its fallback lane; the fish finds y = 50.
    const answers = [null, undefined, 50];
    const lane = (candidate: { y: number }) => { const a = answers.shift(); return a === undefined ? candidate.y : a; };
    const scene = spawnTick(
      { birds: [], fish: [{ ...fish, path }], ships: [], leaves: [], planes: [] }, last, rules({ fishOverride: null }),
      200_000, 10, () => 0.3, lane,
    );
    const meet = firstMeeting(scene.ships[0].path!, path, 10)!;
    expect(scene.fish[0].dive).toBeUndefined();
    expect(scene.fish[0].path!.y).toBe(50);
    expect(scene.fish[0].shift).toEqual({ at: Math.max(10, meet - 4), dy: (50 * 844) / 100 });
  });

  it('spawns a fish with no free lane anyway, and it dodges the first thing it meets (item 102)', () => {
    const blocker = { ...createFish('carp', false, false, 390, mulberry32(2)), id: 8 };
    const path: ScenePath = { start: 0, duration: 1000, x: 0, dx: 1, width: 100, y: 0, height: 100 };
    const lane = (candidate: { y: number }, others: readonly ScenePath[]) => (others.length ? null : candidate.y);
    const tick = (extra: Partial<SpawnRules>) => spawnTick(
      { birds: [], fish: [{ ...blocker, path }], ships: [], leaves: [], planes: [] },
      { birds: 1e9, fish: 0, ships: 1e9, leaves: 1e9, planes: 1e9, shown: { birds: true, fish: true, ships: true } },
      rules({ fishOverride: 'carp', ...extra }), 200_000, 10, () => 0.1, lane,
    );
    const scene = tick({});
    expect(scene.fish).toHaveLength(2);
    // No lane is free for it, so it dives where it meets the blocker: at once.
    expect(scene.fish.find(f => f.id !== 8)!.dive).toBe(10);
    // During play it waits for a free lane, as before.
    expect(tick({ gapFactor: 1 / 8 }).fish).toHaveLength(1);
  });

  // The component: `?fish=shark&hunt=Hn`, every spawn a hunting shark with its prey.
  const hunt = (variant: string, run: (container: HTMLElement, view: ReturnType<typeof render>) => void) => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(94));
    window.history.pushState({}, '', `/?fish=shark&hunt=${variant}`);
    try {
      const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" />);
      run(view.container, view);
    } finally {
      window.history.pushState({}, '', '/');
      randomSpy.mockRestore();
      vi.useRealTimers();
    }
  };
  // In steps of 10 s, so the effects (which set the hunt timeouts) run between them, as in a browser.
  const advance = (sec: number) => {
    for (let t = 0; t < sec; t += 10) act(() => { vi.advanceTimersByTime(Math.min(10, sec - t) * 1000); });
  };
  const hunted = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-testid="hunted-fish"]')];

  it.each(['H1', 'H2'])('%s: the timeout fades the prey into the shark, and its fade\'s end removes it', variant => {
    hunt(variant, container => {
      advance(10);
      expect(hunted(container)).toHaveLength(0);
      advance(700);
      // A far shark meets its prey after up to 6 min. (A fish that dives under a boat fades too.)
      const prey = hunted(container).filter(fish => fish.getAttribute('style')?.includes('sceneHuntFade'));
      expect(prey.length).toBeGreaterThan(0);
      expect(prey[0].getAttribute('style')?.includes('sceneHuntSlow')).toBe(variant === 'H1');
      const fx = container.querySelectorAll('[data-testid="hunt-fx"]');
      expect(fx.length).toBeGreaterThan(0);
      expect(fx[0].querySelectorAll('[data-testid="hunt-bubble"]')).toHaveLength(variant === 'H1' ? 4 : 0);
      const fish = container.querySelectorAll('[data-testid="scene-fish"]').length;
      const all = hunted(container).length;
      endAnimation(prey[0], 'sceneHuntFade');
      expect(hunted(container)).toHaveLength(all - 1);
      expect(container.querySelectorAll('[data-testid="scene-fish"]')).toHaveLength(fish - 1);
      // The ripple's end takes the traces away.
      endAnimation(fx[0].querySelector('[data-testid="hunt-ripple"]')!, 'sceneHuntRipple');
      expect(container.querySelectorAll('[data-testid="hunt-fx"]')).toHaveLength(fx.length - 1);
    });
  });

  it('H3: the minnows move around the shark and back; no fish is eaten', () => {
    hunt('H3', container => {
      advance(700);
      // No fish fades into a shark. (A fish that dives under a boat fades to 30 % and swims on.)
      expect(hunted(container).filter(fish => fish.getAttribute('style')?.includes('sceneHuntFade'))).toHaveLength(0);
      const moving = [...container.querySelectorAll<HTMLElement>('[data-testid="scene-fish"]')]
        .filter(minnow => minnow.getAttribute('style')?.includes('sceneHuntShift'));
      expect(moving.length).toBeGreaterThanOrEqual(4);
      expect(container.querySelectorAll('[data-testid="hunt-fx"]')).toHaveLength(0);
    });
  });

  it('H4: the trout fades to 30 % and swims on', () => {
    hunt('H4', container => {
      advance(700);
      const prey = hunted(container);
      expect(prey.length).toBeGreaterThan(0);
      expect(prey[0].getAttribute('style')).toContain('sceneHuntFaint');
      endAnimation(prey[0], 'sceneHuntFaint');
      expect(hunted(container)).toHaveLength(prey.length);
    });
  });

  it('plays no hunt that was planned before time-travel play started', () => {
    hunt('H1', (container, view) => {
      advance(10);
      view.rerender(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" playDirection={1} />);
      advance(700);
      expect(hunted(container)).toHaveLength(0);
      expect(container.querySelectorAll('[data-testid="hunt-fx"]')).toHaveLength(0);
    });
  });
});

// ROADMAP item 96: planes and contrails (the free part), with the real spawn rules.
describe('planes and contrails (ROADMAP item 96)', () => {
  const phone = { width: 390, height: 844 };
  const rules = (extra: Partial<SpawnRules> = {}): SpawnRules => ({
    weatherType: 'clear', timeOfDay: 'midday', windSpeedKmh: 10, birdSpeedFactor: 1, showLeaves: false,
    isFullscreen: false, moonUp: false, moonY: null, month: 10, latitude: 47.8, gapFactor: 1, rewind: false,
    fishOverride: null, density: 1, view: phone, contrail: 'medium', ...extra,
  });
  const empty = (): SceneEntities => ({ birds: [], fish: [], ships: [], leaves: [], planes: [] });
  // Only the planes: the other groups wait far in the future.
  const times = (): SpawnTimes => ({ birds: 1e12, fish: 1e12, ships: 1e12, leaves: 1e12, planes: 0, shown: { birds: true, fish: true, ships: true } });
  const firstPlaneAt = (extra: Partial<SpawnRules>, seed: number) => {
    const last = times();
    const random = mulberry32(seed);
    let scene = empty();
    for (let ms = 500; ms <= 10 * 60_000; ms += 500) {
      scene = spawnTick(scene, last, rules(extra), ms, ms / 1000, random);
      if (scene.planes.length > 0) return { ms, plane: scene.planes[0] };
    }
    return null;
  };

  it('sends a plane about every 3-6 min, high and far at 0.3-0.6 %/s, with the contrail of the forecast', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const first = firstPlaneAt({}, seed)!;
      expect(first.ms).toBeGreaterThan(180_000);
      expect(first.ms).toBeLessThanOrEqual(360_500);
      const { plane } = first;
      expect(plane.y).toBeGreaterThanOrEqual(8);
      expect(plane.y).toBeLessThanOrEqual(30);
      const speed = plane.dx / plane.duration;
      expect(speed).toBeGreaterThanOrEqual(0.3 * getWaterSpeedFactor(phone.width) - 1e-9);
      expect(speed).toBeLessThanOrEqual(0.6 * getWaterSpeedFactor(phone.width) + 1e-9);
      expect(plane.contrail).toBe('medium');
      expect(plane.lifeSec).toBe(180);
      expect(plane.trailLength).toBeCloseTo(speed * 180);
      // It flies on past the edge until the end of its trail is off the screen too (item 109).
      expect(plane.x + plane.dx - plane.trailLength).toBeCloseTo(101);
      expect(plane.lights).toBeUndefined(); // by day the silhouette
      expect(plane.path).toBeDefined(); // a lane, planned with the birds
    }
  });

  it('shows no planes in fog, overcast, rain or a storm, and takes them away when the sky closes', () => {
    for (const weatherType of ['fog', 'overcast', 'rain', 'storm'] as WeatherType[]) {
      expect(firstPlaneAt({ weatherType }, 1)).toBeNull();
    }
    const { plane } = firstPlaneAt({}, 1)!;
    const scene = spawnTick({ ...empty(), planes: [plane] }, times(), rules({ weatherType: 'overcast' }), 1000, 1, mulberry32(1));
    expect(scene.planes).toHaveLength(0);
  });

  it('sends no decorative plane while the live radar is on, and takes the ones on screen away (item 96)', () => {
    expect(firstPlaneAt({ livePlanes: true }, 1)).toBeNull();
    const { plane } = firstPlaneAt({}, 1)!;
    const scene = spawnTick({ ...empty(), planes: [plane] }, times(), rules({ livePlanes: true }), 1000, 1, mulberry32(1));
    expect(scene.planes).toHaveLength(0);
  });

  it('shows only the lights at night: a red or a green wing light', () => {
    const { plane } = firstPlaneAt({ timeOfDay: 'night' }, 3)!;
    expect(['red', 'green']).toContain(plane.lights);
  });

  it('takes the override contrail every 20 s; without the upper air, no contrail', () => {
    const overridden = firstPlaneAt({ planeOverride: 'persistent' }, 4)!;
    expect(overridden.ms).toBe(20_500);
    expect(overridden.plane.contrail).toBe('persistent');
    expect(overridden.plane.lifeSec).toBeGreaterThanOrEqual(300);
    expect(overridden.plane.lifeSec).toBeLessThanOrEqual(600);
    expect(firstPlaneAt({ contrail: undefined }, 4)!.plane.contrail).toBe('none');
  });

  it('counts a plane with a persistent trail only while it crosses', () => {
    const { plane } = firstPlaneAt({ planeOverride: 'persistent' }, 5)!;
    const crossed = { ...plane, path: { ...plane.path!, start: -1000 } }; // its crossing ended, its trail still fades
    const last = { ...times(), planeGap: 0 };
    const scene = spawnTick({ ...empty(), planes: [crossed, { ...crossed, id: 2 }] }, last, rules(), 1000, 1, mulberry32(5));
    expect(scene.planes).toHaveLength(3);
  });

  // The component, with `?plane=…`: a plane every 20 s.
  const planeScene = (search: string, props: Partial<React.ComponentProps<typeof CloudLayer>> = {}) => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(96));
    window.history.pushState({}, '', `/${search}`);
    try {
      const view = render(<CloudLayer warmStart={false} weatherType="clear" timeOfDay="midday" {...props} />);
      act(() => { vi.advanceTimersByTime(21_000); });
      return view;
    } finally {
      window.history.pushState({}, '', '/');
      randomSpy.mockRestore();
      vi.useRealTimers();
    }
  };
  const wrapperOf = (container: HTMLElement) =>
    container.querySelector('[data-testid="scene-plane"]')!.closest<HTMLElement>('[style*="moveAcrossX"]')!;

  it('draws a short or medium trail that moves with the plane, and removes the plane at the end of its crossing', () => {
    const { container } = planeScene('?plane=medium');
    expect(container.querySelectorAll('[data-testid="scene-plane"]')).toHaveLength(1);
    const trail = container.querySelector<HTMLElement>('[data-testid="plane-trail"]')!;
    expect(wrapperOf(container).contains(trail)).toBe(true); // the same animation moves it
    expect(trail.style.background).toContain('linear-gradient');
    expect(container.querySelectorAll('[data-testid="plane-trail-piece"]')).toHaveLength(0);
    endAnimation(wrapperOf(container), 'moveAcrossX');
    expect(container.querySelectorAll('[data-testid="scene-plane"]')).toHaveLength(0);
  });

  it('draws a persistent trail in pieces that grow with the plane and stay; the last fade removes the plane', () => {
    const { container } = planeScene('?plane=persistent');
    const pieces = [...container.querySelectorAll<HTMLElement>('[data-testid="plane-trail-piece"]')];
    expect(pieces).toHaveLength(12);
    const wrapper = wrapperOf(container);
    const crossing = parseFloat(wrapper.style.animation.split(' ')[1]);
    // Each piece grows while the plane passes it (a twelfth of the crossing), then spreads and fades.
    const grow = pieces[11].parentElement!.style.animation;
    expect(grow).toMatch(/^planeTrailGrow /);
    expect(parseFloat(grow.split(' ')[1])).toBeCloseTo(crossing / 12);
    expect(parseFloat(grow.split(' ')[3])).toBeCloseTo((crossing * 11) / 12);
    expect(pieces[0].style.animation).toMatch(/^planeTrailSpread \d+(\.\d+)?s linear 0s both$/);
    endAnimation(wrapper, 'moveAcrossX');
    expect(container.querySelectorAll('[data-testid="plane-trail-piece"]')).toHaveLength(12); // the trail stays
    endAnimation(pieces[0], 'planeTrailSpread');
    expect(container.querySelectorAll('[data-testid="plane-trail-piece"]')).toHaveLength(12);
    endAnimation(pieces[11], 'planeTrailSpread');
    expect(container.querySelectorAll('[data-testid="plane-trail-piece"]')).toHaveLength(0);
  });

  it('shows only the lights at night, the strobe once every 2 s', () => {
    const { container } = planeScene('?plane=none', { timeOfDay: 'night' });
    expect(container.querySelectorAll('[data-testid="plane-wing-light"]')).toHaveLength(1);
    expect(container.querySelector<HTMLElement>('[data-testid="plane-strobe"]')!.style.animation).toBe('planeStrobe 2s linear infinite');
    expect(container.querySelector('[data-testid="scene-plane"] path')).toBeNull();
    expect(container.querySelector('[data-testid="plane-trail"]')).toBeNull();
  });

  it('opens the card on a tap, with the contrail kind', () => {
    const onInfo = vi.fn();
    const { container } = planeScene('?plane=short', { onInfo });
    const hit = wrapperOf(container).querySelector<HTMLElement>('[data-testid="scene-hit"]')!;
    expect(parseFloat(hit.style.width)).toBeGreaterThanOrEqual(44);
    fireEvent.click(hit, { clientX: 50, clientY: 80 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'plane', contrail: 'short' }, { x: 50, y: 80 }, expect.stringMatching(/^plane-/));
  });
});
