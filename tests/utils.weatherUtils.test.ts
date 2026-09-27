import { fetchCurrentWeather, getSunsetScore } from '../src/utils/weatherUtils';
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
    const { score, reason } = getSunsetScore({ low: 0, mid: 50, high: 50, visibility: 24140 });
    expect(score).toBeGreaterThanOrEqual(8);
    expect(score).toBeLessThanOrEqual(10);
    expect(reason).toContain('clouds');
    expect(reason).toContain('clear horizon');
  });

  it('scores fog low regardless of cloud cover', () => {
    const { score, reason } = getSunsetScore({ low: 0, mid: 0, high: 0, visibility: 200 });
    expect(score).toBeLessThanOrEqual(2);
    expect(reason).toContain('fog');
  });

  it('clamps the score to [0, 10]', () => {
    expect(getSunsetScore({ low: 100, mid: 0, high: 0, visibility: 0 }).score).toBeGreaterThanOrEqual(0);
    expect(getSunsetScore({ low: 0, mid: 100, high: 100, visibility: 50000 }).score).toBeLessThanOrEqual(10);
  });
});
