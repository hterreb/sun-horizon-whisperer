
import React, { useEffect, useState, useRef } from 'react';
import { Fish } from 'lucide-react';
import { Ship } from 'lucide-react';
import { type TimeOfDay } from '../utils/sunUtils';

export type WeatherType = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'snow';

interface CloudLayerProps {
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
}

const CloudLayer: React.FC<CloudLayerProps> = ({ timeOfDay, weatherType }) => {
  const [clouds, setClouds] = useState<Array<{id: number, x: number, y: number, scale: number}>>([]);
  const [birds, setBirds] = useState<Array<{id: number, x: number, y: number}>>([]);
  const [fish, setFish] = useState<Array<{id: number, x: number, y: number}>>([]);
  const [ships, setShips] = useState<Array<{id: number, x: number, y: number}>>([]);
  const [raindrops, setRaindrops] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const [snowflakes, setSnowflakes] = useState<Array<{id: number, x: number, y: number, size: number, delay: number}>>([]);

  // Animation refs
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef({ birds: 0, fish: 0, ships: 0 });
  const lastUpdateTimeRef = useRef(0);

  // Debug function
  const debugLog = (message: string, data?: any) => {
    console.log(`[CloudLayer Debug] ${message}`, data || '');
  };

  useEffect(() => {
    debugLog(`Weather changed to: ${weatherType}`);
    
    // Generate clouds based on weather type
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
    
    setClouds(newClouds);

    // Generate weather effects
    if (weatherType === 'rain' || weatherType === 'storm') {
      const newRaindrops = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 100,
        delay: Math.random() * 5
      }));
      setRaindrops(newRaindrops);
      debugLog(`Generated ${newRaindrops.length} raindrops`);
    } else {
      setRaindrops([]);
    }

    if (weatherType === 'snow') {
      const newSnowflakes = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 100,
        size: 0.5 + Math.random() * 1.5,
        delay: Math.random() * 8
      }));
      setSnowflakes(newSnowflakes);
      debugLog(`Generated ${newSnowflakes.length} snowflakes`);
    } else {
      setSnowflakes([]);
    }
  }, [weatherType]);

  // Main animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastUpdateTimeRef.current;
      
      // Only update if enough time has passed (60fps throttle)
      if (deltaTime >= 16) {
        // Make birds and fish visible in more weather conditions
        const shouldShowBirds = weatherType === 'clear' || weatherType === 'cloudy' || weatherType === 'overcast';
        // Fish should not appear during night time periods
        const shouldShowFish = (weatherType === 'clear' || weatherType === 'cloudy' || weatherType === 'overcast') &&
                              timeOfDay !== 'night' && 
                              timeOfDay !== 'astronomical-twilight' && 
                              timeOfDay !== 'nautical-twilight';
        // Ships should be visible in most weather conditions except storms
        const shouldShowShips = weatherType !== 'storm';

        debugLog(`Animation frame - Birds visible: ${shouldShowBirds}, Fish visible: ${shouldShowFish}, Ships visible: ${shouldShowShips}, Weather: ${weatherType}, Time: ${timeOfDay}`);

        // Bird spawning and movement
        if (shouldShowBirds) {
          // Spawn birds every 3-5 seconds
          if (currentTime - lastSpawnTimeRef.current.birds > 3000 + Math.random() * 2000) {
            if (Math.random() < 0.8) { // 80% chance to spawn
              const newBird = {
                id: Date.now() + Math.random(),
                x: -10,
                y: 20 + Math.random() * 30
              };
              debugLog('Spawning new bird', newBird);
              setBirds(prev => {
                const updated = [...prev, newBird];
                debugLog(`Birds count after spawn: ${updated.length}`);
                return updated;
              });
            }
            lastSpawnTimeRef.current.birds = currentTime;
          }

          // Move birds (reduced speed from 0.3 to 0.15)
          setBirds(prevBirds => {
            const updated = prevBirds
              .map(bird => ({
                ...bird,
                x: bird.x + 0.15 // Reduced from 0.3 (half speed)
              }))
              .filter(bird => {
                const keep = bird.x < 110;
                if (!keep) debugLog('Removing bird that went off screen', bird);
                return keep;
              });
            
            if (updated.length !== prevBirds.length) {
              debugLog(`Birds count after movement: ${updated.length}`);
            }
            return updated;
          });
        } else {
          // Clear birds if weather doesn't support them
          setBirds(prev => {
            if (prev.length > 0) {
              debugLog('Clearing birds due to weather change');
              return [];
            }
            return prev;
          });
        }

        // Fish spawning and movement
        if (shouldShowFish) {
          // Spawn fish every 5-8 seconds
          if (currentTime - lastSpawnTimeRef.current.fish > 5000 + Math.random() * 3000) {
            if (Math.random() < 0.7) { // 70% chance to spawn
              const newFish = {
                id: Date.now() + Math.random(),
                x: -5,
                y: 70 + Math.random() * 15
              };
              debugLog('Spawning new fish', newFish);
              setFish(prev => {
                const updated = [...prev, newFish];
                debugLog(`Fish count after spawn: ${updated.length}`);
                return updated;
              });
            }
            lastSpawnTimeRef.current.fish = currentTime;
          }

          // Move fish (reduced speed from 0.15 to 0.075)
          setFish(prevFish => {
            const updated = prevFish
              .map(fish => ({
                ...fish,
                x: fish.x + 0.075 // Reduced from 0.15 (half speed)
              }))
              .filter(fish => {
                const keep = fish.x < 105;
                if (!keep) debugLog('Removing fish that went off screen', fish);
                return keep;
              });
            
            if (updated.length !== prevFish.length) {
              debugLog(`Fish count after movement: ${updated.length}`);
            }
            return updated;
          });
        } else {
          // Clear fish if weather or time doesn't support them
          setFish(prev => {
            if (prev.length > 0) {
              debugLog('Clearing fish due to weather or time change');
              return [];
            }
            return prev;
          });
        }

        // Ship spawning and movement
        if (shouldShowShips) {
          // Spawn ships every 2-4 minutes (120-240 seconds)
          if (currentTime - lastSpawnTimeRef.current.ships > 120000 + Math.random() * 120000) {
            if (Math.random() < 0.9) { // 90% chance to spawn
              const newShip = {
                id: Date.now() + Math.random(),
                x: -8,
                y: 65 + Math.random() * 5 // Ships sail on the water surface
              };
              debugLog('Spawning new ship', newShip);
              setShips(prev => {
                const updated = [...prev, newShip];
                debugLog(`Ships count after spawn: ${updated.length}`);
                return updated;
              });
            }
            lastSpawnTimeRef.current.ships = currentTime;
          }

          // Move ships (reduced speed from 0.08 to 0.04)
          setShips(prevShips => {
            const updated = prevShips
              .map(ship => ({
                ...ship,
                x: ship.x + 0.04 // Reduced from 0.08 (half speed)
              }))
              .filter(ship => {
                const keep = ship.x < 108;
                if (!keep) debugLog('Removing ship that went off screen', ship);
                return keep;
              });
            
            if (updated.length !== prevShips.length) {
              debugLog(`Ships count after movement: ${updated.length}`);
            }
            return updated;
          });
        } else {
          // Clear ships if weather doesn't support them
          setShips(prev => {
            if (prev.length > 0) {
              debugLog('Clearing ships due to weather change');
              return [];
            }
            return prev;
          });
        }

        lastUpdateTimeRef.current = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    debugLog('Starting animation loop');
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        debugLog('Stopping animation loop');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [weatherType, timeOfDay]);

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
          case 'dusk':
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
          case 'dusk':
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

  // Determine if it's night time (for showing different colored birds)
  const isNightTime = timeOfDay === 'night' || 
                      timeOfDay === 'astronomical-twilight' || 
                      timeOfDay === 'nautical-twilight';

  debugLog(`Rendering - Birds: ${birds.length}, Fish: ${fish.length}, Ships: ${ships.length}, Clouds: ${clouds.length}`);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      {/* Birds with custom SVG */}
      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute"
          style={{
            left: `${bird.x}%`,
            top: `${bird.y}%`,
            transform: 'scale(0.3)',
            zIndex: 10
          }}
        >
          <svg
            version="1.1"
            id="Capa_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 300 60"
            style={{ enableBackground: 'new 0 0 0 0' }}
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
                fill={isNightTime ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'}
              />
            </g>
          </svg>
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
            transform: 'scale(1.2)',
            zIndex: 5
          }}
        >
          <Fish 
            size={36} 
            className={`transition-colors duration-1000 ${
              timeOfDay === 'night' ? 'text-blue-200 text-opacity-50' : 'text-blue-400 text-opacity-70'
            }`}
          />
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
            transform: 'scale(1.4)',
            zIndex: 6
          }}
        >
          <Ship 
            size={48} 
            className={`transition-colors duration-1000 ${
              timeOfDay === 'night' ? 'text-gray-300 text-opacity-60' : 'text-gray-600 text-opacity-80'
            }`}
          />
        </div>
      ))}

      {/* CSS animations for weather effects */}
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
      `}</style>
    </div>
  );
};

export default CloudLayer;
