import { useId } from 'react';
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

// `parts` are drawn in order (back to front). `lights` glow once the sun is down: points
// in the grid, and the windows. `stern` is where the wake starts.
const FLEET: Record<BoatKind, { parts: [Role, string][]; lights: [number, number][]; litWindows: boolean; stern: number }> = {
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
};

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
          <g fill={`url(#${id}wake)`} data-testid="boat-wake">
            <path d={`M${boat.stern + 2} 35.4h-34v1h34Z`} />
            <path d={`M${boat.stern} 38.6h-21v0.8h21Z`} opacity={0.6} />
          </g>
        )}
        {parts}
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
