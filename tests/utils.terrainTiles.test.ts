import {
  TERRAIN_ATTRIBUTION,
  decodeTerrarium,
  createElevationSampler,
  loadHorizonProfile,
  type TerrainTile,
} from '../src/utils/terrainTiles';
import type { HorizonProfile } from '../src/utils/horizonUtils';

const NEAR_ZOOM = 12;
const FAR_ZOOM = 10;

// Builds a fake 256x256 TerrainTile with a uniform elevation, so tests don't need a
// real fetch/createImageBitmap/canvas pipeline (jsdom has none of those) to exercise
// the tile-to-sampler logic.
const makeUniformTile = (z: number, x: number, y: number, elevation: number): TerrainTile => {
  const width = 256;
  const height = 256;
  const elevations = new Float32Array(width * height).fill(elevation);
  return { z, x, y, width, height, elevations };
};

describe('terrainTiles', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes the required attribution string', () => {
    expect(TERRAIN_ATTRIBUTION).toBe('Terrain: Mapzen / AWS Terrain Tiles');
  });

  describe('decodeTerrarium', () => {
    it('decodes known R/G/B values to the documented elevation', () => {
      // r*256 + g + b/256 - 32768
      expect(decodeTerrarium(128, 0, 0)).toBeCloseTo(128 * 256 - 32768, 5);
      expect(decodeTerrarium(0, 0, 0)).toBeCloseTo(-32768, 5);
      expect(decodeTerrarium(129, 244, 0)).toBeCloseTo(500, 5);
    });

    it('round-trips an encoded elevation back to the same value', () => {
      const elevationM = 1234.5;
      const total = elevationM + 32768;
      const r = Math.floor(total / 256);
      const remainder = total - r * 256;
      const g = Math.floor(remainder);
      const b = Math.round((remainder - g) * 256);
      expect(decodeTerrarium(r, g, b)).toBeCloseTo(elevationM, 1);
    });
  });

  describe('createElevationSampler', () => {
    // z=12, x=2150, y=1473 covers (45.0, 9.0) at pixel (102, 111) with fractional
    // offset (0.4, 0.0403) - see the tile math this mirrors in horizonUtils/terrainTiles.
    const OBSERVER_LAT = 45.0;
    const OBSERVER_LON = 9.0;

    it('bilinearly interpolates between the 4 surrounding pixels', () => {
      const tile = makeUniformTile(NEAR_ZOOM, 2150, 1473, 0);
      const setPixel = (px: number, py: number, value: number) => {
        tile.elevations[py * tile.width + px] = value;
      };
      setPixel(102, 111, 100);
      setPixel(103, 111, 200);
      setPixel(102, 112, 300);
      setPixel(103, 112, 400);

      const nearTiles = new Map([[`${tile.z}/${tile.x}/${tile.y}`, tile]]);
      const sampler = createElevationSampler(nearTiles, new Map(), OBSERVER_LAT, OBSERVER_LON);

      const result = sampler(OBSERVER_LAT, OBSERVER_LON);
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(148.06, 1);
    });

    it('returns null when the tile covering a point was never fetched (a gap)', () => {
      const sampler = createElevationSampler(new Map(), new Map(), OBSERVER_LAT, OBSERVER_LON);
      expect(sampler(OBSERVER_LAT, OBSERVER_LON)).toBeNull();
    });

    it('samples the near-field (zoom 12) tile set for close points, far-field (zoom 10) for distant ones', () => {
      const nearTile = makeUniformTile(NEAR_ZOOM, 2150, 1473, 111);
      // Covers (45.18, 9.0), ~20km from the observer, at zoom 10.
      const farTile = makeUniformTile(FAR_ZOOM, 537, 367, 222);

      const nearTiles = new Map([[`${nearTile.z}/${nearTile.x}/${nearTile.y}`, nearTile]]);
      const farTiles = new Map([[`${farTile.z}/${farTile.x}/${farTile.y}`, farTile]]);
      const sampler = createElevationSampler(nearTiles, farTiles, OBSERVER_LAT, OBSERVER_LON);

      // A point ~50m away: within the 5km near-field radius.
      const closeResult = sampler(OBSERVER_LAT + 0.0004, OBSERVER_LON);
      expect(closeResult).toBeCloseTo(111, 0);

      // A point ~20km away: only the far-field tile set should be consulted.
      const farResult = sampler(OBSERVER_LAT + 0.18, OBSERVER_LON);
      expect(farResult).toBeCloseTo(222, 0);
    });
  });

  describe('loadHorizonProfile', () => {
    const LAT = 47.412;
    const LON = 10.987;
    const EYE_HEIGHT = 1.7;

    const cacheKey = `terrain_horizon_profile_v1_${LAT.toFixed(3)}_${LON.toFixed(3)}_${EYE_HEIGHT.toFixed(1)}`;

    it('returns the cached profile without fetching when one is stored', async () => {
      const cachedProfile: HorizonProfile = {
        angles: new Array(360).fill(-0.04),
        observerElevation: 500,
        eyeHeight: EYE_HEIGHT,
      };
      localStorage.setItem(cacheKey, JSON.stringify({ profile: cachedProfile, timestamp: Date.now() }));

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      const result = await loadHorizonProfile(LAT, LON, EYE_HEIGHT);

      expect(result).toEqual(cachedProfile);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    describe('full fetch -> decode -> cache pipeline (mocked)', () => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;

      beforeEach(() => {
        // A uniform 256x256 "tile" wherever it's asked for: R=129,G=244,B=0 decodes
        // to elevation 500 (see decodeTerrarium test above).
        const width = 256;
        const height = 256;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          data[i * 4] = 129;
          data[i * 4 + 1] = 244;
          data[i * 4 + 2] = 0;
          data[i * 4 + 3] = 255;
        }

        (global as unknown as { createImageBitmap: typeof createImageBitmap }).createImageBitmap = vi.fn(
          async () => ({ width, height })
        ) as unknown as typeof createImageBitmap;
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
          drawImage: () => {},
          getImageData: () => ({ data, width, height }),
        })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

        global.fetch = vi.fn(async () => ({
          ok: true,
          blob: async () => new Blob(),
        })) as unknown as typeof fetch;
      });

      afterEach(() => {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        delete (global as unknown as { createImageBitmap?: typeof createImageBitmap }).createImageBitmap;
      });

      it('fetches tiles, computes a profile, and caches it (uniform terrain -> flat-curvature dip)', async () => {
        const profile = await loadHorizonProfile(LAT, LON, EYE_HEIGHT);

        expect(profile.angles).toHaveLength(360);
        expect(profile.observerElevation).toBeCloseTo(500, 0);
        expect(profile.eyeHeight).toBe(EYE_HEIGHT);
        // Uniform elevation everywhere -> every azimuth sees the same pure-curvature
        // dip (a small negative angle), not a ridge.
        expect(profile.angles.every((a) => a < 0)).toBe(true);
        expect(fetch).toHaveBeenCalled();

        const cached = localStorage.getItem(cacheKey);
        expect(cached).not.toBeNull();

        const fetchCallCount = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
        const second = await loadHorizonProfile(LAT, LON, EYE_HEIGHT);
        expect(second).toEqual(profile);
        expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallCount);
      });
    });

    it('throws when every tile fails to load', async () => {
      global.fetch = vi.fn(async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch;

      await expect(loadHorizonProfile(LAT, LON, EYE_HEIGHT)).rejects.toThrow();
    });

    it('propagates an abort instead of returning a partial/flat profile', async () => {
      const controller = new AbortController();
      controller.abort();

      global.fetch = vi.fn(async (_url, options) => {
        if ((options as { signal?: AbortSignal })?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return { ok: true, blob: async () => new Blob() };
      }) as unknown as typeof fetch;

      await expect(loadHorizonProfile(LAT, LON, EYE_HEIGHT, controller.signal)).rejects.toThrow();
    });
  });
});
