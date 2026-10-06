import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLivePlanes } from '../src/hooks/useLivePlanes';

// ROADMAP item 96: one request every 15 s, only while the switch is on and the page is visible.
describe('useLivePlanes', () => {
  let visibility: DocumentVisibilityState = 'visible';
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ now: 5, aircraft: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

  it('asks the proxy at once and every 15 s, with the place rounded to 0.1°', async () => {
    const { result } = renderHook(() => useLivePlanes(true, 47.78123, 9.61234));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/planes?lat=47.8&lon=9.6');
    expect(result.current?.feed).toEqual({ now: 5, aircraft: [] });
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends nothing while off, and nothing while the page is hidden', async () => {
    const { result, rerender } = renderHook(({ on }) => useLivePlanes(on, 47.8, 9.6), { initialProps: { on: false } });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
    visibility = 'hidden';
    rerender({ on: true });
    act(() => { vi.advanceTimersByTime(45_000); });
    expect(fetchMock).not.toHaveBeenCalled();
    // Back in view: an answer at once.
    visibility = 'visible';
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the last answer when a request fails, and drops it after a minute', async () => {
    const { result } = renderHook(() => useLivePlanes(true, 47.8, 9.6));
    await flush();
    expect(result.current).not.toBeNull();
    fetchMock.mockImplementation(async () => new Response('', { status: 502 }));
    for (let i = 0; i < 3; i++) {
      act(() => { vi.advanceTimersByTime(15_000); });
      await flush();
    }
    expect(result.current).not.toBeNull(); // 45 s old
    act(() => { vi.advanceTimersByTime(30_000); });
    await flush();
    expect(result.current).toBeNull();
  });
});
