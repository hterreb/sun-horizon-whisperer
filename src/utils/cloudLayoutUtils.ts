// Pure helpers for the cloud layer (ROADMAP item 10): how many clouds to draw and how
// opaque they are (from `cloud_cover` %), where they sit (a seeded layout stable across
// renders for the same day/place), and how fast/which way they drift and precipitation
// slants (from wind). No React, no randomness beyond the seeded PRNG below - all pure
// so the layout and drift math can be unit tested directly.

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

export const CLOUD_MAX_COUNT = 12;

// 0% cover -> no clouds; otherwise at least one, scaling up to CLOUD_MAX_COUNT at 100%.
export const getCloudCount = (cloudCoverPercent: number): number => {
  const clamped = clampPercent(cloudCoverPercent);
  if (clamped <= 0) return 0;
  return Math.max(1, Math.round((clamped / 100) * CLOUD_MAX_COUNT));
};

export const CLOUD_OPACITY_MIN = 0.35;
export const CLOUD_OPACITY_MAX = 0.9;

export const getCloudOpacity = (cloudCoverPercent: number): number => {
  const clamped = clampPercent(cloudCoverPercent);
  return CLOUD_OPACITY_MIN + (clamped / 100) * (CLOUD_OPACITY_MAX - CLOUD_OPACITY_MIN);
};

export interface CloudShape {
  id: number;
  x: number; // left offset, % of layer width
  y: number; // top offset, % of layer height
  scale: number;
}

// FNV-1a string hash -> 32-bit unsigned int, used to seed the PRNG below.
const hashSeed = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

// mulberry32: small, fast, deterministic PRNG from a 32-bit seed - same seed always
// produces the same sequence, unlike Math.random().
const mulberry32 = (seed: number) => {
  let a = seed;
  return (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Cloud positions, seeded by the day (not the exact time) and the location rounded to
// ~10km: the same day at the same place always lays out the same clouds, so they don't
// reshuffle on every render or weather refresh - only their count/opacity react live to
// `cloud_cover`.
export const getCloudLayout = (
  cloudCoverPercent: number,
  date: Date,
  latitude: number,
  longitude: number
): CloudShape[] => {
  const count = getCloudCount(cloudCoverPercent);
  if (count === 0) return [];

  const dayKey = date.toDateString();
  const roundedLat = Math.round(latitude * 10) / 10;
  const roundedLon = Math.round(longitude * 10) / 10;
  const random = mulberry32(hashSeed(`${dayKey}|${roundedLat}|${roundedLon}`));

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: random() * 100,
    y: 5 + random() * 40,
    scale: 0.5 + random() * 0.7,
  }));
};

// Silver lining (ROADMAP item 76, X2): the parts of a cloud within 4.5 × the moon's radius
// catch its light. Returns the light's centre and radius in the cloud's own 120 × 60 svg
// units (the cloud is scaled around its centre), or null when the light does not reach it.
// `moon` is in % of the scene (x, y) and px (r), like CloudLayer's `moon` prop.
// ponytail: from the cloud's resting place, so the light rides along its ±6 vw sway.
const MOON_LINING_RADII = 4.5;

export const getCloudMoonlight = (
  cloud: CloudShape,
  moon: { x: number; y: number; r: number },
  sceneWidth: number,
  sceneHeight: number
): { cx: number; cy: number; r: number } | null => {
  const cx = 60 + (((moon.x - cloud.x) / 100) * sceneWidth - 60) / cloud.scale;
  const cy = 30 + (((moon.y - cloud.y) / 100) * sceneHeight - 30) / cloud.scale;
  const r = (MOON_LINING_RADII * moon.r) / cloud.scale;
  return cx + r > 0 && cx - r < 120 && cy + r > 0 && cy - r < 60 ? { cx, cy, r } : null;
};

// Wind -> cloud drift. Speed is clamped well below real wind speeds so the scene stays
// calm even in a storm (ROADMAP item 15: all motion stays slow); direction is a simple
// left/right sign from the wind's eastward component.
const CLOUD_DRIFT_WIND_CAP_KMH = 50; // wind above this doesn't drift clouds any faster
const CLOUD_DRIFT_SLOWEST_SEC = 240; // calm air: one slow glide every 4 minutes
const CLOUD_DRIFT_FASTEST_SEC = 70; // capped wind: still a gentle glide, not a dash

export const getCloudDriftDurationSec = (windSpeedKmh: number | null | undefined): number => {
  const clampedSpeed = Math.min(CLOUD_DRIFT_WIND_CAP_KMH, Math.max(0, windSpeedKmh ?? 0));
  const t = clampedSpeed / CLOUD_DRIFT_WIND_CAP_KMH;
  return CLOUD_DRIFT_SLOWEST_SEC - t * (CLOUD_DRIFT_SLOWEST_SEC - CLOUD_DRIFT_FASTEST_SEC);
};

// Open-Meteo's wind direction is where the wind blows FROM (meteorological convention),
// so clouds/precipitation travel toward direction + 180°; the sign of that travel
// direction's eastward component picks a screen side (+1 = drifts left->right).
export const getCloudDriftDirection = (windDirectionDeg: number | null | undefined): 1 | -1 => {
  if (windDirectionDeg == null || !Number.isFinite(windDirectionDeg)) return 1;
  const travelDeg = (windDirectionDeg + 180) % 360;
  const eastward = Math.sin(travelDeg * (Math.PI / 180));
  return eastward >= 0 ? 1 : -1;
};

// How far (px) rain/drizzle/hail should slant sideways as they fall, from wind speed
// and direction. Capped low - this is a slant, not a gale.
const PRECIP_SLANT_MAX_PX = 60;
const PRECIP_SLANT_WIND_CAP_KMH = 40;

export const getPrecipitationSlantPx = (
  windSpeedKmh: number | null | undefined,
  windDirectionDeg: number | null | undefined
): number => {
  const clampedSpeed = Math.min(PRECIP_SLANT_WIND_CAP_KMH, Math.max(0, windSpeedKmh ?? 0));
  const direction = getCloudDriftDirection(windDirectionDeg);
  return (clampedSpeed / PRECIP_SLANT_WIND_CAP_KMH) * PRECIP_SLANT_MAX_PX * direction;
};
