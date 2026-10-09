import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Sun, ChevronLeft, ChevronRight, Sunrise, Sunset, ArrowUp, Mountain, BellOff } from 'lucide-react';
import { type SunPosition, type SunTimes, type TimeOfDay, formatTime, getBackgroundGradient, getWaterColors, getReflectionFade } from '../utils/sunUtils';
import { type MoonPosition, getMoonPhasePath } from '../utils/moonUtils';
import { getSunArcLabels, getMoonArcLabels, getTerrainArcLabels, getTerrainMoonArcLabels, type ArcLabels, type ArcLabelPoint } from '../utils/arcLabels';
import { shortestHeadingDelta } from '../utils/compassUtils';
import { type HorizonProfile, horizonAngleAt } from '../utils/horizonUtils';
import CloudLayer, { type SceneInfoHandler, type WeatherType } from './CloudLayer';
import Fireworks from './Fireworks';
import SunSunglasses from './SunSunglasses';
import CalendarEggs from './CalendarEggs';
import { type CalendarEvent } from '@/utils/calendarEvents';
import PremiumBadge from './PremiumBadge';
import WeatherEffects from './WeatherEffects';
import SolarEclipse from '@/components/SolarEclipse';
import GreenFlash from '@/components/GreenFlash';
import MoonTint from '@/components/MoonTint';
import { type AstroEvent } from '@/utils/astroEvents';
import { getSunVisibility, getMoonCloudFactor, getMoonLook, getStarCloudFactor } from '@/utils/weatherEffectsUtils';
import { getSeaWindKmh, getReflectionBars } from '@/utils/waveUtils';
import { getCloudDriftDirection } from '@/utils/cloudLayoutUtils';
import { type CloudLayers } from '@/utils/skyCloudUtils';
import SeaCanvas from '@/components/SeaCanvas';
import { getRainMmH, getRainMistOpacity } from '@/utils/rainUtils';
import { useLanguage } from '@/hooks/useLanguage';
import { formatNumber, type MessageKey } from '@/i18n';
import { type Language } from '@/utils/language';
import { PLAY_TICK_MS, type PlayDirection } from '@/utils/timeTravel';
import Satellites, { type SatelliteDot } from './Satellites';
import { ISS_NORAD_ID, getDotGapMs, getTwilightFade, isSatelliteWeather, type SkySatellite } from '@/utils/satelliteUtils';
import { getTrailColour, isPlaneWeather, showsPlaneLights, type ContrailKind } from '@/utils/planes';
import LivePlanes from './LivePlanes';
import { type RarityTier } from '@/utils/rarityTier';
import { type LivePlanesState } from '@/hooks/useLivePlanes';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// A fixed fallback seed date for callers that don't pass one (e.g. existing tests) -
// a stable constant, not `new Date()`, so it never changes identity across renders.
const DEFAULT_SEED_DATE = new Date(0);

interface SunVisualizationProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  // The sun's and moon's altitude/azimuth sampled across the current pass (see
  // sunUtils.getSunPathAround / moonUtils.getMoonPathAround), used to draw their arcs
  // across the sky (ROADMAP item 17).
  sunPath: SunPosition[];
  moonPath: MoonPosition[];
  timeOfDay: TimeOfDay;
  // The sky gradient after the weather mix (SunTracker, ROADMAP item 50). The water
  // takes its colours from it (item 53). Defaults to the plain time-of-day gradient.
  skyGradient?: string;
  weatherType: WeatherType;
  latitude: number;
  // Longitude, current date, and live cloud_cover/wind/temperature (ROADMAP item 10):
  // longitude+date seed the cloud layout, the rest drive cloud drift and the weather
  // illustrations (fog/lightning/heat shimmer/rainbow/leaves). All optional/nullable so
  // existing callers/tests that only pass the original props still work.
  longitude?: number;
  date?: Date;
  temperatureC?: number | null;
  cloudCoverPercent?: number | null;
  windSpeedKmh?: number | null;
  windDirectionDeg?: number | null;
  // The forecast rain amount in mm/h (ROADMAP item 77); null: the type's middle value.
  rainMmH?: number | null;
  // The current hour's cover per layer (ROADMAP item 84, C1); null: the weather type's own.
  cloudLayers?: CloudLayers | null;
  // The planes' contrails from the forecast's upper air (ROADMAP item 96).
  contrail?: ContrailKind;
  // The live radar's feed while it is on (ROADMAP item 96, Premium); null: the decorative planes.
  livePlanes?: LivePlanesState | null;
  // A rare lenticular or mammatus day (ROADMAP item 84, X1).
  cloudEgg?: boolean;
  // The day's sun times: the scene's busy and quiet phases follow them (ROADMAP item 93, S3).
  sunTimes?: SunTimes | null;
  // Live compass mode (ROADMAP item 19): the current (smoothed) device heading, or
  // null/undefined for the static 360°-across-the-screen mode. When set, azimuths are
  // mapped through a real field of view centered on this heading (getCompassScreenFraction)
  // instead of the full-circle static mapping, and out-of-view elements are hidden.
  compassHeading?: number | null;
  // The current location's terrain silhouette (ROADMAP item 13), or null while the
  // feature is disabled/loading/unavailable - null draws the flat horizon only, same
  // as before the feature existed.
  horizonProfile?: HorizonProfile | null;
  // Line-of-sight sunrise/sunset from SunTracker (terrainExtras.terrainSunTimes), drawn as
  // extra sun-arc labels where the arc meets the ridge (ROADMAP item 42). Null = none.
  terrainSunTimes?: { sunrise: Date | null; sunset: Date | null } | null;
  // Line-of-sight moonrise/moonset (terrainExtras.terrainMoonTimes), the same on the moon
  // arc (ROADMAP item 63). Null = none.
  terrainMoonTimes?: { rise: Date | null; set: Date | null } | null;
  // Sunset countdown (ROADMAP item 43): the seconds left, shown in the altitude pill.
  sunsetCountdown?: { seconds: number; lineOfSight: boolean } | null;
  // Set while the countdown sound is off (item 108): the pill shows a muted bell and a
  // tap on it turns the sound on.
  onCountdownSoundOn?: () => void;
  // Fade the cardinal labels out together with the top-left buttons while idle in
  // fullscreen (ROADMAP item 29); both default to their non-fullscreen values so
  // existing callers/tests that don't pass them keep the labels always visible.
  isFullscreen?: boolean;
  showCursor?: boolean;
  // Start time (ms) of the sunrise/sunset fireworks show from SunTracker; 0 = none (ROADMAP item 41).
  fireworksTrigger?: number;
  // The astronomy easter egg from SunTracker (astroEvents.getAstroEvent), or null.
  astroEvent?: AstroEvent | null;
  // Hidden sunglasses egg: the sun wears sunglasses; tapping the sun reports each tap to SunTracker.
  sunglasses?: boolean;
  onSunTap?: () => void;
  // Hidden disco egg: tapping the moon reports each tap to SunTracker.
  onMoonTap?: () => void;
  // Info cards (ROADMAP item 95): a tap on anything in the scene, and the ring id of the open card.
  onSceneInfo?: SceneInfoHandler;
  infoRing?: string | null;
  // Item 107: the rarity tier of the open card, for the ring's colour; null: the neutral ring.
  infoRingTier?: RarityTier | null;
  // Today's calendar easter egg from SunTracker (utils/calendarEvents), or null.
  calendarEvent?: CalendarEvent | null;
  // Time-travel play from SunTracker (ROADMAP item 83): the scene follows it.
  playDirection?: PlayDirection;
  // Satellite tracking (ROADMAP item 97): the tracked satellites in the sky, or null for
  // the free decorative dots.
  satellites?: SkySatellite[] | null;
}

// Maps an azimuth (0-360°, 0 = North) to a horizontal screen fraction (0-1), for the
// static (non-compass) 360°-across-the-screen mode.
// North hemisphere: sun/moon culminate at 180° (South), which already sits at the
// center of a linear 0->left/360->right mapping, so no shift is needed.
// South hemisphere: culmination is at 0°/360° (North), which would otherwise land on
// the screen edge and jump edge-to-edge at noon. Shifting by 180° before mapping
// centers the culmination instead.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getAzimuthScreenFraction = (azimuth: number, latitude: number): number => {
  const hemisphereShifted = latitude < 0 ? (azimuth + 180) % 360 : azimuth;
  return ((hemisphereShifted % 360) + 360) % 360 / 360;
};

// Compass mode's field of view in degrees (ROADMAP item 19): how much of the horizon
// maps onto the screen width, centered on the current device heading. Named/exported
// so it's easy to tune from real-device testing.
export const COMPASS_FOV_DEG = 90;

export interface CompassScreenFraction {
  fraction: number; // 0.5 = screen center (the heading); continues outside [0, 1] when not visible
  visible: boolean;
}

// Maps an azimuth to a horizontal screen fraction under compass mode's field-of-view:
// screen center is the current heading, +-fov/2 either side. No hemisphere shift and
// no wrap - `shortestHeadingDelta` already gives the signed short way from the heading
// to the azimuth, so there's no 0°/360° jump (ROADMAP item 19).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getCompassScreenFraction = (
  azimuth: number,
  heading: number,
  fov = COMPASS_FOV_DEG
): CompassScreenFraction => {
  const delta = shortestHeadingDelta(heading, azimuth);
  return { fraction: 0.5 + delta / fov, visible: Math.abs(delta) <= fov / 2 };
};

// Resolves an azimuth to a screen fraction under whichever mode is active: the static
// full-circle mapping (compassHeading null/undefined, always visible) or the compass
// field-of-view mapping (ROADMAP item 19). Shared by every azimuth consumer below -
// sun/moon dots, both arcs, cardinal labels, and the rainbow.
const resolveAzimuth = (
  azimuth: number,
  latitude: number,
  compassHeading?: number | null
): CompassScreenFraction =>
  compassHeading === null || compassHeading === undefined
    ? { fraction: getAzimuthScreenFraction(azimuth, latitude), visible: true }
    : getCompassScreenFraction(azimuth, compassHeading);

// The inverse of resolveAzimuth (ROADMAP item 95): the azimuth at a screen fraction, for a
// tap on the terrain.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getAzimuthAtFraction = (fraction: number, latitude: number, compassHeading?: number | null): number => {
  const azimuth = compassHeading === null || compassHeading === undefined
    ? fraction * 360 + (latitude < 0 ? 180 : 0)
    : compassHeading + (fraction - 0.5) * COMPASS_FOV_DEG;
  return ((azimuth % 360) + 360) % 360;
};

// The tapped point of a click (ROADMAP item 95); a keyboard click has none, so the centre of
// the element.
const tapPoint = (event: React.MouseEvent<Element>): { x: number; y: number } => {
  if (event.detail > 0) return { x: event.clientX, y: event.clientY };
  const box = event.currentTarget.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

// The 8 cardinal/intercardinal directions shown as static horizon labels (ROADMAP
// item 8), always in clockwise order from North.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const CARDINAL_DIRECTIONS = [
  { label: 'N', azimuth: 0 },
  { label: 'NE', azimuth: 45 },
  { label: 'E', azimuth: 90 },
  { label: 'SE', azimuth: 135 },
  { label: 'S', azimuth: 180 },
  { label: 'SW', azimuth: 225 },
  { label: 'W', azimuth: 270 },
  { label: 'NW', azimuth: 315 },
] as const;

// The shown label in the UI language (ROADMAP item 67), e.g. "NO" for NE in German.
const DIRECTION_LABELS: Record<string, MessageKey> = {
  N: 'direction.n', NE: 'direction.ne', E: 'direction.e', SE: 'direction.se',
  S: 'direction.s', SW: 'direction.sw', W: 'direction.w', NW: 'direction.nw',
};

// Screen fraction for each cardinal label, using the same azimuth->x mapping as the
// sun/moon, so labels stay correct in both hemispheres and pan together with the
// scene. In compass mode, a label outside the field of view is dropped instead of
// being clamped to the edge (ROADMAP item 19); the finite-fraction guard still covers
// a non-finite result (e.g. NaN input).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getVisibleCardinalLabels = (
  latitude: number,
  compassHeading?: number | null
): Array<{ label: string; azimuth: number; fraction: number }> =>
  CARDINAL_DIRECTIONS
    .map((direction) => {
      const { fraction, visible } = resolveAzimuth(direction.azimuth, latitude, compassHeading);
      return { ...direction, fraction, visible };
    })
    .filter((direction) => Number.isFinite(direction.fraction) && direction.visible);

export type ArcLabelKind = 'rise' | 'zenith' | 'set';

export interface ArcLabelGeometry {
  kind: ArcLabelKind;
  time: Date;
  fraction: number; // screen x fraction, same azimuth mapping as everything else
  // The altitude to plot the label at: forced to 0 for rise/set (they sit on the
  // horizon, not at the sun/moon's own altitude at that SunCalc time, which is a
  // fraction of a degree off zero) and the true zenith altitude for the apex label.
  altitude: number;
}

// Resolves an arcLabels.ts result (rise/zenith/set) to on-screen label geometry, the
// same way getVisibleCardinalLabels resolves the 8 cardinal directions: dropped when
// outside the compass field of view (ROADMAP item 19) instead of clamped to the edge.
// `onHorizon = false` keeps the true rise/set altitude, for the line-of-sight labels that
// sit on the ridge, not on the flat horizon (ROADMAP item 42).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getArcLabelGeometry = (
  labels: ArcLabels,
  latitude: number,
  compassHeading?: number | null,
  onHorizon = true
): ArcLabelGeometry[] =>
  (
    [
      { kind: 'rise', point: labels.rise, altitude: onHorizon ? 0 : labels.rise?.altitude ?? 0 },
      { kind: 'zenith', point: labels.zenith, altitude: labels.zenith?.altitude ?? 0 },
      { kind: 'set', point: labels.set, altitude: onHorizon ? 0 : labels.set?.altitude ?? 0 },
    ] as { kind: ArcLabelKind; point: ArcLabelPoint | null; altitude: number }[]
  )
    .filter((entry): entry is { kind: ArcLabelKind; point: ArcLabelPoint; altitude: number } => entry.point !== null)
    .map((entry) => {
      const { fraction, visible } = resolveAzimuth(entry.point.azimuth, latitude, compassHeading);
      return { kind: entry.kind, time: entry.point.time, fraction, altitude: entry.altitude, visible };
    })
    .filter((entry) => Number.isFinite(entry.fraction) && entry.visible);

export interface RainbowGeometry {
  visible: boolean;
  xFraction: number; // 0-1 screen fraction of the arc's apex, same mapping as the sun/moon
  apexHeightDeg: number; // 0-42, how high the arc's apex sits
}

// Rainbow geometry (ROADMAP item 10): visible while it's raining/drizzling and the sun
// sits low (0-42° altitude), opposite the sun's azimuth - using the same azimuth->x
// mapping as the sun/moon, so it pans together with them and hides outside the
// compass field of view (ROADMAP item 19).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getRainbowGeometry = (
  isRainingOrDrizzling: boolean,
  sunAltitude: number,
  sunAzimuth: number,
  latitude: number,
  compassHeading?: number | null
): RainbowGeometry => {
  const inRange = isRainingOrDrizzling && sunAltitude > 0 && sunAltitude < 42;
  if (!inRange) return { visible: false, xFraction: 0, apexHeightDeg: 0 };

  const oppositeAzimuth = (sunAzimuth + 180) % 360;
  const { fraction, visible } = resolveAzimuth(oppositeAzimuth, latitude, compassHeading);
  if (!visible) return { visible: false, xFraction: 0, apexHeightDeg: 0 };

  return { visible: true, xFraction: fraction, apexHeightDeg: 42 - sunAltitude };
};

// True when the sun's altitude crosses the horizon (0°) between two samples, i.e. it
// was on one side and is now on the other. A rounded `altitude === 0.0` check can miss
// the crossing entirely if the 30s sample lands slightly off zero either side.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const crossesHorizon = (prevAltitude: number, currentAltitude: number): boolean =>
  (prevAltitude < 0) !== (currentAltitude < 0);

// The altitude->y part of the mapping, shared by the clamped (dot) and unclamped
// (arc) screen positions below.
const altitudeToY = (altitude: number, height: number): number => {
  const horizonY = height * 0.65;
  const altitudeRadians = altitude * (Math.PI / 180);
  const maxAltitudeHeight = horizonY - 30;
  return horizonY - Math.sin(altitudeRadians) * maxAltitudeHeight;
};

// Maps a sky position (altitude/azimuth, in degrees) to screen x/y for the given
// container size and latitude, clamped to the screen edges - used for the sun and
// moon's current-position dots only (ROADMAP item 17 keeps arcs unclamped, see
// getArcScreenPosition below). Also reports FOV visibility (ROADMAP item 19): a dot
// outside the compass field of view should be hidden, not clamped to the edge.
const getScreenPosition = (
  altitude: number,
  azimuth: number,
  width: number,
  height: number,
  latitude: number,
  compassHeading?: number | null
): { x: number; y: number; visible: boolean } => {
  if (width === 0 || height === 0) return { x: 0, y: 0, visible: true };

  const { fraction, visible } = resolveAzimuth(azimuth, latitude, compassHeading);
  const x = width * fraction;
  const y = altitudeToY(altitude, height);

  return {
    x: Math.max(30, Math.min(width - 30, x)),
    y: Math.max(30, Math.min(height - 30, y)),
    visible
  };
};

// Same mapping as getScreenPosition, but unclamped (arc points run off-screen
// cleanly, ROADMAP item 17) and returns null for a point outside the compass field of
// view instead of a position (ROADMAP item 19) - buildArcPath treats that the same as
// a below-horizon point (pen up).
const getArcScreenPosition = (
  altitude: number,
  azimuth: number,
  width: number,
  height: number,
  latitude: number,
  compassHeading?: number | null
): { x: number; y: number } | null => {
  if (width === 0 || height === 0) return null;

  const { fraction, visible } = resolveAzimuth(azimuth, latitude, compassHeading);
  if (!visible) return null;

  return { x: width * fraction, y: altitudeToY(altitude, height) };
};

type SkyPoint = { altitude: number; azimuth: number };

// The shortest signed delta from one azimuth to another, taking the wrap at 0°/360°
// into account (e.g. 350° -> 10° is +20°, not -340°). Used by horizonCrossingPoint below
// so the interpolated azimuth takes the short way around (ROADMAP item 26).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const shortestAzimuthDelta = (from: number, to: number): number => {
  const delta = ((to - from) % 360 + 540) % 360 - 180;
  return delta;
};

// The point where the sun/moon's path crosses the horizon (altitude 0) between two
// samples `a` and `b` that are on different sides of it, by linear interpolation of
// altitude and azimuth (ROADMAP item 26) - so the arc always reaches the flat horizon
// line exactly, instead of stopping at the last/first sample still above/below it (up
// to half a sampling step away, a visible gap at coarse sampling).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const horizonCrossingPoint = (a: SkyPoint, b: SkyPoint): SkyPoint => {
  const t = a.altitude / (a.altitude - b.altitude);
  const azimuth = ((a.azimuth + shortestAzimuthDelta(a.azimuth, b.azimuth) * t) % 360 + 360) % 360;
  return { altitude: 0, azimuth };
};

// SVG path through the above-horizon, in-view points only; a gap (below the horizon,
// outside the compass field of view, or a wrap in `toXY`'s screen x) starts a new
// segment instead of drawing a line across the screen (ROADMAP item 17). Where two
// neighbor samples straddle the horizon, an interpolated altitude-0 point is drawn
// first, so the arc starts/ends exactly on the flat horizon line (ROADMAP item 26).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const buildArcPath = (
  points: SkyPoint[],
  toXY: (p: SkyPoint) => { x: number; y: number } | null,
  width = Infinity
): string => {
  let path = '';
  let penDown = false;
  let prevX: number | null = null;
  let prevPoint: SkyPoint | null = null;

  const plot = (point: SkyPoint): void => {
    const xy = toXY(point);
    if (xy === null) {
      penDown = false;
      prevX = null;
      return;
    }
    const { x, y } = xy;
    if (penDown && prevX !== null && Math.abs(x - prevX) > width / 2) {
      // The x jumped by more than half the width: an azimuth wrap (0°/360°, or the
      // FOV edge), not a real sweep across the screen - start a new segment.
      penDown = false;
    }
    path += `${penDown ? 'L' : 'M'}${x},${y} `;
    penDown = true;
    prevX = x;
  };

  for (const point of points) {
    if (prevPoint !== null && crossesHorizon(prevPoint.altitude, point.altitude)) {
      plot(horizonCrossingPoint(prevPoint, point));
    }
    if (point.altitude < 0) {
      penDown = false;
      prevX = null;
    } else {
      plot(point);
    }
    prevPoint = point;
  }
  return path.trim();
};

// The azimuths to sample for the terrain silhouette (ROADMAP item 13): the full
// circle in static mode, or just the visible field-of-view range in compass mode -
// sampled in left-to-right screen order so no extra wrap handling is needed for that
// case (getCompassScreenFraction has no 0°/360° jump within one FOV span).
const getTerrainAzimuths = (compassHeading: number | null): number[] => {
  if (compassHeading === null) {
    return Array.from({ length: 360 }, (_, i) => i);
  }
  const half = COMPASS_FOV_DEG / 2;
  const start = compassHeading - half;
  return Array.from({ length: COMPASS_FOV_DEG + 1 }, (_, i) => (((start + i) % 360) + 360) % 360);
};

// Builds the terrain silhouette as one or more contiguous point runs (screen x/y),
// splitting into a new run wherever a point is outside the compass field of view or
// the azimuth->x mapping wraps (same idea as buildArcPath's gap detection, ROADMAP
// item 17/13) - static mode's southern-hemisphere shift can otherwise jump straight
// across the screen at the 0°/360° seam. Angles below 0 (a valley dipping under the
// flat horizon) clamp to 0, i.e. the flat horizon line itself.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const buildTerrainSegments = (
  profile: HorizonProfile,
  width: number,
  height: number,
  latitude: number,
  compassHeading: number | null
): { x: number; y: number }[][] => {
  if (width === 0 || height === 0) return [];

  const azimuths = getTerrainAzimuths(compassHeading);
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  let prevX: number | null = null;

  for (const azimuth of azimuths) {
    const { fraction, visible } = resolveAzimuth(azimuth, latitude, compassHeading);
    if (!visible) {
      if (current.length > 1) segments.push(current);
      current = [];
      prevX = null;
      continue;
    }

    const x = width * fraction;
    if (prevX !== null && Math.abs(x - prevX) > width / 2) {
      if (current.length > 1) segments.push(current);
      current = [];
    }

    const angle = Math.max(0, horizonAngleAt(profile, azimuth));
    current.push({ x, y: altitudeToY(angle, height) });
    prevX = x;
  }
  if (current.length > 1) segments.push(current);

  return segments;
};

// Fills each silhouette run from the ridge line down to the flat horizon y, so the
// terrain reads as solid ground rather than just an outline.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const buildTerrainFillPath = (
  segments: { x: number; y: number }[][],
  horizonY: number
): string =>
  segments
    .map((segment) => {
      const first = segment[0];
      const last = segment[segment.length - 1];
      const ridge = segment.map((p) => `L${p.x},${p.y}`).join(' ');
      return `M${first.x},${horizonY} ${ridge} L${last.x},${horizonY} Z`;
    })
    .join(' ');

// Approximate arc-label pill footprint in px, used both for the edge nudge and the
// sun/moon label collision check below.
const ARC_LABEL_HALF_WIDTH = 32;
const ARC_LABEL_HEIGHT = 22;
// Half the widest cardinal pill ("NW"), so a label at the 0°/360° edge stays whole (AUDIT A-8).
const CARDINAL_LABEL_HALF_WIDTH = 18;
const COLLAPSED_PANEL_HEIGHT = 112;

// The collapsed InfoPanel's box (InfoPanel.tsx root classes): top-right, 300 px wide or
// the screen minus 2rem, 10rem lower below 364 px width. Height measured at 390x844
// (ROADMAP item 38). ponytail: fixed numbers, not a DOM measurement - update them when
// the panel header changes; measure the panel element if it starts to move.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getCollapsedPanelBox = (width: number) => {
  const top = width < 364 ? 160 : 0;
  return { left: width - Math.min(300, width - 32), top, bottom: top + COLLAPSED_PANEL_HEIGHT };
};

// Moves an arc label that the collapsed panel would cover to just below the panel
// (AUDIT C-15). Not hidden: the label keeps its x.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const avoidCollapsedPanel = <T extends { x: number; y: number }>(label: T, width: number): T => {
  const box = getCollapsedPanelBox(width);
  const covered =
    label.x + ARC_LABEL_HALF_WIDTH > box.left &&
    label.y + ARC_LABEL_HEIGHT / 2 > box.top &&
    label.y - ARC_LABEL_HEIGHT / 2 < box.bottom;
  return covered ? { ...label, y: box.bottom + ARC_LABEL_HEIGHT / 2 + 4 } : label;
};

// Sun altitude pill text (ROADMAP item 48): a value that rounds to 0 reads "0.0°", never "-0.0°".
// The number is in the format of the UI language (ROADMAP item 67), e.g. "+12,3°".
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const formatSunAltitude = (altitude: number, language: Language = 'en'): string => {
  const rounded = Math.round(altitude * 10) / 10;
  const text = formatNumber(language, Math.abs(rounded), 1);
  if (rounded === 0) return `${text}°`;
  return rounded > 0 ? `+${text}°` : `-${text}°`;
};

const ARC_LABEL_ICONS: Record<ArcLabelKind, typeof Sunrise> = {
  rise: Sunrise,
  zenith: ArrowUp,
  set: Sunset,
};

const SunVisualization: React.FC<SunVisualizationProps> = ({
  sunPosition,
  moonPosition,
  sunPath,
  moonPath,
  timeOfDay,
  skyGradient = getBackgroundGradient(timeOfDay),
  weatherType,
  latitude,
  longitude = 0,
  date = DEFAULT_SEED_DATE,
  temperatureC = null,
  cloudCoverPercent = null,
  windSpeedKmh = null,
  windDirectionDeg = null,
  rainMmH = null,
  cloudLayers = null,
  contrail = 'none',
  livePlanes = null,
  cloudEgg = false,
  sunTimes = null,
  compassHeading = null,
  horizonProfile = null,
  terrainSunTimes = null,
  terrainMoonTimes = null,
  sunsetCountdown = null,
  onCountdownSoundOn,
  isFullscreen = false,
  showCursor = true,
  fireworksTrigger = 0,
  astroEvent = null,
  sunglasses = false,
  onSunTap,
  onMoonTap,
  onSceneInfo,
  infoRing = null,
  infoRingTier = null,
  calendarEvent = null,
  playDirection = 0,
  satellites = null
}) => {
  const { t, language } = useLanguage();
  // Compass mode (ROADMAP item 19): a real field of view centered on the heading,
  // replacing the static full-circle mapping - also turns off the CSS transitions
  // below (the heading's own low-pass filter already smooths the motion).
  const compassActive = compassHeading !== null;
  // Cardinal labels fade out together with the top-left buttons while idle in
  // fullscreen (ROADMAP item 29), but stay visible in compass mode, where they're
  // needed to aim the phone.
  const cardinalLabelsVisible = compassActive || !isFullscreen || showCursor;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // The horizon path is fully derived from `containerDimensions` (deterministic, no
  // randomness), so it's computed during render instead of synced into state. The top
  // edge alone carries the storm foam line (ROADMAP item 79, X3).
  const seaEdgePath = useMemo(() => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0) return '';

    const horizonY = height * 0.65;

    let path = `M0,${horizonY} `;

    const waveCount = Math.ceil(width / 80);
    const waveWidth = width / waveCount;

    for (let i = 0; i < waveCount; i++) {
      const x1 = i * waveWidth;
      const x2 = (i + 0.5) * waveWidth;
      const x3 = (i + 1) * waveWidth;

      const waveHeight = Math.sin(i * 0.5) * 8 + 4;
      const y1 = horizonY;
      const y2 = horizonY - waveHeight;
      const y3 = horizonY;

      path += `L${x1},${y1} Q${x2},${y2} ${x3},${y3} `;
    }

    path += `L${width},${horizonY} `;
    return path;
  }, [containerDimensions]);
  const svgPath = seaEdgePath && `${seaEdgePath}L${containerDimensions.width},${containerDimensions.height} L0,${containerDimensions.height} Z`;

  // Terrain silhouette (ROADMAP item 13): replaces the flat horizon line with the
  // real profile when one is loaded, using the same altitude->y mapping as the sun/
  // moon dots and the same azimuth->x mapping (static full circle or compass FOV).
  const terrainFillPath = useMemo(() => {
    const { width, height } = containerDimensions;
    if (!horizonProfile || width === 0 || height === 0) return '';

    const horizonY = height * 0.65;
    const segments = buildTerrainSegments(horizonProfile, width, height, latitude, compassHeading);
    return buildTerrainFillPath(segments, horizonY);
  }, [horizonProfile, containerDimensions, latitude, compassHeading]);

  // Info cards (item 95): the terrain's card for the azimuth at screen x (px in the container).
  const openTerrainInfo = (x: number, point: { x: number; y: number }) => {
    const { width } = containerDimensions;
    if (width === 0) return;
    onSceneInfo?.({ type: 'terrain', azimuth: getAzimuthAtFraction(x / width, latitude, compassHeading) }, point, 'terrain');
  };
  const handleTerrainTap = (event: React.MouseEvent<SVGPathElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    openTerrainInfo(event.clientX - (box?.left ?? 0), { x: event.clientX, y: event.clientY });
  };
  const handleTerrainKey = (event: React.KeyboardEvent<SVGPathElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const { width, height } = containerDimensions;
    if (!horizonProfile || width === 0) return;
    const ridge = buildTerrainSegments(horizonProfile, width, height, latitude, compassHeading)
      .flat()
      .reduce<{ x: number; y: number } | null>((top, p) => (!top || p.y < top.y ? p : top), null);
    if (!ridge) return;
    const box = containerRef.current?.getBoundingClientRect();
    openTerrainInfo(ridge.x, { x: (box?.left ?? 0) + ridge.x, y: (box?.top ?? 0) + ridge.y });
  };

  const getSunPosition = () =>
    getScreenPosition(sunPosition.altitude, sunPosition.azimuth, containerDimensions.width, containerDimensions.height, latitude, compassHeading);

  const getMoonPosition = () =>
    getScreenPosition(moonPosition.altitude, moonPosition.azimuth, containerDimensions.width, containerDimensions.height, latitude, compassHeading);

  const { x: sunX, y: sunY, visible: sunDotVisible } = getSunPosition();
  const { x: moonX, y: moonY, visible: moonDotVisible } = getMoonPosition();

  // Whether each body is up at all, on altitude/weather/time-of-day grounds alone -
  // independent of the compass field of view, so the off-FOV hint below can tell "it's
  // up, just off to one side" apart from "it's not up right now" (ROADMAP item 19).
  const sunVisibility = getSunVisibility(weatherType); // clouds dim the sun (ROADMAP item 50)
  const sunShines = sunVisibility.disc >= 0.5; // the faint overcast disc (item 72) gets no yellow glow and no glints
  const sunAltitudeVisible = sunPosition.altitude > -18 && sunVisibility.halo > 0;
  const moonAltitudeVisible = moonPosition.visible && (
    timeOfDay === 'night' ||
    timeOfDay === 'astronomical-twilight' ||
    timeOfDay === 'nautical-twilight'
  );

  const isSunVisible = sunAltitudeVisible && sunDotVisible;
  const isMoonVisible = moonAltitudeVisible && moonDotVisible;
  const moonCloudFactor = getMoonCloudFactor(weatherType, cloudCoverPercent); // clouds hide the moon (ROADMAP item 57)
  // ...but the disc and its corona keep it findable (item 76); the reflection and the pool keep the factor above.
  const moonLook = getMoonLook(weatherType, cloudCoverPercent);
  const moonBright = moonPosition.illumination * 0.8 + 0.2;
  const isMoonDiscShown = isMoonVisible && moonLook.disc > 0;
  // The pool of moonlight for the night fish (ROADMAP item 65, NR3): as bright as the moon
  // is full, dimmed by clouds, and fading as the moon sets, like its reflection bars.
  const nightWater = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const moonPool = nightWater && isMoonVisible && weatherType !== 'storm'
    ? moonPosition.illumination * moonCloudFactor * getReflectionFade(moonPosition.altitude)
    : 0;

  // The sun's and moon's arcs for their current pass (above-horizon, in-FOV points
  // only): same screen mapping as their current-position dots, just unclamped and
  // applied to every sampled point (ROADMAP item 17). The sun arc is a stronger, warm
  // token color; the moon's is paler, and only drawn while the moon is actually shown
  // (it used to also draw during the day, when the moon isn't shown at all).
  const sunArcPath = useMemo(() => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0 || sunPath.length === 0) return '';

    return buildArcPath(
      sunPath,
      (p) => getArcScreenPosition(p.altitude, p.azimuth, width, height, latitude, compassHeading),
      width
    );
  }, [sunPath, containerDimensions, latitude, compassHeading]);

  const moonArcPath = useMemo(() => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0 || moonPath.length === 0 || !moonAltitudeVisible) return '';

    return buildArcPath(
      moonPath,
      (p) => getArcScreenPosition(p.altitude, p.azimuth, width, height, latitude, compassHeading),
      width
    );
  }, [moonPath, containerDimensions, latitude, compassHeading, moonAltitudeVisible]);

  // Rise/zenith/set arc labels: pure time/position math lives in arcLabels.ts, recomputed
  // straight from `date`/lat/lon (sunPath/moonPath carry no timestamps to search - see
  // arcLabels.ts's own comment) so the labels always match the panel's own times.
  // Keyed on the minute: `date` ticks every second, the labels only change by the minute.
  const arcLabelMinuteKey = Math.floor(date.getTime() / 60_000);
  const sunArcLabels = useMemo(
    () => getSunArcLabels(date, latitude, longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on arcLabelMinuteKey, not `date` itself
    [arcLabelMinuteKey, latitude, longitude]
  );
  const moonArcLabels = useMemo(
    () => getMoonArcLabels(date, latitude, longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on arcLabelMinuteKey, not `date` itself
    [arcLabelMinuteKey, latitude, longitude]
  );

  const sunArcLabelGeometry = useMemo(
    () => getArcLabelGeometry(sunArcLabels, latitude, compassHeading),
    [sunArcLabels, latitude, compassHeading]
  );
  // Line-of-sight rise/set labels (ROADMAP item 42): only with line of sight on and a
  // ready profile; a null terrain time gives no label.
  const terrainArcLabelGeometry = useMemo(
    () =>
      horizonProfile && terrainSunTimes
        ? getArcLabelGeometry(getTerrainArcLabels(terrainSunTimes, latitude, longitude), latitude, compassHeading, false)
        : [],
    [horizonProfile, terrainSunTimes, latitude, longitude, compassHeading]
  );
  // Only while the moon arc is actually drawn (moonArcPath's own gate above), not just
  // while getMoonArcLabels happens to find a pass.
  const moonArcLabelGeometry = useMemo(
    () => (moonArcPath ? getArcLabelGeometry(moonArcLabels, latitude, compassHeading) : []),
    [moonArcPath, moonArcLabels, latitude, compassHeading]
  );
  // Line-of-sight moonrise/moonset labels (ROADMAP item 63): the sun's rules, and only
  // while the moon arc is drawn.
  const moonTerrainArcLabelGeometry = useMemo(
    () =>
      horizonProfile && terrainMoonTimes && moonArcPath
        ? getArcLabelGeometry(getTerrainMoonArcLabels(terrainMoonTimes, latitude, longitude), latitude, compassHeading, false)
        : [],
    [horizonProfile, terrainMoonTimes, moonArcPath, latitude, longitude, compassHeading]
  );

  const getSunColor = () => {
    if (sunPosition.altitude > 10) {
      return 'text-yellow-300';
    } else if (sunPosition.altitude > 0) {
      return 'text-orange-400';
    } else {
      return 'text-amber-600';
    }
  };

  // Sun glow color, by altitude band (ROADMAP item 15 D polish: the style book's
  // soft glowing sun) - the same 3 tokens/bands as getGlowIntensity below, also used
  // for the radial halo behind the sun icon.
  const getSunGlowToken = (): string | null => {
    if (sunPosition.altitude > 10) return '--scene-sun-glow-high';
    if (sunPosition.altitude > 0) return '--scene-sun-glow-low';
    if (sunPosition.altitude > -10) return '--scene-sun-glow-horizon';
    return null;
  };

  const getGlowIntensity = () => {
    // Reduce glow intensity for grey/wet weather - fog scatters it the most, snow
    // the least (ROADMAP item 10).
    const baseGlow = weatherType === 'storm' || weatherType === 'rain' || weatherType === 'hail' ? 0.3 :
                     weatherType === 'fog' ? 0.25 :
                     weatherType === 'drizzle' || weatherType === 'overcast' ? 0.5 :
                     weatherType === 'snow' ? 0.5 : 1;

    if (sunPosition.altitude > 10) {
      return `drop-shadow-[0_0_15px_hsl(var(--scene-sun-glow-high)_/_${0.8 * baseGlow})]`;
    } else if (sunPosition.altitude > 0) {
      return `drop-shadow-[0_0_10px_hsl(var(--scene-sun-glow-low)_/_${0.6 * baseGlow})]`;
    } else if (sunPosition.altitude > -10) {
      return `drop-shadow-[0_0_5px_hsl(var(--scene-sun-glow-horizon)_/_${0.4 * baseGlow})]`;
    }
    return '';
  };

  // The water follows the sky (ROADMAP item 53); a storm darkens it (item 51).
  const water = getWaterColors(skyGradient, weatherType === 'storm');
  // Waves by wind strength (ROADMAP item 79): a storm is at least the strong band.
  const seaWindKmh = getSeaWindKmh(windSpeedKmh, weatherType);
  const seaIsDark = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const seaIsGolden = timeOfDay === 'dawn' || timeOfDay === 'evening' || timeOfDay === 'civil-twilight';
  const rainAmount = getRainMmH(weatherType, rainMmH);

  // Line-of-sight ridge (terrain-silhouette) color, the style book's "soft ridge"
  // per time-of-day bucket (ROADMAP item 15 deliverable 2), drawn semi-transparent
  // (see fillOpacity below) so it reads as distance rather than a flat cutout.
  const getRidgeColor = () => {
    if (timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight') {
      return 'hsl(var(--scene-ridge-night))';
    }
    if (timeOfDay === 'midday' || timeOfDay === 'afternoon') {
      return 'hsl(var(--scene-ridge-day))';
    }
    return 'hsl(var(--scene-ridge-golden))'; // civil-twilight/dawn/morning/evening
  };

  const moonRadius = (18 + moonPosition.illumination * 6) * (astroEvent?.kind === 'supermoon' ? 1.14 : 1); // same footprint as the old 36 + illumination*12 diameter
  const moonPhasePath = useMemo(
    () => getMoonPhasePath(moonPosition.illumination, moonPosition.phase, latitude, moonRadius),
    [moonPosition.illumination, moonPosition.phase, latitude, moonRadius]
  );

  // Cardinal direction labels (ROADMAP item 8): always on, panning together with the
  // sun/moon and hidden outside the field of view in compass mode (ROADMAP item 19).
  const cardinalLabels = useMemo(
    () => getVisibleCardinalLabels(latitude, compassHeading),
    [latitude, compassHeading]
  );
  const horizonLabelY = containerDimensions.height * 0.65;

  // Arc label pixel positions: rise/set sit just above the horizon at their endpoint x,
  // zenith just below the apex - nudged inward (half a label width) so they stay on
  // screen. Collision rule: when a sun and a moon label would overlap, shift the moon
  // label up by one label height - a simple bounding-box check, not a general layout
  // solver (both arcs only ever carry 3 labels each).
  const toArcLabelPosition = (geometry: ArcLabelGeometry) => {
    const { width, height } = containerDimensions;
    const x = Math.max(ARC_LABEL_HALF_WIDTH, Math.min(width - ARC_LABEL_HALF_WIDTH, geometry.fraction * width));
    // Zenith sits just BELOW the apex, inside the arc: above it, the collapsed InfoPanel
    // covers it on phones, where the apex is near the top of the screen.
    // Rise/set sit just above their point: the flat horizon (altitude 0), or the ridge
    // for a line-of-sight label (ROADMAP item 42).
    const y = geometry.kind === 'zenith'
      ? altitudeToY(geometry.altitude, height) + ARC_LABEL_HEIGHT
      : altitudeToY(geometry.altitude, height) - ARC_LABEL_HEIGHT;
    return { kind: geometry.kind, time: geometry.time, x, y };
  };

  const labelsOverlap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < ARC_LABEL_HALF_WIDTH * 2 && Math.abs(a.y - b.y) < ARC_LABEL_HEIGHT;
  const terrainArcLabelPositions = terrainArcLabelGeometry
    .map(toArcLabelPosition)
    .map((label) => avoidCollapsedPanel(label, containerDimensions.width));
  // A flat rise/set label that overlaps the terrain label of the same kind, or shows the
  // same minute (a flat coast), gives way to the terrain label (ROADMAP items 42, 63).
  const notCoveredBy = (terrainLabels: ReturnType<typeof toArcLabelPosition>[]) =>
    (label: ReturnType<typeof toArcLabelPosition>) => !terrainLabels.some(
      (terrain) =>
        terrain.kind === label.kind &&
        (labelsOverlap(terrain, label) || formatTime(terrain.time) === formatTime(label.time))
    );
  const sunArcLabelPositions = sunArcLabelGeometry
    .map(toArcLabelPosition)
    .map((label) => avoidCollapsedPanel(label, containerDimensions.width))
    .filter(notCoveredBy(terrainArcLabelPositions));
  // A moon label that overlaps a sun label steps up until it is clear (ponytail: max 3
  // steps, it then stays overlapped rather than float off the arc).
  const offSunLabels = (moonLabel: ReturnType<typeof toArcLabelPosition>) => {
    const sunLabels = [...sunArcLabelPositions, ...terrainArcLabelPositions];
    let shifted = moonLabel;
    for (let step = 0; step < 3 && sunLabels.some((sunLabel) => labelsOverlap(sunLabel, shifted)); step++) {
      shifted = { ...shifted, y: shifted.y - ARC_LABEL_HEIGHT };
    }
    return avoidCollapsedPanel(shifted, containerDimensions.width);
  };
  const moonTerrainArcLabelPositions = moonTerrainArcLabelGeometry.map(toArcLabelPosition).map(offSunLabels);
  const moonArcLabelPositions = moonArcLabelGeometry
    .map(toArcLabelPosition)
    .map(offSunLabels)
    .filter(notCoveredBy(moonTerrainArcLabelPositions));

  // Rainbow (ROADMAP item 10): raining/drizzling, opposite the sun's azimuth, using the
  // same azimuth->x mapping as the sun/moon.
  const rainbowGeometry = useMemo(
    () => getRainbowGeometry(
      weatherType === 'rain' || weatherType === 'drizzle',
      sunPosition.altitude,
      sunPosition.azimuth,
      latitude,
      compassHeading
    ),
    [weatherType, sunPosition.altitude, sunPosition.azimuth, latitude, compassHeading]
  );

  // Off-screen hint (ROADMAP item 19): in compass mode, when the body currently shown
  // (the moon by night, else the sun) sits outside the field of view, point an arrow
  // the short way toward it instead of leaving the screen empty.
  const offFovHintSide = useMemo((): 'left' | 'right' | null => {
    if (!compassActive) return null;
    const usingMoon = moonAltitudeVisible;
    if (!usingMoon && !sunAltitudeVisible) return null;

    const azimuth = usingMoon ? moonPosition.azimuth : sunPosition.azimuth;
    const { fraction, visible } = getCompassScreenFraction(azimuth, compassHeading as number);
    if (visible) return null;
    return fraction > 0.5 ? 'right' : 'left';
  }, [compassActive, moonAltitudeVisible, sunAltitudeVisible, moonPosition.azimuth, sunPosition.azimuth, compassHeading]);

  // The live radar (item 96): the aircraft at their direction and elevation angle, with the
  // sun's mapping (compass mode included). None where the sky is hidden, as the decorative ones.
  const prefersReducedMotion = usePrefersReducedMotion();
  const { width: sceneWidth, height: sceneHeight } = containerDimensions;
  const projectSky = useMemo(() => (altitude: number, azimuth: number) => ({
    x: sceneWidth * resolveAzimuth(azimuth, latitude, compassHeading).fraction,
    y: altitudeToY(altitude, sceneHeight),
  }), [sceneWidth, sceneHeight, latitude, compassHeading]);
  const showLivePlanes = !!livePlanes && sceneWidth > 0 && isPlaneWeather(weatherType);

  // Satellites (ROADMAP item 97): azimuth -> x and elevation -> y as for the sun and moon
  // (compass field of view included); a tracked satellite behind the terrain is hidden.
  const satelliteDots = useMemo((): SatelliteDot[] | null => {
    if (!satellites) return null;
    const { width, height } = containerDimensions;
    return satellites.flatMap((sat) => {
      const point = getArcScreenPosition(sat.elevation, sat.azimuth, width, height, latitude, compassHeading);
      if (!point) return [];
      const behindTerrain = !!horizonProfile && sat.elevation <= horizonAngleAt(horizonProfile, sat.azimuth);
      return [{ id: sat.id, name: sat.name, x: point.x, y: point.y, opacity: sat.opacity, shown: sat.visible && !behindTerrain, iss: sat.id === ISS_NORAD_ID }];
    });
  }, [satellites, containerDimensions, latitude, compassHeading, horizonProfile]);

  return (
    <div ref={containerRef} className="w-full h-dvh relative overflow-hidden pointer-events-none" data-testid="sun-visualization">
      <Satellites
        width={containerDimensions.width}
        height={containerDimensions.height}
        tracked={satelliteDots}
        gapMs={isSatelliteWeather(weatherType) ? getDotGapMs(date, sunPosition.altitude, sunTimes) : null}
        cloudFactor={getStarCloudFactor(weatherType, cloudCoverPercent)}
        twilight={getTwilightFade(sunPosition.altitude)}
        stepMs={compassActive ? 0 : playDirection !== 0 ? PLAY_TICK_MS : 1000}
        playDirection={playDirection}
        onInfo={onSceneInfo}
        infoRing={infoRing}
      />
      {showLivePlanes && (
        <LivePlanes
          state={livePlanes}
          observer={{
            lat: latitude,
            lon: longitude,
            elevationM: (horizonProfile?.observerElevation ?? 0) + (horizonProfile?.eyeHeight ?? 1.7),
          }}
          project={projectSky}
          width={sceneWidth}
          compass={compassActive}
          profile={horizonProfile}
          lights={showsPlaneLights(timeOfDay)}
          contrail={contrail}
          trailColour={getTrailColour(weatherType, Math.round(sunPosition.altitude * 2) / 2)}
          reducedMotion={prefersReducedMotion}
          onInfo={onSceneInfo}
          infoRing={infoRing}
        />
      )}
      <CloudLayer
        livePlanes={!!livePlanes}
        timeOfDay={timeOfDay}
        weatherType={weatherType}
        date={date}
        latitude={latitude}
        longitude={longitude}
        cloudLayers={cloudLayers}
        contrail={contrail}
        windSpeedKmh={windSpeedKmh}
        windDirectionDeg={windDirectionDeg}
        rainMmH={rainMmH}
        isFullscreen={isFullscreen}
        moonlight={{ x: containerDimensions.width > 0 ? moonX / containerDimensions.width : 0.5, strength: moonPool }}
        moon={isMoonVisible && (moonLook.disc > 0 || moonLook.corona > 0) && containerDimensions.height > 0
          ? { x: (moonX / containerDimensions.width) * 100, y: (moonY / containerDimensions.height) * 100, r: moonRadius, light: moonBright }
          : null}
        playDirection={playDirection}
        sun={containerDimensions.height > 0
          ? { x: (sunX / containerDimensions.width) * 100, y: (sunY / containerDimensions.height) * 100, altitude: sunPosition.altitude }
          : null}
        skyGradient={skyGradient}
        cloudEgg={cloudEgg}
        sunTimes={sunTimes}
        onInfo={onSceneInfo}
        infoRing={infoRing}
        infoRingTier={infoRingTier}
      />
      <WeatherEffects
        weatherType={weatherType}
        timeOfDay={timeOfDay}
        temperatureC={temperatureC}
        windSpeedKmh={windSpeedKmh}
        sunAltitude={sunPosition.altitude}
        rainbow={rainbowGeometry}
        containerWidth={containerDimensions.width}
        containerHeight={containerDimensions.height}
      />
      <Fireworks trigger={fireworksTrigger} />

      {(sunArcPath || moonArcPath) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {sunArcPath && (
            <path
              d={sunArcPath}
              fill="none"
              stroke="hsl(var(--brand-sunset))"
              strokeOpacity={0.45}
              strokeWidth={2}
            />
          )}
          {moonArcPath && (
            <path
              d={moonArcPath}
              fill="none"
              stroke="hsl(var(--scene-moon))"
              strokeOpacity={0.25}
              strokeWidth={1.5}
            />
          )}
        </svg>
      )}

      {isSunVisible && getSunGlowToken() && (
        // Soft glowing sun (ROADMAP item 15 D polish): a radial halo behind the sun
        // icon, colored by the same altitude band as getGlowIntensity's drop-shadow.
        <div
          aria-hidden="true"
          className={`absolute rounded-full pointer-events-none ${compassActive ? '' : 'transition-transform duration-1000'}`}
          style={{
            left: `${sunX}px`,
            top: `${sunY}px`,
            width: (sunPosition.altitude > 0 ? 200 : 160) * sunVisibility.haloScale,
            height: (sunPosition.altitude > 0 ? 200 : 160) * sunVisibility.haloScale,
            transform: 'translate(-50%, -50%)',
            opacity: sunVisibility.halo,
            // Faint or no disc (overcast, fog, rain): a white light patch, not a yellow glow on grey.
            background: `radial-gradient(circle, hsl(var(${sunShines ? getSunGlowToken() : '--scene-glow-white'}) / 0.55) 0%, transparent 70%)`
          }}
        />
      )}

      {isSunVisible && sunVisibility.disc > 0 && (
        // The line sun with rays (item 46's filled disc was rolled back to it on request).
        // A button, so the sun is a tap target for the sunglasses egg (ROADMAP "Ongoing — Easter eggs").
        <button
          type="button"
          aria-label={t('scene.sun')}
          // Each tap counts for the sunglasses egg; the first one also opens the sun's card (item 95).
          onClick={event => {
            onSunTap?.();
            onSceneInfo?.({ type: 'sun' }, tapPoint(event), 'sun');
          }}
          data-testid="sun-dot"
          className={`absolute rounded-full pointer-events-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 ${compassActive ? '' : 'transition-transform duration-1000'} ${getSunColor()} ${getGlowIntensity()} animate-glow`}
          style={{
            left: `${sunX}px`,
            top: `${sunY}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Drizzle, snow and overcast: the line colour mixes toward the overcast grey (ROADMAP
              items 59, 72). `currentColor` here is the band colour the wrapper sets. No blur: it
              would wash out the 1 px lines. The cloud opacity sits here, not on the button:
              animate-glow animates the button's opacity and would override it. */}
          <Sun
            size={sunPosition.altitude > 0 ? 96 : 80}
            strokeWidth={1}
            style={{
              opacity: sunVisibility.disc,
              ...(sunVisibility.pale > 0 && { color: `color-mix(in srgb, currentColor, hsl(var(--scene-sky-overcast)) ${sunVisibility.pale * 100}%)` }),
            }}
          />
          {sunglasses && <SunSunglasses />}
        </button>
      )}

      {isSunVisible && sunVisibility.disc > 0 && astroEvent?.kind === 'solarEclipse' && (
        <SolarEclipse x={sunX} y={sunY} strength={astroEvent.strength} radius={sunPosition.altitude > 0 ? 16 : 13} />
      )}
      {astroEvent?.kind === 'greenFlash' && sunDotVisible && containerDimensions.height > 0 && (
        <GreenFlash x={sunX} y={Math.min(sunY, containerDimensions.height * 0.65)} />
      )}

      {offFovHintSide && (
        <div
          className="absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-panel-background border border-panel-border text-white/90 pointer-events-none"
          style={offFovHintSide === 'left' ? { left: '0.75rem' } : { right: '0.75rem' }}
          aria-hidden="true"
          data-testid="compass-off-fov-hint"
        >
          {offFovHintSide === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      )}

      {isMoonVisible && moonLook.corona > 0 && (
        // MV4 (item 76): a soft glow in the moon's colour where it sits behind clouds or fog.
        <div
          className={`absolute pointer-events-none rounded-full ${compassActive ? '' : 'transition-all duration-1000'}`}
          style={{
            left: `${moonX}px`,
            top: `${moonY}px`,
            width: moonRadius * moonLook.coronaRadius * 2,
            height: moonRadius * moonLook.coronaRadius * 2,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle closest-side, hsl(var(--scene-moon) / ${0.32 * moonLook.corona * moonBright}) 0%, hsl(var(--scene-moon) / ${0.13 * moonLook.corona * moonBright}) 40%, transparent 100%)`,
          }}
          data-testid="moon-corona"
        />
      )}

      {isMoonDiscShown && (
        // A button for the moon's info card (ROADMAP item 95), at least 44 px wide.
        // Each tap also counts for the disco egg (ROADMAP "Ongoing — Easter eggs").
        <button
          type="button"
          aria-label={t('scene.moon')}
          onClick={event => {
            onMoonTap?.();
            onSceneInfo?.({ type: 'moon' }, tapPoint(event), 'moon');
          }}
          className={`absolute flex min-h-11 min-w-11 items-center justify-center rounded-full pointer-events-auto focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 ${compassActive ? '' : 'transition-all duration-1000'}`}
          style={{
            left: `${moonX}px`,
            top: `${moonY}px`,
            transform: 'translate(-50%, -50%)',
            opacity: moonBright * moonLook.disc,
            filter: `drop-shadow(0 0 ${moonPosition.illumination * 15}px hsl(var(--scene-glow-white) / 0.4))`
          }}
          data-testid="moon-disc"
        >
          <svg
            width={moonRadius * 2}
            height={moonRadius * 2}
            viewBox={`${-moonRadius} ${-moonRadius} ${moonRadius * 2} ${moonRadius * 2}`}
          >
            <circle cx={0} cy={0} r={moonRadius - 0.5} fill="hsl(var(--scene-moon-dark))" stroke="hsl(var(--scene-moon))" strokeOpacity={0.3} />
            <path d={moonPhasePath} fill="hsl(var(--scene-moon))" />
            {(astroEvent?.kind === 'lunarEclipse' || astroEvent?.kind === 'blueMoon') && (
              <MoonTint kind={astroEvent.kind} strength={astroEvent.strength} radius={moonRadius - 0.5} />
            )}
          </svg>
        </button>
      )}

      <CalendarEggs
        event={calendarEvent}
        timeOfDay={timeOfDay}
        weatherType={weatherType}
        moon={isMoonDiscShown ? { x: moonX, y: moonY, r: moonRadius } : null}
        horizonY={containerDimensions.height * 0.65}
        onInfo={onSceneInfo}
        infoRing={infoRing}
        infoRingTier={infoRingTier}
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          {/* Water gradient: both stops come from the sky gradient (ROADMAP item 53). */}
          <linearGradient id="horizonGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={water.surface} />
            <stop offset="100%" stopColor={water.deep} />
          </linearGradient>
        </defs>
        {terrainFillPath && (
          // Line-of-sight ridge (ROADMAP item 13), colored per time-of-day like the
          // style book's soft ridge (ROADMAP item 15 deliverable 2). Opaque: at .85 the
          // stars and a sun behind the ridge showed through. Drawn *before*
          // the sea (ROADMAP item 27), so the sea's wave crests sit on top of the
          // ridge's base instead of being covered by it.
          // A button for the terrain's info card (item 95): a tap reads the azimuth under it; the
          // keyboard picks the highest ridge on screen.
          <path
            d={terrainFillPath}
            fill={getRidgeColor()}
            role="button"
            tabIndex={0}
            aria-label={t('scene.terrain')}
            className="pointer-events-auto cursor-pointer focus-visible:outline-2 focus-visible:outline-white/70"
            onClick={handleTerrainTap}
            onKeyDown={handleTerrainKey}
            data-testid="terrain-silhouette"
          />
        )}
        <path
          d={svgPath}
          // No outline (ROADMAP item 32): the item-27 wave-crest stroke is gone; the
          // dark-navy night sea already reads apart from the ridge and sky.
          fill="url(#horizonGradient)"
          className="transition-all duration-1000"
          data-testid="sea"
        />
      </svg>

      <SeaCanvas
        width={containerDimensions.width}
        height={containerDimensions.height}
        seaPath={svgPath}
        seaEdgePath={seaEdgePath}
        ridgePath={terrainFillPath}
        ridgeColor={getRidgeColor()}
        skyColor={water.sky}
        crestColor={seaIsDark ? 'hsl(var(--scene-moon))' : 'hsl(var(--scene-glow-white))'}
        troughColor={water.deep}
        gain={seaIsDark ? 0.6 : seaIsGolden ? 0.9 : 1}
        windKmh={seaWindKmh}
        driftDirection={getCloudDriftDirection(windDirectionDeg)}
      />
      {rainAmount != null && (
        // Horizon mist (ROADMAP item 77, X4): a pale band over the horizon, so heavy rain
        // hides the far shore. Above the ridge and the sea, below the boats and the rain.
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: '50%',
            height: '30%',
            background: `linear-gradient(transparent, ${water.mist} 50%, transparent)`,
            opacity: getRainMistOpacity(rainAmount),
          }}
          data-testid="rain-mist"
        />
      )}

      {containerDimensions.height > 0 && weatherType !== 'storm' && (() => {
        // Sun/moon reflection on the water (ROADMAP item 15 deliverable 2): a few
        // short glinting bars under whichever body is currently shown, fading out
        // with depth - the style book's water reflection streaks. Item 53's glitter
        // strip was rolled back to these bars on request.
        const nightReflection = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
        // Only while that body is above the horizon, fading out between +2° and 0°
        // (ROADMAP item 58); clouds also hide the moon strip (item 57).
        const reflectionFade = nightReflection
          ? (isMoonVisible ? getReflectionFade(moonPosition.altitude) * moonCloudFactor : 0)
          : (isSunVisible && sunShines ? getReflectionFade(sunPosition.altitude) : 0);
        if (reflectionFade <= 0) return null;

        const reflectX = nightReflection ? moonX : sunX;
        const reflectColor = nightReflection ? 'hsl(var(--scene-moon))' : 'hsl(var(--scene-sun-glow-low))';
        // The bars' layout follows the wind (ROADMAP item 79, X1): today's 7 in light air.
        const { bars, rowSpacing } = getReflectionBars(seaWindKmh, nightReflection ? 0.35 : 0.6);
        const bandHeight = (containerDimensions.height - horizonLabelY) * rowSpacing;

        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" data-testid="water-reflection">
            {/* The pool of moonlight the night fish swim through (item 65): a faint cone
                under the moon, 40 % of the width, from the horizon down. The rect is twice
                the water's height, so the gradient's ellipse fades out at its sides and at
                the bottom of the screen, with no hard edge. */}
            {nightReflection && moonPool > 0 && (
              <>
                <defs>
                  <radialGradient id="moon-pool" cx="50%" cy="0%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--scene-moon))" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(var(--scene-moon))" stopOpacity={0} />
                  </radialGradient>
                </defs>
                <rect
                  x={moonX - containerDimensions.width * 0.2}
                  y={horizonLabelY}
                  width={containerDimensions.width * 0.4}
                  height={(containerDimensions.height - horizonLabelY) * 2}
                  fill="url(#moon-pool)"
                  opacity={moonPool}
                  data-testid="moon-pool"
                />
              </>
            )}
            {bars.map((bar, i) => (
              <rect
                key={i}
                x={reflectX - bar.width / 2 + bar.dx}
                y={horizonLabelY + 6 + bar.row * bandHeight + bar.dy}
                width={bar.width}
                height={1.6}
                rx={0.8}
                fill={reflectColor}
                opacity={bar.opacity * reflectionFade}
              />
            ))}
          </svg>
        );
      })()}

      {containerDimensions.width > 0 && (
        <div
          // z-9: above the fog veil (WeatherEffects, z-[8]), so the chips stay readable (ROADMAP item 60).
          className={`absolute inset-0 z-9 pointer-events-none transition-opacity duration-300 ${
            cardinalLabelsVisible ? 'opacity-100' : 'opacity-0'
          }`}
          data-testid="cardinal-labels"
        >
          {cardinalLabels.map(({ label, fraction }) => (
            <div
              key={label}
              className={`absolute flex flex-col items-center gap-1 ${compassActive ? '' : 'transition-all duration-1000'}`}
              style={{
                left: `${Math.max(CARDINAL_LABEL_HALF_WIDTH, Math.min(containerDimensions.width - CARDINAL_LABEL_HALF_WIDTH, fraction * containerDimensions.width))}px`,
                top: `${horizonLabelY}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <span className="block h-3 w-px bg-white/50" aria-hidden="true" />
              <span className="text-caption text-white/90 bg-panel-background border border-panel-border px-2 py-0.5 rounded-full">
                {t(DIRECTION_LABELS[label])}
              </span>
            </div>
          ))}
        </div>
      )}

      {containerDimensions.width > 0 && (sunArcLabelPositions.length > 0 || terrainArcLabelPositions.length > 0 || moonArcLabelPositions.length > 0 || moonTerrainArcLabelPositions.length > 0) && (
        // Rise/zenith/set labels for the arcs above: subtler pills than the cardinal
        // labels, tinted with each arc's own color, fading together with them in
        // fullscreen (same `cardinalLabelsVisible` condition as ROADMAP item 29). The
        // panel carries the same times for assistive tech, so these pills are decorative.
        <div
          className={`absolute inset-0 z-9 pointer-events-none transition-opacity duration-300 ${
            cardinalLabelsVisible ? 'opacity-100' : 'opacity-0'
          }`}
          data-testid="arc-labels"
          aria-hidden="true"
        >
          {sunArcLabelPositions.map((label) => {
            const Icon = ARC_LABEL_ICONS[label.kind];
            return (
              <div
                key={`sun-${label.kind}`}
                data-testid={`arc-label-sun-${label.kind}`}
                className="absolute flex items-center gap-1 text-caption tabular-nums bg-panel-background/70 border border-panel-border/40 px-1.5 py-0.5 rounded-full"
                style={{ left: `${label.x}px`, top: `${label.y}px`, transform: 'translate(-50%, -50%)', color: 'hsl(var(--brand-sunset))' }}
              >
                <Icon size={10} />
                {formatTime(label.time, language)}
              </div>
            );
          })}
          {terrainArcLabelPositions.map((label) => (
            // Line-of-sight label (ROADMAP item 42): the same pill with the Mountain icon
            // and the gold plus (item 35) at its corner.
            <div
              key={`sun-terrain-${label.kind}`}
              data-testid={`arc-label-sun-terrain-${label.kind}`}
              className="absolute flex items-center gap-1 text-caption tabular-nums bg-panel-background/70 border border-panel-border/40 px-1.5 py-0.5 rounded-full"
              style={{ left: `${label.x}px`, top: `${label.y}px`, transform: 'translate(-50%, -50%)', color: 'hsl(var(--brand-sunset))' }}
            >
              <Mountain size={10} />
              {formatTime(label.time, language)}
              <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
            </div>
          ))}
          {moonArcLabelPositions.map((label) => {
            const Icon = ARC_LABEL_ICONS[label.kind];
            return (
              <div
                key={`moon-${label.kind}`}
                data-testid={`arc-label-moon-${label.kind}`}
                className="absolute flex items-center gap-1 text-caption tabular-nums bg-panel-background/70 border border-panel-border/40 px-1.5 py-0.5 rounded-full"
                style={{ left: `${label.x}px`, top: `${label.y}px`, transform: 'translate(-50%, -50%)', color: 'hsl(var(--scene-moon))' }}
              >
                <Icon size={10} />
                {formatTime(label.time, language)}
              </div>
            );
          })}
          {moonTerrainArcLabelPositions.map((label) => (
            // Line-of-sight moon label (ROADMAP item 63): the sun's terrain pill in the moon colour.
            <div
              key={`moon-terrain-${label.kind}`}
              data-testid={`arc-label-moon-terrain-${label.kind}`}
              className="absolute flex items-center gap-1 text-caption tabular-nums bg-panel-background/70 border border-panel-border/40 px-1.5 py-0.5 rounded-full"
              style={{ left: `${label.x}px`, top: `${label.y}px`, transform: 'translate(-50%, -50%)', color: 'hsl(var(--scene-moon))' }}
            >
              <Mountain size={10} />
              {formatTime(label.time, language)}
              <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
            </div>
          ))}
        </div>
      )}

      {timeOfDay !== 'night' && (
        <div
          data-testid="sun-altitude"
          className="absolute z-9 left-1/2 transform -translate-x-1/2 bottom-1/3 -translate-y-12
                     bg-black/50 text-white px-3 py-1 rounded-full text-sm"
        >
          {sunsetCountdown && onCountdownSoundOn ? (
            <button
              type="button"
              onClick={onCountdownSoundOn}
              aria-label={t('scene.countdownSoundOn')}
              className="flex items-center gap-1 tabular-nums cursor-pointer pointer-events-auto"
            >
              <BellOff size={12} />
              {sunsetCountdown.lineOfSight && <Mountain size={12} />}
              {t('scene.countdown', { seconds: sunsetCountdown.seconds })}
              {sunsetCountdown.lineOfSight && <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />}
            </button>
          ) : sunsetCountdown ? (
            <span className="flex items-center gap-1 tabular-nums">
              {sunsetCountdown.lineOfSight && <Mountain size={12} />}
              {t('scene.countdown', { seconds: sunsetCountdown.seconds })}
              {sunsetCountdown.lineOfSight && <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />}
            </span>
          ) : (
            formatSunAltitude(sunPosition.altitude, language)
          )}
        </div>
      )}

      {isMoonVisible && (
        // Anchored to the horizon line (65 %) below the compass chips, so it keeps a gap
        // to them at every screen height (ROADMAP item 54).
        <div
          className="absolute left-1/2 transform -translate-x-1/2 top-[calc(65%+30px)]
                     bg-black/50 text-white px-3 py-1 rounded-full text-xs"
        >
          {t('scene.moonInfo', {
            altitude: formatNumber(language, moonPosition.altitude, 1),
            illumination: new Intl.NumberFormat(language, { style: 'percent' }).format(moonPosition.illumination),
          })}
        </div>
      )}
    </div>
  );
};

export default SunVisualization;
