import { getNextFullMoon } from './moonUtils';
import { type SunTimes } from './sunUtils';
import { isEasterSunday } from './playfulEggs';
import { getFestivalDay, getFestivalSpan, type FestivalEvent } from './festivalEvents';

// Calendar easter eggs (ROADMAP "Ongoing - Easter eggs", Calendar list). Pure date
// checks in local time; the scene shows at most one event at a time.
export type CalendarEvent =
  | 'new-year' // 00:00-00:00:59 on Jan 1: fireworks
  | 'friday-13' // a black cat sits on a shore rock all day and watches the sky
  | 'lunar-new-year' // a dragon flies across the sky once (ROADMAP item 100)
  | 'solstice-longest' // the solstice day with the longest day for this hemisphere
  | 'solstice-shortest'
  | 'equinox'
  | 'halloween-pumpkin' // Oct 31, full moon within 3 days: a pumpkin moon
  | 'halloween-bats' // Oct 31, else: bats all night
  | 'christmas' // Dec 25-26: Christmas lights on the boats (Santa flies on Dec 24: isSantaTime)
  // Playful pack (ROADMAP item 117)
  | 'easter' // Easter Sunday: the empty tomb, from sunrise to 12:00
  | 'april-fools' // Apr 1: the sun and the moon swap places for one minute
  | 'valentine' // Feb 14: a heart-shaped day cloud
  | 'st-patrick' // Mar 17: a pot of gold at the end of the rainbow
  | FestivalEvent; // item 118: cultural festivals (festivalEvents.ts); 'nowruz' is the March equinox

// Mean solstice/equinox instants, Meeus "Astronomical Algorithms" table 27.B
// (years 2000-3000). No periodic terms, so the error is up to about 30 min; this
// matters only when the instant is close to local midnight.
const SEASON_JDE0: Record<number, number[]> = {
  2: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057], // March equinox
  5: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003], // June solstice
  8: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078], // September equinox
  11: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032], // December solstice
};

export const getSeasonInstant = (year: number, month: 2 | 5 | 8 | 11): Date => {
  const y = (year - 2000) / 1000;
  const jde = SEASON_JDE0[month].reduce((sum, c, i) => sum + c * y ** i, 0);
  return new Date((jde - 2440587.5) * 86_400_000);
};

// The solstice/equinox egg's sun-path fan, like a sundial chart: the June solstice, equinox
// and December solstice days (the same three in the south), each at today's clock time, so
// getSunPathAround picks the same pass (current or next) as today's arc. The day that is
// today keeps `date` itself and is marked `today`. The equinox is today's on an equinox
// (March on Nowruz), else September's. Empty for any other event.
const ONE_DAY_MS = 86_400_000;
export type SeasonPath = 'june' | 'equinox' | 'december';
export const getSolsticeTraceDates = (
  event: CalendarEvent | null,
  date: Date
): { season: SeasonPath; date: Date; today: boolean }[] => {
  if (event !== 'solstice-longest' && event !== 'solstice-shortest' && event !== 'equinox' && event !== 'nowruz') return [];
  const month = date.getMonth();
  const seasons = [['june', 5], ['equinox', month === 2 ? 2 : 8], ['december', 11]] as const;
  return seasons.map(([season, m]) => {
    if (m === month) return { season, date, today: true };
    const days = Math.round((getSeasonInstant(date.getFullYear(), m).getTime() - date.getTime()) / ONE_DAY_MS);
    return { season, date: new Date(date.getTime() + days * ONE_DAY_MS), today: false };
  });
};

const sameLocalDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// Lunar New Year (ROADMAP item 100), Hong Kong Observatory dates. Extend the list in 2035.
const LUNAR_NEW_YEAR = ['2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19', '2035-02-08'];
const localIsoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getSeasonEvent = (date: Date, latitude: number): CalendarEvent | null => {
  const month = date.getMonth();
  if (month !== 2 && month !== 5 && month !== 8 && month !== 11) return null;
  if (!sameLocalDay(getSeasonInstant(date.getFullYear(), month), date)) return null;
  // Item 118: the March equinox is also Nowruz; it keeps the equinox pill and badge.
  if (month === 2) return 'nowruz';
  if (month === 8) return 'equinox';
  // June is the longest day in the north and the shortest in the south.
  return (month === 5) === (latitude >= 0) ? 'solstice-longest' : 'solstice-shortest';
};

// The full moon is "within 3 days of Oct 31" when it falls on Oct 28 - Nov 3.
const isHalloweenFullMoon = (year: number) => getNextFullMoon(new Date(year, 9, 28)) < new Date(year, 10, 4);

// One event id, or null. When two could apply, the most specific (shortest) wins:
// the New Year minute, then single days (Lunar New Year, the one-day festivals of item 118,
// Friday the 13th, solstice/equinox/Nowruz, Halloween), then the 2 Christmas days, then the
// festivals of several days (Midsummer, Día de los Muertos, Carnival, Hanukkah, Hanami).
// Without a latitude, the north is assumed. `country` (ISO 3166 code) limits Hanami to Japan;
// without it, Hanami shows for everyone.
export const getCalendarEvent = (date: Date, latitude = 0, country?: string | null): CalendarEvent | null => {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 0 && day === 1 && date.getHours() === 0 && date.getMinutes() === 0) return 'new-year';
  if (LUNAR_NEW_YEAR.includes(localIsoDay(date))) return 'lunar-new-year';
  const festivalDay = getFestivalDay(date);
  if (festivalDay) return festivalDay;
  if (day === 13 && date.getDay() === 5) return 'friday-13';
  const season = getSeasonEvent(date, latitude);
  if (season) return season;
  // Playful pack (ROADMAP item 117). Easter wins over April Fools (Apr 1 2029, 2040).
  if (isEasterSunday(date)) return 'easter';
  if (month === 3 && day === 1) return 'april-fools';
  if (month === 1 && day === 14) return 'valentine';
  if (month === 2 && day === 17) return 'st-patrick';
  if (month === 9 && day === 31) return isHalloweenFullMoon(date.getFullYear()) ? 'halloween-pumpkin' : 'halloween-bats';
  if (month === 11 && day >= 25 && day <= 26) return 'christmas';
  return getFestivalSpan(date, country);
};

// Item 113 (egg info cards): the mean number of days a year that show this event, over the
// years of the Lunar New Year list. It asks getCalendarEvent at noon of each day, so it follows
// the rules above (the most specific event wins a day). The New Year minute gives 0.
const STATS_YEARS = LUNAR_NEW_YEAR.map(day => Number(day.slice(0, 4)));
const daysPerYear = new Map<CalendarEvent, number>();
export const getEventDaysPerYear = (event: CalendarEvent): number => {
  const cached = daysPerYear.get(event);
  if (cached !== undefined) return cached;
  let days = 0;
  for (const year of STATS_YEARS) {
    for (let d = new Date(year, 0, 1, 12); d.getFullYear() === year; d = new Date(year, d.getMonth(), d.getDate() + 1, 12)) {
      if (getCalendarEvent(d) === event) days += 1;
    }
  }
  const mean = days / STATS_YEARS.length;
  daysPerYear.set(event, mean);
  return mean;
};

// Christmas Eve (ROADMAP "Ongoing", Calendar): Santa flies once on Dec 24, from sunset to local
// midnight. He is not part of the 'christmas' event: the boats' lights start on Dec 25.
// `sunTimes` are the scene's sun times for this day. At polar day there is no night, so no Santa.
// At polar night the sunset field holds the 18:00 fallback, so he flies from 18:00.
// Between 00:00 and solar midnight the sun times can hold the Dec 23 sunset (SunCalc takes the
// nearest solar noon), so the sunset must be on the same local day.
export const SANTA_DAYS_PER_YEAR = 1;
export const isSantaTime = (date: Date, sunTimes: Pick<SunTimes, 'sunset' | 'polar'> | null): boolean => {
  if (date.getMonth() !== 11 || date.getDate() !== 24) return false;
  if (!sunTimes || sunTimes.polar === 'day') return false;
  if (!sameLocalDay(sunTimes.sunset, date)) return false;
  return date.getTime() >= sunTimes.sunset.getTime();
};

// Info-card ring ids of the lazy calendar eggs. Here, not in their component files, so
// CalendarEggs can use them without loading the components (ROADMAP item 125).
export const DRAGON_RING = 'egg-dragon';
export const SANTA_RING = 'egg-santa';
