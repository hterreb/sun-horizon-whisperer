// UI texts (ROADMAP item 67): one flat dictionary per language, en.ts is the source of
// the keys. translate() looks a key up and fills `{name}` placeholders from `vars`.
import { type Language } from '@/utils/language';
import { en } from './en';
import { de } from './de';
import { es } from './es';
import { it } from './it';
import { fr } from './fr';

export type MessageKey = keyof typeof en;
export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

export const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, de, es, it, fr };

// A placeholder without a value stays as it is, so a missing var is visible.
export const translate = (language: Language, key: MessageKey, vars?: TranslateVars): string =>
  DICTIONARIES[language][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    vars && name in vars ? String(vars[name]) : match
  );

// A number with a fixed count of decimals in the language's format ("12.5" / "12,5").
export const formatNumber = (language: Language, value: number, decimals: number): string =>
  new Intl.NumberFormat(language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
