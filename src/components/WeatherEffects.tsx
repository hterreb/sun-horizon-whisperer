import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { type WeatherType } from './CloudLayer';
import { type TimeOfDay } from '../utils/sunUtils';
import { getWeatherEffects, canFlashLightning } from '../utils/weatherEffectsUtils';
import { type RainbowGeometry } from './SunVisualization';

interface WeatherEffectsProps {
  weatherType: WeatherType;
  timeOfDay: TimeOfDay;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  sunAltitude: number;
  rainbow: RainbowGeometry;
  containerWidth: number;
  containerHeight: number;
}

// Storm lightning: a random flash, capped by canFlashLightning (>= 8s apart) and
// checked every second - deliberately not more often, so the cap is what actually
// limits the frequency rather than the check interval.
const LIGHTNING_CHECK_INTERVAL_MS = 1000;
const LIGHTNING_FLASH_CHANCE = 0.15;
const LIGHTNING_FLASH_DURATION_MS = 150;

// Rainbow bands, outermost first, drawn as concentric arcs. Deliberately not scene
// tokens: a rainbow is the fixed spectrum, not a theme colour (AUDIT A-9).
const RAINBOW_BANDS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#7c3aed'];
const RAINBOW_BAND_GAP_PX = 7;

// Heat shimmer (ROADMAP item 56): a band just above the horizon with thin pale lines,
// bent by a slowly drifting turbulence field (one 7 s cycle).
const HEAT_SHIMMER_BAND_PX = 40;

// The illustrations from ROADMAP item 10 that aren't part of the spawning "living
// scene" (that's CloudLayer): fog low over the horizon, storm lightning, heat shimmer
// and the rainbow. All scene elements stay at z <= 10 (see ROADMAP item 1).
const WeatherEffects: React.FC<WeatherEffectsProps> = ({
  weatherType,
  timeOfDay,
  temperatureC,
  windSpeedKmh,
  sunAltitude,
  rainbow,
  containerWidth,
  containerHeight
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const effects = getWeatherEffects({ type: weatherType, windKmh: windSpeedKmh, tempC: temperatureC, sunAltitude });

  const [flash, setFlash] = useState(false);
  const lastFlashAtRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reduced motion: no flashing at all (a still, dim storm sky).
    if (!effects.showLightning || prefersReducedMotion) return;

    const checkTick = () => {
      const now = Date.now();
      if (canFlashLightning(lastFlashAtRef.current, now) && Math.random() < LIGHTNING_FLASH_CHANCE) {
        lastFlashAtRef.current = now;
        setFlash(true);
        flashTimeoutRef.current = setTimeout(() => setFlash(false), LIGHTNING_FLASH_DURATION_MS);
      }
    };

    const intervalId = setInterval(checkTick, LIGHTNING_CHECK_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [effects.showLightning, prefersReducedMotion]);

  const isNight = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const horizonY = containerHeight * 0.65;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[8]">
      {/* Fog: soft bands low over the horizon, translucent so the sun/moon glow
          through rather than being hidden behind them. */}
      {effects.showFog && (
        <div
          data-testid="fog-band"
          className="absolute left-0 right-0 transition-opacity duration-[3000ms]"
          style={{
            // Band straddles the horizon: densest just above it, fading up into the sky
            // and a little down over the water.
            top: `${horizonY - containerHeight * 0.25}px`,
            height: `${containerHeight * 0.33}px`,
            background: isNight
              ? 'linear-gradient(to bottom, transparent, rgba(150,155,165,0.35) 55%, rgba(150,155,165,0.5) 76%, transparent)'
              : 'linear-gradient(to bottom, transparent, rgba(225,228,232,0.5) 55%, rgba(225,228,232,0.7) 76%, transparent)'
          }}
        />
      )}

      {/* Storm lightning: a brief full-screen flash, hard-capped to >= 8s apart and
          disabled entirely under reduced motion. */}
      {effects.showLightning && flash && (
        <div className="absolute inset-0 bg-white" style={{ opacity: 0.35 }} />
      )}

      {/* Heat shimmer (> 30°C): a pale haze band over the horizon with wavy heat lines.
          Reduced motion: only the still haze. */}
      {effects.showHeatShimmer && containerWidth > 0 && containerHeight > 0 && (
        <svg
          data-testid="heat-shimmer"
          className="absolute left-0"
          width={containerWidth}
          height={HEAT_SHIMMER_BAND_PX}
          style={{ top: `${horizonY - HEAT_SHIMMER_BAND_PX}px` }}
        >
          <defs>
            <linearGradient id="heat-haze" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#fff3e0" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff3e0" stopOpacity="0" />
            </linearGradient>
            <mask id="heat-fade">
              <rect width="100%" height="100%" fill="url(#heat-haze)" />
            </mask>
            <pattern id="heat-lines" width="10" height="5" patternUnits="userSpaceOnUse">
              <rect width="10" height="1.5" fill="#fff" />
            </pattern>
            <filter id="heat-wave">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="1" seed="4" />
              <feOffset result="drift">
                <animate attributeName="dx" values="0;40;0" dur="7s" repeatCount="indefinite" />
              </feOffset>
              <feDisplacementMap in="SourceGraphic" in2="drift" scale="8" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#heat-haze)" />
          {!prefersReducedMotion && (
            <rect width="100%" height="100%" fill="url(#heat-lines)" filter="url(#heat-wave)" mask="url(#heat-fade)" />
          )}
        </svg>
      )}

      {/* Rainbow: opposite the sun, clipped to the sky above the horizon so only the
          arc (not a full ring) shows. */}
      {rainbow.visible && containerWidth > 0 && containerHeight > 0 && (
        <div className="absolute left-0 top-0 w-full overflow-hidden" style={{ height: `${horizonY}px` }}>
          <svg width={containerWidth} height={horizonY} className="absolute inset-0" style={{ opacity: isNight ? 0 : 0.5 }}>
            {RAINBOW_BANDS.map((color, i) => {
              const radius = (rainbow.apexHeightDeg / 42) * horizonY * 0.95 - i * RAINBOW_BAND_GAP_PX;
              if (radius <= 0) return null;
              return (
                <circle
                  key={color}
                  cx={rainbow.xFraction * containerWidth}
                  cy={horizonY}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={5}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

export default WeatherEffects;
