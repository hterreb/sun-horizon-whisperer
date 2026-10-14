import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const html = readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';

describe('index.html', () => {
  // ROADMAP item 151: the keyboard (place search, feedback form) resizes only the visual
  // viewport, so the scene keeps its size and is not built again (Chrome Android 108+).
  it('lets the keyboard resize only the visual viewport', () => {
    expect(viewport.split(',').map((part) => part.trim())).toContain('interactive-widget=resizes-visual');
  });

  it('keeps the edge-to-edge viewport', () => {
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('viewport-fit=cover');
  });
});
