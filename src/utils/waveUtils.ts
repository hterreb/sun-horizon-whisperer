// Waves by wind strength (ROADMAP item 79): the sea's look per wind, as plain numbers.
// Every value is set at five wind stops (km/h) and interpolated linearly in between.
// SeaCanvas draws ripples, whitecaps, cat's paws, the mirror and the foam from it;
// SunVisualization lays out the reflection bars and SceneBoat dims its mirror image.
import { type WeatherType } from '../components/CloudLayer';

export const WAVE_STOPS_KMH = [3, 12, 28, 50, 70] as const;
type Stops = readonly [number, number, number, number, number];

// Below 3 km/h the first value, above 70 the last.
export const atWindStops = (values: Stops, kmh: number): number => {
  if (kmh <= WAVE_STOPS_KMH[0]) return values[0];
  for (let i = 1; i < WAVE_STOPS_KMH.length; i++) {
    if (kmh <= WAVE_STOPS_KMH[i]) {
      const t = (kmh - WAVE_STOPS_KMH[i - 1]) / (WAVE_STOPS_KMH[i] - WAVE_STOPS_KMH[i - 1]);
      return values[i - 1] * (1 - t) + values[i] * t; // exact at the stops
    }
  }
  return values[4];
};

export const smoothStep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Stable pseudo-random numbers in [0, 1) from three integers (the lookbook's hash), so a
// line or a cap keeps its place for its whole life without storing it.
export const waveHash = (a: number, b: number, c: number): number => {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1103515245);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

// No wind reading yet: today's light breeze. A storm is at least the strong band.
export const UNKNOWN_SEA_WIND_KMH = 12;
export const STORM_MIN_WIND_KMH = 50;

export const getSeaWindKmh = (windKmh: number | null | undefined, weatherType: WeatherType): number => {
  const kmh = windKmh ?? UNKNOWN_SEA_WIND_KMH;
  return weatherType === 'storm' ? Math.max(STORM_MIN_WIND_KMH, kmh) : kmh;
};

// The lookbook's bands: calm < 6, light 6-19, moderate 20-38, strong 39-61, storm 62+.
export const getWindBand = (kmh: number): number => [6, 20, 39, 62].filter((max) => kmh >= max).length;

// Counts are per phone width; SeaCanvas scales them with getWaterLimit. Drifts are px/s
// for the nearest line, the same on every screen width.
export const getWaveLook = (kmh: number) => ({
  ripples: {
    count: atWindStops([8, 30, 60, 95, 130], kmh),
    lengthMin: atWindStops([30, 6, 8, 10, 12], kmh),
    lengthMax: atWindStops([70, 14, 18, 24, 28], kmh),
    opacity: atWindStops([0.11, 0.2, 0.26, 0.31, 0.36], kmh),
    drift: atWindStops([0.3, 1.2, 2.2, 3.2, 4], kmh),
    trough: smoothStep(14, 30, kmh), // a dark trough under each line from 14 km/h
  },
  caps: {
    count: kmh < 12 ? 0 : atWindStops([0, 2, 18, 45, 80], kmh), // the first ones at 12 km/h, as on a real lake
    size: atWindStops([6, 6, 8, 10, 12], kmh),
    opacity: atWindStops([0, 0.55, 0.65, 0.75, 0.85], kmh),
    drift: atWindStops([0, 0.6, 1.2, 1.6, 2], kmh),
  },
  paws: {
    count: atWindStops([0, 6, 12, 18, 24], kmh),
    stretch: atWindStops([1, 1, 1.7, 3.2, 4.2], kmh),
    darkness: atWindStops([0, 0.13, 0.15, 0.17, 0.19], kmh),
    drift: atWindStops([0, 1, 1.8, 2.6, 3.2], kmh),
    lightShare: smoothStep(40, 66, kmh), // in a storm light and dark streaks alternate
  },
  mirror: {
    strength: atWindStops([0.5, 0.3, 0.11, 0.03, 0], kmh),
    breakUp: atWindStops([0, 0.28, 0.55, 0.75, 1], kmh),
    spread: atWindStops([0, 2, 5, 8, 10], kmh), // px a slice shifts sideways
    matte: atWindStops([0, 0.03, 0.09, 0.15, 0.2], kmh),
  },
  // X3: no foam below 55 km/h, full foam from 66.
  foam: smoothStep(55, 66, kmh),
});

export interface ReflectionBar {
  row: number;
  dx: number; // px from the column's centre
  dy: number; // px below the row
  width: number;
  opacity: number; // before the item-58 fade and the item-57 moon factor
}

// X1: the sun's or moon's bars by wind. Calm: a tight column of 10; light: today's 7;
// then more, smaller pieces that spread sideways (up to ±16 px) and get fainter. The
// layout depends on the wind only, so the bars never move over time.
export const getReflectionBars = (kmh: number, baseOpacity: number): { bars: ReflectionBar[]; rowSpacing: number } => {
  const band = getWindBand(kmh);
  const rows = Math.round(atWindStops([10, 7, 9, 11, 12], kmh));
  const perRow = Math.max(1, Math.round(atWindStops([1, 1, 2, 2.6, 3], kmh)));
  const base = atWindStops([30, 26, 15, 10, 8], kmh);
  const spread = atWindStops([0, 0, 7, 12, 16], kmh);
  const alpha = baseOpacity + atWindStops([0.08, 0, -0.05, -0.12, -0.18], kmh);
  const bars: ReflectionBar[] = [];
  for (let row = 0; row < rows; row++) {
    const width = Math.max(3, base - (row * base) / (rows + 2));
    for (let j = 0; j < perRow; j++) {
      bars.push({
        row,
        dx: perRow === 1 ? (row % 2 ? 3 : -3) * (band === 0 ? 0.4 : 1) : (waveHash(row, j, 51 + band) - 0.5) * 2 * spread,
        dy: j % 2 ? 1.5 : 0,
        width,
        opacity: Math.max(0, alpha - row * 0.04) * (perRow > 1 ? 0.85 : 1),
      });
    }
  }
  // Row spacing as a share of the water's height.
  return { bars, rowSpacing: atWindStops([0.055, 0.07, 0.065, 0.06, 0.055], kmh) };
};

// X2: the boats' mirror image (item 73, X1): sharp in calm water, today's look in light
// air, then striped (a CSS mask) and fainter. Still, no motion.
export const getBoatReflection = (kmh: number): { opacity: number; blurPx: number; heightPercent: number; stripe: string | null } => ({
  opacity: atWindStops([0.42, 0.28, 0.2, 0.13, 0.08], kmh),
  blurPx: atWindStops([0, 0.6, 0.9, 1.3, 1.6], kmh),
  heightPercent: atWindStops([70, 55, 50, 42, 36], kmh),
  stripe: kmh >= 70 ? '#000 0 1px, transparent 1px 3px'
    : kmh >= 50 ? '#000 0 1.5px, transparent 1.5px 3px'
    : kmh >= 28 ? '#000 0 2px, transparent 2px 3px'
    : null,
});
