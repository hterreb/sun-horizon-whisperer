// Hidden easter eggs (ROADMAP "Ongoing — Easter eggs", Hidden): the pure trigger
// logic. SunTracker owns the state and the timers; these functions only decide.

export type HiddenEgg = 'sunglasses' | 'ufo' | 'disco';

// Sun sunglasses: 7 taps on the sun, each within SUN_TAP_GAP_MS of the one before.
// The disco egg counts taps on the moon with the same rule (registerSunTap).
export const SUN_TAPS_NEEDED = 7;
export const SUN_TAP_GAP_MS = 1500;
export const SUNGLASSES_MS = 60_000;

export interface SunTaps {
  count: number;
  lastMs: number;
}

// Counts one tap. At SUN_TAPS_NEEDED the egg triggers and the count starts again.
export const registerSunTap = (taps: SunTaps, nowMs: number): { taps: SunTaps; triggered: boolean } => {
  const count = nowMs - taps.lastMs <= SUN_TAP_GAP_MS ? taps.count + 1 : 1;
  if (count >= SUN_TAPS_NEEDED) return { taps: { count: 0, lastMs: nowMs }, triggered: true };
  return { taps: { count, lastMs: nowMs }, triggered: false };
};

// Disco sky: 7 taps on the moon (see above), or the Konami code ↑↑↓↓←→←→BA.
export const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];
export const DISCO_MS = 10_000;

// Returns the new match length after `key`. A wrong key keeps the longest tail of the
// typed keys that is still a start of the code (so ↑↑↑↓↓… still matches).
// A return value of KONAMI_SEQUENCE.length means the code is complete.
export const advanceKonami = (progress: number, key: string): number => {
  const k = key.length === 1 ? key.toLowerCase() : key;
  const typed = [...KONAMI_SEQUENCE.slice(0, progress), k];
  for (let start = 0; start < typed.length; start++) {
    const tail = typed.slice(start);
    if (tail.every((t, i) => t === KONAMI_SEQUENCE[i])) return tail.length;
  }
  return 0;
};

// UFO: a 1 in 200 chance per night view.
export const UFO_CHANCE = 1 / 200;
export const rollUfo = (random: () => number = Math.random): boolean => random() < UFO_CHANCE;

// Test override: `?egg=sunglasses|ufo|disco` shows that egg at once.
export const getEggOverride = (search: string): HiddenEgg | null => {
  const egg = new URLSearchParams(search).get('egg');
  return egg === 'sunglasses' || egg === 'ufo' || egg === 'disco' ? egg : null;
};
