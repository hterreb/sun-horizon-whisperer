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

// How long a point of the trail lasts (s) and how wide it spreads (× its first width). A
// persistent trail stays, spreads to a band and fades over 5-10 min (a random life per plane).
// Short 30 s and medium 3 min (item 109, SUN-CHASER-13: "longer and last a long time before it
// fades away"): a long band that fades slowly along its length.
export const CONTRAIL_LOOK: Record<Exclude<ContrailKind, 'none'>, { lifeSec: [number, number]; spread: number }> = {
  short: { lifeSec: [30, 30], spread: 1.5 },
  medium: { lifeSec: [180, 180], spread: 2.5 },
  persistent: { lifeSec: [300, 600], spread: 8 },
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

// A short or medium trail moves with its plane: each point of it is `age` s old at
// `age × speed` behind the plane, so its length is the life × the speed (in % of the width).
export const getTrailLength = (speedPercentPerSec: number, lifeSec: number): number => speedPercentPerSec * lifeSec;

// A persistent trail stays where the plane made it: `count` pieces along the crossing. Each
// piece grows with the plane while the plane passes it (the same clock as the crossing), then
// spreads and fades over the trail's life. Times are in s from the plane's start.
export interface TrailPiece { left: number; width: number; growAt: number; growSec: number }
export const PERSISTENT_PIECES = 12;
export const getTrailPieces = (x: number, dx: number, duration: number, count = PERSISTENT_PIECES): TrailPiece[] =>
  Array.from({ length: count }, (_, i) => ({
    left: x + (dx * i) / count,
    width: dx / count,
    growAt: (duration * i) / count,
    growSec: duration / count,
  }));

// Test override: `?plane=persistent` (or `medium`, `short`, `none`): a plane every 20 s, with
// that contrail whatever the forecast says.
export const PLANE_OVERRIDE_GAP_MS = 20_000;
const CONTRAIL_KINDS: ContrailKind[] = ['none', 'short', 'medium', 'persistent'];
export const getPlaneOverride = (search: string): ContrailKind | null => {
  const kind = new URLSearchParams(search).get('plane');
  return CONTRAIL_KINDS.find(k => k === kind) ?? null;
};
