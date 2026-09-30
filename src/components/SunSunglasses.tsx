import React from 'react';

// Hidden egg (ROADMAP "Ongoing — Easter eggs"): sunglasses on the line sun. Drawn in
// the lucide Sun's 24×24 viewBox and laid over it, so it scales with the icon.
const SunSunglasses: React.FC = () => (
  <svg
    aria-hidden="true"
    data-testid="sun-sunglasses"
    viewBox="0 0 24 24"
    className="absolute inset-0 h-full w-full pointer-events-none motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
  >
    <path d="M7.4 10.8 H16.6" stroke="hsl(var(--brand-night))" strokeWidth={0.6} strokeLinecap="round" />
    <path d="M8 10.8 h3.2 v0.9 a1.6 1.6 0 0 1 -3.2 0 z" fill="hsl(var(--brand-night))" />
    <path d="M12.8 10.8 h3.2 v0.9 a1.6 1.6 0 0 1 -3.2 0 z" fill="hsl(var(--brand-night))" />
    <path d="M8.7 11.2 l0.9 0" stroke="hsl(var(--scene-glow-white))" strokeWidth={0.3} strokeLinecap="round" strokeOpacity={0.7} />
    <path d="M13.5 11.2 l0.9 0" stroke="hsl(var(--scene-glow-white))" strokeWidth={0.3} strokeLinecap="round" strokeOpacity={0.7} />
  </svg>
);

export default SunSunglasses;
