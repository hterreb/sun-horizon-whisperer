
import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { type SunPosition, type TimeOfDay } from '../utils/sunUtils';

interface SunVisualizationProps {
  sunPosition: SunPosition;
  timeOfDay: TimeOfDay;
}

const SunVisualization: React.FC<SunVisualizationProps> = ({ sunPosition, timeOfDay }) => {
  const [svgPath, setSvgPath] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update SVG path based on container dimensions
  useEffect(() => {
    if (containerDimensions.width > 0 && containerDimensions.height > 0) {
      // Create a horizion line path
      const width = containerDimensions.width;
      const height = containerDimensions.height;
      const horizonY = height * 0.6; // 60% from the top
      
      // Add some small hills/mountains for visual interest
      let path = `M0,${horizonY} `;
      
      // Number of hills
      const hillCount = Math.ceil(width / 100);
      const segmentWidth = width / hillCount;
      
      for (let i = 0; i < hillCount; i++) {
        const x1 = i * segmentWidth;
        const x2 = (i + 0.5) * segmentWidth;
        const x3 = (i + 1) * segmentWidth;
        
        // Random hill heights
        const hillHeight = Math.random() * 20 + 10;
        const y1 = horizonY;
        const y2 = horizonY - hillHeight;
        const y3 = horizonY;
        
        path += `L${x1},${y1} Q${x2},${y2} ${x3},${y3} `;
      }
      
      path += `L${width},${horizonY} L${width},${height} L0,${height} Z`;
      setSvgPath(path);
    }
  }, [containerDimensions]);

  // Calculate sun position on screen
  const getSunPosition = () => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0) return { x: 0, y: 0 };

    const horizonY = height * 0.6; // Same as in SVG path
    
    // Use altitude to determine vertical position (-90° to +90°)
    // Constrain y position to be within view even if sun is below horizon
    const altitudeNormalized = (sunPosition.altitude + 30) / 120; // Normalize from -30 to 90 degrees to 0-1
    const y = horizonY - (altitudeNormalized * height * 0.8);
    
    // Use azimuth to determine horizontal position (0° to 360°)
    // We'll map this so that 0/360° (North) is in the middle
    const azimuthNormalized = sunPosition.azimuth / 360;
    const x = width * azimuthNormalized;
    
    return { x, y: Math.max(30, Math.min(height - 30, y)) };
  };

  const { x, y } = getSunPosition();
  
  // Determine sun color and glow based on altitude
  const getSunColor = () => {
    if (sunPosition.altitude > 10) {
      return 'text-yellow-300';
    } else if (sunPosition.altitude > 0) {
      return 'text-orange-400';
    } else {
      return 'text-amber-600';
    }
  };

  const getGlowIntensity = () => {
    if (sunPosition.altitude > 10) {
      return 'drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]';
    } else if (sunPosition.altitude > 0) {
      return 'drop-shadow-[0_0_10px_rgba(255,165,0,0.6)]';
    } else if (sunPosition.altitude > -10) {
      return 'drop-shadow-[0_0_5px_rgba(255,99,71,0.4)]';
    } 
    return '';
  };

  const isSunVisible = sunPosition.altitude > -18; // Sun is "visible" until astronomical twilight (-18 degrees)
  const isMoonVisible = timeOfDay === 'night' || 
    timeOfDay === 'astronomical-twilight' || 
    timeOfDay === 'nautical-twilight';

  return (
    <div ref={containerRef} className="w-full h-screen relative overflow-hidden">
      {/* Sky/Background already handled by parent component */}
      
      {/* Sun */}
      {isSunVisible && (
        <div 
          className={`absolute transition-transform duration-1000 ${getSunColor()} ${getGlowIntensity()} animate-glow`}
          style={{ 
            left: `${x}px`, 
            top: `${y}px`, 
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Sun size={sunPosition.altitude > 0 ? 48 : 40} strokeWidth={1} />
        </div>
      )}
      
      {/* Moon (simplified - just show at night) */}
      {isMoonVisible && (
        <div 
          className="absolute text-gray-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] animate-glow"
          style={{ 
            right: '15%', 
            top: '20%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Moon size={36} strokeWidth={1} />
        </div>
      )}
      
      {/* Horizon/Ground */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <path 
          d={svgPath} 
          fill={timeOfDay.includes('night') || timeOfDay.includes('twilight') 
            ? '#0F0E11' 
            : '#222222'
          } 
          className="transition-all duration-1000"
        />
      </svg>
      
      {/* Display sun's altitude */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 bottom-1/3 -translate-y-12 
                   bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm"
      >
        {sunPosition.altitude > 0 
          ? `+${sunPosition.altitude.toFixed(1)}°` 
          : `${sunPosition.altitude.toFixed(1)}°`
        }
      </div>
    </div>
  );
};

export default SunVisualization;
