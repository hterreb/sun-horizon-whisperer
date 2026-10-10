import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadPlace, savePlace, placeOf, fetchPlace, countryFromTimeZone, deviceCountry, PLACE_MAX_AGE_MS, PLACE_RETRY_MS,
} from '@/utils/placeName';

const ROME = { name: 'Roma, Italia', countryCode: 'IT' };
const NOW = 1_800_000_000_000;

describe('place name cache (item 128)', () => {
  beforeEach(() => localStorage.clear());

  it('misses when nothing is saved or the place is another one', () => {
    expect(loadPlace(41.9, 12.5, 'it', NOW)).toBeNull();
    savePlace(41.9, 12.5, 'it', ROME, NOW);
    expect(loadPlace(45.46, 9.19, 'it', NOW)).toBeNull();
  });

  it('hits on the same rounded location, fresh for 24 h in the same language', () => {
    savePlace(41.9012, 12.4964, 'it', ROME, NOW);
    expect(loadPlace(41.8998, 12.5011, 'it', NOW + 1000)).toEqual({ place: ROME, fresh: true });
    expect(loadPlace(41.9, 12.5, 'it', NOW + PLACE_MAX_AGE_MS)).toEqual({ place: ROME, fresh: false });
  });

  it('is stale, but still shown, in another language', () => {
    savePlace(41.9, 12.5, 'it', ROME, NOW);
    expect(loadPlace(41.9, 12.5, 'en', NOW)).toEqual({ place: ROME, fresh: false });
  });

  it('ignores a broken or empty entry', () => {
    localStorage.setItem('place-name', '{not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(loadPlace(41.9, 12.5, 'it', NOW)).toBeNull();
    savePlace(41.9, 12.5, 'it', { name: null, countryCode: null }, NOW);
    expect(loadPlace(41.9, 12.5, 'it', NOW)).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('placeOf', () => {
  it('builds the name like before: city, else locality, else country', () => {
    expect(placeOf({ city: 'Roma', countryName: 'Italia', countryCode: 'IT' })).toEqual(ROME);
    expect(placeOf({ locality: 'Ostia', countryName: 'Italia' })).toEqual({ name: 'Ostia, Italia', countryCode: null });
    expect(placeOf({ countryName: 'Italia' }).name).toBe('Italia');
    expect(placeOf({ city: 'Roma' }).name).toBeNull();
    expect(placeOf(null)).toEqual({ name: null, countryCode: null });
  });
});

describe('fetchPlace', () => {
  const ok = { ok: true, json: () => Promise.resolve({ city: 'Roma', countryName: 'Italia', countryCode: 'IT' }) };
  const limited = { ok: false, status: 429, json: () => Promise.resolve({ countryName: 'Italia' }) };
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks once with the rounded location', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok);
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchPlace(41.90123, 12.49641, 'it')).resolves.toEqual(ROME);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('latitude=41.9&longitude=12.5&localityLanguage=it');
  });

  it('treats a non-ok answer as a failure and retries once after 2 s', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
    vi.stubGlobal('fetch', fetchMock);
    const result = fetchPlace(41.9, 12.5, 'it');
    await vi.advanceTimersByTimeAsync(PLACE_RETRY_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(ROME);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when the retry fails too', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(limited).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const result = expect(fetchPlace(41.9, 12.5, 'it')).rejects.toThrow('offline');
    await vi.advanceTimersByTimeAsync(PLACE_RETRY_MS);
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('country from the time zone', () => {
  it('maps the national-day countries, with several zones for US, CA and AU', () => {
    expect(countryFromTimeZone('Europe/Berlin')).toBe('DE');
    expect(countryFromTimeZone('Europe/Rome')).toBe('IT');
    expect(countryFromTimeZone('Atlantic/Canary')).toBe('ES');
    expect(countryFromTimeZone('America/Los_Angeles')).toBe('US');
    expect(countryFromTimeZone('America/Toronto')).toBe('CA');
    expect(countryFromTimeZone('Australia/Perth')).toBe('AU');
    expect(countryFromTimeZone('Europe/Amsterdam')).toBe('NL');
  });

  it('gives null for other zones and no zone', () => {
    expect(countryFromTimeZone('Europe/Vienna')).toBeNull();
    expect(countryFromTimeZone('UTC')).toBeNull();
    expect(countryFromTimeZone(undefined)).toBeNull();
  });

  it('reads the device zone (UTC in the tests)', () => {
    expect(deviceCountry()).toBeNull();
  });
});
