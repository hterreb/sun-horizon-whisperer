import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Fish, Leaf, Turtle, type LucideIcon } from 'lucide-react';
import SceneBoat from './SceneBoat';
import SceneBird from './SceneBird';
import RainCanvas from './RainCanvas';
import {
  Bat,
  Carp, Catfish, Jellyfish, Minnow, Perch, Pike, Pufferfish, Ray, Seahorse, Trout, Whale,
  Anglerfish, Burbot, Eel, FireflySquid, Lanternfish,
} from './sceneIcons';
import { type TimeOfDay } from '../utils/sunUtils';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  getCloudLayout,
  getCloudMoonlight,
  getCloudOpacity,
  getCloudDriftDurationSec,
  getCloudDriftDirection,
  getPrecipitationSlantPx,
} from '../utils/cloudLayoutUtils';
import {
  getWeatherEffects, pickBoat, hasBoatWake, getBoatTone, type BoatKind,
  pickFish, canSpawnFish, getRestStopMotion, type FishKind,
  pickNightFish, pickMoonlitDayFish, MAX_FISH, MAX_NIGHT_FISH, getWaterSpeedFactor, getWaterLimit,
  pickBird, isBirdInSeason, MAX_BIRDS, type BirdKind,
} from '../utils/weatherEffectsUtils';
import { getSeaWindKmh } from '../utils/waveUtils';
import { getRainMmH } from '../utils/rainUtils';

// ROADMAP item 10: more than the original 6 types - fog, drizzle and hail join the
// weather-dependent clouds/illustrations, and "partly" splits out the old single
// "mainly clear" bucket from "cloudy".
export type WeatherType =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'hail';

interface CloudLayerProps {
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
  // Cloud seed (ROADMAP item 10): the day (not the exact time) plus a rounded
  // location, so cloud positions stay stable across renders instead of reshuffling.
  // All optional so existing callers/tests that only pass weatherType/timeOfDay
  // still work, falling back to a fixed seed and no live cloud_cover/wind data.
  date?: Date;
  latitude?: number;
  longitude?: number;
  cloudCoverPercent?: number | null;
  windSpeedKmh?: number | null;
  windDirectionDeg?: number | null;
  // The forecast rain amount in mm/h (ROADMAP item 77, X1); null: the type's middle value.
  rainMmH?: number | null;
  // Fullscreen fades the chrome away, so near boats can sail lower.
  isFullscreen?: boolean;
  // The pool of moonlight for the night fish (ROADMAP item 65): the moon's x as a fraction
  // of the width, and the pool's strength (0 = no pool, 1 = a full moon in a clear sky).
  moonlight?: { x: number; strength: number } | null;
  // The moon while it shows (ROADMAP item 74, W14), in % of the width and height, so the
  // night geese can cross it; with its radius (px) and brightness (0-1) for the clouds'
  // silver lining (item 76).
  moon?: { x: number; y: number; r?: number; light?: number } | null;
}

// Birds/fish/ships/leaves travel horizontally at a constant rate (in % of the layer's
// width per second; resting fish pause on the way, see getRestStopMotion). A CSS
// animation moves each entity across the screen once at spawn time, so no per-frame `setState` is needed for movement; state only changes on spawn
// (adding an entry) and despawn (removing one, via `onAnimationEnd`).
// Birds, fish and boats: `speed` in BIRDS, FISH and BOATS.
const LEAF_RATE_PERCENT_PER_SEC = 6;
// A new boat at least every 55 s. The random part is re-rolled on every 500 ms check, so
// most gaps end within ~10 s of the minimum. A crossing takes 64-234 s (ROADMAP item 40),
// so 1-2 boats are out at once, never more than MAX_BOATS (on a phone; more on wide screens,
// item 70). The first sails out ~5 s after load.
const BOAT_GAP_MIN_MS = 55000;
const BOAT_GAP_RANGE_MS = 60000;
const MAX_BOATS = 3;
// A bird check every 8-12 s (ROADMAP item 74, C3; it was 3-5 s at twice the speed). At night
// the geese across the moon (W14) get a check every 30 s.
const BIRD_GAP_MIN_MS = 8000;
const BIRD_GAP_RANGE_MS = 4000;
const MOON_GEESE_GAP_MS = 30000;

// A fixed fallback seed date for callers that don't pass one (e.g. existing tests) -
// a stable constant, not `new Date()`, so it never changes identity across renders.
const DEFAULT_SEED_DATE = new Date(0);

// Manual weather mode has no real `cloud_cover` reading, so each type gets a sensible
// default sky to look right on its own.
const DEFAULT_CLOUD_COVER: Record<WeatherType, number> = {
  clear: 0,
  partly: 25,
  cloudy: 55,
  overcast: 90,
  fog: 95,
  drizzle: 80,
  rain: 85,
  storm: 95,
  snow: 80,
  hail: 90,
};

// Storm deck puffs (ROADMAP item 51) as [cx, cy, rx, ry] in the deck's 100 x 40
// viewBox: two overlapping rows that make the deck's lower edge lumpy.
const STORM_DECK_PUFFS: [number, number, number, number][] = [
  [0, 28, 12, 7], [18, 30, 14, 8], [38, 28, 13, 7], [57, 31, 15, 8], [78, 29, 13, 7], [98, 30, 13, 8],
  [9, 18, 14, 9], [29, 15, 15, 9], [48, 19, 14, 9], [68, 16, 15, 9], [88, 18, 14, 9],
];

const CLOUD_DRIFT_AMPLITUDE_VW = 6; // how far clouds glide before easing back

interface MovingEntity {
  id: number;
  x: number; // starting left offset, in % of the layer width
  y: number; // top offset, in % of the layer height (fixed for the entity's lifetime)
  dx: number; // horizontal travel distance, in vw, applied via the CSS animation
  duration: number; // seconds
}

// ROADMAP item 36: a mixed fleet at a random distance. `y` is the boat's bottom edge.
interface Boat extends MovingEntity {
  kind: BoatKind;
  depth: number; // 0 = near, 1 = far: far boats are smaller, paler and slower
}

// `speed` is a near boat's rate in % of the layer width per second (ROADMAP item 40):
// each type its own. `scale` keeps each hull as long as its old line icon's (item 73).
const BOATS: Record<BoatKind, { scale: number; speed: number }> = {
  sailboat: { scale: 1, speed: 1.2 },
  ferry: { scale: 1.1, speed: 1.8 },
  fishing: { scale: 1, speed: 1.5 },
  rowboat: { scale: 1, speed: 0.9 },
  freighter: { scale: 1.4, speed: 1.3 },
};
const FAR_SHRINK = 0.45; // the farthest boat is 55% of the size, opacity and speed of the nearest

// ROADMAP item 62 (Fish & Currents lookbook). `size` (px) and `speed` (% of the width per
// second) are a near fish's; far fish shrink and slow down like the boats (FAR_SHRINK).
// Calm speeds (item 66): no fish is faster than the sailboat (1.2 %/s), none slower than 0.4.
// `haze` is how deep the species swims: 0 = at the surface (crisp) to 1 = deep (faint).
// `glow` is the spot that lights up after sunset (E1), in the icon's 24 px grid.
// `lights` (night fish, item 65) are always on: [cx, cy, r] in the 24 px grid.
type FishPattern = 'glide' | 'school' | 'companions' | 'rest';
const FISH: Record<FishKind, {
  Icon: LucideIcon; size: number; speed: number; haze: number; pattern: FishPattern; glow: [number, number];
  lights?: [number, number, number][];
}> = {
  classic: { Icon: Fish, size: 20, speed: 1.15, haze: 0.3, pattern: 'companions', glow: [14, 12] },
  minnow: { Icon: Minnow, size: 10, speed: 1.2, haze: 0.1, pattern: 'school', glow: [13, 12] },
  perch: { Icon: Perch, size: 22, speed: 1, haze: 0.35, pattern: 'companions', glow: [13.5, 12.5] },
  pike: { Icon: Pike, size: 32, speed: 0.9, haze: 0.45, pattern: 'rest', glow: [13, 12] },
  carp: { Icon: Carp, size: 26, speed: 0.7, haze: 0.65, pattern: 'glide', glow: [12, 12] },
  catfish: { Icon: Catfish, size: 34, speed: 0.5, haze: 0.85, pattern: 'glide', glow: [12, 13] },
  trout: { Icon: Trout, size: 22, speed: 1.2, haze: 0, pattern: 'glide', glow: [13, 12] },
  ray: { Icon: Ray, size: 30, speed: 0.7, haze: 0.75, pattern: 'glide', glow: [12.5, 12] },
  turtle: { Icon: Turtle, size: 26, speed: 0.55, haze: 0.5, pattern: 'rest', glow: [10, 7] },
  jellyfish: { Icon: Jellyfish, size: 18, speed: 0.4, haze: 0.3, pattern: 'glide', glow: [12, 9] },
  seahorse: { Icon: Seahorse, size: 18, speed: 0.4, haze: 0.4, pattern: 'glide', glow: [12.5, 11] },
  whale: { Icon: Whale, size: 72, speed: 0.4, haze: 0.8, pattern: 'glide', glow: [13, 12] },
  pufferfish: { Icon: Pufferfish, size: 20, speed: 0.45, haze: 0.4, pattern: 'rest', glow: [12.5, 12] },
  // Night only (ROADMAP item 65).
  burbot: { Icon: Burbot, size: 30, speed: 0.55, haze: 0, pattern: 'glide', glow: [12, 12] },
  eel: { Icon: Eel, size: 36, speed: 0.65, haze: 0, pattern: 'glide', glow: [12, 12] },
  lanternfish: {
    Icon: Lanternfish, size: 16, speed: 1, haze: 0, pattern: 'companions', glow: [13, 12],
    lights: [[8, 13.4, 0.9], [10.5, 14.2, 0.9], [13, 14.7, 0.9], [15.5, 14.8, 0.9], [18, 14.3, 0.9]],
  },
  anglerfish: { Icon: Anglerfish, size: 26, speed: 0.4, haze: 0, pattern: 'rest', glow: [13, 12], lights: [[20.3, 2.6, 1.3]] },
  squid: { Icon: FireflySquid, size: 7, speed: 0.9, haze: 0, pattern: 'school', glow: [12, 12] },
};
// Night fish with their own light (item 65); all other fish at night are lit by the moon.
const GLOWING_AT_NIGHT: FishKind[] = ['lanternfish', 'anglerfish', 'squid', 'jellyfish'];
// P5: a minnow school's fixed formation, in minnow widths x 1.15, the leader in front.
const SCHOOL_FORMATION: [number, number][] = [[0, 0], [-1.4, -0.9], [-1.6, 0.9], [-2.9, -0.1], [-3.1, 1.6], [-4.2, -1.1], [-4.5, 0.7]];

interface FishEntity extends MovingEntity {
  kind: FishKind;
  depth: number; // 0 = near, 1 = far, like the boats
  size: number; // px, after the distance shrink
  width: number; // px, of one fish or of the whole school
  height: number;
  opacity: number;
  glow: boolean;
  light?: 'moon' | 'own'; // night fish (item 65): lit by the moon, or by their own light
  easing?: string; // rest stop (P8): a CSS linear() easing that holds still mid-crossing
  school?: { left: number; top: number }[]; // P5: each minnow's offset in px
  companion?: { lag: number; dy: number }; // P6: a second fish, `lag` s behind, `dy` % lower
}

// Builds one fish (ROADMAP item 62). `wet` = rain or drizzle, where fish swim deeper (E2).
// `night` = a night fish (item 65): in the moon tone or with its own light, no depth haze.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const createFish = (
  kind: FishKind, sunDown: boolean, wet: boolean, viewportWidth: number, random = Math.random, night = false,
): FishEntity => {
  const spec = FISH[kind];
  const light = night ? (GLOWING_AT_NIGHT.includes(kind) ? 'own' : 'moon') : undefined;
  // P3: a random distance; the whale always passes far out.
  const depth = kind === 'whale' ? 0.75 + random() * 0.25 : random();
  const nearness = 1 - FAR_SHRINK * depth;
  const size = Math.round(spec.size * nearness);
  let width = size;
  let height = size;
  let school: FishEntity['school'];
  if (spec.pattern === 'school') {
    const cell = size * 1.15;
    const spots = SCHOOL_FORMATION.slice(0, 4 + Math.floor(random() * 4));
    const minX = Math.min(...spots.map(([x]) => x));
    const minY = Math.min(...spots.map(([, y]) => y));
    school = spots.map(([x, y]) => ({ left: (x - minX) * cell, top: (y - minY) * cell }));
    width = -minX * cell + size;
    height = (Math.max(...spots.map(([, y]) => y)) - minY) * cell + size;
  }
  const startX = -(width / viewportWidth) * 100 - 1;
  const dx = 101 - startX;
  const speed = spec.speed * nearness * getWaterSpeedFactor(viewportWidth); // P4, wide screens (item 66)
  // P8: stop with the fish's left edge at 30-65 % of the width, for 5-8 s.
  const rest = spec.pattern === 'rest'
    ? getRestStopMotion(dx, speed, 30 + random() * 35 - startX, 5 + random() * 3)
    : null;
  return {
    id: Date.now() + Math.random(),
    kind, depth, size, width, height, school, light,
    x: startX,
    // The whole water (item 71): far fish just below the horizon (67 % of the height), near
    // ones in the front (93 %), ±1 %. Before, all fish shared a 70-85 % band in the middle.
    y: 67 + (1 - depth) * 26 + (random() - 0.5) * 2,
    dx,
    duration: rest ? rest.duration : dx / speed,
    easing: rest?.easing,
    // Paler with distance (P3), with depth (P9 haze) and in rain (E2). At night: moonlit
    // fish at 70 %, fish with their own light at 95 %, both without the depth haze.
    opacity: (light === 'own' ? 0.95 : 0.7) * (1 - 0.3 * depth) * (light ? 1 : 1 - 0.4 * spec.haze) * (wet ? 0.75 : 1),
    glow: sunDown && !night && spec.pattern !== 'school' && random() < 0.35, // E1
    companion: spec.pattern === 'companions' && random() < 0.35 // P6
      ? { lag: 2 + random() * 2, dy: (random() - 0.5) * 2.8 }
      : undefined,
  };
};

// ROADMAP item 74 (Birds & Skies lookbook). `size` is a near bird's width in px (the
// silhouettes are twice as wide as tall, a bat is square); `speed` is % of the width per
// second (M2): at most 2.5x the sailboat, where all birds flew 5 %/s before. `group` is a
// fixed shape (M4-M7). The kestrel hangs in the wind (M8); the starlings always fly far out.
type BirdGroup = 'one' | 'pair' | 'v' | 'line' | 'flock';
type FlyerKind = BirdKind | 'bat';
const BIRDS: Record<FlyerKind, { size: number; speed: number; group: BirdGroup; hover?: boolean; far?: boolean }> = {
  gull: { size: 34, speed: 2.5, group: 'one' },
  heron: { size: 46, speed: 1.6, group: 'one' },
  stork: { size: 50, speed: 1.8, group: 'pair' },
  swan: { size: 46, speed: 2.2, group: 'pair' },
  geese: { size: 22, speed: 2.2, group: 'v' },
  cormorant: { size: 30, speed: 2.4, group: 'line' },
  kestrel: { size: 24, speed: 2, group: 'one', hover: true },
  starlings: { size: 7, speed: 2, group: 'flock', far: true },
  bat: { size: 38, speed: 2.5, group: 'one' },
};

// The group shapes, in bird widths, the leader in front. They never change in flight.
const birdGroup = (group: BirdGroup, random: () => number): [number, number][] => {
  const count = (min: number, extra: number) => min + Math.floor(random() * (extra + 1));
  switch (group) {
    case 'pair': return [[0, 0], [-1.15, -0.32]]; // M4: the second bird a little behind and higher
    case 'v': { // M5: two arms of 2-4 geese
      const upper = count(2, 2);
      const lower = count(2, 2);
      return [[0, 0],
        ...Array.from({ length: upper }, (_, i): [number, number] => [-0.8 * (i + 1), -0.38 * (i + 1)]),
        ...Array.from({ length: lower }, (_, i): [number, number] => [-0.8 * (i + 1), 0.38 * (i + 1)])];
    }
    case 'line': return Array.from({ length: count(3, 2) }, (_, i): [number, number] => [-1.05 * i, 0.3 * i]); // M6
    case 'flock': return Array.from({ length: count(18, 12) }, (): [number, number] => { // M7: a cloud of 18-30
      const angle = random() * 2 * Math.PI;
      const r = Math.sqrt(random());
      return [8 * r * Math.cos(angle), 3.2 * r * Math.sin(angle)];
    });
    default: return [[0, 0]];
  }
};

interface BirdEntity extends MovingEntity {
  kind: FlyerKind;
  depth: number; // 0 = near, 1 = far (M3)
  size: number; // px, one bird's width after the distance shrink
  width: number; // px, of the bird or the whole group
  height: number;
  opacity: number;
  group?: { left: number; top: number }[]; // each bird's offset in px
  easing?: string; // M8: a CSS linear() easing that hangs still mid-crossing
}

// Builds one bird, group or bat (ROADMAP item 74). `y` is the centre line. `windFactor` slows
// birds in strong wind (item 10). `moonY` (W14): a V of geese at the moon's height, dark, so
// it shows only against the moon.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const createBird = (
  kind: FlyerKind, viewportWidth: number, windFactor = 1, random = Math.random, moonY?: number,
): BirdEntity => {
  const spec = BIRDS[kind];
  // M3: a random distance. Bats keep today's look; the night geese pass at a fixed distance.
  const depth = kind === 'bat' ? 0 : moonY !== undefined ? 0.2 : spec.far ? 0.8 + random() * 0.2 : random();
  const nearness = 1 - FAR_SHRINK * depth;
  const size = Math.round(spec.size * nearness);
  const spots = birdGroup(spec.group, random);
  const minX = Math.min(...spots.map(([x]) => x));
  const minY = Math.min(...spots.map(([, y]) => y));
  const width = (Math.max(...spots.map(([x]) => x)) - minX) * size + size;
  const height = (Math.max(...spots.map(([, y]) => y)) - minY) * size + (kind === 'bat' ? size : size / 2);
  const startX = -(width / viewportWidth) * 100 - 1;
  const dx = 101 - startX;
  const speed = spec.speed * nearness * windFactor * getWaterSpeedFactor(viewportWidth); // M2, C4
  // M8: the kestrel stops with its left edge at 35-65 % of the width, for 3-5 s.
  const hover = spec.hover ? getRestStopMotion(dx, speed, 35 + random() * 30 - startX, 3 + random() * 2) : null;
  return {
    id: Date.now() + Math.random(),
    kind, depth, size, width, height,
    group: spots.length > 1 ? spots.map(([x, y]) => ({ left: (x - minX) * size, top: (y - minY) * size })) : undefined,
    x: startX,
    // Near birds fly high (20 % of the height), far ones lower (50 %), well above the horizon
    // (65 %). Bats keep today's 20-50 %.
    y: moonY ?? (kind === 'bat' ? 20 + random() * 30 : 20 + depth * 30 + (random() - 0.5) * 4),
    dx,
    duration: hover ? hover.duration : dx / speed,
    easing: hover?.easing,
    // Bats carry their own 90 % in the icon colour (item 64); the night geese are dark at 90 %.
    opacity: kind === 'bat' ? 1 : moonY !== undefined ? 0.9 : 0.6 * (1 - 0.3 * depth),
  };
};

// Deterministic pseudo-random value in [0, 1), seeded by an integer. Lets raindrop/
// snowflake/hail layouts be derived during render (pure, no `Math.random()`) while
// still looking randomly scattered; the classic fract(sin(x)) trick.
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const PRECIP_COUNT: Partial<Record<WeatherType, number>> = {
  hail: 45,
};

const CloudLayer: React.FC<CloudLayerProps> = ({
  timeOfDay,
  weatherType,
  date = DEFAULT_SEED_DATE,
  latitude = 0,
  longitude = 0,
  cloudCoverPercent = null,
  windSpeedKmh = null,
  windDirectionDeg = null,
  rainMmH = null,
  isFullscreen = false,
  moonlight = null,
  moon = null,
}) => {
  const [birds, setBirds] = useState<BirdEntity[]>([]);
  const [fish, setFish] = useState<FishEntity[]>([]);
  const [ships, setShips] = useState<Boat[]>([]);
  const [leaves, setLeaves] = useState<MovingEntity[]>([]);

  // Spawn-timing refs (not movement — movement is CSS now). Seeded with a placeholder
  // and set to the real mount time in an effect (Date.now() is impure, so it can't be
  // called during render); the 500ms spawn-check loop below doesn't start reading these
  // until after that effect has run.
  const lastSpawnTimeRef = useRef({ birds: 0, fish: 0, ships: 0, leaves: 0 });
  useEffect(() => {
    const now = Date.now();
    lastSpawnTimeRef.current = { birds: now, fish: now, ships: now - BOAT_GAP_MIN_MS + 5000, leaves: now };
  }, []);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Wind/temperature-driven scene decisions (ROADMAP item 10): strong wind slows birds
  // and adds a few leaves. tempC/sunAltitude aren't known here and don't affect either
  // field, so they're passed as neutral placeholders.
  const effects = useMemo(
    () => getWeatherEffects({ type: weatherType, windKmh: windSpeedKmh, tempC: null, sunAltitude: 0 }),
    [weatherType, windSpeedKmh]
  );

  const effectiveCloudCover = cloudCoverPercent ?? DEFAULT_CLOUD_COVER[weatherType];
  const cloudOpacity = getCloudOpacity(effectiveCloudCover);
  const cloudDriftDurationSec = getCloudDriftDurationSec(windSpeedKmh);
  const cloudDriftDirection = getCloudDriftDirection(windDirectionDeg);
  const precipSlantPx = getPrecipitationSlantPx(windSpeedKmh, windDirectionDeg);

  // Clouds are derived from cloud_cover/wind/date+location (ROADMAP item 10): stable
  // positions across renders for the same day/place, live count and opacity. Keyed on
  // the day string rather than `date` itself, since `date` ticks every second in
  // SunTracker and the layout only needs to change once a day (see moonExtras in
  // SunTracker for the same pattern).
  const cloudSeedDayKey = date.toDateString();
  const clouds = useMemo(
    () => getCloudLayout(effectiveCloudCover, date, latitude, longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on cloudSeedDayKey (the day), not `date` itself
    [effectiveCloudCover, cloudSeedDayKey, latitude, longitude]
  );

  // Drizzle, rain and storm fall on the rain canvas (ROADMAP item 77); null: no rain.
  const rainAmount = getRainMmH(weatherType, rainMmH);

  // Hail pellets and snowflakes look randomly scattered but only need to change when the
  // weather changes, so they're derived with a stable seed rather than `Math.random()`
  // (impure) inside an effect + setState.
  const hailPellets = useMemo(() => {
    if (weatherType !== 'hail') return [];
    const count = PRECIP_COUNT.hail ?? 45;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: seededRandom(i * 5 + 1) * 100,
      y: -10 - seededRandom(i * 5 + 2) * 100,
      delay: seededRandom(i * 5 + 3) * 4,
      size: 3 + seededRandom(i * 5 + 4) * 3
    }));
  }, [weatherType]);

  const snowflakes = useMemo(() => {
    if (weatherType !== 'snow') return [];
    const newSnowflakes = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: seededRandom(i * 4 + 1) * 100,
      y: -10 - seededRandom(i * 4 + 2) * 100,
      size: 0.625 + seededRandom(i * 4 + 3) * 1.375, // rem: at least 10 px (ROADMAP item 50)
      delay: seededRandom(i * 4 + 4) * 8
    }));
    return newSnowflakes;
  }, [weatherType]);

  // Sun below the horizon: bats instead of birds, and the boats show their lights.
  const isSunDown = timeOfDay === 'night' ||
                    timeOfDay === 'astronomical-twilight' ||
                    timeOfDay === 'nautical-twilight' ||
                    timeOfDay === 'civil-twilight';
  const boatTone = getBoatTone(timeOfDay);
  const seaWindKmh = getSeaWindKmh(windSpeedKmh, weatherType); // the boats' reflection (item 79, X2)
  // The line leaves keep the old ship tone.
  const lineInk = timeOfDay === 'night' ? 'text-gray-300 text-opacity-60' : 'text-gray-600 text-opacity-80';

  // The pool of moonlight (ROADMAP item 65, NF1/NR3): moonlit fish show only within ±9 %
  // of the width from the moon, fading out to ±20 %, as bright as the pool is strong.
  const moonUp = (moonlight?.strength ?? 0) > 0;
  // Seasons (item 74, C1) and the moon's height for the night geese, as plain numbers so the
  // spawn loop restarts only when they change (date ticks every second; the moon's height is
  // rounded to whole percent).
  const month = date.getMonth() + 1;
  const moonY = moon ? Math.round(moon.y) : null;
  const poolX = (moonlight?.x ?? 0.5) * 100;
  const poolMask = `linear-gradient(to right, transparent ${poolX - 20}%, #000 ${poolX - 9}%, #000 ${poolX + 9}%, transparent ${poolX + 20}%)`;

  // Spawn loop: periodically checks whether a new bird/fish/ship/leaf is due, and
  // clears each group when the weather/time no longer supports it. This is the only
  // place that calls `setBirds`/`setFish`/`setShips`/`setLeaves` — once per spawn or
  // clear, never per animation frame. Movement itself happens via the CSS animation
  // applied to each entity below (see the `moveAcrossX` keyframes), driven by
  // `onAnimationEnd` for off-screen removal.
  useEffect(() => {
    // Reduced motion: skip spawning birds, fish, ships and leaves entirely (static sky).
    if (prefersReducedMotion) return;

    // Fair-weather flyers: birds tuck away once it's wet, foggy or stormy. Bats fly from
    // sunset through twilight (ROADMAP item 40); full night stays quiet (item 36).
    const birdWeather = weatherType === 'clear' || weatherType === 'partly' ||
                        weatherType === 'cloudy' || weatherType === 'overcast';
    const shouldShowBirds = birdWeather && timeOfDay !== 'night';
    // Geese also migrate at night (item 74, W14): in their months, a V crosses at the moon's height.
    const shouldShowMoonGeese = birdWeather && timeOfDay === 'night' && moonY !== null &&
                                isBirdInSeason('geese', month, latitude);
    const fishWeather = weatherType === 'clear' || weatherType === 'partly' || weatherType === 'cloudy' ||
                        weatherType === 'overcast' || weatherType === 'rain' || weatherType === 'drizzle';
    // Night fish (ROADMAP item 65, NR2) take over in nautical twilight, where the day fish stop.
    const nightWater = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
    const shouldShowFish = fishWeather && !nightWater;
    const shouldShowNightFish = fishWeather && nightWater;
    const wetForFish = weatherType === 'rain' || weatherType === 'drizzle';
    // A storm sends out only the big boats (pickBoat, item 73); hail has none.
    const shouldShowShips = weatherType !== 'hail';

    const spawnTick = () => {
      const currentTime = Date.now();

      if (shouldShowBirds) {
        if (currentTime - lastSpawnTimeRef.current.birds > BIRD_GAP_MIN_MS + Math.random() * BIRD_GAP_RANGE_MS) {
          // 70 %, a third more in the hour before sunset, when the gulls fly to their roost (C2).
          if (Math.random() < (timeOfDay === 'evening' ? 0.93 : 0.7)) {
            const kind = isSunDown ? 'bat' : pickBird(Math.random(), month, latitude, timeOfDay === 'evening');
            const next = createBird(kind, window.innerWidth, effects.birdSpeedFactor);
            // At most four birds or groups (C3), per phone width (item 70). Far birds first.
            const limit = getWaterLimit(MAX_BIRDS, window.innerWidth);
            setBirds(prev => (prev.length >= limit ? prev : [...prev, next].sort((a, b) => b.depth - a.depth)));
          }
          lastSpawnTimeRef.current.birds = currentTime;
        }
      } else if (shouldShowMoonGeese) {
        // The twilight bats fly on. One V at a time, about every four minutes.
        if (currentTime - lastSpawnTimeRef.current.birds > MOON_GEESE_GAP_MS) {
          if (Math.random() < 0.12) {
            const next = createBird('geese', window.innerWidth, effects.birdSpeedFactor, Math.random, moonY);
            setBirds(prev => (prev.some(b => b.kind === 'geese') ? prev : [...prev, next]));
          }
          lastSpawnTimeRef.current.birds = currentTime;
        }
      } else {
        setBirds(prev => (prev.length > 0 ? [] : prev));
      }

      // At the switch between day and night fish, the fish on screen swim on (item 65).
      if (shouldShowFish || shouldShowNightFish) {
        // A quiet night (NR1): a check every 15-25 s instead of every 5-8 s.
        const gapMs = shouldShowNightFish ? 15000 + Math.random() * 10000 : 5000 + Math.random() * 3000;
        if (currentTime - lastSpawnTimeRef.current.fish > gapMs) {
          if (Math.random() < (wetForFish ? 0.35 : 0.7)) { // 70% chance, half of it in rain (E2)
            let newFish: FishEntity | null = null;
            if (shouldShowNightFish) {
              const pick = pickNightFish(Math.random());
              const kind = pick === 'moonlit' ? pickMoonlitDayFish(Math.random()) : pick;
              // Fish lit by the moon need the pool of moonlight (NR3).
              if (GLOWING_AT_NIGHT.includes(kind) || moonUp) {
                newFish = createFish(kind, false, wetForFish, window.innerWidth, Math.random, true);
              }
            } else {
              newFish = createFish(pickFish(Math.random()), isSunDown, wetForFish, window.innerWidth);
            }
            if (newFish) {
              const next = newFish;
              // At most five fish (E4), three at night (NR1), per phone width (item 70). Far fish
              // first, so a near fish swims in front.
              const limit = getWaterLimit(shouldShowNightFish ? MAX_NIGHT_FISH : MAX_FISH, window.innerWidth);
              setFish(prev => (canSpawnFish(prev.map(f => f.kind), next.kind, limit)
                ? [...prev, next].sort((a, b) => b.depth - a.depth)
                : prev));
            }
          }
          lastSpawnTimeRef.current.fish = currentTime;
        }
      } else {
        setFish(prev => (prev.length > 0 ? [] : prev));
      }

      if (shouldShowShips) {
        if (currentTime - lastSpawnTimeRef.current.ships > BOAT_GAP_MIN_MS + Math.random() * BOAT_GAP_RANGE_MS) {
          if (Math.random() < 0.9) { // 90% chance to spawn
            const startX = -8;
            const endX = 108;
            // More boats far out (item 71): the square root makes 44 % of them sail in the
            // farthest quarter, small and pale near the horizon, and fewer big ones mid-water.
            const depth = Math.sqrt(Math.random());
            const kind = pickBoat(weatherType, windSpeedKmh, Math.random());
            const newShip: Boat = {
              id: Date.now() + Math.random(),
              x: startX,
              // Far boats sit at the horizon (65%). Near ones sail down to 87%, just above the
              // music player, or to 94% in fullscreen.
              y: 67 + (1 - depth) * (isFullscreen ? 27 : 20),
              dx: endX - startX,
              // Wide screens: the phone's pixels per second (item 66).
              duration: (endX - startX) / (BOATS[kind].speed * (1 - FAR_SHRINK * depth) * getWaterSpeedFactor(window.innerWidth)),
              kind,
              depth,
            };
            // Far boats first, so a near boat always sails in front of a far one.
            const boatLimit = getWaterLimit(MAX_BOATS, window.innerWidth);
            setShips(prev => (prev.length >= boatLimit ? prev : [...prev, newShip].sort((a, b) => b.depth - a.depth)));
          }
          lastSpawnTimeRef.current.ships = currentTime;
        }
      } else {
        setShips(prev => (prev.length > 0 ? [] : prev));
      }

      if (effects.showLeaves) {
        if (currentTime - lastSpawnTimeRef.current.leaves > 4000 + Math.random() * 4000) {
          if (Math.random() < 0.6) { // 60% chance to spawn
            const startX = -5;
            const endX = 105;
            const newLeaf: MovingEntity = {
              id: Date.now() + Math.random(),
              x: startX,
              y: 40 + Math.random() * 40,
              dx: endX - startX,
              duration: (endX - startX) / LEAF_RATE_PERCENT_PER_SEC,
            };
            setLeaves(prev => [...prev, newLeaf]);
          }
          lastSpawnTimeRef.current.leaves = currentTime;
        }
      } else {
        setLeaves(prev => (prev.length > 0 ? [] : prev));
      }
    };

    const intervalId = setInterval(spawnTick, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [weatherType, windSpeedKmh, timeOfDay, prefersReducedMotion, isSunDown, isFullscreen, effects.showLeaves, effects.birdSpeedFactor, moonUp, month, latitude, moonY]);

  // The grey/wet-weather cloud tints below (storm/hail/rain/drizzle/fog/snow/
  // overcast) are ROADMAP item 10's weather-conditioned matrix, unchanged by the
  // item 15 D redesign - it doesn't restyle the weather illustrations, only the
  // brand/scene palette, so these stay as component-local literals rather than
  // scene design tokens (a day/night x 7-weather-type matrix that isn't part of
  // the style book's D palette).
  const getCloudColor = () => {
    switch(weatherType) {
      case 'clear':
        return 'transparent';
      case 'storm':
        return timeOfDay === 'night'
          ? 'rgba(20, 20, 25, 0.9)'
          : 'rgba(60, 60, 70, 0.95)';
      case 'hail':
        return timeOfDay === 'night'
          ? 'rgba(35, 40, 50, 0.85)'
          : 'rgba(90, 95, 105, 0.9)';
      case 'rain':
        return timeOfDay === 'night'
          ? 'rgba(40, 40, 50, 0.8)'
          : 'rgba(100, 100, 110, 0.85)';
      case 'drizzle':
        return timeOfDay === 'night'
          ? 'rgba(55, 58, 68, 0.65)'
          : 'rgba(150, 152, 160, 0.7)';
      case 'fog':
        return timeOfDay === 'night'
          ? 'rgba(120, 125, 135, 0.55)'
          : 'rgba(215, 218, 222, 0.75)';
      case 'snow':
        return timeOfDay === 'night'
          ? 'rgba(200, 200, 210, 0.6)'
          : 'rgba(220, 220, 230, 0.8)';
      case 'overcast':
        switch(timeOfDay) {
          case 'dawn':
            return 'rgba(180, 180, 180, 0.8)';
          case 'morning':
          case 'evening':
            return 'rgba(160, 160, 165, 0.85)';
          case 'night':
            return 'rgba(40, 40, 45, 0.7)';
          case 'astronomical-twilight':
          case 'nautical-twilight':
            return 'rgba(60, 60, 65, 0.8)';
          default:
            return 'rgba(140, 140, 145, 0.9)';
        }
      case 'cloudy':
      case 'partly':
      default:
        // Fair-weather clouds: the style book's D cloud tint per time-of-day,
        // already scene tokens (ROADMAP item 15) - brand-peach for the golden
        // hours, the night-sky tokens after dark, plain white by day.
        switch(timeOfDay) {
          case 'dawn':
          case 'morning':
          case 'evening':
            return 'hsl(var(--brand-peach) / 0.7)';
          case 'night':
            return 'hsl(var(--scene-sky-night-2) / 0.4)';
          case 'astronomical-twilight':
          case 'nautical-twilight':
            return 'hsl(var(--scene-sky-night-3) / 0.5)';
          default:
            return 'hsl(var(--scene-glow-white) / 0.8)';
        }
    }
  };

  const getOvercastLayer = () => {
    if (weatherType === 'clear') return null;

    const intensity = weatherType === 'storm' ? 0.8 :
                     weatherType === 'hail' ? 0.75 :
                     weatherType === 'rain' ? 0.7 :
                     weatherType === 'overcast' ? 0.6 :
                     weatherType === 'fog' ? 0.5 :
                     weatherType === 'drizzle' ? 0.45 :
                     weatherType === 'partly' ? 0.2 : 0.3;

    return (
      <div
        className="absolute inset-0 transition-colors duration-[5000ms]"
        style={{
          background: `linear-gradient(to bottom, ${getCloudColor()} 0%, transparent 40%)`,
          opacity: intensity
        }}
      />
    );
  };

  // "Flat blanket" cloud silhouette for the grey/overcast-family weather, a puffier
  // one otherwise (partly/cloudy/snow).
  const isFlatCloudWeather = weatherType === 'storm' || weatherType === 'rain' || weatherType === 'overcast' ||
    weatherType === 'hail' || weatherType === 'drizzle' || weatherType === 'fog';
  const cloudPath = isFlatCloudWeather
    ? "M0 35 Q30 15 60 30 Q90 10 120 25 Q120 50 90 55 Q60 60 30 55 Q0 50 0 35Z"
    : "M20 40 Q30 20 45 35 Q60 10 75 30 Q90 20 100 35 Q110 45 95 50 Q85 60 60 55 Q35 60 25 50 Q15 45 20 40Z";

  // One fish, or a pair (P6): the companion swims `lag` s behind and leaves last, so its
  // onAnimationEnd removes the pair. Night fish (item 65) are in the moon tone or carry lights.
  const renderFish = (fishItem: FishEntity) => {
    const { Icon, glow, lights } = FISH[fishItem.kind];
    // Lit by the moon, or an outline with lights: the moon tone. A jellyfish or squid with
    // its own light: its glow colour, with a soft halo.
    const color = fishItem.light === 'moon' || lights
      ? 'hsl(var(--scene-moon))'
      : `hsl(var(--scene-fish-${fishItem.light && fishItem.kind === 'jellyfish' ? 'jellyfish-glow' : fishItem.kind}))`;
    const halo = fishItem.light === 'own' && !lights ? 'drop-shadow(0 0 3px currentColor)' : undefined;
    const remove = () => setFish(prev => prev.filter(f => f.id !== fishItem.id));
    const body = fishItem.school ? (
      <div className="relative" style={{ width: fishItem.width, height: fishItem.height }}>
        {fishItem.school.map((spot, i) => (
          <Icon
            key={i}
            size={fishItem.size}
            className="absolute"
            style={{ left: spot.left, top: spot.top }}
            data-testid="scene-fish"
            data-kind={fishItem.kind}
          />
        ))}
      </div>
    ) : (
      <Icon size={fishItem.size} strokeOpacity={lights ? 0.45 : undefined} data-testid="scene-fish" data-kind={fishItem.kind}>
        {lights?.map(([cx, cy, r]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={r}
            stroke="none"
            className="fill-brand-gold-light"
            style={{ filter: 'drop-shadow(0 0 2px hsl(var(--brand-gold)))' }}
            data-testid="fish-light"
          />
        ))}
        {fishItem.glow && (
          <circle
            cx={glow[0]}
            cy={glow[1]}
            r={1.3}
            stroke="none"
            className="fill-brand-gold-light"
            style={{ filter: 'drop-shadow(0 0 2px hsl(var(--brand-gold)))' }}
            data-testid="fish-glow"
          />
        )}
      </Icon>
    );
    const swimmer = (key: string, lag: number, dy: number, onEnd?: () => void) => (
      <div
        key={key}
        className="absolute"
        style={{
          left: `${fishItem.x}%`,
          top: `${fishItem.y + dy}%`,
          zIndex: 5,
          opacity: fishItem.opacity,
          color,
          filter: halo,
          ['--dx' as string]: `${fishItem.dx}vw`,
          animation: `moveAcrossX ${fishItem.duration}s linear ${lag}s forwards`,
          // Rest stop (P8). A browser without CSS linear() ignores it and glides straight. Set
          // only with a stop: React writes undefined as '', which wipes the shorthand's `linear`
          // and leaves CSS's default `ease` (item 74 found this).
          ...(fishItem.easing && { animationTimingFunction: fishItem.easing }),
        }}
        onAnimationEnd={onEnd}
      >
        {body}
      </div>
    );
    return fishItem.companion ? (
      <React.Fragment key={fishItem.id}>
        {swimmer('lead', 0, 0)}
        {swimmer('companion', fishItem.companion.lag, fishItem.companion.dy, remove)}
      </React.Fragment>
    ) : swimmer(String(fishItem.id), 0, 0, remove);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ ['--slant' as string]: `${precipSlantPx}px` }}
    >
      <div data-testid="iceberg" />
      {getOvercastLayer()}

      {weatherType === 'storm' && (
        // Storm deck (ROADMAP item 51): a closed dark cloud cover across the top third
        // of the sky - a solid band with large overlapping, blurred cloud shapes along
        // its lower edge, so no sky shows through. It overhangs the edges so the blur
        // does not fade them in.
        <svg
          data-testid="storm-deck"
          className="absolute"
          style={{ left: '-3%', top: '-3%', width: '106%', height: '40%', filter: 'blur(4px)' }}
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="0" y="0" width="100" height="28" fill={getCloudColor()} />
          {STORM_DECK_PUFFS.map(([cx, cy, rx, ry], i) => (
            // The upper row is a shade darker, so the deck reads as heavy clouds, not a band.
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={i < 6 ? getCloudColor() : 'rgba(0, 0, 0, 0.22)'} />
          ))}
        </svg>
      )}

      {/* Clouds: count/opacity from cloud_cover, drift from wind, positions from a
          seeded layout stable for the day/place (see cloudLayoutUtils.getCloudLayout). */}
      {clouds.map((cloud) => {
        const moonlight = moon?.r ? getCloudMoonlight(cloud, { x: moon.x, y: moon.y, r: moon.r }, window.innerWidth, window.innerHeight) : null;
        const moonGlow = moon?.light ?? 1;
        return (
          <div
            key={cloud.id}
            className="absolute transition-colors duration-[5000ms]"
            style={{
              left: `${cloud.x}%`,
              // In a storm the drifting clouds sit below the deck (ROADMAP item 51).
              top: `${weatherType === 'storm' ? 30 + cloud.y * 0.5 : cloud.y}%`,
              opacity: cloudOpacity,
              // Soft blurred clouds (ROADMAP item 15 D polish, style book scene()
              // k==='d'). On the wrapper, not the <svg>, so it doesn't touch the
              // snapshot in tests/CloudLayer.test.tsx.
              filter: 'blur(1.5px)',
              ['--cloud-scale' as string]: cloud.scale,
              ['--cloud-dx' as string]: `${CLOUD_DRIFT_AMPLITUDE_VW * cloudDriftDirection}vw`,
              animation: `cloudDrift ${cloudDriftDurationSec}s ease-in-out infinite alternate`,
            }}
          >
            <svg
              width="120"
              height="60"
              viewBox="0 0 120 60"
              fill="none"
            >
              <path
                d={cloudPath}
                fill={getCloudColor()}
                className="transition-colors duration-[5000ms]"
              />
              {/* X2 silver lining (item 76): the cloud's parts near the moon catch its light. */}
              {moonlight && (
                <>
                  <defs>
                    <radialGradient id={`cloud-moonlight-${cloud.id}`} gradientUnits="userSpaceOnUse" cx={moonlight.cx} cy={moonlight.cy} r={moonlight.r}>
                      <stop offset="0" stopColor="hsl(var(--scene-moon))" stopOpacity={0.85 * moonGlow} />
                      <stop offset="0.5" stopColor="hsl(var(--scene-moon))" stopOpacity={0.32 * moonGlow} />
                      <stop offset="1" stopColor="hsl(var(--scene-moon))" stopOpacity={0} />
                    </radialGradient>
                  </defs>
                  <path d={cloudPath} fill={`url(#cloud-moonlight-${cloud.id})`} data-testid="cloud-moonlight" />
                </>
              )}
            </svg>
          </div>
        );
      })}

      {rainAmount != null && (
        <RainCanvas
          weatherType={weatherType as 'drizzle' | 'rain' | 'storm'}
          mmH={rainAmount}
          windSpeedKmh={windSpeedKmh}
          windDirectionDeg={windDirectionDeg}
          timeOfDay={timeOfDay}
        />
      )}

      {/* Hail: small pellets falling straight/slanted with a tiny settle (shrink +
          fade) at the ground - the calm-motion rule (ROADMAP item 15) rules out an
          actual bounce. */}
      {hailPellets.map((pellet) => (
        <div
          key={pellet.id}
          className="absolute rounded-full bg-slate-200 opacity-80"
          style={{
            left: `${pellet.x}%`,
            top: `${pellet.y}%`,
            width: `${pellet.size}px`,
            height: `${pellet.size}px`,
            // The delay sits in the shorthand: a separate animationDelay before it was reset to 0 (item 77).
            animation: `hailFall 1.8s linear ${pellet.delay}s infinite`
          }}
        />
      ))}

      {/* Snow flakes */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute text-white opacity-80"
          style={{
            left: `${flake.x}%`,
            top: `${flake.y}%`,
            fontSize: `${flake.size}rem`,
            // A thin blue-grey outline so the flakes read on the grey sky (ROADMAP item 50).
            textShadow: '0 0 1px hsl(var(--scene-snow-outline)), 0 0 1px hsl(var(--scene-snow-outline))',
            animation: `snowfall 6s linear ${flake.delay}s infinite`
          }}
        >
          ❄
        </div>
      ))}

      {/* Birds (bats after sunset, item 74's species by day) — each spawns once and travels via
          the `moveAcrossX` CSS animation; onAnimationEnd removes it (off-screen). The silhouette
          colour and the opacity sit on the whole group, so overlapping wings don't darken. */}
      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute"
          style={{
            left: `${bird.x}%`,
            top: `${bird.y}%`,
            zIndex: 10,
            opacity: bird.opacity,
            color: 'hsl(var(--scene-critter-silhouette))',
            ['--dx' as string]: `${bird.dx}vw`,
            animation: `moveAcrossX ${bird.duration}s linear forwards`,
            // Hang in the wind (M8), set only with a stop, as for the fish.
            ...(bird.easing && { animationTimingFunction: bird.easing }),
          }}
          onAnimationEnd={() => setBirds(prev => prev.filter(b => b.id !== bird.id))}
        >
          <div className="relative" style={{ width: bird.width, height: bird.height, transform: 'translateY(-50%)' }}>
            {bird.kind === 'bat' ? (
              <Bat size={bird.size} strokeWidth={0.6} fill="currentColor" style={{ color: 'hsl(var(--scene-critter-silhouette) / 0.9)' }} data-testid="scene-bat" />
            ) : bird.group ? bird.group.map((spot, i) => (
              <SceneBird key={i} kind={bird.kind as BirdKind} width={bird.size} className="absolute" style={{ left: spot.left, top: spot.top }} />
            )) : (
              <SceneBird kind={bird.kind} width={bird.size} />
            )}
          </div>
        </div>
      ))}

      {/* Fish (ROADMAP items 62, 64). Moonlit night fish swim in the masked pool layer, so
          they show only in the moonlight; the layer is always there, so they can always leave. */}
      {fish.filter(f => f.light !== 'moon').map(renderFish)}
      <div
        className="absolute inset-0"
        style={{ zIndex: 5, opacity: moonlight?.strength ?? 0, maskImage: poolMask, WebkitMaskImage: poolMask }}
        data-testid="moonlit-fish"
      >
        {fish.filter(f => f.light === 'moon').map(renderFish)}
      </div>


      {/* Boats (ROADMAP item 36), drawn in soft light (item 73) */}
      {ships.map((ship) => {
        const { scale } = BOATS[ship.kind];
        const nearness = 1 - FAR_SHRINK * ship.depth;
        return (
          <div
            key={ship.id}
            className="absolute"
            style={{
              left: `${ship.x}%`,
              top: `${ship.y}%`,
              zIndex: 7,
              opacity: nearness,
              ['--dx' as string]: `${ship.dx}vw`,
              animation: `moveAcrossX ${ship.duration}s linear forwards`,
            }}
            onAnimationEnd={() => setShips(prev => prev.filter(s => s.id !== ship.id))}
          >
            {/* Scale from the bottom-left corner, then lift by the boat's height, so `top` is the waterline. */}
            <div style={{ transform: `translateY(-100%) scale(${1.4 * scale * nearness})`, transformOrigin: 'bottom left' }}>
              <SceneBoat kind={ship.kind} tone={boatTone} lit={isSunDown} wake={hasBoatWake(ship.kind, windSpeedKmh)} seaWindKmh={seaWindKmh} />
            </div>
          </div>
        );
      })}

      {/* Leaves - strong wind only (> 40 km/h), gliding across like birds/fish. */}
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute"
          style={{
            left: `${leaf.x}%`,
            top: `${leaf.y}%`,
            zIndex: 6,
            ['--dx' as string]: `${leaf.dx}vw`,
            animation: `moveAcrossX ${leaf.duration}s linear forwards`,
          }}
          onAnimationEnd={() => setLeaves(prev => prev.filter(l => l.id !== leaf.id))}
        >
          <Leaf size={18} className={`transition-colors duration-1000 ${lineInk}`} data-testid="scene-leaf" />
        </div>
      ))}

      {/* CSS animations for weather effects and entity movement */}
      <style>{`
        @keyframes hailFall {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          92% {
            transform: translate(var(--slant, 0px), 100vh) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--slant, 0px), 100vh) scale(0.7);
            opacity: 0;
          }
        }

        @keyframes snowfall {
          to {
            transform: translateY(100vh) translateX(20px);
          }
        }

        @keyframes moveAcrossX {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(var(--dx));
          }
        }

        @keyframes cloudDrift {
          from {
            transform: scale(var(--cloud-scale, 1)) translateX(0);
          }
          to {
            transform: scale(var(--cloud-scale, 1)) translateX(var(--cloud-dx, 0));
          }
        }
      `}</style>
    </div>
  );
};

export default CloudLayer;
