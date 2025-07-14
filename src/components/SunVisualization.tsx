import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { type SunPosition, type TimeOfDay } from '../utils/sunUtils';
import { type MoonPosition } from '../utils/moonUtils';
import CloudLayer, { type WeatherType } from './CloudLayer';
import Fireworks from './Fireworks';

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
  const [showFireworks, setShowFireworks] = useState(false);
  const prevAltitudeRef = useRef<number>(sunPosition.altitude);

  // Check if sun crosses the horizon (0.0 degrees)
  useEffect(() => {
    const currentAltitude = Math.round(sunPosition.altitude * 10) / 10; // Round to 1 decimal place
    const prevAltitude = Math.round(prevAltitudeRef.current * 10) / 10;
    
    // Trigger fireworks if sun crosses exactly 0.0 degrees (either direction)
    if ((prevAltitude !== 0.0 && currentAltitude === 0.0) || 
        (Math.abs(currentAltitude) < 0.05 && Math.abs(prevAltitude - currentAltitude) > 0.1)) {
      console.log('Sun hit horizon! Triggering fireworks. Altitude:', currentAltitude);
      setShowFireworks(true);
      
      // Reset fireworks trigger after a short delay
      setTimeout(() => {
        setShowFireworks(false);
      }, 100);
    }
    
    prevAltitudeRef.current = sunPosition.altitude;
  }, [sunPosition.altitude]);

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
    
    // Map altitude to vertical position
    // At 0° altitude, sun should be exactly at horizon
    // At 90° altitude, sun should be at the top
    // At -90° altitude, sun should be well below horizon (but clamp to screen)
    const altitudeRadians = sunPosition.altitude * (Math.PI / 180);
    const maxAltitudeHeight = horizonY - 30; // Leave some margin from top
    const y = horizonY - (Math.sin(altitudeRadians) * maxAltitudeHeight);
    
    // Map azimuth to horizontal position
    // 0° = North (top of screen), 90° = East (right), 180° = South (bottom), 270° = West (left)
    // But we want 0° at left edge, 180° at center, 360° at right edge for a typical sun path
    // So we adjust: map azimuth directly to screen width
    const azimuthNormalized = sunPosition.azimuth / 360;
    const x = width * azimuthNormalized;
    
    return { 
      x: Math.max(30, Math.min(width - 30, x)), 
      y: Math.max(30, Math.min(height - 30, y)) 
    };
  };

  const getMoonPosition = () => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0) return { x: 0, y: 0 };

    const horizonY = height * 0.65;
    
    // Use same logic as sun for consistent positioning
    const altitudeRadians = moonPosition.altitude * (Math.PI / 180);
    const maxAltitudeHeight = horizonY - 30;
    const y = horizonY - (Math.sin(altitudeRadians) * maxAltitudeHeight);
    
    const azimuthNormalized = moonPosition.azimuth / 360;
    const x = width * azimuthNormalized;
    
    return { 
      x: Math.max(30, Math.min(width - 30, x)), 
      y: Math.max(30, Math.min(height - 30, y)) 
    };
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
    <div ref={containerRef} className="w-full h-screen relative overflow-hidden" data-testid="sun-visualization">
      <CloudLayer timeOfDay={timeOfDay} weatherType={weatherType} />
      <Fireworks trigger={showFireworks} />
      
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
          <Sun size={sunPosition.altitude > 0 ? 96 : 80} strokeWidth={1} />
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
