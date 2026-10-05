// Lane planning (ROADMAP item 92). Every fish, bird and boat crosses the scene on a path that
// is known when it spawns: the `moveAcrossX` CSS animation, a straight glide or the rest-stop
// curve of getRestStopMotion. So the spawn loop can calculate where each one is at any time,
// and give a new one a height where its box meets no other box. There is no per-frame code,
// and the glide stays straight.

// A path on the scene clock (see SceneClock). Times are in s; x, dx and width are in % of the
// scene width; y and height are in % of the scene height. The box is the whole drawing: both
// fish of a pair (P6), all minnows of a school, the hull and the reflection of a boat.
export interface ScenePath {
  // The scene time when the crossing starts. It can be in the past: a thing that starts part
  // of the way across (a negative animation-delay, item 93).
  start: number;
  duration: number; // s, from the start to the end of the crossing
  x: number; // the left edge at the start
  dx: number; // the distance from the start to the end
  // A rest stop (P8, M8): the points of the CSS linear() easing, as [share of the time, share
  // of the distance]. Without a curve, the glide is straight.
  curve?: [number, number][];
  lag?: number; // a pair (P6): the second fish swims `lag` s behind the first
  width: number;
  y: number; // the top edge of the box
  height: number;
}

// The share of the distance at the share `p` of the time, on the straight pieces between the
// curve's points (CSS linear() moves the same way).
const along = (curve: [number, number][], p: number): number => {
  for (let i = 1; i < curve.length; i++) {
    const [t1, s1] = curve[i];
    if (p <= t1) {
      const [t0, s0] = curve[i - 1];
      return t1 > t0 ? s0 + ((s1 - s0) * (p - t0)) / (t1 - t0) : s1;
    }
  }
  return curve[curve.length - 1][1];
};

// The left edge (of the first fish of a pair) in % of the width at scene time `t`. Before the
// start it is at the start (as a CSS animation in its delay), after the end at the end.
export const xAt = (path: ScenePath, t: number): number => {
  const p = Math.min(1, Math.max(0, (t - path.start) / path.duration));
  return path.x + path.dx * (path.curve ? along(path.curve, p) : p);
};

// The scene time when the thing leaves: a pair leaves with its second fish.
const endOf = (path: ScenePath): number => path.start + path.duration + (path.lag ?? 0);

export const LANE_SAMPLE_SEC = 0.5;
// The free space around a box: 25 % of the smaller height of the two boxes, across and down.
export const LANE_MARGIN = 0.25;

// True when the two boxes come closer across than `margin` (in % of the width) at a sample of
// the time that both are on screen, from `from` on. The heights are not checked here: two
// paths meet across or not, at any height.
const meetsAcross = (a: ScenePath, b: ScenePath, from: number, margin: number): boolean => {
  const t0 = Math.max(from, a.start, b.start);
  const t1 = Math.min(endOf(a), endOf(b));
  if (t1 < t0) return false;
  const steps = Math.ceil((t1 - t0) / LANE_SAMPLE_SEC);
  for (let i = 0; i <= steps; i++) {
    const t = Math.min(t1, t0 + i * LANE_SAMPLE_SEC);
    // The second fish of a pair is the box's left end.
    const aLeft = xAt(a, t - (a.lag ?? 0));
    const bLeft = xAt(b, t - (b.lag ?? 0));
    if (aLeft < xAt(b, t) + b.width + margin && bLeft < xAt(a, t) + a.width + margin) return true;
  }
  return false;
};

// The first scene time (a sample, every 0.5 s, from `from` on) when the two boxes touch, or
// null. Item 94: a boat on its fallback lane (item 92) finds the fish it meets, so they dive.
export const firstMeeting = (a: ScenePath, b: ScenePath, from: number): number | null => {
  if (a.y >= b.y + b.height || b.y >= a.y + a.height) return null;
  const t0 = Math.max(from, a.start, b.start);
  const t1 = Math.min(endOf(a), endOf(b));
  for (let t = t0; t <= t1; t += LANE_SAMPLE_SEC) {
    if (xAt(a, t - (a.lag ?? 0)) < xAt(b, t) + b.width && xAt(b, t - (b.lag ?? 0)) < xAt(a, t) + a.width) return t;
  }
  return null;
};

export interface LaneCandidate extends ScenePath {
  band: [number, number]; // the highest and the lowest y that the type can take
  view: { width: number; height: number }; // the scene in px, so the margin is the same distance across and down
}

// A free height for a new thing (the y of its box), or null when its band has none. The tries
// start at the random pick and go up and down in steps of a quarter of the candidate's height,
// the nearest first. A height is free when the candidate's box does not come nearer than the
// margin to any other box, at each sample (every 0.5 s) of the time both are on screen from
// `now` on. In rewind (item 83) the whole crossing is still to come: pass its start as `now`.
// Each other box is checked across only once, and only when it is near in height, so a spawn
// costs a few thousand box checks at most.
export const findLane = (candidate: LaneCandidate, others: readonly ScenePath[], now: number): number | null => {
  const { band: [top, bottom], view, height } = candidate;
  const pick = Math.min(bottom, Math.max(top, candidate.y));
  const step = height / 4;
  // A margin in % of the height, in % of the width.
  const acrossPerDown = view.height / view.width;
  const meets: (boolean | undefined)[] = [];
  const isFree = (y: number) => others.every((other, i) => {
    const margin = LANE_MARGIN * Math.min(height, other.height);
    if (y >= other.y + other.height + margin || other.y >= y + height + margin) return true;
    if (meets[i] === undefined) meets[i] = meetsAcross(candidate, other, now, margin * acrossPerDown);
    return !meets[i];
  });
  if (!(step > 0)) return isFree(pick) ? pick : null;
  for (let k = 0; pick - k * step >= top || pick + k * step <= bottom; k++) {
    for (const y of k === 0 ? [pick] : [pick + k * step, pick - k * step]) {
      if (y >= top && y <= bottom && isFree(y)) return y;
    }
  }
  return null;
};

// The scene clock: the time of the scene's animations, in s. It runs at their play rate
// (item 83: 8 in fast forward, -8 in rewind, else 1), so a path planned on it holds through
// time-travel play, also backwards: all animations change their rate by the same factor at
// the same moment. In live mode it is the wall clock.
export interface SceneClock {
  wallMs: number; // the wall-clock time of the last rate change (Date.now())
  time: number; // the scene time at that moment, in s
  rate: number;
}

export const LIVE_SCENE_CLOCK: SceneClock = { wallMs: 0, time: 0, rate: 1 };

export const getSceneTime = (clock: SceneClock, wallMs: number): number =>
  clock.time + ((wallMs - clock.wallMs) / 1000) * clock.rate;

export const setSceneRate = (clock: SceneClock, wallMs: number, rate: number): SceneClock =>
  ({ wallMs, time: getSceneTime(clock, wallMs), rate });
