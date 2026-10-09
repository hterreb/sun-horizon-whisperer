// Approximate planet positions for the planet conjunction egg (ROADMAP "Easter eggs and
// special events", Sky). Pure. Keplerian elements and their rates per century from JPL,
// E. M. Standish, "Approximate Positions of the Planets", Table 1 (valid 1800-2050, error
// below 1 arcminute for Venus to Saturn): https://ssd.jpl.nasa.gov/planets/approx_pos.html
// The result is in the J2000 frame (no precession, about 0.4° by 2035): good enough to draw
// a dot and to compare two planets, which have the same frame error.

export type PlanetName = 'venus' | 'mars' | 'jupiter' | 'saturn';
export const PLANETS: readonly PlanetName[] = ['venus', 'mars', 'jupiter', 'saturn'];

export interface PlanetSky {
  name: PlanetName;
  altitude: number; // degrees
  azimuth: number; // degrees, 0 = North, 90 = East
}

type Elements = readonly [a: number, e: number, i: number, L: number, peri: number, node: number];
// [value at J2000, rate per Julian century]
const ELEMENTS: Record<PlanetName | 'earth', readonly [Elements, Elements]> = {
  venus: [
    [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  ],
  // The Earth-Moon barycentre.
  earth: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  ],
  mars: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  ],
  jupiter: [
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  ],
  saturn: [
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  ],
};

const RAD = Math.PI / 180;
const OBLIQUITY = 23.43928 * RAD;
type Vec = [number, number, number];

const julianDay = (date: Date): number => date.getTime() / 86_400_000 + 2440587.5;

// Heliocentric ecliptic position (au) of a body at `t` Julian centuries after J2000.
const heliocentric = (body: PlanetName | 'earth', t: number): Vec => {
  const [base, rate] = ELEMENTS[body];
  const [a, e, i, L, peri, node] = base.map((v, k) => v + rate[k] * t);
  const omega = (peri - node) * RAD;
  let M = ((L - peri) % 360) * RAD;
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M < -Math.PI) M += 2 * Math.PI;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [co, so] = [Math.cos(omega), Math.sin(omega)];
  const [cn, sn] = [Math.cos(node * RAD), Math.sin(node * RAD)];
  const [ci, si] = [Math.cos(i * RAD), Math.sin(i * RAD)];
  return [
    (co * cn - so * sn * ci) * x + (-so * cn - co * sn * ci) * y,
    (co * sn + so * cn * ci) * x + (-so * sn + co * cn * ci) * y,
    so * si * x + co * si * y,
  ];
};

// Geocentric equatorial direction (J2000) of a planet, or of the sun for 'sun'.
export const getGeocentricVector = (body: PlanetName | 'sun', date: Date): Vec => {
  const t = (julianDay(date) - 2451545) / 36525;
  const earth = heliocentric('earth', t);
  const p: Vec = body === 'sun' ? [0, 0, 0] : heliocentric(body, t);
  const [x, y, z] = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
  const [c, s] = [Math.cos(OBLIQUITY), Math.sin(OBLIQUITY)];
  return [x, c * y - s * z, s * y + c * z];
};

// The angle (degrees) between two directions.
export const separationDeg = (a: Vec, b: Vec): number => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cos = dot / (Math.hypot(...a) * Math.hypot(...b));
  return Math.acos(Math.min(1, Math.max(-1, cos))) / RAD;
};

// Altitude and azimuth of a geocentric equatorial direction for a place on Earth.
export const toHorizontal = (v: Vec, date: Date, latitude: number, longitude: number): { altitude: number; azimuth: number } => {
  const ra = Math.atan2(v[1], v[0]);
  const dec = Math.atan2(v[2], Math.hypot(v[0], v[1]));
  const gmst = 280.46061837 + 360.98564736629 * (julianDay(date) - 2451545);
  const h = (gmst + longitude) * RAD - ra;
  const phi = latitude * RAD;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h)) / RAD;
  const az = Math.atan2(-Math.sin(h) * Math.cos(dec), Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.cos(h) * Math.sin(phi)) / RAD;
  return { altitude, azimuth: (az + 360) % 360 };
};

export const getPlanetSky = (name: PlanetName, date: Date, latitude: number, longitude: number): PlanetSky => ({
  name,
  ...toHorizontal(getGeocentricVector(name, date), date, latitude, longitude),
});
