import React, { useEffect, useRef, useState } from 'react';
import ScenePlane, { PLANE_ASPECT } from './ScenePlane';
import { HitArea, type SceneInfoHandler } from './CloudLayer';
import { type LivePlanesState } from '@/hooks/useLivePlanes';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type LiveAircraft } from '@/utils/planeFeed';
import {
  LIVE_MAX_AGE_MS, LIVE_POLL_MS, getAircraftView, getAirlineName, getLiveContrail, getLivePlaneScale, pickNearestVisible,
  pickShownPlanes, slantDistanceM, smoothPlaneScale, type Observer, type SkyView,
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
// Item 159 (F3, Z3 and S1 of the plane lookbook): a new plane comes out of a soft haze over 3 s:
// its opacity with a CSS animation (`animate-plane-fade-in`), its blur from 1.4 px to none with
// the 4 Hz clock (an animated blur repaints the plane in every frame: +40 ms/s of paint on the
// throttled phone with 40 compass planes; a blur set 4 times per second, about 1 ms/s). A plane that
// leaves (dropped from the pick, missing from an answer, below 5° or behind the terrain, the
// radar switched off, the stale answer dropped) flies on and fades out over 4 s, takes no tap
// and is not counted, then goes. When the weather closes the sky, the whole layer fades out the
// same way, then goes. The size follows the slant distance, smoothed per plane, as a scale on a
// wrapper, so the memoized body keeps its 18 px and does not render on each tick. With reduced
// motion: no fade and no smoothing.
const TICK_MS = 250;
// Only fading trails, no planes: a slower clock (every 15 s with reduced motion).
const FADE_TICK_MS = 1000;
const STROBE_MS = 2000;
// Item 143: the body turns to a new way over 2 s and rolls between its two views in 2 × 0.75 s.
const TURN_SEC = 2;
const ROLL_SEC = 0.75;
// Item 159: the fades (s), on the smoothstep curve, as the lookbook.
const FADE_IN_SEC = 3;
const FADE_OUT_SEC = 4;
const fadeTransition = (sec: number) => `opacity ${sec}s cubic-bezier(0.33, 0, 0.67, 1)`;
// The haze of a new plane (px of blur), gone at the end of its fade-in on the same curve.
const HAZE_PX = 1.4;
const getHazePx = (ms: number): number => {
  const p = Math.min(1, Math.max(0, ms / (FADE_IN_SEC * 1000)));
  return HAZE_PX * (1 - p * p * (3 - 2 * p));
};

// A plane's silhouette (or lights). Memoized: the 4 Hz tick moves the plane's wrapper, and the
// body renders again only when its look changes.
interface PlaneBodyProps {
  planeWidth: number;
  light?: 'red' | 'green';
  strobeOn?: boolean;
  // Item 143: the body's turn (rad, unwrapped), the side view's left or right, and the view.
  angle: number;
  side: 1 | -1;
  view: LiveView;
  glide: boolean; // false on the plane's first frame and with reduced motion: no transition
  opacity: number;
}
const PlaneBody = React.memo(({
  planeWidth, light, strobeOn, angle, side, view, glide, opacity,
}: PlaneBodyProps) => {
  const height = planeWidth * PLANE_ASPECT;
  // The roll between the two views: the old view goes edge-on (scaleY 0) in 0.75 s, then the new
  // one opens from edge-on in 0.75 s.
  const roll = (shown: boolean) => (glide ? `transform ${ROLL_SEC}s ${shown ? `ease-out ${ROLL_SEC}s` : 'ease-in'}` : 'none');
  const turn = glide ? `transform ${TURN_SEC}s ease-in-out` : 'none';
  return (
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
  );
});
PlaneBody.displayName = 'PlaneBody';

// A plane's tap area, outside the scaled body, so it keeps its size (item 159). Memoized.
interface PlaneHitProps {
  ac: LiveAircraft;
  planeWidth: number;
  ringOn: boolean;
  onInfo: SceneInfoHandler;
}
const PlaneHit = React.memo(({ ac, planeWidth, ringOn, onInfo }: PlaneHitProps) => (
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
    <HitArea cx={0} cy={0} width={planeWidth} height={planeWidth * PLANE_ASPECT} ring={ringOn} />
  </span>
));
PlaneHit.displayName = 'PlaneHit';

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

// An aircraft's place on the screen, its way across the screen and its slant distance.
const getScreenPlace = (
  ac: LiveAircraft, view: SkyView, sec: number, observer: Observer, project: Project, width: number,
) => {
  const p = project(view.elevation, view.azimuth);
  // The way across the screen: where it is 1 s later.
  const next = getAircraftView(observer, ac, sec + 1);
  const q = project(next.elevation, next.azimuth);
  // Across the edge of the 360° view the next point is on the other side: keep the way (dx 0),
  // and start a new trail on the other side (item 142). The speed is the one across the edge, so
  // a shown plane stays picked there (item 159).
  const rawDx = q.x - p.x;
  const edge = Math.abs(rawDx) > width / 2;
  const dx = edge ? 0 : rawDx;
  const dy = q.y - p.y;
  const screenSpeedPxS = Math.hypot(edge ? rawDx - Math.sign(rawDx) * width : rawDx, dy);
  return { ac, view, p, dx, dy, edge, screenSpeedPxS, slantM: slantDistanceM(view, ac.altM, observer.elevationM) };
};

// The visible aircraft, nearest first by slant distance, with their place and their way across
// the screen; then the ones to show (item 110), with the ones shown before (item 159).
const getShown = (
  aircraft: LiveAircraft[], sec: number, observer: Observer, profile: HorizonProfile | null, project: Project,
  width: number, compass: boolean, shownBefore: ReadonlySet<string>,
) => {
  const nearest = pickNearestVisible(
    aircraft.map(ac => ({ ac, view: getAircraftView(observer, ac, sec) })), observer.elevationM, profile,
  ).map(({ ac, view }) => {
    const place = getScreenPlace(ac, view, sec, observer, project, width);
    return { ...place, inView: place.p.x >= -50 && place.p.x <= width + 50 };
  });
  return pickShownPlanes(nearest, compass, shownBefore);
};

// Where a plane's data is from: enough to fly it on after it left the pick or the feed.
interface Flight {
  ac: LiveAircraft;
  lag: number; // s, the answer's age when it came
  receivedAt: number;
}
// Seconds from the data time to `t`: the answer's age when it came (the device clock can differ a
// little from the feed's) plus the time since, never further than the oldest answer the feed
// keeps (a minute). With reduced motion only the answers move the planes.
const flightSec = ({ lag, receivedAt }: Pick<Flight, 'lag' | 'receivedAt'>, t: number, reducedMotion: boolean): number =>
  lag + (reducedMotion ? 0 : Math.min(LIVE_MAX_AGE_MS, Math.max(0, t - receivedAt)) / 1000);

// The layer's memory of one update (a tick or an answer of the feed), by hex.
interface Update {
  key: string;
  state: LivePlanesState | null; // a new answer is a new update, also at the same time
  t: number;
  closedAt: number | null; // when the weather closed the sky (item 159); -Infinity: closed at the start
  shown: Map<string, Flight>;
  leaving: Map<string, Flight & { since: number }>; // fading out since (item 159)
  tilts: Map<string, LiveTilt>; // item 143
  scales: Map<string, number>; // item 159
  firstShown: Map<string, number>; // when each plane came (item 159: its haze)
}
const firstUpdate = (closedAt: number | null): Update => ({
  key: '', state: null, t: 0, closedAt, shown: new Map(), leaving: new Map(), tilts: new Map(), scales: new Map(),
  firstShown: new Map(),
});

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
  // Item 159: false when the weather closes the sky (fog, overcast, rain, a storm): the layer
  // fades out, then goes.
  skyOpen?: boolean;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
  // Item 155: the number of planes drawn, on each change (0 when the layer goes away), for the
  // status line, the Sentry tag and the decorative planes. Keep it stable (a state setter).
  onShownChange?: (count: number) => void;
}

const LivePlanes: React.FC<LivePlanesProps> = ({
  state, observer, project, width, compass, profile, lights, contrail, trailColour, reducedMotion, skyOpen = true, onInfo,
  infoRing = null, onShownChange,
}) => {
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap } = useDoubleTap(onInfo);
  const [now, setNow] = useState(() => Date.now());
  // The last update and the one before it. A second render of the same update (the trail update
  // below, a prop change between two ticks) starts again from the one before, so it gives the
  // same result (items 143 and 159: a ref per hex).
  const memoryRef = useRef<{ before: Update; last: Update } | null>(null);
  // The trails and the clock of their last update (item 142).
  const [trailStore, setTrailStore] = useState<{ key: string; trails: LiveTrail[] }>({ key: '', trails: [] });
  const { trails } = trailStore;

  const receivedAt = state?.receivedAt ?? 0;
  // The planes' time (device clock, ms): the last tick, or the answer when it came after it.
  const t = Math.max(now, receivedAt);
  // One trail update per tick and per answer of the feed.
  const updateKey = `${now}|${receivedAt}`;
  /* eslint-disable react-hooks/refs -- the per-plane memory across the 4 Hz renders (items 143 and 159: a ref per hex) */
  if (!memoryRef.current) {
    const first = firstUpdate(skyOpen ? null : -Infinity);
    memoryRef.current = { before: first, last: first };
  }
  const memory = memoryRef.current;
  const before = memory.last.key === updateKey && memory.last.state === state ? memory.before : memory.last;
  // Item 159: the weather closed the sky. The layer fades out, then goes (at once when the sky was
  // closed from the start).
  const closedAt = skyOpen ? null : (before.closedAt ?? t);
  const gone = closedAt !== null && (reducedMotion || t - closedAt >= FADE_OUT_SEC * 1000);
  const lag = state ? Math.min(30, Math.max(0, (receivedAt - state.feed.now) / 1000)) : 0;
  const shown = state && !gone
    ? getShown(
      state.feed.aircraft, flightSec({ lag, receivedAt }, t, reducedMotion), observer, profile, project, width, compass,
      new Set(before.shown.keys()),
    )
    : [];
  // Item 159: a plane that was shown (or fading out) and is not shown now flies on from its last
  // data and fades out. With reduced motion it goes at once.
  const shownHexes = new Set(shown.map(({ ac }) => ac.hex));
  const leaving = new Map<string, Flight & { since: number }>();
  if (!gone && !reducedMotion) {
    before.shown.forEach((flight, hex) => {
      if (!shownHexes.has(hex)) leaving.set(hex, { ...flight, since: t });
    });
    before.leaving.forEach((flight, hex) => {
      if (!shownHexes.has(hex) && t - flight.since < FADE_OUT_SEC * 1000) leaving.set(hex, flight);
    });
  }
  const leavingPlaces = [...leaving.values()].map(flight => {
    const sec = flightSec(flight, t, false);
    return getScreenPlace(flight.ac, getAircraftView(observer, flight.ac, sec), sec, observer, project, width);
  });
  // Each tilt follows from the plane's last one; each scale from its last one, smoothed (item
  // 159). A plane that is not shown or fading out drops out, so when it shows again it starts
  // fresh: its first tilt with no transition, its scale at once, its haze.
  const tilts = new Map<string, LiveTilt>();
  const scales = new Map<string, number>();
  const firstShown = new Map<string, number>();
  const planes = [...shown, ...leavingPlaces].map(({ ac, view, p, dx, dy, edge, slantM }) => {
    const tilt = getLiveTilt(before.tilts.get(ac.hex), dx, dy);
    const lastScale = before.scales.get(ac.hex);
    const target = getLivePlaneScale(slantM);
    const scale = lastScale === undefined || reducedMotion ? target : smoothPlaneScale(lastScale, target, (t - before.t) / 1000);
    const came = before.firstShown.get(ac.hex) ?? t;
    tilts.set(ac.hex, tilt);
    scales.set(ac.hex, scale);
    firstShown.set(ac.hex, came);
    // No haze on the way out (the lookbook) and with reduced motion.
    const haze = leaving.has(ac.hex) || reducedMotion ? 0 : getHazePx(t - came);
    const kind = getLiveContrail(ac.altM, contrail);
    const look = kind === 'none' ? null : CONTRAIL_LOOK[kind];
    // The trail leaves the plane at its tail as the body is drawn: the engine in the side view,
    // the end of the fuselage from below, turned with the body (item 143), at its drawn size.
    const tail = getTailOffset(tilt, PLANE_WIDTH_PX * scale);
    const trail: TrailPlane | null = look && !edge ? {
      hex: ac.hex, az: view.azimuth, el: view.elevation, ox: tail.x, oy: tail.y,
      lifeMs: Math.min(MAX_TRAIL_SEC, look.lifeSec[0]) * 1000,
      thin: TRAIL_PX * scale,
      spread: look.spread,
    } : null;
    return { ac, view, p, tilt, scale, haze, trail, leaving: leaving.has(ac.hex) };
  })
    // A fixed order: React does not move a plane's element (that would restart its fade).
    .sort((a, b) => (a.ac.hex < b.ac.hex ? -1 : 1));
  memoryRef.current = {
    before,
    last: {
      key: updateKey, state, t, closedAt, leaving, tilts, scales, firstShown,
      shown: new Map(shown.map(({ ac }) => [ac.hex, { ac, lag, receivedAt }])),
    },
  };
  /* eslint-enable react-hooks/refs */

  // The clock: 4 times per second while the radar is on or a plane fades out (with reduced
  // motion, only the feed's answers move the planes); slower while only trails fade; none when
  // nothing shows.
  const tickMs = state || planes.length > 0
    ? (reducedMotion ? 0 : TICK_MS)
    : trails.length > 0 ? (reducedMotion ? LIVE_POLL_MS : FADE_TICK_MS) : 0;
  useEffect(() => {
    if (!tickMs) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  // The planes that fade out are not counted, and none while the sky is closed (item 159).
  const shownCount = skyOpen ? shown.length : 0;
  useEffect(() => {
    onShownChange?.(shownCount);
    return () => onShownChange?.(0);
  }, [shownCount, onShownChange]);
  // React's "state from the previous render": the component renders again at once with the new
  // trails. When the closed sky's fade is over, the trails go too.
  const trailPlanes = planes.flatMap(plane => (plane.trail ? [plane.trail] : []));
  if (gone ? trails.length > 0 : trailStore.key !== updateKey && (trails.length > 0 || trailPlanes.length > 0)) {
    setTrailStore({
      key: updateKey,
      trails: gone ? [] : updateLiveTrails(trails, trailPlanes, t, reducedMotion ? REDUCED_TRAIL_POINT_MS : TRAIL_POINT_MS),
    });
  }

  if (gone || (!state && trails.length === 0 && planes.length === 0)) return null;
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity: skyOpen ? 1 : 0, transition: reducedMotion ? undefined : fadeTransition(skyOpen ? FADE_IN_SEC : FADE_OUT_SEC) }}
      data-testid="live-planes"
    >
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
      {planes.map(({ ac, view, p, tilt, scale, haze, leaving: fading }) => {
        const id = parseInt(ac.hex.replace('~', ''), 16);
        return (
          <div
            key={ac.hex}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`,
              // Item 159: a plane that leaves fades out; one that comes back fades in again.
              opacity: fading ? 0 : 1,
              transition: reducedMotion ? undefined : fadeTransition(fading ? FADE_OUT_SEC : FADE_IN_SEC),
            }}
            data-testid="live-plane"
          >
            {/* Item 159: the fade-in and the haze of a new plane, and the size by the slant distance. */}
            <div
              className={reducedMotion ? 'absolute left-0 top-0' : 'absolute left-0 top-0 animate-plane-fade-in'}
              style={{
                transform: `scale(${scale.toFixed(3)})`,
                transformOrigin: '0 0',
                filter: haze > 0.02 ? `blur(${haze.toFixed(2)}px)` : undefined,
              }}
              data-testid="live-plane-scale"
            >
              <PlaneBody
                planeWidth={PLANE_WIDTH_PX}
                light={lights ? (id % 2 ? 'red' : 'green') : undefined}
                // One flash of a tick every 2 s, each plane at its own moment.
                strobeOn={lights ? (now + (id % 8) * TICK_MS) % STROBE_MS < TICK_MS : undefined}
                angle={tilt.angle}
                side={tilt.side}
                view={tilt.view}
                glide={!tilt.first && !reducedMotion}
                opacity={lights ? 1 : Math.round(50 * (1 - 0.3 * Math.min(1, Math.max(0, (view.distanceM - 20_000) / 80_000)))) / 100}
              />
            </div>
            {onInfo && skyOpen && !fading && (
              <PlaneHit ac={ac} planeWidth={PLANE_WIDTH_PX} ringOn={infoRing === `live-${ac.hex}`} onInfo={tap} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LivePlanes;
