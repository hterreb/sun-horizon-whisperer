import { describe, expect, it } from 'vitest';
import {
  BOAT_HEIGHT_PX, BOAT_WIDTH_PX, DOLPHINS_ABOVE_WATER, SHARK_ABOVE_WATER, VISITOR_GLINT, getVisitorGlint,
} from '@/utils/sceneSizes';
import { BOAT_HEIGHT_PX as BOAT_HEIGHT_FROM_DRAWING, BOAT_WIDTH_PX as BOAT_WIDTH_FROM_DRAWING } from '@/components/SceneBoat';
import { WHALE_SPOUT_AHEAD, WHALE_SPOUT_TOP } from '@/components/SceneFish';
import * as sizes from '@/utils/sceneSizes';

// The sizes live apart from the drawings so CloudLayer needs no drawing in the start bundle (item 174).
describe('scene sizes (ROADMAP item 174)', () => {
  it('are the ones the drawings re-export', () => {
    expect(BOAT_WIDTH_FROM_DRAWING).toBe(BOAT_WIDTH_PX);
    expect(BOAT_HEIGHT_FROM_DRAWING).toBe(BOAT_HEIGHT_PX);
    expect(BOAT_HEIGHT_PX).toBeCloseTo(48 * 37 / 64);
    expect(WHALE_SPOUT_TOP).toBe(sizes.WHALE_SPOUT_TOP);
    expect(WHALE_SPOUT_AHEAD).toBe(sizes.WHALE_SPOUT_AHEAD);
  });

  it('reach above the waterline by the view top and the waterline of each animal', () => {
    expect(SHARK_ABOVE_WATER).toBeCloseTo(12.6);
    expect(DOLPHINS_ABOVE_WATER).toBeCloseTo(12.2);
  });

  it('give the glint of each light', () => {
    expect(getVisitorGlint('day')).toBe(VISITOR_GLINT.day);
    expect(getVisitorGlint('moon')).toBe('hsl(var(--scene-moon) / 0.75)');
    expect(getVisitorGlint('dusk')).toBe('hsl(var(--scene-fish-glint-dusk) / 0.8)');
  });
});
