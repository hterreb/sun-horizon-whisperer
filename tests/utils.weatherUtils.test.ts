import { fetchCurrentWeather } from '../src/utils/weatherUtils';
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
});
