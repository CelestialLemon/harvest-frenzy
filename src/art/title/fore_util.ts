// Local drawing helpers for the foreground layer (fore*.ts).
import { PixelCanvas, ramp, bay } from './kit';

export type Rnd = () => number;

/** Lambert-shaded ellipse blob lit from the top-left. cols dark -> light. */
export function blob(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, cols: string[], bias = 0, clip?: (x: number, y: number) => boolean) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / (rx + 0.3), ny = (y + 0.5 - cy) / (ry + 0.3);
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      if (clip && !clip(x, y)) continue;
      const nz = Math.sqrt(1 - r2);
      const l = -0.55 * nx - 0.62 * ny + 0.56 * nz;
      p.set(x, y, ramp(cols, Math.max(0, Math.min(1, l * 0.62 + 0.42 + bias)), x, y));
    }
  }
}

/** Leaf/blade: tapered lens from (x,y) along angle (rad) with length len and max width w. */
export function leaf(p: PixelCanvas, x: number, y: number, ang: number, len: number, w: number, cols: string[], curve = 0) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const nx = -dy, ny = dx;
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bend = curve * t * t * len;
    const cx = x + dx * t * len + nx * bend, cy = y + dy * t * len + ny * bend;
    const half = Math.sin(Math.min(1, t * 1.05 + 0.02) * Math.PI) ** 0.75 * w * 0.5;
    for (let s = -half; s <= half; s += 0.5) {
      const px = Math.round(cx + nx * s), py = Math.round(cy + ny * s);
      // light from top-left: side facing (-1,-1) lighter
      const side = (nx * -0.7 + ny * -0.7) * s / Math.max(0.5, half);
      const v = Math.max(0, Math.min(1, 0.5 + side * 0.4 + (1 - t) * 0.12 - (Math.abs(s) < 0.4 ? 0.2 : 0)));
      p.set(px, py, cols[Math.min(cols.length - 1, Math.floor(v * cols.length))]);
    }
  }
}

/** Small flower: sizes 1 (plus), 2 (rounded 5px), 3 (7px with petals). */
export function flower(p: PixelCanvas, x: number, y: number, size: number, petal: string, hi: string, sh: string, centre: string) {
  if (size <= 1) {
    p.set(x, y - 1, hi); p.set(x - 1, y, petal); p.set(x + 1, y, sh); p.set(x, y + 1, sh); p.set(x, y, centre);
  } else if (size === 2) {
    p.set(x - 1, y - 2, hi); p.set(x, y - 2, petal); p.set(x + 1, y - 2, petal);
    p.set(x - 2, y - 1, hi); p.set(x - 1, y - 1, petal); p.set(x, y - 1, petal); p.set(x + 1, y - 1, petal); p.set(x + 2, y - 1, sh);
    p.set(x - 2, y, petal); p.set(x - 1, y, petal); p.set(x, y, centre); p.set(x + 1, y, petal); p.set(x + 2, y, sh);
    p.set(x - 1, y + 1, petal); p.set(x, y + 1, sh); p.set(x + 1, y + 1, sh); p.set(x, y + 2, sh);
    p.set(x - 1, y, petal);
  } else {
    const pts: [number, number][] = [[0, -3], [3, -1], [2, 3], [-2, 3], [-3, -1]];
    for (const [ox, oy] of pts) {
      p.set(x + ox, y + oy, petal); p.set(x + Math.round(ox * 0.6), y + Math.round(oy * 0.6), petal);
      p.set(x + ox + (ox < 0 ? 0 : 0), y + oy - (oy < 0 ? 0 : -0), petal);
    }
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) p.set(x + i, y + j, petal);
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      if (i * i + j * j > 5) continue;
      if (i + j < -1) p.set(x + i, y + j, hi);
      else if (i + j > 1) p.set(x + i, y + j, sh);
    }
    p.set(x, y, centre); p.set(x + 1, y, centre); p.set(x, y + 1, centre); p.set(x - 1, y, centre);
    p.set(x - 1, y - 2, hi);
  }
}

/** Dandelion (yellow flower) tiny. */
export function dandelion(p: PixelCanvas, x: number, y: number) {
  p.set(x, y, 'Y'); p.set(x - 1, y, 'z'); p.set(x + 1, y, 'y'); p.set(x, y - 1, 'z'); p.set(x, y + 1, 'y');
}

/** Puffball dandelion seed head. */
export function puff(p: PixelCanvas, x: number, y: number) {
  const c = ['9', '8'];
  for (let a = 0; a < 8; a++) {
    const ax = Math.round(Math.cos(a * Math.PI / 4) * 2.2), ay = Math.round(Math.sin(a * Math.PI / 4) * 2.2);
    p.set(x + ax, y + ay, c[a & 1]);
  }
  p.set(x, y, '8'); p.set(x - 1, y - 1, '9'); p.set(x + 1, y, '8');
}

/** Grass tuft: pointed blades fanning out from base, dark base, bright tips. */
export function tuft(p: PixelCanvas, x: number, y: number, h: number, r: Rnd, cols = ['f', 'F', 'G', 'h'], n = 5) {
  for (let i = 0; i < n; i++) {
    const k = (i - (n - 1) / 2) / ((n - 1) / 2 || 1);
    const bh = h * (1 - Math.abs(k) * 0.35) * (0.8 + r() * 0.4);
    const lean = k * 0.9;
    for (let s = 0; s < bh; s++) {
      const t = s / bh;
      const xx = Math.round(x + k * 1.2 + lean * s * 0.75);
      const c = t < 0.3 ? cols[1] : t < 0.7 ? cols[2] : cols[3];
      p.set(xx, Math.round(y - s), k > 0.3 && t < 0.7 ? cols[1] : c);
    }
  }
  p.set(x, y, cols[0]); p.set(x + 1, y, cols[0]);
}

/** Dark-outline circle pixel helper. */
export function disc(p: PixelCanvas, cx: number, cy: number, r: number, c: string) {
  p.ellipse(cx, cy, r, r, c);
}

/** Bayer dither test: true where an overlay of density d (0..1) should show. */
export function dth(x: number, y: number, d: number) {
  return d > bay(x, y);
}

/** Dithered darkening/tint of existing pixels: replaces with col where dither passes. */
export function dimRect(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, col: string, dens: (x: number, y: number) => number) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (dth(x, y, dens(x, y))) p.set(x, y, col);
}

/** Glow halo: warm dither ring around (cx,cy) radius R, only over existing pixels. */
export function glow(p: PixelCanvas, cx: number, cy: number, R: number, col: string, col2: string | null = null, str = 0.8) {
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R;
    if (d >= 1) continue;
    const t = (1 - d) * str;
    if (col2 && dth(x, y, t * 0.6) && t > 0.5) p.set(x, y, col2);
    else if (dth(x, y, t * 0.75)) p.set(x, y, col);
  }
}

/** Line of given thickness (1 or 2) using p.line. */
export function thick(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, c: string, t = 2) {
  p.line(x0, y0, x1, y1, c);
  if (t >= 2) {
    if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) p.line(x0, y0 + 1, x1, y1 + 1, c);
    else p.line(x0 + 1, y0, x1 + 1, y1, c);
  }
}

/** Quadratic bezier point list. */
export function bez(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, n = 24): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2]);
  }
  return out;
}

// ground geometry shared with the other fore_* files
export const topL = (x: number) => 284 + 16 * Math.pow(Math.min(1, x / 258), 2.2);
export const topR = (x: number) => 284 + 16 * Math.pow(Math.min(1, (640 - x) / 262), 2.2);
const BLIN = (y: number) => 262 - (y - 300) * 0.5;
const BRIN = (y: number) => 378 + (y - 300) * 0.75;
const BL: number[] = [], BR: number[] = [];
const interp = (a: number[], f: (y: number) => number, y: number) => {
  const i = Math.floor(y), t = y - i;
  const v0 = a[i] ?? f(i), v1 = a[i + 1] ?? f(i + 1);
  return v0 + (v1 - v0) * t;
};
export const bankL = (y: number) => interp(BL, BLIN, y);
export const bankR = (y: number) => interp(BR, BRIN, y);
/** Read the river's real extents out of the already-painted mid layer so the bank hugs its water. */
export function initBanks(p: PixelCanvas) {
  const water = (x: number, y: number) => {
    const v = p.get(x, y); const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
    return b > 100 && b > r + 30 && g - b < 55;
  };
  const rawL: number[] = [], rawR: number[] = [];
  for (let y = 290; y < 362; y++) {
    let x = 320; let miss = 0;
    if (!water(320, y)) { let ok = false; for (let d = 1; d < 30 && !ok; d++) if (water(320 + d, y)) { x = 320 + d; ok = true; } else if (water(320 - d, y)) { x = 320 - d; ok = true; } if (!ok) { rawL[y] = BLIN(y); rawR[y] = BRIN(y); continue; } }
    let l = x; miss = 0; for (let xx = x; xx > 180 && miss < 3; xx--) { if (water(xx, y)) { l = xx; miss = 0; } else miss++; }
    let r = x; miss = 0; for (let xx = x; xx < 460 && miss < 3; xx++) { if (water(xx, y)) { r = xx; miss = 0; } else miss++; }
    // sanity: keep close to the expected shape
    if (Math.abs(l - BLIN(y)) > 40 || Math.abs(r - BRIN(y)) > 50) { l = BLIN(y); r = BRIN(y); }
    rawL[y] = l; rawR[y] = r;
  }
  const med = (a: number[], y: number) => { const w = [-2, -1, 0, 1, 2].map((k) => a[Math.min(361, Math.max(290, y + k))]).sort((m, n) => m - n); return w[2]; };
  for (let y = 290; y < 362; y++) { BL[y] = med(rawL, y); BR[y] = med(rawR, y) + 1; }
}
/** footpath centre x and half width as functions of y (bottom-left winding toward the valley) */
export const pathX = (y: number) => {
  const s = Math.max(0, Math.min(1, (362 - y) / 60));
  return 66 + (bankL(304) - 10 - 66) * Math.pow(s, 0.85) + 16 * Math.sin(s * 3.6) * (1 - s * 0.6);
};
export const pathW = (y: number) => 2.5 + 15 * Math.pow(Math.max(0, (y - 298) / 64), 1.25);


/** Ramp with crisp bands: dithering only inside a narrow transition zone (keeps big lawns clean). */
export function sharpRamp(cols: string[], t: number, x: number, y: number, w = 0.12): string {
  const k = Math.min(Math.max(t, 0), 0.9999) * (cols.length - 1);
  const i = Math.floor(k), f = k - i;
  if (f < 0.5 - w) return cols[i];
  if (f > 0.5 + w) return cols[i + 1];
  return ((x + y) & 1) === 0 ? cols[i] : cols[i + 1];
}
