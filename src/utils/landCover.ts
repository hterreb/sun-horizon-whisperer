// Land cover for the tree silhouettes (ROADMAP item 141): reads ESA WorldCover 2021 (CC BY 4.0)
// at the ridge points that can carry trees, and caches the result per place like
// terrainTiles caches the horizon profile. The data is the Cloud Optimized GeoTIFF copy on
// Microsoft Planetary Computer: its blob storage and its token API send CORS headers (the
// AWS copy does not), so the browser reads it directly, with HTTP range reads. Each 3° x 3°
// file has 1024 px tiles (DEFLATE, 8 bit, one class per pixel); this module reads the 40 m
// overview, about 150-250 kB per place. No library: the browser's DecompressionStream
// inflates the tiles. Loaded with a dynamic import() only (useTreeCover).

import { destinationPoint, type HorizonProfile } from './horizonUtils';
import { isTreeRidge } from './treeSilhouettes';

const TOKEN_URL = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/esa-worldcover';
const DATA_HOST = 'https://ai4edataeuwest.blob.core.windows.net/esa-worldcover/v200/2021/map';
const FILE_DEG = 3;
// IFD 0 is 10 m; each overview halves it. Level 2 (40 m) is 1-2 tiles per place. Its tree
// share matches the 10 m data (39 % and 39 % around Ravensburg; 91 % of points agree).
const OVERVIEW_LEVEL = 2;
// The IFDs and their tile tables end before 28 kB in these files.
const HEADER_BYTES = 32_768;
// WorldCover classes: 10 tree cover, 95 mangroves.
const TREE_CLASSES = new Set([10, 95]);
const TOKEN_MARGIN_MS = 5 * 60_000;

export const worldCoverFileName = (lat: number, lon: number): string => {
  const lat0 = Math.floor(lat / FILE_DEG) * FILE_DEG;
  const lon0 = Math.floor(lon / FILE_DEG) * FILE_DEG;
  const ns = `${lat0 < 0 ? 'S' : 'N'}${String(Math.abs(lat0)).padStart(2, '0')}`;
  const ew = `${lon0 < 0 ? 'W' : 'E'}${String(Math.abs(lon0)).padStart(3, '0')}`;
  return `ESA_WorldCover_10m_2021_v200_${ns}${ew}_Map.tif`;
};

let token: { value: string; expires: number } | null = null;

// A read-only SAS token for the collection (about 45 min). Kept in memory only.
const getToken = async (signal?: AbortSignal): Promise<string> => {
  if (token && token.expires - Date.now() > TOKEN_MARGIN_MS) return token.value;
  const response = await fetch(TOKEN_URL, { signal });
  if (!response.ok) throw new Error(`Land cover token fetch failed: ${response.status}`);
  const body: { token?: string; 'msft:expiry'?: string } = await response.json();
  if (!body.token) throw new Error('Land cover token missing');
  token = { value: body.token, expires: Date.parse(body['msft:expiry'] ?? '') || Date.now() + TOKEN_MARGIN_MS * 2 };
  return token.value;
};

// The file does not exist (open sea, beyond 84° N or 60° S): no land cover there.
class NoDataError extends Error {}

const readRange = async (url: string, start: number, length: number, signal?: AbortSignal): Promise<ArrayBuffer> => {
  const response = await fetch(url, { headers: { Range: `bytes=${start}-${start + length - 1}` }, signal });
  if (response.status === 404) throw new NoDataError();
  // Anything but 206 would be the whole 100 MB file: stop it.
  if (response.status !== 206) {
    await response.body?.cancel();
    throw new Error(`Land cover range read failed: ${response.status}`);
  }
  return response.arrayBuffer();
};

export interface CogLevel {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  offsets: number[];
  byteCounts: number[];
}

const TYPE_SIZE: Record<number, number> = { 3: 2, 4: 4 };

// Reads one image (IFD) of a little-endian classic TIFF: the size, the tile size and the
// tile table. Throws on anything this reader cannot decode (BigTIFF, another compression,
// a predictor, more than 8 bits), so a format change fails loudly instead of drawing
// wrong trees. `readMore` fetches a tile table that lies beyond the header bytes.
export const parseCogLevel = async (
  header: ArrayBuffer,
  level: number,
  readMore: (start: number, length: number) => Promise<ArrayBuffer>
): Promise<CogLevel> => {
  const view = new DataView(header);
  if (view.getUint16(0) !== 0x4949 || view.getUint16(2, true) !== 42) throw new Error('Not a little-endian classic TIFF');
  let ifd = view.getUint32(4, true);
  for (let i = 0; i < level; i++) {
    ifd = view.getUint32(ifd + 2 + view.getUint16(ifd, true) * 12, true);
    if (!ifd) throw new Error(`TIFF has no image ${level}`);
  }
  const tags = new Map<number, number[]>();
  for (let e = 0; e < view.getUint16(ifd, true); e++) {
    const entry = ifd + 2 + e * 12;
    const size = TYPE_SIZE[view.getUint16(entry + 2, true)];
    if (!size) continue;
    const count = view.getUint32(entry + 4, true);
    const inline = count * size <= 4;
    const at = inline ? entry + 8 : view.getUint32(entry + 8, true);
    const bytes = inline || at + count * size <= header.byteLength ? header : await readMore(at, count * size);
    const base = bytes === header ? at : 0;
    const data = new DataView(bytes);
    const values: number[] = [];
    for (let k = 0; k < count; k++) {
      values.push(size === 2 ? data.getUint16(base + k * 2, true) : data.getUint32(base + k * 4, true));
    }
    tags.set(view.getUint16(entry, true), values);
  }
  const one = (tag: number, fallback?: number): number => {
    const value = tags.get(tag)?.[0] ?? fallback;
    if (value === undefined) throw new Error(`TIFF tag ${tag} missing`);
    return value;
  };
  if (one(259) !== 8 || one(258) !== 8 || one(317, 1) !== 1) throw new Error('Unsupported TIFF encoding');
  return {
    width: one(256),
    height: one(257),
    tileWidth: one(322),
    tileHeight: one(323),
    offsets: tags.get(324) ?? [],
    byteCounts: tags.get(325) ?? [],
  };
};

const inflate = async (data: ArrayBuffer): Promise<Uint8Array> => {
  const stream = new Response(data).body!.pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

// One load: each file's tile table and each tile are read once, however many ridge points
// fall in them.
interface Reader {
  token: string;
  signal?: AbortSignal;
  levels: Map<string, Promise<CogLevel | null>>;
  tiles: Map<string, Promise<Uint8Array | null>>;
}

const once = <T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> => {
  let value = cache.get(key);
  if (!value) {
    value = load();
    cache.set(key, value);
  }
  return value;
};

const orNoData = async <T>(load: Promise<T>): Promise<T | null> => {
  try {
    return await load;
  } catch (error) {
    if (error instanceof NoDataError) return null;
    throw error;
  }
};

// The WorldCover class at (lat, lon), or null where there is no data.
const sampleClass = async (reader: Reader, lat: number, lon: number): Promise<number | null> => {
  const name = worldCoverFileName(lat, lon);
  const url = `${DATA_HOST}/${name}?${reader.token}`;
  const read = (start: number, length: number) => readRange(url, start, length, reader.signal);
  const level = await once(reader.levels, name, () =>
    orNoData(read(0, HEADER_BYTES).then((header) => parseCogLevel(header, OVERVIEW_LEVEL, read)))
  );
  if (!level) return null;
  const lat0 = Math.floor(lat / FILE_DEG) * FILE_DEG;
  const lon0 = Math.floor(lon / FILE_DEG) * FILE_DEG;
  const col = Math.min(level.width - 1, Math.floor(((lon - lon0) / FILE_DEG) * level.width));
  const row = Math.min(level.height - 1, Math.floor(((lat0 + FILE_DEG - lat) / FILE_DEG) * level.height));
  const across = Math.ceil(level.width / level.tileWidth);
  const index = Math.floor(row / level.tileHeight) * across + Math.floor(col / level.tileWidth);
  const tile = await once(reader.tiles, `${name}/${index}`, async () => {
    const byteCount = level.byteCounts[index];
    // A tile with no bytes holds only no-data.
    return byteCount ? inflate(await read(level.offsets[index], byteCount)) : null;
  });
  return tile ? tile[(row % level.tileHeight) * level.tileWidth + (col % level.tileWidth)] : null;
};

const CACHE_KEY_PREFIX = 'terrain_tree_cover_v1_';

// Same key as the horizon profile (terrainTiles): the ridge points depend on the place and
// the eye height.
const cacheKeyFor = (lat: number, lon: number, eyeHeight: number): string =>
  `${CACHE_KEY_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}_${eyeHeight.toFixed(1)}`;

const COVER_PATTERN = /^[01]{360}$/;

const getCachedCover = (key: string): string | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: { cover?: unknown } = JSON.parse(raw);
    return typeof entry?.cover === 'string' && COVER_PATTERN.test(entry.cover) ? entry.cover : null;
  } catch (error) {
    console.error('Error reading tree cover cache:', error);
    return null;
  }
};

const cacheCover = (key: string, cover: string): void => {
  try {
    localStorage.setItem(key, JSON.stringify({ cover, timestamp: Date.now() }));
  } catch (error) {
    console.error('Error caching tree cover:', error);
  }
};

// The land cover at each whole-degree ridge point of `profile`: a string of 360 characters,
// '1' where the ridge point is tree cover. Only the ridge points that can carry trees are
// read (isTreeRidge). The cache comes first; static land cover never expires. A ridge
// point whose read fails counts as no trees, and the result is then not cached, so the
// next visit tries again. When every read fails, this throws.
export const loadTreeCover = async (
  lat: number,
  lon: number,
  profile: HorizonProfile,
  signal?: AbortSignal
): Promise<string> => {
  const key = cacheKeyFor(lat, lon, profile.eyeHeight);
  const cached = getCachedCover(key);
  if (cached) return cached;

  const cover: string[] = new Array(360).fill('0');
  const points: { i: number; lat: number; lon: number }[] = [];
  for (let i = 0; i < 360; i++) {
    const distance = profile.ridgeDistances?.[i];
    if (distance != null && isTreeRidge(profile, i)) points.push({ i, ...destinationPoint(lat, lon, i, distance) });
  }

  const errors: unknown[] = [];
  if (points.length > 0) {
    const reader: Reader = { token: await getToken(signal), signal, levels: new Map(), tiles: new Map() };
    await Promise.all(
      points.map(async (point) => {
        try {
          const value = await sampleClass(reader, point.lat, point.lon);
          if (value !== null && TREE_CLASSES.has(value)) cover[point.i] = '1';
        } catch (error) {
          if (signal?.aborted) throw error;
          errors.push(error);
        }
      })
    );
  }
  if (points.length > 0 && errors.length === points.length) throw errors[0];

  const result = cover.join('');
  if (errors.length === 0) cacheCover(key, result);
  return result;
};
