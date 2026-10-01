// Line of sight with terrain (ROADMAP item 13): fetches AWS/Mapzen Terrarium elevation
// tiles, decodes them, and builds/caches the HorizonProfile the InfoPanel needs. Pure
// math (the horizon/rise-set search) lives in horizonUtils.ts; this module only does
// I/O - fetch, canvas decode, localStorage.

import {
  computeHorizonProfile,
  type ElevationSampler,
  type HorizonProfile,
} from './horizonUtils';

// Shown as "Terrain: <source>" in the UI language (ROADMAP item 67).
export const TERRAIN_SOURCE = 'Mapzen / AWS Terrain Tiles';

// Terrarium PNG encoding: elevation in metres from the R/G/B channels (0-255 each).
export const decodeTerrarium = (r: number, g: number, b: number): number =>
  r * 256 + g + b / 256 - 32768;

const TILE_HOST = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const tileUrl = (z: number, x: number, y: number): string => `${TILE_HOST}/${z}/${x}/${y}.png`;

const TILE_SIZE = 256;
const NEAR_FIELD_ZOOM = 12; // near field: up to ~5 km
const FAR_FIELD_ZOOM = 10; // far field: up to ~50 km
const NEAR_FIELD_RADIUS_M = 5_000;
const FAR_FIELD_RADIUS_M = 50_000;
const EARTH_RADIUS_M = 6_371_000;

export interface TerrainTile {
  z: number;
  x: number;
  y: number;
  width: number;
  height: number;
  elevations: Float32Array; // row-major, length width*height, metres
}

interface TileKey {
  z: number;
  x: number;
  y: number;
}

const lonToTileXFloat = (lonDeg: number, zoom: number): number => ((lonDeg + 180) / 360) * 2 ** zoom;

const latToTileYFloat = (latDeg: number, zoom: number): number => {
  const latRad = (latDeg * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** zoom;
};

// Every slippy-map tile (z, x, y) whose area overlaps a `radiusM` circle around (lat,
// lon), clamped to the valid tile index range at that zoom.
const boundingBoxTiles = (lat: number, lon: number, radiusM: number, zoom: number): TileKey[] => {
  const latDeltaDeg = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const lonDeltaDeg = latDeltaDeg / Math.max(0.01, Math.cos((lat * Math.PI) / 180));

  const minTileX = Math.floor(lonToTileXFloat(lon - lonDeltaDeg, zoom));
  const maxTileX = Math.floor(lonToTileXFloat(lon + lonDeltaDeg, zoom));
  // Latitude increases northward; tile Y increases southward, so north/south swap.
  const minTileY = Math.floor(latToTileYFloat(lat + latDeltaDeg, zoom));
  const maxTileY = Math.floor(latToTileYFloat(lat - latDeltaDeg, zoom));

  const maxIndex = 2 ** zoom - 1;
  const tiles: TileKey[] = [];
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      if (x < 0 || y < 0 || x > maxIndex || y > maxIndex) continue;
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
};

// fetch -> createImageBitmap -> OffscreenCanvas (fallback: a regular canvas) ->
// getImageData -> decodeTerrarium per pixel.
const decodeTileImage = async (
  blob: Blob
): Promise<{ width: number; height: number; elevations: Float32Array }> => {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
  }
  if (!ctx) throw new Error('2D canvas context unavailable for terrain tile decode');

  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);

  const elevations = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    elevations[i] = decodeTerrarium(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }
  return { width, height, elevations };
};

const fetchTerrainTile = async (
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal
): Promise<TerrainTile> => {
  const response = await fetch(tileUrl(z, x, y), { signal });
  if (!response.ok) throw new Error(`Terrain tile fetch failed: ${response.status}`);
  const blob = await response.blob();
  const { width, height, elevations } = await decodeTileImage(blob);
  return { z, x, y, width, height, elevations };
};

// Fetches every tile in `keys` in parallel. A single tile's failure (network error,
// missing tile, decode error) is treated as a data gap rather than failing the whole
// batch - the resulting sampler simply returns null there (see computeHorizonProfile's
// handling of that). An abort is different: it means the caller no longer wants this
// profile at all, so it propagates instead of being swallowed.
const settleTiles = async (keys: TileKey[], signal?: AbortSignal): Promise<TerrainTile[]> => {
  const settled = await Promise.all(
    keys.map(async (key) => {
      try {
        return await fetchTerrainTile(key.z, key.x, key.y, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        return null;
      }
    })
  );
  return settled.filter((tile): tile is TerrainTile => tile !== null);
};

const tileKey = (z: number, x: number, y: number): string => `${z}/${x}/${y}`;

// Bilinear sample of one pixel value plus its right/below/diagonal neighbours, which
// may live in an adjacent tile - looked up by wrapping the pixel coordinate into that
// tile's own index. Returns null only when the tile holding the requested pixel itself
// wasn't fetched (a true data gap); a missing *neighbour* tile at a seam falls back to
// reusing the known corner, which only matters within a single ~30-90m pixel anyway.
const getTilePixel = (
  tiles: Map<string, TerrainTile>,
  zoom: number,
  tileX: number,
  tileY: number,
  px: number,
  py: number
): number | null => {
  let tx = tileX;
  let ty = tileY;
  let x = px;
  let y = py;
  if (x >= TILE_SIZE) {
    tx += 1;
    x -= TILE_SIZE;
  } else if (x < 0) {
    tx -= 1;
    x += TILE_SIZE;
  }
  if (y >= TILE_SIZE) {
    ty += 1;
    y -= TILE_SIZE;
  } else if (y < 0) {
    ty -= 1;
    y += TILE_SIZE;
  }

  const tile = tiles.get(tileKey(zoom, tx, ty));
  if (!tile) return null;
  return tile.elevations[y * tile.width + x];
};

const sampleElevationBilinear = (
  tiles: Map<string, TerrainTile>,
  zoom: number,
  lat: number,
  lon: number
): number | null => {
  const xFloat = lonToTileXFloat(lon, zoom);
  const yFloat = latToTileYFloat(lat, zoom);
  const tileX = Math.floor(xFloat);
  const tileY = Math.floor(yFloat);
  const fracX = (xFloat - tileX) * TILE_SIZE;
  const fracY = (yFloat - tileY) * TILE_SIZE;
  const px0 = Math.floor(fracX);
  const py0 = Math.floor(fracY);
  const tx = fracX - px0;
  const ty = fracY - py0;

  const h00 = getTilePixel(tiles, zoom, tileX, tileY, px0, py0);
  if (h00 === null) return null;

  const h10 = getTilePixel(tiles, zoom, tileX, tileY, px0 + 1, py0) ?? h00;
  const h01 = getTilePixel(tiles, zoom, tileX, tileY, px0, py0 + 1) ?? h00;
  const h11 = getTilePixel(tiles, zoom, tileX, tileY, px0 + 1, py0 + 1) ?? h00;

  const top = h00 * (1 - tx) + h10 * tx;
  const bottom = h01 * (1 - tx) + h11 * tx;
  return top * (1 - ty) + bottom * ty;
};

const haversineDistanceM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

// Builds an ElevationSampler from already-fetched tile sets: zoom-12 tiles within
// ~5 km of the observer, zoom-10 tiles beyond that (out to 50 km). Exported (separately
// from loadHorizonProfile) so the tile-to-sampler/interpolation logic can be tested
// with a fake tile source, without fetch/createImageBitmap/canvas.
export const createElevationSampler = (
  nearTiles: Map<string, TerrainTile>,
  farTiles: Map<string, TerrainTile>,
  observerLat: number,
  observerLon: number
): ElevationSampler => {
  return (lat: number, lon: number): number | null => {
    const distanceM = haversineDistanceM(observerLat, observerLon, lat, lon);
    return distanceM <= NEAR_FIELD_RADIUS_M
      ? sampleElevationBilinear(nearTiles, NEAR_FIELD_ZOOM, lat, lon)
      : sampleElevationBilinear(farTiles, FAR_FIELD_ZOOM, lat, lon);
  };
};

const CACHE_KEY_PREFIX = 'terrain_horizon_profile_v1_';

const cacheKeyFor = (lat: number, lon: number, eyeHeight: number): string =>
  `${CACHE_KEY_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}_${eyeHeight.toFixed(1)}`;

interface CachedProfileEntry {
  profile: HorizonProfile;
  timestamp: number;
}

// Reads the cached profile for this location/eye-height, if any. Same try/catch
// pattern as weatherUtils' cache: localStorage can throw (private browsing, quota) or
// hold a corrupt/outdated entry, and either case should just be treated as a miss.
const getCachedProfile = (lat: number, lon: number, eyeHeight: number): HorizonProfile | null => {
  try {
    const raw = localStorage.getItem(cacheKeyFor(lat, lon, eyeHeight));
    if (!raw) return null;
    const entry: CachedProfileEntry = JSON.parse(raw);
    if (!entry?.profile || !Array.isArray(entry.profile.angles) || entry.profile.angles.length !== 360) {
      return null;
    }
    return entry.profile;
  } catch (error) {
    console.error('Error reading terrain horizon cache:', error);
    return null;
  }
};

const cacheProfile = (lat: number, lon: number, eyeHeight: number, profile: HorizonProfile): void => {
  try {
    const entry: CachedProfileEntry = { profile, timestamp: Date.now() };
    localStorage.setItem(cacheKeyFor(lat, lon, eyeHeight), JSON.stringify(entry));
  } catch (error) {
    console.error('Error caching terrain horizon profile:', error);
  }
};

// Loads the horizon profile for (lat, lon, eyeHeight): localStorage cache first (the
// profile is static terrain, so it never expires by itself - only a different
// location/eye-height or a cache clear invalidates it), else fetches near + far field
// tiles, decodes them, computes the profile, and caches it. Unlike weatherUtils'
// fetchCurrentWeather, this throws on failure instead of returning a fallback: a flat
// profile would silently hide the whole feature behind wrong numbers, so the caller is
// expected to show an error instead.
export const loadHorizonProfile = async (
  lat: number,
  lon: number,
  eyeHeight: number,
  signal?: AbortSignal
): Promise<HorizonProfile> => {
  const cached = getCachedProfile(lat, lon, eyeHeight);
  if (cached) return cached;

  const nearKeys = boundingBoxTiles(lat, lon, NEAR_FIELD_RADIUS_M, NEAR_FIELD_ZOOM);
  const farKeys = boundingBoxTiles(lat, lon, FAR_FIELD_RADIUS_M, FAR_FIELD_ZOOM);

  const [nearTilesArr, farTilesArr] = await Promise.all([
    settleTiles(nearKeys, signal),
    settleTiles(farKeys, signal),
  ]);

  if (nearTilesArr.length === 0 && farTilesArr.length === 0) {
    throw new Error('Failed to load terrain tiles');
  }

  const nearTiles = new Map(nearTilesArr.map((tile) => [tileKey(tile.z, tile.x, tile.y), tile]));
  const farTiles = new Map(farTilesArr.map((tile) => [tileKey(tile.z, tile.x, tile.y), tile]));

  const sampler = createElevationSampler(nearTiles, farTiles, lat, lon);
  const profile = computeHorizonProfile(lat, lon, eyeHeight, sampler);

  cacheProfile(lat, lon, eyeHeight, profile);
  return profile;
};
