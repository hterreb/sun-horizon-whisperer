import { describe, it, expect } from 'vitest';
import {
  APRIL_FOOLS_DELAY_MS, APRIL_FOOLS_FADE_MS, APRIL_FOOLS_HOLD_MS, NO_PATIENT_WATCH, PATIENT_MAX_GAP_MS,
  advancePatientWatch, getAprilFoolsPhase, getEasterSunday, getPlayfulOverride, getPotOfGoldX, isEasterMorning,
  isEasterSunday, type PatientWatch,
} from '@/utils/playfulEggs';
import { getCalendarEvent, getEventDaysPerYear } from '@/utils/calendarEvents';
import { BADGES, badgeForCalendarEvent, badgeForPlayfulEgg } from '@/utils/collection';
import { getHeartGliderId, type CloudGlider, type SkyCloud } from '@/utils/skyCloudUtils';
import { type CloudType } from '@/utils/cloudShapes';

// vitest pins TZ=UTC, so local dates below are UTC dates.
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('getEasterSunday (ROADMAP item 117)', () => {
  it('gives the known Easter Sundays', () => {
    expect(iso(getEasterSunday(2026))).toBe('2026-04-05');
    expect(iso(getEasterSunday(2027))).toBe('2027-03-28');
    expect(iso(getEasterSunday(2028))).toBe('2028-04-16');
    expect(iso(getEasterSunday(2029))).toBe('2029-04-01');
    expect(iso(getEasterSunday(2038))).toBe('2038-04-25'); // the latest possible date
    expect(iso(getEasterSunday(2285))).toBe('2285-03-22'); // the earliest possible date
  });

  it('is always a Sunday at local midnight', () => {
    for (let year = 2026; year <= 2060; year++) {
      const easter = getEasterSunday(year);
      expect(easter.getDay(), String(year)).toBe(0);
      expect(easter.getHours()).toBe(0);
    }
  });

  it('knows the whole day', () => {
    expect(isEasterSunday(new Date(2026, 3, 5, 0, 0))).toBe(true);
    expect(isEasterSunday(new Date(2026, 3, 5, 23, 59))).toBe(true);
    expect(isEasterSunday(new Date(2026, 3, 6, 0, 0))).toBe(false);
  });
});

describe('isEasterMorning', () => {
  const times = { sunrise: new Date(2026, 3, 5, 5, 40), polar: null };
  it('is on from the sunrise until 12:00', () => {
    expect(isEasterMorning(new Date(2026, 3, 5, 5, 39), times)).toBe(false);
    expect(isEasterMorning(new Date(2026, 3, 5, 5, 40), times)).toBe(true);
    expect(isEasterMorning(new Date(2026, 3, 5, 11, 59), times)).toBe(true);
    expect(isEasterMorning(new Date(2026, 3, 5, 12, 0), times)).toBe(false);
  });

  it('is off on other days, without sun times, and when the sunrise is of another day', () => {
    expect(isEasterMorning(new Date(2026, 3, 6, 8), { sunrise: new Date(2026, 3, 6, 5, 38), polar: null })).toBe(false);
    expect(isEasterMorning(new Date(2026, 3, 5, 8), null)).toBe(false);
    expect(isEasterMorning(new Date(2026, 3, 5, 8), { sunrise: new Date(2026, 3, 4, 5, 42), polar: null })).toBe(false);
  });

  it('is on from 00:00 at polar day and off at polar night', () => {
    expect(isEasterMorning(new Date(2026, 3, 5, 1), { sunrise: new Date(2026, 3, 5, 6), polar: 'day' })).toBe(true);
    expect(isEasterMorning(new Date(2026, 3, 5, 9), { sunrise: new Date(2026, 3, 5, 6), polar: 'night' })).toBe(false);
  });
});

describe('playful calendar days', () => {
  it('gives each day its event', () => {
    expect(getCalendarEvent(new Date(2027, 1, 14, 12))).toBe('valentine');
    expect(getCalendarEvent(new Date(2027, 2, 17, 12))).toBe('st-patrick');
    expect(getCalendarEvent(new Date(2027, 3, 1, 12))).toBe('april-fools');
    expect(getCalendarEvent(new Date(2027, 2, 28, 7))).toBe('easter');
    expect(getCalendarEvent(new Date(2027, 2, 29, 7))).toBeNull(); // Easter Monday
    expect(getCalendarEvent(new Date(2027, 1, 15, 12))).toBeNull();
  });

  it('lets Easter win over April Fools', () => {
    expect(getCalendarEvent(new Date(2029, 3, 1, 9))).toBe('easter');
  });

  it('gives each day 1 day a year (the egg cards)', () => {
    expect(getEventDaysPerYear('easter')).toBe(1);
    expect(getEventDaysPerYear('valentine')).toBe(1);
    expect(getEventDaysPerYear('st-patrick')).toBe(1);
  });

  it('reads the test override', () => {
    expect(getPlayfulOverride('?egg=aprilFools')).toBe('aprilFools');
    expect(getPlayfulOverride('?egg=easter')).toBe('easter');
    expect(getPlayfulOverride('?egg=valentine')).toBe('valentine');
    expect(getPlayfulOverride('?egg=stPatrick')).toBe('stPatrick');
    expect(getPlayfulOverride('?egg=ufo')).toBeNull();
    expect(getPlayfulOverride('')).toBeNull();
  });
});

describe('getAprilFoolsPhase', () => {
  const F = APRIL_FOOLS_FADE_MS;
  const D = APRIL_FOOLS_DELAY_MS;
  const H = APRIL_FOOLS_HOLD_MS;
  it('waits, fades out, holds the swap for one minute, fades back and returns', () => {
    expect(getAprilFoolsPhase(0)).toEqual({ phase: 'wait', leftMs: D });
    expect(getAprilFoolsPhase(D).phase).toBe('fadeOut');
    expect(getAprilFoolsPhase(D + F).phase).toBe('swapped');
    expect(getAprilFoolsPhase(D + F + H - 1).phase).toBe('swapped');
    expect(getAprilFoolsPhase(D + F + H).phase).toBe('fadeBack');
    expect(getAprilFoolsPhase(D + 2 * F + H).phase).toBe('return');
    expect(getAprilFoolsPhase(D + 3 * F + H)).toEqual({ phase: 'done', leftMs: Infinity });
    expect(H).toBe(60_000);
    expect(F).toBeGreaterThanOrEqual(2_000); // a slow cross-fade, not a jump
  });
});

describe('getPotOfGoldX', () => {
  const rainbow = { visible: true, xFraction: 0.5, apexHeightDeg: 21 };
  it('puts the pot at the right end on the horizon (radius = apex / 42 × horizonY × 0.95)', () => {
    // radius = 0.5 × 500 × 0.95 = 237.5
    expect(getPotOfGoldX(rainbow, 1000, 500)).toBeCloseTo(737.5);
  });

  it('takes the left end when the right end is off the screen, else none', () => {
    expect(getPotOfGoldX({ ...rainbow, xFraction: 0.9 }, 1000, 500)).toBeCloseTo(662.5);
    expect(getPotOfGoldX({ ...rainbow, apexHeightDeg: 42 }, 300, 500)).toBeNull();
  });

  it('gives no pot without a rainbow', () => {
    expect(getPotOfGoldX({ ...rainbow, visible: false }, 1000, 500)).toBeNull();
    expect(getPotOfGoldX({ ...rainbow, apexHeightDeg: 0 }, 1000, 500)).toBeNull();
  });
});

describe('advancePatientWatch', () => {
  const sunset = Date.UTC(2026, 9, 9, 17, 0);
  const min = 60_000;
  // A check every 30 s from `from` to `to` (minutes from the sunset), visible unless hidden.
  const run = (from: number, to: number, hidden: (m: number) => boolean = () => false, start: PatientWatch = NO_PATIENT_WATCH) => {
    let watch = start;
    let earned = false;
    for (let m = from; m <= to; m += 0.5) {
      const step = advancePatientWatch(watch, sunset + m * min, !hidden(m), sunset);
      watch = step.watch;
      earned = earned || step.earned;
    }
    return { watch, earned };
  };

  it('earns the badge from 2 min before to 10 min after the sunset without a break', () => {
    expect(run(-2, 10).earned).toBe(true);
    expect(run(-30, 15).earned).toBe(true);
  });

  it('does not earn it when the watch starts late or ends early', () => {
    expect(run(-1.5, 15).earned).toBe(false);
    expect(run(-5, 9.5).earned).toBe(false);
  });

  it('starts again after the page was hidden', () => {
    expect(run(-5, 15, m => m === 3).earned).toBe(false);
  });

  it('starts again after a gap between two checks (a frozen page)', () => {
    let { watch } = run(-5, 1);
    const late = advancePatientWatch(watch, sunset + 1 * min + PATIENT_MAX_GAP_MS + 1, true, sunset);
    watch = late.watch;
    expect(watch.since).toBe(sunset + 1 * min + PATIENT_MAX_GAP_MS + 1);
    expect(run(3, 15, undefined, watch).earned).toBe(false);
  });

  it('earns nothing without a sunset (polar day or night)', () => {
    expect(advancePatientWatch({ since: sunset - 10 * min, last: sunset + 10 * min - 1000 }, sunset + 10 * min, true, null))
      .toEqual({ watch: NO_PATIENT_WATCH, earned: false });
  });
});

describe('playful badges (collection)', () => {
  it('has an ultra rare egg badge for each playful egg', () => {
    for (const kind of ['aprilFools', 'easter', 'valentine', 'stPatrick', 'patientWatcher']) {
      const badge = BADGES.find(b => b.id === `egg:${kind}`);
      expect(badge, kind).toMatchObject({ group: 'egg', rarity: 'rarity.ultraRare', name: `egg.${kind}` });
    }
  });

  it('collects where the scene shows the egg, not from the calendar day alone', () => {
    const o = { isNight: false, moonUp: false, weatherType: 'clear', reducedMotion: false, isTimePreview: false };
    for (const event of ['easter', 'april-fools', 'valentine', 'st-patrick'] as const) {
      expect(badgeForCalendarEvent(event, o), event).toBeNull();
    }
    expect(badgeForPlayfulEgg('easter', false)).toBe('egg:easter');
    expect(badgeForPlayfulEgg('patientWatcher', false)).toBe('egg:patientWatcher');
    expect(badgeForPlayfulEgg('valentine', true)).toBeNull(); // never in a time preview
  });
});

describe('getHeartGliderId (Valentine heart cloud)', () => {
  const cloud = (type: CloudType): SkyCloud => ({
    type, variant: 0, band: 'low', x: 0, y: 100, scale: 1, opacity: 1, depth: 0.5, tint: 0, shafts: false, shadow: false,
  });
  const glider = (id: string, ...types: CloudType[]): CloudGlider => ({
    id, z: 3, clouds: types.map(cloud), from: 0, to: 100, durationSec: 100, delaySec: 0, speed: 1,
  });

  it('picks the first single cumulus-like cloud, not a row tile or a cirrus', () => {
    expect(getHeartGliderId([glider('a', 'Ci'), glider('b', 'Sc', 'Sc'), glider('c', 'Cu'), glider('d', 'Ac')])).toBe('c');
    expect(getHeartGliderId([glider('a', 'Ci'), glider('b', 'St', 'St')])).toBeNull();
    expect(getHeartGliderId([])).toBeNull();
  });
});
