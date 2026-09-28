import { describe, it, expect } from 'vitest';
import { scrubLocation, scrubLocationString } from '@/utils/sentryScrub';

describe('sentryScrub', () => {
  it('filters coordinates from the forecast URL and keeps other params', () => {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=47.65&longitude=9.48&current=temperature_2m';
    expect(scrubLocationString(url)).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=[Filtered]&longitude=[Filtered]&current=temperature_2m'
    );
  });

  it('filters the place name from the geocoding URL', () => {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=Friedrichshafen&count=5';
    expect(scrubLocationString(url)).toBe('https://geocoding-api.open-meteo.com/v1/search?name=[Filtered]&count=5');
  });

  it('scrubs nested event fields without mutating the input', () => {
    const event = {
      request: { url: 'https://x.test/?lat=1.5&lon=-2' },
      breadcrumbs: [{ data: { url: 'https://api.open-meteo.com/v1/forecast?latitude=10&longitude=20' }, level: 'info' }],
      count: 3,
    };
    const scrubbed = scrubLocation(event);
    expect(JSON.stringify(scrubbed)).not.toMatch(/1\.5|-2|latitude=10|longitude=20/);
    expect(scrubbed.count).toBe(3);
    expect(event.request.url).toBe('https://x.test/?lat=1.5&lon=-2');
  });
});
