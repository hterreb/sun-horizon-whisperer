import fixture from './fixtures/iss-omm-2026-10-05.json';
import {
  CELESTRAK_ACTIVE,
  SATELLITES_CACHE_CONTROL,
  SATELLITES_ERROR_CACHE_CONTROL,
  handleSatellitesRequest,
  isNightSatellite,
  orbitHeightsKm,
} from '../src/utils/satelliteFeed';
import { type GpRecord } from '../src/utils/satelliteData';

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

  it('fetches the active group and returns the night satellites, trimmed, cached for a day', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify([iss, { ...qianfan, EXTRA: 1 }, starlink, 'junk']), { status: 200 }));
    const response = await handleSatellitesRequest(request(), fetchFn as unknown as typeof fetch);
    expect((fetchFn.mock.calls[0] as unknown[])[0]).toBe(CELESTRAK_ACTIVE);
    expect(response.headers.get('Cache-Control')).toBe(SATELLITES_CACHE_CONTROL);
    const body = await response.json();
    expect(body.map((r: GpRecord) => r.OBJECT_NAME)).toEqual(['QIANFAN-128']);
    expect(body[0]).not.toHaveProperty('EXTRA');
  });

  it('answers an empty list, kept 2 h at the edge, when CelesTrak refuses or fails', async () => {
    for (const fetchFn of [
      vi.fn(async () => new Response('blocked', { status: 403 })),
      vi.fn(async () => { throw new TypeError('Failed to fetch'); }),
    ]) {
      const response = await handleSatellitesRequest(request(), fetchFn as unknown as typeof fetch);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe(SATELLITES_ERROR_CACHE_CONTROL);
      expect(await response.json()).toEqual([]);
    }
  });

  it('answers 405 to another method', async () => {
    const fetchFn = vi.fn();
    expect((await handleSatellitesRequest(request('POST'), fetchFn as unknown as typeof fetch)).status).toBe(405);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
