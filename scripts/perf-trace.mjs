// summary: Performance trace for Sun Chaser (ROADMAP item 91). Opens fixed scenes in the
// system Chrome (Ravensburg: clear day, clear night, rain, fullscreen idle) with a stubbed
// network and a fixed clock. Writes per second: scripting, rendering, painting and
// off-main-thread time, frame times (p95, max), long tasks and JS heap.
// Prints a markdown table and writes JSON to scripts/perf-results/ (gitignored).
// Usage: npm run perf:trace -- [--seconds 60] [--runs 1] [--scenes day,night,rain,fullscreen]
//          [--profiles phone,desktop] [--warmup 20] [--build] [--url URL] [--cpu-profile] [--headed]
//          [--screenshots DIR]
//
// Sources of the numbers:
// - Scripting, rendering (style + layout), main-thread busy time and JS heap: deltas of
//   CDP `Performance.getMetrics` (ScriptDuration, RecalcStyleDuration + LayoutDuration,
//   TaskDuration, JSHeapUsedSize), sampled every second.
// - Painting: a Chrome trace (category devtools.timeline), the union of the Paint, PrePaint,
//   Layerize, Commit and image-decode events on the renderer main thread. (Chrome 154 writes
//   only PrePaint and Layerize in this category; the extra category with the rest triples the
//   main-thread overhead of the trace.)
// - Off-main: the same trace, busy time (category toplevel) of the compositor, raster, GPU
//   and viz threads. Backdrop blur and filters cost time there, not on the main thread.
// - Frame times: requestAnimationFrame timestamps (init script). Long tasks:
//   PerformanceObserver('longtask').
//
// The clock: Playwright's page.clock also replaces requestAnimationFrame, performance.now
// and the timers with its own queue, so the frame times would come from the fake clock and
// not from real frames. The init script below therefore shifts only Date (Date.now and
// new Date()) to the scene time; the time then runs at normal speed from there. Timers,
// requestAnimationFrame and CSS animations stay real. Math.random gets a fixed seed, so the
// fish, birds and boats come in the same order on each run.
//
// Network: every request to another host than the app gets a fixture (forecast, place
// name, a flat terrain tile) or is aborted, and Chrome resolves no other host name
// (--host-resolver-rules), so no request leaves the machine. Service workers are blocked
// (they would bypass the stubs).
//
// --cpu-profile records a CDP CPU profile in each run and serves an unminified build, so
// that function names stay readable. It prints the top 10 functions and modules by self time.
//
// --screenshots DIR saves a PNG of each scene after its measured window (so it does not
// change the numbers), named <profile>-<scene>-run<N>.png, to compare the look before and
// after a change.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'scripts/perf-fixtures');
const VITE = path.join(ROOT, 'node_modules/.bin/vite');

const PLACE = { latitude: 47.781, longitude: 9.612 }; // Ravensburg
const DAY = '2026-09-16T14:00:00+02:00'; // sun 44° high: fish, boats and birds
const NIGHT = '2026-09-16T22:30:00+02:00'; // astronomical night, moon below the horizon: stars
// No calendar or astro event on this date (not a Friday 13, no equinox, no meteor shower).
const SCENES = {
  day: { start: DAY, forecast: 'forecast-clear-day.json' },
  night: { start: NIGHT, forecast: 'forecast-clear-night.json' },
  rain: { start: DAY, forecast: 'forecast-rain.json' },
  fullscreen: { start: DAY, forecast: 'forecast-clear-day.json', fullscreen: true },
};
const PROFILES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpuThrottle: 4 },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, cpuThrottle: 1 },
};
const RANDOM_SEED = 91;
const FULLSCREEN_IDLE_MS = 10_000; // SunTracker hides the cursor and chrome after 10 s

// Painting on the renderer main thread (DevTools "Painting"); nested events count once.
const PAINT_EVENTS = new Set(['Paint', 'PrePaint', 'Layerize', 'Commit', 'UpdateLayer', 'CompositeLayers',
  'PaintImage', 'Decode Image', 'Decode LazyPixelRef', 'Draw LazyPixelRef']);
const OFF_MAIN_THREAD = /^(Compositor|CompositorTileWorker|CrGpuMain|VizCompositorThread)/;
const TRACE_CATEGORIES = ['devtools.timeline', 'toplevel']; // the disabled-by-default timeline category triples the main-thread overhead

// ---------- options ----------

const parseArgs = (argv) => {
  const opts = {
    seconds: 60, warmup: 20, runs: 1, scenes: Object.keys(SCENES), profiles: Object.keys(PROFILES),
    url: null, build: false, cpuProfile: false, headed: false, screenshots: null, out: path.join(ROOT, 'scripts/perf-results'),
  };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=', 2);
    const value = () => inline ?? argv[++i];
    switch (flag) {
      case '--seconds': opts.seconds = Number(value()); break;
      case '--warmup': opts.warmup = Number(value()); break;
      case '--runs': opts.runs = Number(value()); break;
      case '--scenes': opts.scenes = value().split(','); break;
      case '--profiles': opts.profiles = value().split(','); break;
      case '--url': opts.url = value(); break;
      case '--out': opts.out = path.resolve(value()); break;
      case '--build': opts.build = true; break;
      case '--cpu-profile': opts.cpuProfile = true; break;
      case '--headed': opts.headed = true; break;
      case '--screenshots': opts.screenshots = path.resolve(value()); break;
      default: throw new Error(`Unknown option ${argv[i]} (see the summary at the top of scripts/perf-trace.mjs)`);
    }
  }
  for (const s of opts.scenes) if (!SCENES[s]) throw new Error(`Unknown scene "${s}". Scenes: ${Object.keys(SCENES)}`);
  for (const p of opts.profiles) if (!PROFILES[p]) throw new Error(`Unknown profile "${p}". Profiles: ${Object.keys(PROFILES)}`);
  for (const k of ['seconds', 'warmup', 'runs']) if (!(opts[k] > 0)) throw new Error(`--${k} must be a positive number`);
  if (opts.scenes.includes('fullscreen') && opts.warmup * 1000 <= FULLSCREEN_IDLE_MS) {
    throw new Error(`--warmup must be more than ${FULLSCREEN_IDLE_MS / 1000} s for the fullscreen scene (the chrome hides after 10 s)`);
  }
  return opts;
};

// ---------- app server ----------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.on('error', reject);
  srv.listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

// Builds when asked (or when dist/ is missing) and starts `vite preview` on a free port.
const startApp = async (opts) => {
  let outDir = path.join(ROOT, 'dist');
  if (opts.cpuProfile) {
    outDir = path.join(os.tmpdir(), 'sun-chaser-perf-unminified');
    run(VITE, ['build', '--minify', 'false', '--outDir', outDir, '--emptyOutDir']);
  } else if (opts.build || !existsSync(path.join(outDir, 'index.html'))) {
    run('npm', ['run', 'build']);
  }
  const port = await freePort();
  const server = spawn(VITE, ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', outDir],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 300; i++) {
    if (server.exitCode !== null) throw new Error('vite preview exited early');
    try {
      if ((await fetch(url)).ok) return { url, outDir, stop: () => server.kill() };
    } catch {
      // not up yet
    }
    await sleep(100);
  }
  server.kill();
  throw new Error(`vite preview did not answer on ${url}`);
};

// ---------- network stubs ----------

const json = (body) => ({
  status: 200,
  contentType: 'application/json',
  headers: { 'access-control-allow-origin': '*' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

// A 256×256 Terrarium tile with one height everywhere: flat land at Ravensburg's ~450 m.
const flatTerrainPng = (elevationM) => {
  const v = Math.round(elevationM + 32768);
  const row = Buffer.alloc(1 + 256 * 3); // filter byte 0, then RGB
  for (let x = 0; x < 256; x++) row.set([v >> 8, v & 255, 0], 1 + x * 3);
  const chunk = (type, data) => {
    const typed = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(8 + typed.length + 4);
    out.writeUInt32BE(data.length, 0);
    typed.copy(out, 4);
    out.writeUInt32BE(zlib.crc32(typed), 4 + typed.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(256, 0);
  header.writeUInt32BE(256, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(Array(256).fill(row)))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};
const TERRAIN_TILE = flatTerrainPng(450);
const fixture = (name) => readFileSync(path.join(FIXTURES, name), 'utf8');

// The hosts of the CSP connect-src in vercel.json, plus the radio streams (media-src).
const stubFor = (url, scene) => {
  const { hostname, pathname } = url;
  if (hostname === 'api.open-meteo.com') return json(fixture(SCENES[scene].forecast));
  if (hostname === 'geocoding-api.open-meteo.com') return json({ results: [] });
  if (hostname === 'api.bigdatacloud.net' || hostname === 'api-bdc.io') return json(fixture('bigdatacloud.json'));
  if (hostname === 's3.amazonaws.com' && pathname.startsWith('/elevation-tiles-prod/')) {
    return { status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: TERRAIN_TILE };
  }
  if (hostname.endsWith('.sentry.io')) return json({});
  return null; // radio streams and anything unknown: aborted
};

// ---------- page instrumentation (runs in the page before the app) ----------

const pageInit = ({ startMs, seed }) => {
  // Fixed clock: only Date moves to the scene time (see the summary at the top).
  const RealDate = Date;
  const offset = startMs - RealDate.now();
  function FixedDate(...args) {
    if (!new.target) return new RealDate(RealDate.now() + offset).toString();
    return args.length ? new RealDate(...args) : new RealDate(RealDate.now() + offset);
  }
  FixedDate.prototype = RealDate.prototype;
  FixedDate.now = () => RealDate.now() + offset;
  FixedDate.parse = RealDate.parse;
  FixedDate.UTC = RealDate.UTC;
  globalThis.Date = FixedDate;

  // Seeded Math.random (mulberry32).
  let state = seed >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const frames = [];
  const longTasks = [];
  let recording = false;
  let last = 0;
  let rafId = 0;
  let t0 = 0;
  const loop = (t) => {
    if (last) frames.push(t - last);
    last = t;
    rafId = requestAnimationFrame(loop);
  };
  try {
    new PerformanceObserver((list) => {
      if (recording) for (const e of list.getEntries()) longTasks.push(e.duration);
    }).observe({ type: 'longtask' });
  } catch {
    // no long-task support: the count stays 0
  }
  globalThis.__perf = {
    start() {
      frames.length = 0;
      longTasks.length = 0;
      last = 0;
      recording = true;
      t0 = performance.now();
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      recording = false;
      cancelAnimationFrame(rafId);
      return { frames, longTasks, ms: performance.now() - t0 };
    },
  };
};

// What the scene shows at the end of the window, to check the setup.
const sceneCheck = () => {
  const count = (id) => document.querySelectorAll(`[data-testid="${id}"]`).length;
  const clock = document.body.innerText.match(/\b\d{2}:\d{2}:\d{2}\b/);
  return {
    pageTime: new Date().toISOString(),
    clockText: clock ? clock[0] : null,
    fish: count('scene-fish'),
    boats: count('scene-boat'),
    birds: count('scene-bird') + count('scene-bat'),
    rainCanvas: count('rain-canvas'),
    canvases: document.querySelectorAll('canvas').length,
    runningAnimations: document.getAnimations().filter((a) => a.playState === 'running').length,
    fullscreenElement: !!document.fullscreenElement,
    weatherShown: document.body.innerText.match(/Clear sky|Moderate rain|Weather unavailable/)?.[0] ?? null,
  };
};

// If headless Chrome refuses real fullscreen, SunTracker gets the same signal through a
// fullscreenchange event with document.fullscreenElement set (the closest simulation).
const simulateFullscreen = () => {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => document.documentElement });
  document.dispatchEvent(new Event('fullscreenchange'));
};

// ---------- trace aggregation ----------

// Total length of the union of [start, end] intervals (nested events count once).
const unionMs = (intervals) => {
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const [s, e] of intervals) {
    if (s > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else if (e > curEnd) curEnd = e;
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total / 1000; // trace times are µs
};

const createTraceAggregator = () => {
  const threadNames = new Map();
  const paint = new Map();
  const tasks = new Map();
  const push = (map, key, e) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push([e.ts, e.ts + e.dur]);
  };
  return {
    add(events) {
      for (const e of events) {
        const key = `${e.pid}:${e.tid}`;
        if (e.ph === 'M' && e.name === 'thread_name') threadNames.set(key, e.args?.name ?? '');
        else if (e.ph === 'X' && e.dur > 0) {
          if (PAINT_EVENTS.has(e.name)) push(paint, key, e);
          else if (e.cat?.includes('toplevel')) push(tasks, key, e);
        }
      }
    },
    summarize(seconds) {
      let paintMs = 0;
      for (const [key, list] of paint) if (threadNames.get(key) === 'CrRendererMain') paintMs += unionMs(list);
      const offMainByThread = {};
      for (const [key, list] of tasks) {
        const name = threadNames.get(key) ?? '';
        if (!OFF_MAIN_THREAD.test(name)) continue;
        const group = name.replace(/\d+$/, '');
        offMainByThread[group] = (offMainByThread[group] ?? 0) + unionMs(list) / seconds;
      }
      const offMainMs = Object.values(offMainByThread).reduce((a, b) => a + b, 0);
      return { paintMsPerS: paintMs / seconds, offMainMsPerS: offMainMs, offMainByThread };
    },
  };
};

const traceWindow = async (browserCdp, measure) => {
  const agg = createTraceAggregator();
  const onData = ({ value }) => agg.add(value);
  browserCdp.on('Tracing.dataCollected', onData);
  await browserCdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: TRACE_CATEGORIES },
  });
  let result;
  try {
    result = await measure();
  } finally {
    const done = new Promise((resolve) => browserCdp.once('Tracing.tracingComplete', resolve));
    await browserCdp.send('Tracing.end');
    const { dataLossOccurred } = await done;
    browserCdp.off('Tracing.dataCollected', onData);
    if (result) result.traceDataLoss = !!dataLossOccurred;
  }
  return { ...result, ...agg.summarize(result.seconds) };
};

// ---------- CPU profile ----------

// Maps a line in an unminified bundle to its source module (rolldown's //#region markers).
const moduleIndex = new Map();
const moduleOf = async (url, line) => {
  if (!moduleIndex.has(url)) {
    let regions = [];
    try {
      const text = await (await fetch(url)).text();
      regions = text.split('\n').flatMap((l, i) => (l.startsWith('//#region ') ? [[i, l.slice(10).replace('\0', '')]] : []));
    } catch {
      // not fetchable: fall back to the file name
    }
    moduleIndex.set(url, regions);
  }
  const regions = moduleIndex.get(url);
  let found = path.basename(new URL(url).pathname);
  for (const [start, name] of regions) {
    if (start > line) break;
    found = name;
  }
  return found;
};

const summarizeProfile = async (profile, seconds) => {
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfMs = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000;
    selfMs.set(profile.samples[i], (selfMs.get(profile.samples[i]) ?? 0) + dt);
  }
  const fns = new Map();
  const modules = new Map();
  for (const [id, ms] of selfMs) {
    const { functionName, url, lineNumber, columnNumber } = nodes.get(id).callFrame;
    const name = functionName || '(anonymous)';
    if (['(idle)', '(program)', '(root)'].includes(name)) continue;
    const module = url ? await moduleOf(url, lineNumber) : name.startsWith('(') ? name : '(native)';
    const key = `${name} ${module}:${lineNumber + 1}:${columnNumber + 1}`;
    const fn = fns.get(key) ?? { name, module, line: lineNumber + 1, ms: 0 };
    fn.ms += ms;
    fns.set(key, fn);
    modules.set(module, (modules.get(module) ?? 0) + ms);
  }
  const top = (list) => list.sort((a, b) => b.ms - a.ms).slice(0, 10).map((x) => ({ ...x, msPerS: x.ms / seconds }));
  return {
    topFunctions: top([...fns.values()]),
    topModules: top([...modules].map(([module, ms]) => ({ module, ms }))),
  };
};

// ---------- one measured run ----------

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

const metricsOf = async (cdp) => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

const measureScene = async (browser, browserCdp, appUrl, opts, profileName, sceneName, runIndex) => {
  const profile = PROFILES[profileName];
  const scene = SCENES[sceneName];
  const appOrigin = new URL(appUrl).origin;
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    geolocation: PLACE,
    permissions: ['geolocation'],
    serviceWorkers: 'block',
    reducedMotion: 'no-preference',
  });
  const network = { stubbed: {}, blocked: [] };
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === appOrigin) return route.continue();
    const stub = stubFor(url, sceneName);
    if (!stub) {
      network.blocked.push(url.href);
      return route.abort('blockedbyclient');
    }
    network.stubbed[url.hostname] = (network.stubbed[url.hostname] ?? 0) + 1;
    return route.fulfill(stub);
  });
  await context.addInitScript(pageInit, { startMs: Date.parse(scene.start), seed: RANDOM_SEED });

  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottle });
    await page.goto(appUrl);
    // TopLeftButtons render when the start reveal is done.
    const fullscreenButton = page.getByRole('button', { name: 'Enter fullscreen' });
    await fullscreenButton.waitFor({ timeout: 60_000 });

    let fullscreen = null;
    if (scene.fullscreen) {
      await (profile.hasTouch ? fullscreenButton.tap() : fullscreenButton.click());
      await sleep(500);
      fullscreen = (await page.evaluate(() => !!document.fullscreenElement)) ? 'real' : 'simulated';
      if (fullscreen === 'simulated') await page.evaluate(simulateFullscreen);
      await page.mouse.move(0, 0); // park the pointer; no more input from here (idle)
    }
    await sleep(opts.warmup * 1000);

    const checkStart = await page.evaluate(sceneCheck);
    const result = await traceWindow(browserCdp, async () => {
      if (opts.cpuProfile) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
        await cdp.send('Profiler.start');
      }
      const samples = [await metricsOf(cdp)];
      const t0 = performance.now();
      await page.evaluate(() => globalThis.__perf.start());
      for (let s = 1; s <= opts.seconds; s++) {
        await sleep(t0 + s * 1000 - performance.now());
        samples.push(await metricsOf(cdp));
      }
      const pageStats = await page.evaluate(() => globalThis.__perf.stop());
      const cpu = opts.cpuProfile ? (await cdp.send('Profiler.stop')).profile : null;
      return { samples, pageStats, cpu, seconds: samples.at(-1).Timestamp - samples[0].Timestamp };
    });
    const checkEnd = await page.evaluate(sceneCheck);
    if (opts.screenshots) {
      mkdirSync(opts.screenshots, { recursive: true });
      await page.screenshot({ path: path.join(opts.screenshots, `${profileName}-${sceneName}-run${runIndex}.png`) });
    }

    const { samples, seconds } = result;
    const first = samples[0];
    const lastSample = samples.at(-1);
    const rate = (name) => ((lastSample[name] - first[name]) * 1000) / seconds;
    const mb = (bytes) => bytes / 1024 / 1024;
    const frames = result.pageStats.frames;
    return {
      profile: profileName,
      scene: sceneName,
      seconds,
      scriptMsPerS: rate('ScriptDuration'),
      renderMsPerS: rate('RecalcStyleDuration') + rate('LayoutDuration'),
      styleMsPerS: rate('RecalcStyleDuration'),
      layoutMsPerS: rate('LayoutDuration'),
      paintMsPerS: result.paintMsPerS,
      offMainMsPerS: result.offMainMsPerS,
      offMainByThread: result.offMainByThread,
      taskMsPerS: rate('TaskDuration'),
      fps: frames.length / (result.pageStats.ms / 1000),
      frameP50Ms: percentile(frames, 50),
      frameP95Ms: percentile(frames, 95),
      frameMaxMs: frames.length ? Math.max(...frames) : null,
      longTasksPerMin: (result.pageStats.longTasks.length / seconds) * 60,
      longTaskMsPerS: result.pageStats.longTasks.reduce((a, b) => a + b, 0) / seconds,
      heapMbStart: mb(first.JSHeapUsedSize),
      heapMbEnd: mb(lastSample.JSHeapUsedSize),
      heapMbMax: mb(Math.max(...samples.map((m) => m.JSHeapUsedSize))),
      perSecond: samples.slice(1).map((m, i) => ({
        scriptMs: (m.ScriptDuration - samples[i].ScriptDuration) * 1000,
        renderMs: (m.RecalcStyleDuration + m.LayoutDuration - samples[i].RecalcStyleDuration - samples[i].LayoutDuration) * 1000,
        taskMs: (m.TaskDuration - samples[i].TaskDuration) * 1000,
        heapMb: mb(m.JSHeapUsedSize),
      })),
      traceDataLoss: result.traceDataLoss,
      fullscreen,
      check: { start: checkStart, end: checkEnd },
      network,
      cpuProfile: result.cpu ? await summarizeProfile(result.cpu, seconds) : null,
    };
  } finally {
    await context.close();
  }
};

// ---------- report ----------

const median = (values) => {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

const NUMERIC = ['scriptMsPerS', 'renderMsPerS', 'paintMsPerS', 'offMainMsPerS', 'taskMsPerS', 'fps',
  'frameP50Ms', 'frameP95Ms', 'frameMaxMs', 'longTasksPerMin', 'longTaskMsPerS', 'heapMbStart', 'heapMbEnd'];

const medians = (runs) => {
  const groups = new Map();
  for (const r of runs) {
    const key = `${r.profile}/${r.scene}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups.values()].map((list) => ({
    profile: list[0].profile,
    scene: list[0].scene,
    runs: list.length,
    ...Object.fromEntries(NUMERIC.map((k) => [k, median(list.map((r) => r[k]))])),
  }));
};

const fmt = (v, digits = 0) => (v === null || v === undefined ? '–' : v.toFixed(digits));

const table = (rows) => [
  '| Profile | Scene | Script ms/s | Render ms/s | Paint ms/s | Off-main ms/s | Main busy ms/s | FPS | Frame p95 ms | Frame max ms | Long tasks/min | Heap MB |',
  '|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|',
  ...rows.map((r) => `| ${r.profile} | ${r.scene} | ${fmt(r.scriptMsPerS)} | ${fmt(r.renderMsPerS)} | ${fmt(r.paintMsPerS)} | ${fmt(r.offMainMsPerS)} | ${fmt(r.taskMsPerS)} | ${fmt(r.fps)} | ${fmt(r.frameP95Ms, 1)} | ${fmt(r.frameMaxMs)} | ${fmt(r.longTasksPerMin)} | ${fmt(r.heapMbEnd, 1)} |`),
].join('\n');

const profileReport = (runs) => {
  const lines = [];
  for (const r of runs.filter((x) => x.cpuProfile)) {
    lines.push(`\nCPU profile, ${r.profile}/${r.scene} (self time, ms/s):`);
    for (const f of r.cpuProfile.topFunctions) lines.push(`  ${fmt(f.msPerS, 1).padStart(6)}  ${f.name}  (${f.module}:${f.line})`);
    lines.push('  Modules:');
    for (const m of r.cpuProfile.topModules) lines.push(`  ${fmt(m.msPerS, 1).padStart(6)}  ${m.module}`);
  }
  return lines.join('\n');
};

// Fails loudly when the setup did not give the scene it should.
const warnings = (r) => {
  const w = [];
  const end = r.check.end;
  if (r.network.blocked.length) w.push(`blocked requests to unstubbed hosts: ${[...new Set(r.network.blocked.map((u) => new URL(u).hostname))]}`);
  if (!r.network.stubbed['api.open-meteo.com']) w.push('the forecast stub was not used');
  if (end.runningAnimations === 0) w.push('no CSS animation runs');
  if ((r.scene === 'day' || r.scene === 'fullscreen') && !(end.fish && end.boats && end.birds)) {
    w.push(`day scene without fish, boats or birds (fish ${end.fish}, boats ${end.boats}, birds ${end.birds}); try a longer --warmup`);
  }
  if (r.scene === 'rain' && !end.rainCanvas) w.push('rain scene without rain');
  const drift = Math.abs(Date.parse(end.pageTime) - Date.parse(r.check.start.pageTime) - r.seconds * 1000);
  if (drift > 5000) w.push(`the page clock did not run with real time (drift ${Math.round(drift)} ms)`);
  if (r.traceDataLoss) w.push('the trace buffer lost data: the paint and off-main numbers are too low');
  return w;
};

// ---------- main ----------

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  const app = opts.url ? { url: opts.url, stop: () => {} } : await startApp(opts);
  const appHost = new URL(app.url).hostname;
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: !opts.headed,
    // Only the app's host resolves: nothing else can leave the machine.
    args: [`--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE ${appHost}`],
  });
  const runs = [];
  try {
    const browserCdp = await browser.newBrowserCDPSession();
    for (let i = 1; i <= opts.runs; i++) {
      for (const profileName of opts.profiles) {
        for (const sceneName of opts.scenes) {
          process.stdout.write(`run ${i}/${opts.runs}: ${profileName}/${sceneName} (${opts.seconds} s) … `);
          const r = await measureScene(browser, browserCdp, app.url, opts, profileName, sceneName, i);
          r.run = i;
          runs.push(r);
          const e = r.check.end;
          console.log(`fish ${e.fish}, boats ${e.boats}, birds ${e.birds}, rain ${e.rainCanvas}, animations ${e.runningAnimations}, ` +
            `clock ${r.check.start.clockText ?? '–'} → ${e.clockText ?? '–'}${r.fullscreen ? `, fullscreen ${r.fullscreen}` : ''}`);
          for (const w of warnings(r)) console.warn(`  WARNING: ${w}`);
        }
      }
    }
    const summary = medians(runs);
    let commit = null;
    try {
      commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      // not a git checkout
    }
    const env = {
      date: new Date().toISOString(),
      commit,
      chrome: browser.version(),
      headless: !opts.headed,
      cpu: os.cpus()[0]?.model,
      cpus: os.cpus().length,
      build: opts.url ? opts.url : opts.cpuProfile ? 'unminified (--cpu-profile)' : 'dist/',
    };
    mkdirSync(opts.out, { recursive: true });
    const file = path.join(opts.out, `perf-${env.date.replace(/[:.]/g, '-')}${commit ? `-${commit}` : ''}.json`);
    writeFileSync(file, JSON.stringify({ env, options: opts, summary, runs }, null, 2));

    console.log(`\n${opts.runs > 1 ? `Median of ${opts.runs} runs, ` : ''}${opts.seconds} s per scene. ` +
      `Phone: 390×844 @3x, 4× CPU throttle. Desktop: 1280×800 @1x. Chrome ${env.chrome}, commit ${commit ?? '?'}.\n`);
    console.log(table(summary));
    if (opts.cpuProfile) console.log(profileReport(runs));
    console.log(`\nJSON: ${path.relative(process.cwd(), file)}`);
  } finally {
    await browser.close();
    app.stop();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
