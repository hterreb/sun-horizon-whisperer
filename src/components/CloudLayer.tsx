import React, { useEffect, useState, useRef } from 'react';
import { Bird, Fish } from 'lucide-react';
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
  const [raindrops, setRaindrops] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  const [snowflakes, setSnowflakes] = useState<Array<{id: number, x: number, y: number, size: number, delay: number}>>([]);

  // Animation refs
  const animationFrameRef = useRef<number>();
  const lastSpawnTimeRef = useRef({ birds: 0, fish: 0 });
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
        break;
      case 'cloudy':
        newClouds = Array.from({ length: 6 }, (_, i) => ({
          id: i,
          x: 15 + (i * 15),
          y: 20 + (i % 3) * 15,
          scale: 0.5 + (i * 0.2)
        }));
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
        break;
      case 'snow':
        newClouds = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          x: 10 + (i * 12),
          y: 15 + (i % 3) * 12,
          scale: 0.6 + (i * 0.15)
        }));
        break;
    }
    
    setClouds(newClouds);

    // Generate weather effects
    if (weatherType === 'rain' || weatherType === 'storm') {
      const newRaindrops = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 50,
        delay: Math.random() * 2
      }));
      setRaindrops(newRaindrops);
    } else {
      setRaindrops([]);
    }

    if (weatherType === 'snow') {
      const newSnowflakes = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 50,
        size: 0.5 + Math.random() * 1.5,
        delay: Math.random() * 3
      }));
      setSnowflakes(newSnowflakes);
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
        const shouldShowBirds = weatherType === 'clear' || weatherType === 'cloudy';
        const shouldShowFish = weatherType === 'clear';

        debugLog(`Animation frame - Birds visible: ${shouldShowBirds}, Fish visible: ${shouldShowFish}`);

        // Bird spawning and movement
        if (shouldShowBirds) {
          // Spawn birds every 5-8 seconds
          if (currentTime - lastSpawnTimeRef.current.birds > 5000 + Math.random() * 3000) {
            if (Math.random() < 0.7) { // 70% chance to spawn
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

          // Move birds
          setBirds(prevBirds => {
            const updated = prevBirds
              .map(bird => ({
                ...bird,
                x: bird.x + 0.8 // Faster movement
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
          // Spawn fish every 8-12 seconds
          if (currentTime - lastSpawnTimeRef.current.fish > 8000 + Math.random() * 4000) {
            if (Math.random() < 0.5) { // 50% chance to spawn
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

          // Move fish
          setFish(prevFish => {
            const updated = prevFish
              .map(fish => ({
                ...fish,
                x: fish.x + 0.4 // Moderate movement speed
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
          // Clear fish if weather doesn't support them
          setFish(prev => {
            if (prev.length > 0) {
              debugLog('Clearing fish due to weather change');
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
  }, [weatherType]);

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

  debugLog(`Rendering - Birds: ${birds.length}, Fish: ${fish.length}`);

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
          className="absolute w-0.5 bg-blue-300 opacity-60 animate-pulse"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            height: weatherType === 'storm' ? '20px' : '15px',
            animationDelay: `${drop.delay}s`,
            animation: `fall ${weatherType === 'storm' ? '0.5s' : '0.8s'} linear infinite`
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
            animation: 'snowfall 3s linear infinite'
          }}
        >
          ❄
        </div>
      ))}

      {/* Birds */}
      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute"
          style={{
            left: `${bird.x}%`,
            top: `${bird.y}%`,
            transform: 'scale(0.8)',
            transition: 'none',
            zIndex: 10
          }}
        >
          <Bird 
            size={20} 
            className={`transition-colors duration-1000 ${
              timeOfDay === 'night' ? 'text-white text-opacity-40' : 'text-black text-opacity-60'
            }`}
          />
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
            transform: 'scale(0.6)',
            transition: 'none',
            zIndex: 5
          }}
        >
          <Fish 
            size={18} 
            className={`transition-colors duration-1000 ${
              timeOfDay === 'night' ? 'text-blue-200 text-opacity-50' : 'text-blue-400 text-opacity-70'
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
            transform: translateY(100vh) translateX(10px);
          }
        }
      `}</style>
    </div>
  );
};

export default CloudLayer;
