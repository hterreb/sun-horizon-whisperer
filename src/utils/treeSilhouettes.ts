// Tree silhouettes on the terrain ridge (ROADMAP item 141): pure geometry and season rules,
// no DOM, no network. Where the trees stand comes from real land cover (landCover.ts); this
// module only decides their size, shape and season. Both modules load with a dynamic
// import() (useTreeCover), so the start bundle does not grow (item 125).

import { horizonAngleAt, type HorizonProfile } from './horizonUtils';
import { hashSeed, mulberry32 } from './skyCloudUtils';

// Trees only on a ridge this close (spec 2): further away a 20 m tree is under 1.5 px.
export const TREE_MAX_DISTANCE_M = 8_000;
const TREE_HEIGHT_M = 20;
const MIN_TREE_PX = 1.5;
const MAX_TREE_PX = 14;

// A ridge sample in screen px with its azimuth (SunVisualization.buildTerrainSegments).
export interface RidgePoint {
  x: number;
  y: number;
  azimuth: number;
}

export type TreeTint = 'green' | 'amber';

// What useTreeCover gives the scene: the land cover at each whole-degree ridge point
// ('1' = tree cover) and this module, loaded lazily.
export interface TreeLayer {
  cover: string;
  lib: typeof import('./treeSilhouettes');
}

// Spec 2: the ridge point at whole-degree azimuth `i` can carry trees. It must stand above
// the flat horizon (not the sea line), have a known height, and be at most 8 km away.
export const isTreeRidge = (profile: HorizonProfile, i: number): boolean => {
  const distance = profile.ridgeDistances?.[i];
  const height = profile.ridgeHeights?.[i];
  return profile.angles[i] > 0 && distance != null && height != null && distance <= TREE_MAX_DISTANCE_M;
};

// Spec 6: broadleaves are bare from December to February (June to August in the south).
export const isBareSeason = (month: number, latitude: number): boolean => {
  const m = latitude >= 0 ? month : (month + 6) % 12;
  return m === 11 || m === 0 || m === 1;
};

// Spec 7: green from March to September 19, amber from September 20 to November 10, none
// in late autumn and winter. The south uses the date six months on.
export const getTreeTint = (date: Date, latitude: number): TreeTint | null => {
  const m = latitude >= 0 ? date.getMonth() : (date.getMonth() + 6) % 12;
  const day = m * 100 + date.getDate();
  if (day >= 820 && day <= 1010) return 'amber';
  return m >= 2 && day < 820 ? 'green' : null;
};

// Spec 5: the conifer share by the ridge height above sea level.
const coniferShare = (heightM: number): number => (heightM < 600 ? 0.3 : heightM < 1200 ? 0.6 : 0.9);

const r1 = (v: number): number => Math.round(v * 10) / 10;

// One tree, standing on (x, y) with height h px. Each shape runs clockwise on the screen,
// the same as the terrain fill, so the nonzero fill joins them with no holes. The base goes
// 1 px into the ground, so a tree on a slope does not float; not more, because the tint
// (item 141, spec 7) covers that part too and would show as a band inside the ridge.
// Narrow shapes: in static mode a degree is ~1 px wide but ~9 px high, so wide crowns
// would merge into one cloud.
const treeShape = (x: number, y: number, h: number, conifer: boolean, bare: boolean): string => {
  const base = r1(y + 1);
  if (conifer) {
    const w = h * 0.2;
    return `M${r1(x - w)},${base}L${r1(x)},${r1(y - h)}L${r1(x + w)},${base}Z`;
  }
  // Broadleaf: a trunk and an oval crown, one arc from the trunk's left edge over the top
  // to its right edge. Bare (winter): the same crown, half as wide.
  const ry = h * 0.33;
  const rx = bare ? h * 0.125 : h * 0.25;
  const trunk = Math.max(0.4, h * 0.06);
  const crownBottom = r1(y - h + 2 * ry);
  return `M${r1(x - trunk)},${base}V${crownBottom}A${r1(rx)},${r1(ry)} 0 1 1 ${r1(x + trunk)},${crownBottom}V${base}Z`;
};

// Spec 3-5, 8, 9: the tree shapes along the ridge as one path, to add to the terrain fill.
// `perDegree` trees per degree of azimuth: 1 in static mode, 3 in compass mode. The trees
// stand at fixed world azimuths (n / perDegree), so they do not move along the ridge when
// the heading turns. `yAt` is the scene's altitude -> screen y mapping. The same place
// gives the same trees: the conifer/broadleaf pick is seeded by the rounded location.
export const buildTreePath = (
  segments: RidgePoint[][],
  profile: HorizonProfile,
  cover: string,
  yAt: (angleDeg: number) => number,
  options: { perDegree: number; bare: boolean; latitude: number; longitude: number }
): string => {
  const { perDegree, bare } = options;
  const seed = `${options.latitude.toFixed(2)}|${options.longitude.toFixed(2)}`;
  const steps = 360 * perDegree;
  const shapes: string[] = [];
  for (const segment of segments) {
    for (let j = 0; j < segment.length; j++) {
      const p0 = segment[j];
      const p1 = segment[j + 1];
      // Azimuths rise along a segment (static 0..359, compass from the left edge); the span
      // to the next point wraps 359 -> 0.
      const span = p1 ? (p1.azimuth - p0.azimuth + 360) % 360 : 0;
      const from = p0.azimuth * perDegree;
      const to = from + span * perDegree;
      for (let n = Math.ceil(from - 1e-9); p1 ? n < to - 1e-9 : n <= from + 1e-9; n++) {
        const azimuth = n / perDegree;
        const i = Math.round(azimuth) % 360;
        if (cover[i] !== '1' || !isTreeRidge(profile, i)) continue;
        const t = span ? (azimuth - p0.azimuth) / span : 0;
        const x = p1 ? p0.x + t * (p1.x - p0.x) : p0.x;
        const y = p1 ? p0.y + t * (p1.y - p0.y) : p0.y;
        const angle = Math.max(0, horizonAngleAt(profile, azimuth % 360));
        const treeDeg = (Math.atan(TREE_HEIGHT_M / (profile.ridgeDistances?.[i] ?? Infinity)) * 180) / Math.PI;
        const h = yAt(angle) - yAt(angle + treeDeg);
        if (h < MIN_TREE_PX) continue;
        const k = ((n % steps) + steps) % steps;
        const conifer = mulberry32(hashSeed(`${seed}|${k}`))() < coniferShare(profile.ridgeHeights?.[i] ?? 0);
        shapes.push(treeShape(x, y, Math.min(h, MAX_TREE_PX), conifer, bare));
      }
    }
  }
  return shapes.join('');
};
