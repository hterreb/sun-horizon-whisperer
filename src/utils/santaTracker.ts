// Santa's tracker card (ROADMAP "Ongoing", Calendar; lookbook 2026-10-09, S7): playful counters
// in the style of NORAD's Santa tracker. Deterministic from the time, so a reopened card does not
// start again at 0. Not real data.
export const PRESENTS_PER_S = 131_000;
export const COOKIES_PER_S = 15_200;

// NORAD's tracker starts at 10:00 UTC on Dec 24 (of the year of `nowMs`, in UTC).
export const santaLaunchMs = (nowMs: number): number => Date.UTC(new Date(nowMs).getUTCFullYear(), 11, 24, 10);

export const santaCounters = (nowMs: number): { presents: number; cookies: number } => {
  const seconds = Math.max(0, Math.floor((nowMs - santaLaunchMs(nowMs)) / 1000));
  return { presents: seconds * PRESENTS_PER_S, cookies: seconds * COOKIES_PER_S };
};
