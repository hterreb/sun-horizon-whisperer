import React, { useEffect, useRef, useState } from 'react';
import ScenePlane, { PLANE_ASPECT } from './ScenePlane';
import { HitArea, type SceneInfoHandler } from './CloudLayer';
import { type LivePlanesState } from '@/hooks/useLivePlanes';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type LiveAircraft } from '@/utils/planeFeed';
import {
  LIVE_MAX_AGE_MS, LIVE_POLL_MS, getAircraftView, getAirlineName, getLiveContrail, getLivePlaneWidth, pickNearestVisible,
  pickShownPlanes, type Observer,
} from '@/utils/liveRadar';
import {
  MAX_TRAIL_SEC, REDUCED_TRAIL_POINT_MS, TRAIL_POINT_MS, getTrailFadeTime, getTrailPaths, updateLiveTrails,
  type LiveTrail, type SkyPoint, type TrailPlane,
} from '@/utils/liveTrails';
import { CONTRAIL_LOOK, TRAIL_PX, PLANE_WIDTH_PX, type ContrailKind } from '@/utils/planes';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { getLiveTilt, getTailOffset, type LiveTilt, type LiveView } from '@/utils/liveTilt';

// The live flight radar (ROADMAP item 96, Premium): the real aircraft within 100 km at their
// direction (x) and elevation angle (y) in the sky, dead-reckoned to the current time.
// A far aircraft moves slowly across the sky (about 0.3°/s: under 1 px/s in the 360° view), so
// the layer moves the planes 4 times per second, in steps of under a pixel, instead of with an
// animation per plane: an animation (also a compositor one) costs about 21 µs of style work
// per plane in each frame on a phone (item 91: 60 planes, +2.5 ms per frame); this costs a
// little React work 4 times per second. SunVisualization draws this layer under the clouds, the
// terrain and the sea, so a plane that flies behind a ridge is hidden on the way.
// The contrails (item 142) stay in the sky: a trail history per plane in sky points (liveTrails),
// drawn in one SVG under the planes. When a plane leaves (or the radar is switched off), its
// trail stays and fades on its own clock.
const TICK_MS = 250;
// Only fading trails, no planes: a slower clock (every 15 s with reduced motion).
const FADE_TICK_MS = 1000;
const STROBE_MS = 2000;
// Item 143: the body turns to a new way over 2 s and rolls between its two views in 2 × 0.75 s.
const TURN_SEC = 2;
const ROLL_SEC = 0.75;

// A plane's silhouette (or lights) and tap area. Memoized: the 4 Hz tick moves the plane's
// wrapper, and the body renders again only when its look changes.
interface PlaneBodyProps {
  ac: LiveAircraft;
  planeWidth: number;
  light?: 'red' | 'green';
  strobeOn?: boolean;
  // Item 143: the body's turn (rad, unwrapped), the side view's left or right, and the view.
  angle: number;
  side: 1 | -1;
  view: LiveView;
  glide: boolean; // false on the plane's first frame and with reduced motion: no transition
  opacity: number;
  ringOn: boolean;
  onInfo?: SceneInfoHandler;
}
const PlaneBody = React.memo(({
  ac, planeWidth, light, strobeOn, angle, side, view, glide, opacity, ringOn, onInfo,
}: PlaneBodyProps) => {
  const height = planeWidth * PLANE_ASPECT;
  // The roll between the two views: the old view goes edge-on (scaleY 0) in 0.75 s, then the new
  // one opens from edge-on in 0.75 s.
  const roll = (shown: boolean) => (glide ? `transform ${ROLL_SEC}s ${shown ? `ease-out ${ROLL_SEC}s` : 'ease-in'}` : 'none');
  const turn = glide ? `transform ${TURN_SEC}s ease-in-out` : 'none';
  return (
    <>
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `rotate(${angle}rad)`, // its way across the screen
          transition: turn,
          opacity,
          color: 'hsl(var(--scene-critter-silhouette))',
        }}
        data-testid="live-plane-body"
      >
        <div
          className="absolute"
          style={{ left: -planeWidth / 2, top: -height / 2, transform: `scaleY(${view === 'side' ? 1 : 0})`, transition: roll(view === 'side') }}
          data-testid="live-plane-side"
        >
          {/* Moving left: mirrored, so the fin stays up. A change rolls over in 2 s. */}
          <div style={{ transform: `scaleY(${side})`, transition: turn }}>
            <ScenePlane width={planeWidth} lights={light} strobeOn={strobeOn} />
          </div>
        </div>
        <div
          className="absolute"
          style={{ left: -planeWidth / 2, top: -planeWidth / 2, transform: `scaleY(${view === 'under' ? 1 : 0})`, transition: roll(view === 'under') }}
          data-testid="live-plane-under"
        >
          <ScenePlane width={planeWidth} lights={light} strobeOn={strobeOn} view="under" />
        </div>
      </div>
      {onInfo && (
        <span
          data-scene-hit
          data-plane-hit
          className="absolute pointer-events-auto cursor-pointer touch-manipulation"
          style={{ left: 0, top: 0 }}
          aria-hidden
          onClick={event => onInfo({
            type: 'livePlane', callsign: ac.callsign, airline: getAirlineName(ac.callsign), aircraftType: ac.type,
            altM: ac.altM, speedKt: ac.speedKt,
          }, { x: event.clientX, y: event.clientY }, `live-${ac.hex}`)}
        >
          <HitArea cx={0} cy={0} width={planeWidth} height={height} ring={ringOn} />
        </span>
      )}
    </>
  );
});
PlaneBody.displayName = 'PlaneBody';

type Project = (altitude: number, azimuth: number) => { x: number; y: number };

// The stored points of a trail. Memoized: it renders again when a point comes or goes, at a
// step of its fade clock, or when the projection changes (a compass turn, a new screen size),
// not on each tick.
interface TrailBodyProps {
  points: SkyPoint[];
  t: number;
  lifeMs: number;
  thin: number;
  spread: number;
  project: Project;
  width: number;
}
const TrailBody = React.memo(({ points, t, lifeMs, thin, spread, project, width }: TrailBodyProps) => (
  <>
    {getTrailPaths(points, t, { lifeMs, thin, spread }, project, width).map(path => (
      <path key={path.step} d={path.d} strokeOpacity={path.opacity} strokeWidth={path.width} />
    ))}
  </>
));
TrailBody.displayName = 'TrailBody';

// The visible aircraft, nearest first by slant distance, with their place and their way across
// the screen; then the ones to show (item 110).
const getShown = (
  aircraft: LiveAircraft[], sec: number, observer: Observer, profile: HorizonProfile | null, project: Project,
  width: number, compass: boolean,
) => {
  const nearest = pickNearestVisible(
    aircraft.map(ac => ({ ac, view: getAircraftView(observer, ac, sec) })), observer.elevationM, profile,
  ).map(({ ac, view }) => {
    const p = project(view.elevation, view.azimuth);
    // The way across the screen: where it is 1 s later.
    const next = getAircraftView(observer, ac, sec + 1);
    const q = project(next.elevation, next.azimuth);
    // Across the edge of the 360° view the next point is on the other side: keep the way.
    const dx = Math.abs(q.x - p.x) > width / 2 ? 0 : q.x - p.x;
    const dy = q.y - p.y;
    return { ac, view, p, dx, dy, inView: p.x >= -50 && p.x <= width + 50, screenSpeedPxS: Math.hypot(dx, dy) };
  });
  return pickShownPlanes(nearest, compass);
};

interface LivePlanesProps {
  state: LivePlanesState | null; // null: the radar is off, only the trails that still fade show
  observer: Observer;
  // The sky position (degrees) on the screen (px), the same mapping as the sun's (compass
  // mode included), unclamped.
  project: Project;
  width: number;
  compass: boolean; // compass mode: every plane in the field of view, else the 2 nearest that move
  profile: HorizonProfile | null;
  lights: boolean; // night: only the lights show
  contrail: ContrailKind; // the forecast's contrail, for the aircraft above 8 km
  trailColour: string;
  reducedMotion: boolean; // the planes move only with each answer of the feed
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
}

const LivePlanes: React.FC<LivePlanesProps> = ({
  state, observer, project, width, compass, profile, lights, contrail, trailColour, reducedMotion, onInfo, infoRing = null,
}) => {
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap } = useDoubleTap(onInfo);
  const [now, setNow] = useState(() => Date.now());
  // Item 143: each shown plane's last tilt (turn, side, view), by hex, and the update it is from.
  const tiltsRef = useRef({ key: '', tilts: new Map<string, LiveTilt>() });
  // The trails and the clock of their last update (item 142).
  const [trailStore, setTrailStore] = useState<{ key: string; trails: LiveTrail[] }>({ key: '', trails: [] });
  const { trails } = trailStore;
  // The clock: 4 times per second while the radar is on (with reduced motion, only the feed's
  // answers move the planes); slower while only trails fade; none when nothing shows.
  const tickMs = state
    ? (reducedMotion ? 0 : TICK_MS)
    : trails.length > 0 ? (reducedMotion ? LIVE_POLL_MS : FADE_TICK_MS) : 0;
  useEffect(() => {
    if (!tickMs) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  const receivedAt = state?.receivedAt ?? 0;
  // The planes' time (device clock, ms): the last tick, or the answer when it came after it.
  const t = Math.max(now, receivedAt);
  // One trail update per tick and per answer of the feed.
  const updateKey = `${now}|${receivedAt}`;
  let shown: ReturnType<typeof getShown> = [];
  if (state) {
    const { feed } = state;
    // Seconds from the data time to now: the answer's age when it came (the device clock can
    // differ a little from the feed's) plus the time since.
    const lag = Math.min(30, Math.max(0, (receivedAt - feed.now) / 1000));
    // Never further than the oldest answer the feed keeps (a minute).
    const sec = lag + (reducedMotion ? 0 : Math.min(LIVE_MAX_AGE_MS, Math.max(0, now - receivedAt)) / 1000);
    shown = getShown(feed.aircraft, sec, observer, profile, project, width, compass);
  }
  // Each tilt follows from the plane's last one (getLiveTilt is pure, so a second render with the
  // same step gives the same tilt). A plane that is not shown drops out, so when it shows again
  // it starts fresh, with no transition. A plane's first frame stays first in all renders of its
  // first update (also the extra render of the trail update below).
  /* eslint-disable react-hooks/refs -- the per-plane memory across the 4 Hz renders (item 143 spec: a ref per hex) */
  const lastTilts = tiltsRef.current;
  const tilts = new Map(shown.map(({ ac, dx, dy }) => {
    const prev = lastTilts.tilts.get(ac.hex);
    const tilt = getLiveTilt(prev, dx, dy);
    return [ac.hex, prev?.first && lastTilts.key === updateKey ? { ...tilt, first: true } : tilt];
  }));
  tiltsRef.current = { key: updateKey, tilts };
  /* eslint-enable react-hooks/refs */
  const planes = shown.map(({ ac, view, p }) => {
    const planeWidth = getLivePlaneWidth(view.distanceM);
    const tilt = tilts.get(ac.hex)!;
    const kind = getLiveContrail(ac.altM, contrail);
    const look = kind === 'none' ? null : CONTRAIL_LOOK[kind];
    // The trail leaves the plane at its tail as the body is drawn: the engine in the side view,
    // the end of the fuselage from below, turned with the body (item 143).
    const tail = getTailOffset(tilt, planeWidth);
    const trail: TrailPlane | null = look && {
      hex: ac.hex, az: view.azimuth, el: view.elevation, ox: tail.x, oy: tail.y,
      lifeMs: Math.min(MAX_TRAIL_SEC, look.lifeSec[0]) * 1000,
      thin: TRAIL_PX * (planeWidth / PLANE_WIDTH_PX),
      spread: look.spread,
    };
    return { ac, view, p, tilt, planeWidth, trail };
  });
  // React's "state from the previous render": the component renders again at once with the new
  // trails.
  const trailPlanes = planes.flatMap(plane => (plane.trail ? [plane.trail] : []));
  if (trailStore.key !== updateKey && (trails.length > 0 || trailPlanes.length > 0)) {
    setTrailStore({
      key: updateKey,
      trails: updateLiveTrails(trails, trailPlanes, t, reducedMotion ? REDUCED_TRAIL_POINT_MS : TRAIL_POINT_MS),
    });
  }

  if (!state && trails.length === 0) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="live-planes">
      {trails.length > 0 && (
        // All trails in one SVG under the planes: per trail its stored part and the segment to
        // its head (the plane's tail while it shows).
        <svg className="absolute inset-0 h-full w-full" fill="none" strokeLinejoin="round" aria-hidden data-testid="live-trails">
          {trails.map(trail => {
            const fadeT = getTrailFadeTime(t, trail.lifeMs, TICK_MS);
            const last = trail.points[trail.points.length - 1];
            return (
              <g key={trail.key} stroke={trailColour} data-testid="live-plane-trail">
                <TrailBody
                  points={trail.points}
                  t={fadeT}
                  lifeMs={trail.lifeMs}
                  thin={trail.thin}
                  spread={trail.spread}
                  project={project}
                  width={width}
                />
                {getTrailPaths([last, trail.head], fadeT, trail, project, width).map(path => (
                  <path key={`head-${path.step}`} d={path.d} strokeOpacity={path.opacity} strokeWidth={path.width} />
                ))}
              </g>
            );
          })}
        </svg>
      )}
      {planes.map(({ ac, view, p, tilt, planeWidth }) => {
        const id = parseInt(ac.hex.replace('~', ''), 16);
        return (
          <div
            key={ac.hex}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)` }}
            data-testid="live-plane"
          >
            <PlaneBody
              ac={ac}
              planeWidth={planeWidth}
              light={lights ? (id % 2 ? 'red' : 'green') : undefined}
              // One flash of a tick every 2 s, each plane at its own moment.
              strobeOn={lights ? (now + (id % 8) * TICK_MS) % STROBE_MS < TICK_MS : undefined}
              angle={tilt.angle}
              side={tilt.side}
              view={tilt.view}
              glide={!tilt.first && !reducedMotion}
              opacity={lights ? 1 : Math.round(50 * (1 - 0.3 * Math.min(1, Math.max(0, (view.distanceM - 20_000) / 80_000)))) / 100}
              ringOn={infoRing === `live-${ac.hex}`}
              onInfo={onInfo && tap}
            />
          </div>
        );
      })}
    </div>
  );
};

export default LivePlanes;
