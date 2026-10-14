import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VIEWPORT_DEBOUNCE_MS, useViewportSize } from '../src/hooks/useViewportSize';

// ROADMAP item 151: one debounced size for the scene, set from a timer, not inside `resize`.
describe('useViewportSize', () => {
  const original = { width: window.innerWidth, height: window.innerHeight };
  const resizeTo = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true });
    window.dispatchEvent(new Event('resize'));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    resizeTo(390, 844);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', { value: original.width, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: original.height, configurable: true, writable: true });
  });

  const renderCounted = () => {
    let renders = 0;
    const hook = renderHook(() => {
      renders++;
      return useViewportSize();
    });
    return { ...hook, renders: () => renders };
  };

  it('starts at the window size', () => {
    const { result } = renderCounted();
    expect(result.current).toEqual({ width: 390, height: 844 });
  });

  it('does not render inside the resize event, and renders once after a burst of resizes', () => {
    const { result, renders } = renderCounted();
    const before = renders();
    // Android: the bars settle in several steps.
    act(() => resizeTo(844, 360));
    act(() => { vi.advanceTimersByTime(100); });
    act(() => resizeTo(844, 380));
    act(() => { vi.advanceTimersByTime(100); });
    act(() => resizeTo(844, 390));
    expect(renders()).toBe(before);
    expect(result.current).toEqual({ width: 390, height: 844 });

    act(() => { vi.advanceTimersByTime(VIEWPORT_DEBOUNCE_MS); });
    expect(renders()).toBe(before + 1);
    expect(result.current).toEqual({ width: 844, height: 390 });
  });

  it('waits VIEWPORT_DEBOUNCE_MS (150 ms) after the last resize', () => {
    expect(VIEWPORT_DEBOUNCE_MS).toBe(150);
    const { result } = renderCounted();
    act(() => resizeTo(844, 390));
    act(() => { vi.advanceTimersByTime(149); });
    expect(result.current.width).toBe(390);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.width).toBe(844);
  });

  it('does not render when the size is the same after the burst', () => {
    const { result, renders } = renderCounted();
    const before = renders();
    const first = result.current;
    act(() => resizeTo(844, 390));
    act(() => resizeTo(390, 844));
    act(() => { vi.advanceTimersByTime(VIEWPORT_DEBOUNCE_MS); });
    expect(renders()).toBe(before);
    expect(result.current).toBe(first);
  });

  it('shares one resize listener and one timer, so all users change in the same render', () => {
    const add = vi.spyOn(window, 'addEventListener');
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return [useViewportSize(), useViewportSize()];
    });
    expect(add.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    const before = renders;
    act(() => resizeTo(844, 390));
    act(() => { vi.advanceTimersByTime(VIEWPORT_DEBOUNCE_MS); });
    expect(renders).toBe(before + 1);
    expect(result.current).toEqual([{ width: 844, height: 390 }, { width: 844, height: 390 }]);
  });

  it('removes the listener and the pending timer when the last user unmounts', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const first = renderHook(() => useViewportSize());
    const second = renderHook(() => useViewportSize());
    act(() => resizeTo(844, 390));
    first.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(second.result.current).toEqual({ width: 390, height: 844 });
  });

  it('with an element: measures its client size at mount and after the debounce', () => {
    const node = document.createElement('div');
    let size = { width: 390, height: 844 };
    vi.spyOn(node, 'clientWidth', 'get').mockImplementation(() => size.width);
    vi.spyOn(node, 'clientHeight', 'get').mockImplementation(() => size.height);
    const ref = { current: node };
    const { result } = renderHook(() => useViewportSize(ref));
    expect(result.current).toEqual({ width: 390, height: 844 });

    size = { width: 844, height: 390 };
    act(() => resizeTo(844, 390));
    expect(result.current).toEqual({ width: 390, height: 844 });
    act(() => { vi.advanceTimersByTime(VIEWPORT_DEBOUNCE_MS); });
    expect(result.current).toEqual({ width: 844, height: 390 });
  });

  it('with an element: the box size, not the window size (the keyboard shrinks only the window)', () => {
    const node = document.createElement('div');
    vi.spyOn(node, 'clientWidth', 'get').mockReturnValue(390);
    vi.spyOn(node, 'clientHeight', 'get').mockReturnValue(844);
    const ref = { current: node };
    const { result } = renderHook(() => useViewportSize(ref));
    act(() => resizeTo(390, 500));
    act(() => { vi.advanceTimersByTime(VIEWPORT_DEBOUNCE_MS); });
    expect(result.current).toEqual({ width: 390, height: 844 });
  });
});
