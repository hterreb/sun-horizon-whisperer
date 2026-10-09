// The live flight radar (ROADMAP item 96, Premium): where each aircraft of the feed is in the
// observer's sky. Pure: dead reckoning, bearing, distance, elevation angle, the visibility
// rules and the card's airline name. No React, no DOM.

import { elevationAngleDeg, horizonAngleAt, type HorizonProfile } from './horizonUtils';
import { roundPlace, type LiveAircraft } from './planeFeed';
import { type ContrailKind } from './planes';

export const LIVE_POLL_MS = 15_000;
// A poll moves each plane toward its place this far ahead, so it keeps moving until the next
// answer comes, also when that answer is a few seconds late.
export const LIVE_LEAD_SEC = 20;
// An answer older than this is dropped (the radar shows nothing rather than old planes).
export const LIVE_MAX_AGE_MS = 60_000;
// Lower than this a plane is too near the horizon to show (item 110, SUN-CHASER-13: "don't show
// planes that are too close to the horizon"; was 1°). In both modes.
export const MIN_ELEVATION_DEG = 5;
export const CONTRAIL_MIN_ALT_M = 8000;

const EARTH_RADIUS_M = 6_371_000;
const KNOT_MS = 0.514444;
const RAD = Math.PI / 180;

// The proxy's URL for a place: rounded to 0.1° here too, so the exact place never leaves the
// device and the edge cache sees one URL per cell.
export const planeFeedUrl = (latitude: number, longitude: number): string => {
  const { lat, lon } = roundPlace(latitude, longitude);
  return `/api/planes?lat=${lat.toFixed(1)}&lon=${lon.toFixed(1)}`;
};

// The aircraft `sec` seconds after its position: on with its ground speed and track (a short
// straight line on the sphere; fine for the 20-80 s between two answers).
export const deadReckon = (ac: Pick<LiveAircraft, 'lat' | 'lon' | 'speedKt' | 'track'>, sec: number): { lat: number; lon: number } => {
  const d = (ac.speedKt * KNOT_MS * sec) / EARTH_RADIUS_M;
  const lat1 = ac.lat * RAD;
  const lon1 = ac.lon * RAD;
  const brg = ac.track * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
  const lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / RAD, lon: ((((lon2 / RAD) + 540) % 360) - 180) };
};

// The great-circle distance (m) and the initial bearing (0-360°, 0 = north) from a to b.
export const distanceAndBearing = (
  a: { lat: number; lon: number }, b: { lat: number; lon: number },
): { distanceM: number; bearing: number } => {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const dLat = lat2 - lat1;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const distanceM = 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return { distanceM, bearing: ((Math.atan2(y, x) / RAD) + 360) % 360 };
};

export interface Observer {
  lat: number;
  lon: number;
  elevationM: number; // the eye above mean sea level
}
export interface SkyView {
  azimuth: number;
  elevation: number; // degrees above the flat horizon, with the Earth's curvature and refraction
  distanceM: number;
}

// Where the aircraft is in the sky `sec` seconds after the data time (its own position age
// included).
export const getAircraftView = (observer: Observer, ac: LiveAircraft, sec: number): SkyView => {
  const at = deadReckon(ac, sec + ac.ageSec);
  const { distanceM, bearing } = distanceAndBearing(observer, at);
  const elevation = distanceM < 1 ? 90 : elevationAngleDeg(ac.altM - observer.elevationM, distanceM);
  return { azimuth: bearing, elevation, distanceM };
};

// An aircraft shows at 5° or more above the horizon and above the terrain (item 13).
export const isAircraftVisible = (view: SkyView, profile: HorizonProfile | null): boolean =>
  view.elevation >= MIN_ELEVATION_DEG && (!profile || view.elevation > horizonAngleAt(profile, view.azimuth));

// Which visible aircraft show (item 110, SUN-CHASER-13). In compass mode: every one in the field
// of view, up to a cap for the frame cost (each plane is a few elements moved 4 times per second;
// 40 is far above a normal sky within 100 km). In the normal 360° view: the 2 nearest that
// visibly move.
export const MAX_COMPASS_PLANES = 40;
export const MAX_NORMAL_PLANES = 2;
// The screen speed (px/s) under which a plane seems to hang in the air. Most real planes move
// slower than this in the 360° view (a far one about 0.2 px/s on a phone), so the normal view
// often shows none or one.
export const MIN_SCREEN_SPEED_PX_S = 1;

// The straight-line distance from the eye to the aircraft (m): along the ground and up.
export const slantDistanceM = (view: SkyView, altM: number, observerElevationM: number): number =>
  Math.hypot(view.distanceM, altM - observerElevationM);

// The aircraft that pass the visibility rules (5° or more, not behind the terrain), nearest
// first by slant distance, at most `max`.
export const pickNearestVisible = <T extends { ac: Pick<LiveAircraft, 'altM'>; view: SkyView }>(
  items: T[], observerElevationM: number, profile: HorizonProfile | null, max = Infinity,
): T[] =>
  items
    .filter(item => isAircraftVisible(item.view, profile))
    .map(item => ({ item, slant: slantDistanceM(item.view, item.ac.altM, observerElevationM) }))
    .sort((a, b) => a.slant - b.slant)
    .slice(0, max)
    .map(({ item }) => item);

// From the visible aircraft, nearest first (pickNearestVisible) and with their place on the
// screen: the ones to show. A plane that fails a rule leaves its place to the next nearest.
export const pickShownPlanes = <T extends { inView: boolean; screenSpeedPxS: number }>(
  nearestVisible: T[], compass: boolean,
): T[] =>
  compass
    ? nearestVisible.filter(item => item.inView).slice(0, MAX_COMPASS_PLANES)
    : nearestVisible.filter(item => item.inView && item.screenSpeedPxS >= MIN_SCREEN_SPEED_PX_S).slice(0, MAX_NORMAL_PLANES);

// The contrail rule of the free part, for each aircraft above 8 km.
export const getLiveContrail = (altM: number, forecast: ContrailKind): ContrailKind =>
  altM > CONTRAIL_MIN_ALT_M ? forecast : 'none';

// The silhouette's width (px) by distance: 18 px within 20 km, 11 px at 100 km.
export const getLivePlaneWidth = (distanceM: number): number =>
  Math.round(18 - 7 * Math.min(1, Math.max(0, (distanceM - 20_000) / 80_000)));

// The airlines common over Europe, by the ICAO code that starts the callsign. A small table on
// purpose: an unknown code shows no airline.
const AIRLINES: Record<string, string> = {
  AAL: 'American Airlines', ACA: 'Air Canada', AEA: 'Air Europa', AEE: 'Aegean Airlines', AFR: 'Air France',
  AUA: 'Austrian Airlines', BAW: 'British Airways', BCS: 'DHL (EAT Leipzig)', BEL: 'Brussels Airlines',
  BTI: 'airBaltic', CCA: 'Air China', CFG: 'Condor', CLH: 'Lufthansa CityLine', CPA: 'Cathay Pacific',
  CSA: 'Czech Airlines', CTN: 'Croatia Airlines', DAL: 'Delta Air Lines', DHK: 'DHL Air', DLA: 'Air Dolomiti',
  DLH: 'Lufthansa', EDW: 'Edelweiss Air', EJU: 'easyJet Europe', ELY: 'El Al', ETD: 'Etihad Airways',
  ETH: 'Ethiopian Airlines', EWG: 'Eurowings', EZS: 'easyJet Switzerland', EZY: 'easyJet', FDX: 'FedEx',
  FIN: 'Finnair', GEC: 'Lufthansa Cargo', IBE: 'Iberia', ICE: 'Icelandair', ITY: 'ITA Airways', JAF: 'TUI fly Belgium',
  KAL: 'Korean Air', KLM: 'KLM', LDM: 'Lauda Europe', LOT: 'LOT Polish Airlines', MSR: 'EgyptAir', NAX: 'Norwegian',
  NOZ: 'Norwegian', PGT: 'Pegasus Airlines', QTR: 'Qatar Airways', RAM: 'Royal Air Maroc', ROT: 'TAROM',
  RUK: 'Ryanair UK', RYR: 'Ryanair', SAS: 'SAS', SIA: 'Singapore Airlines', SVA: 'Saudia', SWR: 'Swiss',
  SXS: 'SunExpress', TAP: 'TAP Air Portugal', THY: 'Turkish Airlines', TOM: 'TUI Airways', TRA: 'Transavia',
  TUI: 'TUIfly', TVF: 'Transavia France', UAE: 'Emirates', UAL: 'United Airlines', UPS: 'UPS Airlines',
  VLG: 'Vueling', WMT: 'Wizz Air Malta', WUK: 'Wizz Air UK', WZZ: 'Wizz Air',
};
// An airline callsign is the 3-letter code and a flight number ("DLH4KL"); a registration
// ("DEIAB") or a code with no number is not.
export const getAirlineName = (callsign: string | null): string | null => {
  const match = callsign?.match(/^([A-Z]{3})\d/);
  return match ? AIRLINES[match[1]] ?? null : null;
};
export const AIRLINE_COUNT = Object.keys(AIRLINES).length;
