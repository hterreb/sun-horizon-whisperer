// Deterministic frame capture of the real Sun Chaser app (dev server on :8080).
// The page runs on Playwright's fake clock; CSS animations are paused and stepped by hand,
// so every frame is exactly `dt` ms of app time apart, no matter how slow the screenshot is.
// usage: node cap.mjs <shot> [frames-override]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { SHOTS } from './shots.mjs';

const name = process.argv[2];
const shot = SHOTS[name];
if (!shot) throw new Error(`unknown shot ${name}; have: ${Object.keys(SHOTS).join(', ')}`);
const frames = +(process.argv[3] || shot.frames);
const dt = +(process.env.DT || shot.dt || 1000 / 30);
if (process.env.TIME) shot.time = process.env.TIME;
const out = `frames/${name}`;
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const [lat, lon, place] = shot.loc;
const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: shot.w ?? 390, height: shot.h ?? 844 }, deviceScaleFactor: shot.dpr ?? 2,
  timezoneId: shot.tz ?? 'Europe/Berlin', locale: 'en-US', isMobile: true, hasTouch: true,
});
await ctx.addInitScript(([lat, lon, place, ls]) => {
  localStorage.setItem('manual-location', JSON.stringify({ latitude: lat, longitude: lon, name: place }));
  localStorage.setItem('temperature-unit', 'C');
  for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
  // Step every CSS animation/transition by hand: pause it, integrate dt * playbackRate.
  window.__advanceCss = (dt) => {
    for (const a of document.getAnimations()) {
      if (a.__ct === undefined) a.__ct = a.currentTime || 0;
      if (a.playState === 'finished') continue;
      if (a.playState === 'running') a.pause();
      a.__ct += dt * a.playbackRate;
      const end = a.effect?.getComputedTiming().endTime ?? Infinity;
      if ((a.playbackRate > 0 && a.__ct >= end) || (a.playbackRate < 0 && a.__ct <= 0)) a.finish();
      else a.currentTime = a.__ct;
    }
  };
  // Cinematic shots: hide the panel, the top-left buttons and the radio, keep the scene.
  window.__hideUi = () => {
    const st = document.createElement('style');
    st.textContent = '[data-hide-ui]{visibility:hidden !important}';
    document.head.append(st);
    for (const label of ['Expand info panel', 'Enter fullscreen', 'Play lo-fi music']) {
      let el = document.querySelector(`[aria-label="${label}"]`);
      while (el?.parentElement && !['fixed', 'absolute'].includes(getComputedStyle(el.parentElement).position)) el = el.parentElement;
      el?.parentElement?.setAttribute('data-hide-ui', '');
    }
  };
}, [lat, lon, place, shot.ls ?? {}]);

const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
const t0 = new Date(shot.time).getTime();
await p.clock.install({ time: t0 - (shot.warm ?? 60000) });
await p.goto('http://localhost:8080/' + (shot.query ?? ''));
await p.waitForLoadState('networkidle');
await p.waitForTimeout(shot.pauseNow ? 300 : 4000);
// pauseNow: freeze where the clock is (for eggs that start at page load and run out).
await p.clock.pauseAt(shot.pauseNow ? await p.evaluate(() => Date.now() + 50) : t0);
if (shot.setup) await shot.setup(p);
if (shot.hideUi) await p.evaluate(() => window.__hideUi());
// settle: let React effects, fetches and CSS start states land
const pdt = shot.prerollDt ?? dt;
for (let i = 0; i < (shot.preroll ?? 30); i++) {
  await p.clock.runFor(pdt);
  await p.evaluate((d) => window.__advanceCss(d), pdt * (shot.cssRate ?? 1));
}
if (shot.afterPreroll) await shot.afterPreroll(p);
const started = Date.now();
for (let i = 0; i < frames; i++) {
  if (shot.atFrame?.[i]) await shot.atFrame[i](p);
  await p.clock.runFor(dt);
  await p.evaluate((d) => window.__advanceCss(d), dt * (shot.cssRate ?? 1));
  if (process.env.PROBE) console.log(i, await p.evaluate(() => new Date().toTimeString().slice(0, 8) + ' ' + (document.querySelector('[data-testid=sun-altitude]')?.textContent ?? '')));
  await p.screenshot({ path: `${out}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
}
console.log(`${name}: ${frames} frames in ${((Date.now() - started) / 1000).toFixed(1)} s`);
await b.close();
