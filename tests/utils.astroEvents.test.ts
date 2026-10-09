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
  MATARIKI_DATES,
  isMatarikiWeek,
  isMatarikiTime,
  getConjunction,
  isNoctilucentTime,
  type AstroInput,
} from '../src/utils/astroEvents';
import { getSunPathAround, getSunPosition, getSunTimes } from '../src/utils/sunUtils';

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

// Sky eggs (ROADMAP "Easter eggs and special events", Sky).
describe('sky eggs', () => {
  const at = (iso: string, latitude: number, longitude: number) => {
    const date = new Date(iso);
    return {
      ...base,
      date,
      latitude,
      longitude,
      sunAltitude: getSunPosition(date, latitude, longitude).altitude,
      timeOfDay: 'night' as const,
      sunTimes: getSunTimes(date, latitude, longitude),
    };
  };

  it('reads the new ?egg= overrides', () => {
    expect(parseEggOverride('?egg=matariki')).toBe('matariki');
    expect(parseEggOverride('?egg=CONJUNCTION')).toBe('conjunction');
    expect(parseEggOverride('?egg=noctilucent')).toBe('noctilucent');
    expect(parseEggOverride('?egg=midnightsun')).toBe('midnightSun');
    expect(parseEggOverride('?egg=polarNight')).toBe('polarNight');
    expect(getAstroEvent(base, 'conjunction')).toEqual({ kind: 'conjunction', strength: 1 });
  });

  describe('Matariki', () => {
    it('has the 10 NZ holiday dates 2026-2035, all Fridays', () => {
      expect(MATARIKI_DATES).toHaveLength(10);
      for (const iso of MATARIKI_DATES) expect(new Date(`${iso}T12:00:00Z`).getUTCDay(), iso).toBe(5);
    });

    it('covers the holiday week: 3 days before to 3 days after', () => {
      expect(isMatarikiWeek(new Date(2026, 6, 10, 6))).toBe(true);
      expect(isMatarikiWeek(new Date(2026, 6, 7, 6))).toBe(true);
      expect(isMatarikiWeek(new Date(2026, 6, 13, 6))).toBe(true);
      expect(isMatarikiWeek(new Date(2026, 6, 14, 6))).toBe(false);
      expect(isMatarikiWeek(new Date(2026, 7, 10, 6))).toBe(false);
    });

    it('shows in the last 90 min before sunrise, with a dark sky', () => {
      const sunrise = new Date(2026, 6, 10, 7, 45);
      expect(isMatarikiTime(new Date(2026, 6, 10, 6, 45), sunrise, -8)).toBe(true);
      expect(isMatarikiTime(new Date(2026, 6, 10, 6, 0), sunrise, -14)).toBe(false); // 105 min before
      expect(isMatarikiTime(new Date(2026, 6, 10, 7, 40), sunrise, -1)).toBe(false); // too light
      expect(isMatarikiTime(new Date(2026, 6, 10, 8, 0), sunrise, 2)).toBe(false); // after sunrise
      expect(isMatarikiTime(new Date(2026, 6, 10, 6, 45), null, -8)).toBe(false);
    });

    it('gives Matariki in Wellington an hour before sunrise on the holiday', () => {
      const day = getSunTimes(new Date('2026-07-10T00:00:00Z'), -41.29, 174.78);
      const input = at(new Date(day.sunrise.getTime() - 60 * 60_000).toISOString(), -41.29, 174.78);
      expect(getAstroEvent(input)?.kind).toBe('matariki');
    });
  });

  describe('planet conjunction', () => {
    it('finds the Venus-Jupiter conjunction of 12 Aug 2025 before dawn (0.9°)', () => {
      const pair = getConjunction(new Date('2025-08-12T02:30:00Z'), 47.78, 9.61, -14);
      expect(pair?.map((p) => p.name).sort()).toEqual(['jupiter', 'venus']);
      expect(pair?.[0].azimuth).toBeGreaterThan(45); // low in the east
      expect(pair?.[0].azimuth).toBeLessThan(110);
    });

    it('finds the Jupiter-Saturn great conjunction of 21 Dec 2020 and Mars-Jupiter on 14 Aug 2024', () => {
      expect(getConjunction(new Date('2020-12-21T16:45:00Z'), 47.78, 9.61, -10)?.map((p) => p.name)).toEqual(['jupiter', 'saturn']);
      expect(getConjunction(new Date('2024-08-14T02:30:00Z'), 47.78, 9.61, -10)?.map((p) => p.name)).toEqual(['mars', 'jupiter']);
    });

    it('gives nothing by day, below the horizon, or when no two planets are close', () => {
      expect(getConjunction(new Date('2025-08-12T02:30:00Z'), 47.78, 9.61, 10)).toBeNull(); // sun up
      expect(getConjunction(new Date('2025-08-12T14:30:00Z'), -33.87, 151.21, -30)).toBeNull(); // planets set in Sydney
      expect(getConjunction(new Date('2026-09-30T21:00:00Z'), 47.78, 9.61, -30)).toBeNull();
    });

    it('puts the conjunction with its planets into getAstroEvent', () => {
      const event = getAstroEvent(at('2025-08-12T02:30:00Z', 47.78, 9.61));
      expect(event?.kind).toBe('conjunction');
      expect(event?.planets).toHaveLength(2);
    });
  });

  describe('noctilucent clouds', () => {
    const sunset = new Date(2026, 5, 25, 22, 0);
    const sunrise = new Date(2026, 5, 26, 4, 30);
    it('show 1-2 h after sunset or before sunrise, in June and July, at 50-65° N, under a clear sky', () => {
      expect(isNoctilucentTime(new Date(2026, 5, 25, 23, 30), 56, sunset, sunrise, 'clear')).toBe(true);
      expect(isNoctilucentTime(new Date(2026, 5, 26, 3, 0), 56, sunset, sunrise, 'clear')).toBe(true);
      expect(isNoctilucentTime(new Date(2026, 5, 25, 22, 30), 56, sunset, sunrise, 'clear')).toBe(false); // 30 min
      expect(isNoctilucentTime(new Date(2026, 5, 26, 0, 30), 56, sunset, sunrise, 'clear')).toBe(false); // 150 min
      expect(isNoctilucentTime(new Date(2026, 5, 25, 23, 30), 56, sunset, sunrise, 'cloudy')).toBe(false);
      expect(isNoctilucentTime(new Date(2026, 5, 25, 23, 30), 47, sunset, sunrise, 'clear')).toBe(false);
      expect(isNoctilucentTime(new Date(2026, 5, 25, 23, 30), 67, sunset, sunrise, 'clear')).toBe(false);
      expect(isNoctilucentTime(new Date(2026, 8, 25, 23, 30), 56, new Date(2026, 8, 25, 22), sunrise, 'clear')).toBe(false); // September
    });

    it('use December and January in the south', () => {
      const s = new Date(2026, 11, 20, 22, 0);
      expect(isNoctilucentTime(new Date(2026, 11, 20, 23, 30), -55, s, null, 'clear')).toBe(true);
      expect(isNoctilucentTime(new Date(2026, 5, 25, 23, 30), -55, sunset, null, 'clear')).toBe(false);
    });

    it('give noctilucent clouds in Edinburgh 90 min after a June sunset', () => {
      const day = getSunTimes(new Date('2026-06-25T12:00:00Z'), 55.95, -3.19);
      const input = at(new Date(day.sunset.getTime() + 90 * 60_000).toISOString(), 55.95, -3.19);
      expect(getAstroEvent(input)?.kind).toBe('noctilucent');
    });
  });

  describe('midnight sun and polar night', () => {
    it('gives the midnight sun in Tromsø in June, all day', () => {
      for (const iso of ['2026-06-21T00:00:00Z', '2026-06-21T11:00:00Z']) {
        expect(getAstroEvent({ ...at(iso, 69.65, 18.96), timeOfDay: 'midday' })?.kind).toBe('midnightSun');
      }
    });

    it('draws the whole midnight-sun day as one arc above the horizon', () => {
      const path = getSunPathAround(new Date('2026-06-21T00:00:00Z'), 69.65, 18.96);
      expect(path.every((p) => p.altitude > 0)).toBe(true);
      const azimuths = path.map((p) => p.azimuth);
      expect(Math.max(...azimuths) - Math.min(...azimuths)).toBeGreaterThan(300); // round the sky
    });

    it('gives polar night in Tromsø in December, with the aurora first at night', () => {
      const noon = at('2026-12-21T11:00:00Z', 69.65, 18.96);
      expect(noon.sunTimes.polar).toBe('night');
      expect(getAstroEvent({ ...noon, timeOfDay: 'civil-twilight' })?.kind).toBe('polarNight');
      expect(getAstroEvent({ ...noon, timeOfDay: 'night' })?.kind).toBe('aurora');
    });

    it('gives neither on an ordinary day', () => {
      expect(getAstroEvent({ ...base, sunTimes: getSunTimes(base.date, base.latitude, base.longitude) })).toBeNull();
    });
  });
});
