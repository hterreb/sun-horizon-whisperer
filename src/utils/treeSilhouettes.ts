// Tree silhouettes on the terrain ridge (ROADMAP items 141 and 150): pure geometry and season
// rules, no DOM, no network. Where the trees stand comes from real land cover (landCover.ts);
// this module decides their size, shape and season. Item 150 (lookbook V6 + V4): a thin forest
// band along each forest stretch, a few large single trees ("sentinels") on the forest peaks
// and edges, and a warm rim on their sun side at golden hour. Both modules load with a dynamic
// import() (useTreeCover), so the start bundle does not grow (item 125).

import { shortestHeadingDelta } from './compassUtils';
import { horizonAngleAt, type HorizonProfile } from './horizonUtils';
import { hashSeed, mulberry32 } from './skyCloudUtils';

// Trees only on a ridge this close (spec 2): further away a 20 m tree is under 1.5 px.
export const TREE_MAX_DISTANCE_M = 8_000;
const TREE_HEIGHT_M = 20;
const MIN_TREE_PX = 1.5;
const MAX_TREE_PX = 14;

// The forest band (item 150, V6): half the tree height, each bump ±15 %, the valleys between
// two bumps at 75 % of the lower one. A bump is 1.3 × the band height wide, 3-10 px.
const BAND_SCALE = 0.5;
const BAND_JITTER = 0.15;
const BAND_VALLEY = 0.75;
const BAND_BUMP_FACTOR = 1.3;
const BAND_BUMP_MIN_PX = 3;
const BAND_BUMP_MAX_PX = 10;

// The sentinels (V6): at most 9 on the full circle, at least 14° apart, 2 × the tree height
// (7-24 px). The same trees in static and compass mode.
export const SENTINEL_MAX = 9;
export const SENTINEL_MIN_GAP_DEG = 14;
const SENTINEL_MIN_PX = 7;
const SENTINEL_MAX_PX = 24;

// The rim light (V4): the edges within 80° of the sun's azimuth go into the rim path; its
// gradient (SunVisualization) fades from the sun's azimuth to nothing at 75°.
export const RIM_RANGE_DEG = 80;
export const RIM_FADE_DEG = 75;

// A ridge sample in screen px with its azimuth (SunVisualization.buildTerrainSegments).
export interface RidgePoint {
  x: number;
  y: number;
  azimuth: number;
}

// The screen: `width` px, `leftAzimuth` at x = 0 (the scale is the plan's `pxPerDegree`).
export interface TreeView {
  width: number;
  leftAzimuth: number;
}

// The trees on the full circle, in tree positions n (azimuth × perDegree); see planTrees.
export interface TreePlan {
  perDegree: number;
  pxPerDegree: number;
  // The ridge's screen y at position n.
  ridgeY: (n: number) => number;
  // Each forest stretch: its first bump starts at position n0, each bump is bw positions wide.
  stretches: { n0: number; bw: number; bumps: { azimuth: number; height: number; lit: boolean }[] }[];
  sentinels: { i: number; H: number; conifer: boolean; sx: number; halfWidth: number }[];
  forest: boolean[];
}

// The lit outline of a band bump or a sentinel, at its azimuth: `left` when the sun is to the
// left of it (a smaller azimuth), `right` when it is to the right.
export interface RimEdge {
  azimuth: number;
  left: string;
  right: string;
}

export interface TreeScene {
  // The band and the sentinels, to add to the terrain fill.
  path: string;
  rim: RimEdge[];
  // The whole degrees with trees; the rest of the ridge is bare.
  forest: boolean[];
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
const pt = (x: number, y: number): string => `${r1(x)},${r1(y)}`;
const mod = (v: number, m: number): number => ((v % m) + m) % m;
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const median = (values: number[]): number => [...values].sort((a, b) => a - b)[values.length >> 1] ?? 0;

// Spec 2-4: the tree height in px at each tree position n (azimuth n / perDegree) on the full
// circle; 0 = no tree. Uncapped, for the sentinels; the band caps it at 14 px.
const treeHeights = (
  profile: HorizonProfile,
  cover: string,
  yAt: (angleDeg: number) => number,
  perDegree: number
): number[] =>
  Array.from({ length: 360 * perDegree }, (_, n) => {
    const azimuth = n / perDegree;
    const i = Math.round(azimuth) % 360;
    if (cover[i] !== '1' || !isTreeRidge(profile, i)) return 0;
    const angle = Math.max(0, horizonAngleAt(profile, azimuth));
    const treeDeg = (Math.atan(TREE_HEIGHT_M / (profile.ridgeDistances?.[i] ?? Infinity)) * 180) / Math.PI;
    const h = yAt(angle) - yAt(angle + treeDeg);
    return h >= MIN_TREE_PX ? h : 0;
  });

// The forest stretches: runs of tree positions around the circle, as [first position,
// length]. A run over north goes on past the last position (first + length > heights.length).
const treeRuns = (heights: number[]): [number, number][] => {
  const steps = heights.length;
  const gap = heights.findIndex((h) => !h);
  if (gap < 0) return steps ? [[0, steps]] : [];
  const runs: [number, number][] = [];
  let start = -1;
  for (let k = 1; k <= steps; k++) {
    const n = gap + k;
    if (heights[n % steps]) {
      if (start < 0) start = n;
    } else if (start >= 0) {
      runs.push([start, n - start]);
      start = -1;
    }
  }
  return runs;
};

// V6: the sentinels' whole-degree azimuths. Candidates: the highest point (by the horizon
// angle) of each stretch of 3 or more trees, scored by its tree height + 3 px, and both ends
// of each stretch of 6 or more, scored by their tree height. The best first, each at least
// 14° from the ones before, at most 9. Ties go to the smaller azimuth, so the pick is stable.
export const pickSentinels = (profile: HorizonProfile, heights: number[]): number[] => {
  const candidates: { i: number; score: number }[] = [];
  for (const [start, length] of treeRuns(heights)) {
    if (length < 3) continue;
    const at = (k: number) => (start + k) % 360;
    let peak = at(0);
    for (let k = 1; k < length; k++) if (profile.angles[at(k)] > profile.angles[peak]) peak = at(k);
    candidates.push({ i: peak, score: heights[peak] + 3 });
    if (length >= 6) {
      const first = at(0);
      const last = at(length - 1);
      candidates.push({ i: first, score: heights[first] }, { i: last, score: heights[last] });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.i - b.i);
  const picked: number[] = [];
  for (const { i } of candidates) {
    if (picked.length >= SENTINEL_MAX) break;
    if (picked.every((p) => Math.abs(shortestHeadingDelta(p, i)) >= SENTINEL_MIN_GAP_DEG)) picked.push(i);
  }
  return picked;
};

// A spruce in 3 stepped tiers (V6, from the lookbook's V3), h px high. The outline of one side
// (-1 left, +1 right) from the trunk's foot up to the top tier.
const spruceSide = (x: number, y: number, h: number, side: number): [number, number][] => {
  const w = h * 0.2;
  const t = Math.max(0.35, h * 0.04);
  const dr = 0.03 * h;
  const b1 = y - 0.12 * h;
  const b2 = y - 0.42 * h;
  const b3 = y - 0.68 * h;
  return [[x + side * t, y + 1], [x + side * t, b1], [x + side * w, b1], [x + side * 0.38 * w, b2],
    [x + side * 0.72 * w, b2 + dr], [x + side * 0.26 * w, b3], [x + side * 0.48 * w, b3 + dr]];
};
// Clockwise on the screen, the same as the terrain fill, so the nonzero fill joins them with
// no holes. The base goes 1 px into the ground (item 141).
const spruce = (x: number, y: number, h: number): string =>
  'M' + [...spruceSide(x, y, h, -1), [x, y - h], ...spruceSide(x, y, h, 1).reverse()].map(([a, b]) => pt(a, b)).join('L') + 'Z';
// The sun-side rim: from the top down the tiers to the tip of the lowest one.
const spruceRim = (x: number, y: number, h: number, side: number): string =>
  'M' + [[x, y - h], ...spruceSide(x, y, h, side).slice(2).reverse()].map(([a, b]) => pt(a, b)).join('L');

// A lone lime or oak (V6): a trunk and a crown of three round lobes, H px high. In the bare
// season (item 141, spec 6) the crown is half as wide (`sx` 0.5): the lobes become ovals.
// Lobes as fractions of H (crown width W = 0.95 H): left (-0.228, -0.42) r 0.2565, right
// (0.2375, -0.46) r 0.266, top (0, -0.66) r 0.304.
const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${pt(cx - rx, cy)}A${r1(rx)},${r1(ry)} 0 1 1 ${pt(cx + rx, cy)}A${r1(rx)},${r1(ry)} 0 1 1 ${pt(cx - rx, cy)}Z`;
const crown = (x: number, y: number, H: number, sx: number): string => {
  const t = Math.max(0.5, H * 0.055);
  return `M${pt(x - t, y + 1)}V${r1(y - 0.4 * H)}H${r1(x + t)}V${r1(y + 1)}Z` +
    ellipse(x - 0.228 * H * sx, y - 0.42 * H, 0.2565 * H * sx, 0.2565 * H) +
    ellipse(x + 0.2375 * H * sx, y - 0.46 * H, 0.266 * H * sx, 0.266 * H) +
    ellipse(x, y - 0.66 * H, 0.304 * H * sx, 0.304 * H);
};
// The sun-side rim of the crown's outline: over the top lobe from its top to where it meets
// the side lobe, then round the side lobe to its bottom. The meeting points are where the two
// circles cross (right (0.2982, -0.7190), left (-0.3040, -0.6650)); a horizontal squeeze keeps
// them on the outline.
const crownRim = (x: number, y: number, H: number, sx: number, side: number): string => {
  const sweep = side > 0 ? 1 : 0;
  const [mx, my, r, bx, by] = side > 0 ? [0.2982, -0.719, 0.266, 0.2375, -0.194] : [-0.304, -0.665, 0.2565, -0.228, -0.1635];
  return `M${pt(x, y - 0.964 * H)}A${r1(0.304 * H * sx)},${r1(0.304 * H)} 0 0 ${sweep} ${pt(x + mx * H * sx, y + my * H)}` +
    `A${r1(r * H * sx)},${r1(r * H)} 0 0 ${sweep} ${pt(x + bx * H * sx, y + by * H)}`;
};

// Spec 2-6, 8, 9 with item 150's V6 shapes, laid out on the full circle in world positions
// (n = azimuth × perDegree): which bumps the band has and how high, and where the sentinels
// stand. Nothing here depends on the heading, so SunVisualization keeps the plan while the
// compass turns and only `buildTreeScene` runs per heading. `perDegree` tree positions per
// degree: 1 in static mode, 3 in compass mode; `pxPerDegree` the screen scale. `yAt` is the
// scene's altitude -> screen y mapping. The same place gives the same trees: the species and
// the bumps are seeded by the location to 0.01°.
export const planTrees = (
  profile: HorizonProfile,
  cover: string,
  yAt: (angleDeg: number) => number,
  options: { perDegree: number; pxPerDegree: number; bare: boolean; latitude: number; longitude: number }
): TreePlan => {
  const { perDegree, pxPerDegree, bare } = options;
  const seed = `${options.latitude.toFixed(2)}|${options.longitude.toFixed(2)}`;
  const steps = 360 * perDegree;
  const stepPx = pxPerDegree / perDegree;
  const heights = treeHeights(profile, cover, yAt, perDegree);
  const degreeHeights = Array.from({ length: 360 }, (_, i) => heights[i * perDegree]);

  // The sentinels: the same world azimuths in both modes, the species seeded by the azimuth.
  const sentinels = pickSentinels(profile, degreeHeights).map((i) => {
    const H = clamp(degreeHeights[i] * 2, SENTINEL_MIN_PX, SENTINEL_MAX_PX);
    const conifer = mulberry32(hashSeed(`${seed}|${i}`))() < coniferShare(profile.ridgeHeights?.[i] ?? 0);
    const sx = bare ? 0.5 : 1;
    return { i, H, conifer, sx, halfWidth: conifer ? 0.22 * H : 0.51 * H * sx };
  });

  // The band: one bumpy canopy line per stretch, bumps 1.3 × the band height wide.
  const stretches = treeRuns(heights).map(([start, length]) => {
    const bandAt = (n: number) => Math.min(heights[mod(n, steps)], MAX_TREE_PX) * BAND_SCALE;
    const bumpPx = clamp(BAND_BUMP_FACTOR * median(Array.from({ length }, (_, k) => bandAt(start + k))), BAND_BUMP_MIN_PX, BAND_BUMP_MAX_PX);
    const bumpN = bumpPx / stepPx;
    let n0 = start - 0.5;
    let n1 = start + length - 0.5;
    if (n1 - n0 < bumpN) {
      const c = (n0 + n1) / 2;
      n0 = c - bumpN / 2;
      n1 = c + bumpN / 2;
    }
    const count = Math.max(1, Math.round((n1 - n0) / bumpN));
    const bw = (n1 - n0) / count;
    // The band height between two trees (linear), held at the stretch's ends.
    const heightAt = (n: number) => {
      const c = clamp(n, start, start + length - 1);
      const f = Math.floor(c);
      return bandAt(f) + (bandAt(Math.min(f + 1, start + length - 1)) - bandAt(f)) * (c - f);
    };
    const bumps = Array.from({ length: count }, (_, j) => {
      const nc = n0 + (j + 0.5) * bw;
      const azimuth = mod(nc / perDegree, 360);
      const r = mulberry32(hashSeed(`${seed}|band|${Math.round(azimuth * 4)}`))();
      // No rim across a sentinel's foot: it has its own.
      const lit = !sentinels.some((s) => Math.abs(shortestHeadingDelta(s.i, azimuth)) * pxPerDegree < s.halfWidth + (bw * stepPx) / 2);
      return { azimuth, height: heightAt(nc) * (1 + BAND_JITTER * (2 * r - 1)), lit };
    });
    return { n0, bw, bumps };
  });

  return {
    perDegree,
    pxPerDegree,
    ridgeY: (n) => yAt(Math.max(0, horizonAngleAt(profile, mod(n / perDegree, 360)))),
    stretches,
    sentinels,
    forest: degreeHeights.map((h) => h > 0),
  };
};

// The plan on the screen: the band and the sentinels as one path (to add to the terrain fill)
// and their rim edges. `leftAzimuth` is at x = 0. A stretch over the screen's seam (static) or
// behind the viewer (compass) draws in up to two copies; only the bumps on the screen are drawn.
export const buildTreeScene = (plan: TreePlan, view: TreeView): TreeScene => {
  const { perDegree, pxPerDegree, ridgeY } = plan;
  const stepPx = pxPerDegree / perDegree;
  const period = 360 * pxPerDegree;
  // x of tree position n, in [0, period): one copy; the other is `period` px to the left.
  const xOf = (n: number) => mod(n / perDegree - view.leftAzimuth, 360) * pxPerDegree;
  const shapes: string[] = [];
  const rim: RimEdge[] = [];

  for (const { n0, bw, bumps } of plan.stretches) {
    const count = bumps.length;
    const bumpW = bw * stepPx;
    for (const xStart of [xOf(n0), xOf(n0) - period]) {
      if (xStart >= view.width || xStart + count * bumpW <= 0) continue;
      const xAt = (n: number) => xStart + (n - n0) * stepPx;
      const jFrom = clamp(Math.floor(-xStart / bumpW) - 1, 0, count - 1);
      const jTo = clamp(Math.floor((view.width - xStart) / bumpW) + 1, 0, count - 1);
      // The valley points between the bumps; the stretch's own ends are on the ridge.
      const valley = (j: number): [number, number] => {
        const n = n0 + j * bw;
        const v = j === 0 || j === count ? 0 : BAND_VALLEY * Math.min(bumps[j - 1].height, bumps[j].height);
        return [xAt(n), ridgeY(n) - v];
      };
      let top = '';
      let prev = valley(jFrom);
      const first = prev;
      for (let j = jFrom; j <= jTo; j++) {
        const next = valley(j + 1);
        const nc = n0 + (j + 0.5) * bw;
        const peakY = ridgeY(nc) - bumps[j].height;
        // The quadratic's midpoint is the bump's peak.
        const bump = `Q${pt(xAt(nc), 2 * peakY - (prev[1] + next[1]) / 2)} ${pt(next[0], next[1])}`;
        top += bump;
        if (bumps[j].lit) {
          const d = `M${pt(prev[0], prev[1])}${bump}`;
          rim.push({ azimuth: bumps[j].azimuth, left: d, right: d });
        }
        prev = next;
      }
      const nL = n0 + jFrom * bw;
      const nR = n0 + (jTo + 1) * bw;
      // Back along the ridge, 1 px into the ground, through each whole degree in between.
      let back = '';
      for (let k = Math.ceil(nR / perDegree) - 1; k * perDegree > nL; k--) back += `L${pt(xAt(k * perDegree), ridgeY(k * perDegree) + 1)}`;
      shapes.push(`M${pt(xAt(nL), ridgeY(nL) + 1)}L${pt(first[0], first[1])}${top}L${pt(xAt(nR), ridgeY(nR) + 1)}${back}Z`);
    }
  }

  for (const s of plan.sentinels) {
    const n = s.i * perDegree;
    const y = ridgeY(n);
    for (const x of [xOf(n), xOf(n) - period]) {
      if (x + s.halfWidth < 0 || x - s.halfWidth > view.width) continue;
      if (s.conifer) {
        const h = s.H * 1.1;
        shapes.push(spruce(x, y, h));
        rim.push({ azimuth: s.i, left: spruceRim(x, y, h, -1), right: spruceRim(x, y, h, 1) });
      } else {
        shapes.push(crown(x, y, s.H, s.sx));
        rim.push({ azimuth: s.i, left: crownRim(x, y, s.H, s.sx, -1), right: crownRim(x, y, s.H, s.sx, 1) });
      }
    }
  }

  return { path: shapes.join(''), rim, forest: plan.forest };
};

// V4: the rim light's path for the sun at `sunAzimuth`: the sun-side edge of each band bump
// and sentinel within 80° of it, and the bare ridge there (not the flat sea line), along the
// terrain's own points. One path, stroked 1 px by SunVisualization.
export const buildRimPath = (
  scene: TreeScene,
  segments: RidgePoint[][],
  profile: HorizonProfile,
  sunAzimuth: number
): string => {
  const near = (azimuth: number) => Math.abs(shortestHeadingDelta(azimuth, sunAzimuth)) <= RIM_RANGE_DEG;
  let d = '';
  for (const edge of scene.rim) {
    if (near(edge.azimuth)) d += shortestHeadingDelta(edge.azimuth, sunAzimuth) >= 0 ? edge.right : edge.left;
  }
  for (const segment of segments) {
    let run: RidgePoint[] = [];
    const flush = () => {
      if (run.length > 1) d += 'M' + run.map((p) => pt(p.x, p.y)).join('L');
      run = [];
    };
    for (const p of segment) {
      const bare = !scene.forest[Math.round(p.azimuth) % 360] && horizonAngleAt(profile, p.azimuth) > 0;
      if (bare && near(p.azimuth)) run.push(p);
      else flush();
    }
    flush();
  }
  return d;
};
