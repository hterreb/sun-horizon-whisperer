import { CLOUD_SHAPES, SHAFT_LENGTH, getShaftStrands } from '../src/utils/cloudShapes';

// The start point of each ellipse in a shape's path.
const starts = (d: string): [number, number][] => [...d.matchAll(/M([-\d.]+) ([-\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);

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

describe('cloud shapes without box edges (ROADMAP item 88)', () => {
  it('rounds the altocumulus fields to an oval (G1)', () => {
    for (const shape of CLOUD_SHAPES.Ac.slice(0, 2)) {
      const points = starts(shape.d);
      expect(points.length).toBeGreaterThan(10);
      // Inside an oval round the box's middle, so no corner of the 120 × 60 box fills up.
      for (const [x, y] of points) expect(((x - 60) / 64) ** 2 + ((y - 30) / 27) ** 2).toBeLessThanOrEqual(1);
    }
  });

  it('gives each cirrus streak its own length and start (G1)', () => {
    const lines = [14, 24, 34, 44].map(y0 => starts(CLOUD_SHAPES.Ci[1].d).filter(([, y]) => Math.abs(y - y0) < 5).map(([x]) => x));
    expect(new Set(lines.map(xs => Math.round(Math.min(...xs)))).size).toBe(4);
    expect(new Set(lines.map(xs => Math.round(Math.max(...xs) - Math.min(...xs)))).size).toBe(4);
  });

  it('draws each rain shaft as 8 slanted strands of different lengths (S2)', () => {
    const shafts = Object.values(CLOUD_SHAPES).flatMap(shapes => shapes.flatMap(s => s.shafts ?? []));
    expect(shafts.length).toBeGreaterThan(3);
    for (const shaft of shafts) {
      const [x, w, slant, y0] = shaft;
      // An upright strand has no width, and its fade (a bounding-box gradient) would not paint.
      expect(slant).not.toBe(0);
      const strands = getShaftStrands(shaft).map(([d, width]) => {
        const m = d.match(/^M([-\d.]+) ([-\d.]+)l([-\d.]+) ([-\d.]+)$/)!;
        return { x: Number(m[1]), y: Number(m[2]), dx: Number(m[3]), len: Number(m[4]), width };
      });
      expect(strands).toHaveLength(8);
      for (const s of strands) {
        expect(s.x).toBeGreaterThanOrEqual(x - w / 16);
        expect(s.x).toBeLessThanOrEqual(x + w + w / 16);
        expect(s.y).toBe(y0);
        expect(Math.sign(s.dx)).toBe(Math.sign(slant));
        expect(s.len).toBeGreaterThanOrEqual(SHAFT_LENGTH / 2);
        expect(s.len).toBeLessThanOrEqual(SHAFT_LENGTH);
        expect(s.width).toBeGreaterThan(0.7);
        expect(s.width).toBeLessThan(1.8);
      }
      expect(new Set(strands.map(s => s.len)).size).toBeGreaterThan(4);
    }
  });
});
