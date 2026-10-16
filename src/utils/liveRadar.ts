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

// Item 159 (S1 of the plane lookbook): the normal view's pick is sticky. A shown plane stays
// while it is visible, in view and moves at least this fast (a new one needs
// MIN_SCREEN_SPEED_PX_S), so a speed near 1 px/s does not swap it in and out.
export const STICKY_SCREEN_SPEED_PX_S = 0.6;
// A new plane takes the place of the farthest shown one only at this share of its slant
// distance or nearer (25 % nearer).
export const SWAP_NEARER_RATIO = 0.75;

// From the visible aircraft, nearest first (pickNearestVisible) and with their place on the
// screen: the ones to show. A plane that fails a rule leaves its place to the next nearest.
// `shownBefore`: the hex codes the last update showed (the normal view keeps them, item 159).
export const pickShownPlanes = <T extends { ac: Pick<LiveAircraft, 'hex'>; slantM: number; inView: boolean; screenSpeedPxS: number }>(
  nearestVisible: T[], compass: boolean, shownBefore: ReadonlySet<string> = new Set(),
): T[] => {
  if (compass) return nearestVisible.filter(item => item.inView).slice(0, MAX_COMPASS_PLANES);
  // At most MAX_NORMAL_PLANES also after the compass view, which shows more.
  let keep = nearestVisible
    .filter(item => shownBefore.has(item.ac.hex) && item.inView && item.screenSpeedPxS >= STICKY_SCREEN_SPEED_PX_S)
    .slice(0, MAX_NORMAL_PLANES);
  for (const item of nearestVisible) {
    if (keep.includes(item) || !item.inView || item.screenSpeedPxS < MIN_SCREEN_SPEED_PX_S) continue;
    if (keep.length < MAX_NORMAL_PLANES) {
      keep.push(item);
      continue;
    }
    const farthest = keep.reduce((a, b) => (b.slantM > a.slantM ? b : a));
    if (item.slantM <= SWAP_NEARER_RATIO * farthest.slantM) keep = [...keep.filter(k => k !== farthest), item];
  }
  return nearestVisible.filter(item => keep.includes(item));
};

// The feed's state (item 155): before the first answer, after an answer, after a failed request.
export type LiveStatus = 'loading' | 'ok' | 'error';

// The Sentry tag `live-planes` (item 155): `off` (no status: the radar does not run), `loading`,
// `error`, or `ok-<shown>/<nearby>` (the planes drawn / the aircraft in the last answer).
export const getLivePlanesTag = (status: LiveStatus | null, shown: number, nearby: number): string =>
  status === 'ok' ? `ok-${shown}/${nearby}` : status ?? 'off';

// The contrail rule of the free part, for each aircraft above 8 km.
export const getLiveContrail = (altM: number, forecast: ContrailKind): ContrailKind =>
  altM > CONTRAIL_MIN_ALT_M ? forecast : 'none';

// Item 159 (Z3 of the plane lookbook): the silhouette's scale (× PLANE_WIDTH_PX, 18 px) by the
// slant distance, near true perspective: (25 km / slant)^0.8, from 0.4 (7 px, 79 km or farther)
// to 1.8 (32 px, 12 km or nearer). A plane grows while it comes nearer and gets smaller while it
// flies away (a pass at 17 km: about 8 px → 24 px → 8 px).
export const PLANE_SCALE_REF_M = 25_000;
export const PLANE_SCALE_EXP = 0.8;
export const PLANE_SCALE_MIN = 0.4;
export const PLANE_SCALE_MAX = 1.8;
export const getLivePlaneScale = (slantM: number): number =>
  Math.min(PLANE_SCALE_MAX, Math.max(PLANE_SCALE_MIN, (PLANE_SCALE_REF_M / slantM) ** PLANE_SCALE_EXP));

// The drawn scale follows getLivePlaneScale with this time constant (s), so a new answer that
// moves the plane does not change its size in one step.
export const PLANE_SCALE_SMOOTH_SEC = 1;
export const smoothPlaneScale = (scale: number, target: number, dtSec: number): number =>
  scale + (target - scale) * (1 - Math.exp(-Math.max(0, dtSec) / PLANE_SCALE_SMOOTH_SEC));

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
