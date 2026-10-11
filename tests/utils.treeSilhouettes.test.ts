import { describe, it, expect } from 'vitest';
import {
  TREE_MAX_DISTANCE_M,
  buildTreePath,
  getTreeTint,
  isBareSeason,
  isTreeRidge,
  type RidgePoint,
} from '../src/utils/treeSilhouettes';
import type { HorizonProfile } from '../src/utils/horizonUtils';

// ROADMAP item 141: tree silhouettes on the ridge, spec 2-9 with real land cover.

const PX_PER_DEG = 9;
const RIDGE_ANGLE = 2;
const HORIZON_Y = 500;
const yAt = (angle: number) => HORIZON_Y - angle * PX_PER_DEG;

const makeProfile = (overrides: Partial<Record<'angle' | 'distance' | 'height', number>> = {}): HorizonProfile => ({
  angles: new Array(360).fill(overrides.angle ?? RIDGE_ANGLE),
  observerElevation: 400,
  eyeHeight: 1.7,
  ridgeDistances: new Array(360).fill(overrides.distance ?? 1000),
  ridgeHeights: new Array(360).fill(overrides.height ?? 800),
});

// Static mode: one point per whole degree, 2 px apart.
const staticSegments = (profile: HorizonProfile): RidgePoint[][] => [
  profile.angles.map((angle, azimuth) => ({ x: azimuth * 2, y: yAt(Math.max(0, angle)), azimuth })),
];

// Compass mode: the 91 points of a 90° field of view around `heading`, 4 px per degree.
const compassSegments = (profile: HorizonProfile, heading: number): RidgePoint[][] => [
  Array.from({ length: 91 }, (_, i) => {
    const azimuth = (((heading - 45 + i) % 360) + 360) % 360;
    return { x: i * 4, y: yAt(Math.max(0, profile.angles[Math.round(azimuth) % 360])), azimuth };
  }),
];

const ALL = '1'.repeat(360);
const options = { perDegree: 1, bare: false, latitude: 47.78, longitude: 9.61 };

const shapes = (path: string): string[] => path.split('M').filter(Boolean);
const conifers = (path: string): string[] => shapes(path).filter((shape) => !shape.includes('A'));
// The conifer tips: the "L x,y" between the two base corners.
const tips = (path: string): { x: number; y: number }[] =>
  conifers(path).map((shape) => {
    const [x, y] = shape.split('L')[1].split(',').map(Number);
    return { x, y };
  });

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

describe('buildTreePath (spec 3-5, 8, 9)', () => {
  it('draws one tree per degree in static mode, only where the land cover is tree cover', () => {
    const profile = makeProfile();
    const cover = '0'.repeat(10) + '1'.repeat(10) + '0'.repeat(340);
    expect(shapes(buildTreePath(staticSegments(profile), profile, cover, yAt, options))).toHaveLength(10);
    expect(buildTreePath(staticSegments(profile), profile, '0'.repeat(360), yAt, options)).toBe('');
  });

  it('draws no trees beyond 8 km, on the flat horizon or below it', () => {
    for (const profile of [makeProfile({ distance: 9000 }), makeProfile({ angle: 0 }), makeProfile({ angle: -3 })]) {
      expect(buildTreePath(staticSegments(profile), profile, ALL, yAt, options)).toBe('');
    }
  });

  it('sizes a tree by its distance: under 1.5 px it is left out, near ones stop at 14 px', () => {
    // 20 m at 7 km is 0.16°, 1.5 px at 9 px/°.
    const far = makeProfile({ distance: 7000 });
    expect(buildTreePath(staticSegments(far), far, ALL, yAt, options)).toBe('');

    const near = makeProfile({ distance: 100 });
    const ridgeY = yAt(RIDGE_ANGLE);
    const tipYs = tips(buildTreePath(staticSegments(near), near, ALL, yAt, options)).map((tip) => tip.y);
    expect(Math.min(...tipYs)).toBeCloseTo(ridgeY - 14, 5);

    // 1 km: atan(20 / 1000) = 1.15°, about 10.3 px.
    const mid = makeProfile({ distance: 1000 });
    const midTip = tips(buildTreePath(staticSegments(mid), mid, ALL, yAt, options))[0];
    expect(ridgeY - midTip.y).toBeCloseTo(((Math.atan(0.02) * 180) / Math.PI) * PX_PER_DEG, 0);
  });

  it('gives the same place the same trees, and another place other ones', () => {
    const profile = makeProfile();
    const path = buildTreePath(staticSegments(profile), profile, ALL, yAt, options);
    expect(buildTreePath(staticSegments(profile), profile, ALL, yAt, options)).toBe(path);
    expect(buildTreePath(staticSegments(profile), profile, ALL, yAt, { ...options, latitude: 48.0, longitude: 8.2 })).not.toBe(path);
  });

  it('mixes conifers by the ridge height: about 30 % below 600 m, 90 % above 1200 m', () => {
    const share = (height: number) => {
      const profile = makeProfile({ height });
      const path = buildTreePath(staticSegments(profile), profile, ALL, yAt, options);
      return conifers(path).length / shapes(path).length;
    };
    expect(share(300)).toBeGreaterThan(0.2);
    expect(share(300)).toBeLessThan(0.4);
    expect(share(900)).toBeGreaterThan(0.5);
    expect(share(900)).toBeLessThan(0.7);
    expect(share(1500)).toBeGreaterThan(0.83);
  });

  it('draws bare broadleaves with a crown half as wide', () => {
    const profile = makeProfile();
    const radii = (bare: boolean) =>
      shapes(buildTreePath(staticSegments(profile), profile, ALL, yAt, { ...options, bare }))
        .filter((shape) => shape.includes('A'))
        .map((shape) => shape.split('A')[1].split(' ')[0].split(',').map(Number));
    const summer = radii(false);
    const winter = radii(true);
    expect(summer.length).toBeGreaterThan(0);
    // Same distance everywhere, so every crown has the same size.
    expect(winter[0][1]).toBe(summer[0][1]);
    expect(winter[0][0]).toBeCloseTo(summer[0][0] / 2, 0);
  });

  it('draws three trees per degree in compass mode, at fixed azimuths when the heading turns', () => {
    const profile = makeProfile();
    const compass = { ...options, perDegree: 3 };
    const a = buildTreePath(compassSegments(profile, 180.5), profile, ALL, yAt, compass);
    expect(shapes(a)).toHaveLength(270);

    // Turned by 0.25° (1 px): every tree moves 1 px left with the terrain, none slides along it.
    const b = buildTreePath(compassSegments(profile, 180.75), profile, ALL, yAt, compass);
    const xs = (path: string) => new Set(tips(path).map((tip) => tip.x.toFixed(1)));
    const shifted = [...xs(a)].filter((x) => Number(x) >= 1).map((x) => (Number(x) - 1).toFixed(1));
    const later = xs(b);
    expect(shifted.length).toBeGreaterThan(50);
    for (const x of shifted) expect(later.has(x)).toBe(true);
  });

  it('wraps the compass field of view across north', () => {
    const profile = makeProfile();
    const path = buildTreePath(compassSegments(profile, 0.5), profile, ALL, yAt, { ...options, perDegree: 3 });
    expect(shapes(path)).toHaveLength(270);
  });
});
