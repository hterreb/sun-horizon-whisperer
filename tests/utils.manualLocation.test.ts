import {
  isValidLatitude,
  isValidLongitude,
  loadManualLocation,
  saveManualLocation,
  clearManualLocation,
} from '../src/utils/manualLocation';

describe('manualLocation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('validation', () => {
    it('accepts latitudes within -90..90', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
    });

    it('rejects latitudes outside -90..90 or non-finite', () => {
      expect(isValidLatitude(90.1)).toBe(false);
      expect(isValidLatitude(-90.1)).toBe(false);
      expect(isValidLatitude(NaN)).toBe(false);
    });

    it('accepts longitudes within -180..180', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
    });

    it('rejects longitudes outside -180..180 or non-finite', () => {
      expect(isValidLongitude(180.1)).toBe(false);
      expect(isValidLongitude(-180.1)).toBe(false);
      expect(isValidLongitude(NaN)).toBe(false);
    });
  });

  describe('persistence', () => {
    it('returns null when nothing is stored', () => {
      expect(loadManualLocation()).toBeNull();
    });

    it('round-trips a saved location', () => {
      saveManualLocation(51.5074, -0.1278);
      expect(loadManualLocation()).toEqual({ latitude: 51.5074, longitude: -0.1278 });
    });

    it('clears the stored location', () => {
      saveManualLocation(1, 2);
      clearManualLocation();
      expect(loadManualLocation()).toBeNull();
    });

    it('ignores malformed or out-of-range stored data', () => {
      localStorage.setItem('manual-location', JSON.stringify({ latitude: 999, longitude: 2 }));
      expect(loadManualLocation()).toBeNull();

      localStorage.setItem('manual-location', 'not json');
      expect(loadManualLocation()).toBeNull();

      localStorage.setItem('manual-location', JSON.stringify({ latitude: '51', longitude: -1 }));
      expect(loadManualLocation()).toBeNull();
    });

    it('does not throw when localStorage access fails', () => {
      const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('blocked');
      });

      expect(() => loadManualLocation()).not.toThrow();
      expect(loadManualLocation()).toBeNull();
      expect(() => saveManualLocation(1, 2)).not.toThrow();
      expect(() => clearManualLocation()).not.toThrow();

      getSpy.mockRestore();
      setSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
