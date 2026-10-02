import React, { useEffect, useRef } from 'react';
import { type TimeOfDay } from '../utils/sunUtils';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  getRainAngleDeg, getRainIntensity, getRainLook, getRainWaterY, placeRainDrop, stepRainDrops,
  type RainDrop, type RainScene,
} from '../utils/rainUtils';

// Rain, redone (ROADMAP item 77, R6 "Depth layers"): one canvas and one rAF loop for drizzle,
// rain and storm. Far: a fine veil in the band above the horizon that thickens toward it.
// Middle: streaks that end on the water at their depth and leave a ring there (X3). Near: a
// few long, soft streaks. A drop that leaves starts again at the top, so the rain never
// pauses. The haze over the horizon is the canvas's CSS background.

type Mode = 'day' | 'dusk' | 'night';
const MODE: Record<TimeOfDay, Mode> = {
  night: 'night', 'astronomical-twilight': 'night', 'nautical-twilight': 'night',
  'civil-twilight': 'dusk', dawn: 'dusk', evening: 'dusk',
  morning: 'day', midday: 'day', afternoon: 'day',
};
const MODE_ALPHA: Record<Mode, number> = { day: 1, dusk: 0.95, night: 0.75 };

const HORIZON_FRACTION = 0.65; // SunVisualization's horizon line
const BAND_TOP = 0.26; // the far veil starts this share of the height above the horizon
const BAND_SLICES = 8;
const Z_BATCHES = 4;
const RING_SEC = 0.8;
const MAX_RINGS = 120;
const RING_LEVELS = 5;

// Each layer's share of the look's drop count and its depth range.
const LAYERS = {
  far: { share: 0.5, min: 0, z0: 0, z1: 0.1 },
  middle: { share: 0.72, min: 0, z0: 0.1, z1: 0.85 },
  near: { share: 0.05, min: 4, z0: 0.92, z1: 1 },
};
type LayerName = keyof typeof LAYERS;

interface RainCanvasProps {
  weatherType: 'drizzle' | 'rain' | 'storm';
  mmH: number;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  timeOfDay: TimeOfDay;
}

const RainCanvas: React.FC<RainCanvasProps> = ({ weatherType, mmH, windSpeedKmh, windDirectionDeg, timeOfDay }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const mode = MODE[timeOfDay];
  const angleDeg = getRainAngleDeg(windSpeedKmh, windDirectionDeg, weatherType === 'drizzle');
  const hazeAlpha = (0.08 + 0.18 * getRainIntensity(mmH)) * MODE_ALPHA[mode];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const color = getComputedStyle(document.documentElement).getPropertyValue(`--scene-rain-${mode}`).trim() || '210 52% 89%';
    const rgba = (alpha: number) => `hsl(${color} / ${alpha.toFixed(3)})`;
    const modeAlpha = MODE_ALPHA[mode];
    const tan = Math.tan((angleDeg * Math.PI) / 180);
    const ux = tan / Math.hypot(tan, 1);
    const uy = 1 / Math.hypot(tan, 1);
    let scene: RainScene = { width: 0, height: 0, horizonY: 0, tan };
    let look = getRainLook(mmH, 0);
    let k = 1;
    let pools: Record<LayerName, RainDrop[]> = { far: [], middle: [], near: [] };
    let rings: { x: number; y: number; z: number; age: number }[] = [];

    const newDrop = (name: LayerName): RainDrop => {
      const { z0, z1 } = LAYERS[name];
      const z = z0 + (z1 - z0) * Math.random() ** 1.3;
      const drop = {
        x: 0, y: 0, z,
        top: name === 'far' ? scene.horizonY - BAND_TOP * scene.height : 0,
        // Far and middle drops end on the water at their depth, near ones below the screen.
        end: name === 'near' ? scene.height + 40 : getRainWaterY(z, scene),
      };
      placeRainDrop(drop, scene, Math.random, true);
      return drop;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene = { width: rect.width, height: rect.height, horizonY: rect.height * HORIZON_FRACTION, tan };
      look = getRainLook(mmH, rect.width);
      k = Math.min(1, Math.max(0.5, rect.height / 700));
      pools = { far: [], middle: [], near: [] };
      rings = [];
      for (const name of Object.keys(LAYERS) as LayerName[]) {
        const n = Math.max(LAYERS[name].min, Math.round(look.drops * LAYERS[name].share));
        for (let i = 0; i < n; i++) pools[name].push(newDrop(name));
      }
    };

    // Middle and near streaks, in Z_BATCHES depth batches: far ones shorter, thinner, fainter.
    const drawStreaks = (drops: RainDrop[], soft: boolean) => {
      const length0 = look.nearLengthPx * k * (soft ? 1.9 : 1);
      const width0 = look.nearWidthPx * Math.max(0.7, k);
      const alpha0 = look.opacity * modeAlpha;
      for (let b = 0; b < Z_BATCHES; b++) {
        ctx.beginPath();
        for (const drop of drops) {
          if (Math.min(Z_BATCHES - 1, Math.floor(drop.z * Z_BATCHES)) !== b) continue;
          const length = length0 * (0.35 + 0.65 * drop.z);
          ctx.moveTo(drop.x - ux * length, drop.y - uy * length);
          ctx.lineTo(drop.x, drop.y);
        }
        const zc = (b + 0.5) / Z_BATCHES;
        if (soft) {
          ctx.lineWidth = Math.max(1, width0 * 5);
          ctx.strokeStyle = rgba(alpha0 * 0.12);
          ctx.stroke();
        }
        ctx.lineWidth = Math.max(0.5, width0 * (0.5 + 0.5 * zc) * (soft ? 1.6 : 1));
        ctx.strokeStyle = rgba(alpha0 * (0.35 + 0.65 * zc) * (soft ? 0.55 : 1));
        ctx.stroke();
      }
    };

    // The far veil: short, faint dashes, in slices that get stronger toward the horizon.
    const drawVeil = (drops: RainDrop[]) => {
      const y0 = scene.horizonY - BAND_TOP * scene.height;
      const sliceH = (scene.horizonY + 0.03 * scene.height - y0) / BAND_SLICES;
      const length = (1.5 + 3.5 * look.t) * k;
      ctx.lineWidth = Math.max(0.5, 0.7 * k);
      for (let s = 0; s < BAND_SLICES; s++) {
        ctx.beginPath();
        for (const drop of drops) {
          if (Math.min(BAND_SLICES - 1, Math.floor((drop.y - y0) / sliceH)) !== s) continue;
          ctx.moveTo(drop.x - ux * length, drop.y - uy * length);
          ctx.lineTo(drop.x, drop.y);
        }
        ctx.strokeStyle = rgba(0.7 * Math.pow((s + 1) / BAND_SLICES, 1.5) * (0.35 + 0.5 * look.t) * modeAlpha);
        ctx.stroke();
      }
    };

    // X3: flat rings that widen and fade in 0.8 s, smaller and fainter toward the horizon. Each
    // ring is built squashed and stroked unsquashed, so the line keeps its width; the rings go
    // in RING_LEVELS opacity batches, one stroke each.
    const drawRings = () => {
      ctx.lineWidth = Math.max(0.6, 0.9 * k);
      for (let level = 0; level < RING_LEVELS; level++) {
        ctx.beginPath();
        for (const ring of rings) {
          const f = ring.age / RING_SEC;
          const alpha = 0.55 * (1 - f) * (0.4 + 0.6 * ring.z);
          if (Math.min(RING_LEVELS - 1, Math.floor((alpha / 0.55) * RING_LEVELS)) !== level) continue;
          const radius = (1 + (2 + 7 * ring.z) * f) * k * 1.6;
          ctx.save();
          ctx.translate(ring.x, ring.y);
          ctx.scale(1, 0.3);
          ctx.moveTo(radius, 0);
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.restore();
        }
        ctx.strokeStyle = rgba(0.55 * ((level + 0.5) / RING_LEVELS) * modeAlpha);
        ctx.stroke();
      }
    };

    const draw = (dt: number) => {
      stepRainDrops(pools.far, dt, scene, look.fallSec, Math.random);
      for (const splash of stepRainDrops(pools.middle, dt, scene, look.fallSec, Math.random)) {
        if (rings.length < MAX_RINGS) rings.push({ ...splash, age: 0 });
      }
      stepRainDrops(pools.near, dt, scene, look.fallSec, Math.random);
      rings = rings.filter(ring => (ring.age += dt) < RING_SEC);

      ctx.clearRect(0, 0, scene.width, scene.height);
      ctx.lineCap = 'round';
      drawVeil(pools.far);
      drawStreaks(pools.middle, false);
      drawStreaks(pools.near, true);
      drawRings();
    };

    resize();
    draw(0);
    const onResize = () => { resize(); draw(0); };
    window.addEventListener('resize', onResize);
    if (prefersReducedMotion) return () => window.removeEventListener('resize', onResize);

    let last = performance.now();
    const loop = (now: number) => {
      draw(Math.min(0.05, Math.max(0, (now - last) / 1000)));
      last = now;
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [mode, angleDeg, mmH, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full pointer-events-none"
      // Above the sea and the boats, below the chips (z 9). The haze: the rain's own grey
      // band over the horizon, stronger with more rain.
      style={{
        zIndex: 8,
        background: `linear-gradient(to bottom, transparent 29%, hsl(var(--scene-rain-${mode}) / ${hazeAlpha.toFixed(3)}) 65%, transparent 77%)`,
      }}
      data-testid="rain-canvas"
      data-mm-h={mmH}
      data-angle={angleDeg.toFixed(1)}
    />
  );
};

export default RainCanvas;
