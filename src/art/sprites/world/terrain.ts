// Terrain tiles (16x16, seamless), fences and road. Anchor top-left.
import { PixelCanvas, rng, type DrawSprite } from '../../pixel';
import { part } from './common';

const T = 16;
const wrap = (v: number) => ((v % T) + T) % T;

interface GroundSpec {
  base: string;
  specks: [string, number][]; // [color, density]
  feature: (p: PixelCanvas, v: number, r: () => number) => void;
  seed: number;
}

/** Single-pixel specks never create seams; multi-pixel features stay >=2px from the edges. */
function groundTile(spec: GroundSpec): DrawSprite {
  return {
    w: T, h: T, frames: 4, ox: 0, oy: 0,
    draw(p, v) {
      const r = rng(spec.seed * 97 + v * 13 + 5);
      p.rect(0, 0, T, T, spec.base);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const k = r();
        let acc = 0;
        for (const [c, d] of spec.specks) { acc += d; if (k < acc) { p.set(x, y, c); break; } }
      }
      spec.feature(p, v, r);
    },
  };
}

type Feat = string[];
/** Place feature grids at interior positions (x,y in 2..13 ranges) without overlap. */
function scatter(p: PixelCanvas, r: () => number, feats: Feat[], n: number) {
  const used: [number, number, number, number][] = [];
  for (let k = 0, tries = 0; k < n && tries < 60; tries++) {
    const g = feats[Math.floor(r() * feats.length)];
    const w = g[0].length, h = g.length;
    const x = 2 + Math.floor(r() * (13 - w)), y = 2 + Math.floor(r() * (13 - h));
    if (used.some(([ux, uy, uw, uh]) => x < ux + uw + 1 && ux < x + w + 1 && y < uy + uh + 1 && uy < y + h + 1)) continue;
    used.push([x, y, w, h]);
    p.grid(x, y, g);
    k++;
  }
}

const MEADOW_FEATS: Feat[] = [
  ['G.G', '.G.'],
  ['.H..', 'G.GH', '.G..'],
  ['H.H.', '.G.G'],
  ['.G', 'GH'],
  ['.H.', 'H.H'],
];
const ground_meadow = groundTile({
  base: 'h', seed: 1,
  specks: [['H', 0.018], ['G', 0.006]],
  feature(p, v, r) {
    scatter(p, r, MEADOW_FEATS, [2, 3, 2, 3][v]);
    if (v === 2) p.grid(3 + Math.floor(r() * 8), 3 + Math.floor(r() * 8), ['.9.', '9Y9', '.9.']);
    if (v === 3) p.grid(4, 9, ['H.H.H', '.H.H.']);
  },
});

const SAV_FEATS: Feat[] = [
  ['.l.l', 'l.l.'],
  ['xB', 'B.'],
  ['B.B', '.B.'],
  ['.x', '4B'],
  ['H.H', '.l.'],
];
const ground_savanna = groundTile({
  base: 't', seed: 2,
  specks: [['B', 0.02], ['z', 0.012]],
  feature(p, v, r) {
    scatter(p, r, SAV_FEATS, [2, 2, 1, 2][v]);
    if (v === 1) p.grid(3 + Math.floor(r() * 7), 3 + Math.floor(r() * 7), ['B.B.B', '.B.B.']);
  },
});

const ARC_FEATS: Feat[] = [
  ['9999', '.777'],
  ['.9.', '9a9', '.9.'],
  ['99', '.7'],
  ['a.', '.a'],
  ['.9', '67'],
];
const ground_arctic = groundTile({
  base: '8', seed: 3,
  specks: [['9', 0.025], ['a', 0.006]],
  feature(p, v, r) {
    scatter(p, r, ARC_FEATS, [2, 2, 3, 2][v]);
  },
});

/** Tilled field soil: gentle 8px furrows (dip / ridge light), clods; each 8x8 grass cell sits on a ridge. */
function fieldTile(seed: number, base: string, ridge: string, shadow: string, clodL: string, clodD: string, extra?: (p: PixelCanvas, v: number, r: () => number) => void): DrawSprite {
  return {
    w: T, h: T, frames: 4, ox: 0, oy: 0,
    draw(p, v) {
      const r = rng(seed * 131 + v * 7 + 3);
      p.rect(0, 0, T, T, base);
      for (const band of [0, 8]) {
        // runs along the furrow dip (row 7) and the lit ridge top (row 1..2)
        let x = Math.floor(r() * 3);
        while (x < T) {
          const len = 2 + Math.floor(r() * 5);
          for (let i = 0; i < len && x + i < T; i++) p.set(x + i, band + 7, shadow);
          x += len + 1 + Math.floor(r() * 3);
        }
        x = Math.floor(r() * 4);
        while (x < T) {
          const len = 1 + Math.floor(r() * 4);
          for (let i = 0; i < len && x + i < T; i++) p.set(x + i, band + 1, ridge);
          x += len + 2 + Math.floor(r() * 4);
        }
        // underside shade specks of the ridge
        for (let xx = 0; xx < T; xx++) if (r() < 0.1) p.set(xx, band + 6, shadow);
      }
      // clods and pebbles (interior)
      for (let k = 0; k < 2; k++) {
        const cx = 2 + Math.floor(r() * 11), cy = [3, 4, 11, 12][Math.floor(r() * 4)];
        p.set(cx, cy, clodL); p.set(cx + 1, cy + 1, clodD);
      }
      extra?.(p, v, r);
    },
  };
}

const field_meadow = fieldTile(1, 'b', 'B', 'n', 'B', 'n', (p, v) => {
  if (v === 3) { p.set(9, 4, '7'); p.set(10, 4, '6'); p.set(9, 5, '6'); }
});
const field_savanna = fieldTile(2, 'B', 't', 'b', 't', 'b', (p, v) => {
  if (v === 1) { p.set(4, 3, 'b'); p.set(5, 4, 'b'); p.set(6, 4, 'b'); p.set(7, 5, 'b'); }
  if (v === 2) { p.set(10, 11, 'b'); p.set(11, 12, 'b'); p.set(12, 12, 'b'); p.set(9, 12, 'b'); }
});
const field_arctic = fieldTile(3, '3', '4', '5', '4', '5', (p, v, r) => {
  for (let k = 0; k < 3; k++) p.set(Math.floor(r() * 16), [1, 9, 2][k], '8');
  if (v === 2) { p.set(6, 4, '8'); p.set(12, 12, '8'); }
  void r;
});

// ---------------------------------------------------------------- fences
const FW = { d: 'n', m: 'b', l: 'B', h: 't' };
export const fence_h: DrawSprite = {
  w: 16, h: 12, frames: 1, ox: 0, oy: 0,
  draw(p) {
    // rails across full width (tile left-right)
    for (const ry of [3, 7]) {
      p.hline(0, 15, ry - 1, '0');
      p.hline(0, 15, ry, FW.l); p.hline(0, 15, ry + 1, FW.m);
      p.hline(0, 15, ry + 2, '0');
      for (let x = 0; x < 16; x += 5) p.set(x + 2, ry + 1, FW.d);
    }
    // post in the middle
    part(p, (q) => {
      q.rect(6, 1, 4, 10, FW.m);
      q.vline(6, 1, 10, FW.l); q.vline(9, 1, 10, FW.d);
      q.hline(6, 9, 1, FW.h); q.set(7, 0, FW.h); q.set(8, 0, FW.l);
    });
  },
};
export const fence_v: DrawSprite = {
  w: 6, h: 16, frames: 1, ox: 0, oy: 0,
  draw(p) {
    // rails seen end-on going into the scene (continuous top-bottom)
    p.vline(1, 0, 15, '0'); p.vline(2, 0, 15, FW.l); p.vline(3, 0, 15, FW.m); p.vline(4, 0, 15, '0');
    for (let y = 1; y < 16; y += 5) p.set(3, y, FW.d);
    // post
    part(p, (q) => {
      q.rect(1, 5, 4, 9, FW.m);
      q.vline(1, 5, 13, FW.l); q.vline(4, 5, 13, FW.d);
      q.hline(1, 4, 5, FW.h); q.set(2, 4, FW.h); q.set(3, 4, FW.l);
      q.hline(1, 4, 13, FW.d);
    });
  },
};
export const fence_post: DrawSprite = {
  w: 6, h: 12, frames: 1, ox: 0, oy: 0,
  draw(p) {
    part(p, (q) => {
      q.rect(1, 1, 4, 10, FW.m);
      q.vline(1, 1, 10, FW.l); q.vline(4, 1, 10, FW.d);
      q.hline(1, 4, 1, FW.h); q.set(2, 0, FW.h); q.set(3, 0, FW.l);
      q.hline(1, 4, 10, FW.d);
    });
  },
};

// ---------------------------------------------------------------- road (horizontal dirt road)
export const road: DrawSprite = {
  w: 16, h: 16, frames: 2, ox: 0, oy: 0,
  draw(p, v) {
    const r = rng(77 + v * 5);
    p.rect(0, 0, T, T, 'B');
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = r();
      if (y <= 1 || y >= 14) { p.set(x, y, y === 0 || y === 15 ? 'n' : 'b'); if ((y === 1 || y === 14) && n < 0.35) p.set(x, y, 'B'); continue; }
      // wheel ruts
      if (y === 5 || y === 10) p.set(x, y, n < 0.8 ? 'b' : 'B');
      else if (y === 4 || y === 9) { if (n < 0.4) p.set(x, y, 't'); }
      else if (n < 0.05) p.set(x, y, 't');
      else if (n > 0.96) p.set(x, y, 'b');
    }
    if (v === 1) { p.set(7, 7, '7'); p.set(8, 7, '6'); p.set(7, 12, '4'); }
    else { p.set(12, 12, '4'); p.set(3, 7, 't'); p.set(4, 7, 't'); }
  },
};

export const terrain: Record<string, DrawSprite> = {
  ground_meadow, ground_savanna, ground_arctic, field_meadow, field_savanna, field_arctic,
  fence_h, fence_v, fence_post, road,
};
void wrap;
