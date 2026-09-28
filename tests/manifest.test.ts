import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ROADMAP item 15: the PWA manifest (defined inline in vite.config.ts) must
// list a maskable icon alongside the 'any' ones, and every icon file it
// references must actually exist in public/.
const viteConfigSource = fs.readFileSync(path.resolve(__dirname, '../vite.config.ts'), 'utf-8');

function extractManifestIcons(source: string) {
  const iconsMatch = source.match(/icons:\s*\[([\s\S]*?)\n\s*\],/);
  if (!iconsMatch) {
    throw new Error('Could not find manifest.icons array in vite.config.ts');
  }
  const entryBlocks = [...iconsMatch[1].matchAll(/\{([\s\S]*?)\}/g)].map((m) => m[1]);
  return entryBlocks.map((entry) => ({
    src: entry.match(/src:\s*'([^']+)'/)?.[1],
    purpose: entry.match(/purpose:\s*'([^']+)'/)?.[1],
  }));
}

describe('PWA manifest (ROADMAP item 15)', () => {
  const icons = extractManifestIcons(viteConfigSource);

  it('lists at least one icon', () => {
    expect(icons.length).toBeGreaterThan(0);
  });

  it('declares at least one maskable icon', () => {
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  it('declares at least one "any" icon', () => {
    expect(icons.some((icon) => icon.purpose === 'any')).toBe(true);
  });

  it('every referenced icon file exists in public/', () => {
    for (const icon of icons) {
      expect(icon.src, 'manifest icon entry is missing a src').toBeTruthy();
      const filePath = path.resolve(__dirname, '../public', icon.src!.replace(/^\//, ''));
      expect(fs.existsSync(filePath), `${icon.src} referenced by the manifest should exist in public/`).toBe(true);
    }
  });
});
