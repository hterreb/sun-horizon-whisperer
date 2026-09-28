import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeHeading,
  smoothHeading,
  headingFromDeviceOrientationEvent,
  shortestHeadingDelta,
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

  it('Android, phone upright in portrait: heading = 360 - alpha (back camera direction)', () => {
    expect(headingFromDeviceOrientationEvent({ alpha: 90, beta: 90, gamma: 0, absolute: true })).toBeCloseTo(270);
    expect(headingFromDeviceOrientationEvent({ alpha: 0, beta: 90, gamma: 0, absolute: true })).toBeCloseTo(0);
    // Tilted up toward the sky (beta 60) still points the same way.
    expect(headingFromDeviceOrientationEvent({ alpha: 30, beta: 60, gamma: 0, absolute: true })).toBeCloseTo(330);
  });

  it('Android, phone upright in landscape: screen rotation does not change the back camera direction', () => {
    // Portrait facing East is (alpha 270, beta 90, gamma 0). Turning the phone onto its
    // side about the camera axis gives (alpha 0, beta 0, gamma -90) in W3C angles.
    expect(headingFromDeviceOrientationEvent({ alpha: 0, beta: 0, gamma: -90, absolute: true }, 90)).toBeCloseTo(90);
    expect(headingFromDeviceOrientationEvent({ alpha: 180, beta: 0, gamma: 90, absolute: true }, 270)).toBeCloseTo(90);
  });

  it('Android, phone flat: uses the top edge, corrected for screen rotation', () => {
    expect(headingFromDeviceOrientationEvent({ alpha: 90, beta: 0, gamma: 0, absolute: true })).toBeCloseTo(270);
    expect(headingFromDeviceOrientationEvent({ alpha: 90, beta: 0, gamma: 0, absolute: true }, 90)).toBeCloseTo(180);
  });

  it('iOS: uses webkitCompassHeading directly, ignoring alpha/absolute', () => {
    expect(
      headingFromDeviceOrientationEvent({ alpha: 12, absolute: false, webkitCompassHeading: 200 })
    ).toBeCloseTo(200);
  });

  it('Android, phone upright (beta ~90°): heading changes smoothly across beta 80°-100° (ROADMAP item 19)', () => {
    // Holding a fixed alpha/gamma and only sweeping beta through the "phone upright"
    // range that Euler alpha alone is unstable at - the -z back-camera vector this
    // formula uses should stay stable there instead. Any two neighboring samples
    // should differ by only a small fraction of a degree, for a range of gammas
    // (including a non-zero left/right tilt).
    for (const gamma of [-60, -30, 0, 30, 60]) {
      let previous: number | null = null;
      for (let beta = 80; beta <= 100; beta += 1) {
        const heading = headingFromDeviceOrientationEvent({ alpha: 30, beta, gamma, absolute: true });
        expect(heading).not.toBeNull();
        if (previous !== null && heading !== null) {
          const delta = Math.abs(shortestHeadingDelta(previous, heading));
          expect(delta).toBeLessThan(1);
        }
        previous = heading;
      }
    }
  });
});

describe('shortestHeadingDelta (used by SunVisualization\'s field-of-view mapping, ROADMAP item 19)', () => {
  it('is 0 for the same heading', () => {
    expect(shortestHeadingDelta(180, 180)).toBeCloseTo(0);
  });

  it('is positive when `to` is clockwise of `from`, the short way', () => {
    expect(shortestHeadingDelta(10, 30)).toBeCloseTo(20);
  });

  it('is negative when `to` is counter-clockwise of `from`, the short way', () => {
    expect(shortestHeadingDelta(30, 10)).toBeCloseTo(-20);
  });

  it('takes the short way across the 0°/360° wrap', () => {
    expect(shortestHeadingDelta(350, 10)).toBeCloseTo(20);
    expect(shortestHeadingDelta(10, 350)).toBeCloseTo(-20);
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
