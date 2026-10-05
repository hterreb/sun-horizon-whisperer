import { type CSSProperties } from 'react';
import { getVisitorGlint } from './SceneVisitor';
import { BODY_LINE, type HuntFx } from '@/utils/sharkHunt';

// The traces of a shark hunt on the water (ROADMAP item 94): X1, a thin ring that opens on the
// surface above the meeting and fades out in 3.5 s, and in H1 four small bubbles that rise
// from the shark's body line. They stay where they start: the root sits at the meeting point
// (the nose, on the waterline) and does not move with the shark. CSS animations only; the
// ring's end calls `onDone`.

const RIPPLE_SEC = 3.5;
const RIPPLE_FROM = 2.8; // grid units wide (half), at the start
const RIPPLE_TO = 16.6; // at the end
const RIPPLE_FLAT = 0.28; // its height to its width
const BUBBLE_SEC = 2.2;
const BUBBLE_RISE = BODY_LINE + 1.8; // grid units

const KEYFRAMES = `
@keyframes sceneHuntRipple {
  0% { transform: scale(${(RIPPLE_FROM / RIPPLE_TO).toFixed(3)}); opacity: 0; }
  8% { opacity: 0.69; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes sceneHuntBubble {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 0.85; }
  70% { opacity: 0.85; }
  100% { transform: translateY(var(--rise)); opacity: 0; }
}`;

interface SceneHuntFxProps {
  fx: HuntFx;
  onDone: () => void;
}

const SceneHuntFx = ({ fx, onDone }: SceneHuntFxProps) => {
  const glint = getVisitorGlint(fx.tone);
  const rx = RIPPLE_TO * fx.unit;
  const ry = rx * RIPPLE_FLAT;
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${fx.x}%`, top: `${fx.y}%`, zIndex: 6 }}
      aria-hidden="true"
      data-testid="hunt-fx"
    >
      <style>{KEYFRAMES}</style>
      <svg
        className="absolute overflow-visible"
        width={2 * rx}
        height={2 * ry}
        style={{
          left: fx.ripple.dx - rx,
          top: -ry,
          animation: `sceneHuntRipple ${RIPPLE_SEC}s linear ${fx.ripple.delay}s both`,
        }}
        onAnimationEnd={event => { if (event.animationName === 'sceneHuntRipple') onDone(); }}
        data-testid="hunt-ripple"
      >
        <ellipse cx={rx} cy={ry} rx={rx - 0.5} ry={ry - 0.5} style={{ fill: 'none', stroke: glint, strokeWidth: 0.6 }} vectorEffect="non-scaling-stroke" />
      </svg>
      {fx.bubbles?.map((bubble, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: bubble.dx - bubble.r,
            top: (BODY_LINE + 0.9) * fx.unit - bubble.r,
            width: 2 * bubble.r,
            height: 2 * bubble.r,
            background: `color-mix(in srgb, ${glint} 30%, transparent)`,
            boxShadow: `inset 0 0 0 0.5px ${glint}`,
            ['--rise' as string]: `${-BUBBLE_RISE * fx.unit}px`,
            animation: `sceneHuntBubble ${BUBBLE_SEC}s linear ${bubble.delay}s both`,
          } as CSSProperties}
          data-testid="hunt-bubble"
        />
      ))}
    </div>
  );
};

export default SceneHuntFx;
