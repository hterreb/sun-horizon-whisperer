import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTER_HIDE_MS, TAP_READY_MS, WAKE_HIDE_MS, useIdleHide } from '../src/hooks/useIdleHide';

describe('useIdleHide (ROADMAP item 89)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => {
    vi.advanceTimersByTime(ms);
  });
  const enterFullscreen = () => {
    const hook = renderHook(({ active }) => useIdleHide(active), { initialProps: { active: false } });
    hook.rerender({ active: true });
    return hook;
  };

  it('uses 3 s after entering and 10 s after a wake', () => {
    expect(ENTER_HIDE_MS).toBe(3000);
    expect(WAKE_HIDE_MS).toBe(10000);
  });

  it('stays visible while not in fullscreen', () => {
    const { result } = renderHook(() => useIdleHide(false));
    advance(60_000);
    act(() => result.current.wake());
    expect(result.current.isVisible).toBe(true);
  });

  it('hides 3 s after entering fullscreen', () => {
    const { result } = enterFullscreen();
    advance(2999);
    expect(result.current.isVisible).toBe(true);
    advance(1);
    expect(result.current.isVisible).toBe(false);
  });

  it('a move at 2 s, before the first hide, hides at 5 s', () => {
    const { result } = enterFullscreen();
    advance(2000);
    act(() => result.current.wake());
    advance(2999);
    expect(result.current.isVisible).toBe(true);
    advance(1);
    expect(result.current.isVisible).toBe(false);
  });

  it('a tap after the hide shows, and hides 10 s later', () => {
    const { result } = enterFullscreen();
    advance(3000);
    expect(result.current.isVisible).toBe(false);

    act(() => result.current.wake());
    expect(result.current.isVisible).toBe(true);
    advance(9999);
    expect(result.current.isVisible).toBe(true);
    advance(1);
    expect(result.current.isVisible).toBe(false);
  });

  it('leaving fullscreen shows at once, and entering again starts with 3 s', () => {
    const { result, rerender } = enterFullscreen();
    advance(3000);
    rerender({ active: false });
    expect(result.current.isVisible).toBe(true);
    advance(60_000);
    expect(result.current.isVisible).toBe(true);

    rerender({ active: true });
    advance(2000);
    act(() => result.current.wake());
    advance(3000);
    expect(result.current.isVisible).toBe(false);
  });

  it('takes no taps while hidden, and only TAP_READY_MS after a wake (item 132)', () => {
    expect(TAP_READY_MS).toBeGreaterThan(350); // longer than a double tap (DOUBLE_TAP_MS)
    const { result, rerender } = enterFullscreen();
    expect(result.current.isTappable).toBe(true);
    advance(3000);
    expect(result.current.isTappable).toBe(false);

    act(() => result.current.wake());
    expect(result.current.isVisible).toBe(true);
    expect(result.current.isTappable).toBe(false);
    advance(TAP_READY_MS - 1);
    expect(result.current.isTappable).toBe(false);
    advance(1);
    expect(result.current.isTappable).toBe(true);

    advance(WAKE_HIDE_MS);
    expect(result.current.isTappable).toBe(false);
    rerender({ active: false });
    expect(result.current.isTappable).toBe(true);
    rerender({ active: true });
    expect(result.current.isTappable).toBe(true);
  });
});
