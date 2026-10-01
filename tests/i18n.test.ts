import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { DICTIONARIES, translate, formatNumber } from '@/i18n';
import { en } from '@/i18n/en';
import { LANGUAGES } from '@/utils/language';

// ROADMAP item 67: every dictionary has exactly the keys of en.ts, every key is used
// in src/, and t() fills the placeholders.
const enKeys = Object.keys(en).sort();
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

const SRC = join(__dirname, '..', 'src');
const readSources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : readSources(path);
    return /\.tsx?$/.test(name) ? [readFileSync(path, 'utf8')] : [];
  });

describe('dictionaries (ROADMAP item 67)', () => {
  it.each(LANGUAGES)('%s has exactly the keys of en, no missing and no extra key', (language) => {
    expect(Object.keys(DICTIONARIES[language]).sort()).toEqual(enKeys);
  });

  it.each(LANGUAGES)('%s has a non-empty text with the same placeholders as en for every key', (language) => {
    for (const key of enKeys) {
      const text = DICTIONARIES[language][key as keyof typeof en];
      expect(text.trim(), `${language} ${key}`).not.toBe('');
      expect(placeholders(text), `${language} ${key}`).toEqual(placeholders(en[key as keyof typeof en]));
    }
  });

  it('uses every en key somewhere in src/ (outside src/i18n)', () => {
    const source = readSources(SRC).join('\n');
    const unused = enKeys.filter((key) => !source.includes(`'${key}'`) && !source.includes(`"${key}"`));
    expect(unused).toEqual([]);
  });

  it('keeps the brand name untranslated', () => {
    for (const language of LANGUAGES) {
      expect(DICTIONARIES[language]['install.title']).toContain('Sun Chaser');
    }
  });
});

describe('translate', () => {
  it('fills {name} placeholders', () => {
    expect(translate('en', 'reminder.notification', { minutes: 15, time: '18:57' })).toBe('Sunset in 15 minutes, at 18:57');
    expect(translate('de', 'reminder.notification', { minutes: 15, time: '18:57' })).toBe('Sonnenuntergang in 15 Minuten, um 18:57');
  });

  it('leaves a placeholder without a value as it is, so the gap is visible', () => {
    expect(translate('en', 'golden.nowUntil')).toBe('now, until {time}');
  });

  it('returns the text as it is when it has no placeholders', () => {
    expect(translate('fr', 'sun.sunset')).toBe('Coucher du soleil');
  });
});

describe('formatNumber', () => {
  it('uses the decimal separator of the language', () => {
    expect(formatNumber('en', 12.345, 2)).toBe('12.35');
    expect(formatNumber('de', 12.345, 2)).toBe('12,35');
    expect(formatNumber('fr', -3.5, 1)).toBe('-3,5');
  });
});
