import { useId } from 'react';
import { useBunting } from '@/hooks/useBunting';
import BoatBunting from './BoatBunting';
import { type BoatKind, type BoatTone } from '../utils/weatherEffectsUtils';
import { getBoatReflection, UNKNOWN_SEA_WIND_KMH } from '../utils/waveUtils';

// The fleet in the Fleet Styles lookbook's B3 "Soft light" (ROADMAP item 73): flat colours
// with soft gradients, drawn on one 64 × 37 grid with the waterline at y 36 and the bow to
// the right. Every boat has a faint still reflection (X1); the fast ones trail a wake (X2).

const W = 64;
const H = 37;
// Drawn this wide, then scaled by CloudLayer, like the 48 px line icons before.
export const BOAT_WIDTH_PX = 48;
export const BOAT_HEIGHT_PX = (BOAT_WIDTH_PX * H) / W;

type Role = 'line' | 'hull' | 'stripe' | 'cabin' | 'roof' | 'sail' | 'jib' | 'funnel' | 'cap' | 'flag'
  | 'window' | 'rower' | 'cargo-1' | 'cargo-2' | 'cargo-3' | 'cargo-4';

const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const cargo = (n: number) => `cargo-${(n % 4) + 1}` as Role;
// Item 146: a square sail on a yard at `y`, centred on the mast at `x`: a little wider at the
// foot, and the foot bellies out.
const squareSail = (x: number, y: number, w: number, h: number) =>
  `M${x - w / 2} ${y}H${x + w / 2}L${x + w / 2 + 0.6} ${y + h}Q${x} ${y + h + 1.2} ${x - w / 2 - 0.6} ${y + h}Z`;
// The tall ship's masts (mizzen, main, fore): x, top, and the yard of the top sail.
const TALL_SHIP_MASTS: [number, number, number][] = [[18, 7.5, 9.5], [32, 3, 5], [46, 5, 7]];

// `parts` are drawn in order (back to front). `lights` glow once the sun is down: points
// in the grid, and the windows. `stern` is where the wake starts. `lightWake` (the tall ship,
// item 146): a fainter, shorter wake.
const FLEET: Record<BoatKind, { parts: [Role, string][]; lights: [number, number][]; litWindows: boolean; stern: number; lightWake?: boolean }> = {
  sailboat: {
    parts: [
      ['line', 'M30 3.5V30'],
      ['sail', 'M28.8 4.5C24 12 17.5 21 12 28.3H28.8Z'],
      ['jib', 'M31.2 7.5L54.5 28.3H32.6C33.6 21 33.2 14 31.2 7.5Z'],
      ['flag', 'M30 3.5 35.5 5 30 6.5Z'],
      ['hull', 'M7.5 29.6H60.5C59 33.4 56 36 51 36H14C10.5 35.2 8.5 33 7.5 29.6Z'],
      ['stripe', 'M9 31.4H59.6L58.9 32.8H9.7Z'],
    ],
    lights: [[30, 3.6]], litWindows: false, stern: 14,
  },
  ferry: {
    parts: [
      ['line', 'M5 27.5V20.5'],
      ['flag', 'M5 20.5 10.5 22 5 23.5Z'],
      ['funnel', 'M24.5 15 25.6 6.5H31.2L32 15Z'],
      ['cap', 'M25.6 6.5H31.2L31 8.6H25.4Z'],
      ['cabin', rect(9, 20, 46, 8)],
      ['cabin', rect(16, 14.5, 30, 5.5)],
      ['roof', rect(37.5, 10.5, 9, 4)],
      ['hull', 'M3 27.5H62C60.5 31.8 58.5 34.6 55 36H9.5C6 34.6 4 31.8 3 27.5Z'],
      ['stripe', 'M4.6 31.6H60.4L59.4 33.3H5.8Z'],
      ...[12.5, 19.5, 26.5, 33.5, 40.5, 47.5].map((x): [Role, string] => ['window', rect(x, 22.3, 4, 3)]),
      ...[19, 24.5, 30, 39.5].map((x): [Role, string] => ['window', rect(x, 16.2, 3.4, 2.3)]),
    ],
    lights: [], litWindows: true, stern: 9.5,
  },
  fishing: {
    parts: [
      ['line', 'M38 24.6V5M38 6 56.6 23.4M35 10H41'],
      ['cabin', 'M12 26.6V15.5H25V25.6Z'],
      ['roof', rect(10.5, 13.2, 16, 2.4)],
      ['window', rect(15, 17.6, 7, 3.4)],
      ['hull', 'M6 26.9 58.5 22.8C58 30 55.5 34.3 51.5 36H12.5C9 34.6 7 31.5 6 26.9Z'],
      ['stripe', 'M7.4 30.1 57 26.6 56.6 28.2 7.9 31.6Z'],
    ],
    lights: [[38, 5]], litWindows: true, stern: 12.5,
  },
  rowboat: {
    parts: [
      ['line', 'M19 30.5V25.6'],
      ['rower', 'M28 30.6C28 26 29 24.4 31 24.4S34 26 34 30.6Z'],
      ['rower', 'M31 23.3a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 1 0 0 5.2Z'],
      ['line', 'M24.5 25.4 45 36.4'],
      ['hull', 'M16 30.4H48C46.6 34 44 36 39.5 36H24C19.6 35.8 17 33.6 16 30.4Z'],
      ['stripe', 'M17 32.2H47.2L46.6 33.4H17.6Z'],
    ],
    lights: [[19, 24.6]], litWindows: false, stern: 24,
  },
  freighter: {
    parts: [
      ['line', 'M14.6 12V5.5M59.4 26.5V19.5'],
      ['funnel', 'M7.6 12 8.2 7H12L12.6 12Z'],
      ['cabin', rect(5.5, 14, 9.5, 12.5)],
      ['roof', rect(4.5, 12, 11.5, 2)],
      ['window', rect(7, 15.6, 6.5, 2.2)],
      ...[18, 26, 34, 42, 50].map((x, i): [Role, string] => [cargo(i), rect(x + 0.3, 21.5, 7.4, 5)]),
      ...[18, 26, 34, 42].map((x, i): [Role, string] => [cargo(i + 2), rect(x + 0.3, 16.5, 7.4, 4.8)]),
      ['hull', 'M2 26.5H62.5C61.6 31.6 59.6 34.6 56.5 36H6.2C4 34.2 2.6 31 2 26.5Z'],
      ['stripe', 'M3.3 32.4H60.6L59.4 34H4.5Z'],
    ],
    lights: [[14.6, 5.5], [59.4, 19.5]], litWindows: true, stern: 6.2,
  },
  // Item 146. The kayak: a yellow shell, the paddler as the rower, a paddle with a blade at each
  // end (one dips at the bow). No lights: it sails by day only.
  kayak: {
    parts: [
      ['rower', 'M28.6 33.5C28.6 27.4 29.9 25.2 32.4 25.2S36.2 27.4 36.2 33.5Z'],
      ['rower', 'M32.4 24.8a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 1 0 0 6.4Z'],
      ['cargo-3', 'M9 31.8C16 32.6 26 32.6 33 32.4S50 32.2 57 31C55 34 51 36 45 36H21C15 36 11.5 34.4 9 31.8Z'],
      ['stripe', 'M11 33.4C20 34 42 33.9 55.4 32.7L54.8 33.6C42 35 20 35.1 11.7 34.3Z'],
      ['line', 'M22 23.5 43 32.5'],
      ['roof', 'M19.79 22.55A2.4 0.95 23.2 1 1 24.21 24.45A2.4 0.95 23.2 1 1 19.79 22.55Z'],
      ['roof', 'M40.79 31.55A2.4 0.95 23.2 1 1 45.21 33.45A2.4 0.95 23.2 1 1 40.79 31.55Z'],
    ],
    lights: [], litWindows: false, stern: 21,
  },
  // The paddle steamer: one tall funnel, a white paddle box on the side with the bridge on
  // top, and a row of windows that glow gold after sunset.
  paddleSteamer: {
    parts: [
      ['line', 'M4.5 28V19.5M53 22V10'],
      ['flag', 'M4.5 19.5 10 21 4.5 22.5Z'],
      ['funnel', 'M21 22 21.6 5H25.4L26 22Z'],
      ['cap', 'M21.6 5H25.4L25.3 7.2H21.7Z'],
      ['cabin', rect(8, 22, 48, 6)],
      ['cabin', rect(28, 16.5, 10, 6)],
      ['roof', rect(27, 15.3, 12, 1.4)],
      ['hull', 'M3 28H62.5C61 32 59 34.7 55.5 36H9C5.8 34.7 4 32 3 28Z'],
      ['stripe', 'M4.6 31.6H60.8L60 33.1H5.6Z'],
      ['cabin', 'M24 31A9 9 0 0 1 42 31Z'],
      ['line', 'M24.6 31A8.4 8.4 0 0 1 41.4 31M34.7 30L39.9 27M34 29.3 37 24.1M33 29V23M32 29.3 29 24.1M31.3 30 26.1 27'],
      ...[9.5, 13.5, 17.5, 44, 48, 52].map((x): [Role, string] => ['window', rect(x, 23.7, 2.8, 2.6)]),
      ...[29.2, 32, 34.8].map((x): [Role, string] => ['window', rect(x, 17.6, 2, 2)]),
    ],
    lights: [[53, 10]], litWindows: true, stern: 9,
  },
  // The cruise liner: a big white ship, decks stepped back from the bow, rows of windows that
  // all glow after sunset.
  cruiseLiner: {
    parts: [
      ['line', 'M41 10.5V5'],
      ['funnel', 'M17 14.5 18.4 5H24L24.4 14.5Z'],
      ['cap', 'M18.4 5H24L23.9 7.2H18.2Z'],
      ['cabin', rect(29, 10.5, 18, 4)],
      ['cabin', rect(8, 14.5, 44, 4.5)],
      ['cabin', rect(5, 19, 52, 5)],
      ['roof', rect(28, 9.6, 20, 0.9)],
      ['cabin', 'M2 24H63L59.5 33H3.4C2.6 30.6 2.2 27.6 2 24Z'],
      ['hull', 'M3.4 33H59.5L58.4 36H5.6C4.6 35.2 3.9 34.2 3.4 33Z'],
      ['stripe', 'M2.6 29.6H61.3L61 30.6H2.8Z'],
      ...[31, 34.5, 38, 41.5, 44.5].map((x): [Role, string] => ['window', rect(x, 11.7, 2, 1.5)]),
      ...Array.from({ length: 11 }, (_, i): [Role, string] => ['window', rect(10 + i * 3.8, 16, 2.2, 1.5)]),
      ...Array.from({ length: 13 }, (_, i): [Role, string] => ['window', rect(7 + i * 3.8, 20.7, 2.2, 1.5)]),
      ...Array.from({ length: 15 }, (_, i): [Role, string] => ['window', rect(5.5 + i * 3.7, 26, 1.6, 1.4)]),
    ],
    lights: [[41, 5]], litWindows: true, stern: 5.6,
  },
  // The tall ship: three masts with three square sails each, a jib to the bowsprit, a white
  // band with gun ports, and a light on each masthead.
  tallShip: {
    parts: [
      ['line', `${TALL_SHIP_MASTS.map(([x, top]) => `M${x} 26V${top}`).join('')}M57 25 63.5 20.5`],
      ['jib', 'M47.5 9.5 63 21.2 51 25Z'],
      ...TALL_SHIP_MASTS.flatMap(([x, , y]): [Role, string][] => [
        ['line', `M${x - 4.2} ${y}H${x + 4.2}M${x - 5.2} ${y + 6}H${x + 5.2}M${x - 6} ${y + 12.6}H${x + 6}`],
        ['sail', squareSail(x, y, 7.4, 4.8)],
        ['sail', squareSail(x, y + 6, 9.4, 5.4)],
        ['sail', squareSail(x, y + 12.6, 11, 5.6)],
      ]),
      ['flag', 'M32 3 37.5 4.5 32 6Z'],
      ['hull', 'M3.5 26H60L62.5 24.8C61.3 30.6 58.6 34.6 54.5 36H10.5C6.8 34.8 4.6 31.4 3.5 26Z'],
      ['cabin', 'M4.3 28.6H61.6L61.2 30.4H4.8Z'],
      ...[10, 16, 22, 28, 34, 40, 46, 52].map((x): [Role, string] => ['window', rect(x, 29, 1.8, 1)]),
    ],
    lights: TALL_SHIP_MASTS.map(([x, top]): [number, number] => [x, top]), litWindows: false, stern: 10.5, lightWake: true,
  },
};

// Item 146: the tall ship's light wake, at half the strength and 60 % of the length of the others.
const LIGHT_WAKE = { opacity: 0.5, length: 0.6 };

const c = (name: string) => `hsl(var(--scene-boat-${name}))`;
const FLAT: Partial<Record<Role, string>> = {
  stripe: c('red'), flag: c('red'), roof: c('navy'), cap: c('navy'), window: c('window'), rower: c('rower'),
};

// One palette for the whole day: the light dims it (a CSS filter), and the lights stay bright.
const TONE_FILTER: Record<BoatTone, string> = {
  day: '',
  sun: 'brightness(0.92) saturate(1.05)',
  twilight: 'brightness(0.72) saturate(0.7)',
  night: 'brightness(0.36) saturate(0.5)',
};

interface SceneBoatProps {
  kind: BoatKind;
  tone: BoatTone;
  lit: boolean; // the sun is below the horizon: windows and mast lights glow
  wake: boolean;
  seaWindKmh?: number; // the reflection follows the wind (item 79, X2)
}

const SceneBoat = ({ kind, tone, lit, wake, seaWindKmh = UNKNOWN_SEA_WIND_KMH }: SceneBoatProps) => {
  const id = useId().replace(/:/g, '');
  const boat = FLEET[kind];
  const wakeLength = boat.lightWake ? LIGHT_WAKE.length : 1;
  // National days, Día de los Muertos and Christmas: the boats are dressed.
  const bunting = useBunting();
  const height = BOAT_HEIGHT_PX;
  // At dawn and in the evening the sails catch the peach light.
  const sail = tone === 'sun' ? [c('sun'), c('sun-deep')] : [c('white'), c('shade')];
  const gradients: [string, string, string, string][] = [
    ['hull', '0 0 0 1', c('hull'), c('hull-deep')],
    ['cabin', '0 0 1 1', c('white'), c('shade')],
    ['sail', '0 0 1 1', sail[0], sail[1]],
    ['jib', '1 0 0 1', sail[0], sail[1]],
    ['funnel', '0 0 1 0', c('red'), c('red-deep')],
    // ponytail: color-mix for the containers' shaded end instead of four more tokens.
    ...[1, 2, 3, 4].map((n): [string, string, string, string] =>
      [`cargo-${n}`, '0 0 0 1', c(`cargo-${n}`), `color-mix(in srgb, ${c(`cargo-${n}`)} 78%, black)`]),
  ];
  const parts = boat.parts.map(([role, d], i) => role === 'line'
    ? <path key={i} d={d} fill="none" stroke={c('navy')} strokeWidth={1.2} strokeLinecap="round" />
    : <path key={i} d={d} fill={FLAT[role] ?? `url(#${id}${role})`} />);
  const svg = { width: BOAT_WIDTH_PX, height, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': true, overflow: 'visible' } as const;
  const filter = TONE_FILTER[tone] || undefined;
  const reflection = getBoatReflection(seaWindKmh);
  // From moderate wind the mirror image breaks into stripes (item 79, X2).
  const mask = `linear-gradient(#000, transparent)${reflection.stripe ? `, repeating-linear-gradient(${reflection.stripe})` : ''}`;

  return (
    <div className="relative" style={{ width: BOAT_WIDTH_PX, height }} data-testid="scene-boat" data-kind={kind}>
      <svg {...svg} className="block transition-[filter] duration-1000" style={{ filter }}>
        <defs>
          {gradients.map(([name, coords, from, to]) => {
            const [x1, y1, x2, y2] = coords.split(' ');
            return (
              <linearGradient key={name} id={id + name} x1={x1} y1={y1} x2={x2} y2={y2}>
                <stop offset="0" style={{ stopColor: from }} />
                <stop offset="1" style={{ stopColor: to }} />
              </linearGradient>
            );
          })}
          <linearGradient id={`${id}wake`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'hsl(var(--scene-glow-white))', stopOpacity: 0.6 }} />
            <stop offset="1" style={{ stopColor: 'hsl(var(--scene-glow-white))', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {/* X2: two thin pale lines from under the stern, drawn first so the hull covers their start. */}
        {wake && (
          <g fill={`url(#${id}wake)`} data-testid="boat-wake" data-wake={boat.lightWake ? 'light' : 'full'} opacity={boat.lightWake ? LIGHT_WAKE.opacity : undefined}>
            <path d={`M${boat.stern + 2} 35.4h-${34 * wakeLength}v1h${34 * wakeLength}Z`} />
            <path d={`M${boat.stern} 38.6h-${21 * wakeLength}v0.8h${21 * wakeLength}Z`} opacity={0.6} />
          </g>
        )}
        {parts}
        {bunting && bunting.shape !== 'lights' && <BoatBunting kind={kind} colors={bunting.colors} shape={bunting.shape} />}
      </svg>
      {/* X1: a faint, still mirror image below the waterline, fading out downward: sharp in
          calm water, striped and fainter in wind (item 79, X2). */}
      <div
        className="absolute left-0 top-full w-full overflow-hidden"
        style={{
          height: `${reflection.heightPercent}%`,
          opacity: reflection.opacity,
          filter: reflection.blurPx > 0 ? `blur(${reflection.blurPx}px)` : undefined,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
        data-testid="boat-reflection"
      >
        <svg {...svg} className="absolute left-0 top-0" style={{ transform: 'scaleY(-1)', filter }}>{parts}</svg>
      </div>
      {bunting?.shape === 'lights' && (
        // Christmas: the bulbs light up the dark, so they sit above the dimming filter, like the mast lights.
        <svg {...svg} className="absolute inset-0">
          <BoatBunting kind={kind} colors={bunting.colors} shape="lights" lit={lit} />
        </svg>
      )}
      {lit && (
        <svg {...svg} className="absolute inset-0">
          <g className="fill-brand-gold-light" style={{ filter: 'drop-shadow(0 0 2px hsl(var(--brand-gold)))' }}>
            {boat.lights.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.7} data-testid="boat-light" />)}
            {boat.litWindows && boat.parts.filter(([role]) => role === 'window').map(([, d]) => <path key={d} d={d} data-testid="boat-light" />)}
          </g>
        </svg>
      )}
    </div>
  );
};

export default SceneBoat;
