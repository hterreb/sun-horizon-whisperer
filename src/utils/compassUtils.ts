// Pure heading math for the live compass mode (ROADMAP item 8): circular smoothing,
// device-orientation-event -> heading conversion (Android absolute alpha / iOS
// webkitCompassHeading), heading -> azimuth-mapping offset, and the one-time
// calibration hint flag. No DOM subscriptions here - see
// src/hooks/useCompassHeading.ts for the event listener.

// Minimal shape of the fields we read off a DeviceOrientationEvent, so this module
// (and its tests) never needs a real one.
export interface DeviceOrientationEventLike {
  alpha: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
}

// Normalizes any heading/azimuth into [0, 360).
export const normalizeHeading = (heading: number): number => {
  const wrapped = heading % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

// Shortest signed delta from `from` to `to`, in (-180, 180] - the short way around
// the circle (e.g. 359 -> 1 is +2, not -358).
const shortestHeadingDelta = (from: number, to: number): number => {
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
    // Android `deviceorientationabsolute`: alpha is measured counter-clockwise from
    // magnetic North around the device's natural (portrait) top edge. Convert to a
    // clockwise heading, then correct for the screen having been rotated away from
    // that natural orientation (e.g. landscape).
    return normalizeHeading(360 - event.alpha - screenAngleDeg);
  }
  // A plain, non-absolute `deviceorientation` reading has no fixed reference, so it
  // can't be turned into a compass heading.
  return null;
};

// The azimuth-mapping offset (degrees) that puts `heading` at screen centre, given
// SunVisualization's existing hemisphere shift in getAzimuthScreenFraction (south
// hemisphere culminates at 0°/North, north hemisphere at 180°/South - see that file).
export const headingToAzimuthOffset = (heading: number, latitude: number): number => {
  const normalizedHeading = normalizeHeading(heading);
  const hemisphereShifted = latitude < 0 ? (normalizedHeading + 180) % 360 : normalizedHeading;
  return normalizeHeading(180 - hemisphereShifted);
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
