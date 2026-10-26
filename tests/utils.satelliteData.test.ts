import fixture from './fixtures/iss-omm-2026-10-05.json';
import {
  REFRESH_MS,
  RETRY_MS,
  SERVER_RETRY_MS,
  ALL_GROUPS_URL,
  CELESTRAK_STATUS_HEADER,
  SATELLITE_CACHE_KEY,
  SATELLITE_GROUPS,
  dedupeRecords,
  getNextSatelliteTry,
  gpUrl,
  loadSatelliteData,
  type GpRecord,
} from '../src/utils/satelliteData';

const iss = { ...(fixture.omm as unknown as GpRecord), EXTRA_FIELD: 'x' } as GpRecord;
// A module docked to the ISS has the station's orbit, under its own id.
const poisk: GpRecord = { ...iss, OBJECT_NAME: 'POISK', NORAD_CAT_ID: 36086 };
const other: GpRecord = { ...iss, OBJECT_NAME: 'OTHER', NORAD_CAT_ID: 1, MEAN_ANOMALY: 10 };

const response = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({ status, headers: new Headers(headers), json: async () => body }) as Response;
const NOW = Date.parse('2026-10-06T08:00:00Z');
const urlOf = (call: unknown[]) => String(call[0]);
const directCalls = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.filter((c) => urlOf(c).includes('celestrak.org')).length;
const serverCalls = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.filter((c) => urlOf(c) === ALL_GROUPS_URL).length;

describe('satelliteData (ROADMAP item 97)', () => {
  beforeEach(() => localStorage.clear());

  it('asks CelesTrak for the GP data of each group as OMM JSON', () => {
    expect(SATELLITE_GROUPS).toEqual(['stations', 'visual', 'last-30-days']);
    expect(gpUrl('visual')).toBe('https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json');
  });

  it('keeps one record per orbit and per id', () => {
    expect(dedupeRecords([iss, poisk, other, other]).map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'OTHER']);
  });

  it('fetches the three groups and the night catalogue once, then serves the cache for a day', async () => {
    const fetchImpl = vi.fn(async () => response(200, [iss, poisk, other]));
    const first = await loadSatelliteData(NOW, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(first?.map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'OTHER']);
    // Only the fields SGP4 and the card need are cached.
    expect(first?.[0]).not.toHaveProperty('EXTRA_FIELD');

    await loadSatelliteData(NOW + REFRESH_MS - 1, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    await loadSatelliteData(NOW + REFRESH_MS, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(8);
  });

  it('adds the night catalogue after the groups (item 160)', async () => {
    const night: GpRecord = { ...iss, OBJECT_NAME: 'QIANFAN-1', NORAD_CAT_ID: 60001, MEAN_ANOMALY: 20, EXTRA_FIELD: 'x' } as GpRecord;
    const fetchImpl = vi.fn(async (url: string) => response(200, url === ALL_GROUPS_URL ? [night, iss] : [iss]));
    const records = await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls.at(-1)?.[0]).toBe(ALL_GROUPS_URL);
    expect(records?.map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'QIANFAN-1']);
    expect(records?.[1]).not.toHaveProperty('EXTRA_FIELD');
  });

  it('keeps the groups for a day when the night catalogue fails', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === ALL_GROUPS_URL) throw new TypeError('Failed to fetch');
      return response(200, [iss]);
    });
    expect(await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch)).toHaveLength(1);
    await loadSatelliteData(NOW + RETRY_MS, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('stops at the first error and waits 2 h before the next try, keeping the old data', async () => {
    await loadSatelliteData(NOW, vi.fn(async () => response(200, [iss])));
    const later = NOW + REFRESH_MS;
    const blocked = vi.fn(async () => response(403, 'blocked'));
    expect((await loadSatelliteData(later, blocked))?.[0].OBJECT_NAME).toBe('ISS (ZARYA)');
    // One group request, then (item 177) one server request.
    expect(directCalls(blocked)).toBe(1);
    await loadSatelliteData(later + RETRY_MS - 1, blocked);
    expect(directCalls(blocked)).toBe(1);
    await loadSatelliteData(later + RETRY_MS, blocked);
    expect(directCalls(blocked)).toBe(2);
  });

  it('returns null without any data, also after a network error', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await loadSatelliteData(NOW, offline)).toBeNull();
    expect(await loadSatelliteData(NOW + 1000, offline)).toBeNull();
    expect(directCalls(offline)).toBe(1);
    expect(serverCalls(offline)).toBe(1);
  });

  it('does not keep a cache from the future fresh (clock set back)', async () => {
    await loadSatelliteData(NOW, vi.fn(async () => response(200, [iss])));
    const fetchImpl = vi.fn(async () => response(200, [other]));
    expect((await loadSatelliteData(NOW - 3 * RETRY_MS, fetchImpl))?.[0].OBJECT_NAME).toBe('OTHER');
  });

  // Item 164 (R-a): the refresh button calls loadSatelliteData; it must not skip the wait.
  it('a refresh within RETRY_MS after an error does not ask CelesTrak; the next try is in the cache', async () => {
    expect(getNextSatelliteTry(NOW)).toBeNull();
    const blocked = vi.fn(async () => response(403, 'blocked'));
    expect(await loadSatelliteData(NOW, blocked)).toBeNull();
    // Both wait (CelesTrak 2 h, our server 15 min): the next try is the server's.
    expect(getNextSatelliteTry(NOW + 60_000)).toBe(NOW + SERVER_RETRY_MS);
    const fetchImpl = vi.fn(async () => response(200, [iss]));
    expect(await loadSatelliteData(NOW + 60_000, fetchImpl)).toBeNull();
    expect(await loadSatelliteData(NOW + SERVER_RETRY_MS - 1, fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getNextSatelliteTry(NOW + SERVER_RETRY_MS)).toBeNull();
    expect(getNextSatelliteTry(NOW + RETRY_MS)).toBeNull();
    expect(await loadSatelliteData(NOW + RETRY_MS, fetchImpl)).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    // After a full fetch the next try is a day later.
    expect(getNextSatelliteTry(NOW + RETRY_MS + 1)).toBe(NOW + RETRY_MS + REFRESH_MS);
  });

  it('keeps the wait in the page when the browser blocks localStorage (item 164)', async () => {
    // A new module, so no cache of an earlier test is in the page.
    vi.resetModules();
    const data = await import('../src/utils/satelliteData');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const blocked = vi.fn(async () => response(403, 'blocked'));
      expect(await data.loadSatelliteData(NOW, blocked)).toBeNull();
      expect(await data.loadSatelliteData(NOW + 60_000, blocked)).toBeNull();
      expect(directCalls(blocked)).toBe(1);
      expect(serverCalls(blocked)).toBe(1);
      expect(data.getNextSatelliteTry(NOW + 60_000)).toBe(NOW + SERVER_RETRY_MS);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('gives no next try for a cache from the future (clock set back)', async () => {
    await loadSatelliteData(NOW, vi.fn(async () => response(200, [iss])));
    expect(getNextSatelliteTry(NOW - 3 * RETRY_MS)).toBeNull();
  });

  // Item 177: our server is the fallback of the direct groups.
  describe('server fallback (item 177)', () => {
    const serverRecords = [iss, other];
    const serverFetch = (direct: () => Promise<Response>) => vi.fn(async (url: string) => (
      url === ALL_GROUPS_URL ? response(200, serverRecords) : direct()
    ));

    it.each([
      ['a 403', async () => response(403, 'blocked')],
      ['a network error', async () => { throw new TypeError('Failed to fetch'); }],
      ['a timeout', async () => { throw new DOMException('timed out', 'TimeoutError'); }],
    ])('a direct group fails with %s: one server request and its records', async (_name, direct) => {
      const fetchImpl = serverFetch(direct);
      const records = await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch);
      expect(records?.map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'OTHER']);
      expect(directCalls(fetchImpl)).toBe(1);
      expect(serverCalls(fetchImpl)).toBe(1);
    });

    it('gives every direct group request a timeout', async () => {
      const fetchImpl = vi.fn(async () => response(200, [iss]));
      await loadSatelliteData(NOW, fetchImpl);
      const init = (fetchImpl.mock.calls[0] as unknown[])[1] as RequestInit;
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('does not ask CelesTrak again within 2 h, but asks the server when the cached data is too old', async () => {
      const stale = { ...iss, EPOCH: '2026-09-20T00:00:00.000' };
      localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify({ fetchedAt: NOW - 3 * REFRESH_MS, triedAt: NOW - 60_000, records: [stale] }));
      const fetchImpl = serverFetch(async () => response(403, 'blocked'));
      const records = await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch);
      expect(records?.map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'OTHER']);
      expect(directCalls(fetchImpl)).toBe(0);
      expect(serverCalls(fetchImpl)).toBe(1);
    });

    it('uses the cached data without the server while the wait holds and the data is usable', async () => {
      localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify({ fetchedAt: NOW - 3 * REFRESH_MS, triedAt: NOW - 60_000, records: [iss] }));
      const fetchImpl = vi.fn(async () => response(200, []));
      expect(await loadSatelliteData(NOW, fetchImpl)).toHaveLength(1);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(getNextSatelliteTry(NOW)).toBe(NOW - 60_000 + RETRY_MS);
    });

    it('a failed server try waits 15 min, then asks again; the 2 h CelesTrak wait stays', async () => {
      const fetchImpl = vi.fn(async (url: string) => (url === ALL_GROUPS_URL ? response(200, []) : response(403, 'blocked')));
      expect(await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch)).toBeNull();
      expect(await loadSatelliteData(NOW + SERVER_RETRY_MS - 1, fetchImpl as unknown as typeof fetch)).toBeNull();
      expect(serverCalls(fetchImpl)).toBe(1);
      expect(await loadSatelliteData(NOW + SERVER_RETRY_MS, fetchImpl as unknown as typeof fetch)).toBeNull();
      expect(serverCalls(fetchImpl)).toBe(2);
      expect(directCalls(fetchImpl)).toBe(1);
    });

    it('after a server success, asks CelesTrak again only after a day, not after 2 h', async () => {
      const fetchImpl = serverFetch(async () => response(403, 'blocked'));
      await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch);
      expect(directCalls(fetchImpl)).toBe(1);
      expect(await loadSatelliteData(NOW + RETRY_MS + 1, fetchImpl as unknown as typeof fetch)).toHaveLength(2);
      expect(directCalls(fetchImpl)).toBe(1);
      await loadSatelliteData(NOW + REFRESH_MS, fetchImpl as unknown as typeof fetch);
      expect(directCalls(fetchImpl)).toBe(2);
    });

    it('keeps the data of an old cache entry without serverTriedAt (compatible format)', async () => {
      localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify({ fetchedAt: NOW - 60_000, triedAt: NOW - 60_000, records: [iss] }));
      expect(await loadSatelliteData(NOW, vi.fn())).toHaveLength(1);
    });

    it('after a direct success, asks the server once, for the night catalogue (item 183: one server URL)', async () => {
      const fetchImpl = vi.fn(async () => response(200, [iss]));
      await loadSatelliteData(NOW, fetchImpl);
      expect(serverCalls(fetchImpl)).toBe(1);
      expect(fetchImpl.mock.calls.at(-1)?.[0]).toBe(ALL_GROUPS_URL);
    });
  });

  describe('CelesTrak policy (item 183)', () => {
    it('reports a direct error answer with its status and group, but not a network error', async () => {
      const report = vi.fn();
      await loadSatelliteData(NOW, vi.fn(async (url: string) => (url === ALL_GROUPS_URL ? response(200, [iss]) : response(403, 'blocked'))) as unknown as typeof fetch, report);
      expect(report.mock.calls).toEqual([['HTTP 403 for stations']]);
      localStorage.clear();
      const offline = vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      });
      await loadSatelliteData(NOW, offline, report);
      expect(report).toHaveBeenCalledTimes(1);
    });

    it("reports the server's CelesTrak problem", async () => {
      const report = vi.fn();
      const fetchImpl = vi.fn(async (url: string) => (
        url === ALL_GROUPS_URL ? response(200, [iss], { [CELESTRAK_STATUS_HEADER]: 'HTTP 403 for active' }) : response(403, 'blocked')
      ));
      expect(await loadSatelliteData(NOW, fetchImpl as unknown as typeof fetch, report)).toHaveLength(1);
      expect(report.mock.calls).toEqual([['HTTP 403 for stations'], ['server: HTTP 403 for active']]);
    });

    it('two loads at once share one set of requests', async () => {
      const fetchImpl = vi.fn(async () => response(200, [iss]));
      const [a, b] = await Promise.all([loadSatelliteData(NOW, fetchImpl), loadSatelliteData(NOW, fetchImpl)]);
      expect(a).toBe(b);
      expect(fetchImpl).toHaveBeenCalledTimes(4);
    });
  });

  it('ignores a broken cache entry', async () => {
    localStorage.setItem(SATELLITE_CACHE_KEY, '{broken');
    const fetchImpl = vi.fn(async () => response(200, [iss]));
    expect(await loadSatelliteData(NOW, fetchImpl)).toHaveLength(1);
  });
});
