import { atWindStops, getWindBand, getSeaWindKmh, getWaveLook, getReflectionBars, getBoatReflection, waveHash, STORM_MIN_WIND_KMH, UNKNOWN_SEA_WIND_KMH } from '../src/utils/waveUtils';

describe('waves by wind strength (ROADMAP item 79)', () => {
  it('interpolates linearly between the five wind stops, flat outside them', () => {
    const values = [0, 10, 20, 30, 40] as const;
    expect(atWindStops(values, 0)).toBe(0);
    expect(atWindStops(values, 3)).toBe(0);
    expect(atWindStops(values, 7.5)).toBe(5); // halfway from 3 to 12
    expect(atWindStops(values, 28)).toBe(20);
    expect(atWindStops(values, 60)).toBe(35); // halfway from 50 to 70
    expect(atWindStops(values, 90)).toBe(40);
  });

  it('maps the wind to the five bands: calm < 6, light 6-19, moderate 20-38, strong 39-61, storm 62+', () => {
    expect([0, 5.9, 6, 19, 20, 38, 39, 61, 62, 80].map(getWindBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('gives a storm at least the strong band, and an unknown wind today\'s light breeze', () => {
    expect(getSeaWindKmh(10, 'storm')).toBe(STORM_MIN_WIND_KMH);
    expect(getSeaWindKmh(70, 'storm')).toBe(70);
    expect(getSeaWindKmh(10, 'clear')).toBe(10);
    expect(getSeaWindKmh(null, 'clear')).toBe(UNKNOWN_SEA_WIND_KMH);
    expect(getSeaWindKmh(null, 'storm')).toBe(STORM_MIN_WIND_KMH);
  });

  it('has the spec counts at the stops: ripple lines, whitecaps (from 12 km/h) and cat\'s paws (none in calm)', () => {
    const at = (kmh: number) => getWaveLook(kmh);
    expect([3, 12, 28, 50, 70].map((k) => at(k).ripples.count)).toEqual([8, 30, 60, 95, 130]);
    expect([3, 12, 28, 50, 70].map((k) => at(k).caps.count)).toEqual([0, 2, 18, 45, 80]);
    expect([3, 12, 28, 50, 70].map((k) => at(k).paws.count)).toEqual([0, 6, 12, 18, 24]);
    expect(at(11.9).caps.count).toBe(0);
    expect(at(20).caps.count).toBe(10);
    expect(at(0).paws.count).toBe(0);
  });

  it('keeps every drift at or below the sailboat\'s 5.2 px/s', () => {
    for (const kmh of [0, 15, 30, 50, 70, 100]) {
      const { ripples, caps, paws } = getWaveLook(kmh);
      expect(Math.max(ripples.drift, caps.drift, paws.drift)).toBeLessThanOrEqual(5.2);
    }
  });

  it('mirrors in calm water, breaks it up with wind and turns the sea matte', () => {
    expect(getWaveLook(0).mirror).toMatchObject({ strength: 0.5, breakUp: 0, matte: 0 });
    expect(getWaveLook(28).mirror).toMatchObject({ strength: 0.11, breakUp: 0.55, matte: 0.09 });
    expect(getWaveLook(70).mirror).toMatchObject({ strength: 0, breakUp: 1, matte: 0.2 });
  });

  it('adds a dark trough under the lines only from 14 km/h, and foam only from 55 km/h', () => {
    expect(getWaveLook(14).ripples.trough).toBe(0);
    expect(getWaveLook(20).ripples.trough).toBeGreaterThan(0);
    expect(getWaveLook(55).foam).toBe(0);
    expect(getWaveLook(60).foam).toBeGreaterThan(0);
    expect(getWaveLook(70).foam).toBe(1);
  });

  it('lays out the reflection bars by wind: a tight column of 10 in calm, today\'s 7 in light air, spread pieces in wind', () => {
    const calm = getReflectionBars(0, 0.6);
    expect(calm.bars).toHaveLength(10);
    expect(Math.max(...calm.bars.map((b) => Math.abs(b.dx)))).toBeLessThan(3);

    const light = getReflectionBars(12, 0.6);
    expect(light.bars).toHaveLength(7);
    expect(light.bars.map((b) => b.dx)).toEqual([-3, 3, -3, 3, -3, 3, -3]);
    expect(light.bars[0].opacity).toBeCloseTo(0.6);

    const storm = getReflectionBars(70, 0.6);
    expect(storm.bars).toHaveLength(12 * 3);
    expect(Math.max(...storm.bars.map((b) => Math.abs(b.dx)))).toBeLessThanOrEqual(16);
    expect(Math.max(...storm.bars.map((b) => b.opacity))).toBeLessThan(light.bars[0].opacity);
  });

  it('keeps the bar layout the same for the same wind, so the bars never move over time', () => {
    expect(getReflectionBars(40, 0.35)).toEqual(getReflectionBars(40, 0.35));
    expect(waveHash(3, 4, 5)).toBe(waveHash(3, 4, 5));
    expect(waveHash(3, 4, 5)).toBeGreaterThanOrEqual(0);
    expect(waveHash(3, 4, 5)).toBeLessThan(1);
  });

  it('gives the boats a sharp mirror image in calm water, today\'s in light air and stripes from 28 km/h', () => {
    expect(getBoatReflection(0)).toEqual({ opacity: 0.42, blurPx: 0, heightPercent: 70, stripe: null });
    expect(getBoatReflection(12)).toEqual({ opacity: 0.28, blurPx: 0.6, heightPercent: 55, stripe: null });
    expect(getBoatReflection(27).stripe).toBeNull();
    expect(getBoatReflection(28).stripe).toContain('2px');
    expect(getBoatReflection(70)).toMatchObject({ opacity: 0.08, stripe: '#000 0 1px, transparent 1px 3px' });
  });
});
