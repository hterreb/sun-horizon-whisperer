import { describe, it, expect, vi, afterEach } from 'vitest';
import handler, { config } from '../api/satellites';
import { CELESTRAK_ACTIVE } from '../src/utils/satelliteFeed';

// ROADMAP item 160: the Vercel Edge function is a thin wrapper of handleSatellitesRequest.
describe('api/satellites (Vercel Edge function)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('runs on the Edge runtime', () => {
    expect(config).toEqual({ runtime: 'edge' });
  });

  it('asks CelesTrak for the active group', async () => {
    const fetchMock = vi.fn(async () => new Response('[]', { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await handler(new Request('https://sun-chaser.vercel.app/api/satellites'));
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe(CELESTRAK_ACTIVE);
    expect(await response.json()).toEqual([]);
  });
});
