// Render sprite modules to a PNG contact sheet so art can be inspected visually.
// Usage: npx tsx tools/preview.ts <module.ts> [more modules...] [--scale 3] [--bg #7ba05b] [--only name1,prefix*] [--out file]
// Each module must export `sprites: Record<string, SpriteDef>`.
// Output: tools/out/<out|module-basename>.png  (open it with the Read tool to view)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PixelCanvas, rasterize, parseColor, type SpriteDef, type RasterSprite } from '../src/art/pixel';

const args = process.argv.slice(2);
const mods: string[] = [];
let scale = 3, bg = '#7ba05b', only: string[] | null = null, out = '';
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--scale') scale = +args[++i];
  else if (a === '--bg') bg = args[++i];
  else if (a === '--only') only = args[++i].split(',');
  else if (a === '--out') out = args[++i];
  else mods.push(a);
}
if (!mods.length) {
  console.log('usage: npx tsx tools/preview.ts <module.ts> [--scale 3] [--bg #hex] [--only a,b*] [--out name]');
  process.exit(1);
}

// --- tiny 3x5 label font -------------------------------------------------------
const F: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', _: '000000000000111', '-': '000000111000000', ' ': '000000000000000', '(': '010100100100010',
  ')': '010001001001010', x: '000101010101000', '.': '000000000000010', '/': '001001010100100',
};
function label(p: PixelCanvas, x: number, y: number, text: string, c = '#ffffff') {
  for (const ch of text.toUpperCase()) {
    const g = F[ch] ?? F[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') p.set(x + i, y + j, c);
    x += 4;
  }
}

// --- PNG encoder --------------------------------------------------------------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(p: PixelCanvas, s: number): Buffer {
  const W = p.w * s, H = p.h * s;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const v = p.px[Math.floor(y / s) * p.w + Math.floor(x / s)];
      const o = y * (W * 4 + 1) + 1 + x * 4;
      raw[o] = v & 255; raw[o + 1] = (v >>> 8) & 255; raw[o + 2] = (v >>> 16) & 255; raw[o + 3] = v >>> 24;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// --- main ---------------------------------------------------------------------
const match = (n: string) => !only || only.some((o) => (o.endsWith('*') ? n.startsWith(o.slice(0, -1)) : n === o));
const list: RasterSprite[] = [];
for (const m of mods) {
  const mod = await import(pathToFileURL(resolve(m)).href);
  const sprites: Record<string, SpriteDef> = mod.sprites;
  if (!sprites) throw new Error(`${m} does not export 'sprites'`);
  for (const [name, def] of Object.entries(sprites)) {
    if (!match(name)) continue;
    try {
      list.push(rasterize(name, def));
    } catch (e) {
      console.error('ERROR', (e as Error).message);
      process.exitCode = 1;
    }
  }
}

// Layout: one row per sprite: label, then frames side by side (with gaps), rows wrap if too wide.
const GAP = 4, MAXW = 900;
let y = 2, rowsOut: { s: RasterSprite; x: number; y: number }[] = [];
let sheetW = 200;
for (const s of list) {
  const need = s.frames.length * (s.w + GAP);
  const perRow = Math.max(1, Math.floor((MAXW - 4) / (s.w + GAP)));
  const lines = Math.ceil(s.frames.length / perRow);
  rowsOut.push({ s, x: 2, y });
  sheetW = Math.max(sheetW, Math.min(need, perRow * (s.w + GAP)) + 8, s.name.length * 4 + 60);
  y += 8 + lines * (s.h + GAP) + 2;
}
const sheet = new PixelCanvas(sheetW, y + 2);
sheet.rect(0, 0, sheet.w, sheet.h, bg);
const bgv = parseColor(bg);
for (const { s, x, y: ry } of rowsOut) {
  label(sheet, x, ry, `${s.name} ${s.w}x${s.h} f${s.frames.length}`, '#ffffff');
  const perRow = Math.max(1, Math.floor((MAXW - 4) / (s.w + GAP)));
  s.frames.forEach((f, i) => {
    const fx = x + (i % perRow) * (s.w + GAP), fy = ry + 8 + Math.floor(i / perRow) * (s.h + GAP);
    // faint frame border so sprite bounds are visible
    for (let k = -1; k <= s.w; k++) { sheet.set(fx + k, fy - 1, '#00000030'); sheet.set(fx + k, fy + s.h, '#00000030'); }
    sheet.blit(f, fx, fy);
    // anchor marker (magenta pixel just outside frame)
    sheet.set(fx + s.ox, fy + s.h + 1, '#ff00ff');
  });
}
void bgv;
mkdirSync('tools/out', { recursive: true });
const file = `tools/out/${out || basename(mods[0]).replace(/\.ts$/, '')}.png`;
writeFileSync(file, png(sheet, scale));
console.log(`wrote ${file} (${list.length} sprites, ${sheet.w * scale}x${sheet.h * scale})`);
for (const s of list) console.log(`  ${s.name}: ${s.w}x${s.h}, ${s.frames.length} frame(s), anchor (${s.ox},${s.oy})`);
