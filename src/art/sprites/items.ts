// Product icons (16x16, anchor center) + crate (12x10). Agent C.
// Built from masks: each part gets a 1px internal outline and bottom-right shading,
// then the whole silhouette gets a dark ink rim. Light comes from the top-left.
import { PixelCanvas, type DrawSprite, type SpriteDef } from '../pixel';

type Col = string;

/** Build a mask canvas by drawing with any PixelCanvas ops (color irrelevant). */
function mask(fn: (t: PixelCanvas) => void, w = 16, h = 16): PixelCanvas {
  const t = new PixelCanvas(w, h);
  fn(t);
  return t;
}

/** Mask from a predicate. */
function maskF(f: (x: number, y: number) => boolean, w = 16, h = 16): PixelCanvas {
  const t = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f(x, y)) t.set(x, y, '9');
  return t;
}

function sub(m: PixelCanvas, fn: (t: PixelCanvas) => void): PixelCanvas {
  const cut = mask(fn, m.w, m.h);
  for (let i = 0; i < m.px.length; i++) if (cut.px[i]) m.px[i] = 0;
  return m;
}

/**
 * Draw a shaded part: 1px outline ring (ol) around mask, fill base, shade band (sh) on the
 * bottom-right edge, darker rim (dk) at the very bottom-right edge.
 */
function part(p: PixelCanvas, m: PixelCanvas, base: Col, sh?: Col | null, dk?: Col | null, ol: Col | null = '0', band = 1) {
  const o = (x: number, y: number) => m.opaque(x, y);
  if (ol) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (o(x, y)) continue;
      if (o(x - 1, y) || o(x + 1, y) || o(x, y - 1) || o(x, y + 1)) p.set(x, y, ol);
    }
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!o(x, y)) continue;
    let c = base;
    if (sh) {
      let edge = false;
      for (let k = 1; k <= band + 1 && !edge; k++) if (!o(x + k, y) || !o(x, y + k) || !o(x + k, y + k)) edge = true;
      if (edge) c = sh;
      if (dk && (!o(x + 1, y + 1) || !o(x, y + 1))) c = dk;
    }
    p.set(x, y, c);
  }
}

/** Plot a list of [x,y] points in a color. */
function dots(p: PixelCanvas, c: Col, pts: [number, number][]) {
  for (const [x, y] of pts) p.set(x, y, c);
}

function item(draw: (p: PixelCanvas) => void, rim: Col = '0'): DrawSprite {
  return {
    w: 16, h: 16, ox: 8, oy: 8,
    draw: (p) => { draw(p); p.innerOutline(rim); },
  };
}

// ---------------------------------------------------------------------------------------------

const egg = item((p) => {
  const m = maskF((x, y) => {
    const cx = 8, cy = 8.6, ry = 6.3;
    const dy = y + 0.5 - cy;
    const rx = 5.2 * (1 + 0.13 * (dy / ry));
    const nx = (x + 0.5 - cx) / rx;
    return nx * nx + (dy / ry) ** 2 <= 1;
  });
  part(p, m, '9', '&', '%', null, 1);
  dots(p, '9', [[5, 5], [5, 6], [6, 4]]);
  dots(p, '&', [[10, 5]]);
  // tiny speckles for charm
  dots(p, '%', [[9, 7], [6, 11]]);
});

const wool = item((p) => {
  const puffs: [number, number, number][] = [
    [5.5, 6.5, 3.2], [10.5, 6, 3.4], [8, 4.2, 3], [4, 10.5, 3.1], [12, 10.3, 3], [8, 11, 3.8],
  ];
  for (const [x, y, r] of puffs) part(p, mask((t) => t.circle(x, y, r, '9')), '9', '8', null, '7', 0);
  // curls
  dots(p, '8', [[7, 8], [8, 8], [9, 7]]);
  dots(p, '9', [[4, 5], [9, 3], [3, 9]]);
});

const milk = item((p) => {
  const body = mask((t) => {
    t.rect(3, 7, 10, 8, '9');
    t.rect(4, 6, 8, 1, '9');
    t.rect(6, 4, 4, 2, '9');
    t.set(3, 7, null); t.set(12, 7, null); t.set(3, 14, null); t.set(12, 14, null);
  });
  part(p, body, '9', '8', '7', '0', 1);
  // label band
  p.rect(3, 9, 10, 4, 'W');
  p.hline(3, 12, 12, 'w');
  p.hline(3, 12, 9, 'a');
  p.set(12, 10, 'w'); p.set(12, 11, 'w');
  // little white drop on label
  dots(p, '9', [[8, 9], [7, 10], [8, 10], [9, 10], [7, 11], [8, 11]]);
  dots(p, 'a', [[9, 11]]);
  p.hline(3, 12, 8, '0');
  p.hline(3, 12, 13, '0');
  // cap
  const cap = mask((t) => t.rect(5, 1, 6, 3, '9'));
  part(p, cap, 'Q', 'R', null, '0', 0);
  dots(p, 'e', [[6, 2], [7, 2]]);
  dots(p, '9', [[6, 1]]);
  // glass highlight
  dots(p, '9', [[4, 7], [4, 13]]);
});

const feather = item((p) => {
  // shaft from quill (3,14) to tip (13,2), slightly bent; vanes either side
  const x0 = 2.5, y0 = 14.5, x1 = 13.5, y1 = 1.5;
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const info = (x: number, y: number) => {
    const vx = x + 0.5 - x0, vy = y + 0.5 - y0;
    const t = (vx * ux + vy * uy) / L;
    const d = ux * vy - uy * vx + 1.6 * Math.sin(Math.PI * t) - 0.3; // bend toward top-left
    return { t, d };
  };
  const width = (t: number) => (t < 0.2 || t > 1.02 ? 0 : 3.3 * Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.2) / 0.82)), 0.6));
  const m = maskF((x, y) => {
    const { t, d } = info(x, y);
    const w = width(t);
    if (Math.abs(d) > w) return false;
    // V notches in the barbs
    const k = (t * L + (d > 0 ? 1 : 0)) % 3.2;
    if (Math.abs(d) > w - 1.1 && k < 0.8 && t > 0.3 && t < 0.92) return false;
    return true;
  });
  part(p, m, 'Z', null, null, '0', 0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!m.opaque(x, y)) continue;
    const { t, d } = info(x, y);
    if (d > 0.9) p.set(x, y, d > width(t) - 1 ? 'T' : 'X');
    else if (d < -1.4 && t > 0.45) p.set(x, y, 'A');
  }
  // shaft + quill
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const bend = 1.6 * Math.sin(Math.PI * t) - 0.3;
    const x = x0 + ux * t * L + uy * bend, y = y0 + uy * t * L - ux * bend;
    if (t > 0.94) break;
    p.set(Math.floor(x), Math.floor(y), t < 0.2 ? '&' : '9');
  }
  dots(p, '0', [[2, 15]]);
});

const egg_powder = item((p) => {
  // jar body
  const body = mask((t) => { t.rect(3, 5, 10, 10, '9'); t.set(3, 14, null); t.set(12, 14, null); });
  part(p, body, 'Y', 'y', 'O', '0', 1);
  // glass top gap
  p.hline(4, 11, 5, 'a');
  // label
  const lab = mask((t) => t.rect(5, 8, 6, 5, '9'));
  part(p, lab, '9', '8', null, 'y', 0);
  // tiny egg on label
  dots(p, '&', [[8, 9], [7, 10], [8, 10], [9, 10], [7, 11], [8, 11], [9, 11]]);
  dots(p, '%', [[9, 11], [8, 11]]);
  // highlight streak
  p.vline(4, 7, 11, 'z');
  // lid
  const lid = mask((t) => t.rect(3, 2, 10, 3, '9'));
  part(p, lid, 'Q', 'R', null, '0', 0);
  p.hline(4, 9, 2, 'e');
  p.hline(3, 12, 4, 'q');
  dots(p, '9', [[4, 2]]);
});

const flour = item((p) => {
  const sack = mask((t) => {
    t.poly([[4, 6], [12, 6], [14, 10], [14, 14], [2, 14], [2, 10]], '9');
    t.rect(5, 4, 6, 2, '9');
  });
  part(p, sack, '&', '%', 'o', '0', 1);
  // gathered top frill
  const frill = mask((t) => t.poly([[4, 1], [12, 1], [10, 4], [6, 4]], '9'));
  part(p, frill, '&', '%', null, '0', 0);
  dots(p, '9', [[5, 2], [6, 2]]);
  // tie string
  p.hline(5, 11, 4, 'n');
  dots(p, 'b', [[6, 4], [7, 4]]);
  // flour dust
  dots(p, '9', [[7, 1], [8, 1], [9, 1], [8, 0]]);
  // wheat symbol
  p.vline(8, 8, 13, 'b');
  dots(p, 'y', [[7, 8], [9, 8], [7, 10], [9, 10], [6, 9], [10, 9], [6, 11], [10, 11], [8, 7]]);
  // highlight
  dots(p, '9', [[4, 8], [3, 10], [3, 11], [4, 7]]);
});

const cookie = item((p) => {
  const m = mask((t) => t.circle(8, 8.5, 6.5, '9'));
  sub(m, (t) => t.circle(14.5, 3, 2.6, '9'));
  part(p, m, 't', 'B', 'b', '0', 1);
  // baked highlight
  dots(p, 'z', [[5, 4], [4, 5], [6, 4]]);
  // chocolate chips
  const chip = (x: number, y: number) => { dots(p, 'n', [[x, y], [x + 1, y]]); dots(p, 'm', [[x, y + 1], [x + 1, y + 1]]); };
  chip(5, 7); chip(9, 5); chip(10, 10); chip(6, 11);
  dots(p, 'n', [[8, 9], [12, 7]]);
  // crumbs by the bite
  dots(p, 'B', [[11, 3]]);
});

const cake = item((p) => {
  const body = mask((t) => {
    t.rect(2, 7, 12, 6, '9');
    t.ellipse(8, 12.6, 6, 1.8, '9');
    t.ellipse(8, 7, 6, 2.2, '9');
  });
  part(p, body, 'B', 'b', 'n', '0', 1);
  // cream layer
  p.hline(2, 13, 10, '9');
  p.hline(2, 13, 11, '&');
  p.set(13, 10, '&');
  // frosting top
  const top = mask((t) => {
    t.ellipse(8, 6.8, 6, 2.2, '9');
    t.rect(2, 7, 12, 1, '9');
    // drips
    t.rect(3, 8, 1, 1, '9'); t.rect(6, 8, 1, 2, '9'); t.rect(10, 8, 1, 1, '9'); t.rect(12, 8, 1, 2, '9');
  });
  part(p, top, 'Z', 'X', null, null, 0);
  dots(p, 'A', [[4, 5], [5, 5], [6, 5], [3, 6]]);
  // sprinkles
  dots(p, 'Y', [[5, 7]]); dots(p, 'W', [[11, 6]]); dots(p, 'J', [[9, 7]]);
  // cherry
  const ch = mask((t) => t.circle(8.5, 3.5, 1.8, '9'));
  part(p, ch, 'Q', 'q', null, '0', 0);
  dots(p, '9', [[8, 3]]);
  dots(p, 'F', [[9, 1], [10, 0]]);
});

const yarn = item((p) => {
  const m = mask((t) => t.circle(8, 8, 6.5, '9'));
  part(p, m, 'N', 'M', 'P', '0', 1);
  // wound strands: two families of arcs, clipped to the ball
  const arcs = (cx: number, cy: number, radii: number[], c: Col) => {
    for (const r of radii) {
      const ring = mask((t) => t.ring(cx, cy, r, r, '9'));
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (!ring.opaque(x, y) || !m.opaque(x, y)) continue;
        if (!m.opaque(x + 1, y) || !m.opaque(x, y + 1) || !m.opaque(x - 1, y) || !m.opaque(x, y - 1)) continue;
        p.set(x, y, c);
      }
    }
  };
  arcs(0, 16, [8, 11, 14], 'M');
  arcs(1, 17, [9.5, 12.5], 'A');
  arcs(16, 2, [6, 9], 'M');
  // highlight
  dots(p, '9', [[5, 4], [4, 5]]);
  dots(p, 'A', [[6, 4], [4, 6], [5, 5]]);
  // loose end
  dots(p, 'N', [[13, 13], [14, 14]]);
  dots(p, '0', [[12, 14], [13, 14], [14, 13], [15, 15], [14, 15], [15, 14]]);
  dots(p, 'N', [[14, 14]]);
});

const fabric = item((p) => {
  // stack of folded cloth: two plain folds under a gingham top fold
  const bottom = mask((t) => { t.rect(2, 11, 12, 4, '9'); t.set(13, 11, null); t.set(13, 14, null); });
  part(p, bottom, 'w', 'U', null, '0', 0);
  p.hline(3, 11, 12, 'W');
  const mid = mask((t) => { t.rect(1, 8, 13, 4, '9'); t.set(13, 8, null); t.set(13, 11, null); });
  part(p, mid, 'W', 'w', null, '0', 0);
  p.hline(2, 11, 9, 'a');
  p.vline(13, 9, 10, 'w');
  const top = mask((t) => { t.rect(2, 2, 12, 7, '9'); t.set(2, 2, null); t.set(13, 2, null); t.set(13, 8, null); t.set(13, 7, null); t.set(12, 8, null); });
  part(p, top, 'W', null, null, '0', 0);
  // gingham on the top face (rows 2..6) and darker checks on the front fold (7..8)
  for (let y = 2; y <= 8; y++) for (let x = 2; x <= 13; x++) {
    if (!top.opaque(x, y)) continue;
    const a = Math.floor((x - 2) / 2) % 2 === 0, b = Math.floor((y - 1) / 2) % 2 === 0;
    const front = y >= 7;
    const c = a && b ? (front ? 'a' : '9') : a || b ? (front ? 'W' : 'a') : (front ? 'w' : 'W');
    p.set(x, y, c);
  }
  p.hline(3, 12, 7, '0');
  p.hline(3, 11, 7, 'w');
  dots(p, '0', [[2, 7], [12, 7]]);
});

const buttons = item((p) => {
  const big = mask((t) => t.circle(6.5, 6.5, 5.4, '9'));
  part(p, big, 'Q', 'R', 'q', '0', 1);
  p.ring(6.5, 6.5, 3.6, 3.6, 'R');
  dots(p, 'r', [[5, 5], [7, 5], [5, 7], [7, 7]]);
  dots(p, 'e', [[3, 4], [4, 3], [5, 2]]);
  dots(p, '9', [[3, 3]]);
  const small = mask((t) => t.circle(11.5, 11.5, 3.6, '9'));
  part(p, small, 'Y', 'y', 'O', '0', 0);
  dots(p, 'O', [[11, 11], [12, 11]]);
  dots(p, 'z', [[10, 9], [9, 10]]);
});

const shirt = item((p) => {
  const m = mask((t) => {
    t.rect(4, 3, 8, 12, '9');
    t.poly([[4, 2], [1, 5], [3, 8], [5, 7]], '9');
    t.poly([[12, 2], [15, 5], [13, 8], [11, 7]], '9');
    t.rect(4, 2, 8, 1, '9');
  });
  part(p, m, 'Q', 'R', 'q', '0', 1);
  // sleeve seams
  dots(p, 'R', [[4, 5], [4, 6], [11, 5], [11, 6]]);
  // cuffs
  dots(p, 'q', [[2, 7], [3, 7], [13, 7], [12, 7]]);
  // collar
  dots(p, '0', [[6, 2], [7, 3], [8, 3], [9, 2]]);
  dots(p, '9', [[5, 2], [5, 3], [6, 3], [6, 4], [10, 2], [10, 3], [9, 3], [9, 4]]);
  dots(p, '8', [[6, 4], [9, 4]]);
  // placket + buttons
  p.vline(8, 4, 14, 'R');
  dots(p, '9', [[7, 6], [7, 9], [7, 12]]);
  // pocket
  dots(p, 'R', [[9, 6], [10, 6], [10, 7]]);
  // highlight
  dots(p, 'e', [[5, 5], [5, 6], [5, 7], [5, 8], [3, 4]]);
});

const pillow = item((p) => {
  const m = mask((t) => t.poly([[1, 2], [8, 3.4], [15, 2], [13.6, 8], [15, 14], [8, 12.6], [1, 14], [2.4, 8]], '9'));
  part(p, m, 'Z', 'X', 'T', '0', 1);
  // puffy highlight
  dots(p, 'A', [[4, 4], [5, 4], [6, 5], [4, 5], [3, 6], [4, 6], [3, 7]]);
  dots(p, '9', [[4, 4]]);
  // center tuft
  dots(p, 'X', [[7, 7], [9, 7], [7, 9], [9, 9]]);
  dots(p, 'T', [[8, 8]]);
  dots(p, 'A', [[7, 8], [8, 7]]);
  // stitch dashes
  dots(p, 'A', [[5, 11], [7, 11], [9, 11], [11, 11]]);
});

const hat = item((p) => {
  // feather (behind crown)
  const fm = mask((t) => { t.ellipse(12.5, 4.5, 1.8, 4, '9'); t.circle(13, 2.5, 1.6, '9'); });
  part(p, fm, '9', 'A', null, '0', 0);
  dots(p, 'N', [[12, 3], [12, 5], [12, 7]]);
  // brim
  const brim = mask((t) => t.ellipse(8, 11.5, 7.4, 2.6, '9'));
  part(p, brim, 'M', 'P', 'p', '0', 0);
  // crown
  const crown = mask((t) => { t.rect(4, 5, 8, 6, '9'); t.ellipse(8, 5.2, 4, 2.2, '9'); });
  part(p, crown, 'M', 'P', null, '0', 1);
  dots(p, 'N', [[5, 4], [6, 3], [7, 3], [5, 5], [5, 6], [5, 7]]);
  // band
  p.hline(4, 11, 9, 'Y');
  p.hline(4, 11, 10, 'y');
  // flower on band
  dots(p, '9', [[5, 8], [4, 9], [6, 9], [5, 10]]);
  dots(p, 'Q', [[5, 9]]);
  // brim highlight
  dots(p, 'N', [[2, 11], [3, 10], [12, 10], [13, 11]]);
});

const cream = item((p) => {
  // tub
  const tub = mask((t) => t.poly([[3, 8], [13, 8], [12, 15], [4, 15]], '9'));
  part(p, tub, 'J', 'j', 'I', '0', 1);
  const rim = mask((t) => t.rect(2, 7, 12, 2, '9'));
  part(p, rim, 'v', 'J', null, '0', 0);
  // label heart
  dots(p, '9', [[7, 11], [9, 11], [6, 11]]);
  dots(p, '9', [[6, 11], [7, 11], [9, 11], [10, 11], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12], [7, 13], [8, 13], [9, 13], [8, 14]]);
  dots(p, 'Z', [[7, 12], [9, 12], [8, 13]]);
  // highlight
  p.vline(4, 10, 13, 'v');
  // cream swirl
  const swirl = mask((t) => { t.ellipse(8, 6, 5, 1.8, '9'); t.ellipse(8, 4, 3.6, 1.6, '9'); t.circle(8.5, 2.4, 1.4, '9'); t.set(9, 0, '9'); });
  part(p, swirl, '9', '&', null, '0', 0);
  dots(p, '&', [[6, 5], [7, 5], [9, 3], [10, 3]]);
  dots(p, '9', [[10, 6]]);
});

const cheese = item((p) => {
  // right end face (dark), front face (mid), top face (light)
  const front = mask((t) => t.poly([[1, 9], [12, 6], [12, 14], [1, 14]], '9'));
  part(p, front, 'Y', 'y', null, '0', 0);
  const end = mask((t) => t.poly([[12, 6], [15, 7], [15, 13], [12, 14]], '9'));
  part(p, end, 'y', 'O', null, '0', 0);
  const top = mask((t) => t.poly([[1, 9], [9, 3], [15, 6.6], [12, 7]], '9'));
  part(p, top, 'z', 'Y', null, '0', 0);
  p.line(2, 9, 11, 7, 'Y');
  // holes
  const hole = (x: number, y: number, big = false) => {
    dots(p, 'O', [[x, y], [x + 1, y]]);
    dots(p, 'y', [[x, y + 1], [x + 1, y + 1]]);
    if (big) dots(p, 'O', [[x, y + 1]]);
  };
  hole(4, 11, true); hole(8, 9); hole(9, 12); dots(p, 'O', [[6, 13]]);
  dots(p, 'O', [[13, 9]]); dots(p, 'O', [[14, 11]]);
  dots(p, 'y', [[10, 5], [8, 6]]);
  dots(p, '9', [[3, 9], [5, 8]]);
});

const ice_cream = item((p) => {
  // cone
  const cone = mask((t) => t.poly([[4, 9], [12, 9], [8.6, 16], [7.4, 16]], '9'));
  part(p, cone, 'B', 'b', null, '0', 0);
  for (const [x0, y0, x1, y1] of [[5, 10, 8, 15], [8, 10, 11, 12], [11, 10, 7, 15], [8, 10, 5, 12]] as const) p.line(x0, y0, x1, y1, 'b');
  dots(p, 't', [[5, 10], [6, 11], [6, 10]]);
  // big strawberry scoop with scalloped drip edge
  const sc = mask((t) => {
    t.circle(8, 6.2, 4.9, '9');
    t.circle(4.5, 9.4, 1.3, '9'); t.circle(8, 10, 1.3, '9'); t.circle(11.5, 9.4, 1.3, '9');
  });
  part(p, sc, 'Z', 'X', 'T', '0', 1);
  dots(p, 'A', [[5, 4], [6, 3], [5, 5], [7, 3], [4, 6]]);
  dots(p, '9', [[5, 4]]);
  // sprinkles
  dots(p, 'Y', [[9, 5]]); dots(p, 'W', [[6, 7]]); dots(p, 'J', [[10, 8]]); dots(p, '9', [[8, 7]]);
  // cherry
  const ch = mask((t) => t.circle(8.5, 1.6, 1.5, '9'));
  part(p, ch, 'Q', 'q', null, '0', 0);
  dots(p, '9', [[8, 1]]);
});

// --- caged predators ---------------------------------------------------------------------------

function cageIcon(face: (p: PixelCanvas) => void): DrawSprite {
  return item((p) => {
    // dark interior + bars behind; the animal's head sits in front so it stays readable
    p.rect(2, 3, 13, 10, '1');
    for (const x of [3, 6, 10, 13]) {
      p.vline(x, 3, 12, '7');
      p.set(x, 3, '8');
      p.vline(x + 1, 3, 12, '2');
    }
    p.vline(2, 3, 12, '2');
    face(p);
    // front bars over the cheeks (eyes & muzzle stay clear)
    for (const x of [4, 12]) { p.vline(x, 3, 12, '7'); p.set(x, 3, '9'); p.set(x, 12, '2'); }
    // roof & base
    const roof = mask((t) => { t.rect(1, 1, 15, 2, '9'); t.rect(5, 0, 7, 1, '9'); });
    part(p, roof, '7', '2', null, '0', 0);
    dots(p, '8', [[5, 0], [6, 0], [2, 1], [3, 1], [4, 1]]);
    const base = mask((t) => t.rect(1, 13, 15, 2, '9'));
    part(p, base, 'b', 'n', null, '0', 0);
    p.hline(2, 14, 13, 'B');
  });
}

function head(p: PixelCanvas, fur: [Col, Col, Col], muzzle: [Col, Col], ear: Col, mane?: [Col, Col]) {
  if (mane) {
    const mm = mask((t) => { t.circle(8, 8, 5.6, '9'); for (const [x, y] of [[3, 4], [13, 4], [2, 8], [14, 8], [8, 2], [5, 2.6], [11, 2.6]]) t.circle(x, y, 1.3, '9'); });
    part(p, mm, mane[0], mane[1], null, '0', 1);
    dots(p, mane[1], [[4, 6], [12, 6], [4, 10], [12, 10], [6, 4], [10, 4]]);
    dots(p, 'Y', [[5, 3], [3, 7], [7, 2]]);
  } else {
    for (const ex of [4.5, 11.5]) {
      const em = mask((t) => t.circle(ex, 4.6, 1.9, '9'));
      part(p, em, fur[0], fur[1], null, '0', 0);
    }
    dots(p, ear, [[4, 4], [11, 4], [4, 5], [11, 5]]);
  }
  const hm = mask((t) => t.ellipse(8, 8.6, mane ? 3.9 : 4.8, 4.1, '9'));
  part(p, hm, fur[0], fur[1], null, '0', 0);
  const mz = mask((t) => t.ellipse(8, 10.7, 2.5, 1.8, '9'));
  part(p, mz, muzzle[0], muzzle[1], null, null, 0);
  dots(p, fur[2], [[6, 6], [7, 6]]);
  dots(p, '0', [[6, 8], [10, 8], [6, 9], [10, 9], [7, 10], [8, 10], [9, 10], [8, 11]]);
  dots(p, '9', [[6, 8], [10, 8]]);
}

const bear_cage = cageIcon((p) => head(p, ['b', 'n', 'B'], ['t', 'B'], 'n'));
const lion_cage = cageIcon((p) => head(p, ['Y', 'y', 'z'], ['&', '%'], 'y', ['O', 'b']));
const polar_cage = cageIcon((p) => head(p, ['9', '8', '9'], ['9', '8'], '7'));

// --- crate 12x10 --------------------------------------------------------------------------------

const crate: DrawSprite = {
  w: 12, h: 10, ox: 6, oy: 5,
  draw: (p) => {
    p.rect(0, 0, 12, 10, '0');
    p.rect(1, 1, 10, 8, 'B');
    // planks
    p.hline(1, 10, 3, 'b');
    p.hline(1, 10, 6, 'b');
    p.hline(1, 10, 1, 't');
    p.hline(1, 10, 4, 't');
    p.hline(1, 10, 7, 't');
    // corner posts
    p.rect(1, 1, 2, 8, 'b');
    p.rect(9, 1, 2, 8, 'b');
    p.vline(1, 1, 8, 'B');
    p.vline(9, 1, 8, 'B');
    // diagonal brace
    p.line(3, 8, 8, 1, 'n');
    p.line(3, 7, 7, 1, 'b');
    // nails
    dots(p, 'n', [[2, 2], [10, 2], [2, 7], [10, 7]]);
    // bottom shade
    p.hline(1, 10, 8, 'n');
  },
};

export const sprites: Record<string, SpriteDef> = {
  egg, wool, milk, feather, egg_powder, flour, cookie, cake, yarn, fabric, buttons, shirt,
  pillow, hat, cream, cheese, ice_cream, bear_cage, lion_cage, polar_cage, crate,
};
