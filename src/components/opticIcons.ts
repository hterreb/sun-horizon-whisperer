import { createLucideIcon, type LucideIcon } from 'lucide-react';
import { type OpticKind } from '@/utils/skyOptics';

// The badges of the sky optics (ROADMAP item 148, optics lookbook 2026-10-14), drawn on lucide's
// 24 px grid like sceneIcons. The card's kicker and the collection badge use the same icon.
// The crescents are paths (createLucideIcon has no masks): the disc minus a smaller offset disc.

const HALO_RAYS = 'M16.3 12L17.6 12M15 9L16 8M12 7.7L12 6.4M9 9L8 8M7.7 12L6.4 12M9 15L8 16M12 16.3L12 17.6M15 15L16 16';

export const OPTIC_ICONS: Record<OpticKind, LucideIcon> = {
  rays: createLucideIcon('OpticRays', [
    ['path', { d: 'M2 19.5h20', key: 'horizon' }],
    ['path', { d: 'M8.5 19.5a3.5 3.5 0 0 1 7 0', key: 'sun' }],
    ['path', { d: 'M6.9 17.4L2.7 15.8M8.5 15.3L4 9.9M10.9 14.1L9 5.3M13.5 14.2L15.4 7.5M15.8 15.5L19.6 11.6', key: 'rays' }],
  ]),
  sunDogs: createLucideIcon('OpticSunDogs', [
    ['circle', { cx: '12', cy: '12', r: '3.2', key: 'sun' }],
    ['path', { d: 'M17 12L18.4 12M15.5 8.5L16.5 7.5M12 7L12 5.6M8.5 8.5L7.5 7.5M7 12L5.6 12M8.5 15.5L7.5 16.5M12 17L12 18.4M15.5 15.5L16.5 16.5', key: 'rays' }],
    ['path', { d: 'M2.8 7.6 4.3 12 2.8 16.4 1.3 12Z M21.2 7.6 22.7 12 21.2 16.4 19.7 12Z', fill: 'currentColor', stroke: 'none', key: 'dogs' }],
  ]),
  halo: createLucideIcon('OpticHalo', [
    ['circle', { cx: '12', cy: '12', r: '10', key: 'ring' }],
    ['circle', { cx: '12', cy: '12', r: '2.6', key: 'sun' }],
    ['path', { d: HALO_RAYS, strokeWidth: '1.5', key: 'rays' }],
  ]),
  doubleRainbow: createLucideIcon('OpticDoubleRainbow', [
    ['path', { d: 'M23 18a11 11 0 0 0-22 0', strokeWidth: '1.5', opacity: '.6', key: 'outer' }],
    ['path', { d: 'M20.5 18a8.5 8.5 0 0 0-17 0', strokeWidth: '1.5', opacity: '.6', key: 'outer2' }],
    ['path', { d: 'M17.5 18a5.5 5.5 0 0 0-11 0', key: 'inner' }],
    ['path', { d: 'M15 18a3 3 0 0 0-6 0', key: 'inner2' }],
  ]),
  fogBow: createLucideIcon('OpticFogBow', [
    ['path', { d: 'M20.5 15.5a8.5 8.5 0 0 0-17 0', strokeWidth: '4.5', opacity: '.55', key: 'bow' }],
    ['path', { d: 'M3 19.5h7M13.5 19.5h7.5M6.5 22.5h11', key: 'fog' }],
  ]),
  moonbow: createLucideIcon('OpticMoonbow', [
    ['path', { d: 'M21 20.5a9 9 0 0 0-18 0', key: 'outer' }],
    ['path', { d: 'M17.5 20.5a5.5 5.5 0 0 0-11 0', opacity: '.5', key: 'inner' }],
    ['path', { d: 'M22.64 5.59A3.2 3.2 0 1 1 19.3 1.41A2.72 2.72 0 0 0 22.64 5.59Z', fill: 'currentColor', stroke: 'none', key: 'moon' }],
  ]),
  sunPillar: createLucideIcon('OpticSunPillar', [
    ['path', { d: 'M3 19.5h18', key: 'horizon' }],
    ['path', { d: 'M8.5 19.5a3.5 3.5 0 0 1 7 0', opacity: '.7', key: 'sun' }],
    ['path', { d: 'M10.5 15.2 11.1 3.4Q12 2.6 12.9 3.4L13.5 15.2Z', fill: 'currentColor', stroke: 'none', opacity: '.9', key: 'pillar' }],
  ]),
  moonHalo: createLucideIcon('OpticMoonHalo', [
    ['circle', { cx: '12', cy: '12', r: '10', key: 'ring' }],
    ['path', { d: 'M17.48 13.5A5 5 0 1 1 12.6 7.4A4.25 4.25 0 0 0 17.48 13.5Z', fill: 'currentColor', stroke: 'none', key: 'moon' }],
  ]),
};
