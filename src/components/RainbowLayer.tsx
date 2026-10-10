import React, { useId } from 'react';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type SceneInfoHandler } from './CloudLayer';
import { type TimeOfDay } from '../utils/sunUtils';
import { type RainbowGeometry } from './SunVisualization';

interface RainbowLayerProps {
  rainbow: RainbowGeometry;
  timeOfDay: TimeOfDay;
  containerWidth: number;
  containerHeight: number;
  // Item 121: a double tap on the rainbow opens its card.
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
}

// Rainbow bands, outermost first, drawn as concentric arcs. Deliberately not scene
// tokens: a rainbow is the fixed spectrum, not a theme colour (AUDIT A-9).
const RAINBOW_BANDS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#7c3aed'];
const RAINBOW_BAND_GAP_PX = 7;
const RAINBOW_STROKE_PX = 5;
// Item 121: fainter (it was 0.5), with soft band edges and the feet fading toward the horizon.
export const RAINBOW_OPACITY = 0.2;
const RAINBOW_BLUR_PX = 1.5;
const RAINBOW_FEET_OPACITY = 0.3;
// The hit path covers the 6 bands (5 gaps + a stroke = 40 px). It stops RAINBOW_FEET_FREE_PX above
// the horizon, so the pot of gold at the rainbow's foot (item 117) keeps its own tap.
const RAINBOW_HIT_PX = 5 * RAINBOW_BAND_GAP_PX + RAINBOW_STROKE_PX;
const RAINBOW_FEET_FREE_PX = 30;
export const RAINBOW_RING = 'rainbow';

// The rainbow (ROADMAP items 10, 121): opposite the sun, clipped to the sky above the horizon so
// only the arc (not a full ring) shows. Its own layer with no z-index, first in SunVisualization
// (decision 2026-10-10): the clouds, planes, birds and the terrain come later, so they draw over it
// and take the tap where they cross the arc.
const RainbowLayer: React.FC<RainbowLayerProps> = ({
  rainbow, timeOfDay, containerWidth, containerHeight, onInfo, infoRing = null,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { tap } = useDoubleTap(onInfo);
  const isNight = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  if (!rainbow.visible || isNight || containerWidth <= 0 || containerHeight <= 0) return null;

  const horizonY = containerHeight * 0.65;
  const cx = rainbow.xFraction * containerWidth;
  const outer = (rainbow.apexHeightDeg / 42) * horizonY * 0.95;
  const middle = outer - 2.5 * RAINBOW_BAND_GAP_PX;
  const ringOn = infoRing === RAINBOW_RING;
  return (
    <div className="absolute left-0 top-0 w-full overflow-hidden pointer-events-none" style={{ height: `${horizonY}px` }} data-testid="rainbow-layer">
      <svg width={containerWidth} height={horizonY} className="absolute inset-0" style={{ opacity: RAINBOW_OPACITY }} data-testid="rainbow">
        <defs>
          <filter id={`${uid}b`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={RAINBOW_BLUR_PX} />
          </filter>
          {/* Full strength at the top, RAINBOW_FEET_OPACITY at the horizon. */}
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2={horizonY} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="white" stopOpacity={1} />
            <stop offset="1" stopColor="white" stopOpacity={RAINBOW_FEET_OPACITY} />
          </linearGradient>
          <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="0" y="0" width={containerWidth} height={horizonY}>
            <rect width={containerWidth} height={horizonY} fill={`url(#${uid}f)`} />
          </mask>
        </defs>
        <g filter={`url(#${uid}b)`} mask={`url(#${uid}m)`}>
          {RAINBOW_BANDS.map((color, i) => {
            const radius = outer - i * RAINBOW_BAND_GAP_PX;
            if (radius <= 0) return null;
            return <circle key={color} cx={cx} cy={horizonY} r={radius} fill="none" stroke={color} strokeWidth={RAINBOW_STROKE_PX} />;
          })}
        </g>
      </svg>
      {onInfo && middle > 0 && (
        // Only the arc takes taps (pointer-events: stroke), not the sky inside it.
        <svg
          width={containerWidth}
          height={Math.max(0, horizonY - RAINBOW_FEET_FREE_PX)}
          className="absolute left-0 top-0 overflow-hidden"
          aria-hidden="true"
        >
          <circle
            cx={cx}
            cy={horizonY}
            r={middle}
            fill="none"
            stroke="transparent"
            strokeWidth={RAINBOW_HIT_PX}
            className="cursor-pointer touch-manipulation"
            style={{ pointerEvents: 'stroke' }}
            data-testid="rainbow-hit"
            data-scene-hit=""
            onClick={(e) => tap({ type: 'rainbow' }, { x: e.clientX, y: e.clientY }, RAINBOW_RING)}
          />
          {ringOn && [middle + RAINBOW_HIT_PX / 2, middle - RAINBOW_HIT_PX / 2].map((r) => r > 0 && (
            <circle key={r} cx={cx} cy={horizonY} r={r} fill="none" strokeWidth={1} className="stroke-tier-uncommon/80" data-testid="scene-info-ring" />
          ))}
        </svg>
      )}
    </div>
  );
};

export default RainbowLayer;
