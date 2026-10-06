import { describe, it, expect, vi } from 'vitest';
import {
  PLANES_CACHE_CONTROL, handlePlanesRequest, mapAircraft, mapFeed, parsePlaceQuery, roundPlace,
} from '@/utils/planeFeed';

// ROADMAP item 96: the live radar's proxy (the Vercel Edge function api/planes.ts wraps it).
const query = (q: string) => new URLSearchParams(q);
const request = (q: string, method = 'GET') => new Request(`https://sun-chaser.vercel.app/api/planes${q}`, { method });
const upstreamAircraft = {
  hex: '4b17f9', type: 'adsb_icao', flight: 'SWR47W  ', r: 'HB-JCB', t: 'BCS3', alt_baro: 37000, alt_geom: 38300,
  gs: 477, track: 216.99, lat: 48.003643, lon: 8.290452, seen_pos: 0.159, squawk: '3105', rssi: -12.4, dst: 53.9,
};

describe('roundPlace and parsePlaceQuery', () => {
  it('rounds the place to 0.1° (about 11 km), clamps the latitude and wraps the longitude', () => {
    expect(roundPlace(47.781, 9.612)).toEqual({ lat: 47.8, lon: 9.6 });
    expect(roundPlace(-33.8688, 151.2093)).toEqual({ lat: -33.9, lon: 151.2 });
    expect(roundPlace(95, 190)).toEqual({ lat: 90, lon: -170 });
    expect(roundPlace(-0.04, -180)).toEqual({ lat: 0, lon: 180 });
  });

  it('takes two plain decimal numbers and nothing else', () => {
    expect(parsePlaceQuery(query('lat=47.781&lon=9.612'))).toEqual({ lat: 47.8, lon: 9.6 });
    expect(parsePlaceQuery(query('lat=-91&lon=200'))).toEqual({ lat: -90, lon: -160 });
    for (const bad of ['lat=47.8', 'lon=9.6', 'lat=abc&lon=9.6', 'lat=1e5&lon=9', 'lat=47.8/../x&lon=9', 'lat=&lon=9', 'lat=NaN&lon=9', 'lat=4781&lon=9']) {
      expect(parsePlaceQuery(query(bad))).toBeNull();
    }
  });
});

describe('mapAircraft', () => {
  it('keeps only the fields the app uses, in metres, with a trimmed callsign', () => {
    expect(mapAircraft(upstreamAircraft)).toEqual({
      hex: '4b17f9', callsign: 'SWR47W', type: 'BCS3', altM: 11674, speedKt: 477, track: 216.99,
      lat: 48.003643, lon: 8.290452, ageSec: 0.159,
    });
  });

  it('uses the barometric altitude without a geometric one, and leaves out aircraft on the ground or without a place', () => {
    expect(mapAircraft({ ...upstreamAircraft, alt_geom: undefined })!.altM).toBe(11278);
    expect(mapAircraft({ ...upstreamAircraft, alt_geom: undefined, alt_baro: 'ground' })).toBeNull();
    expect(mapAircraft({ ...upstreamAircraft, lat: undefined })).toBeNull();
    expect(mapAircraft({ ...upstreamAircraft, hex: '<script>' })).toBeNull();
    expect(mapAircraft({ ...upstreamAircraft, flight: '<b>x</b>', t: undefined })).toMatchObject({ callsign: null, type: null });
  });

  it('maps the feed with its data time, and survives a body of another shape', () => {
    const feed = mapFeed({ now: 1_790_000_000_000, ac: [upstreamAircraft, { hex: 'abcdef', alt_baro: 'ground', lat: 1, lon: 1 }, null] }, 5);
    expect(feed.now).toBe(1_790_000_000_000);
    expect(feed.aircraft).toHaveLength(1);
    expect(mapFeed('nonsense', 5)).toEqual({ now: 5, aircraft: [] });
  });
});

describe('handlePlanesRequest', () => {
  const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;

  it('asks adsb.lol for 54 nm (100 km) around the rounded place and caches per cell for 15 s', async () => {
    const fetchFn = ok({ now: 1000, ac: [upstreamAircraft] });
    const response = await handlePlanesRequest(request('?lat=47.781&lon=9.612'), fetchFn);
    expect((fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('https://api.adsb.lol/v2/point/47.8/9.6/54');
    // adsb.lol answers 403 to a generic User-Agent: the request names the app and a contact.
    const init = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^SunChaser\/.+\(\+https:\/\//);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(PLANES_CACHE_CONTROL);
    expect(PLANES_CACHE_CONTROL).toContain('s-maxage=15');
    const body = await response.json();
    expect(body.now).toBe(1000);
    expect(Object.keys(body.aircraft[0]).sort()).toEqual(['ageSec', 'altM', 'callsign', 'hex', 'lat', 'lon', 'speedKt', 'track', 'type']);
  });

  it('answers 400 for a bad place and 405 for another method, without asking adsb.lol', async () => {
    const fetchFn = ok({});
    expect((await handlePlanesRequest(request('?lat=x&lon=9'), fetchFn)).status).toBe(400);
    expect((await handlePlanesRequest(request('?lat=47&lon=9', 'POST'), fetchFn)).status).toBe(405);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('answers 502 with no body and no cache when adsb.lol fails, throws or times out', async () => {
    const failing = [
      vi.fn(async () => new Response('upstream secret details', { status: 503 })),
      vi.fn(async () => { throw new Error('network down'); }),
      vi.fn(async () => new Response('not json', { status: 200 })),
      vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      })),
    ];
    for (const fetchFn of failing) {
      const response = await handlePlanesRequest(request('?lat=47.8&lon=9.6'), fetchFn as unknown as typeof fetch, 20);
      expect(response.status).toBe(502);
      expect(await response.text()).toBe('');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });
});
