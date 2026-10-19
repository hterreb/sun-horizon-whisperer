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
    expect(result.current.state?.feed).toEqual({ now: 5, aircraft: [] });
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends nothing while off, and nothing while the page is hidden', async () => {
    const { result, rerender } = renderHook(({ on }) => useLivePlanes(on, 47.8, 9.6), { initialProps: { on: false } });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.state).toBeNull();
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
    expect(result.current.state).not.toBeNull();
    fetchMock.mockImplementation(async () => new Response('', { status: 502 }));
    for (let i = 0; i < 3; i++) {
      act(() => { vi.advanceTimersByTime(15_000); });
      await flush();
    }
    expect(result.current.state).not.toBeNull(); // 45 s old
    act(() => { vi.advanceTimersByTime(30_000); });
    await flush();
    expect(result.current.state).toBeNull();
  });

  // Item 155: the status for the line under the switch and the Sentry tag.
  it('is loading until the first answer, then ok', async () => {
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>(resolve => { answer = resolve; }));
    const { result } = renderHook(() => useLivePlanes(true, 47.8, 9.6));
    await flush();
    expect(result.current.status).toBe('loading');
    answer(new Response(JSON.stringify({ now: 5, aircraft: [] }), { status: 200 }));
    await flush();
    expect(result.current.status).toBe('ok');
  });

  it('is error after a failed request (an HTTP error, no network, a broken answer), and ok again after an answer', async () => {
    const failures = [
      async () => new Response('', { status: 502 }),
      async () => { throw new TypeError('Failed to fetch'); },
      async () => new Response(JSON.stringify({ error: 'x' }), { status: 200 }),
    ];
    for (const failure of failures) {
      fetchMock.mockImplementation(failure);
      const { result, unmount } = renderHook(() => useLivePlanes(true, 47.8, 9.6));
      await flush();
      expect(result.current.status).toBe('error');
      expect(result.current.state).toBeNull();
      fetchMock.mockImplementation(async () => new Response(JSON.stringify({ now: 5, aircraft: [] }), { status: 200 }));
      act(() => { vi.advanceTimersByTime(15_000); });
      await flush();
      expect(result.current.status).toBe('ok');
      unmount();
    }
  });

  it('starts loading again when the switch goes off and on', async () => {
    const { result, rerender } = renderHook(({ on }) => useLivePlanes(on, 47.8, 9.6), { initialProps: { on: true } });
    await flush();
    expect(result.current.status).toBe('ok');
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    rerender({ on: false });
    rerender({ on: true });
    await flush();
    expect(result.current.status).toBe('loading');
  });

  // Item 164: the refresh button in the panel.
  it('refresh asks at once, stops the request that runs, and is refreshing until the answer', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 502 }));
    const { result } = renderHook(() => useLivePlanes(true, 47.8, 9.6));
    await flush();
    expect(result.current.status).toBe('error');
    expect(result.current.refreshing).toBe(false);
    // The next poll hangs; the refresh stops it and asks again.
    const signals: AbortSignal[] = [];
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signals.push(init.signal!);
      return new Promise<Response>(resolve => { answer = resolve; });
    });
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    act(() => { result.current.refresh(); });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.status).toBe('error');
    answer(new Response(JSON.stringify({ now: 5, aircraft: [] }), { status: 200 }));
    await flush();
    expect(result.current.refreshing).toBe(false);
    expect(result.current.status).toBe('ok');
  });

  it('refresh does nothing while off', () => {
    const { result } = renderHook(() => useLivePlanes(false, 47.8, 9.6));
    act(() => { result.current.refresh(); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.refreshing).toBe(false);
  });
});
