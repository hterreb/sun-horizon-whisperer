// The link in a shared card's text (ROADMAP item 188): `/?v=<id>` opens the app at the card's
// place and, for a view card, at its moment. The id packs the place (two decimals, about 1 km;
// the card already names the town), the moment, the zone of a searched place and a check
// value. An edited or made-up id is ignored, so no URL opens a hand-chosen place or time
// (both Premium) for free.
// ponytail: the check salt is in the bundle, as is the Premium gate itself; a server-signed
// id helps only once Premium is checked on a server.
import { isValidLatitude, isValidLongitude } from './manualLocation';
import { hashSeed } from './skyCloudUtils';
import { isValidTimeZone } from './timeZone';

export interface SharedView {
  latitude: number;
  longitude: number;
  timeZone?: string;
  time: Date | null;
}

const PARAM = 'v';
const SALT = 'sun-chaser-share-1';
const MINUTE_MS = 60_000;

const check = (payload: string) => hashSeed(SALT + payload).toString(36);

// "4766|948|<minutes base 36>|Europe/Berlin|<check>" in base64url.
export const buildShareLink = (latitude: number, longitude: number, timeZone?: string, time?: Date): string => {
  const minutes = time ? Math.floor(time.getTime() / MINUTE_MS).toString(36) : '';
  const payload = [Math.round(latitude * 100), Math.round(longitude * 100), minutes, timeZone ?? ''].join('|');
  const id = btoa(`${payload}|${check(payload)}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${window.location.origin}/?${PARAM}=${id}`;
};

// null for no id, a broken one or a wrong check value; a bad zone is dropped alone.
export const parseShareLink = (search: string): SharedView | null => {
  const id = new URLSearchParams(search).get(PARAM);
  if (!id) return null;
  let text: string;
  try {
    text = atob(id.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return null;
  }
  const parts = text.split('|');
  if (parts.length !== 5 || parts[4] !== check(parts.slice(0, 4).join('|'))) return null;
  const [lat, lon, minutes, tz] = parts;
  const latitude = Number(lat) / 100;
  const longitude = Number(lon) / 100;
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  const ms = minutes ? parseInt(minutes, 36) * MINUTE_MS : NaN;
  return {
    latitude,
    longitude,
    ...(isValidTimeZone(tz) ? { timeZone: tz } : {}),
    time: Number.isFinite(ms) ? new Date(ms) : null,
  };
};

// The address without the share id (other params, such as `egg`, stay).
export const withoutShareParams = (href: string): string => {
  const url = new URL(href);
  url.searchParams.delete(PARAM);
  return url.toString();
};
