// Render the solarpunk title background to a PNG for visual iteration.
// Usage: npx tsx tools/title.ts [--layer sky|mid|fore|all] [--scale 2] [--crop x,y,w,h] [--out name]
// Output: tools/out/<out|title>.png — open it with the Read tool.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { PixelCanvas } from '../src/art/pixel';
import { drawTitleScene, type TitleLayer } from '../src/art/title';

const a = process.argv.slice(2);
const get = (k: string, d: string) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const layer = get('--layer', 'all') as TitleLayer, scale = +get('--scale', '2'), out = get('--out', 'title');
const crop = get('--crop', '0,0,640,360').split(',').map(Number);
const p = new PixelCanvas(640, 360);
// checker backdrop so transparent (unpainted) areas are obvious when previewing one layer
for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) p.px[y * 640 + x] = ((x >> 3) + (y >> 3)) & 1 ? 0xffb050b0 : 0xffc060c0;
drawTitleScene(p, layer);

const [cx, cy, cw, ch] = crop, W = cw * scale, H = ch * scale;
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const v = p.get(cx + Math.floor(x / scale), cy + Math.floor(y / scale));
    const o = y * (W * 4 + 1) + 1 + x * 4;
    raw[o] = v & 255; raw[o + 1] = (v >>> 8) & 255; raw[o + 2] = (v >>> 16) & 255; raw[o + 3] = 255;
  }
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
mkdirSync('tools/out', { recursive: true });
writeFileSync(`tools/out/${out}.png`, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`tools/out/${out}.png`);
