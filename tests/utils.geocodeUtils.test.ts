import { searchPlaces, formatGeocodeResultLabel } from '../src/utils/geocodeUtils';

describe('geocodeUtils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchPlaces', () => {
    it('ignores queries under 2 characters without calling fetch', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      expect(await searchPlaces('')).toEqual([]);
      expect(await searchPlaces('a')).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('calls the Open-Meteo geocoding API with the query, count and language', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
      );
      vi.stubGlobal('fetch', fetchMock);

      await searchPlaces('Friedrichshafen');

      const calledUrl = String(fetchMock.mock.calls[0][0]);
      expect(calledUrl).toContain('https://geocoding-api.open-meteo.com/v1/search');
      expect(calledUrl).toContain('name=Friedrichshafen');
      expect(calledUrl).toContain('count=5');
      expect(calledUrl).toContain('language=en');
      expect(calledUrl).toContain('format=json');
    });

    it('asks for the names in the UI language (ROADMAP item 67)', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
      );
      vi.stubGlobal('fetch', fetchMock);

      await searchPlaces('Mailand', undefined, 'it');

      expect(String(fetchMock.mock.calls[0][0])).toContain('language=it');
    });

    it('parses up to 5 results with name, admin1 and country', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { name: 'Friedrichshafen', admin1: 'Baden-Württemberg', country: 'Germany', latitude: 47.65, longitude: 9.48 },
                { name: 'Friedrichsdorf', admin1: 'Hesse', country: 'Germany', latitude: 50.33, longitude: 8.64 },
              ],
            }),
        })
      );
      vi.stubGlobal('fetch', fetchMock);

      const results = await searchPlaces('Friedrichs');

      expect(results).toEqual([
        { name: 'Friedrichshafen', admin1: 'Baden-Württemberg', country: 'Germany', latitude: 47.65, longitude: 9.48 },
        { name: 'Friedrichsdorf', admin1: 'Hesse', country: 'Germany', latitude: 50.33, longitude: 8.64 },
      ]);
    });

    it('keeps the country code for the national days (item 130), upper case, and drops a bad one', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [
          { name: 'Roma', country: 'Italy', country_code: 'it', latitude: 41.9, longitude: 12.5 },
          { name: 'Nowhere', country_code: 'XYZ', latitude: 1, longitude: 2 },
        ] }),
      })));
      const [rome, nowhere] = await searchPlaces('test');
      expect(rome.countryCode).toBe('IT');
      expect(nowhere.countryCode).toBeUndefined();
    });

    it('drops results missing a usable name or coordinates', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { name: '', latitude: 1, longitude: 2 },
                { name: 'Valid Place', latitude: 'not-a-number', longitude: 2 },
                { name: 'Also Valid', latitude: 1, longitude: 2 },
              ],
            }),
        })
      );
      vi.stubGlobal('fetch', fetchMock);

      const results = await searchPlaces('test');
      expect(results).toEqual([{ name: 'Also Valid', admin1: undefined, country: undefined, latitude: 1, longitude: 2 }]);
    });

    it('returns an empty array when the API has no results field', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
      vi.stubGlobal('fetch', fetchMock);

      expect(await searchPlaces('nowhere')).toEqual([]);
    });

    it('throws when the response is not ok', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(searchPlaces('test')).rejects.toThrow();
    });

    it('passes the abort signal through to fetch', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
      );
      vi.stubGlobal('fetch', fetchMock);

      const controller = new AbortController();
      await searchPlaces('test', controller.signal);

      expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });
  });

  describe('formatGeocodeResultLabel', () => {
    it('joins name, admin1 and country', () => {
      expect(
        formatGeocodeResultLabel({ name: 'Friedrichshafen', admin1: 'Baden-Württemberg', country: 'Germany', latitude: 0, longitude: 0 })
      ).toBe('Friedrichshafen, Baden-Württemberg, Germany');
    });

    it('omits missing parts', () => {
      expect(formatGeocodeResultLabel({ name: 'Paris', country: 'France', latitude: 0, longitude: 0 })).toBe('Paris, France');
      expect(formatGeocodeResultLabel({ name: 'Solitude Island', latitude: 0, longitude: 0 })).toBe('Solitude Island');
    });
  });
});
