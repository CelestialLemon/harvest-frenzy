// Generates public/favicon.png (32x32) from the chicken sprite.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { PixelCanvas, rasterize } from '../src/art/pixel';
import { sprites } from '../src/art/sprites/creatures';

const src = rasterize('chicken_walk', sprites.chicken_walk).frames[0];
const p = new PixelCanvas(16, 16);
p.blit(src, 0, 0);
const S = 2, W = 16 * S;
const raw = Buffer.alloc((W * 4 + 1) * W);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const v = p.px[Math.floor(y / S) * 16 + Math.floor(x / S)];
  const o = y * (W * 4 + 1) + 1 + x * 4;
  raw[o] = v & 255; raw[o + 1] = (v >>> 8) & 255; raw[o + 2] = (v >>> 16) & 255; raw[o + 3] = v >>> 24;
}
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 6;
mkdirSync('public', { recursive: true });
writeFileSync('public/favicon.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote public/favicon.png');
