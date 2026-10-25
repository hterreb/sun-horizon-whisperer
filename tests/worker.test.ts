import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../worker/index';

// ROADMAP item 16: the Worker sends /api/planes to handlePlanesRequest and the rest to the assets.
describe('worker/index (Cloudflare Worker)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });
  const assets = () => ({ fetch: vi.fn(async () => new Response('asset')) });

  it('forwards the rounded place to adsb.lol and returns the mapped feed', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ now: 7, ac: [] }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const env = { ASSETS: assets() };
    const response = await worker.fetch(new Request('https://sun.chaser.page/api/planes?lat=47.78&lon=9.61'), env);
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('https://api.adsb.lol/v2/point/47.8/9.6/54');
    expect(await response.json()).toEqual({ now: 7, aircraft: [] });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('answers 405 for another method', async () => {
    const response = await worker.fetch(new Request('https://sun.chaser.page/api/planes?lat=1&lon=2', { method: 'POST' }), { ASSETS: assets() });
    expect(response.status).toBe(405);
  });

  it('serves any other path from the assets', async () => {
    const env = { ASSETS: assets() };
    const response = await worker.fetch(new Request('https://sun.chaser.page/api/other'), env);
    expect(await response.text()).toBe('asset');
  });
});
