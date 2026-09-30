// SKY + FAR DISTANCE: golden-hour gradient, sun, god-rays, clouds, far mountains, distant solarpunk city,
// tiny airships/balloons/birds. Also exports sprite factories for drifting clouds and an airship.
import { PixelCanvas, HORIZON, bay, ramp, rng, mk, stamp, W, H } from './kit';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const SUN_X = 455, SUN_Y = 125;

// ---------------------------------------------------------------- sky gradient, sun, rays
const SKY = ['U', 'w', 'W', 'a', '8', '&', '%', 't'];

function skyBase(x: number, y: number): string {
  const ty = clamp(y / HORIZON);
  const cx = Math.abs(x - 320) / 320;
  const corner = cx * cx * Math.pow(1 - ty, 1.2);
  const t = clamp(Math.pow(ty, 0.92) - corner * 0.2) * 0.93 + 0.07;
  // lilac accents in the upper corners
  let c = ramp(SKY, t, x, y);
  if (corner > 0.16 && t < 0.42 && corner * 1.4 > bay(x + 2, y + 1) + 0.3 && (c === 'w' || c === 'W')) c = 'N';
  return c;
}

function sunGlow(x: number, y: number): number {
  const dx = x - SUN_X, dy = (y - SUN_Y) * 1.05, d = Math.hypot(dx, dy);
  let g = 1.6 * Math.exp(-d / 22);
  for (const [r0, w, a] of [[24, 3.5, 0.13], [42, 4, 0.1], [66, 5, 0.075], [96, 6, 0.05]]) g += a * clamp(1 - Math.abs(d - r0) / w);
  const ang = Math.atan2(dy, dx);
  const ray = Math.pow(0.5 + 0.5 * Math.sin(ang * 6 + 1.3 * Math.sin(ang * 2 + 1)), 2);
  g += ray * 0.32 * Math.exp(-(d * d) / (2 * 62 * 62)) * clamp((d - 14) / 20);
  return g;
}

function paintSky(p: PixelCanvas) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const yy = Math.min(y, HORIZON);
      const base = skyBase(x, yy);
      const g = y < HORIZON ? sunGlow(x, y) : 0;
      p.set(x, y, g > 0.07 ? ramp([base, '&', 'z', 'z'], clamp(g), x, y) : base);
    }
  }
  // sun disc
  for (let y = SUN_Y - 12; y <= SUN_Y + 12; y++) for (let x = SUN_X - 12; x <= SUN_X + 12; x++) {
    const d = Math.hypot(x + 0.5 - SUN_X, y + 0.5 - SUN_Y);
    if (d <= 8.6) p.set(x, y, d < 4.5 ? '9' : d < 6.5 ? ramp(['9', 'z'], (d - 4.5) / 2, x, y) : 'z');
    else if (d <= 10.4) p.set(x, y, ramp(['z', 'Y'], (d - 8.6) / 1.8, x, y));
    else if (d <= 12.5) { if ((d - 10.4) / 2.1 < bay(x, y) * 0.9) p.set(x, y, 'z'); }
  }
}

// ---------------------------------------------------------------- clouds
function cloudMask(w: number, h: number, seed: number, flat = 0): PixelCanvas {
  const r = rng(seed);
  const m = new PixelCanvas(w, h);
  const base = h - 2;
  const n = 4 + Math.floor(w / 26);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const bump = Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * u)), 0.8);
    const rad = Math.max(3, ((h - 3) / 1.74) * (0.38 + 0.62 * bump) * (1 - flat * 0.45) * (0.8 + 0.2 * r()));
    const cx = w * (0.14 + 0.72 * u) + (r() - 0.5) * 5;
    m.circle(cx, base - rad * 0.72, rad, '9');
  }
  m.ellipse(w / 2, base - h * 0.12, w * 0.46, h * 0.14, '9');
  for (let x = 0; x < w; x++) {
    const b = base + (Math.sin(x * 0.35 + seed) > 0.6 ? 0 : 1);
    for (let y = b + 1; y < h; y++) m.px[y * w + x] = 0;
  }
  return m;
}

/** Shade a cloud mask onto p at (ox,oy): lit from the top-left, cool/warm underside chosen by `cols` (light → dark). */
function shadeCloud(p: PixelCanvas, m: PixelCanvas, ox: number, oy: number, cols: string[], dark = 0.5) {
  const cols_ = new Array<{ t: number; b: number }>(m.w);
  for (let x = 0; x < m.w; x++) {
    let t = -1, b = -1;
    for (let y = 0; y < m.h; y++) if (m.opaque(x, y)) { if (t < 0) t = y; b = y; }
    cols_[x] = { t, b };
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!m.opaque(x, y)) continue;
    let k = 1;
    while (k < 9 && m.opaque(x - k, y - k)) k++;
    const light = (k - 1) / 8;
    const { t, b } = cols_[x];
    const vf = (y - t) / Math.max(1, b - t);
    const v = clamp(0.42 * light + 0.9 * Math.pow(vf, 1.6) * dark);
    p.set(ox + x, oy + y, ramp(cols, clamp(v * 0.95 + (b - y <= 1 ? 0.12 : 0)), ox + x, oy + y));
  }
}

const COOL = ['9', '8', 'A', 'N'];
const WARM = ['9', '&', '%', 'A'];

export function makeCloudSprites(): PixelCanvas[] {
  const specs: [number, number, number, number][] = [[100, 38, 11, 0], [76, 30, 23, 0.1], [110, 36, 5, 0.3], [62, 26, 41, 0]];
  return specs.map(([w, h, seed, flat]) => {
    const c = new PixelCanvas(w, h);
    shadeCloud(c, cloudMask(w, h, seed, flat), 0, 0, COOL, 0.75);
    return c;
  });
}

function bgCloud(p: PixelCanvas, cx: number, base: number, w: number, h: number, seed: number, cols = WARM, flat = 0) {
  shadeCloud(p, cloudMask(w, h, seed, flat), Math.round(cx - w / 2), base - h, cols, 0.7);
}

function cirrus(p: PixelCanvas, x: number, y: number, len: number, curve: number, col: string, col2: string, thick = 1) {
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const yy = Math.round(y + curve * Math.sin(u * Math.PI * 0.9) - u * 2);
    const fade = Math.sin(Math.PI * u);
    const xx = x + i;
    if (fade > 0.15) p.set(xx, yy, fade > 0.3 || bay(xx, yy) > 0.5 ? col : col2);
    if (thick > 1 && fade > 0.4 && bay(xx, yy - 1) < fade - 0.3) p.set(xx, yy - 1, col2);
    if (thick > 1 && fade > 0.55 && (xx + yy) % 2 === 0) p.set(xx, yy + 1, col2);
  }
}

function paintCirrus(p: PixelCanvas) {
  const r = rng(7);
  const L: [number, number, number, number, string, string, number][] = [
    [14, 26, 84, 5, 'A', 'N', 2], [40, 40, 96, -4, '8', 'A', 2], [10, 56, 70, 3, 'A', 'a', 1], [70, 18, 60, 2, 'A', 'N', 1],
    [30, 72, 88, -3, '&', 'A', 2], [96, 60, 64, 2, '8', 'a', 1], [4, 90, 60, 2, '&', 'A', 1],
    [478, 20, 90, -4, 'A', 'N', 2], [520, 40, 100, 5, '8', 'A', 2], [500, 62, 80, -3, 'A', 'a', 1], [560, 12, 60, 3, 'A', 'N', 1],
    [545, 78, 84, 3, '&', 'A', 2], [470, 84, 56, 2, '&', 'A', 1],
    [235, 8, 90, 2, 'a', 'W', 1], [330, 12, 70, -2, 'a', 'W', 1],
  ];
  for (const [x, y, l, c, c1, c2, t] of L) cirrus(p, x, y, l, c, c1, c2, t);
  // tiny wisps
  for (let i = 0; i < 8; i++) {
    const wx = 20 + Math.floor(r() * 570), wy = 96 + Math.floor(r() * 44), wl = 22 + Math.floor(r() * 26);
    if (Math.hypot(wx + wl / 2 - SUN_X, wy - SUN_Y) > 90) cirrus(p, wx, wy, wl, 1, '&', '%');
  }
}

function paintClouds(p: PixelCanvas) {
  // low flat stratus behind the city (warm)
  bgCloud(p, 200, 168, 120, 16, 3, ['&', '%', 'o'.length ? 'Z' : 'Z'], 0.9);
  bgCloud(p, 500, 165, 110, 15, 8, ['&', '%', 'Z'], 0.9);
  // big puffy lit clouds, left & right thirds
  bgCloud(p, 88, 152, 150, 58, 21, WARM);
  bgCloud(p, 34, 108, 74, 30, 5, WARM);
  bgCloud(p, 166, 100, 68, 24, 9, WARM, 0.2);
  bgCloud(p, 566, 142, 140, 52, 33, WARM);
  bgCloud(p, 610, 92, 60, 26, 14, WARM);
  bgCloud(p, 500, 82, 70, 22, 19, WARM, 0.3);
}

// ---------------------------------------------------------------- far mountains, mesas, haze
function ridge(x: number, base: number, amp: number, ph: number) {
  const cx = Math.abs(x - 320) / 320;
  const k = 0.25 + 0.75 * Math.min(1, cx * 1.5);
  return base - k * amp * (0.55 + 0.3 * Math.sin(x * 0.011 + ph) + 0.22 * Math.sin(x * 0.027 + ph * 2.1) + 0.1 * Math.sin(x * 0.061 + ph * 3.3));
}

function mountains(p: PixelCanvas) {
  const layers: { base: number; amp: number; ph: number; cols: string[]; rim: string }[] = [
    { base: 182, amp: 24, ph: 1.0, cols: ['A', '&', '&'], rim: 'z' },
    { base: 188, amp: 16, ph: 4.2, cols: ['N', 'A', '&'], rim: '&' },
  ];
  for (const L of layers) {
    for (let x = 0; x < W; x++) {
      const top = Math.round(ridge(x, L.base, L.amp, L.ph));
      const topR = Math.round(ridge(x + 1, L.base, L.amp, L.ph));
      const bot = 200;
      for (let y = top; y < bot; y++) {
        const d = y - top;
        let c = ramp(L.cols, clamp((y - top) / Math.max(8, bot - top - 4)), x, y);
        if (d < 2 && topR >= top && d === 0) c = L.rim;
        p.set(x, y, c);
      }
    }
  }
  // mesas (flat tops, left & right), hazy lilac
  const mesa = (x0: number, x1: number, top: number, cols: string[]) => {
    for (let x = x0; x < x1; x++) {
      const e = Math.min(x - x0, x1 - x - 1);
      const t = top + Math.round(Math.max(0, 10 - e) * 0.8);
      for (let y = t; y < 196; y++) p.set(x, y, ramp(cols, clamp((y - t) / 26), x, y));
      if (x1 - x <= 3) p.set(x, t, '&');
    }
  };
  mesa(20, 60, 161, ['N', 'A', '&']);
  mesa(56, 92, 170, ['N', 'A', '&']);
  mesa(566, 612, 163, ['N', 'A', '&']);
  mesa(590, 632, 172, ['N', 'A', '&']);
}

// ---------------------------------------------------------------- distant solarpunk city
interface B { x: number; w: number; h: number; kind: string; back?: boolean; base?: number }

function tower(p: PixelCanvas, b: B, r: () => number) {
  const base = b.base ?? 190;
  const y0 = base - b.h, x0 = b.x, x1 = b.x + b.w - 1;
  const cols = b.back ? ['A', 'A', '&'] : ['N', 'A', '&'];
  const rimC = 'z';
  const topAt = (x: number): number => {
    const u = (x - x0) / Math.max(1, b.w - 1);
    if (b.kind === 'round') return y0 + Math.round(4 * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)))));
    if (b.kind === 'leaf') return y0 + Math.round(Math.abs(2 * u - 1) * b.w * 0.55);
    if (b.kind === 'step') return y0 + (u < 0.4 ? 5 : u < 0.7 ? 2 : 0);
    if (b.kind === 'slant') return y0 + Math.round((1 - u) * 5);
    return y0;
  };
  for (let x = x0; x <= x1; x++) {
    const t = topAt(x);
    for (let y = t; y < base; y++) {
      let c = ramp(cols, clamp((y - y0) / Math.max(12, b.h * 0.95)), x, y);
      if (x === x1 && !b.back) c = y % 5 === 3 ? rimC : '&';
      p.set(x, y, c);
    }
    if (b.kind !== 'spire' && !b.back && b.w > 4) p.set(x, t, x > x0 + b.w * 0.5 ? '&' : 'A');
  }
  // vertical gardens: hanging vine strips + balcony greenery
  if (!b.back) {
    const nv = b.w > 8 ? 2 : 1;
    for (let k = 0; k < nv; k++) {
      const vx = x0 + 1 + Math.floor(r() * (b.w - 3));
      const len = 8 + Math.floor(r() * b.h * 0.6);
      for (let y = y0 + 3; y < Math.min(base - 4, y0 + 3 + len); y++) p.set(vx, y, y % 3 === 0 ? 's' : 'S');
      if (b.w > 5) for (let y = y0 + 4; y < y0 + 3 + len; y += 5) p.set(vx + 1, y, 'x');
    }
    for (let y = y0 + 6 + Math.floor(r() * 3); y < base - 6; y += 6 + Math.floor(r() * 3)) {
      const gx = x0 + Math.floor(r() * 2), gl = Math.max(2, Math.floor(b.w * (0.4 + 0.4 * r())));
      for (let i = 0; i < gl; i++) if (gx + i < x1) p.set(gx + i, y, i % 3 === 2 ? 'x' : 'S');
      if (r() < 0.5 && gx + 1 < x1) p.set(gx + 1, y - 1, 'x');
    }
    // lit windows
    for (let y = y0 + 4; y < base - 8; y += 3) for (let x = x0 + 1; x < x1; x += 2) {
      if (r() < 0.13 && p.get(x, y) === p.get(x, y)) p.set(x, y, r() < 0.5 ? 'Y' : 'z');
    }
  }
  // roof features
  const cxm = Math.round((x0 + x1) / 2);
  const tc = topAt(cxm);
  if (b.kind === 'flat' || b.kind === 'step' || b.kind === 'slant') {
    if (!b.back) for (let x = x0; x <= x1; x++) { p.set(x, topAt(x) - 1, x % 2 ? 'S' : 's'); if (r() < 0.4) p.set(x, topAt(x) - 2, 'S'); }
  }
  if (b.kind === 'spire') {
    const sl = 9 + Math.floor(r() * 8);
    p.vline(cxm, tc - sl, tc - 1, b.back ? 'A' : 'N');
    p.set(cxm, tc - sl - 1, 'z');
    p.set(cxm - 1, tc - 2, 'N'); p.set(cxm + 1, tc - 2, 'N');
    p.set(cxm - 1, tc - 4, b.back ? 'A' : 'N'); p.set(cxm + 1, tc - 4, b.back ? 'A' : 'N');
  }
  if (b.kind === 'dome') {
    const rr = Math.max(3, Math.floor(b.w / 2));
    for (let y = -rr; y <= 0; y++) for (let x = -rr; x <= rr; x++) {
      const d = Math.hypot(x, y * 1.1);
      if (d <= rr) p.set(cxm + x, tc + y, d > rr - 1.2 ? 'j' : x < 0 && y < -rr * 0.3 ? '9' : ramp(['v', 'v', 'J'], clamp(1 - (x + rr) / (2 * rr)) * 0.5 + (y + rr) / rr * 0.4, cxm + x, tc + y));
    }
    p.set(cxm - 1, tc - rr + 1, '9');
  }
  if (b.kind === 'round') {
    for (let x = x0 + 1; x < x1; x += 2) p.set(x, topAt(x) - 1, 'S');
  }
  if (b.kind === 'turbine') {
    for (let x = x0; x <= x1; x++) p.set(x, y0 - 1, 'S');
    const hy = y0 - 12;
    p.vline(cxm, hy, y0 - 1, 'A');
    p.line(cxm, hy, cxm, hy - 6, 'A'); p.line(cxm, hy, cxm + 5, hy + 3, 'A'); p.line(cxm, hy, cxm - 5, hy + 3, 'N');
    p.set(cxm, hy, '9');
  }
  if (b.kind === 'sail') {
    for (let x = x0; x <= x1; x++) p.set(x, y0 - 1, 'S');
    // solar sail: slanted blue panel on a mast
    const mh = 14;
    p.vline(x0 + 1, y0 - mh, y0 - 1, 'N');
    for (let i = 0; i < 8; i++) { p.set(x0 + 2 + i, y0 - mh + 1 + Math.floor(i * 0.9) + 0, 'w'); p.set(x0 + 2 + i, y0 - mh + 2 + Math.floor(i * 0.9), 'U'); }
    p.set(x0 + 3, y0 - mh + 1, 'a'); p.set(x0 + 5, y0 - mh + 3, 'a');
  }
  // rim glint up top for sun-backlit look
  if (!b.back) p.set(x1, topAt(x1) - 1, '9');
}

function city(p: PixelCanvas) {
  const r = rng(101);
  // low, soft hazy hill with tiny trees under the city
  for (let x = 236; x < 470; x++) {
    const u = (x - 236) / 234;
    const top = 181 + Math.round(3 * (1 - Math.sin(Math.PI * u)) + Math.sin(x * 0.2) * 0.6);
    for (let y = top; y < 194; y++) p.set(x, y, ramp(['x', 'S', 'x'], clamp((y - top) / 9), x, y));
  }
  const back: B[] = [
    { x: 262, w: 9, h: 24, kind: 'flat', back: true }, { x: 279, w: 8, h: 33, kind: 'spire', back: true },
    { x: 296, w: 10, h: 28, kind: 'round', back: true }, { x: 331, w: 9, h: 36, kind: 'flat', back: true },
    { x: 352, w: 10, h: 26, kind: 'leaf', back: true }, { x: 372, w: 9, h: 31, kind: 'spire', back: true },
    { x: 398, w: 10, h: 24, kind: 'flat', back: true }, { x: 418, w: 8, h: 20, kind: 'round', back: true },
  ];
  for (const b of back) tower(p, b, r);
  // sky-bridges (back)
  const bridge = (xa: number, xb: number, y: number, sag: number, c: string) => {
    for (let x = xa; x <= xb; x++) {
      const u = (x - xa) / (xb - xa);
      const yy = Math.round(y + sag * Math.sin(Math.PI * u));
      p.set(x, yy, c);
      if (x % 4 === 1) p.set(x, yy - 1, 'S');
    }
  };
  bridge(271, 279, 176, 1, 'A'); bridge(340, 352, 166, 2, 'A'); bridge(381, 398, 172, 2, 'A');
  const front: B[] = [
    { x: 252, w: 8, h: 20, kind: 'sail' }, { x: 264, w: 12, h: 34, kind: 'step' }, { x: 288, w: 8, h: 44, kind: 'turbine' },
    { x: 306, w: 12, h: 26, kind: 'dome' }, { x: 320, w: 10, h: 52, kind: 'spire' }, { x: 341, w: 12, h: 40, kind: 'flat' },
    { x: 358, w: 10, h: 30, kind: 'sail' }, { x: 380, w: 12, h: 46, kind: 'round' }, { x: 396, w: 9, h: 34, kind: 'turbine' },
    { x: 410, w: 13, h: 26, kind: 'dome' }, { x: 426, w: 9, h: 30, kind: 'slant' }, { x: 438, w: 8, h: 18, kind: 'flat' },
  ];
  for (const b of front) tower(p, b, r);
  bridge(276, 288, 168, 2, 'N'); bridge(296, 306, 170, 1, 'N'); bridge(352, 358, 162, 1, 'N'); bridge(368, 380, 158, 2, 'N'); bridge(405, 410, 168, 1, 'N');
  // haze at the city's feet
  for (let y = 168; y < 200; y++) for (let x = 236; x < 470; x++) {
    const t = clamp((y - 168) / 22) * 0.85;
    if (p.opaque(x, y) && t > bay(x, y)) p.set(x, y, y > 186 ? '&' : ramp(['&', '%'], 0.3, x, y));
  }
}

// ---------------------------------------------------------------- far airships, balloons, birds
function tinyAirship(p: PixelCanvas, x: number, y: number, w: number) {
  const h = Math.round(w * 0.38);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const nx = (i + 0.5 - w / 2) / (w / 2), ny = (j + 0.5 - h / 2) / (h / 2);
    if (nx * nx + ny * ny > 1) continue;
    p.set(x + i, y + j, j < h * 0.35 ? '&' : j > h * 0.65 ? 'N' : 'A');
  }
  for (let i = 3; i < w - 4; i++) p.set(x + i, y + 1, i % 3 === 0 ? 'a' : 'w');
  p.set(x - 1, y + h / 2, 'N'); p.set(x - 2, y + 1, 'N'); p.set(x - 2, y + h - 1, 'N');
  p.rect(x + Math.floor(w / 2) - 2, y + h, 4, 1, 'n');
}
function balloon(p: PixelCanvas, x: number, y: number, s: number) {
  for (let j = 0; j < 7 * s; j++) for (let i = 0; i < 6 * s; i++) {
    const nx = (i + 0.5 - 3 * s) / (3 * s), ny = (j + 0.5 - 3 * s) / (3.5 * s);
    if (j < 5 * s ? nx * nx + ny * ny <= 1 : Math.abs(nx) <= 0.9 - (j - 5 * s) * 0.3 / s) p.set(x + i, y + j, Math.floor(i / s) % 2 ? 'Z' : '&');
  }
  p.set(x + 3 * s - 1, y + 1, '9');
  p.vline(x + 3 * s, y + 7 * s, y + 7 * s + 1, 'P');
  p.rect(x + 3 * s - 1, y + 7 * s + 2, 2, 1, 'n');
}
function bird(p: PixelCanvas, x: number, y: number, c = 'P', wide = true) {
  if (wide) { p.set(x, y + 1, c); p.set(x + 1, y, c); p.set(x + 2, y + 1, c); p.set(x + 3, y, c); p.set(x + 4, y + 1, c); }
  else { p.set(x, y, c); p.set(x + 1, y + 1, c); p.set(x + 2, y, c); }
}

function paintFar(p: PixelCanvas) {
  tinyAirship(p, 118, 58, 22);
  tinyAirship(p, 548, 122, 15);
  tinyAirship(p, 222, 148, 9);
  balloon(p, 66, 92, 1); balloon(p, 596, 66, 1); balloon(p, 168, 132, 1);
  for (const [x, y, w] of [[140, 38, 1], [154, 44, 1], [148, 52, 0], [524, 52, 1], [538, 46, 1], [532, 60, 0], [500, 138, 0], [80, 140, 0]] as const) bird(p, x, y, y > 100 ? 'M' : 'P', !!w);
}

// ---------------------------------------------------------------- airship sprite (~70x34)
export function makeAirshipSprite(): PixelCanvas {
  const w = 70, h = 34;
  const c = new PixelCanvas(w, h);
  const env = mk(w, h, (t) => t.ellipse(37, 12.5, 30, 11, '9'));
  stamp(c, env, 0, 0, '&', '9', 'N', 'P', 3);
  // shade underside
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!env.opaque(x, y) || (env.opaque(x, y + 1) && env.opaque(x - 1, y) && env.opaque(x + 1, y) && env.opaque(x, y - 1)) === false) continue;
    const t = (y - 2) / 21;
    if (t > 0.45) c.set(x, y, ramp(['&', 'A', 'N'], (t - 0.45) * 1.7, x, y));
    else if (t > 0.2 && x > 30) c.set(x, y, ramp(['&', '&', 'A'], (t - 0.2) * 2, x, y));
  }
  // envelope ribs
  for (let x = 14; x < 62; x += 8) for (let y = 3; y < 22; y++) if (env.opaque(x, y) && c.get(x, y) !== 0 && y > 4) c.set(x, y, (y > 12) ? 'N' : 'A');
  // dorsal solar sail panels
  for (let x = 16; x < 60; x++) {
    const top = Math.round(12.5 - 11 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 0.5 - 37) / 30, 2)))) + 1;
    for (let k = 0; k < 4; k++) {
      const yy = top + 1 + k;
      if (!env.opaque(x, yy)) continue;
      c.set(x, yy, k === 0 ? 'W' : k === 1 && x % 6 !== 0 ? 'w' : x % 6 === 0 ? 'a' : k === 3 ? 'U' : 'w');
    }
  }
  // gold stripe & rear-facing fins
  for (let x = 12; x < 64; x++) { const yy = 15; if (env.opaque(x, yy) && x % 1 === 0) c.set(x, yy, x < 34 ? 'Y' : 'y'); }
  c.poly([[8, 12], [1, 4], [4, 13]], 'X'); c.poly([[8, 14], [1, 22], [5, 14]], 'T');
  c.line(1, 4, 4, 13, 'V'); c.line(1, 22, 5, 14, 'V');
  // gondola with wood, windows, lantern
  c.line(24, 21, 27, 26, 'P'); c.line(48, 21, 45, 26, 'P'); c.line(36, 23, 36, 26, 'P');
  const gond = mk(w, h, (t) => t.rect(26, 26, 21, 5, '9'));
  stamp(c, gond, 0, 0, 'b', 'B', 'n', 'P', 1);
  for (let x = 28; x < 45; x += 4) { c.set(x, 28, 'z'); c.set(x + 1, 28, 'Y'); }
  c.hline(27, 45, 26, 'B');
  // propeller + small lantern
  c.vline(11, 27, 32, 'P'); c.set(11, 26, 'A'); c.set(11, 33, 'N'); c.hline(12, 26, 29, 'n'); c.set(9, 29, 'z');
  c.set(36, 32, 'Y'); c.set(36, 33, 'z');
  // pennant
  c.line(62, 6, 67, 3, 'P'); c.poly([[67, 3], [69, 4], [67, 6]], 'Q');
  return c;
}

// ---------------------------------------------------------------- main
export function drawSky(p: PixelCanvas) {
  paintSky(p);
  paintCirrus(p);
  paintClouds(p);
  mountains(p);
  city(p);
  paintFar(p);
  // valley haze down to y~205, then a plain sage fill so nothing can show through
  for (let y = HORIZON; y < 206; y++) for (let x = 0; x < W; x++) p.set(x, y, ramp(['&', '&', '8', 'x', 'S'], clamp((y - HORIZON) / 18) * 0.8 + 0.05, x, y));
  for (let y = 206; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, 'S');
}
