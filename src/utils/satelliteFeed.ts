// The night catalogue's proxy logic (ROADMAP item 160). Pure and host-neutral, as planeFeed:
// the Vercel Edge function `api/satellites.ts` wraps handleSatellitesRequest, and a Cloudflare
// Pages Function can wrap it later (item 16). No `@/` imports: the Edge bundle resolves only
// relative paths.
import { SATELLITE_GROUPS, dedupeRecords, gpUrl, isRecord, trim, type GpRecord } from './satelliteData';
import { UPSTREAM_USER_AGENT, json } from './planeFeed';

// CelesTrak's `active` group: all working satellites (16,000, 7 MB), too much for a phone each day.
export const CELESTRAK_ACTIVE = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';
export const UPSTREAM_TIMEOUT_MS = 20_000;
// One fetch a day per edge cache; the edge serves the old answer while it fetches the next one.
export const SATELLITES_CACHE_CONTROL = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400';
// CelesTrak blocks a client that repeats a request after an error, so a failure is an empty
// list that the edge also keeps, for 2 h (satelliteData's RETRY_MS).
export const SATELLITES_ERROR_CACHE_CONTROL = 'public, max-age=0, s-maxage=7200';

const MU_KM3_S2 = 398600.4418;
const EARTH_RADIUS_KM = 6378.137;
// The orbits that stay in sunlight deep into the night (at 700 km a satellite overhead is lit
// until the sun is at -26°, at 2000 km until -40°), and near enough to see (the navigation and
// GEO satellites, at 20,000 km and more, are fainter than magnitude 10).
export const NIGHT_ORBIT_KM: [number, number] = [700, 2000];

// The perigee and apogee height (km) from the mean motion (revolutions per day) and the eccentricity.
export const orbitHeightsKm = (record: GpRecord): [number, number] => {
  const n = (Number(record.MEAN_MOTION) * 2 * Math.PI) / 86400;
  const a = Math.cbrt(MU_KM3_S2 / n ** 2);
  const e = Number(record.ECCENTRICITY);
  return [a * (1 - e) - EARTH_RADIUS_KM, a * (1 + e) - EARTH_RADIUS_KM];
};

// A satellite of the night catalogue: its whole orbit in NIGHT_ORBIT_KM. Not Starlink (too low)
// or OneWeb (too faint): the 'small' class of getSatelliteSize.
export const isNightSatellite = (record: GpRecord): boolean => {
  if (/^(STARLINK|ONEWEB)/.test(record.OBJECT_NAME)) return false;
  const [perigee, apogee] = orbitHeightsKm(record);
  return perigee >= NIGHT_ORBIT_KM[0] && apogee <= NIGHT_ORBIT_KM[1];
};

// One CelesTrak list, or null on anything but a 200 with a list (CelesTrak asks clients to stop
// after an error).
const fetchList = async (url: string, fetchFn: typeof fetch, timeoutMs: number): Promise<unknown[] | null> => {
  try {
    const response = await fetchFn(url, {
      headers: { Accept: 'application/json', 'User-Agent': UPSTREAM_USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data: unknown = response.status === 200 ? await response.json() : null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
};

// Item 177: `?all=1` is the fallback of the app's direct CelesTrak groups: the three groups
// (the ISS first), then the night catalogue, in sequence. The first failed list stops the run:
// the answer holds what came so far, with the error cache (2 h). A full run has the daily cache.
const handleAllRequest = async (fetchFn: typeof fetch, timeoutMs: number): Promise<Response> => {
  const records: GpRecord[] = [];
  const urls = [...SATELLITE_GROUPS.map(gpUrl), CELESTRAK_ACTIVE];
  for (const [index, url] of urls.entries()) {
    const data = await fetchList(url, fetchFn, timeoutMs);
    if (!data) return json(200, dedupeRecords(records), SATELLITES_ERROR_CACHE_CONTROL);
    const list = data.filter(isRecord);
    records.push(...(index === urls.length - 1 ? list.filter(isNightSatellite) : list).map(trim));
  }
  return json(200, dedupeRecords(records), SATELLITES_CACHE_CONTROL);
};

// GET /api/satellites → the night catalogue as OMM records (about 1,000, 360 kB). With `all=1`
// the groups and the night catalogue in one list (item 177). 405 for another method; an empty
// list when CelesTrak fails or does not answer in time.
export const handleSatellitesRequest = async (
  request: Request, fetchFn: typeof fetch = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS,
): Promise<Response> => {
  if (request.method !== 'GET') return json(405, null, 'no-store');
  if (new URL(request.url).searchParams.get('all') === '1') return handleAllRequest(fetchFn, timeoutMs);
  const data = await fetchList(CELESTRAK_ACTIVE, fetchFn, timeoutMs);
  if (!data) return json(200, [], SATELLITES_ERROR_CACHE_CONTROL);
  return json(200, data.filter(isRecord).filter(isNightSatellite).map(trim), SATELLITES_CACHE_CONTROL);
};
