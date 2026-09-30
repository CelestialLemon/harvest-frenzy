// Core pixel-art toolkit shared by all sprite modules. DOM-free so it also runs in Node (tools/preview.ts).
import { P } from './palette';

/** A color: palette char ('0','Y','h',...), '#rrggbb', '#rrggbbaa', or null/'.' for transparent. */
export type Color = string | null;

const colorCache = new Map<string, number>();

/** Parse a Color into packed 0xAABBGGRR (little-endian RGBA byte order in Uint32 view). */
export function parseColor(c: Color): number {
  if (c === null || c === '.' || c === ' ' || c === '') return 0;
  const hit = colorCache.get(c);
  if (hit !== undefined) return hit;
  let hex = c.length === 1 ? P[c] : c;
  if (!hex) throw new Error(`Unknown palette char '${c}'`);
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) : 255;
  const v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  colorCache.set(c, v);
  return v;
}

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint32Array; // packed ABGR per pixel

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint32Array(w * h);
  }

  clone(): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    c.px.set(this.px);
    return c;
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Packed value at (x,y); 0 when transparent/out of bounds. */
  get(x: number, y: number): number {
    x |= 0; y |= 0;
    return this.inside(x, y) ? this.px[y * this.w + x] : 0;
  }

  opaque(x: number, y: number): boolean {
    return (this.get(x, y) >>> 24) > 0;
  }

  set(x: number, y: number, c: Color) {
    x = Math.floor(x); y = Math.floor(y);
    if (!this.inside(x, y)) return;
    this.px[y * this.w + x] = parseColor(c);
  }

  /** Set only if currently opaque (paint inside existing shape). */
  paint(x: number, y: number, c: Color) {
    if (this.opaque(x, y)) this.set(x, y, c);
  }

  clear() {
    this.px.fill(0);
  }

  rect(x: number, y: number, w: number, h: number, c: Color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  strokeRect(x: number, y: number, w: number, h: number, c: Color) {
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
  }

  hline(x0: number, x1: number, y: number, c: Color) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: Color) {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = y0; y <= y1; y++) this.set(x, y, c);
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: Color) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled ellipse centered at (cx,cy) with radii rx, ry (pixel-center based, looks clean at small sizes). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / (rx + 0.01), ny = (y + 0.5 - cy) / (ry + 0.01);
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: Color) {
    this.ellipse(cx, cy, r, r, c);
  }

  /** Ellipse outline ring of thickness 1. */
  ring(cx: number, cy: number, rx: number, ry: number, c: Color) {
    const tmp = new PixelCanvas(this.w, this.h);
    tmp.ellipse(cx, cy, rx, ry, '9');
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!tmp.opaque(x, y)) continue;
      if (!tmp.opaque(x - 1, y) || !tmp.opaque(x + 1, y) || !tmp.opaque(x, y - 1) || !tmp.opaque(x, y + 1)) this.set(x, y, c);
    }
  }

  /** Filled polygon (even-odd scanline). */
  poly(pts: [number, number][], c: Color) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
      }
    }
  }

  /** Stamp a string grid at (x,y). pal overrides map chars to colors; '.' and ' ' are transparent. */
  grid(x: number, y: number, rows: string[], pal?: Record<string, string>) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        this.set(x + i, y + j, pal && pal[ch] !== undefined ? pal[ch] : ch);
      }
    }
  }

  /** Fill rect with 2-color checker dither. */
  dither(x: number, y: number, w: number, h: number, c1: Color, c2: Color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, (i + j) % 2 === 0 ? c1 : c2);
  }

  /** Copy another canvas onto this one (transparent pixels skipped). */
  blit(src: PixelCanvas, dx: number, dy: number, flipX = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const v = src.px[y * src.w + (flipX ? src.w - 1 - x : x)];
      if (v >>> 24 === 0) continue;
      const tx = dx + x, ty = dy + y;
      if (this.inside(tx, ty)) this.px[ty * this.w + tx] = v;
    }
  }

  /** Replace every pixel of color `from` with `to`. */
  replace(from: Color, to: Color) {
    const f = parseColor(from), t = parseColor(to);
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === f) this.px[i] = t;
  }

  /**
   * Add a 1px outline around all opaque pixels (drawn into transparent neighbours).
   * diagonal=true also fills diagonal neighbours (thicker, rounder look).
   */
  outline(c: Color = '0', diagonal = false) {
    const v = parseColor(c);
    const src = this.px.slice();
    const W = this.w, H = this.h;
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 > 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (op(x, y)) continue;
      let n = op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1);
      if (!n && diagonal) n = op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1);
      if (n) this.px[y * W + x] = v;
    }
  }

  /** Recolor the outermost opaque pixels (inner outline) of the shape. */
  innerOutline(c: Color = '0') {
    const v = parseColor(c);
    const src = this.px.slice();
    const W = this.w, H = this.h;
    const op = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 > 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!op(x, y)) continue;
      if (!op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1)) this.px[y * W + x] = v;
    }
  }

  flipX(): PixelCanvas {
    const c = new PixelCanvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) c.px[y * this.w + x] = this.px[y * this.w + (this.w - 1 - x)];
    return c;
  }
}

/** Sprite described as string grids (one string[] per frame, each h rows of w chars). */
export interface GridSprite {
  frames: string[][];
  pal?: Record<string, string>;
  /** Anchor (origin) in sprite pixels. Default: bottom-center (w/2, h). */
  ox?: number;
  oy?: number;
  /** Suggested animation speed (frames per second). */
  fps?: number;
  /** Auto-add a 1px outline in this color after drawing (grid must leave a 1px transparent margin). */
  outline?: Color;
}

/** Sprite drawn procedurally. */
export interface DrawSprite {
  w: number;
  h: number;
  frames?: number; // default 1
  draw: (p: PixelCanvas, frame: number) => void;
  ox?: number;
  oy?: number;
  fps?: number;
  outline?: Color;
}

export type SpriteDef = GridSprite | DrawSprite;

export interface RasterSprite {
  name: string;
  w: number;
  h: number;
  ox: number;
  oy: number;
  fps: number;
  frames: PixelCanvas[];
}

export function rasterize(name: string, def: SpriteDef): RasterSprite {
  const frames: PixelCanvas[] = [];
  let w: number, h: number;
  if ('draw' in def) {
    w = def.w; h = def.h;
    const n = def.frames ?? 1;
    for (let f = 0; f < n; f++) {
      const p = new PixelCanvas(w, h);
      def.draw(p, f);
      if (def.outline) p.outline(def.outline);
      frames.push(p);
    }
  } else {
    if (!def.frames.length) throw new Error(`${name}: no frames`);
    h = def.frames[0].length;
    w = Math.max(...def.frames[0].map((r) => r.length));
    def.frames.forEach((rows, fi) => {
      if (rows.length !== h) throw new Error(`${name} frame ${fi}: expected ${h} rows, got ${rows.length}`);
      rows.forEach((r, ri) => {
        if (r.length !== w) throw new Error(`${name} frame ${fi} row ${ri}: expected width ${w}, got ${r.length}: "${r}"`);
        for (const ch of r) {
          if (ch === '.' || ch === ' ') continue;
          if (def.pal && def.pal[ch] !== undefined) continue;
          if (P[ch] === undefined) throw new Error(`${name} frame ${fi} row ${ri}: unknown color char '${ch}'`);
        }
      });
      const p = new PixelCanvas(w, h);
      p.grid(0, 0, rows, def.pal);
      if (def.outline) p.outline(def.outline);
      frames.push(p);
    });
  }
  return { name, w, h, ox: def.ox ?? Math.floor(w / 2), oy: def.oy ?? h, fps: def.fps ?? 6, frames };
}

/** Tiny deterministic RNG for procedural texture variation (so sprites are stable between runs). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
