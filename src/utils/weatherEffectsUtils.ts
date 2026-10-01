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
const pickWeighted = <K>(mix: [K, number][], r: number): K => {
  let left = r * mix.reduce((sum, [, weight]) => sum + weight, 0);
  return (mix.find(([, weight]) => (left -= weight) < 0) ?? mix[mix.length - 1])[0];
};

export const pickBoat = (type: WeatherType, windKmh: number | null | undefined, r: number): BoatKind => {
  const fair = type === 'clear' || type === 'partly' || type === 'cloudy' || type === 'overcast';
  const strongWind = (windKmh ?? 0) > STRONG_WIND_KMH;
  return pickWeighted(BOAT_WEIGHTS.filter(([kind]) =>
    (fair || BIG_BOATS.includes(kind)) && !(strongWind && kind === 'rowboat')), r);
};

// Fish mix (ROADMAP item 62, Fish & Currents lookbook): which species swims out next.
// The weights are each species' share of all spawns (sum 100). The sea visitors are rare.
export type FishKind =
  | 'classic' | 'minnow' | 'perch' | 'pike' | 'carp' | 'catfish' | 'trout'
  | 'ray' | 'turtle' | 'jellyfish' | 'seahorse' | 'whale' | 'pufferfish'
  | 'burbot' | 'eel' | 'lanternfish' | 'anglerfish' | 'squid'; // night only (item 65)

export const FISH_WEIGHTS: [FishKind, number][] = [
  ['classic', 25], ['minnow', 18], ['perch', 14], ['pike', 8], ['carp', 10], ['catfish', 4], ['trout', 12],
  ['ray', 2], ['turtle', 2], ['jellyfish', 2], ['seahorse', 1], ['whale', 1], ['pufferfish', 1],
];

export const pickFish = (r: number): FishKind => pickWeighted(FISH_WEIGHTS, r);

// Night mix (ROADMAP item 65, Night waters lookbook), from nautical twilight on. 'moonlit'
// is a day fish in the moon tone (NF1); pickMoonlitDayFish then picks its species with
// the day weights of the lake fish, without the minnow school.
export type NightFishPick = 'moonlit' | 'burbot' | 'eel' | 'lanternfish' | 'jellyfish' | 'anglerfish' | 'squid';

export const NIGHT_FISH_WEIGHTS: [NightFishPick, number][] = [
  ['moonlit', 25], ['burbot', 15], ['eel', 12], ['lanternfish', 30], ['jellyfish', 8], ['anglerfish', 5], ['squid', 5],
];
const MOONLIT_DAY_FISH: FishKind[] = ['classic', 'perch', 'pike', 'carp', 'catfish', 'trout'];

export const pickNightFish = (r: number): NightFishPick => pickWeighted(NIGHT_FISH_WEIGHTS, r);
export const pickMoonlitDayFish = (r: number): FishKind =>
  pickWeighted(FISH_WEIGHTS.filter(([kind]) => MOONLIT_DAY_FISH.includes(kind)), r);

// At most five fish on screen (E4), three at night (item 65, NR1). A school or a pair is
// one entry. Turtles and jellyfish are not fish, so they neither count nor wait for a free place.
export const MAX_FISH = 5;
export const MAX_NIGHT_FISH = 3;
const NOT_FISH: FishKind[] = ['turtle', 'jellyfish'];

export const canSpawnFish = (onScreen: FishKind[], next: FishKind, max = MAX_FISH): boolean =>
  NOT_FISH.includes(next) || onScreen.filter(kind => !NOT_FISH.includes(kind)).length < max;

// Calm water on wide screens (ROADMAP item 66). Fish and boat speeds are a share of the
// width per second, so on a desktop they move 3-5x more pixels per second than on a phone.
// Above a large phone's width, this factor slows them to the phone's pixels per second.
export const PHONE_WIDTH_PX = 430;

export const getWaterSpeedFactor = (viewportWidth: number): number =>
  Math.min(1, PHONE_WIDTH_PX / viewportWidth);

// Rest stop (P8): cruise at `speed`, slow to a stop over 3 s so that it stands still
// `stopAt` along the path, hold for `holdSec`, speed up over 3 s and cruise on. Distances
// are in % of the width, speed in % per second. Returns the crossing time and a CSS
// `linear()` easing for the moveAcrossX animation, so the stop stays in CSS like every
// other glide (no per-frame state). A constant slow-down is a quadratic path, sampled
// every 0.5 s.
const REST_RAMP_SEC = 3;

export const getRestStopMotion = (distance: number, speed: number, stopAt: number, holdSec: number) => {
  const ramp = speed * REST_RAMP_SEC / 2; // the distance covered while slowing down (or speeding up)
  const cruiseIn = Math.max(0, stopAt - ramp);
  const slowFrom = cruiseIn / speed;
  const stop = cruiseIn + ramp;
  const goAt = slowFrom + REST_RAMP_SEC + holdSec;
  const duration = goAt + REST_RAMP_SEC + (distance - stop - ramp) / speed;
  const points: [number, number][] = [[0, 0], [slowFrom, cruiseIn]];
  for (let i = 1; i <= 6; i++) {
    const u = REST_RAMP_SEC * i / 6;
    points.push([slowFrom + u, cruiseIn + speed * (u - u * u / (2 * REST_RAMP_SEC))]);
  }
  for (let i = 0; i <= 6; i++) {
    const u = REST_RAMP_SEC * i / 6;
    points.push([goAt + u, stop + speed * u * u / (2 * REST_RAMP_SEC)]);
  }
  points.push([duration, distance]);
  const easing = `linear(${points.map(([t, s]) => `${(s / distance).toFixed(4)} ${(t / duration * 100).toFixed(2)}%`).join(', ')})`;
  return { duration, easing };
};

// Stars behind clouds (ROADMAP item 52): the factor for star opacity. A measured cloud
// cover wins; without one, the weather type decides.
const STAR_CLOUD_FACTOR: Partial<Record<WeatherType, number>> = { clear: 1, partly: 0.8, cloudy: 0.4 };

export const getStarCloudFactor = (type: WeatherType, cloudCoverPercent: number | null | undefined): number =>
  cloudCoverPercent == null
    ? STAR_CLOUD_FACTOR[type] ?? 0 // ponytail: drizzle counts as covered too, same as rain
    : Math.min(1, Math.max(0, 1 - cloudCoverPercent / 100));

// Clouds hide the moon (ROADMAP item 57): the factor for the moon disc, its glow and
// its reflection. The same cloud factor as the stars, but partial cover, cloudy and
// overcast keep a faint light patch (at least 15 %). Storm and fog hide the moon.
const MOON_PATCH = 0.15;

export const getMoonCloudFactor = (type: WeatherType, cloudCoverPercent: number | null | undefined): number => {
  if (type === 'storm' || type === 'fog') return 0;
  const factor = getStarCloudFactor(type, cloudCoverPercent);
  const patch = (cloudCoverPercent != null && cloudCoverPercent < 100) || type === 'cloudy' || type === 'overcast';
  return patch ? Math.max(MOON_PATCH, factor) : factor;
};

// Stars in twilight (ROADMAP item 52): which share of the stars shows (the brightest
// first) and at which opacity. Day: none.
export const getTwilightStars = (timeOfDay: TimeOfDay): { share: number; opacity: number } =>
  timeOfDay === 'night' ? { share: 1, opacity: 1 } :
  timeOfDay === 'astronomical-twilight' ? { share: 0.5, opacity: 0.7 } :
  timeOfDay === 'nautical-twilight' ? { share: 0.15, opacity: 0.4 } :
  { share: 0, opacity: 0 };

// Clouds dim the sky (ROADMAP item 50): how far the sky gradient mixes toward the
// overcast grey (0-1). A measured cloud cover scales the weather type's mix.
const SKY_OVERCAST_MIX: Record<WeatherType, number> = {
  clear: 0, partly: 0.1, cloudy: 0.25,
  drizzle: 0.45, snow: 0.45,
  overcast: 0.6, fog: 0.6, rain: 0.6,
  storm: 0.75, hail: 0.75,
};

export const getSkyOvercastMix = (type: WeatherType, cloudCoverPercent: number | null | undefined): number =>
  SKY_OVERCAST_MIX[type] * (cloudCoverPercent == null ? 1 : Math.min(1, Math.max(0, cloudCoverPercent / 100)));

// Clouds dim the sun (ROADMAP item 50): opacity of the sun disc and its halo (0-1),
// and the halo's size factor. Overcast, fog and rain leave only a soft light patch.
// `pale` (ROADMAP item 59): how far the disc colour mixes toward the overcast grey
// (0-1); a pale disc also gets a slightly blurred edge.
export interface SunVisibility { disc: number; halo: number; haloScale: number; pale: number }

export const getSunVisibility = (type: WeatherType): SunVisibility =>
  type === 'clear' || type === 'partly' ? { disc: 1, halo: 1, haloScale: 1, pale: 0 } :
  type === 'cloudy' ? { disc: 0.8, halo: 0.6, haloScale: 1, pale: 0 } :
  type === 'drizzle' || type === 'snow' ? { disc: 0.7, halo: 0.5, haloScale: 0.6, pale: 0.5 } :
  type === 'overcast' || type === 'fog' || type === 'rain' ? { disc: 0, halo: 0.6, haloScale: 1.2, pale: 0 } :
  { disc: 0, halo: 0, haloScale: 0, pale: 0 }; // storm, hail
