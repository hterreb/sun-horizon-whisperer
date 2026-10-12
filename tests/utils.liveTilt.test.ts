import { describe, it, expect } from 'vitest';
import { getLiveTilt, getTailOffset, type LiveTilt } from '../src/utils/liveTilt';

// ROADMAP item 143 (option H): a live plane points along its way across the screen.
const DEG = Math.PI / 180;
// A screen step (px/s, y down) at `deg` above the horizontal, to the right (1) or left (-1).
const step = (deg: number, dir: 1 | -1 = 1, speed = 2): [number, number] =>
  [dir * speed * Math.cos(deg * DEG), -speed * Math.sin(deg * DEG)];
// Feeds the steps one after the other, as the 4 Hz ticks do.
const run = (steps: [number, number][], start?: LiveTilt): LiveTilt[] => {
  const out: LiveTilt[] = [];
  steps.reduce<LiveTilt | undefined>((prev, [dx, dy]) => {
    const tilt = getLiveTilt(prev, dx, dy);
    out.push(tilt);
    return tilt;
  }, start);
  return out;
};
// Where the body's nose (+x) and fin (-y) point after rotate(angle) scaleY(side), y down.
const nose = (t: LiveTilt) => ({ x: Math.cos(t.angle), y: Math.sin(t.angle) });
const fin = (t: LiveTilt) => ({ x: t.side * Math.sin(t.angle), y: -t.side * Math.cos(t.angle) });

describe('getLiveTilt (ROADMAP item 143)', () => {
  it('turns the side view to the way across the screen: up and right is a negative angle', () => {
    const t = getLiveTilt(undefined, ...step(20));
    expect(t).toMatchObject({ view: 'side', side: 1, first: true });
    expect(t.angle).toBeCloseTo(-20 * DEG, 1);
    // 1/50 rad steps, as the trail angle.
    expect(Math.round(t.angle * 50)).toBeCloseTo(t.angle * 50, 9);
  });

  it('mirrors a plane that moves left (scaleY(-1)), so the fin stays up and the nose leads', () => {
    const t = getLiveTilt(undefined, ...step(35, -1));
    expect(t.side).toBe(-1);
    expect(nose(t).x).toBeLessThan(0);
    expect(nose(t).y).toBeLessThan(0); // climbing left
    expect(Math.atan2(-nose(t).y, -nose(t).x) / DEG).toBeCloseTo(35, 0);
    expect(fin(t).y).toBeLessThan(0);
    // Level flight to the left: 180°, the same as the old scaleX(-1).
    const level = getLiveTilt(undefined, -2, 0);
    expect(level.angle).toBeCloseTo(Math.PI, 1);
    expect(fin(level).y).toBeCloseTo(-1, 5);
  });

  it('keeps the side view within ±60° and shows a steeper way from below, exactly, also straight up', () => {
    const sweep = run([0, 20, 40, 55, 59, 70, 80, 90].map(deg => step(deg)));
    for (const t of sweep.filter(s => s.view === 'side')) expect(Math.abs(t.angle)).toBeLessThanOrEqual(60 * DEG + 0.01);
    expect(sweep.map(t => t.view)).toEqual(['side', 'side', 'side', 'side', 'side', 'under', 'under', 'under']);
    expect(sweep[6].angle).toBeCloseTo(-80 * DEG, 1); // no clamp from below
    expect(sweep[7].angle).toBeCloseTo(-90 * DEG, 1);
    // Steep down and to the left, from below: the true way, no mirror.
    const down = getLiveTilt(undefined, ...step(-75, -1));
    expect(down.view).toBe('under');
    expect(down.angle).toBeCloseTo(Math.atan2(step(-75, -1)[1], step(-75, -1)[0]), 1);
  });

  it('rolls to the underside only above 60° and back to the side view only below 50°', () => {
    const views = run([55, 59, 61, 58, 52, 51, 49, 55, 59].map(deg => step(deg))).map(t => t.view);
    expect(views).toEqual(['side', 'side', 'under', 'under', 'under', 'under', 'side', 'side', 'side']);
    // A plane that shows first at 55° starts in the side view; at 65°, from below.
    expect(getLiveTilt(undefined, ...step(55)).view).toBe('side');
    expect(getLiveTilt(undefined, ...step(65)).view).toBe('under');
  });

  it('changes the side only when dx passes ±0.05 px/s, so a near-vertical climb does not flip', () => {
    const up = run([[0.3, -2], [0.04, -2], [-0.04, -2], [0.03, -2], [-0.06, -2], [0.04, -2], [0.06, -2]]);
    expect(up.map(t => t.side)).toEqual([1, 1, 1, 1, -1, -1, 1]);
    expect(up.every(t => t.view === 'under')).toBe(true);
  });

  it('turns over the top in the underside view, the short way round', () => {
    // Up and right at 70°, straight up, up and left at 70°, then down to a 40° climb to the left.
    const turn = run([step(70), step(90), step(110), step(40, -1)]);
    expect(turn.map(t => t.view)).toEqual(['under', 'under', 'under', 'side']);
    for (let i = 1; i < turn.length; i++) expect(Math.abs(turn[i].angle - turn[i - 1].angle)).toBeLessThan(Math.PI / 2);
    // The left climb's 180° + 40° (mirrored) is the same way as from below at -140°, unwrapped.
    expect(turn[3].angle).toBeCloseTo(-140 * DEG, 1);
    expect(turn[3].side).toBe(-1);
  });

  it('gives the first frame its angle and view at once; the next frames glide', () => {
    const [a, b] = run([step(30), step(31)]);
    expect(a.first).toBe(true);
    expect(b.first).toBe(false);
  });

  it('keeps the last angle, side and view of a still plane and at the 360° edge (dx 0)', () => {
    const [moving] = run([step(70, -1)]);
    expect(moving.view).toBe('under');
    const still = getLiveTilt(moving, 0.05, -0.05); // 0.07 px/s
    expect(still).toMatchObject({ angle: moving.angle, side: -1, view: 'under', first: false });
    const edge = getLiveTilt(moving, 0, 3);
    expect(edge).toMatchObject({ angle: moving.angle, side: -1, view: 'under' });
    // Without a last tilt: level, facing its way (right when it does not move).
    expect(getLiveTilt(undefined, 0, 0)).toMatchObject({ angle: 0, side: 1, view: 'side', first: true });
    expect(getLiveTilt(undefined, -0.05, 0)).toMatchObject({ angle: Math.PI, side: -1, view: 'side' });
  });

  it('gives the same tilt again for the same step, so the memoized body does not render again', () => {
    const [a] = run([step(47, -1)]);
    const b = getLiveTilt(a, ...step(47, -1));
    const c = getLiveTilt(b, ...step(47, -1));
    expect(c.angle).toBe(b.angle);
    expect(c).toEqual(b);
  });
});

// ROADMAP item 142 after item 143: the trail leaves the body where it is drawn.
describe('getTailOffset', () => {
  const W = 20; // px: the side box is 20 × 6, the underside box 20 × 20
  // The engine of the side view from the box's middle, before the turn: 0.04 W behind, 0.066 W below.
  const ENGINE = { x: (0.46 - 0.5) * W, y: (0.72 - 0.5) * W * 0.3 };

  it('is the engine of a level plane that flies right', () => {
    const tail = getTailOffset({ angle: 0, side: 1, view: 'side' }, W);
    expect(tail.x).toBeCloseTo(ENGINE.x);
    expect(tail.y).toBeCloseTo(ENGINE.y);
  });

  it('turns with a plane that climbs 30° to the right', () => {
    // The body turns by -30° (y down), nose up: the engine below the fuselage comes forward and down.
    const a = -30 * DEG;
    const tail = getTailOffset({ angle: a, side: 1, view: 'side' }, W);
    expect(tail.x).toBeCloseTo(ENGINE.x * Math.cos(a) - ENGINE.y * Math.sin(a));
    expect(tail.y).toBeCloseTo(ENGINE.x * Math.sin(a) + ENGINE.y * Math.cos(a));
    expect(tail.x).toBeGreaterThan(ENGINE.x);
    expect(tail.y).toBeGreaterThan(ENGINE.y);
  });

  it('is mirrored for a plane that flies left: behind it on the right, still below the fuselage', () => {
    const level = getTailOffset({ angle: Math.PI, side: -1, view: 'side' }, W);
    expect(level.x).toBeCloseTo(-ENGINE.x);
    expect(level.y).toBeCloseTo(ENGINE.y);
    // Climbing 30° to the left: the body turns by 180° + 30°, mirrored.
    const a = Math.PI + 30 * DEG;
    const climb = getTailOffset({ angle: a, side: -1, view: 'side' }, W);
    expect(climb.x).toBeCloseTo(ENGINE.x * Math.cos(a) + ENGINE.y * Math.sin(a));
    expect(climb.y).toBeCloseTo(ENGINE.x * Math.sin(a) - ENGINE.y * Math.cos(a));
  });

  it('is the end of the fuselage from below, straight behind along the way', () => {
    // Straight up the screen: the tail is 0.45 W below the middle.
    const up = getTailOffset({ angle: -90 * DEG, side: 1, view: 'under' }, W);
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(0.45 * W);
    const a = -70 * DEG;
    const steep = getTailOffset({ angle: a, side: -1, view: 'under' }, W);
    expect(steep.x).toBeCloseTo(-0.45 * W * Math.cos(a));
    expect(steep.y).toBeCloseTo(-0.45 * W * Math.sin(a));
  });
});
