import React from 'react';

interface MoonTintProps {
  kind: 'lunarEclipse' | 'blueMoon';
  // 0-1: eclipse depth; 1 for the blue moon.
  strength: number;
  radius: number;
}

// A colour wash over the moon disc (inside its SVG): copper red during a lunar
// eclipse, a deep blue for a blue moon (astroEvents). Multiply keeps the phase shape.
const MoonTint: React.FC<MoonTintProps> = ({ kind, strength, radius }) => (
  <circle
    data-testid={`moon-tint-${kind}`}
    cx={0}
    cy={0}
    r={radius}
    fill={kind === 'lunarEclipse' ? 'hsl(var(--scene-eclipse-moon))' : 'hsl(var(--scene-blue-moon))'}
    opacity={kind === 'lunarEclipse' ? 0.85 * strength : 1}
    style={{ mixBlendMode: 'multiply' }}
  />
);

export default MoonTint;
