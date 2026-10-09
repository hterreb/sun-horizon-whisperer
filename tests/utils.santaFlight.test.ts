import { describe, it, expect } from 'vitest';
import { HOLD_S, SLOW_S, santaFlightX, santaGreetingOpacity, santaStopTimes, santaTravel } from '@/utils/santaFlight';

// Lookbook 2026-10-09, S6: Santa's rest stop. Reference: x0 start, V speed, xs stop, braking
// distance 1.5 V; tA = (xs - 1.5V - x0) / V, tB = tA + 3, tC = tB + 5, tD = tC + 3.
describe('santaFlight (lookbook S6)', () => {
  const V = 9.75;
  const X0 = -54;
  const XS = 168;
  const { tA, tB, tC, tD } = santaStopTimes(XS - X0, V);

  it('gives the phase times of the reference', () => {
    expect(tA).toBeCloseTo((XS - 1.5 * V - X0) / V);
    expect(tB - tA).toBeCloseTo(SLOW_S);
    expect(tC - tB).toBeCloseTo(HOLD_S);
    expect(tD - tC).toBeCloseTo(SLOW_S);
  });

  it('matches the reference x(t) in every phase', () => {
    const ref = (t: number) => {
      if (t < tA) return X0 + V * t;
      if (t < tB) { const u = t - tA; return X0 + V * tA + V * (u - u * u / 6); }
      if (t < tC) return XS;
      if (t < tD) { const u = t - tC; return XS + V * u * u / 6; }
      return XS + 1.5 * V + V * (t - tD);
    };
    for (const t of [0, 5, tA + 1, tB + 2, tC + 1.5, tD + 4, 60]) expect(santaFlightX(t, X0, XS, V), String(t)).toBeCloseTo(ref(t));
  });

  it('is continuous at each phase boundary, also in its speed', () => {
    const e = 1e-6;
    for (const t of [tA, tB, tC, tD]) {
      expect(santaFlightX(t - e, X0, XS, V)).toBeCloseTo(santaFlightX(t + e, X0, XS, V), 4);
      const speedBefore = (santaFlightX(t - e, X0, XS, V) - santaFlightX(t - 2 * e, X0, XS, V)) / e;
      const speedAfter = (santaFlightX(t + 2 * e, X0, XS, V) - santaFlightX(t + e, X0, XS, V)) / e;
      expect(speedBefore).toBeCloseTo(speedAfter, 2);
    }
  });

  it('holds at the stop point for 5 s and never goes back', () => {
    for (const t of [tB, tB + 1, tB + 4.9]) expect(santaFlightX(t, X0, XS, V)).toBeCloseTo(XS);
    let last = -Infinity;
    for (let t = 0; t < 80; t += 0.1) {
      const x = santaFlightX(t, X0, XS, V);
      expect(x).toBeGreaterThanOrEqual(last - 1e-9);
      last = x;
    }
  });

  it('ends past the far edge at full speed', () => {
    // A 390 px screen: past 390 some time after tD, moving V px/s.
    const end = tD + (390 - XS - 1.5 * V) / V;
    expect(santaFlightX(end + 1, X0, XS, V)).toBeGreaterThan(390);
    expect(santaFlightX(end + 2, X0, XS, V) - santaFlightX(end + 1, X0, XS, V)).toBeCloseTo(V);
  });

  it('mirrors right to left', () => {
    const x0 = 390;
    const xs = 390 - (XS - X0);
    for (const t of [3, tA + 1, tB + 2, tC + 1, tD + 5]) {
      expect(santaFlightX(t, x0, xs, V) - x0).toBeCloseTo(-(santaFlightX(t, X0, XS, V) - X0));
    }
  });

  it('moves a stop closer than the braking distance out to it (no negative times)', () => {
    const times = santaStopTimes(5, V);
    expect(times.tA).toBe(0);
    expect(times.stop).toBeCloseTo(1.5 * V);
    expect(santaTravel(times.tB + 1, 5, V)).toBeCloseTo(1.5 * V);
  });

  it('fades "Ho ho ho!" in over 1 s after he stops and out over 1 s before he moves on', () => {
    const d = XS - X0;
    expect(santaGreetingOpacity(tB - 0.5, d, V)).toBe(0);
    expect(santaGreetingOpacity(tB + 0.5, d, V)).toBeCloseTo(0.5);
    expect(santaGreetingOpacity(tB + 2.5, d, V)).toBe(1);
    expect(santaGreetingOpacity(tC - 0.25, d, V)).toBeCloseTo(0.25);
    expect(santaGreetingOpacity(tC + 0.5, d, V)).toBe(0);
  });
});
