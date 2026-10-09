import { getCalendarEvent, getSeasonInstant, isSantaTime } from '@/utils/calendarEvents';
import { getSunTimes } from '@/utils/sunUtils';

// vitest pins TZ=UTC, so local dates below are UTC dates.
describe('getSeasonInstant', () => {
  it('is within an hour of the published 2026 solstices and equinoxes', () => {
    const published: [2 | 5 | 8 | 11, string][] = [
      [2, '2026-03-20T14:46Z'],
      [5, '2026-06-21T08:24Z'],
      [8, '2026-09-23T00:05Z'],
      [11, '2026-12-21T20:50Z'],
    ];
    for (const [month, iso] of published) {
      expect(Math.abs(getSeasonInstant(2026, month).getTime() - Date.parse(iso))).toBeLessThan(3_600_000);
    }
  });
});

describe('getCalendarEvent', () => {
  it('returns null on an ordinary day', () => {
    expect(getCalendarEvent(new Date(2026, 8, 30, 12))).toBeNull();
  });

  it('returns new-year only in the first minute of Jan 1', () => {
    expect(getCalendarEvent(new Date(2027, 0, 1, 0, 0, 30))).toBe('new-year');
    expect(getCalendarEvent(new Date(2027, 0, 1, 0, 1))).toBeNull();
    expect(getCalendarEvent(new Date(2026, 11, 31, 23, 59, 59))).toBeNull();
  });

  it('returns lunar-new-year on the whole day of Lunar New Year only (item 100)', () => {
    expect(getCalendarEvent(new Date(2027, 1, 6, 0, 0))).toBe('lunar-new-year');
    expect(getCalendarEvent(new Date(2027, 1, 6, 23, 59))).toBe('lunar-new-year');
    expect(getCalendarEvent(new Date(2035, 1, 8, 12))).toBe('lunar-new-year');
    expect(getCalendarEvent(new Date(2027, 1, 7, 12))).toBeNull();
    expect(getCalendarEvent(new Date(2028, 1, 6, 12))).toBeNull();
  });

  it('returns friday-13 on a Friday the 13th only', () => {
    expect(getCalendarEvent(new Date(2026, 10, 13, 20))).toBe('friday-13'); // a Friday
    expect(getCalendarEvent(new Date(2026, 9, 13, 20))).toBeNull(); // a Tuesday
  });

  it('flips longest/shortest day by hemisphere', () => {
    expect(getCalendarEvent(new Date(2026, 5, 21, 12), 47.8)).toBe('solstice-longest');
    expect(getCalendarEvent(new Date(2026, 5, 21, 12), -33.9)).toBe('solstice-shortest');
    expect(getCalendarEvent(new Date(2026, 11, 21, 12), 47.8)).toBe('solstice-shortest');
    expect(getCalendarEvent(new Date(2026, 11, 21, 12))).toBe('solstice-shortest'); // no latitude: north
    expect(getCalendarEvent(new Date(2026, 5, 22, 12), 47.8)).toBeNull();
  });

  it('returns equinox on the equinox day', () => {
    expect(getCalendarEvent(new Date(2026, 2, 20, 9))).toBe('equinox');
    expect(getCalendarEvent(new Date(2026, 8, 23, 20), -33.9)).toBe('equinox');
    expect(getCalendarEvent(new Date(2026, 8, 22, 20))).toBeNull();
  });

  it('gives Halloween a pumpkin moon only when the full moon is within 3 days', () => {
    expect(getCalendarEvent(new Date(2020, 9, 31, 22))).toBe('halloween-pumpkin'); // full moon Oct 31
    expect(getCalendarEvent(new Date(2026, 9, 31, 22))).toBe('halloween-bats'); // full moon Oct 26
    expect(getCalendarEvent(new Date(2026, 9, 30, 22))).toBeNull();
  });

  it('returns christmas on Dec 25-26 only (Santa has Dec 24)', () => {
    for (const day of [23, 24]) expect(getCalendarEvent(new Date(2026, 11, day, 12))).toBeNull();
    for (const day of [25, 26]) expect(getCalendarEvent(new Date(2026, 11, day, 12))).toBe('christmas');
    expect(getCalendarEvent(new Date(2026, 11, 27, 12))).toBeNull();
  });
});

describe('isSantaTime (Christmas Eve)', () => {
  const evening = { sunset: new Date(2026, 11, 24, 16, 30), polar: null };

  it('is true on Dec 24 from sunset to midnight only', () => {
    expect(isSantaTime(new Date(2026, 11, 24, 16, 29), evening)).toBe(false);
    expect(isSantaTime(new Date(2026, 11, 24, 16, 30), evening)).toBe(true);
    expect(isSantaTime(new Date(2026, 11, 24, 23, 59, 59), evening)).toBe(true);
    expect(isSantaTime(new Date(2026, 11, 25, 0, 0), evening)).toBe(false);
    expect(isSantaTime(new Date(2026, 11, 23, 22), { sunset: new Date(2026, 11, 23, 16, 30), polar: null })).toBe(false);
    expect(isSantaTime(new Date(2026, 10, 24, 22), { sunset: new Date(2026, 10, 24, 16, 30), polar: null })).toBe(false);
  });

  it('uses the scene sun times', () => {
    // vitest runs in UTC: in Lindau (47.55 N, 9.68 E) the sun sets at about 15:30 UTC.
    const times = getSunTimes(new Date(2026, 11, 24, 12), 47.55, 9.68);
    expect(isSantaTime(new Date(2026, 11, 24, 15), times)).toBe(false);
    expect(isSantaTime(new Date(2026, 11, 24, 17), times)).toBe(true);
  });

  it('has no Santa in the first hour of Dec 24, when the sun times still hold the Dec 23 sunset', () => {
    // vitest pins TZ=UTC. Lisbon is on UTC in winter, so UTC is its local time. West of the
    // zone meridian, solar midnight comes after 00:00 (here about 00:36), so SunCalc's times
    // for 00:20 belong to the solar day of Dec 23 and hold its sunset.
    const now = new Date(2026, 11, 24, 0, 20);
    const times = getSunTimes(now, 38.72, -9.14);
    expect(times.sunset.getDate()).toBe(23);
    expect(isSantaTime(now, times)).toBe(false);
  });

  it('has no Santa without sun times or at polar day; at polar night he starts at the 18:00 fallback', () => {
    expect(isSantaTime(new Date(2026, 11, 24, 22), null)).toBe(false);
    const polarDay = getSunTimes(new Date(2026, 11, 24, 12), -80, 0);
    expect(polarDay.polar).toBe('day');
    expect(isSantaTime(new Date(2026, 11, 24, 22), polarDay)).toBe(false);
    const polarNight = getSunTimes(new Date(2026, 11, 24, 12), 80, 0);
    expect(polarNight.polar).toBe('night');
    expect(isSantaTime(new Date(2026, 11, 24, 17), polarNight)).toBe(false);
    expect(isSantaTime(new Date(2026, 11, 24, 18), polarNight)).toBe(true);
  });

  it('has no snow on Christmas Eve and snow on Dec 25, every year', () => {
    for (let year = 2026; year <= 2040; year++) {
      expect(getCalendarEvent(new Date(year, 11, 24, 20))).toBeNull();
      expect(getCalendarEvent(new Date(year, 11, 25, 12))).toBe('christmas');
    }
  });
});
