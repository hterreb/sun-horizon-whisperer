import React from 'react';

interface SolarEclipseProps {
  x: number;
  y: number;
  // 0-1: how far the moon covers the sun (astroEvents.getSolarEclipseDepth).
  strength: number;
  // Radius of the sun disc in px.
  radius: number;
}

// The moon's dark disc sliding over the sun, a faint corona near totality, and a
// darker sky as the cover grows (astroEvents: solarEclipse). Static; the position
// follows the clock.
const SolarEclipse: React.FC<SolarEclipseProps> = ({ x, y, strength, radius }) => {
  const offset = (1 - strength) * radius * 1.8;
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'hsl(var(--scene-sky-night-1))', opacity: 0.7 * strength ** 3 }}
      />
      <div
        data-testid="solar-eclipse"
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          left: `${x + offset}px`,
          top: `${y - offset * 0.3}px`,
          width: radius * 2.1,
          height: radius * 2.1,
          transform: 'translate(-50%, -50%)',
          background: 'hsl(var(--scene-moon-dark))',
          boxShadow: strength > 0.9 ? `0 0 ${radius}px ${radius * 0.4}px hsl(var(--scene-glow-white) / 0.55)` : 'none',
        }}
      />
    </>
  );
};

export default SolarEclipse;
