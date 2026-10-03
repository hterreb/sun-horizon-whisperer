import React from 'react';
import { render } from '@testing-library/react';
import SkyClouds from '../src/components/SkyClouds';
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
