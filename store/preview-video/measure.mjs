import { chromium } from 'playwright-core';
import { SHOTS } from './shots.mjs';
const b = await chromium.launch();
const leafs = (p, re) => p.evaluate((src) => { const r = new RegExp(src); return [...document.querySelectorAll('body *')].filter((e) => e.querySelectorAll("div,span,p").length <= 1 && r.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0).map((e) => { const b = e.getBoundingClientRect(); return `${e.textContent.trim().slice(0, 30)} x${Math.round(b.x)} y${Math.round(b.y)} w${Math.round(b.width)} h${Math.round(b.height)}`; }); }, re.source);
for (const [name, after, re] of [
  ['phonein', async (p) => { await p.getByLabel('Expand info panel').click(); await p.waitForTimeout(800); }, /^(Sunset|18:58|5\/10|Tomorrow:)$/],
  ['golden', async (p) => { await p.waitForTimeout(800); }, /^(Golden hour:|Blue hour:|This evening|Golden & Blue Hour|19:43 – 19:55)$/],
  ['terrain', async (p) => { await p.getByLabel('Expand info panel').click(); await p.getByRole('button', { name: 'Manual' }).click(); await p.getByRole('button', { name: 'Clear', exact: true }).click(); await p.getByLabel('Collapse info panel').click(); await p.waitForTimeout(800); }, /^(16:53|18:09)$/],
]) {
  const s = SHOTS[name];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: s.tz, locale: 'en-US', isMobile: true, hasTouch: true });
  await ctx.addInitScript(([lat, lon, n]) => { localStorage.setItem('manual-location', JSON.stringify({ latitude: lat, longitude: lon, name: n })); localStorage.setItem('temperature-unit', 'C'); }, s.loc);
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date(s.time) });
  await p.goto('http://localhost:8080/');
  await p.waitForTimeout(4000);
  if (name === 'golden') await s.setup(p);
  await after(p);
  console.log(name, JSON.stringify(await leafs(p, re), null, 0));
  await ctx.close();
}
await b.close();
