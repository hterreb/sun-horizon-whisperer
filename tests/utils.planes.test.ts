import { describe, it, expect } from 'vitest';
import {
  CONTRAIL_LOOK, PLANE_BAND, PLANE_SPEED, getContrail, getPlaneLook, getPlaneOverride, getTrailLength, getTrailPieces,
  isPlaneWeather, showsPlaneLights,
} from '@/utils/planes';

// ROADMAP item 96: planes and contrails, the free part.
describe('getContrail', () => {
  it('gives no contrail in air warmer than -40 °C, whatever the humidity', () => {
    expect(getContrail(-39.9, 90)).toBe('none');
    expect(getContrail(-20, 10)).toBe('none');
  });

  it('gives a short trail at -40 °C or colder in dry air (RH below 40 %)', () => {
    expect(getContrail(-40, 39.9)).toBe('short');
    expect(getContrail(-55, 10)).toBe('short');
  });

  it('gives a medium trail between 40 and 65 % RH', () => {
    expect(getContrail(-45, 40)).toBe('medium');
    expect(getContrail(-45, 64.9)).toBe('medium');
  });

  it('gives a persistent trail at 65 % RH or more (about saturated with respect to ice)', () => {
    expect(getContrail(-45, 65)).toBe('persistent');
    expect(getContrail(-60, 100)).toBe('persistent');
  });

  it('gives no contrail without the upper air', () => {
    expect(getContrail(null, 70)).toBe('none');
    expect(getContrail(-50, undefined)).toBe('none');
    expect(getContrail(Number.NaN, 70)).toBe('none');
  });

  it('lets a short trail fade in about 30 s, a medium one in about 3 min (item 109), a persistent one over 5-10 min', () => {
    expect(CONTRAIL_LOOK.short.lifeSec).toEqual([30, 30]);
    expect(CONTRAIL_LOOK.medium.lifeSec).toEqual([180, 180]);
    expect(CONTRAIL_LOOK.persistent.lifeSec).toEqual([300, 600]);
    expect(CONTRAIL_LOOK.persistent.spread).toBeGreaterThan(CONTRAIL_LOOK.medium.spread);
  });
});

describe('the planes', () => {
  it('shows planes only where the sky can be seen', () => {
    expect(['clear', 'partly', 'cloudy'].every(w => isPlaneWeather(w as never))).toBe(true);
    expect(['fog', 'overcast', 'storm', 'rain', 'drizzle', 'snow', 'hail'].some(w => isPlaneWeather(w as never))).toBe(false);
  });

  it('shows only the lights from nautical twilight on', () => {
    expect(showsPlaneLights('night')).toBe(true);
    expect(showsPlaneLights('nautical-twilight')).toBe(true);
    expect(showsPlaneLights('civil-twilight')).toBe(false);
    expect(showsPlaneLights('midday')).toBe(false);
  });

  it('flies high and far at 0.3-0.6 %/s: a near plane higher, bigger and faster', () => {
    const near = getPlaneLook(0);
    const far = getPlaneLook(1);
    expect([near.y, far.y]).toEqual(PLANE_BAND);
    expect([far.speed, near.speed]).toEqual(PLANE_SPEED);
    expect(near.width).toBeGreaterThan(far.width);
  });

  it('gives a moving trail the length of its life at the plane speed', () => {
    expect(getTrailLength(0.5, 10)).toBe(5);
    expect(getTrailLength(0.4, 60)).toBeCloseTo(24);
  });

  it('splits a persistent trail into pieces that cover the crossing, each grown while the plane passes it', () => {
    const pieces = getTrailPieces(-2, 103, 200, 4);
    expect(pieces).toHaveLength(4);
    expect(pieces[0]).toEqual({ left: -2, width: 25.75, growAt: 0, growSec: 50 });
    pieces.forEach((piece, i) => {
      if (i > 0) expect(piece.left).toBeCloseTo(pieces[i - 1].left + pieces[i - 1].width);
      // The plane is at the piece's left end when it starts to grow (the same clock as the crossing).
      expect(piece.left).toBeCloseTo(-2 + (103 * piece.growAt) / 200);
    });
    expect(pieces[3].growAt + pieces[3].growSec).toBe(200);
  });

  it('reads the test override', () => {
    expect(getPlaneOverride('?plane=persistent')).toBe('persistent');
    expect(getPlaneOverride('?plane=none&fish=shark')).toBe('none');
    expect(getPlaneOverride('?plane=jumbo')).toBeNull();
    expect(getPlaneOverride('')).toBeNull();
  });
});
