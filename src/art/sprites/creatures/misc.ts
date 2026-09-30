import { PixelCanvas, type SpriteDef } from '../../pixel';
import { anim, g, selOutline, charAt } from './util';

// ---------------------------------------------------------------------------------------------
// Ghost 12x14: little angel spirit (halo, tiny wings, happy closed eyes). f0/f1 = wing flap + wavy tail.
const GHOST = [
  [
    '............',
    '............',
    '............',
    '....9999....',
    '...999999...',
    '..99999999..',
    '.8990990998.',
    '.89Z9999Z98.',
    '..99922999..',
    '..99999999..',
    '..9999999a..',
    '..99a99a9a..',
    '..9..9..9...',
    '............',
  ],
  [
    '............',
    '............',
    '............',
    '....9999....',
    '...999999...',
    '.8999999998.',
    '.8990990998.',
    '..9Z9999Z9..',
    '..99922999..',
    '..99999999..',
    '..9999999a..',
    '..9a99a99a..',
    '...9..9..9..',
    '............',
  ],
];

function ghost(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(12, 14);
  g(c, 0, 0, GHOST[f]);
  selOutline(c, {}, 'W');
  // halo (front arc bright, back arc darker), bobbing
  c.hline(4, 7, 0, 'Y'); c.set(5, 0, 'z');
  c.set(3, 1, 'y'); c.set(8, 1, 'y');
  p.blit(c, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Parachute 24x18: red/white striped canopy, strings meeting at bottom-center (the hook point).
function parachute(p: PixelCanvas) {
  const c = new PixelCanvas(24, 18);
  const dome = new PixelCanvas(24, 18);
  dome.ellipse(12, 9.5, 11, 8.5, '9');
  for (let y = 9; y < 18; y++) dome.hline(0, 23, y, null);
  // scalloped rim: one little arc per panel
  for (const x of [3, 7.5, 12, 16.5, 21]) dome.ellipse(x, 8.6, 2.3, 1.4, '9');
  for (let y = 0; y < 18; y++) for (let x = 0; x < 24; x++) {
    if (!dome.opaque(x, y)) continue;
    const ang = Math.atan2(x + 0.5 - 12, 15 - (y + 0.5));
    const panel = Math.max(0, Math.min(4, Math.floor((ang + 1.2) / 0.48)));
    const red = panel % 2 === 0;
    // light from top-left
    const lx = (x + 0.5 - 12) / 11, ly = (y + 0.5 - 9.5) / 8.5;
    const light = -lx * 0.7 - ly * 0.7;
    let col = red ? 'Q' : '9';
    if (light > 0.75) col = red ? '$' : '9';
    else if (light < -0.05 || y >= 9) col = red ? 'R' : '8';
    c.set(x, y, col);
  }
  selOutline(c, { Q: 'r', R: 'r', $: 'r', '9': '2', '8': '2' }, '0');
  // strings from each rim scallop to the hook point
  for (const x of [1, 6, 12, 17, 22]) c.line(x, 11, 12, 16, '4');
  c.rect(11, 16, 2, 2, '2');
  c.set(11, 16, '6');
  p.blit(c, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Grass 10x12, anchor (5,11). frames: stage1a, stage1b, stage2a, stage2b, stage3a, stage3b.
// a/b are different blade layouts (not just sway) so neighbouring cells can mix them for an organic patch.
// Chunky clumps: a solid mid-green mass (so stacked rows merge) with thick tapering blades rising from it.
// Blade = [x, topY, lean]; 2px wide (lit left / shadow right) in the lower part, 1px above, brightest last 2px.
type Blade = [number, number, number];
interface Clump { cx: number; cy: number; rx: number; ry: number; blades: Blade[]; }
function clump(c: PixelCanvas, k: Clump) {
  const m = new PixelCanvas(10, 12);
  m.ellipse(k.cx, k.cy, k.rx, k.ry, 'G');
  const bodyTop = Math.round(k.cy - k.ry);
  // blades (short first)
  for (const [x, top, lean] of [...k.blades].sort((p, q) => q[1] - p[1])) {
    const h = 11 - top;
    const startY = Math.min(11, bodyTop + 3);
    for (let y = startY; y >= top; y--) {
      const t = (startY - y) / Math.max(1, startY - top); // 0 base .. 1 tip
      const xx = Math.round(x + lean * t * t);
      const fromTip = y - top;
      const wide = t < 0.5 && h >= 5;
      if (fromTip === 0) m.set(xx, y, 'H');
      else if (fromTip === 1) m.set(xx, y, 'h');
      else {
        m.set(xx, y, t < 0.3 ? 'G' : 'h');
        if (wide) m.set(xx + 1, y, t < 0.3 ? 'F' : 'G');
      }
    }
  }
  // shading: shadow side (right / bottom-right), sparse deep shade, top-left light
  for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) {
    if (!m.opaque(x, y)) continue;
    const below = m.opaque(x, y + 1), right = m.opaque(x + 1, y);
    const col = charAt(m, x, y);
    if (col !== 'G') continue;
    if (!right || (!below && x % 2 === 0)) m.set(x, y, 'F');
    else if (!m.opaque(x - 1, y) && y > bodyTop + 1) m.set(x, y, 'h');
    else if (!m.opaque(x, y - 1) && !m.opaque(x - 1, y - 1)) m.set(x, y, 'h');
  }
  // deep shade just under a couple of blade roots (not a band)
  for (const [x] of k.blades) if (m.opaque(x, bodyTop + 4) && x % 2) m.set(x, bodyTop + 4, 'F');
  c.blit(m, 0, 0);
}
function sproutClump(c: PixelCanvas, xs: [number, number][], alt: boolean) {
  // stage 1: tiny mass + short thick blades
  c.ellipse(5, 10.5, alt ? 3 : 2.6, 1.6, 'G');
  c.hline(alt ? 3 : 3, alt ? 7 : 6, 11, 'F');
  for (const [x, top] of xs) {
    for (let y = 10; y >= top; y--) {
      const fromTip = y - top;
      c.set(x, y, fromTip === 0 ? 'H' : fromTip === 1 ? 'h' : 'G');
      if (fromTip >= 2) c.set(x + 1, y, 'F');
    }
  }
}

const GRASS: ((c: PixelCanvas) => void)[] = [
  (c) => sproutClump(c, [[3, 6], [5, 5], [7, 7]], false),
  (c) => sproutClump(c, [[2, 7], [4, 6], [6, 5]], true),
  (c) => clump(c, { cx: 4.8, cy: 9, rx: 4.4, ry: 3, blades: [[1, 5, -1], [3, 4, 0], [5, 3, 1], [7, 5, 1]] }),
  (c) => clump(c, { cx: 5.2, cy: 9, rx: 4.4, ry: 3, blades: [[2, 4, -1], [4, 5, 0], [6, 3, 0], [8, 5, 1]] }),
  (c) => clump(c, { cx: 4.9, cy: 8.2, rx: 4.9, ry: 3.9, blades: [[0, 4, -1], [2, 0, -1], [4, 1, 0], [6, 0, 1], [8, 2, 1], [3, 3, 0]] }),
  (c) => clump(c, { cx: 5.1, cy: 8.2, rx: 4.9, ry: 3.9, blades: [[1, 2, -1], [3, 1, -1], [5, 0, 0], [7, 1, 1], [8, 3, 1], [0, 5, 0]] }),
];

// grass_base 12x10, anchor (6,9): soft darker-green ground blob under every planted cell (stage 1..3).
function grassBase(p: PixelCanvas, f: number) {
  const q = new PixelCanvas(12, 10);
  const bl: [number, number, number, number][][] = [
    [[6, 6.5, 2.6, 1.8]],
    [[6, 5.5, 4.6, 3], [3.5, 6.5, 2.5, 2], [8.5, 6, 2.5, 2]],
    [[6, 5, 5.6, 3.9], [2.6, 6, 2.8, 2.6], [9.4, 6, 2.8, 2.6], [4.5, 2.6, 2.6, 2], [8, 2.4, 2.6, 2]],
  ];
  for (const [cx, cy, rx, ry] of bl[f]) q.ellipse(cx, cy, rx, ry, 'F');
  const src = q.clone();
  for (let y = 0; y < 10; y++) for (let x = 0; x < 12; x++) {
    if (!src.opaque(x, y)) continue;
    if (!src.opaque(x, y + 1) && (x + f) % 3 !== 0) q.set(x, y, 'f'); // darker rim at bottom
    else if (!src.opaque(x, y - 1) && !src.opaque(x - 1, y) && f) q.set(x, y, 'G');
    else if ((x * 5 + y * 7 + f) % 9 === 0) q.set(x, y, 'G');
  }
  p.blit(q, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Ambient life + new FX
function smoke(p: PixelCanvas, f: number) {
  const R = [1.6, 2.6, 3.6, 4.4, 4.9, 5.2][f];
  const cy = [9.5, 8.5, 7.3, 6.3, 5.4, 4.6][f];
  const cx = 6 + [0, -0.5, 0.5, 0, -0.5, 0][f];
  const dens = [1, 1, 1, 0.66, 0.4, 0.2][f];
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const blobs: [number, number, number][] = [[cx, cy, R]];
  if (f >= 1) blobs.push([cx - R * 0.55, cy + R * 0.35, R * 0.6], [cx + R * 0.6, cy + R * 0.2, R * 0.55]);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    let inside = false, lit = 0;
    for (const [bx, by, br] of blobs) {
      const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
      if (d <= br) { inside = true; lit = Math.max(lit, 1 - d / br); }
    }
    if (!inside) continue;
    if (bayer[y & 3][x & 3] / 16 >= dens) continue;
    const shade = (x + 0.5 - cx) * 0.5 + (y + 0.5 - cy) * 0.6; // lower-right darker
    p.set(x, y, shade > R * 0.45 ? '7' : shade > -R * 0.05 ? '8' : '9');
  }
}

function coin(p: PixelCanvas, f: number) {
  const rx = [3.5, 2.6, 1.5, 0.5, 1.5, 2.6][f];
  const c = new PixelCanvas(9, 9);
  c.ellipse(4.5, 4.5, rx, 3.5, 'Y');
  // lower-right rim and edge thickness
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
    if (!c.opaque(x, y)) continue;
    if (!c.opaque(x + 1, y) || !c.opaque(x, y + 1)) c.set(x, y, 'y');
  }
  if (rx > 2) {
    c.vline(4, 3, 5, 'y'); // embossed slot
    c.set(3, 2, 'z'); c.set(2, 3, 'z');
  } else if (rx > 1) {
    c.vline(4, 3, 5, 'y');
    c.set(3, 3, 'z');
  } else if (rx < 1) {
    c.vline(4, 2, 6, 'y'); c.set(4, 2, 'z');
  }
  selOutline(c, { Y: 'd', y: 'd', z: 'd' }, 'd');
  p.blit(c, 0, 0);
}

function star(p: PixelCanvas, f: number) {
  const arm = [1, 3, 2][f];
  p.set(3, 3, '9');
  for (let i = 1; i <= arm; i++) {
    const col = i === arm && arm > 1 ? 'Y' : i === 1 ? '9' : 'z';
    p.set(3 - i, 3, col); p.set(3 + i, 3, col); p.set(3, 3 - i, col); p.set(3, 3 + i, col);
  }
  if (arm === 3) { p.set(2, 2, 'z'); p.set(4, 4, 'Y'); }
}

// 7x6 white/yellow butterfly; 0 = body, 7 = pale wing edge (keeps it visible on snow), Y/y = yellow spots
const BFLY: string[][] = [
  ['.2...2.', '7992997', '9Y929Y9', '.79297.', '..y2y..', '...2...'],
  ['.2...2.', '.79297.', '.9Y2Y9.', '..y2y..', '...2...', '.......'],
  ['..2.2..', '..79...', '..9Y2..', '..y92..', '...2...', '.......'],
  ['.2...2.', '.79297.', '.9Y2Y9.', '..y2y..', '...2...', '.......'],
];
function butterfly(p: PixelCanvas, f: number) {
  p.grid(0, 0, BFLY[f]);
}

// side view facing right; 1 = night body, 2 = slate wing, 6 = light wing tip, Y = beak, 9 = eye glint
const BIRD: string[][] = [
  ['....6....', '...62....', '...22.11.', '11.22111Y', '.1111111.', '...11....', '.........'], // wings up
  ['.........', '..62..11.', '.62211111', '11221111Y'.slice(0, 8) + 'Y', '.1111111.', '...11....', '.........'], // half up
  ['.........', '.........', '.....11..', '66221111Y', '.1111111.', '...11....', '.........'], // level
  ['.........', '.........', '.....11..', '11111111Y', '.2211111.', '.6221....', '.66......'], // down
];
function bird(p: PixelCanvas, f: number) {
  p.grid(0, 0, BIRD[f]);
}

function leaf(p: PixelCanvas, f: number) {
  if (f === 0) {
    p.grid(0, 0, ['.hH.', 'hGy.', '.yG.', '..y.']);
  } else {
    p.grid(0, 0, ['..y.', '.GyH', 'hGh.', '.H..']);
  }
}

function ring(p: PixelCanvas, f: number) {
  const rx = [4, 7, 10, 11.5][f], ry = [2, 3.5, 5, 5.5][f];
  const q = new PixelCanvas(24, 12);
  q.ring(12, 6, rx, ry, '9');
  if (f === 0) q.ring(12, 6, rx - 1.5, ry - 0.75, '8');
  const keep = [1, 1, 0.66, 0.33][f];
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 24; x++) {
    if (!q.opaque(x, y)) continue;
    if (bayer[y & 3][x & 3] / 16 >= keep) continue;
    p.set(x, y, f === 3 ? '8' : '9');
  }
}

// ---------------------------------------------------------------------------------------------
// FX
function puff(p: PixelCanvas, f: number) {
  // grow (0-2) then break apart & fade (3-4)
  const c = new PixelCanvas(16, 16);
  const R = [2.5, 4.2, 5.2, 5.2, 4][f];
  const spread = [0, 1, 2, 3.2, 4.6][f];
  const blobs: [number, number, number][] = [
    [8, 8, R], [8 - spread, 8 + spread * 0.4, R * 0.7], [8 + spread, 8 + spread * 0.3, R * 0.7],
    [8 - spread * 0.5, 8 - spread, R * 0.65], [8 + spread * 0.6, 8 - spread * 0.8, R * 0.6],
  ];
  const list = f >= 3 ? blobs.slice(1) : blobs;
  const scale = f === 4 ? 0.6 : f === 3 ? 0.85 : 1;
  for (const [x, y, r] of list) c.circle(x, y, Math.max(1, r * scale), '8');
  for (const [x, y, r] of list) c.circle(x - r * 0.25 * scale, y - r * 0.3 * scale, Math.max(0.6, r * scale * 0.6), '9');
  selOutline(c, { '9': '7', '8': '7' }, '7');
  if (f === 0) { c.set(8, 8, '9'); }
  p.blit(c, 0, 0);
}

function dust(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(24, 10);
  const sp = [2, 5, 8, 10][f];
  const r = [2.6, 3, 2.6, 1.8][f];
  const ys = [7.5, 7, 6.5, 6.5][f];
  const pts: [number, number, number][] = [
    [12, ys + 0.5, r + 0.6], [12 - sp, ys + 0.8, r], [12 + sp, ys + 0.8, r],
    [12 - sp * 0.5, ys - 1, r * 0.8], [12 + sp * 0.5, ys - 1, r * 0.8],
  ];
  const list = f === 3 ? pts.slice(1) : pts;
  for (const [x, y, rr] of list) c.circle(x, y, rr, '&');
  for (const [x, y, rr] of list) c.circle(x - 0.5, y - 0.8, rr * 0.55, '9');
  // shade bottoms
  const m = c.clone();
  for (let y = 0; y < 10; y++) for (let x = 0; x < 24; x++) if (m.opaque(x, y) && !m.opaque(x, y + 1)) c.set(x, y, '4');
  selOutline(c, { '&': '4', '9': '4', '4': '3' }, '4');
  if (f === 3) for (const [x, y] of [[2, 4], [21, 3], [6, 2]] as [number, number][]) c.set(x, y, '&');
  p.blit(c, 0, 0);
}

function sparkle(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(9, 9);
  const L = [1, 2, 4, 2][f];
  for (let i = 1; i <= L; i++) {
    const col = i === L ? 'Y' : 'z';
    c.set(4 + i, 4, col); c.set(4 - i, 4, col); c.set(4, 4 + i, col); c.set(4, 4 - i, col);
  }
  if (f === 2) { c.set(3, 3, 'z'); c.set(5, 3, 'z'); c.set(3, 5, 'z'); c.set(5, 5, 'z'); }
  if (f === 1 || f === 2) { c.set(3, 4, '9'); c.set(5, 4, '9'); c.set(4, 3, '9'); c.set(4, 5, '9'); }
  c.set(4, 4, '9');
  if (f === 3) { c.set(1, 1, 'Y'); c.set(7, 7, 'z'); }
  p.blit(c, 0, 0);
}

function hit(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(13, 13);
  const star = (R: number, r: number, n: number, rot: number, col: string) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 === 0 ? R : r;
      pts.push([6.5 + Math.cos(a) * rr, 6.5 + Math.sin(a) * rr]);
    }
    c.poly(pts, col);
  };
  if (f === 0) {
    star(4.2, 2, 6, 0.2, 'Y');
    star(2.2, 1.1, 6, 0.2, '9');
  } else if (f === 1) {
    star(6.4, 3, 8, 0, 'O');
    star(5, 2.3, 8, 0, 'Y');
    star(2.8, 1.4, 8, 0.4, '9');
  } else {
    // bursting fragments
    star(4.6, 2.4, 8, 0.3, 'Y');
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x + 0.5 - 6.5, y + 0.5 - 6.5);
      if (d < 2.4) c.set(x, y, null);
    }
    for (const [x, y] of [[0, 6], [12, 6], [6, 0], [6, 12], [1, 1], [11, 11], [11, 1], [1, 11]] as [number, number][]) c.set(x, y, 'Y');
  }
  if (f !== 2) selOutline(c, { Y: 'O', O: 'e', '9': 'Y' }, 'O');
  else selOutline(c, { Y: 'O' }, 'O');
  p.blit(c, 0, 0);
}

function splash(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(16, 10);
  const drop = (x: number, y: number, col = 'W') => { c.set(x, y, col); };
  if (f === 0) {
    g(c, 4, 6, ['..a..a..', '.aWaaWa.', 'WWWWWWWW']);
  } else if (f === 1) {
    g(c, 2, 2, [
      '...a......a.',
      '..aW..aa..Wa',
      '..W..aWWa..W',
      '.aW..W..W..W',
      '.WWaaW..WaaW',
      'WWWWWWWWWWWW',
    ]);
    c.set(1, 7, 'a');
  } else if (f === 2) {
    for (const [x, y] of [[1, 2], [3, 0], [7, 1], [11, 0], [14, 2], [5, 3], [10, 3]] as [number, number][]) { drop(x, y, 'W'); drop(x, y - 1, 'a'); }
    g(c, 3, 7, ['..aWWa....', 'aWWWWWWWa.', '.WWWWWWWW.']);
  } else {
    for (const [x, y] of [[0, 6], [15, 6], [2, 4], [13, 5]] as [number, number][]) drop(x, y, 'a');
    g(c, 3, 8, ['.aWWWWWa..', 'WWWWWWWWW.']);
  }
  // white highlights
  for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) if (c.opaque(x, y) && !c.opaque(x, y - 1) && (x + y) % 3 === 0) c.set(x, y, '9');
  selOutline(c, { W: 'w', a: 'W', '9': 'W' }, 'w');
  p.blit(c, 0, 0);
}

const HUNGRY = [
  '..0000000..',
  '.099H9H990.',
  '099HGhGH990',
  '099GhGhG990',
  '098FGFGF890',
  '.088fff880.',
  '..0000000..',
  '...00......',
  '..0990.....',
  '..0980.....',
  '...00......',
];

export const miscSprites: Record<string, SpriteDef> = {
  ghost: anim(12, 14, 2, ghost, { fps: 4 }),
  parachute: anim(24, 18, 1, parachute, { fps: 1 }),
  grass: anim(10, 12, 6, (p, f) => GRASS[f](p), { ox: 5, oy: 11, fps: 2 }),
  grass_base: anim(12, 10, 3, grassBase, { ox: 6, oy: 9, fps: 1 }),
  fx_smoke: anim(12, 12, 6, smoke, { ox: 6, oy: 6, fps: 6 }),
  fx_coin: anim(9, 9, 6, coin, { ox: 4, oy: 4, fps: 12 }),
  fx_star: anim(7, 7, 3, star, { ox: 3, oy: 3, fps: 8 }),
  butterfly: anim(7, 6, 4, butterfly, { ox: 3, oy: 3, fps: 8 }),
  bird: anim(9, 7, 4, bird, { ox: 4, oy: 3, fps: 8 }),
  leaf: anim(4, 4, 2, leaf, { ox: 2, oy: 2, fps: 3 }),
  fx_ring: anim(24, 12, 4, ring, { ox: 12, oy: 6, fps: 10 }),
  fx_puff: anim(16, 16, 5, puff, { ox: 8, oy: 8, fps: 12 }),
  fx_dust: anim(24, 10, 4, dust, { fps: 10 }),
  fx_sparkle: anim(9, 9, 4, sparkle, { ox: 4, oy: 4, fps: 10 }),
  fx_hit: anim(13, 13, 3, hit, { ox: 6, oy: 6, fps: 14 }),
  fx_splash: anim(16, 10, 4, splash, { fps: 10 }),
  icon_hungry: { frames: [HUNGRY], fps: 1 },
};
