import React, { useEffect, useState } from 'react';
import ScenePlane, { PLANE_ASPECT } from './ScenePlane';
import { HitArea, type SceneInfoHandler } from './CloudLayer';
import { type LivePlanesState } from '@/hooks/useLivePlanes';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type LiveAircraft } from '@/utils/planeFeed';
import {
  LIVE_MAX_AGE_MS, getAircraftView, getAirlineName, getLiveContrail, getLivePlaneWidth, pickNearestVisible, pickShownPlanes,
  type Observer,
} from '@/utils/liveRadar';
import { CONTRAIL_LOOK, TRAIL_PX, PLANE_WIDTH_PX, type ContrailKind } from '@/utils/planes';
import { type HorizonProfile } from '@/utils/horizonUtils';

// The live flight radar (ROADMAP item 96, Premium): the real aircraft within 100 km at their
// direction (x) and elevation angle (y) in the sky, dead-reckoned to the current time.
// A far aircraft moves slowly across the sky (about 0.3°/s: under 1 px/s in the 360° view), so
// the layer moves the planes 4 times per second, in steps of under a pixel, instead of with an
// animation per plane: an animation (also a compositor one) costs about 21 µs of style work
// per plane in each frame on a phone (item 91: 60 planes, +2.5 ms per frame); this costs a
// little React work 4 times per second. SunVisualization draws this layer under the clouds, the
// terrain and the sea, so a plane that flies behind a ridge is hidden on the way.
const TICK_MS = 250;
const STROBE_MS = 2000;
// A trail longer than this (s at the plane's screen speed) is not drawn: a persistent trail
// moves with the plane here, as a long band, and does not stay in the sky (5 min, item 109).
const MAX_TRAIL_SEC = 300;

// A plane's trail, silhouette (or lights) and tap area. Memoized: the 4 Hz tick moves the
// plane's wrapper, and the body renders again only when its look changes.
interface PlaneBodyProps {
  ac: LiveAircraft;
  planeWidth: number;
  light?: 'red' | 'green';
  strobeOn?: boolean;
  flip: boolean;
  opacity: number;
  trailLength: number; // px; 0 = no trail
  trailAngle: number; // rad, the plane's way across the screen
  band: number;
  spread: number;
  trailColour: string;
  ringOn: boolean;
  onInfo?: SceneInfoHandler;
}
const PlaneBody = React.memo(({
  ac, planeWidth, light, strobeOn, flip, opacity, trailLength, trailAngle, band, spread, trailColour, ringOn, onInfo,
}: PlaneBodyProps) => {
  const height = planeWidth * PLANE_ASPECT;
  return (
    <>
      {trailLength > 0 && (
        <div
          className="absolute"
          style={{
            left: -trailLength,
            top: -band / 2,
            width: trailLength,
            height: band,
            transformOrigin: '100% 50%',
            transform: `rotate(${trailAngle}rad)`,
            background: `linear-gradient(to right, transparent, ${trailColour})`,
            clipPath: `polygon(0 0, 100% ${50 - 50 / spread}%, 100% ${50 + 50 / spread}%, 0 100%)`,
          }}
          data-testid="live-plane-trail"
        />
      )}
      <div
        className="absolute"
        style={{
          left: -planeWidth / 2,
          top: -height / 2,
          transform: flip ? 'scaleX(-1)' : undefined, // facing its way across the screen
          opacity,
          color: 'hsl(var(--scene-critter-silhouette))',
        }}
      >
        <ScenePlane width={planeWidth} lights={light} strobeOn={strobeOn} />
      </div>
      {onInfo && (
        <span
          data-scene-hit
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

interface LivePlanesProps {
  state: LivePlanesState;
  observer: Observer;
  // The sky position (degrees) on the screen (px), the same mapping as the sun's (compass
  // mode included), unclamped.
  project: (altitude: number, azimuth: number) => { x: number; y: number };
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
  const { feed, receivedAt } = state;
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap } = useDoubleTap(onInfo);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);
  // Seconds from the data time to now: the answer's age when it came (the device clock can
  // differ a little from the feed's) plus the time since.
  const lag = Math.min(30, Math.max(0, (receivedAt - feed.now) / 1000));
  // Never further than the oldest answer the feed keeps (a minute).
  const sec = lag + (reducedMotion ? 0 : Math.min(LIVE_MAX_AGE_MS, Math.max(0, now - receivedAt)) / 1000);
  // The visible aircraft, nearest first by slant distance, with their place and their way
  // across the screen; then the ones to show (item 110).
  const nearest = pickNearestVisible(
    feed.aircraft.map(ac => ({ ac, view: getAircraftView(observer, ac, sec) })), observer.elevationM, profile,
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
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="live-planes">
      {pickShownPlanes(nearest, compass).map(({ ac, view, p, dx, dy }) => {
        const planeWidth = getLivePlaneWidth(view.distanceM);
        const kind = getLiveContrail(ac.altM, contrail);
        const look = kind === 'none' ? null : CONTRAIL_LOOK[kind];
        const trailLength = look ? Math.hypot(dx, dy) * Math.min(MAX_TRAIL_SEC, look.lifeSec[0]) : 0;
        const band = TRAIL_PX * (planeWidth / PLANE_WIDTH_PX) * (look?.spread ?? 1);
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
              flip={dx < 0}
              opacity={lights ? 1 : Math.round(50 * (1 - 0.3 * Math.min(1, Math.max(0, (view.distanceM - 20_000) / 80_000)))) / 100}
              // Rounded, so the body renders again only when its look changes, not on each tick.
              trailLength={Math.round(trailLength)}
              trailAngle={Math.round(Math.atan2(dy, dx) * 50) / 50}
              band={Math.round(band * 10) / 10}
              spread={look?.spread ?? 1}
              trailColour={trailColour}
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
