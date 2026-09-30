// Sprite registry: rasterizes SpriteDefs lazily into canvases and draws them with anchors / flips / 9-slice.
import { rasterize, type RasterSprite, type SpriteDef } from '../art/pixel';
import { sprites as creatures } from '../art/sprites/creatures';
import { sprites as world } from '../art/sprites/world';
import { sprites as items } from '../art/sprites/items';
import { sprites as ui } from '../art/sprites/ui';
import { logo, mapBackground, mapNode } from '../art/scenes';
import { titleBackgroundSprite, titleOverlaySprites } from '../art/title';

const defs: Record<string, SpriteDef> = {
  ...creatures, ...world, ...items, ...ui,
  title_bg: titleBackgroundSprite, ...titleOverlaySprites, logo, map_bg: mapBackground, map_node: mapNode,
};

export interface Sprite {
  name: string;
  w: number;
  h: number;
  ox: number;
  oy: number;
  fps: number;
  frames: HTMLCanvasElement[];
  flipped: (HTMLCanvasElement | undefined)[];
  missing?: boolean;
}

const cache = new Map<string, Sprite>();
const warned = new Set<string>();

function toCanvas(r: RasterSprite['frames'][number]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(r.w, r.h);
  new Uint32Array(img.data.buffer).set(r.px);
  ctx.putImageData(img, 0, 0);
  return c;
}

function placeholder(name: string): Sprite {
  const c = document.createElement('canvas');
  c.width = 12; c.height = 12;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, 12, 12);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 6, 6); ctx.fillRect(6, 6, 6, 6);
  return { name, w: 12, h: 12, ox: 6, oy: 12, fps: 1, frames: [c], flipped: [], missing: true };
}

export function has(name: string) { return name in defs; }

export function sprite(name: string): Sprite {
  let s = cache.get(name);
  if (s) return s;
  const def = defs[name];
  if (!def) {
    if (!warned.has(name)) { warned.add(name); console.warn(`[sprites] missing sprite '${name}'`); }
    s = placeholder(name);
  } else {
    try {
      const r = rasterize(name, def);
      s = { name, w: r.w, h: r.h, ox: r.ox, oy: r.oy, fps: r.fps, frames: r.frames.map(toCanvas), flipped: [] };
    } catch (e) {
      console.error(`[sprites] failed to build '${name}':`, e);
      s = placeholder(name);
    }
  }
  cache.set(name, s);
  return s;
}

/** Pre-build every sprite (call during boot to avoid hitches). */
export function preloadAll() {
  for (const name of Object.keys(defs)) sprite(name);
}

function frameCanvas(s: Sprite, frame: number, flip: boolean): HTMLCanvasElement {
  const i = ((Math.floor(frame) % s.frames.length) + s.frames.length) % s.frames.length;
  if (!flip) return s.frames[i];
  let f = s.flipped[i];
  if (!f) {
    const src = s.frames[i];
    f = document.createElement('canvas');
    f.width = src.width; f.height = src.height;
    const ctx = f.getContext('2d')!;
    ctx.translate(src.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    s.flipped[i] = f;
  }
  return f;
}

export interface DrawOpts { flip?: boolean; alpha?: number; scale?: number; }

/** Draw sprite frame with its anchor at (x,y). */
export function draw(ctx: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number, o: DrawOpts = {}) {
  const s = sprite(name);
  const img = frameCanvas(s, frame, !!o.flip);
  const sc = o.scale ?? 1;
  const ox = o.flip ? s.w - s.ox : s.ox;
  if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha = Math.max(0, o.alpha);
  if (sc === 1) ctx.drawImage(img, Math.round(x - ox), Math.round(y - s.oy));
  else ctx.drawImage(img, Math.round(x - ox * sc), Math.round(y - s.oy * sc), Math.round(s.w * sc), Math.round(s.h * sc));
  if (o.alpha !== undefined) ctx.globalAlpha = 1;
}

/** Frame index for a looping animation at time t (seconds). */
export function animFrame(name: string, t: number, fps?: number) {
  const s = sprite(name);
  return Math.floor(t * (fps ?? s.fps)) % s.frames.length;
}

export function frameCount(name: string) { return sprite(name).frames.length; }

/** 9-slice draw: corners fixed, edges and center stretched. inset = [left, top, right, bottom]. */
export function drawNine(ctx: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number, w: number, h: number, inset: [number, number, number, number]) {
  const s = sprite(name);
  const img = frameCanvas(s, frame, false);
  const [l, t, r, b] = inset;
  const sw = s.w, sh = s.h;
  const cw = sw - l - r, ch = sh - t - b;
  const dw = Math.max(0, w - l - r), dh = Math.max(0, h - t - b);
  x = Math.round(x); y = Math.round(y);
  const part = (sx: number, sy: number, sww: number, shh: number, dx: number, dy: number, dww: number, dhh: number) => {
    if (sww > 0 && shh > 0 && dww > 0 && dhh > 0) ctx.drawImage(img, sx, sy, sww, shh, dx, dy, dww, dhh);
  };
  part(0, 0, l, t, x, y, l, t);
  part(l, 0, cw, t, x + l, y, dw, t);
  part(sw - r, 0, r, t, x + l + dw, y, r, t);
  part(0, t, l, ch, x, y + t, l, dh);
  part(l, t, cw, ch, x + l, y + t, dw, dh);
  part(sw - r, t, r, ch, x + l + dw, y + t, r, dh);
  part(0, sh - b, l, b, x, y + t + dh, l, b);
  part(l, sh - b, cw, b, x + l, y + t + dh, dw, b);
  part(sw - r, sh - b, r, b, x + l + dw, y + t + dh, r, b);
}

/** Draw with the sprite's top-left corner at (x,y), regardless of its anchor. */
export function drawTL(ctx: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number, o: DrawOpts = {}) {
  const s = sprite(name);
  draw(ctx, name, frame, x + (o.flip ? s.w - s.ox : s.ox), y + s.oy, o);
}

/** Draw with the sprite's bottom-center at (x,y), regardless of its anchor. */
export function drawBC(ctx: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number, o: DrawOpts = {}) {
  const s = sprite(name);
  drawTL(ctx, name, frame, Math.round(x - s.w / 2), y - s.h, o);
}
