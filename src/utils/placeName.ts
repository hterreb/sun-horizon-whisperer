// The place name and country of the user's location (ROADMAP items 130 and 137): the BigDataCloud
// reverse-geocode call with one retry, Photon (OpenStreetMap data) when both calls fail, a
// localStorage cache of the last answer, a country from the device time zone when there is no
// answer, and the result as a Sentry tag. InfoPanel owns the state.

import * as Sentry from '@sentry/react';
import { countryCodeOf } from './nationalDays';

export type PlaceSource = 'bigdatacloud' | 'photon';

export interface PlaceInfo {
  name: string | null;
  countryCode: string | null;
  hasTown: boolean; // false: the country alone, or nothing (cached for 1 h only)
  source: PlaceSource; // 'photon': show the OpenStreetMap attribution
}

interface CachedPlace extends PlaceInfo {
  key: string; // the rounded location
  language: string;
  savedAt: number;
}

const STORAGE_KEY = 'place-name';
export const PLACE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Item 137: an answer without a town (for example during a BigDataCloud outage) is asked again soon.
export const PLACE_NO_TOWN_MAX_AGE_MS = 60 * 60 * 1000;
export const PLACE_RETRY_MS = 2000;

// Round to ~1 km before the location goes to a third party; also the cache key.
const round = (value: number) => Math.round(value * 100) / 100;
const keyOf = (latitude: number, longitude: number) => `${round(latitude)},${round(longitude)}`;

// The cached answer for this location, or null. `fresh` is false when it is older than 24 h
// (1 h without a town) or in another language: show it at once, but ask again.
// ponytail: one entry (the last place); a user who moves gets one call per new place.
export const loadPlace = (
  latitude: number, longitude: number, language: string, now = Date.now(),
): { place: PlaceInfo; fresh: boolean } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedPlace> | null;
    if (!cached || cached.key !== keyOf(latitude, longitude) || typeof cached.savedAt !== 'number') return null;
    const name = typeof cached.name === 'string' && cached.name ? cached.name : null;
    // An item 130 entry has no `hasTown`: a name counts as a town.
    const hasTown = typeof cached.hasTown === 'boolean' ? cached.hasTown : name !== null;
    const source: PlaceSource = cached.source === 'photon' ? 'photon' : 'bigdatacloud';
    const place = { name, countryCode: countryCodeOf(cached), hasTown, source };
    if (!place.name && !place.countryCode) return null;
    const maxAge = hasTown ? PLACE_MAX_AGE_MS : PLACE_NO_TOWN_MAX_AGE_MS;
    return { place, fresh: cached.language === language && now - cached.savedAt < maxAge };
  } catch (error) {
    console.error('Error reading place name:', error);
    return null;
  }
};

export const savePlace = (
  latitude: number, longitude: number, language: string, place: PlaceInfo, now = Date.now(),
): void => {
  try {
    const cached: CachedPlace = { key: keyOf(latitude, longitude), language, savedAt: now, ...place };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Error saving place name:', error);
  }
};

// The first non-empty text, or null.
const firstText = (...values: unknown[]): string | null =>
  values.find((v): v is string => typeof v === 'string' && v.length > 0) ?? null;

// Item 137 name rule: "<town>, <country>", the town alone, or the country alone.
const placeFrom = (town: string | null, country: string | null, countryCode: string | null, source: PlaceSource): PlaceInfo => ({
  name: town && country ? `${town}, ${country}` : town ?? country,
  countryCode,
  hasTown: town !== null,
  source,
});

// The BigDataCloud answer. Town = city → locality → principal subdivision (state).
export const placeOf = (data: unknown): PlaceInfo => {
  const d = (data ?? {}) as { city?: unknown; locality?: unknown; principalSubdivision?: unknown; countryName?: unknown };
  return placeFrom(firstText(d.city, d.locality, d.principalSubdivision), firstText(d.countryName), countryCodeOf(data), 'bigdatacloud');
};

// The Photon answer (GeoJSON, the nearest OpenStreetMap object first). Town = city → the name of
// a place object (a village that is the nearest object has no `city`) → state, as in placeOf.
export const photonPlaceOf = (data: unknown): PlaceInfo => {
  const features = (data as { features?: unknown } | null)?.features;
  const p = ((Array.isArray(features) && (features[0] as { properties?: unknown })?.properties) || {}) as Record<string, unknown>;
  const town = firstText(p.city, p.osm_key === 'place' ? p.name : null, p.state);
  const code = typeof p.countrycode === 'string' ? p.countrycode.toUpperCase() : null;
  return placeFrom(town, firstText(p.country), countryCodeOf({ countryCode: code }), 'photon');
};

// A non-ok answer (item 137): the HTTP status and the `status` in the body. BigDataCloud sends
// 400 with body status 402 when it has banned the IP.
export class PlaceError extends Error {
  readonly httpStatus: number;
  readonly bodyStatus: number | null;

  constructor(httpStatus: number, bodyStatus: number | null) {
    super(`Reverse geocode failed: ${httpStatus}${bodyStatus === null ? '' : ` (${bodyStatus})`}`);
    this.name = 'PlaceError';
    this.httpStatus = httpStatus;
    this.bodyStatus = bodyStatus;
  }
}

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  // A rate limit (429), a ban or a server error is a failure, not "no place here".
  if (!response.ok) {
    let body: { status?: unknown } | null = null;
    try {
      body = await response.json();
    } catch {
      // No JSON body: the HTTP status alone.
    }
    const bodyStatus = Number(body?.status);
    throw new PlaceError(response.status, Number.isInteger(bodyStatus) && bodyStatus > 0 ? bodyStatus : null);
  }
  return response.json();
};

const fetchOnce = async (latitude: number, longitude: number, language: string): Promise<PlaceInfo> =>
  placeOf(await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${round(latitude)}&longitude=${round(longitude)}&localityLanguage=${language}`,
  ));

// BigDataCloud with one retry after `retryMs`; throws when both calls fail. No retry when
// `isCancelled()` is true by then (the caller moved on or unmounted): one call less to BigDataCloud.
export const fetchPlace = async (
  latitude: number, longitude: number, language: string,
  isCancelled: () => boolean = () => false, retryMs = PLACE_RETRY_MS,
): Promise<PlaceInfo> => {
  try {
    return await fetchOnce(latitude, longitude, language);
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, retryMs));
    if (isCancelled()) throw error;
    return fetchOnce(latitude, longitude, language);
  }
};

// Photon's languages (its error answer lists default, de, en, fr). Other languages get the
// local names (Photon's default).
const PHOTON_LANGUAGES = ['de', 'en', 'fr'];

// Item 137: the second provider, asked once when both BigDataCloud calls fail.
export const fetchPhotonPlace = async (latitude: number, longitude: number, language: string): Promise<PlaceInfo> => {
  const lang = PHOTON_LANGUAGES.includes(language) ? `&lang=${language}` : '';
  return photonPlaceOf(await fetchJson(`https://photon.komoot.io/reverse?lat=${round(latitude)}&lon=${round(longitude)}${lang}`));
};

// The Sentry tag value of an answer: `ok` (a town), `country-only`, or `empty` (no town, no country).
export const placeStatusOf = (place: PlaceInfo): string =>
  place.hasTown ? 'ok' : place.name || place.countryCode ? 'country-only' : 'empty';

// The Sentry tag value of a failure: `http-<status>[-<body status>]`, else `network` (offline,
// a blocked host, a broken answer).
export const errorStatusOf = (error: unknown): string =>
  error instanceof PlaceError
    ? `http-${error.httpStatus}${error.bodyStatus === null ? '' : `-${error.bodyStatus}`}`
    : 'network';

const isFailure = (status: string) => status === 'network' || status.startsWith('http-');
let failureReported = false;

// Item 137: tag `place` (BigDataCloud: ok, country-only, empty, cached, or the failure) and tag
// `place-photon` (set only when Photon was asked), so a feedback event carries them. Once per
// session, when both BigDataCloud calls fail, a warning with the same tags. The tags hold no
// coordinates. With no Sentry DSN, Sentry does nothing.
export const reportPlace = (status: string, photonStatus?: string): void => {
  Sentry.setTag('place', status);
  Sentry.setTag('place-photon', photonStatus); // undefined removes an old value
  if (isFailure(status) && !failureReported) {
    failureReported = true;
    Sentry.captureMessage('place-name failed', 'warning');
  }
};

// The national-day countries (nationalDays.ts) by their IANA time zones. US, CA and AU list
// their main zones only.
const ZONES: Record<string, string> = {
  'Europe/Rome': 'IT',
  'Europe/Paris': 'FR',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
  'Europe/Amsterdam': 'NL',
  'America/New_York': 'US', 'America/Detroit': 'US', 'America/Indiana/Indianapolis': 'US', 'America/Chicago': 'US',
  'America/Denver': 'US', 'America/Boise': 'US', 'America/Phoenix': 'US', 'America/Los_Angeles': 'US',
  'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA', 'America/Montreal': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Regina': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU', 'Australia/Darwin': 'AU',
};

export const countryFromTimeZone = (timeZone: string | undefined): string | null =>
  (timeZone && ZONES[timeZone]) || null;

// The country of the device's time zone: the fallback when the lookup fails and nothing is cached.
// ponytail: the device zone, not the shown place; wrong only for typed coordinates far away
// while the lookup also fails.
export const deviceCountry = (): string | null => {
  try {
    return countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
};
