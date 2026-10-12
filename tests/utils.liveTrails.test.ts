import { describe, it, expect } from 'vitest';
import {
  MAX_TRAIL_POINTS, MAX_TRAILS, TRAIL_FADE_STEPS, TRAIL_GAP_MS, TRAIL_POINT_MS, getTrailFadeTime,
  getTrailPaths, getTrailWidth, updateLiveTrails, type LiveTrail, type SkyPoint, type TrailPlane,
} from '@/utils/liveTrails';
import { getTrailOpacity } from '@/utils/planes';

// ROADMAP item 142: the live planes' contrails stay in the sky.
const plane = (hex: string, az: number, extra: Partial<TrailPlane> = {}): TrailPlane => ({
  hex, az, el: 20, ox: 0, oy: 0, lifeMs: 60_000, thin: 1.5, spread: 1.5, ...extra,
});
// A plane flying east at 0.1°/s, updated 4 times per second from `from` ms to `to` ms.
const fly = (trails: LiveTrail[], hex: string, from: number, to: number, spacing = TRAIL_POINT_MS): LiveTrail[] => {
  let next = trails;
  for (let t = from; t <= to; t += 250) next = updateLiveTrails(next, [plane(hex, 90 + t / 10_000)], t, spacing);
  return next;
};
// x = azimuth × 10 px, y = 400 - elevation × 10 px: a 3600 px 360° view.
const project = (el: number, az: number) => ({ x: az * 10, y: 400 - el * 10 });

describe('updateLiveTrails', () => {
  it('starts a trail with one point where the plane shows: no trail on the first frame', () => {
    const [trail] = updateLiveTrails([], [plane('a', 90)], 1_000, TRAIL_POINT_MS);
    expect(trail.points).toEqual([{ az: 90, el: 20, t: 1_000, ox: 0, oy: 0 }]);
    expect(trail.head).toEqual(trail.points[0]);
    expect(trail.active).toBe(true);
    expect(getTrailPaths([...trail.points, trail.head], 1_000, trail, project, 3600)).toEqual([]);
  });

  it('stores a sky point every 5 s plus the live head, and never moves a point', () => {
    const first = fly([], 'a', 0, 0);
    const later = fly(first, 'a', 250, 12_000);
    expect(later).toHaveLength(1);
    const [trail] = later;
    expect(trail.points.map(p => p.t)).toEqual([0, 5_000, 10_000]);
    expect(trail.points[0]).toBe(first[0].points[0]); // the same point, untouched
    expect(trail.head.t).toBe(12_000);
    expect(trail.head.az).toBeCloseTo(91.2);
  });

  it('keeps the points array between two points, so a memoized drawing does not render again', () => {
    const a = fly([], 'a', 0, 5_000);
    const b = updateLiveTrails(a, [plane('a', 90.6)], 5_250, TRAIL_POINT_MS);
    expect(b[0].points).toBe(a[0].points);
    expect(b[0].head).not.toBe(a[0].head);
  });

  it('keeps the trail when the plane goes; it fades from its older end and goes with its last point', () => {
    let trails = fly([], 'a', 0, 20_000); // points at 0, 5, 10, 15, 20 s
    trails = updateLiveTrails(trails, [], 20_250, TRAIL_POINT_MS);
    expect(trails[0].active).toBe(false);
    const head = trails[0].head;
    // 66 s: the points at 0 and 5 s are older than the life (60 s).
    trails = updateLiveTrails(trails, [], 66_000, TRAIL_POINT_MS);
    expect(trails[0].points.map(p => p.t)).toEqual([10_000, 15_000, 20_000]);
    expect(trails[0].head).toBe(head); // the head stays where the plane was last
    trails = updateLiveTrails(trails, [], 79_999, TRAIL_POINT_MS);
    expect(trails).toHaveLength(1);
    trails = updateLiveTrails(trails, [], 80_000, TRAIL_POINT_MS);
    expect(trails).toHaveLength(0);
  });

  it('starts a new trail when the plane shows again after a gap; the old one fades', () => {
    let trails = fly([], 'a', 0, 10_000);
    trails = updateLiveTrails(trails, [], 10_250, TRAIL_POINT_MS); // behind a ridge for a tick
    trails = updateLiveTrails(trails, [plane('a', 92)], 10_500, TRAIL_POINT_MS);
    expect(trails).toHaveLength(2);
    expect(trails[0].active).toBe(false);
    expect(trails[1].active).toBe(true);
    expect(trails[1].points).toHaveLength(1);
    expect(trails[1].key).not.toBe(trails[0].key);
    // Shown in two updates, but longer apart than the gap (the page was hidden): a new trail too.
    const later = updateLiveTrails(trails, [plane('a', 95)], 10_500 + TRAIL_GAP_MS + 1, TRAIL_POINT_MS);
    expect(later.filter(trail => trail.active)).toHaveLength(1);
    expect(later.find(trail => trail.active)!.points).toHaveLength(1);
  });

  it('with reduced motion stores each update (each answer of the feed)', () => {
    let trails: LiveTrail[] = [];
    for (let t = 0; t <= 45_000; t += 15_000) trails = updateLiveTrails(trails, [plane('a', 90 + t / 10_000)], t, 0);
    expect(trails[0].points.map(p => p.t)).toEqual([0, 15_000, 30_000, 45_000]);
  });

  it('keeps at most 120 points per plane, the newest', () => {
    let trails: LiveTrail[] = [];
    // A point every second for 200 s, with a long life: 201 points without the limit.
    for (let t = 0; t <= 200_000; t += 1_000) {
      trails = updateLiveTrails(trails, [plane('a', 90 + t / 10_000, { lifeMs: 900_000 })], t, 1_000);
    }
    expect(MAX_TRAIL_POINTS).toBe(120);
    expect(trails[0].points).toHaveLength(120);
    expect(trails[0].points[0].t).toBe(81_000);
    expect(trails[0].points[119].t).toBe(200_000);
  });

  it('keeps at most 40 trails: the oldest fading trail goes first', () => {
    let trails: LiveTrail[] = [];
    // 30 planes that left at 1, 2, … 30 s, then 20 that show now.
    for (let i = 0; i < 30; i++) {
      trails = updateLiveTrails(trails, [plane(`old${i}`, i)], i * 1_000, TRAIL_POINT_MS);
      trails = updateLiveTrails(trails, [], i * 1_000 + 500, TRAIL_POINT_MS);
    }
    const now = Array.from({ length: 20 }, (_, i) => plane(`new${i}`, 100 + i));
    trails = updateLiveTrails(trails, now, 31_000, TRAIL_POINT_MS);
    expect(MAX_TRAILS).toBe(40);
    expect(trails).toHaveLength(40);
    expect(trails.filter(trail => trail.active)).toHaveLength(20);
    // The 10 that left first are gone.
    expect(trails.filter(trail => !trail.active).map(trail => trail.hex)).toEqual(
      Array.from({ length: 20 }, (_, i) => `old${i + 10}`),
    );
  });
});

describe('getTrailPaths', () => {
  const look = { lifeMs: 100_000, thin: 2, spread: 3 };
  const point = (az: number, t: number, el = 20): SkyPoint => ({ az, el, t, ox: 0, oy: 0 });

  it('gives each segment the opacity and width of its older point, in fade steps', () => {
    const points = [point(10, 0), point(11, 10_000), point(12, 50_000), point(13, 90_000)];
    const paths = getTrailPaths(points, 100_000, look, project, 3600);
    // Ages 100 s (faded: not drawn), 90 s and 50 s.
    expect(paths.map(p => p.step)).toEqual([18, 10]);
    // Step 18 is drawn at the age of its middle, 92.5 % of the life.
    expect(paths[0]).toEqual({ step: 18, d: 'M110 200L120 200', opacity: 0.07, width: 5.7 });
    expect(paths[1].d).toBe('M120 200L130 200');
    expect(paths[1].opacity).toBe(Math.round(getTrailOpacity(0.525) * 100) / 100);
  });

  it('joins the segments of one step into one path', () => {
    const points = [point(10, 0), point(11, 100), point(12, 200)];
    expect(getTrailPaths(points, 1_000, look, project, 3600)).toEqual([
      { step: 0, d: 'M100 200L110 200L120 200', opacity: 0.88, width: 2.1 },
    ]);
  });

  it('does not join two points across the 360° edge, nor draw segments far off the screen', () => {
    const points = [point(358, 0), point(359.5, 100), point(1, 200), point(2, 300)];
    const wrap = (el: number, az: number) => project(el, ((az % 360) + 360) % 360);
    const [path] = getTrailPaths(points, 1_000, look, wrap, 3600);
    expect(path.d).toBe('M3580 200L3595 200M10 200L20 200');
    // Both ends 50 px or more beyond the left edge: not drawn.
    expect(getTrailPaths([point(-10, 0), point(-6, 100)], 1_000, look, project, 3600)).toEqual([]);
  });

  it('adds the engine offset of each point', () => {
    const points = [{ ...point(10, 0), ox: -1, oy: 1.2 }, { ...point(11, 100), ox: 1, oy: 1.2 }];
    expect(getTrailPaths(points, 1_000, look, project, 3600)[0].d).toBe('M99 201.2L111 201.2');
  });
});

describe('the fade', () => {
  it('fades as the decorative pieces: 0.9 when made, 0.6 at 40 % of the life, 0 at its end', () => {
    expect(getTrailOpacity(0)).toBe(0.9);
    expect(getTrailOpacity(0.4)).toBeCloseTo(0.6);
    expect(getTrailOpacity(1)).toBe(0);
    expect(getTrailWidth(2, 3, 0)).toBe(2);
    expect(getTrailWidth(2, 3, 1)).toBe(6);
    expect(TRAIL_FADE_STEPS).toBe(20);
  });

  it('steps its clock by a hundredth of the life, at least the tick', () => {
    expect(getTrailFadeTime(12_345, 600_000, 250)).toBe(12_000);
    expect(getTrailFadeTime(12_345, 10_000, 250)).toBe(12_250);
  });
});
