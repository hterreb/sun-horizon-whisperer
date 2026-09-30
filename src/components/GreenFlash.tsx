import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface GreenFlashProps {
  x: number;
  y: number;
}

// A short, soft green glow where the sun just set (astroEvents: greenFlash). One CSS
// fade in and out; reduced motion shows it still for the few seconds it lasts.
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
        width: 64,
        height: 16,
        transform: 'translate(-50%, -130%)',
        opacity: prefersReducedMotion ? 0.8 : undefined,
        filter: 'blur(2px)',
        boxShadow: '0 0 18px 6px hsl(var(--scene-green-flash) / 0.5)',
        background: 'radial-gradient(ellipse, hsl(var(--scene-green-flash)) 0%, hsl(var(--scene-green-flash) / 0.4) 55%, transparent 75%)',
      }}
    />
  );
};

export default GreenFlash;
