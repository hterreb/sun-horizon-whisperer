// The link in a shared card's text (ROADMAP item 188): `/?lat=47.66&lon=9.48&tz=…&t=…` opens
// the app at the card's place and, for a view card, at its moment. Two decimals (about 1 km):
// the card already names the town. `tz` only when the sender knows the place's zone.
import { isValidLatitude, isValidLongitude } from './manualLocation';
import { isValidTimeZone } from './timeZone';

export interface SharedView {
  latitude: number;
  longitude: number;
  timeZone?: string;
  time: Date | null;
}

const SHARE_PARAMS = ['lat', 'lon', 'tz', 't'];
const NUMBER = /^-?\d{1,3}(\.\d{1,8})?$/;
// Minutes in UTC, as buildShareLink writes them: "2026-10-29T16:30Z".
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const buildShareLink = (latitude: number, longitude: number, timeZone?: string, time?: Date): string => {
  let link = `${window.location.origin}/?lat=${round2(latitude)}&lon=${round2(longitude)}`;
  if (timeZone) link += `&tz=${encodeURIComponent(timeZone)}`;
  if (time) link += `&t=${time.toISOString().slice(0, 16)}Z`;
  return link;
};

// null when the place is missing or not a number; a bad `tz` or `t` is dropped alone.
export const parseShareLink = (search: string): SharedView | null => {
  const params = new URLSearchParams(search);
  const lat = params.get('lat');
  const lon = params.get('lon');
  if (lat === null || lon === null || !NUMBER.test(lat) || !NUMBER.test(lon)) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  const tz = params.get('tz');
  const t = params.get('t');
  const ms = t !== null && TIME.test(t) ? Date.parse(t) : NaN;
  return {
    latitude,
    longitude,
    ...(isValidTimeZone(tz) ? { timeZone: tz } : {}),
    time: Number.isNaN(ms) ? null : new Date(ms),
  };
};

// The address without the share params (other params, such as `egg`, stay).
export const withoutShareParams = (href: string): string => {
  const url = new URL(href);
  for (const key of SHARE_PARAMS) url.searchParams.delete(key);
  return url.toString();
};
