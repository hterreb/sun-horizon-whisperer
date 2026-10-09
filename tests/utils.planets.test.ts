import { describe, it, expect } from 'vitest';
import { getGeocentricVector, getPlanetSky, separationDeg, toHorizontal, type PlanetName } from '@/utils/planets';
import { getSunPosition } from '@/utils/sunUtils';

// The planet conjunction egg: JPL approximate elements. Reference separations from
// astronomy-engine 2.1.19 (full VSOP87), checked when this was built.
const sep = (a: PlanetName, b: PlanetName, iso: string) =>
  separationDeg(getGeocentricVector(a, new Date(iso)), getGeocentricVector(b, new Date(iso)));

describe('planets', () => {
  it('gives the separation of known conjunctions to within 0.1°', () => {
    expect(sep('jupiter', 'saturn', '2020-12-21T17:00:00Z')).toBeCloseTo(0.1, 1);
    expect(sep('venus', 'jupiter', '2023-03-02T18:00:00Z')).toBeCloseTo(0.73, 1);
    expect(sep('mars', 'jupiter', '2024-08-14T03:00:00Z')).toBeCloseTo(0.39, 1);
    expect(sep('venus', 'jupiter', '2025-08-12T03:00:00Z')).toBeCloseTo(0.87, 1);
    expect(sep('venus', 'jupiter', '2026-06-09T19:00:00Z')).toBeCloseTo(1.61, 1);
    expect(sep('venus', 'jupiter', '2035-06-01T00:00:00Z')).toBeCloseTo(14.04, 1);
  });

  it('puts the sun where SunCalc has it, to within 1°', () => {
    for (const iso of ['2026-03-20T09:00:00Z', '2026-06-21T15:00:00Z', '2030-12-21T12:00:00Z']) {
      const date = new Date(iso);
      const mine = toHorizontal(getGeocentricVector('sun', date), date, 47.78, 9.61);
      const ref = getSunPosition(date, 47.78, 9.61);
      expect(Math.abs(mine.altitude - ref.altitude), iso).toBeLessThan(1);
      expect(Math.abs(((mine.azimuth - ref.azimuth + 540) % 360) - 180), iso).toBeLessThan(1);
    }
  });

  it('gives altitude and azimuth in range with the name', () => {
    const sky = getPlanetSky('saturn', new Date('2026-10-09T20:00:00Z'), 47.78, 9.61);
    expect(sky.name).toBe('saturn');
    expect(sky.altitude).toBeGreaterThanOrEqual(-90);
    expect(sky.altitude).toBeLessThanOrEqual(90);
    expect(sky.azimuth).toBeGreaterThanOrEqual(0);
    expect(sky.azimuth).toBeLessThan(360);
  });
});
