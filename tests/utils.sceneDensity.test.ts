import { getSceneDensity, getDensityCurve, getLull } from '../src/utils/sceneDensity';
import { getSunTimes } from '../src/utils/sunUtils';
import { getDaySeed } from '../src/utils/skyCloudUtils';

// Friedrichshafen on 2026-10-05 (TZ is UTC in the tests): sunrise about 05:30, sunset about 17:00.
const day = new Date('2026-10-05T12:00:00Z');
const sunTimes = getSunTimes(day, 47.65, 9.48);
const seed = getDaySeed(day, 47.65, 9.48);
const at = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);

describe('getSceneDensity (ROADMAP item 93, S3)', () => {
  it('follows the curve: 1 in the hour around sunrise and sunset, 0.7 by day, 0.5 at night', () => {
    for (const edge of [sunTimes.sunrise, sunTimes.sunset]) {
      expect(getDensityCurve(at(edge, -29), sunTimes)).toBe(1);
      expect(getDensityCurve(edge, sunTimes)).toBe(1);
      expect(getDensityCurve(at(edge, 29), sunTimes)).toBe(1);
    }
    expect(getDensityCurve(at(sunTimes.sunrise, 31), sunTimes)).toBe(0.7);
    expect(getDensityCurve(sunTimes.solarNoon, sunTimes)).toBe(0.7);
    expect(getDensityCurve(at(sunTimes.sunset, 31), sunTimes)).toBe(0.5);
    expect(getDensityCurve(at(sunTimes.sunrise, -31), sunTimes)).toBe(0.5);
  });

  it('keeps the polar day at the day value and the polar night at the night value', () => {
    expect(getDensityCurve(day, { ...sunTimes, polar: 'day' })).toBe(0.7);
    expect(getDensityCurve(day, { ...sunTimes, polar: 'night' })).toBe(0.5);
  });

  it('takes 0-40 % away in a slow lull, so the factor stays in 0.3-1', () => {
    const minutes = Array.from({ length: 24 * 60 }, (_, i) => i);
    const lulls = minutes.map(m => getLull(at(new Date('2026-10-05T00:00:00Z'), m), seed));
    expect(Math.min(...lulls)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...lulls)).toBeLessThan(1);
    // The whole range shows up over a day.
    expect(Math.min(...lulls)).toBeLessThan(0.1);
    expect(Math.max(...lulls)).toBeGreaterThan(0.9);
    // Slow: it changes by less than 0.1 per minute (it has 10 minutes between its steps).
    for (let i = 1; i < lulls.length; i++) expect(Math.abs(lulls[i] - lulls[i - 1])).toBeLessThan(0.1);
    const densities = minutes.map(m => getSceneDensity(at(new Date('2026-10-05T00:00:00Z'), m), sunTimes, seed));
    expect(Math.min(...densities)).toBeGreaterThanOrEqual(0.3);
    expect(Math.max(...densities)).toBeLessThanOrEqual(1);
  });

  it('gives the same value for the same seed, and another day or place its own lulls', () => {
    const noon = sunTimes.solarNoon;
    expect(getSceneDensity(noon, sunTimes, seed)).toBe(getSceneDensity(new Date(noon), sunTimes, getDaySeed(noon, 47.65, 9.48)));
    // The place is rounded to 0.1°, as for the clouds.
    expect(getDaySeed(day, 47.66, 9.49)).toBe(seed);
    const times = Array.from({ length: 144 }, (_, i) => at(new Date('2026-10-05T00:00:00Z'), i * 10));
    const lullsOf = (s: string) => times.map(t => getLull(t, s));
    expect(lullsOf(getDaySeed(day, 52.5, 13.4))).not.toEqual(lullsOf(seed));
  });
});
