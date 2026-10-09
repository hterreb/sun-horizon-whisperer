// Santa's flight path (ROADMAP "Ongoing", Calendar; lookbook 2026-10-09, S6 "rest stop").
// He flies at a constant speed, eases to a stop over SLOW_S (constant deceleration), holds
// HOLD_S, eases back to speed over SLOW_S and flies on. Pure functions of the time since the
// start, so the component only writes the result to the DOM in its rAF loop.
export const SLOW_S = 3;
export const HOLD_S = 5;
export const GREETING_FADE_S = 1;
// The distance to brake from speed v to 0 over SLOW_S at constant deceleration: v · SLOW_S / 2.
const SLOW_FACTOR = SLOW_S / 2;

export interface SantaStopTimes {
  tA: number; // starts to slow down
  tB: number; // stands still
  tC: number; // starts again
  tD: number; // at full speed again
  stop: number; // the distance from the start to the stop point (px)
}

// `stopDistance`: px from the start position to the stop position, along the flight; `v`: px/s.
// A stop point closer than the braking distance moves out to it (tA = 0).
export const santaStopTimes = (stopDistance: number, v: number): SantaStopTimes => {
  const stop = Math.max(stopDistance, SLOW_FACTOR * v);
  const tA = (stop - SLOW_FACTOR * v) / v;
  const tB = tA + SLOW_S;
  const tC = tB + HOLD_S;
  return { tA, tB, tC, tD: tC + SLOW_S, stop };
};

// The distance flown (px) at `t` seconds after the start.
export const santaTravel = (t: number, stopDistance: number, v: number): number => {
  const { tA, tB, tC, tD, stop } = santaStopTimes(stopDistance, v);
  if (t < tA) return v * t;
  if (t < tB) {
    const u = t - tA;
    return v * tA + v * (u - (u * u) / (2 * SLOW_S));
  }
  if (t < tC) return stop;
  if (t < tD) {
    const u = t - tC;
    return stop + (v * u * u) / (2 * SLOW_S);
  }
  return stop + SLOW_FACTOR * v + v * (t - tD);
};

// The x position (px) at `t` s: from `x0` towards `xs` (the stop), and on past it. Right to left
// is the mirror (x0 > xs).
export const santaFlightX = (t: number, x0: number, xs: number, v: number): number => {
  const dir = xs >= x0 ? 1 : -1;
  return x0 + dir * santaTravel(t, Math.abs(xs - x0), v);
};

// The "Ho ho ho!" opacity: 0 outside the hold, fades in over GREETING_FADE_S after he stops and
// out over GREETING_FADE_S before he moves on.
export const santaGreetingOpacity = (t: number, stopDistance: number, v: number): number => {
  const { tB, tC } = santaStopTimes(stopDistance, v);
  if (t <= tB || t >= tC) return 0;
  return Math.min(1, (t - tB) / GREETING_FADE_S, (tC - t) / GREETING_FADE_S);
};
