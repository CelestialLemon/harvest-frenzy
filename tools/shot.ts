// Headless browser driver for visual checks.
// Usage: npx tsx tools/shot.ts '<json steps>' [url]
// steps: [{"click":[x,y]}, {"move":[x,y]}, {"wait":ms}, {"shot":"name"}, {"key":"Escape"}, {"eval":"js"}]
// Coordinates are internal game pixels (640x360). Screenshots -> tools/out/shot_<name>.png
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const steps = JSON.parse(process.argv[2] ?? '[{"wait":1500},{"shot":"title"}]');
const url = process.argv[3] ?? 'http://localhost:5173/';
mkdirSync('tools/out', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const logs: string[] = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${(e as Error).message}`));
await page.goto(url, { waitUntil: 'networkidle0' });
const toPage = async (x: number, y: number) => {
  const r = await page.evaluate(() => { const b = document.getElementById('game')!.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  return [r.x + (x + 0.5) * (r.w / 640), r.y + (y + 0.5) * (r.h / 360)] as const;
};
for (const s of steps) {
  if (s.wait) await new Promise((r) => setTimeout(r, s.wait));
  if (s.move) { const [x, y] = await toPage(s.move[0], s.move[1]); await page.mouse.move(x, y); }
  if (s.click) { const [x, y] = await toPage(s.click[0], s.click[1]); await page.mouse.move(x, y); await page.mouse.down(); await new Promise((r) => setTimeout(r, 40)); await page.mouse.up(); await new Promise((r) => setTimeout(r, 60)); }
  if (s.key) await page.keyboard.press(s.key);
  if (s.eval) { const v = await page.evaluate(s.eval); if (v !== undefined) console.log('eval:', JSON.stringify(v)); }
  if (s.shot) {
    const el = await page.$('#game');
    await el!.screenshot({ path: `tools/out/shot_${s.shot}.png` });
    console.log(`shot tools/out/shot_${s.shot}.png`);
  }
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
