import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DISCO_MS } from '@/utils/hiddenEggs';

// Hidden egg (ROADMAP "Ongoing — Easter eggs"): 7 taps on the moon or the Konami code give a disco sky.
// A soft brand-colour wash over the sky that fades in, turns its hue slowly once
// round and fades out; no strobe. Reduced motion: a still, faint wash.
const DiscoSky: React.FC = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <div
      aria-hidden="true"
      data-testid="disco-sky"
      className="absolute inset-0 pointer-events-none"
      style={{
        // Soft light spots, like a disco ball's, in brand colours.
        background: [
          'radial-gradient(circle at 20% 20%, hsl(var(--brand-coral) / 0.9), transparent 35%)',
          'radial-gradient(circle at 80% 30%, hsl(var(--brand-cyan) / 0.9), transparent 35%)',
          'radial-gradient(circle at 45% 55%, hsl(var(--brand-mark-dusk) / 0.9), transparent 40%)',
          'radial-gradient(circle at 75% 80%, hsl(var(--brand-gold) / 0.8), transparent 35%)',
          'radial-gradient(circle at 15% 75%, hsl(var(--brand-sky) / 0.8), transparent 35%)',
        ].join(', '),
        opacity: prefersReducedMotion ? 0.3 : 0,
        animation: prefersReducedMotion ? undefined : `disco-sky ${DISCO_MS}ms ease-in-out forwards`,
      }}
    >
      <style>{`
        @keyframes disco-sky {
          0% { opacity: 0; filter: hue-rotate(0deg); }
          15% { opacity: 0.5; }
          85% { opacity: 0.5; }
          100% { opacity: 0; filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DiscoSky;
