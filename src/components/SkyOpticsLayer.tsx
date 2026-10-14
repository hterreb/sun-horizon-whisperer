import React, { useEffect, useId, useState } from 'react';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { type SceneInfoHandler } from './CloudLayer';
import { type RainbowGeometry } from './SunVisualization';
import { OPTIC_KINDS, getOptic, type OpticKind } from '@/utils/skyOptics';
import { TIER_RING_STROKE } from '@/utils/rarityTier';

// The sky optics (ROADMAP item 148, optics lookbook 2026-10-14): crepuscular rays, sun dogs, the 22°
// halo, the double rainbow, the fog bow, the moonbow, the sun pillar and the moon halo. Each is a
// static SVG that fades in and out over OPTIC_FADE_MS and is still in between (calm rule). The
// layer sits right after RainbowLayer, with no z-index, so the clouds, the sun, planes and birds
// draw over it and take the tap where they cross it. As the rainbow, only thin hit paths take
// taps (a double tap opens the card and collects the badge). The colours are the fixed colours of
// the light, not theme tokens (as the rainbow's spectrum). All places are whole pixels, so the
// 1 s scene tick does not repaint the blurred shapes.

interface SkyOpticsLayerProps {
  optics: readonly OpticKind[];
  containerWidth: number;
  containerHeight: number;
  // The screen places of the sun and the moon (the dots' places); null outside the compass view.
  sun: { x: number; y: number } | null;
  moon: { x: number; y: number } | null;
  // getRainbowGeometry for the point opposite the sun (the double rainbow, the fog bow) and the
  // point opposite the moon (the moonbow).
  antisolar: RainbowGeometry;
  antilunar: RainbowGeometry;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
}

export const OPTIC_FADE_MS = 5000;
// The closer scale (lookbook picks O2C, O3G, O8B): 5 px per degree on every screen, so a 22° ring
// and both sun dogs fit on a 390 px phone (78° across).
export const OPTIC_PX_PER_DEG = 5;
const RING_PX = 22 * OPTIC_PX_PER_DEG;
// The rainbow's spectrum (RainbowLayer), outermost first.
const SPECTRUM = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#7c3aed'];
// As RainbowLayer: the bows' hit paths stop above the horizon, so the feet keep free.
const FEET_FREE_PX = 30;
// Thin hit paths, as the rainbow's: a band along a ring or bow, a beam along a ray, a spot.
const HIT_PX = 28;
const SPOT_HIT_R = 22;

// The ring id of an optic's card (useDoubleTap, SunTracker's infoRing).
const opticRing = (kind: OpticKind): string => `optic:${kind}`;

const px = (n: number): number => Math.round(n);
const rad = (deg: number): number => (deg * Math.PI) / 180;
// SunVisualization's altitudeToY: the horizon at 65 % of the height, 90° 30 px under the top.
const altitudeToY = (altitude: number, height: number): number => {
  const horizonY = height * 0.65;
  return horizonY - Math.sin(rad(altitude)) * (horizonY - 30);
};
// The rainbow's scale (RainbowLayer): 42° = 0.95 × the horizon height.
const bowRadius = (apexDeg: number, horizonY: number): number => px((apexDeg / 42) * horizonY * 0.95);

type Hit =
  | { shape: 'band'; cx: number; cy: number; r: number; width: number }
  | { shape: 'beam'; x1: number; y1: number; x2: number; y2: number }
  | { shape: 'spot'; cx: number; cy: number };
interface OpticDrawing {
  art: React.ReactNode;
  hits: Hit[];
  bow?: boolean; // a bow's hit svg stops FEET_FREE_PX above the horizon
}

const Blur = ({ id, sd }: { id: string; sd: number }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={sd} /></filter>
);
// RainbowLayer's mask: full strength at the top, 30 % at the horizon.
const FeetMask = ({ id, width, horizonY }: { id: string; width: number; horizonY: number }) => (
  <>
    <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2={horizonY} gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="white" stopOpacity={1} />
      <stop offset="1" stopColor="white" stopOpacity={0.3} />
    </linearGradient>
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={horizonY}>
      <rect width={width} height={horizonY} fill={`url(#${id}g)`} />
    </mask>
  </>
);
const Ring = ({ cx, cy, r, colour, width, opacity, filter }: { cx: number; cy: number; r: number; colour: string; width: number; opacity: number; filter?: string }) =>
  r > 0 ? <circle cx={cx} cy={cy} r={r} fill="none" stroke={colour} strokeWidth={width} strokeOpacity={opacity} filter={filter && `url(#${filter})`} /> : null;

interface Frame { width: number; horizonY: number; height: number }

// O1B: 7 faint light wedges from the sun, fading along their length (peak 16 %).
const RAY_ANGLES = [-161, -143, -124, -104, -84, -63, -40];
const RAY_HALF_WIDTHS = [2.2, 3.2, 2.0, 3.8, 2.6, 3.0, 2.2];
const RAY_STRENGTHS = [0.7, 1, 0.55, 0.9, 0.6, 1, 0.65];
const RAY_PEAK = 0.16;
const drawRays = (id: string, f: Frame, sun: { x: number; y: number }): OpticDrawing => {
  const { x, y } = sun;
  const length = Math.max(Math.hypot(x, y), Math.hypot(f.width - x, y)) * 1.02;
  const at = (deg: number, r: number) => ({ x: px(x + r * Math.cos(rad(deg))), y: px(y + r * Math.sin(rad(deg))) });
  const wedge = (deg: number, half: number) => {
    const a = at(deg - half, length), b = at(deg + half, length);
    return `M${x} ${y}L${a.x} ${a.y}L${b.x} ${b.y}Z`;
  };
  return {
    art: (
      <>
        <defs>
          <radialGradient id={`${id}g`} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={px(length)}>
            <stop offset="0" stopColor="#ffe2b4" stopOpacity={0} />
            <stop offset="0.06" stopColor="#ffe2b4" stopOpacity={RAY_PEAK} />
            <stop offset="0.5" stopColor="#ffe2b4" stopOpacity={RAY_PEAK * 0.55} />
            <stop offset="1" stopColor="#ffe2b4" stopOpacity={0} />
          </radialGradient>
          <Blur id={`${id}b`} sd={5} />
        </defs>
        <g filter={`url(#${id}b)`}>
          {RAY_ANGLES.map((deg, i) => <path key={deg} d={wedge(deg, RAY_HALF_WIDTHS[i])} fill={`url(#${id}g)`} opacity={RAY_STRENGTHS[i]} />)}
        </g>
      </>
    ),
    // Along the bright half of each ray; the sun (drawn later) keeps its own tap near the centre.
    hits: RAY_ANGLES.map((deg) => {
      const a = at(deg, 48), b = at(deg, length * 0.5);
      return { shape: 'beam', x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }),
  };
};

// O2C: a soft spot 22° on each side of the sun (red toward the sun) with a white tail outward.
const drawSunDogs = (id: string, sun: { x: number; y: number }): OpticDrawing => {
  const sides = [-1, 1].map((side) => ({ side, cx: sun.x + side * RING_PX }));
  return {
    art: (
      <>
        <defs>
          {sides.map(({ side, cx }) => (
            <React.Fragment key={side}>
              <linearGradient id={`${id}d${side}`} gradientUnits="userSpaceOnUse" x1={cx - side * 10} y1="0" x2={cx + side * 10} y2="0">
                <stop offset="0" stopColor="#ff7a5c" stopOpacity={0.95} />
                <stop offset="0.45" stopColor="#ffe6b0" />
                <stop offset="1" stopColor="#e8f0ff" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id={`${id}t${side}`} gradientUnits="userSpaceOnUse" x1={cx} y1="0" x2={cx + side * 52} y2="0">
                <stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
                <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </React.Fragment>
          ))}
          <Blur id={`${id}b`} sd={2.5} />
        </defs>
        <g filter={`url(#${id}b)`} opacity={0.62}>
          {sides.map(({ side, cx }) => (
            <React.Fragment key={side}>
              <ellipse cx={cx} cy={sun.y} rx={10} ry={18} fill={`url(#${id}d${side})`} />
              <ellipse cx={cx + side * 26} cy={sun.y} rx={26} ry={4.5} fill={`url(#${id}t${side})`} />
            </React.Fragment>
          ))}
        </g>
      </>
    ),
    hits: sides.map(({ cx }) => ({ shape: 'spot', cx, cy: sun.y })),
  };
};

// O3G: the 22° ring in the sun's own golden glow colour, one soft radial gradient, with the sky
// inside a little darker (no light is bent by less than 22°).
const drawHalo = (id: string, sun: { x: number; y: number }): OpticDrawing => {
  const r = RING_PX, outer = r + 44;
  return {
    art: (
      <>
        <defs>
          <radialGradient id={`${id}g`} gradientUnits="userSpaceOnUse" cx={sun.x} cy={sun.y} r={outer}>
            <stop offset="0" stopColor="#ffb36b" stopOpacity={0} />
            <stop offset={(r - 6) / outer} stopColor="#ffb36b" stopOpacity={0} />
            <stop offset={(r - 1) / outer} stopColor="#ffcf8a" stopOpacity={0.8} />
            <stop offset={(r + 5) / outer} stopColor="#fff1d6" stopOpacity={0.5} />
            <stop offset="1" stopColor="#fff1d6" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${id}d`} gradientUnits="userSpaceOnUse" cx={sun.x} cy={sun.y} r={r}>
            <stop offset="0" stopColor="#0b1a33" stopOpacity={0} />
            <stop offset="0.5" stopColor="#0b1a33" stopOpacity={0.036} />
            <stop offset="0.95" stopColor="#0b1a33" stopOpacity={0.06} />
            <stop offset="1" stopColor="#0b1a33" stopOpacity={0} />
          </radialGradient>
          <Blur id={`${id}b`} sd={2.5} />
        </defs>
        <g opacity={0.6}>
          <circle cx={sun.x} cy={sun.y} r={r} fill={`url(#${id}d)`} filter={`url(#${id}b)`} />
          <circle cx={sun.x} cy={sun.y} r={outer} fill={`url(#${id}g)`} filter={`url(#${id}b)`} />
        </g>
      </>
    ),
    hits: [{ shape: 'band', cx: sun.x, cy: sun.y, r: r + 2, width: HIT_PX }],
  };
};

// O4B: the second bow at 51°, the spectrum reversed (9 px apart, 6 px wide, 12 %), and Alexander's
// darker band between the bows. RainbowLayer draws the first bow.
const drawDoubleRainbow = (id: string, f: Frame, bow: RainbowGeometry): OpticDrawing => {
  const cx = px(bow.xFraction * f.width), cy = px(f.horizonY);
  const first = bowRadius(bow.apexHeightDeg, f.horizonY);
  const second = bowRadius(bow.apexHeightDeg + 9, f.horizonY);
  const secondInner = second - 5 * 9 - 3;
  return {
    art: (
      <>
        <defs>
          <Blur id={`${id}b`} sd={1.5} />
          <Blur id={`${id}a`} sd={6} />
          <FeetMask id={`${id}m`} width={f.width} horizonY={f.horizonY} />
        </defs>
        <g mask={`url(#${id}m)`}>
          <Ring cx={cx} cy={cy} r={px((first + 3 + secondInner) / 2)} colour="#0a1428" width={Math.max(0, secondInner - first - 6)} opacity={0.07} filter={`${id}a`} />
          <g filter={`url(#${id}b)`} opacity={0.12}>
            {[...SPECTRUM].reverse().map((colour, i) => <Ring key={colour} cx={cx} cy={cy} r={second - i * 9} colour={colour} width={6} opacity={1} />)}
          </g>
        </g>
      </>
    ),
    hits: [{ shape: 'band', cx, cy, r: second - 22, width: 5 * 9 + 6 }],
    bow: true,
  };
};

// O5B: a broad white bow at 39° (46 px, about 4°) with a warm outer and a blue inner edge, 36 %.
const drawFogBow = (id: string, f: Frame, bow: RainbowGeometry): OpticDrawing | null => {
  const r = bowRadius(bow.apexHeightDeg - 3, f.horizonY);
  if (r <= 0) return null;
  const cx = px(bow.xFraction * f.width), cy = px(f.horizonY);
  return {
    art: (
      <>
        <defs>
          <Blur id={`${id}b`} sd={6} />
          <FeetMask id={`${id}m`} width={f.width} horizonY={f.horizonY} />
        </defs>
        <g mask={`url(#${id}m)`}>
          <g filter={`url(#${id}b)`} opacity={0.36}>
            <Ring cx={cx} cy={cy} r={r} colour="#ffffff" width={46} opacity={0.9} />
            <Ring cx={cx} cy={cy} r={r + 21} colour="#ffb08a" width={5} opacity={0.5} />
            <Ring cx={cx} cy={cy} r={r - 21} colour="#a8c8ff" width={5} opacity={0.4} />
          </g>
        </g>
      </>
    ),
    hits: [{ shape: 'band', cx, cy, r, width: 46 }],
    bow: true,
  };
};

// O6E: opposite the moon, on the rainbow's scale: a broad pale band with a brighter thin inner rim.
const drawMoonbow = (id: string, f: Frame, bow: RainbowGeometry): OpticDrawing | null => {
  const mid = bowRadius(bow.apexHeightDeg, f.horizonY) - px(2.5 * 7); // the centre of the rainbow's 6 bands
  if (mid <= 0) return null;
  const cx = px(bow.xFraction * f.width), cy = px(f.horizonY);
  return {
    art: (
      <>
        <defs>
          <Blur id={`${id}b`} sd={7} />
          <Blur id={`${id}r`} sd={1.2} />
          <FeetMask id={`${id}m`} width={f.width} horizonY={f.horizonY} />
        </defs>
        <g mask={`url(#${id}m)`}>
          <g opacity={0.3}>
            <Ring cx={cx} cy={cy} r={mid + 6} colour="#eef2f8" width={56} opacity={0.55} filter={`${id}b`} />
            <Ring cx={cx} cy={cy} r={mid - 20} colour="#ffffff" width={3} opacity={1} filter={`${id}r`} />
          </g>
        </g>
      </>
    ),
    hits: [{ shape: 'band', cx, cy, r: mid + 6, width: 56 }],
    bow: true,
  };
};

// O7B: a tapered column of light from the horizon 15° up over the sun, orange to clear, 72 %.
const PILLAR_DEG = 15;
const drawSunPillar = (id: string, f: Frame, sun: { x: number; y: number }): OpticDrawing => {
  const x = sun.x, base = px(f.horizonY), top = px(altitudeToY(PILLAR_DEG, f.height));
  const wb = 28, wt = 13;
  const d = `M${x - wb / 2} ${base + 4}L${x - wt / 2} ${top}Q${x} ${top - 8} ${x + wt / 2} ${top}L${x + wb / 2} ${base + 4}Z`;
  return {
    art: (
      <>
        <defs>
          <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="0" y1={base} x2="0" y2={top}>
            <stop offset="0" stopColor="#ff9a5a" />
            <stop offset="0.4" stopColor="#ffc27a" stopOpacity={0.75} />
            <stop offset="1" stopColor="#ffdca8" stopOpacity={0} />
          </linearGradient>
          <Blur id={`${id}b`} sd={3.5} />
        </defs>
        <path d={d} fill={`url(#${id}g)`} opacity={0.72} filter={`url(#${id}b)`} />
      </>
    ),
    hits: [{ shape: 'beam', x1: x, y1: base, x2: x, y2: top }],
  };
};

// O8B on the closer scale: a white 22° ring around the moon with a faint warm inner edge, 24 %.
const drawMoonHalo = (id: string, moon: { x: number; y: number }): OpticDrawing => {
  const r = RING_PX;
  return {
    art: (
      <>
        <defs><Blur id={`${id}b`} sd={2.5} /></defs>
        <g filter={`url(#${id}b)`} opacity={0.24}>
          <Ring cx={moon.x} cy={moon.y} r={r - 3} colour="#f6dccb" width={2.5} opacity={0.55} />
          <Ring cx={moon.x} cy={moon.y} r={r + 1} colour="#eef3ff" width={6} opacity={1} />
          <Ring cx={moon.x} cy={moon.y} r={r + 7} colour="#ffffff" width={9} opacity={0.35} />
        </g>
      </>
    ),
    hits: [{ shape: 'band', cx: moon.x, cy: moon.y, r: r + 3, width: HIT_PX }],
  };
};

const whole = (p: { x: number; y: number } | null) => p && { x: px(p.x), y: px(p.y) };
const draw = (kind: OpticKind, id: string, f: Frame, p: SkyOpticsLayerProps): OpticDrawing | null => {
  const { antisolar, antilunar } = p;
  const sun = whole(p.sun), moon = whole(p.moon);
  switch (kind) {
    case 'rays': return sun && drawRays(id, f, sun);
    case 'sunDogs': return sun && drawSunDogs(id, sun);
    case 'halo': return sun && drawHalo(id, sun);
    case 'doubleRainbow': return antisolar.visible ? drawDoubleRainbow(id, f, antisolar) : null;
    case 'fogBow': return antisolar.visible ? drawFogBow(id, f, antisolar) : null;
    case 'moonbow': return antilunar.visible ? drawMoonbow(id, f, antilunar) : null;
    case 'sunPillar': return sun && drawSunPillar(id, f, sun);
    case 'moonHalo': return moon && drawMoonHalo(id, moon);
  }
};

// A hit path, and its outline in the tier colour while the card is open (as the rainbow's ring).
const HitShape = ({ hit, onClick }: { hit: Hit; onClick: (e: React.MouseEvent<SVGElement>) => void }) => {
  const common = { className: 'cursor-pointer touch-manipulation', 'data-testid': 'optic-hit', 'data-scene-hit': '', onClick };
  switch (hit.shape) {
    case 'band': return <circle cx={hit.cx} cy={hit.cy} r={hit.r} fill="none" stroke="transparent" strokeWidth={hit.width} style={{ pointerEvents: 'stroke' }} {...common} />;
    case 'beam': return <line x1={hit.x1} y1={hit.y1} x2={hit.x2} y2={hit.y2} stroke="transparent" strokeWidth={HIT_PX} style={{ pointerEvents: 'stroke' }} {...common} />;
    case 'spot': return <circle cx={hit.cx} cy={hit.cy} r={SPOT_HIT_R} fill="transparent" style={{ pointerEvents: 'fill' }} {...common} />;
  }
};
const HitOutline = ({ hit, className }: { hit: Hit; className: string }) => {
  const ring = { fill: 'none', strokeWidth: 1, className, 'data-testid': 'scene-info-ring' };
  switch (hit.shape) {
    case 'band':
      return <>{[hit.r + hit.width / 2, hit.r - hit.width / 2].map((r) => r > 0 && <circle key={r} cx={hit.cx} cy={hit.cy} r={r} {...ring} />)}</>;
    case 'beam': {
      const len = Math.hypot(hit.x2 - hit.x1, hit.y2 - hit.y1) || 1;
      const nx = (-(hit.y2 - hit.y1) / len) * (HIT_PX / 2), ny = ((hit.x2 - hit.x1) / len) * (HIT_PX / 2);
      const points = [[hit.x1 + nx, hit.y1 + ny], [hit.x2 + nx, hit.y2 + ny], [hit.x2 - nx, hit.y2 - ny], [hit.x1 - nx, hit.y1 - ny]];
      return <polygon points={points.map(([x, y]) => `${px(x)},${px(y)}`).join(' ')} {...ring} />;
    }
    case 'spot': return <circle cx={hit.cx} cy={hit.cy} r={SPOT_HIT_R} {...ring} />;
  }
};

// The optics that just ended stay OPTIC_FADE_MS longer, to fade out (none with reduced motion).
const useLeaving = (shown: readonly OpticKind[], reducedMotion: boolean): OpticKind[] => {
  const [prev, setPrev] = useState(shown);
  const [leaving, setLeaving] = useState<OpticKind[]>([]);
  if (prev.join() !== shown.join()) {
    setPrev(shown);
    if (!reducedMotion) setLeaving((was) => OPTIC_KINDS.filter((k) => (was.includes(k) || prev.includes(k)) && !shown.includes(k)));
  }
  useEffect(() => {
    if (leaving.length === 0) return;
    const timer = setTimeout(() => setLeaving([]), OPTIC_FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);
  return leaving.filter((k) => !shown.includes(k));
};

const SkyOpticsLayer: React.FC<SkyOpticsLayerProps> = (props) => {
  const { optics, containerWidth: width, containerHeight: height, onInfo, infoRing = null } = props;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const reducedMotion = usePrefersReducedMotion();
  const leaving = useLeaving(optics, reducedMotion);
  const { tap } = useDoubleTap(onInfo);
  if (width <= 0 || height <= 0) return null;
  const drawn = OPTIC_KINDS.filter((k) => optics.includes(k) || leaving.includes(k));
  if (drawn.length === 0) return null;

  const frame: Frame = { width, height, horizonY: height * 0.65 };
  return (
    <div className="absolute left-0 top-0 w-full overflow-hidden pointer-events-none" style={{ height: `${frame.horizonY}px` }} data-testid="sky-optics-layer">
      {drawn.map((kind) => {
        const id = `${uid}${kind}`;
        const drawing = draw(kind, id, frame, props);
        if (!drawing) return null;
        const isLeaving = leaving.includes(kind);
        const fade = reducedMotion ? '' : isLeaving ? 'animate-optic-out' : 'animate-optic-in';
        const ring = opticRing(kind);
        const onClick = (e: React.MouseEvent<SVGElement>) => tap({ type: 'optic', kind }, { x: e.clientX, y: e.clientY }, ring);
        return (
          <React.Fragment key={kind}>
            <svg width={width} height={frame.horizonY} className={`absolute inset-0 ${fade}`} aria-hidden="true" data-testid="sky-optic" data-optic={kind} data-leaving={isLeaving ? '' : undefined}>
              {drawing.art}
            </svg>
            {onInfo && !isLeaving && (
              <svg
                width={width}
                height={Math.max(0, frame.horizonY - (drawing.bow ? FEET_FREE_PX : 0))}
                className="absolute left-0 top-0 overflow-hidden"
                aria-hidden="true"
                data-optic-hit={kind}
              >
                {drawing.hits.map((hit, i) => <HitShape key={i} hit={hit} onClick={onClick} />)}
                {infoRing === ring && drawing.hits.map((hit, i) => <HitOutline key={i} hit={hit} className={TIER_RING_STROKE[getOptic(kind).tier]} />)}
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default SkyOpticsLayer;
