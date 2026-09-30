// Workshops: 72x64, 3 frames (f0 idle, f1-f2 working). Anchor top-left.
import { PixelCanvas, type DrawSprite } from '../../pixel';
import {
  part, planksH, planksV, bricks, stones, win, door, smoke, signBoard, foundation, hipRoof, gableRoof,
  paintRect, edgeShade, cylShade, wheel, sparkle, type Shades,
} from './common';

const W = 72, H = 64;
const ws = (draw: (p: PixelCanvas, f: number) => void): DrawSprite => ({ w: W, h: H, frames: 3, fps: 5, ox: 0, oy: 0, draw });

/** Facade block with texture, eave shadow and outline. */
function walls(p: PixelCanvas, x: number, y: number, w: number, h: number, tex: (q: PixelCanvas) => void, shadow: string, ol = '0') {
  part(p, (q) => {
    q.rect(x, y, w, h, '9');
    tex(q);
    for (let i = x; i < x + w; i++) { q.paint(i, y, shadow); q.paint(i, y + 1, shadow); }
  }, ol);
}

function step(p: PixelCanvas, x: number, w: number) {
  part(p, (q) => { q.rect(x, 59, w, 3, '7'); q.hline(x, x + w - 1, 59, '8'); q.hline(x, x + w - 1, 61, '6'); });
}

// ---------------------------------------------------------------- Egg Powder Plant
export const powder_plant = ws((p, f) => {
  // silo tank
  part(p, (q) => {
    q.rect(47, 20, 19, 40, '7');
    q.ellipse(56.5, 20, 9.5, 4, '7');
    cylShade(q, 47, 16, 19, 44, ['6', '7', '8', '9']);
    // dome top lighter
    for (let x = 47; x < 66; x++) for (let y = 15; y < 21; y++) if (q.opaque(x, y) && y < 20 - Math.abs(x - 56.5) * 0.2) q.set(x, y, x < 54 ? '9' : '8');
    // rivet bands
    for (const by of [30, 42, 52]) {
      for (let x = 47; x < 66; x++) { q.paint(x, by, '6'); q.paint(x, by + 1, x < 58 ? '8' : '7'); }
      for (let x = 49; x < 66; x += 3) q.paint(x, by + 1, '2');
    }
  });
  // egg-cup + giant egg
  part(p, (q) => { q.rect(51, 13, 11, 4, 'Y'); q.hline(51, 61, 13, 'z'); q.hline(51, 61, 16, 'y'); q.rect(54, 17, 5, 1, 'y'); });
  const eb = f === 2 ? -1 : 0;
  part(p, (q) => {
    q.ellipse(56.5, 8 + eb, 5.5, 7, '9');
    for (let y = 0; y < 18; y++) for (let x = 48; x < 66; x++) {
      if (!q.opaque(x, y)) continue;
      const dx = x + 0.5 - 56.5, dy = y + 0.5 - (8 + eb);
      if (dx * 0.8 + dy * 0.6 > 3.4) q.set(x, y, '8');
      if (dx * 0.8 + dy * 0.6 > 5.2) q.set(x, y, '7');
    }
    q.set(54, 4 + eb, 'a'); q.set(54, 5 + eb, 'a'); q.set(55, 3 + eb, '9');
  });
  // pipe to building
  part(p, (q) => { q.rect(42, 32, 6, 4, '7'); q.hline(42, 47, 32, '8'); q.hline(42, 47, 35, '6'); q.rect(44, 31, 2, 6, '6'); });
  // vent stack
  hipRoof(p, 2, 46, 18, 36, 5, { d: 'r', m: 'R', l: 'e', h: 'o' }, { rh: 3, sw: 4 });
  part(p, (q) => { q.rect(13, 14, 6, 12, '7'); cylShade(q, 13, 14, 6, 12, ['6', '7', '8', '9']); q.rect(12, 12, 8, 3, '6'); q.hline(12, 19, 12, '8'); });
  if (f > 0) smoke(p, 15.5, 11, f - 1, 1.3, ['z', 't', 'y']);
  walls(p, 5, 37, 39, 22, (q) => planksV(q, 5, 37, 39, 22, { d: 'y', m: 'Y', l: 'z' }, 3), 'y');
  foundation(p, 3, 59, 64, 5);
  win(p, 9, 43, 8, 8, { frame: '9', lit: f > 0 });
  door(p, 20, 44, 12, 15, { d: 'i', m: 'I', l: 'j' }, 'Y', false);
  // garage door lines
  for (let y = 46; y < 59; y += 3) p.hline(21, 30, y, 'i');
  signBoard(p, 34, 42, 9, 9, 'egg', { d: 'n', m: 'b', l: 'B' }, 'a');
  // gauge on tank
  part(p, (q) => {
    q.ellipse(56.5, 46.5, 3.5, 3.5, '9');
    const a = f === 0 ? -2.4 : f === 1 ? -1.2 : -0.3;
    q.line(56, 46, Math.round(56 + Math.cos(a) * 2.5), Math.round(46 + Math.sin(a) * 2.5), 'Q');
  });
  step(p, 19, 14);
});

// ---------------------------------------------------------------- Bakery
const BRICK: Shades = { d: 'n', m: 'R', l: '3', h: 'e' };
export const bakery = ws((p, f) => {
  hipRoof(p, 3, 68, 13, 34, 6, { d: 'n', m: 'e', l: 'o', h: '%' }, { rh: 3, sw: 5 });
  part(p, (q) => {
    q.rect(51, 11, 8, 12, 'R');
    bricks(q, 51, 11, 8, 12, BRICK, 4, 3);
    q.rect(50, 9, 10, 3, '6'); q.hline(50, 59, 9, '7');
  });
  if (f > 0) smoke(p, 54.5, 8, f - 1);
  walls(p, 7, 35, 58, 24, (q) => {
    q.rect(7, 35, 58, 24, '&');
    // plaster speckle shading
    for (let y = 35; y < 59; y++) for (let x = 7; x < 65; x++) if ((x * 7 + y * 13) % 23 === 0) q.paint(x, y, '%');
    bricks(q, 7, 51, 58, 8, BRICK, 6, 3);
    // timber posts
    for (const bx of [7, 64]) for (let y = 35; y < 51; y++) q.paint(bx, y, 'n');
    for (let x = 7; x < 65; x++) q.paint(x, 50, 'n');
  }, '%');
  foundation(p, 5, 59, 62, 5);
  // windows with striped awnings
  for (const wx of [12, 47]) {
    win(p, wx, 42, 13, 9, { frame: 'n', lit: f > 0, sill: 'B' });
    part(p, (q) => {
      for (let x = wx - 2; x < wx + 15; x++) for (let y = 37; y < 41; y++) q.set(x, y, Math.floor((x - wx + 2) / 3) % 2 ? '9' : 'Q');
      for (let x = wx - 2; x < wx + 15; x++) if ((x - wx + 2) % 3 === 1) q.set(x, 41, Math.floor((x - wx + 2) / 3) % 2 ? '9' : 'Q');
      for (let x = wx - 2; x < wx + 15; x++) q.set(x, 37, Math.floor((x - wx + 2) / 3) % 2 ? '9' : 'e');
    });
  }
  // loaves in windows when working
  if (f > 0) for (const wx of [13, 48]) { p.grid(wx + 2, 47, ['.nbbn.', 'nbBBbn'], {}); p.grid(wx + 7, 47, ['.nbbn', 'nbBbn']); }
  door(p, 31, 43, 11, 16, { d: 'n', m: 'b', l: 'B' });
  step(p, 29, 15);
  // hanging round cookie sign on roof
  part(p, (q) => { q.line(30, 15, 33, 18, '2'); q.line(42, 15, 39, 18, '2'); }, null);
  part(p, (q) => {
    q.circle(36, 25, 8, 'B');
    for (let y = 16; y < 34; y++) for (let x = 27; x < 46; x++) {
      if (!q.opaque(x, y)) continue;
      const dx = x + 0.5 - 36, dy = y + 0.5 - 25;
      if (dx + dy > 6) q.set(x, y, 'b');
      else if (dx + dy < -7) q.set(x, y, 't');
    }
    for (const [cx, cy] of [[33, 21], [38, 22], [35, 26], [40, 27], [31, 26], [36, 30]]) { q.set(cx, cy, 'm'); q.set(cx + 1, cy, 'n'); q.set(cx, cy + 1, 'n'); }
    q.set(32, 20, 'z'); q.set(33, 19, 't');
  });
});

// ---------------------------------------------------------------- Cake Shop
const PINKW: Shades = { d: 'X', m: 'Z', l: 'A' };
export const cake_shop = ws((p, f) => {
  // gable facade (triangle)
  part(p, (q) => {
    q.poly([[6, 36], [36, 18], [66, 36]], 'Z');
    planksH(q, 6, 18, 60, 18, PINKW, 3);
  });
  gableRoof(p, 2, 69, 36, 16, 5, 36, { d: 'm', m: 'n', l: 'b', h: 'B' }, { d: 'p', m: 'm', l: 'n' });
  // icing drips under the roof edge
  part(p, (q) => {
    for (let x = 2; x <= 69; x++) {
      const t = x < 36 ? (x - 2) / 34 : (69 - x) / 33;
      const ey = Math.round(36 - t * 20);
      q.set(x, ey - 1, '9'); q.set(x, ey, '9');
      const len = [0, 1, 2, 1, 0, 3, 1, 0][x % 8];
      for (let k = 1; k <= len; k++) q.set(x, ey + k, '9');
    }
    edgeShade(q, 'b', '8');
  }, '7');
  // round window in gable
  part(p, (q) => { q.circle(36, 28, 4, '9'); q.circle(36, 28, 3, 'W'); q.set(35, 26, 'a'); q.set(34, 27, 'a'); q.hline(33, 38, 28, '9'); q.vline(36, 25, 30, '9'); });
  walls(p, 6, 37, 60, 22, (q) => planksH(q, 6, 37, 60, 22, PINKW, 3), 'X');
  foundation(p, 4, 59, 64, 5, { d: '5', m: '6', l: '7', h: '8' });
  // display window + striped awning
  win(p, 10, 45, 20, 11, { frame: '9', cross: false, sill: '9' });
  // cake inside display
  p.grid(15, 48, ['...Q...', '.99999.', '.XXXXX.', '9999999', 'XXXXXXX', 'nnnnnnn'], {});
  part(p, (q) => {
    for (let x = 8; x < 32; x++) for (let y = 39; y < 43; y++) q.set(x, y, Math.floor((x - 8) / 3) % 2 ? '9' : '#');
    for (let x = 8; x < 32; x += 3) { q.set(x + 1, 43, Math.floor((x - 8) / 3) % 2 ? '9' : '#'); }
    for (let x = 8; x < 32; x++) q.set(x, 39, Math.floor((x - 8) / 3) % 2 ? '9' : 'Z');
  });
  door(p, 38, 43, 11, 16, { d: 'I', m: 'j', l: 'J' }, 'Y');
  win(p, 54, 45, 8, 9, { frame: '9', sill: '9' });
  step(p, 36, 15);
  // giant cake on the peak
  part(p, (q) => {
    // bottom tier
    q.rect(26, 8, 21, 7, 'Z');
    q.rect(26, 8, 21, 2, '9');
    for (let x = 26; x < 47; x++) if (x % 3 === 0) q.set(x, 10, '9');
    q.hline(26, 46, 14, 'X');
    q.vline(46, 8, 14, 'X');
    q.set(27, 11, 'A'); q.set(27, 12, 'A');
    // top tier
    q.rect(30, 2, 13, 6, 'Z');
    q.rect(30, 2, 13, 2, '9');
    for (let x = 30; x < 43; x++) if (x % 3 === 1) q.set(x, 4, '9');
    q.vline(42, 2, 7, 'X');
    // plate
    q.rect(24, 15, 25, 1, '8');
  });
  // cherry / candle
  p.grid(35, 0, ['.0.', '0Q0', '0Q0'], {});
  p.set(35, 1, 'e');
  if (f === 0) p.set(36, 0, '0');
  if (f > 0) {
    sparkle(p, f === 1 ? 22 : 51, f === 1 ? 6 : 10, true);
    sparkle(p, f === 1 ? 50 : 24, f === 1 ? 3 : 12);
  }
});

// ---------------------------------------------------------------- Spinnery
const LOG: Shades = { d: 'n', m: 'b', l: 'B', h: 't' };
export const spinnery = ws((p, f) => {
  hipRoof(p, 14, 69, 13, 34, 6, { d: 'f', m: 'F', l: 'G', h: 'h' }, { rh: 3, sw: 4, style: 'scallop' });
  walls(p, 18, 35, 48, 24, (q) => {
    planksH(q, 18, 35, 48, 24, LOG, 3, 2);
  }, 'n');
  // log ends at right corner
  for (let y = 36; y < 58; y += 3) p.grid(64, y, ['0t0', '0B0'], {});
  foundation(p, 3, 59, 65, 5);
  door(p, 38, 43, 11, 16, { d: 'm', m: 'n', l: 'b' });
  win(p, 53, 42, 9, 9, { frame: 't', lit: f > 0, shutters: 'F' });
  step(p, 36, 15);
  // two knitting needles poking out of the ball
  part(p, (q) => {
    q.line(40, 24, 50, 12, '7'); q.line(41, 24, 51, 12, '8');
    q.line(42, 25, 53, 17, '7'); q.line(42, 26, 53, 18, '8');
    q.rect(50, 11, 2, 2, 'Y'); q.rect(53, 16, 2, 2, 'W');
  }, '0');
  // yarn-ball sign on the roof
  part(p, (q) => {
    q.circle(41.5, 24, 7.5, '#');
    for (let y = 16; y < 32; y++) for (let x = 34; x < 50; x++) {
      if (!q.opaque(x, y)) continue;
      const dx = x + 0.5 - 42, dy = y + 0.5 - 24;
      if ((Math.round(dx * 0.7 - dy * 0.7 + 20)) % 3 === 0) q.set(x, y, 'X');
      if (dx + dy > 5.5) q.set(x, y, 'T');
      if (dx + dy < -6) q.set(x, y, 'Z');
    }
    q.line(49, 30, 53, 33, '#');
  });
  // yarn basket by the door
  part(p, (q) => {
    q.rect(52, 54, 11, 5, 'b'); planksV(q, 52, 54, 11, 5, { d: 'n', m: 'b', l: 'B' }, 2);
    q.circle(55, 53, 2.5, 'W'); q.circle(60, 53, 2.5, 'Y'); q.set(54, 52, 'a'); q.set(59, 52, 'z');
  });
  // spinning wheel (stand + wheel)
  part(p, (q) => {
    q.line(8, 58, 14, 40, 'n'); q.line(9, 58, 15, 40, 'n');
    q.line(20, 58, 14, 40, 'n'); q.line(21, 58, 15, 40, 'n');
    q.rect(5, 55, 19, 3, 'b'); q.hline(5, 23, 55, 'B');
    q.rect(22, 46, 4, 3, 'b');
  });
  const ang = f === 2 ? Math.PI / 8 : 0;
  wheel(p, 14.5, 38.5, 12, ang + (f === 1 ? Math.PI / 16 : 0), 8, { d: 'n', m: 'b', l: 'B' }, 'Y');
  // yarn thread from wheel to spindle
  p.line(26, 38, 30, 47, 'A');
  part(p, (q) => { q.rect(27, 46, 6, 3, 'A'); q.hline(27, 32, 46, '9'); }, '0');
});

// ---------------------------------------------------------------- Weaving Loom (sawtooth mill)
const STONE: Shades = { d: '2', m: '6', l: '7', h: '8', o: '5' };
const SAND: Shades = { d: '3', m: '4', l: 'x', h: '&', o: 'S' };
export const loom = ws((p, f) => {
  const teeth = [[3, 24], [24, 45], [45, 67]];
  // facade with sawtooth top
  part(p, (q) => {
    q.rect(4, 34, 63, 25, '6');
    for (const [a, b] of teeth) q.poly([[a + 1, 34], [b, 18], [b, 34]], '6');
    stones(q, 4, 14, 63, 45, SAND, 4, 11);
  });
  // roof slope bands
  for (const [a, b] of teeth) {
    part(p, (q) => {
      q.poly([[a - 1, 35], [b + 1, 18], [b + 1, 13], [a - 1, 30]], 'M');
      for (let y = 10; y < 36; y++) for (let x = a - 1; x <= b + 1; x++) {
        if (!q.opaque(x, y)) continue;
        const t = (x - (a - 1)) / (b - a + 2);
        const top = 30 - t * 17;
        const d = y - top;
        q.set(x, y, d < 1 ? 'A' : d < 2 ? 'N' : d > 4.5 ? 'P' : ((x + Math.floor(d)) % 4 === 0 ? 'P' : 'M'));
      }
    });
    // skylight glass on the vertical face
    part(p, (q) => { q.rect(b - 1, 18, 2, 14, 'a'); q.vline(b, 18, 31, 'W'); for (let y = 21; y < 32; y += 4) q.hline(b - 1, b, y, '8'); });
  }
  // wall top shadow line for the roof band
  // big arched loom window
  const wx = 9, wy = 38, ww = 26, wh = 17;
  p.rect(wx - 1, wy - 1, ww + 2, wh + 2, '0');
  p.rect(wx, wy, ww, wh, 'n');
  p.rect(wx + 1, wy + 1, ww - 2, wh - 2, '1');
  const warp = ['Q', 'Y', 'G', 'W', 'N', '#', 'O', 'j'];
  for (let i = 0; i < ww - 4; i++) p.vline(wx + 2 + i, wy + 2, wy + wh - 3, i % 2 ? '1' : warp[Math.floor(i / 2) % warp.length]);
  // woven cloth portion
  for (let y = wy + 10; y < wy + wh - 2; y++) for (let i = 0; i < ww - 4; i++) p.set(wx + 2 + i, y, (i + y) % 2 ? warp[Math.floor(i / 2) % warp.length] : 'M');
  // beam + shuttle
  p.hline(wx + 1, wx + ww - 2, wy + 9, 'b');
  const sx = f === 0 ? 17 : f === 1 ? 12 : 23;
  p.grid(wx + sx - 4, wy + 8, ['.0000.', '0tBBb0', '.0000.'], {});
  // door
  door(p, 44, 43, 11, 16, { d: 'p', m: 'P', l: 'M' }, 'Y');
  step(p, 42, 15);
  // gear on wall (turns when working)
  wheel(p, 61.5, 44.5, 4.5, f === 2 ? 0.4 : 0, 6, { d: '6', m: '8', l: '9' }, 'Y');
  for (let k = 0; k < 8; k++) {
    const a = (f === 2 ? 0.4 : 0) + (k * Math.PI) / 4;
    p.set(Math.round(61.5 + Math.cos(a) * 5.5 - 0.5), Math.round(44.5 + Math.sin(a) * 5.5 - 0.5), '0');
  }
  // fabric banner hanging from a rod on the middle gable
  part(p, (q) => {
    q.rect(29, 24, 13, 9, 'M');
    for (let y = 24; y < 33; y++) for (let x = 29; x < 42; x++) {
      const a = (x - 29) % 4 < 2, b = (y - 24) % 4 < 2;
      q.set(x, y, a && b ? 'A' : a || b ? 'N' : 'M');
    }
    for (let x = 29; x < 42; x += 2) q.set(x, 33, 'N');
    q.vline(41, 24, 32, 'P');
  });
  part(p, (q) => { q.hline(27, 43, 23, 'B'); q.set(27, 23, 'Y'); q.set(43, 23, 'Y'); }, '0');
  foundation(p, 2, 59, 67, 5);
});

// ---------------------------------------------------------------- Tailor
export const tailor = ws((p, f) => {
  hipRoof(p, 3, 68, 9, 32, 4, { d: 'u', m: 'U', l: 'w', h: 'W' }, { rh: 3, sw: 4, style: 'scallop' });
  // dormers
  for (const dx of [10, 50]) {
    part(p, (q) => { q.rect(dx, 16, 12, 10, 'I'); planksH(q, dx, 16, 12, 10, { d: 'i', m: 'I', l: 'j' }, 3); });
    win(p, dx + 3, 18, 6, 6, { frame: '9' });
    gableRoof(p, dx - 2, dx + 13, 16, 9, 2, dx + 6, { d: 'u', m: 'U', l: 'w', h: 'W' }, { d: 'u', m: 'u', l: 'U' });
  }
  walls(p, 6, 33, 60, 26, (q) => planksH(q, 6, 33, 60, 26, { d: 'i', m: 'I', l: 'j' }, 4), 'i');
  foundation(p, 4, 59, 64, 5);
  // display window with mannequin
  win(p, 9, 42, 24, 13, { frame: '9', cross: false, glass: 'a', glass2: 'W', sill: '9' });
  part(p, (q) => {
    // dress form stand
    q.vline(21, 51, 54, 'n'); q.hline(19, 23, 54, 'n');
    // shirt
    q.grid(15, 44, [
      '..QQ.QQ..',
      '.QQQ9QQQ.',
      'QQQQ9QQQQ',
      'QQ.QYQ.QQ',
      '...Q9Q...',
      '...QYQ...',
      '...QQQ...',
    ]);
    q.set(14, 46, 'Q');
  }, 'r');
  // stripy awning
  part(p, (q) => {
    for (let x = 7; x < 35; x++) for (let y = 37; y < 41; y++) q.set(x, y, Math.floor((x - 7) / 3) % 2 ? '9' : 'Y');
    for (let x = 7; x < 35; x += 3) q.set(x + 1, 41, Math.floor((x - 7) / 3) % 2 ? '9' : 'Y');
    for (let x = 7; x < 35; x++) q.set(x, 37, Math.floor((x - 7) / 3) % 2 ? '9' : 'z');
  });
  door(p, 40, 43, 11, 16, { d: 'r', m: 'R', l: 'e' }, 'Y');
  win(p, 55, 42, 8, 10, { frame: '9' });
  step(p, 38, 15);
  // big scissors emblem on the roof (snip when working)
  const open = f === 0 ? 2 : f === 1 ? 4 : 0;
  part(p, (q) => {
    // blades
    q.line(36, 24, 36 - 3 - open, 9, '8'); q.line(37, 24, 37 - 3 - open, 9, '8');
    q.line(36, 24, 36 + 3 + open, 9, '7'); q.line(37, 24, 37 + 3 + open, 9, '7');
    q.set(33 - open, 9, '9');
    // handles
    q.ring(32, 27.5, 3, 3, 'Q'); q.ring(41, 27.5, 3, 3, 'Q');
    q.set(30, 26, 'e'); q.set(39, 26, 'e');
    q.set(36, 23, 'Y'); q.set(37, 23, 'Y');
  });
  if (f > 0) sparkle(p, f === 1 ? 31 : 42, f === 1 ? 7 : 10);
});

// ---------------------------------------------------------------- Pillow Factory
export const pillow_factory = ws((p, f) => {
  walls(p, 7, 36, 58, 23, (q) => planksH(q, 7, 36, 58, 23, { d: 'M', m: 'N', l: 'A' }, 3), 'P');
  foundation(p, 5, 59, 62, 5, { d: '5', m: '6', l: '7', h: '8' });
  // puffy pillow roof: bulging super-ellipse with pinched corner ears
  const puff = f === 2 ? 1 : 0;
  const cx = 36, cy = 23, rx = 32 + puff * 0.5, ry = 13 + puff;
  part(p, (q) => {
    for (let y = 0; y < 40; y++) for (let x = 0; x < 72; x++) {
      const dx = Math.abs(x + 0.5 - cx) / rx, dy = Math.abs(y + 0.5 - cy) / ry;
      if (Math.pow(dx, 2.4) + Math.pow(dy, 2.4) <= 1) q.set(x, y, '9');
    }
    // corner ears
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ex = cx + sx * (rx + 1.5), ey = cy + sy * (ry + 1.5);
      const bx = cx + sx * (rx - 7), by = cy + sy * (ry - 5);
      q.poly([[ex, ey], [bx, cy + sy * (ry - 1)], [cx + sx * (rx - 1), by]], '9');
    }
    // soft shading (light from top-left)
    for (let y = 0; y < 40; y++) for (let x = 0; x < 72; x++) {
      if (!q.opaque(x, y)) continue;
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const r = Math.sqrt(dx * dx + dy * dy);
      const s = dx * 0.45 + dy * 0.9 + r * 0.35;
      if (s > 1.05) q.set(x, y, 'N'); else if (s > 0.62) q.set(x, y, 'A');
      else if (s < -0.25 && r < 0.8) q.set(x, y, '9');
    }
    // stitched seam around the edge
    const src = q.px.slice();
    for (let y = 1; y < 39; y++) for (let x = 1; x < 71; x++) {
      const op = (xx: number, yy: number) => src[yy * 72 + xx] >>> 24;
      if (!op(x, y)) continue;
      let edge = false;
      for (let k = -2; k <= 2; k++) for (let m = -2; m <= 2; m++) if (Math.abs(k) + Math.abs(m) >= 2 && !op(x + k, y + m)) edge = true;
      if (edge && !( !op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1)) && (x + y) % 3 === 0) q.set(x, y, 'N');
    }
    // tufted buttons with creases
    for (const [bx, by] of [[22, 21], [36, 19], [50, 21], [29, 28], [43, 28]]) {
      q.set(bx - 2, by - 1, 'A'); q.set(bx + 2, by + 1, 'A'); q.set(bx - 2, by + 1, 'A'); q.set(bx + 2, by - 1, 'A');
      q.set(bx - 1, by, 'A'); q.set(bx + 1, by, 'N');
      q.set(bx, by, 'M'); q.set(bx, by - 1, 'N');
    }
  }, 'P');
  // tassels on the ears
  for (const [tx, ty] of [[1, 7], [69, 7], [1, 37], [69, 37]]) p.grid(tx, ty + (ty < 20 ? -puff : puff), ['0Y0', 'YzY', '.y.'], {});
  // round windows + door
  for (const wx of [15, 57]) part(p, (q) => { q.circle(wx, 46, 4.5, '9'); q.circle(wx, 46, 3.2, f > 0 ? 'Y' : 'W'); q.set(wx - 2, 44, f > 0 ? 'z' : 'a'); q.set(wx - 1, 43, f > 0 ? 'z' : 'a'); }, '0');
  door(p, 31, 43, 11, 16, { d: 'E', m: 'T', l: 'X' }, 'Y');
  step(p, 29, 15);
  // pillow sign over door
  part(p, (q) => {
    q.rect(29, 37, 15, 5, '9'); q.hline(29, 43, 41, '8'); q.set(29, 37, null); q.set(43, 37, null); q.set(29, 41, null); q.set(43, 41, null);
    q.set(36, 39, 'N');
  });
  // floating feathers when working
  if (f > 0) {
    const fa = ['...09', '..090', '.0980', '0980.', '980..', '0....'];
    const fb = ['90...', '090..', '0890.', '.0890', '..089', '....0'];
    if (f === 1) { p.grid(6, 1, fa); p.grid(60, 3, fb); p.grid(34, 0, fb); }
    else { p.grid(9, 0, fb); p.grid(57, 1, fa); p.grid(38, 1, fa); }
  }
});

// ---------------------------------------------------------------- Hat Shop
export const hat_shop = ws((p, f) => {
  walls(p, 7, 36, 58, 23, (q) => {
    q.rect(7, 36, 58, 23, '&');
    for (let y = 36; y < 59; y++) for (let x = 7; x < 65; x++) if ((x * 5 + y * 11) % 19 === 0) q.paint(x, y, '%');
    for (const bx of [7, 8, 26, 27, 45, 46, 63, 64]) for (let y = 36; y < 59; y++) q.paint(bx, y, bx % 2 ? 'n' : 'm');
  }, '%');
  foundation(p, 5, 59, 62, 5);
  // windows with little hats on stands
  for (const wx of [11, 49]) {
    win(p, wx, 42, 12, 11, { frame: 'n', cross: false, glass: 'a', glass2: 'W' });
    p.vline(wx + 6, 49, 51, 'n');
    p.grid(wx + 3, 45, ['.QQQQQ.', 'QQQQQQQ', '.qqqqq.'.replace(/q/g, 'Y')]);
  }
  door(p, 31, 43, 11, 16, { d: 'm', m: 'n', l: 'b' }, 'Y');
  step(p, 29, 15);
  // giant top hat roof: brim
  part(p, (q) => {
    q.ellipse(36, 33, 35, 5.5, '1');
    for (let y = 27; y < 40; y++) for (let x = 0; x < 72; x++) {
      if (!q.opaque(x, y)) continue;
      if (y >= 34) q.set(x, y, 'u'); else if (y <= 29) q.set(x, y, '2');
    }
    edgeShade(q, 'b', 'u');
  });
  // crown
  part(p, (q) => {
    q.poly([[18, 33], [54, 33], [56, 6], [16, 6]], '1');
    q.ellipse(36, 6, 20, 3.5, '1');
    for (let y = 0; y < 34; y++) for (let x = 14; x < 58; x++) {
      if (!q.opaque(x, y)) continue;
      const t = (x - 16) / 40;
      let c = '1';
      if (t < 0.08) c = '2'; else if (t < 0.18) c = '5'; else if (t < 0.24) c = '2'; else if (t > 0.86) c = '0';
      if (y < 7) c = y < 4 ? '5' : '2';
      q.set(x, y, c);
    }
    // band
    for (let y = 24; y < 31; y++) for (let x = 14; x < 58; x++) if (q.opaque(x, y)) q.set(x, y, y === 24 ? 'e' : y === 30 ? 'r' : x > 50 ? 'q' : 'Q');
  });
  // buckle
  part(p, (q) => { q.rect(32, 24, 8, 7, 'Y'); q.rect(34, 26, 4, 3, 'Q'); q.set(32, 24, 'z'); q.set(33, 24, 'z'); }, '0');
  // feather (sways)
  const sw = f === 2 ? 1 : 0;
  part(p, (q) => {
    const tipX = 66 + sw, tipY = 2;
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const x = 52 + (tipX - 52) * t + Math.sin(t * 3.1) * 2;
      const y = 26 + (tipY - 26) * t;
      const w = Math.sin(t * Math.PI) * 3.2;
      q.ellipse(x, y, w + 0.6, 1.2, '9');
    }
    for (let k = 0; k <= 20; k++) { const t = k / 20; q.set(Math.round(52 + (tipX - 52) * t + Math.sin(t * 3.1) * 2), Math.round(26 + (tipY - 26) * t), 'y'); }
  }, '0');
  if (f > 0) sparkle(p, f === 1 ? 20 : 48, f === 1 ? 12 : 16, f === 1);
});

// ---------------------------------------------------------------- Creamery
export const creamery = ws((p, f) => {
  // roof vent
  hipRoof(p, 2, 52, 15, 35, 5, { d: 'U', m: 'w', l: 'W', h: 'a' }, { rh: 3, sw: 4 });
  part(p, (q) => { q.rect(10, 15, 7, 9, '7'); cylShade(q, 10, 15, 7, 9, ['6', '7', '8', '9']); q.rect(9, 13, 9, 3, 'w'); q.hline(9, 17, 13, 'W'); });
  if (f > 0) smoke(p, 13.5, 12, f - 1);
  walls(p, 5, 36, 45, 23, (q) => planksH(q, 5, 36, 45, 23, { d: '8', m: '9', l: '9' }, 3), '8');
  // blue corner trims
  p.rect(5, 36, 2, 23, 'W'); p.rect(48, 36, 2, 23, 'w');
  foundation(p, 3, 59, 66, 5);
  win(p, 9, 42, 9, 10, { frame: 'W', lit: false });
  win(p, 37, 42, 9, 10, { frame: 'W' });
  door(p, 22, 43, 11, 16, { d: 'U', m: 'w', l: 'W' }, 'Y');
  step(p, 20, 15);
  // cream jug sign on roof
  part(p, (q) => {
    q.rect(21, 17, 13, 13, 'W');
    q.rect(22, 18, 11, 11, '9');
    q.hline(21, 33, 17, 'a');
  }, '0');
  p.grid(23, 19, [
    '..000..',
    '.09990.',
    '099990.',
    '.099900',
    '.09a909',
    '.09a900',
    '.09990.',
    '.00000.',
  ].map((r) => r + '.'), {});
  // giant milk churn
  const lid = f === 1 ? -1 : 0;
  part(p, (q) => {
    q.rect(51, 30, 17, 29, '7');
    q.poly([[51, 31], [55, 23], [64, 23], [68, 31]], '7');
    q.rect(55, 19, 9, 5, '7');
    cylShade(q, 51, 19, 17, 40, ['6', '7', '8', '9']);
    // bands
    for (const by of [33, 53]) for (let x = 51; x < 68; x++) { q.paint(x, by, '6'); q.paint(x, by + 1, x < 62 ? '9' : '8'); }
    // blue label with cow spots
    for (let y = 39; y < 49; y++) for (let x = 51; x < 68; x++) q.paint(x, y, x < 55 ? 'W' : x > 64 ? 'w' : 'W');
    for (const [sx, sy] of [[56, 41], [61, 45], [58, 44]]) { q.paint(sx, sy, '9'); q.paint(sx + 1, sy, '9'); q.paint(sx, sy + 1, '9'); }
  });
  // handles
  for (const hx of [48, 68]) p.grid(hx, 25, ['.00', '0.0', '0.0', '.00'].map((r) => (hx < 60 ? r : r.split('').reverse().join(''))).map((r) => r.replace(/\./g, '.')));
  part(p, (q) => { q.rect(53, 15 + lid, 13, 4, '8'); q.hline(53, 65, 15 + lid, '9'); q.rect(57, 13 + lid, 5, 2, '7'); }, '0');
  if (f > 0) { p.set(52, 13, '9'); p.set(66, 12 - (f - 1), '9'); sparkle(p, 58, 26); }
});

// ---------------------------------------------------------------- Cheese Factory
export const cheese_factory = ws((p, f) => {
  // chimney (left, low side of the wedge)
  part(p, (q) => { q.rect(11, 14, 7, 14, '6'); stones(q, 11, 14, 7, 14, STONE, 3, 5); q.rect(10, 12, 9, 3, '2'); q.hline(10, 18, 12, '7'); });
  if (f > 0) smoke(p, 14.5, 11, f - 1);
  // cheese-wedge roof
  part(p, (q) => {
    q.poly([[2, 37], [70, 37], [70, 6], [2, 26]], 'Y');
    for (let y = 0; y < 38; y++) for (let x = 2; x <= 70; x++) {
      if (!q.opaque(x, y)) continue;
      const top = 26 - (x - 2) * (20 / 68);
      const d = y - top;
      if (d < 1) q.set(x, y, 'z'); else if (d < 4) q.set(x, y, 'Y');
      else q.set(x, y, 'Y');
      if (y >= 35) q.set(x, y, 'y');
    }
    // rind top band
    for (let x = 2; x <= 70; x++) { const top = Math.ceil(26 - (x - 2) * (20 / 68)); q.set(x, top + 3, 'y'); }
    // holes
    const holes: [number, number, number, number][] = [[12, 31, 2.5, 2], [26, 26, 3.5, 2.5], [44, 22, 2.5, 2], [58, 17, 3.5, 3], [38, 31, 2, 1.6], [55, 29, 3, 2.3], [64, 29, 1.6, 1.4], [20, 34, 1.5, 1]];
    for (const [hx, hy, rx, ry] of holes) {
      q.ellipse(hx, hy, rx, ry, 'y');
      for (let y = Math.floor(hy - ry); y <= hy + ry; y++) for (let x = Math.floor(hx - rx); x <= hx + rx; x++) {
        const dx = (x + 0.5 - hx) / rx, dy = (y + 0.5 - hy) / ry;
        if (dx * dx + dy * dy <= 1 && dx + dy < -0.7) q.set(x, y, 'O');
        if (dx * dx + dy * dy <= 1 && dx + dy > 0.9) q.set(x, y, 'Y');
      }
    }
    // right end face (thick end)
    for (let y = 6; y < 38; y++) { q.paint(70, y, 'y'); q.paint(69, y, 'y'); }
  }, '0');
  walls(p, 6, 38, 60, 21, (q) => planksV(q, 6, 38, 60, 21, { d: 'r', m: 'R', l: 'e' }, 4), 'r');
  foundation(p, 4, 59, 64, 5);
  // windows with flower boxes
  for (const wx of [11, 51]) {
    win(p, wx, 42, 10, 9, { frame: '9', lit: f > 0 });
    part(p, (q) => { q.rect(wx - 1, 52, 12, 3, 'b'); q.hline(wx - 1, wx + 10, 52, 'B'); });
    for (let k = 0; k < 5; k++) { p.set(wx + k * 2, 51, k % 2 ? 'Y' : 'Q'); p.set(wx + k * 2 + 1, 51, 'F'); }
  }
  door(p, 30, 43, 12, 16, { d: 'n', m: 'b', l: 'B' }, 'Y');
  step(p, 28, 16);
  // round cheese-wheel sign above door
  part(p, (q) => { q.circle(36, 40, 3.5, 'Y'); q.poly([[36, 40], [40, 37], [40, 43]], 'z'); q.set(34, 39, 'y'); q.set(35, 42, 'y'); }, '0');
});

// ---------------------------------------------------------------- Ice Cream Factory
export const ice_cream_factory = ws((p, f) => {
  hipRoof(p, 2, 69, 17, 36, 5, { d: '!', m: '#', l: 'Z', h: 'A' }, { rh: 3, sw: 4, style: 'scallop' });
  // melting drips on eave
  part(p, (q) => {
    for (let x = 3; x < 69; x++) {
      const len = [1, 2, 3, 1, 1, 2, 0, 1, 4, 1, 2, 0][x % 12];
      for (let k = 0; k < len; k++) q.set(x, 37 + k, '#');
    }
    edgeShade(q, 'b', '!');
  }, null);
  walls(p, 6, 37, 60, 22, (q) => planksV(q, 6, 37, 60, 22, { d: 'j', m: 'J', l: 'v' }, 4), 'j');
  // redraw drips over wall
  for (let x = 7; x < 65; x++) {
    const len = [1, 2, 3, 1, 1, 2, 0, 1, 4, 1, 2, 0][x % 12];
    for (let k = 0; k < len; k++) p.set(x, 37 + k, k === len - 1 ? '!' : '#');
  }
  foundation(p, 4, 59, 64, 5, { d: 'U', m: '6', l: '7', h: '8' });
  // porthole windows (freezer!)
  for (const wx of [15, 57]) part(p, (q) => {
    q.circle(wx, 48, 5, '7'); q.circle(wx, 48, 3.6, f > 0 ? 'a' : 'W');
    q.set(wx - 2, 46, '9'); q.set(wx - 1, 45, '9');
    q.set(wx - 4, 45, '9'); q.set(wx + 3, 51, '6');
  }, '0');
  door(p, 30, 43, 12, 16, { d: 'w', m: 'W', l: 'a' }, '9');
  step(p, 28, 16);
  // giant cone on the roof
  part(p, (q) => {
    q.poly([[26, 14], [46, 14], [36, 34]], 't');
    for (let y = 14; y < 34; y++) for (let x = 26; x < 47; x++) {
      if (!q.opaque(x, y)) continue;
      if ((x + y) % 5 === 0 || (x - y + 100) % 5 === 0) q.set(x, y, 'b');
      else if (x > 38) q.set(x, y, 'B');
    }
  }, 'n');
  // scoops
  const bob = f === 2 ? -1 : 0;
  part(p, (q) => {
    q.ellipse(36, 14, 12, 4.5, '&');
    q.ellipse(36, 9 + bob, 9, 6, 'Z');
    for (let y = 0; y < 20; y++) for (let x = 20; x < 52; x++) {
      if (!q.opaque(x, y)) continue;
      const c = q.get(x, y);
      void c;
    }
    // vanilla shading and drips
    for (let x = 25; x < 48; x++) { q.paint(x, 18, '%'); }
    q.set(28, 19, '&'); q.set(28, 20, '&'); q.set(41, 19, '&'); q.set(34, 19, '&'); q.set(34, 20, '&'); q.set(34, 21, '&');
    // pink scoop shading
    for (let y = 2; y < 16; y++) for (let x = 26; x < 46; x++) {
      const dx = x + 0.5 - 36, dy = y + 0.5 - (9 + bob);
      if ((dx / 9) ** 2 + (dy / 6) ** 2 <= 1) {
        if (dx * 0.7 + dy > 4) q.set(x, y, 'X'); else if (dx * 0.7 + dy < -4.5) q.set(x, y, 'A');
      }
    }
    // sprinkles
    for (const [sx, sy, c] of [[32, 7, 'Y'], [38, 6, 'W'], [35, 10, 'J'], [40, 10, 'Y'], [30, 11, 'W']] as [number, number, string][]) q.set(sx, sy + bob, c);
  }, '0');
  // cherry
  p.grid(35, 0 + bob + 1, ['.0.', '0Q0', '0q0', '.0.'].slice(0, 3 - (bob ? 0 : 0)));
  p.set(36, bob + 1, 'e');
  if (f > 0) {
    // frost sparkles
    sparkle(p, f === 1 ? 10 : 62, f === 1 ? 14 : 20, true, '9');
    sparkle(p, f === 1 ? 58 : 14, f === 1 ? 8 : 10, false, '9');
  }
});

export const workshops: Record<string, DrawSprite> = {
  powder_plant, bakery, cake_shop, spinnery, loom, tailor, pillow_factory, hat_shop, creamery, cheese_factory, ice_cream_factory,
};
void paintRect; void gableRoof;
