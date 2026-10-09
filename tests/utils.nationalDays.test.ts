import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  NATIONAL_DAYS, countryCodeOf, getNationalDay, parseCountryOverride, parseNationalEggOverride,
} from '@/utils/nationalDays';

// National days (ROADMAP "Ongoing - Easter eggs", National days).
describe('getNationalDay', () => {
  it.each([
    ['IT', 2026, 5, 2, 'festaRepubblica', 'jets'],
    ['FR', 2026, 6, 14, 'bastilleDay', 'fireworks'],
    ['US', 2026, 6, 4, 'independenceDay', 'fireworks'],
    ['GB', 2026, 10, 5, 'guyFawkes', 'fireworks'],
    ['DE', 2026, 9, 3, 'germanUnity', 'bunting'],
    ['ES', 2026, 9, 12, 'fiestaNacional', 'bunting'],
    ['CA', 2026, 6, 1, 'canadaDay', 'bunting'],
    ['AU', 2027, 0, 26, 'australiaDay', 'bunting'],
    ['NL', 2026, 3, 27, 'kingsDay', 'bunting'],
  ])('%s on %i-%i-%i is %s (%s)', (country, year, month, day, kind, style) => {
    // Early and late in the local day.
    for (const hour of [0, 12, 23]) {
      const found = getNationalDay(new Date(year, month, day, hour, 30), country);
      expect(found?.kind).toBe(kind);
      expect(found?.style).toBe(style);
    }
    expect(getNationalDay(new Date(year, month, day - 1, 23, 59), country)).toBeNull();
    expect(getNationalDay(new Date(year, month, day + 1, 0, 0), country)).toBeNull();
  });

  it('shows a national day only in its own country', () => {
    const bastille = new Date(2026, 6, 14, 22);
    expect(getNationalDay(bastille, 'DE')).toBeNull();
    expect(getNationalDay(new Date(2026, 6, 4, 22), 'FR')).toBeNull();
    expect(getNationalDay(new Date(2026, 9, 3, 12), 'AT')).toBeNull();
  });

  it('shows nothing when the country is unknown', () => {
    expect(getNationalDay(new Date(2026, 6, 14, 22), null)).toBeNull();
    expect(getNationalDay(new Date(2026, 6, 14, 22), '')).toBeNull();
  });

  it('accepts a lower-case country code', () => {
    expect(getNationalDay(new Date(2026, 6, 14, 22), 'fr')?.kind).toBe('bastilleDay');
  });

  it("moves King's Day to Saturday the 26th when the 27th is a Sunday", () => {
    // 2025-04-27 is a Sunday.
    expect(getNationalDay(new Date(2025, 3, 26, 12), 'NL')?.kind).toBe('kingsDay');
    expect(getNationalDay(new Date(2025, 3, 27, 12), 'NL')).toBeNull();
    // 2026-04-27 is a Monday: no move.
    expect(getNationalDay(new Date(2026, 3, 26, 12), 'NL')).toBeNull();
  });

  it('gives way to a calendar event (one special event at a time)', () => {
    // Lunar New Year falls on Australia Day in 2028.
    expect(getNationalDay(new Date(2028, 0, 26, 12), 'AU', 'lunar-new-year')).toBeNull();
    expect(getNationalDay(new Date(2028, 0, 26, 12), 'AU', null)?.kind).toBe('australiaDay');
  });

  it('has one row per kind, a known style and at least two flag colours each', () => {
    expect(new Set(NATIONAL_DAYS.map(d => d.kind)).size).toBe(NATIONAL_DAYS.length);
    for (const d of NATIONAL_DAYS) {
      expect(d.country).toMatch(/^[A-Z]{2}$/);
      expect(['jets', 'fireworks', 'bunting']).toContain(d.style);
      expect(d.colors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has a token in src/index.css for every flag colour', () => {
    const css = readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8');
    for (const token of new Set(NATIONAL_DAYS.flatMap(d => d.colors))) {
      expect(css, token).toMatch(new RegExp(`--national-${token}:`));
    }
  });
});

describe('test links', () => {
  it('?egg=<kind> forces that national day', () => {
    expect(parseNationalEggOverride('?egg=bastilleDay')?.country).toBe('FR');
    expect(parseNationalEggOverride('?egg=festaRepubblica')?.style).toBe('jets');
    expect(parseNationalEggOverride('?egg=dragon')).toBeNull();
    expect(parseNationalEggOverride('')).toBeNull();
  });

  it('?country=XX sets a two-letter country code', () => {
    expect(parseCountryOverride('?country=fr')).toBe('FR');
    expect(parseCountryOverride('?country=USA')).toBeNull();
    expect(parseCountryOverride('')).toBeNull();
  });
});

describe('countryCodeOf (BigDataCloud answer)', () => {
  it('takes a two-letter upper-case code and nothing else', () => {
    expect(countryCodeOf({ countryCode: 'IT', countryName: 'Italy' })).toBe('IT');
    expect(countryCodeOf({ countryCode: '' })).toBeNull();
    expect(countryCodeOf({ countryCode: 42 })).toBeNull();
    expect(countryCodeOf({})).toBeNull();
    expect(countryCodeOf(null)).toBeNull();
  });
});
