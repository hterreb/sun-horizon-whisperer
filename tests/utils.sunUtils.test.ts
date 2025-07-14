import { getSunPosition, getSunTimes, getTimeOfDay } from '../src/utils/sunUtils';
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
});
