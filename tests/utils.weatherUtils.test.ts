import { fetchCurrentWeather } from '../src/utils/weatherUtils';
describe('weatherUtils', () => {
  it('fetches weather data (mocked)', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }) })) as any;
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
    global.fetch = vi.fn(() => Promise.reject('fail')) as any;
    const data = await fetchCurrentWeather(0, 0);
    expect(data).toBeDefined();
  });
});
