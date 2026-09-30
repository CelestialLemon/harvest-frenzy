// Shared helpers for the midground layer: hashing, palette ladders, canopies/trees, shadows.
import { PixelCanvas, ramp, bay } from './kit';
import { P, } from '../palette';
import { parseColor } from '../pixel';

export const hash = (a: number, b: number, c = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const rev = new Map<number, string>();
for (const k of Object.keys(P)) rev.set(parseColor(k), k);

const LIGHTER: Record<string, string> = {
  f: 's', F: 'S', G: 'h', h: 'x', H: 'x', s: 'S', S: 'v', x: 'v', C: 's', L: 'H', t: 'z', B: 't', b: 'B', y: 't', Y: 'z',
  I: 'j', j: 'J', J: 'v', i: 'I', w: 'W', W: 'a', u: 'U', U: 'w', n: 'b', d: 'D', D: 'l', l: 'H', X: 'Z', Z: 'A', T: 'X',
  M: 'N', N: 'A', P: 'M', p: 'P', '2': '6', '6': '7', '7': '8', '5': '6',
};
const DARKER: Record<string, string> = {
  h: 'G', G: 'F', F: 'f', H: 'h', L: 'h', S: 's', x: 'S', s: 'C', t: 'y', Y: 'y', y: 'b', B: 'b', b: 'n', z: 'H', v: 'j',
  a: 'W', W: 'w', w: 'U', J: 'j', j: 'I', I: 'i', '&': 'A', '9': '8', '8': '7', '7': '6', l: 'D', D: 'd', A: 'N', N: 'M',
  Z: 'X', X: 'T', T: 'E', n: 'm', f: 'i', C: 'f',
};

/** Push the pixel at (x,y) one step along a palette ladder (only if it is opaque). */
export function shift(p: PixelCanvas, x: number, y: number, light: boolean) {
  if (!p.inside(x, y)) return;
  const v = p.px[y * p.w + x];
  if (v >>> 24 === 0) return;
  const c = rev.get(v);
  if (!c) return;
  const n = (light ? LIGHTER : DARKER)[c];
  if (n) p.set(x, y, n);
}

/** Soft cast shadow on the ground: solid core with a dithered edge, skewed toward the right. */
export function shadow(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) continue;
    if (d < 0.5 || bay(x, y) < 0.5) shift(p, x, y, false);
  }
}

export interface CanPal { ramp: string[]; ol: string | null; acc?: string[]; accN?: number; }

export const GREEN_NEAR: CanPal = { ramp: ['f', 'F', 'G', 'h'], ol: 'f' };
export function greenPal(n: number): CanPal {
  if (n > 0.7) return { ramp: ['f', 'F', 'G', 'h'], ol: 'f' };
  if (n > 0.5) return { ramp: ['C', 'F', 'G', 'h'], ol: null };
  if (n > 0.3) return { ramp: ['s', 'F', 'G'], ol: null };
  if (n > 0.15) return { ramp: ['s', 'S', 'h'], ol: null };
  return { ramp: ['S', 'x', 'x'], ol: null };
}
export function pinkPal(n: number): CanPal {
  if (n > 0.55) return { ramp: ['T', 'X', 'Z', 'A'], ol: 'E', acc: ['9', 'A'], accN: 0.06 };
  if (n > 0.25) return { ramp: ['X', 'Z', 'A'], ol: null };
  return { ramp: ['Z', 'A', 'A'], ol: null };
}
export function goldPal(n: number): CanPal {
  if (n > 0.55) return { ramp: ['n', 'y', 'Y', 'z'], ol: 'n', acc: ['z'], accN: 0.05 };
  if (n > 0.25) return { ramp: ['b', 'y', 'Y'], ol: null };
  return { ramp: ['t', 't', 'z'], ol: null };
}
export function cypressPal(n: number): CanPal {
  if (n > 0.55) return { ramp: ['i', 'f', 'F', 'G'], ol: 'i' };
  if (n > 0.25) return { ramp: ['C', 'f', 'F'], ol: null };
  return { ramp: ['s', 's', 'S'], ol: null };
}

/** Lit blob cluster (leaf mass): sequential lit spheres, dithered ramp, optional coloured outline. */
export function canopy(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, pal: CanPal, seed: number, mass = true) {
  const pad = 2, w = Math.ceil(rx * 2) + pad * 2 + 2, h = Math.ceil(ry * 2) + pad * 2 + 2;
  const t = new PixelCanvas(w, h);
  const ox = Math.round(cx - w / 2), oy = Math.round(cy - h / 2);
  const n = mass ? (rx > 14 ? 7 : rx > 8 ? 5 : rx > 4 ? 3 : 1) : 1;
  const blobs: [number, number, number, number][] = [];
  if (n === 1) blobs.push([w / 2, h / 2, rx, ry]);
  else {
    // bottom row first (behind), then upper blobs in front
    for (let i = 0; i < n; i++) {
      const a = hash(seed, i, 1), b = hash(seed, i, 2);
      const fx = (i === 0 ? 0 : (a - 0.5) * 1.15), fy = i === 0 ? 0.15 : (b - 0.62) * 0.9;
      const r = i === 0 ? 0.62 : 0.4 + 0.18 * hash(seed, i, 3);
      blobs.push([w / 2 + fx * rx * 0.85, h / 2 + fy * ry * 0.85, rx * r + 1, ry * r + 1]);
    }
    blobs.sort((u, v) => v[1] - u[1]);
  }
  const lr = pal.ramp;
  for (const [bx, by, brx, bry] of blobs) {
    for (let y = Math.floor(by - bry - 1); y <= Math.ceil(by + bry + 1); y++) for (let x = Math.floor(bx - brx - 1); x <= Math.ceil(bx + brx + 1); x++) {
      const nx = (x + 0.5 - bx) / (brx + 0.01), ny = (y + 0.5 - by) / (bry + 0.01);
      if (nx * nx + ny * ny > 1) continue;
      const L = 0.5 - 0.42 * nx - 0.5 * ny - 0.08 * (nx * nx + ny * ny) * 2;
      t.set(x, y, ramp(lr, Math.min(1, Math.max(0, L)), x, y));
    }
  }
  if (pal.acc) {
    const an = pal.accN ?? 0.05;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t.opaque(x, y) && hash(x + ox, y + oy, seed) < an) t.set(x, y, pal.acc[(x + y) & 1 ? 0 : pal.acc.length - 1]);
  }
  if (pal.ol) t.outline(pal.ol);
  p.blit(t, ox, oy);
}

export type TreeKind = 'oak' | 'willow' | 'cypress' | 'pink' | 'gold' | 'round';

/** Draw a tree with its base at (x,y) and total height h. n = nearness 0..1 controls contrast. */
export function tree(p: PixelCanvas, kind: TreeKind, x: number, y: number, h: number, seed: number, n: number, shadowOn = true) {
  const pal = kind === 'pink' ? pinkPal(n) : kind === 'gold' ? goldPal(n) : kind === 'cypress' ? cypressPal(n) : greenPal(n);
  const trunkCol = n > 0.55 ? ['n', 'b'] : n > 0.3 ? ['D', 'b'] : ['S', 'S'];
  if (shadowOn) {
    if (kind === 'cypress') shadow(p, x + h * 0.32, y + 0.5, h * 0.42, Math.max(1.2, h * 0.06));
    else shadow(p, x + h * 0.32, y + 0.5, h * 0.46, Math.max(1.4, h * 0.09));
  }
  if (kind === 'cypress') {
    const rx = Math.max(1.5, h * 0.17);
    if (h >= 12) p.rect(Math.round(x), Math.round(y - 2), 1, 2, trunkCol[0]);
    const ry = h * 0.5;
    // stacked narrow blobs give a flame outline
    const t = new PixelCanvas(Math.ceil(rx * 2) + 6, Math.ceil(h) + 6);
    const cx = t.w / 2;
    const cyy = t.h - 3 - (h >= 12 ? 2 : 0) - ry;
    for (let yy = Math.floor(cyy - ry); yy <= Math.ceil(cyy + ry); yy++) for (let xx = 0; xx < t.w; xx++) {
      const ny = (yy + 0.5 - cyy) / ry;
      if (Math.abs(ny) > 1) continue;
      const wv = rx * Math.pow(1 - Math.pow(Math.abs(ny), 2.2), 0.7) * (ny > 0 ? 1 : 0.95) + (ny > 0.3 ? 0 : 0);
      const nx = (xx + 0.5 - cx) / Math.max(0.6, wv);
      if (Math.abs(nx) > 1) continue;
      const L = 0.5 - 0.5 * nx - 0.1 * ny + (Math.sin(yy * 1.3 + seed) > 0.4 ? 0.12 : 0);
      t.set(xx, yy, ramp(pal.ramp, Math.min(1, Math.max(0, L)), xx, yy));
    }
    if (pal.ol) t.outline(pal.ol);
    p.blit(t, Math.round(x - t.w / 2), Math.round(y - (h >= 12 ? 2 : 0) - (t.h - 3)));
    return;
  }
  const rx = h * (kind === 'willow' ? 0.36 : 0.32), ry = h * (kind === 'willow' ? 0.3 : 0.3);
  const tw = Math.max(1, Math.round(h * 0.07));
  const trunkTop = y - h * 0.42;
  if (h >= 9) {
    for (let yy = Math.round(trunkTop); yy <= y; yy++) for (let i = 0; i < tw; i++) p.set(Math.round(x - tw / 2) + i, yy, i === 0 ? trunkCol[1] : trunkCol[0]);
    if (h >= 26) { p.set(Math.round(x - tw / 2) - 1, Math.round(y), trunkCol[1]); p.set(Math.round(x + tw / 2), Math.round(y), trunkCol[0]); }
  }
  const cy = y - h * 0.42 - ry * 0.7;
  canopy(p, x, cy, rx, ry, pal, seed);
  if (kind === 'willow' && h >= 14) {
    const cnt = Math.round(rx * 1.6);
    for (let i = 0; i < cnt; i++) {
      const sx = Math.round(x - rx + 1 + (i * (rx * 2 - 2)) / Math.max(1, cnt - 1));
      const len = Math.round(ry * (0.7 + 0.8 * hash(seed, i, 9)));
      const top = Math.round(cy + ry * 0.55 * (1 - Math.pow((sx - x) / rx, 2) ) + 0);
      for (let k = 0; k < len; k++) p.set(sx, top + k, k < len * 0.5 ? (i & 1 ? pal.ramp[2] : pal.ramp[1]) : pal.ramp[Math.min(pal.ramp.length - 1, 1 + (k & 1))]);
    }
  }
}

/** Scatter wildflower colour dots inside a rect where the predicate allows. */
export function flowers(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, count: number, seed: number, ok: (x: number, y: number) => boolean) {
  const cols = ['Z', '9', 'Y', 'N', '#', 'A', 'z'];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(x0 + hash(seed, i, 1) * (x1 - x0)), y = Math.floor(y0 + hash(seed, i, 2) * (y1 - y0));
    if (!ok(x, y)) continue;
    p.set(x, y, cols[Math.floor(hash(seed, i, 3) * cols.length)]);
    if (hash(seed, i, 4) < 0.25 && ok(x + 1, y)) p.set(x + 1, y, cols[Math.floor(hash(seed, i, 5) * cols.length)]);
  }
}
