import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import vercel from '../vercel.json';

// ponytail: two copies of the headers while the app moves from Vercel to Cloudflare Pages.
// Delete this test and vercel.json's headers when Vercel only redirects.
describe('public/_headers', () => {
  it('has the same headers as vercel.json', () => {
    const lines = readFileSync('public/_headers', 'utf8').split('\n').filter((l) => l.startsWith('  '));
    const fromFile = lines.map((l) => l.trim());
    const fromVercel = vercel.headers[0].headers.map((h) => `${h.key}: ${h.value}`);
    expect(fromFile).toEqual(fromVercel);
  });
});
