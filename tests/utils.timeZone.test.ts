import { describe, it, expect } from 'vitest';
import { fromWallTime, isValidTimeZone, placeClockDifferenceMinutes, startOfDayIn, wallTime, zoneOffsetMinutes } from '../src/utils/timeZone';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../src/utils/timeTravel';
import { formatTime } from '../src/utils/sunUtils';
import { getMoonTimes } from '../src/utils/moonUtils';

// The tests run with TZ=UTC (vitest.config.ts), so the device's zone is UTC.
describe('timeZone (ROADMAP item 169)', () => {
  const OCT_19_NOON_UTC = new Date('2026-10-19T12:00:00Z');

  it('knows real zone names and rejects junk', () => {
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });

  it('gives the clock fields and the offset of a zone, with daylight saving', () => {
    expect(wallTime(OCT_19_NOON_UTC, 'America/New_York')).toEqual({ year: 2026, month: 10, day: 19, hour: 8, minute: 0 });
    expect(zoneOffsetMinutes(OCT_19_NOON_UTC, 'America/New_York')).toBe(-240);
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-300);
    expect(zoneOffsetMinutes(OCT_19_NOON_UTC, 'Asia/Kolkata')).toBe(330);
    expect(zoneOffsetMinutes(OCT_19_NOON_UTC)).toBe(0);
  });

  it('turns a wall time back into the moment, also on the day of a daylight-saving change', () => {
    const wall = { year: 2026, month: 3, day: 8, hour: 12, minute: 30 }; // New York switches to EDT at 02:00
    expect(fromWallTime(wall, 'America/New_York').toISOString()).toBe('2026-03-08T16:30:00.000Z');
    expect(fromWallTime({ ...wall, hour: 1 }, 'America/New_York').toISOString()).toBe('2026-03-08T06:30:00.000Z');
  });

  it('finds the start of the place\'s day', () => {
    // 02:00 UTC on 19 Oct is still 18 Oct, 22:00 in New York.
    expect(startOfDayIn(new Date('2026-10-19T02:00:00Z'), 'America/New_York').toISOString()).toBe('2026-10-18T04:00:00.000Z');
    expect(startOfDayIn(new Date('2026-10-19T02:00:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z');
  });

  it('gives the place\'s clock against the device\'s', () => {
    expect(placeClockDifferenceMinutes(OCT_19_NOON_UTC, 'America/New_York')).toBe(-240);
    expect(placeClockDifferenceMinutes(OCT_19_NOON_UTC, 'Asia/Kolkata')).toBe(330);
    expect(placeClockDifferenceMinutes(OCT_19_NOON_UTC)).toBe(0);
  });

  it('shows and reads the time travel field in the place\'s clock', () => {
    expect(toDateTimeLocalValue(OCT_19_NOON_UTC, 'America/New_York')).toBe('2026-10-19T08:00');
    expect(fromDateTimeLocalValue('2026-10-19T08:00', 'America/New_York')?.toISOString()).toBe(OCT_19_NOON_UTC.toISOString());
    expect(toDateTimeLocalValue(OCT_19_NOON_UTC)).toBe('2026-10-19T12:00');
    expect(fromDateTimeLocalValue('junk', 'America/New_York')).toBeNull();
  });

  it('formats a clock time in the place\'s zone', () => {
    expect(formatTime(OCT_19_NOON_UTC, 'en', 'America/New_York')).toBe('08:00');
    expect(formatTime(OCT_19_NOON_UTC, 'en')).toBe('12:00');
  });

  it('looks for moonrise and moonset in the place\'s day', () => {
    // New York, 02:00 UTC on 19 Oct = the evening of 18 Oct there.
    const times = getMoonTimes(new Date('2026-10-19T02:00:00Z'), 40.71, -74.01, 'America/New_York');
    const dayStart = Date.parse('2026-10-18T04:00:00Z');
    for (const time of [times.rise, times.set]) {
      if (time) {
        expect(time.getTime()).toBeGreaterThanOrEqual(dayStart);
        expect(time.getTime()).toBeLessThan(dayStart + 24 * 3600_000);
      }
    }
    expect(times.rise ?? times.set).not.toBeNull();
  });
});
