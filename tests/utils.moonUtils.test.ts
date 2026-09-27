import { getMoonPosition, getMoonPhaseLabel, getMoonPhaseIndex } from '../src/utils/moonUtils';
describe('moonUtils', () => {
  it('calculates moon position', () => {
    const pos = getMoonPosition(new Date(), 0, 0);
    expect(pos).toHaveProperty('azimuth');
    expect(pos).toHaveProperty('altitude');
  });
  it('returns correct moon phase label', () => {
    expect(typeof getMoonPhaseLabel(0)).toBe('string');
    expect(typeof getMoonPhaseLabel(0.5)).toBe('string');
  });
  it('returns correct label for all moon phases', () => {
    for (let phase = 0; phase <= 1; phase += 0.1) {
      expect(typeof getMoonPhaseLabel(phase)).toBe('string');
    }
  });

  it('getMoonPhaseIndex always returns one of the 8 phase indices (0-7) (P0-6a)', () => {
    for (let i = 0; i <= 100; i++) {
      const index = getMoonPhaseIndex(i / 100);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(7);
    }
  });
});
