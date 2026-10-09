import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScenePlaybackRate } from '@/hooks/useScenePlaybackRate';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { getSpawnGapFactor, type PlayDirection } from '@/utils/timeTravel';
import { makeDotPath, type DotPath } from '@/utils/satelliteUtils';
import { type SceneInfoHandler } from './CloudLayer';

// Satellites (ROADMAP item 97), behind everything else in the scene. Free: decorative white
// dots that cross the night sky in a straight line (Web Animations, so the compositor moves
// them; the play rate of item 83 applies). Premium: the tracked satellites at their real
// place, one new place per second with a CSS transition in between. No blinking: a blinking
// light is a plane.

export interface SatelliteDot {
  id: number;
  name: string;
  x: number; // px in the scene
  y: number;
  opacity: number;
  shown: boolean; // false: fading out (into the Earth's shadow, below 10° or behind terrain)
  iss: boolean;
}

interface SatellitesProps {
  width: number;
  height: number;
  // The tracked satellites, or null: the decorative dots.
  tracked: SatelliteDot[] | null;
  // The gap range between two decorative dots, or null: none come.
  gapMs: [number, number] | null;
  // The stars' cloud factor (item 52).
  cloudFactor: number;
  // The twilight fade of the decorative dots around the sun's -6° (0-1, getTwilightFade);
  // the tracked dots have it in their own opacity.
  twilight?: number;
  // The time between two places of a tracked dot (the clock tick), and no transition in compass mode.
  stepMs: number;
  playDirection?: PlayDirection;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
}

const HIT_PX = 44;
// A tracked dot fades out over this time (getSkySatellites keeps it FADE_MS = 6 s).
const FADE_OUT_MS = 5000;
// The decorative dots fade in and out over about 1 min around the sun's -6° (Lutz, 2026-10-06).
const TWILIGHT_TRANSITION_MS = 60_000;
// The time a dot takes to fade into the Earth's shadow.
const SHADOW_FADE_MS = 8000;

interface Decor {
  id: number;
  path: DotPath;
}

const DecorDot: React.FC<{ decor: Decor; width: number; height: number; onDone: (id: number) => void }> = ({ decor, width, height, onDone }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    const { x0, y0, x1, y1, durationMs, fadeAt } = decor.path;
    const at = (x: number, y: number) => `translate(${(x / 100) * width}px, ${(y / 100) * height}px)`;
    const fadeEnd = Math.min(1, fadeAt + SHADOW_FADE_MS / durationMs);
    const keyframes: Keyframe[] = fadeAt < 1
      ? [
          { offset: 0, transform: at(x0, y0), opacity: 0.8 },
          { offset: fadeAt, opacity: 0.8 },
          { offset: fadeEnd, opacity: 0 },
          { offset: 1, transform: at(x1, y1), opacity: 0 },
        ]
      : [{ transform: at(x0, y0), opacity: 0.8 }, { transform: at(x1, y1), opacity: 0.8 }];
    const animation = el.animate(keyframes, { duration: durationMs, easing: 'linear', fill: 'both' });
    animation.onfinish = () => onDone(decor.id);
    return () => animation.cancel();
    // The size at spawn: a resize does not restart a crossing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decor]);
  return <span ref={ref} className="absolute left-0 top-0 h-0.5 w-0.5 rounded-full bg-white" data-testid="satellite-decor" />;
};

const Satellites: React.FC<SatellitesProps> = ({
  width, height, tracked, gapMs, cloudFactor, twilight = 1, stepMs, playDirection = 0, onInfo, infoRing = null,
}) => {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Item 116: a double tap opens the card; a keyboard click (no pointer, detail 0) at once.
  const { tap } = useDoubleTap(onInfo);
  const containerRef = useRef<HTMLDivElement>(null);
  const [decors, setDecors] = useState<Decor[]>([]);
  const nextId = useRef(0);
  useScenePlaybackRate(containerRef, playDirection);

  // Decorative dots: one after a random gap in `gapMs`, shorter during play (item 83).
  const showDecor = tracked === null && gapMs !== null && cloudFactor > 0 && !prefersReducedMotion && width > 0;
  const gapMin = gapMs?.[0] ?? 0;
  const gapMax = gapMs?.[1] ?? 0;
  const gapFactor = getSpawnGapFactor(playDirection);
  useEffect(() => {
    if (!showDecor) return;
    let timer: ReturnType<typeof setTimeout>;
    // The first dot comes sooner, so a night view does not start empty for minutes.
    let gap = Math.random() * gapMin * 0.5;
    const spawn = () => {
      nextId.current += 1;
      const path = makeDotPath([Math.random(), Math.random(), Math.random(), Math.random(), Math.random()]);
      setDecors((list) => [...list, { id: nextId.current, path }]);
      gap = gapMin + Math.random() * (gapMax - gapMin);
      timer = setTimeout(spawn, gap * gapFactor);
    };
    timer = setTimeout(spawn, gap * gapFactor);
    return () => clearTimeout(timer);
  }, [showDecor, gapMin, gapMax, gapFactor]);
  // The dots leave when the tracking takes over. When the night ends or clouds come, no new
  // dot comes, and the ones on the way fade out with the layer and finish their crossing.
  if ((tracked !== null || prefersReducedMotion) && decors.length > 0) setDecors([]);
  const removeDecor = React.useCallback((id: number) => setDecors((list) => list.filter((d) => d.id !== id)), []);

  if (!tracked && decors.length === 0) return null;

  const transition = prefersReducedMotion || stepMs === 0
    ? `opacity ${FADE_OUT_MS}ms ease-out`
    : `transform ${stepMs}ms linear, opacity ${FADE_OUT_MS}ms ease-out`;

  return (
    <div
      ref={containerRef}
      aria-hidden={tracked ? undefined : true}
      className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-2000"
      style={{ opacity: cloudFactor }}
      data-testid="satellites"
    >
      {decors.length > 0 && (
        // The sun's altitude comes in 30 s steps: a 1 min transition fades the dots smoothly.
        <div className="absolute inset-0" style={{ opacity: twilight, transition: `opacity ${TWILIGHT_TRANSITION_MS}ms linear` }} data-testid="satellite-decor-layer">
          {decors.map((decor) => (
            <DecorDot key={decor.id} decor={decor} width={width} height={height} onDone={removeDecor} />
          ))}
        </div>
      )}
      {tracked?.map((dot) => {
        const ring = `satellite-${dot.id}`;
        const size = dot.iss ? 5 : 3;
        return (
          <button
            key={dot.id}
            type="button"
            aria-label={dot.name}
            tabIndex={dot.shown ? 0 : -1}
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              tap({ type: 'satellite', id: dot.id, name: dot.name }, { x: box.left + box.width / 2, y: box.top + box.height / 2 }, ring, event.detail === 0);
            }}
            className={`absolute left-0 top-0 flex items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 touch-manipulation ${dot.shown ? 'pointer-events-auto' : ''}`}
            style={{
              width: HIT_PX,
              height: HIT_PX,
              transform: `translate(${dot.x - HIT_PX / 2}px, ${dot.y - HIT_PX / 2}px)`,
              opacity: dot.shown ? dot.opacity : 0,
              transition,
            }}
            title={t('scene.satellite')}
            data-testid="satellite-tracked"
          >
            <span
              className="rounded-full bg-white"
              style={{ width: size, height: size, boxShadow: dot.iss ? '0 0 4px 1px rgb(255 255 255 / 0.6)' : undefined }}
            />
            {(infoRing === ring) && <span className="absolute inset-2 rounded-full border border-white/70" data-testid="scene-info-ring" />}
          </button>
        );
      })}
    </div>
  );
};

export default Satellites;
