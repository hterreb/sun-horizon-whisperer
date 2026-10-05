import React, { useEffect, useRef, useState } from 'react';
import { type TimeOfDay } from '@/utils/sunUtils';

// Lunar New Year dragon (ROADMAP item 100, lookbook picks RD1, M2, M3, F1, F2): a Chinese
// lóng flies once across the sky, from left to right, with a slow wave along its body, a
// shallow rise and dip, a cloud trail and the pearl it chases. Its colour is random per
// page view: red-gold, jade-gold or gold. The geometry is redrawn in one rAF loop.

const NS = 'http://www.w3.org/2000/svg';
const SPEED_PCT = 1.6; // % of the width per second, as the slowest bird (heron)
const PX_CAP = 390 * SPEED_PCT / 100; // phone px/s on wide screens (6.24)
const UNIT = 0.66; // px per creature unit
const CREATURE_W = 340 * UNIT; // tail fin to pearl
const WAVE_S = 5; // M2: one body wave per 5 s
const TRAIL_S = 20; // F1: a wisp fades over 20 s

type Tod = 'day' | 'sunset' | 'night';
const toTod = (t: TimeOfDay): Tod =>
  t === 'night' || t === 'astronomical-twilight' || t === 'nautical-twilight' ? 'night'
    : t === 'civil-twilight' || t === 'dawn' || t === 'evening' ? 'sunset' : 'day';

const LIGHT: Record<Tod, { tint: string; t: number; dark: number; rim: string; rimOp: number; glow: number }> = {
  day: { tint: '#ffffff', t: 0, dark: 0, rim: '#ffffff', rimOp: 0.5, glow: 0.25 },
  sunset: { tint: '#ff8a4c', t: 0.2, dark: 0.1, rim: '#ffc46b', rimOp: 0.95, glow: 0.35 },
  night: { tint: '#16203a', t: 0.55, dark: 0, rim: '#d6e4ff', rimOp: 0.6, glow: 0.6 },
};
const CLOUD_TINT: Record<Tod, string> = { day: '#ffffff', sunset: '#ffd2b8', night: '#8a93a6' };

type Palette = Record<'body' | 'hi' | 'shade' | 'belly' | 'bellyLine' | 'crest' | 'crestDark' | 'horn' | 'claw' | 'whisker' | 'eye' | 'mouth' | 'teeth', string>;
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const DRAGON_PALETTES: Record<'red' | 'jade' | 'gold', Palette> = {
  red: { body: '#b52a1f', hi: '#ee6a45', shade: '#5e1009', belly: '#f1c56a', bellyLine: '#a8741f', crest: '#f4b43c', crestDark: '#c4780f', horn: '#efe0b4', claw: '#fbf3e3', whisker: '#f6cf6a', eye: '#ffd84a', mouth: '#4a0d0a', teeth: '#fffaf0' },
  jade: { body: '#2c7a57', hi: '#67bb92', shade: '#0f3d2a', belly: '#ecd07a', bellyLine: '#a98a2f', crest: '#e6a838', crestDark: '#b07418', horn: '#f1e6c0', claw: '#fbf3e3', whisker: '#f0cf6e', eye: '#ffd84a', mouth: '#3a0f0a', teeth: '#fffaf0' },
  gold: { body: '#c9952b', hi: '#f6d67e', shade: '#6b480c', belly: '#f8e6a6', bellyLine: '#a77b1f', crest: '#f1c14f', crestDark: '#9a6a10', horn: '#f4ead0', claw: '#fbf3e3', whisker: '#fbe08a', eye: '#c8202f', mouth: '#4a2a06', teeth: '#fffaf0' },
};

// ---------- helpers ----------
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const f = (n: number) => n.toFixed(1);
const el = (tag: string, attrs: Record<string, string | number>, parent: Element) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  parent.appendChild(n);
  return n;
};
const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = (a: number[]) => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
type Pt = [number, number];
// Smooth path through points (Catmull-Rom as cubic Béziers).
const curve = (P: Pt[], closed: boolean) => {
  const n = P.length, at = (i: number) => closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
};
// A tapered limb: joints [x, y, halfWidth].
const tube = (J: [number, number, number][]) => {
  const L: Pt[] = [], R: Pt[] = [];
  J.forEach((j, i) => {
    const a = J[Math.max(0, i - 1)], b = J[Math.min(J.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    L.push([j[0] - ty * j[2], j[1] + tx * j[2]]); R.push([j[0] + ty * j[2], j[1] - tx * j[2]]);
  });
  return curve(L.concat(R.reverse()), true);
};
const rot = (x: number, y: number, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// ---------- the body ----------
// Spine in creature units: x forward (right), y down. s = 0 at the tail, 1 at the neck.
interface SP { s: number; x: number; y: number; hw: number; tx: number; ty: number; nx: number; ny: number }
const LEN = 230, N = 70;
const spineY = (s: number, ph: number) => 19 * (0.4 + 0.6 * (1 - s)) * Math.sin(2 * Math.PI * 1.35 * s + 0.9 + ph);
const spineHw = (s: number) => 1.2 + 8.8 * sm(0, 0.32, s) + 1.4 * sm(0.3, 0.6, s) - 1.8 * sm(0.86, 1, s);
const spine = (ph: number): SP[] => {
  const P = Array.from({ length: N + 1 }, (_, i) => ({ s: i / N, x: (i / N) * LEN, y: spineY(i / N, ph), hw: spineHw(i / N), tx: 0, ty: 0, nx: 0, ny: 0 }));
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    p.tx = (b.x - a.x) / l; p.ty = (b.y - a.y) / l; p.nx = -p.ty; p.ny = p.tx;
  });
  return P;
};
const lerpP = (P: SP[], s: number): SP => {
  const fi = Math.max(0, Math.min(1, s)) * (P.length - 1), i = Math.min(P.length - 2, Math.floor(fi)), t = fi - i, a = P[i], b = P[i + 1];
  const m = (k: keyof SP) => a[k] + (b[k] - a[k]) * t;
  return { s, x: m('x'), y: m('y'), hw: m('hw'), tx: m('tx'), ty: m('ty'), nx: m('nx'), ny: m('ny') };
};
const side = (p: SP, v: number): Pt => [p.x + p.nx * p.hw * v, p.y + p.ny * p.hw * v]; // v = -1 back, +1 belly
const band = (P: SP[], v0: number, v1: number, s0: number, s1: number) => {
  const Q = P.filter(p => p.s >= s0 && p.s <= s1);
  return curve(Q.map(p => side(p, v0)).concat(Q.reverse().map(p => side(p, v1))), true);
};

// Builds the static parts once into `g`; update(t) rewrites the moving geometry.
const makeDragon = (g: SVGGElement, pal: Palette, tod: Tod, uid: string) => {
  const Lt = LIGHT[tod];
  const lit = (col: string) => { let r = mix(col, Lt.tint, Lt.t); if (Lt.dark) r = mix(r, '#000000', Lt.dark); return r; };
  const c = (k: keyof Palette) => lit(pal[k]);
  const defs = el('defs', {}, g);
  const pg = el('radialGradient', { id: `pearl-${uid}`, cx: '38%', cy: '35%', r: '70%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#ffffff' }, pg);
  el('stop', { offset: '55%', 'stop-color': '#fbe7b5' }, pg);
  el('stop', { offset: '100%', 'stop-color': '#e9b45a' }, pg);

  // Layers, back to front.
  const farLegs = el('g', {}, g);
  const path = (attrs: Record<string, string | number>, parent: Element = g) => el('path', attrs, parent);
  const tail = path({ fill: c('crest'), stroke: c('crestDark'), 'stroke-width': 0.6, 'stroke-linejoin': 'round' });
  const tailRays = path({ fill: 'none', stroke: c('crestDark'), 'stroke-width': 0.5, 'stroke-opacity': 0.7 });
  const crest = path({ fill: c('crest'), stroke: c('crestDark'), 'stroke-width': 0.5, 'stroke-linejoin': 'round' });
  const body = path({ fill: c('body') });
  const shade = path({ fill: c('shade'), 'fill-opacity': 0.45 });
  const hi = path({ fill: c('hi'), 'fill-opacity': 0.55 });
  const belly = path({ fill: c('belly') });
  const plates = path({ fill: 'none', stroke: c('bellyLine'), 'stroke-width': 0.55 });
  const scales = path({ fill: 'none', stroke: c('shade'), 'stroke-width': 0.55, 'stroke-opacity': 0.55 });
  const scalesHi = path({ fill: 'none', stroke: c('hi'), 'stroke-width': 0.45, 'stroke-opacity': 0.5 });
  const rim = path({ fill: 'none', stroke: Lt.rim, 'stroke-opacity': Lt.rimOp, 'stroke-width': tod === 'sunset' ? 1.4 : 1, 'stroke-linecap': 'round' });
  const nearLegs = el('g', {}, g);
  const head = el('g', {}, g);
  const pearl = el('g', {}, g);

  // Four legs: the near ones in front of the body, the far ones behind and darker.
  const legSpecs = [
    { s: 0.7, J: [[0, 0, 4.6], [-3, 9, 3.4], [4, 15, 2.4], [10, 17, 2]] as [number, number, number][], claw: 0.15, ph: 0 },
    { s: 0.28, J: [[0, 0, 5], [-7, 8, 3.6], [-15, 10, 2.6], [-21, 13, 2]] as [number, number, number][], claw: 2.6, ph: 1.8 },
  ];
  const legs: { g: Element; s: number; v: number; ph: number }[] = [];
  legSpecs.forEach(spec => {
    ([['far', farLegs], ['near', nearLegs]] as const).forEach(([which, parent]) => {
      const lg = el('g', {}, parent);
      const far = which === 'far';
      path({ d: tube(spec.J), fill: far ? c('shade') : c('body'), stroke: far ? 'none' : c('shade'), 'stroke-width': 0.4, 'stroke-opacity': 0.6 }, lg);
      const [ex, ey] = spec.J[1];
      path({ d: `M${ex} ${ey - 2}Q${ex - 7} ${ey - 3} ${ex - 12} ${ey + 1}Q${ex - 6} ${ey + 1} ${ex - 3} ${ey + 3}Q${ex - 7} ${ey + 4} ${ex - 9} ${ey + 8}Q${ex - 3} ${ey + 5} ${ex} ${ey + 2}Z`, fill: far ? c('crestDark') : c('crest') }, lg);
      const [px, py] = spec.J[spec.J.length - 1];
      let claws = '';
      for (let k = 0; k < 4; k++) {
        const a = spec.claw + (k - 1.5) * 0.42;
        const [dx, dy] = rot(4.6, 0, a), [cx, cy] = rot(3, -1.6, a);
        claws += `M${f(px)} ${f(py)}Q${f(px + cx)} ${f(py + cy)} ${f(px + dx)} ${f(py + dy)}`;
      }
      path({ d: claws, fill: 'none', stroke: c('claw'), 'stroke-width': 1.1, 'stroke-linecap': 'round', 'stroke-opacity': far ? 0.6 : 1 }, lg);
      legs.push({ g: lg, s: spec.s + (far ? 0.035 : 0), v: far ? 0.15 : 0.45, ph: spec.ph + (far ? 1.4 : 0) });
    });
  });

  // Head, drawn once in head units (neck at 0, facing +x).
  const H = (d: string, attrs: Record<string, string | number>) => path({ d, ...attrs }, head);
  H('M2 -9Q-10 -24 -32 -20Q-16 -15 -6 -6Z M2 -4Q-16 -12 -38 -5Q-20 -2 -4 2Z M0 5Q-14 14 -32 16Q-16 9 -4 9Z M4 -11Q-2 -30 -18 -34Q-8 -24 -2 -9Z', { fill: c('crest'), stroke: c('crestDark'), 'stroke-width': 0.5 });
  H('M-6 -14Q-16 -18 -24 -17 M-8 -2Q-20 -4 -30 -3 M-6 9Q-16 12 -24 13', { fill: 'none', stroke: c('crestDark'), 'stroke-width': 0.5, 'stroke-opacity': 0.7 });
  H('M9 -10Q2 -22 -14 -30L-13 -27.5Q0 -21 6 -8Z M1 -19Q2 -25 7 -30L7.6 -28.6Q4 -25 3 -19Z', { fill: lit('#c9b98f') });
  H('M13 -11Q8 -24 -6 -34L-4.6 -32Q10 -24 16 -10Z M7 -22Q10 -28 16 -31L16.4 -29.6Q12 -27 9 -21Z', { fill: c('horn'), stroke: lit('#9c8a5c'), 'stroke-width': 0.4 });
  H('M19 1L37 0.5L37 4L20 4Z', { fill: c('mouth') });
  H('M18 2.5C27 3.5 34 3.6 38.5 5C38 8.5 31 10 22 10C14 10.5 6 10 -1 8.5L4 4Z', { fill: c('body'), stroke: c('shade'), 'stroke-width': 0.5 });
  H('M8 7.5C16 8.6 26 8.8 36 6.5', { fill: 'none', stroke: c('belly'), 'stroke-width': 1.4, 'stroke-opacity': 0.8 });
  let teeth = '';
  for (let x = 22; x <= 35; x += 2.6) teeth += `M${x} 0.8l1 2.2l1 -2.2Z`;
  H(teeth + 'M35.6 0.6l1.2 4l1 -4Z M33 4.6l1 -3l1 3Z', { fill: c('teeth') });
  H('M-2 -9.5C4 -14.5 12 -15.5 18 -12.5C22 -10.5 28 -9.4 36 -8.2C41 -7.6 43.5 -4.6 41.5 -1.6C39 0.4 33 0.6 22 1.4L8 4.5C4 7 0 9 -2 9.5Z', { fill: c('body'), stroke: c('shade'), 'stroke-width': 0.55 });
  H('M20 -11.6C26 -9.6 32 -8.8 38 -7.4', { fill: 'none', stroke: c('hi'), 'stroke-width': 1.6, 'stroke-opacity': 0.7, 'stroke-linecap': 'round' });
  H('M2 -6C8 -4 14 -2 22 -1', { fill: 'none', stroke: c('shade'), 'stroke-width': 0.5, 'stroke-opacity': 0.5 });
  H('M9 -11.5Q15 -16 22 -10.5Q16 -12.5 11 -10Z', { fill: c('crest') });
  el('ellipse', { cx: 16.5, cy: -8, rx: 2.8, ry: 1.9, fill: c('eye') }, head);
  el('ellipse', { cx: 17, cy: -8, rx: 0.75, ry: 1.7, fill: '#1a0f0a' }, head);
  el('circle', { cx: 15.6, cy: -8.8, r: 0.5, fill: '#ffffff' }, head);
  H('M37.5 -5.6q1.6 -1.4 2.6 0.2', { fill: 'none', stroke: c('mouth'), 'stroke-width': 0.7, 'stroke-linecap': 'round' });
  H('M5 3Q-3 9 -6 17Q2 11 9 6Z M10 5Q6 12 6 19Q11 12 13 6Z', { fill: c('crest'), stroke: c('crestDark'), 'stroke-width': 0.4 });
  H('M24 9.5Q27 17 21 24Q23 16 17 10.5Z M30 9Q33 15 29 20Q29.5 14 26 9.6Z', { fill: c('crest'), stroke: c('crestDark'), 'stroke-width': 0.4 });
  const whiskers = path({ fill: 'none', stroke: c('whisker'), 'stroke-width': 1, 'stroke-linecap': 'round' }, head);

  // F2: the pearl ahead of the head.
  el('circle', { r: 13, fill: '#ffe9b0', 'fill-opacity': Lt.glow }, pearl);
  el('circle', { r: 5.6, fill: `url(#pearl-${uid})`, stroke: '#e0a640', 'stroke-width': 0.4 }, pearl);
  path({ d: 'M-5 -5Q-9 -12 -5 -17Q-4 -11 -1 -7 M3 -5Q5 -12 1 -16Q6 -12 6 -6 M6 2Q12 0 14 -5Q13 2 7 5', fill: 'none', stroke: lit('#ff9c3a'), 'stroke-width': 0.9, 'stroke-linecap': 'round', 'stroke-opacity': 0.85 }, pearl);

  // Redraws the body for time t (s); returns the tail point (creature units) for the trail.
  return (t: number): Pt => {
    const ph = 2 * Math.PI * t / WAVE_S;
    const Pts = spine(ph);
    body.setAttribute('d', curve(Pts.map(p => side(p, -1)).concat(Pts.slice().reverse().map(p => side(p, 1))), true));
    shade.setAttribute('d', band(Pts, 0.05, 0.5, 0.03, 1));
    hi.setAttribute('d', band(Pts, -0.9, -0.4, 0.04, 1));
    belly.setAttribute('d', band(Pts, 0.42, 0.98, 0.03, 1));
    let pl = '';
    for (let s = 0.04; s < 0.99; s += 0.022) { const p = lerpP(Pts, s); const a = side(p, 0.44), b = side(p, 0.97); pl += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`; }
    plates.setAttribute('d', pl);
    // Scales: overlapping arcs whose free edge points to the tail.
    let sc = '', sh = '';
    [-0.66, -0.3, 0.06].forEach((v, ri) => {
      for (let s = 0.05 + (ri % 2) * 0.0105; s < 0.98; s += 0.021) {
        const p = lerpP(Pts, s); if (p.hw < 3) continue;
        const [cx, cy] = side(p, v), r = 0.3 * p.hw;
        const a = [cx + p.nx * r, cy + p.ny * r], b = [cx - p.nx * r, cy - p.ny * r], q = [cx - p.tx * r * 1.7, cy - p.ty * r * 1.7];
        sc += `M${f(a[0])} ${f(a[1])}Q${f(q[0])} ${f(q[1])} ${f(b[0])} ${f(b[1])}`;
        sh += `M${f(a[0] + p.tx * 0.8)} ${f(a[1] + p.ty * 0.8)}Q${f(q[0] + p.tx * 0.8)} ${f(q[1] + p.ty * 0.8)} ${f(b[0] + p.tx * 0.8)} ${f(b[1] + p.ty * 0.8)}`;
      }
    });
    scales.setAttribute('d', sc); scalesHi.setAttribute('d', sh);
    // Dorsal crest: flame fins, leaning back.
    let cr = '';
    for (let s = 0.05; s < 0.9; s += 0.028) {
      const p1 = lerpP(Pts, s), p2 = lerpP(Pts, s + 0.02), pa = lerpP(Pts, s - 0.006);
      const h = 2.4 + p1.hw * 0.55;
      const b1 = side(p1, -0.9), b2 = side(p2, -0.9);
      const ap = [pa.x - pa.nx * (pa.hw + h) - pa.tx * 2.6, pa.y - pa.ny * (pa.hw + h) - pa.ty * 2.6];
      const c1 = [b1[0] - p1.nx * h * 0.55 + p1.tx * 1.2, b1[1] - p1.ny * h * 0.55 + p1.ty * 1.2];
      cr += `M${f(b1[0])} ${f(b1[1])}Q${f(c1[0])} ${f(c1[1])} ${f(ap[0])} ${f(ap[1])}Q${f((ap[0] + b2[0]) / 2 + p2.tx)} ${f((ap[1] + b2[1]) / 2 + p2.ty)} ${f(b2[0])} ${f(b2[1])}Z`;
    }
    crest.setAttribute('d', cr);
    rim.setAttribute('d', curve(Pts.filter(p => p.s > 0.06).map(p => side(p, -0.97)), false));
    // Tail fin, pointing back along the tail.
    const p0 = Pts[0], ta = Math.atan2(p0.ty, p0.tx);
    const tf = (pts: Pt[]) => pts.map(([x, y]): Pt => { const [rx, ry] = rot(x, y, ta); return [p0.x + rx, p0.y + ry]; });
    const sway = Math.sin(ph + 1) * 3;
    tail.setAttribute('d', curve(tf([[2, 0], [-10, -8], [-32, -16 + sway], [-20, -6], [-40, 1 + sway], [-20, 4], [-30, 18 + sway], [-6, 6]]), true));
    tailRays.setAttribute('d', ([[-28, -14 + sway], [-36, 1 + sway], [-26, 15 + sway]] as Pt[]).map(([x, y]) => { const [a, b] = tf([[0, 0], [x, y]]); return `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`; }).join(''));
    // The legs follow the body and paddle a little.
    legs.forEach(L => {
      const p = lerpP(Pts, L.s), [ox, oy] = side(p, L.v);
      L.g.setAttribute('transform', `translate(${f(ox)} ${f(oy)}) rotate(${f(Math.atan2(p.ty, p.tx) * 180 / Math.PI + Math.sin(ph + L.ph) * 9)})`);
    });
    // The head on the neck, turned half as much as the neck.
    const pe = Pts[Pts.length - 1], ha = Math.atan2(pe.ty, pe.tx) * 0.6;
    head.setAttribute('transform', `translate(${f(pe.x - pe.tx * 2)} ${f(pe.y - pe.ty * 2)}) rotate(${f(ha * 180 / Math.PI)}) scale(1.15)`);
    const s1 = Math.sin(t * 1.1) * 3, s2 = Math.sin(t * 0.9 + 1) * 3;
    whiskers.setAttribute('d', `M40 -3C50 -5 ${f(55 + s1)} ${f(-12 + s1)} ${f(49 + s1)} ${f(-19 + s1)}C${f(45 + s1)} ${f(-23 + s1)} 39 -21 41 -17 M38 2C48 8 ${f(52 + s2)} ${f(17 + s2)} ${f(45 + s2)} ${f(22 + s2)}C${f(40 + s2)} ${f(25 + s2)} 34 22 37 19`);
    const [rx, ry] = rot(64, -14, ha);
    pearl.setAttribute('transform', `translate(${f(pe.x + rx)} ${f(pe.y + ry + Math.sin(t * 1.3) * 2)}) rotate(${f(t * 6 % 360)})`);
    return [Pts[6].x, Pts[6].y];
  };
};

interface LunarDragonProps {
  timeOfDay: TimeOfDay;
  onDone: () => void;
}

// One flight across the scene, then onDone. The parent leaves it out under reduced motion.
const LunarDragon: React.FC<LunarDragonProps> = ({ timeOfDay, onDone }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(0);
  const [palette] = useState(() => (['red', 'jade', 'gold'] as const)[Math.floor(Math.random() * 3)]);
  const tod = toTod(timeOfDay);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.textContent = '';
    const uid = Math.random().toString(36).slice(2);
    const blur = el('filter', { id: `blur-${uid}`, x: '-50%', y: '-100%', width: '200%', height: '300%' }, el('defs', {}, svg));
    el('feGaussianBlur', { stdDeviation: 3 }, blur);
    const trail = el('g', { filter: `url(#blur-${uid})` }, svg);
    const outer = el('g', {}, svg) as SVGGElement;
    const update = makeDragon(el('g', {}, outer) as SVGGElement, DRAGON_PALETTES[palette], tod, uid);
    const puffs: { e: Element; born: number }[] = [];
    let start: number | null = null;
    let lastPuffX = -Infinity;

    const tick = (now: number) => {
      start ??= now;
      const t = (now - start) / 1000;
      const W = svg.clientWidth, H = svg.clientHeight;
      const span = W + CREATURE_W + 60;
      const x = -CREATURE_W - 20 + Math.min(W * SPEED_PCT / 100, PX_CAP) * t;
      if (x > W + 40 && puffs.length === 0) { onDone(); return; }
      // M3: one shallow rise and dip (3 % of the height) over the crossing, nose along the path.
      const A = 0.03 * H, prog = (x + CREATURE_W) / span;
      const y = H * 0.23 - A * Math.sin(2 * Math.PI * prog);
      const tilt = Math.atan(-A * 2 * Math.PI / span * Math.cos(2 * Math.PI * prog)) * 180 / Math.PI;
      outer.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(tilt)}) scale(${UNIT})`);
      const tailPt = update(t);
      // F1: a cloud wisp every 18 px of travel, fading over TRAIL_S.
      if (x - lastPuffX > 18 && x < W) {
        lastPuffX = x;
        puffs.push({ e: el('ellipse', { cx: f(x + tailPt[0] * UNIT), cy: f(y + tailPt[1] * UNIT), rx: 12, ry: 4, fill: CLOUD_TINT[tod] }, trail), born: t });
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const age = t - puffs[i].born;
        if (age > TRAIL_S) { puffs[i].e.remove(); puffs.splice(i, 1); continue; }
        puffs[i].e.setAttribute('fill-opacity', f(0.42 * (1 - age / TRAIL_S)));
        puffs[i].e.setAttribute('rx', f(12 + age * 0.9));
        puffs[i].e.setAttribute('ry', f(4 + age * 0.15));
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // The colours are set once per flight; a time-of-day change mid-flight keeps them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <svg ref={svgRef} data-testid="lunar-dragon" data-palette={palette} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />;
};

export default LunarDragon;
