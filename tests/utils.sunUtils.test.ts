import { getSunPosition, getSunTimes, getTimeOfDay, getRelevantTwilightTimes } from '../src/utils/sunUtils';
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
});
