import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { getWaterLimit } from '../utils/weatherEffectsUtils';
import { getWaveLook, smoothStep, waveHash } from '../utils/waveUtils';

// Waves by wind strength (ROADMAP item 79): one canvas over the sea fill and under the
// boats and fish (CloudLayer's z-indexed layers). It draws the picks WV6 mirror to matte,
// WV4 cat's paws, WV1 ripple lines, WV2 whitecaps and X3 foam from getWaveLook. One rAF
// loop at about 30 fps with the frame ID in a ref (CLAUDE.md); reduced motion draws one
// still frame. Things near the horizon are smaller, slower and fainter (depth p, 0 at the
// horizon, 1 at the bottom). Everything only fades and drifts downwind in a straight line.

interface SeaCanvasProps {
  width: number;
  height: number;
  seaPath: string; // the sea fill's path (data-testid="sea")
  seaEdgePath: string; // only its top edge, for the X3 foam line
  ridgePath: string; // the line-of-sight ridge, '' without a terrain profile
  ridgeColor: string;
  skyColor: string; // the sky at the horizon line, mirrored in calm water
  crestColor: string; // the light lines, the caps and the foam
  troughColor: string; // the troughs, the dark paws and the matte
  gain: number; // the light lines are dimmer at dusk and at night
  windKmh: number; // getSeaWindKmh
  driftDirection: 1 | -1;
}

type Rgb = [number, number, number];
type WaveLook = ReturnType<typeof getWaveLook>;

interface Sea {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dpr: number;
  y0: number;
  dir: 1 | -1;
  gain: number;
  crest: string;
  trough: string;
  crestRgb: Rgb;
  troughRgb: Rgb;
  clip: Path2D;
  edge: Path2D;
  mirror: HTMLCanvasElement | null;
}

const FRAME_MS = 1000 / 30;
const STILL_T = 40; // s: the still frame for reduced motion, a moment mid-cycle
const MIRROR_SLICE_PX = 2;

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`;

// Canvas cannot read CSS variables: resolve `var(--x)` from :root, then let the canvas
// normalise the colour (to #rrggbb or rgba()).
const toRgb = (ctx: CanvasRenderingContext2D, css: string): Rgb => {
  const root = getComputedStyle(document.documentElement);
  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = css.replace(/var\((--[\w-]+)\)/g, (_, name: string) => root.getPropertyValue(name).trim());
  const value = String(ctx.fillStyle);
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const [r = 255, g = 255, b = 255] = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [r, g, b];
};

// WV6: the mirror image, drawn once: the sky glow fading down from the sea line, and the
// ridge flipped at the sea line (2 px lower). The loop copies it in slices.
const buildMirror = (w: number, h: number, dpr: number, y0: number, ridge: Path2D | null, ridgeColor: string, sky: Rgb) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const glow = ctx.createLinearGradient(0, y0, 0, y0 + (h - y0) * 0.45);
  glow.addColorStop(0, rgba(sky, 0.9));
  glow.addColorStop(1, rgba(sky, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, y0, w, h - y0);
  if (ridge) {
    ctx.setTransform(dpr, 0, 0, -dpr, 0, dpr * (2 * y0 + 2));
    ctx.fillStyle = ridgeColor;
    ctx.fill(ridge);
  }
  return canvas;
};

const depthY = (s: Sea, p: number) => s.y0 + 2 + p * (s.h - s.y0 - 2);

// A thing with a life of P seconds: which life it is in (c) and how far through it (u).
const life = (t: number, P: number) => ({ c: Math.floor(t / P), u: (t % P) / P });

const drawMirror = (s: Sea, t: number, { strength, breakUp, spread, matte }: WaveLook['mirror']) => {
  const { ctx, w, h, dpr, mirror } = s;
  if (mirror && strength > 0.005) {
    for (let y = Math.floor(s.y0), j = 0; y < h; y += MIRROR_SLICE_PX, j++) {
      // A slice holds its offset for 6-10 s; the last quarter of a life crossfades into the next.
      const { c, u } = life(t + j * 0.71, 6 + 4 * waveHash(j, 0, 31));
      const mix = smoothStep(0.75, 1, u);
      const shown = ([[c, 1 - mix], [c + 1, mix]] as const)
        .filter(([cc, weight]) => weight > 0 && waveHash(j, cc, 32) >= breakUp)
        .map(([cc, weight]) => ({ dx: (waveHash(j, cc, 33) - 0.5) * 2 * spread, weight }));
      // The same offset twice (no spread): one copy at the full strength, so calm water stays still.
      const copies = shown.length === 2 && Math.abs(shown[0].dx - shown[1].dx) < 0.5
        ? [{ dx: shown[0].dx, weight: 1 }]
        : shown;
      for (const { dx, weight } of copies) {
        ctx.globalAlpha = strength * weight;
        ctx.drawImage(mirror, 0, y * dpr, w * dpr, MIRROR_SLICE_PX * dpr, dx, y, w, MIRROR_SLICE_PX);
      }
    }
  }
  if (matte > 0) {
    ctx.globalAlpha = matte;
    ctx.fillStyle = s.trough;
    ctx.fillRect(0, 0, w, h);
  }
};

const drawPaws = (s: Sea, t: number, { count, stretch, darkness, drift, lightShare }: WaveLook['paws']) => {
  const { ctx, w, dpr } = s;
  const n = getWaterLimit(Math.round(count), w);
  if (n === 0) return;
  // One unit gradient per colour, scaled to each patch.
  const unit = (rgb: Rgb) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, rgba(rgb, 1));
    g.addColorStop(1, rgba(rgb, 0));
    return g;
  };
  const dark = unit(s.troughRgb);
  const light = unit(s.crestRgb);
  const amp = darkness * (s.gain < 1 ? 1.3 : 1);
  for (let i = 0; i < n; i++) {
    const P = 14 + 8 * waveHash(i, 0, 21);
    const { c, u } = life(t + i * 2.9, P);
    const p = 0.06 + 0.94 * waveHash(i, c, 22) ** 1.3;
    const near = 0.3 + 0.7 * p;
    const rx = (18 + 28 * waveHash(i, c, 24)) * near * stretch;
    const ry = Math.max(1.2, ((rx / stretch) * (0.1 + 0.06 * p)) / Math.sqrt(stretch));
    const x = waveHash(i, c, 23) * (w + rx) - rx / 2 + s.dir * drift * near * u * P;
    const isLight = i % 3 === 0 && waveHash(i, c, 25) < lightShare;
    ctx.setTransform(dpr * rx, 0, 0, dpr * ry, dpr * x, dpr * depthY(s, p));
    ctx.globalAlpha = amp * Math.sin(Math.PI * u) ** 2 * (isLight ? 0.6 : 1);
    ctx.fillStyle = isLight ? light : dark;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const drawRipples = (s: Sea, t: number, { count, lengthMin, lengthMax, opacity, drift, trough }: WaveLook['ripples']) => {
  const { ctx, w } = s;
  const n = getWaterLimit(Math.round(count), w);
  for (let i = 0; i < n; i++) {
    const P = 9 + 6 * waveHash(i, 0, 1);
    const { c, u } = life(t + i * 1.37, P);
    const p = 0.03 + 0.97 * waveHash(i, c, 2) ** 1.5;
    const near = 0.3 + 0.7 * p;
    const len = (lengthMin + (lengthMax - lengthMin) * waveHash(i, c, 4)) * near;
    const x = waveHash(i, c, 3) * (w + 80) - 40 + s.dir * drift * near * u * P;
    const y = Math.round(depthY(s, p));
    const a = opacity * s.gain * Math.sin(Math.PI * u) ** 2 * (0.35 + 0.65 * p);
    const th = p > 0.5 ? 1.5 : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = s.crest;
    ctx.fillRect(x, y, len, th);
    if (trough > 0) {
      ctx.globalAlpha = a * 0.7 * trough;
      ctx.fillStyle = s.trough;
      ctx.fillRect(x + len * 0.1, y + th, len * 0.85, 1);
    }
  }
};

const drawCaps = (s: Sea, t: number, { count, size, opacity, drift }: WaveLook['caps']) => {
  const { ctx, w } = s;
  const n = getWaterLimit(Math.floor(count), w);
  const amp = opacity * (s.gain < 1 ? s.gain + 0.15 : 1);
  ctx.lineCap = 'round';
  ctx.strokeStyle = s.crest;
  ctx.fillStyle = s.crest;
  for (let i = 0; i < n; i++) {
    // Fade in, hold, fade out, then rest until the next cap.
    const P = 3.5 + 2.5 * waveHash(i, 0, 11);
    const { c } = life(t + i * 0.83, P * 1.7);
    const u = ((t + i * 0.83) % (P * 1.7)) / P;
    if (u >= 1) continue;
    const env = u < 0.25 ? smoothStep(0, 0.25, u) : u < 0.5 ? 1 : 1 - smoothStep(0.5, 1, u);
    const p = 0.04 + 0.96 * waveHash(i, c, 12) ** 1.4;
    const near = 0.35 + 0.65 * p;
    const cw = size * near * (0.8 + 0.4 * waveHash(i, c, 14));
    const x = waveHash(i, c, 13) * (w + 20) - 10 + s.dir * drift * near * u * P;
    const y = depthY(s, p);
    const a = amp * env * (0.45 + 0.55 * p);
    ctx.globalAlpha = a;
    ctx.lineWidth = p > 0.55 ? 1.7 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x - cw / 2, y);
    ctx.quadraticCurveTo(x - cw * 0.08, y - cw * 0.24, x + cw / 2, y + cw * 0.02);
    ctx.stroke();
    ctx.globalAlpha = a * 0.35;
    ctx.fillRect(x - cw * 0.45, y + 1.5, cw * 0.6, 1);
  }
};

const FOAM_DRIFT_PX_S = 3;

const drawFoam = (s: Sea, t: number, foam: number) => {
  if (foam <= 0) return;
  const { ctx, w } = s;
  const dim = s.gain < 1 ? 0.8 : 1;
  const n = getWaterLimit(Math.round(40 * foam), w);
  ctx.fillStyle = s.crest;
  for (let i = 0; i < n; i++) {
    const P = 10 + 4 * waveHash(i, 0, 41);
    const { c, u } = life(t + i * 1.9, P);
    const p = 0.05 + 0.95 * waveHash(i, c, 42) ** 1.3;
    const near = 0.3 + 0.7 * p;
    const len = (20 + 40 * waveHash(i, c, 44)) * near;
    const x = waveHash(i, c, 43) * (w + len) - len / 2 + s.dir * FOAM_DRIFT_PX_S * near * u * P;
    ctx.globalAlpha = 0.24 * foam * Math.sin(Math.PI * u) ** 2 * (0.5 + 0.5 * p) * dim;
    ctx.fillRect(x, depthY(s, p), len, p > 0.5 ? 1.5 : 1);
  }
  // A foam line along the sea's top edge (only its lower half shows inside the clip).
  ctx.globalAlpha = 0.32 * foam * (s.gain < 1 ? 0.7 : 1);
  ctx.strokeStyle = s.crest;
  ctx.lineWidth = 1.2;
  ctx.stroke(s.edge);
};

const drawSea = (s: Sea, look: WaveLook, t: number) => {
  const { ctx, w, h, dpr } = s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.clip(s.clip);
  drawMirror(s, t, look.mirror);
  drawPaws(s, t, look.paws);
  drawRipples(s, t, look.ripples);
  drawCaps(s, t, look.caps);
  drawFoam(s, t, look.foam);
  ctx.restore();
};

const SeaCanvas: React.FC<SeaCanvasProps> = ({
  width, height, seaPath, seaEdgePath, ridgePath, ridgeColor, skyColor, crestColor, troughColor, gain, windKmh, driftDirection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // jsdom has no 2D context and no Path2D.
    if (!canvas || !ctx || width === 0 || height === 0 || !seaPath || typeof Path2D === 'undefined') return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const y0 = height * 0.65;
    const look = getWaveLook(windKmh);
    const crestRgb = toRgb(ctx, crestColor);
    const troughRgb = toRgb(ctx, troughColor);
    const sea: Sea = {
      ctx, w: width, h: height, dpr, y0, dir: driftDirection, gain,
      crest: rgba(crestRgb, 1), trough: rgba(troughRgb, 1), crestRgb, troughRgb,
      clip: new Path2D(seaPath),
      edge: new Path2D(seaEdgePath),
      mirror: look.mirror.strength > 0.005
        ? buildMirror(width, height, dpr, y0, ridgePath ? new Path2D(ridgePath) : null, rgba(toRgb(ctx, ridgeColor), 1), toRgb(ctx, skyColor))
        : null,
    };

    if (prefersReducedMotion) {
      drawSea(sea, look, STILL_T);
      return;
    }
    let last = -Infinity;
    const loop = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        drawSea(sea, look, now / 1000);
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [width, height, seaPath, seaEdgePath, ridgePath, ridgeColor, skyColor, crestColor, troughColor, gain, windKmh, driftDirection, prefersReducedMotion]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" data-testid="sea-canvas" />;
};

export default SeaCanvas;
