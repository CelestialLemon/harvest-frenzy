// Farm structures: well, warehouse tiers, helipad, build site, cage. Anchor top-left except cage.
import { PixelCanvas, type DrawSprite } from '../../pixel';
import { part, planksH, planksV, stones, win, door, foundation, hipRoof, bandRoof, edgeShade, cylShade, wheel, shingles, type Shades } from './common';

const STONE: Shades = { d: '2', m: '6', l: '7', h: '8', o: '5' };
const WOOD: Shades = { d: 'n', m: 'b', l: 'B', h: 't' };
const DWOOD: Shades = { d: 'm', m: 'n', l: 'b', h: 'B' };

// ---------------------------------------------------------------- Well (56x64, f0 idle, f1-f3 cranking)
function bucket(p: PixelCanvas, x: number, y: number, full: boolean) {
  part(p, (q) => {
    q.rect(x, y + 1, 8, 6, 'b');
    planksV(q, x, y + 1, 8, 6, WOOD, 2);
    q.hline(x, x + 7, y + 2, '6'); q.hline(x, x + 7, y + 5, '6');
    q.rect(x, y, 8, 1, 'n');
    if (full) { q.hline(x + 1, x + 6, y, 'W'); q.set(x + 2, y, 'a'); }
  });
}

export const well: DrawSprite = {
  w: 56, h: 64, frames: 4, fps: 8, ox: 0, oy: 0,
  draw(p, f) {
    // back rim + dark water opening
    part(p, (q) => { q.ellipse(28, 40, 21, 7, '6'); });
    part(p, (q) => {
      q.ellipse(28, 40, 17, 4.6, 'i');
      for (let y = 34; y < 46; y++) for (let x = 10; x < 46; x++) if (q.opaque(x, y) && y < 39) q.set(x, y, 'u');
      q.hline(20, 26, 41, 'I'); q.hline(31, 35, 42, 'I'); q.set(24, 42, 'j');
    }, null);
    // posts
    for (const px of [8, 45]) part(p, (q) => { q.rect(px, 13, 4, 36, 'b'); planksV(q, px, 13, 4, 36, WOOD, 4); q.vline(px, 13, 48, 'B'); });
    // rope + bucket (behind the front wall when low)
    const by = [36, 35, 31, 27][f];
    const bx = 24;
    p.vline(bx + 4, 25, by, 't');
    if (f === 0) {
      // rope disappears into the water
    } else bucket(p, bx, by, true);
    if (f === 3) { p.set(bx - 1, by + 4, 'W'); p.set(bx + 9, by + 6, 'a'); p.set(bx - 1, by + 8, 'a'); }
    if (f === 2) { p.set(bx + 9, by + 3, 'W'); p.set(bx - 1, by + 7, 'a'); }
    // front wall of the well (lower half of the cylinder)
    part(p, (q) => {
      q.rect(7, 40, 43, 18, '6');
      q.ellipse(28.5, 57, 21.5, 6, '6');
      stones(q, 7, 40, 43, 24, STONE, 4, 5);
      // cylinder shading
      for (let y = 38; y < 64; y++) for (let x = 7; x < 50; x++) {
        if (!q.opaque(x, y)) continue;
        if (x > 43 && (x + y) % 2 === 0) q.set(x, y, '2');
        if (x < 10 && q.get(x, y) !== q.get(0, 0)) { /* keep */ }
      }
      // rim cap (front half of top ring)
      for (let x = 7; x < 50; x++) {
        const dx = (x + 0.5 - 28.5) / 21.5;
        const yy = Math.round(40 + Math.sqrt(Math.max(0, 1 - dx * dx)) * 5);
        q.set(x, yy - 1, '8'); q.set(x, yy, '7'); q.set(x, yy + 1, '6');
      }
    });
    // back rim ring highlight
    part(p, (q) => {
      for (let x = 8; x < 49; x++) {
        const dx = (x + 0.5 - 28.5) / 20.5;
        const yy = Math.round(40 - Math.sqrt(Math.max(0, 1 - dx * dx)) * 6);
        q.set(x, yy, '8'); q.set(x, yy + 1, '7');
      }
    }, null);
    // axle with rope drum
    part(p, (q) => {
      q.rect(12, 22, 33, 3, 'n'); q.hline(12, 44, 22, 'b');
      q.rect(18, 20, 20, 7, 't');
      for (let x = 18; x < 38; x += 2) q.vline(x, 20, 26, 'B');
      q.hline(18, 37, 26, 'B');
      q.vline(18, 20, 26, 'n'); q.vline(37, 20, 26, 'n');
    });
    // crank handle (rotates)
    const ang = [0, Math.PI / 2, Math.PI, Math.PI * 1.5][f];
    const hx = 51 + Math.round(Math.cos(ang) * 0), hy = 23;
    const ex = hx + Math.round(Math.sin(ang) * 0), ey = hy + Math.round(-Math.cos(ang) * 6);
    part(p, (q) => {
      q.rect(48, 22, 3, 3, '2');
      const tx = 50 + Math.round(Math.sin(ang) * 3), ty = 23 - Math.round(Math.cos(ang) * 6);
      q.line(50, 23, tx, ty, '7'); q.line(51, 23, tx + 1, ty, '6');
      q.rect(tx, ty - 1, 3, 3, 'n'); q.set(tx, ty - 1, 'b');
      void ex; void ey;
    });
    // roof (small gable, wooden shingles)
    part(p, (q) => {
      q.poly([[1, 18], [28, 2], [56, 18], [56, 21], [0, 21]], 'b');
      q.poly([[1, 18], [28, 2], [28, 4], [2, 20]], 'n');
    }, null);
    bandRoof(p, 1, 54, (x) => (x < 28 ? 20 - (x - 1) * (16 / 27) : 4 + (x - 28) * (16 / 26)), 6, 28,
      { d: 'n', m: 'b', l: 'B', h: 't' }, { d: 'm', m: 'n', l: 'b', h: 'B' });
    // gable board under the roof
    part(p, (q) => {
      q.poly([[10, 19], [28, 8], [46, 19]], 'n');
      for (let y = 8; y < 20; y++) for (let x = 10; x < 47; x++) if (q.opaque(x, y) && x % 3 === 0) q.set(x, y, 'm');
    }, null);
  },
};

// ---------------------------------------------------------------- Warehouse (112x80, frames = tiers 1..4)
function barnDoors(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, trim = '9') {
  part(p, (q) => {
    q.rect(x, y, w, h, s.m);
    planksV(q, x, y, w, h, s, 3);
    const hw = Math.floor(w / 2);
    for (const ox of [x, x + hw]) {
      // X brace
      q.line(ox + 1, y + 1, ox + hw - 2, y + h - 2, trim); q.line(ox + hw - 2, y + 1, ox + 1, y + h - 2, trim);
      q.strokeRect(ox, y, hw, h, trim);
    }
    q.vline(x + hw, y, y + h - 1, s.d);
  });
}

const RED: Shades = { d: 'r', m: 'R', l: 'e', h: 'o' };
const ROOF_GRAY: Shades = { d: '2', m: '6', l: '7', h: '8' };
const ROOF_GRAYR: Shades = { d: '1', m: '2', l: '6', h: '7' };

function crate(p: PixelCanvas, x: number, y: number, w = 9, h = 8) {
  part(p, (q) => {
    q.rect(x, y, w, h, 'b');
    planksH(q, x, y, w, h, WOOD, 3);
    q.line(x, y, x + w - 1, y + h - 1, 'n');
  });
}
function sack(p: PixelCanvas, x: number, y: number) {
  part(p, (q) => {
    q.ellipse(x + 4, y + 5, 4, 4, 't');
    q.rect(x + 2, y, 5, 3, 't');
    q.hline(x + 2, x + 6, y + 2, 'B');
    for (let yy = y; yy < y + 10; yy++) for (let xx = x; xx < x + 9; xx++) if (q.opaque(xx, yy) && xx > x + 5 && yy > y + 3) q.set(xx, yy, 'B');
  });
}

function tier1(p: PixelCanvas) {
  // small wooden shed
  hipRoof(p, 26, 86, 38, 58, 6, ROOF_GRAY, { rh: 3, sw: 5 });
  part(p, (q) => { q.rect(30, 59, 53, 18, 'b'); planksV(q, 30, 59, 53, 18, WOOD, 4); q.hline(30, 82, 59, 'n'); q.hline(30, 82, 60, 'n'); });
  foundation(p, 28, 77, 57, 3);
  part(p, (q) => { q.rect(46, 62, 21, 15, 'n'); planksV(q, 46, 62, 21, 15, DWOOD, 3); q.vline(56, 62, 76, 'm'); q.hline(46, 66, 68, 'm'); q.set(54, 69, 'Y'); q.set(58, 69, 'Y'); });
  crate(p, 16, 68); crate(p, 88, 69, 8, 8);
  sack(p, 20, 60);
}

function tier2(p: PixelCanvas) {
  // bigger wooden storehouse with loft
  hipRoof(p, 14, 97, 26, 52, 8, { d: 'n', m: 'b', l: 'B', h: 't' }, { rh: 3, sw: 5 });
  part(p, (q) => { q.rect(18, 53, 76, 24, 'b'); planksH(q, 18, 53, 76, 24, { d: 'n', m: 'b', l: 'B' }, 4); q.hline(18, 93, 53, 'n'); q.hline(18, 93, 54, 'n'); });
  // corner posts
  for (const x of [18, 92]) part(p, (q) => { q.rect(x, 53, 2, 24, 'n'); q.vline(x, 53, 76, 'b'); });
  foundation(p, 16, 77, 80, 3);
  barnDoors(p, 44, 58, 24, 19, DWOOD, 'B');
  win(p, 25, 60, 10, 8, { frame: 'B', sill: 'B' });
  win(p, 77, 60, 10, 8, { frame: 'B', sill: 'B' });
  // loft hatch on roof
  part(p, (q) => { q.rect(50, 32, 12, 10, 'n'); q.rect(52, 34, 8, 8, '1'); q.hline(52, 59, 36, 't'); q.hline(52, 59, 37, 'y'); q.rect(52, 38, 8, 4, 't'); });
  hipRoof(p, 47, 64, 28, 33, 3, { d: 'n', m: 'b', l: 'B', h: 't' }, { rh: 2, sw: 3 });
  crate(p, 4, 69); crate(p, 6, 61, 8, 8); sack(p, 98, 67); crate(p, 100, 71, 8, 6);
}

function barnFacade(p: PixelCanvas, x0: number, x1: number, yEave: number, yKnee: number, yPeak: number, kneeIn: number, base: number, thick: number) {
  const cx = (x0 + x1) / 2;
  const yAt = (x: number) => {
    const d = Math.abs(x - cx), half = (x1 - x0) / 2;
    const kx = half - kneeIn; // distance from center to knee
    if (d >= kx) return yKnee + (d - kx) / kneeIn * (yEave - yKnee);
    return yPeak + d / kx * (yKnee - yPeak);
  };
  // facade (red planks with gambrel top)
  part(p, (q) => {
    for (let x = x0 + 2; x <= x1 - 2; x++) for (let y = Math.round(yAt(x)); y < base; y++) q.set(x, y, 'R');
    planksV(q, x0, 0, x1 - x0 + 1, base, RED, 4);
    // right side slightly darker
    for (let y = 0; y < base; y++) for (let x = x1 - 5; x <= x1; x++) if (q.opaque(x, y) && q.get(x, y) !== 0) { if ((x - x0) % 4 !== 0) q.paint(x, y, 'q'); }
  });
  // white trim along the roof edge
  part(p, (q) => {
    for (let x = x0 + 2; x <= x1 - 2; x++) { const y = Math.round(yAt(x)); q.set(x, y + 1, '9'); q.set(x, y + 2, '8'); }
    // corner trims
    q.rect(x0 + 2, Math.round(yAt(x0 + 2)) + 1, 2, base - Math.round(yAt(x0 + 2)) - 1, '9');
    q.rect(x1 - 3, Math.round(yAt(x1 - 3)) + 1, 2, base - Math.round(yAt(x1 - 3)) - 1, '8');
  }, null);
  bandRoof(p, x0, x1, yAt, thick, cx, ROOF_GRAY, ROOF_GRAYR);
  return yAt;
}

function tier3(p: PixelCanvas) {
  const yAt = barnFacade(p, 18, 93, 50, 34, 22, 12, 77, 6);
  void yAt;
  foundation(p, 18, 77, 76, 3);
  barnDoors(p, 42, 54, 28, 23, { d: 'r', m: 'R', l: 'e' }, '9');
  p.rect(41, 53, 30, 1, '9');
  // hayloft
  part(p, (q) => { q.rect(49, 30, 14, 12, '9'); q.rect(51, 32, 10, 10, '1'); q.rect(51, 37, 10, 5, 't'); q.hline(51, 60, 37, 'z'); for (let x = 51; x < 61; x += 2) q.set(x, 36, 'Y'); });
  win(p, 25, 58, 9, 9, { frame: '9', cross: true, glass: 'W' });
  win(p, 78, 58, 9, 9, { frame: '9', cross: true, glass: 'W' });
  // weathervane
  part(p, (q) => { q.vline(56, 6, 16, '2'); q.hline(52, 60, 10, '2'); q.grid(53, 3, ['..00.', '.0000', '0000.']); }, null);
  crate(p, 4, 69); crate(p, 96, 69); sack(p, 100, 60);
}

function tier4(p: PixelCanvas) {
  // silo (behind, right)
  part(p, (q) => {
    q.rect(86, 18, 23, 59, '7');
    cylShade(q, 86, 12, 23, 65, ['6', '7', '8', '9']);
    for (let y = 22; y < 77; y += 6) for (let x = 86; x < 109; x++) { q.paint(x, y, '6'); }
  });
  part(p, (q) => {
    q.ellipse(97.5, 18, 12.5, 11, 'W');
    q.rect(84, 18, 28, 12, null);
    for (let y = 0; y < 18; y++) for (let x = 84; x < 112; x++) if (q.opaque(x, y)) {
      const dx = x + 0.5 - 97.5, dy = y + 0.5 - 18;
      q.set(x, y, dx + dy * 0.5 < -9 ? 'a' : dx + dy * 0.3 > 6 ? 'w' : 'W');
    }
    q.hline(85, 110, 18, 'U'); q.hline(85, 110, 17, 'w');
  });
  p.grid(96, 5, ['.0.', '0Y0', '.0.']);
  // barn body
  barnFacade(p, 6, 91, 48, 28, 14, 14, 77, 7);
  foundation(p, 6, 77, 104, 3);
  barnDoors(p, 34, 50, 30, 27, { d: 'r', m: 'R', l: 'e' }, '9');
  p.rect(33, 49, 32, 1, '9');
  // lanterns
  for (const lx of [30, 66]) part(p, (q) => { q.rect(lx, 53, 3, 4, 'Y'); q.set(lx + 1, 54, 'z'); q.hline(lx, lx + 2, 52, '1'); }, '0');
  // hayloft with hay + pulley beam
  part(p, (q) => { q.rect(40, 22, 18, 16, '9'); q.rect(42, 24, 14, 14, '1'); q.rect(42, 30, 14, 8, 't'); for (let x = 42; x < 56; x++) q.set(x, 29 + (x % 3 === 0 ? 0 : 1), x % 2 ? 'Y' : 't'); q.hline(42, 55, 34, 'B'); });
  part(p, (q) => { q.rect(46, 17, 6, 3, 'n'); q.hline(46, 51, 17, 'b'); q.vline(50, 20, 23, '4'); });
  // windows with flower boxes
  for (const wx of [13, 75]) {
    win(p, wx, 55, 10, 10, { frame: '9', glass: 'W' });
    part(p, (q) => { q.rect(wx - 1, 66, 12, 3, 'b'); q.hline(wx - 1, wx + 10, 66, 'B'); });
    for (let k = 0; k < 6; k++) p.set(wx + k * 2, 65, k % 2 ? 'Y' : '#'), p.set(wx + k * 2 + 1, 65, 'G');
  }
  // weathervane rooster on the peak
  part(p, (q) => { q.vline(48, 1, 8, '2'); q.hline(45, 51, 5, '2'); q.grid(46, 0, ['.QQ..', 'QQQQ.', '..QQQ']); }, '0');
  // hay bales
  part(p, (q) => { q.rect(1, 68, 12, 9, 't'); for (let y = 68; y < 77; y++) for (let x = 1; x < 13; x++) q.set(x, y, (y - 68) % 3 === 0 ? 'B' : x > 9 ? 'B' : (x + y) % 5 === 0 ? 'Y' : 't'); q.vline(4, 68, 76, 'y'); q.vline(9, 68, 76, 'y'); });
  crate(p, 96, 69, 11, 8);
}

export const warehouse: DrawSprite = {
  w: 112, h: 80, frames: 4, fps: 1, ox: 0, oy: 0,
  draw(p, f) { [tier1, tier2, tier3, tier4][f](p); },
};

// ---------------------------------------------------------------- Helipad (56x24)
export const helipad: DrawSprite = {
  w: 56, h: 24, frames: 1, ox: 0, oy: 0,
  draw(p) {
    part(p, (q) => {
      q.ellipse(28, 13, 27, 10, '2');
      q.ellipse(28, 11, 27, 10, '7');
      for (let y = 0; y < 24; y++) for (let x = 0; x < 56; x++) {
        if (!q.opaque(x, y)) continue;
        const dx = (x + 0.5 - 28) / 27, dy = (y + 0.5 - 11) / 10;
        const r = dx * dx + dy * dy;
        if (q.get(x, y) !== 0 && r <= 1) {
          if (r > 0.78) q.set(x, y, dx + dy < 0 ? '8' : '7');
          else if (r > 0.62) q.set(x, y, 'Y');
          else q.set(x, y, dx + dy < -0.5 ? '8' : '7');
        }
      }
      // side thickness shading
      for (let y = 0; y < 24; y++) for (let x = 0; x < 56; x++) if (q.opaque(x, y) && q.get(x, y) === q.get(28, 22)) q.set(x, y, x > 34 ? '2' : '6');
      // yellow ring dashes
      // H
      const H = ['99...99', '99...99', '99...99', '9999999', '99...99', '99...99', '99...99'];
      q.grid(25, 8, H.map((r) => r.replace(/9/g, 'Y')));
      q.grid(24, 7, H);
      // corner lights
      for (const [lx, ly] of [[4, 11], [51, 11], [28, 2], [28, 20]]) { q.set(lx, ly, 'Q'); q.set(lx + 1, ly, 'e'); }
    });
  },
};

// ---------------------------------------------------------------- Build site (72x64)
export const build_site: DrawSprite = {
  w: 72, h: 64, frames: 1, ox: 0, oy: 0,
  draw(p) {
    // dirt plot
    part(p, (q) => {
      q.poly([[8, 30], [64, 30], [70, 58], [2, 58]], 'b');
      q.rect(2, 58, 69, 4, 'n');
      for (let y = 30; y < 62; y++) for (let x = 0; x < 72; x++) {
        if (!q.opaque(x, y)) continue;
        if (y >= 58) { q.set(x, y, (x + y) % 3 === 0 ? 'm' : 'n'); continue; }
        const h = (x * 31 + y * 17) % 29;
        if (h === 0) q.set(x, y, 'n'); else if (h === 7) q.set(x, y, 'B'); else if (h === 13 && y < 50) q.set(x, y, 'B');
        if (y === 30) q.set(x, y, 'B');
      }
      // shovel marks / pebbles
      for (const [sx, sy] of [[16, 40], [52, 36], [60, 52], [12, 54], [34, 52]]) { q.set(sx, sy, '7'); q.set(sx + 1, sy, '6'); }
    }, 'n');
    // stakes + rope
    const stakes: [number, number][] = [[8, 30], [64, 30], [70, 57], [2, 57]];
    p.line(8, 26, 64, 26, 't'); p.line(64, 26, 69, 52, 't'); p.line(3, 52, 8, 26, 't');
    p.line(3, 52, 12, 54, 't'); p.line(60, 54, 69, 52, 't');
    for (let x = 12; x < 62; x += 6) { p.set(x, 27, 'Q'); p.set(x + 1, 27, 'Q'); p.set(x, 28, 'e'); }
    for (const [sx, sy] of stakes) part(p, (q) => { q.rect(sx - 1, sy - 6, 3, 8, 'B'); q.vline(sx + 1, sy - 6, sy + 1, 'b'); q.set(sx - 1, sy - 6, 't'); });
    // shovel stuck in the dirt (back left)
    part(p, (q) => { q.line(13, 20, 15, 33, 'b'); q.line(14, 20, 16, 33, 'n'); q.rect(13, 33, 6, 5, '7'); q.hline(13, 18, 33, '8'); q.vline(18, 33, 37, '6'); q.hline(11, 16, 19, 'b'); });
    // pile of planks (front left)
    part(p, (q) => {
      for (let k = 0; k < 3; k++) { q.rect(6 + k * 2, 53 - k * 2, 16, 2, 'B'); q.hline(6 + k * 2, 21 + k * 2, 53 - k * 2, 't'); q.set(21 + k * 2, 54 - k * 2, 'n'); }
    });
    // bricks (front right)
    part(p, (q) => {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) {
        const bx = 52 + c * 5 + r * 2, by = 53 - r * 3;
        q.rect(bx, by, 5, 3, 'R'); q.hline(bx, bx + 3, by, 'e'); q.vline(bx + 4, by, by + 2, 'r');
      }
    });
    // sign board (blank, engine writes the price) on two posts
    part(p, (q) => {
      q.rect(25, 40, 2, 16, 'n'); q.rect(45, 40, 2, 16, 'n');
      q.vline(25, 40, 55, 'b'); q.vline(45, 40, 55, 'b');
    });
    part(p, (q) => {
      q.rect(18, 29, 36, 14, 'B');
      planksH(q, 18, 29, 36, 14, { d: 'b', m: 'B', l: 't' }, 7);
      q.rect(20, 31, 32, 10, '&');
      q.hline(20, 51, 31, '9');
      q.hline(20, 51, 40, '%'); q.vline(51, 31, 40, '%');
    }, 'n');
    // nails
    for (const [nx, ny] of [[19, 30], [52, 30], [19, 41], [52, 41]]) p.set(nx, ny, '2');
  },
};

// ---------------------------------------------------------------- Cage (36x32, anchor bottom-center)
export const cage: DrawSprite = {
  w: 36, h: 32, frames: 2, ox: 18, oy: 32,
  draw(p, f) {
    const dent = f === 1;
    // bars (no outline, so the interior between bars stays transparent)
    part(p, (q) => {
      for (let i = 0; i < 7; i++) {
        const x = 3 + i * 5;
        for (let y = 5; y < 28; y++) {
          let bx = x;
          if (dent && (i === 2 || i === 3)) bx += Math.round(Math.sin(((y - 5) / 23) * Math.PI) * (i === 2 ? -2 : 2));
          if (dent && i === 5 && y > 13 && y < 18) continue; // broken bar
          q.set(bx - 1, y, '0'); q.set(bx, y, '8'); q.set(bx + 1, y, '6'); 
          if (y % 6 === 0) q.set(bx + 1, y, '7');
        }
        if (dent && i === 5) { q.set(x, 13, '2'); q.set(x + 1, 13, '2'); q.set(x, 18, '2'); q.set(x + 1, 18, '2'); }
      }
    }, null);
    part(p, (q) => {
      // top frame
      q.rect(1, 2, 34, 4, '6'); q.hline(1, 34, 2, '8'); q.hline(1, 34, 3, '7'); q.hline(1, 34, 5, '2');
      // bottom frame
      q.rect(1, 27, 34, 4, '6'); q.hline(1, 34, 27, '8'); q.hline(1, 34, 28, '7'); q.hline(1, 34, 30, '2');
      // rivets
      for (let x = 3; x < 34; x += 4) { q.set(x, 4, '8'); q.set(x, 29, '8'); }
      // handle ring on top
      q.ring(18, 1.5, 3, 2, '6');
      if (dent) { for (let x = 22; x < 32; x++) { q.set(x, 2, null); q.set(x, 6 - Math.round(Math.sin((x - 22) / 10 * Math.PI)), '2'); } q.set(24, 13, '6'); q.set(25, 12, '8'); }
    }, '0');
    // padlock
    part(p, (q) => { q.rect(16, 17, 5, 4, 'Y'); q.hline(16, 20, 17, 'z'); q.set(18, 19, 'd'); q.ring(18, 16.5, 2, 2, '7'); if (dent) q.set(18, 18, 'y'); }, '0');
  },
};

export const buildings: Record<string, DrawSprite> = { well, warehouse, helipad, build_site, cage };
void win; void door; void edgeShade; void wheel; void shingles;
