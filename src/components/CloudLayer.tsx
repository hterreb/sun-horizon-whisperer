import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Fish, Leaf, Sailboat, type LucideIcon } from 'lucide-react';
import { Bat, FishingBoat, Freighter, LakeFerry, Rowboat } from './sceneIcons';
import { type TimeOfDay } from '../utils/sunUtils';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import {
  getCloudLayout,
  getCloudOpacity,
  getCloudDriftDurationSec,
  getCloudDriftDirection,
  getPrecipitationSlantPx,
} from '../utils/cloudLayoutUtils';
import { getWeatherEffects, pickBoat, type BoatKind } from '../utils/weatherEffectsUtils';

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
  // Fullscreen fades the chrome away, so near boats can sail lower.
  isFullscreen?: boolean;
}

// Birds/fish/ships/leaves travel horizontally at a constant rate (in % of the layer's
// width per second). A CSS animation moves each entity across the screen once at spawn
// time, so no per-frame `setState` is needed for movement; state only changes on spawn
// (adding an entry) and despawn (removing one, via `onAnimationEnd`).
const BIRD_RATE_PERCENT_PER_SEC = 5; // was 0.08%/16ms in the old rAF loop
const FISH_RATE_PERCENT_PER_SEC = 2.5; // was 0.04%/16ms in the old rAF loop. Boats: `speed` in BOATS.
const LEAF_RATE_PERCENT_PER_SEC = 6;
// A new boat at least every 55 s. The random part is re-rolled on every 500 ms check, so
// most gaps end within ~10 s of the minimum. A crossing takes 64-234 s (ROADMAP item 40),
// so 1-2 boats are out at once, never more than MAX_BOATS. The first sails out ~5 s after load.
const BOAT_GAP_MIN_MS = 55000;
const BOAT_GAP_RANGE_MS = 60000;
const MAX_BOATS = 3;

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

// `lights` are the boat's warm lights after sunset, in the icon's 24 px grid. `speed` is a
// near boat's rate in % of the layer width per second (ROADMAP item 40): each type its own.
const BOATS: Record<BoatKind, { Icon: LucideIcon; scale: number; speed: number; lights: [number, number][] }> = {
  sailboat: { Icon: Sailboat, scale: 0.95, speed: 1.2, lights: [[10, 2]] },
  ferry: { Icon: LakeFerry, scale: 1.2, speed: 1.8, lights: [[8, 13], [12, 13], [16, 13]] },
  fishing: { Icon: FishingBoat, scale: 0.95, speed: 1.5, lights: [[15, 3], [7.5, 11]] },
  rowboat: { Icon: Rowboat, scale: 0.7, speed: 0.9, lights: [[19.5, 14.5]] },
  freighter: { Icon: Freighter, scale: 1.5, speed: 1.3, lights: [[5, 6.5], [5.25, 11]] },
};
const FAR_SHRINK = 0.45; // the farthest boat is 55% of the size, opacity and speed of the nearest

// Deterministic pseudo-random value in [0, 1), seeded by an integer. Lets raindrop/
// snowflake/hail layouts be derived during render (pure, no `Math.random()`) while
// still looking randomly scattered; the classic fract(sin(x)) trick.
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const PRECIP_COUNT: Partial<Record<WeatherType, number>> = {
  drizzle: 35,
  rain: 80,
  storm: 100,
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
  isFullscreen = false,
}) => {
  const [birds, setBirds] = useState<MovingEntity[]>([]);
  const [fish, setFish] = useState<MovingEntity[]>([]);
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

  // Raindrops/drizzle/hail look randomly scattered but only need to change when the
  // weather changes, so they're derived with a stable seed rather than `Math.random()`
  // (impure) inside an effect + setState.
  const precipDrops = useMemo(() => {
    if (weatherType !== 'rain' && weatherType !== 'storm' && weatherType !== 'drizzle') return [];
    const count = PRECIP_COUNT[weatherType] ?? 60;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: seededRandom(i * 3 + 1) * 100,
      y: -10 - seededRandom(i * 3 + 2) * 100,
      delay: seededRandom(i * 3 + 3) * 5
    }));
  }, [weatherType]);

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
  // Line icons (boats, leaves) share today's ship tone.
  const lineInk = timeOfDay === 'night' ? 'text-gray-300 text-opacity-60' : 'text-gray-600 text-opacity-80';

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
    const shouldShowBirds = (weatherType === 'clear' || weatherType === 'partly' ||
                          weatherType === 'cloudy' || weatherType === 'overcast') &&
                          timeOfDay !== 'night';
    const shouldShowFish = (weatherType === 'clear' || weatherType === 'partly' || weatherType === 'cloudy' ||
                          weatherType === 'overcast' || weatherType === 'rain' || weatherType === 'drizzle') &&
                          timeOfDay !== 'night' &&
                          timeOfDay !== 'astronomical-twilight' &&
                          timeOfDay !== 'nautical-twilight';
    const shouldShowShips = weatherType !== 'storm' && weatherType !== 'hail';

    const spawnTick = () => {
      const currentTime = Date.now();

      if (shouldShowBirds) {
        if (currentTime - lastSpawnTimeRef.current.birds > 3000 + Math.random() * 2000) {
          if (Math.random() < 0.8) { // 80% chance to spawn
            // Dynamically calculate the off-screen start position for the bird
            const birdSvgWidth = 300; // px
            const birdScale = isSunDown ? 0.5 : 0.3;
            const scaledBirdWidth = birdSvgWidth * birdScale;
            const viewportWidth = window.innerWidth;
            const startX = -(scaledBirdWidth / viewportWidth) * 100;
            const endX = 110;
            const newBird: MovingEntity = {
              id: Date.now() + Math.random(),
              x: startX,
              y: 20 + Math.random() * 30,
              dx: endX - startX,
              duration: (endX - startX) / (BIRD_RATE_PERCENT_PER_SEC * effects.birdSpeedFactor),
            };
            setBirds(prev => [...prev, newBird]);
          }
          lastSpawnTimeRef.current.birds = currentTime;
        }
      } else {
        setBirds(prev => (prev.length > 0 ? [] : prev));
      }

      if (shouldShowFish) {
        if (currentTime - lastSpawnTimeRef.current.fish > 5000 + Math.random() * 3000) {
          if (Math.random() < 0.7) { // 70% chance to spawn
            const startX = -5;
            const endX = 105;
            const newFish: MovingEntity = {
              id: Date.now() + Math.random(),
              x: startX,
              y: 70 + Math.random() * 15,
              dx: endX - startX,
              duration: (endX - startX) / FISH_RATE_PERCENT_PER_SEC,
            };
            setFish(prev => [...prev, newFish]);
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
            const depth = Math.random();
            const kind = pickBoat(weatherType, windSpeedKmh, Math.random());
            const newShip: Boat = {
              id: Date.now() + Math.random(),
              x: startX,
              // Far boats sit at the horizon (65%). Near ones sail down to 87%, just above the
              // music player, or to 94% in fullscreen.
              y: 67 + (1 - depth) * (isFullscreen ? 27 : 20),
              dx: endX - startX,
              duration: (endX - startX) / (BOATS[kind].speed * (1 - FAR_SHRINK * depth)),
              kind,
              depth,
            };
            // Far boats first, so a near boat always sails in front of a far one.
            setShips(prev => (prev.length >= MAX_BOATS ? prev : [...prev, newShip].sort((a, b) => b.depth - a.depth)));
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
  }, [weatherType, windSpeedKmh, timeOfDay, prefersReducedMotion, isSunDown, isFullscreen, effects.showLeaves, effects.birdSpeedFactor]);

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

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ ['--slant' as string]: `${precipSlantPx}px` }}
    >
      <div data-testid="iceberg" />
      {getOvercastLayer()}

      {/* Clouds: count/opacity from cloud_cover, drift from wind, positions from a
          seeded layout stable for the day/place (see cloudLayoutUtils.getCloudLayout). */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute transition-colors duration-[5000ms]"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
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
              d={isFlatCloudWeather
                ? "M0 35 Q30 15 60 30 Q90 10 120 25 Q120 50 90 55 Q60 60 30 55 Q0 50 0 35Z"
                : "M20 40 Q30 20 45 35 Q60 10 75 30 Q90 20 100 35 Q110 45 95 50 Q85 60 60 55 Q35 60 25 50 Q15 45 20 40Z"
              }
              fill={getCloudColor()}
              className="transition-colors duration-[5000ms]"
            />
          </svg>
        </div>
      ))}

      {/* Rain/drizzle drops - drizzle is thinner, shorter and fainter than rain/storm,
          all slanted sideways by `--slant` (from wind, see getPrecipitationSlantPx). */}
      {precipDrops.map((drop) => (
        <div
          key={drop.id}
          className={`absolute bg-blue-300 ${weatherType === 'drizzle' ? 'w-px opacity-40' : 'w-0.5 opacity-60'}`}
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            height: weatherType === 'drizzle' ? '8px' : weatherType === 'storm' ? '20px' : '15px',
            animationDelay: `${drop.delay}s`,
            animation: `fall ${weatherType === 'drizzle' ? '3s' : weatherType === 'storm' ? '2s' : '2.5s'} linear infinite`
          }}
        />
      ))}

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
            animationDelay: `${pellet.delay}s`,
            animation: 'hailFall 1.8s linear infinite'
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
            animationDelay: `${flake.delay}s`,
            animation: 'snowfall 6s linear infinite'
          }}
        >
          ❄
        </div>
      ))}

      {/* Birds (or bats at night) — each spawns once and travels via the
          `moveAcrossX` CSS animation; onAnimationEnd removes it (off-screen). */}
      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute"
          style={{
            left: `${bird.x}%`,
            top: `${bird.y}%`,
            zIndex: 10,
            ['--dx' as string]: `${bird.dx}vw`,
            animation: `moveAcrossX ${bird.duration}s linear forwards`,
          }}
          onAnimationEnd={() => setBirds(prev => prev.filter(b => b.id !== bird.id))}
        >
          <div style={{ transform: `${isSunDown ? 'scale(0.5)' : 'scale(0.3)'} translateX(-100%)` }}>
            {isSunDown ? (
              <Bat size={76} strokeWidth={1.5} className="text-gray-300 text-opacity-60" data-testid="scene-bat" />
            ) : (
              <svg
                version="1.1"
                id="Capa_1"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                x="0px"
                y="0px"
                viewBox="0 0 300 60"
                xmlSpace="preserve"
                width="300"
                height="60"
                className="transition-colors duration-1000"
              >
                <g>
                  <path
                    d="M94.51,37.677c0.606,0.254,1.313,0.05,1.702-0.492c7.256-10.366,20.402-13.103,34.655-10.466
                    c8.789,1.622,16.164,6.439,21.22,13.003c7.066-4.324,15.686-6.186,24.484-4.559c14.253,2.633,25.539,9.888,28.625,22.165
                    c0.159,0.643,0.747,1.086,1.403,1.06c0.657-0.019,1.215-0.497,1.334-1.149c3.503-18.931-9.008-37.12-27.939-40.618
                    c-8.798-1.623-17.407,0.233-24.475,4.558c-5.056-6.564-12.441-11.381-21.229-13.003c-18.941-3.499-37.125,9.012-40.629,27.948
                    C93.544,36.776,93.892,37.424,94.51,37.677z"
                    fill="hsl(var(--scene-critter-silhouette) / 0.6)"
                  />
                </g>
              </svg>
            )}
          </div>
        </div>
      ))}

      {/* Fish */}
      {fish.map((fishItem) => (
        <div
          key={fishItem.id}
          className="absolute"
          style={{
            left: `${fishItem.x}%`,
            top: `${fishItem.y}%`,
            zIndex: 5,
            ['--dx' as string]: `${fishItem.dx}vw`,
            animation: `moveAcrossX ${fishItem.duration}s linear forwards`,
          }}
          onAnimationEnd={() => setFish(prev => prev.filter(f => f.id !== fishItem.id))}
        >
          <Fish
            size={20}
            data-testid="scene-fish"
            className={`transition-colors duration-1000 ${
              timeOfDay === 'night' ? 'text-blue-200 text-opacity-50' : 'text-blue-400 text-opacity-70'
            }`}
          />
        </div>
      ))}

      {/* Boats (ROADMAP item 36) */}
      {ships.map((ship) => {
        const { Icon, scale, lights } = BOATS[ship.kind];
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
            {/* Scale from the bottom-left corner, then lift by the icon's height, so `top` is the waterline. */}
            <div style={{ transform: `translateY(-100%) scale(${1.4 * scale * nearness})`, transformOrigin: 'bottom left' }}>
              <Icon size={48} className={`transition-colors duration-1000 ${lineInk}`} data-testid="scene-boat" data-kind={ship.kind}>
                {isSunDown && lights.map(([cx, cy]) => (
                  <circle
                    key={`${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={1.1}
                    stroke="none"
                    className="fill-brand-gold-light"
                    style={{ filter: 'drop-shadow(0 0 2px hsl(var(--brand-gold)))' }}
                    data-testid="boat-light"
                  />
                ))}
              </Icon>
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
        @keyframes fall {
          to {
            transform: translate(var(--slant, 0px), 100vh);
          }
        }

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
