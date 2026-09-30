import { getSunPosition, getSunTimes, getTimeOfDay, getRelevantTwilightTimes, formatTime, getGoldenHourTimes, getBlueHourTimes, getNextGoldenBlueHours, mixGradientTowardOvercast, getSunPathAround, getBackgroundGradient, findSunPass, getWaterColors, getReflectionFade } from '../src/utils/sunUtils';
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

  describe('mixGradientTowardOvercast (ROADMAP item 50, clouds dim the sky)', () => {
    it('returns the input unchanged for a zero mix', () => {
      const gradient = 'linear-gradient(to bottom, #0EA5E9 0%, #33C3F0 100%)';
      expect(mixGradientTowardOvercast(gradient, 0)).toBe(gradient);
    });

    it('turns a light color fully into the overcast grey at mix 1', () => {
      expect(mixGradientTowardOvercast('#FEC6A1', 1)).toBe('#8a949d');
    });

    it('mixes part of the way at a partial mix', () => {
      // #FFFFFF halfway toward #8A949D.
      expect(mixGradientTowardOvercast('#FFFFFF', 0.5)).toBe('#c5cace');
    });

    it('keeps a dark night color dark (the grey is never lighter than the color)', () => {
      const mixed = mixGradientTowardOvercast('#0F1016', 0.75);
      const num = parseInt(mixed.slice(1), 16);
      expect(Math.max((num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff)).toBeLessThanOrEqual(0x16);
    });

    it('leaves non-color text untouched', () => {
      const result = mixGradientTowardOvercast('linear-gradient(to bottom, #FFFFFF 0%, #000000 100%)', 0.6);
      expect(result).toMatch(/^linear-gradient\(to bottom, #[0-9a-f]{6} 0%, #000000 100%\)$/);
    });
  });

  describe('getBackgroundGradient (ROADMAP item 15 D polish, third sky-gradient stop)', () => {
    it('returns a 3-stop gradient (not the old 2-stop) for every time of day', () => {
      const timesOfDay = [
        'night', 'astronomical-twilight', 'nautical-twilight', 'civil-twilight',
        'dawn', 'morning', 'midday', 'afternoon', 'evening',
      ] as const;
      for (const timeOfDay of timesOfDay) {
        const gradient = getBackgroundGradient(timeOfDay);
        const hexStops = gradient.match(/#[0-9a-fA-F]{6}/g) ?? [];
        expect(hexStops).toHaveLength(3);
      }
    });

    it('keeps literal #rrggbb hex (not a CSS var) so mixGradientTowardOvercast (ROADMAP item 50) still applies', () => {
      const gradient = getBackgroundGradient('midday');
      const shifted = mixGradientTowardOvercast(gradient, 0.6);
      expect(shifted).not.toBe(gradient);
      expect(shifted).toMatch(/^linear-gradient\(to bottom, #[0-9a-fA-F]{6} 0%, #[0-9a-fA-F]{6} 62%, #[0-9a-fA-F]{6} 100%\)$/);
    });

    it("'midday' matches the --scene-sky-day-* bucket tokens (index.css/tailwind.config.ts)", () => {
      // --scene-sky-day-1/2/3: brand-sky #0EA5E9, brand-cyan #33C3F0, brand-peach #FEC6A1.
      expect(getBackgroundGradient('midday')).toBe(
        'linear-gradient(to bottom, #0EA5E9 0%, #33C3F0 62%, #FEC6A1 100%)'
      );
    });
  });

  describe('getReflectionFade (ROADMAP item 58, no reflection below the horizon)', () => {
    it('hides the strip at or below 0°', () => {
      expect(getReflectionFade(0)).toBe(0);
      expect(getReflectionFade(-1)).toBe(0);
      expect(getReflectionFade(-9)).toBe(0);
    });

    it('fades the strip in between 0° and +2°', () => {
      expect(getReflectionFade(1)).toBe(0.5);
    });

    it('shows the full strip from +2°', () => {
      expect(getReflectionFade(2)).toBe(1);
      expect(getReflectionFade(40)).toBe(1);
    });
  });

  describe('getWaterColors (ROADMAP item 53, the water follows the sky)', () => {
    const timesOfDay = [
      'night', 'astronomical-twilight', 'nautical-twilight', 'civil-twilight',
      'dawn', 'morning', 'midday', 'afternoon', 'evening',
    ] as const;
    const parseHsl = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number);
    // Independent HSL of a #rrggbb colour, for the expected values.
    const hexHsl = (rgb: number[]) => {
      const [r, g, b] = rgb.map((c) => c / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
      if (d === 0) return [0, 0, l * 100];
      const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return [h * 60, (d / (1 - Math.abs(2 * l - 1))) * 100, l * 100];
    };
    const stopsOf = (gradient: string) => [...gradient.matchAll(/#([0-9a-fA-F]{6}) (\d+)%/g)].map(([, hex, at]) => {
      const n = parseInt(hex, 16);
      return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], at: Number(at) };
    });

    for (const timeOfDay of timesOfDay) {
      it(`takes the ${timeOfDay} water from the sky gradient`, () => {
        const gradient = getBackgroundGradient(timeOfDay);
        const [top, mid, bottom] = stopsOf(gradient);
        // Sky colour at the horizon line (65 %), between the 62 % and 100 % stops.
        const t = (65 - mid.at) / (bottom.at - mid.at);
        const horizon = hexHsl(mid.rgb.map((c, i) => c + (bottom.rgb[i] - c) * t));
        const topHsl = hexHsl(top.rgb);

        const { surface, deep } = getWaterColors(gradient);
        const [sh, , sl] = parseHsl(surface);
        const [dh, , dl] = parseHsl(deep);
        expect(sl).toBeCloseTo(Math.min(horizon[2] * 0.85, horizon[2] - 5), 0);
        expect(dl).toBeCloseTo(topHsl[2] * 0.45, 0);
        // The sea stays blue, whatever the sky's hue (item 61).
        for (const hue of [sh, dh]) {
          expect(hue).toBeGreaterThan(190);
          expect(hue).toBeLessThan(240);
        }
      });
    }

    it('mirrors a warm dusk sky as a muted blue, not an orange sea (item 61)', () => {
      const dusk = parseHsl(getWaterColors(getBackgroundGradient('evening')).surface);
      const midday = parseHsl(getWaterColors(getBackgroundGradient('midday')).surface);
      expect(dusk[0]).toBeGreaterThan(190);
      expect(dusk[1]).toBeLessThan(midday[1] / 2);
    });

    it('follows the weather mix of the sky (item 50)', () => {
      const clear = getWaterColors(getBackgroundGradient('evening'));
      const rain = getWaterColors(mixGradientTowardOvercast(getBackgroundGradient('evening'), 0.6));
      expect(rain.surface).not.toBe(clear.surface);
      expect(parseHsl(rain.surface)[1]).toBeLessThan(parseHsl(clear.surface)[1]);
    });

    it('darkens the water by 40 % and greys it in a storm (item 51)', () => {
      const gradient = mixGradientTowardOvercast(getBackgroundGradient('afternoon'), 0.75);
      const calm = getWaterColors(gradient);
      const storm = getWaterColors(gradient, true);
      for (const key of ['surface', 'deep'] as const) {
        expect(parseHsl(storm[key])[2]).toBeCloseTo(parseHsl(calm[key])[2] * 0.6, 0);
        expect(parseHsl(storm[key])[1]).toBeLessThan(parseHsl(calm[key])[1] + 0.01);
      }
    });

    it('fails loudly on a gradient without hex stops', () => {
      expect(() => getWaterColors('linear-gradient(red, blue)')).toThrow();
    });
  });

  describe('getSunPathAround (ROADMAP item 17/26, sun arc)', () => {
    it('returns 49 samples, the same shape as getMoonPathAround', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      const path = getSunPathAround(date, 51.5, 0);
      expect(path).toHaveLength(49);
      path.forEach((point) => {
        expect(point).toHaveProperty('azimuth');
        expect(point).toHaveProperty('altitude');
      });
    });

    it('honors a custom step count', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      expect(getSunPathAround(date, 51.5, 0, 4)).toHaveLength(5);
    });

    it('one sample is the sun position at `date` itself, when the sun is up (ROADMAP item 26)', () => {
      const date = new Date('2026-06-21T12:00:00Z'); // midday, temperate latitude - sun is up
      const path = getSunPathAround(date, 51.5, 0);
      const expected = getSunPosition(date, 51.5, 0);
      expect(path.some((p) => Math.abs(p.azimuth - expected.azimuth) < 0.01 && Math.abs(p.altitude - expected.altitude) < 0.01)).toBe(true);
    });

    it('the first and last points reach the flat horizon, altitude 0 +-0.1 degrees (ROADMAP item 26)', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      const path = getSunPathAround(date, 51.5, 0);
      expect(Math.abs(path[0].altitude)).toBeLessThan(0.1);
      expect(Math.abs(path[path.length - 1].altitude)).toBeLessThan(0.1);
    });

    it('a pass longer than the old fixed 24h window is sampled whole, not cut at date + 12h (ROADMAP item 26)', () => {
      // Near the summer solstice at a temperate latitude, the sun's above-horizon
      // pass is well over 12h; sampling shortly after sunrise must still reach the
      // (much later than +12h) sunset at the far end.
      const times = getSunTimes(new Date('2026-06-21T00:00:00Z'), 51.5, 0);
      const passHours = (times.sunset.getTime() - times.sunrise.getTime()) / 3600000;
      expect(passHours).toBeGreaterThan(12);

      const shortlyAfterSunrise = new Date(times.sunrise.getTime() + 5 * 60 * 1000);
      const path = getSunPathAround(shortlyAfterSunrise, 51.5, 0);
      expect(Math.abs(path[0].altitude)).toBeLessThan(0.1);
      expect(Math.abs(path[path.length - 1].altitude)).toBeLessThan(0.1);
    });

    it('does not mutate the input date', () => {
      const date = new Date('2026-06-21T12:00:00Z');
      const before = date.getTime();
      getSunPathAround(date, 51.5, 0);
      expect(date.getTime()).toBe(before);
    });

    it('falls back to a fixed window without throwing at polar day (lat 78, June)', () => {
      const date = new Date(2026, 5, 21, 12, 0, 0, 0);
      const path = getSunPathAround(date, 78, 15);
      expect(path).toHaveLength(49);
      path.forEach((point) => {
        expect(Number.isFinite(point.altitude)).toBe(true);
        expect(Number.isFinite(point.azimuth)).toBe(true);
      });
    });
  });

  describe('findSunPass at night (AUDIT C-14, ROADMAP item 37)', () => {
    it('returns a full pass for every minute of a night, never the same rise twice', () => {
      // Ravensburg, the night the zero-length pass was seen (22:30 local).
      const start = Date.UTC(2026, 8, 27, 18, 0);
      for (let ms = start; ms < start + 10 * 60 * 60 * 1000; ms += 60 * 1000) {
        const pass = findSunPass(new Date(ms), 47.78, 9.61);
        expect(pass).not.toBeNull();
        expect(pass!.end.getTime() - pass!.start.getTime()).toBeGreaterThan(6 * 60 * 60 * 1000);
      }
    });
  });
});
