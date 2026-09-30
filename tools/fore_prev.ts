// temp preview for fore layer with a fake backdrop (deleted later)
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { PixelCanvas } from '../src/art/pixel';
import { drawFore } from '../src/art/title/fore';
const a = process.argv.slice(2);
const get = (k: string, d: string) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const scale = +get('--scale', '2'), out = get('--out', 'fore_x');
const crop = get('--crop', '0,0,640,360').split(',').map(Number);
const p = new PixelCanvas(640, 360);
const sky = ['a','a','v','%','&','&'];
for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) {
  let c: string;
  if (y < 188) c = y < 100 ? 'W' : y < 150 ? 'a' : 'v'; else {
    // valley: green fields, river widening
    const t = (y - 188) / 172; const half = 2 + t * t * 100 + t*40;
    c = Math.abs(x - 320) < half ? (((x+y)&1)? 'W':'a') : (((x>>2)+(y>>2))&1 ? 'S' : 'x');
  }
  p.set(x, y, c);
}
const t0 = Date.now(); drawFore(p); console.log('ms', Date.now() - t0);
const [cx, cy, cw, ch] = crop, W = cw * scale, H = ch * scale;
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; for (let x = 0; x < W; x++) { const v = p.get(cx + Math.floor(x / scale), cy + Math.floor(y / scale)); const o = y * (W * 4 + 1) + 1 + x * 4; raw[o] = v & 255; raw[o + 1] = (v >>> 8) & 255; raw[o + 2] = (v >>> 16) & 255; raw[o + 3] = 255; } }
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(`tools/out/${out}.png`, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
