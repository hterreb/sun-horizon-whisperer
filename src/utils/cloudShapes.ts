// Cloud shapes (ROADMAP item 84, C1), ported from the Cloud Types lookbook. Each shape
// is a union of ellipses and rectangles in the 120 × 60 box of the old clouds, drawn as
// one SVG path, so the moon's silver lining (item 76) fills it the same way. Wide sheets
// (Cs, As, St, Ns) are rows of these boxes. `shafts` are rain shafts under the shape, as
// [x, width, slant, y0] in the same units; they reach 110 units down. Pure data.
// Item 88 (Cloud Edges lookbook): G1 rounds the box-filling fields, S2 draws the shafts
// as strands.

export type CloudType = 'Ci' | 'Cs' | 'Ac' | 'As' | 'Cu' | 'Sc' | 'St' | 'Ns' | 'Cb' | 'Len' | 'Mam';

export type Shaft = [number, number, number, number];

export interface CloudShape {
  name: string;
  d: string;
  top: number; // the highest point, in box units
  bottom: number; // the lowest point
  shafts?: Shaft[];
}

export const SHAFT_LENGTH = 110;

interface Ellipse { cx: number; cy: number; rx: number; ry: number; rot: number }
interface Rect { r: [number, number, number, number] }
type Part = Ellipse | Rect;

const rad = (deg: number): number => (deg * Math.PI) / 180;
const f1 = (n: number): string => String(Math.round(n * 100) / 100);

// The lookbook's stable hash for the hand-placed puffs.
const hash3 = (a: number, b: number, c: number): number => {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1103515245);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

const E = (cx: number, cy: number, rx: number, ry: number, rot = 0): Ellipse => ({ cx, cy, rx, ry, rot });
const R = (x: number, y: number, w: number, h: number): Rect => ({ r: [x, y, w, h] });
const isRect = (p: Part): p is Rect => 'r' in p;

const ellipsePath = ({ cx, cy, rx, ry, rot }: Ellipse): string => {
  const t = rad(rot);
  const dx = rx * Math.cos(t);
  const dy = rx * Math.sin(t);
  const a = `${f1(cx - dx)} ${f1(cy - dy)}`;
  const b = `${f1(cx + dx)} ${f1(cy + dy)}`;
  return `M${a}A${f1(rx)} ${f1(ry)} ${f1(rot)} 0 0 ${b}A${f1(rx)} ${f1(ry)} ${f1(rot)} 0 0 ${a}Z`;
};
// Drawn the same way round as the arcs, so the nonzero fill rule joins them.
const rectPath = ([x, y, w, h]: [number, number, number, number]): string => `M${x} ${y}V${y + h}H${x + w}V${y}Z`;

const shape = (name: string, parts: Part[], shafts?: CloudShape['shafts']): CloudShape => ({
  name,
  d: parts.map(p => (isRect(p) ? rectPath(p.r) : ellipsePath(p))).join(''),
  top: Math.min(...parts.map(p => (isRect(p) ? p.r[1] : p.cy - p.ry))),
  bottom: Math.max(...parts.map(p => (isRect(p) ? p.r[1] + p.r[3] : p.cy + p.ry))),
  ...(shafts && { shafts }),
});

// A chain of ellipses along a line of points, each turned along the line.
const chain = (pts: [number, number][], rx: number, ryAt: (t: number) => number): Ellipse[] => pts.map((p, i) => {
  const q = pts[Math.min(i + 1, pts.length - 1)];
  const o = pts[Math.max(i - 1, 0)];
  return E(p[0], p[1], rx, ryAt(i / (pts.length - 1)), (Math.atan2(q[1] - o[1], q[0] - o[0]) * 180) / Math.PI);
});
// A cirrus hook: a thin tail that curls up into a tuft.
const hook = (x0: number, y0: number, len: number): Ellipse[] => {
  const pts = Array.from({ length: 13 }, (_, i): [number, number] => {
    const t = i / 12;
    return [x0 + len * t, y0 - 3 * t - 14 * t ** 3];
  });
  const end = pts[pts.length - 1];
  return [...chain(pts, 3.4, t => 0.5 + 1.4 * t * t), E(end[0] + 1.5, end[1] - 2.5, 3, 1.5, -62)];
};
const streak = (y0: number, j: number, ry = 1, from = 4, to = 116): Ellipse[] => {
  const pts: [number, number][] = [];
  for (let x = from; x <= to; x += 7) pts.push([x, y0 + 3.5 * Math.sin(x / 26 + j * 1.3)]);
  return chain(pts, 4.6, t => (0.55 + 0.8 * Math.sin(Math.PI * t)) * ry);
};
const acRows = (): Ellipse[] => {
  const parts: Ellipse[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      const x = 9 + 14 * c + (r % 2) * 7 + (hash3(r, c, 1) - 0.5) * 3;
      if (x > 113 || hash3(r, c, 2) < 0.14) continue;
      parts.push(E(x, 16 + 13 * r + (hash3(r, c, 3) - 0.5) * 3, 4.4 + 1.6 * hash3(r, c, 4), 3 + 1.2 * hash3(r, c, 5)));
    }
  }
  return parts;
};
const acWaves = (): Ellipse[] => {
  const parts: Ellipse[] = [];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 10; i++) {
      if (hash3(i, j, 7) < 0.1) continue;
      parts.push(E(7 + 11.6 * i, 13 + 11 * j + 2.4 * Math.sin(0.85 * i + j), 5.4, 2.3, 12 * Math.cos(0.85 * i + j)));
    }
  }
  return parts;
};
// G1: the puffs get smaller toward an oval and drop out at its edge, with a little jitter,
// so a field does not show its 120 × 60 box.
const oval = (parts: Ellipse[]): Ellipse[] => parts.flatMap(p => {
  const q = ((p.cx - 60) / 58) ** 2 + ((p.cy - 30) / 24) ** 2;
  if (q > 1) return [];
  const h = (n: number) => hash3(Math.round(p.cx * 10), Math.round(p.cy * 10), n);
  const k = (1 - 0.55 * q) * (0.7 + 0.6 * h(1));
  return [E(p.cx + (h(2) - 0.5) * 5, p.cy + (h(3) - 0.5) * 3, p.rx * k, p.ry * k, p.rot + (h(4) - 0.5) * 20)];
});
// G1: each cirrus streak has its own length (a share of the full one) and offset.
const STREAKS: [number, number][] = [[0.45, 12], [0.85, -8], [1, 3], [0.6, -14]];
const acPatch = (): Ellipse[] => Array.from({ length: 16 }, (_, i) => {
  const ang = hash3(i, 1, 9) * Math.PI * 2;
  const rr = Math.sqrt(hash3(i, 2, 9));
  return E(60 + 46 * rr * Math.cos(ang), 30 + 16 * rr * Math.sin(ang), 4.5 + 2.5 * hash3(i, 3, 9), 3.2 + 1.8 * hash3(i, 4, 9));
});

const NS_TOP = R(-4, -12, 128, 30);
// The anvil spreads downwind (to the right) from a tower that widens into it.
const CB_ANVIL: Part[] = [
  E(56, 52, 28, 7), E(46, 44, 15, 10), E(68, 44, 15, 10), E(56, 34, 15, 12), E(62, 25, 13, 10), E(60, 17, 16, 7),
  R(24, 4, 70, 9), E(24, 8.5, 9, 4.5), E(96, 8, 20, 4.5), E(108, 7.5, 11, 2.6), E(60, 13, 30, 5), R(34, 50, 44, 8),
];

export const CLOUD_SHAPES: Record<CloudType, CloudShape[]> = {
  Ci: [
    shape('Hooks', [...hook(8, 44, 34), ...hook(40, 34, 36), ...hook(76, 46, 32)]),
    shape('Streaks', STREAKS.flatMap(([len, off], j) => streak(14 + 10 * j, j, 1, 60 + off - 54 * len, 60 + off + 54 * len))),
  ],
  Cs: [shape('Veil', [R(-8, 22, 136, 14), E(60, 22, 70, 5), E(60, 36, 70, 5), ...streak(18, 0, 0.6), ...streak(40, 2, 0.6)])],
  Ac: [shape('Rows', oval(acRows())), shape('Waves', oval(acWaves())), shape('Patch', acPatch())],
  As: [shape('Sheet', [E(60, 30, 58, 11), E(28, 28, 26, 9), E(92, 31, 26, 10), E(60, 22, 40, 6)])],
  Cu: [
    shape('Flat', [E(38, 39, 15, 7), E(57, 33, 19, 13), E(77, 37, 15, 9), E(92, 41, 9, 5), E(25, 42, 9, 4), R(25, 41, 67, 5)]),
    shape('Heaped', [E(40, 38, 14, 8), E(52, 28, 15, 14), E(67, 22, 14, 13), E(81, 30, 13, 12), E(91, 38, 10, 8), E(30, 41, 10, 5), E(60, 36, 18, 10), R(28, 40, 66, 6)]),
    shape('Towering', [E(60, 41, 22, 5), E(47, 33, 12, 10), E(73, 33, 12, 10), E(55, 23, 11, 10), E(66, 17, 10, 10), E(60, 8, 8, 7), E(52, 13, 7, 7), R(40, 38, 40, 8)], [[47, 24, 7, 44]]),
  ],
  Sc: [
    shape('Rolls', [E(14, 36, 14, 8), E(36, 33, 15, 10), E(60, 35, 15, 9), E(84, 32, 15, 10), E(106, 36, 14, 8), R(4, 36, 112, 6)]),
    shape('Lumps', [E(20, 34, 18, 10), E(44, 29, 16, 12), E(66, 33, 18, 11), E(90, 30, 16, 12), E(108, 36, 10, 7), E(32, 40, 22, 6), E(78, 40, 26, 6)]),
  ],
  St: [
    shape('Band', [E(60, 30, 58, 8), E(22, 32, 22, 7), E(98, 32, 22, 7), E(40, 25, 24, 6), E(82, 26, 24, 6), E(30, 38, 10, 3), E(70, 39, 12, 3), E(100, 38, 8, 3)]),
    shape('Band with scud', [E(60, 24, 58, 7), E(20, 26, 20, 5), E(100, 26, 20, 5), E(28, 44, 9, 2.6, -4), E(52, 46, 6, 2), E(84, 43, 10, 2.6, 3)]),
  ],
  Ns: [
    shape('Base with shafts', [NS_TOP, E(10, 26, 14, 8), E(32, 28, 14, 9), E(54, 26, 14, 8), E(76, 29, 15, 9), E(98, 27, 14, 8), E(118, 26, 12, 7)], [[18, 24, 8, 32], [68, 30, 10, 34]]),
    shape('Ragged, with scud', [NS_TOP, E(8, 24, 12, 7), E(26, 28, 12, 8), E(44, 25, 10, 7), E(62, 30, 13, 8), E(82, 26, 12, 7), E(102, 30, 13, 8), E(118, 25, 10, 6), E(30, 42, 9, 2.6, -5), E(70, 45, 7, 2.2), E(100, 41, 10, 2.8, 4)], [[40, 26, 8, 34]]),
    shape('Heavy rain', [R(-4, -12, 128, 34), E(12, 32, 15, 9), E(36, 34, 15, 10), E(60, 32, 15, 9), E(84, 35, 16, 10), E(108, 32, 15, 9)], [[4, 30, 10, 38], [44, 34, 12, 40], [88, 30, 10, 40]]),
  ],
  Cb: [
    shape('Anvil', CB_ANVIL),
    shape('Tower', [E(58, 52, 28, 7), E(50, 43, 15, 11), E(68, 43, 15, 11), E(56, 32, 14, 12), E(65, 26, 12, 11), E(58, 16, 11, 10), E(51, 20, 9, 8), E(66, 13, 8, 7), R(36, 50, 46, 8)]),
    shape('Overshooting top', [...CB_ANVIL, E(60, 2.5, 9, 4.5)]),
  ],
  // X1 easter eggs: lenticular lenses and mammatus pouches.
  Len: [shape('Lens stack', [E(60, 42, 46, 5.5), E(60, 31, 34, 4), E(60, 22, 22, 3.2)])],
  Mam: [shape('Pouches', [R(-4, -6, 128, 30), ...Array.from({ length: 9 }, (_, i) => E(8 + 13.5 * i, 28 + (i % 2) * 2, 6.6, 6 + (i % 2) * 0.6))])],
};

// Valentine's Day (ROADMAP item 117): a heart in the same 120 × 60 box, for one day cloud.
export const HEART_SHAPE: CloudShape = {
  name: 'Heart',
  d: 'M60 55C40 43 30 35 30 24C30 15 37 9 45 9C52 9 57 13 60 18C63 13 68 9 75 9C83 9 90 15 90 24C90 35 80 43 60 55Z',
  top: 9,
  bottom: 55,
};

// S2: a rain shaft as 8 thin slanted strands of different lengths, so it reads as falling
// rain and not as a column. Each is [path, stroke width] in box units.
export const getShaftStrands = ([x, w, slant, y0]: Shaft): [string, number][] =>
  Array.from({ length: 8 }, (_, i) => {
    const r = (n: number) => hash3(i, Math.round(x * 10), n);
    const sx = x + w * ((i + 0.5) / 8) + (r(1) - 0.5) * (w / 8);
    const len = (0.5 + 0.5 * r(2)) * SHAFT_LENGTH;
    return [`M${f1(sx)} ${y0}l${f1((slant * len) / SHAFT_LENGTH)} ${f1(len)}`, Math.round((0.8 + 0.9 * r(3)) * 100) / 100];
  });
