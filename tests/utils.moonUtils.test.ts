import SunCalc from 'suncalc';
import {
  getMoonPosition,
  getMoonPhaseLabel,
  getMoonPhaseIndex,
  getMoonTimes,
  getMoonPathForDay,
  getNextFullMoon,
  getNextNewMoon,
  getMoonPhasePath,
} from '../src/utils/moonUtils';

// Parses an SVG path "d" attribute of the form "Mx,y Lx,y Lx,y ... Z" (as produced by
// getMoonPhasePath) back into an array of [x, y] points, for area/shape assertions.
const parsePathPoints = (d: string): [number, number][] =>
  Array.from(d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)).map((m) => [
    parseFloat(m[1]),
    parseFloat(m[2]),
  ]);

const shoelaceArea = (points: [number, number][]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
};

describe('moonUtils', () => {
  it('calculates moon position', () => {
    const pos = getMoonPosition(new Date(), 0, 0);
    expect(pos).toHaveProperty('azimuth');
    expect(pos).toHaveProperty('altitude');
  });
  it('returns correct moon phase label', () => {
    expect(typeof getMoonPhaseLabel(0)).toBe('string');
    expect(typeof getMoonPhaseLabel(0.5)).toBe('string');
  });
  it('returns correct label for all moon phases', () => {
    for (let phase = 0; phase <= 1; phase += 0.1) {
      expect(typeof getMoonPhaseLabel(phase)).toBe('string');
    }
  });

  it('getMoonPhaseIndex always returns one of the 8 phase indices (0-7) (P0-6a)', () => {
    for (let i = 0; i <= 100; i++) {
      const index = getMoonPhaseIndex(i / 100);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(7);
    }
  });
});

describe('getMoonTimes (ROADMAP item 9)', () => {
  it('does not mutate the Date argument', () => {
    const date = new Date('2026-06-01T00:00:00Z');
    const before = date.getTime();
    getMoonTimes(date, 48, 11);
    expect(date.getTime()).toBe(before);
  });

  it('on an ordinary day, returns a rise and a set with neither always-flag set', () => {
    // Mid-latitude, mid-year: an ordinary day with both a rise and a set.
    const times = getMoonTimes(new Date('2026-06-15T00:00:00Z'), 48, 11);
    expect(times.alwaysUp).toBe(false);
    expect(times.alwaysDown).toBe(false);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
  });

  it('reports alwaysUp during a high-latitude winter stretch (lat 78, Jan 2026)', () => {
    // Verified directly against suncalc: 78N/15E has no moon rise/set from
    // 2026-01-01 through 2026-01-06.
    const times = getMoonTimes(new Date(Date.UTC(2026, 0, 2)), 78, 15);
    expect(times.alwaysUp).toBe(true);
    expect(times.alwaysDown).toBe(false);
    expect(times.rise).toBeNull();
    expect(times.set).toBeNull();
  });

  it('reports alwaysDown during a high-latitude stretch (lat 78, Jan 2026 and Jul 2026)', () => {
    // Verified against suncalc: alwaysDown 2026-01-11 through 2026-01-20, and
    // 2026-07-01 through 2026-07-02.
    const winter = getMoonTimes(new Date(Date.UTC(2026, 0, 15)), 78, 15);
    expect(winter.alwaysDown).toBe(true);
    expect(winter.alwaysUp).toBe(false);

    const summer = getMoonTimes(new Date(Date.UTC(2026, 6, 1)), 78, 15);
    expect(summer.alwaysDown).toBe(true);
  });

  it('reports alwaysUp during a high-latitude summer stretch (lat 78, Jul 2026)', () => {
    // Verified against suncalc: alwaysUp 2026-07-08 through 2026-07-15.
    const times = getMoonTimes(new Date(Date.UTC(2026, 6, 10)), 78, 15);
    expect(times.alwaysUp).toBe(true);
  });

  it('finds a missing rise by searching the next day (lat 78, 2026-01-09 has only a set)', () => {
    // Verified against suncalc: 2026-01-09 at 78N/15E has only a `set`; the next day
    // (2026-01-10) has a `rise` at ~00:33 UTC, which this moonrise belongs to.
    const times = getMoonTimes(new Date(Date.UTC(2026, 0, 9)), 78, 15);
    expect(times.set).toBeInstanceOf(Date);
    expect(times.rise).toBeInstanceOf(Date);
    expect((times.rise as Date).getTime()).toBeGreaterThan(new Date(Date.UTC(2026, 0, 10)).getTime());
  });

  it('falls back to null when a missing set still isn\'t found the next day (lat 78, 2026-01-24 has only a rise, and 2026-01-25 is alwaysUp)', () => {
    const times = getMoonTimes(new Date(Date.UTC(2026, 0, 24)), 78, 15);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeNull();
    expect(times.alwaysUp).toBe(false);
    expect(times.alwaysDown).toBe(false);
  });

  it('rise comes before set when both fall on the same calendar day (verified against suncalc for 2026-06-15, 48N/11E)', () => {
    const times = getMoonTimes(new Date('2026-06-15T00:00:00Z'), 48, 11);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
    expect((times.rise as Date).getTime()).toBeLessThan((times.set as Date).getTime());
  });

  it('set can come before rise, when the moon rose the previous day (verified against suncalc for 2026-06-20, 48N/11E)', () => {
    const times = getMoonTimes(new Date('2026-06-20T00:00:00Z'), 48, 11);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
    expect((times.set as Date).getTime()).toBeLessThan((times.rise as Date).getTime());
  });
});

describe('getMoonPathForDay (ROADMAP item 9 - arc)', () => {
  it('does not mutate the Date argument', () => {
    const date = new Date('2026-06-01T12:34:56Z');
    const before = date.getTime();
    getMoonPathForDay(date, 48, 11);
    expect(date.getTime()).toBe(before);
  });

  it('samples across the whole day, in chronological order, at the requested resolution', () => {
    const steps = 24;
    const points = getMoonPathForDay(new Date('2026-06-15T09:00:00Z'), 48, 11, steps);
    expect(points).toHaveLength(steps + 1);
    for (const p of points) {
      expect(p).toHaveProperty('azimuth');
      expect(p).toHaveProperty('altitude');
    }
  });
});

describe('getNextFullMoon / getNextNewMoon (ROADMAP item 9)', () => {
  it('does not mutate the Date argument', () => {
    const date = new Date('2026-10-01T00:00:00Z');
    const before = date.getTime();
    getNextFullMoon(date);
    getNextNewMoon(date);
    expect(date.getTime()).toBe(before);
  });

  // Reference dates from the task: full moon 2026-10-26 04:12 UTC, new moon
  // 2026-10-10 15:50 UTC. Verified directly against SunCalc.getMoonIllumination by
  // scanning its `phase` value across these dates:
  //  - New moon: SunCalc's phase crosses 0 at ~2026-10-10T15:27 UTC, 23 minutes off
  //    the reference - within the ±30 min tolerance the task allows.
  //  - Full moon: SunCalc's phase does NOT pass smoothly through 0.5 here. Sampling it
  //    minute-by-minute shows a jump from ~0.4856 to ~0.5145 between 08:50 and 09:00
  //    UTC (a known artifact of SunCalc's low-precision formula, whose `angle` term
  //    flips sign near opposition) and the crossing our search finds lands at
  //    ~2026-10-26T08:58 UTC - 4h46m off the almanac reference, far outside ±30 min.
  //    This is a SunCalc accuracy limitation (its simplified lunar theory), not a bug
  //    in the search: the tolerance below is widened accordingly, as instructed.
  it('finds the new moon near 2026-10-10 within 30 minutes of the reference time', () => {
    const result = getNextNewMoon(new Date('2026-10-01T00:00:00Z'));
    const reference = new Date('2026-10-10T15:50:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(30 * 60 * 1000);
  });

  it('finds the full moon near 2026-10-26 within SunCalc\'s own accuracy for this event (~5h, see comment above)', () => {
    const result = getNextFullMoon(new Date('2026-10-01T00:00:00Z'));
    const reference = new Date('2026-10-26T04:12:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(6 * 60 * 60 * 1000);
  });

  it('lands on a moment of near-maximum illumination, independent of the almanac reference', () => {
    // Regardless of how SunCalc's simplified model compares to the real world, the
    // instant our search finds for the "next full moon" should itself be a moment
    // where SunCalc reports the moon as (nearly) fully lit - i.e. we found a genuine
    // peak in SunCalc's own illumination data, not an arbitrary date.
    const full = getNextFullMoon(new Date('2026-03-01T00:00:00Z'));
    expect(SunCalc.getMoonIllumination(full).fraction).toBeGreaterThan(0.99);
  });

  it('lands on a moment of near-zero illumination for the next new moon', () => {
    const newMoon = getNextNewMoon(new Date('2026-03-01T00:00:00Z'));
    expect(SunCalc.getMoonIllumination(newMoon).fraction).toBeLessThan(0.01);
  });

  it('always returns a date after the given start date', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    expect(getNextFullMoon(start).getTime()).toBeGreaterThan(start.getTime());
    expect(getNextNewMoon(start).getTime()).toBeGreaterThan(start.getTime());
  });
});

describe('getMoonPhasePath (ROADMAP item 9 - phase shape)', () => {
  const RADIUS = 20;
  const circleArea = Math.PI * RADIUS * RADIUS;

  const areaFraction = (fraction: number, phase: number, latitude = 51): number => {
    const d = getMoonPhasePath(fraction, phase, latitude, RADIUS);
    return shoelaceArea(parsePathPoints(d)) / circleArea;
  };

  it('new moon (fraction 0): the lit region has ~no area', () => {
    expect(areaFraction(0, 0)).toBeLessThan(0.02);
  });

  it('first quarter (fraction 0.5, waxing): the lit region is ~half the disc', () => {
    expect(areaFraction(0.5, 0.25)).toBeCloseTo(0.5, 1);
  });

  it('full moon (fraction 1): the lit region is ~the whole disc', () => {
    expect(areaFraction(1, 0.5)).toBeGreaterThan(0.98);
  });

  it('last quarter (fraction 0.5, waning): the lit region is ~half the disc', () => {
    expect(areaFraction(0.5, 0.75)).toBeCloseTo(0.5, 1);
  });

  it('any fraction: the enclosed area is proportional to the illuminated fraction', () => {
    for (const k of [0.1, 0.3, 0.7, 0.9]) {
      expect(areaFraction(k, 0.1)).toBeCloseTo(k, 1);
    }
  });

  it('waxing (phase < 0.5) is lit on the right in the northern hemisphere', () => {
    const points = parsePathPoints(getMoonPhasePath(0.3, 0.1, 51, RADIUS));
    const outerAtEquator = points.find((p) => p[1] === 0);
    expect(outerAtEquator?.[0]).toBeGreaterThan(0);
  });

  it('waning (phase >= 0.5) is lit on the left in the northern hemisphere', () => {
    const points = parsePathPoints(getMoonPhasePath(0.3, 0.9, 51, RADIUS));
    const outerAtEquator = points.find((p) => p[1] === 0);
    expect(outerAtEquator?.[0]).toBeLessThan(0);
  });

  it('mirrors the lit side in the southern hemisphere for a waxing moon', () => {
    const north = parsePathPoints(getMoonPhasePath(0.3, 0.1, 51, RADIUS)).find((p) => p[1] === 0);
    const south = parsePathPoints(getMoonPhasePath(0.3, 0.1, -33, RADIUS)).find((p) => p[1] === 0);
    expect(Math.sign(north?.[0] ?? 0)).toBe(-Math.sign(south?.[0] ?? 0));
  });

  it('mirrors the lit side in the southern hemisphere for a waning moon', () => {
    const north = parsePathPoints(getMoonPhasePath(0.3, 0.9, 51, RADIUS)).find((p) => p[1] === 0);
    const south = parsePathPoints(getMoonPhasePath(0.3, 0.9, -33, RADIUS)).find((p) => p[1] === 0);
    expect(Math.sign(north?.[0] ?? 0)).toBe(-Math.sign(south?.[0] ?? 0));
  });
});
