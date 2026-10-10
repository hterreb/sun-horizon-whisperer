// The place name and country of the user's location (ROADMAP item 130): the BigDataCloud
// reverse-geocode call with one retry, a localStorage cache of the last answer, and a country
// from the device time zone when there is no answer. InfoPanel owns the state.

import { countryCodeOf } from './nationalDays';

export interface PlaceInfo {
  name: string | null;
  countryCode: string | null;
}

interface CachedPlace extends PlaceInfo {
  key: string; // the rounded location
  language: string;
  savedAt: number;
}

const STORAGE_KEY = 'place-name';
export const PLACE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PLACE_RETRY_MS = 2000;

// Round to ~1 km before the location goes to a third party; also the cache key.
const round = (value: number) => Math.round(value * 100) / 100;
const keyOf = (latitude: number, longitude: number) => `${round(latitude)},${round(longitude)}`;

// The cached answer for this location, or null. `fresh` is false when it is older than 24 h
// or in another language: show it at once, but ask again.
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
    const place = { name, countryCode: countryCodeOf(cached) };
    if (!place.name && !place.countryCode) return null;
    return { place, fresh: cached.language === language && now - cached.savedAt < PLACE_MAX_AGE_MS };
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

// The BigDataCloud answer as a name ("City, Country", else the locality or the country alone)
// and a country code.
export const placeOf = (data: unknown): PlaceInfo => {
  const d = (data ?? {}) as { city?: unknown; locality?: unknown; countryName?: unknown };
  const country = typeof d.countryName === 'string' && d.countryName ? d.countryName : null;
  const town = [d.city, d.locality].find((v): v is string => typeof v === 'string' && v.length > 0);
  return { name: country ? (town ? `${town}, ${country}` : country) : null, countryCode: countryCodeOf(data) };
};

const fetchOnce = async (latitude: number, longitude: number, language: string): Promise<PlaceInfo> => {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${round(latitude)}&longitude=${round(longitude)}&localityLanguage=${language}`,
  );
  // A rate limit (429) or a server error is a failure, not "no place here".
  if (!response.ok) throw new Error(`Reverse geocode failed: ${response.status}`);
  return placeOf(await response.json());
};

// One retry after `retryMs`; throws when both calls fail.
export const fetchPlace = async (
  latitude: number, longitude: number, language: string, retryMs = PLACE_RETRY_MS,
): Promise<PlaceInfo> => {
  try {
    return await fetchOnce(latitude, longitude, language);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, retryMs));
    return fetchOnce(latitude, longitude, language);
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
