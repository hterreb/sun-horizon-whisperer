import { describe, it, expect } from 'vitest';
import { COOKIES_PER_S, PRESENTS_PER_S, santaCounters, santaLaunchMs } from '@/utils/santaTracker';

// Lookbook 2026-10-09, S7: the playful counters of Santa's tracker card.
describe('santaCounters (lookbook S7)', () => {
  it('starts at 10:00 UTC on Dec 24 of the year', () => {
    expect(new Date(santaLaunchMs(Date.UTC(2026, 11, 24, 20))).toISOString()).toBe('2026-12-24T10:00:00.000Z');
  });

  it('is 0 before 10:00 UTC on Dec 24 (also on any other day before it)', () => {
    expect(santaCounters(Date.UTC(2026, 11, 24, 9, 59, 59))).toEqual({ presents: 0, cookies: 0 });
    expect(santaCounters(Date.UTC(2026, 9, 9, 12))).toEqual({ presents: 0, cookies: 0 });
  });

  it('counts 131 000 presents and 15 200 cookies per second since then', () => {
    expect(PRESENTS_PER_S).toBe(131_000);
    expect(COOKIES_PER_S).toBe(15_200);
    // 19:00 CET = 18:00 UTC: 8 h after the start.
    const seconds = 8 * 3600;
    expect(santaCounters(Date.UTC(2026, 11, 24, 18, 0, 0, 999))).toEqual({ presents: seconds * 131_000, cookies: seconds * 15_200 });
  });

  it('gives the same numbers for the same time, so a reopened card goes on where it was', () => {
    const at = Date.UTC(2026, 11, 24, 21, 30, 12);
    expect(santaCounters(at)).toEqual(santaCounters(at));
    expect(santaCounters(at + 1000).presents - santaCounters(at).presents).toBe(PRESENTS_PER_S);
  });
});
