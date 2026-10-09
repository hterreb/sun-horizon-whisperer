import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { getRunningAudioContext, useSunsetCountdown } from '../src/hooks/useSunsetCountdown';

const SUNSET = new Date('2026-09-30T18:50:00+02:00');
const at = (msBefore: number) => new Date(SUNSET.getTime() - msBefore);

// The hook keeps one AudioContext per module, so the first test creates it.
const created: FakeAudioContext[] = [];
class FakeAudioContext {
  currentTime = 0;
  state = 'suspended';
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  constructor() {
    created.push(this);
  }
  createGain() {
    return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: (node: unknown) => node };
  }
  createOscillator() {
    return { type: '', frequency: { setValueAtTime: () => {} }, connect: (node: unknown) => node, start: () => {}, stop: () => {} };
  }
}

describe('useSunsetCountdown (ROADMAP item 108)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('with the sound on, the first tap anywhere starts the audio once, then the listener is gone', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useSunsetCountdown(SUNSET, at(60_000), true, true));
    expect(add).toHaveBeenCalledWith('pointerdown', expect.any(Function), { capture: true, once: true });
    expect(created).toHaveLength(0);

    window.dispatchEvent(new Event('pointerdown'));
    expect(created).toHaveLength(1);
    expect(created[0].resume).toHaveBeenCalledTimes(1);
    expect(created[0].state).toBe('running');

    created[0].state = 'suspended';
    window.dispatchEvent(new Event('pointerdown'));
    expect(created).toHaveLength(1);
    expect(created[0].resume).toHaveBeenCalledTimes(1);
    add.mockRestore();
  });

  it('with the sound off, adds no tap listener', () => {
    const add = vi.spyOn(window, 'addEventListener');
    renderHook(() => useSunsetCountdown(SUNSET, at(60_000), true, false));
    expect(add).not.toHaveBeenCalledWith('pointerdown', expect.anything(), expect.anything());
    add.mockRestore();
  });

  it('is sounding from T-11 s to the end of the chime, so the radio ducks', () => {
    vi.setSystemTime(at(20_000));
    const { result, rerender } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, true, true), {
      initialProps: { now: at(20_000) },
    });
    expect(result.current).toEqual({ seconds: null, isSounding: false });
    rerender({ now: at(10_700) });
    expect(result.current).toEqual({ seconds: null, isSounding: true });
    rerender({ now: at(3_700) });
    expect(result.current).toEqual({ seconds: 4, isSounding: true });
    rerender({ now: at(-300) });
    expect(result.current).toEqual({ seconds: null, isSounding: true });
    rerender({ now: at(-1_300) });
    expect(result.current).toEqual({ seconds: null, isSounding: false });
  });

  it('with the sound off, counts down but is not sounding', () => {
    const { result, rerender } = renderHook(({ now }) => useSunsetCountdown(SUNSET, now, true, false), {
      initialProps: { now: at(10_700) },
    });
    rerender({ now: at(3_700) });
    expect(result.current).toEqual({ seconds: 4, isSounding: false });
  });

  it('gives the app\'s AudioContext to Santa\'s bells only while it runs, and never creates one', () => {
    // The earlier tests created the one context of the module.
    const count = created.length;
    const ctx = created[0];
    ctx.state = 'suspended';
    expect(getRunningAudioContext()).toBeNull();
    ctx.state = 'running';
    expect(getRunningAudioContext()).toBe(ctx);
    expect(created).toHaveLength(count);
  });
});
