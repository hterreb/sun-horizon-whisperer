import { type BoatKind } from '@/utils/weatherEffectsUtils';

// National days (utils/nationalDays): a string of small pennants in the flag colours, on
// SceneBoat's 64 x 37 grid. Each line runs from the bow or the stern up to the mast or funnel
// top. Static: no flutter (calm-motion rule), so it also shows with reduced motion.
const LINES: Record<BoatKind, [number, number][]> = {
  sailboat: [[8.5, 29.6], [30, 3.5], [59.5, 29.6]],
  ferry: [[5, 20.5], [28.4, 6.5], [61, 27.5]],
  fishing: [[10.5, 13.2], [38, 5], [57.5, 22.8]],
  rowboat: [[19, 25.6], [46.5, 30.4]],
  freighter: [[14.6, 5.5], [59.4, 19.5]],
};
const GAP = 3.6; // grid units between two pennants
const HALF_W = 1.3;
const DROP = 3;

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

const BoatBunting = ({ kind, colors }: { kind: BoatKind; colors: readonly string[] }) => {
  const line = LINES[kind];
  return (
    <g data-testid="boat-bunting">
      <polyline points={line.map(p => p.join(',')).join(' ')} fill="none" stroke="hsl(var(--scene-boat-navy))" strokeWidth={0.4} />
      {pennantsOf(line).map(([x, y], i) => (
        <path key={i} d={`M${x - HALF_W} ${y}H${x + HALF_W}L${x} ${y + DROP}Z`} fill={colors[i % colors.length]} data-testid="bunting-pennant" />
      ))}
    </g>
  );
};

export default BoatBunting;
