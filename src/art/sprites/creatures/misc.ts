import { PixelCanvas, type SpriteDef } from '../../pixel';
import { anim, g, selOutline } from './util';

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
type Blade = [number, number, number]; // base x, height, lean
function blade(c: PixelCanvas, [x, h, lean]: Blade, front: boolean) {
  for (let i = 0; i < h; i++) {
    const t = i / Math.max(1, h - 1); // 0 base .. 1 tip
    const xx = Math.round(x + lean * t * t);
    const y = 11 - i;
    let col: string;
    if (i === h - 1) col = front ? 'H' : 'h';
    else if (t > 0.6) col = front ? 'h' : 'G';
    else if (t > 0.25) col = front ? 'G' : 'F';
    else col = front ? 'F' : 'f';
    c.set(xx, y, col);
  }
}

function sprout(c: PixelCanvas, x: number, h: number, flip: boolean, sway: number) {
  // tiny seedling: stem + two leaves; sway shifts the leaves 1px
  for (let i = 0; i < h; i++) c.set(x, 11 - i, i === 0 ? 'F' : 'G');
  const ty = 11 - h, sx = x + sway;
  c.set(sx - 1, ty + 1 - (sway && flip ? 0 : 0), flip ? 'h' : 'G'); c.set(sx + 1, ty + 1, flip ? 'G' : 'h');
  c.set(sx - 1, ty, flip ? 'H' : 'h'); c.set(sx + 2, ty + (flip ? 0 : 1), 'H');
  c.set(sx, ty, 'H');
  c.set(x, 11, 'f');
}

function young(c: PixelCanvas, sway: number) {
  c.ellipse(5, 11.5, 3.2, 1.2, 'F');
  for (const [x, h, l] of [[2, 4, -1], [4, 6, -1], [6, 5, 1], [8, 3, 1]] as Blade[]) blade(c, [x, h, l + sway], false);
  for (const [x, h, l] of [[3, 5, 0], [5, 6, 1], [7, 4, 1]] as Blade[]) blade(c, [x, h, l + sway], true);
  c.hline(3, 7, 11, 'f');
}

function lush(c: PixelCanvas, sway: number) {
  // clump body: fills the whole cell so dense planting merges into one meadow
  const m = new PixelCanvas(10, 12);
  m.ellipse(5, 8.2, 5, 4, 'F');
  m.rect(0, 9, 10, 3, 'F');
  m.set(0, 11, null); m.set(9, 11, null);
  c.blit(m, 0, 0);
  // inner texture: short light blade strokes with dark gaps under them
  const strokes: [number, number, number][] = [[1, 8, 3], [3, 6, 3], [5, 7, 4], [7, 6, 3], [8, 9, 2], [2, 10, 2], [6, 10, 2], [4, 9, 2]];
  for (const [x, y, l] of strokes) for (let i = 0; i < l; i++) {
    const yy = y - i;
    if (!m.opaque(x, yy)) continue;
    c.set(x + (i === l - 1 && l >= 3 ? sway : 0), yy, i === l - 1 ? 'h' : 'G');
  }
  for (const [x, y] of strokes) if (m.opaque(x, y + 1)) c.set(x, y + 1, 'f');
  // blades poking above the clump (these sway)
  const tips: Blade[] = [[1, 8, -1], [3, 11, -1], [5, 12, 1], [6, 10, 1], [8, 8, 1], [2, 9, 0]];
  for (const [x, h, lean0] of tips) {
    const lean = lean0 + sway;
    for (let i = 5; i < h; i++) {
      const t = i / (h - 1);
      const xx = Math.round(x + lean * t * t);
      c.set(xx, 11 - i, i === h - 1 ? 'H' : t > 0.75 ? 'h' : 'G');
    }
  }
  for (let x = 1; x <= 8; x++) c.set(x, 11, x % 3 === 0 ? 'f' : 'F');
}

// frames: [stage1a, stage1b, stage2a, stage2b, stage3a, stage3b]; b = same tuft swayed 1px (usable as a
// 2-frame wind loop or as a variant).
const GRASS: ((c: PixelCanvas) => void)[] = [
  (c) => { sprout(c, 3, 2, false, 0); sprout(c, 6, 3, true, 0); },
  (c) => { sprout(c, 3, 2, false, 1); sprout(c, 6, 3, true, 1); },
  (c) => young(c, 0),
  (c) => young(c, 1),
  (c) => lush(c, 0),
  (c) => lush(c, 1),
];

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
  fx_puff: anim(16, 16, 5, puff, { ox: 8, oy: 8, fps: 12 }),
  fx_dust: anim(24, 10, 4, dust, { fps: 10 }),
  fx_sparkle: anim(9, 9, 4, sparkle, { ox: 4, oy: 4, fps: 10 }),
  fx_hit: anim(13, 13, 3, hit, { ox: 6, oy: 6, fps: 14 }),
  fx_splash: anim(16, 10, 4, splash, { fps: 10 }),
  icon_hungry: { frames: [HUNGRY], fps: 1 },
};
