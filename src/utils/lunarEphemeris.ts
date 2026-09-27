// Higher-precision lunar position, for moonrise/moonset only (see getMoonTimes in
// moonUtils.ts). suncalc's lunar theory is low precision and can put rise/set several
// minutes off; this implements Jean Meeus, "Astronomical Algorithms" (2nd ed.):
//   ch. 47 - geocentric ecliptic longitude/latitude/distance of the Moon
//   ch. 22 - nutation in longitude/obliquity (low-precision series, ~0.5")
//   ch. 13 - ecliptic -> equatorial (RA/Dec) conversion
//   ch. 12 - Greenwich sidereal time
//   ch. 15 - standard altitude for rise/set (topocentric upper-limb approximated via
//            a geocentric altitude threshold that folds in parallax, refraction and
//            semidiameter - see moonAltitudeExcessDeg below)
//
// Pure functions only: everything here takes a Date (or a T/JDE) and returns numbers -
// no state, no I/O. getMoonPosition (the moon's on-screen position) intentionally
// stays on suncalc - only rise/set needed the extra precision.

const DEG2RAD = Math.PI / 180;

const sinDeg = (deg: number): number => Math.sin(deg * DEG2RAD);
const cosDeg = (deg: number): number => Math.cos(deg * DEG2RAD);
const tanDeg = (deg: number): number => Math.tan(deg * DEG2RAD);
const atan2Deg = (y: number, x: number): number => Math.atan2(y, x) / DEG2RAD;
const asinDeg = (x: number): number => Math.asin(Math.max(-1, Math.min(1, x))) / DEG2RAD;

const normalizeDeg = (deg: number): number => {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
};

// Delta T (TT - UT) in seconds, Espenak-Meeus polynomials for 1986-2050. Deliberately
// duplicated from the (unexported) helper of the same name in moonUtils.ts rather than
// imported, so this module has no dependency on it (and moonUtils.ts can depend on this
// module without a cycle).
const deltaTSeconds = (date: Date): number => {
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const startOfNextYear = Date.UTC(year + 1, 0, 1);
  const fraction = (date.getTime() - startOfYear) / (startOfNextYear - startOfYear);
  const y = year + fraction;
  const t = y - 2000;

  if (y < 2005) {
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
};

const dateToJdUt = (date: Date): number => date.getTime() / 86400000 + 2440587.5;
const dateToJde = (date: Date): number => dateToJdUt(date) + deltaTSeconds(date) / 86400;
const jdToT = (jd: number): number => (jd - 2451545) / 36525;

export interface MoonEclipticPosition {
  /** Geocentric ecliptic longitude, degrees, mean equinox of date (no nutation). */
  lambdaDeg: number;
  /** Geocentric ecliptic latitude, degrees. */
  betaDeg: number;
  /** Distance between the centers of the Earth and Moon, km. */
  distanceKm: number;
}

// Table 47.A: D, M, M', F multipliers and the coefficients (Σl in 0.000001 degree,
// Σr in 0.001 km) of the longitude and distance periodic terms.
const TABLE_47A: readonly [number, number, number, number, number, number][] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

// Table 47.B: D, M, M', F multipliers and the coefficient (Σb in 0.000001 degree) of
// the latitude periodic terms.
const TABLE_47B: readonly [number, number, number, number, number][] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

// E multiplier for terms whose M coefficient is +-1 (E) or +-2 (E^2); 0 for the rest.
const eccentricityFactor = (mCoeff: number, E: number): number => {
  const abs = Math.abs(mCoeff);
  if (abs === 1) return E;
  if (abs === 2) return E * E;
  return 1;
};

// Meeus ch. 47: geocentric ecliptic longitude/latitude/distance of the Moon, from T
// (Julian centuries of Terrestrial Time from J2000.0) directly - exposed separately
// from the Date-based wrapper below so it can be checked directly against Meeus's own
// worked example (47.a), which is stated in T/JDE terms rather than a calendar date.
export const moonEclipticFromT = (T: number): MoonEclipticPosition => {
  const Lp = normalizeDeg(
    218.3164477 +
      481267.88123421 * T -
      0.0015786 * T ** 2 +
      T ** 3 / 538841 -
      T ** 4 / 65194000
  );
  const D = normalizeDeg(
    297.8501921 +
      445267.1114034 * T -
      0.0018819 * T ** 2 +
      T ** 3 / 545868 -
      T ** 4 / 113065000
  );
  const M = normalizeDeg(357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000);
  const Mp = normalizeDeg(
    134.9633964 +
      477198.8675055 * T +
      0.0087414 * T ** 2 +
      T ** 3 / 69699 -
      T ** 4 / 14712000
  );
  const F = normalizeDeg(
    93.272095 +
      483202.0175233 * T -
      0.0036539 * T ** 2 -
      T ** 3 / 3526000 +
      T ** 4 / 863310000
  );

  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;

  let sigmaL = 3958 * sinDeg(A1) + 1962 * sinDeg(Lp - F) + 318 * sinDeg(A2);
  let sigmaR = 0;
  for (const [d, m, mp, f, coeffL, coeffR] of TABLE_47A) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const e = eccentricityFactor(m, E);
    sigmaL += coeffL * e * sinDeg(arg);
    sigmaR += coeffR * e * cosDeg(arg);
  }

  let sigmaB =
    -2235 * sinDeg(Lp) +
    382 * sinDeg(A3) +
    175 * sinDeg(A1 - F) +
    175 * sinDeg(A1 + F) +
    127 * sinDeg(Lp - Mp) -
    115 * sinDeg(Lp + Mp);
  for (const [d, m, mp, f, coeffB] of TABLE_47B) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const e = eccentricityFactor(m, E);
    sigmaB += coeffB * e * sinDeg(arg);
  }

  return {
    lambdaDeg: normalizeDeg(Lp + sigmaL / 1e6),
    betaDeg: sigmaB / 1e6,
    distanceKm: 385000.56 + sigmaR / 1000,
  };
};

export const getMoonEclipticGeocentric = (date: Date): MoonEclipticPosition =>
  moonEclipticFromT(jdToT(dateToJde(date)));

// Meeus ch. 22, low-precision nutation series (accurate to ~0.5" in longitude, ~0.1" in
// obliquity) plus the ch. 22 mean obliquity polynomial. Returns apparent nutation in
// longitude and the true (mean + nutation) obliquity of the ecliptic, both in degrees.
const nutationAndObliquityFromT = (T: number): { deltaPsiDeg: number; obliquityDeg: number } => {
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T ** 2 + T ** 3 / 450000;
  const lSun = 280.4665 + 36000.7698 * T;
  const lMoon = 218.3165 + 481267.8813 * T;

  const deltaPsiArcsec =
    -17.2 * sinDeg(omega) - 1.32 * sinDeg(2 * lSun) - 0.23 * sinDeg(2 * lMoon) + 0.21 * sinDeg(2 * omega);
  const deltaEpsArcsec =
    9.2 * cosDeg(omega) + 0.57 * cosDeg(2 * lSun) + 0.1 * cosDeg(2 * lMoon) - 0.09 * cosDeg(2 * omega);

  const meanObliquityDeg =
    23 + 26 / 60 + 21.448 / 3600 - (46.815 * T + 0.00059 * T ** 2 - 0.001813 * T ** 3) / 3600;

  return {
    deltaPsiDeg: deltaPsiArcsec / 3600,
    obliquityDeg: meanObliquityDeg + deltaEpsArcsec / 3600,
  };
};

// Meeus ch. 15 standard altitude for the Moon's rise/set: h0 = 0.7275*pi - 34', where
// pi is the horizontal parallax. Folds topocentric parallax, the Moon's semidiameter
// and standard refraction at the horizon into a single geocentric-altitude threshold,
// so rise/set can be found as geocentric altitude == h0 without a full topocentric
// position correction.
const standardAltitudeDeg = (distanceKm: number): number => {
  const horizontalParallaxDeg = asinDeg(6378.14 / distanceKm);
  return 0.7275 * horizontalParallaxDeg - 34 / 60;
};

// Geocentric altitude of the Moon minus the standard rise/set altitude threshold for
// that instant (see standardAltitudeDeg): positive while the Moon is "up" by that
// definition, negative while it is "down". Combines ch. 47 (position), ch. 22
// (nutation/obliquity), ch. 13 (ecliptic -> equatorial) and ch. 12 (Greenwich sidereal
// time). date must not be mutated (only read via getTime()/getUTC*()).
const moonAltitudeExcessDeg = (date: Date, latitude: number, longitude: number): number => {
  const jde = dateToJde(date);
  const T = jdToT(jde);
  const { lambdaDeg, betaDeg, distanceKm } = moonEclipticFromT(T);
  const { deltaPsiDeg, obliquityDeg } = nutationAndObliquityFromT(T);

  const lambdaApparentDeg = lambdaDeg + deltaPsiDeg;

  const raDeg = normalizeDeg(
    atan2Deg(
      sinDeg(lambdaApparentDeg) * cosDeg(obliquityDeg) - tanDeg(betaDeg) * sinDeg(obliquityDeg),
      cosDeg(lambdaApparentDeg)
    )
  );
  const decDeg = asinDeg(
    sinDeg(betaDeg) * cosDeg(obliquityDeg) + cosDeg(betaDeg) * sinDeg(obliquityDeg) * sinDeg(lambdaApparentDeg)
  );

  // Greenwich mean sidereal time (Meeus 12.4), from the UT (not TT) instant.
  const jdUt = dateToJdUt(date);
  const Tut = jdToT(jdUt);
  const theta0 =
    280.46061837 +
    360.98564736629 * (jdUt - 2451545.0) +
    0.000387933 * Tut ** 2 -
    Tut ** 3 / 38710000;
  // Equation of the equinoxes: mean -> apparent sidereal time.
  const gastDeg = theta0 + deltaPsiDeg * cosDeg(obliquityDeg);

  const localSiderealDeg = gastDeg + longitude; // east longitude positive
  const hourAngleDeg = localSiderealDeg - raDeg;

  const altitudeDeg = asinDeg(
    sinDeg(latitude) * sinDeg(decDeg) + cosDeg(latitude) * cosDeg(decDeg) * cosDeg(hourAngleDeg)
  );

  return altitudeDeg - standardAltitudeDeg(distanceKm);
};

export interface MoonEventScan {
  rise: Date | null;
  set: Date | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
}

const SCAN_STEP_MS = 10 * 60 * 1000;
const BISECT_TOLERANCE_MS = 10 * 1000;

// Bisects [loMs, hiMs] (where the altitude-excess function is known to change sign)
// down to < 10s, returning the crossing instant.
const bisectEventMs = (
  loMs: number,
  hiMs: number,
  loValue: number,
  latitude: number,
  longitude: number
): number => {
  let lo = loMs;
  let hi = hiMs;
  const loPositive = loValue >= 0;

  while (hi - lo > BISECT_TOLERANCE_MS) {
    const mid = (lo + hi) / 2;
    const midPositive = moonAltitudeExcessDeg(new Date(mid), latitude, longitude) >= 0;
    if (midPositive === loPositive) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round((lo + hi) / 2);
};

// Scans [startMs, endMs] in 10-minute steps for topocentric-threshold moonrise/set
// crossings (see moonAltitudeExcessDeg), then bisects each crossing to < 10s. Pure and
// stateless - the window's semantics (which calendar day, which timezone) are entirely
// up to the caller. Only the first rise and first set found in the window are
// reported, matching the single rise/single set shape callers expect per day.
export const scanMoonEvents = (
  startMs: number,
  endMs: number,
  latitude: number,
  longitude: number
): MoonEventScan => {
  let rise: Date | null = null;
  let set: Date | null = null;
  let sawPositive = false;
  let sawNegative = false;

  let t = startMs;
  let v = moonAltitudeExcessDeg(new Date(t), latitude, longitude);
  if (v >= 0) sawPositive = true;
  else sawNegative = true;

  while (t < endMs) {
    const nextT = Math.min(t + SCAN_STEP_MS, endMs);
    const nextV = moonAltitudeExcessDeg(new Date(nextT), latitude, longitude);
    if (nextV >= 0) sawPositive = true;
    else sawNegative = true;

    if ((v >= 0) !== (nextV >= 0)) {
      const eventDate = new Date(bisectEventMs(t, nextT, v, latitude, longitude));
      if (v < 0 && nextV >= 0) {
        if (!rise) rise = eventDate;
      } else if (!set) {
        set = eventDate;
      }
    }

    t = nextT;
    v = nextV;
  }

  return {
    rise,
    set,
    alwaysUp: sawPositive && !sawNegative,
    alwaysDown: sawNegative && !sawPositive,
  };
};
