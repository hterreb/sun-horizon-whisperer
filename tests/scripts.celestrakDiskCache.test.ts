import { mkdtemp, readdir, rm, utimes } from 'fs/promises';
import os from 'os';
import path from 'path';
import { CELESTRAK_CACHE_MS, celestrakFromDisk } from '../scripts/celestrakDiskCache';

// ROADMAP item 183: the dev server downloads each CelesTrak URL at most once a day, and stops
// after a failed download until a person deletes the `.stop` file.
const URL_ACTIVE = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';

describe('celestrakDiskCache (dev server, item 183)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'celestrak-'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('downloads once for requests at the same time, then serves the file, also to another dev server', async () => {
    const fetchFn = vi.fn(async () => new Response('[1]', { status: 200 }));
    const cached = celestrakFromDisk(dir, fetchFn as unknown as typeof fetch);
    const answers = await Promise.all([cached(URL_ACTIVE), cached(URL_ACTIVE)]);
    expect(await Promise.all(answers.map((answer) => answer.text()))).toEqual(['[1]', '[1]']);
    const other = celestrakFromDisk(dir, fetchFn as unknown as typeof fetch);
    expect(await (await other(URL_ACTIVE)).text()).toBe('[1]');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('downloads again when the file is a day old', async () => {
    const fetchFn = vi.fn(async () => new Response('[1]', { status: 200 }));
    const cached = celestrakFromDisk(dir, fetchFn as unknown as typeof fetch);
    await cached(URL_ACTIVE);
    const [file] = await readdir(dir);
    const dayAgo = new Date(Date.now() - CELESTRAK_CACHE_MS - 1000);
    await utimes(path.join(dir, file), dayAgo, dayAgo);
    await cached(URL_ACTIVE);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('stops after a failed download until a person deletes the .stop file', async () => {
    const fetchFn = vi.fn(async () => new Response('blocked', { status: 403 }));
    const cached = celestrakFromDisk(dir, fetchFn as unknown as typeof fetch);
    expect((await cached(URL_ACTIVE)).status).toBe(503);
    expect((await cached(URL_ACTIVE)).status).toBe(503);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const stop = (await readdir(dir)).find((name) => name.endsWith('.stop'));
    expect(stop).toBeDefined();
    await rm(path.join(dir, stop as string));
    await cached(URL_ACTIVE);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('passes other URLs through', async () => {
    const fetchFn = vi.fn(async () => new Response('ok', { status: 200 }));
    await celestrakFromDisk(dir, fetchFn as unknown as typeof fetch)('https://api.adsb.lol/v2/x');
    await celestrakFromDisk(dir, fetchFn as unknown as typeof fetch)('https://api.adsb.lol/v2/x');
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(await readdir(dir).catch(() => [])).toEqual([]);
  });
});
