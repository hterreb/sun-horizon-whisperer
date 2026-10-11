import { describe, it, expect, vi, afterEach } from 'vitest';
import { onRequest } from '../functions/api/planes';

// ROADMAP item 16: the Cloudflare Pages Function is a thin wrapper of handlePlanesRequest.
describe('functions/api/planes (Cloudflare Pages Function)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('forwards the rounded place to adsb.lol and returns the mapped feed', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ now: 7, ac: [] }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await onRequest({ request: new Request('https://sun.chaser.page/api/planes?lat=47.78&lon=9.61') });
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('https://api.adsb.lol/v2/point/47.8/9.6/54');
    expect(await response.json()).toEqual({ now: 7, aircraft: [] });
  });

  it('answers 405 for another method', async () => {
    const response = await onRequest({ request: new Request('https://sun.chaser.page/api/planes?lat=1&lon=2', { method: 'POST' }) });
    expect(response.status).toBe(405);
  });
});
