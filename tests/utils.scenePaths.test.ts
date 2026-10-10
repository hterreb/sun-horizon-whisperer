import { findLane, firstMeeting, getSceneTime, setSceneRate, warpPath, xAt, LIVE_SCENE_CLOCK, type LaneCandidate, type ScenePath } from '../src/utils/scenePaths';
import { getRestStopMotion } from '../src/utils/weatherEffectsUtils';

// A glide at 1 % of the width per second, from x -5 to 101, 5 % wide and 4 % high.
const glide = (start: number, y: number, extra: Partial<ScenePath> = {}): ScenePath =>
  ({ start, duration: 106, x: -5, dx: 106, width: 5, y, height: 4, ...extra });
// A square scene, so the margin (25 % of the smaller height) is 1 % across and down.
const candidate = (y: number, extra: Partial<LaneCandidate> = {}): LaneCandidate =>
  ({ ...glide(0, y), band: [60, 90], view: { width: 800, height: 800 }, ...extra });

describe('xAt (ROADMAP item 92)', () => {
  it('moves a glide straight from its start to its end', () => {
    const path = glide(10, 70);
    expect(xAt(path, 10)).toBeCloseTo(-5, 10);
    expect(xAt(path, 60)).toBeCloseTo(45, 10);
    expect(xAt(path, 116)).toBeCloseTo(101, 10);
  });

  it('keeps the start before the crossing and the end after it, like the CSS animation', () => {
    const path = glide(10, 70);
    expect(xAt(path, 0)).toBe(-5);
    expect(xAt(path, 500)).toBe(101);
  });

  it('works for a crossing that started in the past (a warm start, item 93)', () => {
    // Started 40 s before now (a negative animation-delay of -40 s): 40 % of the width on, at 1 %/s.
    expect(xAt(glide(-40, 70), 0)).toBeCloseTo(-5 + 40, 10);
  });

  it('follows the rest-stop curve: cruise, slow down, hold still, speed up (P8)', () => {
    // 1 %/s, stop with 50 % behind it, hold 6 s: slow down from 48.5 s, still from 51.5 s to 57.5 s.
    const rest = getRestStopMotion(106, 1, 50, 6);
    const path = glide(0, 70, { duration: rest.duration, curve: rest.curve });
    expect(xAt(path, 20)).toBeCloseTo(-5 + 20, 6);
    expect(xAt(path, 51.5)).toBeCloseTo(-5 + 50, 6);
    expect(xAt(path, 54)).toBeCloseTo(-5 + 50, 6);
    expect(xAt(path, 57.5)).toBeCloseTo(-5 + 50, 6);
    expect(xAt(path, 50)).toBeLessThan(-5 + 50);
    expect(xAt(path, rest.duration)).toBeCloseTo(101, 6);
    // The curve is the CSS easing: its first point holds still at 51.5 s.
    expect(rest.easing).toContain(`${(50 / 106).toFixed(4)} ${((51.5 / rest.duration) * 100).toFixed(2)}%`);
  });
});

describe('warpPath (ROADMAP item 122)', () => {
  // A glide at 1 %/s that starts at 10 s; the change starts at 40 s and takes 3 s.
  const path = glide(10, 70);

  it('keeps the place until the change, then moves k times as fast', () => {
    const fast = warpPath(path, 40, 3, 2);
    for (const t of [10, 25, 40]) expect(xAt(fast, t)).toBeCloseTo(xAt(path, t), 6);
    // The speed goes evenly from 1 to 2 in 3 s: 4.5 % in the change, then 2 %/s.
    expect(xAt(fast, 43)).toBeCloseTo(-5 + 30 + 4.5, 2);
    expect(xAt(fast, 53) - xAt(fast, 43)).toBeCloseTo(20, 6);
    // The rest of the way (106 - 34.5 = 71.5 %) at 2 %/s from 43 s.
    expect(fast.start + fast.duration).toBeCloseTo(43 + 71.5 / 2, 6);
    expect(xAt(fast, fast.start + fast.duration)).toBeCloseTo(101, 6);
  });

  it('is slower and longer for a farther lane (k < 1)', () => {
    const slow = warpPath(path, 40, 3, 0.5);
    expect(xAt(slow, 40)).toBeCloseTo(xAt(path, 40), 6);
    expect(xAt(slow, 53) - xAt(slow, 43)).toBeCloseTo(5, 6);
    expect(slow.duration).toBeGreaterThan(path.duration);
  });

  it('keeps a rest stop, at the new speed (P8)', () => {
    const rest = getRestStopMotion(106, 1, 50, 6);
    const stop = glide(0, 70, { duration: rest.duration, curve: rest.curve });
    const fast = warpPath(stop, 20, 3, 2);
    expect(xAt(fast, 20)).toBeCloseTo(xAt(stop, 20), 6);
    // It still stops at 50 % on, and leaves at the end.
    const still = fast.curve!.filter(([, s], i, c) => i > 0 && s === c[i - 1][1]);
    expect(still.length).toBeGreaterThan(0);
    expect(xAt(fast, fast.duration)).toBeCloseTo(101, 6);
  });

  it('changes nothing for k = 1 or a change after the end', () => {
    expect(warpPath(path, 40, 3, 1)).toBe(path);
    expect(warpPath(path, 500, 3, 2)).toBe(path);
  });
});

describe('findLane (ROADMAP item 92)', () => {
  it('keeps the random pick when no other box comes near', () => {
    // Another fish at the same height, but 20 s ahead at the same speed: they never meet.
    expect(findLane(candidate(70), [glide(-20, 70)], 0)).toBe(70);
  });

  it('gives the nearest free height, in quarter-height steps, when a slower fish swims ahead', () => {
    // 10 % ahead at 0.5 %/s: the new fish catches up with it at the same height.
    const slow = glide(-20, 70, { duration: 212 });
    const y = findLane(candidate(70), [slow], 0) as number;
    // Free from 70 + 4 + 1 (its height and the margin) down, or 70 - 4 - 1 up: 5 % = 5 steps of 1 %.
    expect(Math.abs(y - 70)).toBeCloseTo(5, 10);
    expect(y).toBe(75);
  });

  it('gives null when the whole band is taken', () => {
    const wall = glide(-20, 60, { duration: 212, height: 30 });
    expect(findLane(candidate(70), [wall], 0)).toBeNull();
  });

  it('stays inside the band', () => {
    // The band ends at 72, so the free height above the slow fish (65) is the only one.
    const slow = glide(-20, 70, { duration: 212 });
    expect(findLane(candidate(70, { band: [60, 72] }), [slow], 0)).toBe(65);
  });

  it('checks only the time both are on screen: a fish that has left blocks nothing', () => {
    const gone = glide(-200, 70);
    expect(findLane(candidate(70), [gone], 0)).toBe(70);
  });

  it('uses the whole box of a pair, with the lag (P6)', () => {
    // A fish 8 s ahead at the same speed: 3 % free space in front of the new one.
    expect(findLane(candidate(70), [glide(-8, 70)], 0)).toBe(70);
    // The same fish with a second one 4 s behind it: that one swims in the new fish's way.
    expect(findLane(candidate(70), [glide(-8, 70, { lag: 4 })], 0)).not.toBe(70);
    // A new pair that starts part of the way across (20 s ago, item 93), its second fish 6 s
    // behind: that one swims into a fish 9 s behind the first, which a single new fish clears.
    const ahead = glide(-11, 70);
    expect(findLane(candidate(70, { start: -20 }), [ahead], 0)).toBe(70);
    expect(findLane(candidate(70, { start: -20, lag: 6 }), [ahead], 0)).not.toBe(70);
  });

  it('plans a crossing in rewind as a whole (item 83)', () => {
    // In rewind a new thing starts at its end: its crossing began a duration ago (-106 s), and
    // all of it is still to come. On its way back it meets a slow fish that started before it.
    const slow = glide(-150, 70, { duration: 212 });
    const back = candidate(70, { start: -106 });
    expect(findLane(back, [slow], -106)).not.toBe(70);
    // From now (0 s) on, nothing of that crossing is left to check.
    expect(findLane(back, [slow], 0)).toBe(70);
  });
});

describe('scene clock (ROADMAP item 92)', () => {
  it('runs with the wall clock live, and at the play rate during time-travel play (item 83)', () => {
    expect(getSceneTime(LIVE_SCENE_CLOCK, 12_000)).toBe(12);
    const forward = setSceneRate(LIVE_SCENE_CLOCK, 10_000, 8); // fast forward from 10 s
    expect(getSceneTime(forward, 12_000)).toBe(10 + 2 * 8);
    const rewind = setSceneRate(forward, 12_000, -8); // rewind from 12 s
    expect(getSceneTime(rewind, 13_000)).toBe(26 - 8);
    const live = setSceneRate(rewind, 13_000, 1);
    expect(getSceneTime(live, 14_000)).toBe(19);
  });
});

describe('firstMeeting (ROADMAP item 94)', () => {
  it('finds when a faster box catches up with a slower one at the same height', () => {
    // The slow one starts at 20 % at 0.5 %/s; the fast one at -5 % at 1 %/s: they touch when the
    // gap of 20 % is gone, after 40 s.
    const slow: ScenePath = { start: 0, duration: 200, x: 20, dx: 100, width: 5, y: 70, height: 4 };
    expect(firstMeeting(glide(0, 72), slow, 0)).toBe(40.5); // the first sample (every 0.5 s) after that
    // From a later time on: that time, while they touch.
    expect(firstMeeting(glide(0, 72), slow, 45)).toBe(45);
  });

  it('finds no meeting at another height, or when the boxes stay apart', () => {
    const slow: ScenePath = { start: 0, duration: 200, x: 20, dx: 100, width: 5, y: 70, height: 4 };
    expect(firstMeeting(glide(0, 80), slow, 0)).toBeNull();
    expect(firstMeeting(glide(0, 72, { x: 60, dx: 41, duration: 41 }), slow, 0)).toBeNull();
  });
});
