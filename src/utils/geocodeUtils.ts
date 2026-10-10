// Place-name search for the manual-location form (ROADMAP item 12), backed by the
// free, keyless Open-Meteo geocoding API. Pure fetch + parsing only; debouncing,
// aborting stale requests, and rendering results are the caller's job (InfoPanel).

import { type Language } from '@/utils/language';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface GeocodeResult {
  name: string;
  admin1?: string;
  country?: string;
  // ISO 3166-1 alpha-2 ("DE"), for the national days (ROADMAP item 130).
  countryCode?: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoGeocodeResponse {
  results?: Array<{
    name?: unknown;
    admin1?: unknown;
    country?: unknown;
    country_code?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  }>;
}

// "Friedrichshafen, Baden-Württemberg, Germany" - only the parts that exist.
export const formatGeocodeResultLabel = (result: GeocodeResult): string =>
  [result.name, result.admin1, result.country].filter(Boolean).join(', ');

// Ignores queries under 2 characters (returns no results, no request). Pass an
// AbortController's signal so a fast-typing caller can cancel a stale request. The
// place and country names come in `language` (ROADMAP item 67).
export const searchPlaces = async (
  query: string,
  signal?: AbortSignal,
  language: Language = 'en'
): Promise<GeocodeResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(trimmed)}&count=5&language=${language}&format=json`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.status}`);
  }

  const data: OpenMeteoGeocodeResponse = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .map((r) => ({
      name: typeof r.name === 'string' ? r.name : '',
      admin1: typeof r.admin1 === 'string' ? r.admin1 : undefined,
      country: typeof r.country === 'string' ? r.country : undefined,
      countryCode: typeof r.country_code === 'string' && /^[A-Z]{2}$/i.test(r.country_code) ? r.country_code.toUpperCase() : undefined,
      latitude: typeof r.latitude === 'number' ? r.latitude : NaN,
      longitude: typeof r.longitude === 'number' ? r.longitude : NaN,
    }))
    .filter((r) => r.name.length > 0 && Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
};
