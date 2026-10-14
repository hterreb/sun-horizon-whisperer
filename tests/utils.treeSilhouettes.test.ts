import { describe, it, expect } from 'vitest';
import {
  SENTINEL_MAX,
  SENTINEL_MIN_GAP_DEG,
  TREE_MAX_DISTANCE_M,
  buildRimPath,
  buildTreeScene,
  getTreeTint,
  isBareSeason,
  isTreeRidge,
  pickSentinels,
  planTrees,
  type RidgePoint,
  type TreeScene,
} from '../src/utils/treeSilhouettes';
import type { HorizonProfile } from '../src/utils/horizonUtils';

// ROADMAP item 141: tree silhouettes on the ridge, spec 2-9 with real land cover.
// ROADMAP item 150 (lookbook V6 + V4): a thin forest band, lone sentinels, a sunset rim light.

const PX_PER_DEG = 9;
const RIDGE_ANGLE = 2;
const HORIZON_Y = 500;
const yAt = (angle: number) => HORIZON_Y - angle * PX_PER_DEG;
const RIDGE_Y = yAt(RIDGE_ANGLE);
// A 20 m tree 1 km away: atan(20 / 1000) = 1.15°, about 10.3 px.
const TREE_PX_1KM = ((Math.atan(0.02) * 180) / Math.PI) * PX_PER_DEG;

const makeProfile = (overrides: Partial<Record<'angle' | 'distance' | 'height', number>> = {}): HorizonProfile => ({
  angles: new Array(360).fill(overrides.angle ?? RIDGE_ANGLE),
  observerElevation: 400,
  eyeHeight: 1.7,
  ridgeDistances: new Array(360).fill(overrides.distance ?? 1000),
  ridgeHeights: new Array(360).fill(overrides.height ?? 800),
});

// Static mode: 2 px per degree, north at x = 0. Compass mode: the 90° around `heading`, 4 px per degree.
const STATIC = { width: 720, leftAzimuth: 0, degrees: 360 };
const compassView = (heading: number) => ({ width: 360, leftAzimuth: heading - 45, degrees: 90 });
const staticSegments = (profile: HorizonProfile): RidgePoint[][] => [
  profile.angles.map((angle, azimuth) => ({ x: azimuth * 2, y: yAt(Math.max(0, angle)), azimuth })),
];

// Tree cover on the whole degrees in [from, to] (to may pass 360: over north).
const coverOf = (...ranges: [number, number][]): string => {
  const cover = new Array(360).fill('0');
  for (const [from, to] of ranges) for (let i = from; i <= to; i++) cover[i % 360] = '1';
  return cover.join('');
};
const ALL = '1'.repeat(360);
const options = { perDegree: 1, bare: false, latitude: 47.78, longitude: 9.61 };
const scene = (profile: HorizonProfile, cover: string, extra: Partial<typeof options> = {}, view = STATIC): TreeScene =>
  buildTreeScene(planTrees(profile, cover, yAt, { ...options, ...extra, pxPerDegree: view.width / view.degrees }), view);

// The points of a path's M, L and Q commands, and the peak of each quadratic bump.
const points = (d: string): { x: number; y: number }[] =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
const bumpPeaks = (d: string): { x: number; height: number }[] => {
  const peaks: { x: number; height: number }[] = [];
  let at = { x: 0, y: 0 };
  for (const [, command, args] of d.matchAll(/([MLQVHAZ])([^MLQVHAZ]*)/g)) {
    const p = points(args);
    if (command === 'Q') peaks.push({ x: p[0].x, height: RIDGE_Y - (at.y + 2 * p[0].y + p[1].y) / 4 });
    if (p.length) at = p[p.length - 1];
  }
  return peaks;
};
// The sentinels' rim edges (a band bump's edge is the same on both sides).
const sentinelEdges = (s: TreeScene) => s.rim.filter((edge) => edge.left !== edge.right);
const gap = (a: number, b: number) => Math.abs(((b - a + 540) % 360) - 180);

describe('isTreeRidge (spec 2)', () => {
  it('takes a ridge above the flat horizon, with a known height, up to 8 km away', () => {
    expect(isTreeRidge(makeProfile(), 10)).toBe(true);
    expect(isTreeRidge(makeProfile({ distance: TREE_MAX_DISTANCE_M }), 10)).toBe(true);
  });

  it('skips the flat sea line, a valley, a ridge beyond 8 km and a ridge without data', () => {
    expect(isTreeRidge(makeProfile({ angle: 0 }), 10)).toBe(false);
    expect(isTreeRidge(makeProfile({ angle: -1 }), 10)).toBe(false);
    expect(isTreeRidge(makeProfile({ distance: TREE_MAX_DISTANCE_M + 1 }), 10)).toBe(false);
    expect(isTreeRidge({ ...makeProfile(), ridgeDistances: undefined }, 10)).toBe(false);
    expect(isTreeRidge({ ...makeProfile(), ridgeHeights: new Array(360).fill(null) }, 10)).toBe(false);
  });
});

describe('isBareSeason (spec 6)', () => {
  it('bares the broadleaves from December to February in the north', () => {
    expect([11, 0, 1].map((m) => isBareSeason(m, 47))).toEqual([true, true, true]);
    expect([2, 6, 10].map((m) => isBareSeason(m, 47))).toEqual([false, false, false]);
  });

  it('bares them from June to August in the south', () => {
    expect([5, 6, 7].map((m) => isBareSeason(m, -33))).toEqual([true, true, true]);
    expect([0, 11].map((m) => isBareSeason(m, -33))).toEqual([false, false]);
  });
});

describe('getTreeTint (spec 7)', () => {
  it('is green in spring and summer, amber from Sep 20 to Nov 10, none in winter (north)', () => {
    expect(getTreeTint(new Date(2026, 2, 1), 47)).toBe('green');
    expect(getTreeTint(new Date(2026, 8, 19), 47)).toBe('green');
    expect(getTreeTint(new Date(2026, 8, 20), 47)).toBe('amber');
    expect(getTreeTint(new Date(2026, 10, 10), 47)).toBe('amber');
    expect(getTreeTint(new Date(2026, 10, 11), 47)).toBeNull();
    expect(getTreeTint(new Date(2026, 0, 15), 47)).toBeNull();
  });

  it('uses the date six months on in the south', () => {
    expect(getTreeTint(new Date(2026, 11, 15), -33)).toBe('green');
    expect(getTreeTint(new Date(2026, 2, 20), -33)).toBe('amber');
    expect(getTreeTint(new Date(2026, 6, 15), -33)).toBeNull();
  });
});

describe('buildTreeScene: the forest band (item 150, V6)', () => {
  it('draws a thin band only over the tree cover, at half the tree height ±15 %', () => {
    // Two trees: too short a stretch for a sentinel, so the path is the band alone.
    const s = scene(makeProfile(), coverOf([10, 11]));
    expect(s.path).not.toBe('');
    expect(sentinelEdges(s)).toHaveLength(0);
    for (const peak of bumpPeaks(s.path)) {
      expect(peak.height).toBeGreaterThanOrEqual(0.85 * 0.5 * TREE_PX_1KM - 0.1);
      expect(peak.height).toBeLessThanOrEqual(1.15 * 0.5 * TREE_PX_1KM + 0.1);
    }
    // The stretch is 9.5°-11.5° (x 19-23), widened to one bump (1.3 × the band height).
    for (const p of points(s.path)) expect(Math.abs(p.x - 21)).toBeLessThanOrEqual((1.3 * 0.5 * TREE_PX_1KM) / 2 + 0.1);
    expect(scene(makeProfile(), '0'.repeat(360)).path).toBe('');
  });

  it('caps the band at half of 14 px for near trees', () => {
    const peaks = bumpPeaks(scene(makeProfile({ distance: 100 }), coverOf([10, 11])).path);
    expect(Math.max(...peaks.map((p) => p.height))).toBeLessThanOrEqual(7 * 1.15 + 0.1);
  });

  it('draws no trees beyond 8 km, on the flat horizon or below it, or under 1.5 px', () => {
    // 20 m at 7 km is 0.16°, under 1.5 px at 9 px/°.
    for (const profile of [makeProfile({ distance: 9000 }), makeProfile({ angle: 0 }), makeProfile({ angle: -3 }), makeProfile({ distance: 7000 })]) {
      const s = scene(profile, ALL);
      expect(s.path).toBe('');
      expect(s.rim).toHaveLength(0);
      expect(s.forest.some(Boolean)).toBe(false);
    }
  });

  it('joins a stretch over north into one, drawn on both screen edges', () => {
    const s = scene(makeProfile(), coverOf([355, 364]));
    const xs = points(s.path).map((p) => p.x);
    expect(Math.min(...xs)).toBeLessThan(10);
    expect(Math.max(...xs)).toBeGreaterThan(710);
    // One stretch of 10: its peak (the first, the ridge is flat) is a sentinel. It stands on
    // the seam (x 710 of 720), so it shows on both edges.
    expect(sentinelEdges(s).map((edge) => edge.azimuth)).toEqual([355, 355]);
    expect(sentinelEdges(s).map((edge) => Math.round(points(edge.right)[0].x))).toEqual([710, -10]);
  });

  it('gives the same place the same trees, and another place other ones', () => {
    const profile = makeProfile();
    const cover = coverOf([20, 80], [200, 260]);
    expect(scene(profile, cover).path).toBe(scene(profile, cover).path);
    expect(scene(profile, cover, { latitude: 48.0, longitude: 8.2 }).path).not.toBe(scene(profile, cover).path);
  });

  it('keeps every bump at its world azimuth when the compass heading turns', () => {
    // One plan for every heading (it has none): turned by 0.25° (1 px at 4 px/°), each edge
    // moves 1 px left and none changes its shape.
    const plan = planTrees(makeProfile(), ALL, yAt, { ...options, perDegree: 3, pxPerDegree: 4 });
    const a = buildTreeScene(plan, compassView(180.5));
    const b = buildTreeScene(plan, compassView(180.75));
    const later = new Map(b.rim.map((edge) => [edge.azimuth.toFixed(3), edge.right]));
    let compared = 0;
    for (const edge of a.rim) {
      const moved = later.get(edge.azimuth.toFixed(3));
      if (!moved) continue;
      const [p, q] = [points(edge.right), points(moved)];
      expect(q).toHaveLength(p.length);
      p.forEach((pt, k) => {
        expect(q[k].x).toBeCloseTo(pt.x - 1, 0);
        expect(q[k].y).toBeCloseTo(pt.y, 5);
      });
      compared++;
    }
    expect(compared).toBeGreaterThan(30);
  });

  it('fills the whole compass view, also across north', () => {
    const s = scene(makeProfile(), ALL, { perDegree: 3 }, compassView(0.5));
    const xs = points(s.path).map((p) => p.x).filter((x) => x >= 0 && x <= 360);
    expect(Math.min(...xs)).toBeLessThan(5);
    expect(Math.max(...xs)).toBeGreaterThan(355);
  });
});

describe('pickSentinels (item 150, V6)', () => {
  const heights = (...ranges: [number, number][]) => {
    const h = new Array(360).fill(0);
    for (const [from, to] of ranges) for (let i = from; i <= to; i++) h[i % 360] = 5;
    return h;
  };
  const withPeaks = (...peaks: number[]) => {
    const profile = makeProfile();
    for (const p of peaks) profile.angles[p % 360] = 4;
    return profile;
  };

  it('takes the peak of each forest stretch and both ends of a long one', () => {
    expect(pickSentinels(withPeaks(40), heights([20, 59]))).toEqual([40, 20, 59]);
  });

  it('takes nothing from a stretch under 3 trees, and only the peak from one under 6', () => {
    expect(pickSentinels(withPeaks(100), heights([100, 101]))).toEqual([]);
    expect(pickSentinels(withPeaks(202), heights([200, 203]))).toEqual([202]);
  });

  it('joins a stretch over north', () => {
    expect(pickSentinels(withPeaks(359), heights([358, 361]))).toEqual([359]);
  });

  it(`keeps at most ${SENTINEL_MAX}, each at least ${SENTINEL_MIN_GAP_DEG}° from the others`, () => {
    const ranges = Array.from({ length: 36 }, (_, k) => [k * 10, k * 10 + 3] as [number, number]);
    const picked = pickSentinels(withPeaks(...ranges.map(([from]) => from + 1)), heights(...ranges));
    expect(picked).toHaveLength(SENTINEL_MAX);
    for (const a of picked) for (const b of picked) if (a !== b) expect(gap(a, b)).toBeGreaterThanOrEqual(SENTINEL_MIN_GAP_DEG);
  });

  it('prefers the taller trees, and the same input gives the same pick', () => {
    const h = heights([10, 13], [100, 103]);
    for (let i = 100; i <= 103; i++) h[i] = 9;
    const profile = withPeaks(11, 101);
    expect(pickSentinels(profile, h)[0]).toBe(101);
    expect(pickSentinels(profile, h)).toEqual(pickSentinels(profile, [...h]));
  });
});

describe('buildTreeScene: the sentinels (item 150, V6)', () => {
  // The rim's first point is the sentinel's top: a spruce 1.1 × H high, a crown 0.964 × H.
  const topHeights = (s: TreeScene) => sentinelEdges(s).map((edge) => RIDGE_Y - points(edge.right)[0].y);

  it('stands them at their azimuths, twice the tree height', () => {
    const profile = makeProfile();
    profile.angles[120] = 2.2;
    const s = scene(profile, coverOf([100, 140]));
    const edges = sentinelEdges(s);
    expect(edges.map((edge) => edge.azimuth)).toEqual([120, 100, 140]);
    for (const edge of edges) expect(points(edge.right)[0].x).toBeCloseTo(edge.azimuth * 2, 1);
    const H = 2 * TREE_PX_1KM;
    for (const top of topHeights(scene(makeProfile(), coverOf([100, 140])))) {
      expect([0.964 * H, 1.1 * H].some((h) => Math.abs(top - h) < 0.2)).toBe(true);
    }
  });

  it('keeps them between 7 and 24 px', () => {
    for (const [distance, H] of [[100, 24], [5000, 7]]) {
      for (const top of topHeights(scene(makeProfile({ distance }), coverOf([100, 140])))) {
        expect([0.964 * H, 1.1 * H].some((h) => Math.abs(top - h) < 0.2)).toBe(true);
      }
    }
  });

  it('draws more spruces on a high ridge, more lime or oak crowns on a low one', () => {
    const ranges = Array.from({ length: 36 }, (_, k) => [k * 10, k * 10 + 3] as [number, number]);
    const spruces = (height: number) =>
      sentinelEdges(scene(makeProfile({ height }), coverOf(...ranges))).filter((edge) => !edge.right.includes('A')).length;
    expect(spruces(1500)).toBeGreaterThanOrEqual(6);
    expect(spruces(300)).toBeLessThanOrEqual(4);
  });

  it('draws bare broadleaf crowns half as wide in winter', () => {
    const radii = (bare: boolean) =>
      sentinelEdges(scene(makeProfile({ height: 300 }), coverOf([100, 140]), { bare }))
        .filter((edge) => edge.right.includes('A'))
        .map((edge) => edge.right.split('A')[1].split(' ')[0].split(',').map(Number));
    const summer = radii(false);
    const winter = radii(true);
    expect(summer.length).toBeGreaterThan(0);
    expect(winter[0][1]).toBe(summer[0][1]);
    expect(winter[0][0]).toBeCloseTo(summer[0][0] / 2, 0);
  });

  it('keeps the same sentinels in compass mode', () => {
    const profile = makeProfile();
    profile.angles[120] = 2.2;
    const cover = coverOf([100, 140]);
    const compass = sentinelEdges(scene(profile, cover, { perDegree: 3 }, compassView(120)));
    expect(compass.map((edge) => edge.azimuth)).toEqual([120, 100, 140]);
    // 120° is the view's centre.
    expect(points(compass[0].right)[0].x).toBeCloseTo(180, 1);
  });
});

describe('buildRimPath (item 150, V4)', () => {
  const profile = makeProfile();
  profile.angles[120] = 2.2;
  const forest = scene(profile, coverOf([100, 140]));
  const sentinel = sentinelEdges(forest)[0];

  it('lights the sentinel on the side that faces the sun', () => {
    const fromEast = buildRimPath(forest, staticSegments(profile), profile, 90);
    const fromWest = buildRimPath(forest, staticSegments(profile), profile, 200);
    expect(fromEast).toContain(sentinel.left);
    expect(fromEast).not.toContain(sentinel.right);
    expect(fromWest).toContain(sentinel.right);
    expect(fromWest).not.toContain(sentinel.left);
  });

  it('keeps only the edges within 80° of the sun', () => {
    // Sun at 0°: the forest at 100-140° is more than 80° away, the bare ridge at 0-80° is not.
    const xs = points(buildRimPath(forest, staticSegments(profile), profile, 0)).map((p) => p.x);
    expect(xs.some((x) => x > 160 && x < 560)).toBe(false);
    expect(xs.some((x) => x <= 160)).toBe(true);
    expect(xs.some((x) => x >= 560)).toBe(true);
    expect(buildRimPath(forest, staticSegments(profile), profile, 120)).toContain(sentinel.right);
  });

  it('lights the bare ridge, but not under the forest or on the flat sea line', () => {
    const sea = makeProfile();
    for (let i = 30; i <= 39; i++) sea.angles[i] = 0;
    const s = scene(sea, coverOf([50, 51]));
    const runs = buildRimPath(s, staticSegments(sea), sea, 45).split('M').filter(Boolean)
      .filter((run) => !run.includes('Q'))
      .map((run) => points(run).map((p) => p.x / 2));
    const lit = new Set(runs.flat());
    for (const az of [20, 29, 40, 49, 52, 120]) expect(lit.has(az)).toBe(true);
    for (const az of [30, 35, 39, 50, 51, 130]) expect(lit.has(az)).toBe(false);
  });
});
