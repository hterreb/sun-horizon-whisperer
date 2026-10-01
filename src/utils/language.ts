// UI language (ROADMAP item 67): the five languages, the default from the browser
// locale, and the saved choice. Same pattern as temperatureUnit.ts.

export const LANGUAGES = ['en', 'de', 'es', 'it', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'language';

// The picker shows each language in its own name (not translated).
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  fr: 'Français',
};

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);

// The first two letters of the locale ("de-CH" → "de"); a language not in the list gives "en".
export const getDefaultLanguage = (locale: string | undefined): Language => {
  const code = (locale ?? '').slice(0, 2).toLowerCase();
  return isLanguage(code) ? code : 'en';
};

export const loadLanguage = (locale: string | undefined): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage blocked: use the locale default.
  }
  return getDefaultLanguage(locale);
};

export const saveLanguage = (language: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage blocked: the choice lasts for this session only.
  }
};
