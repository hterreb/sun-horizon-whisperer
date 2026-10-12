import { useId, type CSSProperties, type ReactNode } from 'react';
import { type BoatTone, type FishKind } from '../utils/weatherEffectsUtils';

// The fish in the Fish Redone lookbook's FS1 "Silhouettes" (ROADMAP item 85): filled bodies
// in two tones, a dark back over a pale belly, no outline, on lucide's 24 px grid, facing
// right. They replace the item 62 and 65 line icons. Night fish (item 65) are lit by the
// moon or carry their own light. The shark and the dolphins are drawn by SceneVisitor.
// The whale is the Whale lookbook's sperm whale (item 144, D), with a calf (E), a rise to the
// surface with a spout (G) and the sea sparkle at night (I).

// 'flipper': a pale part in front of the body (item 144: the sperm whale's lower jaw).
type PathRole = 'fin' | 'limb' | 'body' | 'side' | 'flipper' | 'band' | 'stripe' | 'spike' | 'whisker';
type DotRole = 'spot' | 'eye' | 'bigeye';
type Part = [PathRole, string] | [DotRole, number, number];

// `parts` are drawn by role, back to front (ROLE_ORDER). `grad` is the body's gradient: a
// vertical back-to-belly one by default. `night`: a night species (item 65), in the moon tone
// even without a light. `glow` is the E1 spot after sunset (item 62), at the body centre;
// `lights` are always on with the fish's own light (item 65): [cx, cy, r].
interface Shape {
  parts: Part[];
  grad?: 'radial' | 'h' | 'jelly';
  thin?: number; // the whisker stroke width
  spotPale?: boolean;
  eyePale?: boolean;
  night?: boolean;
  glow?: [number, number];
  lights?: [number, number, number][];
}

const SHAPES: Record<Exclude<FishKind, 'shark' | 'dolphins'>, Shape> = {
  classic: {
    parts: [
      ['fin', 'M6.7 11.3 2.6 8.1c-.6 2.6-.6 5.2 0 7.8l4.1-3.2'],
      ['fin', 'M15.6 6.4C14.8 5.2 13.4 4.4 11.6 4.2c-.2 1.3-.7 2.6-1.4 3.7'],
      ['fin', 'M14.8 17.6c-.9 1.2-2.2 1.9-3.8 2.1.3-.9.6-1.6 1.1-2.3'],
      ['body', 'M6.2 12c1.5-3.6 4.8-5.7 8.6-5.7 3.6 0 6.2 2.2 7.2 5.7-1 3.5-3.6 5.7-7.2 5.7-3.8 0-7.1-2.1-8.6-5.7Z'],
      ['side', 'M15.6 12.6c-1.3.2-2.6.9-3.4 2.1 1.4.3 2.7-.2 3.4-2.1Z'],
      ['eye', 19.2, 11],
    ],
    glow: [14, 12],
  },
  minnow: {
    parts: [
      ['fin', 'M7.6 11.6 3.4 9.2c.4 1.9.4 3.7 0 5.6l4.2-2.4'],
      ['fin', 'M13.6 9.7c-.7-.4-1.4-.8-2.4-1-.1.6-.1 1.2.1 1.7'],
      ['body', 'M7 12c2.4-2.2 7.6-3 14-.2-6.4 2.9-11.6 2.4-14 .2Z'],
      ['stripe', 'M9 12.1c3 .3 6 .2 8.6-.4'],
      ['eye', 18.4, 11.4],
    ],
    glow: [13, 12],
  },
  perch: {
    parts: [
      ['fin', 'M6.6 11.7 2.6 8.8c-.5 2.4-.5 4.9 0 7.4l4-2.7'],
      ['fin', 'M15.2 6.8 14.3 4.9l-1.2 1.4-1-2.2-1.1 2.1-1.2-1.5-.6 3.5'],
      ['fin', 'M14 17.4c-.6 1.1-1.6 1.8-3 2 .2-.8.6-1.5 1.1-2.1'],
      ['body', 'M6 12.5C7.5 8.6 10.9 6.8 15 6.8c3.5 0 6 2.3 7 5.7-1 3-3.5 5-7 5-4.1 0-7.5-1.4-9-5Z'],
      ['stripe', 'M11 8.6v7.6M14.4 7.4v9.4'],
      ['eye', 19.6, 11.2],
    ],
    glow: [13.5, 12.5],
  },
  pike: {
    parts: [
      ['fin', 'M5.4 11.6 1.4 8.8v6.4l4-2.8'],
      ['fin', 'M9.8 10.4C9.2 9.4 8.4 8.8 7.2 8.6c0 .9-.2 1.7-.6 2.4'],
      ['fin', 'M9.8 13.7c-.6 1-1.4 1.6-2.6 1.8 0-.9-.2-1.7-.6-2.4'],
      ['fin', 'M14.2 14.1c-.5.8-1.2 1.3-2.2 1.5.1-.6.3-1.1.6-1.6'],
      ['body', 'M4.8 12c3.2-1.9 8-2.7 12.6-2.4 2.1.1 4.1.9 5.6 2.1-1.5 1.3-3.5 2-5.6 2.2-4.6.4-9.4-.3-12.6-1.9Z'],
      ['spot', 11.2, 11.4],
      ['spot', 13.6, 11],
      ['spot', 12.4, 12.8],
      ['stripe', 'M19.8 12.8 22.6 12.2'],
      ['eye', 18.6, 11.1],
    ],
    spotPale: true, glow: [13, 12],
  },
  carp: {
    parts: [
      ['fin', 'M6.6 11.2 2.1 7.9c-.8 2.7-.8 5.5 0 8.2l4.5-3.3'],
      ['fin', 'M16.4 5.4C16 4.4 15.4 3.7 14.6 3.4l-3.8.4c-.7 1.4-1.4 2.8-2 4.4'],
      ['fin', 'M15.4 18.6c-.8 1.1-2 1.8-3.6 2 .3-.9.7-1.6 1.3-2.3'],
      ['body', 'M6 12c1-4.2 4.6-6.8 8.7-6.8 4 0 6.5 2.9 7.3 6.8-.8 3.9-3.3 6.8-7.3 6.8-4.1 0-7.7-2.6-8.7-6.8Z'],
      ['side', 'M15.8 13c-1.4.2-2.6 1-3.4 2.2 1.5.3 2.8-.3 3.4-2.2Z'],
      ['whisker', 'M21.9 13.2c.5 1.4.1 2.6-1.1 3.4'],
      ['eye', 19, 10.4],
    ],
    glow: [12, 12],
  },
  catfish: {
    parts: [
      ['fin', 'M4 13.1C2.8 12.1 2 11.6 1.3 11.5c-.4 1.4-.4 2.9 0 4.3.7-.1 1.5-.6 2.7-1.6'],
      ['fin', 'M13.6 10.3c-.4-.8-1-1.4-1.8-1.6-.1.6-.3 1.2-.6 1.8'],
      ['fin', 'M15 15.4c-.4.7-1 1.2-1.8 1.4-3.2.2-6.2-.4-8.8-2.8'],
      ['body', 'M3.5 13.4C7 11.4 12 9.9 17 9.9c2.8 0 4.6 1.2 5 3-.5 1.7-2.3 2.6-5 2.6-5.5 0-10-.6-13.5-2.1Z'],
      ['side', 'M17.2 14.2c-.9.6-1.4 1.5-1.4 2.6 1-.4 1.5-1.3 1.4-2.6Z'],
      ['whisker', 'M21.8 12.3c.4-1.8-.3-3.2-1.8-4.3'],
      ['whisker', 'M21.3 14.8c-.3 1.8-1.6 3.1-3.6 3.9'],
      ['eye', 19.4, 11.9],
    ],
    glow: [12, 13],
  },
  trout: {
    parts: [
      ['fin', 'M6.1 11.4 2.2 8.3c.7 2.5.7 4.9 0 7.4l3.9-3.1'],
      ['fin', 'M14.6 7.3c-.5-1-1.3-1.7-2.5-2-.2.9-.6 1.8-1.2 3'],
      ['fin', 'M13.4 16.6c-.5.9-1.3 1.5-2.4 1.7.1-.7.3-1.3.7-1.9'],
      ['body', 'M5.5 12c2-3 5.5-4.8 9.5-4.8s6 1.8 7 4.8c-1 3-3 4.8-7 4.8S7.5 15 5.5 12Z'],
      ['band', 'M7.4 12.3c3.2.5 6.6.5 9.4-.2'],
      ['spot', 9.6, 10.3],
      ['spot', 12.2, 9.6],
      ['spot', 11, 13.4],
      ['spot', 14.4, 10.8],
      ['eye', 19, 11.1],
    ],
    glow: [13, 12],
  },
  ray: {
    parts: [
      ['whisker', 'M7.2 12H1.4'],
      ['body', 'M20 12c-1.6-.9-3.6-3.6-5.9-7.4-.6-1-1.6-1-2.2 0C10 7.9 8.6 10.6 7 12c1.6 1.4 3 4.1 4.9 7.4.6 1 1.6 1 2.2 0 2.3-3.8 4.3-6.5 5.9-7.4Z'],
      ['stripe', 'M17.4 12H9.6'],
      ['eye', 16.6, 10.8],
      ['eye', 16.6, 13.2],
    ],
    grad: 'radial', thin: 1.3, glow: [12.5, 12],
  },
  turtle: {
    parts: [
      ['fin', 'M18.6 12.4c.9-.9 2.1-1.4 3.2-1 .5.4.4 1.3-.3 1.8-.9.5-2 .5-2.9.1'],
      ['fin', 'M15.6 13.8c1 1.9 2.4 3.2 4.4 3.9-.3-1.8-1.3-3.3-2.7-4.2'],
      ['fin', 'M7.4 13.8c-.9 1.3-2.1 2.1-3.6 2.4.5-1.2 1.3-2.1 2.4-2.7'],
      ['body', 'M5.2 13.4C5.6 9.6 8.6 7 12.4 7c3.6 0 6.3 2.6 6.8 6.4-4.6 1-9.4 1-14 0Z'],
      ['stripe', 'M9 8.4l1.4 2.6h4l1.4-2.6M10.4 11l-1.2 2.6M14.4 11l1.2 2.6'],
      ['eye', 20.6, 11.9],
    ],
    eyePale: true, glow: [12, 11],
  },
  jellyfish: {
    parts: [
      ['whisker', 'M9 13.4c-.8 2.1.7 3.8 0 6.2'],
      ['whisker', 'M12 13.6c-.8 2.4.8 4.4 0 7.2'],
      ['whisker', 'M15 13.4c-.8 2.1.7 3.8 0 6.2'],
      ['body', 'M5 12a7 7 0 0 1 14 0c-1.2.8-2.3.8-3.5 0-1.2.8-2.3.8-3.5 0-1.2.8-2.3.8-3.5 0-1.2.8-2.3.8-3.5 0Z'],
      ['stripe', 'M8.2 9.4c2.2-1.5 5.4-1.5 7.6 0'],
    ],
    grad: 'jelly', glow: [12, 9],
  },
  seahorse: {
    parts: [
      ['fin', 'M9.7 10.2c-1 .3-1.8 1-2.2 2 .8.4 1.6.5 2.4.3'],
      ['fin', 'M11.6 3 11.3 1.5l1.5 1'],
      ['limb', 'M11.8 17.3c.4 1.5.2 2.9-.8 3.7-.9.7-2.1.4-2.3-.5-.2-.8.5-1.4 1.2-1.1'],
      ['body', 'M12.4 2.8c1.3 0 2.4.8 2.9 1.9l4.7.9-.1 1.6-4.3-.1c-.3.9 0 1.9.6 2.8 1.4 1.9 1.3 4.6-.6 6.3-1 .9-2.2 1.3-3.4 1.2-1.6-.2-2.6-1.5-2.8-3.1-.2-1.8.4-3.4.4-5.2 0-1.2-.6-2.2-.6-3.4.1-1.6 1.3-2.9 3.2-2.9Z'],
      ['stripe', 'M13.6 11.2l2.8-.4M13.4 13.8l2.6.5'],
      ['eye', 13.6, 5.2],
    ],
    grad: 'h', glow: [12.5, 11],
  },
  // Item 144, D: a sperm whale. A box head (a third of the body), a narrow pale lower jaw, a low
  // hump and knuckles on the back, broad flat flukes. 3.3 : 1.
  whale: {
    parts: [
      ['fin', 'M4.4 11.9C3.2 11.4 1.8 10.9.2 10.9c.9.6 1.6 1 2.3 1.3-.7.4-1.5.9-2.1 1.6 1.5.1 2.8-.3 4-1.1Z'],
      ['fin', 'M17.6 14.6c-.5.9-1.3 1.5-2.3 1.8.3-.8.8-1.4 1.4-1.9Z'],
      ['body', 'M21.6 9.2C22.6 9.4 23 10.4 23 11.6 23 12.8 22.6 13.5 21.6 13.7L18.8 13.9C16.9 14.5 14.8 14.9 12.6 14.9 9.6 14.9 6.4 13.9 3.8 12.6V11.7C4.8 11.4 5.4 11.2 5.8 11.1c.2-.3.6-.4.9-.2.2-.3.6-.4.9-.2C8.2 10.3 8.8 9.9 9.6 9.8 10.4 9.9 11 10.2 11.8 10.2 13.4 10.1 14.4 9.3 15.8 9.2 17.8 9.1 19.8 9.1 21.6 9.2Z'],
      ['flipper', 'M21.4 13.9C19.6 14.5 17.6 14.9 15.6 14.9 17.4 14.4 19.4 14 21.4 13.7Z'],
      ['eye', 15.9, 13],
    ],
    glow: [13, 12],
  },
  pufferfish: {
    parts: [
      ['fin', 'M6.4 11.2 3 8.8v6.4l3.4-2.4'],
      ['spike', 'M13 5V3.4M8.05 7.05 6.9 5.9M17.95 7.05 19.1 5.9M8.05 16.95 6.9 18.1M17.95 16.95 19.1 18.1M13 19v1.6'],
      ['body', 'M20 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z'],
      ['side', 'M14.4 12.6c1.2-.1 2.3.5 2.9 1.6-1.2.3-2.3-.2-2.9-1.6Z'],
      ['spot', 10.2, 9.2],
      ['spot', 12.6, 7.8],
      ['spot', 9.6, 12.2],
      ['eye', 16.6, 10.2],
    ],
    glow: [12.5, 12],
  },
  burbot: {
    parts: [
      ['fin', 'M3.4 12.3C2.4 11.3 1.6 10.8 1 10.7c-.4 1.4-.4 2.9 0 4.3.6-.1 1.4-.6 2.4-1.6'],
      ['fin', 'M15.6 9.1c-.3-.7-.9-1.2-1.6-1.4-.1.6-.3 1.1-.6 1.6'],
      ['fin', 'M12.8 9.3C10 8.7 7.2 9.4 4.6 11.4'],
      ['fin', 'M13.4 15.1C10.4 15.8 7.4 15.6 4.6 13.9'],
      ['body', 'M3 12.6c3-2.5 8-3.6 13-3.6 3 0 5 1.1 6 3-1 2-3 3.1-6 3.1-5 0-10-.5-13-2.5Z'],
      ['whisker', 'M20.6 14.3l.3 1.8'],
      ['eye', 19, 11.3],
    ],
    night: true,
  },
  eel: {
    parts: [
      ['fin', 'M16.4 10.2C12.6 9.6 8.8 9.8 5 10.8'],
      ['fin', 'M15.6 13.3c-3.6.4-7.2.2-10.6-.6'],
      ['body', 'M2 12.3c4-2 12-2.6 18-2 1.4.1 2.3.8 2.3 1.6s-.9 1.5-2.3 1.6c-6 .6-14 .1-18-1.2Z'],
      ['eye', 19.6, 11.6],
    ],
    night: true,
  },
  lanternfish: {
    parts: [
      ['fin', 'M5.6 11.5 2 8.8v6.4l3.6-2.7'],
      ['fin', 'M14.2 7.6c-.5-.9-1.2-1.5-2.2-1.8-.2.8-.5 1.5-1 2.2'],
      ['fin', 'M11.6 16.3c-.4.8-1.1 1.3-2 1.5 0-.6-.2-1.2-.5-1.7'],
      ['body', 'M5 12c2.5-3 6-4.5 10-4.5 3 0 5.5 1.5 7 4.5-1.5 3-4 4.5-7 4.5-4 0-7.5-1.5-10-4.5Z'],
      ['bigeye', 18.8, 10.8],
    ],
    night: true, lights: [[8, 13.4, 0.9], [10.5, 14.2, 0.9], [13, 14.7, 0.9], [15.5, 14.8, 0.9], [18, 14.3, 0.9]],
  },
  anglerfish: {
    parts: [
      ['fin', 'M4.6 11.3 1.4 8.8v6.4l3.2-2.5'],
      ['body', 'M4 12c1.5-4 5-6.5 9.5-6.5 4.5 0 7.5 2.5 8.5 6.5-1 3.5-4 6-8.5 6-4.5 0-8-2.5-9.5-6Z'],
      ['side', 'M11.2 13.2c-.5 1.4-.2 2.7 1 3.6.6-1.4.3-2.7-1-3.6Z'],
      ['stripe', 'M22 12.3 17.4 13.6'],
      ['whisker', 'M15 5.6c.5-2 2.3-3.2 4.5-3.2'],
      ['eye', 17, 9.3],
    ],
    night: true, lights: [[20.3, 2.6, 1.3]],
  },
  squid: {
    parts: [
      ['whisker', 'M11.6 11.1 4.6 9.4'],
      ['whisker', 'M11.4 12H3.6'],
      ['whisker', 'M11.6 12.9 4.6 14.6'],
      ['body', 'M21.8 12c-2.2-1.7-5.4-2.6-8.6-2.6-1 0-1.8 1.2-1.8 2.6s.8 2.6 1.8 2.6c3.2 0 6.4-.9 8.6-2.6Z'],
      ['eye', 13, 11.4],
    ],
    night: true, lights: [[4.6, 9.4, 0.9], [3.6, 12, 0.9], [4.6, 14.6, 0.9], [16.6, 12, 0.8]],
  },
};

const isDot = (part: Part): part is [DotRole, number, number] => typeof part[1] === 'number';

const ROLE_ORDER: (PathRole | DotRole)[] = ['fin', 'limb', 'body', 'side', 'flipper', 'band', 'stripe', 'spike', 'spot', 'whisker', 'eye', 'bigeye'];

// Item 144 (Whale lookbook E): the calf, a copy of the whale at 46 %, just above its back.
const WHALE_CALF = 'translate(8.4 .2) scale(.46)';

// Item 144 (G): the whale's own water surface (grid y). The rise brings the head and the hump
// RISE units up through it, with a TILT_DEG nose-up tilt, and the sink takes it back down with a
// nose-down tilt. Each takes RISE_SEC, so a near whale (56 px: 2.33 px per unit) moves at most
// 2.1 px/s, its head with the tilt at most 2.3 px/s.
const WHALE_WL = 7;
const RISE = 3.4;
const RISE_SEC = 6;
const TILT_DEG = 4;
// The spout comes from the blowhole at the front of the head and leans forward, as a sperm
// whale's blow does. White, it grows to 50 % over SPOUT_GROW_SEC (Lutz: 3 s, calmer than 1.5 s)
// and fades over SPOUT_FADE_SEC. The whale stays up until the spout is gone.
const SPOUT = 'M-.2 0C-.5-1.4-.9-2.8-1.6-3.9-2.4-5.1-1.8-6.6-.6-6.9.2-7.6 1.6-7.3 2-6.3 2.9-5.6 2.6-4.2 1.5-3.7.9-2.6.5-1.3.3 0Z';
const BLOWHOLE: [number, number] = [21.4, 9.2];
const SPOUT_LEAN_DEG = 20;
const BLOW_AT = RISE_SEC + 0.2;
const SPOUT_GROW_SEC = 3;
const SPOUT_FADE_SEC = 2;
const SINK_AT = BLOW_AT + SPOUT_GROW_SEC + SPOUT_FADE_SEC + 0.3;
const SURFACE_SEC = SINK_AT + RISE_SEC; // 17.5 s
// How far the grown spout reaches above the 24-unit box and ahead of it, in grid units (the
// lane plan of item 92 keeps that water free).
export const WHALE_SPOUT_TOP = 3;
export const WHALE_SPOUT_AHEAD = 3;

// Item 144 (I): at night a few sparks fade in and out behind the flukes: [cx, cy, r].
const SPARKS: [number, number, number][] = [[-0.9, 11.9, 0.42], [-2.3, 12.3, 0.36], [-3.7, 11.7, 0.32], [-5.1, 12.2, 0.28], [-6.5, 11.9, 0.24]];

// The surfacing as CSS keyframes (like the dolphins' roll, item 85), in 12 steps per move. All
// three run on one clock: the pose, the glint line on the water and the spout.
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const STEPS = 12;
const steps = (from: number, sec: number) => Array.from({ length: STEPS + 1 }, (_, k) => from + (k / STEPS) * sec);
const pct = (sec: number) => `${((sec / SURFACE_SEC) * 100).toFixed(2)}%`;
// How far up (0-1) the whale is `sec` into the surfacing, and its tilt (deg, nose up < 0).
const surfacePose = (sec: number) => {
  if (sec <= RISE_SEC) return { up: ease(sec / RISE_SEC), tilt: -TILT_DEG * Math.sin((Math.PI * sec) / RISE_SEC) };
  if (sec <= SINK_AT) return { up: 1, tilt: 0 };
  const p = Math.min(1, (sec - SINK_AT) / RISE_SEC);
  return { up: 1 - ease(p), tilt: TILT_DEG * Math.sin(Math.PI * p) };
};
const spoutLook = (sec: number) => {
  const q = sec - BLOW_AT;
  if (q <= 0) return { opacity: 0, scale: 0.35, dy: 0 };
  if (q <= SPOUT_GROW_SEC) {
    const k = ease(q / SPOUT_GROW_SEC);
    return { opacity: 0.5 * k, scale: 0.35 + 0.65 * k, dy: 0 };
  }
  const k = Math.min(1, (q - SPOUT_GROW_SEC) / SPOUT_FADE_SEC);
  return { opacity: 0.5 * (1 - k), scale: 1 + 0.15 * k, dy: -0.6 * k };
};
const whaleKeyframes = (): string => {
  const poseTimes = [...steps(0, RISE_SEC), ...steps(SINK_AT, RISE_SEC)];
  const rise = poseTimes.map(sec => {
    const { up, tilt } = surfacePose(sec);
    // Turns about the body's middle (12, 12.5), like SVG's rotate(a 12 12.5).
    return `${pct(sec)} { transform: translate(0px, ${(-RISE * up).toFixed(3)}px) translate(12px, 12.5px) rotate(${tilt.toFixed(2)}deg) translate(-12px, -12.5px); }`;
  });
  const glint = poseTimes.map(sec => `${pct(sec)} { opacity: ${(0.9 * surfacePose(sec).up).toFixed(3)}; }`);
  const spoutTimes = [0, ...steps(BLOW_AT, SPOUT_GROW_SEC), ...steps(BLOW_AT + SPOUT_GROW_SEC, SPOUT_FADE_SEC).slice(1), SURFACE_SEC];
  const spout = spoutTimes.map(sec => {
    const { opacity, scale, dy } = spoutLook(sec);
    return `${pct(sec)} { opacity: ${opacity.toFixed(3)}; transform: translate(0px, ${dy.toFixed(3)}px) scale(${scale.toFixed(3)}); }`;
  });
  return `@keyframes scene-whale-rise { ${rise.join(' ')} }
@keyframes scene-whale-glint { ${glint.join(' ')} }
@keyframes scene-whale-spout { ${spout.join(' ')} }
@keyframes scene-whale-spark { from { opacity: 0.15; } to { opacity: 0.7; } }`;
};
const WHALE_CSS = whaleKeyframes();

const fish = (token: string) => `hsl(var(--scene-fish-${token}))`;
const MOON = 'hsl(var(--scene-moon))';

// The two tones and the line (the jellyfish's rim and arms) by light: the species' own
// colours by day, the moon tone, or the dark body of a fish with its own light.
const palette = (kind: keyof typeof SHAPES, light: 'moon' | 'own' | undefined) => {
  if (light === 'moon') return { back: fish('moon-back'), belly: fish('moon-belly'), line: MOON };
  if (light === 'own') {
    if (kind === 'jellyfish') return { back: fish('jellyfish-glow'), belly: fish('jellyfish-glow-belly'), line: fish('jellyfish-glow') };
    if (kind === 'squid') return { back: fish('squid-back'), belly: fish('squid-belly'), line: fish('squid') };
    return { back: fish('own-back'), belly: fish('own-belly'), line: MOON };
  }
  if (kind === 'jellyfish') return { back: fish('jellyfish'), belly: fish('jellyfish-belly'), line: fish('jellyfish') };
  return { back: fish(`${kind}-back`), belly: fish(`${kind}-belly`), line: fish(`${kind}-back`) };
};

// The boat light (SceneBoat's TONE_FILTER, ROADMAP item 73) on a fish (item 145), without a filter.
const DIM: Partial<Record<BoatTone, { brightness: number; saturate: number }>> = {
  sun: { brightness: 0.92, saturate: 1.05 },
  twilight: { brightness: 0.72, saturate: 0.7 },
  night: { brightness: 0.36, saturate: 0.5 },
};
const percent = (share: number) => `${Math.round(share * 1000) / 10}%`;

// The boat light as a colour mix (item 145). Saturation: a mix in oklab with the colour's
// complement (the same colour with the hue turned 180°, a `longer hue` mix of the colour with
// itself) takes 2 × its share of the chroma away. A mix cannot add colour, so the sunset's
// saturate(1.05) is left out (under 0.01 in oklab). Brightness: a mix with black in sRGB, as
// CSS brightness().
const dimmed = (color: string, dim: { brightness: number; saturate: number }) => {
  const muted = dim.saturate < 1
    ? `color-mix(in oklab, ${color}, color-mix(in oklch longer hue, ${color}, ${color}) ${percent((1 - dim.saturate) / 2)})`
    : color;
  return `color-mix(in srgb, ${muted}, black ${percent(1 - dim.brightness)})`;
};

// Under water (ROADMAP item 145, lookbook option H): the colour mixes with the water at the
// fish's height (`--scene-fish-water`, set by CloudLayer), `water` % of it. The boat light then
// dims it in the same mix.
const underWater = (color: string, water: number, dim?: { brightness: number; saturate: number }) => {
  const wet = `color-mix(in oklab, ${color}, var(--scene-fish-water) ${water}%)`;
  return dim ? dimmed(wet, dim) : wet;
};

interface SceneFishProps {
  kind: keyof typeof SHAPES;
  light?: 'moon' | 'own'; // night fish (item 65): lit by the moon, or by its own light
  size: number; // px
  glow?: boolean; // the E1 spot after sunset (item 62)
  calf?: boolean; // item 144 (E): the whale swims with its calf
  // Item 144 (G): the whale rises once, `delay` s after the mount. `under` is the opacity of the
  // part under its water surface, as a share of the wrapper's (which has the part above it);
  // `glint` is the colour of the line on the water.
  surface?: { delay: number; under: number; glint: string };
  // Item 145: the share (%) of the water colour in each fill and line, none without. A fish with
  // its own light keeps its colours.
  water?: number;
  // Item 145: the boat light (getBoatTone) dims a fish without a night light, as it dims the boats.
  boatTone?: BoatTone;
  className?: string;
  style?: CSSProperties;
}

const SceneFish = ({ kind, light, size, glow = false, calf = false, surface, water, boatTone = 'day', className, style }: SceneFishProps) => {
  const id = useId().replace(/:/g, '');
  const shape = SHAPES[kind];
  const tone = light ?? (shape.night ? 'moon' : undefined);
  const base = palette(kind, tone);
  const jelly = shape.grad === 'jelly';
  const lights = tone === 'own' ? shape.lights ?? [] : [];
  const spot = glow && shape.glow ? [shape.glow] : [];
  const blue = kind === 'squid';
  // Item 144: the whale's sea sparkle at night (I) and its rise to the surface (G).
  const sparkle = kind === 'whale' && tone === 'own';
  const rise = kind === 'whale' ? surface : undefined;

  // Item 145: the colours under water, and in the air for the part of a rising whale above its
  // water line (no water there, only the boat light). The lights, the E1 spot, the whale's sea
  // sparkle, spout and glint line keep their colours.
  const dim = light ? undefined : DIM[boatTone];
  const coloursOf = (paint: (color: string) => string) => ({
    back: paint(base.back),
    belly: paint(base.belly),
    line: paint(base.line),
    mid: paint(`color-mix(in hsl, ${base.back}, ${base.belly})`),
    eye: paint(fish('eye')),
    band: paint(fish('trout-band')),
  });
  type Colours = ReturnType<typeof coloursOf>;
  const wet = water !== undefined && light !== 'own';
  const under = coloursOf(color => (water !== undefined && light !== 'own' ? underWater(color, water, dim) : color));
  const air = rise && wet ? coloursOf(color => (dim ? dimmed(color, dim) : color)) : under;

  const gradientOf = (gradientId: string, { back, belly, line, mid }: Colours) => {
    const stops: [number, string, number?][] =
      jelly ? [[0, belly, 0.95], [0.7, line, 0.6], [1, line, 0.35]] :
      shape.grad === 'radial' ? [[0, back], [0.55, back], [1, mid]] :
      [[0, back], [0.36, back], [0.66, belly], [1, belly]];
    const stopEls = stops.map(([offset, color, opacity]) => (
      <stop key={offset} offset={offset} style={{ stopColor: color, stopOpacity: opacity }} />
    ));
    return shape.grad === 'radial' ? (
      <radialGradient id={gradientId} cx="0.55" cy="0.5" r="0.55">{stopEls}</radialGradient>
    ) : (
      <linearGradient id={gradientId} x1="0" y1="0" x2={shape.grad === 'h' ? 1 : 0} y2={shape.grad === 'h' ? 0 : 1}>{stopEls}</linearGradient>
    );
  };
  const stroke = (color: string, width: number, opacity?: number): CSSProperties =>
    ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', opacity });

  const partsOf = ({ back, belly, line, mid, eye, band }: Colours, gradientId: string) => {
    const draw = (part: Part, i: number) => {
      if (isDot(part)) {
        const [role, cx, cy] = part;
        if (role === 'spot') return <circle key={i} cx={cx} cy={cy} r={0.6} style={{ fill: shape.spotPale ? belly : back }} />;
        if (role === 'eye') return <circle key={i} cx={cx} cy={cy} r={0.85} style={{ fill: shape.eyePale ? belly : eye }} />;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={1.35} style={{ fill: eye }} />
            <circle cx={cx + 0.4} cy={cy - 0.4} r={0.4} style={{ fill: belly }} />
          </g>
        );
      }
      const [role, d] = part;
      const look: CSSProperties =
        role === 'fin' ? { fill: back } :
        role === 'limb' ? stroke(back, 2.2) :
        role === 'body' ? { fill: `url(#${gradientId})` } :
        role === 'side' ? { fill: mid } :
        role === 'flipper' ? { fill: belly } :
        role === 'band' ? stroke(band, 1.6, 0.75) :
        role === 'stripe' ? (jelly ? stroke(belly, 1, 0.9) : stroke(back, 1.3, 0.5)) :
        role === 'spike' ? stroke(back, 1.4) :
        stroke(jelly ? line : back, shape.thin ?? (jelly ? 1.1 : 1), jelly ? 0.85 : undefined); // whisker
      return <path key={i} d={d} style={look} />;
    };
    return ROLE_ORDER.flatMap(role => shape.parts.filter(part => part[0] === role)).map(draw);
  };
  const parts = partsOf(under, `${id}body`);
  // I: a faint cyan line around the fins, the body and the jaw, with a soft glow.
  const outline = sparkle && (
    <g
      filter={`url(#${id}sparkle)`}
      style={{ fill: 'none', stroke: fish('jellyfish-glow'), strokeWidth: 0.35, strokeLinejoin: 'round', opacity: 0.8 }}
      data-testid="whale-outline"
    >
      {shape.parts.flatMap(part => (isDot(part) ? [] : [<path key={part[1]} d={part[1]} />]))}
    </g>
  );
  const animalOf = (drawn: ReactNode) => (
    <>
      {drawn}
      {outline}
      {lights.map(([cx, cy, r]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          filter={`url(#${id}glow)`}
          style={{ fill: blue ? fish('squid') : 'hsl(var(--brand-gold-light))' }}
          data-testid="fish-light"
        />
      ))}
      {spot.map(([cx, cy]) => (
        <circle
          key="glow"
          cx={cx}
          cy={cy}
          r={1.3}
          filter={`url(#${id}glow)`}
          style={{ fill: 'hsl(var(--brand-gold-light))' }}
          data-testid="fish-glow"
        />
      ))}
    </>
  );
  // G: one clock for the pose, the glint and the spout; before and after, the whale is under.
  const timing = rise && `${SURFACE_SEC}s linear ${rise.delay}s 1 both`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      // The spout reaches above the box and the sparks trail behind it.
      style={rise || sparkle ? { ...style, overflow: 'visible' } : style}
      data-testid="scene-fish"
      data-kind={kind}
    >
      {(rise || sparkle) && <style>{WHALE_CSS}</style>}
      <defs>
        {gradientOf(`${id}body`, under)}
        {air !== under && gradientOf(`${id}air`, air)}
        {(lights.length > 0 || spot.length > 0) && (
          // The boat lights' glow (item 73): gold, or blue for the firefly squid.
          <filter id={`${id}glow`} x="-200%" y="-200%" width="500%" height="500%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="0" stdDeviation="1.1" style={{ floodColor: blue ? fish('squid') : 'hsl(var(--brand-gold))' }} />
          </filter>
        )}
        {sparkle && (
          <filter id={`${id}sparkle`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="0" stdDeviation="1.1" style={{ floodColor: fish('jellyfish-glow') }} />
          </filter>
        )}
        {rise && (
          <>
            <clipPath id={`${id}above`}><rect x="-10" y="-12" width="44" height={12 + WHALE_WL} /></clipPath>
            <clipPath id={`${id}under`}><rect x="-10" y={WHALE_WL} width="44" height="30" /></clipPath>
            <filter id={`${id}spray`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.3" />
            </filter>
          </>
        )}
      </defs>
      {/* E: the calf takes its mother's colours (under water). */}
      {calf && <g transform={WHALE_CALF} data-testid="whale-calf">{parts}{outline}</g>}
      {rise ? (
        <>
          {/* Under its water surface the whale keeps its haze and the water's tint (item 145);
              above it, it is crisp and dry (as SceneVisitor). */}
          <g clipPath={`url(#${id}under)`} opacity={rise.under} data-testid="whale-under">
            <g style={{ animation: `scene-whale-rise ${timing}` }}>{animalOf(parts)}</g>
          </g>
          <g clipPath={`url(#${id}above)`} data-testid="whale-above">
            <g style={{ animation: `scene-whale-rise ${timing}` }}>{animalOf(air === under ? parts : partsOf(air, `${id}air`))}</g>
          </g>
          <path
            d={`M7.8 ${WHALE_WL}H23.4`}
            style={{ fill: 'none', stroke: rise.glint, strokeWidth: 0.4, strokeLinecap: 'round', animation: `scene-whale-glint ${timing}` }}
            data-testid="whale-glint"
          />
          <g transform={`translate(${BLOWHOLE[0]} ${BLOWHOLE[1] - RISE}) rotate(${SPOUT_LEAN_DEG})`}>
            <g style={{ animation: `scene-whale-spout ${timing}` }} data-testid="whale-spout">
              <path d={SPOUT} filter={`url(#${id}spray)`} style={{ fill: 'hsl(var(--scene-glow-white))' }} />
            </g>
          </g>
        </>
      ) : animalOf(parts)}
      {sparkle && SPARKS.map(([cx, cy, r], i) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r={r}
          // Each spark fades in and out over 5 s, the farther ones fainter; no blinking.
          style={{
            fill: fish('jellyfish-glow'), fillOpacity: 1 - 0.14 * i,
            animation: `scene-whale-spark 2.5s ease-in-out ${(-1.03 * i).toFixed(2)}s infinite alternate both`,
          }}
          data-testid="whale-spark"
        />
      ))}
    </svg>
  );
};

export default SceneFish;
