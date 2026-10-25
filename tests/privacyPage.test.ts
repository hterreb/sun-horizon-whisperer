import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STREAMS } from '@/utils/radioStreams';
import { translate } from '@/i18n';
import { LANGUAGES } from '@/utils/language';

// ROADMAP item 175: the static privacy page names every host the app contacts and every
// key it keeps. A new host in the CSP, a new radio station or a new storage key fails here
// until the page says it.
const page = readFileSync('public/privacy/index.html', 'utf8');
const headers = readFileSync('public/_headers', 'utf8');
const csp = (directive: string) =>
  headers.match(new RegExp(`${directive} ([^;\\n]*)`))![1].split(' ').filter((source) => source.startsWith('https://'));

describe('public/privacy/index.html (ROADMAP item 175)', () => {
  it('names every connect-src host of the CSP', () => {
    for (const source of csp('connect-src')) {
      const host = source.replace('https://', '').replace('*.', '');
      expect(page, host).toContain(host);
    }
  });

  it('names every radio stream host', () => {
    for (const { url } of STREAMS) expect(page, url).toContain(new URL(url).host);
  });

  it('lists every key of the storage the app keeps', () => {
    const keys = [
      'language', 'temperature-unit', 'eye-height-m', 'satellite-tracking', 'live-planes', 'sunset-countdown',
      'sunset-reminder', 'iss-pass-reminder', 'radio_station_index', 'manual-location', 'weather_cache', 'place-name',
      'terrain_horizon_profile_v2_', 'terrain_tree_cover_v1_', 'satellite-gp', 'collection', 'premium-owned',
      'premium-badge-hint', 'compass-calibration-hint-seen', 'pwa-dismissed', 'last-visible',
    ];
    for (const key of keys) expect(page, key).toContain(`<code>${key}`);
  });

  it('says that every host receives the IP address, and that the Azure host belongs to Planetary Computer', () => {
    expect(page).toContain('Every host receives your IP address');
    expect(page).toMatch(/Planetary Computer[\s\S]*ai4edataeuwest\.blob\.core\.windows\.net/);
  });
});

describe('Live planes text (ROADMAP item 175)', () => {
  it('names our server, which forwards the place to adsb.lol, in every language', () => {
    const texts = LANGUAGES.map((language) => translate(language, 'radar.hint'));
    expect(new Set(texts).size).toBe(LANGUAGES.length);
    for (const text of texts) expect(text).toContain('adsb.lol');
    expect(translate('en', 'radar.hint')).toContain('to our server. It forwards');
  });
});
