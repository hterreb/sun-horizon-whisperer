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

// The route of a callsign (item 111). adsb.lol's POST /api/0/routeset answers 201 with an
// empty body (checked 2026-10-07), and its GET /api/0/route/<callsign> redirects here: the
// static route data, one JSON file per callsign under its first two letters, 404 when unknown.
// Only the callsign goes to adsb.lol, not the place.
export const ADSB_LOL_ROUTES = 'https://vrs-standing-data.adsb.lol/routes';
// Routes change rarely: one hour at the edge and in the browser.
export const ROUTE_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';
// A callsign as the feed gives it (mapAircraft): upper-case letters and digits, at most 8.
// It becomes part of the upstream URL, so nothing else passes.
const CALLSIGN = /^[A-Z0-9]{3,8}$/;
// The route is plausible when the place is near the straight path between the two airports:
// the detour through the place is at most 20 % of the leg plus 250 km (the planes are up to
// 100 km from the place, and they climb, turn and hold near the airports).
const ROUTE_DETOUR_FACTOR = 0.2;
const ROUTE_DETOUR_KM = 250;
const EARTH_RADIUS_KM = 6371;

export interface RouteAirport {
  code: string; // IATA, else ICAO
  name: string | null; // the place, e.g. "Frankfurt am Main"
}
export interface LiveRoute {
  from: RouteAirport;
  to: RouteAirport;
  km: number; // item 120: the great-circle length of the leg, for the plane's badge
}

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

interface Airport extends RouteAirport { lat: number; lon: number }
const mapAirport = (raw: unknown): Airport | null => {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Raw;
  const code = [a.iata, a.icao].find((c): c is string => typeof c === 'string' && /^[A-Z0-9]{3,4}$/.test(c));
  const lat = num(a.lat);
  const lon = num(a.lon);
  if (!code || lat === null || lon === null) return null;
  const name = typeof a.location === 'string' && a.location.trim() ? a.location.trim().slice(0, 40) : null;
  return { code, name, lat, lon };
};

// The leg (two airports in a row; a route can have stops) whose path passes nearest the place,
// or null when no leg passes near it or the data has another shape.
export const mapRoute = (body: unknown, place: { lat: number; lon: number }): LiveRoute | null => {
  const data = (body && typeof body === 'object' ? body : {}) as Raw;
  const airports = Array.isArray(data._airports) ? data._airports.map(mapAirport) : [];
  let best: { from: Airport; to: Airport; detour: number; leg: number } | null = null;
  for (let i = 0; i + 1 < airports.length; i++) {
    const from = airports[i];
    const to = airports[i + 1];
    if (!from || !to) continue;
    const leg = distanceKm(from.lat, from.lon, to.lat, to.lon);
    const detour = distanceKm(from.lat, from.lon, place.lat, place.lon) + distanceKm(place.lat, place.lon, to.lat, to.lon) - leg;
    if (detour <= leg * ROUTE_DETOUR_FACTOR + ROUTE_DETOUR_KM && (!best || detour < best.detour)) best = { from, to, detour, leg };
  }
  return best && { from: { code: best.from.code, name: best.from.name }, to: { code: best.to.code, name: best.to.name }, km: Math.round(best.leg) };
};

// GET /api/planes?route=<callsign>&lat=..&lon=.. → { route: LiveRoute | null } (null: no route
// known, or none plausible here). 400 for a bad callsign or place, 502 when adsb.lol fails.
const handleRouteRequest = async (
  callsign: string, params: URLSearchParams, fetchFn: typeof fetch, timeoutMs: number,
): Promise<Response> => {
  const place = parsePlaceQuery(params);
  if (!CALLSIGN.test(callsign) || !place) return json(400, null, 'no-store');
  try {
    const response = await fetchFn(`${ADSB_LOL_ROUTES}/${callsign.slice(0, 2)}/${callsign}.json`, {
      headers: { Accept: 'application/json', 'User-Agent': UPSTREAM_USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return json(200, { route: null }, ROUTE_CACHE_CONTROL);
    if (!response.ok) return json(502, null, 'no-store');
    return json(200, { route: mapRoute(await response.json(), place) }, ROUTE_CACHE_CONTROL);
  } catch {
    return json(502, null, 'no-store');
  }
};

// GET /api/planes?lat=..&lon=.. → { now, aircraft } from adsb.lol. 400 for a bad place, 405
// for another method, 502 (no body) when adsb.lol fails or does not answer in time. With
// `route=<callsign>`: the route of that aircraft (handleRouteRequest).
export const handlePlanesRequest = async (
  request: Request, fetchFn: typeof fetch = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS,
): Promise<Response> => {
  if (request.method !== 'GET') return json(405, null, 'no-store');
  const params = new URL(request.url).searchParams;
  const callsign = params.get('route');
  if (callsign !== null) return handleRouteRequest(callsign, params, fetchFn, timeoutMs);
  const place = parsePlaceQuery(params);
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
