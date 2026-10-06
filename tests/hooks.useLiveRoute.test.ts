import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLiveRoute, liveRouteUrl } from '../src/hooks/useLiveRoute';

// ROADMAP item 111: one route request when a live plane's card opens; a failure leaves it out.
describe('useLiveRoute', () => {
  const route = { from: { code: 'CDG', name: 'Paris' }, to: { code: 'TLV', name: 'Tel Aviv' } };
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ route }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

  it('builds the proxy URL with the place rounded to 0.1°', () => {
    expect(liveRouteUrl('ELY326', 47.78123, 9.61234)).toBe('/api/planes?route=ELY326&lat=47.8&lon=9.6');
  });

  it('asks once for a callsign and gives its route', async () => {
    const { result, rerender } = renderHook(({ callsign }) => useLiveRoute(callsign, 47.78, 9.61), { initialProps: { callsign: 'ELY326' as string | null } });
    expect(result.current).toBeNull();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/planes?route=ELY326&lat=47.8&lon=9.6');
    expect(result.current).toEqual(route);
    rerender({ callsign: 'ELY326' });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Another card: the last plane's route does not show while the new one loads.
    fetchMock.mockImplementation(() => new Promise(() => {}));
    rerender({ callsign: 'DLH4AB' });
    expect(result.current).toBeNull();
  });

  it('asks nothing without a callsign, and gives null when the request fails', async () => {
    const { result, rerender } = renderHook(({ callsign }) => useLiveRoute(callsign, 47.78, 9.61), { initialProps: { callsign: null as string | null } });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockImplementation(async () => new Response(null, { status: 502 }));
    rerender({ callsign: 'ELY326' });
    await flush();
    expect(result.current).toBeNull();
  });
});
