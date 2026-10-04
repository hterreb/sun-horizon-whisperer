import React from 'react';
import { act, render } from '@testing-library/react';
import SkyClouds, { LAYOUT_FADE_MS } from '../src/components/SkyClouds';
import type { WeatherType } from '../src/components/CloudLayer';
import type { TimeOfDay } from '../src/utils/sunUtils';
import { DEFAULT_CLOUD_LAYERS, getCloudCentre, getGliderStartProgress, getSkyClouds } from '../src/utils/skyCloudUtils';

const DATE = new Date('2026-10-03T13:00:00');
const sky = (props: Partial<React.ComponentProps<typeof SkyClouds>> & { weatherType: WeatherType }) =>
  render(
    <SkyClouds
      timeOfDay={'midday' as TimeOfDay}
      date={DATE}
      latitude={47.78}
      longitude={9.61}
      cloudLayers={null}
      windDirectionDeg={270}
      sun={null}
      moon={null}
      skyGradient={null}
      egg={false}
      {...props}
    />
  ).container;
const types = (container: HTMLElement) =>
  new Set([...container.querySelectorAll<HTMLElement>('[data-testid="sky-cloud"]')].map(el => el.dataset.type));

describe('SkyClouds (ROADMAP item 84)', () => {
  it('draws the cloud types of the weather, from its own layers in manual weather', () => {
    expect(types(sky({ weatherType: 'partly' }))).toEqual(new Set(['Ci', 'Ac', 'Cu']));
    expect(types(sky({ weatherType: 'storm' }))).toEqual(new Set(['Cs', 'Ci', 'As', 'Ac', 'Cb', 'Ns']));
    expect(sky({ weatherType: 'rain' }).querySelector('[data-testid="sky-clouds"]')?.getAttribute('data-low')).toBe('deck');
    expect(types(sky({ weatherType: 'clear' })).size).toBe(0);
  });

  it('draws the measured layers in live weather', () => {
    expect(types(sky({ weatherType: 'cloudy', cloudLayers: { low: 0, mid: 0, high: 80 } }))).toEqual(new Set(['Cs', 'Ci']));
    expect(types(sky({ weatherType: 'cloudy', cloudLayers: { low: 30, mid: 0, high: 0 } }))).toEqual(new Set(['Cu']));
  });

  it('glides each cloud with a plain CSS animation in px, downwind; still with reduced motion', () => {
    const gliders = [...sky({ weatherType: 'partly' }).querySelectorAll<HTMLElement>('[data-testid="cloud-glider"]')];
    expect(gliders.length).toBeGreaterThan(3);
    for (const g of gliders) {
      // The glider is as wide as its track (px) and moves by its own width.
      expect(g.style.animation).toMatch(/^skyGlideRight [\d.]+s linear -?[\d.]+s infinite$/);
      expect(parseFloat(g.style.width)).toBeGreaterThan(window.innerWidth);
      expect(parseFloat(g.style.left)).toBeLessThan(0);
    }
    const east = sky({ weatherType: 'partly', windDirectionDeg: 90 }).querySelector<HTMLElement>('[data-testid="cloud-glider"]')!;
    expect(east.style.animation).toMatch(/^skyGlideLeft /);
    expect(parseFloat(east.style.left)).toBeGreaterThan(window.innerWidth);
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, media: '', onchange: null, addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    } as unknown as MediaQueryList);
    const still = sky({ weatherType: 'partly' }).querySelector<HTMLElement>('[data-testid="cloud-glider"]')!;
    expect(still.style.animation).toBe('');
    expect(still.style.width).toBe('');
    expect(still.style.left).toMatch(/px$/);
    spy.mockRestore();
  });

  it('lays the overcast veil over the top of the sky in the clouds’ light, none when clear', () => {
    expect(sky({ weatherType: 'clear' }).querySelector('[data-testid="cloud-veil"]')).toBeNull();
    const veil = (timeOfDay: TimeOfDay) =>
      sky({ weatherType: 'overcast', timeOfDay }).querySelector<HTMLElement>('[data-testid="cloud-veil"]')!.style.background;
    expect(veil('civil-twilight')).not.toBe(veil('midday'));
  });

  it('throws cloud shadows on the sea by day in fair weather (X2), none at night', () => {
    const day = sky({ weatherType: 'partly' });
    expect(day.querySelectorAll('[data-testid="cloud-shadow"]').length).toBeGreaterThan(0);
    expect((day.querySelector('[data-testid="cloud-shadows"]') as HTMLElement).style.zIndex).toBe('4');
    expect(sky({ weatherType: 'partly', timeOfDay: 'night' }).querySelector('[data-testid="cloud-shadow"]')).toBeNull();
    expect(sky({ weatherType: 'overcast' }).querySelector('[data-testid="cloud-shadow"]')).toBeNull();
  });

  it('stands lenticular clouds over the ridge on an egg day (X1)', () => {
    expect(types(sky({ weatherType: 'partly', egg: true })).has('Len')).toBe(true);
    expect(types(sky({ weatherType: 'storm', egg: true })).has('Mam')).toBe(true);
    expect(types(sky({ weatherType: 'partly' })).has('Len')).toBe(false);
  });

  it('lights the cloud the moon sits on (item 76), and no cloud without the moon', () => {
    // The moon at the centre of the first low cloud of the layout (jsdom's window is 1024 × 768).
    const [w, h] = [window.innerWidth, window.innerHeight];
    const gliders = getSkyClouds({
      weather: 'cloudy', layers: DEFAULT_CLOUD_LAYERS.cloudy, width: w, height: h,
      seed: `${DATE.toDateString()}|47.8|9.6`, egg: false, direction: 1,
    });
    const glider = gliders.find(g => g.clouds[0].band === 'low')!;
    const centre = getCloudCentre(glider, glider.clouds[0], getGliderStartProgress(glider));
    const moon = { x: (centre.x / w) * 100, y: (centre.y / h) * 100, r: 22, light: 0.75 };
    const lit = sky({ weatherType: 'cloudy', timeOfDay: 'night', moon });
    expect(lit.querySelectorAll('[data-testid="cloud-moonlight"]').length).toBeGreaterThan(0);
    expect(sky({ weatherType: 'cloudy', timeOfDay: 'night' }).querySelector('[data-testid="cloud-moonlight"]')).toBeNull();
    // No radius (the night geese's moon): no lining.
    expect(sky({ weatherType: 'cloudy', timeOfDay: 'night', moon: { x: moon.x, y: moon.y } }).querySelector('[data-testid="cloud-moonlight"]')).toBeNull();
  });
});

describe('SkyClouds without box edges (ROADMAP item 88)', () => {
  it('draws a deck as solid tiles in one see-through row, lit as one (D1)', () => {
    const container = sky({ weatherType: 'rain', sun: { x: 80, y: 40, altitude: 3 } });
    const rows = [...container.querySelectorAll<HTMLElement>('[data-testid="cloud-row"]')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Number(row.style.opacity)).toBeGreaterThan(0);
      expect(Number(row.style.opacity)).toBeLessThan(1);
      const tiles = [...row.querySelectorAll<HTMLElement>('[data-testid="sky-cloud"]')];
      // The same gradient on screen: the tile's left edge (px) plus its start (units × scale).
      const starts = tiles.map(tile => {
        const scale = parseFloat(tile.style.width) / 120;
        const x1 = Number(tile.querySelector('linearGradient')!.getAttribute('x1'));
        return Math.round((parseFloat(tile.style.left) + x1 * scale) / 4);
      });
      for (const tile of tiles) expect(tile.style.opacity).toBe('1');
      expect(new Set(starts).size).toBeLessThanOrEqual(2);
    }
  });

  it('draws the rain shafts as strands (S2)', () => {
    const shafts = [...sky({ weatherType: 'rain' }).querySelectorAll('[data-testid="rain-shaft"]')];
    expect(shafts.length).toBeGreaterThan(0);
    for (const shaft of shafts) {
      expect(shaft.getAttribute('stroke')).toMatch(/^url\(#.+s\)$/);
      expect(shaft.querySelectorAll('path')).toHaveLength(8);
    }
  });
});

describe('SkyClouds layout cross-fade (ROADMAP item 87)', () => {
  afterEach(() => vi.useRealTimers());

  it('fades the old layout out and the new one in, and drops the old one after the fade', () => {
    vi.useFakeTimers();
    const props = {
      timeOfDay: 'midday' as TimeOfDay, date: DATE, latitude: 47.78, longitude: 9.61, cloudLayers: null,
      windDirectionDeg: 270, sun: null, moon: null, skyGradient: null, egg: false,
    };
    const { container, rerender } = render(<SkyClouds {...props} weatherType="partly" />);
    const layouts = () => [...container.querySelectorAll<HTMLElement>('[data-testid="sky-clouds"]')];
    const first = layouts()[0];
    expect(layouts()).toHaveLength(1);

    rerender(<SkyClouds {...props} weatherType="overcast" />);
    expect(layouts()).toHaveLength(2);
    // The old layout keeps its DOM (its glides go on) and fades to 0; the new one fades in.
    expect(layouts()[0]).toBe(first);
    expect(first.dataset.fading).toBe('true');
    expect(first.style.opacity).toBe('0');
    expect(layouts()[1].dataset.fading).toBeUndefined();
    expect(layouts()[1].className).toContain('starting:opacity-0');
    // The new veil fades in on a wrapper, not on its own inline opacity.
    expect(container.querySelector('[data-testid="cloud-veil"]')!.parentElement!.className).toContain('starting:opacity-0');

    act(() => {
      vi.advanceTimersByTime(LAYOUT_FADE_MS);
    });
    expect(layouts()).toHaveLength(1);
    expect(layouts()[0].dataset.low).toBe('stratus');
  });

  it('does not fade when only the light changes', () => {
    const props = {
      weatherType: 'partly' as WeatherType, date: DATE, latitude: 47.78, longitude: 9.61, cloudLayers: null,
      windDirectionDeg: 270, sun: null, moon: null, skyGradient: null, egg: false,
    };
    const { container, rerender } = render(<SkyClouds {...props} timeOfDay="midday" />);
    rerender(<SkyClouds {...props} timeOfDay="nautical-twilight" />);
    expect(container.querySelectorAll('[data-testid="sky-clouds"]')).toHaveLength(1);
  });
});
