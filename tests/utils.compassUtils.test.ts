import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeHeading,
  smoothHeading,
  headingFromDeviceOrientationEvent,
  headingToAzimuthOffset,
  hasSeenCompassCalibrationHint,
  markCompassCalibrationHintSeen,
} from '../src/utils/compassUtils';

describe('normalizeHeading', () => {
  it('wraps into [0, 360)', () => {
    expect(normalizeHeading(370)).toBeCloseTo(10);
    expect(normalizeHeading(-10)).toBeCloseTo(350);
    expect(normalizeHeading(0)).toBe(0);
    expect(normalizeHeading(360)).toBe(0);
  });
});

describe('smoothHeading (circular low-pass filter)', () => {
  it('seeds with the first reading unsmoothed when previous is null', () => {
    expect(smoothHeading(null, 42)).toBe(42);
  });

  it('wraps 359 -> 1 through 0, not through 180 (C-8 style wrap-around)', () => {
    // Halfway with a 100% smoothing factor should land exactly on the wrap point (0),
    // never anywhere near 180 (the "long way around").
    const halfway = smoothHeading(359, 1, 1);
    expect(halfway).toBeCloseTo(1);

    const partial = smoothHeading(359, 1, 0.5);
    // 359 -> 361 (=1) is a +2 delta; half of that is +1, landing on 360 (=0).
    expect(partial).toBeCloseTo(0);
  });

  it('wraps 1 -> 359 the short way (through 0), not the long way (through 180)', () => {
    const partial = smoothHeading(1, 359, 0.5);
    expect(partial).toBeCloseTo(0);
  });

  it('moves toward next by smoothingFactor for an in-range pair', () => {
    expect(smoothHeading(10, 20, 0.5)).toBeCloseTo(15);
  });
});

describe('headingFromDeviceOrientationEvent', () => {
  it('returns null when there is no usable heading (relative deviceorientation)', () => {
    expect(headingFromDeviceOrientationEvent({ alpha: 90, absolute: false })).toBeNull();
    expect(headingFromDeviceOrientationEvent({ alpha: null, absolute: true })).toBeNull();
  });

  it('Android deviceorientationabsolute: heading = 360 - alpha', () => {
    expect(headingFromDeviceOrientationEvent({ alpha: 90, absolute: true })).toBeCloseTo(270);
    expect(headingFromDeviceOrientationEvent({ alpha: 0, absolute: true })).toBeCloseTo(0);
  });

  it('corrects for screen orientation angle', () => {
    // Rotating the screen 90° (landscape) shifts the raw alpha->heading result back
    // by the same amount.
    expect(headingFromDeviceOrientationEvent({ alpha: 90, absolute: true }, 90)).toBeCloseTo(180);
  });

  it('iOS: uses webkitCompassHeading directly, ignoring alpha/absolute', () => {
    expect(
      headingFromDeviceOrientationEvent({ alpha: 12, absolute: false, webkitCompassHeading: 200 })
    ).toBeCloseTo(200);
  });
});

describe('headingToAzimuthOffset', () => {
  it('northern hemisphere: facing South (the default centered azimuth) needs no offset', () => {
    expect(headingToAzimuthOffset(180, 51)).toBeCloseTo(0);
  });

  it('northern hemisphere: facing North centers North instead (180° offset)', () => {
    expect(headingToAzimuthOffset(0, 51)).toBeCloseTo(180);
  });

  it('southern hemisphere: facing North (the default centered azimuth there) needs no offset', () => {
    expect(headingToAzimuthOffset(0, -33)).toBeCloseTo(0);
  });

  it('southern hemisphere: facing South centers South instead (180° offset)', () => {
    expect(headingToAzimuthOffset(180, -33)).toBeCloseTo(180);
  });
});

describe('compass calibration hint flag', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has not been seen before the flag is set', () => {
    expect(hasSeenCompassCalibrationHint()).toBe(false);
  });

  it('is seen after marking it, and persists', () => {
    markCompassCalibrationHintSeen();
    expect(hasSeenCompassCalibrationHint()).toBe(true);
  });
});
