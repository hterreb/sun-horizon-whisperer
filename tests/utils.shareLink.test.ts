import { describe, expect, it } from 'vitest';
import { buildShareLink, parseShareLink, withoutShareParams } from '@/utils/shareLink';

describe('share link (ROADMAP item 187)', () => {
  const search = (link: string) => new URL(link).search;

  it('rounds the place to two decimals and writes the moment in UTC minutes', () => {
    const link = buildShareLink(47.65891, 9.47912, 'Europe/Berlin', new Date('2026-10-29T16:30:45Z'));
    expect(link).toBe(`${window.location.origin}/?lat=47.66&lon=9.48&tz=Europe%2FBerlin&t=2026-10-29T16:30Z`);
  });

  it('reads back what it writes, also a zone with a plus', () => {
    const time = new Date('2026-12-21T15:02:00Z');
    expect(parseShareLink(search(buildShareLink(-33.8688, 151.2093, 'Etc/GMT+5', time))))
      .toEqual({ latitude: -33.87, longitude: 151.21, timeZone: 'Etc/GMT+5', time });
  });

  it('leaves out the zone and the moment when there are none', () => {
    expect(buildShareLink(0.001, -0.001)).toBe(`${window.location.origin}/?lat=0&lon=0`);
    expect(parseShareLink('?lat=0&lon=0')).toEqual({ latitude: 0, longitude: 0, time: null });
  });

  it('gives null for a missing or bad place', () => {
    expect(parseShareLink('')).toBeNull();
    expect(parseShareLink('?lat=47.6')).toBeNull();
    expect(parseShareLink('?lat=91&lon=9')).toBeNull();
    expect(parseShareLink('?lat=1e2&lon=9')).toBeNull();
    expect(parseShareLink('?lat=47.6&lon=abc')).toBeNull();
  });

  it('drops a bad zone or moment alone', () => {
    expect(parseShareLink('?lat=47.6&lon=9.5&tz=Mars/Olympus&t=yesterday'))
      .toEqual({ latitude: 47.6, longitude: 9.5, time: null });
    expect(parseShareLink('?lat=47.6&lon=9.5&t=2026-13-45T99:99Z')?.time).toBeNull();
  });

  it('removes only the share params from the address', () => {
    expect(withoutShareParams('https://sun.chaser.page/?egg=dragon&lat=1&lon=2&tz=UTC&t=2026-10-29T16:30Z'))
      .toBe('https://sun.chaser.page/?egg=dragon');
    expect(withoutShareParams('https://sun.chaser.page/?lat=1&lon=2')).toBe('https://sun.chaser.page/');
  });
});
