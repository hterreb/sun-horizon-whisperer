
import React, { useEffect, useState } from 'react';
import { type TimeOfDay } from '../utils/sunUtils';

interface CloudLayerProps {
  timeOfDay: TimeOfDay;
}

const CloudLayer: React.FC<CloudLayerProps> = ({ timeOfDay }) => {
  const [clouds, setClouds] = useState<Array<{id: number, x: number, scale: number}>>([]);
  const [birds, setBirds] = useState<Array<{id: number, x: number, y: number}>>([]);

  useEffect(() => {
    // Generate static clouds with fixed positions
    const newClouds = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 15 + (i * 15), // Evenly distributed across the sky
      scale: 0.5 + Math.random() * 1
    }));
    setClouds(newClouds);

    // Occasionally add birds for ambient movement
    const birdInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        const newBird = {
          id: Date.now(),
          x: -10,
          y: 20 + Math.random() * 30
        };
        setBirds(prev => [...prev, newBird]);
      }
    }, 5000);

    // Animate birds only
    const birdAnimationInterval = setInterval(() => {
      setBirds(prevBirds => 
        prevBirds
          .map(bird => ({
            ...bird,
            x: bird.x + 0.3
          }))
          .filter(bird => bird.x < 110)
      );
    }, 50);

    return () => {
      clearInterval(birdInterval);
      clearInterval(birdAnimationInterval);
    };
  }, []);

  const getCloudColor = () => {
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
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute"
          style={{
            left: `${cloud.x}%`,
            top: `${20 + Math.random() * 30}%`,
            transform: `scale(${cloud.scale})`,
            opacity: 0.8
          }}
        >
          <svg
            width="120"
            height="60"
            viewBox="0 0 120 60"
            fill="none"
            className="transition-colors duration-[5000ms]"
          >
            <path
              d="M20 40 Q30 20 45 35 Q60 10 75 30 Q90 20 100 35 Q110 45 95 50 Q85 60 60 55 Q35 60 25 50 Q15 45 20 40Z"
              fill={getCloudColor()}
            />
          </svg>
        </div>
      ))}

      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute transition-transform duration-[3000ms]"
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
