import { describe, it, expect } from 'vitest';
import { getAzimuthScreenFraction } from '../src/components/SunVisualization';

describe('getAzimuthScreenFraction (C-3)', () => {
  it('northern hemisphere: culmination (180°, South) stays centered', () => {
    expect(getAzimuthScreenFraction(180, 51)).toBeCloseTo(0.5);
  });

  it('southern hemisphere: culmination (0°/360°, North) is centered, not at the edge', () => {
    // Before the fix this mapped straight to 0/360 -> the screen edge, causing a
    // noon jump from the right edge to the left edge.
    expect(getAzimuthScreenFraction(0, -33)).toBeCloseTo(0.5);
    expect(getAzimuthScreenFraction(360, -33)).toBeCloseTo(0.5);
  });

  it('southern hemisphere: shifts other azimuths by 180° too', () => {
    expect(getAzimuthScreenFraction(90, -33)).toBeCloseTo(0.75);
    expect(getAzimuthScreenFraction(270, -33)).toBeCloseTo(0.25);
  });
});
