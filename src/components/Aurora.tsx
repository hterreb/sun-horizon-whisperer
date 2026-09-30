import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface AuroraProps {
  // 0-1: clouds hide the aurora like the stars (getStarCloudFactor).
  opacity: number;
}

// Soft green curtains in the upper sky (astroEvents: aurora). A slow CSS drift, no JS
// loop; reduced motion keeps them still.
const BANDS = [
  { top: '6%', left: '-10%', width: '70%', delay: '0s', violet: false },
  { top: '14%', left: '25%', width: '65%', delay: '-13s', violet: false },
  { top: '3%', left: '50%', width: '55%', delay: '-27s', violet: true },
];

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
