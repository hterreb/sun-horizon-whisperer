import { getNextFullMoon } from './moonUtils';
import { type SunTimes } from './sunUtils';
import { getFestivalDay, getFestivalSpan, type FestivalEvent } from './festivalEvents';

// Calendar easter eggs (ROADMAP "Ongoing - Easter eggs", Calendar list). Pure date
// checks in local time; the scene shows at most one event at a time.
export type CalendarEvent =
  | 'new-year' // 00:00-00:00:59 on Jan 1: fireworks
  | 'friday-13' // a black cat walks along the horizon once
  | 'lunar-new-year' // a dragon flies across the sky once (ROADMAP item 100)
  | 'solstice-longest' // the solstice day with the longest day for this hemisphere
  | 'solstice-shortest'
  | 'equinox'
  | 'halloween-pumpkin' // Oct 31, full moon within 3 days: a pumpkin moon
  | 'halloween-bats' // Oct 31, else: bats all night
  | 'christmas' // Dec 24-26: light snow
  | FestivalEvent; // item 117: cultural festivals (festivalEvents.ts); 'nowruz' is the March equinox

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

const sameLocalDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// Lunar New Year (ROADMAP item 100), Hong Kong Observatory dates. Extend the list in 2035.
const LUNAR_NEW_YEAR = ['2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19', '2035-02-08'];
const localIsoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getSeasonEvent = (date: Date, latitude: number): CalendarEvent | null => {
  const month = date.getMonth();
  if (month !== 2 && month !== 5 && month !== 8 && month !== 11) return null;
  if (!sameLocalDay(getSeasonInstant(date.getFullYear(), month), date)) return null;
  // Item 117: the March equinox is also Nowruz; it keeps the equinox pill and badge.
  if (month === 2) return 'nowruz';
  if (month === 8) return 'equinox';
  // June is the longest day in the north and the shortest in the south.
  return (month === 5) === (latitude >= 0) ? 'solstice-longest' : 'solstice-shortest';
};

// The full moon is "within 3 days of Oct 31" when it falls on Oct 28 - Nov 3.
const isHalloweenFullMoon = (year: number) => getNextFullMoon(new Date(year, 9, 28)) < new Date(year, 10, 4);

// One event id, or null. When two could apply, the most specific (shortest) wins:
// the New Year minute, then single days (Lunar New Year, the one-day festivals of item 117,
// Friday the 13th, solstice/equinox/Nowruz, Halloween), then the 3 Christmas days, then the
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
  if (month === 9 && day === 31) return isHalloweenFullMoon(date.getFullYear()) ? 'halloween-pumpkin' : 'halloween-bats';
  if (month === 11 && day >= 24 && day <= 26) return 'christmas';
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
// midnight. He is part of the 'christmas' event (no more specific event falls on Dec 24).
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
