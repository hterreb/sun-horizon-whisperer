import { type WeatherType } from '../components/CloudLayer';
import { getCloudDriftDirection } from './cloudLayoutUtils';

// Rain, redone (ROADMAP item 77): the amount from the forecast (X1), the wind angle (X2),
// the horizon mist (X4), the darker sky (X5) and the drops of the depth-layer canvas (R6).

// Without a measured amount, the weather code sets it (mm/h).
const RAIN_MM_H_BY_CODE: Record<number, number> = {
  51: 0.2, 53: 0.4, 55: 0.8, 56: 0.2, 57: 0.8,
  61: 1.5, 63: 4, 65: 10, 66: 1.5, 67: 10,
  80: 2, 81: 6, 82: 20,
  95: 10, 96: 10, 99: 10,
};

// Open-Meteo's `current.precipitation` is the mm over the last `current.interval` seconds
// (900). Returns mm/h; null when there is neither an amount nor a rain code.
export const getPrecipitationMmH = (
  mm: number | null | undefined,
  intervalSec: number | null | undefined,
  weatherCode: number
): number | null =>
  mm != null && mm > 0 ? (mm * 3600) / (intervalSec || 900) : RAIN_MM_H_BY_CODE[weatherCode] ?? null;

// Manual weather (and an old cache entry) has no amount: the type's middle value.
const RAIN_MM_H_BY_TYPE: Partial<Record<WeatherType, number>> = { drizzle: 0.4, rain: 4, storm: 10 };

// The amount the rain is drawn with, or null when the weather type has no rain.
export const getRainMmH = (type: WeatherType, mmH: number | null | undefined): number | null => {
  const fallback = RAIN_MM_H_BY_TYPE[type];
  if (fallback == null) return null;
  return mmH != null && mmH > 0 ? mmH : fallback;
};

// t: 0 at 0.1 mm/h, 1 at 20 mm/h (a downpour), on a log scale.
export const getRainIntensity = (mmH: number): number =>
  Math.min(1, Math.max(0, (Math.log10(mmH) + 1) / (Math.log10(20) + 1)));

const PHONE_WIDTH_PX = 430;
export const MAX_RAIN_DROPS = 1200;

export interface RainLook {
  t: number;
  drops: number; // on the whole width
  nearLengthPx: number;
  nearWidthPx: number;
  opacity: number;
  fallSec: number; // the time a near drop takes for the scene height
}

// X1: more, longer, brighter and faster drops with more rain, per 430 px of width.
export const getRainLook = (mmH: number, widthPx: number): RainLook => {
  const t = getRainIntensity(mmH);
  return {
    t,
    drops: Math.min(MAX_RAIN_DROPS, Math.round(((60 + 320 * t) * widthPx) / PHONE_WIDTH_PX)),
    nearLengthPx: 6 + 18 * t,
    nearWidthPx: 1 + 0.8 * t,
    opacity: 0.28 + 0.37 * t,
    fallSec: 3 - 1.4 * t,
  };
};

// X4: the pale band over the horizon; heavy rain hides the far shore.
export const getRainMistOpacity = (mmH: number): number => 0.25 + 0.5 * getRainIntensity(mmH);

// X5: the sky's grey mix for rain and drizzle (item 50: drizzle 0.45, rain 0.6).
export const getRainSkyMix = (mmH: number): number => 0.4 + 0.35 * getRainIntensity(mmH);

// X2: the streaks' angle from the vertical, in degrees: 0.6° per km/h, at most 35°; drizzle
// tilts 1.4 × as much, at most 45°. Positive leans the fall to the right, away from the
// side the wind comes from (the clouds' drift side).
export const getRainAngleDeg = (
  windSpeedKmh: number | null | undefined,
  windDirectionDeg: number | null | undefined,
  drizzle: boolean
): number => {
  const deg = Math.min(drizzle ? 45 : 35, Math.max(0, windSpeedKmh ?? 0) * 0.6 * (drizzle ? 1.4 : 1));
  return deg === 0 ? 0 : deg * getCloudDriftDirection(windDirectionDeg);
};

// R6's drops. z is the depth: 0 at the horizon, 1 in front. A drop falls from `top` to `end`
// (the water at its depth, or below the screen), then starts again at the top, so the
// number of drops never changes.
export interface RainDrop { x: number; y: number; z: number; top: number; end: number }

export interface RainScene {
  width: number;
  height: number;
  horizonY: number;
  tan: number; // tan of the angle: px sideways per px down
}

// Where a drop at depth z meets the water.
export const getRainWaterY = (z: number, scene: RainScene): number =>
  scene.horizonY + Math.pow(z, 1.25) * (scene.height - scene.horizonY);

// Puts a drop at a new random place: at its top, or (`anywhere`, the first frame) anywhere
// on its path. x covers the width plus the part the angle moves the drop in from the side.
export const placeRainDrop = (drop: RainDrop, scene: RainScene, random: () => number, anywhere: boolean): void => {
  const span = Math.abs(scene.tan) * (drop.end - drop.top);
  drop.x = random() * (scene.width + span) - (scene.tan > 0 ? span : 0);
  if (anywhere) {
    drop.y = drop.top + random() * (drop.end - drop.top);
    drop.x += scene.tan * (drop.y - drop.top);
  } else {
    drop.y = drop.top - random() * 30;
  }
};

// Moves the drops by dt seconds. A near drop crosses the scene height in fallSec; a far one
// takes up to 1.8 × as long. Returns where drops met the water, for the rings (X3).
export const stepRainDrops = (
  drops: RainDrop[],
  dt: number,
  scene: RainScene,
  fallSec: number,
  random: () => number
): { x: number; y: number; z: number }[] => {
  const splashes: { x: number; y: number; z: number }[] = [];
  for (const drop of drops) {
    const v = (scene.height / fallSec) * (0.55 + 0.45 * drop.z);
    drop.y += v * dt;
    drop.x += v * scene.tan * dt;
    if (drop.y >= drop.end) {
      if (drop.end < scene.height) splashes.push({ x: drop.x, y: drop.end, z: drop.z });
      placeRainDrop(drop, scene, random, false);
    }
  }
  return splashes;
};

// Rain sound (ROADMAP item 119): a share of the radio slider, quiet under the music,
// louder alone, and a little louder with more rain (0.6× at drizzle up to 1× at a storm).
export const RAIN_SOUND_WITH_RADIO = 0.25;
export const RAIN_SOUND_ALONE = 0.6;

// The rain sound's gain; 0 when the rain sound is off or there is no rain (`mmH` null).
export const getRainSoundGain = (mmH: number | null, rainOn: boolean, radioOn: boolean, volume: number): number => {
  if (!rainOn || mmH == null) return 0;
  return volume * (radioOn ? RAIN_SOUND_WITH_RADIO : RAIN_SOUND_ALONE) * (0.6 + 0.4 * getRainIntensity(mmH));
};
