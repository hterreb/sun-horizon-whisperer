import { getEasterSunday } from './easterDate';
import { type TimeOfDay } from './sunUtils';

// Cultural festival eggs (ROADMAP item 118). Pure date checks in local time, like
// calendarEvents.ts; getCalendarEvent calls them in its priority order. The tables give the
// main day of each festival for 2026-2035. Extend them in 2035.

// Event id -> the egg kind (badge `egg:<kind>`, `?egg=<kind>`, info card).
export const FESTIVALS = {
  'loy-krathong': 'loyKrathong',
  diwali: 'diwali',
  'eid-al-fitr': 'eidAlFitr',
  'mid-autumn': 'midAutumn',
  holi: 'holi',
  tanabata: 'tanabata',
  nowruz: 'nowruz',
  midsummer: 'midsummer',
  'dia-de-muertos': 'diaDeMuertos',
  carnival: 'carnival',
  hanukkah: 'hanukkah',
  hanami: 'hanami',
} as const;
export type FestivalEvent = keyof typeof FESTIVALS;
export type FestivalEgg = (typeof FESTIVALS)[FestivalEvent];

// Loy Krathong: the full moon of the 12th Thai lunar month (Tourism Authority of Thailand
// dates to 2030; later years from the full moon in Thai time and the 19-year moon cycle).
const LOY_KRATHONG = ['2026-11-24', '2027-11-13', '2028-11-02', '2029-11-21', '2030-11-10', '2031-11-28', '2032-11-17', '2033-11-06', '2034-11-25', '2035-11-15'];
// Diwali: the Lakshmi Puja day (Drik Panchang, New Delhi).
const DIWALI = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26', '2031-11-14', '2032-11-02', '2033-10-22', '2034-11-10', '2035-10-30'];
// Eid al-Fitr: 1 Shawwal of the Umm al-Qura calendar. The local day can differ by one day
// where the moon sighting decides. 2033 has two.
const EID_AL_FITR = ['2026-03-20', '2027-03-09', '2028-02-26', '2029-02-14', '2030-02-04', '2031-01-24', '2032-01-14', '2033-01-03', '2033-12-23', '2034-12-12', '2035-12-01'];
// Mid-Autumn Festival: the 15th day of the 8th Chinese lunar month.
const MID_AUTUMN = ['2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01', '2032-09-19', '2033-09-08', '2034-09-27', '2035-09-16'];
// Holi: the day of colours (Dhulandi), the day after Holika Dahan at the Phalguna full moon.
const HOLI = ['2026-03-04', '2027-03-22', '2028-03-11', '2029-03-01', '2030-03-20', '2031-03-09', '2032-03-27', '2033-03-16', '2034-03-05', '2035-03-24'];
// Hanukkah: the eve of 25 Kislev, when the first light is lit at sunset.
const HANUKKAH_EVE = ['2026-12-04', '2027-12-24', '2028-12-12', '2029-12-01', '2030-12-20', '2031-12-09', '2032-11-27', '2033-12-16', '2034-12-06', '2035-12-25'];

export const FESTIVAL_TABLE_YEARS = { first: 2026, last: 2035 };

const localIsoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Whole local days from a to b (DST-safe).
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
const fromIso = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

// Hanukkah: the night (1-8) whose light is lit on the evening of this day, or null.
export const getHanukkahNight = (date: Date): number | null => {
  for (const eve of HANUKKAH_EVE) {
    const index = daysBetween(fromIso(eve), date);
    if (index >= 0 && index < 8) return index + 1;
  }
  return null;
};

// Carnival: the Thursday before Shrove Tuesday to Shrove Tuesday (Easter - 52 to Easter - 47).
export const isCarnival = (date: Date): boolean => {
  const toEaster = daysBetween(date, getEasterSunday(date.getFullYear()));
  return toEaster >= 47 && toEaster <= 52;
};

// Midsummer: Midsummer Eve (the Friday of Jun 19-25) and the Saturday after it.
export const isMidsummer = (date: Date): boolean => {
  if (date.getMonth() !== 5) return false;
  const day = date.getDate();
  const weekday = date.getDay();
  return (weekday === 5 && day >= 19 && day <= 25) || (weekday === 6 && day >= 20 && day <= 26);
};

// The one-day festivals. They win over Friday the 13th, the solstice and Halloween.
// On a tie, the first in this order wins.
export const getFestivalDay = (date: Date): FestivalEvent | null => {
  const day = localIsoDay(date);
  if (EID_AL_FITR.includes(day)) return 'eid-al-fitr';
  if (DIWALI.includes(day)) return 'diwali';
  if (HOLI.includes(day)) return 'holi';
  if (LOY_KRATHONG.includes(day)) return 'loy-krathong';
  if (MID_AUTUMN.includes(day)) return 'mid-autumn';
  if (date.getMonth() === 6 && date.getDate() === 7) return 'tanabata';
  return null;
};

// The festivals of several days, shortest first. They come after Christmas.
// Hanami: Mar 25 - Apr 10, in Japan only when the country is known (ISO 3166 code).
export const getFestivalSpan = (date: Date, country?: string | null): FestivalEvent | null => {
  const month = date.getMonth();
  const day = date.getDate();
  if (isMidsummer(date)) return 'midsummer';
  if (month === 10 && (day === 1 || day === 2)) return 'dia-de-muertos';
  if (isCarnival(date)) return 'carnival';
  if (getHanukkahNight(date) !== null) return 'hanukkah';
  const hanamiDays = (month === 2 && day >= 25) || (month === 3 && day <= 10);
  if (hanamiDays && (!country || country.toUpperCase() === 'JP')) return 'hanami';
  return null;
};

export const isFestivalEvent = (event: string | null): event is FestivalEvent =>
  !!event && Object.prototype.hasOwnProperty.call(FESTIVALS, event);

// `?egg=<kind>` (the egg kind, any case) forces a festival, for testing.
export const parseFestivalOverride = (search: string): FestivalEvent | null => {
  const egg = new URLSearchParams(search).get('egg')?.toLowerCase();
  if (!egg) return null;
  return (Object.keys(FESTIVALS) as FestivalEvent[]).find(e => FESTIVALS[e].toLowerCase() === egg) ?? null;
};

// The sky is dark: night, astronomical or nautical twilight (CalendarEggs' rule).
export const isDarkSky = (timeOfDay: TimeOfDay): boolean =>
  timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';

// The sun is low or down: the evening, the twilights and the night (Midsummer bonfires; at
// 60° N in June the sky never gets dark).
export const isLowSun = (timeOfDay: TimeOfDay): boolean =>
  isDarkSky(timeOfDay) || timeOfDay === 'civil-twilight' || timeOfDay === 'evening';

export interface FestivalShowOptions {
  timeOfDay: TimeOfDay;
  weatherType: string;
  reducedMotion: boolean;
}

// True when FestivalEggs really draws the festival (the badge counts only then).
// Things that drift or fall (petals, confetti) are hidden under reduced motion; things that
// float or glow stay, without motion. Holi needs clouds to tint.
export const isFestivalShown = (event: FestivalEvent, o: FestivalShowOptions): boolean => {
  switch (event) {
    case 'eid-al-fitr':
    case 'nowruz':
    case 'dia-de-muertos': return true;
    case 'loy-krathong':
    case 'diwali':
    case 'mid-autumn':
    case 'tanabata':
    case 'hanukkah': return isDarkSky(o.timeOfDay);
    case 'midsummer': return isLowSun(o.timeOfDay);
    case 'holi': return !isDarkSky(o.timeOfDay) && o.weatherType !== 'clear';
    case 'hanami':
    case 'carnival': return !isDarkSky(o.timeOfDay) && !o.reducedMotion;
  }
};
