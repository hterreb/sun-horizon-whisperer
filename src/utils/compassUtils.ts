// Pure heading math for the live compass mode (ROADMAP item 8, reworked in item 19):
// circular smoothing, device-orientation-event -> heading conversion (Android
// absolute alpha / iOS webkitCompassHeading), the shortest-signed-delta helper used
// by SunVisualization's field-of-view mapping, and the one-time calibration hint
// flag. No DOM subscriptions here - see src/hooks/useCompassHeading.ts for the event
// listener.

// Minimal shape of the fields we read off a DeviceOrientationEvent, so this module
// (and its tests) never needs a real one.
export interface DeviceOrientationEventLike {
  alpha: number | null;
  beta?: number | null;
  gamma?: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
}

const DEG = Math.PI / 180;

// Normalizes any heading/azimuth into [0, 360).
export const normalizeHeading = (heading: number): number => {
  const wrapped = heading % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

// Shortest signed delta from `from` to `to`, in (-180, 180] - the short way around
// the circle (e.g. 359 -> 1 is +2, not -358). Exported for SunVisualization's
// field-of-view compass mapping (ROADMAP item 19).
export const shortestHeadingDelta = (from: number, to: number): number => {
  const normalizedFrom = normalizeHeading(from);
  const normalizedTo = normalizeHeading(to);
  return ((normalizedTo - normalizedFrom + 540) % 360) - 180;
};

// Low-pass filter for a live heading reading: moves `previous` a fraction
// (`smoothingFactor`, 0-1) of the way toward `next`, along the shorter arc, so a
// wrap-around (e.g. 359 -> 1) glides through 0 instead of swinging through 180.
// `previous === null` seeds the filter with the first reading, unsmoothed.
export const smoothHeading = (
  previous: number | null,
  next: number,
  smoothingFactor = 0.15
): number => {
  if (previous === null) return normalizeHeading(next);
  const delta = shortestHeadingDelta(previous, next);
  return normalizeHeading(previous + delta * smoothingFactor);
};

// Converts one device-orientation reading into a compass heading (0 = North,
// clockwise), or null when the event carries no usable heading.
export const headingFromDeviceOrientationEvent = (
  event: DeviceOrientationEventLike,
  screenAngleDeg = 0
): number | null => {
  if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
    // iOS Safari: already a clockwise compass heading, relative to the current UI
    // orientation - no screen-angle correction needed.
    return normalizeHeading(event.webkitCompassHeading);
  }
  if (event.absolute && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    // Android `deviceorientationabsolute` (W3C Z-X'-Y'' Euler angles, alpha from North).
    // The user points the back camera at the sky, so the heading is the horizontal
    // direction of the device's -z axis: R(alpha, beta, gamma) · (0, 0, -1) in the
    // East/North/Up frame. That direction doesn't depend on how the screen is rotated.
    const a = event.alpha * DEG;
    const b = (event.beta ?? 0) * DEG;
    const g = (event.gamma ?? 0) * DEG;
    const east = -Math.sin(g) * Math.cos(a) - Math.cos(g) * Math.sin(b) * Math.sin(a);
    const north = -Math.sin(g) * Math.sin(a) + Math.cos(g) * Math.sin(b) * Math.cos(a);
    if (Math.hypot(east, north) > 0.3) {
      return normalizeHeading(Math.atan2(east, north) / DEG);
    }
    // Phone lies (nearly) flat: the back points at the ground, so use the direction
    // of the screen's top edge instead, corrected for screen rotation (e.g. landscape).
    return normalizeHeading(360 - event.alpha - screenAngleDeg);
  }
  // A plain, non-absolute `deviceorientation` reading has no fixed reference, so it
  // can't be turned into a compass heading.
  return null;
};

// One-time "move your phone in a figure 8" calibration hint, shown the first time
// compass mode is enabled. Mirrors the try/catch-wrapped localStorage pattern used
// for the weather cache and manual location.
const CALIBRATION_HINT_KEY = 'compass-calibration-hint-seen';

export const hasSeenCompassCalibrationHint = (): boolean => {
  try {
    return localStorage.getItem(CALIBRATION_HINT_KEY) === 'true';
  } catch (error) {
    console.error('Error reading compass calibration hint flag:', error);
    return true; // fail closed: don't nag if storage is unavailable
  }
};

export const markCompassCalibrationHintSeen = (): void => {
  try {
    localStorage.setItem(CALIBRATION_HINT_KEY, 'true');
  } catch (error) {
    console.error('Error saving compass calibration hint flag:', error);
  }
};
