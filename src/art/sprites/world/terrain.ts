// Terrain tiles (16x16, seamless), fences. Anchor top-left.
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

/**
 * Pasture tiles: calm, low-contrast. Two 8px "mown" bands (identical in every variant so all frames tile in any
 * arrangement); only single-pixel specks and interior 2px marks differ per variant.
 */
interface PastureSpec {
  base: string;
  band: string; // dither color for the odd band (x+y parity checker, sparse)
  bandDensity: number; // 0..1 chance a checker pixel of the band gets `band`
  specks: [string, number][];
  marks: string[][]; // small 2-3px interior marks
  markCols: string[]; // color per mark row char '#'
  nMarks: number[];
  seed: number;
}
function pastureTile(s: PastureSpec): DrawSprite {
  return {
    w: T, h: T, frames: 4, ox: 0, oy: 0,
    draw(p, v) {
      const r = rng(s.seed * 211 + v * 53 + 17);
      p.rect(0, 0, T, T, s.base);
      for (let y = 0; y < 16; y++) for (let x = 0; x < T; x++) {
        if (r() < s.bandDensity) p.set(x, y, s.band);
      }
      const rv = rng(s.seed * 97 + v * 31 + 9);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const k = rv();
        let acc = 0;
        for (const [c, d] of s.specks) { acc += d; if (k < acc) { p.set(x, y, c); break; } }
      }
      const used: [number, number][] = [];
      for (let n = 0, tries = 0; n < s.nMarks[v] && tries < 40; tries++) {
        const m = s.marks[Math.floor(rv() * s.marks.length)];
        const mw = m[0].length, mh = m.length;
        const x = 2 + Math.floor(rv() * (12 - mw)), y = 2 + Math.floor(rv() * (12 - mh));
        if (used.some(([ux, uy]) => Math.abs(ux - x) < 5 && Math.abs(uy - y) < 4)) continue;
        used.push([x, y]);
        for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
          const ch = m[j][i];
          if (ch !== '.') p.set(x + i, y + j, s.markCols[+ch]);
        }
        n++;
      }
    },
  };
}

const field_meadow = pastureTile({
  base: 'h', band: 'H', bandDensity: 0.07, seed: 11,
  specks: [['G', 0.006]],
  marks: [['0.0', '.0.'], ['.1', '1.'], ['0.', '.0'], ['1.1']],
  markCols: ['G', 'H'],
  nMarks: [3, 4, 3, 4],
});
const field_savanna = pastureTile({
  base: 't', band: 'z', bandDensity: 0.05, seed: 12,
  specks: [['B', 0.012]],
  marks: [['0.0', '.0.'], ['1.1'], ['.0', '0.'], ['1.']],
  markCols: ['B', 'l'],
  nMarks: [3, 3, 4, 3],
});
const field_arctic = pastureTile({
  base: '8', band: '7', bandDensity: 0.03, seed: 13,
  specks: [['a', 0.01]],
  marks: [['0.0', '.1.'], ['0.', '.0'], ['00'], ['0.1']],
  markCols: ['7', '6'],
  nMarks: [3, 4, 3, 3],
});

// ---------------------------------------------------------------- fences
const FW = { d: 'n', m: 'b', l: 'B', h: 't', o: 'm' };
/** Vertical post body x..x+3, rows y0..y1: lit left, dark right, weathered darker bottom. */
function postBody(q: PixelCanvas, x: number, y0: number, y1: number) {
  const cols = [FW.h, FW.l, FW.m, FW.d];
  const weather: Record<string, string> = { t: 'B', B: 'b', b: 'n', n: 'm' };
  for (let y = y0; y <= y1; y++) {
    const worn = y >= y1 - 2;
    for (let i = 0; i < 4; i++) q.set(x + i, y, worn ? weather[cols[i]] : cols[i]);
  }
  // cap: lit top, rounded corners
  q.hline(x, x + 3, y0, FW.l); q.set(x, y0, FW.h); q.set(x + 1, y0, FW.h);
  q.set(x + 3, y0, FW.m);
  // grain nicks
  q.set(x + 2, y0 + 3, FW.d); q.set(x + 1, y0 + 6, FW.m);
}
export const fence_h: DrawSprite = {
  w: 16, h: 12, frames: 1, ox: 0, oy: 0,
  draw(p) {
    // two rails across the full width (tile left-right): dark top edge, lit face, mid, dark underside
    for (const ry of [2, 6]) {
      p.hline(0, 15, ry, FW.o);
      p.hline(0, 15, ry + 1, FW.h); p.hline(0, 15, ry + 2, FW.l); p.hline(0, 15, ry + 3, FW.m);
      p.hline(0, 15, ry + 4, FW.d);
      p.hline(0, 15, ry + 5, FW.o);
      for (const gx of [2, 9]) { p.set(gx, ry + 3, FW.d); p.set(gx + 1, ry + 3, FW.d); }
      p.set(12, ry + 2, FW.m); p.set(4, ry + 1, FW.l);
    }
    // soft ground shadow under the lower rail
    for (let x = 0; x < 16; x += 2) p.set(x, 11, '#2e222f55');
    part(p, (q) => postBody(q, 6, 0, 10), FW.o);
  },
};
export const fence_v: DrawSprite = {
  w: 6, h: 16, frames: 1, ox: 0, oy: 0,
  draw(p) {
    // rails seen end-on going into the scene (continuous top-bottom)
    p.vline(1, 0, 15, FW.o); p.vline(2, 0, 15, FW.h); p.vline(3, 0, 15, FW.m); p.vline(4, 0, 15, FW.d);
    p.vline(5, 0, 15, '#2e222f44');
    for (let y = 1; y < 16; y += 6) { p.set(3, y, FW.d); p.set(3, y + 1, FW.d); }
    for (let y = 4; y < 16; y += 8) p.set(2, y, FW.l);
    part(p, (q) => postBody(q, 1, 5, 13), FW.o);
  },
};
export const fence_post: DrawSprite = {
  w: 6, h: 12, frames: 1, ox: 0, oy: 0,
  draw(p) {
    part(p, (q) => postBody(q, 1, 1, 10), FW.o);
  },
};

export const terrain: Record<string, DrawSprite> = {
  ground_meadow, ground_savanna, ground_arctic, field_meadow, field_savanna, field_arctic,
  fence_h, fence_v, fence_post,
};
void wrap;
