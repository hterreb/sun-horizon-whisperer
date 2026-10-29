import {
  addTurningPointDay, getDaylight, getHorizonCalendar, getNextTurningPoint, getPolarCountdown, getTurningPointMonth,
  getYearDaylight, isFullCircle, loadHorizonCalendar, loadTurningPointDays, saveHorizonCalendar, saveTurningPointDays,
  turningPointOf,
} from '@/utils/turningPoints';
import { type HorizonProfile } from '@/utils/horizonUtils';

// ROADMAP item 186. vitest pins TZ=UTC: the device clock is UTC.
const RAVENSBURG = { lat: 47.78, lon: 9.61, tz: 'Europe/Berlin' };
const SYDNEY = { lat: -33.87, lon: 151.21, tz: 'Australia/Sydney' };
const TROMSO = { lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' };
const OCT_28 = new Date('2026-10-28T11:00:00Z');
const flatRidge = (degrees: number): HorizonProfile => ({ angles: Array(360).fill(degrees), observerElevation: 450, eyeHeight: 1.7 });

describe('turningPointOf', () => {
  it('names the turning points by hemisphere', () => {
    expect([2, 5, 8, 11].map((m) => turningPointOf(m as 2, 47))).toEqual(['springEquinox', 'midsummer', 'autumnEquinox', 'midwinter']);
    expect([2, 5, 8, 11].map((m) => turningPointOf(m as 2, -33))).toEqual(['autumnEquinox', 'midwinter', 'springEquinox', 'midsummer']);
  });
});

describe('getNextTurningPoint', () => {
  it('counts the days to the next turning point in the place time zone', () => {
    expect(getNextTurningPoint(OCT_28, RAVENSBURG.lat, RAVENSBURG.tz)).toMatchObject({ point: 'midwinter', month: 11, days: 54 });
    // 2026-12-21 20:50 UTC is 22 Dec in Sydney: midsummer there.
    expect(getNextTurningPoint(OCT_28, SYDNEY.lat, SYDNEY.tz)).toMatchObject({ point: 'midsummer', days: 55 });
  });

  it('is 0 on the day and uses the place day, not the UTC day', () => {
    const noonUtc = new Date('2026-12-21T12:00:00Z');
    expect(getNextTurningPoint(noonUtc, RAVENSBURG.lat, RAVENSBURG.tz).days).toBe(0);
    // In Tokyo the instant is on 22 Dec 05:50, and noon UTC is 21 Dec 21:00.
    expect(getNextTurningPoint(noonUtc, 35.68, 'Asia/Tokyo').days).toBe(1);
  });
});

describe('getDaylight', () => {
  it('gives the daylight, its change since yesterday and the sparkline', () => {
    const day = getDaylight(OCT_28, RAVENSBURG.lat, RAVENSBURG.lon, RAVENSBURG.tz);
    expect(day.seconds / 3600).toBeGreaterThan(10);
    expect(day.seconds / 3600).toBeLessThan(10.4);
    expect(day.change).toBeLessThan(-150);
    expect(day.change).toBeGreaterThan(-210);
    expect(day.spark).toHaveLength(91);
    expect(day.spark[45]).toBe(day.seconds);
    expect(day.longest / 3600).toBeGreaterThan(15.8);
    expect(day.longest / 3600).toBeLessThan(16.2);
    expect(day.solstice).toEqual({ days: 54, longer: false });
    expect(day.polar).toBeNull();
    expect(day.ridge).toBeNull();
  });

  it('gets longer in the south in October', () => {
    const day = getDaylight(OCT_28, SYDNEY.lat, SYDNEY.lon, SYDNEY.tz);
    expect(day.change).toBeGreaterThan(0);
    expect(day.solstice.longer).toBe(true);
  });

  it('gives the daylight behind the ridge once a week (X1)', () => {
    const day = getDaylight(OCT_28, RAVENSBURG.lat, RAVENSBURG.lon, RAVENSBURG.tz, flatRidge(5));
    expect(day.ridge?.spark.map((s) => s.offset)).toEqual([-42, -35, -28, -21, -14, -7, 0, 7, 14, 21, 28, 35, 42]);
    expect(day.ridge!.seconds).toBeLessThan(day.seconds - 1800);
    expect(day.ridge!.seconds).toBeGreaterThan(day.seconds - 7200);
  });

  it('reads a polar night as 0', () => {
    const day = getDaylight(new Date('2026-12-21T11:00:00Z'), TROMSO.lat, TROMSO.lon, TROMSO.tz);
    expect(day).toMatchObject({ seconds: 0, polar: 'night' });
  });
});

describe('getYearDaylight', () => {
  it('has one flat value a day, one ridge value a week and the index of today', () => {
    const year = getYearDaylight(OCT_28, RAVENSBURG.lat, RAVENSBURG.lon, RAVENSBURG.tz, flatRidge(3));
    expect(year.flat).toHaveLength(365);
    expect(year.today).toBe(300);
    expect(year.ridge).toHaveLength(53);
    expect(year.ridge?.[1].index).toBe(7);
    expect(getYearDaylight(OCT_28, RAVENSBURG.lat, RAVENSBURG.lon, RAVENSBURG.tz).ridge).toBeNull();
  });
});

describe('getHorizonCalendar', () => {
  it('marks the three sunset points and one dot a week', () => {
    const cal = getHorizonCalendar(OCT_28, RAVENSBURG.lat, RAVENSBURG.lon, RAVENSBURG.tz);
    expect(cal.marks.map((m) => m.point)).toEqual(['midsummer', 'autumnEquinox', 'midwinter']);
    const [summer, equinox, winter] = cal.marks.map((m) => m.azimuth);
    expect(summer).toBeGreaterThan(300);
    expect(summer).toBeLessThan(310);
    expect(Math.abs(equinox - 270)).toBeLessThan(3);
    expect(winter).toBeGreaterThan(230);
    expect(winter).toBeLessThan(240);
    expect(cal.dots).toHaveLength(52);
    expect(cal.dots.filter((d) => d.ahead)).toHaveLength(26);
    expect(cal.today).toBeGreaterThan(winter);
    expect(cal.today).toBeLessThan(equinox);
  });

  it('has no mark and no dot on a day without a sunset', () => {
    const cal = getHorizonCalendar(OCT_28, TROMSO.lat, TROMSO.lon, TROMSO.tz);
    expect(cal.marks.map((m) => m.point)).toEqual(['autumnEquinox']);
    expect(cal.dots.length).toBeLessThan(45);
  });
});

describe('getPolarCountdown', () => {
  it('is null where the sun rises and sets every day', () => {
    expect(getPolarCountdown(OCT_28, RAVENSBURG.lat, RAVENSBURG.lon, RAVENSBURG.tz)).toBeNull();
    expect(getPolarCountdown(OCT_28, 65.2, 25, 'Europe/Helsinki')).toBeNull();
  });

  it('counts down to the last sunset before the polar night', () => {
    const polar = getPolarCountdown(OCT_28, TROMSO.lat, TROMSO.lon, TROMSO.tz)!;
    expect(polar.next.event).toBe('lastSunset');
    expect(polar.next.days).toBeGreaterThan(20);
    expect(polar.next.days).toBeLessThan(35);
    expect(polar.next.at?.getUTCMonth()).toBe(10);
    expect(polar.night!.days).toBeGreaterThan(40);
    expect(polar.night!.days).toBeLessThan(60);
    expect(polar.day!.days).toBeGreaterThan(55);
    expect(polar.day!.days).toBeLessThan(80);
    expect(polar.day!.first.getUTCMonth()).toBe(4);
  });

  it('in the polar night: the day the sun is back, and the whole night', () => {
    const now = new Date('2026-12-15T11:00:00Z');
    const polar = getPolarCountdown(now, TROMSO.lat, TROMSO.lon, TROMSO.tz)!;
    expect(polar.next.event).toBe('sunBack');
    expect(polar.night!.first.getTime()).toBeLessThan(now.getTime());
    expect(polar.night!.last.getTime()).toBeGreaterThan(now.getTime());
    expect(polar.night!.days).toBeGreaterThan(40);
  });

  it('in the midnight sun: the day the sun sets again', () => {
    const polar = getPolarCountdown(new Date('2027-06-21T11:00:00Z'), TROMSO.lat, TROMSO.lon, TROMSO.tz)!;
    expect(polar.next.event).toBe('midnightSunEnd');
    expect(polar.next.at).not.toBeNull();
  });
});

describe('Full circle (X2)', () => {
  beforeEach(() => localStorage.clear());

  it('finds the turning point of a day by the device clock', () => {
    expect(getTurningPointMonth(new Date(2026, 11, 21, 12))).toBe(11);
    expect(getTurningPointMonth(new Date(2026, 2, 20, 23))).toBe(2);
    expect(getTurningPointMonth(new Date(2026, 11, 22, 12))).toBeNull();
  });

  it('adds a turning-point day once', () => {
    const days = addTurningPointDay({}, new Date(2026, 11, 21, 9));
    expect(days).toEqual({ 11: '2026-12-21' });
    expect(addTurningPointDay(days!, new Date(2026, 11, 21, 18))).toBeNull();
    expect(addTurningPointDay({}, new Date(2026, 9, 28))).toBeNull();
  });

  it('needs all four turning points within 365 days', () => {
    const year = { 2: '2026-03-20', 5: '2026-06-21', 8: '2026-09-23', 11: '2026-12-21' } as const;
    expect(isFullCircle(year)).toBe(true);
    expect(isFullCircle({ ...year, 2: '2027-03-20' })).toBe(true);
    expect(isFullCircle({ ...year, 2: '2025-03-20' })).toBe(false);
    expect(isFullCircle({ 5: year[5], 8: year[8], 11: year[11] })).toBe(false);
  });

  it('saves the days and drops junk', () => {
    saveTurningPointDays({ 5: '2026-06-21' });
    expect(loadTurningPointDays()).toEqual({ 5: '2026-06-21' });
    localStorage.setItem('turning-point-days', JSON.stringify({ 5: 'soon', 7: '2026-07-01', 11: '2026-12-21' }));
    expect(loadTurningPointDays()).toEqual({ 11: '2026-12-21' });
    localStorage.setItem('turning-point-days', '[');
    expect(loadTurningPointDays()).toEqual({});
  });
});

describe('horizon calendar switch (Y4)', () => {
  beforeEach(() => localStorage.clear());

  it('is off at the start and keeps the choice', () => {
    expect(loadHorizonCalendar()).toBe(false);
    saveHorizonCalendar(true);
    expect(loadHorizonCalendar()).toBe(true);
    saveHorizonCalendar(false);
    expect(loadHorizonCalendar()).toBe(false);
  });
});
