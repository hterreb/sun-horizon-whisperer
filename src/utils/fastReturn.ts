// Fast return (ROADMAP item 90 K3): Android can stop the app in the background and
// reload it when the user comes back. SunTracker saves the time the app was last
// visible in sessionStorage; a load less than FAST_RETURN_MS after it fades the scene
// in, without the iris. After a full stop of the app, the session is gone and the
// start is as before.

export const LAST_VISIBLE_STORAGE_KEY = 'last-visible';
export const FAST_RETURN_MS = 30 * 60 * 1000;

export const saveLastVisible = (now: number = Date.now()): void => {
  try {
    sessionStorage.setItem(LAST_VISIBLE_STORAGE_KEY, String(now));
  } catch {
    // Storage blocked: the next load starts as before.
  }
};

export const loadLastVisible = (): number | null => {
  try {
    const raw = sessionStorage.getItem(LAST_VISIBLE_STORAGE_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

// A time in the future (the clock went back) is not a fast return.
export const isFastReturn = (lastVisible: number | null, now: number): boolean =>
  lastVisible !== null && now >= lastVisible && now - lastVisible < FAST_RETURN_MS;

// The scene's reveal when the location arrives (ROADMAP item 39): the iris only for a
// slow start with motion allowed and no fast return; else the fade.
export const getStartReveal = (
  isSlowStart: boolean,
  prefersReducedMotion: boolean,
  fastReturn: boolean,
): 'iris' | 'fade' => (isSlowStart && !prefersReducedMotion && !fastReturn ? 'iris' : 'fade');
