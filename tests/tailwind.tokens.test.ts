import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ROADMAP item 7: direction D "Polished Classic" tokens. This just checks the
// token variables exist in the Tailwind v4 `@theme` block of src/index.css (the
// tokens moved there from tailwind.config.ts with the v4 upgrade, AUDIT D-6),
// not their rendered values.
const css = readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8');
const theme = css.slice(css.indexOf('@theme {'), css.indexOf('\n}', css.indexOf('@theme {')));
const token = (name: string): string | undefined =>
  theme.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe('tailwind design tokens (ROADMAP item 7)', () => {
  it('has the @theme block', () => {
    expect(theme.length).toBeGreaterThan(0);
  });

  it('defines the brand palette', () => {
    for (const key of ['sunset', 'peach', 'sky', 'cyan', 'night', 'coral']) {
      expect(token(`color-brand-${key}`)).toBeTruthy();
    }
  });

  it('defines scene sky-gradient stops for night/dawn/day/dusk with a third stop', () => {
    for (const bucket of ['night', 'dawn', 'day', 'dusk']) {
      for (const stop of ['1', '2', '3']) {
        expect(token(`color-scene-sky-${bucket}-${stop}`)).toBeTruthy();
      }
    }
  });

  it('defines scene sun glow, moon and water tokens', () => {
    expect(token('color-scene-sunGlow-high')).toBeTruthy();
    expect(token('color-scene-moon')).toBeTruthy();
    expect(token('color-scene-water')).toBeTruthy();
    // The water's gradient comes from the sky (ROADMAP item 53), not per-bucket tokens.
    expect(theme).not.toMatch(/--color-scene-horizon/);
    expect(theme).not.toMatch(/--color-scene-waterDeep/);
  });

  it('defines the item 15 D-polish scene tokens (ridge, ghost, iceberg, critter)', () => {
    for (const bucket of ['night', 'day', 'golden']) {
      expect(token(`color-scene-ridge-${bucket}`)).toBeTruthy();
    }
    expect(token('color-scene-glowWhite')).toBeTruthy();
    expect(token('color-scene-ghostHalo')).toBeTruthy();
    expect(token('color-scene-moonDark')).toBeTruthy();
    expect(token('color-scene-critter')).toBeTruthy();
    for (const key of ['fill', 'shade', 'glow']) {
      expect(token(`color-scene-iceberg-${key}`)).toBeTruthy();
    }
  });

  it('defines glass panel tokens including the 18px radius', () => {
    expect(token('color-panel-background')).toBeTruthy();
    expect(token('color-panel-border')).toBeTruthy();
    expect(token('radius-panel')).toBe('var(--panel-radius)');
  });

  it('defines the 12/14/17/28/34px type scale', () => {
    for (const key of ['caption', 'body', 'title', 'display', 'hero']) {
      expect(token(`text-${key}`)).toBeTruthy();
    }
  });
});
