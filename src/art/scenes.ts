// Full-screen scenes: title background, logo, world map, map nodes. Agent C.
import { PixelCanvas, rng, type DrawSprite } from './pixel';
import { FONTS } from './font';

type Col = string;

// ---------------------------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------------------------

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold in [0,1) for pixel (x,y). */
const bay = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** Local mask canvas. */
function mk(w: number, h: number, fn: (t: PixelCanvas) => void): PixelCanvas {
  const t = new PixelCanvas(w, h);
  fn(t);
  return t;
}

/**
 * Stamp a mask at (ox,oy) with a 1px outline (ol), base fill, highlight on the top-left rim (hi),
 * shade band on the bottom-right rim (sh).
 */
function stamp(p: PixelCanvas, m: PixelCanvas, ox: number, oy: number, base: Col, hi: Col | null, sh: Col | null, ol: Col | null, band = 1) {
  const o = (x: number, y: number) => m.opaque(x, y);
  if (ol) for (let y = -1; y <= m.h; y++) for (let x = -1; x <= m.w; x++) {
    if (o(x, y)) continue;
    if (o(x - 1, y) || o(x + 1, y) || o(x, y - 1) || o(x, y + 1)) p.set(ox + x, oy + y, ol);
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!o(x, y)) continue;
    let c = base;
    if (sh) for (let k = 1; k <= band; k++) if (!o(x + k, y) || !o(x, y + k) || !o(x + k, y + k)) c = sh;
    if (hi && (!o(x - 1, y) || !o(x, y - 1)) && c === base) c = hi;
    p.set(ox + x, oy + y, c);
  }
}

function oak(p: PixelCanvas, cx: number, by: number, s = 1) {
  const r = Math.round(9 * s);
  p.rect(cx - 1, by - Math.round(8 * s), 3, Math.round(8 * s), 'n');
  p.vline(cx - 1, by - Math.round(8 * s), by - 1, 'b');
  const w = r * 2 + 6, h = Math.round(r * 1.9) + 4;
  const m = mk(w, h, (t) => {
    t.circle(w / 2, h / 2 + 1, r, '9');
    t.circle(w / 2 - r * 0.6, h / 2 + r * 0.3, r * 0.7, '9');
    t.circle(w / 2 + r * 0.6, h / 2 + r * 0.3, r * 0.7, '9');
    t.circle(w / 2 - r * 0.2, h / 2 - r * 0.45, r * 0.7, '9');
  });
  const ox = cx - Math.floor(w / 2) + 1, oy = by - Math.round(8 * s) - h + 3;
  stamp(p, m, ox, oy, 'F', 'G', 'f', 'f', 2);
  // leaf clumps highlight
  const R = rng(cx * 7 + by);
  for (let i = 0; i < r * 1.2; i++) {
    const x = ox + Math.floor(R() * w * 0.6 + 2), y = oy + Math.floor(R() * h * 0.5 + 2);
    if (m.opaque(x - ox, y - oy) && m.opaque(x - ox + 1, y - oy + 1)) { p.set(x, y, 'h'); p.set(x + 1, y, 'G'); }
  }
}

function pine(p: PixelCanvas, cx: number, by: number, s = 1, snow = true) {
  p.rect(cx - 1, by - 4, 3, 4, 'n');
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const w = Math.round((16 - i * 4) * s), top = by - 4 - Math.round((8 + i * 7) * s) - Math.round(6 * s), bot = by - 3 - Math.round(i * 7 * s);
    const m = mk(w + 2, bot - top + 2, (t) => t.poly([[(w + 2) / 2, 0], [w + 1, bot - top], [1, bot - top]], '9'));
    stamp(p, m, cx - Math.floor((w + 2) / 2) + 1, top, 'F', null, 'f', '0', 1);
    if (snow) {
      // snow on the upper edge of each tier
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (!m.opaque(x, y)) continue;
        if (!m.opaque(x, y - 2) || (y < 3)) p.set(cx - Math.floor((w + 2) / 2) + 1 + x, top + y, x < m.w / 2 ? '9' : '8');
      }
    }
  }
}

function acacia(p: PixelCanvas, cx: number, by: number, s = 1) {
  const h = Math.round(20 * s);
  p.line(cx, by, cx, by - h + 4, 'n');
  p.line(cx + 1, by, cx + 1, by - h + 4, 'n');
  p.line(cx, by - h + 6, Math.round(cx - 9 * s), by - h, 'n');
  p.line(cx + 1, by - h + 5, Math.round(cx + 10 * s), by - h, 'n');
  p.line(cx, by - h + 4, cx + 2, by - h - 1, 'n');
  const w = Math.round(44 * s), hh = Math.round(12 * s);
  const m = mk(w + 2, hh + 4, (t) => {
    t.ellipse((w + 2) / 2, hh * 0.62 + 1, w / 2, hh * 0.38, '9');
    t.ellipse((w + 2) * 0.33, hh * 0.45 + 1, w * 0.22, hh * 0.42, '9');
    t.ellipse((w + 2) * 0.62, hh * 0.38 + 1, w * 0.25, hh * 0.4, '9');
  });
  const ox = cx - Math.floor(w / 2) - 1 + 1, oy = by - h - hh + 1;
  stamp(p, m, ox, oy, 'D', 'l', 'C', '0', 1);
  // leafy highlight flecks
  for (let y = 1; y < m.h; y++) for (let x = 1; x < m.w; x++) if (m.opaque(x, y) && m.opaque(x, y - 2) && !m.opaque(x, y - 3) && (x % 3 === 0)) p.set(ox + x, oy + y, 'l');
}

function cloud(p: PixelCanvas, cx: number, cy: number, s: number, shade: Col = '8') {
  const w = Math.round(60 * s), h = Math.round(26 * s);
  const m = mk(w, h, (t) => {
    t.ellipse(w / 2, h * 0.68, w * 0.46, h * 0.3, '9');
    t.circle(w * 0.33, h * 0.52, h * 0.3, '9');
    t.circle(w * 0.55, h * 0.4, h * 0.38, '9');
    t.circle(w * 0.74, h * 0.56, h * 0.26, '9');
  });
  const ox = Math.round(cx - w / 2), oy = Math.round(cy - h / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m.opaque(x, y)) continue;
    const under = !m.opaque(x, y + 2) || !m.opaque(x, y + 3);
    p.set(ox + x, oy + y, under ? shade : '9');
  }
}

// ---------------------------------------------------------------------------------------------
// title background
// ---------------------------------------------------------------------------------------------

function drawTitle(p: PixelCanvas) {
  const W = 640, H = 360;
  // sky: flat bands joined by short ordered-dither transitions
  for (let y = 0; y < 230; y++) for (let x = 0; x < W; x++) {
    let c: Col = 'W';
    if ((y - 58) / 22 > bay(x, y)) c = 'a';
    if (c === 'a' && ((y - 174) / 24) * 0.4 > bay(x + 2, y)) c = '9';
    p.set(x, y, c);
  }
  // sun (top-left) with halo
  for (let y = 0; y < 110; y++) for (let x = 0; x < 150; x++) {
    const d = Math.hypot(x - 68, y - 52);
    if (d < 17) p.set(x, y, d < 14 ? 'z' : 'Y');
    else if (d < 26 && (26 - d) / 9 > bay(x, y)) p.set(x, y, p.get(x, y) === p.get(0, 0) ? 'a' : 'z');
  }
  // clouds (kept off the centre so the logo stays readable)
  cloud(p, 130, 118, 1.3);
  cloud(p, 555, 62, 1.5);
  cloud(p, 610, 140, 0.8);
  cloud(p, 32, 170, 0.9);
  cloud(p, 470, 150, 0.7);

  // far hills (hazy)
  const far = (x: number) => 186 + 9 * Math.sin(x * 0.013 + 1) + 5 * Math.sin(x * 0.037 + 2);
  const mid = (x: number) => 214 + 16 * Math.sin(x * 0.0095 + 2.3) + 6 * Math.sin(x * 0.027);
  const near = (x: number) => 258 + 7 * Math.sin(x * 0.007 + 0.5) + 3 * Math.sin(x * 0.03);
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(far(x));
    for (let y = y0; y < H; y++) p.set(x, y, y === y0 ? 'x' : 'S');
  }
  // distant trees on far hills
  for (let x = 8; x < W; x += 23) {
    if (x > 200 && x < 440) continue;
    const y = Math.round(far(x));
    const m = mk(9, 8, (t) => t.ellipse(4.5, 4, 4, 3.5, '9'));
    stamp(p, m, x - 4, y - 5, 's', 'S', 'C', null, 1);
  }
  // mid hills
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(mid(x));
    for (let y = y0; y < H; y++) p.set(x, y, y <= y0 + 1 ? 'H' : 'h');
  }
  // patchwork fields on the mid hills (left & right only)
  const field = (x0: number, x1: number, dy0: number, dy1: number, base: Col, line: Col, step: number) => {
    const sl = (dy1 - dy0) * 0.7; // slanted sides so the patch lies on the slope
    for (let y = dy0; y <= dy1; y++) {
      const k = (y - dy0) / (dy1 - dy0);
      const xa = Math.round(x0 + sl * k * (x0 < 320 ? -1 : 1) * 0.6), xb = Math.round(x1 + sl * k * (x0 < 320 ? -1 : 1) * 0.6);
      for (let x = xa; x <= xb; x++) {
        const Y = Math.round(mid(x)) + y;
        const edge = x === xa || x === xb || y === dy1;
        p.set(x, Y, edge ? line : (y - dy0) % step === 0 ? line : base);
        if (y === dy1) p.set(x, Y + 1, 'G');
      }
    }
  };
  field(160, 200, 12, 28, 't', 'y', 3);
  field(204, 226, 14, 30, 'L', 'l', 2);
  field(428, 452, 14, 30, 'L', 'l', 2);
  field(456, 494, 12, 26, 't', 'y', 3);
  field(498, 522, 12, 30, 'b', 'n', 2);

  // near ground
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(near(x));
    for (let y = y0; y < H; y++) {
      p.set(x, y, y <= y0 + 1 ? 'h' : 'G');
    }
  }
  // oaks on the hills
  oak(p, 190, Math.round(mid(190)) + 4, 1.1);
  oak(p, 452, Math.round(mid(452)) + 2, 0.9);
  oak(p, 22, Math.round(near(22)) + 2, 1.4);
  oak(p, 628, Math.round(near(628)) + 4, 1.2);

  // --- barn (left) ---
  for (let x = 36; x < 170; x++) { p.set(x, 262, 'F'); if (x > 40 && x < 164) p.set(x, 263, 'F'); }
  barn(p, 46, 262);
  for (let x = 536; x < 580; x++) p.set(x, 258, 'F');
  // --- windmill (right) ---
  windmill(p, 556, 258);

  // dirt path from the barn doors down to the bottom-left
  for (let y = 264; y < H; y++) {
    const t = (y - 264) / (H - 264);
    const cx = 96 + t * t * 90;
    const hw = 6 + t * 16;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const e = Math.abs(x - cx) > hw - 1.2;
      p.set(x, y, e ? 'b' : (bay(x, y) < 0.1 ? 't' : 'B'));
    }
  }

  // fences on both sides
  fence(p, 0, 36, 276);
  fence(p, 150, 208, 280);
  fence(p, 456, 640, 278);

  // wheat field bottom-left corner: dense rows of stalks, back to front
  {
    const topAt = (x: number) => Math.round(300 + (x > 84 ? (x - 84) * 1.1 : 0) + 2 * Math.sin(x * 0.21));
    for (let x = 0; x < 160; x++) for (let y = topAt(x) + 4; y < H; y++) if (y >= topAt(x)) p.set(x, y, (x + y) % 5 === 0 ? 'b' : 'y');
    const Rw = rng(77);
    for (let y = 296; y < H + 6; y += 4) {
      for (let x = -2; x < 160; x += 3) {
        const jx = x + Math.floor(Rw() * 2), jy = y + Math.floor(Rw() * 2);
        if (jy < topAt(jx) + 2) continue;
        // stalk
        p.vline(jx, jy, jy + 5, 'y');
        // head
        p.set(jx, jy - 3, 'z'); p.set(jx, jy - 2, 'Y'); p.set(jx + 1, jy - 2, 'Y'); p.set(jx, jy - 1, 'Y'); p.set(jx + 1, jy - 1, 't'); p.set(jx, jy, 't');
        p.set(jx - 1, jy - 2, 'b');
      }
    }
  }
  // vegetable beds bottom-right corner (tilled soil with cabbages)
  for (let r = 0; r < 4; r++) {
    const y = 302 + r * 14;
    const xs = 468 + (3 - r) * -4 + r * 2;
    for (let x = xs; x < W; x++) {
      for (let yy = y + 2; yy <= y + 10; yy++) p.set(x, yy, yy === y + 2 ? 'B' : yy >= y + 9 ? 'n' : (x + yy) % 7 === 0 ? 'n' : 'b');
    }
    p.vline(xs, y + 2, y + 10, 'n');
    for (let x = xs + 3; x < W - 2; x += 13) {
      const m = mk(11, 8, (t) => { t.ellipse(5.5, 4.5, 5, 3.5, '9'); t.ellipse(5.5, 3, 3, 2.5, '9'); });
      stamp(p, m, x, y, 'G', 'h', 'F', 'f', 1);
      p.set(x + 5, y + 3, 'H'); p.set(x + 4, y + 2, 'H'); p.set(x + 6, y + 4, 'F'); p.set(x + 5, y + 5, 'F');
    }
  }
  // flowers & tufts across the near ground (sparser in the centre)
  const R = rng(1234);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(R() * W), y = Math.floor(270 + R() * 90);
    if (!p.get(x, y) || p.get(x, y) !== p.get(300, 300)) continue;
    const centre = x > 200 && x < 440 && y < 330;
    if (x > 455 && y > 296) continue;
    if (x < 170 && y > 290) continue;
    if (centre && R() < 0.75) continue;
    const k = R();
    if (k < 0.55) { p.set(x, y, 'F'); p.set(x - 1, y - 1, 'F'); p.set(x + 1, y - 1, 'F'); }
    else {
      const fc = k < 0.7 ? '9' : k < 0.82 ? 'Y' : k < 0.92 ? 'Z' : 'Q';
      p.set(x, y, fc); p.set(x - 1, y, fc); p.set(x + 1, y, fc); p.set(x, y - 1, fc); p.set(x, y + 1, fc);
      p.set(x, y, 'Y');
      if (fc === 'Y') p.set(x, y, 'O');
    }
  }
}

function barn(p: PixelCanvas, x0: number, by: number) {
  const w = 92, wallTop = by - 44;
  const cx = x0 + w / 2;
  // silo behind right side
  const sx = x0 + w + 6;
  p.rect(sx, by - 64, 18, 64, '8');
  for (let y = by - 64; y < by; y++) { p.set(sx, y, '0'); p.set(sx + 17, y, '0'); p.set(sx + 1, y, '9'); p.set(sx + 15, y, '7'); p.set(sx + 16, y, '7'); if ((y - by) % 10 === 0) p.hline(sx + 1, sx + 16, y, '7'); }
  const dome = mk(20, 10, (t) => t.ellipse(10, 9, 9, 8, '9'));
  stamp(p, dome, sx - 1, by - 73, 'R', 'e', 'r', '0', 1);
  // walls
  p.rect(x0, wallTop, w, 44, 'Q');
  for (let x = x0; x < x0 + w; x += 4) p.vline(x, wallTop, by - 1, 'R');
  p.vline(x0 + w - 1, wallTop, by - 1, 'q');
  p.vline(x0 + w - 2, wallTop, by - 1, 'q');
  p.vline(x0 + 1, wallTop, by - 1, 'e');
  p.strokeRect(x0 - 1, wallTop, w + 2, 45, '0');
  // gambrel roof
  const roof: [number, number][] = [[x0 - 6, wallTop + 3], [x0 + 8, wallTop - 22], [cx, wallTop - 34], [x0 + w - 8, wallTop - 22], [x0 + w + 6, wallTop + 3]];
  const rm = new PixelCanvas(w + 16, 44);
  rm.poly(roof.map(([x, y]) => [x - x0 + 8, y - (wallTop - 36)] as [number, number]), '9');
  stamp(p, rm, x0 - 8, wallTop - 36, '2', '6', '1', '0', 1);
  // shingle rows
  for (let y = wallTop - 30; y < wallTop + 2; y += 5) for (let x = x0 - 6; x < x0 + w + 6; x++) {
    const lx = x - x0 + 8, ly = y - (wallTop - 36);
    if (rm.opaque(lx, ly) && rm.opaque(lx, ly - 1) && rm.opaque(lx, ly + 1) && rm.opaque(lx - 1, ly) && rm.opaque(lx + 1, ly)) p.set(x, y, '1');
  }
  // white gable trim
  for (let i = 0; i < roof.length - 1; i++) p.line(roof[i][0], roof[i][1] + 2, roof[i + 1][0], roof[i + 1][1] + 2, '9');
  // hayloft door
  const hx = Math.round(cx) - 9, hy = wallTop - 18;
  p.rect(hx, hy, 18, 14, 'r');
  p.strokeRect(hx, hy, 18, 14, '9');
  p.rect(hx + 3, hy + 6, 12, 7, 't');
  p.hline(hx + 3, hx + 14, hy + 6, 'Y');
  for (let x = hx + 4; x < hx + 14; x += 3) p.set(x, hy + 5, 'y');
  p.strokeRect(hx - 1, hy - 1, 20, 16, '0');
  // main doors with white X
  const dx = Math.round(cx) - 18, dy = by - 30;
  p.rect(dx, dy, 36, 30, 'R');
  p.strokeRect(dx, dy, 36, 30, '9');
  p.vline(dx + 18, dy, by - 1, '9');
  p.line(dx, dy, dx + 18, by - 1, '9'); p.line(dx + 18, dy, dx, by - 1, '9');
  p.line(dx + 18, dy, dx + 35, by - 1, '9'); p.line(dx + 35, dy, dx + 18, by - 1, '9');
  p.strokeRect(dx - 1, dy - 1, 38, 31, '0');
  // windows
  for (const wx of [x0 + 6, x0 + w - 18]) {
    p.rect(wx, wallTop + 12, 12, 10, 'a');
    p.rect(wx + 1, wallTop + 13, 5, 4, '9');
    p.strokeRect(wx, wallTop + 12, 12, 10, '9');
    p.vline(wx + 6, wallTop + 12, wallTop + 21, '9');
    p.hline(wx, wx + 11, wallTop + 17, '9');
    p.strokeRect(wx - 1, wallTop + 11, 14, 12, '0');
  }
  // hay bales by the door
  for (const [bx, bw] of [[x0 - 14, 14], [x0 - 6, 10]] as [number, number][]) {
    const m = mk(bw, 9, (t) => t.rect(0, 0, bw, 9, '9'));
    stamp(p, m, bx, by - 9, 't', 'z', 'y', 'n', 1);
    p.hline(bx + 1, bx + bw - 2, by - 5, 'y');
  }
}

function windmill(p: PixelCanvas, cx: number, by: number) {
  const top = by - 92;
  // tower (trapezoid)
  const tw = mk(44, 94, (t) => t.poly([[4, 93], [40, 93], [32, 2], [12, 2]], '9'));
  stamp(p, tw, cx - 22, top, '&', '9', '%', '0', 3);
  for (let y = top + 10; y < by; y += 12) for (let x = cx - 22; x < cx + 22; x++) if (tw.opaque(x - cx + 22, y - top) && tw.opaque(x - cx + 21, y - top) && tw.opaque(x - cx + 23, y - top)) p.set(x, y, '%');
  // door & window
  const d = mk(12, 16, (t) => { t.rect(0, 4, 12, 12, '9'); t.ellipse(6, 5, 6, 5, '9'); });
  stamp(p, d, cx - 6, by - 16, 'n', 'b', 'm', '0', 1);
  const wn = mk(8, 9, (t) => { t.rect(0, 3, 8, 6, '9'); t.ellipse(4, 3.5, 4, 3.5, '9'); });
  stamp(p, wn, cx - 4, top + 34, 'W', 'a', 'w', '0', 1);
  // cap
  const cap = mk(38, 18, (t) => { t.ellipse(19, 17, 18, 15, '9'); });
  stamp(p, cap, cx - 19, top - 14, 'b', 'B', 'n', '0', 2);
  // blades (4, rotated)
  const hubX = cx, hubY = top - 2;
  const ang0 = 0.35;
  for (let k = 0; k < 4; k++) {
    const a = ang0 + (k * Math.PI) / 2;
    const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
    // sail: quad beside the arm
    const q: [number, number][] = [
      [hubX + ux * 10 + vx * 1, hubY + uy * 10 + vy * 1],
      [hubX + ux * 50 + vx * 1, hubY + uy * 50 + vy * 1],
      [hubX + ux * 50 + vx * 11, hubY + uy * 50 + vy * 11],
      [hubX + ux * 10 + vx * 9, hubY + uy * 10 + vy * 9],
    ];
    const minx = Math.floor(Math.min(...q.map((v) => v[0]))) - 2, miny = Math.floor(Math.min(...q.map((v) => v[1]))) - 2;
    const sm = mk(64, 64, (t) => t.poly(q.map(([x, y]) => [x - minx, y - miny] as [number, number]), '9'));
    stamp(p, sm, minx, miny, '9', null, '8', 'n', 1);
    // lattice
    for (let s = 14; s <= 50; s += 6) p.line(Math.round(hubX + ux * s + vx), Math.round(hubY + uy * s + vy), Math.round(hubX + ux * s + vx * 10), Math.round(hubY + uy * s + vy * 10), 'B');
    // arm
    p.line(Math.round(hubX), Math.round(hubY), Math.round(hubX + ux * 52), Math.round(hubY + uy * 52), 'n');
    p.line(Math.round(hubX + vx * 0.8), Math.round(hubY + vy * 0.8), Math.round(hubX + ux * 52 + vx * 0.8), Math.round(hubY + uy * 52 + vy * 0.8), 'b');
  }
  const hub = mk(8, 8, (t) => t.circle(4, 4, 3.2, '9'));
  stamp(p, hub, hubX - 4, hubY - 4, 'y', 'Y', 'n', '0', 1);
}

function fence(p: PixelCanvas, x0: number, x1: number, by: number) {
  // rails
  for (const ry of [by - 12, by - 6]) {
    p.hline(x0, x1, ry - 1, '0');
    p.hline(x0, x1, ry, 'B');
    p.hline(x0, x1, ry + 1, 'b');
    p.hline(x0, x1, ry + 2, '0');
  }
  for (let x = x0 + 3; x < x1; x += 18) {
    const m = mk(5, 17, (t) => { t.rect(0, 2, 5, 15, '9'); t.rect(1, 1, 3, 1, '9'); t.set(2, 0, '9'); });
    stamp(p, m, x, by - 17, 'B', 't', 'b', '0', 1);
  }
}

export const titleBackground: DrawSprite = { w: 640, h: 360, ox: 0, oy: 0, draw: (p) => drawTitle(p) };

// ---------------------------------------------------------------------------------------------
// logo
// ---------------------------------------------------------------------------------------------

function glyphMask(text: string, scale: number, spacing: number, arch: number) {
  const g = FONTS.big.glyphs;
  const letters = [...text].map((ch) => g[ch]);
  const widths = letters.map((rows) => Math.max(...rows.map((r) => r.length)));
  const total = widths.reduce((a, b) => a + b * scale, 0) + spacing * (letters.length - 1);
  const h = 10 * scale + arch + 2;
  const m = new PixelCanvas(total, h);
  let x = 0;
  letters.forEach((rows, i) => {
    const n = letters.length;
    const off = Math.round(arch * (1 - Math.sin((Math.PI * (i + 0.5)) / n)));
    for (let j = 0; j < 10; j++) {
      const row = rows[j] ?? '';
      for (let k = 0; k < row.length; k++) if (row[k] === '#') m.rect(x + k * scale, off + j * scale, scale, scale, '9');
    }
    x += widths[i] * scale + spacing;
  });
  // soften: remove pixels that are convex corners (2 orthogonal empty neighbours)
  const src = m.clone();
  for (let y = 0; y < m.h; y++) for (let x2 = 0; x2 < m.w; x2++) {
    if (!src.opaque(x2, y)) continue;
    const l = src.opaque(x2 - 1, y), r = src.opaque(x2 + 1, y), u = src.opaque(x2, y - 1), d = src.opaque(x2, y + 1);
    if ((!l && !u) || (!r && !u) || (!l && !d) || (!r && !d)) m.set(x2, y, null);
  }
  return m;
}

function drawLogo(p: PixelCanvas, frame: number) {
  const W = 300;
  const l1 = glyphMask('HARVEST', 3, 3, 5);
  const l2 = glyphMask('FRENZY', 3, 3, 0);
  const x1 = Math.round((W - l1.w) / 2), y1 = 3;
  const x2 = Math.round((W - l2.w) / 2), y2 = 44;
  // union fill masks in logo space
  const fill = new PixelCanvas(W, 80);
  const which = new PixelCanvas(W, 80);
  fill.blit(l1, x1, y1); which.blit(l1, x1, y1);
  fill.blit(l2, x2, y2);
  const EX = 4;
  const inF = (x: number, y: number) => fill.opaque(x, y);
  const inE = (x: number, y: number) => { for (let k = 0; k <= EX; k++) if (inF(x, y - k)) return true; return false; };
  // dilation distance to the extruded shape (up to 3)
  const dist = (x: number, y: number) => {
    if (inE(x, y)) return 0;
    for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > r + (r > 1 ? 1 : 0)) continue;
      if (inE(x + dx, y + dy)) return r;
    }
    return 99;
  };
  for (let y = 0; y < 80; y++) for (let x = 0; x < W; x++) {
    const d = dist(x, y);
    if (d === 99) continue;
    if (d >= 1) { p.set(x, y, d === 3 ? '9' : '0'); continue; }
    const top = which.opaque(x, y) || (!inF(x, y) && (() => { for (let k = 1; k <= EX; k++) if (inF(x, y - k)) return which.opaque(x, y - k); return false; })());
    if (!inF(x, y)) { // extrusion side
      let k = 1; while (k <= EX && !inF(x, y - k)) k++;
      p.set(x, y, top ? (k === 1 ? 'b' : 'n') : (k === 1 ? 'R' : 'r'));
      continue;
    }
    // letter face: vertical gradient per line
    const ly = top ? y - y1 : y - y2;
    const lh = top ? l1.h - 5 : l2.h;
    const t = Math.min(1, Math.max(0, ly / lh));
    let c: Col;
    if (top) c = t < 0.3 ? 'z' : t < 0.42 ? (bay(x, y) < (t - 0.3) / 0.12 ? 'Y' : 'z') : t < 0.72 ? 'Y' : (bay(x, y) < (t - 0.72) / 0.2 ? 'y' : 'Y');
    else c = t < 0.3 ? 'o' : t < 0.45 ? (bay(x, y) < (t - 0.3) / 0.15 ? 'O' : 'o') : t < 0.7 ? 'O' : (bay(x, y) < (t - 0.7) / 0.2 ? 'e' : 'O');
    // top-edge highlight
    if (!inF(x, y - 1) || !inF(x, y - 2)) c = top ? '9' : '%';
    if (!inF(x - 1, y) && inF(x, y - 3)) c = top ? 'z' : 'o';
    p.set(x, y, c);
  }
  // shine sweep on frame 1
  if (frame === 1) {
    for (let y = 0; y < 80; y++) for (let x = 0; x < W; x++) {
      if (!inF(x, y)) continue;
      const k = x + y * 0.6;
      if (k > 120 && k < 128) p.set(x, y, '9');
      else if (k > 130 && k < 133) p.set(x, y, '9');
    }
  }
  // wheat sprigs flanking FRENZY
  wheat(p, x2 - 36, 42, false);
  wheat(p, x2 + l2.w + 8, 42, true);
  // sparkles
  const spark = (x: number, y: number) => { p.set(x, y, '9'); p.set(x - 1, y, 'z'); p.set(x + 1, y, 'z'); p.set(x, y - 1, 'z'); p.set(x, y + 1, 'z'); };
  if (frame === 1) { spark(x1 + l1.w + 6, 6); spark(x1 - 6, 30); }
  else { spark(x1 + l1.w + 4, 10); }
}

/** Wheat sheaf ornament (28x34), tied with a red ribbon. */
function wheat(p: PixelCanvas, x: number, y: number, flip: boolean) {
  const W = 28, H = 34;
  const s = new PixelCanvas(W, H);
  const tie: [number, number] = [14, 22];
  const heads: [number, number][] = [[5, 9], [9, 4], [14.5, 2], [20, 4], [24, 9]];
  // stems (behind heads), splaying below the tie
  for (const [hx, hy] of heads) {
    const bx = tie[0] + (tie[0] - hx) * 0.45, by = Math.min(H - 2, tie[1] + (tie[1] - hy) * 0.45);
    s.line(Math.round(hx), Math.round(hy + 3), tie[0], tie[1], 'y');
    s.line(tie[0], tie[1], Math.round(bx), Math.round(by), 'y');
  }
  // grain heads: little alternating grains along the stem direction
  for (const [hx, hy] of heads) {
    const dx = tie[0] - hx, dy = tie[1] - hy, L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    for (let k = 0; k < 8; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      const gx = hx + ux * k + -uy * side * 1.1, gy = hy + uy * k + ux * side * 1.1;
      s.ellipse(gx, gy, 1.3, 1.3, 'Y');
    }
    s.set(Math.round(hx - ux * 2), Math.round(hy - uy * 2), 'Y');
  }
  // light on the grains (top-left pixels)
  const base = s.clone();
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    if (!base.opaque(xx, yy)) continue;
    if (!base.opaque(xx - 1, yy - 1) && !base.opaque(xx, yy - 1)) s.set(xx, yy, 'z');
    else if (!base.opaque(xx + 1, yy + 1)) s.set(xx, yy, base.get(xx, yy) === pv('Y') ? 'y' : 'b');
  }
  // ribbon
  s.rect(10, 21, 9, 3, 'Q');
  s.hline(10, 18, 21, 'e');
  s.set(9, 25, 'Q'); s.set(10, 24, 'Q'); s.set(18, 24, 'Q'); s.set(19, 25, 'Q');
  s.set(14, 22, 'q');
  const o = flip ? s.flipX() : s;
  o.outline('0');
  p.blit(o, x, y);
}

export const logo: DrawSprite = { w: 300, h: 80, ox: 0, oy: 0, frames: 2, fps: 2, draw: (p, f) => drawLogo(p, f) };

// ---------------------------------------------------------------------------------------------
// world map
// ---------------------------------------------------------------------------------------------

const PATH_CTRL: [number, number][] = [
  [30, 332], [60, 318], [92, 300], [78, 262], [100, 232], [150, 218], [196, 238], [214, 280], [260, 306], [312, 296],
  [338, 256], [312, 214], [270, 186], [276, 146], [326, 128], [380, 150], [412, 196], [462, 206], [494, 168],
  [468, 126], [432, 92], [456, 56], [510, 46], [548, 78], [578, 112], [610, 92], [612, 44],
];

/** Catmull-Rom sampled path, dense (≈1px steps). */
function buildPath(): [number, number][] {
  const out: [number, number][] = [];
  const P = PATH_CTRL;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
const PATH = buildPath();
const PATH_S: number[] = (() => {
  const s = [0];
  for (let i = 1; i < PATH.length; i++) s.push(s[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
  return s;
})();
function pathAt(s: number): [number, number] {
  let i = 0;
  while (i < PATH_S.length - 1 && PATH_S[i + 1] < s) i++;
  const a = PATH[i], b = PATH[Math.min(i + 1, PATH.length - 1)];
  const seg = PATH_S[Math.min(i + 1, PATH.length - 1)] - PATH_S[i] || 1;
  const t = (s - PATH_S[i]) / seg;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** 30 level nodes evenly spaced along the path (levels 1..30). */
export const MAP_NODES: { x: number; y: number }[] = (() => {
  const L = PATH_S[PATH_S.length - 1];
  const s0 = 10, s1 = L - 10;
  return Array.from({ length: 30 }, (_, i) => {
    const [x, y] = pathAt(s0 + ((s1 - s0) * i) / 29);
    return { x: Math.round(x), y: Math.round(y) };
  });
})();

// region field: 0 meadow, 1 savanna, 2 arctic. Each region is the (noisy) Voronoi cell of its ten
// level nodes plus a few anchor points, so levels 1-10 / 11-20 / 21-30 always sit in their region.
const REGION_PTS: [number, number][][] = (() => {
  const g: [number, number][][] = [[], [], []];
  MAP_NODES.forEach((n, i) => g[Math.floor(i / 10)].push([n.x, n.y]));
  g[0].push([40, 60], [150, 40], [30, 170], [180, 120]);
  g[1].push([300, 20], [250, 90], [640, 360], [520, 330], [610, 290]);
  g[2].push([640, 0], [640, 200], [560, 180], [380, 10]);
  return g;
})();
const regionCache = new Map<number, [number, number]>();
/** [region, margin] — margin = distance advantage over the next region (px). */
function regionInfo(x: number, y: number): [number, number] {
  x = Math.round(x); y = Math.round(y);
  const key = y * 1024 + x;
  const hit = regionCache.get(key);
  if (hit) return hit;
  const wob = 7 * Math.sin(x * 0.061 + y * 0.023) + 5 * Math.sin(y * 0.097 - x * 0.041) + 3 * Math.sin(x * 0.19 + y * 0.13);
  const d = REGION_PTS.map((pts, gi) => {
    let m = Infinity;
    for (const [px, py] of pts) m = Math.min(m, (px - x) ** 2 + (py - y) ** 2);
    return Math.sqrt(m) + (gi === 1 ? wob : gi === 2 ? -wob * 0.8 : 0);
  });
  let best = 0;
  for (let i = 1; i < 3; i++) if (d[i] < d[best]) best = i;
  let second = Infinity;
  for (let i = 0; i < 3; i++) if (i !== best) second = Math.min(second, d[i]);
  const r: [number, number] = [best, second - d[best]];
  regionCache.set(key, r);
  return r;
}
const region = (x: number, y: number) => regionInfo(x, y)[0];

// river: from the arctic peaks down through the savanna to the bottom edge
const RIVER: [number, number][] = [[372, 0], [366, 30], [388, 62], [372, 96], [356, 130], [372, 170], [400, 214], [392, 260], [410, 300], [400, 360]];

function drawMap(p: PixelCanvas) {
  const W = 640, H = 360;
  const GROUND = ['h', 't', '9'];
  // ground with dithered borders
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, m] = regionInfo(x, y);
    let c = GROUND[r];
    if (m < 10) {
      // find neighbour region by probing, blend by margin
      const other = [0, 1, 2].filter((k) => k !== r).map((k) => k).sort((a, b) => Math.abs(a - r) - Math.abs(b - r))[0];
      if ((10 - m) / 20 > bay(x, y)) c = GROUND[other];
    }
    p.set(x, y, c);
  }
  const R = rng(99);
  // soft texture patches
  for (let i = 0; i < 170; i++) {
    const x = Math.floor(R() * W), y = Math.floor(R() * H);
    const [rg, mg] = regionInfo(x, y);
    if (mg < 14) continue;
    const r = 4 + R() * 8;
    const c = rg === 0 ? 'G' : rg === 1 ? 'H' : '8';
    const base = pv(GROUND[rg]);
    for (let yy = -r; yy <= r; yy++) for (let xx = -r * 1.8; xx <= r * 1.8; xx++) {
      const X = Math.round(x + xx), Y = Math.round(y + yy);
      const q = (xx / (r * 1.8)) ** 2 + (yy / r) ** 2;
      if (q > 1 || p.get(X, Y) !== base) continue;
      if ((1 - q) * 1.4 > bay(X, Y) + 0.2) p.set(X, Y, c);
    }
  }
  // tufts / dry grass / snow sparkles
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(R() * W), y = Math.floor(R() * H);
    const rg = region(x, y);
    if (rg === 0) { p.set(x, y, 'F'); p.set(x - 1, y - 1, 'F'); p.set(x + 1, y - 1, 'F'); }
    else if (rg === 1) { p.set(x, y, 'l'); p.set(x + 1, y - 1, 'l'); p.set(x - 1, y - 1, 'l'); p.set(x, y - 1, 'D'); }
    else { p.set(x, y, '8'); p.set(x + 1, y, '8'); p.set(x, y - 1, 'a'); }
  }
  // meadow flowers
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(R() * W), y = Math.floor(R() * H);
    if (region(x, y) !== 0 || regionInfo(x, y)[1] < 8) continue;
    const fc = ['9', 'Y', 'Z', 'Q', 'N'][Math.floor(R() * 5)];
    p.set(x, y, fc); p.set(x - 1, y, fc); p.set(x + 1, y, fc); p.set(x, y - 1, fc); p.set(x, y + 1, fc); p.set(x, y, fc === 'Y' ? 'O' : 'Y');
  }

  // --- arctic: mountains, ice lake, igloo ---
  const mountains: [number, number, number][] = [[396, 34, 30], [470, 28, 36], [534, 24, 44], [606, 36, 40], [640, 90, 44], [612, 160, 30], [540, 132, 26], [350, 20, 24]];
  for (const [mx, mby, mh] of mountains) if (region(mx, mby) === 2) mountain(p, mx, mby + mh * 0.2, mh);
  {
    const lake = mk(64, 24, (t) => { t.ellipse(32, 12, 30, 10, '9'); t.ellipse(18, 15, 14, 7, '9'); });
    stamp(p, lake, 548, 176, 'a', '9', 'W', '7', 2);
    p.line(560, 184, 574, 190, '9'); p.line(574, 190, 582, 186, '9'); p.line(592, 181, 602, 191, '9');
  }
  {
    const ix = 590, iy = 250;
    const ig = mk(22, 13, (t) => t.ellipse(11, 12, 10.5, 11, '9'));
    stamp(p, ig, ix, iy, '9', null, '8', '7', 2);
    p.hline(ix + 2, ix + 20, iy + 6, '8'); p.hline(ix + 5, ix + 17, iy + 2, '8');
    for (let x = ix + 4; x < ix + 20; x += 5) p.set(x, iy + 9, '8');
    p.rect(ix + 8, iy + 7, 6, 5, '1'); p.hline(ix + 8, ix + 13, iy + 6, '7');
  }
  // --- river ---
  drawRiver(p);
  // --- meadow: pond, farm, fields ---
  {
    const pond = mk(46, 24, (t) => { t.ellipse(23, 12, 21, 10, '9'); t.ellipse(12, 14, 11, 8, '9'); });
    stamp(p, pond, 150, 262, 'W', 'a', 'w', 'F', 2);
    p.hline(160, 170, 268, '9'); p.hline(176, 182, 272, 'a');
    p.set(186, 276, 'G'); p.set(187, 276, 'G'); p.set(186, 277, 'F');
  }
  const tilled = (x0: number, y0: number, w: number, h: number, crop: boolean) => {
    p.rect(x0 - 1, y0 - 1, w + 2, h + 2, 'F');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x0 + x, y0 + y, y % 3 === 0 ? 'n' : 'b');
    if (crop) for (let y = 1; y < h; y += 3) for (let x = 1; x < w; x += 3) { p.set(x0 + x, y0 + y, 'G'); p.set(x0 + x, y0 + y - 1, 'h'); }
  };
  tilled(14, 240, 30, 20, true);
  tilled(118, 300, 26, 15, false);
  tilled(40, 170, 34, 18, true);
  tilled(120, 150, 24, 14, false);
  farmhouse(p, 16, 300);
  // forest in the top-left + scattered oaks
  const oaks: [number, number, number][] = [
    [132, 196, 0.9], [18, 214, 1], [232, 236, 0.9], [110, 272, 0.7], [250, 352, 1.1], [44, 356, 0.9], [188, 336, 0.8], [290, 272, 0.7],
    [214, 204, 0.7], [20, 60, 1.1], [52, 46, 1], [86, 70, 1.2], [30, 112, 1], [66, 118, 0.9], [120, 60, 0.9], [150, 96, 1],
    [104, 112, 0.8], [190, 70, 0.9], [176, 150, 0.8], [210, 110, 0.7], [16, 150, 0.8], [96, 22, 0.8],
  ];
  for (const [x, y, s] of oaks) if (region(x, y) === 0 && regionInfo(x, y)[1] > 6 && !nearPath(x, y - 8, 16)) oak(p, x, y, s);
  // savanna decor
  const acs: [number, number, number][] = [[268, 110, 0.8], [300, 60, 0.7], [352, 324, 1], [456, 270, 0.9], [300, 236, 0.7], [240, 60, 0.7], [520, 250, 0.8],
    [334, 196, 0.6], [480, 336, 1.1], [560, 312, 0.9], [610, 300, 0.8], [420, 330, 0.8], [230, 156, 0.7], [610, 350, 0.7]];
  for (const [x, y, s] of acs) if (region(x, y) === 1 && regionInfo(x, y)[1] > 10 && !nearPath(x, y - 14, 26)) acacia(p, x, y, s);
  for (const [x, y] of [[282, 330], [534, 282], [360, 232], [250, 118], [574, 336], [330, 90], [440, 300]] as [number, number][]) {
    if (region(x, y) !== 1 || nearPath(x, y, 10)) continue;
    const m = mk(12, 8, (t) => { t.ellipse(6, 5, 5.5, 3.5, '9'); t.ellipse(4, 4, 3, 3, '9'); });
    stamp(p, m, x - 6, y - 6, '4', 'x', '3', '0', 1);
  }
  {
    const wh = mk(40, 18, (t) => t.ellipse(20, 9, 18, 7.5, '9'));
    stamp(p, wh, 500, 316, 'I', 'j', 'i', 'b', 1);
    p.hline(510, 520, 320, 'J');
  }
  // arctic pines
  const pines: [number, number, number][] = [[430, 70, 0.8], [412, 110, 0.7], [520, 104, 0.9], [566, 110, 0.8], [596, 214, 0.9], [626, 236, 0.8], [380, 60, 0.7],
    [504, 150, 0.6], [462, 150, 0.7], [548, 230, 0.7], [626, 140, 0.7], [620, 280, 0.7], [566, 262, 0.6], [420, 36, 0.6]];
  for (const [x, y, s] of pines) if (region(x, y) === 2 && regionInfo(x, y)[1] > 8 && !nearPath(x, y - 10, 14)) pine(p, x, y, s);

  // --- the dirt path ---
  drawPath(p);
}

function dots(p: PixelCanvas, c: Col, pts: [number, number][]) { for (const [x, y] of pts) p.set(x, y, c); }

function nearPath(x: number, y: number, r: number) {
  for (let i = 0; i < PATH.length; i += 3) if (Math.abs(PATH[i][0] - x) < r && Math.abs(PATH[i][1] - y) < r && Math.hypot(PATH[i][0] - x, PATH[i][1] - y) < r) return true;
  return false;
}

const pvCache = new Map<string, number>();
function pv(c: Col) {
  let v = pvCache.get(c);
  if (v === undefined) { const t = new PixelCanvas(1, 1); t.set(0, 0, c); v = t.get(0, 0); pvCache.set(c, v); }
  return v;
}

function mountain(p: PixelCanvas, cx: number, by: number, h: number) {
  const w = Math.round(h * 1.5);
  const m = mk(w + 2, h + 2, (t) => t.poly([[w / 2 + 1, 0], [w + 1, h + 1], [1, h + 1]], '9'));
  const ox = Math.round(cx - w / 2 - 1), oy = Math.round(by - h - 1);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!m.opaque(x, y)) continue;
    const X = ox + x, Y = oy + y;
    const lit = x < w / 2 + 1 - (y * 0.15);
    let c: Col = lit ? '7' : '6';
    if (y < h * 0.38 + 2 * Math.sin(x * 0.7)) c = lit ? '9' : 'a';
    p.set(X, Y, c);
  }
  // outline
  for (let y = -1; y <= m.h; y++) for (let x = -1; x <= m.w; x++) {
    if (m.opaque(x, y)) continue;
    if (m.opaque(x - 1, y) || m.opaque(x + 1, y) || m.opaque(x, y - 1)) p.set(ox + x, oy + y, '2');
  }
  // ridge line
  for (let y = 2; y < h; y++) p.set(Math.round(ox + w / 2 + 1 - y * 0.15), oy + y, y < h * 0.38 ? '8' : '2');
}

function farmhouse(p: PixelCanvas, x: number, by: number) {
  const m = mk(22, 14, (t) => t.rect(0, 0, 22, 14, '9'));
  stamp(p, m, x, by - 14, 'Q', 'e', 'R', '0', 1);
  p.rect(x + 8, by - 9, 6, 9, '9'); p.rect(x + 9, by - 8, 4, 8, 'n');
  const roof = mk(28, 12, (t) => t.poly([[14, 0], [28, 12], [0, 12]], '9'));
  stamp(p, roof, x - 3, by - 25, '2', '6', '1', '0', 1);
  p.line(x - 3, by - 13, x + 11, by - 25, '9'); p.line(x + 11, by - 25, x + 25, by - 13, '9');
}

function drawRiver(p: PixelCanvas) {
  // sample Catmull-Rom through river points
  const pts: [number, number][] = [];
  const P = RIVER;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2_ = t * t, t3 = t2_ * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2_ + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const m = new PixelCanvas(640, 360);
  pts.forEach(([x, y], i) => { const r = 3.2 + (i / pts.length) * 3; m.circle(x, y, r, '9'); });
  for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) {
    if (!m.opaque(x, y)) {
      if (m.opaque(x - 1, y) || m.opaque(x + 1, y) || m.opaque(x, y - 1) || m.opaque(x, y + 1)) {
        const rg = region(x, y);
        p.set(x, y, rg === 2 ? '7' : rg === 0 ? 'F' : 'b');
      }
      continue;
    }
    const frozen = region(x, y) === 2;
    let c: Col = frozen ? 'a' : 'W';
    if (!m.opaque(x - 1, y) || !m.opaque(x, y - 1)) c = frozen ? '9' : 'a';
    else if (!m.opaque(x + 1, y) || !m.opaque(x, y + 1)) c = frozen ? '8' : 'w';
    else if (!frozen && (x * 3 + y * 7) % 23 === 0) { c = 'a'; p.set(x + 1, y, 'a'); }
    p.set(x, y, c);
  }
}

function drawPath(p: PixelCanvas) {
  const W = 640, H = 360;
  const m = new PixelCanvas(W, H);
  for (const [x, y] of PATH) m.circle(x, y, 3.6, '9');
  // shadow first (down-right), then outline, fill
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (m.opaque(x, y)) continue;
    const near = m.opaque(x - 1, y) || m.opaque(x + 1, y) || m.opaque(x, y - 1) || m.opaque(x, y + 1);
    if (near) p.set(x, y, 'n');
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m.opaque(x, y)) continue;
    let c: Col = 'B';
    if (!m.opaque(x + 1, y + 1) || !m.opaque(x, y + 1)) c = 'b';
    else if (!m.opaque(x - 1, y - 1) || !m.opaque(x, y - 1)) c = 't';
    else if (bay(x * 3, y * 5) < 0.08) c = 'b';
    p.set(x, y, c);
  }
  // bridges where the path crosses the river
  for (let i = 0; i < PATH.length; i += 1) {
    const [x, y] = PATH[i];
    const nearRiver = RIVER_HIT(x, y);
    if (!nearRiver) continue;
    const [nx, ny] = PATH[Math.min(PATH.length - 1, i + 2)];
    const dx = nx - x, dy = ny - y, L = Math.hypot(dx, dy) || 1;
    const vx = -dy / L, vy = dx / L;
    for (let k = -5; k <= 5; k++) {
      const X = Math.round(x + vx * k), Y = Math.round(y + vy * k);
      p.set(X, Y, Math.abs(k) >= 5 ? '0' : Math.abs(k) === 4 ? 'n' : (i % 3 === 0 ? 'b' : 'B'));
    }
  }
}

const riverMask = (() => {
  // coarse river membership (same geometry as drawRiver), used for bridges
  const pts: [number, number, number][] = [];
  const P = RIVER;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), 3.2 + ((i * 40 + k) / ((P.length - 1) * 40)) * 3]);
    }
  }
  return pts;
})();
function RIVER_HIT(x: number, y: number) {
  for (const [rx, ry, r] of riverMask) if (Math.hypot(rx - x, ry - y) < r + 2.5) return true;
  return false;
}

export const mapBackground: DrawSprite = { w: 640, h: 360, ox: 0, oy: 0, draw: (p) => drawMap(p) };

// ---------------------------------------------------------------------------------------------
// map node 20x20: [locked, open, completed]
// ---------------------------------------------------------------------------------------------

export const mapNode: DrawSprite = {
  w: 20, h: 20, frames: 3, ox: 10, oy: 10,
  draw: (p, f) => {
    const ramp = f === 0 ? { hi: '8', base: '7', sh: '6', dk: '2' } : f === 1 ? { hi: 'z', base: 'Y', sh: 'y', dk: 'n' } : { hi: 'h', base: 'G', sh: 'F', dk: 'f' };
    const R = 8.7;
    const lip = mk(20, 20, (t) => t.circle(10, 10.8, R, '9'));
    const face = mk(20, 20, (t) => t.circle(10, 9.2, R, '9'));
    const uni = mk(20, 20, (t) => { t.blit(lip, 0, 0); t.blit(face, 0, 0); });
    stamp(p, uni, 0, 0, ramp.dk, null, null, '0', 0);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      if (!face.opaque(x, y)) continue;
      let c = ramp.base;
      if ((!face.opaque(x - 1, y) || !face.opaque(x, y - 1)) && x + y < 21) c = ramp.hi;
      else if (!face.opaque(x + 1, y) || !face.opaque(x, y + 1)) c = ramp.sh;
      p.set(x, y, c);
    }
    // inner ring
    const ring = mk(20, 20, (t) => t.ring(10, 9.2, 6.4, 6.4, '9'));
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (ring.opaque(x, y)) p.set(x, y, x + y < 19 ? ramp.sh : ramp.hi);
    if (f === 0) {
      // padlock
      dots(p, '0', [[8, 8], [8, 7], [8, 6], [9, 5], [10, 5], [11, 5], [12, 6], [12, 7], [12, 8]]);
      dots(p, '8', [[9, 6], [10, 6], [11, 6]]);
      p.rect(6, 9, 9, 6, '0');
      p.rect(7, 10, 7, 4, 'Y');
      p.hline(7, 13, 10, 'z');
      p.hline(7, 13, 13, 'y');
      p.set(10, 11, '0'); p.set(10, 12, '0');
    } else if (f === 2) {
      // little star badge at the top-right
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 === 0 ? 4.4 : 2;
        pts.push([15 + Math.cos(a) * rr, 4.6 + Math.sin(a) * rr]);
      }
      const st = mk(20, 20, (t) => t.poly(pts, '9'));
      stamp(p, st, 0, 0, 'Y', 'z', 'y', '0', 0);
    } else {
      // open: small white gleam
      p.set(5, 5, '9'); p.set(6, 4, '9');
    }
  },
};
