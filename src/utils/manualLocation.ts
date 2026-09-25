// Persists a user-chosen manual location (A-4) so it survives a reload and is
// preferred over the New York fallback. Mirrors the try/catch-wrapped
// localStorage pattern already used for the weather cache in weatherUtils.ts.

export interface ManualLocation {
  latitude: number;
  longitude: number;
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
    const { latitude, longitude } = parsed ?? {};
    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      return { latitude, longitude };
    }
    return null;
  } catch (error) {
    console.error('Error reading manual location:', error);
    return null;
  }
};

export const saveManualLocation = (latitude: number, longitude: number): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude, longitude }));
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
