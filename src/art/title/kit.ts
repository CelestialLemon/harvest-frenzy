// Shared helpers for the solarpunk title screen layers (sky.ts, mid.ts, fore.ts).
import { PixelCanvas, rng } from '../pixel';

export type Col = string;
export const W = 640;
export const H = 360;
/** y of the horizon line where the valley meets the sky (vanishing point is (VP_X, HORIZON)). */
export const HORIZON = 188;
export const VP_X = 320;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** 4x4 ordered-dither threshold in (0,1) for pixel (x,y). Use `t > bay(x,y)` to pick the next colour of a ramp. */
export const bay = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export { PixelCanvas, rng };

/** Local scratch canvas; fill it with '9' (any opaque colour) to describe a mask for `stamp`. */
export function mk(w: number, h: number, fn: (t: PixelCanvas) => void): PixelCanvas {
  const t = new PixelCanvas(w, h);
  fn(t);
  return t;
}

/**
 * Stamp a mask at (ox,oy): 1px outline (ol) around it, base fill, highlight (hi) on the top-left rim,
 * shade (sh) band on the bottom-right rim `band` px thick. Any of hi/sh/ol may be null.
 */
export function stamp(p: PixelCanvas, m: PixelCanvas, ox: number, oy: number, base: Col, hi: Col | null, sh: Col | null, ol: Col | null, band = 1) {
  const o = (x: number, y: number) => m.opaque(x, y);
  if (ol) for (let y = -1; y <= m.h; y++) for (let x = -1; x <= m.w; x++) {
    if (o(x, y)) continue;
    if (o(x - 1, y) || o(x + 1, y) || o(x, y - 1) || o(x, y + 1)) p.set(ox + x, oy + y, ol);
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!o(x, y)) continue;
    let c = base;
    if (sh) for (let k = 1; k <= band; k++) if (!o(x + k, y) || !o(x, y + k) || !o(x + k, y + k)) c = sh;
    if (hi && (!o(x - 1, y) || !o(x, y - 1)) && c === base) c = hi;
    p.set(ox + x, oy + y, c);
  }
}

/**
 * Pick from a colour ramp (dark→light or any order) with ordered dithering.
 * t in [0,1] maps across the ramp; between two neighbouring colours a Bayer dither blends them.
 */
export function ramp(cols: Col[], t: number, x: number, y: number): Col {
  const k = Math.min(Math.max(t, 0), 0.9999) * (cols.length - 1);
  const i = Math.floor(k);
  return k - i > bay(x, y) ? cols[i + 1] : cols[i];
}

/** Fill y0..y1 rows across x0..x1 with a vertical dithered ramp. */
export function vgrad(p: PixelCanvas, x0: number, x1: number, y0: number, y1: number, cols: Col[]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) p.set(x, y, ramp(cols, (y - y0) / Math.max(1, y1 - y0 - 1), x, y));
}

/** Fill everything below a height function `top(x)` (down to yMax) — used for silhouettes of hills. */
export function hillFill(p: PixelCanvas, top: (x: number) => number, yMax: number, fill: (x: number, y: number, depth: number) => Col, x0 = 0, x1 = W) {
  for (let x = x0; x < x1; x++) {
    const y0 = Math.round(top(x));
    for (let y = y0; y < yMax; y++) p.set(x, y, fill(x, y, y - y0));
  }
}

/** Alpha-blend a translucent colour over what is already on the canvas, snapped back to `snap` palette colours (optional). */
export function tint(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, col: Col, amount: number, onlyOpaque = true) {
  const rgb = (c: Col) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [tr, tg, tb] = rgb(col);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!p.inside(x, y)) continue;
    const v = p.px[y * p.w + x];
    if (onlyOpaque && v >>> 24 === 0) continue;
    const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
    const nr = Math.round(r + (tr - r) * amount), ng = Math.round(g + (tg - g) * amount), nb = Math.round(b + (tb - b) * amount);
    p.px[y * p.w + x] = ((255 << 24) | (nb << 16) | (ng << 8) | nr) >>> 0;
  }
}
