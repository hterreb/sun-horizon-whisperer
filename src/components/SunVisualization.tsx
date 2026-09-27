import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Sun } from 'lucide-react';
import { type SunPosition, type TimeOfDay } from '../utils/sunUtils';
import { type MoonPosition, getMoonPhasePath } from '../utils/moonUtils';
import CloudLayer, { type WeatherType } from './CloudLayer';
import Fireworks from './Fireworks';

interface SunVisualizationProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  // The moon's altitude/azimuth sampled across the current day (see
  // moonUtils.getMoonPathAround), used to draw its arc across the sky.
  moonPath: MoonPosition[];
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
  latitude: number;
  // Live compass mode (ROADMAP item 8): shifts the azimuth->x mapping so the
  // current device heading sits at screen center. 0 (the default) reproduces the
  // static mapping. See compassUtils.headingToAzimuthOffset.
  azimuthOffset?: number;
}

// Maps an azimuth (0-360°, 0 = North) to a horizontal screen fraction (0-1).
// North hemisphere: sun/moon culminate at 180° (South), which already sits at the
// center of a linear 0->left/360->right mapping, so no shift is needed.
// South hemisphere: culmination is at 0°/360° (North), which would otherwise land on
// the screen edge and jump edge-to-edge at noon. Shifting by 180° before mapping
// centers the culmination instead.
// `azimuthOffset` (compass mode) is applied after the hemisphere shift, so it always
// pans the same visual amount regardless of hemisphere.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getAzimuthScreenFraction = (azimuth: number, latitude: number, azimuthOffset = 0): number => {
  const hemisphereShifted = latitude < 0 ? (azimuth + 180) % 360 : azimuth;
  const adjusted = ((hemisphereShifted + azimuthOffset) % 360 + 360) % 360;
  return adjusted / 360;
};

// The 8 cardinal/intercardinal directions shown as static horizon labels (ROADMAP
// item 8), always in clockwise order from North.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const CARDINAL_DIRECTIONS = [
  { label: 'N', azimuth: 0 },
  { label: 'NE', azimuth: 45 },
  { label: 'E', azimuth: 90 },
  { label: 'SE', azimuth: 135 },
  { label: 'S', azimuth: 180 },
  { label: 'SW', azimuth: 225 },
  { label: 'W', azimuth: 270 },
  { label: 'NW', azimuth: 315 },
] as const;

// Screen fraction for each cardinal label, using the same azimuth->x mapping as the
// sun/moon (including the compass-mode pan offset), so labels stay correct in both
// hemispheres and pan together with the scene. The mapping wraps the full 360°
// circle across the full width, so every fraction is finite and "in range" - this
// still guards against a non-finite result (e.g. NaN input).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const getVisibleCardinalLabels = (
  latitude: number,
  azimuthOffset = 0
): Array<{ label: string; azimuth: number; fraction: number }> =>
  CARDINAL_DIRECTIONS
    .map((direction) => ({
      ...direction,
      fraction: getAzimuthScreenFraction(direction.azimuth, latitude, azimuthOffset),
    }))
    .filter((direction) => Number.isFinite(direction.fraction));

// True when the sun's altitude crosses the horizon (0°) between two samples, i.e. it
// was on one side and is now on the other. A rounded `altitude === 0.0` check can miss
// the crossing entirely if the 30s sample lands slightly off zero either side.
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const crossesHorizon = (prevAltitude: number, currentAltitude: number): boolean =>
  (prevAltitude < 0) !== (currentAltitude < 0);

// Maps a sky position (altitude/azimuth, in degrees) to screen x/y for the given
// container size and latitude. Shared by the sun and moon's current-position dots and
// by each sampled point of the moon's day arc, so they all agree on the same mapping.
const getScreenPosition = (
  altitude: number,
  azimuth: number,
  width: number,
  height: number,
  latitude: number,
  azimuthOffset = 0
): { x: number; y: number } => {
  if (width === 0 || height === 0) return { x: 0, y: 0 };

  const horizonY = height * 0.65;
  const altitudeRadians = altitude * (Math.PI / 180);
  const maxAltitudeHeight = horizonY - 30;
  const y = horizonY - Math.sin(altitudeRadians) * maxAltitudeHeight;
  const x = width * getAzimuthScreenFraction(azimuth, latitude, azimuthOffset);

  return {
    x: Math.max(30, Math.min(width - 30, x)),
    y: Math.max(30, Math.min(height - 30, y))
  };
};

// SVG path through the above-horizon points only; a gap below the horizon starts a new segment.
type SkyPoint = { altitude: number; azimuth: number };
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const buildArcPath = (points: SkyPoint[], toXY: (p: SkyPoint) => { x: number; y: number }): string => {
  let path = '';
  let penDown = false;
  for (const point of points) {
    if (point.altitude < 0) {
      penDown = false;
      continue;
    }
    const { x, y } = toXY(point);
    path += `${penDown ? 'L' : 'M'}${x},${y} `;
    penDown = true;
  }
  return path.trim();
};

const SunVisualization: React.FC<SunVisualizationProps> = ({
  sunPosition,
  moonPosition,
  moonPath,
  timeOfDay,
  weatherType,
  latitude,
  azimuthOffset = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [showFireworks, setShowFireworks] = useState(false);
  const prevAltitudeRef = useRef<number>(sunPosition.altitude);

  // Check if sun crosses the horizon (0° altitude)
  useEffect(() => {
    const currentAltitude = sunPosition.altitude;
    const prevAltitude = prevAltitudeRef.current;

    // Trigger fireworks on a sign change (crossing the horizon in either direction).
    if (crossesHorizon(prevAltitude, currentAltitude)) {
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

  // The horizon path is fully derived from `containerDimensions` (deterministic, no
  // randomness), so it's computed during render instead of synced into state.
  const svgPath = useMemo(() => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0) return '';

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
    return path;
  }, [containerDimensions]);

  const getSunPosition = () =>
    getScreenPosition(sunPosition.altitude, sunPosition.azimuth, containerDimensions.width, containerDimensions.height, latitude, azimuthOffset);

  const getMoonPosition = () =>
    getScreenPosition(moonPosition.altitude, moonPosition.azimuth, containerDimensions.width, containerDimensions.height, latitude, azimuthOffset);

  const { x: sunX, y: sunY } = getSunPosition();
  const { x: moonX, y: moonY } = getMoonPosition();

  // The moon's arc for its current pass (above-horizon points only): same screen mapping as its current-position
  // dot, just applied to every sampled point in `moonPath`. Paler than the moon itself
  // (lower stroke opacity), using the scene.moon token (see index.css/tailwind.config).
  const moonArcPath = useMemo(() => {
    const { width, height } = containerDimensions;
    if (width === 0 || height === 0 || moonPath.length === 0) return '';

    return buildArcPath(moonPath, (p) => getScreenPosition(p.altitude, p.azimuth, width, height, latitude, azimuthOffset));
  }, [moonPath, containerDimensions, latitude, azimuthOffset]);

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
        return '#403E43';
      default:
        return '#33C3F0';
    }
  };

  const getReflectionOpacity = () => {
    return timeOfDay === 'night' ? 0.1 : 0.3;
  };

  const isSunVisible = sunPosition.altitude > -18 && weatherType !== 'storm';
  const isMoonVisible = moonPosition.visible && (
    timeOfDay === 'night' ||
    timeOfDay === 'astronomical-twilight' ||
    timeOfDay === 'nautical-twilight'
  );

  const moonRadius = 18 + moonPosition.illumination * 6; // same footprint as the old 36 + illumination*12 diameter
  const moonPhasePath = useMemo(
    () => getMoonPhasePath(moonPosition.illumination, moonPosition.phase, latitude, moonRadius),
    [moonPosition.illumination, moonPosition.phase, latitude, moonRadius]
  );

  // Cardinal direction labels (ROADMAP item 8): always on, panning together with the
  // sun/moon in compass mode via the same azimuthOffset.
  const cardinalLabels = useMemo(
    () => getVisibleCardinalLabels(latitude, azimuthOffset),
    [latitude, azimuthOffset]
  );
  const horizonLabelY = containerDimensions.height * 0.65;

  return (
    <div ref={containerRef} className="w-full h-dvh relative overflow-hidden" data-testid="sun-visualization">
      <CloudLayer timeOfDay={timeOfDay} weatherType={weatherType} />
      <Fireworks trigger={showFireworks} />

      {moonArcPath && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d={moonArcPath}
            fill="none"
            stroke="hsl(var(--scene-moon))"
            strokeOpacity={0.25}
            strokeWidth={1.5}
          />
        </svg>
      )}

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
          className="absolute transition-all duration-1000"
          style={{
            left: `${moonX}px`,
            top: `${moonY}px`,
            transform: 'translate(-50%, -50%)',
            opacity: weatherType === 'storm' ? 0.3 : moonPosition.illumination * 0.8 + 0.2,
            filter: `drop-shadow(0 0 ${moonPosition.illumination * 15}px rgba(255,255,255,0.4))`
          }}
        >
          <svg
            width={moonRadius * 2}
            height={moonRadius * 2}
            viewBox={`${-moonRadius} ${-moonRadius} ${moonRadius * 2} ${moonRadius * 2}`}
          >
            <circle cx={0} cy={0} r={moonRadius - 0.5} fill="#2b2f3a" stroke="hsl(var(--scene-moon))" strokeOpacity={0.3} />
            <path d={moonPhasePath} fill="hsl(var(--scene-moon))" />
          </svg>
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

      {containerDimensions.width > 0 && (
        <div className="absolute inset-0 pointer-events-none" data-testid="cardinal-labels">
          {cardinalLabels.map(({ label, fraction }) => (
            <div
              key={label}
              className="absolute flex flex-col items-center gap-1 transition-all duration-1000"
              style={{
                left: `${fraction * containerDimensions.width}px`,
                top: `${horizonLabelY}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <span className="block h-3 w-px bg-white/50" aria-hidden="true" />
              <span className="text-caption text-white/90 bg-panel-background border border-panel-border px-2 py-0.5 rounded-full">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

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
