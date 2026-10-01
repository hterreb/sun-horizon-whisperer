import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDefaultLanguage, loadLanguage, saveLanguage, LANGUAGE_STORAGE_KEY } from '@/utils/language';

describe('getDefaultLanguage (ROADMAP item 67)', () => {
  it('takes the first two letters of the locale', () => {
    expect(getDefaultLanguage('de-DE')).toBe('de');
    expect(getDefaultLanguage('de-CH')).toBe('de');
    expect(getDefaultLanguage('es-ES')).toBe('es');
    expect(getDefaultLanguage('it-IT')).toBe('it');
    expect(getDefaultLanguage('fr-CA')).toBe('fr');
    expect(getDefaultLanguage('en-US')).toBe('en');
    expect(getDefaultLanguage('FR')).toBe('fr');
  });

  it('uses English for a language that is not in the list, or no locale', () => {
    expect(getDefaultLanguage('pt-BR')).toBe('en');
    expect(getDefaultLanguage('ja')).toBe('en');
    expect(getDefaultLanguage('')).toBe('en');
    expect(getDefaultLanguage(undefined)).toBe('en');
  });
});

describe('loadLanguage / saveLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('prefers the saved choice over the locale default', () => {
    saveLanguage('it');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('it');
    expect(loadLanguage('de-DE')).toBe('it');
  });

  it('ignores a saved value that is not a language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'xx');
    expect(loadLanguage('es-ES')).toBe('es');
  });

  it('falls back to the locale default when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveLanguage('fr')).not.toThrow();
    expect(loadLanguage('fr-FR')).toBe('fr');
  });
});
