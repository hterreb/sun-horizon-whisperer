// Persists a user-chosen manual location (A-4) so it survives a reload and is
// preferred over the New York fallback. Mirrors the try/catch-wrapped
// localStorage pattern already used for the weather cache in weatherUtils.ts.

export interface ManualLocation {
  latitude: number;
  longitude: number;
  // Set when the location came from place-name search (ROADMAP item 12), so the
  // chosen place survives a reload instead of falling back to a reverse-geocode guess.
  name?: string;
  // The searched place's country code (ROADMAP item 130), for the national days.
  countryCode?: string;
}

const STORAGE_KEY = 'manual-location';

export const isValidLatitude = (lat: number): boolean =>
  Number.isFinite(lat) && lat >= -90 && lat <= 90;

export const isValidLongitude = (lon: number): boolean =>
  Number.isFinite(lon) && lon >= -180 && lon <= 180;

export const loadManualLocation = (): ManualLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const { latitude, longitude, name, countryCode } = parsed ?? {};
    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      if (typeof name !== 'string' || name.length === 0) return { latitude, longitude };
      return typeof countryCode === 'string' && /^[A-Z]{2}$/.test(countryCode)
        ? { latitude, longitude, name, countryCode }
        : { latitude, longitude, name };
    }
    return null;
  } catch (error) {
    console.error('Error reading manual location:', error);
    return null;
  }
};

export const saveManualLocation = (latitude: number, longitude: number, name?: string, countryCode?: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude, longitude, name, countryCode }));
  } catch (error) {
    console.error('Error saving manual location:', error);
  }
};

export const clearManualLocation = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing manual location:', error);
  }
};
