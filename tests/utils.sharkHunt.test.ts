import { findLane, type LaneCandidate } from '../src/utils/scenePaths';
import {
  HUNT_VARIANTS, MEAL_FACTOR, SHARK_GRID, SHIFT_KEYS, distanceAt, getHuntOverride, getKeepAwayPath, isSmallFish,
  pathFromKnots, pickMeetX, planMeeting, planPreyHunt, sharkKnots, type HuntShark, type HuntVariant,
} from '../src/utils/sharkHunt';

// A near shark on a phone (depth 0.3): 52 px of 390, 0.5 x 0.865 %/s, from the left edge.
const shark: HuntShark = { start: 100, x: -14.3, width: 13.3, dx: 115.3, speed: 0.4325 };
// A classic fish at the same depth: 17 px, 1.15 x 0.865 %/s.
const prey = { x: -5.4, width: 4.4, speed: 0.995 };
const nose = (variant: HuntVariant, meet: ReturnType<typeof planMeeting>, t: number) =>
  shark.x + (shark.width * 43) / SHARK_GRID + distanceAt(meet!.knots, t - shark.start);

// The fastest speed (%/s) along a crossing's linear() easing.
const topSpeed = (dx: number, path: { duration: number; curve?: [number, number][] }) => {
  const c = path.curve ?? [[0, 0], [1, 1]];
  return Math.max(...c.slice(1).map(([p, s], i) => ((s - c[i][1]) * dx) / ((p - c[i][0]) * path.duration)));
};

describe('the meeting (ROADMAP item 94)', () => {
  it.each(HUNT_VARIANTS)('%s: the prey from the left edge meets the shark\'s nose at the meeting point', variant => {
    const meet = planMeeting(variant, shark, prey, 50);
    expect(meet).not.toBeNull();
    expect(nose(variant, meet, meet!.meetAt)).toBeCloseTo(50, 6);
    // The prey starts after the shark, behind it, and catches up at its own speed.
    expect(meet!.preyStart).toBeGreaterThan(shark.start);
    const preyCentre = prey.x + prey.width / 2 + prey.speed * (meet!.meetAt - meet!.preyStart);
    const anchor = { H1: -6.5, H2: -1, H3: 0, H4: -3.7 }[variant];
    expect(preyCentre).toBeCloseTo(50 + (anchor * shark.width) / SHARK_GRID, 6);
  });

  it('meets only at 20-80 % of the width', () => {
    expect(planMeeting('H1', shark, prey, 19)).toBeNull();
    expect(planMeeting('H1', shark, prey, 81)).toBeNull();
    expect(planMeeting('H1', shark, prey, 20)).not.toBeNull();
    expect(planMeeting('H4', shark, prey, 80)).not.toBeNull();
    for (let i = 0; i < 50; i++) {
      const x = pickMeetX(() => i / 49)!;
      expect(x).toBeGreaterThanOrEqual(20);
      expect(x).toBeLessThanOrEqual(80);
    }
  });

  it('meets at night only within ±9 % of the moon\'s x, or not at all', () => {
    expect(planMeeting('H1', shark, prey, 50, 30)).toBeNull();
    expect(planMeeting('H1', shark, prey, 38, 30)).not.toBeNull();
    for (let i = 0; i < 20; i++) {
      const x = pickMeetX(() => i / 19, 30)!;
      expect(Math.abs(x - 30)).toBeLessThanOrEqual(9);
    }
    // The window is cut at 20 %, and off the 20-80 % there is no meeting.
    expect(pickMeetX(() => 0, 15)).toBe(20);
    expect(pickMeetX(() => 0.5, 95)).toBeNull();
  });

  it('starts the H2 chase only after the shark has started', () => {
    expect(planMeeting('H2', { ...shark, x: 5 }, prey, 20)).toBeNull();
  });
});

describe('the shark\'s speed changes (H2, X3)', () => {
  it('chases at most at the sailboat\'s 1.2 %/s and eases to 0.35 %/s after the meal', () => {
    const base = 0.5; // a shark at depth 0: the highest speed
    for (const variant of ['H1', 'H2'] as const) {
      const knots = sharkKnots(variant, 120, base);
      const path = pathFromKnots(150, knots)!;
      expect(path.curve).toBeDefined();
      expect(topSpeed(150, path)).toBeLessThanOrEqual(1.2);
      expect(knots[knots.length - 1][1]).toBeCloseTo(MEAL_FACTOR * base);
      // The duration covers the whole distance, along the same profile as distanceAt.
      expect(distanceAt(knots, path.duration)).toBeCloseTo(150, 6);
    }
    expect(topSpeed(150, pathFromKnots(150, sharkKnots('H2', 120, base))!)).toBeGreaterThan(1.15);
  });

  it('keeps a straight glide for H3 and H4', () => {
    expect(pathFromKnots(100, sharkKnots('H3', 50, 0.5))).toEqual({ duration: 200 });
    expect(pathFromKnots(100, sharkKnots('H4', 50, 0.5))).toEqual({ duration: 200 });
  });
});

describe('the hunt on the prey', () => {
  const view = { width: 390, height: 844 };

  it('H1: slows the fish to the shark\'s speed, with a ripple and four bubbles behind the nose', () => {
    const meet = planMeeting('H1', shark, prey, 50)!;
    const plan = planPreyHunt('H1', meet, shark, { ...prey, width: 17, height: 17, size: 17 }, 86, view, 0)!;
    expect(plan.fireAt).toBeCloseTo(meet.meetAt - 1.5);
    // The fish loses (1.15 - 0.5) x 0.865 %/s for 1.55 s: about 3.4 px on a phone.
    expect(plan.prey.slowPx).toBeCloseTo(-((prey.speed - shark.speed) * 3.9 * 1.55), 3);
    expect(plan.fx!.bubbles).toHaveLength(4);
    expect(plan.fx!.ripple.delay).toBeCloseTo(2.1);
    expect(plan.fx!.ripple.dx).toBeLessThan(0);
  });

  it('H2 and H4 have a ripple and no bubbles; H3 has neither', () => {
    for (const variant of ['H2', 'H4', 'H3'] as const) {
      const meet = planMeeting(variant, shark, prey, 60)!;
      const plan = planPreyHunt(variant, meet, shark, { ...prey, width: 17, height: 17, size: 17 }, 86, view, 0)!;
      expect(plan.fx?.bubbles).toBeUndefined();
      expect(plan.fx === undefined).toBe(variant === 'H3');
    }
  });

  it('H3: opens the school above and below the shark, front minnow first, calm up and down', () => {
    const school = { speed: 1.038, width: 52, height: 30, size: 9, school: [
      { left: 43, top: 9 }, { left: 30, top: 0 }, { left: 28, top: 18 }, { left: 16, top: 9 }, { left: 14, top: 21 },
    ] };
    const meet = planMeeting('H3', shark, school, 60)!;
    const plan = planPreyHunt('H3', meet, shark, school, 86, view, 0)!;
    const { minnows, minnowSec } = plan.prey;
    expect(minnows).toHaveLength(5);
    expect(minnows![0].delay).toBe(0); // the leader is in front
    expect(minnows!.some(m => m.dy < 0) && minnows!.some(m => m.dy > 0)).toBe(true);
    // The fastest move up or down: an ease-in-out at most 2x its mean, under 1.2 % of 390 px.
    const openSec = SHIFT_KEYS.open * minnowSec!;
    for (const m of minnows!) expect((2 * Math.abs(m.dy)) / openSec).toBeLessThanOrEqual(4.68);
    // Too late: the school's front minnow would have to move before now.
    expect(planPreyHunt('H3', meet, shark, school, 86, view, plan.fireAt + 1)).toBeNull();
  });
});

describe('X2 keep away', () => {
  // The shark's box at 80-84 %; a small fish that picks 81 % takes a lane out of it.
  const sharkPath = { start: 0, duration: 230, x: -14, dx: 115, width: 13, y: 80, height: 4 };
  const fish = (start: number): LaneCandidate =>
    ({ start, duration: 110, x: -5, dx: 106, width: 4, y: 81, height: 2, band: [66, 94], view: { width: 390, height: 844 } });

  it('keeps new small fish out of the shark\'s lane for 60 s from the meeting', () => {
    const block = getKeepAwayPath(sharkPath, 100);
    const y = findLane(fish(120), [block], 120)!;
    expect(y + 2 <= 80 || y >= 84).toBe(true);
    // A fish that leaves before the meeting, or comes after the 60 s, keeps its pick.
    expect(findLane(fish(-20), [block], -20)).toBe(81);
    expect(findLane(fish(161), [block], 161)).toBe(81);
  });

  it('counts the classic fish, the minnows, the perch and the trout as small fish', () => {
    expect(['classic', 'minnow', 'perch', 'trout'].every(isSmallFish)).toBe(true);
    expect(['pike', 'shark', 'whale'].some(isSmallFish)).toBe(false);
  });
});

describe('getHuntOverride', () => {
  it('reads ?hunt=H1 ... H4', () => {
    expect(getHuntOverride('?hunt=H3')).toBe('H3');
    expect(getHuntOverride('?fish=shark&hunt=h2')).toBe('H2');
    expect(getHuntOverride('?hunt=H5')).toBeNull();
    expect(getHuntOverride('')).toBeNull();
  });
});
