// Satellite tracking data (ROADMAP item 97): the CelesTrak GP data (orbits as OMM JSON) of
// three groups, fetched at most once a day and cached in localStorage, as the weather.
// CelesTrak updates the data every 2 h and blocks clients that fetch the same data more
// often, or that repeat a request after an error (an HTTP 403 or 404 does not change on a
// repeat). So a failed fetch waits RETRY_MS before the next try. The data is global: the
// request sends no place. Item 160 adds the night catalogue from our own server.

// The OMM fields that satellite.js (json2satrec) and the card need. CelesTrak sends more.
export interface GpRecord {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
}

const FIELDS: (keyof GpRecord)[] = [
  'OBJECT_NAME', 'OBJECT_ID', 'EPOCH', 'MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION', 'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER', 'MEAN_ANOMALY', 'NORAD_CAT_ID', 'ELEMENT_SET_NO', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT',
];

// `stations`: the ISS and Tiangong; `visual`: about 150 bright satellites; `last-30-days`:
// the launches of the last 30 days (a fresh Starlink train).
export const SATELLITE_GROUPS = ['stations', 'visual', 'last-30-days'] as const;
export const gpUrl = (group: string): string =>
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;

export const SATELLITE_CACHE_KEY = 'satellite-gp';
export const REFRESH_MS = 24 * 60 * 60 * 1000;
export const RETRY_MS = 2 * 60 * 60 * 1000;

interface SatelliteCache {
  fetchedAt: number; // the last full fetch, 0 when there was none
  triedAt: number; // the last try, also a failed one
  records: GpRecord[];
}

// The night catalogue (ROADMAP item 160): the satellites of CelesTrak's `active` group (16,000,
// 7 MB) in a 700-2000 km orbit, which stay in sunlight deep into the night. Our server
// (api/satellites.ts, satelliteFeed) filters the group once a day.
export const NIGHT_CATALOGUE_URL = '/api/satellites';

// Exported for satelliteFeed (the Edge function).
export const isRecord = (value: unknown): value is GpRecord =>
  typeof value === 'object' && value !== null &&
  typeof (value as GpRecord).OBJECT_NAME === 'string' && typeof (value as GpRecord).EPOCH === 'string' &&
  Number.isFinite(Number((value as GpRecord).NORAD_CAT_ID)) && Number.isFinite(Number((value as GpRecord).MEAN_MOTION));

export const trim = (record: GpRecord): GpRecord =>
  Object.fromEntries(FIELDS.map((field) => [field, record[field]])) as unknown as GpRecord;

// One record per satellite. The modules docked to a station (POISK, NAUKA at the ISS) have
// the station's orbit: the first record of the orbit stays (the group lists the station first).
export const dedupeRecords = (records: GpRecord[]): GpRecord[] => {
  const seenIds = new Set<number>();
  const seenOrbits = new Set<string>();
  return records.filter((record) => {
    const id = Number(record.NORAD_CAT_ID);
    const orbit = `${record.EPOCH}|${record.MEAN_MOTION}|${record.MEAN_ANOMALY}|${record.RA_OF_ASC_NODE}`;
    if (seenIds.has(id) || seenOrbits.has(orbit)) return false;
    seenIds.add(id);
    seenOrbits.add(orbit);
    return true;
  });
};

// The last cache of this page, for a browser that blocks localStorage: the wait after a failed
// try still holds, also for the refresh button (item 164).
let pageCache: SatelliteCache | null = null;

const readCache = (): SatelliteCache | null => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SATELLITE_CACHE_KEY);
  } catch {
    return pageCache;
  }
  try {
    if (!raw) return null;
    const cache = JSON.parse(raw) as SatelliteCache;
    return Array.isArray(cache.records) && Number.isFinite(cache.triedAt) ? cache : null;
  } catch {
    return null;
  }
};

const writeCache = (cache: SatelliteCache): void => {
  pageCache = cache;
  try {
    localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching satellite data:', error);
  }
};

// The night catalogue, or none when our server or CelesTrak fails.
// ponytail: a failed night catalogue stays out until the next daily fetch; give it its own
// retry if a day without it matters.
const fetchNightCatalogue = async (fetchImpl: typeof fetch): Promise<GpRecord[]> => {
  try {
    const response = await fetchImpl(NIGHT_CATALOGUE_URL);
    const data: unknown = response.status === 200 ? await response.json() : null;
    return Array.isArray(data) ? data.filter(isRecord).map(trim) : [];
  } catch {
    return [];
  }
};

// When loadSatelliteData asks CelesTrak again: REFRESH_MS after the last full fetch, and not
// before RETRY_MS after the last try. Null when a fetch is due now. A future time in the cache
// (device clock set back) does not delay it.
const nextTryAt = (cache: SatelliteCache, now: number): number | null => {
  const fresh = cache.fetchedAt <= now && now - cache.fetchedAt < REFRESH_MS;
  const waiting = cache.triedAt <= now && now - cache.triedAt < RETRY_MS;
  if (!fresh && !waiting) return null;
  return Math.max(fresh ? cache.fetchedAt + REFRESH_MS : 0, waiting ? cache.triedAt + RETRY_MS : 0);
};

// Item 164 (R-a): the time of the next CelesTrak try, for the refresh button ("Next try at
// 21:40"); null when a refresh fetches at once.
export const getNextSatelliteTry = (now: number = Date.now()): number | null => {
  const cache = readCache();
  return cache && nextTryAt(cache, now);
};

// The cached records when they are fresh or a try is not due yet; else one fetch per group,
// then the night catalogue. A failed group keeps the cached records and waits RETRY_MS. Null
// when there are no records at all.
export const loadSatelliteData = async (
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<GpRecord[] | null> => {
  const cache = readCache();
  if (cache && nextTryAt(cache, now) !== null) return cache.records.length > 0 ? cache.records : null;

  const records: GpRecord[] = [];
  let failed = false;
  for (const group of SATELLITE_GROUPS) {
    try {
      const response = await fetchImpl(gpUrl(group));
      // Only a 200 counts; CelesTrak asks clients to stop on anything else.
      if (response.status !== 200) {
        failed = true;
        break;
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        failed = true;
        break;
      }
      records.push(...data.filter(isRecord).map(trim));
    } catch {
      failed = true;
      break;
    }
  }
  if (failed) {
    const kept = cache?.records ?? [];
    writeCache({ fetchedAt: cache?.fetchedAt ?? 0, triedAt: now, records: kept });
    return kept.length > 0 ? kept : null;
  }
  // After the groups, so the ISS stays the first record (useSatelliteTracking's epoch check).
  records.push(...(await fetchNightCatalogue(fetchImpl)));
  const deduped = dedupeRecords(records);
  writeCache({ fetchedAt: now, triedAt: now, records: deduped });
  return deduped.length > 0 ? deduped : null;
};
