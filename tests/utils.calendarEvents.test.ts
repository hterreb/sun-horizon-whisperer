import { getCalendarEvent, getSeasonInstant, getSolsticeTraceDates } from '@/utils/calendarEvents';

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

  it('returns christmas on Dec 24-26 only', () => {
    expect(getCalendarEvent(new Date(2026, 11, 23, 12))).toBeNull();
    for (const day of [24, 25, 26]) expect(getCalendarEvent(new Date(2026, 11, day, 12))).toBe('christmas');
    expect(getCalendarEvent(new Date(2026, 11, 27, 12))).toBeNull();
  });
});

describe('getSolsticeTraceDates', () => {
  const iso = (d: Date) => d.toISOString();
  it('gives the other solstice day at the same clock time', () => {
    expect(getSolsticeTraceDates('solstice-longest', new Date(2027, 5, 21, 12)).map(iso)).toEqual(['2027-12-22T12:00:00.000Z']);
    expect(getSolsticeTraceDates('solstice-shortest', new Date(2027, 11, 22, 9)).map(iso)).toEqual(['2027-06-21T09:00:00.000Z']);
  });

  it('gives both solstice days on an equinox', () => {
    expect(getSolsticeTraceDates('equinox', new Date(2027, 2, 20, 12)).map(iso)).toEqual(['2027-06-21T12:00:00.000Z', '2027-12-22T12:00:00.000Z']);
  });

  it('gives none for other events', () => {
    expect(getSolsticeTraceDates(null, new Date(2027, 5, 21, 12))).toEqual([]);
    expect(getSolsticeTraceDates('christmas', new Date(2027, 11, 24, 12))).toEqual([]);
  });
});
