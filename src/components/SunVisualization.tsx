import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { type SunPosition, type TimeOfDay } from '../utils/sunUtils';
import { type MoonPosition } from '../utils/moonUtils';
import CloudLayer, { type WeatherType } from './CloudLayer';

interface SunVisualizationProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
}

const SunVisualization: React.FC<SunVisualizationProps> = ({ 
  sunPosition, 
  moonPosition,
  timeOfDay, 
  weatherType 
}) => {
  const [svgPath, setSvgPath] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    if (containerDimensions.width > 0 && containerDimensions.height > 0) {
      const width = containerDimensions.width;
      const height = containerDimensions.height;
      const horizonY = height * 0.65;
      
      let path = `M0,${horizonY} `;
      
      const waveCount = Math.ceil(width / 80);
      const waveWidth = width / waveCount;
      
      for (let i = 0; i < waveCount; i++) {
        const x1 = i * waveWidth;
        const x2 = (i + 0.5) * waveWidth;
        const x3 = (i + 1) * waveWidth;
        
        const waveHeight = Math.sin(i * 0.5) * 8 + 4;
        const y1 = horizonY;
        const y2 = horizonY - waveHeight;
        const y3 = horizonY;
        
        path += `L${x1},${y1} Q${x2},${y2} ${x3},${y3} `;
      }
      
      path += `L${width},${horizonY} L${width},${height} L0,${height} Z`;
      setSvgPath(path);
    }
  }, [containerDimensions]);

  const getSunPosition = () => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0) return { x: 0, y: 0 };

    const horizonY = height * 0.65;
    
    const altitudeNormalized = (sunPosition.altitude + 30) / 120;
    const y = horizonY - (altitudeNormalized * height * 0.8);
    
    const azimuthNormalized = sunPosition.azimuth / 360;
    const x = width * azimuthNormalized;
    
    return { x, y: Math.max(30, Math.min(height - 30, y)) };
  };

  const getMoonPosition = () => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0) return { x: 0, y: 0 };

    const horizonY = height * 0.65;
    
    const altitudeNormalized = (moonPosition.altitude + 30) / 120;
    const y = horizonY - (altitudeNormalized * height * 0.8);
    
    const azimuthNormalized = moonPosition.azimuth / 360;
    const x = width * azimuthNormalized;
    
    return { x, y: Math.max(30, Math.min(height - 30, y)) };
  };

  const { x: sunX, y: sunY } = getSunPosition();
  const { x: moonX, y: moonY } = getMoonPosition();
  
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
    // Reduce glow intensity for stormy/rainy weather
    const baseGlow = weatherType === 'storm' || weatherType === 'rain' ? 0.3 : 
                     weatherType === 'snow' ? 0.5 : 1;
    
    if (sunPosition.altitude > 10) {
      return `drop-shadow-[0_0_15px_rgba(255,255,0,${0.8 * baseGlow})]`;
    } else if (sunPosition.altitude > 0) {
      return `drop-shadow-[0_0_10px_rgba(255,165,0,${0.6 * baseGlow})]`;
    } else if (sunPosition.altitude > -10) {
      return `drop-shadow-[0_0_5px_rgba(255,99,71,${0.4 * baseGlow})]`;
    } 
    return '';
  };

  const getHorizonColor = () => {
    switch(timeOfDay) {
      case 'night':
        return '#0F0E11';
      case 'astronomical-twilight':
        return '#1A1F2C';
      case 'nautical-twilight':
        return '#221F26';
      case 'dawn':
      case 'dusk':
        return '#403E43';
      default:
        return '#33C3F0';
    }
  };

  const getReflectionOpacity = () => {
    return timeOfDay === 'night' ? 0.1 : 0.3;
  };

  const getMoonPhaseIcon = () => {
    const phase = moonPosition.phase;
    if (phase < 0.1 || phase > 0.9) return '🌑'; // New moon
    if (phase < 0.3) return '🌒'; // Waxing crescent
    if (phase < 0.4) return '🌓'; // First quarter
    if (phase < 0.6) return '🌔'; // Waxing gibbous
    if (phase < 0.7) return '🌕'; // Full moon
    if (phase < 0.8) return '🌖'; // Waning gibbous
    if (phase < 0.9) return '🌗'; // Third quarter
    return '🌘'; // Waning crescent
  };

  const isSunVisible = sunPosition.altitude > -18 && weatherType !== 'storm';
  const isMoonVisible = moonPosition.visible && (
    timeOfDay === 'night' || 
    timeOfDay === 'astronomical-twilight' || 
    timeOfDay === 'nautical-twilight'
  );

  return (
    <div ref={containerRef} className="w-full h-screen relative overflow-hidden">
      <CloudLayer timeOfDay={timeOfDay} weatherType={weatherType} />
      
      {isSunVisible && (
        <div 
          className={`absolute transition-transform duration-1000 ${getSunColor()} ${getGlowIntensity()} animate-glow`}
          style={{ 
            left: `${sunX}px`, 
            top: `${sunY}px`, 
            transform: 'translate(-50%, -50%)',
            opacity: weatherType === 'rain' ? 0.7 : 1
          }}
        >
          <Sun size={sunPosition.altitude > 0 ? 48 : 40} strokeWidth={1} />
        </div>
      )}
      
      {isMoonVisible && (
        <div 
          className="absolute text-gray-300 transition-all duration-1000"
          style={{ 
            left: `${moonX}px`, 
            top: `${moonY}px`,
            transform: 'translate(-50%, -50%)',
            opacity: weatherType === 'storm' ? 0.3 : moonPosition.illumination * 0.8 + 0.2,
            filter: `drop-shadow(0 0 ${moonPosition.illumination * 15}px rgba(255,255,255,0.4))`
          }}
        >
          <Moon size={36 + moonPosition.illumination * 12} strokeWidth={1} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs pointer-events-none">
            {getMoonPhaseIcon()}
          </div>
        </div>
      )}
      
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="horizonGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={getHorizonColor()} />
            <stop offset="100%" stopColor={getHorizonColor()} stopOpacity={getReflectionOpacity()} />
          </linearGradient>
        </defs>
        <path 
          d={svgPath} 
          fill="url(#horizonGradient)"
          className="transition-all duration-1000"
        />
      </svg>
      
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 bottom-1/3 -translate-y-12 
                   bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm"
      >
        {sunPosition.altitude > 0 
          ? `+${sunPosition.altitude.toFixed(1)}°` 
          : `${sunPosition.altitude.toFixed(1)}°`
        }
      </div>
      
      {isMoonVisible && (
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 bottom-1/4 -translate-y-12 
                     bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs"
        >
          Moon: {moonPosition.altitude.toFixed(1)}° | {(moonPosition.illumination * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
};

export default SunVisualization;
