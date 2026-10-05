// The shark hunt (ROADMAP item 94): a planned meeting of a shark and a small fish, as calm
// glides. Everything swims from left to right, and every prey is faster than the shark, so a
// fish that is on screen already is ahead of a new shark and never meets it. The plan therefore
// makes the prey part of the hunt: at the shark's spawn it picks a meeting point, the shark's
// path to it (with the H2 chase and the X3 slow-down as a CSS linear() easing), and the prey's
// path from the left edge, so that the prey's centre meets the shark's nose there. At its
// start time a timeout plays the hunt on the prey (CSS animations, no per-frame code).

import { type ScenePath } from './scenePaths';

export type HuntVariant = 'H1' | 'H2' | 'H3' | 'H4';
export const HUNT_VARIANTS: HuntVariant[] = ['H1', 'H2', 'H3', 'H4'];

// The prey of each variant: H1 a classic fish, H2 a perch, H3 a minnow school, H4 a trout.
export type PreyKind = 'classic' | 'perch' | 'minnow' | 'trout';
export const HUNT_PREY: Record<HuntVariant, PreyKind> = { H1: 'classic', H2: 'perch', H3: 'minnow', H4: 'trout' };
export const isSmallFish = (kind: string): boolean => (Object.values(HUNT_PREY) as string[]).includes(kind);

export const HUNTER_SHARE = 0.5; // X4: 1 in 2 sharks hunt
export const KEEP_AWAY_SEC = 60; // X2
export const MEET_RANGE: [number, number] = [20, 80]; // % of the width
export const MOON_WINDOW = 9; // ± % of the width from the moon's x (item 65's pool)
export const CHASE_FACTOR = 1.2 / 0.5; // H2: the shark's 0.5 %/s up to the sailboat's 1.2
export const MEAL_FACTOR = 0.35 / 0.5; // X3: after a meal, 0.35 %/s
const CHASE_LEAD_SEC = 8; // H2: the speed-up starts 8 s before the meeting
const CHASE_RAMP_SEC = 2;
const MEAL_RAMP_SEC = 3;

// The shark's drawing (SceneVisitor, a 48-unit grid): its nose and its body line below the waterline.
export const SHARK_GRID = 48;
const NOSE = 43;
export const BODY_LINE = 3.6;

// Where the prey's centre is at the meeting, in grid units from the nose (the lookbook's anchors).
const ANCHOR: Record<HuntVariant, number> = { H1: -6.5, H2: -1, H3: 0, H4: -3.7 };
// When the hunt starts, in s before the meeting (H3: at its first minnow, see planPreyHunt).
const LEAD: Record<HuntVariant, number> = { H1: 1.5, H2: 1.5, H3: 0, H4: 2 };
// X1: the ripple, s after the meeting (H3 has none).
const RIPPLE_AT: Partial<Record<HuntVariant, number>> = { H1: 0.6, H2: 0.3, H4: 0.1 };

// A speed profile: [time in s from the start, speed in %/s]. Between two knots the speed
// changes along a smoothstep; after the last knot it stays.
export type Knots = [number, number][];

export const sharkKnots = (variant: HuntVariant, meet: number, speed: number): Knots => {
  if (variant === 'H1') return [[0, speed], [meet + 0.5, speed], [meet + 0.5 + MEAL_RAMP_SEC, MEAL_FACTOR * speed]];
  if (variant === 'H2') {
    const peak = CHASE_FACTOR * speed;
    return [[0, speed], [meet - CHASE_LEAD_SEC, speed], [meet - CHASE_LEAD_SEC + CHASE_RAMP_SEC, peak], [meet, peak],
      [meet + MEAL_RAMP_SEC, MEAL_FACTOR * speed]];
  }
  return [[0, speed]];
};

// The distance (%) after `t` s. The smoothstep 3x² - 2x³ integrates to x³ - x⁴/2.
export const distanceAt = (knots: Knots, t: number): number => {
  let s = 0;
  for (let i = 1; i < knots.length; i++) {
    const [t0, v0] = knots[i - 1];
    const [t1, v1] = knots[i];
    if (t <= t0) return s;
    const span = t1 - t0;
    const x = Math.min(1, (t - t0) / span);
    s += v0 * x * span + (v1 - v0) * span * (x ** 3 - x ** 4 / 2);
  }
  const [tl, vl] = knots[knots.length - 1];
  return s + Math.max(0, t - tl) * vl;
};

// The crossing for a profile: its duration, and the points of the CSS linear() easing (as
// [share of the time, share of the distance], like getRestStopMotion), 6 steps per ramp. null
// when the crossing ends before the last knot.
export const pathFromKnots = (dx: number, knots: Knots): { duration: number; curve?: [number, number][] } | null => {
  const [tl, vl] = knots[knots.length - 1];
  if (knots.length === 1) return { duration: dx / vl };
  const sl = distanceAt(knots, tl);
  if (sl >= dx) return null;
  const duration = tl + (dx - sl) / vl;
  const times = [0];
  for (let i = 1; i < knots.length; i++) {
    const [t0, v0] = knots[i - 1];
    const [t1, v1] = knots[i];
    const steps = v0 === v1 ? 1 : 6;
    for (let k = 1; k <= steps; k++) times.push(t0 + ((t1 - t0) * k) / steps);
  }
  const curve = times.map((t): [number, number] => [t / duration, distanceAt(knots, t) / dx]);
  curve.push([1, 1]);
  return { duration, curve };
};

export const toLinearEasing = (curve: [number, number][]): string =>
  `linear(${curve.map(([p, s]) => `${s.toFixed(4)} ${(p * 100).toFixed(2)}%`).join(', ')})`;

// A meeting point (the nose's x, in % of the width): at random in 20-80 %; at night only
// within ±9 % of the moon's x (`poolX`), or null when that window is off the 20-80 %.
export const pickMeetX = (random: () => number, poolX: number | null = null): number | null => {
  const lo = poolX === null ? MEET_RANGE[0] : Math.max(MEET_RANGE[0], poolX - MOON_WINDOW);
  const hi = poolX === null ? MEET_RANGE[1] : Math.min(MEET_RANGE[1], poolX + MOON_WINDOW);
  return lo > hi ? null : lo + random() * (hi - lo);
};

// The shark (start on the scene clock, its left edge x, its width, the crossing dx, all in %
// of the width; speed in %/s) and the prey (left edge, width, speed).
export interface HuntShark { start: number; x: number; width: number; dx: number; speed: number }
export interface HuntPreyPath { x: number; width: number; speed: number }

export interface Meeting {
  meetAt: number; // scene time
  meetX: number; // the nose's x, %
  preyStart: number; // scene time when the prey starts at the left edge
  duration: number; // the shark's crossing
  curve?: [number, number][];
  knots: Knots;
}

// The meeting at `meetX`: when the shark's nose is there, and when the prey must start so that
// its centre (plus the variant's anchor) is there too. null outside 20-80 % of the width, at
// night outside the moon window, or when the H2 chase would start before the shark does.
export const planMeeting = (
  variant: HuntVariant, shark: HuntShark, prey: HuntPreyPath, meetX: number, poolX: number | null = null,
): Meeting | null => {
  if (meetX < MEET_RANGE[0] || meetX > MEET_RANGE[1]) return null;
  if (poolX !== null && Math.abs(meetX - poolX) > MOON_WINDOW) return null;
  // The extra distance of the profile up to the meeting does not depend on its time (the
  // knots move with it): try one far enough out.
  const probe = 1000;
  const extra = distanceAt(sharkKnots(variant, probe, shark.speed), probe) - shark.speed * probe;
  const meet = (meetX - shark.x - (shark.width * NOSE) / SHARK_GRID - extra) / shark.speed;
  if (meet < CHASE_LEAD_SEC && variant === 'H2') return null;
  if (meet <= LEAD[variant]) return null;
  const knots = sharkKnots(variant, meet, shark.speed);
  const crossing = pathFromKnots(shark.dx, knots);
  if (!crossing) return null;
  const anchor = (ANCHOR[variant] * shark.width) / SHARK_GRID;
  const preyTravel = meetX + anchor - (prey.x + prey.width / 2);
  const preyStart = shark.start + meet - preyTravel / prey.speed;
  if (preyStart < shark.start) return null; // the prey must come from behind
  return { meetAt: shark.start + meet, meetX, preyStart, ...crossing, knots };
};

// What the timeout gives the prey (all in px and s, from the hunt's start).
export interface PreyHunt {
  variant: HuntVariant;
  slowPx?: number; // H1: the offset that slows the fish to the shark's speed (negative)
  minnows?: { delay: number; dy: number }[]; // H3: each minnow's move, in the school's order
  minnowSec?: number; // H3: one minnow's whole move
}

// X1 and the H1 bubbles, where they start: at the nose at the meeting (`x`, `y` in % of the
// scene; y is the waterline), offsets in px, delays in s from the hunt's start.
export interface HuntFx {
  id: number;
  x: number;
  y: number;
  unit: number; // px per grid unit of the shark
  ripple: { dx: number; delay: number };
  bubbles?: { dx: number; delay: number; r: number }[];
  tone: 'day' | 'dusk' | 'moon';
}

export interface HuntPlan {
  variant: HuntVariant;
  preyId: number;
  fireAt: number; // scene time of the timeout
  meetAt: number;
  prey: PreyHunt;
  fx?: Omit<HuntFx, 'id' | 'tone'>;
}

// The px offsets of H1's slow-down: the fish slows from its speed to the shark's along a
// smoothstep in 1.5 s, then keeps the shark's speed until its fade ends (2.3 s from the start).
const SLOW_RAMP_SEC = 1.5;
export const SLOW_SEC = 2.3;
const slowShape = (t: number) => (t <= SLOW_RAMP_SEC
  ? SLOW_RAMP_SEC * ((t / SLOW_RAMP_SEC) ** 3 - (t / SLOW_RAMP_SEC) ** 4 / 2)
  : SLOW_RAMP_SEC / 2 + (t - SLOW_RAMP_SEC));
export const SLOW_EASING = toLinearEasing(Array.from({ length: 8 }, (_, k): [number, number] => {
  const t = (SLOW_SEC * k) / 7;
  return [t / SLOW_SEC, slowShape(t) / slowShape(SLOW_SEC)];
}));

// H3: a minnow moves when it is 55.4 grid units behind the nose and is out when it is 40.6
// behind; it moves back from 3.7 units behind to 12.9 past the nose. Up to 14.6 units above
// the body line, or 13 below it; at least 3 px.
const OPEN_AT = -55.4;
const OPEN_END = -40.6;
const CLOSE_FROM = -3.7;
const CLOSE_AT = 12.9;
const UP = -14.6;
const DOWN = 13;
// The keyframes of one minnow's move, as shares of its time.
export const SHIFT_KEYS = { open: (OPEN_END - OPEN_AT) / (CLOSE_AT - OPEN_AT), close: (CLOSE_FROM - OPEN_AT) / (CLOSE_AT - OPEN_AT) };

export interface PreyGeometry {
  width: number; // px, of the fish or the school
  height: number;
  size: number; // px, of one fish
  school?: { left: number; top: number }[];
}

// The hunt's timeline and offsets for a meeting. `view` is the scene in px, `waterline` the
// shark's y (%). null for H3 when the school's first minnow would have to move before `now`.
export const planPreyHunt = (
  variant: HuntVariant, meeting: Meeting, shark: HuntShark, prey: PreyGeometry & { speed: number },
  waterline: number, view: { width: number; height: number }, now: number,
): Omit<HuntPlan, 'preyId'> | null => {
  const px = view.width / 100;
  const unit = (shark.width * px) / SHARK_GRID;
  const sharkPx = (t: number) => distanceAt(meeting.knots, t - shark.start) * px; // the nose's travel
  const { meetAt } = meeting;
  let fireAt = meetAt - LEAD[variant];
  const huntPrey: PreyHunt = { variant };
  if (variant === 'H1') {
    const gain = (prey.speed - shark.speed) * px; // px/s
    huntPrey.slowPx = -gain * slowShape(SLOW_SEC);
  }
  if (variant === 'H3') {
    const gain = (prey.speed - shark.speed) * px;
    const spots = prey.school ?? [{ left: 0, top: 0 }];
    const offsets = spots.map(s => ({
      x: s.left + prey.size / 2 - prey.width / 2,
      y: s.top + prey.size / 2 - prey.height / 2,
    }));
    const starts = offsets.map(o => meetAt + (OPEN_AT * unit - o.x) / gain);
    fireAt = Math.min(...starts);
    if (fireAt < now) return null;
    huntPrey.minnowSec = ((CLOSE_AT - OPEN_AT) * unit) / gain;
    huntPrey.minnows = offsets.map((o, i) => ({
      delay: starts[i] - fireAt,
      dy: o.y < 0 ? Math.min(-3, UP * unit - o.y) : Math.max(3, DOWN * unit - o.y),
    }));
  }
  const rippleAt = RIPPLE_AT[variant];
  const at = (t: number) => sharkPx(t) - sharkPx(meetAt); // the nose's px from the meeting point
  const fx = rippleAt === undefined ? undefined : {
    x: meeting.meetX,
    y: waterline,
    unit,
    ripple: { dx: at(meetAt + rippleAt) - 7.4 * unit, delay: meetAt + rippleAt - fireAt },
    bubbles: variant === 'H1'
      ? [0, 0.45, 1, 1.6].map((d, i) => ({
          dx: at(meetAt - 0.3 + d) - (4.6 + 1.5 * i) * unit,
          delay: meetAt - 0.3 + d - fireAt,
          r: [0.85, 0.65, 1, 0.55][i] * unit,
        }))
      : undefined,
  };
  return { variant, fireAt, meetAt, prey: huntPrey, fx };
};

// X2: after a hunt, new small fish keep out of the shark's lane for 60 s: a box at the shark's
// height across the whole width, from the meeting on.
export const getKeepAwayPath = (shark: ScenePath, meetAt: number): ScenePath => ({
  start: meetAt, duration: KEEP_AWAY_SEC, x: -100, dx: 0, width: 300, y: shark.y, height: shark.height,
});

// Test override: `?hunt=H1` ... `?hunt=H4` makes every shark hunt with that variant.
export const getHuntOverride = (search: string): HuntVariant | null => {
  const v = new URLSearchParams(search).get('hunt')?.toUpperCase();
  return HUNT_VARIANTS.find(h => h === v) ?? null;
};
