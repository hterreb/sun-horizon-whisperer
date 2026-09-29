// Pure trigger/decision logic for the weather illustrations (ROADMAP item 10): which
// effects show for a given weather type, wind, temperature and sun altitude. Kept
// separate from the components that render them so the rules are unit-testable
// without mounting anything.
import { type WeatherType } from '../components/CloudLayer';
import { type TimeOfDay } from './sunUtils';

export interface WeatherEffectsInput {
  type: WeatherType;
  windKmh: number | null | undefined;
  tempC: number | null | undefined;
  sunAltitude: number;
}

export type PrecipitationEffect = 'none' | 'drizzle' | 'rain' | 'snow' | 'hail';

export interface WeatherEffectsResult {
  precipitation: PrecipitationEffect;
  showFog: boolean;
  showLightning: boolean;
  // Strong wind (> 40 km/h): a few leaves glide across, and birds fly slower.
  showLeaves: boolean;
  birdSpeedFactor: number; // 1 = normal speed, < 1 = slower
  showHeatShimmer: boolean; // > 30°C, and there's some daylight to shimmer in
  showFrost: boolean; // < -5°C
  // Rain or drizzle - the actual rainbow also needs a low sun (see getRainbowGeometry).
  showRainbowCandidate: boolean;
}

const STRONG_WIND_KMH = 40;
const HEAT_SHIMMER_MIN_TEMP_C = 30;
const FROST_MAX_TEMP_C = -5;
const STRONG_WIND_BIRD_SPEED_FACTOR = 0.6;

export const getWeatherEffects = ({ type, windKmh, tempC, sunAltitude }: WeatherEffectsInput): WeatherEffectsResult => {
  const wind = windKmh ?? 0;
  const temp = tempC ?? null;
  const strongWind = wind > STRONG_WIND_KMH;

  const precipitation: PrecipitationEffect =
    type === 'drizzle' ? 'drizzle' :
    type === 'rain' || type === 'storm' ? 'rain' :
    type === 'snow' ? 'snow' :
    type === 'hail' ? 'hail' :
    'none';

  return {
    precipitation,
    showFog: type === 'fog',
    showLightning: type === 'storm',
    showLeaves: strongWind,
    birdSpeedFactor: strongWind ? STRONG_WIND_BIRD_SPEED_FACTOR : 1,
    showHeatShimmer: temp !== null && temp > HEAT_SHIMMER_MIN_TEMP_C && sunAltitude > -6,
    showFrost: temp !== null && temp < FROST_MAX_TEMP_C,
    showRainbowCandidate: type === 'rain' || type === 'drizzle',
  };
};

// Storm lightning: a hard cap on flash frequency, at least this many ms apart.
export const LIGHTNING_MIN_GAP_MS = 8000;

// True once at least LIGHTNING_MIN_GAP_MS has passed since the last flash (or there
// was none yet). The random "does it flash this tick" decision stays in the component,
// same as the existing bird/fish/ship spawn-chance pattern in CloudLayer - only the
// hard frequency cap is pure/testable here.
export const canFlashLightning = (lastFlashAtMs: number | null, nowMs: number): boolean =>
  lastFlashAtMs === null || nowMs - lastFlashAtMs >= LIGHTNING_MIN_GAP_MS;

// Boat mix (ROADMAP item 36): which boat sails out next, weighted. Sailboats are the
// most common. Wet or foggy weather leaves only the big boats (ferry, freighter), and
// strong wind keeps the rowboat ashore. Storm and hail (no boats at all) stay in
// CloudLayer's shouldShowShips.
export type BoatKind = 'sailboat' | 'ferry' | 'fishing' | 'rowboat' | 'freighter';

const BOAT_WEIGHTS: [BoatKind, number][] = [
  ['sailboat', 35],
  ['ferry', 15],
  ['fishing', 15],
  ['rowboat', 10],
  ['freighter', 5],
];
const BIG_BOATS: BoatKind[] = ['ferry', 'freighter'];

// `r` is a random number in [0, 1), passed in so the pick stays pure and testable.
export const pickBoat = (type: WeatherType, windKmh: number | null | undefined, r: number): BoatKind => {
  const fair = type === 'clear' || type === 'partly' || type === 'cloudy' || type === 'overcast';
  const strongWind = (windKmh ?? 0) > STRONG_WIND_KMH;
  const mix = BOAT_WEIGHTS.filter(([kind]) =>
    (fair || BIG_BOATS.includes(kind)) && !(strongWind && kind === 'rowboat'));
  let left = r * mix.reduce((sum, [, weight]) => sum + weight, 0);
  return (mix.find(([, weight]) => (left -= weight) < 0) ?? mix[mix.length - 1])[0];
};

// Stars behind clouds (ROADMAP item 52): the factor for star opacity. A measured cloud
// cover wins; without one, the weather type decides.
const STAR_CLOUD_FACTOR: Partial<Record<WeatherType, number>> = { clear: 1, partly: 0.8, cloudy: 0.4 };

export const getStarCloudFactor = (type: WeatherType, cloudCoverPercent: number | null | undefined): number =>
  cloudCoverPercent == null
    ? STAR_CLOUD_FACTOR[type] ?? 0 // ponytail: drizzle counts as covered too, same as rain
    : Math.min(1, Math.max(0, 1 - cloudCoverPercent / 100));

// Stars in twilight (ROADMAP item 52): which share of the stars shows (the brightest
// first) and at which opacity. Day: none.
export const getTwilightStars = (timeOfDay: TimeOfDay): { share: number; opacity: number } =>
  timeOfDay === 'night' ? { share: 1, opacity: 1 } :
  timeOfDay === 'astronomical-twilight' ? { share: 0.5, opacity: 0.7 } :
  timeOfDay === 'nautical-twilight' ? { share: 0.15, opacity: 0.4 } :
  { share: 0, opacity: 0 };
