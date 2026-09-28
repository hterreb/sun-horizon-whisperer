import { useCallback, useEffect, useRef, useState } from 'react';
import { headingFromDeviceOrientationEvent, smoothHeading, type DeviceOrientationEventLike } from '../utils/compassUtils';

export type CompassStatus = 'unsupported' | 'idle' | 'requesting' | 'active' | 'unavailable';

// iOS's non-standard permission gate; not part of the standard DeviceOrientationEvent typings.
interface DeviceOrientationEventCtorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

interface UseCompassHeadingResult {
  status: CompassStatus;
  // Smoothed heading in degrees (0 = North, clockwise), or null before the first reading.
  heading: number | null;
  // Starts the compass: requests iOS permission first (must be called from a click
  // handler - see CompassToggle) and subscribes to orientation events.
  enable: () => Promise<void>;
  disable: () => void;
}

const NO_EVENT_TIMEOUT_MS = 2000;
const SMOOTHING_FACTOR = 0.15;

const isDeviceOrientationSupported = (): boolean =>
  typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

// Subscribes to the device's compass heading for the live compass mode (ROADMAP
// item 8). Reads Android's `deviceorientationabsolute` (heading = 360 - alpha) and
// iOS's `deviceorientation` + `webkitCompassHeading` (after an explicit permission
// request) through the same listener; `headingFromDeviceOrientationEvent` (a pure
// util) decides which reading, if any, is usable. Follows the style of useWakeLock:
// cleans up its listeners/timeout on unmount or when disabled.
export const useCompassHeading = (): UseCompassHeadingResult => {
  const [status, setStatus] = useState<CompassStatus>(() =>
    isDeviceOrientationSupported() ? 'idle' : 'unsupported'
  );
  const [heading, setHeading] = useState<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerRef = useRef<((event: Event) => void) | null>(null);
  // Throttles committing the heading to state to at most once per animation frame
  // (ROADMAP item 19): orientation events can fire up to 60 Hz, which would otherwise
  // re-render the whole scene that often. The rAF id lives in a ref (CLAUDE.md), so
  // cleanup can always cancel a still-pending frame.
  const rafIdRef = useRef<number | null>(null);
  const pendingHeadingRef = useRef<number | null>(null);

  const clearNoEventTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const cancelPendingHeadingCommit = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const scheduleHeadingCommit = (nextHeading: number) => {
    pendingHeadingRef.current = nextHeading;
    if (rafIdRef.current !== null) return; // a frame is already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setHeading(pendingHeadingRef.current);
    });
  };

  const stopListening = useCallback(() => {
    clearNoEventTimeout();
    cancelPendingHeadingCommit();
    if (handlerRef.current) {
      window.removeEventListener('deviceorientationabsolute', handlerRef.current);
      window.removeEventListener('deviceorientation', handlerRef.current);
      handlerRef.current = null;
    }
  }, []);

  const disable = useCallback(() => {
    stopListening();
    smoothedHeadingRef.current = null;
    setHeading(null);
    // A device that was never supported stays unsupported; anything else goes back
    // to idle so the toggle can be turned back on.
    setStatus((prev) => (prev === 'unsupported' ? prev : 'idle'));
  }, [stopListening]);

  const startListening = useCallback(() => {
    let receivedEvent = false;

    const handler = (event: Event) => {
      const screenAngle = window.screen?.orientation?.angle ?? 0;
      const rawHeading = headingFromDeviceOrientationEvent(event as unknown as DeviceOrientationEventLike, screenAngle);
      if (rawHeading === null) return;

      receivedEvent = true;
      clearNoEventTimeout();

      const smoothed = smoothHeading(smoothedHeadingRef.current, rawHeading, SMOOTHING_FACTOR);
      smoothedHeadingRef.current = smoothed;
      scheduleHeadingCommit(smoothed);
      setStatus('active');
    };

    handlerRef.current = handler;
    // Android exposes the absolute variant; iOS only ever fires the plain event but
    // carries `webkitCompassHeading` on it. Listening to both and letting the pure
    // filter above pick the usable reading covers both platforms with one subscription.
    window.addEventListener('deviceorientationabsolute', handler);
    window.addEventListener('deviceorientation', handler);

    timeoutRef.current = setTimeout(() => {
      if (!receivedEvent) {
        stopListening();
        setStatus('unavailable');
      }
    }, NO_EVENT_TIMEOUT_MS);
  }, [stopListening]);

  const enable = useCallback(async () => {
    if (!isDeviceOrientationSupported()) {
      setStatus('unsupported');
      return;
    }

    const ctor = window.DeviceOrientationEvent as unknown as DeviceOrientationEventCtorWithPermission;
    if (typeof ctor.requestPermission === 'function') {
      setStatus('requesting');
      try {
        const permission = await ctor.requestPermission();
        if (permission !== 'granted') {
          setStatus('unavailable');
          return;
        }
      } catch (error) {
        console.error('Compass permission request failed:', error);
        setStatus('unavailable');
        return;
      }
    } else {
      setStatus('requesting');
    }

    startListening();
  }, [startListening]);

  // Unmount cleanup only - `disable()` (and the timeout callback) handle the
  // listener/timeout teardown while mounted.
  useEffect(() => stopListening, [stopListening]);

  return { status, heading, enable, disable };
};
