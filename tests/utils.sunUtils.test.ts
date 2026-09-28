import { getSunPosition, getSunTimes, getTimeOfDay, getRelevantTwilightTimes, formatTime, getGoldenHourTimes, getBlueHourTimes, getNextGoldenBlueHours, shiftGradientBrightness, getSunPathAround } from '../src/utils/sunUtils';
describe('sunUtils', () => {
  it('calculates sun position', () => {
    const pos = getSunPosition(new Date(), 0, 0);
    expect(pos).toHaveProperty('azimuth');
    expect(pos).toHaveProperty('altitude');
  });
  it('calculates sun times', () => {
    const times = getSunTimes(new Date(), 0, 0);
    expect(times).toHaveProperty('sunrise');
    expect(times).toHaveProperty('sunset');
  });
  it('returns correct time of day', () => {
    const times = getSunTimes(new Date(), 0, 0);
    const tod = getTimeOfDay(new Date(), times);
    expect(typeof tod).toBe('string');
  });
  it('handles polar day/night edge cases', () => {
    // Provide latitudes near poles and check results
  });
  it('handles invalid dates', () => {
    const pos = getSunPosition(new Date('invalid'), 0, 0);
    expect(Number.isNaN(pos.azimuth) || Number.isNaN(pos.altitude)).toBe(true);
    const times = getSunTimes(new Date('invalid'), 0, 0);
    expect(times.sunrise).toBeInstanceOf(Date);
    expect(isNaN(times.sunrise.getTime())).toBe(true);
  });
  it('after astronomical dusk, shows tomorrow\'s dawn times instead of today\'s already-past dawn (C-4)', () => {
    const latitude = 51.5;
    const longitude = 0; // London, longitude 0 keeps solar time close to UTC
    // Pick a date/time well after today's astronomical dusk (winter, so twilight is short).
    const now = new Date(Date.UTC(2026, 0, 15, 20, 0, 0, 0));
    const sunTimes = getSunTimes(now, latitude, longitude);
    expect(now.getTime()).toBeGreaterThan(sunTimes.astronomicalDusk.getTime());

    const relevant = getRelevantTwilightTimes(now, sunTimes, latitude, longitude);
    expect(relevant.type).toBe('dawn');

    // The "upcoming" dawn must not be today's dawn, which is already in the past.
    expect(relevant.astronomical.getTime()).toBeGreaterThan(now.getTime());
    expect(relevant.astronomical.getTime()).not.toBe(sunTimes.astronomicalDawn.getTime());

    // It should match tomorrow's computed astronomical dawn.
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = getSunTimes(tomorrow, latitude, longitude);
    expect(relevant.astronomical.getTime()).toBe(tomorrowTimes.astronomicalDawn.getTime());
    expect(relevant.civil.getTime()).toBe(tomorrowTimes.dawn.getTime());
    expect(relevant.nautical.getTime()).toBe(tomorrowTimes.nauticalDawn.getTime());
  });

  it('does not mutate the input date during polar day fallback', () => {
    const date = new Date(2026, 5, 21, 12, 0, 0, 0); // 2026-06-21
    const originalTime = date.getTime();
    getSunTimes(date, 78, 15); // polar day at this latitude/date → SunCalc returns invalid sunrise/sunset, triggering fallbacks
    expect(date.getTime()).toBe(originalTime);
  });

  it('marks polar day at lat 78 in June, when the sun never sets (C-5)', () => {
    const date = new Date(2026, 5, 21, 12, 0, 0, 0); // 2026-06-21, near summer solstice
    const times = getSunTimes(date, 78, 15);
    expect(times.polar).toBe('day');
    // The invented fallback sunrise/sunset are still present for internal time-of-day math.
    expect(times.sunrise).toBeInstanceOf(Date);
    expect(times.sunset).toBeInstanceOf(Date);
  });

  it('marks polar night at lat 78 in December, when the sun never rises (C-5)', () => {
    const date = new Date(2026, 11, 21, 12, 0, 0, 0); // 2026-12-21, near winter solstice
    const times = getSunTimes(date, 78, 15);
    expect(times.polar).toBe('night');
  });

  it('leaves polar null on an ordinary day at a temperate latitude', () => {
    const times = getSunTimes(new Date(2026, 5, 21, 12, 0, 0, 0), 51, 0);
    expect(times.polar).toBeNull();
  });

  it('formats time as 24-hour, with the runtime locale separator (A-4)', () => {
    expect(formatTime(new Date(2026, 0, 1, 13, 5, 0))).toMatch(/^13\D05$/);
    expect(formatTime(new Date(2026, 0, 1, 7, 5, 0))).toMatch(/^07\D05$/);
  });

  it('formatTime still reports "Unknown" for an invalid date', () => {
    expect(formatTime(new Date('invalid'))).toBe('Unknown');
    expect(formatTime(null)).toBe('Unknown');
  });

  describe('golden hour (ROADMAP item 11)', () => {
    it('returns a morning window ending at sunrise->goldenHourEnd and an evening window from goldenHour->sunset', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0); // temperate latitude, ordinary day
      const latitude = 51.5;
      const longitude = 0;
      const times = getSunTimes(date, latitude, longitude);
      const golden = getGoldenHourTimes(date, latitude, longitude);

      expect(golden.morning).not.toBeNull();
      expect(golden.evening).not.toBeNull();
      expect(golden.morning?.start.getTime()).toBe(times.sunrise.getTime());
      expect(golden.morning?.end.getTime()).toBeGreaterThan(golden.morning!.start.getTime());
      expect(golden.evening?.end.getTime()).toBe(times.sunset.getTime());
      expect(golden.evening?.start.getTime()).toBeLessThan(golden.evening!.end.getTime());
    });

    it('is null at polar day/night, where SunCalc has no sunrise/sunset/goldenHour times', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0); // polar day at lat 78 in June
      const golden = getGoldenHourTimes(date, 78, 15);
      expect(golden.morning).toBeNull();
      expect(golden.evening).toBeNull();
    });

    it('does not mutate the input date', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0);
      const originalTime = date.getTime();
      getGoldenHourTimes(date, 51.5, 0);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('blue hour (ROADMAP item 11)', () => {
    it('returns a morning window between dawn (-6°) and -4°, and an evening window between -4° and dusk (-6°)', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0);
      const latitude = 51.5;
      const longitude = 0;
      const times = getSunTimes(date, latitude, longitude);
      const blue = getBlueHourTimes(date, latitude, longitude);

      expect(blue.morning).not.toBeNull();
      expect(blue.evening).not.toBeNull();
      expect(blue.morning?.start.getTime()).toBe(times.dawn.getTime());
      expect(blue.morning?.end.getTime()).toBeGreaterThan(blue.morning!.start.getTime());
      expect(blue.morning?.end.getTime()).toBeLessThan(times.sunrise.getTime());
      expect(blue.evening?.end.getTime()).toBe(times.dusk.getTime());
      expect(blue.evening?.start.getTime()).toBeGreaterThan(times.sunset.getTime());
      expect(blue.evening?.start.getTime()).toBeLessThan(blue.evening!.end.getTime());
    });

    it('the sun altitude at the blue hour boundaries is close to -4° and -6°', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0);
      const latitude = 51.5;
      const longitude = 0;
      const blue = getBlueHourTimes(date, latitude, longitude);

      const dawnEndAltitude = getSunPosition(blue.morning!.end, latitude, longitude).altitude;
      const duskStartAltitude = getSunPosition(blue.evening!.start, latitude, longitude).altitude;
      expect(dawnEndAltitude).toBeCloseTo(-4, 0);
      expect(duskStartAltitude).toBeCloseTo(-4, 0);
    });

    it('is null at polar day/night', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0);
      const blue = getBlueHourTimes(date, 78, 15);
      expect(blue.morning).toBeNull();
      expect(blue.evening).toBeNull();
    });

    it('does not mutate the input date', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0);
      const originalTime = date.getTime();
      getBlueHourTimes(date, 51.5, 0);
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('getNextGoldenBlueHours (ROADMAP item 20)', () => {
    const latitude = 51.5;
    const longitude = 0;

    it('before sunrise: returns today\'s morning pair', () => {
      const now = new Date(2026, 5, 21, 1, 0, 0, 0);
      const golden = getGoldenHourTimes(now, latitude, longitude);
      const blue = getBlueHourTimes(now, latitude, longitude);
      const next = getNextGoldenBlueHours(now, latitude, longitude);

      expect(next.part).toBe('morning');
      expect(next.day).toBe('today');
      expect(next.golden?.end.getTime()).toBe(golden.morning?.end.getTime());
      expect(next.blue?.end.getTime()).toBe(blue.morning?.end.getTime());
    });

    it('at midday: returns today\'s evening pair', () => {
      const now = new Date(2026, 5, 21, 12, 0, 0, 0);
      const golden = getGoldenHourTimes(now, latitude, longitude);
      const blue = getBlueHourTimes(now, latitude, longitude);
      const next = getNextGoldenBlueHours(now, latitude, longitude);

      expect(next.part).toBe('evening');
      expect(next.day).toBe('today');
      expect(next.golden?.end.getTime()).toBe(golden.evening?.end.getTime());
      expect(next.blue?.end.getTime()).toBe(blue.evening?.end.getTime());
    });

    it('during the evening golden hour: still returns today\'s evening pair, with the golden window running now', () => {
      const golden = getGoldenHourTimes(new Date(2026, 5, 21, 12, 0, 0, 0), latitude, longitude);
      const now = new Date(golden.evening!.start.getTime() + 5 * 60 * 1000); // 5 min into evening golden hour
      const next = getNextGoldenBlueHours(now, latitude, longitude);

      expect(next.part).toBe('evening');
      expect(next.day).toBe('today');
      expect(next.golden?.start.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(next.golden?.end.getTime()).toBeGreaterThan(now.getTime());
    });

    it('after dusk: returns tomorrow\'s morning pair', () => {
      const blue = getBlueHourTimes(new Date(2026, 5, 21, 12, 0, 0, 0), latitude, longitude);
      const now = new Date(blue.evening!.end.getTime() + 30 * 60 * 1000); // 30 min after dusk
      const next = getNextGoldenBlueHours(now, latitude, longitude);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowGolden = getGoldenHourTimes(tomorrow, latitude, longitude);
      const tomorrowBlue = getBlueHourTimes(tomorrow, latitude, longitude);

      expect(next.part).toBe('morning');
      expect(next.day).toBe('tomorrow');
      expect(next.golden?.end.getTime()).toBe(tomorrowGolden.morning?.end.getTime());
      expect(next.blue?.end.getTime()).toBe(tomorrowBlue.morning?.end.getTime());
    });

    it('polar day: no golden/blue windows exist today or tomorrow, so both come back null', () => {
      const now = new Date(2026, 5, 21, 12, 0, 0, 0); // polar day at lat 78 in June
      const next = getNextGoldenBlueHours(now, 78, 15);

      expect(next.golden).toBeNull();
      expect(next.blue).toBeNull();
    });
  });

  describe('shiftGradientBrightness (ROADMAP item 10, weather sky tint)', () => {
    it('darkens every #rrggbb color by the same amount per channel', () => {
      const result = shiftGradientBrightness('linear-gradient(to bottom, #0F1016 0%, #1A1F2C 100%)', -10);
      expect(result).toBe('linear-gradient(to bottom, #05060c 0%, #101522 100%)');
    });

    it('brightens colors with a positive delta', () => {
      const result = shiftGradientBrightness('#000000', 15);
      expect(result).toBe('#0f0f0f');
    });

    it('clamps channels to [0, 255]', () => {
      expect(shiftGradientBrightness('#000000', -50)).toBe('#000000');
      expect(shiftGradientBrightness('#ffffff', 50)).toBe('#ffffff');
    });

    it('returns the input unchanged for a zero shift', () => {
      const gradient = 'linear-gradient(to bottom, #0EA5E9 0%, #33C3F0 100%)';
      expect(shiftGradientBrightness(gradient, 0)).toBe(gradient);
    });

    it('leaves non-color text untouched', () => {
      const result = shiftGradientBrightness('linear-gradient(to bottom, #FFFFFF 0%, #000000 100%)', -1);
      expect(result).toContain('linear-gradient(to bottom,');
      expect(result).toContain('0%');
      expect(result).toContain('100%)');
    });
  });

  describe('getSunPathAround (ROADMAP item 17, sun arc)', () => {
    it('returns 49 samples spanning date - 12h .. date + 12h, the same shape as getMoonPathAround', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      const path = getSunPathAround(date, 51.5, 0);
      expect(path).toHaveLength(49);
      path.forEach((point) => {
        expect(point).toHaveProperty('azimuth');
        expect(point).toHaveProperty('altitude');
      });
    });

    it('the center sample is the sun position at `date` itself', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      const path = getSunPathAround(date, 51.5, 0);
      const expected = getSunPosition(date, 51.5, 0);
      expect(path[24].azimuth).toBeCloseTo(expected.azimuth);
      expect(path[24].altitude).toBeCloseTo(expected.altitude);
    });

    it('honors a custom step count', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      expect(getSunPathAround(date, 51.5, 0, 4)).toHaveLength(5);
    });
  });
});
