// Renders ad.html frame by frame. usage:
//   node render.mjs stills 0.5,3,7.2   → stills/t<sec>.jpg (check frames)
//   node render.mjs video              → ad-silent.mp4 (1080x1920, 30 fps, H.264)
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [mode, list] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto('file://' + process.cwd() + '/ad.html?rec');
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const shot = async (t) => { await p.evaluate((t) => window.renderAt(t), t); return p.screenshot({ type: 'jpeg', quality: 95 }); };
if (mode === 'stills') {
  fs.mkdirSync('stills', { recursive: true });
  for (const t of list.split(',').map(Number)) fs.writeFileSync(`stills/t${t.toFixed(2)}.jpg`, await shot(t));
} else {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '16M', '-bufsize', '32M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'ad-silent.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = 30 * 30, t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const buf = await shot(f / 30);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 100 === 0) console.log(`frame ${f}/${N} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}
await b.close();
