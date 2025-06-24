
import React, { useEffect, useState } from 'react';
import { type TimeOfDay } from '../utils/sunUtils';

interface CloudLayerProps {
  timeOfDay: TimeOfDay;
}

const CloudLayer: React.FC<CloudLayerProps> = ({ timeOfDay }) => {
  const [clouds, setClouds] = useState<Array<{id: number, x: number, y: number, scale: number}>>([]);
  const [birds, setBirds] = useState<Array<{id: number, x: number, y: number}>>([]);
  const [isOvercast] = useState(true); // Set to true to show overcast conditions

  useEffect(() => {
    if (isOvercast) {
      // Generate more clouds with broader coverage for overcast conditions
      const newClouds = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 5 + (i * 8), // More densely packed clouds
        y: 10 + (i % 4) * 10, // Multiple layers
        scale: 0.8 + (i * 0.1) // Larger, more uniform clouds
      }));
      setClouds(newClouds);
    } else {
      // Original scattered cloud pattern
      const newClouds = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: 15 + (i * 15),
        y: 20 + (i % 3) * 15,
        scale: 0.5 + (i * 0.2)
      }));
      setClouds(newClouds);
    }

    // Very occasionally add birds for minimal ambient movement
    const birdInterval = setInterval(() => {
      if (Math.random() < 0.05) {
        const newBird = {
          id: Date.now(),
          x: -10,
          y: 20 + Math.random() * 30
        };
        setBirds(prev => [...prev, newBird]);
      }
    }, 10000);

    const birdAnimationInterval = setInterval(() => {
      setBirds(prevBirds => 
        prevBirds
          .map(bird => ({
            ...bird,
            x: bird.x + 0.1
          }))
          .filter(bird => bird.x < 110)
      );
    }, 200);

    return () => {
      clearInterval(birdInterval);
      clearInterval(birdAnimationInterval);
    };
  }, [isOvercast]);

  const getCloudColor = () => {
    if (isOvercast) {
      // More muted, gray tones for overcast conditions
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
    } else {
      // Original cloud colors
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
    if (!isOvercast) return null;
    
    return (
      <div 
        className="absolute inset-0 transition-colors duration-[5000ms]"
        style={{
          background: `linear-gradient(to bottom, ${getCloudColor()} 0%, transparent 40%)`,
          opacity: 0.6
        }}
      />
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {getOvercastLayer()}
      
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute transition-colors duration-[5000ms]"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            transform: `scale(${cloud.scale})`,
            opacity: isOvercast ? 0.7 : 0.8
          }}
        >
          <svg
            width="120"
            height="60"
            viewBox="0 0 120 60"
            fill="none"
          >
            <path
              d={isOvercast 
                ? "M0 35 Q30 15 60 30 Q90 10 120 25 Q120 50 90 55 Q60 60 30 55 Q0 50 0 35Z"
                : "M20 40 Q30 20 45 35 Q60 10 75 30 Q90 20 100 35 Q110 45 95 50 Q85 60 60 55 Q35 60 25 50 Q15 45 20 40Z"
              }
              fill={getCloudColor()}
              className="transition-colors duration-[5000ms]"
            />
          </svg>
        </div>
      ))}

      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute transition-transform duration-[8000ms]"
          style={{
            left: `${bird.x}%`,
            top: `${bird.y}%`,
            transform: 'scale(0.7)'
          }}
        >
          <svg
            width="20"
            height="12"
            viewBox="0 0 20 12"
            fill="none"
            className="transition-colors duration-1000"
          >
            <path
              d="M2 6 Q5 3 10 6 Q15 3 18 6 M10 6 L10 8"
              stroke={timeOfDay === 'night' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

export default CloudLayer;
