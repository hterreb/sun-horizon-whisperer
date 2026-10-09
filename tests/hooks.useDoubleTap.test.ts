import { renderHook, act } from '@testing-library/react';
import { useDoubleTap, DOUBLE_TAP_MS, HINT_MS } from '@/hooks/useDoubleTap';

// ROADMAP item 116: a scene card opens only on two taps on the same target within 350 ms.
describe('useDoubleTap', () => {
  const fish = { type: 'fish', kind: 'perch' } as const;
  const point = { x: 10, y: 20 };

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('uses a 350 ms window and a 600 ms ring', () => {
    expect(DOUBLE_TAP_MS).toBe(350);
    expect(HINT_MS).toBe(600);
  });

  it('one tap opens nothing and shows the ring for 600 ms', () => {
    const onInfo = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onInfo));
    act(() => result.current.tap(fish, point, 'fish-1'));
    expect(onInfo).not.toHaveBeenCalled();
    expect(result.current.hint).toBe('fish-1');
    act(() => { vi.advanceTimersByTime(599); });
    expect(result.current.hint).toBe('fish-1');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.hint).toBeNull();
  });

  it('two taps within 350 ms open the card with the second tap\'s point, and clear the ring', () => {
    const onInfo = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onInfo));
    act(() => result.current.tap(fish, point, 'fish-1'));
    act(() => { vi.advanceTimersByTime(350); });
    act(() => result.current.tap(fish, { x: 12, y: 22 }, 'fish-1'));
    expect(onInfo).toHaveBeenCalledExactlyOnceWith(fish, { x: 12, y: 22 }, 'fish-1');
    expect(result.current.hint).toBeNull();
    // The next tap starts a new pair.
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.tap(fish, point, 'fish-1'));
    expect(onInfo).toHaveBeenCalledTimes(1);
  });

  it('two taps 500 ms apart open nothing', () => {
    const onInfo = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onInfo));
    act(() => result.current.tap(fish, point, 'fish-1'));
    act(() => { vi.advanceTimersByTime(500); });
    act(() => result.current.tap(fish, point, 'fish-1'));
    expect(onInfo).not.toHaveBeenCalled();
    expect(result.current.hint).toBe('fish-1');
  });

  it('two taps on different targets open nothing; the ring moves to the second', () => {
    const onInfo = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onInfo));
    act(() => result.current.tap(fish, point, 'fish-1'));
    act(() => result.current.tap({ type: 'bird', kind: 'gull' }, point, 'bird-2'));
    expect(onInfo).not.toHaveBeenCalled();
    expect(result.current.hint).toBe('bird-2');
  });

  it('an immediate tap (a keyboard click) opens at once', () => {
    const onInfo = vi.fn();
    const { result } = renderHook(() => useDoubleTap(onInfo));
    act(() => result.current.tap({ type: 'sun' }, point, 'sun', true));
    expect(onInfo).toHaveBeenCalledExactlyOnceWith({ type: 'sun' }, point, 'sun');
    expect(result.current.hint).toBeNull();
  });

  it('without a handler, a double tap does nothing and does not throw', () => {
    const { result } = renderHook(() => useDoubleTap(undefined));
    act(() => result.current.tap(fish, point, 'fish-1'));
    act(() => result.current.tap(fish, point, 'fish-1'));
    expect(result.current.hint).toBeNull();
  });
});
