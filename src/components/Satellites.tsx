import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useScenePlaybackRate } from '@/hooks/useScenePlaybackRate';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { getSpawnGapFactor, type PlayDirection } from '@/utils/timeTravel';
import { getSatelliteDotPx, getSatelliteGlowPx, makeDotPath, pickShownSatellites, type DotPath } from '@/utils/satelliteUtils';
import { type SceneInfoHandler } from './CloudLayer';
import { getStarGapShow } from '@/utils/weatherEffectsUtils';

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
  magnitude: number; // sets the dot's size and glow (item 131)
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
  gap: number; // item 135: the cloud factor below which clouds hide this dot (as the stars, item 134)
}

// A tracked satellite's gap from its id, so the same satellite stays behind its cloud or in its gap.
const trackedGap = (id: number): number => (id * 0.6180339887) % 1;

// Item 162: one update of the tracked dots (a new `tracked` list or cloud factor). A second render
// of the same update uses the same step, so it gives the same result.
interface TrackedStep {
  tracked: SatelliteDot[] | null;
  cloudFactor: number;
  // The dots that show (the cap, pickShownSatellites): a shown dot keeps its place in the next step.
  shownIds: ReadonlySet<number>;
  // The dots whose x changed by more than half the width since the last step: in the 360° view
  // north is at both edges, and a satellite that crosses north goes out at one edge and comes in
  // at the other. It steps with no move transition, so it does not slide across the screen.
  edgeIds: ReadonlySet<number>;
}

const nextTrackedStep = (last: TrackedStep | null, tracked: SatelliteDot[] | null, cloudFactor: number, width: number): TrackedStep => {
  const dots = tracked ?? [];
  const lastX = new Map(last?.tracked?.map((dot) => [dot.id, dot.x]));
  // Item 135: a dot behind a cloud does not show, so it takes no place.
  const visible = dots.map((dot) => ({ ...dot, shown: dot.shown && getStarGapShow(cloudFactor, trackedGap(dot.id)) > 0 }));
  return {
    tracked,
    cloudFactor,
    shownIds: new Set(pickShownSatellites(visible, last?.shownIds ?? new Set()).map((dot) => dot.id)),
    edgeIds: new Set(dots.filter((dot) => Math.abs(dot.x - (lastX.get(dot.id) ?? dot.x)) > width / 2).map((dot) => dot.id)),
  };
};

// A decorative dot takes a double tap as a tracked one: its hit area moves with it. It opens a
// card without a name and gives no badge (Lutz, 2026-10-15). A dot behind a cloud, in the
// twilight fade (`tappable` false) or faded into the Earth's shadow takes no tap.
interface DecorDotProps {
  decor: Decor;
  width: number;
  height: number;
  onDone: (id: number) => void;
  tappable: boolean;
  onTap: (point: { x: number; y: number }, keyboard: boolean) => void;
  ringOn: boolean;
}

const DecorDot: React.FC<DecorDotProps> = ({ decor, width, height, onDone, tappable, onTap, ringOn }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const { x0, y0, x1, y1, durationMs, fadeAt } = decor.path;
  const fadeEnd = Math.min(1, fadeAt + SHADOW_FADE_MS / durationMs);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    const at = (x: number, y: number) => `translate(${(x / 100) * width - HIT_PX / 2}px, ${(y / 100) * height - HIT_PX / 2}px)`;
    const keyframes: Keyframe[] = fadeAt < 1
      ? [
          { offset: 0, transform: at(x0, y0), opacity: 0.8 },
          { offset: fadeAt, opacity: 0.8 },
          { offset: fadeEnd, opacity: 0 },
          { offset: 1, transform: at(x1, y1), opacity: 0 },
        ]
      : [{ transform: at(x0, y0), opacity: 0.8 }, { transform: at(x1, y1), opacity: 0.8 }];
    const animation = el.animate(keyframes, { duration: durationMs, easing: 'linear', fill: 'both' });
    animationRef.current = animation;
    animation.onfinish = () => onDone(decor.id);
    return () => animation.cancel();
    // The size at spawn: a resize does not restart a crossing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decor]);
  const inShadow = () => fadeAt < 1 && Number(animationRef.current?.currentTime ?? 0) >= fadeEnd * durationMs;
  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      onClick={(event) => {
        if (!tappable || inShadow()) return;
        const box = event.currentTarget.getBoundingClientRect();
        onTap({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, event.detail === 0);
      }}
      data-scene-hit
      className={`absolute left-0 top-0 flex items-center justify-center rounded-full touch-manipulation ${tappable ? 'pointer-events-auto' : ''}`}
      style={{ width: HIT_PX, height: HIT_PX }}
      data-testid="satellite-decor-hit"
    >
      <span className="size-0.75 rounded-full bg-white" data-testid="satellite-decor" />
      {ringOn && <span className="absolute inset-2 rounded-full border border-white/70" data-testid="scene-info-ring" />}
    </button>
  );
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
  const cloudFactorRef = useRef(cloudFactor);
  useEffect(() => {
    cloudFactorRef.current = cloudFactor;
  }, [cloudFactor]);
  const nextId = useRef(0);
  useScenePlaybackRate(containerRef, playDirection);
  // Item 162: the cap and the step across the edge come from the last update (state, not a ref,
  // so a second render of the same update gives the same result).
  const [step, setStep] = useState(() => nextTrackedStep(null, tracked, cloudFactor, width));
  if (step.tracked !== tracked || step.cloudFactor !== cloudFactor) setStep(nextTrackedStep(step, tracked, cloudFactor, width));

  // Decorative dots: one after a random gap in `gapMs`, shorter during play (item 83). Also with
  // the tracking on while no tracked satellite shows (none in sunlight, or all behind clouds).
  const trackedShows = !!tracked?.some((dot) => dot.shown && getStarGapShow(cloudFactor, trackedGap(dot.id)) > 0);
  const showDecor = !trackedShows && gapMs !== null && cloudFactor > 0 && !prefersReducedMotion && width > 0;
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
      const dotGap = Math.random();
      // A dot behind the clouds does not come; the next one may cross a gap.
      if (getStarGapShow(cloudFactorRef.current, dotGap) > 0) setDecors((list) => [...list, { id: nextId.current, path, gap: dotGap }]);
      gap = gapMin + Math.random() * (gapMax - gapMin);
      timer = setTimeout(spawn, gap * gapFactor);
    };
    timer = setTimeout(spawn, gap * gapFactor);
    return () => clearTimeout(timer);
  }, [showDecor, gapMin, gapMax, gapFactor]);
  // While a tracked satellite shows, when the night ends or clouds come, no new dot comes, and
  // the ones on the way finish their crossing (at dawn they fade out with the layer).
  if (prefersReducedMotion && decors.length > 0) setDecors([]);
  const removeDecor = React.useCallback((id: number) => setDecors((list) => list.filter((d) => d.id !== id)), []);

  if (!tracked && decors.length === 0) return null;

  const fadeTransition = `opacity ${FADE_OUT_MS}ms ease-out`;
  const transition = prefersReducedMotion || stepMs === 0 ? fadeTransition : `transform ${stepMs}ms linear, ${fadeTransition}`;

  return (
    <div
      ref={containerRef}
      aria-hidden={tracked ? undefined : true}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      data-testid="satellites"
    >
      {decors.length > 0 && (
        // The sun's altitude comes in 30 s steps: a 1 min transition fades the dots smoothly.
        <div className="absolute inset-0" style={{ opacity: twilight, transition: `opacity ${TWILIGHT_TRANSITION_MS}ms linear` }} data-testid="satellite-decor-layer">
          {decors.map((decor) => (
            <div key={decor.id} className="absolute inset-0 transition-opacity duration-2000" style={{ opacity: getStarGapShow(cloudFactor, decor.gap) }}>
              <DecorDot
                decor={decor}
                width={width}
                height={height}
                onDone={removeDecor}
                tappable={twilight > 0 && getStarGapShow(cloudFactor, decor.gap) > 0}
                onTap={(point, keyboard) => tap({ type: 'satelliteDot' }, point, `satellite-dot-${decor.id}`, keyboard)}
                ringOn={infoRing === `satellite-dot-${decor.id}`}
              />
            </div>
          ))}
        </div>
      )}
      {tracked?.map((dot) => {
        const ring = `satellite-${dot.id}`;
        const size = getSatelliteDotPx(dot.magnitude);
        const glow = getSatelliteGlowPx(dot.magnitude);
        // Item 135: clouds hide some satellites; the others shine at full strength in the gaps.
        // Item 162: a dot without a place (the cap) is hidden; it fades in when it gets one.
        const shown = step.shownIds.has(dot.id);
        const opacity = dot.opacity * getStarGapShow(cloudFactor, trackedGap(dot.id));
        return (
          <button
            key={dot.id}
            type="button"
            aria-label={dot.name}
            tabIndex={shown ? 0 : -1}
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              tap({ type: 'satellite', id: dot.id, name: dot.name }, { x: box.left + box.width / 2, y: box.top + box.height / 2 }, ring, event.detail === 0);
            }}
            data-scene-hit
            className={`absolute left-0 top-0 flex items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 touch-manipulation ${shown ? 'pointer-events-auto' : ''}`}
            style={{
              width: HIT_PX,
              height: HIT_PX,
              transform: `translate(${dot.x - HIT_PX / 2}px, ${dot.y - HIT_PX / 2}px)`,
              opacity: shown ? opacity : 0,
              transition: step.edgeIds.has(dot.id) ? fadeTransition : transition,
            }}
            title={t('scene.satellite')}
            data-testid="satellite-tracked"
          >
            <span
              className="rounded-full bg-white"
              style={{ width: size, height: size, boxShadow: glow > 0 ? `0 0 ${glow}px 1px rgb(255 255 255 / 0.6)` : undefined }}
            />
            {(infoRing === ring) && <span className="absolute inset-2 rounded-full border border-white/70" data-testid="scene-info-ring" />}
          </button>
        );
      })}
    </div>
  );
};

export default Satellites;
