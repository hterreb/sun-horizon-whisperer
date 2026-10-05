import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Leaf } from 'lucide-react';
import SceneBoat, { BOAT_HEIGHT_PX, BOAT_WIDTH_PX } from './SceneBoat';
import SceneBird from './SceneBird';
import SceneFish from './SceneFish';
import SceneVisitor, {
  DOLPHIN_SPACING, VISITOR_GRID, VISITOR_VIEW_HEIGHT, SHARK_ABOVE_WATER, DOLPHINS_ABOVE_WATER,
} from './SceneVisitor';
import RainCanvas from './RainCanvas';
import SkyClouds from './SkyClouds';
import { Bat } from './sceneIcons';
import { type TimeOfDay, type SunTimes } from '../utils/sunUtils';
import { getSceneDensity } from '@/utils/sceneDensity';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useScenePlaybackRate } from '@/hooks/useScenePlaybackRate';
import { getScenePlaybackRate, getSpawnGapFactor, type PlayDirection } from '@/utils/timeTravel';
import { findLane, getSceneTime, setSceneRate, LIVE_SCENE_CLOCK, type ScenePath } from '@/utils/scenePaths';
import { getPrecipitationSlantPx } from '../utils/cloudLayoutUtils';
import { type CloudLayers, getDaySeed } from '../utils/skyCloudUtils';
import {
  getWeatherEffects, pickBoat, hasBoatWake, getBoatTone, type BoatKind,
  pickFish, canSpawnFish, getRestStopMotion, type FishKind,
  pickNightFish, pickMoonlitDayFish, MAX_FISH, MAX_NIGHT_FISH, getWaterSpeedFactor, getSceneLimit, getFishOverride,
  pickBird, isBirdInSeason, MAX_BIRDS, type BirdKind,
} from '../utils/weatherEffectsUtils';
import { getSeaWindKmh, getBoatReflection } from '../utils/waveUtils';
import { getRainMmH } from '../utils/rainUtils';
import { type SceneInfoTarget } from '@/utils/sceneInfo';

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
  // The current hour's cover per layer (ROADMAP item 84, C1); null: the weather type's own.
  cloudLayers?: CloudLayers | null;
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
  // Time-travel play (ROADMAP item 83): the scene moves 8x faster, backwards in rewind.
  playDirection?: PlayDirection;
  // The sun in % of the width and height, with its altitude (°), for the clouds' light
  // (item 84, C2); the sky gradient for their tint and the colour of their shadows.
  sun?: { x: number; y: number; altitude: number } | null;
  skyGradient?: string | null;
  // A rare lenticular or mammatus day (item 84, X1).
  cloudEgg?: boolean;
  // The day's sun times, for the busy and quiet phases (item 93, S3); null: always busy.
  sunTimes?: SunTimes | null;
  // Item 93 (S1): the scene opens full. false: it starts empty and the spawn loop fills it,
  // as before (the tests of the spawn loop use this).
  warmStart?: boolean;
  // Info cards (ROADMAP item 95): a tap on a fish, a bird, a boat or a cloud calls onInfo with
  // the tapped point (px in the viewport) and the thing's ring id; `infoRing` is the ring id of
  // the thing whose card is open, which then shows a thin ring.
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
}

export type SceneInfoHandler = (target: SceneInfoTarget, point: { x: number; y: number }, ring: string) => void;

// Item 95: the least tap target (WCAG 2.5.5), in px.
const HIT_PX = 44;

// An invisible hit area of at least HIT_PX x HIT_PX around a thing's box (`width` x `height` px,
// centred at `cx`, `cy` in its wrapper), with the ring when the thing's card is open. A child
// of the wrapper, so the wrapper's CSS animation moves the ring too.
const HitArea: React.FC<{ cx: number; cy: number; width: number; height: number; ring: boolean }> = ({ cx, cy, width, height, ring }) => {
  const w = Math.max(HIT_PX, width);
  const h = Math.max(HIT_PX, height);
  return (
    <span className="absolute" style={{ left: cx - w / 2, top: cy - h / 2, width: w, height: h }} data-testid="scene-hit">
      {ring && <span className="absolute inset-0 rounded-full border border-white/70" data-testid="scene-info-ring" />}
    </span>
  );
};

// Birds/fish/ships/leaves travel horizontally at a constant rate (in % of the layer's
// width per second; resting fish pause on the way, see getRestStopMotion). A CSS
// animation moves each entity across the screen once at spawn time, so no per-frame `setState` is needed for movement; state only changes on spawn
// (adding an entry) and despawn (removing one, via `onAnimationEnd`).
// Birds, fish and boats: `speed` in BIRDS, FISH and BOATS.
const LEAF_RATE_PERCENT_PER_SEC = 6;
// A new boat at least every 55 s. The random part is re-rolled on every 500 ms check, so
// most gaps end within ~10 s of the minimum. A crossing takes 64-234 s (ROADMAP item 40),
// so 1-2 boats are out at once, never more than MAX_BOATS (on a phone; more on wide screens,
// items 70 and 93). At load the scene starts with its boats on the way (item 93, S1).
const BOAT_GAP_MIN_MS = 55000;
const BOAT_GAP_RANGE_MS = 60000;
const MAX_BOATS = 2; // item 93 (S2): it was 3
// A bird check every 8-12 s (ROADMAP item 74, C3; it was 3-5 s at twice the speed). At night
// the geese across the moon (W14) get a check every 30 s.
const BIRD_GAP_MIN_MS = 8000;
const BIRD_GAP_RANGE_MS = 4000;
const MOON_GEESE_GAP_MS = 30000;

// A fixed fallback seed date for callers that don't pass one (e.g. existing tests) -
// a stable constant, not `new Date()`, so it never changes identity across renders.
const DEFAULT_SEED_DATE = new Date(0);

interface MovingEntity {
  id: number;
  x: number; // starting left offset, in % of the layer width
  y: number; // top offset, in % of the layer height (fixed for the entity's lifetime)
  dx: number; // horizontal travel distance, in vw, applied via the CSS animation
  duration: number; // seconds
  delay?: number; // s, negative: a warm start (item 93, S1) begins part of the way across
  fadeIn?: boolean; // a warm start after the load fades in over 2 s (item 93)
}

// ROADMAP item 36: a mixed fleet at a random distance. `y` is the boat's bottom edge.
interface Boat extends MovingEntity {
  kind: BoatKind;
  depth: number; // 0 = near, 1 = far: far boats are smaller, paler and slower
  path?: ScenePath; // the lane plan (item 92), set at spawn
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
// The look (FS1, item 85) is SceneFish's; the shark and the dolphins are SceneVisitor's,
// where `size` is one animal's width.
type FishPattern = 'glide' | 'school' | 'companions' | 'rest' | 'pod';
const FISH: Record<FishKind, { size: number; speed: number; haze: number; pattern: FishPattern }> = {
  classic: { size: 20, speed: 1.15, haze: 0.3, pattern: 'companions' },
  minnow: { size: 10, speed: 1.2, haze: 0.1, pattern: 'school' },
  perch: { size: 22, speed: 1, haze: 0.35, pattern: 'companions' },
  pike: { size: 32, speed: 0.9, haze: 0.45, pattern: 'rest' },
  carp: { size: 26, speed: 0.7, haze: 0.65, pattern: 'glide' },
  catfish: { size: 34, speed: 0.5, haze: 0.85, pattern: 'glide' },
  trout: { size: 22, speed: 1.2, haze: 0, pattern: 'glide' },
  ray: { size: 30, speed: 0.7, haze: 0.75, pattern: 'glide' },
  turtle: { size: 26, speed: 0.55, haze: 0.5, pattern: 'rest' },
  jellyfish: { size: 18, speed: 0.4, haze: 0.3, pattern: 'glide' },
  seahorse: { size: 18, speed: 0.4, haze: 0.4, pattern: 'glide' },
  whale: { size: 72, speed: 0.4, haze: 0.8, pattern: 'glide' },
  pufferfish: { size: 20, speed: 0.45, haze: 0.4, pattern: 'rest' },
  // Night only (ROADMAP item 65).
  burbot: { size: 30, speed: 0.55, haze: 0, pattern: 'glide' },
  eel: { size: 36, speed: 0.65, haze: 0, pattern: 'glide' },
  lanternfish: { size: 16, speed: 1, haze: 0, pattern: 'companions' },
  anglerfish: { size: 26, speed: 0.4, haze: 0, pattern: 'rest' },
  squid: { size: 7, speed: 0.9, haze: 0, pattern: 'school' },
  // The rare sea visitors (item 85): at the surface, so no haze.
  shark: { size: 60, speed: 0.5, haze: 0, pattern: 'glide' },
  dolphins: { size: 40, speed: 0.7, haze: 0, pattern: 'pod' },
};
const VISITORS: FishKind[] = ['shark', 'dolphins'];
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
  curve?: [number, number][]; // the easing's points, for the lane plan (item 92)
  path?: ScenePath; // the lane plan (item 92), set at spawn
  school?: { left: number; top: number }[]; // P5: each minnow's offset in px
  companion?: { lag: number; dy: number }; // P6: a second fish, `lag` s behind, `dy` % lower
  rolls?: number[]; // DO1 (item 85): each dolphin's roll delay in s, 2 or 3 dolphins
}

// Builds one fish (ROADMAP item 62). `wet` = rain or drizzle, where fish swim deeper (E2).
// `night` = a night fish (item 65): in the moon tone or with its own light, no depth haze.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const createFish = (
  kind: FishKind, sunDown: boolean, wet: boolean, viewportWidth: number, random = Math.random, night = false,
): FishEntity => {
  const spec = FISH[kind];
  const light = night ? (GLOWING_AT_NIGHT.includes(kind) ? 'own' : 'moon') : undefined;
  const visitor = VISITORS.includes(kind);
  // P3: a random distance; the whale always passes far out, a shark or a pod at 0.3-1 (X6).
  const depth = kind === 'whale' ? 0.75 + random() * 0.25 : visitor ? 0.3 + random() * 0.7 : random();
  const nearness = 1 - FAR_SHRINK * depth;
  const size = Math.round(spec.size * nearness);
  let width = size;
  let height = size;
  let school: FishEntity['school'];
  let rolls: FishEntity['rolls'];
  if (visitor) {
    // DO1: a pod of 2 or 3 that roll one after the other, 1.5 s apart plus 0-0.6 s.
    if (spec.pattern === 'pod') rolls = Array.from({ length: random() < 0.5 ? 2 : 3 }, (_, i) => i * 1.5 + random() * 0.6);
    width = (size * ((rolls ? rolls.length - 1 : 0) * DOLPHIN_SPACING + VISITOR_GRID)) / VISITOR_GRID;
  }
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
    kind, depth, size, width, height, school, light, rolls,
    x: startX,
    // The whole water (item 71): far fish just below the horizon (67 % of the height), near
    // ones in the front (93 %), ±1 %. Before, all fish shared a 70-85 % band in the middle.
    // For a shark or a pod, `y` is the waterline (item 85).
    y: 67 + (1 - depth) * 26 + (random() - 0.5) * 2,
    dx,
    duration: rest ? rest.duration : dx / speed,
    easing: rest?.easing,
    curve: rest?.curve,
    // Paler with distance (P3), with depth (P9 haze) and in rain (E2). FS1 (item 85): 85 % by
    // day; at night moonlit fish at 75 % and fish with their own light at 95 % (the jellyfish
    // 60 %, item 82), without the depth haze. The sea visitors at 95 %, day and night.
    opacity: (visitor ? 0.95 : light === 'own' ? (kind === 'jellyfish' ? 0.6 : 0.95) : light ? 0.75 : 0.85) *
      (1 - 0.3 * depth) * (light ? 1 : 1 - 0.4 * spec.haze) * (wet ? 0.75 : 1),
    glow: sunDown && !night && !visitor && spec.pattern !== 'school' && random() < 0.35, // E1
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
  bat: { size: 24, speed: 2.5, group: 'one' }, // item 99 (BT2): smaller than a gull, as a real bat
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
  curve?: [number, number][]; // the easing's points, for the lane plan (item 92)
  path?: ScenePath; // the lane plan (item 92), set at spawn
  bob?: { amp: number; period: number; phase: number }; // item 99 (BT5): vh, s, 0-1 of a wave
}

// Builds one bird, group or bat (ROADMAP item 74). `y` is the centre line. `windFactor` slows
// birds in strong wind (item 10). `moonY` (W14): a V of geese at the moon's height, dark, so
// it shows only against the moon.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const createBird = (
  kind: FlyerKind, viewportWidth: number, windFactor = 1, random = Math.random, moonY?: number,
): BirdEntity => {
  const spec = BIRDS[kind];
  // M3: a random distance, bats too (item 99, BT1); the night geese pass at a fixed distance.
  const depth = moonY !== undefined ? 0.2 : spec.far ? 0.8 + random() * 0.2 : random();
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
    // (65 %). Bats too (item 99).
    y: moonY ?? 20 + depth * 30 + (random() - 0.5) * 4,
    dx,
    duration: hover ? hover.duration : dx / speed,
    easing: hover?.easing,
    curve: hover?.curve,
    // Bats in the birds' look (item 99); the night geese are dark at 90 %.
    opacity: moonY !== undefined ? 0.9 : 0.6 * (1 - 0.3 * depth),
    // BT5 slow bob (item 99): 1-2 % of the height, one wave per 3-4 s, from a random phase.
    bob: kind === 'bat' ? { amp: 1 + random(), period: 3 + random(), phase: random() } : undefined,
  };
};

// Sun below the horizon: bats instead of birds, and the boats show their lights.
const isSunDownAt = (timeOfDay: TimeOfDay): boolean =>
  timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' ||
  timeOfDay === 'nautical-twilight' || timeOfDay === 'civil-twilight';

// A boat's drawing scale (item 73): its hull length, smaller far out.
const boatScale = (ship: Boat): number => 1.4 * BOATS[ship.kind].scale * (1 - FAR_SHRINK * ship.depth);

// The things that cross the scene, in one object: a new fish plans its lane around the boats,
// and a new boat around the fish (ROADMAP item 92).
export interface SceneEntities {
  birds: BirdEntity[];
  fish: FishEntity[];
  ships: Boat[];
  leaves: MovingEntity[];
}

// The wall-clock time (ms) of each group's last spawn check that passed its gap, and the
// groups that showed at the last check (a group that starts fills at once, item 93).
export interface SpawnTimes {
  birds: number; fish: number; ships: number; leaves: number;
  shown?: { birds: boolean; fish: boolean; ships: boolean };
}

// What the spawn rules read from the props, the play state and the window.
export interface SpawnRules {
  weatherType: WeatherType;
  timeOfDay: TimeOfDay;
  windSpeedKmh: number | null;
  birdSpeedFactor: number; // strong wind slows the birds (item 10)
  showLeaves: boolean;
  isFullscreen: boolean;
  moonUp: boolean; // a pool of moonlight for the moonlit night fish (item 65, NR3)
  moonY: number | null; // the moon's height in % while it shows, for the night geese (item 74, W14)
  month: number;
  latitude: number;
  gapFactor: number; // 1/8 during time-travel play (item 83)
  rewind: boolean; // item 83: a new spawn starts at its end and swims back
  fishOverride: FishKind | null; // `?fish=` (item 85)
  density: number; // busy and quiet phases (item 93, S3): scales the limits and the chances, 0.3-1
  view: { width: number; height: number }; // the scene in px
}
type View = SpawnRules['view'];

// A thing's box for the lane plan (item 92), in % of the scene: `above` is how far the box
// reaches above the thing's `y`. `band` is the range of `y` for its type.
interface LaneShape {
  width: number;
  above: number;
  height: number;
  band: [number, number];
  lag?: number;
  curve?: [number, number][];
}
const percentOfWidth = (px: number, view: View) => (px / view.width) * 100;
const percentOfHeight = (px: number, view: View) => (px / view.height) * 100;

// Fish from 67 % (far) to 93 % of the height (near), ±1 % (item 71). For a shark or a pod, `y`
// is the waterline, and the box is SceneVisitor's whole svg: the fin above, the body below.
const FISH_BAND: [number, number] = [66, 94];
const fishLane = (fish: FishEntity, view: View, rewind: boolean): LaneShape => {
  if (fish.kind === 'shark' || fish.kind === 'dolphins') {
    const unit = fish.size / VISITOR_GRID;
    const above = fish.kind === 'shark' ? SHARK_ABOVE_WATER : DOLPHINS_ABOVE_WATER;
    return {
      width: percentOfWidth(fish.width, view),
      above: percentOfHeight(above * unit, view),
      height: percentOfHeight(VISITOR_VIEW_HEIGHT * unit, view),
      band: FISH_BAND,
    };
  }
  // A pair (P6): the second fish is `dy` % lower and `lag` s behind. A pair that spawns in
  // rewind swims side by side (item 83).
  const dy = fish.companion?.dy ?? 0;
  return {
    width: percentOfWidth(fish.width, view),
    above: Math.max(0, -dy),
    height: percentOfHeight(fish.height, view) + Math.abs(dy),
    band: FISH_BAND,
    lag: rewind ? undefined : fish.companion?.lag,
    curve: fish.curve,
  };
};

// Birds and bats (item 99) fly with their centre from 20 % (near) to 50 % of the height (far),
// ±2 % (item 74, M3). The night geese keep to the moon's height, ±2 %. A bat's bob (vh, about
// % of the height) widens its lane.
const BIRD_BAND: [number, number] = [18, 52];
const birdLane = (bird: BirdEntity, view: View, band = BIRD_BAND): LaneShape => ({
  width: percentOfWidth(bird.width, view),
  above: percentOfHeight(bird.height / 2, view) + (bird.bob?.amp ?? 0),
  height: percentOfHeight(bird.height, view) + 2 * (bird.bob?.amp ?? 0),
  band,
  curve: bird.curve,
});

// A boat: the hull above the waterline `y`, and the mirror image below it at its calm height,
// the tallest (items 73 and 79). The waterline band is 67-87 % (94 % in fullscreen).
const BOAT_MIRROR = getBoatReflection(0).heightPercent / 100;
const boatLane = (ship: Boat, view: View, isFullscreen: boolean): LaneShape => {
  const hull = percentOfHeight(BOAT_HEIGHT_PX * boatScale(ship), view);
  return {
    width: percentOfWidth(BOAT_WIDTH_PX * boatScale(ship), view),
    above: hull,
    height: hull * (1 + BOAT_MIRROR),
    band: [67, isFullscreen ? 94 : 87],
  };
};

const pathsOf = (...groups: { path?: ScenePath }[][]): ScenePath[] =>
  groups.flatMap(group => group.flatMap(item => (item.path ? [item.path] : [])));

// One check of the spawn loop (every 500 ms): a new bird, fish, boat or leaf when its gap has
// passed and its chance comes up, and an empty group when the weather or the time no longer
// has it. Item 92: a new fish, bird or boat takes a free lane (findLane): fish check against
// the fish and the boats, boats against the boats (and the fish when they can), birds against
// all flyers. With no free lane it does not spawn, and the next check tries again. Item 93: the limits and the
// chances are scaled by `rules.density` (S3); when a group starts (at load, or when the weather
// or the time lets it back), it fills to its limit at once, part of the way across (S1, warm
// start). `now` is the wall clock (ms) for the gaps, `sceneTime` the scene clock (s) for the
// lanes. The check moves `last` on and returns `scene` itself when no list changes, so no
// render follows (P-4). The simulation test runs it with a seeded `random`, and with `lane` =
// the random pick for the rate without plan.
// eslint-disable-next-line react-refresh/only-export-components -- exported for the simulation test
export const spawnTick = (
  scene: SceneEntities, last: SpawnTimes, rules: SpawnRules, now: number, sceneTime: number,
  random: () => number = Math.random, lane: typeof findLane = findLane,
): SceneEntities => {
  const { weatherType, timeOfDay, windSpeedKmh, gapFactor, month, latitude, moonY, view, rewind, density } = rules;
  let { birds, fish, ships, leaves } = scene;
  const isSunDown = isSunDownAt(timeOfDay);

  // The new thing's path on the scene clock, at the free height nearest its random pick, or
  // null. In rewind (item 83) a new thing starts at its end, so its crossing began a duration
  // ago, and all of it is still to come. A warm start (item 93, S1) begins `progress` of the
  // way across: its crossing began progress × duration ago, and the negative animation-delay
  // puts it there (also on the rest-stop curve, which CSS applies to the progress).
  // At load the scene's reveal covers the warm start. A group that starts later (after a storm,
  // at dawn) fades in, so its animals do not pop up mid-scene.
  const atLoad = last.shown === undefined;
  const place = <T extends MovingEntity>(
    item: T, shape: LaneShape, others: ScenePath[], progress = 0,
  ): (T & { path: ScenePath }) | null => {
    const start = rewind ? sceneTime - item.duration : sceneTime - progress * item.duration;
    const path: ScenePath = {
      start, duration: item.duration, x: item.x, dx: item.dx, curve: shape.curve, lag: shape.lag,
      width: shape.width, y: item.y - shape.above, height: shape.height,
    };
    const band: [number, number] = [shape.band[0] - shape.above, shape.band[1] - shape.above];
    const y = lane({ ...path, band, view }, others, rewind ? start : sceneTime);
    if (y === null) return null;
    return {
      ...item, y: y + shape.above, path: { ...path, y },
      ...(progress > 0 && { delay: -progress * item.duration, fadeIn: !atLoad }),
    };
  };

  // Warm start (S1): only live, not during time-travel play (item 83), where the gaps are 8x
  // shorter and fill the scene anyway. `shown` keeps which groups showed at the last check.
  const warm = gapFactor === 1 && !rewind;
  const shown: Partial<NonNullable<SpawnTimes['shown']>> = last.shown ?? {};
  // Adds new ones until the group has `limit`, each at a random progress of 0.1-0.9. A pick
  // with no free lane (or no fish for the light) is skipped; the tries stop after 4 per place.
  const fill = (count: () => number, limit: number, add: (progress: number) => void) => {
    for (let tries = 0; count() < limit && tries < 4 * limit; tries++) add(0.1 + random() * 0.8);
  };

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

  if (shouldShowBirds) {
    // At most four birds or groups (C3), 1.5x on wide screens (items 70 and 93). Far birds first.
    const limit = getSceneLimit(MAX_BIRDS, view.width, density);
    const makeBird = (progress: number) => {
      const kind = isSunDown ? 'bat' : pickBird(random(), month, latitude, timeOfDay === 'evening');
      const next = createBird(kind, view.width, rules.birdSpeedFactor, random);
      return place(next, birdLane(next, view), pathsOf(birds), progress);
    };
    if (warm && !shown.birds) {
      fill(() => birds.length, limit, progress => {
        const placed = makeBird(progress);
        if (placed) birds = [...birds, placed];
      });
      birds = [...birds].sort((a, b) => b.depth - a.depth);
      last.birds = now;
    } else if (now - last.birds > (BIRD_GAP_MIN_MS + random() * BIRD_GAP_RANGE_MS) * gapFactor) {
      let noLane = false;
      // 70 %, a third more in the hour before sunset, when the gulls fly to their roost (C2).
      if (random() < (timeOfDay === 'evening' ? 0.93 : 0.7) * density) {
        if (birds.length < limit) {
          const placed = makeBird(0);
          if (placed) birds = [...birds, placed].sort((a, b) => b.depth - a.depth);
          noLane = !placed;
        }
      }
      if (!noLane) last.birds = now;
    }
  } else if (shouldShowMoonGeese) {
    // The twilight bats fly on. One V at a time, about every four minutes.
    if (now - last.birds > MOON_GEESE_GAP_MS * gapFactor) {
      let noLane = false;
      if (random() < 0.12) {
        const next = createBird('geese', view.width, rules.birdSpeedFactor, random, moonY);
        if (!birds.some(b => b.kind === 'geese')) {
          const placed = place(next, birdLane(next, view, [moonY - 2, moonY + 2]), pathsOf(birds));
          if (placed) birds = [...birds, placed];
          noLane = !placed;
        }
      }
      if (!noLane) last.birds = now;
    }
  } else if (birds.length > 0) {
    birds = [];
  }

  // At the switch between day and night fish, the fish on screen swim on (item 65).
  if (shouldShowFish || shouldShowNightFish) {
    // At most three fish, two at night (item 93), 1.5x on wide screens. Far fish first, so a
    // near fish swims in front.
    const limit = getSceneLimit(shouldShowNightFish ? MAX_NIGHT_FISH : MAX_FISH, view.width, density);
    // undefined: no fish for the light (NR3); null: no free lane.
    const makeFish = (progress: number) => {
      let newFish: FishEntity | undefined;
      if (shouldShowNightFish) {
        const pick = rules.fishOverride ?? pickNightFish(random());
        const kind = pick === 'moonlit' ? pickMoonlitDayFish(random()) : pick;
        // Fish lit by the moon need the pool of moonlight (NR3), the sea visitors too (X5).
        if (GLOWING_AT_NIGHT.includes(kind) || rules.moonUp) {
          newFish = createFish(kind, false, wetForFish, view.width, random, true);
        }
      } else {
        newFish = createFish(rules.fishOverride ?? pickFish(random()), isSunDown, wetForFish, view.width, random);
      }
      return newFish && place(newFish, fishLane(newFish, view, rewind), pathsOf(fish, ships), progress);
    };
    if (warm && !shown.fish) {
      fill(() => fish.length, limit, progress => {
        const placed = makeFish(progress);
        if (placed) fish = [...fish, placed];
      });
      fish = [...fish].sort((a, b) => b.depth - a.depth);
      last.fish = now;
    } else {
      // A quiet night (NR1): a check every 15-25 s instead of every 5-8 s.
      const gapMs = (shouldShowNightFish ? 15000 + random() * 10000 : 5000 + random() * 3000) * gapFactor;
      if (now - last.fish > gapMs) {
        let noLane = false;
        if (random() < (wetForFish ? 0.35 : 0.7) * density) { // 70% chance, half of it in rain (E2)
          if (canSpawnFish(fish.map(f => f.kind), limit)) {
            const placed = makeFish(0);
            if (placed) fish = [...fish, placed].sort((a, b) => b.depth - a.depth);
            noLane = placed === null; // no fish for the light (NR3): the gap moves on
          }
        }
        if (!noLane) last.fish = now;
      }
    }
  } else if (fish.length > 0) {
    fish = [];
  }

  if (shouldShowShips) {
    // At most two boats (item 93), 1.5x on wide screens. Far boats first, so a near boat
    // always sails in front of a far one.
    const limit = getSceneLimit(MAX_BOATS, view.width, density);
    const makeShip = (progress: number) => {
      const startX = -8;
      const endX = 108;
      // More boats far out (item 71): the square root makes 44 % of them sail in the
      // farthest quarter, small and pale near the horizon, and fewer big ones mid-water.
      const depth = Math.sqrt(random());
      const kind = pickBoat(weatherType, windSpeedKmh, random());
      const newShip: Boat = {
        id: Date.now() + Math.random(),
        x: startX,
        // Far boats sit at the horizon (65%). Near ones sail down to 87%, just above the
        // music player, or to 94% in fullscreen.
        y: 67 + (1 - depth) * (rules.isFullscreen ? 27 : 20),
        dx: endX - startX,
        // Wide screens: the phone's pixels per second (item 66).
        duration: (endX - startX) / (BOATS[kind].speed * (1 - FAR_SHRINK * depth) * getWaterSpeedFactor(view.width)),
        kind,
        depth,
      };
      // Boats have the right of way (Lutz, 2026-10-05: "the fish should avoid the boats not the
      // other way round"): a lane clear of the fish when there is one, else any lane clear of
      // the boats. The fish never stop a boat; new fish plan around it.
      const shape = boatLane(newShip, view, rules.isFullscreen);
      return place(newShip, shape, pathsOf(ships, fish), progress) ?? place(newShip, shape, pathsOf(ships), progress);
    };
    if (warm && !shown.ships) {
      fill(() => ships.length, limit, progress => {
        const placed = makeShip(progress);
        if (placed) ships = [...ships, placed];
      });
      ships = [...ships].sort((a, b) => b.depth - a.depth);
      last.ships = now;
    } else if (now - last.ships > (BOAT_GAP_MIN_MS + random() * BOAT_GAP_RANGE_MS) * gapFactor) {
      let noLane = false;
      if (random() < 0.9 * density) { // 90% chance to spawn
        if (ships.length < limit) {
          const placed = makeShip(0);
          if (placed) ships = [...ships, placed].sort((a, b) => b.depth - a.depth);
          noLane = !placed;
        }
      }
      if (!noLane) last.ships = now;
    }
  } else if (ships.length > 0) {
    ships = [];
  }
  last.shown = { birds: shouldShowBirds, fish: shouldShowFish || shouldShowNightFish, ships: shouldShowShips };

  if (rules.showLeaves) {
    if (now - last.leaves > (4000 + random() * 4000) * gapFactor) {
      if (random() < 0.6) { // 60% chance to spawn
        const startX = -5;
        const endX = 105;
        leaves = [...leaves, {
          id: Date.now() + Math.random(),
          x: startX,
          y: 40 + random() * 40,
          dx: endX - startX,
          duration: (endX - startX) / LEAF_RATE_PERCENT_PER_SEC,
        }];
      }
      last.leaves = now;
    }
  } else if (leaves.length > 0) {
    leaves = [];
  }

  return birds === scene.birds && fish === scene.fish && ships === scene.ships && leaves === scene.leaves
    ? scene
    : { birds, fish, ships, leaves };
};

// A warm start after the load (item 93): the opacity from 0 to the element's own, over 2 s.
const FADE_IN = ', sceneFadeIn 2s ease-out';
// Only the end of the crossing removes a thing: not its fade-in (item 93), and not a dolphin's
// roll (item 85), an animation inside whose animationend bubbles up (e.g. when a play rate runs it backwards).
const endsCrossing = (event: React.AnimationEvent): boolean =>
  event.target === event.currentTarget && event.animationName === 'moveAcrossX';

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
  cloudLayers = null,
  windSpeedKmh = null,
  windDirectionDeg = null,
  rainMmH = null,
  isFullscreen = false,
  moonlight = null,
  moon = null,
  playDirection = 0,
  sun = null,
  skyGradient = null,
  cloudEgg = false,
  sunTimes = null,
  warmStart = true,
  onInfo,
  infoRing = null,
}) => {
  // The things that cross the scene. The state renders them; the ref has the latest lists at
  // once, so the spawn loop plans each new lane around all of them (item 92), also around one
  // that spawned in the same check.
  const [entities, setEntities] = useState<SceneEntities>({ birds: [], fish: [], ships: [], leaves: [] });
  const entitiesRef = useRef(entities);
  const updateEntities = useCallback((change: (prev: SceneEntities) => SceneEntities) => {
    const next = change(entitiesRef.current);
    if (next === entitiesRef.current) return;
    entitiesRef.current = next;
    setEntities(next);
  }, []);
  const { birds, fish, ships, leaves } = entities;

  // Spawn-timing refs (not movement — movement is CSS now). Seeded with a placeholder
  // and set to the real mount time in an effect (Date.now() is impure, so it can't be
  // called during render); the 500ms spawn-check loop below doesn't start reading these
  // until after that effect has run.
  const lastSpawnTimeRef = useRef<SpawnTimes>({ birds: 0, fish: 0, ships: 0, leaves: 0 });
  useEffect(() => {
    const now = Date.now();
    lastSpawnTimeRef.current = {
      birds: now, fish: now, ships: now - BOAT_GAP_MIN_MS + 5000, leaves: now,
      // Without the warm start, the groups count as shown, so they do not fill at once.
      shown: warmStart ? undefined : { birds: true, fish: true, ships: true },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only at mount
  }, []);
  const prefersReducedMotion = usePrefersReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  useScenePlaybackRate(sceneRef, playDirection);
  // The scene clock (item 92) follows the play rate of the scene's animations (item 83), so the
  // lanes hold during time-travel play.
  const sceneClockRef = useRef(LIVE_SCENE_CLOCK);
  useEffect(() => {
    sceneClockRef.current = setSceneRate(sceneClockRef.current, Date.now(), getScenePlaybackRate(playDirection));
  }, [playDirection]);
  // During play the spawn gaps shrink by the play factor (item 83), so the scene does not empty.
  const gapFactor = getSpawnGapFactor(playDirection);
  // Test override (item 85): `?fish=shark` makes every fish spawn a shark.
  const [fishOverride] = useState(() => getFishOverride(window.location.search));
  // Busy and quiet phases (item 93, S3). In a ref, so the spawn loop does not restart each
  // time the date ticks.
  const density = sunTimes ? getSceneDensity(date, sunTimes, getDaySeed(date, latitude, longitude)) : 1;
  const densityRef = useRef(density);
  useEffect(() => { densityRef.current = density; }, [density]);

  // Wind/temperature-driven scene decisions (ROADMAP item 10): strong wind slows birds
  // and adds a few leaves. tempC/sunAltitude aren't known here and don't affect either
  // field, so they're passed as neutral placeholders.
  const effects = useMemo(
    () => getWeatherEffects({ type: weatherType, windKmh: windSpeedKmh, tempC: null, sunAltitude: 0 }),
    [weatherType, windSpeedKmh]
  );

  const precipSlantPx = getPrecipitationSlantPx(windSpeedKmh, windDirectionDeg);

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

  const isSunDown = isSunDownAt(timeOfDay);
  const boatTone = getBoatTone(timeOfDay);
  const seaWindKmh = getSeaWindKmh(windSpeedKmh, weatherType); // the boats' reflection (item 79, X2)
  // The line leaves keep the old ship tone.
  const lineInk = timeOfDay === 'night' ? 'text-gray-300/60' : 'text-gray-600/80';

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
  // clears each group when the weather/time no longer supports it (spawnTick). This is the
  // only place that adds entities — once per spawn or clear, never per animation frame.
  // Movement itself happens via the CSS animation applied to each entity below (see the
  // `moveAcrossX` keyframes), driven by `onAnimationEnd` for off-screen removal.
  useEffect(() => {
    // Reduced motion: skip spawning birds, fish, ships and leaves entirely (static sky).
    if (prefersReducedMotion) return;
    const rules: Omit<SpawnRules, 'view' | 'density'> = {
      weatherType, timeOfDay, windSpeedKmh, isFullscreen, moonUp, moonY, month, latitude, gapFactor, fishOverride,
      birdSpeedFactor: effects.birdSpeedFactor,
      showLeaves: effects.showLeaves,
      rewind: playDirection < 0,
    };

    const spawnCheck = () => {
      const now = Date.now();
      const view = { width: window.innerWidth, height: window.innerHeight };
      updateEntities(prev => spawnTick(
        prev, lastSpawnTimeRef.current, { ...rules, view, density: densityRef.current }, now, getSceneTime(sceneClockRef.current, now),
      ));
    };

    // A check at once, so a group that starts (at load, item 93) fills before the first interval.
    spawnCheck();
    const intervalId = setInterval(spawnCheck, 500 * gapFactor);

    return () => {
      clearInterval(intervalId);
    };
  }, [weatherType, windSpeedKmh, timeOfDay, prefersReducedMotion, isFullscreen, effects.showLeaves, effects.birdSpeedFactor, moonUp, month, latitude, moonY, gapFactor, playDirection, fishOverride, updateEntities]);

  // Item 95: a moving thing takes taps only on its wrapper and hit area (pointer only, hidden
  // from screen readers); the scene layer itself stays pointer-events-none.
  const tappable = (target: SceneInfoTarget, ring: string) => onInfo ? {
    'aria-hidden': true,
    className: 'absolute pointer-events-auto cursor-pointer',
    onClick: (event: React.MouseEvent) => onInfo(target, { x: event.clientX, y: event.clientY }, ring),
  } : { className: 'absolute' };

  // One fish, or a pair (P6): the companion swims `lag` s behind and leaves last, so its
  // onAnimationEnd removes the pair. FS1 silhouettes (item 85) by SceneFish; night fish
  // (item 65) are in the moon tone or carry their lights. A shark or a dolphin pod by SceneVisitor.
  const renderFish = (fishItem: FishEntity) => {
    const { kind } = fishItem;
    // A jellyfish or a squid with its own light: a soft halo in its glow colour (the jellyfish
    // 2 px, item 82; the squid 3 px).
    const halo = fishItem.light === 'own' && (kind === 'jellyfish' || kind === 'squid')
      ? `drop-shadow(0 0 ${kind === 'jellyfish' ? 2 : 3}px hsl(var(--scene-fish-${kind === 'jellyfish' ? 'jellyfish-glow' : 'squid'})))`
      : undefined;
    const remove = () => updateEntities(prev => ({ ...prev, fish: prev.fish.filter(f => f.id !== fishItem.id) }));
    const body = kind === 'shark' || kind === 'dolphins' ? (
      <SceneVisitor
        kind={kind}
        tone={fishItem.light === 'moon' ? 'moon' : boatTone === 'day' ? 'day' : 'dusk'}
        width={fishItem.width}
        rolls={fishItem.rolls}
      />
    ) : fishItem.school ? (
      <div className="relative" style={{ width: fishItem.width, height: fishItem.height }}>
        {fishItem.school.map((spot, i) => (
          <SceneFish
            key={i}
            kind={kind}
            light={fishItem.light}
            size={fishItem.size}
            className="absolute"
            style={{ left: spot.left, top: spot.top }}
          />
        ))}
      </div>
    ) : (
      <SceneFish kind={kind} light={fishItem.light} size={fishItem.size} glow={fishItem.glow} />
    );
    // The hit area: a shark's or a pod's box reaches above the waterline `y` (item 85).
    const visitorUnit = fishItem.size / VISITOR_GRID;
    const hitBox = kind === 'shark' || kind === 'dolphins'
      ? {
          cx: fishItem.width / 2,
          cy: (VISITOR_VIEW_HEIGHT / 2 - (kind === 'shark' ? SHARK_ABOVE_WATER : DOLPHINS_ABOVE_WATER)) * visitorUnit,
          width: fishItem.width,
          height: VISITOR_VIEW_HEIGHT * visitorUnit,
        }
      : { cx: fishItem.width / 2, cy: fishItem.height / 2, width: fishItem.width, height: fishItem.height };
    const swimmer = (key: string, lag: number, dy: number, removes: boolean) => (
      <div
        key={key}
        {...tappable({ type: 'fish', kind }, `fish-${fishItem.id}-${key}`)}
        style={{
          left: `${fishItem.x}%`,
          top: `${fishItem.y + dy}%`,
          zIndex: 5,
          opacity: fishItem.opacity,
          filter: halo,
          ['--dx' as string]: `${fishItem.dx}vw`,
          animation: `moveAcrossX ${fishItem.duration}s linear ${lag + (fishItem.delay ?? 0)}s forwards${fishItem.fadeIn ? FADE_IN : ''}`,
          // Rest stop (P8). A browser without CSS linear() ignores it and glides straight. Set
          // only with a stop: React writes undefined as '', which wipes the shorthand's `linear`
          // and leaves CSS's default `ease` (item 74 found this).
          ...(fishItem.easing && { animationTimingFunction: fishItem.fadeIn ? `${fishItem.easing}, ease-out` : fishItem.easing }),
        }}
        // Only the crossing's own end: the dolphins' roll (item 85) is an animation inside, and
        // its animationend bubbles up here (e.g. when a play rate runs it backwards).
        onAnimationEnd={removes ? (event => { if (endsCrossing(event)) remove(); }) : undefined}
      >
        {body}
        {onInfo && <HitArea {...hitBox} ring={infoRing === `fish-${fishItem.id}-${key}`} />}
      </div>
    );
    return fishItem.companion ? (
      <React.Fragment key={fishItem.id}>
        {/* In rewind the lead leaves last (item 83). */}
        {swimmer('lead', 0, 0, playDirection < 0)}
        {swimmer('companion', fishItem.companion.lag, fishItem.companion.dy, playDirection >= 0)}
      </React.Fragment>
    ) : swimmer(String(fishItem.id), 0, 0, true);
  };

  return (
    <div
      ref={sceneRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ ['--slant' as string]: `${precipSlantPx}px` }}
    >
      <div data-testid="iceberg" />
      {/* Clouds by type (ROADMAP item 84), with the overcast veil and their shadows on the sea. */}
      <SkyClouds
        weatherType={weatherType}
        timeOfDay={timeOfDay}
        date={date}
        latitude={latitude}
        longitude={longitude}
        cloudLayers={cloudLayers}
        windDirectionDeg={windDirectionDeg}
        sun={sun}
        moon={moon}
        skyGradient={skyGradient}
        egg={cloudEgg}
        onInfo={onInfo}
        infoRing={infoRing}
      />

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
          actual bounce. Snow and hail keep live speed during play, as the rain (item 83). */}
      {hailPellets.map((pellet) => (
        <div
          key={pellet.id}
          data-live-speed
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
          data-live-speed
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
          {...tappable({ type: 'bird', kind: bird.kind }, `bird-${bird.id}`)}
          style={{
            left: `${bird.x}%`,
            top: `${bird.y}%`,
            zIndex: 10,
            opacity: bird.opacity,
            color: 'hsl(var(--scene-critter-silhouette))',
            ['--dx' as string]: `${bird.dx}vw`,
            animation: `moveAcrossX ${bird.duration}s linear ${bird.delay ?? 0}s forwards${bird.fadeIn ? FADE_IN : ''}`,
            // Hang in the wind (M8), set only with a stop, as for the fish.
            ...(bird.easing && { animationTimingFunction: bird.fadeIn ? `${bird.easing}, ease-out` : bird.easing }),
          }}
          onAnimationEnd={event => { if (endsCrossing(event)) updateEntities(prev => ({ ...prev, birds: prev.birds.filter(b => b.id !== bird.id) })); }}
        >
          <div className="relative" style={{ width: bird.width, height: bird.height, transform: 'translateY(-50%)' }}>
            {bird.kind === 'bat' ? (
              <Bat
                size={bird.size}
                strokeWidth={0.6}
                fill="currentColor"
                data-testid="scene-bat"
                style={bird.bob && {
                  ['--bob' as string]: `${bird.bob.amp}vh`,
                  animation: `batBob ${bird.bob.period / 2}s ease-in-out ${-bird.bob.phase * bird.bob.period}s infinite alternate`,
                }}
              />
            ) : bird.group ? bird.group.map((spot, i) => (
              <SceneBird key={i} kind={bird.kind as BirdKind} width={bird.size} className="absolute" style={{ left: spot.left, top: spot.top }} />
            )) : (
              <SceneBird kind={bird.kind} width={bird.size} />
            )}
            {onInfo && <HitArea cx={bird.width / 2} cy={bird.height / 2} width={bird.width} height={bird.height} ring={infoRing === `bird-${bird.id}`} />}
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
        const nearness = 1 - FAR_SHRINK * ship.depth;
        return (
          <div
            key={ship.id}
            {...tappable({ type: 'boat', kind: ship.kind }, `boat-${ship.id}`)}
            style={{
              left: `${ship.x}%`,
              top: `${ship.y}%`,
              zIndex: 7,
              opacity: nearness,
              ['--dx' as string]: `${ship.dx}vw`,
              animation: `moveAcrossX ${ship.duration}s linear ${ship.delay ?? 0}s forwards${ship.fadeIn ? FADE_IN : ''}`,
            }}
            onAnimationEnd={event => { if (endsCrossing(event)) updateEntities(prev => ({ ...prev, ships: prev.ships.filter(s => s.id !== ship.id) })); }}
          >
            {/* Scale from the bottom-left corner, then lift by the boat's height, so `top` is the waterline. */}
            <div style={{ transform: `translateY(-100%) scale(${boatScale(ship)})`, transformOrigin: 'bottom left' }}>
              <SceneBoat kind={ship.kind} tone={boatTone} lit={isSunDown} wake={hasBoatWake(ship.kind, windSpeedKmh)} seaWindKmh={seaWindKmh} />
            </div>
            {/* The hull sits above the waterline `top` (item 95's hit area). */}
            {onInfo && (
              <HitArea
                cx={(BOAT_WIDTH_PX * boatScale(ship)) / 2}
                cy={-(BOAT_HEIGHT_PX * boatScale(ship)) / 2}
                width={BOAT_WIDTH_PX * boatScale(ship)}
                height={BOAT_HEIGHT_PX * boatScale(ship)}
                ring={infoRing === `boat-${ship.id}`}
              />
            )}
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
          onAnimationEnd={() => updateEntities(prev => ({ ...prev, leaves: prev.leaves.filter(l => l.id !== leaf.id) }))}
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

        @keyframes batBob {
          from {
            transform: translateY(calc(-1 * var(--bob)));
          }
          to {
            transform: translateY(var(--bob));
          }
        }

        @keyframes sceneFadeIn {
          from {
            opacity: 0;
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
      `}</style>
    </div>
  );
};

export default CloudLayer;
