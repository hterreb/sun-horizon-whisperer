// The live flight radar's proxy logic (ROADMAP item 96, Premium). Pure and host-neutral: the
// Vercel Edge function `api/planes.ts` wraps handlePlanesRequest, and a Cloudflare Pages
// Function can wrap it later (item 16). No `@/` imports: the Edge bundle resolves only
// relative paths.

// The upstream: adsb.lol (ODbL, attribution "Data: adsb.lol"). The radius is in nautical
// miles: 54 nm = 100 km.
export const ADSB_LOL_POINT = 'https://api.adsb.lol/v2/point';
// adsb.lol answers 403 "User-Agent too generic; include valid contact info" without one
// (checked 2026-10-06). The privacy page has the contact.
export const UPSTREAM_USER_AGENT = 'SunChaser/2.0 (+https://sun-chaser.vercel.app/privacy)';
export const RADAR_RADIUS_NM = 54;
export const UPSTREAM_TIMEOUT_MS = 6000;
// The edge cache holds one answer per 0.1° cell for 15 s (one poll), and may serve it 15 s
// more while it fetches a new one. The client dead-reckons from the data's own time (`now`),
// so a stale answer still lands in the right place.
export const PLANES_CACHE_CONTROL = 'public, max-age=0, s-maxage=15, stale-while-revalidate=15';

const FEET_TO_M = 0.3048;

// The place rounded to 0.1° (about 11 km): the most precise place that leaves the device.
export const roundPlace = (latitude: number, longitude: number): { lat: number; lon: number } => {
  const lat = Math.round(Math.min(90, Math.max(-90, latitude)) * 10) / 10;
  // Longitude wraps to -180..180 (180 and -180 are the same meridian).
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  const lon = Math.round(wrapped * 10) / 10;
  return { lat: lat === 0 ? 0 : lat, lon: lon === 0 || lon === -180 ? Math.abs(lon) : lon };
};

// The query `?lat=47.8&lon=9.6`: two plain decimal numbers, nothing else. Clamped and rounded
// to 0.1°; null for anything that is not a number.
const NUMBER = /^-?\d{1,3}(\.\d{1,8})?$/;
export const parsePlaceQuery = (params: URLSearchParams): { lat: number; lon: number } | null => {
  const lat = params.get('lat');
  const lon = params.get('lon');
  if (lat === null || lon === null || !NUMBER.test(lat) || !NUMBER.test(lon)) return null;
  return roundPlace(Number(lat), Number(lon));
};

// One aircraft as the app uses it.
export interface LiveAircraft {
  hex: string; // ICAO 24-bit address: the stable id
  callsign: string | null;
  type: string | null; // ICAO type code, e.g. "A320"
  altM: number; // above mean sea level (geometric when known, else barometric)
  speedKt: number; // ground speed
  track: number; // degrees, 0 = north
  lat: number;
  lon: number;
  ageSec: number; // how old the position was at the data time
}
export interface LiveFeed {
  now: number; // the data time, ms since the epoch
  aircraft: LiveAircraft[];
}

type Raw = Record<string, unknown>;
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && /^[A-Za-z0-9-]{1,10}$/.test(trimmed) ? trimmed.toUpperCase() : null;
};

// Only the fields we use, and only aircraft in the air with a position. Aircraft on the
// ground (`alt_baro: "ground"`) and without an altitude are left out.
export const mapAircraft = (raw: Raw): LiveAircraft | null => {
  const hex = typeof raw.hex === 'string' && /^~?[0-9a-f]{6}$/i.test(raw.hex) ? raw.hex.toLowerCase() : null;
  const lat = num(raw.lat);
  const lon = num(raw.lon);
  const altFt = num(raw.alt_geom) ?? num(raw.alt_baro);
  if (!hex || lat === null || lon === null || altFt === null || altFt <= 0) return null;
  return {
    hex,
    callsign: text(raw.flight),
    type: text(raw.t),
    altM: Math.round(altFt * FEET_TO_M),
    speedKt: num(raw.gs) ?? 0,
    track: num(raw.track) ?? num(raw.true_heading) ?? 0,
    lat,
    lon,
    ageSec: num(raw.seen_pos) ?? num(raw.seen) ?? 0,
  };
};

export const mapFeed = (body: unknown, fallbackNow: number): LiveFeed => {
  const data = (body && typeof body === 'object' ? body : {}) as Raw;
  const list = Array.isArray(data.ac) ? data.ac : [];
  return {
    now: num(data.now) ?? fallbackNow,
    aircraft: list.flatMap(item => {
      const mapped = item && typeof item === 'object' ? mapAircraft(item as Raw) : null;
      return mapped ? [mapped] : [];
    }),
  };
};

const json = (status: number, body: unknown, cacheControl: string): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
  });

// GET /api/planes?lat=..&lon=.. → { now, aircraft } from adsb.lol. 400 for a bad place, 405
// for another method, 502 (no body) when adsb.lol fails or does not answer in time.
export const handlePlanesRequest = async (
  request: Request, fetchFn: typeof fetch = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS,
): Promise<Response> => {
  if (request.method !== 'GET') return json(405, null, 'no-store');
  const place = parsePlaceQuery(new URL(request.url).searchParams);
  if (!place) return json(400, null, 'no-store');
  const upstream = `${ADSB_LOL_POINT}/${place.lat.toFixed(1)}/${place.lon.toFixed(1)}/${RADAR_RADIUS_NM}`;
  try {
    const response = await fetchFn(upstream, {
      headers: { Accept: 'application/json', 'User-Agent': UPSTREAM_USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return json(502, null, 'no-store');
    return json(200, mapFeed(await response.json(), Date.now()), PLANES_CACHE_CONTROL);
  } catch {
    return json(502, null, 'no-store');
  }
};
