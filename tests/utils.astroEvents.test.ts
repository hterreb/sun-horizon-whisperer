import {
  getSolarEclipseDepth,
  getLunarEclipseDepth,
  isSupermoon,
  isBlueMoon,
  getMeteorShower,
  METEOR_SHOWER,
  meteorSpawnChance,
  meteorOpacity,
  isAuroraTime,
  isGreenFlash,
  greenFlashRoll,
  GREEN_FLASH_MS,
  parseEggOverride,
  getAstroEvent,
  SOLAR_ECLIPSES,
  LUNAR_ECLIPSES,
  type AstroInput,
} from '../src/utils/astroEvents';

const base: AstroInput = {
  date: new Date('2026-09-30T12:00:00Z'),
  latitude: 47.78,
  longitude: 9.61,
  sunAltitude: 30,
  moonAltitude: -10,
  timeOfDay: 'midday',
  weatherType: 'clear',
  sunset: null,
};

describe('eclipse lists', () => {
  it('cover 2026-2035 in time order', () => {
    for (const list of [SOLAR_ECLIPSES, LUNAR_ECLIPSES]) {
      const times = list.map((e) => Date.parse(e.peak));
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(new Date(times[0]).getUTCFullYear()).toBe(2026);
      expect(new Date(times[times.length - 1]).getUTCFullYear()).toBe(2035);
    }
  });
});

describe('getSolarEclipseDepth', () => {
  // 2026-08-12 total eclipse: greatest near Iceland at 17:45:51 UT.
  const peak = new Date('2026-08-12T17:45:51Z');

  it('is deep at the peak near the path, fading with time', () => {
    const atPeak = getSolarEclipseDepth(peak, 65, -22, 20);
    expect(atPeak).toBeGreaterThan(0.9);
    const later = getSolarEclipseDepth(new Date(peak.getTime() + 60 * 60_000), 65, -22, 20);
    expect(later).toBeGreaterThan(0);
    expect(later).toBeLessThan(atPeak);
  });

  it('is 0 far from the path, with the sun down, or outside the window', () => {
    expect(getSolarEclipseDepth(peak, -33.9, 151.2, 20)).toBe(0); // Sydney
    expect(getSolarEclipseDepth(peak, 65, -22, -1)).toBe(0);
    expect(getSolarEclipseDepth(new Date(peak.getTime() + 2 * 3600_000), 65, -22, 20)).toBe(0);
  });
});

describe('getLunarEclipseDepth', () => {
  it('is 1 at the peak of a total eclipse and 0.5 at a partial one', () => {
    expect(getLunarEclipseDepth(new Date('2026-03-03T11:33:37Z'), 30)).toBe(1);
    expect(getLunarEclipseDepth(new Date('2026-08-28T04:12:49Z'), 30)).toBe(0.5);
  });

  it('is 0 with the moon down or outside the umbral phase', () => {
    expect(getLunarEclipseDepth(new Date('2026-03-03T11:33:37Z'), -5)).toBe(0);
    expect(getLunarEclipseDepth(new Date('2026-03-03T14:00:00Z'), 30)).toBe(0);
  });
});

describe('supermoon and blue moon', () => {
  it('finds the 2026-12-24 supermoon (356 740 km), not the far 2026-06-29 full moon', () => {
    expect(isSupermoon(new Date('2026-12-24T01:00:00Z'))).toBe(true);
    expect(isSupermoon(new Date('2026-06-29T23:00:00Z'))).toBe(false);
    expect(isSupermoon(new Date('2026-12-28T01:00:00Z'))).toBe(false); // 4 days later
  });

  it('finds the 2026-05-31 blue moon, but not the first full moon of May', () => {
    expect(isBlueMoon(new Date('2026-05-31T09:00:00Z'))).toBe(true);
    expect(isBlueMoon(new Date('2026-05-01T17:00:00Z'))).toBe(false);
  });
});

describe('getMeteorShower', () => {
  it('names the shower around its peak', () => {
    expect(getMeteorShower(new Date(2026, 7, 12, 23))).toBe('Perseids');
    expect(getMeteorShower(new Date(2026, 11, 14, 23))).toBe('Geminids');
    expect(getMeteorShower(new Date(2027, 0, 3, 23))).toBe('Quadrantids');
    expect(getMeteorShower(new Date(2026, 7, 20, 23))).toBeNull();
  });
});

describe('meteor shower streaks', () => {
  it('draws long streaks 2-3 px wide that fade slowly', () => {
    expect(METEOR_SHOWER.width).toBeGreaterThanOrEqual(2);
    expect(METEOR_SHOWER.width).toBeLessThanOrEqual(3);
    expect(METEOR_SHOWER.length).toBeGreaterThanOrEqual(100);
    expect(METEOR_SHOWER.fadeOutMs).toBeGreaterThanOrEqual(300);
  });

  it('starts one meteor every ~8 s on average (wait plus flight)', () => {
    const frameMs = 1000 / 60;
    const meanWaitMs = frameMs / meteorSpawnChance(frameMs);
    expect(meanWaitMs + METEOR_SHOWER.durationMs).toBeCloseTo(8000);
    // The chance scales with the frame time, so 120 Hz shows no more meteors than 60 Hz.
    expect(meteorSpawnChance(frameMs / 2)).toBeCloseTo(meteorSpawnChance(frameMs) / 2);
  });

  it('fades in, holds and fades out without a jump', () => {
    expect(meteorOpacity(0)).toBe(0);
    expect(meteorOpacity(METEOR_SHOWER.fadeInMs / 2)).toBeCloseTo(0.5);
    expect(meteorOpacity(METEOR_SHOWER.durationMs / 2)).toBe(1);
    expect(meteorOpacity(METEOR_SHOWER.durationMs - METEOR_SHOWER.fadeOutMs / 2)).toBeCloseTo(0.5);
    expect(meteorOpacity(METEOR_SHOWER.durationMs)).toBe(0);
    expect(meteorOpacity(METEOR_SHOWER.durationMs + 100)).toBe(0);
  });
});

describe('isAuroraTime', () => {
  it('needs |lat| > 60 and full night', () => {
    expect(isAuroraTime(69.65, 'night')).toBe(true);
    expect(isAuroraTime(-65, 'night')).toBe(true);
    expect(isAuroraTime(47.78, 'night')).toBe(false);
    expect(isAuroraTime(69.65, 'nautical-twilight')).toBe(false);
  });
});

describe('isGreenFlash', () => {
  const sunset = new Date(2026, 8, 30, 19, 5, 49);
  // Find a place whose roll hits for this day, so the test does not depend on luck.
  const lat = Array.from({ length: 400 }, (_, i) => i / 10).find((l) => greenFlashRoll(sunset, l, 9.6) === 0)!;

  it('flashes for a few seconds after a clear sunset on a lucky day', () => {
    expect(isGreenFlash(new Date(sunset.getTime() + 1000), sunset, 'clear', lat, 9.6)).toBe(true);
    expect(isGreenFlash(new Date(sunset.getTime() + GREEN_FLASH_MS), sunset, 'clear', lat, 9.6)).toBe(false);
    expect(isGreenFlash(new Date(sunset.getTime() - 1000), sunset, 'clear', lat, 9.6)).toBe(false);
    expect(isGreenFlash(new Date(sunset.getTime() + 1000), sunset, 'partly', lat, 9.6)).toBe(false);
  });

  it('hits about 1 day in 20', () => {
    const hits = Array.from({ length: 2000 }, (_, i) => greenFlashRoll(new Date(2026, 0, 1 + i), 47.8, 9.6) === 0)
      .filter(Boolean).length;
    expect(hits).toBeGreaterThan(60);
    expect(hits).toBeLessThan(140);
  });
});

describe('parseEggOverride', () => {
  it('reads ?egg=<kind>, case-insensitive, and ignores unknown values', () => {
    expect(parseEggOverride('?egg=aurora')).toBe('aurora');
    expect(parseEggOverride('?egg=greenflash')).toBe('greenFlash');
    expect(parseEggOverride('?egg=ufo')).toBeNull();
    expect(parseEggOverride('')).toBeNull();
  });
});

describe('getAstroEvent', () => {
  it('gives null on an ordinary day', () => {
    expect(getAstroEvent(base)).toBeNull();
  });

  it('gives the override first', () => {
    expect(getAstroEvent(base, 'aurora')).toEqual({ kind: 'aurora', strength: 1 });
  });

  it('gives aurora at night in Tromsø, and the meteor shower before it', () => {
    const night = { ...base, latitude: 69.65, longitude: 18.96, sunAltitude: -30, timeOfDay: 'night' as const };
    expect(getAstroEvent(night)?.kind).toBe('aurora');
    expect(getAstroEvent({ ...night, date: new Date(2026, 7, 12, 23) })?.kind).toBe('meteorShower');
  });

  it('gives a lunar eclipse only while the moon is up and shown', () => {
    const eclipse = { ...base, date: new Date('2026-03-03T11:33:37Z'), moonAltitude: 30 };
    expect(getAstroEvent({ ...eclipse, timeOfDay: 'night' })?.kind).toBe('lunarEclipse');
    expect(getAstroEvent({ ...eclipse, timeOfDay: 'midday' })).toBeNull();
  });

  it('gives the solar eclipse before anything else', () => {
    const e = { ...base, date: new Date('2026-08-12T17:45:51Z'), latitude: 65, longitude: -22, sunAltitude: 20 };
    expect(getAstroEvent(e)?.kind).toBe('solarEclipse');
  });
});
