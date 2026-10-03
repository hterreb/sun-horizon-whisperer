// Pure helpers for the clouds and the weather (ROADMAP items 10, 76, 84): the moon's
// silver lining on a cloud, the side the clouds drift to and how far hail slants, from
// the wind. The cloud types, layout and colours are in skyCloudUtils.ts (item 84).

// Silver lining (ROADMAP item 76, X2): the parts of a cloud within 4.5 × the moon's radius
// catch its light. Takes the cloud's current centre and scale (item 84: the clouds glide,
// so SkyClouds passes where the cloud is now, once a second) and the moon, all in px.
// Returns the light's centre and radius in the cloud's own 120 × 60 svg units, or null
// when the light does not reach it.
const MOON_LINING_RADII = 4.5;

export const getCloudMoonlight = (
  cloud: { x: number; y: number; scale: number },
  moon: { x: number; y: number; r: number }
): { cx: number; cy: number; r: number } | null => {
  const cx = 60 + (moon.x - cloud.x) / cloud.scale;
  const cy = 30 + (moon.y - cloud.y) / cloud.scale;
  const r = (MOON_LINING_RADII * moon.r) / cloud.scale;
  return cx + r > 0 && cx - r < 120 && cy + r > 0 && cy - r < 60 ? { cx, cy, r } : null;
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

// How far (px) hail should slant sideways as it falls, from wind speed and direction.
// Capped low - this is a slant, not a gale. The rain tilts on its canvas (ROADMAP item 77).
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
