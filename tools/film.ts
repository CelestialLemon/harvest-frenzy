// Capture a strip of frames from a region of the game to judge animation.
// Usage: npx tsx tools/film.ts '<json setup steps>' url 'x,y,w,h' frames intervalMs name [cols]
// Setup steps use the same format as shot.ts (eval / wait / click). Output: tools/out/film_<name>.png (contact sheet).
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const [stepsJson, url, clipS, framesS, intervalS, name, colsS] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const [cx, cy, cw, ch] = clipS.split(',').map(Number);
const frames = +framesS, interval = +intervalS, cols = +(colsS ?? 4);
const dir = `tools/out/film_${name}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('pageerror', (e) => console.log('[pageerror]', (e as Error).message));
await page.goto(url, { waitUntil: 'networkidle0' });
const geo = await page.evaluate(() => {
  const b = document.getElementById('game')!.getBoundingClientRect();
  const v = (window as unknown as { view: { w: number; h: number; ox: number; oy: number } }).view;
  return { x: b.left, y: b.top, sx: b.width / v.w, sy: b.height / v.h, ox: v.ox, oy: v.oy };
});
const px = (x: number, y: number) => [geo.x + (x + geo.ox) * geo.sx, geo.y + (y + geo.oy) * geo.sy];
for (const s of steps) {
  if (s.wait) await new Promise((r) => setTimeout(r, s.wait));
  if (s.eval) { const v = await page.evaluate(s.eval); if (v !== undefined) console.log('eval:', JSON.stringify(v)); }
  if (s.click) { const [x, y] = px(s.click[0], s.click[1]); await page.mouse.click(x, y); }
}
const [x0, y0] = px(cx, cy);
for (let i = 0; i < frames; i++) {
  const t0 = Date.now();
  await page.screenshot({ path: `${dir}/${String(i).padStart(3, '0')}.png`, clip: { x: x0, y: y0, width: cw * geo.sx, height: ch * geo.sy } });
  const left = interval - (Date.now() - t0);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}
await browser.close();
const rows = Math.ceil(frames / cols);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${dir}/%03d.png`, '-vf', `tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', `tools/out/film_${name}.png`]);
console.log(`tools/out/film_${name}.png`);
