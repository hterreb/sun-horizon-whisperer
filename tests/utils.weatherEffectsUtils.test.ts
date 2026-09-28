import { getWeatherEffects, canFlashLightning, LIGHTNING_MIN_GAP_MS, pickBoat } from '../src/utils/weatherEffectsUtils';

describe('getWeatherEffects (ROADMAP item 10)', () => {
  it('shows fog only for the fog type', () => {
    expect(getWeatherEffects({ type: 'fog', windKmh: 0, tempC: 15, sunAltitude: 20 }).showFog).toBe(true);
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 15, sunAltitude: 20 }).showFog).toBe(false);
  });

  it('shows lightning only for storm', () => {
    expect(getWeatherEffects({ type: 'storm', windKmh: 0, tempC: 15, sunAltitude: 20 }).showLightning).toBe(true);
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 15, sunAltitude: 20 }).showLightning).toBe(false);
  });

  it('maps precipitation types (drizzle, rain, storm -> rain, snow, hail)', () => {
    expect(getWeatherEffects({ type: 'drizzle', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('drizzle');
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('rain');
    expect(getWeatherEffects({ type: 'storm', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('rain');
    expect(getWeatherEffects({ type: 'snow', windKmh: 0, tempC: -2, sunAltitude: 10 }).precipitation).toBe('snow');
    expect(getWeatherEffects({ type: 'hail', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('hail');
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('none');
  });

  it('shows leaves and slows birds above 40 km/h wind, not at or below it', () => {
    const windy = getWeatherEffects({ type: 'clear', windKmh: 41, tempC: 15, sunAltitude: 20 });
    expect(windy.showLeaves).toBe(true);
    expect(windy.birdSpeedFactor).toBeLessThan(1);

    const calm = getWeatherEffects({ type: 'clear', windKmh: 40, tempC: 15, sunAltitude: 20 });
    expect(calm.showLeaves).toBe(false);
    expect(calm.birdSpeedFactor).toBe(1);
  });

  it('treats missing wind as calm', () => {
    const effects = getWeatherEffects({ type: 'clear', windKmh: null, tempC: 15, sunAltitude: 20 });
    expect(effects.showLeaves).toBe(false);
    expect(effects.birdSpeedFactor).toBe(1);
  });

  it('shows heat shimmer above 30°C while there is daylight', () => {
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 31, sunAltitude: 10 }).showHeatShimmer).toBe(true);
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 30, sunAltitude: 10 }).showHeatShimmer).toBe(false);
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 35, sunAltitude: -10 }).showHeatShimmer).toBe(false);
  });

  it('shows frost below -5°C', () => {
    expect(getWeatherEffects({ type: 'snow', windKmh: 0, tempC: -6, sunAltitude: 10 }).showFrost).toBe(true);
    expect(getWeatherEffects({ type: 'snow', windKmh: 0, tempC: -5, sunAltitude: 10 }).showFrost).toBe(false);
  });

  it('treats missing temperature as neither hot nor frosty', () => {
    const effects = getWeatherEffects({ type: 'clear', windKmh: 0, tempC: null, sunAltitude: 10 });
    expect(effects.showHeatShimmer).toBe(false);
    expect(effects.showFrost).toBe(false);
  });

  it('flags rain/drizzle as rainbow candidates only', () => {
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(true);
    expect(getWeatherEffects({ type: 'drizzle', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(true);
    expect(getWeatherEffects({ type: 'storm', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(false);
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(false);
  });
});

describe('canFlashLightning (ROADMAP item 10)', () => {
  it('allows the first flash (no previous flash yet)', () => {
    expect(canFlashLightning(null, 1000)).toBe(true);
  });

  it('blocks a flash before the minimum gap has passed', () => {
    expect(canFlashLightning(1000, 1000 + LIGHTNING_MIN_GAP_MS - 1)).toBe(false);
  });

  it('allows a flash once the minimum gap has passed', () => {
    expect(canFlashLightning(1000, 1000 + LIGHTNING_MIN_GAP_MS)).toBe(true);
  });
});

describe('pickBoat (ROADMAP item 36)', () => {
  const picks = (type: Parameters<typeof pickBoat>[0], windKmh: number | null) =>
    new Set(Array.from({ length: 100 }, (_, i) => pickBoat(type, windKmh, i / 100)));

  it('sends out every boat in fair, calm weather, the sailboat most often', () => {
    expect(picks('clear', 0)).toEqual(new Set(['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter']));
    const sailboats = Array.from({ length: 100 }, (_, i) => pickBoat('partly', 0, i / 100)).filter(k => k === 'sailboat');
    expect(sailboats.length).toBe(44); // 35 of 80
  });

  it('keeps only the ferry and the freighter out in rain, drizzle, fog and snow', () => {
    for (const type of ['rain', 'drizzle', 'fog', 'snow'] as const) {
      expect(picks(type, 0)).toEqual(new Set(['ferry', 'freighter']));
    }
  });

  it('keeps the rowboat ashore above 40 km/h wind', () => {
    expect(picks('clear', 41).has('rowboat')).toBe(false);
    expect(picks('clear', 40).has('rowboat')).toBe(true);
  });
});
