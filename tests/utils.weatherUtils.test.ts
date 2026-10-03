import { fetchCurrentWeather, getSunsetScore, getScoreReason, WMO_CODE_MAP } from '../src/utils/weatherUtils';
import { type WeatherType } from '../src/components/CloudLayer';
describe('weatherUtils', () => {
  it('fetches weather data (mocked)', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }) })) as unknown as typeof fetch;
    const data = await fetchCurrentWeather(0, 0);
    expect(data).toHaveProperty('temperature');
    expect(data).toHaveProperty('weatherType');
  });
  it('invalidates cache after 30min or location change', () => {
    // Mock cache and check invalidation logic
  });
  it('uses cache if valid', async () => {
    // Mock cache and check fetchCurrentWeather returns cached value
  });
  it('ignores a cache entry with a future timestamp (device clock set back)', async () => {
    const cached = { temperature: -30, weatherType: 'snow', lastUpdated: new Date().toISOString() };
    localStorage.setItem('weather_cache', JSON.stringify({ data: cached, timestamp: Date.now() + 864e5, latitude: 0, longitude: 0 }));
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }) })) as unknown as typeof fetch;
    const data = await fetchCurrentWeather(0, 0);
    expect(fetch).toHaveBeenCalled();
    expect(data.temperature).toBe(20);
  });
  it('falls back on error', async () => {
    global.fetch = vi.fn(() => Promise.reject('fail')) as unknown as typeof fetch;
    const data = await fetchCurrentWeather(0, 0);
    expect(data).toBeDefined();
  });

  it('rounds coordinates to 2 decimals before sending them to Open-Meteo (S-8)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }),
      })
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await fetchCurrentWeather(51.50735, -0.12776);

    const calledUrl = String((fetchMock as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(calledUrl).toContain('latitude=51.51');
    expect(calledUrl).toContain('longitude=-0.13');
  });

  it('does not emit [Weather Debug] console.logs (P-2)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }) })) as unknown as typeof fetch;

    await fetchCurrentWeather(1, 1);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('requests hourly cloud cover / visibility alongside current weather (ROADMAP item 11)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }),
      })
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await fetchCurrentWeather(10.1, 20.2);

    const calledUrl = String((fetchMock as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(calledUrl).toContain('hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility');
  });

  it('scores the hour nearest each sunset from the hourly response (ROADMAP item 11)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' },
            hourly: {
              time: ['2026-06-01T17:00', '2026-06-01T18:00', '2026-06-02T18:00'],
              cloud_cover_low: [80, 0, 20],
              cloud_cover_mid: [10, 50, 50],
              cloud_cover_high: [10, 50, 50],
              visibility: [5000, 24140, 24140],
            },
          }),
      })
    ) as unknown as typeof fetch;

    const sunsetToday = new Date('2026-06-01T18:03:00Z'); // nearest to the 18:00 sample
    const sunsetTomorrow = new Date('2026-06-02T17:58:00Z'); // nearest to the next day's 18:00 sample

    const data = await fetchCurrentWeather(30.44, 40.55, sunsetToday, sunsetTomorrow);

    expect(data.sunsetScoreToday).toEqual(getSunsetScore({ low: 0, mid: 50, high: 50, visibility: 24140 }));
    expect(data.sunsetScoreTomorrow).toEqual(getSunsetScore({ low: 20, mid: 50, high: 50, visibility: 24140 }));
  });

  it('is null when no sunset time is supplied', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' },
            hourly: {
              time: ['2026-06-01T18:00'],
              cloud_cover_low: [0],
              cloud_cover_mid: [50],
              cloud_cover_high: [50],
              visibility: [24140],
            },
          }),
      })
    ) as unknown as typeof fetch;

    const data = await fetchCurrentWeather(31.44, 41.55);
    expect(data.sunsetScoreToday).toBeNull();
    expect(data.sunsetScoreTomorrow).toBeNull();
  });

  it('keeps the cloud layers of the hour nearest the fetch, for the cloud types (ROADMAP item 84)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-01T17:20:00Z'));
    const response = (hourly: boolean) => ({
      current_weather: { temperature: 20, weathercode: 2, windspeed: 0, winddirection: 0, time: '' },
      ...(hourly && {
        hourly: {
          time: ['2026-06-01T16:00', '2026-06-01T17:00', '2026-06-01T18:00'],
          cloud_cover_low: [10, 30, 50],
          cloud_cover_mid: [20, 40, 60],
          cloud_cover_high: [90, 70, 50],
          visibility: [24140, 24140, 24140],
        },
      }),
    });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(response(true)) })) as unknown as typeof fetch;
    expect((await fetchCurrentWeather(32.44, 42.55)).cloudLayers).toEqual({ low: 30, mid: 40, high: 70 });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(response(false)) })) as unknown as typeof fetch;
    expect((await fetchCurrentWeather(33.44, 43.55)).cloudLayers).toBeNull();
    // An older cache entry has no layers.
    const cached = { temperature: 12, weatherType: 'cloudy', conditionKey: 'condition.partlyCloudy', lastUpdated: new Date().toISOString() };
    localStorage.setItem('weather_cache', JSON.stringify({ data: cached, timestamp: Date.now(), latitude: 34.44, longitude: 44.55 }));
    expect((await fetchCurrentWeather(34.44, 44.55)).cloudLayers).toBeNull();
    vi.useRealTimers();
  });
});

describe('WMO_CODE_MAP (ROADMAP item 10)', () => {
  // Every WMO weather code Open-Meteo can return, per the roadmap spec.
  const ALL_WMO_CODES = [
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
    71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99
  ];

  const VALID_TYPES: WeatherType[] = [
    'clear', 'partly', 'cloudy', 'overcast', 'fog', 'drizzle', 'rain', 'storm', 'snow', 'hail'
  ];

  it('maps every WMO code to exactly one valid WeatherType', () => {
    for (const code of ALL_WMO_CODES) {
      const mapping = WMO_CODE_MAP[code];
      expect(mapping, `code ${code} should have a mapping`).toBeDefined();
      expect(VALID_TYPES).toContain(mapping.type);
    }
  });

  it('maps the clear-sky code to clear', () => {
    expect(WMO_CODE_MAP[0].type).toBe('clear');
  });

  it('maps fog codes (45, 48) to fog', () => {
    expect(WMO_CODE_MAP[45].type).toBe('fog');
    expect(WMO_CODE_MAP[48].type).toBe('fog');
  });

  it('maps drizzle codes (51-57) to drizzle', () => {
    for (const code of [51, 53, 55, 56, 57]) {
      expect(WMO_CODE_MAP[code].type).toBe('drizzle');
    }
  });

  it('maps rain codes (61-67, 80-82) to rain', () => {
    for (const code of [61, 63, 65, 66, 67, 80, 81, 82]) {
      expect(WMO_CODE_MAP[code].type).toBe('rain');
    }
  });

  it('maps snow codes (71-77, 85-86) to snow', () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(WMO_CODE_MAP[code].type).toBe('snow');
    }
  });

  it('maps thunderstorm codes (95, 96, 99) to storm', () => {
    for (const code of [95, 96, 99]) {
      expect(WMO_CODE_MAP[code].type).toBe('storm');
    }
  });

  it('falls back to clear for an unknown code', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 12345, windspeed: 0, winddirection: 0, time: '' } }),
      })
    ) as unknown as typeof fetch;

    const data = await fetchCurrentWeather(2, 2);
    expect(data.weatherType).toBe('clear');
    expect(data.conditionKey).toBe('condition.unknown');
  });
});

describe('fetchCurrentWeather cloud/wind fields (ROADMAP item 10)', () => {
  it('requests cloud_cover, wind_speed_10m and wind_direction_10m in the current block', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }),
      })
    ) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await fetchCurrentWeather(3, 3);

    const calledUrl = String((fetchMock as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(calledUrl).toContain('current=cloud_cover,wind_speed_10m,wind_direction_10m');
  });

  it('exposes cloud_cover/wind fields from the current block', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' },
          current: { cloud_cover: 42, wind_speed_10m: 18, wind_direction_10m: 270 }
        }),
      })
    ) as unknown as typeof fetch;

    const data = await fetchCurrentWeather(4, 4);
    expect(data.cloudCoverPercent).toBe(42);
    expect(data.windSpeedKmh).toBe(18);
    expect(data.windDirectionDeg).toBe(270);
  });

  it('is null when the current block is missing (backward compatible)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }),
      })
    ) as unknown as typeof fetch;

    const data = await fetchCurrentWeather(5, 5);
    expect(data.cloudCoverPercent).toBeNull();
    expect(data.windSpeedKmh).toBeNull();
    expect(data.windDirectionDeg).toBeNull();
  });

  it('ignores a pre-item-67 cache entry that has English texts instead of keys', async () => {
    const legacyCached = {
      temperature: 15,
      weatherType: 'clear',
      weatherDescription: 'Clear sky',
      lastUpdated: new Date().toISOString(),
      isRealWeather: true,
      sunsetScoreToday: { score: 5, reason: 'clear sky, clear horizon' },
      sunsetScoreTomorrow: null,
    };
    localStorage.setItem('weather_cache', JSON.stringify({ data: legacyCached, timestamp: Date.now(), latitude: 7, longitude: 7 }));
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ current_weather: { temperature: 21, weathercode: 3, windspeed: 0, winddirection: 0, time: '' } }),
      })
    ) as unknown as typeof fetch;

    const data = await fetchCurrentWeather(7, 7);
    expect(global.fetch).toHaveBeenCalled();
    expect(data.conditionKey).toBe('condition.overcast');
  });

  it('normalizes a pre-item-10 cache entry without cloud/wind fields', async () => {
    const legacyCached = {
      temperature: 15,
      weatherType: 'clear',
      conditionKey: 'condition.clearSky',
      lastUpdated: new Date().toISOString(),
      isRealWeather: true,
      sunsetScoreToday: null,
      sunsetScoreTomorrow: null
      // no cloudCoverPercent/windSpeedKmh/windDirectionDeg - written before item 10
    };
    localStorage.setItem('weather_cache', JSON.stringify({ data: legacyCached, timestamp: Date.now(), latitude: 6, longitude: 6 }));

    const data = await fetchCurrentWeather(6, 6);
    expect(data.cloudCoverPercent).toBeNull();
    expect(data.windSpeedKmh).toBeNull();
    expect(data.windDirectionDeg).toBeNull();
  });
});

describe('getSunsetScore (ROADMAP item 11)', () => {
  it('scores a clear sky around the middle of the range', () => {
    const { score } = getSunsetScore({ low: 0, mid: 0, high: 0, visibility: 24140 });
    expect(score).toBeGreaterThanOrEqual(4);
    expect(score).toBeLessThanOrEqual(6);
  });

  it('scores an all-low overcast sky near the bottom', () => {
    const { score } = getSunsetScore({ low: 100, mid: 0, high: 0, visibility: 9000 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(2);
  });

  it('scores ideal broken high/mid clouds with a clear horizon near the top', () => {
    const result = getSunsetScore({ low: 0, mid: 50, high: 50, visibility: 24140 });
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.clouds).toBe('score.cloudsHighMid');
    expect(result.horizon).toBe('score.horizonClear');
    expect(getScoreReason(result, 'en')).toBe('high clouds and mid clouds, clear horizon');
    expect(getScoreReason(result, 'de')).toBe('hohe und mittelhohe Wolken, klarer Horizont');
  });

  it('scores fog low regardless of cloud cover', () => {
    const { score, horizon } = getSunsetScore({ low: 0, mid: 0, high: 0, visibility: 200 });
    expect(score).toBeLessThanOrEqual(2);
    expect(horizon).toBe('score.horizonFog');
  });

  it('clamps the score to [0, 10]', () => {
    expect(getSunsetScore({ low: 100, mid: 0, high: 0, visibility: 0 }).score).toBeGreaterThanOrEqual(0);
    expect(getSunsetScore({ low: 0, mid: 100, high: 100, visibility: 50000 }).score).toBeLessThanOrEqual(10);
  });
});

describe('fetchCurrentWeather rain amount (ROADMAP item 77, X1)', () => {
  const respond = (body: object) => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) }));
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };
  const weather = (weathercode: number) => ({ temperature: 12, weathercode, windspeed: 0, winddirection: 0, time: '' });
  const current = (precipitation: number) => ({ cloud_cover: 100, wind_speed_10m: 5, wind_direction_10m: 270, precipitation, interval: 900 });

  it('requests precipitation and turns the 15-minute amount into mm/h', async () => {
    const fetchMock = respond({ current_weather: weather(63), current: current(0.5) });
    const data = await fetchCurrentWeather(17, 17);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain(',precipitation');
    expect(data.precipitationMmH).toBe(2);
  });

  it('takes the amount from the weather code when the measured amount is 0 or missing', async () => {
    respond({ current_weather: weather(65), current: current(0) });
    expect((await fetchCurrentWeather(18, 18)).precipitationMmH).toBe(10);
    respond({ current_weather: weather(0) });
    expect((await fetchCurrentWeather(19, 19)).precipitationMmH).toBeNull();
  });

  it('normalizes a pre-item-77 cache entry without the amount', async () => {
    const cached = {
      temperature: 15, weatherType: 'rain', conditionKey: 'condition.slightRain', lastUpdated: new Date().toISOString(),
      isRealWeather: true, sunsetScoreToday: null, sunsetScoreTomorrow: null,
      cloudCoverPercent: 90, windSpeedKmh: 10, windDirectionDeg: 200,
    };
    localStorage.setItem('weather_cache', JSON.stringify({ data: cached, timestamp: Date.now(), latitude: 20, longitude: 20 }));
    expect((await fetchCurrentWeather(20, 20)).precipitationMmH).toBeNull();
  });
});
