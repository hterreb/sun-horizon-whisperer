import { type BoatKind } from '@/utils/weatherEffectsUtils';
import { type Bunting } from '@/hooks/useBunting';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// National days (utils/nationalDays): a string of big pennants (big enough to see on a phone) in the flag colours, on
// SceneBoat's 64 x 37 grid. Each line runs from the bow or the stern up to the mast or funnel
// top. Static: no flutter (calm-motion rule), so it also shows with reduced motion.
const LINES: Record<BoatKind, [number, number][]> = {
  sailboat: [[8.5, 29.6], [30, 3.5], [59.5, 29.6]],
  ferry: [[5, 20.5], [28.4, 6.5], [61, 27.5]],
  fishing: [[10.5, 13.2], [38, 5], [57.5, 22.8]],
  rowboat: [[19, 25.6], [46.5, 30.4]],
  freighter: [[14.6, 5.5], [59.4, 19.5]],
};
const GAP = 7.5; // grid units between two pennants
const HALF_W = 3;
const DROP = 6.5;

// The pennant tops along each line, about GAP apart, without the line's end points.
const pennantsOf = (points: [number, number][]): [number, number][] =>
  points.slice(1).flatMap(([x2, y2], i) => {
    const [x1, y1] = points[i];
    const n = Math.floor(Math.hypot(x2 - x1, y2 - y1) / GAP);
    return Array.from({ length: Math.max(0, n - 1) }, (_, k): [number, number] => {
      const t = (k + 1) / n;
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    });
  });

// Christmas (Dec 25-26): a string of small warm bulbs along the same lines, and a small gold
// star above the line's top end (the masthead or the funnel top). The bulbs glow when the boat
// is lit (night) and then twinkle very slowly (opacity, 6 s); reduced motion keeps them still.
const BULB_R = 0.8;
const BULB_SAG = 0.9; // the bulb hangs this far below the wire
const STAR_R = 1.6;
const STAR_LIFT = 2.6; // the star's centre above the line's top end, clear of the mast light
const starPath = (cx: number, cy: number): string =>
  Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? STAR_R * 0.45 : STAR_R;
    const a = (Math.PI / 5) * k - Math.PI / 2;
    return `${k ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';

const ChristmasLights = ({ kind, colors, lit }: { kind: BoatKind; colors: readonly string[]; lit: boolean }) => {
  const reducedMotion = usePrefersReducedMotion();
  const line = LINES[kind];
  const [topX, topY] = line.reduce((top, p) => (p[1] < top[1] ? p : top));
  const twinkle = lit && !reducedMotion;
  const glow = lit ? 'drop-shadow(0 0 1.5px hsl(var(--scene-xmas-glow)))' : undefined;
  return (
    <g data-testid="boat-bunting" data-shape="lights">
      <polyline points={line.map(p => p.join(',')).join(' ')} fill="none" stroke="hsl(var(--scene-boat-navy))" strokeWidth={0.3} />
      <g style={{ filter: glow }} opacity={lit ? 1 : 0.85}>
        {pennantsOf(line).map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y + BULB_SAG}
            r={BULB_R}
            fill={colors[i % colors.length]}
            style={twinkle ? { animation: `xmas-twinkle 6s ease-in-out ${-(i % 3) * 2}s infinite` } : undefined}
            data-testid="christmas-bulb"
          />
        ))}
        <path d={starPath(topX, topY - STAR_LIFT)} fill="hsl(var(--scene-xmas-star))" data-testid="christmas-star" />
      </g>
      {twinkle && <style>{'@keyframes xmas-twinkle { 50% { opacity: 0.55; } }'}</style>}
    </g>
  );
};

const BoatBunting = ({ kind, colors, shape = 'pennant', lit = false }: { kind: BoatKind; colors: readonly string[]; shape?: Bunting['shape']; lit?: boolean }) => {
  if (shape === 'lights') return <ChristmasLights kind={kind} colors={colors} lit={lit} />;
  const line = LINES[kind];
  return (
    <g data-testid="boat-bunting">
      <polyline points={line.map(p => p.join(',')).join(' ')} fill="none" stroke="hsl(var(--scene-boat-navy))" strokeWidth={0.8} />
      {pennantsOf(line).map(([x, y], i) => (
        shape === 'picado'
          ? <rect key={i} x={x - HALF_W} y={y} width={HALF_W * 2} height={DROP} fill={colors[i % colors.length]} data-testid="bunting-pennant" />
          : <path key={i} d={`M${x - HALF_W} ${y}H${x + HALF_W}L${x} ${y + DROP}Z`} fill={colors[i % colors.length]} data-testid="bunting-pennant" />
      ))}
    </g>
  );
};

export default BoatBunting;
