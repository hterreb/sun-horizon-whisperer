import { deflateSync } from 'node:zlib';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadTreeCover, parseCogLevel, worldCoverFileName } from '../src/utils/landCover';
import type { HorizonProfile } from '../src/utils/horizonUtils';

// ROADMAP item 141: the ESA WorldCover reader. The fake file has the real layout (three
// images, the reader takes the third: the 40 m overview), but only 8 x 8 px in 2 x 2 tiles
// for the whole 3° x 3° file, so each tile is a 1.5° quarter.

const TILE = 4;
const SIZE = 8;

interface FakeTiff {
  bytes: Uint8Array;
}

// A little-endian classic TIFF: IFD 0 and 1 are empty, IFD 2 holds the tiles.
const makeTiff = (tileClasses: number[], options: { compression?: number } = {}): FakeTiff => {
  const tiles = tileClasses.map((value) => deflateSync(new Uint8Array(TILE * TILE).fill(value)));
  const ifd2 = 8 + 6 + 6;
  const entries: [number, number, number, number][] = [];
  const arraysAt = ifd2 + 2 + 8 * 12 + 4;
  const dataAt = arraysAt + 2 * 4 * tiles.length;
  const offsets: number[] = [];
  let at = dataAt;
  for (const tile of tiles) {
    offsets.push(at);
    at += tile.length;
  }
  entries.push(
    [256, 3, 1, SIZE],
    [257, 3, 1, SIZE],
    [258, 3, 1, 8],
    [259, 3, 1, options.compression ?? 8],
    [322, 3, 1, TILE],
    [323, 3, 1, TILE],
    [324, 4, tiles.length, arraysAt],
    [325, 4, tiles.length, arraysAt + 4 * tiles.length]
  );
  const buffer = new ArrayBuffer(at);
  const view = new DataView(buffer);
  view.setUint16(0, 0x4949);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  // IFD 0 and IFD 1: no entries, then the next IFD.
  view.setUint16(8, 0, true);
  view.setUint32(10, 14, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, ifd2, true);
  view.setUint16(ifd2, entries.length, true);
  entries.forEach(([tag, type, count, value], e) => {
    const entry = ifd2 + 2 + e * 12;
    view.setUint16(entry, tag, true);
    view.setUint16(entry + 2, type, true);
    view.setUint32(entry + 4, count, true);
    if (type === 3 && count === 1) view.setUint16(entry + 8, value, true);
    else view.setUint32(entry + 8, value, true);
  });
  view.setUint32(ifd2 + 2 + entries.length * 12, 0, true);
  tiles.forEach((tile, i) => {
    view.setUint32(arraysAt + i * 4, offsets[i], true);
    view.setUint32(arraysAt + 4 * tiles.length + i * 4, tile.length, true);
    new Uint8Array(buffer, offsets[i], tile.length).set(tile);
  });
  return { bytes: new Uint8Array(buffer) };
};

// The observer on the corner of the four tiles of file N45E009 (45-48° N, 9-12° E): the
// ridge points to the NW, NE, SW and SE fall in tiles 0, 1, 2 and 3.
const LAT = 46.5;
const LON = 10.5;
const FILE = 'ESA_WorldCover_10m_2021_v200_N45E009_Map.tif';

const makeProfile = (): HorizonProfile => ({
  angles: new Array(360).fill(2),
  observerElevation: 400,
  eyeHeight: 1.7,
  ridgeDistances: new Array(360).fill(3000),
  ridgeHeights: new Array(360).fill(700),
});

type Responder = (url: string, range: string | null) => Response;

const serve = (files: Record<string, FakeTiff>, override?: Responder) =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const range = new Headers(init?.headers).get('Range');
    const custom = override?.(url, range);
    if (custom) return custom;
    if (url.includes('/api/sas/v1/token/esa-worldcover')) {
      return new Response(JSON.stringify({ token: 'sig=test', 'msft:expiry': new Date(Date.now() + 45 * 60_000).toISOString() }));
    }
    const name = Object.keys(files).find((file) => url.includes(`/${file}?sig=test`));
    if (!name) return new Response(null, { status: 404 });
    const [start, end] = range!.replace('bytes=', '').split('-').map(Number);
    return new Response(files[name].bytes.slice(start, end + 1), { status: 206 });
  });

const rangeCalls = (fetchMock: ReturnType<typeof serve>) =>
  fetchMock.mock.calls.filter(([, init]) => new Headers(init?.headers).has('Range')).length;

describe('worldCoverFileName', () => {
  it('names the 3° file by its south-west corner', () => {
    expect(worldCoverFileName(47.78, 9.61)).toBe('ESA_WorldCover_10m_2021_v200_N45E009_Map.tif');
    expect(worldCoverFileName(48.0, 8.2)).toBe('ESA_WorldCover_10m_2021_v200_N48E006_Map.tif');
    expect(worldCoverFileName(-33.9, 18.4)).toBe('ESA_WorldCover_10m_2021_v200_S36E018_Map.tif');
    expect(worldCoverFileName(40.7, -74.0)).toBe('ESA_WorldCover_10m_2021_v200_N39W075_Map.tif');
  });
});

describe('parseCogLevel', () => {
  it('reads the size and the tile table of the third image', async () => {
    const { bytes } = makeTiff([10, 10, 30, 95]);
    const level = await parseCogLevel(bytes.buffer as ArrayBuffer, 2, () => Promise.reject(new Error('no more')));
    expect(level).toMatchObject({ width: SIZE, height: SIZE, tileWidth: TILE, tileHeight: TILE });
    expect(level.offsets).toHaveLength(4);
    expect(level.byteCounts.every((count) => count > 0)).toBe(true);
  });

  it('fetches a tile table that lies beyond the header bytes', async () => {
    const { bytes } = makeTiff([10, 10, 30, 95]);
    // The tile table starts at byte 122.
    const header = bytes.slice(0, 122).buffer as ArrayBuffer;
    const readMore = vi.fn((start: number, length: number) => Promise.resolve(bytes.slice(start, start + length).buffer as ArrayBuffer));
    const level = await parseCogLevel(header, 2, readMore);
    expect(readMore).toHaveBeenCalled();
    expect(level.offsets).toEqual((await parseCogLevel(bytes.buffer as ArrayBuffer, 2, readMore)).offsets);
  });

  it('fails loudly on an encoding it cannot read', async () => {
    const { bytes } = makeTiff([10, 10, 30, 95], { compression: 5 });
    await expect(parseCogLevel(bytes.buffer as ArrayBuffer, 2, () => Promise.reject(new Error('no')))).rejects.toThrow(/Unsupported/);
  });
});

describe('loadTreeCover', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('marks the ridge points that are tree cover (10) or mangroves (95)', async () => {
    // Tiles: 0 NW trees, 1 NE trees, 2 SW grassland, 3 SE mangroves.
    const fetchMock = serve({ [FILE]: makeTiff([10, 10, 30, 95]) });
    globalThis.fetch = fetchMock as typeof fetch;
    const cover = await loadTreeCover(LAT, LON, makeProfile());
    expect(cover).toHaveLength(360);
    expect([cover[45], cover[135], cover[225], cover[315]]).toEqual(['1', '1', '0', '1']);
    // The header once, then each of the four tiles once.
    expect(rangeCalls(fetchMock)).toBe(5);
  });

  it('reads only the ridge points that can carry trees', async () => {
    const profile = makeProfile();
    for (let i = 40; i < 50; i++) profile.angles[i] = 0;
    for (let i = 300; i < 310; i++) profile.ridgeDistances![i] = 9000;
    globalThis.fetch = serve({ [FILE]: makeTiff([10, 10, 10, 10]) }) as typeof fetch;
    const cover = await loadTreeCover(LAT, LON, profile);
    expect(cover.slice(40, 50)).toBe('0'.repeat(10));
    expect(cover.slice(300, 310)).toBe('0'.repeat(10));
    expect(cover[60]).toBe('1');
  });

  it('loads nothing when no ridge point can carry trees', async () => {
    const fetchMock = serve({});
    globalThis.fetch = fetchMock as typeof fetch;
    const cover = await loadTreeCover(LAT, LON, { ...makeProfile(), angles: new Array(360).fill(0) });
    expect(cover).toBe('0'.repeat(360));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caches the cover per place, so the second load reads nothing', async () => {
    const fetchMock = serve({ [FILE]: makeTiff([10, 10, 30, 95]) });
    globalThis.fetch = fetchMock as typeof fetch;
    const first = await loadTreeCover(LAT, LON, makeProfile());
    fetchMock.mockClear();
    expect(await loadTreeCover(LAT, LON, makeProfile())).toBe(first);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts a missing file (open sea) as no trees, and caches that', async () => {
    globalThis.fetch = serve({}) as typeof fetch;
    expect(await loadTreeCover(LAT, LON, makeProfile())).toBe('0'.repeat(360));
    expect(Object.keys(localStorage)).toHaveLength(1);
  });

  it('keeps the trees it could read when a tile fails, but does not cache them', async () => {
    const tiff = makeTiff([10, 10, 30, 95]);
    const tile1 = new DataView(tiff.bytes.buffer).getUint32(20 + 2 + 8 * 12 + 4 + 4, true);
    globalThis.fetch = serve({ [FILE]: tiff }, (_url, range) =>
      range?.startsWith(`bytes=${tile1}-`) ? new Response(null, { status: 503 }) : (undefined as unknown as Response)
    ) as typeof fetch;
    const cover = await loadTreeCover(LAT, LON, makeProfile());
    expect([cover[45], cover[315]]).toEqual(['0', '1']);
    expect(Object.keys(localStorage)).toHaveLength(0);
  });

  it('throws when every read fails, and never takes a whole file', async () => {
    globalThis.fetch = serve({}, (url) =>
      url.includes('blob.core.windows.net') ? new Response('the whole file', { status: 200 }) : (undefined as unknown as Response)
    ) as typeof fetch;
    await expect(loadTreeCover(LAT, LON, makeProfile())).rejects.toThrow(/range read failed: 200/);
    expect(Object.keys(localStorage)).toHaveLength(0);
  });
});
