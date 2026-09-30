import { clampTimeOffset, getTimeTravelRange, toDateTimeLocalValue } from '../src/utils/timeTravel';

const now = new Date(2026, 8, 30, 18, 30, 15);
const HOUR = 3_600_000;

describe('getTimeTravelRange (ROADMAP item 44)', () => {
  it('runs from the start of today one year back to the end of today one year ahead', () => {
    const { min, max } = getTimeTravelRange(now);
    expect(min).toEqual(new Date(2025, 8, 30, 0, 0, 0, 0));
    expect(max).toEqual(new Date(2027, 8, 30, 23, 59, 59, 999));
  });

  it('does not change its argument', () => {
    const copy = new Date(now);
    getTimeTravelRange(now);
    expect(now).toEqual(copy);
  });
});

describe('clampTimeOffset (ROADMAP item 44)', () => {
  it('keeps an offset inside the range', () => {
    expect(clampTimeOffset(6 * HOUR, now)).toBe(6 * HOUR);
    expect(clampTimeOffset(-6 * HOUR, now)).toBe(-6 * HOUR);
    expect(clampTimeOffset(0, now)).toBe(0);
  });

  it('limits an offset beyond today ± 1 year to the range edge', () => {
    const { min, max } = getTimeTravelRange(now);
    expect(clampTimeOffset(800 * 24 * HOUR, now)).toBe(max.getTime() - now.getTime());
    expect(clampTimeOffset(-800 * 24 * HOUR, now)).toBe(min.getTime() - now.getTime());
  });
});

describe('toDateTimeLocalValue (ROADMAP item 44)', () => {
  it('gives the local date and time to the minute, zero-padded', () => {
    expect(toDateTimeLocalValue(now)).toBe('2026-09-30T18:30');
    expect(toDateTimeLocalValue(new Date(2027, 0, 5, 7, 4, 59))).toBe('2027-01-05T07:04');
  });
});
