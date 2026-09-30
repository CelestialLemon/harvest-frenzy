// MIDGROUND: rolling valley with hill ranges, terraced farms, river, solarpunk settlements, turbines, waterfall.
import { PixelCanvas, ramp, bay, HORIZON, VP_X, W, H } from './kit';
import { hash, shadow, shift, tree, flowers, canopy, type TreeKind } from './mid_util';
import { house, dome, greenhouse, waterTower, lanterns, bridge, boat, turbineTower, makeTurbineBlades, solarFarm, cableCar } from './mid_objs';

export { makeTurbineBlades };

// ------------------------------------------------------------------ geometry
const T = (y: number) => Math.max(0, (y - HORIZON) / (H - HORIZON));
/** river centre line x at scanline y (sweeping S-curve, opening toward bottom-centre) */
export const riverCx = (y: number) => {
  const t = T(y);
  return VP_X + 62 * Math.sin(t * 3.5) * Math.pow(t, 0.72) + 4 * Math.sin(t * 9) * t;
};
/** river half width at scanline y (=60px at y=300) */
export const riverHw = (y: number) => Math.max(0.7, 92 * T(y));
const bankL = (y: number) => riverCx(y) - riverHw(y);
const bankR = (y: number) => riverCx(y) + riverHw(y);

interface Range {
  side: 'L' | 'R'; xe: number; yb: number; h: number; seed: number; bump: number;
}
const L0: Range = { side: 'L', xe: 270, yb: 190, h: 17, seed: 3, bump: 0.5 };
const L1: Range = { side: 'L', xe: 250, yb: 200, h: 26, seed: 11, bump: 0.5 };
const L2: Range = { side: 'L', xe: 235, yb: 218, h: 38, seed: 21, bump: 0.35 };
const L3: Range = { side: 'L', xe: 250, yb: 248, h: 56, seed: 5, bump: 0.3 };
const L4: Range = { side: 'L', xe: 340, yb: 322, h: 92, seed: 8, bump: 0.25 };
const R0: Range = { side: 'R', xe: 250, yb: 190, h: 15, seed: 13, bump: 0.5 };
const R1: Range = { side: 'R', xe: 260, yb: 200, h: 28, seed: 17, bump: 0.5 };
const R2: Range = { side: 'R', xe: 225, yb: 216, h: 40, seed: 29, bump: 0.35 };
const R3: Range = { side: 'R', xe: 235, yb: 246, h: 54, seed: 37, bump: 0.3 };
const R4: Range = { side: 'R', xe: 330, yb: 322, h: 86, seed: 41, bump: 0.25 };

function topOf(r: Range, x: number): number {
  const u = (r.side === 'L' ? x : W - 1 - x) / r.xe;
  if (u >= 1) return 9999;
  const g = Math.pow(1 - u, 1.28);
  const b = 0.1 * Math.sin(u * 8.5 + r.seed) * (1 - u) + 0.05 * Math.sin(u * 19 + r.seed * 2) * (1 - u);
  return r.yb - r.h * (g + b * r.bump * 2.2);
}

/** Turbine hubs (centre) and scale: blade length px = 22*s. Blades are animated by the game. */
export const TURBINES: { x: number; y: number; s: number }[] = [];
const turbineDefs: [Range, number, number][] = [
  [L4, 46, 1.0], [L3, 128, 0.66], [L2, 176, 0.42], [L1, 208, 0.27], [L0, 96, 0.2],
  [R4, 592, 0.92], [R3, 512, 0.62], [R2, 462, 0.4], [R1, 428, 0.26], [R0, 560, 0.19],
];
for (const [r, x, s] of turbineDefs) {
  const by = Math.round(topOf(r, x)) + 2;
  TURBINES.push({ x, y: by - Math.round(50 * s + 2), s });
}

// ------------------------------------------------------------------ helpers
const inRiver = (x: number, y: number) => y >= HORIZON && x >= bankL(y) - 0.5 && x <= bankR(y) + 0.5;

function fillRange(p: PixelCanvas, r: Range, fill: (x: number, y: number, d: number, top: number) => string, clipMargin: number) {
  for (let x = 0; x < W; x++) {
    const top = topOf(r, x);
    if (top > 400) continue;
    const y0 = Math.round(top);
    const uu = (r.side === 'L' ? x : W - 1 - x) / r.xe;
    const yEnd = Math.min(H, Math.round(r.yb + r.h * 0.95 * Math.pow(Math.max(0, 1 - uu), 0.6) + 2 * Math.sin(x * 0.06 + r.seed)));
    for (let y = y0; y < yEnd; y++) {
      if (y >= HORIZON) {
        const inner = r.side === 'L' ? x > bankL(y) - clipMargin : x < bankR(y) + clipMargin;
        if (inner) continue;
      }
      p.set(x, y, fill(x, y, y - top, top));
    }
    if (yEnd < H && yEnd > y0 + 6 && !(yEnd >= HORIZON && (r.side === 'L' ? x > bankL(yEnd) - clipMargin : x < bankR(yEnd) + clipMargin))) { shift(p, x, yEnd, false); if ((x & 1) === 0) shift(p, x, yEnd + 1, false); }
  }
}

/** rim light along top edges + shade on inward-facing slopes */
function rimLight(p: PixelCanvas, r: Range, strength: number) {
  for (let x = 1; x < W - 1; x++) {
    const top = topOf(r, x);
    if (top > 400) continue;
    const y0 = Math.round(top);
    const slope = topOf(r, x + 2) - topOf(r, x - 2);
    const facingLit = r.side === 'L' ? slope < 0.4 : slope > -0.4;
    if (facingLit || Math.abs(slope) < 0.6) {
      shift(p, x, y0, true);
      if (strength > 1) shift(p, x, y0 + 1, true);
    }
  }
}

// ------------------------------------------------------------------ hills
const CROPS: [string, string][] = [['h', 'G'], ['G', 'F'], ['H', 'L'], ['t', 'Y'], ['a', 'h'], ['F', 'G'], ['h', 'H'], ['G', 'h']];

function distantFill(cols: string[], hgt: number) {
  return (x: number, y: number, d: number) => ramp(cols, Math.min(1, d / hgt), x, y);
}

function terraceFill(r: Range, haze: number, bhBase: number, bhK: number) {
  return (x: number, y: number, d: number) => {
    const bh = bhBase + (y - HORIZON) * bhK;
    const v = (d + 1.6 * Math.sin(x * 0.05 + r.seed) + 1.0 * Math.sin(x * 0.13 + r.seed * 3)) / bh + 40;
    const band = Math.floor(v), f = v - band;
    const kind = Math.floor(hash(band, r.seed, 7) * CROPS.length);
    const WATER = 4;
    const [ca, cb] = CROPS[kind];
    const k = (x - VP_X) / Math.max(4, y - HORIZON);
    const stripe = Math.floor(k * (r.h > 70 ? 11 : bh < 5 ? 7 : 15) + 100 + band * 0.37) & 1;
    let c = stripe ? ca : cb;
    const px = 1 / bh;
    const nearB = bh > 7;
    if (f < px) c = kind === WATER ? 'v' : (nearB ? (hash(x >> 1, band, 3) < 0.6 ? 'H' : c) : c); // sunlit lip
    else if (f > 1 - px) c = nearB ? 'f' : 's'; // wall shadow line
    else if (f > 1 - px * 2 && nearB) c = kind === WATER ? 'I' : (hash(x >> 1, band, 5) < 0.5 ? 'F' : c);
    else if (kind === WATER) { c = stripe ? 'h' : 'G'; if (f < px * 2.5) c = 'a'; else if (f < px * 3.5) c = 'W'; }
    if (haze > 0 && bay(x, y) < haze) return LIGHT[c] ?? c;
    return c;
  };
}
const LIGHT: Record<string, string> = { L: 'H', H: 'z', t: 'z', Y: 'z', G: 'h', h: 'H', B: 't', F: 'G', l: 'H', C: 's', f: 'F', s: 'S', a: 'v', W: 'a' };

// ------------------------------------------------------------------ floor
function drawFloor(p: PixelCanvas) {
  for (let y = HORIZON; y < H; y++) for (let x = 0; x < W; x++) {
    const t = T(y);
    const base = ramp(['A', 'v', 'v', 'h', 'h', 'G', 'F'], Math.min(1, t * 1.45), x, y);
    const k = (x - VP_X) / Math.max(1, y - HORIZON);
    const id = Math.floor(k * 6 + 60);
    const [ca, cb] = CROPS[Math.floor(hash(id, 5, 1) * 3)];
    const fld = ((Math.floor(k * 30 + 200)) & 1) ? ca : cb;
    const amt = Math.min(1, Math.max(0, (y - HORIZON - 6) / 70)) * 0.9;
    let c = amt > bay(x, y) ? fld : base;
    // hedgerow along the strip borders
    const kb = k * 6 + 60, fr = Math.abs(kb - Math.round(kb)) * Math.max(1, y - HORIZON) / 6;
    if (y > 226 && fr < 0.5 && y % 2 === 0) c = bay(x, y) < 0.5 ? 'F' : 's';
    p.set(x, y, c);
  }
  // little trees along a few hedgerows, shrinking toward the horizon
  for (const kb of [-9, -7, -5, 5, 7, 9]) {
    const k = (kb - 60 + 60) / 6;
    for (let i = 0, y = 204; y < 300; i++, y += 3 + Math.floor((y - 200) / 9)) {
      const x = Math.round(VP_X + k * (y - HORIZON));
      if (Math.abs(x - riverCx(y)) < riverHw(y) + 8 || x < 0 || x >= W) continue;
      if (hash(i, kb, 3) < 0.35) continue;
      tree(p, hash(i, kb, 4) < 0.25 ? 'cypress' : 'round', x, y, Math.max(5, Math.round(3 + 34 * T(y))), i * 13 + kb, near(y) * 0.8, true);
    }
  }
}

// ------------------------------------------------------------------ river
function drawRiver(p: PixelCanvas) {
  for (let y = HORIZON; y < H; y++) {
    const cx = riverCx(y), hw = riverHw(y), t = T(y);
    const xa = Math.floor(cx - hw), xb = Math.ceil(cx + hw);
    for (let x = xa; x <= xb; x++) {
      if (x < bankL(y) - 0.5 || x > bankR(y) + 0.5) continue;
      const u = (x - cx) / Math.max(1, hw); // -1..1
      const e = Math.min(x - bankL(y), bankR(y) - x);
      // sky-reflecting water: pale at horizon -> teal near, deep near the banks
      let base = ramp(['i', 'I', 'j', 'J', 'v', 'a'], 1 - Math.min(1, t * 1.5) * 0.85 + (u * 0.08) - 0.1 * Math.abs(u), x, y);
      if (t > 0.05) base = ramp(['i', 'I', 'j', 'J', 'v'], 0.72 - t * 0.5 - 0.22 * Math.abs(u) * (0.5 + t) + 0.12 * Math.sin(y * 0.7 + x * 0.05) * t, x, y);
      if (t < 0.22) base = ramp(['j', 'J', 'v', 'a', 'a'], 0.55 + 0.4 * (1 - t / 0.22) - 0.3 * Math.abs(u), x, y);
      // reflections of the banks
      if (e < 2 + t * 5) base = ramp(['f', 'i', 'I'], (e / (2 + t * 5)) * 0.9, x, y);
      // sun glitter dashes (perspective-scaled)
      const rowSp = 2 + Math.floor(t * 4);
      const row = Math.floor(y / rowSp);
      const len = 2 + Math.floor(t * 9);
      const cell = Math.floor((x + hash(row, 1) * 40) / len);
      if (y % rowSp === 0 && hash(row, cell, 4) < (0.18 + 0.4 * Math.max(0, u + 0.5)) * (t < 0.1 ? 0.3 : 1)) {
        const glint = hash(row, cell, 8);
        base = glint > 0.7 ? '9' : glint > 0.3 ? 'z' : 'v';
        if (u < -0.2) base = glint > 0.6 ? 'v' : 'a';
      } else if (y % rowSp === 0 && hash(row, cell, 5) < 0.25) base = 'j';
      p.set(x, y, base);
    }
  }
  // flowing highlights
}

function drawBanks(p: PixelCanvas) {
  for (let y = HORIZON + 4; y < H; y++) {
    const t = T(y);
    for (const side of [0, 1]) {
      const bx = Math.round(side ? bankR(y) : bankL(y));
      const out = side ? 1 : -1;
      // foam / wet edge
      if (hash(y, side, 2) < 0.55) p.set(bx - out * 0, y, y % 3 === 0 ? '9' : 'v');
      else p.set(bx - out, y, 'v');
      if (t > 0.35 && hash(y, side, 6) < 0.3) p.set(bx - out * 2, y, '9');
      // grassy lip just outside the water
      p.set(bx + out, y, t > 0.5 ? 'x' : 'S');
      if (t > 0.3) p.set(bx + out * 2, y, hash(y, side, 9) < 0.4 ? 'S' : 'h');
    }
  }
  // reed tufts
  for (let i = 0; i < 26; i++) {
    const y = 214 + Math.floor(i * 5.6), side = i & 1 ? 1 : -1;
    const x = Math.round((side < 0 ? bankL(y) : bankR(y)) + side * 2);
    const hgt = 2 + Math.floor(T(y) * 5);
    for (let k = 0; k < hgt; k++) p.set(x + (k > 2 ? side : 0), y - k, k > hgt - 2 ? 'H' : 'F');
    p.set(x + side, y - 1, 'G');
    if (hash(i, 3) < 0.5) p.set(x, y - hgt, 'Y');
  }
}

// ------------------------------------------------------------------ compose
type Item = { y: number; draw: () => void };
const yOf = (r: Range, x: number, d: number) => Math.round(topOf(r, x) + d);
const sc = (y: number) => 0.28 + 0.9 * Math.pow(T(y), 0.95); // perspective scale for props at scanline y
const near = (y: number) => Math.min(1, Math.max(0, (y - 190) / 100));

class Layer {
  items: Item[] = [];
  constructor(private p: PixelCanvas, private r: Range) {}
  add(y: number, draw: () => void) { this.items.push({ y, draw }); }
  tree(x: number, d: number, kind: TreeKind, hMul = 1, seed = 0) {
    const y = yOf(this.r, x, d);
    const h = Math.max(5, Math.round((5 + 58 * T(y)) * hMul));
    this.add(y, () => tree(this.p, kind, x, y, h, seed + x * 7 + y, near(y)));
  }
  grove(cx: number, d: number, n: number, spread: number, kinds: TreeKind[], seed: number, hMul = 1) {
    for (let i = 0; i < n; i++) {
      const x = Math.round(cx + (hash(seed, i, 1) - 0.5) * spread * 2);
      const dd = d + (hash(seed, i, 2) - 0.5) * spread * 0.5;
      this.tree(x, dd, kinds[Math.floor(hash(seed, i, 3) * kinds.length)], hMul * (0.75 + 0.5 * hash(seed, i, 4)), seed + i);
    }
  }
  /** orchard row following a terrace: trees spaced along x at constant depth */
  orchard(x0: number, x1: number, d: number, kind: TreeKind, spacing: number, hMul = 0.5, seed = 1) {
    for (let x = x0; x < x1; x += Math.max(4, Math.round(spacing * (0.6 + sc(yOf(this.r, x, d)))))) {
      this.tree(x, d + Math.sin(x * 0.11) * 1.5, kind, hMul, seed);
    }
  }
  house(x: number, d: number, w: number, body: 'cream' | 'terra', roof: 'green' | 'solar' | 'terra', seed = 0) {
    const y = yOf(this.r, x, d);
    const ww = Math.max(6, Math.round(w * (0.7 + sc(y) * 1.05)));
    this.add(y, () => house(this.p, x, y, ww, body, roof, seed + x, y > 235));
  }
  dome(x: number, d: number, r: number) {
    const y = yOf(this.r, x, d), rr = Math.max(3, Math.round(r * (0.55 + sc(y) * 0.6)));
    this.add(y, () => dome(this.p, x, y, rr, y > 235));
  }
  greenhouse(x: number, d: number, w: number, h: number) {
    const y = yOf(this.r, x, d), k = 0.55 + sc(y) * 0.6;
    this.add(y, () => greenhouse(this.p, x, y, Math.round(w * k), Math.round(h * k)));
  }
  tower(x: number, d: number, s: number) {
    const y = yOf(this.r, x, d);
    this.add(y, () => waterTower(this.p, x, y, s * (0.55 + sc(y) * 0.6)));
  }
  flush() {
    this.items.sort((a, b) => a.y - b.y);
    for (const it of this.items) it.draw();
    this.items = [];
  }
}

function ridgeTrees(p: PixelCanvas, r: Range, step: number, hMul: number, seed: number, kinds: TreeKind[]) {
  for (let i = 0, x = 10 + (seed % 7); x < W - 8; i++, x += step + Math.floor(hash(i, seed, 1) * step * 0.8)) {
    const top = topOf(r, x);
    if (top > 400) continue;
    if (turbineDefs.some(([, tx]) => Math.abs(tx - x) < 6)) continue;
    const y = Math.round(top) + 2 + Math.floor(hash(i, seed, 2) * 3);
    if (Math.abs(x - riverCx(y)) < riverHw(y) + 14) continue;
    const h = Math.max(5, Math.round((5 + 58 * T(y)) * hMul * (0.8 + 0.5 * hash(i, seed, 3))));
    tree(p, kinds[Math.floor(hash(i, seed, 4) * kinds.length)], x, y, h, seed + i, near(y), true);
  }
}

function life(p: PixelCanvas) {
  const bf: [number, number, string][] = [[96, 268, '#'], [128, 252, 'N'], [60, 282, 'Y'], [232, 246, 'Z'], [510, 262, 'Y'], [566, 250, '#'], [606, 280, 'N'], [452, 246, 'Z'], [190, 236, 'A'], [420, 268, 'Y']];
  for (const [x, y, c] of bf) {
    p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y + 1, '0');
    p.set(x - 1, y - 1, c === 'Y' ? 'z' : '9'); p.set(x + 1, y - 1, c === 'Y' ? 'z' : '9');
  }
  const bees: [number, number][] = [[44, 262], [150, 258], [540, 268], [584, 270], [176, 270], [470, 236]];
  for (const [x, y] of bees) { p.set(x, y, 'Y'); p.set(x + 1, y, '0'); p.set(x, y - 1, '9'); }
  // dandelion fluff + glowing pollen motes drifting toward the sun
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hash(i, 90, 1) * W), y = 205 + Math.floor(hash(i, 90, 2) * 100);
    if (x > 205 && x < 440 && y < 262) continue;
    if (inRiver(x, y)) continue;
    p.set(x, y, i % 3 === 0 ? '9' : 'z');
    if (i % 4 === 0) { p.set(x + 1, y + 1, 'a'); }
  }
  // lily pads and floating petals near the banks
  for (let i = 0; i < 16; i++) {
    const y = 292 + Math.floor(hash(i, 91, 1) * 60), side = i & 1 ? 1 : -1;
    const x = Math.round((side < 0 ? bankL(y) : bankR(y)) - side * (5 + hash(i, 91, 2) * 12));
    p.hline(x, x + 2, y, 'F'); p.hline(x, x + 1, y - 1, 'G');
    if (i % 3 === 0) p.set(x + 1, y - 2, 'Z');
  }
}

function fieldFlowers(p: PixelCanvas, r: Range, x0: number, x1: number, n: number, seed: number) {
  flowers(p, x0, 200, x1, 320, n, seed, (x, y) => {
    const top = topOf(r, x);
    return y > top + 3 && !inRiver(x, y) && y < r.yb + r.h * 0.9;
  });
}

export function drawMid(p: PixelCanvas) {
  drawFloor(p);

  // ---- far ranges: hazy silhouettes, no outlines
  const farCols: [Range, string[], number][] = [
    [L0, ['N', 'A', 'A', 'a'], 17], [R0, ['N', 'A', 'A', 'a'], 15],
    [L1, ['S', 'v', 'v', 'a'], 26], [R1, ['S', 'v', 'v', 'a'], 28],
  ];
  for (const [r, cols, h] of farCols) {
    fillRange(p, r, distantFill(cols, h), 3);
    rimLight(p, r, 1);
  }
  for (const r of [L2, R2]) {
    fillRange(p, r, terraceFill(r, 0.6, 2.6, 0.03), 3);
    rimLight(p, r, 1);
  }
  const turb = (r: Range) => {
    for (const t of TURBINES) {
      const rr = turbineDefs.find(([, x]) => x === t.x)![0];
      if (rr === r) turbineTower(p, t.x, Math.round(topOf(r, t.x)) + 2, t.s);
    }
  };
  for (const r of [L0, R0, L1, R1, L2, R2]) turb(r);

  // far settlements & trees (tiny)
  {
    const l2 = new Layer(p, L2), r2 = new Layer(p, R2);
    l2.grove(120, 8, 8, 40, ['oak', 'round', 'cypress'], 31, 0.9);
    l2.house(170, 9, 9, 'cream', 'green'); l2.house(184, 11, 8, 'terra', 'solar'); l2.dome(198, 12, 5);
    r2.grove(500, 8, 8, 40, ['oak', 'round', 'pink'], 33, 0.9);
    r2.house(455, 10, 9, 'cream', 'solar'); r2.house(470, 8, 8, 'cream', 'green'); r2.dome(444, 12, 5);
    l2.flush(); r2.flush();
  }
  drawRiver(p);
  drawBanks(p);

  // ---- R3
  for (const r of [L3, R3]) {
    fillRange(p, r, terraceFill(r, 0.16, 4, 0.045), 2);
    rimLight(p, r, 2);
    turb(r);
  }
  ridgeTrees(p, L2, 13, 0.7, 61, ['oak', 'round', 'cypress']); ridgeTrees(p, R2, 13, 0.7, 62, ['oak', 'round', 'pink']);
  ridgeTrees(p, L3, 15, 0.8, 63, ['oak', 'cypress', 'round']); ridgeTrees(p, R3, 15, 0.8, 64, ['oak', 'cypress', 'gold']);
  fieldFlowers(p, L3, 0, 250, 160, 5); fieldFlowers(p, R3, 400, 640, 160, 6);
  {
    const l3 = new Layer(p, L3), r3 = new Layer(p, R3);
    l3.grove(60, 14, 7, 46, ['oak', 'willow', 'pink', 'cypress'], 41, 0.9);
    l3.house(120, 14, 13, 'cream', 'green'); l3.house(140, 20, 12, 'terra', 'solar'); l3.house(160, 22, 14, 'cream', 'solar');
    l3.dome(184, 26, 8); l3.greenhouse(206, 28, 24, 9); l3.tower(100, 22, 1);
    l3.orchard(20, 96, 30, 'round', 9, 0.6, 3);
    r3.grove(580, 14, 7, 46, ['oak', 'willow', 'gold', 'cypress'], 43, 0.9);
    r3.house(500, 14, 13, 'cream', 'solar'); r3.house(482, 18, 12, 'cream', 'green'); r3.house(462, 22, 13, 'terra', 'green');
    r3.dome(440, 26, 8); r3.tower(520, 24, 1); r3.greenhouse(548, 30, 24, 9);
    r3.orchard(552, 630, 34, 'pink', 9, 0.6, 5);
    l3.flush(); r3.flush();
  }

  haze(p);
  tree(p, 'willow', Math.round(bankL(292)) - 12, 292, 38, 71, 0.85);

  // ---- R4
  for (const r of [L4, R4]) {
    fillRange(p, r, terraceFill(r, 0, 5.5, 0.06), 2);
    rimLight(p, r, 2);
    turb(r);
  }
  ridgeTrees(p, L4, 22, 0.9, 65, ['oak', 'willow', 'round']); ridgeTrees(p, R4, 22, 0.9, 66, ['oak', 'pink', 'round']);
  fieldFlowers(p, L4, 0, 300, 260, 7); fieldFlowers(p, R4, 340, 640, 260, 8);
  {
    const l4 = new Layer(p, L4), r4 = new Layer(p, R4);
    l4.grove(14, 16, 4, 12, ['oak', 'willow'], 51, 1.2);
    l4.house(40, 22, 14, 'cream', 'green'); l4.house(66, 26, 13, 'terra', 'solar'); l4.house(92, 30, 15, 'cream', 'solar');
    l4.dome(118, 34, 9); l4.greenhouse(150, 40, 26, 9); l4.tower(170, 46, 1.1);
    l4.orchard(10, 130, 56, 'round', 10, 0.55, 7);
    l4.grove(190, 50, 5, 20, ['oak', 'pink', 'cypress'], 53, 1);
    r4.grove(628, 16, 4, 12, ['oak', 'willow'], 55, 1.2);
    r4.house(596, 22, 14, 'cream', 'solar'); r4.house(570, 26, 13, 'cream', 'green'); r4.house(544, 30, 15, 'terra', 'green');
    r4.dome(518, 34, 9); r4.tower(496, 44, 1.1); r4.greenhouse(486, 52, 26, 9);
    r4.orchard(500, 630, 62, 'gold', 10, 0.55, 9);
    r4.grove(450, 50, 5, 20, ['oak', 'pink', 'willow'], 57, 1);
    l4.flush(); r4.flush();
  }

  // ---- props that straddle planes
  solarFarm(p, 262, 288, -0.86, -0.6, VP_X, HORIZON);
  waterfall(p);
  bridge(p, Math.round(riverCx(276) - riverHw(276)) - 4, Math.round(riverCx(276) + riverHw(276)) + 4, 276);
  boat(p, Math.round(riverCx(228)) + 2, 228);
  cableCar(p, 58, yOf(L4, 58, 3), 212, yOf(L3, 212, -2), 8, [0.32, 0.74]);
  lanterns(p, 36, yOf(L4, 36, 6), 96, yOf(L4, 96, 12), 6, 5);
  lanterns(p, 548, yOf(R4, 548, 10), 604, yOf(R4, 604, 6), 5, 5);
  life(p);
  // long tower shadows toward the right/bottom
  for (const t of TURBINES) {
    const r = turbineDefs.find(([, x]) => x === t.x)![0];
    const by = Math.round(topOf(r, t.x)) + 3, len = Math.round(26 * t.s);
    for (let i = 1; i <= len; i++) shift(p, t.x + i, by + Math.floor(i * 0.22), false);
  }
}

function waterfall(p: PixelCanvas) {
  const y1 = 282, y0 = 246;
  const fx = Math.round(bankR(y1)) + 17;
  // rock outcrop: irregular silhouette, 3-tone strata, mossy top
  for (let y = y0; y <= y1; y++) {
    const dy = y - y0;
    const hwL = 11 + Math.round(dy * 0.12 + 2.2 * Math.sin(y * 0.8) + (dy < 3 ? -4 + dy * 1.3 : 0));
    const hwR = 12 + Math.round(dy * 0.1 + 2 * Math.sin(y * 0.6 + 2) + (dy < 3 ? -4 + dy * 1.3 : 0));
    for (let x = fx - hwL; x <= fx + hwR; x++) {
      const lit = x - (fx - hwL), sh = fx + hwR - x;
      let c = '3';
      if (lit < 3) c = '4'; else if (lit < 4 && dy % 3 === 0) c = '4';
      else if (sh < 4) c = '5'; else if (sh < 6 && (dy + x) % 2 === 0) c = '5';
      if ((dy + 2) % 7 === 0 && lit > 1 && sh > 1) c = sh < 8 ? 'E' : '5';
      if (dy < 2) c = dy === 0 ? 'z' : 'H';
      if (lit === 0 || sh === 0) c = dy < 2 ? 'h' : (lit === 0 ? 'z' : 'p');
      p.set(x, y, c);
    }
  }
  // mossy fringe on the lip + a few hanging vines
  for (let x = fx - 13; x <= fx + 14; x++) { p.set(x, y0 - 1, x % 3 === 0 ? 'h' : 'G'); if (x % 4 === 0) p.set(x, y0 - 2, 'F'); }
  for (const vx of [-9, -5, 7, 10]) for (let k = 0; k < 6 + (vx & 3); k++) p.set(fx + vx, y0 + k, k & 1 ? 'G' : 'F');
  // cascade: white core, cool edges, streaks that shift by row
  for (let y = y0 + 1; y <= y1; y++) {
    const sway = Math.round(Math.sin(y * 0.45) * 0.7);
    for (let x = fx - 4; x <= fx + 4; x++) {
      const u = Math.abs(x - fx);
      let c = u <= 1 ? '9' : u === 2 ? ((y + x) % 3 === 0 ? 'v' : '9') : u === 3 ? 'a' : 'W';
      if (u <= 1 && (y * 3 + x) % 7 === 0) c = 'v';
      p.set(x + sway, y, c);
    }
  }
  // splash pool + restrained mist
  for (let y = y1 - 3; y <= y1 + 8; y++) for (let x = fx - 14; x <= fx + 14; x++) {
    const nx = (x - fx) / 14, ny = (y - (y1 + 2)) / 6, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const a = (1 - d) * 0.85;
    if (a > bay(x, y) + 0.1) p.set(x, y, (x * 3 + y) % 5 === 0 ? '9' : ((x + y) & 1 ? 'v' : 'a'));
  }
  p.hline(fx - 5, fx + 5, y1 + 1, '9');
  for (let i = 0; i < 6; i++) p.set(fx - 11 + i * 4 + (i & 1), y1 + 4 + (i % 3), '9');
  // tiny rainbow-ish glint sparkles in the spray
  p.set(fx - 7, y1 - 6, 'z'); p.set(fx + 8, y1 - 3, 'v');
}

/** dithered atmospheric haze: lifts colours one step along a lighter ladder near the horizon and the calm centre */
function haze(p: PixelCanvas) {
  for (let y = HORIZON; y < 300; y++) for (let x = 0; x < W; x++) {
    const vy = Math.max(0, Math.min(1, (280 - y) / 110));
    const c = 1 - Math.min(1, Math.abs(x - VP_X) / 230);
    const amt = vy * (0.1 + 0.32 * c);
    if (amt > bay(x, y)) shift(p, x, y, true);
  }
}

