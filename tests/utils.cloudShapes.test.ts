import { CLOUD_SHAPES } from '../src/utils/cloudShapes';

describe('cloud shapes (ROADMAP item 84, C1)', () => {
  it('has 2 to 3 shapes per type, and one each for the sheets and the easter eggs', () => {
    const counts = Object.fromEntries(Object.entries(CLOUD_SHAPES).map(([type, shapes]) => [type, shapes.length]));
    expect(counts).toEqual({ Ci: 2, Cs: 1, Ac: 3, As: 1, Cu: 3, Sc: 2, St: 2, Ns: 3, Cb: 3, Len: 1, Mam: 1 });
  });

  it("draws each shape as one closed path in the old clouds' 120 × 60 box", () => {
    for (const shapes of Object.values(CLOUD_SHAPES)) {
      for (const shape of shapes) {
        expect(shape.d).toMatch(/^M[-\d.]+ [-\d.]+/);
        expect(shape.d.endsWith('Z')).toBe(true);
        expect(shape.d).not.toMatch(/NaN|Infinity/);
        // The decks reach a little above the box, so their rows close the sky.
        expect(shape.top).toBeGreaterThanOrEqual(-12);
        expect(shape.bottom).toBeLessThanOrEqual(60);
        expect(shape.bottom).toBeGreaterThan(shape.top);
      }
    }
  });

  it('hangs rain shafts under the nimbostratus and the towering cumulus only', () => {
    const withShafts = Object.entries(CLOUD_SHAPES).flatMap(([type, shapes]) => shapes.filter(s => s.shafts).map(() => type));
    expect(new Set(withShafts)).toEqual(new Set(['Ns', 'Cu']));
    expect(CLOUD_SHAPES.Cu[2].name).toBe('Towering');
  });
});
