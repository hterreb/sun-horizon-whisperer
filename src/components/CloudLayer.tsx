import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Fish } from 'lucide-react';
import { Ship } from 'lucide-react';
import { type TimeOfDay } from '../utils/sunUtils';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export type WeatherType = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'snow';

interface CloudLayerProps {
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
}

// Birds/fish/ships travel horizontally at a constant rate (in % of the layer's width
// per second). A CSS animation moves each entity across the screen once at spawn time,
// so no per-frame `setState` is needed for movement; state only changes on spawn
// (adding an entry) and despawn (removing one, via `onAnimationEnd`).
const BIRD_RATE_PERCENT_PER_SEC = 5; // was 0.08%/16ms in the old rAF loop
const WATER_RATE_PERCENT_PER_SEC = 2.5; // was 0.04%/16ms in the old rAF loop (fish + ships)

interface MovingEntity {
  id: number;
  x: number; // starting left offset, in % of the layer width
  y: number; // top offset, in % of the layer height (fixed for the entity's lifetime)
  dx: number; // horizontal travel distance, in vw, applied via the CSS animation
  duration: number; // seconds
}

// Deterministic pseudo-random value in [0, 1), seeded by an integer. Lets raindrop/
// snowflake layouts be derived during render (pure, no `Math.random()`) while still
// looking randomly scattered; the classic fract(sin(x)) trick.
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const debugLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    console.log(`[CloudLayer Debug] ${message}`, data || '');
  }
};

const CloudLayer: React.FC<CloudLayerProps> = ({ timeOfDay, weatherType }) => {
  const [birds, setBirds] = useState<MovingEntity[]>([]);
  const [fish, setFish] = useState<MovingEntity[]>([]);
  const [ships, setShips] = useState<MovingEntity[]>([]);

  // Spawn-timing refs (not movement — movement is CSS now). Seeded with a placeholder
  // and set to the real mount time in an effect (Date.now() is impure, so it can't be
  // called during render); the 500ms spawn-check loop below doesn't start reading these
  // until after that effect has run.
  const lastSpawnTimeRef = useRef({ birds: 0, fish: 0, ships: 0 });
  useEffect(() => {
    const now = Date.now();
    lastSpawnTimeRef.current = { birds: now, fish: now, ships: now };
  }, []);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Clouds are fully derived from `weatherType` (deterministic, no randomness), so
  // they're computed during render instead of synced into state via an effect.
  const clouds = useMemo(() => {
    let newClouds: Array<{id: number, x: number, y: number, scale: number}> = [];

    switch (weatherType) {
      case 'clear':
        newClouds = []; // No clouds for clear weather
        debugLog('Clear weather - no clouds generated');
        break;
      case 'cloudy':
        newClouds = Array.from({ length: 6 }, (_, i) => ({
          id: i,
          x: 15 + (i * 15),
          y: 20 + (i % 3) * 15,
          scale: 0.5 + (i * 0.2)
        }));
        debugLog(`Cloudy weather - generated ${newClouds.length} clouds`);
        break;
      case 'overcast':
      case 'rain':
      case 'storm':
        newClouds = Array.from({ length: 12 }, (_, i) => ({
          id: i,
          x: 5 + (i * 8),
          y: 10 + (i % 4) * 10,
          scale: 0.8 + (i * 0.1)
        }));
        debugLog(`${weatherType} weather - generated ${newClouds.length} clouds`);
        break;
      case 'snow':
        newClouds = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: 10 + (i * 12),
          y: 15 + (i % 3) * 12,
          scale: 0.6 + (i * 0.15)
        }));
        debugLog(`Snow weather - generated ${newClouds.length} clouds`);
        break;
    }

    return newClouds;
  }, [weatherType]);

  // Raindrops/snowflakes look randomly scattered but only need to change when the
  // weather changes, so they're derived with a stable seed rather than `Math.random()`
  // (impure) inside an effect + setState.
  const raindrops = useMemo(() => {
    if (weatherType !== 'rain' && weatherType !== 'storm') return [];
    const newRaindrops = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: seededRandom(i * 3 + 1) * 100,
      y: -10 - seededRandom(i * 3 + 2) * 100,
      delay: seededRandom(i * 3 + 3) * 5
    }));
    debugLog(`Generated ${newRaindrops.length} raindrops`);
    return newRaindrops;
  }, [weatherType]);

  const snowflakes = useMemo(() => {
    if (weatherType !== 'snow') return [];
    const newSnowflakes = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: seededRandom(i * 4 + 1) * 100,
      y: -10 - seededRandom(i * 4 + 2) * 100,
      size: 0.5 + seededRandom(i * 4 + 3) * 1.5,
      delay: seededRandom(i * 4 + 4) * 8
    }));
    debugLog(`Generated ${newSnowflakes.length} snowflakes`);
    return newSnowflakes;
  }, [weatherType]);

  // Determine if it's night time (for showing different colored birds)
  const isNightTime = timeOfDay === 'night' ||
                      timeOfDay === 'astronomical-twilight' ||
                      timeOfDay === 'nautical-twilight';

  // Spawn loop: periodically checks whether a new bird/fish/ship is due, and clears
  // each group when the weather/time no longer supports it. This is the only place
  // that calls `setBirds`/`setFish`/`setShips` — once per spawn or clear, never per
  // animation frame. Movement itself happens via the CSS animation applied to each
  // entity below (see the `moveAcrossX` keyframes), driven by `onAnimationEnd` for
  // off-screen removal.
  useEffect(() => {
    // Reduced motion: skip spawning birds, fish and ships entirely (static sky).
    if (prefersReducedMotion) return;

    const shouldShowBirds = weatherType === 'clear' || weatherType === 'cloudy' || weatherType === 'overcast';
    const shouldShowFish = (weatherType === 'clear' || weatherType === 'cloudy' || weatherType === 'overcast' || weatherType === 'rain') &&
                          timeOfDay !== 'night' &&
                          timeOfDay !== 'astronomical-twilight' &&
                          timeOfDay !== 'nautical-twilight';
    const shouldShowShips = weatherType !== 'storm';

    const spawnTick = () => {
      const currentTime = Date.now();

      if (shouldShowBirds) {
        if (currentTime - lastSpawnTimeRef.current.birds > 3000 + Math.random() * 2000) {
          if (Math.random() < 0.8) { // 80% chance to spawn
            // Dynamically calculate the off-screen start position for the bird
            const birdSvgWidth = 300; // px
            const birdScale = isNightTime ? 0.5 : 0.3;
            const scaledBirdWidth = birdSvgWidth * birdScale;
            const viewportWidth = window.innerWidth;
            const startX = -(scaledBirdWidth / viewportWidth) * 100;
            const endX = 110;
            const newBird: MovingEntity = {
              id: Date.now() + Math.random(),
              x: startX,
              y: 20 + Math.random() * 30,
              dx: endX - startX,
              duration: (endX - startX) / BIRD_RATE_PERCENT_PER_SEC,
            };
            debugLog('Spawning new bird', newBird);
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
              duration: (endX - startX) / WATER_RATE_PERCENT_PER_SEC,
            };
            debugLog('Spawning new fish', newFish);
            setFish(prev => [...prev, newFish]);
          }
          lastSpawnTimeRef.current.fish = currentTime;
        }
      } else {
        setFish(prev => (prev.length > 0 ? [] : prev));
      }

      if (shouldShowShips) {
        if (currentTime - lastSpawnTimeRef.current.ships > 120000 + Math.random() * 120000) {
          if (Math.random() < 0.9) { // 90% chance to spawn
            const startX = -8;
            const endX = 108;
            const newShip: MovingEntity = {
              id: Date.now() + Math.random(),
              x: startX,
              y: 65 + Math.random() * 5,
              dx: endX - startX,
              duration: (endX - startX) / WATER_RATE_PERCENT_PER_SEC,
            };
            debugLog('Spawning new ship', newShip);
            setShips(prev => [...prev, newShip]);
          }
          lastSpawnTimeRef.current.ships = currentTime;
        }
      } else {
        setShips(prev => (prev.length > 0 ? [] : prev));
      }
    };

    const intervalId = setInterval(spawnTick, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [weatherType, timeOfDay, prefersReducedMotion, isNightTime]);

  const getCloudColor = () => {
    switch(weatherType) {
      case 'clear':
        return 'transparent';
      case 'storm':
        return timeOfDay === 'night'
          ? 'rgba(20, 20, 25, 0.9)'
          : 'rgba(60, 60, 70, 0.95)';
      case 'rain':
        return timeOfDay === 'night'
          ? 'rgba(40, 40, 50, 0.8)'
          : 'rgba(100, 100, 110, 0.85)';
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
      default:
        switch(timeOfDay) {
          case 'dawn':
            return 'rgba(255, 198, 161, 0.6)';
          case 'morning':
          case 'evening':
            return 'rgba(254, 198, 161, 0.7)';
          case 'night':
            return 'rgba(26, 31, 44, 0.4)';
          case 'astronomical-twilight':
          case 'nautical-twilight':
            return 'rgba(34, 31, 38, 0.5)';
          default:
            return 'rgba(255, 255, 255, 0.8)';
        }
    }
  };

  const getOvercastLayer = () => {
    if (weatherType === 'clear') return null;

    const intensity = weatherType === 'storm' ? 0.8 :
                     weatherType === 'rain' ? 0.7 :
                     weatherType === 'overcast' ? 0.6 : 0.3;

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

  debugLog(`Rendering - Birds: ${birds.length}, Fish: ${fish.length}, Ships: ${ships.length}, Clouds: ${clouds.length}`);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div data-testid="iceberg" />
      {getOvercastLayer()}

      {/* Clouds */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute transition-colors duration-[5000ms]"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            transform: `scale(${cloud.scale})`,
            opacity: weatherType === 'storm' ? 0.9 : 0.8
          }}
        >
          <svg
            width="120"
            height="60"
            viewBox="0 0 120 60"
            fill="none"
          >
            <path
              d={weatherType === 'storm' || weatherType === 'rain' || weatherType === 'overcast'
                ? "M0 35 Q30 15 60 30 Q90 10 120 25 Q120 50 90 55 Q60 60 30 55 Q0 50 0 35Z"
                : "M20 40 Q30 20 45 35 Q60 10 75 30 Q90 20 100 35 Q110 45 95 50 Q85 60 60 55 Q35 60 25 50 Q15 45 20 40Z"
              }
              fill={getCloudColor()}
              className="transition-colors duration-[5000ms]"
            />
          </svg>
        </div>
      ))}

      {/* Rain drops */}
      {raindrops.map((drop) => (
        <div
          key={drop.id}
          className="absolute w-0.5 bg-blue-300 opacity-60"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            height: weatherType === 'storm' ? '20px' : '15px',
            animationDelay: `${drop.delay}s`,
            animation: `fall ${weatherType === 'storm' ? '2s' : '2.5s'} linear infinite`
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
          <div style={{ transform: `${isNightTime ? 'scale(0.5)' : 'scale(0.3)'} translateX(-100%)` }}>
            {isNightTime ? (
              <div className="text-4xl">🦇</div>
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
                    fill="rgba(0, 0, 0, 0.6)"
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
          <div style={{ transform: 'scale(1.2)' }}>
            <Fish
              size={36}
              className={`transition-colors duration-1000 ${
                timeOfDay === 'night' ? 'text-blue-200 text-opacity-50' : 'text-blue-400 text-opacity-70'
              }`}
            />
          </div>
        </div>
      ))}

      {/* Ships */}
      {ships.map((ship) => (
        <div
          key={ship.id}
          className="absolute"
          style={{
            left: `${ship.x}%`,
            top: `${ship.y}%`,
            zIndex: 7,
            ['--dx' as string]: `${ship.dx}vw`,
            animation: `moveAcrossX ${ship.duration}s linear forwards`,
          }}
          onAnimationEnd={() => setShips(prev => prev.filter(s => s.id !== ship.id))}
        >
          <div style={{ transform: 'scale(1.4)' }}>
            <Ship
              size={48}
              className={`transition-colors duration-1000 ${
                timeOfDay === 'night' ? 'text-gray-300 text-opacity-60' : 'text-gray-600 text-opacity-80'
              }`}
            />
          </div>
        </div>
      ))}

      {/* CSS animations for weather effects and entity movement */}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh);
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
      `}</style>
    </div>
  );
};

export default CloudLayer;
