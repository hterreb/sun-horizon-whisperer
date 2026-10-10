// UI texts (ROADMAP item 67): one flat dictionary per language, en.ts is the source of
// the keys. translate() looks a key up and fills `{name}` placeholders from `vars`.
// Only en is in the start bundle; the others load on demand (ROADMAP item 125).
import { type Language } from '@/utils/language';
import { en } from './en';

export type MessageKey = keyof typeof en;
export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

type Dictionary = Record<MessageKey, string>;

const LOADERS: Record<Exclude<Language, 'en'>, () => Promise<Dictionary>> = {
  de: () => import('./de').then((m) => m.de),
  es: () => import('./es').then((m) => m.es),
  it: () => import('./it').then((m) => m.it),
  fr: () => import('./fr').then((m) => m.fr),
};
const loaded: Partial<Record<Language, Dictionary>> = { en };

export const isDictionaryLoaded = (language: Language): boolean => language in loaded;

// Load a language before it is shown. main.tsx waits for the start language, and
// SunTracker for a picked one, so no text shows in the wrong language.
export const loadDictionary = async (language: Language): Promise<void> => {
  if (language !== 'en' && !loaded[language]) loaded[language] = await LOADERS[language]();
};

// A placeholder without a value stays as it is, so a missing var is visible.
// ponytail: a language that is not loaded yet shows en, so a failed chunk load
// (offline before the precache is complete) still shows readable texts.
export const translate = (language: Language, key: MessageKey, vars?: TranslateVars): string =>
  (loaded[language] ?? en)[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    vars && name in vars ? String(vars[name]) : match
  );

// A number with a fixed count of decimals in the language's format ("12.5" / "12,5").
export const formatNumber = (language: Language, value: number, decimals: number): string =>
  new Intl.NumberFormat(language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
