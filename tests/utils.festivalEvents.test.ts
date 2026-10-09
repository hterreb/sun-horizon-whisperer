import {
  FESTIVALS, FESTIVAL_TABLE_YEARS, getFestivalDay, getFestivalSpan, getHanukkahNight, isCarnival, isFestivalEvent,
  isFestivalShown, isMidsummer, parseFestivalOverride, type FestivalEvent,
} from '@/utils/festivalEvents';
import { getCalendarEvent, getEventDaysPerYear } from '@/utils/calendarEvents';

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

// ROADMAP item 118: cultural festival eggs.
describe('festival dates', () => {
  it.each([
    ['loy-krathong', [2026, 11, 24], [2035, 11, 15]],
    ['diwali', [2026, 11, 8], [2035, 10, 30]],
    ['eid-al-fitr', [2027, 3, 9], [2035, 12, 1]],
    ['mid-autumn', [2026, 9, 25], [2035, 9, 16]],
    ['holi', [2026, 3, 4], [2035, 3, 24]],
  ] as [FestivalEvent, number[], number[]][])('%s: the whole day of the table dates, not the day after', (event, first, last) => {
    const [y, m, d] = first;
    expect(getFestivalDay(day(y, m, d, 0))).toBe(event);
    expect(getFestivalDay(day(y, m, d, 23))).toBe(event);
    expect(getFestivalDay(day(last[0], last[1], last[2]))).toBe(event);
    expect(getFestivalDay(day(y, m, d + 1))).not.toBe(event);
  });

  it.each(['loy-krathong', 'diwali', 'eid-al-fitr', 'mid-autumn', 'holi'] as FestivalEvent[])(
    '%s has a date in every table year (%#)', (event) => {
      for (let year = FESTIVAL_TABLE_YEARS.first; year <= FESTIVAL_TABLE_YEARS.last; year++) {
        let found = 0;
        for (let d = day(year, 1, 1); d.getFullYear() === year; d = new Date(year, d.getMonth(), d.getDate() + 1, 12)) {
          if (getFestivalDay(d) === event) found += 1;
        }
        expect(found, `${event} ${year}`).toBeGreaterThanOrEqual(1);
      }
    });

  it('has two Eid al-Fitr days in 2033 (the Islamic year is 11 days shorter)', () => {
    expect(getFestivalDay(day(2033, 1, 3))).toBe('eid-al-fitr');
    expect(getFestivalDay(day(2033, 12, 23))).toBe('eid-al-fitr');
  });

  it('gives Tanabata on July 7 every year', () => {
    expect(getFestivalDay(day(2026, 7, 7))).toBe('tanabata');
    expect(getFestivalDay(day(2031, 7, 7))).toBe('tanabata');
    expect(getFestivalDay(day(2031, 7, 8))).toBeNull();
  });

  it('counts the Hanukkah nights 1 to 8 from the eve of 25 Kislev', () => {
    expect(getHanukkahNight(day(2026, 12, 3))).toBeNull();
    expect(getHanukkahNight(day(2026, 12, 4))).toBe(1);
    expect(getHanukkahNight(day(2026, 12, 8))).toBe(5);
    expect(getHanukkahNight(day(2026, 12, 11))).toBe(8);
    expect(getHanukkahNight(day(2026, 12, 12))).toBeNull();
    // Across the year end.
    expect(getHanukkahNight(day(2027, 12, 31))).toBe(8);
    expect(getHanukkahNight(day(2035, 12, 25))).toBe(1);
  });

  it('puts Carnival on the Thursday to Shrove Tuesday before Lent (Easter - 52 to - 47)', () => {
    // Easter 2028 is April 16: Shrove Tuesday February 29 (leap year), Thursday February 24.
    expect(isCarnival(day(2028, 2, 23))).toBe(false);
    expect(isCarnival(day(2028, 2, 24))).toBe(true);
    expect(isCarnival(day(2028, 2, 29))).toBe(true);
    expect(isCarnival(day(2028, 3, 1))).toBe(false); // Ash Wednesday
    expect(day(2028, 2, 29).getDay()).toBe(2);
  });

  it('puts Midsummer on the Friday of June 19-25 and the Saturday after', () => {
    expect(isMidsummer(day(2027, 6, 25))).toBe(true); // Friday
    expect(isMidsummer(day(2027, 6, 26))).toBe(true); // Saturday
    expect(isMidsummer(day(2027, 6, 18))).toBe(false); // a Friday, too early
    expect(isMidsummer(day(2027, 6, 19))).toBe(false); // the Saturday after it
    expect(isMidsummer(day(2028, 6, 23))).toBe(true);
  });

  it('shows Hanami from March 25 to April 10, only in Japan when the country is known', () => {
    expect(getFestivalSpan(day(2027, 3, 24))).toBeNull();
    expect(getFestivalSpan(day(2027, 3, 25))).toBe('hanami');
    expect(getFestivalSpan(day(2027, 4, 10))).toBe('hanami');
    expect(getFestivalSpan(day(2027, 4, 11))).toBeNull();
    expect(getFestivalSpan(day(2027, 4, 1), 'JP')).toBe('hanami');
    expect(getFestivalSpan(day(2027, 4, 1), 'jp')).toBe('hanami');
    expect(getFestivalSpan(day(2027, 4, 1), 'DE')).toBeNull();
    expect(getFestivalSpan(day(2027, 4, 1), null)).toBe('hanami');
  });

  it('gives Día de los Muertos on November 1 and 2', () => {
    expect(getFestivalSpan(day(2027, 11, 1))).toBe('dia-de-muertos');
    expect(getFestivalSpan(day(2027, 11, 2))).toBe('dia-de-muertos');
    expect(getFestivalSpan(day(2027, 11, 3))).toBeNull();
  });
});

describe('priority in getCalendarEvent', () => {
  it('lets a one-day festival win over the equinox, Halloween and the long festivals', () => {
    expect(getCalendarEvent(day(2026, 3, 20))).toBe('eid-al-fitr'); // also the March equinox
    expect(getCalendarEvent(day(2030, 3, 20))).toBe('holi'); // also the March equinox
    expect(getCalendarEvent(day(2032, 3, 27))).toBe('holi'); // inside Hanami
    expect(getCalendarEvent(day(2032, 11, 2))).toBe('diwali'); // Día de los Muertos day 2
    expect(getCalendarEvent(day(2028, 11, 2))).toBe('loy-krathong'); // Día de los Muertos day 2
  });

  it('lets Lunar New Year win over Carnival, and Christmas over Hanukkah', () => {
    expect(getCalendarEvent(day(2027, 2, 6))).toBe('lunar-new-year');
    expect(getCalendarEvent(day(2027, 2, 7))).toBe('carnival');
    expect(getCalendarEvent(day(2027, 12, 25))).toBe('christmas');
    expect(getCalendarEvent(day(2027, 12, 27))).toBe('hanukkah');
  });

  it('lets the solstice win over Midsummer on the same day', () => {
    // 2029: the June solstice is on Thursday June 21; Midsummer Eve is Friday June 22.
    expect(getCalendarEvent(day(2029, 6, 21), 59.3)).toBe('solstice-longest');
    expect(getCalendarEvent(day(2029, 6, 22), 59.3)).toBe('midsummer');
    // 2030: the solstice is on Friday June 21, the Midsummer Eve; Saturday is Midsummer.
    expect(getCalendarEvent(day(2030, 6, 21), 59.3)).toBe('solstice-longest');
    expect(getCalendarEvent(day(2030, 6, 22), 59.3)).toBe('midsummer');
  });

  it('makes the March equinox Nowruz and leaves the September one the equinox', () => {
    expect(getCalendarEvent(day(2027, 3, 20))).toBe('nowruz');
    expect(getCalendarEvent(day(2027, 9, 23))).toBe('equinox');
  });

  it('passes the country to Hanami', () => {
    expect(getCalendarEvent(day(2027, 4, 2), 35.7, 'JP')).toBe('hanami');
    expect(getCalendarEvent(day(2027, 4, 2), 47.8, 'DE')).toBeNull();
  });

  it('counts the days a year from the rules (item 113 chance text)', () => {
    expect(getEventDaysPerYear('tanabata')).toBe(1);
    expect(getEventDaysPerYear('nowruz')).toBeCloseTo(8 / 9); // Holi wins on March 20, 2030
    expect(getEventDaysPerYear('hanami')).toBeGreaterThan(15);
  });
});

describe('festival helpers', () => {
  it('reads ?egg=<kind> in any case, and only festival kinds', () => {
    expect(parseFestivalOverride('?egg=diwali')).toBe('diwali');
    expect(parseFestivalOverride('?egg=loyKrathong')).toBe('loy-krathong');
    expect(parseFestivalOverride('?egg=EIDALFITR')).toBe('eid-al-fitr');
    expect(parseFestivalOverride('?egg=dragon')).toBeNull();
    expect(parseFestivalOverride('')).toBeNull();
    for (const [event, kind] of Object.entries(FESTIVALS)) expect(parseFestivalOverride(`?egg=${kind}`)).toBe(event);
  });

  it('knows the festival events', () => {
    expect(isFestivalEvent('holi')).toBe(true);
    expect(isFestivalEvent('christmas')).toBe(false);
    expect(isFestivalEvent(null)).toBe(false);
  });

  it('shows each festival only when the scene draws it', () => {
    const night = { timeOfDay: 'night' as const, weatherType: 'clear', reducedMotion: false };
    const day = { ...night, timeOfDay: 'midday' as const };
    expect(isFestivalShown('diwali', night)).toBe(true);
    expect(isFestivalShown('diwali', day)).toBe(false);
    expect(isFestivalShown('diwali', { ...night, reducedMotion: true })).toBe(true); // static lamps
    expect(isFestivalShown('midsummer', { ...night, timeOfDay: 'civil-twilight' })).toBe(true);
    expect(isFestivalShown('midsummer', day)).toBe(false);
    expect(isFestivalShown('hanami', day)).toBe(true);
    expect(isFestivalShown('hanami', { ...day, reducedMotion: true })).toBe(false);
    expect(isFestivalShown('carnival', night)).toBe(false);
    expect(isFestivalShown('holi', day)).toBe(false); // no clouds to tint
    expect(isFestivalShown('holi', { ...day, weatherType: 'partly' })).toBe(true);
    expect(isFestivalShown('eid-al-fitr', day)).toBe(true);
    expect(isFestivalShown('nowruz', day)).toBe(true);
    expect(isFestivalShown('dia-de-muertos', day)).toBe(true);
  });
});
