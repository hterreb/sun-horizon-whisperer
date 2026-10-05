import {
  elevationAngleDeg,
  computeHorizonProfile,
  horizonAngleAt,
  ridgeAt,
  getTerrainSunTimes,
  getTerrainMoonTimes,
  type HorizonProfile,
  type ElevationSampler,
} from '../src/utils/horizonUtils';
import { getSunTimes, getSunPosition } from '../src/utils/sunUtils';
import { getMoonTimes } from '../src/utils/moonUtils';

const EYE_HEIGHT = 1.7;

// A flat profile at a constant dip/elevation angle for every azimuth - a synthetic sea
// horizon (or "no terrain data at all") stand-in.
const flatProfile = (angleDeg: number, eyeHeight = EYE_HEIGHT): HorizonProfile => ({
  angles: new Array(360).fill(angleDeg),
  observerElevation: 0,
  eyeHeight,
});

describe('horizonUtils', () => {
  describe('elevationAngleDeg', () => {
    it('is negative (a dip) for a flat horizon once Earth curvature is accounted for', () => {
      // 0 height difference at 10km still dips below "flat" because of curvature.
      expect(elevationAngleDeg(0, 10000)).toBeCloseTo(-0.0391, 3);
    });

    it('is close to 0 for a very short flat distance', () => {
      expect(elevationAngleDeg(0, 50)).toBeCloseTo(0, 3);
    });

    it('gives a known angle for a ridge of known height and distance', () => {
      // 100m-tall ridge, 1000m away, eye height 1.7m.
      expect(elevationAngleDeg(100 - EYE_HEIGHT, 1000)).toBeCloseTo(5.61, 1);
    });
  });

  describe('computeHorizonProfile', () => {
    // A circular wall ~1km away, 100m higher than the observer, in every direction -
    // ROADMAP item 13's "single ridge at a known angle" synthetic terrain.
    const wallSampler: ElevationSampler = (lat, lon) => {
      // Any query further than ~50m from the fixed observer (0, 0) is "on the wall" if
      // within [800, 1300] of it; this module always calls sample(observerLat,
      // observerLon) once too, which must return the observer's own (flat) elevation.
      if (lat === 0 && lon === 0) return 0;
      const distanceM = Math.sqrt((lat * 111320) ** 2 + (lon * 111320) ** 2);
      if (distanceM >= 800 && distanceM <= 1300) return 100;
      return 0;
    };

    it('finds the ridge angle at every azimuth, bounded by the nearest/farthest sample in range', () => {
      const profile = computeHorizonProfile(0, 0, EYE_HEIGHT, wallSampler);
      expect(profile.angles).toHaveLength(360);
      expect(profile.observerElevation).toBe(0);

      const upperBound = elevationAngleDeg(100 - EYE_HEIGHT, 800);
      const lowerBound = elevationAngleDeg(100 - EYE_HEIGHT, 1300);
      for (const angle of profile.angles) {
        expect(angle).toBeGreaterThan(lowerBound - 0.1);
        expect(angle).toBeLessThan(upperBound + 0.1);
      }
    });

    it('falls back to a flat-curvature dip when the sampler has no data at all', () => {
      const noData: ElevationSampler = () => null;
      const profile = computeHorizonProfile(0, 0, EYE_HEIGHT, noData);
      expect(profile.observerElevation).toBe(0);
      // Every azimuth should get the same (flat, near-distance) fallback dip.
      const first = profile.angles[0];
      expect(profile.angles.every((a) => a === first)).toBe(true);
      expect(first).toBeLessThan(0);
    });

    it('stores the distance and the height of the ridge point that gives each angle (ROADMAP item 95)', () => {
      // A single 100 m wall ring at 800-1300 m: the nearest sample on the wall gives the angle.
      const profile = computeHorizonProfile(0, 0, EYE_HEIGHT, wallSampler);
      expect(profile.ridgeDistances).toHaveLength(360);
      expect(profile.ridgeHeights).toHaveLength(360);
      for (let az = 0; az < 360; az += 45) {
        const ridge = ridgeAt(profile, az)!;
        expect(ridge.height).toBe(100);
        expect(ridge.distance).toBeGreaterThanOrEqual(800);
        expect(ridge.distance).toBeLessThan(900);
        // The stored point gives the stored angle.
        expect(elevationAngleDeg(ridge.height - EYE_HEIGHT, ridge.distance)).toBeCloseTo(profile.angles[az], 1);
      }
    });

    it('stores no ridge point where the sampler has no data', () => {
      const profile = computeHorizonProfile(0, 0, EYE_HEIGHT, () => null);
      expect(ridgeAt(profile, 90)).toBeNull();
    });

    it('ignores DEM noise within 200 m of the observer (a pixel beside a summit)', () => {
      // A 10 m bump 50-150 m away would read as ~9° at 50 m; beyond it the terrain drops away.
      const summitSampler: ElevationSampler = (lat, lon) => {
        if (lat === 0 && lon === 0) return 0;
        const distanceM = Math.sqrt((lat * 111320) ** 2 + (lon * 111320) ** 2);
        return distanceM < 150 ? 10 : -distanceM / 10;
      };
      const profile = computeHorizonProfile(0, 0, EYE_HEIGHT, summitSampler);
      for (const angle of profile.angles) expect(angle).toBeLessThan(0);
    });

    it('runs the full 360x100-sample sweep in well under 200ms', () => {
      const sampler: ElevationSampler = (lat) => Math.sin(lat) * 50;
      const start = performance.now();
      computeHorizonProfile(47.4, 10.9, EYE_HEIGHT, sampler);
      expect(performance.now() - start).toBeLessThan(200);
    });
  });

  describe('ridgeAt', () => {
    it('reads the nearest whole degree, wraps at 360° and is null without ridge data', () => {
      const profile: HorizonProfile = {
        ...flatProfile(0),
        ridgeDistances: Array.from({ length: 360 }, (_, i) => i * 10),
        ridgeHeights: Array.from({ length: 360 }, (_, i) => 1000 + i),
      };
      expect(ridgeAt(profile, 10.4)).toEqual({ distance: 100, height: 1010 });
      expect(ridgeAt(profile, 359.6)).toEqual({ distance: 0, height: 1000 });
      expect(ridgeAt(flatProfile(0), 10)).toBeNull();
    });
  });

  describe('horizonAngleAt', () => {
    it('returns the exact sample at a whole-degree azimuth', () => {
      const profile = flatProfile(0);
      profile.angles[10] = 3;
      expect(horizonAngleAt(profile, 10)).toBe(3);
    });

    it('linearly interpolates between two whole-degree samples', () => {
      const profile = flatProfile(0);
      profile.angles[10] = 2;
      profile.angles[11] = 4;
      expect(horizonAngleAt(profile, 10.25)).toBeCloseTo(2.5, 5);
      expect(horizonAngleAt(profile, 10.5)).toBeCloseTo(3, 5);
    });

    it('wraps 359 -> 0', () => {
      const profile = flatProfile(0);
      profile.angles[359] = 0;
      profile.angles[0] = 2;
      expect(horizonAngleAt(profile, 359.5)).toBeCloseTo(1, 5);
    });
  });

  describe('getTerrainSunTimes', () => {
    const LAT = 45;
    const LON = 8;
    const DATE = new Date('2026-03-20T12:00:00Z'); // near equinox, avoids extreme rates

    it('reproduces the normal (flat sea horizon) sunset within ~1 minute at a 0 dip', () => {
      const astronomical = getSunTimes(DATE, LAT, LON);
      const terrain = getTerrainSunTimes(DATE, LAT, LON, flatProfile(0));

      expect(terrain.sunset).not.toBeNull();
      const diffMs = Math.abs(terrain.sunset!.getTime() - astronomical.sunset.getTime());
      expect(diffMs).toBeLessThan(60 * 1000);
    });

    it('coast case: a near-0 sea-horizon dip differs from the astronomical sunset by under 2 minutes', () => {
      const astronomical = getSunTimes(DATE, LAT, LON);
      // ~-0.04 deg is the typical dip for a 1.7m eye height at sea level.
      const terrain = getTerrainSunTimes(DATE, LAT, LON, flatProfile(-0.04));

      expect(terrain.sunrise).not.toBeNull();
      expect(terrain.sunset).not.toBeNull();
      expect(Math.abs(terrain.sunset!.getTime() - astronomical.sunset.getTime())).toBeLessThan(2 * 60 * 1000);
      expect(Math.abs(terrain.sunrise!.getTime() - astronomical.sunrise.getTime())).toBeLessThan(2 * 60 * 1000);
    });

    it('sets earlier behind a 5 deg ridge to the west than the astronomical sunset', () => {
      const astronomical = getSunTimes(DATE, LAT, LON);
      const sunsetAzimuth = getSunPosition(astronomical.sunset, LAT, LON).azimuth;

      // A ridge spanning the sunset azimuth (+/-20 deg), flat (coast-like) elsewhere.
      const angles = new Array(360).fill(-0.04);
      for (let offset = -20; offset <= 20; offset++) {
        const az = ((Math.round(sunsetAzimuth) + offset) % 360 + 360) % 360;
        angles[az] = 5;
      }
      const ridgeProfile: HorizonProfile = { angles, observerElevation: 0, eyeHeight: EYE_HEIGHT };

      const terrain = getTerrainSunTimes(DATE, LAT, LON, ridgeProfile);
      expect(terrain.sunset).not.toBeNull();

      const earlyByMs = astronomical.sunset.getTime() - terrain.sunset!.getTime();
      const earlyByMin = earlyByMs / 60000;
      // A ~5.8 deg higher threshold (5 deg ridge vs the ~-0.83 deg astronomical one)
      // should shift sunset earlier by several to a few dozen minutes, not by seconds
      // or by multiple hours.
      expect(earlyByMin).toBeGreaterThan(5);
      expect(earlyByMin).toBeLessThan(60);
    });

    it('returns null for both when the sun never clears the terrain', () => {
      // 85 deg is well above the maximum solar altitude reachable at this latitude.
      const terrain = getTerrainSunTimes(DATE, LAT, LON, flatProfile(85));
      expect(terrain.sunrise).toBeNull();
      expect(terrain.sunset).toBeNull();
    });
  });

  describe('getTerrainMoonTimes', () => {
    const LAT = 45;
    const LON = 8;
    const DATE = new Date('2026-03-20T12:00:00Z');

    it('is close to the flat-horizon moonrise/moonset on a near-0 dip profile', () => {
      const reference = getMoonTimes(DATE, LAT, LON);
      const terrain = getTerrainMoonTimes(DATE, LAT, LON, flatProfile(-0.04));

      if (reference.rise) {
        expect(terrain.rise).not.toBeNull();
        expect(Math.abs(terrain.rise!.getTime() - reference.rise.getTime())).toBeLessThan(5 * 60 * 1000);
      }
      if (reference.set) {
        expect(terrain.set).not.toBeNull();
        expect(Math.abs(terrain.set!.getTime() - reference.set.getTime())).toBeLessThan(5 * 60 * 1000);
      }
    });

    it('returns null for both when the moon never clears the terrain', () => {
      const terrain = getTerrainMoonTimes(DATE, LAT, LON, flatProfile(85));
      expect(terrain.rise).toBeNull();
      expect(terrain.set).toBeNull();
    });
  });
});
