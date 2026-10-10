import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { AURORA_BANDS } from '@/utils/auroraBands';

interface AuroraProps {
  // 0-1: clouds hide the aurora like the stars (getStarCloudFactor).
  opacity: number;
}

// Soft green curtains in the upper sky (astroEvents: aurora). A slow CSS drift, no JS
// loop; reduced motion keeps them still. Item 123: EventSkyTaps has the bands' tap areas, so the
// curtains take no taps.
const BANDS = AURORA_BANDS;

const Aurora: React.FC<AuroraProps> = ({ opacity }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  if (opacity <= 0) return null;
  return (
    <div data-testid="aurora" aria-hidden="true" className="fixed inset-0 pointer-events-none z-0" style={{ opacity }}>
      {BANDS.map((b) => (
        <div
          key={b.left}
          className={`absolute ${prefersReducedMotion ? '' : 'animate-aurora-drift'}`}
          style={{
            top: b.top,
            left: b.left,
            width: b.width,
            height: '32%',
            opacity: 0.7,
            animationDelay: b.delay,
            filter: 'blur(18px)',
            borderRadius: '50% 50% 0 0 / 30% 30% 0 0',
            background: `linear-gradient(to bottom, transparent 0%, hsl(var(${b.violet ? '--scene-aurora-violet' : '--scene-aurora-green'}) / 0.35) 35%, hsl(var(--scene-aurora-green) / 0.55) 75%, transparent 100%)`,
          }}
        />
      ))}
    </div>
  );
};

export default Aurora;
