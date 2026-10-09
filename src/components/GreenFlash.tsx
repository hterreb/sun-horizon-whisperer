import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface GreenFlashProps {
  x: number;
  y: number;
}

// A short, soft green glow where the sun just set (astroEvents: greenFlash). One CSS
// fade in and out; reduced motion shows it still for the few seconds it lasts.
// It sits 36 px above the given point, so it clears the sunset-time pill (centred 22 px
// above the horizon, 22 px high: SunVisualization ARC_LABEL_HEIGHT). z-20 draws it over
// the arc labels (z-9) where its glow still reaches them.
const GreenFlash: React.FC<GreenFlashProps> = ({ x, y }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <div
      data-testid="green-flash"
      aria-hidden="true"
      className={`absolute z-20 pointer-events-none rounded-full ${prefersReducedMotion ? '' : 'animate-green-flash'}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: 128,
        height: 32,
        transform: 'translate(-50%, calc(-100% - 36px))',
        opacity: prefersReducedMotion ? 0.8 : undefined,
        filter: 'blur(3px)',
        boxShadow: '0 0 28px 10px hsl(var(--scene-green-flash) / 0.5)',
        background: 'radial-gradient(ellipse, hsl(var(--scene-green-flash)) 0%, hsl(var(--scene-green-flash) / 0.4) 55%, transparent 75%)',
      }}
    />
  );
};

export default GreenFlash;
