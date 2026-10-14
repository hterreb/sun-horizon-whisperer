import type { CSSProperties } from 'react';
import { type BirdKind } from '../utils/weatherEffectsUtils';

// Bird silhouettes from the Birds & Skies lookbook (ROADMAP item 74): side view, facing
// right (the gull from the front, item 149), wings raised in a glide (they never flap), on a 48 × 24 grid. Filled with
// currentColor like the bats (item 64, B2). CloudLayer sets the colour and the opacity on
// the whole bird or group, so overlapping wings don't show darker seams.

const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const circle = (cx: number, cy: number, r: number) => ell(cx, cy, r, r);

const BIRD_ART: Record<BirdKind, { fill: string[]; legs?: string }> = {
  // Item 149 (bird lookbook, G1): a soft "m" seen from the front. Thin, tapered arches with
  // drooping tips, and a small body and head where the wings meet.
  gull: {
    fill: [
      'M24 13.4C20.4 7.6 14.6 5 9.8 6C6.2 6.8 3.2 10 0.8 14.4C4 11.4 6.8 9.6 9.9 9.3C14.2 8.9 18.6 11.6 22.4 16.2Z',
      'M24 13.4C27.6 7.6 33.4 5 38.2 6C41.8 6.8 44.8 10 47.2 14.4C44 11.4 41.2 9.6 38.1 9.3C33.8 8.9 29.4 11.6 25.6 16.2Z',
      ell(24, 15.6, 2.4, 3.4),
      circle(24, 12.4, 1.9),
    ],
  },
  heron: {
    fill: [
      ell(22, 15.2, 7.5, 2.6),
      'M27.5 13.7C30.2 12.6 32.6 12.6 33.8 13.5C34.7 12.8 36.3 12.7 37 13.5L43.5 14.3L37 14.9C36.1 15.7 34.6 15.8 33.8 16.7C32.6 18 29.6 17.8 27.6 16.9Z',
      'M15.6 14.1 11.4 15.2 15.6 16.3Z',
      'M27.5 14.2Q25.5 4.5 13 2.6L11.2 4.6 13.6 5 12 7 14.6 7.2Q17.6 10.5 18.2 14.6Z',
      'M30 14Q32.6 8.6 33 4.6L31.8 5.4 31.6 4.6Q28.4 8 26.2 14Z',
    ],
    legs: 'M15 15.6 3.5 16.6M15 16.5 4 17.8',
  },
  stork: {
    fill: [
      ell(21.5, 15, 7.5, 2.5),
      'M28 14Q34 12.6 38 12.8L40.4 12.4Q42 12.3 42.4 13.4L47.5 14.6L42 14.6Q40.8 15.4 38 15Q34 15.6 28.4 16.4Z',
      'M15 14 11 15 15 16Z',
      'M26.5 14Q24 3.5 10.5 2L9 4 11.4 4.4 9.8 6.4 12.4 6.6 11.2 8.6 13.8 8.4Q17 11 17.5 14.4Z',
      'M29 13.8Q32 8.4 32.6 4.2L31.4 5 31 4.2Q27.8 7.6 25.4 14Z',
    ],
    legs: 'M14.5 15.4 2 16.2M14.5 16.2 2.5 17.2',
  },
  swan: {
    fill: [
      ell(21, 15.4, 8.5, 3),
      'M28 14.4Q34 12.8 39.6 12.6Q41.4 12.4 42.2 13.4L45.6 14.4L42 14.7Q40 15.2 38 15Q34 15.8 28.6 17.2Z',
      'M13.2 14.2 9.5 15.4 13.2 16.6Z',
      'M27 14.4Q25 4 12 2.2Q10.2 3.4 11.4 5.2Q16.5 9.5 17.2 15Z',
      'M29.6 14.2Q32.4 8.6 32.4 4.6Q30.8 4.6 30 6Q27.2 9.4 25.6 14.4Z',
    ],
  },
  geese: {
    fill: [
      ell(22, 15.2, 7.5, 2.8),
      'M28.5 14.2Q33 13 35.6 13Q37.6 12.8 38.2 13.8L41.5 14.6L38 15Q36.2 15.6 35 15.4Q32.6 16.2 28.8 16.8Z',
      'M15 14.2 11.4 15.2 15 16.2Z',
      'M27.5 14.4Q25.5 4.5 13 2.8Q11.4 4 12.4 5.6Q17 9.6 18 15Z',
      'M30 14.2Q32.4 8.8 32.4 5Q30.8 5 30 6.4Q27.6 9.6 26.2 14.4Z',
    ],
  },
  cormorant: {
    fill: [
      ell(22, 15.2, 7, 2.4),
      'M28 14.2Q33 13 37 13Q38.8 12.6 39.6 13.4L42.6 13.8Q43.4 14.4 42.4 14.8L39.4 14.9Q37.6 15.6 36 15.4Q33 16 28.4 16.6Z',
      'M15.4 14.2 7.5 14.6 7.5 15.8 15.4 16.2Z',
      'M27 14.4Q24.5 5.5 12.5 3.6Q15.5 8.5 18.6 15Z',
      'M29.4 14Q31.6 9 32.2 5.2Q28.8 8.4 26 14.4Z',
    ],
  },
  kestrel: {
    fill: [
      ell(24, 15, 5.5, 2.2),
      circle(30.2, 14.3, 2.2),
      'M32.2 14 33.8 14.7 32.2 15.2Z',
      'M19 14.1 9 13.8 9 16.4 19 16Z',
      'M27.5 14.3Q24 6 12 2.8Q19 8.5 21 15Z',
      'M29 13.8Q31 9.4 32 5.2Q28.6 8.6 25.6 14.2Z',
    ],
  },
  // A tiny four-pointed star: at 4-7 px a starling in a far flock is little more than a dot.
  starlings: { fill: ['M24 7 26.2 13.4 36 15 26.2 16.6 24 23 21.8 16.6 12 15 21.8 13.4Z'] },
};

interface SceneBirdProps {
  kind: BirdKind;
  width: number;
  className?: string;
  style?: CSSProperties;
}

const SceneBird = ({ kind, width, className, style }: SceneBirdProps) => {
  const art = BIRD_ART[kind];
  return (
    <svg
      width={width}
      height={width / 2}
      viewBox="0 0 48 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
      data-testid="scene-bird"
      data-kind={kind}
    >
      {art.fill.map(d => <path key={d} d={d} />)}
      {art.legs && <path d={art.legs} fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />}
    </svg>
  );
};

export default SceneBird;
