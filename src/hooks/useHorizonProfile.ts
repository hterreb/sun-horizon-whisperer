import { useEffect, useRef, useState } from 'react';
import { type HorizonProfile } from '../utils/horizonUtils';
import { loadHorizonProfile } from '../utils/terrainTiles';

export type HorizonProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseHorizonProfileResult {
  profile: HorizonProfile | null;
  status: HorizonProfileStatus;
}

// Typing a new eye height shouldn't refetch the whole terrain profile per keystroke
// (ROADMAP item 13).
const DEBOUNCE_MS = 500;

// Loads the horizon profile for line-of-sight terrain (ROADMAP item 13). Follows the
// style of useCompassHeading/useWakeLock: refs for anything that must survive without
// triggering a re-render, and a single effect that both starts and tears down the
// current load. Any input change (including `enabled` turning off) debounces, then
// aborts whatever load was in flight via AbortController; the same cleanup runs on
// unmount.
export const useHorizonProfile = (
  lat: number,
  lon: number,
  eyeHeight: number,
  enabled: boolean
): UseHorizonProfileResult => {
  const [profile, setProfile] = useState<HorizonProfile | null>(null);
  const [status, setStatus] = useState<HorizonProfileStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the (lat, lon, eyeHeight, enabled) combo currently being loaded for; when
  // it changes, adjust status/profile during render (rather than synchronously in an
  // effect body, which React's set-state-in-effect rule flags) - the same "adjust
  // state during render" pattern SunTracker already uses for its own locationKey.
  // The effect below only ever sets state asynchronously (inside the debounce
  // timeout's .then/.catch), never in its own synchronous body.
  const key = `${lat}|${lon}|${eyeHeight}|${enabled}`;
  const [prevKey, setPrevKey] = useState<string | null>(null);
  if (key !== prevKey) {
    setPrevKey(key);
    if (enabled) {
      setStatus('loading');
    } else {
      setProfile(null);
      setStatus('idle');
    }
  }

  useEffect(() => {
    // Clear any pending debounce and abort any in-flight load first - this covers
    // both a genuine input change and the feature being turned off.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;

    if (!enabled) return;

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const controller = new AbortController();
      abortRef.current = controller;

      loadHorizonProfile(lat, lon, eyeHeight, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setProfile(result);
          setStatus('ready');
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error('Error loading horizon profile:', error);
          setProfile(null);
          setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [lat, lon, eyeHeight, enabled]);

  return { profile, status };
};
