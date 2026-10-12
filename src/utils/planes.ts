// Planes and contrails (ROADMAP item 96, the free part). Pure: the contrail from the upper
// air of the forecast (250 hPa, about 10.4 km), and a plane's look and motion at spawn.
// No React, no DOM.

import { type WeatherType } from '@/components/CloudLayer';
import { type TimeOfDay } from './sunUtils';
import { getCloudColors, getCloudLight, rgba } from './skyCloudUtils';

// The trail takes the light of the high clouds (item 84): white by day, gold and pink at
// sunset, dim at night. `sunAltitude` in degrees, rounded by the caller so it changes rarely.
export const getTrailColour = (weather: WeatherType, sunAltitude: number): string =>
  rgba(getCloudColors('Ci', 'high', weather, getCloudLight(sunAltitude)).lit, 0.8);

export type ContrailKind = 'none' | 'short' | 'medium' | 'persistent';

// The thresholds, to tune against photos of the real sky (the Schmidt-Appleman rule, made simple).
export const CONTRAIL_MAX_TEMP_C = -40; // warmer: no contrail
export const CONTRAIL_DRY_RH = 40; // below: a short trail
export const CONTRAIL_ICE_RH = 65; // at or above: about saturated with respect to ice, the trail stays

// The contrail behind a plane at the 250 hPa temperature (°C) and relative humidity (%).
// Without the upper air (no forecast, an older cache entry): no contrail.
export const getContrail = (tempC: number | null | undefined, rhPercent: number | null | undefined): ContrailKind => {
  if (tempC == null || rhPercent == null || !Number.isFinite(tempC) || !Number.isFinite(rhPercent)) return 'none';
  if (tempC > CONTRAIL_MAX_TEMP_C) return 'none';
  if (rhPercent < CONTRAIL_DRY_RH) return 'short';
  if (rhPercent >= CONTRAIL_ICE_RH) return 'persistent';
  return 'medium';
};

// How long a point of the trail lasts (s) and how wide it spreads (× its first width). Every
// trail stays where the plane made it and fades from its older end (item 142, SUN-CHASER-1H and
// 1N: "even longer and longer lasting"): short 1 min, medium 5 min, persistent 10-15 min (a
// random life per plane) that spreads to a wide band.
export const CONTRAIL_LOOK: Record<Exclude<ContrailKind, 'none'>, { lifeSec: [number, number]; spread: number }> = {
  short: { lifeSec: [60, 60], spread: 1.5 },
  medium: { lifeSec: [300, 300], spread: 2.5 },
  persistent: { lifeSec: [600, 900], spread: 8 },
};

// The planes cannot be seen through fog, a cloud deck, rain or a storm. Drizzle, snow and hail
// fall from a deck too, so no planes then either.
export const isPlaneWeather = (weather: WeatherType): boolean =>
  weather === 'clear' || weather === 'partly' || weather === 'cloudy';

// At night only the lights show: from nautical twilight on, when the sky is too dark for the
// silhouette (the same switch as the night fish, item 65).
export const showsPlaneLights = (timeOfDay: TimeOfDay): boolean =>
  timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';

// About one plane every 3-6 min (a gap rolled once per plane).
export const PLANE_GAP_MIN_MS = 180_000;
export const PLANE_GAP_RANGE_MS = 180_000;
export const MAX_PLANES = 2;
// High and far: the top edge at 8-30 % of the height, at 0.3-0.6 % of the width per second.
// A nearer plane (depth 0) flies higher on the screen, bigger and faster.
export const PLANE_BAND: [number, number] = [8, 30];
export const PLANE_SPEED: [number, number] = [0.3, 0.6];
export const PLANE_WIDTH_PX = 18; // the nearest plane's silhouette; the farthest is 60 % of it
export const TRAIL_PX = 1.5; // the trail's width at the engine of the nearest plane; it widens behind

export interface PlaneLook {
  depth: number; // 0 = near, 1 = far
  y: number; // the top edge in % of the height
  speed: number; // % of the width per second, before the wide-screen factor
  width: number; // px
}
export const getPlaneLook = (depth: number): PlaneLook => ({
  depth,
  y: PLANE_BAND[0] + depth * (PLANE_BAND[1] - PLANE_BAND[0]),
  speed: PLANE_SPEED[1] - depth * (PLANE_SPEED[1] - PLANE_SPEED[0]),
  width: Math.round(PLANE_WIDTH_PX * (1 - 0.4 * depth)),
});

// A trail stays where the plane made it (item 142): `count` pieces along the crossing. Each
// piece grows with the plane while the plane passes it (the same clock as the crossing), then
// spreads and fades over the trail's life. Times are in s from the plane's start.
export interface TrailPiece { left: number; width: number; growAt: number; growSec: number }
// 12-24 pieces: as many as it takes to make a piece in a tenth of the trail's life (at most 24),
// so a short trail fades along its length in small steps.
export const MIN_TRAIL_PIECES = 12;
export const MAX_TRAIL_PIECES = 24;
export const getTrailPieceCount = (duration: number, lifeSec: number): number =>
  Math.min(MAX_TRAIL_PIECES, Math.max(MIN_TRAIL_PIECES, Math.ceil((10 * duration) / lifeSec)));
export const getTrailPieces = (x: number, dx: number, duration: number, count: number): TrailPiece[] =>
  Array.from({ length: count }, (_, i) => ({
    left: x + (dx * i) / count,
    width: dx / count,
    growAt: (duration * i) / count,
    growSec: duration / count,
  }));

// A point of a trail at `a` = its age / its life (0-1): 0.9 when made, 0.6 at 40 % of its life,
// then down to 0. The same for the pieces here and the live trails (item 142).
export const getTrailOpacity = (a: number): number => (a < 0.4 ? 0.9 - 0.75 * a : Math.max(0, 1 - a));

// The keyframes of one plane's trail pieces, one animation per piece (item 142: every running
// animation costs main-thread time in each frame, so not one to grow and one to fade). From its
// start a piece grows from its left end in `growSec` (scaleX 0 → 1, with the plane), and over
// `lifeSec` spreads from `thin` × its band to the full band (scaleY) and fades.
export const getTrailKeyframes = (name: string, growSec: number, lifeSec: number, thin: number): string => {
  const grown = Math.min(1, growSec / lifeSec);
  const round = (n: number) => Math.round(n * 10_000) / 10_000;
  const stops = [...new Set([0, grown, 0.4, 1])].sort((a, b) => a - b);
  return `@keyframes ${name}{${stops.map(o =>
    `${round(o * 100)}%{transform:scale(${round(Math.min(1, o / grown))},${round(thin + (1 - thin) * o)});opacity:${round(getTrailOpacity(o))}}`,
  ).join('')}}`;
};

// Test override: `?plane=persistent` (or `medium`, `short`, `none`): a plane every 20 s, with
// that contrail whatever the forecast says.
export const PLANE_OVERRIDE_GAP_MS = 20_000;
const CONTRAIL_KINDS: ContrailKind[] = ['none', 'short', 'medium', 'persistent'];
export const getPlaneOverride = (search: string): ContrailKind | null => {
  const kind = new URLSearchParams(search).get('plane');
  return CONTRAIL_KINDS.find(k => k === kind) ?? null;
};
