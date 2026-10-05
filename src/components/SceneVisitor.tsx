import { useId, type CSSProperties, type ReactNode } from 'react';

// The rare sea visitors in the Fish Redone lookbook (ROADMAP item 85). SH1: a shark whose
// dorsal fin cuts the surface, with a faint body below. DO1: a pod of 2-3 dolphins that roll
// their backs through the surface one after the other, never out of the water. X4: a faint
// V-wake behind the fin and each back. Drawn on a 48-unit grid, facing right, with the
// waterline at `WL`; the component lifts itself so the waterline is at the top of its box.

export const VISITOR_GRID = 48; // one animal's width in grid units
export const DOLPHIN_SPACING = 34; // grid units from one dolphin to the next in the pod
const VIEW_TOP = -2;
export const VISITOR_VIEW_HEIGHT = 34; // the svg's height in grid units

const SHARK = {
  WL: 10.6,
  body: 'M5 14.5C11 12 19 10.8 28 10.8c6.4 0 11.6 1.2 15 3.4-3.4 2.2-8.6 3.4-15 3.4-9 0-17-.8-23-3.1Z',
  fins: [
    'M6 14.2 1 6.8c.9 2.9 1.3 5.4 1.2 7.6L1.6 20l4.6-4.6', // tail
    'M28.6 11C27.8 7.6 26.2 4.8 23.6 3.2c.4 3-.6 5.8-2.6 8', // dorsal fin
    'M13.6 12.2c-.4-.8-1-1.3-1.8-1.5l-.3 1.9', // second dorsal fin
    'M12.8 16.6c-.4.8-1 1.3-1.8 1.5l-.1-1.6', // anal fin
    'M30.4 17.2C29 19.4 27.2 21 25 21.8c.6-1.8 1.8-3.4 3.4-4.6', // pectoral fin
  ],
};

const DOLPHIN = {
  WL: 10.2,
  body: 'M4 13.4C9 9.8 15.4 8.2 22.6 8.2c6.4 0 11.2 1.6 14 4.4l5.4 1c-.6 1-2 1.4-4 1.2-2.8 2.4-7.8 3.6-14.2 3.6-7.4 0-14-1.8-19.8-5Z',
  fins: [
    'M5 13.3 1.2 10.2c.5 1.4 1.4 2.4 2.4 3-1 .7-1.8 1.8-2.2 3.2l3.8-2.6', // fluke
    'M25.6 8.4C24.6 6 22.4 4.2 19.4 3.6c.6 1.6.4 3.6-.8 5.6', // dorsal fin
    'M27.6 16.8c-1 1.8-2.4 3.2-4.2 3.8.2-1.6.9-3 2-4', // pectoral fin
  ],
  eye: [35, 12.4],
  mouth: 'M41.8 14.1c-1.4.4-3 .4-4.4 0',
};

// How far the svg reaches above the waterline, in grid units (the lane plan of item 92).
export const SHARK_ABOVE_WATER = SHARK.WL - VIEW_TOP;
export const DOLPHINS_ABOVE_WATER = DOLPHIN.WL - VIEW_TOP;

// The pod's fixed formation, the leader in front: each dolphin's [x, y] offset in grid units.
const POD: Record<number, [number, number][]> = {
  2: [[DOLPHIN_SPACING, 1.5], [0, 4]],
  3: [[2 * DOLPHIN_SPACING, 1], [DOLPHIN_SPACING, 4.5], [0, 2]],
};

// DO1: each dolphin rolls its back through the surface in a 4.5 s arc, from ROLL_DEPTH grid
// units under the surface up and back down, tilted nose-up and then nose-down, then stays
// under until its next roll, ROLL_EVERY_SEC later. CSS keyframes, so the roll is a CSS
// animation like every other movement in the scene (item 83 changes their play rate).
const ROLL_SEC = 4.5;
const ROLL_EVERY_SEC = 11;
const ROLL_DEPTH = 9;
const ROLL_TILT_DEG = 12;
const ROLL_STEPS = 12;

const rollKeyframes = (): string => {
  const steps = Array.from({ length: ROLL_STEPS + 1 }, (_, k) => k / ROLL_STEPS);
  const at = (p: number) => `${((p * ROLL_SEC) / ROLL_EVERY_SEC * 100).toFixed(2)}%`;
  const pose = (p: number) => {
    const dy = ROLL_DEPTH * (1 - Math.sin(Math.PI * p));
    const tilt = -ROLL_TILT_DEG * Math.sin(2 * Math.PI * p);
    // Turns about the dolphin's middle (24, 12), like SVG's rotate(a 24 12).
    return `transform: translate(0px, ${dy.toFixed(2)}px) translate(24px, 12px) rotate(${tilt.toFixed(2)}deg) translate(-24px, -12px)`;
  };
  const glint = (p: number) => `opacity: ${(0.9 * Math.sin(Math.PI * p)).toFixed(3)}`;
  return `@keyframes scene-dolphin-roll { ${steps.map(p => `${at(p)} { ${pose(p)}; }`).join(' ')} 100% { ${pose(0)}; } }
@keyframes scene-dolphin-glint { ${steps.map(p => `${at(p)} { ${glint(p)}; }`).join(' ')} 100% { opacity: 0; } }`;
};
const ROLL_CSS = rollKeyframes();

export type VisitorTone = 'day' | 'dusk' | 'moon';

const fish = (token: string) => `hsl(var(--scene-fish-${token}))`;

// The back and belly by light; the soft shadow under the surface; the glint on the water.
const colors = (kind: 'shark' | 'dolphins', tone: VisitorTone) => {
  const species = kind === 'shark' ? 'shark' : 'dolphin';
  if (tone === 'moon') {
    return { back: fish('visitor-moon'), belly: fish('moon-belly'), shadow: 'hsl(var(--scene-moon))', shadowOpacity: 0.14, glint: 'hsl(var(--scene-moon) / 0.75)' };
  }
  if (tone === 'dusk') {
    return { back: fish(`${species}-dusk`), belly: fish('visitor-dusk-belly'), shadow: fish('visitor-shadow-dusk'), shadowOpacity: 0.32, glint: 'hsl(var(--scene-fish-glint-dusk) / 0.8)' };
  }
  return { back: fish(species), belly: fish(`${species}-belly`), shadow: fish('visitor-shadow'), shadowOpacity: 0.3, glint: 'hsl(var(--scene-glow-white) / 0.75)' };
};

const line = (color: string, width: number, opacity?: number): CSSProperties =>
  ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', opacity });

interface SceneVisitorProps {
  kind: 'shark' | 'dolphins';
  tone: VisitorTone;
  width: number; // px, of the shark or the whole pod
  rolls?: number[]; // dolphins: each one's roll delay in s; one entry per dolphin (2 or 3)
}

const SceneVisitor = ({ kind, tone, width, rolls = [0, 1.5] }: SceneVisitorProps) => {
  const id = useId().replace(/:/g, '');
  const c = colors(kind, tone);
  const pod = kind === 'dolphins' ? POD[rolls.length] ?? POD[2] : null;
  const gridWidth = pod ? pod[0][0] + VISITOR_GRID : VISITOR_GRID;
  const unit = width / gridWidth;
  const animal = pod ? DOLPHIN : SHARK;
  // Fins in the back tone, the body from the back to the belly; or all in the shadow tone.
  const body = (fill: string, bodyFill: string) => (
    <>
      {animal.fins.map(d => <path key={d} d={d} style={{ fill }} />)}
      <path d={animal.body} style={{ fill: bodyFill }} />
    </>
  );
  const defs: ReactNode = (
    <>
      <linearGradient id={`${id}body`} x1="0" y1="0" x2="0" y2="1">
        {([[0, c.back], [0.4, c.back], [0.62, c.belly], [1, c.belly]] as const).map(([offset, color]) => (
          <stop key={offset} offset={offset} style={{ stopColor: color }} />
        ))}
      </linearGradient>
      <filter id={`${id}soft`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation={pod ? 0.45 : 1.2} />
      </filter>
    </>
  );
  const solid = body(c.back, `url(#${id}body)`);
  const shadow = body(c.shadow, c.shadow);
  const svg = {
    width,
    height: (VISITOR_VIEW_HEIGHT * width) / gridWidth,
    viewBox: `0 ${VIEW_TOP} ${gridWidth} ${VISITOR_VIEW_HEIGHT}`,
    'aria-hidden': true,
    // Lift the svg so the waterline sits at the top of the swimmer's box (its `y`).
    style: { display: 'block', marginTop: -(animal.WL - VIEW_TOP) * unit },
    'data-testid': 'scene-visitor',
    'data-kind': kind,
  } as const;

  if (!pod) {
    const WL = SHARK.WL;
    return (
      <svg {...svg}>
        <defs>
          {defs}
          {/* SH1: only the dorsal fin shows above the water; the whole shark below. */}
          <clipPath id={`${id}above`}><rect x="17" y="-4" width="14" height={WL + 4} /></clipPath>
          <clipPath id={`${id}below`}><rect x="-4" y={WL} width="56" height="40" /></clipPath>
        </defs>
        <g clipPath={`url(#${id}below)`}>
          <g opacity={c.shadowOpacity} filter={`url(#${id}soft)`}>{shadow}</g>
        </g>
        <g clipPath={`url(#${id}above)`}>{solid}</g>
        <path d={`M20.6 ${WL}H28.8`} style={line(c.glint, 0.7)} />
        <path d={`M28.4 ${WL}L11 ${WL - 1.5}M28.4 ${WL + 0.15}L11 ${WL + 1.9}`} style={line(c.glint, 0.45, 0.6)} data-testid="visitor-wake" />
      </svg>
    );
  }

  return (
    <svg {...svg}>
      <style>{ROLL_CSS}</style>
      <defs>
        {defs}
        {pod.map(([ox, oy], i) => (
          <g key={i}>
            <clipPath id={`${id}above${i}`}><rect x={ox - 6} y="-6" width="60" height={DOLPHIN.WL + oy + 6} /></clipPath>
            <clipPath id={`${id}below${i}`}><rect x={ox - 6} y={DOLPHIN.WL + oy} width="60" height="40" /></clipPath>
          </g>
        ))}
      </defs>
      {pod.map(([ox, oy], i) => {
        const wl = DOLPHIN.WL + oy;
        const roll = { animation: `scene-dolphin-roll ${ROLL_EVERY_SEC}s linear ${rolls[i]}s infinite both` };
        const glint = { animation: `scene-dolphin-glint ${ROLL_EVERY_SEC}s linear ${rolls[i]}s infinite both` };
        return (
          <g key={i} data-testid="visitor-dolphin">
            <g clipPath={`url(#${id}below${i})`}>
              <g opacity={c.shadowOpacity * 0.7} filter={`url(#${id}soft)`}>
                <g transform={`translate(${ox} ${oy})`}><g style={roll}>{shadow}</g></g>
              </g>
            </g>
            <g clipPath={`url(#${id}above${i})`}>
              <g transform={`translate(${ox} ${oy})`}>
                <g style={roll}>
                  {solid}
                  <path d={DOLPHIN.mouth} style={line(c.back, 0.6)} />
                  <circle cx={DOLPHIN.eye[0]} cy={DOLPHIN.eye[1]} r={0.75} style={{ fill: 'hsl(var(--scene-fish-eye))' }} />
                </g>
              </g>
            </g>
            <g style={glint}>
              <path d={`M${ox + 13} ${wl}H${ox + 31}`} style={line(c.glint, 0.7)} />
              <path d={`M${ox + 30} ${wl}L${ox + 12} ${wl - 1.3}M${ox + 30} ${wl + 0.15}L${ox + 12} ${wl + 1.7}`} style={line(c.glint, 0.45, 0.6)} data-testid="visitor-wake" />
            </g>
          </g>
        );
      })}
    </svg>
  );
};

export default SceneVisitor;
