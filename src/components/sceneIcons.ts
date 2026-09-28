import { createLucideIcon } from 'lucide-react';

// Scene icons from the Bats & Boats lookbook (ROADMAP item 36), drawn on lucide's
// 24 px grid (2 px round strokes, no fill) so they match lucide's Sailboat and Fish.
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

export const LakeFerry = createLucideIcon('LakeFerry', [
  ['path', { d: 'M2 15h20l-2.5 4h-15Z', key: 'hull' }],
  ['path', { d: 'M5 15v-4h14v4', key: 'lower-deck' }],
  ['path', { d: 'M8 11V8h8v3', key: 'upper-deck' }],
  ['path', { d: 'M11 8V4.5h2.5V8', key: 'funnel' }],
  ['path', { d: 'M8 13h.01', key: 'window-1' }],
  ['path', { d: 'M12 13h.01', key: 'window-2' }],
  ['path', { d: 'M16 13h.01', key: 'window-3' }],
]);

export const FishingBoat = createLucideIcon('FishingBoat', [
  ['path', { d: 'M2 14h20l-3 6H5Z', key: 'hull' }],
  ['path', { d: 'M5 14V9h5v5', key: 'wheelhouse' }],
  ['path', { d: 'M7.5 11h.01', key: 'window' }],
  ['path', { d: 'M15 14V3', key: 'mast' }],
  ['path', { d: 'm15 4 6 10', key: 'stay' }],
]);

export const Rowboat = createLucideIcon('Rowboat', [
  ['path', { d: 'M3 16h18l-3 4H6Z', key: 'hull' }],
  ['circle', { cx: '12', cy: '10.5', r: '1.5', key: 'head' }],
  ['path', { d: 'M12 12v4', key: 'body' }],
  ['path', { d: 'm7 12 10 7', key: 'oar' }],
]);

export const Freighter = createLucideIcon('Freighter', [
  ['path', { d: 'M1.5 15h21l-2 4h-17Z', key: 'hull' }],
  ['path', { d: 'M3.5 15V9H7v6', key: 'bridge' }],
  ['path', { d: 'M5 9V6.5', key: 'mast' }],
  ['path', { d: 'M9 15v-3h12v3', key: 'containers-low' }],
  ['path', { d: 'M13 12v3', key: 'divider-1' }],
  ['path', { d: 'M17 12v3', key: 'divider-2' }],
  ['path', { d: 'M9 12V9h8v3', key: 'containers-high' }],
  ['path', { d: 'M13 9v3', key: 'divider-3' }],
]);
