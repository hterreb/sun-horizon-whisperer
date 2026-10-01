import { createContext, useContext } from 'react';
import { translate, type Translate } from '@/i18n';
import { type Language } from '@/utils/language';

// UI language (ROADMAP item 67). SunTracker owns the language state and provides it
// here, so the components below it need no extra props. Without a provider (tests,
// the 404 page) the texts are English.
export interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key, vars) => translate('en', key, vars),
});

export const useLanguage = (): LanguageContextValue => useContext(LanguageContext);
