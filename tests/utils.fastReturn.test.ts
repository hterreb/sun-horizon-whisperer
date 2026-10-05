import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FAST_RETURN_MS,
  LAST_VISIBLE_STORAGE_KEY,
  getStartReveal,
  isFastReturn,
  loadLastVisible,
  saveLastVisible,
} from '../src/utils/fastReturn';

const MINUTE = 60 * 1000;

describe('fastReturn (ROADMAP item 90 K3)', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves the time the app was last visible in sessionStorage, and loads it', () => {
    expect(loadLastVisible()).toBeNull();
    saveLastVisible(1_000_000);
    expect(sessionStorage.getItem(LAST_VISIBLE_STORAGE_KEY)).toBe('1000000');
    expect(loadLastVisible()).toBe(1_000_000);
  });

  it('loads null for a value that is not a number', () => {
    sessionStorage.setItem(LAST_VISIBLE_STORAGE_KEY, 'soon');
    expect(loadLastVisible()).toBeNull();
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveLastVisible(1)).not.toThrow();
    expect(loadLastVisible()).toBeNull();
  });

  it('is a fast return less than 30 min after the app was last visible', () => {
    const now = 100 * MINUTE;
    expect(FAST_RETURN_MS).toBe(30 * MINUTE);
    expect(isFastReturn(now - 2 * MINUTE, now)).toBe(true);
    expect(isFastReturn(now - FAST_RETURN_MS + 1, now)).toBe(true);
    expect(isFastReturn(now - FAST_RETURN_MS, now)).toBe(false);
    expect(isFastReturn(null, now)).toBe(false);
    // The clock went back: not a fast return.
    expect(isFastReturn(now + MINUTE, now)).toBe(false);
  });

  it('opens the scene with the iris only for a slow start with motion and no fast return', () => {
    expect(getStartReveal(true, false, false)).toBe('iris');
    expect(getStartReveal(true, false, true)).toBe('fade');
    expect(getStartReveal(false, false, false)).toBe('fade');
    expect(getStartReveal(true, true, false)).toBe('fade');
  });
});
