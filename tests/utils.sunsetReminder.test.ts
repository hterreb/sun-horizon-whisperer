import { getReminderTime, getReminderKey, isReminderDue, getReminderText, SUNSET_REMINDER_MIN } from '../src/utils/sunsetReminder';
import { getCountdownTarget } from '../src/utils/sunEvents';

const at = (hms: string) => new Date(`2026-09-30T${hms}+02:00`);
const flat = { sunrise: at('07:22:00'), sunset: at('19:05:49') };
const terrain = { sunrise: at('07:40:00'), sunset: at('18:50:00') };

describe('getReminderTime (ROADMAP item 69)', () => {
  it('is 15 minutes before the line-of-sight sunset when there is one', () => {
    const target = getCountdownTarget(at('12:00:00'), flat, terrain, true);
    expect(SUNSET_REMINDER_MIN).toBe(15);
    expect(getReminderTime(target?.time ?? null)).toEqual(at('18:35:00'));
  });

  it('is 15 minutes before the flat sunset without a line-of-sight sunset', () => {
    const target = getCountdownTarget(at('12:00:00'), flat, null, true);
    expect(getReminderTime(target?.time ?? null)).toEqual(at('18:50:49'));
  });

  it('is the same instant in every time zone, also on a DST change', () => {
    expect(getReminderTime(new Date('2026-06-21T21:30:00+09:00'))).toEqual(new Date('2026-06-21T12:15:00Z'));
    expect(getReminderTime(new Date('2026-06-21T20:30:00-05:00'))).toEqual(new Date('2026-06-22T01:15:00Z'));
    // Europe/Berlin goes from +02:00 to +01:00 at 2026-10-25 03:00 local time.
    expect(getReminderTime(new Date('2026-10-25T03:05:00+01:00'))).toEqual(new Date('2026-10-25T01:50:00Z'));
  });

  it('is null without a sunset (polar day or night)', () => {
    expect(getReminderTime(null)).toBeNull();
    expect(isReminderDue(at('18:40:00'), null, null)).toBe(false);
  });
});

describe('isReminderDue (ROADMAP item 69)', () => {
  const sunset = terrain.sunset;

  it('is false before the reminder time', () => {
    expect(isReminderDue(at('18:34:59'), sunset, null)).toBe(false);
  });

  it('is true from the reminder time until it has passed by 5 minutes', () => {
    expect(isReminderDue(at('18:35:00'), sunset, null)).toBe(true);
    expect(isReminderDue(at('18:39:59'), sunset, null)).toBe(true);
    expect(isReminderDue(at('18:40:00'), sunset, null)).toBe(false);
  });

  it('is false when the reminder for that sunset is shown already', () => {
    expect(isReminderDue(at('18:36:00'), sunset, getReminderKey(sunset))).toBe(false);
    // A later line-of-sight time on the same day is the same sunset.
    expect(isReminderDue(at('18:51:00'), flat.sunset, getReminderKey(sunset))).toBe(false);
    expect(isReminderDue(new Date('2026-10-01T18:36:00+02:00'), new Date('2026-10-01T18:48:00+02:00'), getReminderKey(sunset))).toBe(true);
  });
});

describe('getReminderText (ROADMAP item 69)', () => {
  it('names the lead time and the sunset time', () => {
    expect(getReminderText(terrain.sunset, 'en')).toMatch(/^Sunset in 15 minutes, at \d{2}:\d{2}$/);
    expect(getReminderText(terrain.sunset, 'de')).toMatch(/^Sonnenuntergang in 15 Minuten, um \d{2}:\d{2}$/);
  });
});
