import { type CalendarEvent } from './calendarEvents';

// National days (ROADMAP "Ongoing - Easter eggs", National days): each egg shows only in its
// country, on its local day. The country is BigDataCloud's `countryCode` for the place
// (InfoPanel's reverse-geocode call, lifted to SunTracker). Unknown country: no national egg.
// A new country is one row in NATIONAL_DAYS.
export type NationalDayKind =
  | 'festaRepubblica' | 'bastilleDay' | 'independenceDay' | 'guyFawkes'
  | 'germanUnity' | 'fiestaNacional' | 'canadaDay' | 'australiaDay' | 'kingsDay';

// jets: nine small jets cross the day sky once with flag smoke (NationalEggs).
// fireworks: one Fireworks show in the flag colours per night view.
// bunting: small pennant strings in the flag colours on the boats (SceneBoat).
export type NationalDayStyle = 'jets' | 'fireworks' | 'bunting';

export interface NationalDay {
  kind: NationalDayKind;
  country: string; // ISO 3166-1 alpha-2, upper case
  month: number; // 0-11, like Date.getMonth
  day: number;
  style: NationalDayStyle;
  // Tokens in src/index.css (`--national-<name>`), in the flag's order.
  colors: readonly string[];
  // King's Day moves to Apr 26 when Apr 27 is a Sunday.
  sundayToSaturday?: boolean;
  // Guy Fawkes Night: a soft, still bonfire glow on the shore at night.
  bonfire?: boolean;
}

export const NATIONAL_DAYS: readonly NationalDay[] = [
  { kind: 'festaRepubblica', country: 'IT', month: 5, day: 2, style: 'jets', colors: ['it-green', 'white', 'it-red'] },
  { kind: 'bastilleDay', country: 'FR', month: 6, day: 14, style: 'fireworks', colors: ['fr-blue', 'white', 'fr-red'] },
  { kind: 'independenceDay', country: 'US', month: 6, day: 4, style: 'fireworks', colors: ['us-red', 'white', 'us-blue'] },
  { kind: 'guyFawkes', country: 'GB', month: 10, day: 5, style: 'fireworks', colors: ['gb-red', 'white', 'gb-blue'], bonfire: true },
  { kind: 'germanUnity', country: 'DE', month: 9, day: 3, style: 'bunting', colors: ['de-black', 'de-red', 'de-gold'] },
  { kind: 'fiestaNacional', country: 'ES', month: 9, day: 12, style: 'bunting', colors: ['es-red', 'es-yellow'] },
  { kind: 'canadaDay', country: 'CA', month: 6, day: 1, style: 'bunting', colors: ['ca-red', 'white'] },
  { kind: 'australiaDay', country: 'AU', month: 0, day: 26, style: 'bunting', colors: ['au-blue', 'white', 'au-red'] },
  { kind: 'kingsDay', country: 'NL', month: 3, day: 27, style: 'bunting', colors: ['nl-orange', 'white', 'nl-orange', 'nl-blue'], sundayToSaturday: true },
];

// Each national day is one day a year (the egg card's chance text).
export const NATIONAL_DAY_DAYS_PER_YEAR = 1;

const dayIn = (nationalDay: NationalDay, year: number): Date => {
  const day = new Date(year, nationalDay.month, nationalDay.day);
  if (nationalDay.sundayToSaturday && day.getDay() === 0) day.setDate(day.getDate() - 1);
  return day;
};

// The national day of the country on this local day, or null. A calendar event (calendarEvents)
// wins the day, so the scene shows at most one special event (for example Lunar New Year on
// Australia Day 2028).
export const getNationalDay = (date: Date, countryCode: string | null, calendarEvent: CalendarEvent | null = null): NationalDay | null => {
  if (!countryCode || calendarEvent) return null;
  const country = countryCode.toUpperCase();
  return NATIONAL_DAYS.find(d => d.country === country && dayIn(d, date.getFullYear()).toDateString() === date.toDateString()) ?? null;
};

// Test links: `?egg=<kind>` forces that national day (any country, any date; the time-of-day
// rules still apply). `?country=XX` sets the country instead of the detected one. Both pause
// the collection (collection.isCollectionPaused).
export const parseNationalEggOverride = (search: string): NationalDay | null => {
  const egg = new URLSearchParams(search).get('egg');
  return NATIONAL_DAYS.find(d => d.kind === egg) ?? null;
};

export const parseCountryOverride = (search: string): string | null => {
  const country = new URLSearchParams(search).get('country');
  return country && /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : null;
};

// A valid country code from a BigDataCloud answer, or null.
export const countryCodeOf = (data: unknown): string | null => {
  const code = (data as { countryCode?: unknown } | null)?.countryCode;
  return typeof code === 'string' && /^[A-Z]{2}$/.test(code) ? code : null;
};
