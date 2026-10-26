import fixture from './fixtures/iss-omm-2026-10-05.json';
import {
  CELESTRAK_ACTIVE,
  SATELLITES_CACHE_CONTROL,
  SATELLITES_ERROR_CACHE_CONTROL,
  handleSatellitesRequest,
  isNightSatellite,
  orbitHeightsKm,
} from '../src/utils/satelliteFeed';
import { ALL_GROUPS_URL, CELESTRAK_STATUS_HEADER, gpUrl, type GpRecord } from '../src/utils/satelliteData';

const iss = fixture.omm as unknown as GpRecord;
// A Qianfan satellite: 1066 km, circular (CelesTrak, 15 Oct 2026).
const qianfan: GpRecord = { ...iss, OBJECT_NAME: 'QIANFAN-128', NORAD_CAT_ID: 69074, MEAN_MOTION: 13.51016349, ECCENTRICITY: 0.00025268 };
const starlink: GpRecord = { ...qianfan, OBJECT_NAME: 'STARLINK-1007', NORAD_CAT_ID: 44713 };
// Perigee 800 km, apogee about 3700 km: part of the orbit is too far.
const molniyaLike: GpRecord = { ...qianfan, OBJECT_NAME: 'ELLIPSE', NORAD_CAT_ID: 9, MEAN_MOTION: 11, ECCENTRICITY: 0.17 };
const request = (method = 'GET') => new Request('https://sun-chaser.vercel.app/api/satellites', { method });

describe('satelliteFeed: the night catalogue (ROADMAP item 160)', () => {
  it('computes the orbit heights from the mean motion and the eccentricity', () => {
    const [perigee, apogee] = orbitHeightsKm(iss);
    expect(perigee).toBeGreaterThan(400);
    expect(apogee).toBeLessThan(430);
    expect(orbitHeightsKm(qianfan)[0]).toBeCloseTo(1066, -1);
  });

  it('keeps the 700-2000 km orbits, without Starlink, OneWeb and orbits partly outside', () => {
    expect(isNightSatellite(qianfan)).toBe(true);
    expect(isNightSatellite(iss)).toBe(false);
    expect(isNightSatellite(starlink)).toBe(false);
    expect(isNightSatellite({ ...qianfan, OBJECT_NAME: 'ONEWEB-0012' })).toBe(false);
    expect(isNightSatellite(molniyaLike)).toBe(false);
  });

  it('points the plain path to ?all=1 without a download, so one cache entry downloads `active` (item 183)', async () => {
    const fetchFn = vi.fn();
    const response = await handleSatellitesRequest(request(), fetchFn as unknown as typeof fetch);
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe(ALL_GROUPS_URL);
    expect(response.headers.get('Cache-Control')).toBe(SATELLITES_CACHE_CONTROL);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  describe('?all=1: the groups and the night catalogue (item 177)', () => {
    beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
    afterEach(() => { vi.restoreAllMocks(); });
    const allRequest = () => new Request('https://sun-chaser.vercel.app/api/satellites?all=1');
    const poisk: GpRecord = { ...iss, OBJECT_NAME: 'POISK', NORAD_CAT_ID: 36086 };
    const visual: GpRecord = { ...iss, OBJECT_NAME: 'VISUAL-1', NORAD_CAT_ID: 5, MEAN_ANOMALY: 99 };
    const lists: Record<string, unknown[]> = {
      [gpUrl('stations')]: [iss, poisk],
      [gpUrl('visual')]: [visual, iss],
      [gpUrl('last-30-days')]: [{ ...visual, OBJECT_NAME: 'NEW-1', NORAD_CAT_ID: 6, MEAN_ANOMALY: 98, EXTRA: 1 }],
      [CELESTRAK_ACTIVE]: [iss, qianfan, starlink],
    };

    it('gives the four lists in sequence in one answer, the ISS first, no duplicates, cached for a day', async () => {
      const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify(lists[url]), { status: 200 }));
      const response = await handleSatellitesRequest(allRequest(), fetchFn as unknown as typeof fetch);
      expect(fetchFn.mock.calls.map((call) => (call as unknown[])[0])).toEqual(Object.keys(lists));
      expect(response.headers.get('Cache-Control')).toBe(SATELLITES_CACHE_CONTROL);
      const body: GpRecord[] = await response.json();
      expect(body.map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'VISUAL-1', 'NEW-1', 'QIANFAN-128']);
      expect(body[2]).not.toHaveProperty('EXTRA');
    });

    it('stops at the first failed list and returns what it has with the 2 h cache', async () => {
      const fetchFn = vi.fn(async (url: string) => (
        url === gpUrl('visual') ? new Response('blocked', { status: 403 }) : new Response(JSON.stringify(lists[url]), { status: 200 })
      ));
      const response = await handleSatellitesRequest(allRequest(), fetchFn as unknown as typeof fetch);
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(response.headers.get('Cache-Control')).toBe(SATELLITES_ERROR_CACHE_CONTROL);
      expect((await response.json()).map((r: GpRecord) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)']);
    });

    it('gives an empty list with the 2 h cache when the first list fails', async () => {
      const fetchFn = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
      const response = await handleSatellitesRequest(allRequest(), fetchFn as unknown as typeof fetch);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(response.headers.get('Cache-Control')).toBe(SATELLITES_ERROR_CACHE_CONTROL);
      expect(await response.json()).toEqual([]);
    });

    it.each([
      ['a 403', async () => new Response('blocked', { status: 403 }), 'HTTP 403 for stations'],
      ['a network error', async () => { throw new TypeError('Failed to fetch'); }, 'TypeError for stations'],
      ['a timeout', async () => { throw new DOMException('timed out', 'TimeoutError'); }, 'TimeoutError for stations'],
    ])('names the failed list and the reason (%s) in X-Celestrak-Status, and logs it (item 183)', async (_name, fail, reason) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const response = await handleSatellitesRequest(allRequest(), vi.fn(fail) as unknown as typeof fetch);
      expect(response.headers.get(CELESTRAK_STATUS_HEADER)).toBe(reason);
      expect(log).toHaveBeenCalledWith(`CelesTrak: ${reason}`);
      log.mockRestore();
    });

    it('sends no X-Celestrak-Status after a full run', async () => {
      const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify(lists[url]), { status: 200 }));
      const response = await handleSatellitesRequest(allRequest(), fetchFn as unknown as typeof fetch);
      expect(response.headers.get(CELESTRAK_STATUS_HEADER)).toBeNull();
    });
  });

  it('answers 405 to another method', async () => {
    const fetchFn = vi.fn();
    expect((await handleSatellitesRequest(request('POST'), fetchFn as unknown as typeof fetch)).status).toBe(405);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
