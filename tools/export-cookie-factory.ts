// Export the current in-game bakery for the standalone animation comparison.
// Run: node --import tsx tools/export-cookie-factory.ts
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { PixelCanvas, rasterize } from '../src/art/pixel';
import { bakery } from '../src/art/sprites/world/workshops';

const out = 'artifacts/cookie-factory/sprites';
mkdirSync(out, { recursive: true });
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let c = 0xffffffff;
  for (const b of body) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  const size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length); crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, body, crc]);
}
function png(p: PixelCanvas) {
  const w = p.w, h = p.h;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = p.get(x, y);
    const i = y * (w * 4 + 1) + 1 + x * 4;
    raw[i] = v & 255; raw[i + 1] = (v >>> 8) & 255;
    raw[i + 2] = (v >>> 16) & 255; raw[i + 3] = v >>> 24;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const after = rasterize('bakery', bakery);
function exportSheet(frames: PixelCanvas[], name: string) {
  const sheet = new PixelCanvas(after.w * frames.length, after.h);
  frames.forEach((f, i) => sheet.blit(f, i * after.w, 0));
  writeFileSync(`${out}/${name}.png`, png(sheet));
}
exportSheet(after.frames, 'cookie-factory-v2');
writeFileSync(`${out}/cookie-factory-v2.json`, JSON.stringify({
  image: 'cookie-factory-v2.png', width: after.w * after.frames.length, height: after.h, fps: after.fps,
  anchor: { x: after.ox, y: after.oy },
  animations: { idle: [0], working: after.frames.slice(1).map((_, i) => i + 1) },
  frames: after.frames.map((_, i) => ({ name: i === 0 ? 'idle' : `working-${i}`, x: i * after.w, y: 0, w: after.w, h: after.h })),
}, null, 2) + '\n');

console.log(`Exported ${after.w * after.frames.length}x${after.h} RGBA sprite sheet and frame metadata to ${out}`);
