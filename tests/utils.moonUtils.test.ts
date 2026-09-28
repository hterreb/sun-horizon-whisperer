import SunCalc from 'suncalc';
import {
  getMoonPosition,
  getMoonPhaseLabel,
  getMoonPhaseIndex,
  getMoonTimes,
  getMoonPathAround,
  getNextFullMoon,
  getNextNewMoon,
  getMoonPhasePath,
} from '../src/utils/moonUtils';
import { moonEclipticFromT, scanMoonEvents } from '../src/utils/lunarEphemeris';
import usnoMoonReference from './fixtures/usno-moon-reference.json';

interface UsnoFixtureEntry {
  loc: string;
  lat: number;
  lon: number;
  dateUTC: string; // YYYY-MM-DD
  events: string[]; // e.g. "Rise 04:55", "Set 12:26"; empty = no rise/set that UTC day
}

// [start, end) ms of the given UTC calendar day, for scanMoonEvents - independent of
// the test runner's own timezone (unlike getMoonTimes, which uses the local day).
const utcDayBoundsMs = (dateUTC: string): { startMs: number; endMs: number } => {
  const [year, month, day] = dateUTC.split('-').map(Number);
  const startMs = Date.UTC(year, month - 1, day);
  return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
};

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

  it('finds a missing set by searching the next day (lat 78, 2026-01-24 has only a rise)', () => {
    // suncalc (low precision) put 2026-01-25 as alwaysUp with no set; the higher-
    // precision Meeus-based scan finds a set on 2026-01-25 at ~02:33 UTC, which this
    // moonset belongs to.
    const times = getMoonTimes(new Date(Date.UTC(2026, 0, 24)), 78, 15);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
    expect(times.alwaysUp).toBe(false);
    expect(times.alwaysDown).toBe(false);
    expect((times.set as Date).getTime()).toBeGreaterThan(new Date(Date.UTC(2026, 0, 25)).getTime());
  });

  it('rise comes before set when both fall on the same calendar day (verified against suncalc for 2026-06-15, 48N/11E)', () => {
    const times = getMoonTimes(new Date('2026-06-15T00:00:00Z'), 48, 11);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
    expect((times.rise as Date).getTime()).toBeLessThan((times.set as Date).getTime());
  });

  it('set can come before rise, when the moon rose the previous day (2026-06-04 UTC, 48N/11E: set 06:22, rise 22:36)', () => {
    const times = getMoonTimes(new Date('2026-06-04T00:00:00Z'), 48, 11);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
    expect((times.set as Date).getTime()).toBeLessThan((times.rise as Date).getTime());
  });
});

describe('getMoonPathAround (ROADMAP item 9/26 - arc)', () => {
  it('does not mutate the Date argument', () => {
    const date = new Date('2026-06-01T12:34:56Z');
    const before = date.getTime();
    getMoonPathAround(date, 48, 11);
    expect(date.getTime()).toBe(before);
  });

  it('samples the current pass at the requested resolution', () => {
    const steps = 24;
    const points = getMoonPathAround(new Date('2026-06-15T09:00:00Z'), 48, 11, steps);
    expect(points).toHaveLength(steps + 1);
    for (const p of points) {
      expect(p).toHaveProperty('azimuth');
      expect(p).toHaveProperty('altitude');
    }
  });

  it('the first and last points reach the flat horizon, altitude 0 +-0.1 degrees (ROADMAP item 26)', () => {
    const date = new Date('2026-06-15T09:00:00Z');
    const path = getMoonPathAround(date, 48, 11);
    expect(Math.abs(path[0].altitude)).toBeLessThan(0.1);
    expect(Math.abs(path[path.length - 1].altitude)).toBeLessThan(0.1);
  });

  it('a pass longer than the old fixed 24h window is complete, not cut at date + 12h (ROADMAP item 26)', () => {
    // Verified against getMoonTimes at 48N/11E: 2026-06-15 rise ~02:52 UTC, set ~20:23
    // UTC - a ~17.5h pass, well past the old fixed date+12h cutoff.
    const times = getMoonTimes(new Date('2026-06-15T00:00:00Z'), 48, 11);
    expect(times.rise).toBeInstanceOf(Date);
    expect(times.set).toBeInstanceOf(Date);
    const passHours = ((times.set as Date).getTime() - (times.rise as Date).getTime()) / 3600000;
    expect(passHours).toBeGreaterThan(12);

    const shortlyAfterRise = new Date((times.rise as Date).getTime() + 60 * 1000);
    const path = getMoonPathAround(shortlyAfterRise, 48, 11);
    expect(Math.abs(path[0].altitude)).toBeLessThan(0.1);
    expect(Math.abs(path[path.length - 1].altitude)).toBeLessThan(0.1);
  });

  it('falls back to a fixed window without throwing during an alwaysUp stretch (lat 78, Jan 2026)', () => {
    const date = new Date(Date.UTC(2026, 0, 2));
    const path = getMoonPathAround(date, 78, 15);
    expect(path).toHaveLength(49);
    path.forEach((point) => {
      expect(Number.isFinite(point.altitude)).toBe(true);
      expect(Number.isFinite(point.azimuth)).toBe(true);
    });
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

  // Published UTC event times (Meeus ch. 49 / almanac references), checked to
  // within ±5 minutes - the old ±6h-wide tolerance was hiding suncalc's low-precision
  // lunar theory being hours off; getNextFullMoon/getNextNewMoon no longer use it.
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  it('finds the new moon on 2026-10-10 within 5 minutes of the published time', () => {
    const result = getNextNewMoon(new Date('2026-10-01T00:00:00Z'));
    const reference = new Date('2026-10-10T15:50:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(FIVE_MINUTES_MS);
  });

  it('finds the full moon on 2026-10-26 within 5 minutes of the published time', () => {
    const result = getNextFullMoon(new Date('2026-10-01T00:00:00Z'));
    const reference = new Date('2026-10-26T04:12:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(FIVE_MINUTES_MS);
  });

  it('finds the 2024-04-23 full moon (the total eclipse cycle) within 5 minutes of the published time', () => {
    const result = getNextFullMoon(new Date('2024-04-01T00:00:00Z'));
    const reference = new Date('2024-04-23T23:49:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(FIVE_MINUTES_MS);
  });

  it('finds the 2024-04-08 new moon (the total eclipse) within 5 minutes of the published time', () => {
    const result = getNextNewMoon(new Date('2024-04-01T00:00:00Z'));
    const reference = new Date('2024-04-08T18:21:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(FIVE_MINUTES_MS);
  });

  it('finds the 2000-01-06 new moon within 5 minutes of the published time', () => {
    const result = getNextNewMoon(new Date('2000-01-01T00:00:00Z'));
    const reference = new Date('2000-01-06T18:14:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(FIVE_MINUTES_MS);
  });

  it('finds the 2000-01-21 full moon within 5 minutes of the published time', () => {
    const result = getNextFullMoon(new Date('2000-01-01T00:00:00Z'));
    const reference = new Date('2000-01-21T04:40:00Z').getTime();
    expect(Math.abs(result.getTime() - reference)).toBeLessThan(FIVE_MINUTES_MS);
  });

  it('lands on a moment of near-maximum illumination, independent of the almanac reference', () => {
    // The instant our search finds for the "next full moon" should itself be a
    // moment where SunCalc reports the moon as (nearly) fully lit - i.e. we found a
    // genuine peak in SunCalc's own illumination data, not an arbitrary date.
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

  it('strictly after: calling with the exact event instant returns the next one, ~29.5 days later', () => {
    const firstFull = getNextFullMoon(new Date('2026-10-01T00:00:00Z'));
    const secondFull = getNextFullMoon(firstFull);
    expect(secondFull.getTime()).toBeGreaterThan(firstFull.getTime());
    const fullGapDays = (secondFull.getTime() - firstFull.getTime()) / (24 * 60 * 60 * 1000);
    expect(fullGapDays).toBeGreaterThan(29);
    expect(fullGapDays).toBeLessThan(30);

    const firstNew = getNextNewMoon(new Date('2026-10-01T00:00:00Z'));
    const secondNew = getNextNewMoon(firstNew);
    expect(secondNew.getTime()).toBeGreaterThan(firstNew.getTime());
    const newGapDays = (secondNew.getTime() - firstNew.getTime()) / (24 * 60 * 60 * 1000);
    expect(newGapDays).toBeGreaterThan(29);
    expect(newGapDays).toBeLessThan(30);
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

describe('moonEclipticFromT (Meeus ch. 47, Astronomical Algorithms 2nd ed.)', () => {
  it('matches worked Example 47.a (1992-04-12 0h TD) to 0.001 degree', () => {
    // JDE for 1992-04-12.0 TD, as given in the example (p. 342-343).
    const jde = 2448724.5;
    const T = (jde - 2451545) / 36525;

    const { lambdaDeg, betaDeg, distanceKm } = moonEclipticFromT(T);

    expect(Math.abs(lambdaDeg - 133.162655)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(betaDeg - -3.229126)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(distanceKm - 368409.7)).toBeLessThanOrEqual(1);
  });
});

describe('getMoonTimes accuracy against USNO reference (ROADMAP item 9, <= 2 min)', () => {
  const fixture = usnoMoonReference as UsnoFixtureEntry[];

  for (const entry of fixture) {
    const { loc, lat, lon, dateUTC, events } = entry;

    if (events.length === 0) {
      it(`${loc} ${dateUTC}: no rise/set that UTC day`, () => {
        const { startMs, endMs } = utcDayBoundsMs(dateUTC);
        const scan = scanMoonEvents(startMs, endMs, lat, lon);
        expect(scan.rise).toBeNull();
        expect(scan.set).toBeNull();
      });
      continue;
    }

    for (const eventStr of events) {
      it(`${loc} ${dateUTC}: ${eventStr} (USNO) within +-2 min`, () => {
        const [kind, hhmm] = eventStr.split(' ');
        const [hh, mm] = hhmm.split(':').map(Number);
        const [year, month, day] = dateUTC.split('-').map(Number);
        const expectedMs = Date.UTC(year, month - 1, day, hh, mm);

        const { startMs, endMs } = utcDayBoundsMs(dateUTC);
        const scan = scanMoonEvents(startMs, endMs, lat, lon);
        const found = kind === 'Rise' ? scan.rise : scan.set;

        expect(found).toBeInstanceOf(Date);
        const errorMinutes = Math.abs((found as Date).getTime() - expectedMs) / 60000;
        expect(errorMinutes).toBeLessThanOrEqual(2);
      });
    }
  }
});
