import { describe, expect, it } from 'vitest';
import { buildShareLink, parseShareLink, withoutShareParams } from '@/utils/shareLink';

describe('share link (ROADMAP item 188)', () => {
  const search = (link: string) => new URL(link).search;
  const id = (link: string) => new URL(link).searchParams.get('v')!;

  it('is one opaque id, with no readable place or time', () => {
    const link = buildShareLink(47.65891, 9.47912, 'Europe/Berlin', new Date('2026-10-29T16:30:45Z'));
    expect(link).toMatch(new RegExp(`^${window.location.origin}/\\?v=[A-Za-z0-9_-]+$`));
    expect(link).not.toMatch(/47|lat|Berlin/);
  });

  it('reads back the place with two decimals, the zone and the moment in minutes', () => {
    const link = buildShareLink(47.65891, 9.47912, 'Europe/Berlin', new Date('2026-10-29T16:30:45Z'));
    expect(parseShareLink(search(link))).toEqual({
      latitude: 47.66, longitude: 9.48, timeZone: 'Europe/Berlin', time: new Date('2026-10-29T16:30:00Z'),
    });
  });

  it('reads back a southern place, a zone with a plus, and no zone or moment', () => {
    const time = new Date('2026-12-21T15:02:00Z');
    expect(parseShareLink(search(buildShareLink(-33.8688, -151.2093, 'Etc/GMT+5', time))))
      .toEqual({ latitude: -33.87, longitude: -151.21, timeZone: 'Etc/GMT+5', time });
    expect(parseShareLink(search(buildShareLink(0.001, -0.001)))).toEqual({ latitude: 0, longitude: 0, time: null });
  });

  it('ignores plain place and time params', () => {
    expect(parseShareLink('?lat=47.66&lon=9.48&t=2026-10-29T16:30Z')).toBeNull();
  });

  it('ignores an edited, made-up or broken id', () => {
    const real = id(buildShareLink(47.66, 9.48, undefined, new Date('2026-10-29T16:30Z')));
    const [lat, lon, minutes, tz, sum] = atob(real.replace(/-/g, '+').replace(/_/g, '/')).split('|');
    const edited = btoa([lat, Number(lon) + 100, minutes, tz, sum].join('|'));
    expect(parseShareLink(`?v=${edited}`)).toBeNull();
    expect(parseShareLink(`?v=${btoa('4766|948|||abc')}`)).toBeNull();
    expect(parseShareLink('?v=%%%')).toBeNull();
    expect(parseShareLink('?v=')).toBeNull();
    expect(parseShareLink('')).toBeNull();
  });

  it('removes only the share id from the address', () => {
    expect(withoutShareParams('https://sun.chaser.page/?egg=dragon&v=abc')).toBe('https://sun.chaser.page/?egg=dragon');
    expect(withoutShareParams('https://sun.chaser.page/?v=abc')).toBe('https://sun.chaser.page/');
  });
});
