import { describe, it, expect, vi, afterEach } from 'vitest';
import handler, { config } from '../api/planes';

// ROADMAP item 96: the Vercel Edge function is a thin wrapper of handlePlanesRequest.
describe('api/planes (Vercel Edge function)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('runs on the Edge runtime', () => {
    expect(config).toEqual({ runtime: 'edge' });
  });

  it('forwards the rounded place to adsb.lol and returns the mapped feed', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ now: 7, ac: [] }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await handler(new Request('https://sun-chaser.vercel.app/api/planes?lat=47.78&lon=9.61'));
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('https://api.adsb.lol/v2/point/47.8/9.6/54');
    expect(await response.json()).toEqual({ now: 7, aircraft: [] });
  });
});
