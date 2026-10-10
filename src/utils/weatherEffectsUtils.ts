// Pure trigger/decision logic for the weather illustrations (ROADMAP item 10): which
// effects show for a given weather type, wind, temperature and sun altitude. Kept
// separate from the components that render them so the rules are unit-testable
// without mounting anything.
import { type WeatherType } from '../components/CloudLayer';
import { type SunTimes, type TimeOfDay } from './sunUtils';
import { getRainMmH, getRainSkyMix } from './rainUtils';

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
// most common. Wet, foggy or stormy weather leaves only the big boats (ferry, freighter),
// and strong wind keeps the rowboat ashore. Hail (no boats at all) stays in CloudLayer's
// shouldShowShips.
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

// Wake (ROADMAP item 73, Fleet Styles X2): only a boat that moves fast trails one. The
// ferry and the freighter always; the sailboat only in strong wind; the rowboat never.
// The fishing boat has none.
export const hasBoatWake = (kind: BoatKind, windKmh: number | null | undefined): boolean =>
  BIG_BOATS.includes(kind) || (kind === 'sailboat' && (windKmh ?? 0) > STRONG_WIND_KMH);

// The light on the boats (ROADMAP item 73, B3): 'sun' when the sky is warm (dawn and
// evening, the sails catch the peach light), dim in civil twilight, dark from nautical
// twilight on. Every other time is plain daylight.
export type BoatTone = 'day' | 'sun' | 'twilight' | 'night';

export const getBoatTone = (timeOfDay: TimeOfDay): BoatTone =>
  timeOfDay === 'dawn' || timeOfDay === 'evening' ? 'sun' :
  timeOfDay === 'civil-twilight' ? 'twilight' :
  timeOfDay === 'nautical-twilight' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'night' ? 'night' :
  'day';

// Fish mix (ROADMAP item 62, Fish & Currents lookbook): which species swims out next.
// The weights are each species' share of all spawns (sum 100). The sea visitors are rare.
export type FishKind =
  | 'classic' | 'minnow' | 'perch' | 'pike' | 'carp' | 'catfish' | 'trout'
  | 'ray' | 'turtle' | 'jellyfish' | 'seahorse' | 'whale' | 'pufferfish'
  | 'burbot' | 'eel' | 'lanternfish' | 'anglerfish' | 'squid' // night only (item 65)
  | 'shark' | 'dolphins'; // the rare sea visitors (item 85): a shark, a pod of 2-3 dolphins

// Item 85: the shark and the dolphin pod are 1 in 200 each; the classic fish gave the 1.
export const FISH_WEIGHTS: [FishKind, number][] = [
  ['classic', 24], ['minnow', 18], ['perch', 14], ['pike', 8], ['carp', 10], ['catfish', 4], ['trout', 12],
  ['ray', 2], ['turtle', 2], ['jellyfish', 2], ['seahorse', 1], ['whale', 1], ['pufferfish', 1],
  ['shark', 0.5], ['dolphins', 0.5],
];

export const pickFish = (r: number): FishKind => pickWeighted(FISH_WEIGHTS, r);

// Test override (item 85): `?fish=<kind>` (e.g. `?fish=shark`) makes every spawn that kind,
// like `?egg=` for the easter eggs. The rare ones can then be checked in the browser.
const NIGHT_ONLY_FISH: FishKind[] = ['burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'];

export const getFishOverride = (search: string): FishKind | null => {
  const kind = new URLSearchParams(search).get('fish');
  return [...FISH_WEIGHTS.map(([k]) => k), ...NIGHT_ONLY_FISH].find(k => k === kind) ?? null;
};

// Night mix (ROADMAP item 65, Night waters lookbook), from nautical twilight on. 'moonlit'
// is a day fish in the moon tone (NF1); pickMoonlitDayFish then picks its species with
// the day weights of the lake fish, without the minnow school. The sea visitors swim at night
// too (item 85, X5), in the moon pool like the moonlit fish, which gave the 1.
export type NightFishPick = 'moonlit' | 'burbot' | 'eel' | 'lanternfish' | 'jellyfish' | 'anglerfish' | 'squid' | 'shark' | 'dolphins';

export const NIGHT_FISH_WEIGHTS: [NightFishPick, number][] = [
  ['moonlit', 24], ['burbot', 15], ['eel', 12], ['lanternfish', 30], ['jellyfish', 8], ['anglerfish', 5], ['squid', 5],
  ['shark', 0.5], ['dolphins', 0.5],
];
const MOONLIT_DAY_FISH: FishKind[] = ['classic', 'perch', 'pike', 'carp', 'catfish', 'trout'];

export const pickNightFish = (r: number): NightFishPick => pickWeighted(NIGHT_FISH_WEIGHTS, r);
export const pickMoonlitDayFish = (r: number): FishKind =>
  pickWeighted(FISH_WEIGHTS.filter(([kind]) => MOONLIT_DAY_FISH.includes(kind)), r);

// Night fish (item 65, NR2) take over in nautical twilight, where the day fish stop.
export const isNightWater = (timeOfDay: TimeOfDay): boolean =>
  timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';

// Info cards (ROADMAP item 105): a kind's share of the spawns of a mix, in percent. 0 when the
// kind is not in the mix.
const shareOf = <K>(mix: [K, number][], kind: K): number =>
  (100 * (mix.find(([k]) => k === kind)?.[1] ?? 0)) / mix.reduce((sum, [, weight]) => sum + weight, 0);

// The fish's share of the pool that swims now: the night mix (a moonlit day fish is the
// 'moonlit' share times its share of the moonlit day fish) or the day mix. A fish that is not
// in that pool (it swims on at the switch, item 65) gets its share of the other pool.
export const getFishShare = (kind: FishKind, night: boolean): number => {
  const day = shareOf(FISH_WEIGHTS, kind);
  const moonlitMix = FISH_WEIGHTS.filter(([k]) => MOONLIT_DAY_FISH.includes(k));
  const nightShare = shareOf<string>(NIGHT_FISH_WEIGHTS, kind) +
    (shareOf<NightFishPick>(NIGHT_FISH_WEIGHTS, 'moonlit') * shareOf(moonlitMix, kind)) / 100;
  return night ? nightShare || day : day || nightShare;
};

// The boat's share of the fair-weather mix (all boats), item 105.
export const getBoatShare = (kind: BoatKind): number => shareOf(BOAT_WEIGHTS, kind);

// At most five fish on screen, three at night (item 103; item 102: 4 and 2.5, item 93: 3 and 2).
// getSceneLimit rounds the base times the width and the density. A school or a pair is one
// entry. Turtles and jellyfish count too (item 93).
export const MAX_FISH = 5;
export const MAX_NIGHT_FISH = 3;

export const canSpawnFish = (onScreen: FishKind[], max = MAX_FISH): boolean => onScreen.length < max;

// Birds & Skies lookbook (ROADMAP item 74). The share of day spawns (sums to 100); a pair,
// a V, a line or a flock is one spawn.
export type BirdKind = 'gull' | 'heron' | 'stork' | 'swan' | 'geese' | 'cormorant' | 'kestrel' | 'starlings';

export const BIRD_WEIGHTS: [BirdKind, number][] = [
  ['gull', 38], ['heron', 10], ['stork', 8], ['swan', 8], ['geese', 10], ['cormorant', 10], ['kestrel', 8], ['starlings', 8],
];

// Seasons (C1): the months (1 = January) each bird flies at Lake Constance. The others
// fly all year. South of the equator the seasons shift by half a year.
const BIRD_MONTHS: Partial<Record<BirdKind, number[]>> = {
  stork: [3, 4, 5, 6, 7, 8],
  geese: [3, 4, 9, 10, 11],
  starlings: [9, 10, 11],
};

export const isBirdInSeason = (kind: BirdKind, month: number, latitude: number): boolean =>
  BIRD_MONTHS[kind]?.includes(latitude < 0 ? (month + 5) % 12 + 1 : month) ?? true;

// `evening` = the hour before sunset (C2), the only time the starling flocks come. The
// gull flies all year, so the mix is never empty.
export const pickBird = (r: number, month: number, latitude: number, evening: boolean): BirdKind =>
  pickWeighted(BIRD_WEIGHTS.filter(([kind]) =>
    isBirdInSeason(kind, month, latitude) && (kind !== 'starlings' || evening)), r);

// Info cards (item 107): the bats' share of the day's flying time, in percent. CloudLayer
// sends bats instead of birds while the sun is down (civil, nautical and astronomical
// twilight, at dawn and at dusk), birds from sunrise to sunset, and no flyers in full night.
// So the bats fly from astronomical dawn to sunrise and from sunset to astronomical dusk.
export const getBatShare = (times: SunTimes): number => {
  const span = (from: Date, to: Date) => Math.max(0, to.getTime() - from.getTime());
  const bats = span(times.astronomicalDawn, times.sunrise) + span(times.sunset, times.astronomicalDusk);
  const flying = bats + span(times.sunrise, times.sunset);
  return flying > 0 ? (100 * bats) / flying : 0;
};

// Info cards (item 105): a flyer's share of all flyers. `batShare` is getBatShare; the birds
// share the rest of the flying time by their weights, all seasons together.
export const getFlyerShare = (kind: BirdKind | 'bat', batShare: number): number =>
  kind === 'bat' ? batShare : (shareOf(BIRD_WEIGHTS, kind) * (100 - batShare)) / 100;

// At most five birds or groups in the sky (item 103; C3: four), per phone width like the fish (item 70).
export const MAX_BIRDS = 5;

// Calm water on wide screens (ROADMAP item 66). Fish and boat speeds are a share of the
// width per second, so on a desktop they move 3-5x more pixels per second than on a phone.
// Above a large phone's width, this factor slows them to the phone's pixels per second.
export const PHONE_WIDTH_PX = 430;

export const getWaterSpeedFactor = (viewportWidth: number): number =>
  Math.min(1, PHONE_WIDTH_PX / viewportWidth);

// Room on wide screens (ROADMAP item 70): a crossing there takes 1 / getWaterSpeedFactor
// times longer, so the fish and boat limits grow by the same factor. A wide screen then
// looks like phones side by side. Phones keep the base limit.
export const getWaterLimit = (base: number, viewportWidth: number): number =>
  Math.round(base / getWaterSpeedFactor(viewportWidth));

// The limits of the fish, boats and birds (ROADMAP item 93, S2): they grow with the width as
// getWaterLimit, but at most to 2.5 times the phone's limit (item 103; item 93: 1.5), so a wide screen is calmer. The
// sea canvas (waves, foam) keeps getWaterLimit. `density` is getSceneDensity (S3): it scales
// the limit, rounded, at least 1.
export const SCENE_LIMIT_MAX_GROWTH = 2.5;
export const getSceneLimit = (base: number, viewportWidth: number, density = 1): number =>
  Math.max(1, Math.round(base * Math.min(SCENE_LIMIT_MAX_GROWTH, 1 / getWaterSpeedFactor(viewportWidth)) * density));

// Rest stop (P8): cruise at `speed`, slow to a stop over 3 s so that it stands still
// `stopAt` along the path, hold for `holdSec`, speed up over 3 s and cruise on. Distances
// are in % of the width, speed in % per second. Returns the crossing time and a CSS
// `linear()` easing for the moveAcrossX animation, so the stop stays in CSS like every
// other glide (no per-frame state). A constant slow-down is a quadratic path, sampled
// every 0.5 s. `curve` has the easing's points as [share of the time, share of the distance],
// for the lane plan (item 92, xAt).
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
  const curve = points.map(([t, s]): [number, number] => [t / duration, s / distance]);
  const easing = `linear(${curve.map(([p, s]) => `${s.toFixed(4)} ${(p * 100).toFixed(2)}%`).join(', ')})`;
  return { duration, easing, curve };
};

// Stars behind clouds (ROADMAP item 52): the factor for star opacity. A measured cloud
// cover wins; without one, the weather type decides.
const STAR_CLOUD_FACTOR: Partial<Record<WeatherType, number>> = { clear: 1, partly: 0.8, cloudy: 0.4 };

export const getStarCloudFactor = (type: WeatherType, cloudCoverPercent: number | null | undefined): number =>
  cloudCoverPercent == null
    ? STAR_CLOUD_FACTOR[type] ?? 0 // ponytail: drizzle counts as covered too, same as rain
    : Math.min(1, Math.max(0, 1 - cloudCoverPercent / 100));

// Item 134: clouds hide a share of the stars, through gaps, instead of dimming them all.
// Each star has a random `gap` (0-1); it shows at full strength while the cloud factor is
// above its gap, and fades over GAP_FADE below that. A clear sky shows all, 89 % cover about
// one star in nine, a closed deck none.
const GAP_FADE = 0.15;
export const getStarGapShow = (cloudFactor: number, gap: number): number =>
  Math.min(1, Math.max(0, (cloudFactor - gap * (1 - GAP_FADE)) / GAP_FADE));

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

// The moon stays findable behind clouds (ROADMAP item 76, MV4): the disc keeps at least a
// quarter of its clear opacity in every weather but storm, manual rain included. While the
// item-57 factor is below 0.5, a soft corona marks its place: `corona` is its strength,
// `coronaRadius` a multiple of the disc radius. Fog shows the corona only, larger and fainter.
// The moon's reflection and the moonlight pool keep the item-57 factor.
const MOON_DISC_FLOOR = 0.25;

export const getMoonLook = (type: WeatherType, cloudCoverPercent: number | null | undefined) => {
  if (type === 'storm') return { disc: 0, corona: 0, coronaRadius: 0 };
  if (type === 'fog') return { disc: 0, corona: 0.5, coronaRadius: 5 };
  const factor = getMoonCloudFactor(type, cloudCoverPercent);
  return factor < 0.5
    ? { disc: Math.max(MOON_DISC_FLOOR, factor), corona: 1, coronaRadius: 3.5 }
    : { disc: factor, corona: 0, coronaRadius: 0 };
};

// Stars in twilight (ROADMAP item 52): which share of the stars shows (the brightest
// first) and at which opacity. Day: none.
export const getTwilightStars = (timeOfDay: TimeOfDay): { share: number; opacity: number } =>
  timeOfDay === 'night' ? { share: 1, opacity: 1 } :
  timeOfDay === 'astronomical-twilight' ? { share: 0.5, opacity: 0.7 } :
  timeOfDay === 'nautical-twilight' ? { share: 0.15, opacity: 0.4 } :
  { share: 0, opacity: 0 };

// Clouds dim the sky (ROADMAP item 50): how far the sky gradient mixes toward the
// overcast grey (0-1). A measured cloud cover scales the weather type's mix. Rain and
// drizzle get greyer with more rain (item 77, X5); without an amount, the type's middle value.
const SKY_OVERCAST_MIX: Record<WeatherType, number> = {
  clear: 0, partly: 0.1, cloudy: 0.25,
  drizzle: 0.45, snow: 0.45,
  overcast: 0.6, fog: 0.6, rain: 0.6,
  storm: 0.75, hail: 0.75,
};

export const getSkyOvercastMix = (
  type: WeatherType,
  cloudCoverPercent: number | null | undefined,
  rainMmH: number | null = null
): number =>
  (type === 'rain' || type === 'drizzle' ? getRainSkyMix(getRainMmH(type, rainMmH) as number) : SKY_OVERCAST_MIX[type]) *
  (cloudCoverPercent == null ? 1 : Math.min(1, Math.max(0, cloudCoverPercent / 100)));

// Clouds dim the sun (ROADMAP item 50): opacity of the sun disc and its halo (0-1),
// and the halo's size factor. Overcast, fog and rain leave only a soft light patch.
// `pale` (ROADMAP item 59): how far the disc colour mixes toward the overcast grey
// (0-1); a pale disc also gets a slightly blurred edge. Overcast (ROADMAP item 72) keeps a
// faint, pale disc in its light patch, so the sun still shows where it is.
export interface SunVisibility { disc: number; halo: number; haloScale: number; pale: number }

export const getSunVisibility = (type: WeatherType): SunVisibility =>
  type === 'clear' || type === 'partly' ? { disc: 1, halo: 1, haloScale: 1, pale: 0 } :
  type === 'cloudy' ? { disc: 0.8, halo: 0.6, haloScale: 1, pale: 0 } :
  type === 'drizzle' || type === 'snow' ? { disc: 0.7, halo: 0.5, haloScale: 0.6, pale: 0.5 } :
  type === 'overcast' ? { disc: 0.3, halo: 0.6, haloScale: 1.2, pale: 0.6 } :
  type === 'fog' || type === 'rain' ? { disc: 0, halo: 0.6, haloScale: 1.2, pale: 0 } :
  { disc: 0, halo: 0, haloScale: 0, pale: 0 }; // storm, hail
