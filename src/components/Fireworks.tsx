import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface FireworksProps {
  // Start time (ms) of the current show; 0 = none. A new value starts a new show.
  // The show runs to its end, however long the prop keeps this value (ROADMAP item 41).
  trigger: number;
  // Burst colours (CSS colours); keep the array stable, a new one restarts the show. National
  // days pass the flag colours (NationalEggs).
  palette?: readonly string[];
  // Item 123: while a show runs, the canvas takes taps (a double tap opens the fireworks card).
  onTap?: (event: React.MouseEvent) => void;
}

// Burst colours that stand out on a sunset sky (no yellow or orange), plus a
// white-gold core. Deliberately not the scene palette (ROADMAP item 15).
const CORE = '#fff3d1';
const COLORS = ['#6ff4ff', '#ff5ce1', '#b58cff', '#6dff9e'];
const WATER_LINE = 0.65; // horizon y as a share of the height, as in SunVisualization
const RISE_S = 1; // rocket rise time
const GRAVITY = 30; // px/s²
const DRAG = 0.6; // share of speed lost per second

export interface PlannedBurst {
  burstAt: number; // s after the show start
  x: number; // share of the width
  y: number; // share of the height
  big: boolean;
}

// 13 bursts 0.62 s apart, then a larger last one at about 9 s. With a 1 s rocket
// rise before and a 2.5–3.5 s fade after, the show lasts 12–13 s.
// ponytail: a fixed 0.62 s gap, not a random 0.6–0.9 s one; the random x/y gives enough variety.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const planShow = (random = Math.random): PlannedBurst[] => [
  ...Array.from({ length: 13 }, (_, i) => ({
    burstAt: RISE_S + i * 0.62,
    x: 0.15 + random() * 0.7,
    y: 0.2 + random() * 0.25,
    big: false,
  })),
  { burstAt: 9.1, x: 0.5, y: 0.28, big: true },
];
const MAX_FADE_S = 3.5;

interface Spark {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string;
  rocket?: PlannedBurst; // set while it is a rising rocket
}

const burst = (x: number, y: number, big: boolean, colors: readonly string[]): Spark[] => {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const n = big ? 110 : 60;
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + Math.random() * 0.1;
    const speed = (60 + Math.random() * 80) * (big ? 1.3 : 1);
    const maxLife = 2.5 + Math.random() * (MAX_FADE_S - 2.5);
    return {
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: maxLife, maxLife, color: i % 3 === 0 ? CORE : color,
    };
  });
};

const Fireworks: React.FC<FireworksProps> = ({ trigger, palette = COLORS, onTap }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!trigger || prefersReducedMotion || !canvas) return;
    setRunning(true);
    const pending = planShow();
    const start = performance.now();
    let last = start;

    const frame = (nowMs: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      const dt = Math.min(0.1, (nowMs - last) / 1000); // clamp after a hidden tab
      last = nowMs;
      const t = (nowMs - start) / 1000;

      // Launch rockets that burst 1 s from now: a straight, slow rise from the water line.
      while (pending.length && pending[0].burstAt - RISE_S <= t) {
        const b = pending.shift()!;
        const y0 = h * WATER_LINE;
        sparksRef.current.push({
          x: b.x * w, y: y0, vx: 0, vy: (b.y * h - y0) / RISE_S,
          life: RISE_S, maxLife: RISE_S, color: CORE, rocket: b,
        });
      }

      const next: Spark[] = [];
      for (const s of sparksRef.current) {
        s.life -= dt;
        if (s.rocket) {
          s.y += s.vy * dt;
          if (s.life <= 0) next.push(...burst(s.x, s.y, s.rocket.big, palette));
          else next.push(s);
          continue;
        }
        if (s.life <= 0) continue;
        s.vx *= 1 - DRAG * dt;
        s.vy = s.vy * (1 - DRAG * dt) + GRAVITY * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        next.push(s);
      }
      sparksRef.current = next;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const s of next) {
        // Short trail behind the spark; it fades out with the spark's life.
        ctx.globalAlpha = s.rocket ? 0.8 : Math.max(0, s.life / s.maxLife);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.rocket ? 1.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      rafRef.current = next.length || pending.length ? requestAnimationFrame(frame) : null;
      if (rafRef.current === null) setRunning(false);
    };
    rafRef.current = requestAnimationFrame(frame);
    // The trigger is a start time, so it changes only for a new show. Cleanup runs
    // for a new show, reduced motion, or unmount - not while a show is running.
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      sparksRef.current = [];
      setRunning(false);
    };
  }, [trigger, prefersReducedMotion, palette]);

  if (prefersReducedMotion) return null;
  const tappable = running && onTap;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden={tappable ? true : undefined}
      data-testid="fireworks"
      data-scene-hit={tappable ? '' : undefined}
      className={`absolute inset-0 w-full h-full ${tappable ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none'}`}
      onClick={tappable ? onTap : undefined}
    />
  );
};

export default Fireworks;
