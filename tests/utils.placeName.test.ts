import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadPlace, savePlace, placeOf, photonPlaceOf, fetchPlace, fetchPhotonPlace, PlaceError, placeStatusOf, errorStatusOf,
  countryFromTimeZone, deviceCountry, PLACE_MAX_AGE_MS, PLACE_NO_TOWN_MAX_AGE_MS, PLACE_RETRY_MS,
} from '@/utils/placeName';

vi.mock('@sentry/react', () => ({ setTag: vi.fn(), captureMessage: vi.fn() }));

const ROME = { name: 'Roma, Italia', countryCode: 'IT', hasTown: true, source: 'bigdatacloud' as const };
const ITALY = { name: 'Italia', countryCode: 'IT', hasTown: false, source: 'bigdatacloud' as const };
const NOW = 1_800_000_000_000;

describe('place name cache (items 130 and 137)', () => {
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

  it('keeps an answer without a town fresh for 1 h only (item 137)', () => {
    savePlace(41.9, 12.5, 'it', ITALY, NOW);
    expect(loadPlace(41.9, 12.5, 'it', NOW + PLACE_NO_TOWN_MAX_AGE_MS - 1)).toEqual({ place: ITALY, fresh: true });
    expect(loadPlace(41.9, 12.5, 'it', NOW + PLACE_NO_TOWN_MAX_AGE_MS)).toEqual({ place: ITALY, fresh: false });
    savePlace(41.9, 12.5, 'it', { ...ITALY, name: null }, NOW);
    expect(loadPlace(41.9, 12.5, 'it', NOW + PLACE_NO_TOWN_MAX_AGE_MS)?.fresh).toBe(false);
  });

  it('reads an item 130 entry: a name counts as a town, no name gives 1 h', () => {
    const old = { key: '41.9,12.5', language: 'it', savedAt: NOW };
    localStorage.setItem('place-name', JSON.stringify({ ...old, name: 'Roma, Italia', countryCode: 'IT' }));
    expect(loadPlace(41.9, 12.5, 'it', NOW + PLACE_NO_TOWN_MAX_AGE_MS)).toEqual({ place: ROME, fresh: true });
    localStorage.setItem('place-name', JSON.stringify({ ...old, name: null, countryCode: 'IT' }));
    expect(loadPlace(41.9, 12.5, 'it', NOW + PLACE_NO_TOWN_MAX_AGE_MS)?.fresh).toBe(false);
  });

  it('keeps the source, so a Photon name keeps its attribution', () => {
    savePlace(41.9, 12.5, 'it', { ...ROME, source: 'photon' }, NOW);
    expect(loadPlace(41.9, 12.5, 'it', NOW)?.place.source).toBe('photon');
  });

  it('is stale, but still shown, in another language', () => {
    savePlace(41.9, 12.5, 'it', ROME, NOW);
    expect(loadPlace(41.9, 12.5, 'en', NOW)).toEqual({ place: ROME, fresh: false });
  });

  it('ignores a broken or empty entry', () => {
    localStorage.setItem('place-name', '{not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(loadPlace(41.9, 12.5, 'it', NOW)).toBeNull();
    savePlace(41.9, 12.5, 'it', { name: null, countryCode: null, hasTown: false, source: 'bigdatacloud' }, NOW);
    expect(loadPlace(41.9, 12.5, 'it', NOW)).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('placeOf (item 137 name rule)', () => {
  it('town = city, else locality, else principal subdivision; then ", country"', () => {
    expect(placeOf({ city: 'Roma', locality: 'Centro', countryName: 'Italia', countryCode: 'IT' })).toEqual(ROME);
    expect(placeOf({ locality: 'Ostia', countryName: 'Italia' }).name).toBe('Ostia, Italia');
    expect(placeOf({ principalSubdivision: 'Lazio', countryName: 'Italia' })).toMatchObject({ name: 'Lazio, Italia', hasTown: true });
  });

  it('gives the town alone without a country (cause 2)', () => {
    expect(placeOf({ city: 'Roma' })).toEqual({ name: 'Roma', countryCode: null, hasTown: true, source: 'bigdatacloud' });
    expect(placeOf({ locality: 'Ostia', countryName: '' }).name).toBe('Ostia');
  });

  it('gives the country alone without a town, and nothing for no answer', () => {
    expect(placeOf({ countryName: 'Italia', countryCode: 'IT' })).toEqual(ITALY);
    expect(placeOf(null)).toEqual({ name: null, countryCode: null, hasTown: false, source: 'bigdatacloud' });
  });
});

describe('photonPlaceOf', () => {
  const answer = (properties: Record<string, unknown>) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties }] });

  it('reads the nearest object: city, country, country code', () => {
    // The shape of a real answer (a house in Ravensburg, lang=en).
    expect(photonPlaceOf(answer({
      osm_key: 'building', type: 'house', street: 'Hirschgraben', district: 'Südstadt', city: 'Ravensburg',
      county: 'Landkreis Ravensburg', state: 'Baden-Württemberg', country: 'Germany', countrycode: 'DE',
    }))).toEqual({ name: 'Ravensburg, Germany', countryCode: 'DE', hasTown: true, source: 'photon' });
  });

  it('takes the name of a place object, else the state; never the name of a building', () => {
    expect(photonPlaceOf(answer({ osm_key: 'place', name: 'Viganella', state: 'Piemonte', country: 'Italia', countrycode: 'IT' })).name)
      .toBe('Viganella, Italia');
    expect(photonPlaceOf(answer({ osm_key: 'amenity', name: 'Gasthaus Krone', state: 'Bayern', country: 'Deutschland' })).name)
      .toBe('Bayern, Deutschland');
  });

  it('gives nothing for no feature or a broken answer', () => {
    const none = { name: null, countryCode: null, hasTown: false, source: 'photon' };
    expect(photonPlaceOf({ type: 'FeatureCollection', features: [] })).toEqual(none);
    expect(photonPlaceOf({ features: 'x' })).toEqual(none);
    expect(photonPlaceOf(null)).toEqual(none);
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

  it('throws a PlaceError with the HTTP status and the body status (a ban: 400 with 402)', async () => {
    const banned = { ok: false, status: 400, json: () => Promise.resolve({ status: 402, description: 'this endpoint does not support server-side operations' }) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(banned));
    const result = fetchPlace(41.9, 12.5, 'it').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(PLACE_RETRY_MS);
    const error = await result;
    expect(error).toBeInstanceOf(PlaceError);
    expect(error).toMatchObject({ httpStatus: 400, bodyStatus: 402 });
  });

  it('gives a PlaceError without a body status when the body is not JSON', async () => {
    const broken = { ok: false, status: 503, json: () => Promise.reject(new SyntaxError('not json')) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(broken));
    const result = fetchPlace(41.9, 12.5, 'it').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(PLACE_RETRY_MS);
    expect(await result).toMatchObject({ httpStatus: 503, bodyStatus: null });
  });
});

describe('fetchPhotonPlace (item 137)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const ravensburg = { features: [{ properties: { city: 'Ravensburg', country: 'Germany', countrycode: 'DE' } }] };

  it('asks once with the rounded location and Photon\'s language (de, en, fr)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(ravensburg) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchPhotonPlace(47.7812, 9.6123, 'en')).resolves.toEqual({ name: 'Ravensburg, Germany', countryCode: 'DE', hasTown: true, source: 'photon' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://photon.komoot.io/reverse?lat=47.78&lon=9.61&lang=en');
    await fetchPhotonPlace(47.78, 9.61, 'fr');
    expect(String(fetchMock.mock.calls[1][0])).toContain('&lang=fr');
  });

  it('sends no language for it and es (Photon does not support them: local names)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(ravensburg) });
    vi.stubGlobal('fetch', fetchMock);
    await fetchPhotonPlace(47.78, 9.61, 'it');
    await fetchPhotonPlace(47.78, 9.61, 'es');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://photon.komoot.io/reverse?lat=47.78&lon=9.61');
    expect(String(fetchMock.mock.calls[1][0])).not.toContain('lang=');
  });

  it('throws a PlaceError on a non-ok answer, with no retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchPhotonPlace(47.78, 9.61, 'de')).rejects.toMatchObject({ httpStatus: 429, bodyStatus: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('place status for Sentry (item 137)', () => {
  it('names an answer: ok with a town, country-only, empty', () => {
    expect(placeStatusOf(ROME)).toBe('ok');
    expect(placeStatusOf({ ...ROME, name: 'Roma', countryCode: null })).toBe('ok');
    expect(placeStatusOf(ITALY)).toBe('country-only');
    expect(placeStatusOf({ ...ITALY, name: null })).toBe('country-only');
    expect(placeStatusOf({ name: null, countryCode: null, hasTown: false, source: 'photon' })).toBe('empty');
  });

  it('names a failure: http-<status>[-<body status>], else network', () => {
    expect(errorStatusOf(new PlaceError(400, 402))).toBe('http-400-402');
    expect(errorStatusOf(new PlaceError(429, null))).toBe('http-429');
    expect(errorStatusOf(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('sets the tags, and sends the warning once per session when BigDataCloud fails', async () => {
    vi.resetModules(); // a new session: the "sent" flag is module state
    const Sentry = await import('@sentry/react');
    const { reportPlace } = await import('@/utils/placeName');
    vi.mocked(Sentry.setTag).mockClear();
    vi.mocked(Sentry.captureMessage).mockClear();

    reportPlace('ok');
    expect(Sentry.setTag).toHaveBeenCalledWith('place', 'ok');
    expect(Sentry.setTag).toHaveBeenCalledWith('place-photon', undefined);
    reportPlace('cached');
    expect(Sentry.captureMessage).not.toHaveBeenCalled();

    reportPlace('http-400-402', 'ok');
    expect(Sentry.setTag).toHaveBeenCalledWith('place', 'http-400-402');
    expect(Sentry.setTag).toHaveBeenCalledWith('place-photon', 'ok');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('place-name failed', 'warning');
    // The tags are set before the message, so the message carries them.
    expect(vi.mocked(Sentry.setTag).mock.invocationCallOrder.at(-1)).toBeLessThan(vi.mocked(Sentry.captureMessage).mock.invocationCallOrder[0]);

    reportPlace('network', 'network');
    expect(Sentry.setTag).toHaveBeenLastCalledWith('place-photon', 'network');
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
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
