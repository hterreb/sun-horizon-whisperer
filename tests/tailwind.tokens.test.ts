import { describe, expect, it } from 'vitest';
import tailwindConfig from '../tailwind.config';

// ROADMAP item 7: direction D "Polished Classic" tokens. This just checks the
// token keys exist in tailwind.config.ts, not their rendered values.
describe('tailwind design tokens (ROADMAP item 7)', () => {
  const colors = tailwindConfig.theme?.extend?.colors as Record<string, unknown>;
  const fontSize = tailwindConfig.theme?.extend?.fontSize as Record<string, unknown>;
  const borderRadius = tailwindConfig.theme?.extend?.borderRadius as Record<string, unknown>;

  it('defines the brand palette', () => {
    const brand = colors.brand as Record<string, string>;
    for (const key of ['sunset', 'peach', 'sky', 'cyan', 'night', 'coral']) {
      expect(brand[key]).toBeTruthy();
    }
  });

  it('defines scene sky-gradient stops for night/dawn/day/dusk with a third stop', () => {
    const sky = (colors.scene as Record<string, unknown>).sky as Record<string, string>;
    for (const bucket of ['night', 'dawn', 'day', 'dusk']) {
      for (const stop of ['1', '2', '3']) {
        expect(sky[`${bucket}-${stop}`]).toBeTruthy();
      }
    }
  });

  it('defines scene sun glow, moon, horizon and water tokens', () => {
    const scene = colors.scene as Record<string, unknown>;
    expect(scene.sunGlow).toBeTruthy();
    expect(scene.moon).toBeTruthy();
    expect(scene.horizon).toBeTruthy();
    expect(scene.water).toBeTruthy();
  });

  it('defines glass panel tokens including the 18px radius', () => {
    const panel = colors.panel as Record<string, string>;
    expect(panel.background).toBeTruthy();
    expect(panel.border).toBeTruthy();
    expect(borderRadius.panel).toBe('var(--panel-radius)');
  });

  it('defines the 12/14/17/28/34px type scale', () => {
    for (const key of ['caption', 'body', 'title', 'display', 'hero']) {
      expect(fontSize[key]).toBeTruthy();
    }
  });
});
