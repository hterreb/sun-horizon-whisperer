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
// Item 177: a firewall block gives no answer, so a direct group fetch needs a timeout; a failed
// server try waits less than CelesTrak (our server is not the one that blocks).
export const DIRECT_TIMEOUT_MS = 8_000;
export const SERVER_TIMEOUT_MS = 30_000;
export const SERVER_RETRY_MS = 15 * 60 * 1000;
// Data older than this at the real time is not used. Same value as satelliteUtils' MAX_EPOCH_AGE_MS
// (not imported: satelliteFeed's Edge bundle takes only this file).
const MAX_EPOCH_AGE_MS = 3 * 24 * 60 * 60 * 1000;

interface SatelliteCache {
  fetchedAt: number; // the last full fetch, 0 when there was none
  triedAt: number; // the last try, also a failed one
  records: GpRecord[];
  serverTriedAt?: number; // item 177: the last failed try of our server (absent in older caches)
}

// The night catalogue (ROADMAP item 160): the satellites of CelesTrak's `active` group (16,000,
// 7 MB) in a 700-2000 km orbit, which stay in sunlight deep into the night. Our server
// (api/satellites.ts, satelliteFeed) filters the group once a day.
export const NIGHT_CATALOGUE_URL = '/api/satellites';
// Item 177: the three groups and the night catalogue in one list, the fallback of the direct groups.
export const ALL_GROUPS_URL = '/api/satellites?all=1';

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

// Item 177: the cached data can be used when its first record (the ISS) is near the real time:
// the same rule as isNearEpoch in the tracking hook.
const isUsable = (records: GpRecord[], now: number): boolean => {
  if (records.length === 0) return false;
  const epochMs = Date.parse(`${records[0].EPOCH}Z`);
  return Number.isFinite(epochMs) && Math.abs(now - epochMs) <= MAX_EPOCH_AGE_MS;
};

// When our server can be asked again after a failed try; null when it can be asked now.
const serverNextTryAt = (cache: SatelliteCache, now: number): number | null => {
  const tried = cache.serverTriedAt ?? 0;
  return tried <= now && now - tried < SERVER_RETRY_MS ? tried + SERVER_RETRY_MS : null;
};

// Item 164 (R-a): the time from which a refresh can load something new ("Next try at 21:40");
// null when it can at once. Item 177: while CelesTrak waits, a refresh asks our server, so with
// data that cannot be used the time is the earlier end of the two waits.
export const getNextSatelliteTry = (now: number = Date.now()): number | null => {
  const cache = readCache();
  const direct = cache && nextTryAt(cache, now);
  if (!cache || direct === null) return null;
  if (isUsable(cache.records, now)) return direct;
  const server = serverNextTryAt(cache, now);
  return server === null ? null : Math.min(direct, server);
};

// The three groups from CelesTrak, or null when one fails (no 200, no list, a network error or
// a timeout).
const fetchDirect = async (fetchImpl: typeof fetch): Promise<GpRecord[] | null> => {
  const records: GpRecord[] = [];
  for (const group of SATELLITE_GROUPS) {
    try {
      const response = await fetchImpl(gpUrl(group), { signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS) });
      // Only a 200 counts; CelesTrak asks clients to stop on anything else.
      const data: unknown = response.status === 200 ? await response.json() : null;
      if (!Array.isArray(data)) return null;
      records.push(...data.filter(isRecord).map(trim));
    } catch {
      return null;
    }
  }
  return records;
};

// Item 177: the groups and the night catalogue from our server, or null.
const fetchFromServer = async (fetchImpl: typeof fetch): Promise<GpRecord[] | null> => {
  try {
    const response = await fetchImpl(ALL_GROUPS_URL, { signal: AbortSignal.timeout(SERVER_TIMEOUT_MS) });
    const data: unknown = response.status === 200 ? await response.json() : null;
    const records = Array.isArray(data) ? dedupeRecords(data.filter(isRecord).map(trim)) : [];
    return records.length > 0 ? records : null;
  } catch {
    return null;
  }
};

// The cached records when they are fresh or a CelesTrak try is not due yet; else one fetch per
// group, then the night catalogue. When a group fails, or while the wait holds and the cached
// data is too old or missing, our server gives the list (item 177). A failed group keeps the
// cached records and waits RETRY_MS, a failed server try SERVER_RETRY_MS. Null when there are
// no records at all.
export const loadSatelliteData = async (
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<GpRecord[] | null> => {
  const cache = readCache();
  const cached = cache?.records ?? [];
  const keep = (): GpRecord[] | null => (cached.length > 0 ? cached : null);
  const directDue = !cache || nextTryAt(cache, now) === null;
  if (!directDue && isUsable(cached, now)) return keep();

  if (directDue) {
    const direct = await fetchDirect(fetchImpl);
    if (direct) {
      // After the groups, so the ISS stays the first record (useSatelliteTracking's epoch check).
      direct.push(...(await fetchNightCatalogue(fetchImpl)));
      const deduped = dedupeRecords(direct);
      writeCache({ fetchedAt: now, triedAt: now, records: deduped });
      return deduped.length > 0 ? deduped : null;
    }
  }

  // The server: after a failed direct try, or while the direct wait holds with unusable data.
  const base: SatelliteCache = {
    fetchedAt: cache?.fetchedAt ?? 0,
    triedAt: directDue ? now : cache?.triedAt ?? 0,
    records: cached,
    serverTriedAt: cache?.serverTriedAt,
  };
  if (cache && serverNextTryAt(cache, now) !== null) {
    writeCache(base);
    return keep();
  }
  const fromServer = await fetchFromServer(fetchImpl);
  if (fromServer && isUsable(fromServer, now)) {
    // The server's list is a full daily list, so it counts as a fetch: CelesTrak is asked again
    // after REFRESH_MS, not after RETRY_MS. A blocked IP then asks CelesTrak once a day, not 12 times.
    writeCache({ ...base, fetchedAt: now, records: fromServer, serverTriedAt: undefined });
    return fromServer;
  }
  writeCache({ ...base, serverTriedAt: now });
  return keep();
};
