import { createLucideIcon } from 'lucide-react';

// Scene icons from the Bats & Boats lookbook (ROADMAP item 36), drawn on lucide's
// 24 px grid (2 px round strokes, no fill) so they match lucide's Fish. The boats are
// drawn by SceneBoat since item 73.
// createLucideIcon gives them the same props (size, strokeWidth, className, children).

export const Bat = createLucideIcon('Bat', [
  [
    'path',
    {
      d: 'M12 8.2 13 6.8 13.3 8.6 13.6 9.2 17.5 7 22 10Q20 10.8 19.5 12.5 17.8 11.9 16.5 13.5 14.8 12.2 13.2 13L12 15.5 10.8 13Q9.2 12.2 7.5 13.5 6.2 11.9 4.5 12.5 4 10.8 2 10L6.5 7 10.4 9.2 10.7 8.6 11 6.8Z',
      key: 'wings',
    },
  ],
]);

// Fish from the Fish & Currents lookbook (ROADMAP item 62), on the same grid, facing
// right like lucide's Fish. The classic fish and the turtle come from lucide.
export const Minnow = createLucideIcon('Minnow', [
  ['path', { d: 'M7 12c2.2-2.2 8-3 14 0-6 3-11.8 2.2-14 0Z', key: 'body' }],
  ['path', { d: 'M7 12 3.5 9.5v5Z', key: 'tail' }],
  ['path', { d: 'M18 11.6h.01', key: 'eye' }],
]);

export const Perch = createLucideIcon('Perch', [
  ['path', { d: 'M6 12.5C7.5 8.5 11 6.5 15 6.5c3.5 0 6 2.5 7 6-1 3-3.5 5-7 5-4 0-7.5-1.5-9-5Z', key: 'body' }],
  ['path', { d: 'M6 12.5 2.5 9v7Z', key: 'tail' }],
  ['path', { d: 'M9 8.6 10 4.5l2 2.2 1.5-2.7 1.5 2.5', key: 'spiny-fin' }],
  ['path', { d: 'M12 9v6.5', key: 'stripe-1' }],
  ['path', { d: 'M15.5 8.5v7', key: 'stripe-2' }],
  ['path', { d: 'M19 11.2h.01', key: 'eye' }],
]);

export const Pike = createLucideIcon('Pike', [
  ['path', { d: 'M5 12c3-1.8 8-2.5 12.5-2.2 2 .2 4 1 5.5 2.2-1.5 1.2-3.5 2-5.5 2.2C13 14.5 8 13.8 5 12Z', key: 'body' }],
  ['path', { d: 'M5 12 1.5 9v6Z', key: 'tail' }],
  ['path', { d: 'M7.5 11 9 8.8l1.7 1.5', key: 'fin' }],
  ['path', { d: 'M18.5 11.2h.01', key: 'eye' }],
  ['path', { d: 'M19.8 12.9 22.2 12.3', key: 'jaw' }],
]);

export const Carp = createLucideIcon('Carp', [
  ['path', { d: 'M6 12c1-4.3 4.7-7 8.8-7C18.8 5 21.3 8 22 12c-.7 4-3.2 7-7.2 7C10.7 19 7 16.3 6 12Z', key: 'body' }],
  ['path', { d: 'M6 12 2 8.5c-.8 2.3-.8 4.7 0 7Z', key: 'tail' }],
  ['path', { d: 'M10 7.3 12 4h3.5l1.3 1.3', key: 'fin' }],
  ['path', { d: 'M21.8 13.4c.6 1.4.2 2.6-1 3.4', key: 'whisker' }],
  ['path', { d: 'M16 7.5c1.3 2.5 1.3 6.5 0 9', key: 'gill' }],
  ['path', { d: 'M18.8 10.5h.01', key: 'eye' }],
]);

export const Catfish = createLucideIcon('Catfish', [
  ['path', { d: 'M3.5 13.5C7 11.5 12 10 17 10c2.8 0 4.6 1.2 5 3-.5 1.6-2.3 2.5-5 2.5-5.5 0-10-.5-13.5-2Z', key: 'body' }],
  ['path', { d: 'M3.5 13.5 1.5 11.5V16Z', key: 'tail' }],
  ['path', { d: 'M11 10.8 12 8.8l1.3 1.3', key: 'fin' }],
  ['path', { d: 'M21.8 12.3c.4-1.8-.3-3.2-1.8-4.3', key: 'whisker-up' }],
  ['path', { d: 'M21.3 14.8c-.3 1.8-1.6 3.1-3.6 3.9', key: 'whisker-down' }],
  ['path', { d: 'M19.3 11.9h.01', key: 'eye' }],
]);

export const Trout = createLucideIcon('Trout', [
  ['path', { d: 'M5.5 12c2-3 5.5-4.8 9.5-4.8s6 1.8 7 4.8c-1 3-3 4.8-7 4.8S7.5 15 5.5 12Z', key: 'body' }],
  ['path', { d: 'M5.5 12 2.2 8.3c.8 2.4.8 5 0 7.4Z', key: 'tail' }],
  ['path', { d: 'M11.5 7.7 13 5.5l2 1.7', key: 'fin' }],
  ['path', { d: 'M10.5 10.5h.01', key: 'spot-1' }],
  ['path', { d: 'M13.5 9.8h.01', key: 'spot-2' }],
  ['path', { d: 'M12 13.8h.01', key: 'spot-3' }],
  ['path', { d: 'M16 13h.01', key: 'spot-4' }],
  ['path', { d: 'M19 11.2h.01', key: 'eye' }],
]);

// Seen from above: a flat diamond with a thin tail.
export const Ray = createLucideIcon('Ray', [
  ['path', { d: 'M19 12c-2-1-4-4-7-8-1.5 3-3 6-5 8 2 2 3.5 5 5 8 3-4 5-7 7-8Z', key: 'body' }],
  ['path', { d: 'M7 12H1.5', key: 'tail' }],
  ['path', { d: 'M16 10.8h.01', key: 'eye-1' }],
  ['path', { d: 'M16 13.2h.01', key: 'eye-2' }],
]);

export const Jellyfish = createLucideIcon('Jellyfish', [
  ['path', { d: 'M5 12a7 7 0 0 1 14 0c-1.2.8-2.3.8-3.5 0-1.2.8-2.3.8-3.5 0-1.2.8-2.3.8-3.5 0-1.2.8-2.3.8-3.5 0Z', key: 'bell' }],
  ['path', { d: 'M8.5 13.5c-.8 2 .8 3.5 0 6', key: 'arm-1' }],
  ['path', { d: 'M12 13.5c-.8 2.5.8 4.5 0 7.5', key: 'arm-2' }],
  ['path', { d: 'M15.5 13.5c-.8 2 .8 3.5 0 6', key: 'arm-3' }],
]);

export const Seahorse = createLucideIcon('Seahorse', [
  ['path', { d: 'M12.5 3C11 3.2 10.3 4.3 10.4 5.8c.1 1.1-.4 2.2-.8 3.4-.9 2.3-.6 4.6.8 6.3.9 1.1 2.6 2 3 3.4.3 1.2-.4 2.4-1.5 2.4s-1.7-1-1.2-1.9', key: 'back' }],
  ['path', { d: 'M12.5 3c1.3 0 2.3.8 2.8 1.9L20 5.8l-.2 1.6-4.4-.1c-.4 1 0 2 .7 3 1.2 1.8.8 4.2-1.2 5.6-.8.6-1.2 1.2-1.3 1.8', key: 'front' }],
  ['path', { d: 'M9.8 10.5 7.8 11.6l1.9 1.6', key: 'fin' }],
  ['path', { d: 'M13.6 5.6h.01', key: 'eye' }],
]);

export const Whale = createLucideIcon('Whale', [
  ['path', { d: 'M22 13c0 3-3.6 5-8.5 5C9 18 6.5 16 4.5 12.5 7 9.5 9.5 8 13.5 8 18.4 8 22 10 22 13Z', key: 'body' }],
  ['path', { d: 'M4.5 12.5C3.5 10.8 2.6 10 1.5 9.8c.2 1.3.8 2.2 1.8 2.7-.9.5-1.5 1.4-1.7 2.7 1.1-.1 2-.9 2.9-2.7', key: 'fluke' }],
  ['path', { d: 'M22 13.8c-1.4.9-3.3 1.2-5 .8', key: 'mouth' }],
  ['path', { d: 'M18 12.5h.01', key: 'eye' }],
]);

export const Pufferfish = createLucideIcon('Pufferfish', [
  ['path', { d: 'M20 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', key: 'body' }],
  ['path', { d: 'M6 12 3 9.5v5Z', key: 'tail' }],
  ['path', { d: 'M13 5V3.4', key: 'spike-top' }],
  ['path', { d: 'M8.05 7.05 6.9 5.9', key: 'spike-top-left' }],
  ['path', { d: 'M17.95 7.05 19.1 5.9', key: 'spike-top-right' }],
  ['path', { d: 'M8.05 16.95 6.9 18.1', key: 'spike-bottom-left' }],
  ['path', { d: 'M17.95 16.95 19.1 18.1', key: 'spike-bottom-right' }],
  ['path', { d: 'M13 19v1.6', key: 'spike-bottom' }],
  ['path', { d: 'M16.5 10.5h.01', key: 'eye' }],
]);

// Night fish from the Night waters lookbook (ROADMAP item 65). The lanternfish's belly
// lights and the anglerfish's lure are drawn by CloudLayer (FISH `lights`), like the boat lights.
export const Burbot = createLucideIcon('Burbot', [
  ['path', { d: 'M3 12.5c3-2.5 8-3.5 13-3.5 3 0 5 1 6 3-1 2-3 3-6 3-5 0-10-.5-13-2.5Z', key: 'body' }],
  ['path', { d: 'M3 12.5 1 10.3v4.4Z', key: 'tail' }],
  ['path', { d: 'M7 10.7c3-.8 6-1.3 8.5-1.4', key: 'fin' }],
  ['path', { d: 'M20.6 14.3l.3 1.8', key: 'whisker' }],
  ['path', { d: 'M19 11.3h.01', key: 'eye' }],
]);

export const Eel = createLucideIcon('Eel', [
  ['path', { d: 'M2 12.3c4-2 12-2.6 18-2 1.4.1 2.3.8 2.3 1.6s-.9 1.5-2.3 1.6c-6 .6-14 .1-18-1.2Z', key: 'body' }],
  ['path', { d: 'M6 10.6c4-.8 8-1.1 11-1.1', key: 'fin' }],
  ['path', { d: 'M19.5 11.6h.01', key: 'eye' }],
]);

export const Lanternfish = createLucideIcon('Lanternfish', [
  ['path', { d: 'M5 12c2.5-3 6-4.5 10-4.5 3 0 5.5 1.5 7 4.5-1.5 3-4 4.5-7 4.5-4 0-7.5-1.5-10-4.5Z', key: 'body' }],
  ['path', { d: 'M5 12 2 9v6Z', key: 'tail' }],
  ['path', { d: 'M18.5 10.8h.01', key: 'eye' }],
]);

export const Anglerfish = createLucideIcon('Anglerfish', [
  ['path', { d: 'M4 12c1.5-4 5-6.5 9.5-6.5 4.5 0 7.5 2.5 8.5 6.5-1 3.5-4 6-8.5 6-4.5 0-8-2.5-9.5-6Z', key: 'body' }],
  ['path', { d: 'M4 12 1.5 9v6Z', key: 'tail' }],
  ['path', { d: 'M22 12.3 18 13.2', key: 'mouth' }],
  ['path', { d: 'M17 9.3h.01', key: 'eye' }],
  ['path', { d: 'M15 5.6c.5-2 2.3-3.2 4.5-3.2', key: 'lure-rod' }],
]);

// A firefly squid is only its light: one point, filled with the current colour.
export const FireflySquid = createLucideIcon('FireflySquid', [
  ['circle', { cx: '12', cy: '12', r: '4', fill: 'currentColor', stroke: 'none', key: 'light' }],
]);
