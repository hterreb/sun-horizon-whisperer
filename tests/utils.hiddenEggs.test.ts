import { describe, expect, it } from 'vitest';
import {
  KONAMI_SEQUENCE,
  SUN_TAP_GAP_MS,
  advanceKonami,
  getEggOverride,
  registerSunTap,
  rollUfo,
} from '@/utils/hiddenEggs';

const tapAt = (times: number[]) => {
  let taps = { count: 0, lastMs: -Infinity };
  const triggers: boolean[] = [];
  for (const t of times) {
    const r = registerSunTap(taps, t);
    taps = r.taps;
    triggers.push(r.triggered);
  }
  return triggers;
};

describe('registerSunTap', () => {
  it('triggers on the 7th quick tap, not before', () => {
    const triggers = tapAt([0, 300, 600, 900, 1200, 1500, 1800]);
    expect(triggers).toEqual([false, false, false, false, false, false, true]);
  });

  it('starts again after a long pause', () => {
    const triggers = tapAt([0, 300, 600, 900, 1200, 1200 + SUN_TAP_GAP_MS + 1, 3000]);
    expect(triggers.some(Boolean)).toBe(false);
  });

  it('resets the count after a trigger', () => {
    const times = Array.from({ length: 13 }, (_, i) => i * 100);
    expect(tapAt(times).filter(Boolean)).toHaveLength(1);
  });
});

describe('advanceKonami', () => {
  const run = (keys: string[]) => keys.reduce(advanceKonami, 0);

  it('completes on the full code, with B and A in any case', () => {
    expect(run(KONAMI_SEQUENCE)).toBe(KONAMI_SEQUENCE.length);
    expect(run([...KONAMI_SEQUENCE.slice(0, 8), 'B', 'A'])).toBe(KONAMI_SEQUENCE.length);
  });

  it('resets on a wrong key', () => {
    expect(run(['ArrowUp', 'ArrowUp', 'ArrowDown', 'x'])).toBe(0);
  });

  it('keeps a matching tail after an extra up arrow', () => {
    expect(run(['ArrowUp', 'ArrowUp', 'ArrowUp'])).toBe(2);
    expect(run(['ArrowUp', ...KONAMI_SEQUENCE])).toBe(KONAMI_SEQUENCE.length);
  });
});

describe('rollUfo', () => {
  it('hits 1 in 200', () => {
    expect(rollUfo(() => 0.004)).toBe(true);
    expect(rollUfo(() => 0.005)).toBe(false);
    expect(rollUfo(() => 0.9)).toBe(false);
  });
});

describe('getEggOverride', () => {
  it('reads ?egg= and ignores unknown values', () => {
    expect(getEggOverride('?egg=ufo')).toBe('ufo');
    expect(getEggOverride('?x=1&egg=disco')).toBe('disco');
    expect(getEggOverride('?egg=sunglasses')).toBe('sunglasses');
    expect(getEggOverride('?egg=whale')).toBeNull();
    expect(getEggOverride('')).toBeNull();
  });
});
