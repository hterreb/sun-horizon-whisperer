import fixture from './fixtures/iss-omm-2026-10-05.json';
import {
  REFRESH_MS,
  RETRY_MS,
  SATELLITE_CACHE_KEY,
  SATELLITE_GROUPS,
  dedupeRecords,
  gpUrl,
  loadSatelliteData,
  type GpRecord,
} from '../src/utils/satelliteData';

const iss = { ...(fixture.omm as unknown as GpRecord), EXTRA_FIELD: 'x' } as GpRecord;
// A module docked to the ISS has the station's orbit, under its own id.
const poisk: GpRecord = { ...iss, OBJECT_NAME: 'POISK', NORAD_CAT_ID: 36086 };
const other: GpRecord = { ...iss, OBJECT_NAME: 'OTHER', NORAD_CAT_ID: 1, MEAN_ANOMALY: 10 };

const response = (status: number, body: unknown) => ({ status, json: async () => body }) as Response;
const NOW = Date.parse('2026-10-06T08:00:00Z');

describe('satelliteData (ROADMAP item 97)', () => {
  beforeEach(() => localStorage.clear());

  it('asks CelesTrak for the GP data of each group as OMM JSON', () => {
    expect(SATELLITE_GROUPS).toEqual(['stations', 'visual', 'last-30-days']);
    expect(gpUrl('visual')).toBe('https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json');
  });

  it('keeps one record per orbit and per id', () => {
    expect(dedupeRecords([iss, poisk, other, other]).map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'OTHER']);
  });

  it('fetches the three groups once, then serves the cache for a day', async () => {
    const fetchImpl = vi.fn(async () => response(200, [iss, poisk, other]));
    const first = await loadSatelliteData(NOW, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(first?.map((r) => r.OBJECT_NAME)).toEqual(['ISS (ZARYA)', 'OTHER']);
    // Only the fields SGP4 and the card need are cached.
    expect(first?.[0]).not.toHaveProperty('EXTRA_FIELD');

    await loadSatelliteData(NOW + REFRESH_MS - 1, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await loadSatelliteData(NOW + REFRESH_MS, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it('stops at the first error and waits 2 h before the next try, keeping the old data', async () => {
    await loadSatelliteData(NOW, vi.fn(async () => response(200, [iss])));
    const later = NOW + REFRESH_MS;
    const blocked = vi.fn(async () => response(403, 'blocked'));
    expect((await loadSatelliteData(later, blocked))?.[0].OBJECT_NAME).toBe('ISS (ZARYA)');
    expect(blocked).toHaveBeenCalledTimes(1);
    await loadSatelliteData(later + RETRY_MS - 1, blocked);
    expect(blocked).toHaveBeenCalledTimes(1);
    await loadSatelliteData(later + RETRY_MS, blocked);
    expect(blocked).toHaveBeenCalledTimes(2);
  });

  it('returns null without any data, also after a network error', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await loadSatelliteData(NOW, offline)).toBeNull();
    expect(await loadSatelliteData(NOW + 1000, offline)).toBeNull();
    expect(offline).toHaveBeenCalledTimes(1);
  });

  it('does not keep a cache from the future fresh (clock set back)', async () => {
    await loadSatelliteData(NOW, vi.fn(async () => response(200, [iss])));
    const fetchImpl = vi.fn(async () => response(200, [other]));
    expect((await loadSatelliteData(NOW - 3 * RETRY_MS, fetchImpl))?.[0].OBJECT_NAME).toBe('OTHER');
  });

  it('ignores a broken cache entry', async () => {
    localStorage.setItem(SATELLITE_CACHE_KEY, '{broken');
    const fetchImpl = vi.fn(async () => response(200, [iss]));
    expect(await loadSatelliteData(NOW, fetchImpl)).toHaveLength(1);
  });
});
