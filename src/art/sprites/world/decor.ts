// Decor props (anchor bottom-center).
import { PixelCanvas, type DrawSprite } from '../../pixel';
import { part, edgeShade, type Shades } from './common';

type Blob = [number, number, number, number?]; // cx, cy, rx, ry

/** Clumpy foliage: dark base, mid body offset up-left, light caps, highlight flecks. */
function foliage(q: PixelCanvas, blobs: Blob[], s: Shades) {
  for (const [x, y, rx, ry] of blobs) q.ellipse(x, y, rx, ry ?? rx, s.d);
  for (const [x, y, rx, ry] of blobs) q.ellipse(x - 0.8, y - 1.2, rx - 1, (ry ?? rx) - 1.2, s.m);
  for (const [x, y, rx, ry] of blobs) q.ellipse(x - rx * 0.3, y - (ry ?? rx) * 0.4, rx * 0.5, (ry ?? rx) * 0.4, s.l);
  if (s.h) for (const [x, y, rx, ry] of blobs) { q.set(Math.round(x - rx * 0.45), Math.round(y - (ry ?? rx) * 0.6), s.h); q.set(Math.round(x - rx * 0.45) + 1, Math.round(y - (ry ?? rx) * 0.6), s.h); }
}

const d = (w: number, h: number, draw: (p: PixelCanvas, f: number) => void, frames = 1, fps = 3): DrawSprite => ({ w, h, frames, fps, draw });

const LEAF: Shades = { d: 'F', m: 'G', l: 'h', h: 'H' };

export const tree_oak = d(40, 48, (p) => {
  // trunk with root flare and a branch fork
  part(p, (q) => {
    q.poly([[14, 47], [16, 44], [17, 32], [23, 32], [24, 44], [27, 47]], 'b');
    q.line(18, 34, 12, 26, 'b'); q.line(19, 34, 13, 26, 'b');
    q.line(22, 34, 28, 27, 'b'); q.line(21, 34, 27, 27, 'b');
    for (let y = 26; y < 48; y++) for (let x = 10; x < 30; x++) if (q.opaque(x, y) && x >= 21) q.set(x, y, 'n');
    for (let y = 36; y < 47; y++) q.paint(17, y, 'B');
    q.set(19, 40, 'n'); q.set(19, 41, 'm'); q.set(18, 45, 'n'); q.set(22, 38, 'm');
    q.hline(14, 26, 36, 'n'); q.hline(15, 25, 37, 'n');
  });
  part(p, (q) => {
    foliage(q, [[20, 12, 12, 10], [9, 21, 8, 7], [31, 21, 8, 7], [20, 26, 12, 8], [11, 11, 7, 6], [29, 11, 7, 6], [15, 29, 7, 5], [26, 29, 7, 5]], LEAF);
    // extra lit clumps on the upper-left
    for (const [x, y, r] of [[14, 8, 3], [22, 5, 3], [8, 17, 2.5], [18, 17, 3]] as [number, number, number][]) { q.ellipse(x, y, r, r * 0.7, 'h'); q.set(Math.round(x - 1), Math.round(y - 1), 'H'); }
    // dark clump separations bottom-right
  }, '0');
  for (const [x, y] of [[11, 23], [28, 25], [23, 15], [33, 16], [17, 30]]) { p.set(x, y, 'Q'); p.set(x + 1, y, 'R'); p.set(x, y - 1, 'e'); }
});

export const bush = d(20, 14, (p) => {
  part(p, (q) => foliage(q, [[6, 8, 5, 4.5], [13, 8, 5.5, 4.5], [10, 5.5, 5, 4]], LEAF), '0');
  for (const [x, y] of [[5, 7], [12, 5], [15, 9], [9, 10]]) { p.set(x, y, '9'); p.set(x + 1, y, 'Z'); }
});

export const flowers = d(8, 6, (p, f) => {
  const petal = [['Q', 'e'], ['Y', 'z'], ['N', 'A']][f];
  // stems + leaves
  p.set(2, 4, 'F'); p.set(2, 5, 'F'); p.set(5, 3, 'F'); p.set(5, 4, 'F'); p.set(5, 5, 'F');
  p.set(1, 5, 'G'); p.set(6, 5, 'G'); p.set(3, 5, 'G'); p.set(4, 4, 'G');
  if (f === 0) {
    // tulips
    p.grid(1, 1, ['0.0', 'QeQ', 'RQR', '.R.'].map((r) => r.replace(/0/g, 'Q')));
    p.grid(4, 0, ['Q.Q', 'QeQ', 'RQR']);
  } else if (f === 1) {
    // daisies (yellow)
    p.grid(1, 1, ['.Y.', 'YyY', '.Y.']);
    p.grid(4, 0, ['.z.', 'zOz', '.z.']);
  } else {
    // bluebells / lilac
    p.grid(1, 1, ['.N.', 'NAN', 'M.M']);
    p.grid(4, 0, ['.W.', 'WaW', 'w.w']);
  }
  void petal;
}, 3, 1);

export const rock = d(14, 10, (p) => {
  part(p, (q) => {
    q.ellipse(6, 6, 5.5, 4, '6');
    q.ellipse(10, 7, 3.5, 3, '6');
    for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) {
      if (!q.opaque(x, y)) continue;
      if (y >= 8 || x >= 11 && y >= 6) q.set(x, y, '2');
      else if (y <= 3 || x <= 2 && y <= 6) q.set(x, y, '7');
    }
    q.set(3, 3, '8'); q.set(4, 2, '8'); q.set(5, 2, '8');
    // moss cap
    q.set(6, 2, 'G'); q.set(7, 2, 'G'); q.set(8, 3, 'F'); q.set(7, 3, 'G');
    q.set(8, 6, '2'); q.set(7, 7, '2');
  }, '0');
});

export const acacia = d(56, 44, (p) => {
  // thin forked trunk
  part(p, (q) => {
    q.poly([[25, 43], [26, 30], [30, 30], [31, 43]], 'n');
    q.line(27, 31, 16, 16, 'n'); q.line(28, 31, 17, 16, 'n');
    q.line(28, 30, 38, 15, 'n'); q.line(29, 30, 39, 15, 'n');
    q.line(27, 25, 27, 14, 'n');
    for (let y = 14; y < 44; y++) for (let x = 14; x < 42; x++) if (q.opaque(x, y) && x >= 29 && y > 29) q.set(x, y, 'm');
    q.vline(26, 31, 42, 'b');
  });
  // flat umbrella canopy
  part(p, (q) => {
    const s: Shades = { d: 'D', m: 'l', l: 'H', h: 'z' };
    for (const [x, y, rx, ry] of [[11, 14, 9, 4], [27, 10, 14, 5], [44, 14, 10, 4], [19, 16, 8, 3], [36, 16, 8, 3]] as Blob[]) q.ellipse(x, y, rx, ry!, s.d);
    for (const [x, y, rx, ry] of [[11, 13, 8, 3], [27, 9, 13, 4], [44, 13, 9, 3]] as Blob[]) q.ellipse(x - 1, y - 0.5, rx, ry!, s.m);
    for (const [x, y, rx, ry] of [[10, 12, 5, 1.6], [25, 7, 8, 2], [42, 12, 5, 1.6]] as Blob[]) q.ellipse(x, y, rx, ry!, s.l);
    q.hline(22, 25, 6, s.h!); q.hline(8, 9, 11, s.h!);
    // underside shadow line
    for (let x = 0; x < 56; x++) for (let y = 43; y > 0; y--) if (q.opaque(x, y)) { q.set(x, y, 'd'); break; }
  }, '0');
});

export const baobab = d(36, 52, (p) => {
  // fat barrel trunk
  part(p, (q) => {
    for (let y = 18; y < 52; y++) {
      const t = (y - 18) / 33;
      const hw = 5 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 9 + (y > 48 ? (y - 48) : 0);
      q.hline(Math.round(18 - hw), Math.round(18 + hw - 1), y, '4');
    }
    // branches
    for (const [x0, y0, x1, y1] of [[14, 20, 5, 10], [16, 19, 11, 7], [20, 19, 25, 7], [22, 20, 31, 10], [18, 19, 18, 6]]) {
      q.line(x0, y0, x1, y1, '4'); q.line(x0 + 1, y0, x1 + 1, y1, '4'); q.line(x0, y0 + 1, x1, y1 + 1, '4');
    }
    for (let y = 0; y < 52; y++) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < 36; x++) if (q.opaque(x, y)) { if (x0 < 0) x0 = x; x1 = x; }
      if (x0 < 0 || y < 18) continue;
      const w = x1 - x0 + 1;
      for (let x = x0; x <= x1; x++) {
        const t = (x - x0) / w;
        q.set(x, y, t > 0.68 ? '3' : t > 0.18 && t < 0.3 ? 'x' : '4');
      }
    }
    // bark grooves
    for (const gx of [12, 16, 21, 25]) for (let y = 30; y < 50; y++) if ((y + gx) % 5 > 1) { const xx = Math.round(18 + (gx - 18) * (0.9 + (y - 30) / 60)); if (q.get(xx, y)) q.set(xx, y, gx > 20 ? '5' : '3'); }
  });
  // leaf clumps on branch tips
  part(p, (q) => foliage(q, [[6, 9, 6, 4], [13, 5, 5, 3.5], [24, 5, 5, 3.5], [31, 9, 5, 4], [18, 4, 4, 3]], { d: 'F', m: 'G', l: 'h', h: 'H' }), '0');
});

export const dry_bush = d(18, 12, (p) => {
  part(p, (q) => {
    // dome of dry twiggy leaves
    q.ellipse(9, 7.5, 7.5, 4.5, 'D');
    q.ellipse(8, 6.5, 6, 3.5, 'l');
    q.ellipse(7, 5, 3.5, 1.8, 'H');
    // twig strokes and gaps
    for (const [x0, y0, x1, y1] of [[9, 11, 4, 4], [9, 11, 9, 3], [9, 11, 14, 4], [9, 11, 2, 8], [9, 11, 16, 8]]) q.line(x0, y0, x1, y1, 'n');
    for (const [x, y] of [[5, 7], [12, 6], [13, 9], [4, 10], [11, 4]]) q.set(x, y, null);
    q.set(3, 3, 'l'); q.set(15, 3, 'l'); q.set(9, 1, 'H'); q.set(6, 2, 'l');
    q.hline(3, 15, 11, 'd');
  }, 'd');
});

export const pine_snow = d(32, 48, (p) => {
  part(p, (q) => { q.rect(14, 38, 4, 9, 'n'); q.vline(14, 38, 46, 'b'); }, '0');
  part(p, (q) => {
    const tiers: [number, number, number][] = [[39, 15, 12], [30, 12, 11], [21, 9, 10], [13, 6, 9]]; // baseY, halfW, height
    for (const [by, hw, h] of tiers) {
      q.poly([[16 - hw, by], [16, by - h - 3], [16 + hw, by]], 'C');
      q.poly([[16 - hw + 1, by - 1], [16, by - h - 2], [16 + 1, by - 1]], 's');
      // drooping bottom points
      for (let x = 16 - hw; x <= 16 + hw; x += 4) { q.set(x, by, 'C'); q.set(x + 1, by, 'C'); }
    }
    q.poly([[16, 0], [13, 6], [19, 6]], 'C');
  }, '0');
  // snow caps on each tier (left-lit)
  part(p, (q) => {
    const caps: [number, number, number][] = [[33, 11, 8], [24, 9, 7], [15, 7, 6], [5, 3, 4]];
    for (const [cy, hw, len] of caps) {
      for (let x = 16 - hw; x <= 16 + hw; x++) {
        const t = Math.abs(x - 16) / hw;
        const y = Math.round(cy + t * (len * 0.5));
        q.set(x, y, '9'); if (t < 0.8) q.set(x, y + 1, x < 16 ? '9' : '8');
        if ((x * 7) % 5 === 0 && t < 0.9) q.set(x, y + 2, '8');
      }
    }
    q.set(16, 1, '9'); q.set(15, 2, '9'); q.set(16, 2, '9');
  }, null);
  p.set(16, 0, '0');
});

export const ice_rock = d(20, 14, (p) => {
  part(p, (q) => {
    q.poly([[1, 13], [3, 6], [7, 2], [10, 5], [13, 1], [17, 6], [19, 13]], 'a');
    // facets
    q.poly([[7, 2], [10, 5], [9, 13], [3, 13], [3, 6]], 'v');
    q.poly([[13, 1], [17, 6], [19, 13], [13, 13]], 'W');
    q.line(10, 5, 9, 13, 'W'); q.line(13, 1, 13, 13, 'a');
    q.set(6, 4, '9'); q.set(5, 5, '9'); q.set(7, 3, '9'); q.set(12, 3, '9');
    q.hline(2, 18, 13, 'w');
  }, 'U');
  p.set(4, 8, '9');
});

export const snowman = d(16, 22, (p) => {
  part(p, (q) => {
    q.circle(8, 15.5, 6, '9');
    q.circle(8, 7.5, 4.5, '9');
    for (let y = 0; y < 22; y++) for (let x = 0; x < 16; x++) {
      if (!q.opaque(x, y)) continue;
      const big = y > 10;
      const cx = 8, cy = big ? 15.5 : 7.5, r = big ? 6 : 4.5;
      const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r;
      if (dx * 0.6 + dy * 0.8 > 0.55) q.set(x, y, '8');
      if (dx * 0.6 + dy * 0.8 > 0.9) q.set(x, y, '7');
    }
    // buttons
    q.set(8, 14, '1'); q.set(8, 17, '1');
    // stick arms
    q.line(2, 12, 0, 9, 'n'); q.line(13, 12, 15, 9, 'n');
  }, '0');
  // scarf
  part(p, (q) => { q.hline(4, 11, 11, 'Q'); q.hline(5, 10, 12, 'R'); q.rect(9, 12, 2, 4, 'Q'); q.set(10, 15, 'R'); q.set(5, 11, 'e'); }, '0');
  // face: eyes + carrot nose (facing right-ish)
  p.set(7, 6, '0'); p.set(10, 6, '0'); p.set(9, 8, 'O'); p.set(10, 8, 'O'); p.set(11, 8, 'y'); p.set(8, 9, '1'); p.set(10, 9, '1');
  // hat
  part(p, (q) => { q.hline(4, 12, 3, '1'); q.rect(5, 0, 7, 3, '1'); q.hline(5, 11, 2, 'Q'); q.vline(5, 0, 1, '2'); }, '0');
});

export const pond = d(48, 24, (p, f) => {
  // rim of sandy stones
  part(p, (q) => {
    q.ellipse(24, 13, 23, 10, 'x');
    q.ellipse(24, 12.5, 21, 8.5, 'W');
    for (let y = 0; y < 24; y++) for (let x = 0; x < 48; x++) {
      if (!q.opaque(x, y)) continue;
      const dx = (x + 0.5 - 24) / 21, dy = (y + 0.5 - 12.5) / 8.5;
      const r = dx * dx + dy * dy;
      if (r <= 1) {
        // water: deeper at top-back (shadow under the far bank), lighter near front
        q.set(x, y, dy < -0.55 ? 'w' : r < 0.35 ? 'W' : 'W');
        if (dy < -0.75) q.set(x, y, 'U');
      } else {
        // bank
        const dy2 = (y + 0.5 - 13) / 10;
        q.set(x, y, dy2 > 0.3 ? 'S' : 'x');
      }
    }
  }, '0');
  // stones on the bank
  for (const [x, y] of [[4, 17], [10, 21], [40, 20], [44, 14], [2, 11], [30, 22]]) p.grid(x, y, ['77', '62']);
  // lily pads
  p.grid(10, 12, ['.GG', 'GGh', 'FG.']);
  p.grid(33, 9, ['GG.', 'Gh.', '.F.']);
  p.grid(34, 8, ['.Z', 'Z9']);
  // reeds on the left
  part(p, (q) => {
    q.vline(5, 3, 12, 'F'); q.vline(7, 5, 12, 'G'); q.vline(3, 6, 12, 'G');
    q.rect(5, 3, 1, 3, 'n'); q.rect(7, 5, 1, 2, 'n');
  }, null);
  // shimmer
  const sh = f === 0 ? [[16, 10], [27, 15], [20, 17]] : [[18, 11], [25, 14], [31, 12]];
  for (const [x, y] of sh) { p.set(x, y, 'a'); p.set(x + 1, y, '9'); p.set(x + 2, y, 'a'); }
}, 2, 2);

export const sign_town = d(16, 20, (p) => {
  part(p, (q) => { q.rect(10, 8, 3, 12, 'b'); q.vline(10, 8, 19, 'B'); q.vline(12, 8, 19, 'n'); }, '0');
  part(p, (q) => {
    // arrow board pointing left
    q.poly([[0, 5.5], [4, 1], [16, 1], [16, 10], [4, 10]], 't');
    for (let x = 0; x < 16; x++) { q.paint(x, 1, 'z'); q.paint(x, 9, 'B'); }
    edgeShade(q, 'l', 'b');
  }, '0');
  // T O W N (3px glyphs)
  const glyph: Record<string, string[]> = {
    T: ['111', '010', '010', '010'],
    O: ['111', '101', '101', '111'],
    W: ['101', '101', '111', '111'],
    N: ['110', '101', '101', '101'],
  };
  let x = 1;
  for (const ch of 'TOWN') {
    glyph[ch].forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '1') p.set(x + i, 4 + j, 'm'); });
    x += 4;
  }
});

export const decor: Record<string, DrawSprite> = {
  tree_oak, bush, flowers, rock, acacia, baobab, dry_bush, pine_snow, ice_rock, snowman, pond, sign_town,
};
