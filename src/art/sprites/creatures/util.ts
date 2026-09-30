// Shared helpers for creature sprites.
import { PixelCanvas, parseColor, type DrawSprite } from '../../pixel';
import { P } from '../../palette';

/** Reverse lookup packed color -> palette char. */
const REV = new Map<number, string>();
for (const k of Object.keys(P)) REV.set(parseColor(k), k);
export const charAt = (p: PixelCanvas, x: number, y: number): string | null => {
  const v = p.get(x, y);
  if (v >>> 24 === 0) return null;
  return REV.get(v) ?? null;
};

/** Stamp a string grid. */
export function g(p: PixelCanvas, x: number, y: number, rows: string[], pal?: Record<string, string>) {
  p.grid(x, y, rows, pal);
}

/**
 * Selective outline: every transparent pixel touching the shape (4-neighbour) gets a dark color
 * derived from the neighbouring fill (map), falling back to `fb`.
 */
export function selOutline(p: PixelCanvas, map: Record<string, string> = {}, fb = '0') {
  const src = p.clone();
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (src.opaque(x, y)) continue;
    const ns: [number, number][] = [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]];
    let col: string | null = null;
    let hit = false;
    for (const [nx, ny] of ns) {
      if (!src.opaque(nx, ny)) continue;
      hit = true;
      const ch = charAt(src, nx, ny);
      if (ch && map[ch]) { col = map[ch]; break; }
    }
    if (hit) p.set(x, y, col ?? fb);
  }
}

/** Remap palette chars across the whole canvas. */
export function recolor(p: PixelCanvas, map: Record<string, string>) {
  const m = new Map<number, number>();
  for (const [a, b] of Object.entries(map)) m.set(parseColor(a), parseColor(b));
  for (let i = 0; i < p.px.length; i++) {
    const t = m.get(p.px[i]);
    if (t !== undefined) p.px[i] = t;
  }
}

/** Build a DrawSprite. */
export function anim(
  w: number, h: number, frames: number, draw: (p: PixelCanvas, f: number) => void,
  opts: { ox?: number; oy?: number; fps?: number } = {},
): DrawSprite {
  return { w, h, frames, draw, ...opts };
}

/** Draw a vertical-ish leg: columns [x, x+w) from y0 to y1 (inclusive), bottom part shifted by dx. */
export function leg(
  p: PixelCanvas, x: number, y0: number, y1: number, dx: number, col: string, foot?: string, w = 2, footH = 1,
) {
  const len = y1 - y0 + 1;
  for (let i = 0; i < len; i++) {
    const y = y0 + i;
    // shift progressively: top rows at x, lower rows shifted by dx
    const t = len <= 1 ? 1 : i / (len - 1);
    const sx = Math.round(dx * t);
    const c = foot && y > y1 - footH ? foot : col;
    p.rect(x + sx, y, w, 1, c);
  }
}

/** Copy a canvas shifted by (dx,dy). */
export function shifted(src: PixelCanvas, dx: number, dy: number): PixelCanvas {
  const c = new PixelCanvas(src.w, src.h);
  c.blit(src, dx, dy);
  return c;
}


/** Thick polyline: stamps a w×w square at every Bresenham point between successive points. */
export function thick(p: PixelCanvas, pts: [number, number][], w: number, col: string) {
  for (let i = 0; i + 1 < pts.length; i++) {
    let [x0, y0] = pts[i].map(Math.round) as [number, number];
    const [x1, y1] = pts[i + 1].map(Math.round) as [number, number];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      p.rect(x0, y0, w, w, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
}
