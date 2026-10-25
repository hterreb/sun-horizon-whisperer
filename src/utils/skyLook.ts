// The sky's shared geometry and look: where the sun, the moon, the horizon and the compass
// labels are on the screen, and how the sun looks. The full scene (SunVisualization) and the
// light first sky (LightSky, ROADMAP item 174) both draw from here, so they put every thing at
// the same place and the hand-over from one to the other does not jump.
import { shortestHeadingDelta } from './compassUtils';
import { type MessageKey } from '@/i18n';
import { type WeatherType } from '@/components/CloudLayer';

// Maps an azimuth (0-360°, 0 = North) to a horizontal screen fraction (0-1), for the
// static (non-compass) 360°-across-the-screen mode.
// North hemisphere: sun/moon culminate at 180° (South), which already sits at the
// center of a linear 0->left/360->right mapping, so no shift is needed.
// South hemisphere: culmination is at 0°/360° (North), which would otherwise land on
// the screen edge and jump edge-to-edge at noon. Shifting by 180° before mapping
// centers the culmination instead.
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
export const resolveAzimuth = (
  azimuth: number,
  latitude: number,
  compassHeading?: number | null
): CompassScreenFraction =>
  compassHeading === null || compassHeading === undefined
    ? { fraction: getAzimuthScreenFraction(azimuth, latitude), visible: true }
    : getCompassScreenFraction(azimuth, compassHeading);

// The inverse of resolveAzimuth (ROADMAP item 95): the azimuth at a screen fraction, for a
// tap on the terrain.
export const getAzimuthAtFraction = (fraction: number, latitude: number, compassHeading?: number | null): number => {
  const azimuth = compassHeading === null || compassHeading === undefined
    ? fraction * 360 + (latitude < 0 ? 180 : 0)
    : compassHeading + (fraction - 0.5) * COMPASS_FOV_DEG;
  return ((azimuth % 360) + 360) % 360;
};

// The 8 cardinal/intercardinal directions shown as static horizon labels (ROADMAP
// item 8), always in clockwise order from North.
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
export const DIRECTION_LABELS: Record<string, MessageKey> = {
  N: 'direction.n', NE: 'direction.ne', E: 'direction.e', SE: 'direction.se',
  S: 'direction.s', SW: 'direction.sw', W: 'direction.w', NW: 'direction.nw',
};

// Screen fraction for each cardinal label, using the same azimuth->x mapping as the
// sun/moon, so labels stay correct in both hemispheres and pan together with the
// scene. In compass mode, a label outside the field of view is dropped instead of
// being clamped to the edge (ROADMAP item 19); the finite-fraction guard still covers
// a non-finite result (e.g. NaN input).
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

// The altitude->y part of the mapping, shared by the clamped (dot) and unclamped
// (arc) screen positions below.
export const altitudeToY = (altitude: number, height: number): number => {
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
export const getScreenPosition = (
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


// The sea's top edge (ROADMAP item 27): waves 80 px wide with a fixed, deterministic height.
export const getSeaEdgePath = (width: number, height: number): string => {
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
    path += `L${x1},${horizonY} Q${x2},${horizonY - waveHeight} ${x3},${horizonY} `;
  }
  path += `L${width},${horizonY} `;
  return path;
};
// The sea fill: the edge, closed down to the bottom of the screen.
export const getSeaPath = (width: number, height: number): string => {
  const edge = getSeaEdgePath(width, height);
  return edge && `${edge}L${width},${height} L0,${height} Z`;
};

// The top of the sea fill's box, where its gradient starts (item 145): the highest crest, as a
// quadratic curve peaks halfway to its control point.
export const getSeaTop = (width: number, height: number): number =>
  height * 0.65 - Math.max(0, ...Array.from({ length: Math.ceil(width / 80) }, (_, i) => Math.sin(i * 0.5) * 8 + 4)) / 2;

export const CARDINAL_LABEL_HALF_WIDTH = 18;

// Item 176: two compass pills that would touch (one pushed against the screen edge, as N
// next to NE) keep one: a main direction (N, E, S, W) before a between one, else the one at
// its true place.
export const getCardinalPills = (
  labels: ReturnType<typeof getVisibleCardinalLabels>,
  width: number,
) => {
  const pills = labels
    .map((direction) => {
      const x = Math.max(CARDINAL_LABEL_HALF_WIDTH, Math.min(width - CARDINAL_LABEL_HALF_WIDTH, direction.fraction * width));
      return { ...direction, x, isAtEdge: x !== direction.fraction * width };
    })
    .sort((a, b) => a.x - b.x);
  const kept: typeof pills = [];
  for (const pill of pills) {
    const last = kept[kept.length - 1];
    if (last && pill.x - last.x < CARDINAL_LABEL_HALF_WIDTH * 2 + 4) {
      const isMain = (p: typeof pill) => p.label.length === 1;
      if (isMain(pill) !== isMain(last) ? isMain(pill) : last.isAtEdge && !pill.isAtEdge) kept[kept.length - 1] = pill;
      continue;
    }
    kept.push(pill);
  }
  return kept;
};

// The sun's line colour by altitude band.
export const getSunColorClass = (altitude: number): string => {
  if (altitude > 10) return 'text-yellow-300';
  if (altitude > 0) return 'text-orange-400';
  return 'text-amber-600';
};

// Sun glow color, by altitude band (ROADMAP item 15 D polish: the style book's soft glowing
// sun) - the same 3 tokens/bands as getGlowClass below, also used for the radial halo behind
// the sun icon.
export const getSunGlowToken = (altitude: number): string | null => {
  if (altitude > 10) return '--scene-sun-glow-high';
  if (altitude > 0) return '--scene-sun-glow-low';
  if (altitude > -10) return '--scene-sun-glow-horizon';
  return null;
};

export const getGlowClass = (altitude: number, weatherType: WeatherType): string => {
  // Reduce glow intensity for grey/wet weather - fog scatters it the most, snow
  // the least (ROADMAP item 10).
  const baseGlow = weatherType === 'storm' || weatherType === 'rain' || weatherType === 'hail' ? 0.3 :
                   weatherType === 'fog' ? 0.25 :
                   weatherType === 'drizzle' || weatherType === 'overcast' ? 0.5 :
                   weatherType === 'snow' ? 0.5 : 1;
  if (altitude > 10) return `drop-shadow-[0_0_15px_hsl(var(--scene-sun-glow-high)_/_${0.8 * baseGlow})]`;
  if (altitude > 0) return `drop-shadow-[0_0_10px_hsl(var(--scene-sun-glow-low)_/_${0.6 * baseGlow})]`;
  if (altitude > -10) return `drop-shadow-[0_0_5px_hsl(var(--scene-sun-glow-horizon)_/_${0.4 * baseGlow})]`;
  return '';
};
