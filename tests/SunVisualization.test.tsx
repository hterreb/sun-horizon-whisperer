import { describe, it, expect } from 'vitest';
import { getAzimuthScreenFraction, crossesHorizon } from '../src/components/SunVisualization';

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

describe('crossesHorizon (C-8)', () => {
  it('detects a sunrise-style crossing (negative to positive)', () => {
    expect(crossesHorizon(-0.4, 0.6)).toBe(true);
  });

  it('detects a sunset-style crossing (positive to negative)', () => {
    expect(crossesHorizon(0.6, -0.4)).toBe(true);
  });

  it('does not fire when both samples land on the same side, even near zero', () => {
    // Before the fix, only a rounded `=== 0.0` check counted; a close pair that never
    // rounds to exactly zero would silently miss the crossing.
    expect(crossesHorizon(0.3, 0.05)).toBe(false);
    expect(crossesHorizon(-0.3, -0.05)).toBe(false);
  });

  it('fires even when the sample never rounds to exactly 0.0', () => {
    // A 30s sample can easily skip straight past exact 0.0 in either direction.
    expect(crossesHorizon(-2.3, 3.1)).toBe(true);
  });
});
