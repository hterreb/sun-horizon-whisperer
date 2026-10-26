// CelesTrak from a disk cache for `npm run dev` and `vite preview` (ROADMAP item 183). There the
// satellites route asks CelesTrak from the developer's IP, and test runs open the app many
// times: on 19 Oct 2026 they downloaded GROUP=active 46 times in 9 minutes, and CelesTrak put
// the IP in its firewall. So each CelesTrak answer comes from a file in `dir`, downloaded at
// most once a day, also when several requests come at once. A failed download (no 200, a
// timeout) writes a `.stop` file: no more downloads of that URL until a person reads the
// reason and deletes the file (CelesTrak's rule: stop after an error and report it).
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';

export const CELESTRAK_CACHE_MS = 24 * 60 * 60 * 1000;

export const celestrakFromDisk = (dir: string, fetchFn: typeof fetch = fetch): typeof fetch => {
  const downloads = new Map<string, Promise<string | null>>();

  const download = async (url: string, file: string, init?: RequestInit): Promise<string | null> => {
    await mkdir(dir, { recursive: true });
    try {
      const response = await fetchFn(url, init);
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      await writeFile(`${file}.json`, body);
      return body;
    } catch (error) {
      const reason = `${url}: ${error instanceof Error ? error.message : String(error)} at ${new Date().toISOString()}`;
      await writeFile(`${file}.stop`, reason);
      console.error(`CelesTrak failed, no more downloads of this URL: ${reason}. Check the reason, then delete ${file}.stop.`);
      return null;
    }
  };

  return async (input, init) => {
    const url = String(input);
    if (!url.startsWith('https://celestrak.org/')) return fetchFn(input, init);
    const file = path.join(dir, createHash('sha1').update(url).digest('hex').slice(0, 16));
    if (existsSync(`${file}.stop`)) {
      console.error(`CelesTrak stopped (${await readFile(`${file}.stop`, 'utf8')}). Check the reason, then delete ${file}.stop.`);
      return new Response(null, { status: 503 });
    }
    const age = await stat(`${file}.json`).then((info) => Date.now() - info.mtimeMs, () => Infinity);
    if (age < CELESTRAK_CACHE_MS) return new Response(await readFile(`${file}.json`, 'utf8'), { status: 200 });
    let job = downloads.get(url);
    if (!job) {
      job = download(url, file, init).finally(() => downloads.delete(url));
      downloads.set(url, job);
    }
    const body = await job;
    return new Response(body, { status: body === null ? 503 : 200 });
  };
};
