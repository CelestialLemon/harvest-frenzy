// Vehicles: farm truck, cargo helicopter (both face LEFT), exhaust puff, cargo net, helipad, dirt road.
// Anchor top-left unless noted. All colors are palette chars.
import { PixelCanvas, type DrawSprite } from '../../pixel';
import { part, planksH, edgeShade, type Shades } from './common';

const WOOD: Shades = { d: 'n', m: 'b', l: 'B', h: 't' };

// ================================================================= TRUCK (56x32)
// Exhaust tail-pipe opening is at sprite pixel (55, 26). Wheel centers: front (13, 25.5), rear (42, 25.5).
export const TRUCK_EXHAUST = { x: 55, y: 26 };

/** Rolling wheel. phase 0..3, one full cycle = the tread pattern repeating (period 90 deg). */
function tire(p: PixelCanvas, cx: number, cy: number, phase: number) {
  const th = -phase * (Math.PI / 8); // wheel rolls to the left => counter-clockwise on screen
  part(p, (q) => {
    q.circle(cx, cy, 5.5, '1');
    // sidewall shading (light top-left)
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
      if (!q.opaque(x, y)) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx + dy < -4.2) q.set(x, y, '2');
    }
    // tread lugs: big lug every 90deg, small lug in between
    for (let k = 0; k < 4; k++) {
      const a = th + (k * Math.PI) / 2;
      q.set(Math.floor(cx + Math.cos(a) * 4.7), Math.floor(cy + Math.sin(a) * 4.7), '7');
      const b = a + Math.PI / 4;
      q.set(Math.floor(cx + Math.cos(b) * 4.7), Math.floor(cy + Math.sin(b) * 4.7), '5');
    }
    // hubcap
    q.circle(cx, cy, 3, '6');
    q.circle(cx, cy, 2.4, '7');
    q.set(Math.floor(cx) - 1, Math.floor(cy) - 2, '8');
    q.set(Math.floor(cx) - 2, Math.floor(cy) - 1, '8');
    for (let k = 0; k < 4; k++) {
      const a = th + (k * Math.PI) / 2 + Math.PI / 4;
      q.set(Math.floor(cx + Math.cos(a) * 1.7), Math.floor(cy + Math.sin(a) * 1.7), k === 0 ? '9' : '2');
    }
    q.set(Math.floor(cx), Math.floor(cy), '0');
  }, '0');
}

function crate(p: PixelCanvas, x: number, y: number, w: number, h: number) {
  part(p, (q) => {
    q.rect(x, y, w, h, 'b');
    planksH(q, x, y, w, h, WOOD, 3);
    q.vline(x, y, y + h - 1, 'B'); q.vline(x + w - 1, y, y + h - 1, 'n');
    q.line(x + 1, y + h - 2, x + w - 2, y + 1, 'n');
    q.hline(x, x + w - 1, y, 't');
  });
}

function truckCargo(p: PixelCanvas) {
  // lower crates
  crate(p, 30, 8, 11, 7);
  crate(p, 41, 7, 12, 8);
  // burlap sack on the left crate
  part(p, (q) => {
    q.ellipse(34.5, 5.5, 5, 3.8, 't');
    q.rect(33, 0, 3, 3, 't');
    for (let y = 0; y < 9; y++) for (let x = 29; x < 41; x++) {
      if (!q.opaque(x, y)) continue;
      q.set(x, y, y >= 7 ? 'B' : (x * 3 + y) % 5 === 0 ? 'B' : 't');
    }
    q.hline(33, 35, 2, 'n'); // tie
    q.set(33, 0, 'B'); q.set(35, 0, 'B');
    q.set(31, 4, 'z'); q.set(32, 3, 'z');
  });
  // milk can on the right crate
  part(p, (q) => {
    q.rect(42, 1, 6, 6, '7');
    q.hline(42, 47, 1, '8'); q.vline(42, 2, 6, '8'); q.vline(47, 2, 6, '6'); q.vline(46, 2, 6, '6');
    q.rect(43, 0, 4, 1, '6');
    q.hline(42, 47, 3, '6'); q.hline(42, 47, 4, '8');
    q.set(41, 3, '6'); q.set(48, 3, '6');
    q.hline(42, 47, 5, 'Q');
  });
  // apples heaped on the right
  part(p, (q) => {
    for (const [ax, ay] of [[49, 5], [51, 5], [50, 3]] as [number, number][]) {
      q.rect(ax, ay, 2, 2, 'Q'); q.set(ax, ay, 'o');
    }
    q.rect(49, 7, 4, 1, 'R');
    q.set(50, 2, 'G'); q.set(51, 2, 'F');
  });
}

function truckBed(p: PixelCanvas, loaded: boolean) {
  part(p, (q) => {
    if (loaded) {
      for (const x of [29, 53]) { q.rect(x, 6, 2, 10, 'b'); q.vline(x, 6, 15, 'B'); }
      q.rect(41, 12, 1, 3, 'n');
    } else {
      for (const x of [29, 36, 43, 50, 53]) { q.rect(x, 8, 2, 8, 'b'); q.vline(x, 8, 15, 'B'); }
      q.rect(29, 8, 26, 2, 'b'); q.hline(29, 54, 8, 'B'); q.hline(29, 54, 9, 'n');
      q.rect(29, 12, 26, 2, 'b'); q.hline(29, 54, 12, 'B');
    }
  });
}

function truckBody(p: PixelCanvas) {
  part(p, (q) => {
    q.rect(28, 15, 27, 9, 'R');
    q.poly([[14, 24], [14, 7], [16, 4], [27, 4], [29, 7], [29, 24]], 'R');
    q.poly([[2, 24], [2, 16], [4, 13], [15, 12], [15, 24]], 'R');
    for (let y = 0; y < 26; y++) for (let x = 0; x < 56; x++) {
      if (!q.opaque(x, y)) continue;
      let c = 'Q';
      if (y >= 20) c = 'R';
      if (y >= 22) c = 'R';
      if (y === 23) c = 'r';
      q.set(x, y, c);
    }
    edgeShade(q, 't', 'o'); edgeShade(q, 'l', 'e', 0, 0, 20, 25);
    q.hline(5, 13, 14, 'o'); q.hline(4, 12, 15, 'e');
    q.hline(3, 54, 18, '9'); q.hline(3, 54, 19, '8');
    q.vline(28, 15, 23, 'R'); q.vline(41, 15, 23, 'R'); q.vline(54, 15, 23, 'R');
    q.vline(15, 8, 22, 'R'); q.set(25, 16, '8'); q.set(24, 16, '9'); q.set(24, 17, '7');
    // bed top rim highlight
    q.hline(29, 53, 15, 'o');
  });
  // side mirror
  part(p, (q) => { q.rect(12, 9, 2, 3, '2'); q.set(12, 9, '7'); q.set(13, 8, '6'); });
  // window + driver
  part(p, (q) => {
    q.poly([[16, 13], [16, 8], [18, 6], [27, 6], [27, 13]], 'a');
    for (let y = 6; y < 13; y++) for (let x = 16; x < 28; x++) if (q.opaque(x, y) && y >= 10) q.set(x, y, 'W');
    q.rect(24, 6, 3, 7, 'W');
  }, null);
  p.set(17, 8, '9'); p.set(18, 7, '9'); p.set(19, 6, '9');
  p.grid(18, 6, [
    '.ttttt..',
    'ttBBttt.',
    '.&&&&...',
    '.0&&&...',
    '.&&&&...',
    '.wwww...',
    'wwwww...',
  ], {});
  p.set(19, 9, '0'); p.set(19, 8, '&');
  p.hline(16, 27, 13, '0');
  p.set(17, 11, '1'); p.set(16, 12, '1'); // steering wheel
  // headlight, grille
  p.rect(2, 16, 3, 3, 'Y'); p.set(2, 16, 'z'); p.set(3, 16, 'z'); p.set(2, 17, '9'); p.set(4, 18, 'y'); p.set(3, 18, 'y');
  p.set(2, 15, '0'); p.set(3, 15, '0'); p.set(4, 15, '0');
  p.hline(2, 4, 19, '1'); p.hline(2, 4, 21, '1'); p.hline(2, 4, 20, '7');
  // bumpers (chrome)
  part(p, (q) => {
    q.rect(0, 22, 7, 3, '7'); q.hline(0, 6, 22, '9'); q.hline(0, 6, 23, '8'); q.hline(0, 6, 24, '6');
    q.rect(52, 22, 4, 3, '7'); q.hline(52, 55, 22, '9'); q.hline(52, 55, 23, '8'); q.hline(52, 55, 24, '6');
  }, '0');
  // tail light
  p.set(54, 16, 'Y'); p.set(54, 17, 'e'); p.set(54, 18, 'Q');
  // exhaust pipe
  part(p, (q) => {
    q.rect(49, 26, 7, 2, '6');
    q.hline(49, 55, 26, '7'); q.hline(49, 55, 27, '2');
    q.set(55, 26, '8'); q.set(55, 27, '5');
    q.rect(52, 25, 1, 1, '2');
  }, '0');
  p.set(55, 26, '2'); // dark opening
}

function truckArches(p: PixelCanvas) {
  part(p, (q) => {
    q.ellipse(13, 24, 7.5, 5, '1'); q.ellipse(42, 24, 7.5, 5, '1');
    q.rect(0, 25, 56, 7, null);
  }, null);
}

export const truck: DrawSprite = {
  w: 56, h: 32, frames: 8, fps: 10, ox: 0, oy: 0,
  draw(p, f) {
    const loaded = f >= 4, ph = f % 4;
    if (loaded) truckCargo(p);
    truckBed(p, loaded);
    truckBody(p);
    truckArches(p);
    tire(p, 13, 25.5, ph);
    tire(p, 42, 25.5, ph);
  },
};

// ================================================================= EXHAUST PUFF (8x8, centre anchor)
export const truck_exhaust: DrawSprite = {
  w: 8, h: 8, frames: 5, fps: 8, ox: 4, oy: 4,
  draw(p, f) {
    const r = [1.5, 2.3, 3.0, 3.4, 3.8][f];
    const cx = 4, cy = 4;
    if (f <= 2) {
      part(p, (q) => {
        q.circle(cx, cy, r, f === 0 ? '7' : '8');
        if (f > 0) { q.circle(cx - 0.5, cy - 0.5, r - 1.1, '9'); }
        if (f === 2) q.set(cx + 2, cy + 1, '7');
      }, f === 0 ? '6' : '7');
    } else {
      const tmp = new PixelCanvas(8, 8);
      tmp.circle(cx, cy, r, '8');
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (!tmp.opaque(x, y)) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (f === 3) { if ((x + y) % 2 === 0 || d > r - 0.9) p.set(x, y, d > r - 0.9 ? '7' : '9'); }
        else { if ((x + y) % 2 === 0 && d > 1.2) p.set(x, y, '8'); else if (x % 3 === 0 && y % 3 === 1) p.set(x, y, '7'); }
      }
    }
  },
};

// ================================================================= HELICOPTER (56x36)
// Level pose: skid bottom y = 32, belly rope hook at (23, 29). Positions for tilt come from HELI_TILT_POINTS.

interface Tx { p(x: number, y: number): [number, number]; i(x: number, y: number): [number, number] }
/** Rotation by deg (screen coords, y down) about local pivot (lx,ly), placing the pivot at screen (sx,sy). */
function mkTx(deg: number, lx: number, ly: number, sx = lx, sy = ly): Tx {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return {
    p: (x, y) => { const dx = x - lx, dy = y - ly; return [sx + dx * c - dy * s, sy + dx * s + dy * c]; },
    i: (x, y) => { const dx = x - sx, dy = y - sy; return [lx + dx * c + dy * s, ly - dx * s + dy * c]; },
  };
}
const polyT = (q: PixelCanvas, t: Tx, pts: [number, number][], c: string | null) => q.poly(pts.map(([x, y]) => t.p(x, y)), c);
const rectT = (q: PixelCanvas, t: Tx, x: number, y: number, w: number, h: number, c: string | null) =>
  polyT(q, t, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c);
function ellT(q: PixelCanvas, t: Tx, cx: number, cy: number, rx: number, ry: number, c: string | null) {
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
    const [lx, ly] = t.i(x + 0.5, y + 0.5);
    const nx = (lx - cx) / (rx + 0.01), ny = (ly - cy) / (ry + 0.01);
    if (nx * nx + ny * ny <= 1) q.set(x, y, c);
  }
}
function lineT(q: PixelCanvas, t: Tx, x0: number, y0: number, x1: number, y1: number, c: string | null) {
  const a = t.p(x0 + 0.5, y0 + 0.5), b = t.p(x1 + 0.5, y1 + 0.5);
  q.line(Math.floor(a[0]), Math.floor(a[1]), Math.floor(b[0]), Math.floor(b[1]), c);
}
const setT = (q: PixelCanvas, t: Tx, x: number, y: number, c: string | null) => {
  const a = t.p(x + 0.5, y + 0.5); q.set(Math.floor(a[0]), Math.floor(a[1]), c);
};
function shadeT(q: PixelCanvas, t: Tx, fn: (lx: number, ly: number, x: number, y: number) => string | undefined) {
  const src = q.px.slice();
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
    if (!(src[y * q.w + x] >>> 24)) continue;
    const [lx, ly] = t.i(x + 0.5, y + 0.5);
    const c = fn(lx, ly, x, y);
    if (c !== undefined) q.set(x, y, c);
  }
}
function gridT(q: PixelCanvas, t: Tx, gx: number, gy: number, rows: string[]) {
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
    const [lx, ly] = t.i(x + 0.5, y + 0.5);
    const col = Math.floor(lx - gx), row = Math.floor(ly - gy);
    if (row < 0 || row >= rows.length || col < 0 || col >= rows[row].length) continue;
    const ch = rows[row][col];
    if (ch !== '.' && ch !== ' ') q.set(x, y, ch);
  }
}

const HUB = { x: 24, y: 4 }; // rotor hub, local
const TAIL = { x: 52, y: 10.5 }; // tail rotor centre, local
const PIVOT = { x: 24, y: 20 };

/** Body (everything that is identical across frames), drawn with transform t. */
function heliBody(p: PixelCanvas, t: Tx) {
  // tail boom
  part(p, (q) => {
    polyT(q, t, [[34, 15], [49, 16], [49, 20.5], [34, 25]], 'Y');
    shadeT(q, t, (lx, ly) => (ly >= 20.5 - (50 - lx) * 0.12 ? 'y' : undefined));
    edgeShade(q, 't', 'z');
    // boom band + nav light
    shadeT(q, t, (lx) => (lx >= 42 && lx < 44 ? 'Q' : undefined));
  });
  // horizontal stabiliser
  part(p, (q) => {
    polyT(q, t, [[41, 20], [48, 20], [46, 24], [39, 25]], 'R');
    shadeT(q, t, (lx, ly) => (ly < 21.5 ? 'Q' : undefined));
  });
  // tail fin
  part(p, (q) => {
    polyT(q, t, [[43, 17], [47, 6], [52, 6], [50, 20.5]], 'Q');
    edgeShade(q, 'l', 'o'); edgeShade(q, 'r', 'R');
    shadeT(q, t, (lx, ly) => (ly > 15 ? 'R' : undefined));
  });
  // skids (behind body)
  part(p, (q) => {
    polyT(q, t, [[13, 26], [15.5, 26], [13.5, 31.5], [11.5, 31.5]], '7');
    polyT(q, t, [[28.5, 26], [31, 26], [33, 31.5], [30.5, 31.5]], '7');
    polyT(q, t, [[5, 29], [7, 30.5], [39, 30.5], [41, 29], [41, 31], [39, 33], [7, 33], [5, 31]], '7');
    shadeT(q, t, (lx, ly) => (ly < 31.5 && ly >= 30 ? '8' : ly >= 32 ? '6' : undefined));
  });
  // mast
  part(p, (q) => {
    rectT(q, t, 22, 5, 4, 8, '7');
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (q.opaque(x, y)) {
      const [lx] = t.i(x + 0.5, y + 0.5);
      q.set(x, y, lx < 23 ? '8' : lx >= 25 ? '6' : '7');
    }
  });
  // fuselage
  part(p, (q) => {
    ellT(q, t, 22, 20, 18, 9.5, 'Y');
    ellT(q, t, 31, 12.5, 7.5, 3.6, 'Y'); // engine hump
    rectT(q, t, 22, 12, 16, 14, 'Y');
    ellT(q, t, 34, 20, 6, 7, 'Y');
    shadeT(q, t, (lx, ly) => (ly >= 25 ? 'y' : ly >= 23.5 ? 'Y' : undefined));
    edgeShade(q, 't', 'z');
    // red belt stripe
    shadeT(q, t, (lx, ly) => (lx > 20 && lx < 39.5 ? (ly >= 22 && ly < 23 ? 'Q' : ly >= 23 && ly < 24 ? 'R' : undefined) : undefined));
    // engine intake slats
    shadeT(q, t, (lx, ly) => (ly >= 10 && ly < 12 && Math.floor(lx) % 2 === 0 && lx >= 27 && lx < 35 ? 'y' : undefined));
    // door outline + handle + rivets
    for (let i = 0; i < 9; i++) { setT(q, t, 21 + i, 13, 'y'); setT(q, t, 21 + i, 24, 'y'); }
    for (let j = 0; j < 12; j++) { setT(q, t, 21, 13 + j, 'y'); setT(q, t, 29, 13 + j, 'y'); }
    setT(q, t, 27, 20, '6'); setT(q, t, 27, 21, '6');
    // rear cargo panel seam
    for (let j = 15; j < 25; j++) setT(q, t, 36, j, 'y');
  });
  // belly hook
  part(p, (q) => { rectT(q, t, 22, 28.5, 3, 2, '2'); setT(q, t, 23, 29, '7'); }, '0');
  // cockpit glass
  cockpit(p, t);
  // door window
  gridT(p, t, 22, 15, ['aWWWW', 'WWWWW', 'WWWWW', 'wwwww']);
  // pilot
  gridT(p, t, 12, 13, [
    '.QQQ.',
    'Q&&&Q',
    '&0&&&',
    '.&&&.',
    '.www.',
  ]);
  // beacon on fin tip
  setT(p, t, 49, 5, 'z'); setT(p, t, 50, 5, 'Y');
}

/** Windshield bubble: sky-blue glass, shine, frame. Built as its own layer because it needs clipping. */
function cockpit(p: PixelCanvas, t: Tx) {
  const q = new PixelCanvas(p.w, p.h);
  for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
    const [lx, ly] = t.i(x + 0.5, y + 0.5);
    const nx = (lx - 12) / 9.01, ny = (ly - 18) / 7.01;
    if (nx * nx + ny * ny <= 1 && lx <= 18.5 && ly <= 22.5) {
      let c = 'W';
      if (lx + ly < 26) c = 'a';
      else if (ly > 20) c = 'w';
      q.set(x, y, c);
    }
  }
  q.outline('0');
  p.blit(q, 0, 0);
  // frame post, shine
  for (let j = 12; j < 22; j++) setT(p, t, 18, j, '0');
  setT(p, t, 8, 13, '9'); setT(p, t, 9, 12, '9'); setT(p, t, 6, 15, '9'); setT(p, t, 10, 12, 'a');
  for (let i = 4; i < 19; i++) setT(p, t, i, 22, i < 17 ? '0' : '0');
}

/** Main rotor. kind: 0 parked, 1 blur A, 2 blades, 3 blur B, 4 blades (foreshortened). */
function mainRotor(p: PixelCanvas, t: Tx, kind: number, half: number) {
  const hx = HUB.x, hy = HUB.y;
  const q = new PixelCanvas(p.w, p.h);
  if (kind === 0) {
    for (let d = -half; d <= half; d++) {
      const droop = Math.abs(d) > half - 4 ? 1 : 0;
      const tip = Math.abs(d) >= half - 1;
      setT(q, t, hx + d, 3 + droop, tip ? 'Q' : '7');
      setT(q, t, hx + d, 4 + droop, tip ? 'R' : '2');
    }
  } else if (kind === 2 || kind === 4) {
    const h2 = kind === 2 ? half : Math.round(half * 0.72);
    // halo
    for (let d = -half; d <= half; d++) {
      if ((d + (kind === 2 ? 0 : 1)) % 3 === 0 && Math.abs(d) < half - 1) { setT(q, t, hx + d, kind === 2 ? 2 : 1, '8'); setT(q, t, hx + d, kind === 2 ? 5 : 6, '7'); }
    }
    const tilt = kind === 2 ? 0 : 1;
    for (let d = -h2; d <= h2; d++) {
      const tip = Math.abs(d) >= h2 - 1;
      const yy = 3 + (kind === 4 ? Math.round(d * 0.06) : 0) + tilt * 0;
      setT(q, t, hx + d, yy, tip ? 'Q' : '9');
      setT(q, t, hx + d, yy + 1, tip ? 'R' : '2');
    }
  } else {
    const ph = kind === 1 ? 0 : 1;
    for (let y = -3; y <= 3; y++) for (let d = -half; d <= half; d++) {
      const nx = d / half, ny = (y - 0.5) / 3.2;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const chk = (d + y + ph) % 2 === 0;
      let c: string | null = null;
      if (r2 < 0.35) c = chk ? '9' : null;
      else if (r2 < 0.75) c = chk ? '8' : ((d + ph) % 3 === 0 ? '7' : null);
      else c = (d + y + ph) % 3 === 0 ? '7' : null;
      if (Math.abs(y - 0.5) < 1 && r2 < 0.9 && (d + ph * 2) % 4 === 0) c = '6';
      if (c) setT(q, t, hx + d, 3 + y, c);
    }
    // faint blade ghost
    for (let d = -half; d <= half; d++) if ((d + ph) % 5 === 0) setT(q, t, hx + d, 3, '2');
  }
  p.blit(q, 0, 0);
  // hub
  part(p, (h) => { rectT(h, t, 21, 2, 6, 3, '6'); for (let i = 21; i < 27; i++) setT(h, t, i, 2, '7'); for (let i = 21; i < 27; i++) setT(h, t, i, 4, '2'); setT(h, t, 23, 1, '2'); setT(h, t, 24, 1, '2'); }, '0');
}

/** Tail rotor. kind as main rotor. Screen-space, at t.p(TAIL). */
function tailRotor(p: PixelCanvas, t: Tx, kind: number) {
  const [cx, cy] = t.p(TAIL.x, TAIL.y);
  const q = new PixelCanvas(p.w, p.h);
  const blade = (ang: number, len: number, c: string) => {
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    q.line(Math.floor(cx - dx), Math.floor(cy - dy), Math.floor(cx + dx), Math.floor(cy + dy), c);
  };
  if (kind === 0) { blade(Math.PI * 0.42, 4, '2'); blade(Math.PI * 0.92, 3.6, '6'); }
  else if (kind === 1 || kind === 3) {
    const ph = kind === 1 ? 0 : 1;
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const r = Math.hypot(x + 0.5, y + 0.5);
      if (r > 4) continue;
      const chk = (x + y + ph) % 2 === 0;
      const c = r < 2.6 ? (chk ? '8' : null) : (chk ? '7' : ((x + ph) % 3 === 0 ? '6' : null));
      if (c) q.set(Math.floor(cx) + x, Math.floor(cy) + y, c);
    }
  } else if (kind === 2) { blade(Math.PI * 0.12, 4, '2'); blade(Math.PI * 0.62, 4, '6'); }
  else { blade(Math.PI * 0.32, 4, '2'); blade(Math.PI * 0.82, 4, '6'); }
  p.blit(q, 0, 0);
  p.set(Math.floor(cx), Math.floor(cy), '9'); p.set(Math.floor(cx) + 1, Math.floor(cy), '7');
  p.set(Math.floor(cx), Math.floor(cy) + 1, '2'); p.set(Math.floor(cx) + 1, Math.floor(cy) + 1, '2');
}

function drawHeli(p: PixelCanvas, frame: number, tiltDeg: number, dx: number, dy: number, parkedFrame: boolean) {
  const t = tiltDeg === 0 ? mkTx(0, PIVOT.x, PIVOT.y) : mkTx(tiltDeg, PIVOT.x, PIVOT.y, PIVOT.x + dx, PIVOT.y + dy);
  heliBody(p, t);
  const kind = parkedFrame ? 0 : frame;
  const [hsx, hsy] = t.p(HUB.x, HUB.y);
  const rt = tiltDeg === 0 ? t : mkTx(tiltDeg * 0.45, HUB.x, HUB.y, hsx, hsy);
  mainRotor(p, rt, kind, tiltDeg === 0 ? 26 : 23);
  tailRotor(p, t, kind);
}

export const helicopter: DrawSprite = {
  w: 56, h: 36, frames: 5, fps: 20, ox: 0, oy: 0,
  draw(p, f) { drawHeli(p, f, 0, 0, 0, f === 0); },
};

const TILT_DEG = -13, TILT_DX = 1, TILT_DY = 1;
export const helicopter_tilt: DrawSprite = {
  w: 56, h: 36, frames: 4, fps: 20, ox: 0, oy: 0,
  draw(p, f) { drawHeli(p, f + 1, TILT_DEG, TILT_DX, TILT_DY, false); },
};

/** Rope attach (belly hook) and skid-bottom centre for both poses, in sprite pixels. */
export const HELI_POINTS = (() => {
  const t = mkTx(TILT_DEG, PIVOT.x, PIVOT.y, PIVOT.x + TILT_DX, PIVOT.y + TILT_DY);
  const r = (a: [number, number]) => ({ x: Math.round(a[0]), y: Math.round(a[1]) });
  return {
    level: { hook: { x: 23, y: 30 }, skidBottom: { x: 22, y: 32 } },
    tilt: { hook: r(t.p(23.5, 30.5)), skidBottom: r(t.p(22.5, 32.5)) },
  };
})();

// ================================================================= CARGO NET (20x18, anchor top-centre)
export const heli_cargo: DrawSprite = {
  w: 20, h: 18, frames: 1, ox: 10, oy: 0,
  draw(p) {
    // contents
    crate(p, 2, 10, 8, 7);
    crate(p, 10, 11, 8, 6);
    part(p, (q) => {
      q.ellipse(9.5, 9, 4.2, 3.6, 't');
      q.rect(9, 5, 2, 3, 't');
      for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) if (q.opaque(x, y)) q.set(x, y, y >= 10 ? 'B' : (x + y) % 5 === 0 ? 'B' : 't');
      q.hline(8, 11, 7, 'n'); q.set(7, 8, 'z');
    });
    // net (drawn over)
    const net = (x0: number, y0: number, x1: number, y1: number) => { p.line(x0, y0, x1, y1, '4'); };
    net(10, 5, 2, 11); net(10, 5, 17, 11);
    net(6, 8, 6, 16); net(14, 9, 14, 17);
    p.set(2, 11, 'n'); p.set(17, 11, 'n');
    // rope + knot
    for (let y = 0; y < 5; y++) { p.set(10, y, y % 2 ? 'n' : 'B'); p.set(9, y, y % 2 ? 'B' : 'n'); }
    p.rect(8, 4, 4, 2, 'n'); p.set(9, 4, 'B'); p.set(10, 4, 't');
  },
};

// ================================================================= HELIPAD (64x28)
const YP = (() => { const c = new PixelCanvas(1, 1); c.set(0, 0, 'Y'); return c.px[0]; })();
export const helipad: DrawSprite = {
  w: 64, h: 28, frames: 2, fps: 2, ox: 0, oy: 0,
  draw(p, f) {
    const cx = 32, cy = 12, rx = 31.5, ry = 11.5;
    // slab: side (thickness) then top
    part(p, (q) => {
      q.ellipse(cx, cy + 4, rx, ry, '6');
      q.ellipse(cx, cy, rx, ry, '7');
      for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
        if (!q.opaque(x, y)) continue;
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const r2 = nx * nx + ny * ny;
        const inTop = r2 <= 1;
        if (inTop) {
          let c = '7';
          if (nx + ny * 1.4 < -0.45) c = '8';
          if ((x * 7 + y * 13) % 23 === 0) c = '6';
          if ((x * 11 + y * 5) % 29 === 0) c = '8';
          if (r2 > 0.9) c = nx + ny < 0 ? '8' : '7';
          q.set(x, y, c);
        } else {
          q.set(x, y, nx > 0.15 ? '2' : '6');
        }
      }
      // concrete cracks
      q.line(14, 6, 18, 9, '6'); q.line(18, 9, 17, 12, '6');
      q.line(48, 16, 52, 14, '6'); q.line(52, 14, 51, 11, '6');
    });
    // slab edge highlight ring
    // yellow ring
    const ring = (rxx: number, ryy: number, c: string) => {
      const a = new PixelCanvas(p.w, p.h), b = new PixelCanvas(p.w, p.h);
      a.ellipse(cx, cy, rxx, ryy, '9'); b.ellipse(cx, cy, rxx - 1.6, ryy - 1.3, '9');
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (a.opaque(x, y) && !b.opaque(x, y)) p.set(x, y, c);
    };
    ring(26.5, 9.2, 'Y');
    // ring shading (bottom-right darker)
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (p.get(x, y) !== YP) continue;
      if ((x + 0.5 - cx) / 26 + (y + 0.5 - cy) / 9 > 0.7) p.set(x, y, 'y');
      else if ((x + 0.5 - cx) / 26 + (y + 0.5 - cy) / 9 < -0.7) p.set(x, y, 'z');
    }
    // big H (drop shadow, then white)
    const H = [
      '999......999',
      '999......999',
      '999......999',
      '999999999999',
      '999999999999',
      '999......999',
      '999......999',
      '999......999',
    ];
    p.grid(26, 9, H.map((r) => r.replace(/9/g, '5')));
    p.grid(25, 8, H);
    // shade H right/bottom edges
    p.vline(27, 8, 10, '8'); p.vline(36, 8, 10, '8'); p.vline(27, 13, 15, '8'); p.vline(36, 13, 15, '8');
    // lights around the rim
    const N = 10;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2 + Math.PI / N;
      const lx = Math.round(cx + Math.cos(a) * (rx - 3.2)), ly = Math.round(cy + Math.sin(a) * (ry - 2.2));
      if (f === 0) {
        p.rect(lx, ly, 2, 1, 'r'); p.set(lx, ly, 'q');
      } else {
        p.rect(lx, ly, 2, 2, 'Q'); p.set(lx, ly, 'z'); p.set(lx + 1, ly, 'Y'); p.set(lx + 1, ly + 1, 'e');
        // soft glow
        for (const [gx, gy] of [[-1, 0], [2, 0], [-1, 1], [2, 1], [0, -1], [1, -1], [0, 2], [1, 2]] as [number, number][]) {
          if ((gx + gy + lx + ly) % 2 === 0) p.paint(lx + gx, ly + gy, 'o');
        }
      }
    }
  },
};

// ================================================================= DIRT ROAD (16x16 tiles)
// Rows: dirt band y=2..13 with jagged shoulders (profile identical on every variant so tiles chain freely).
const ROAD_TOP = [2, 2, 3, 3, 2, 2, 3, 2, 2, 3, 3, 2, 2, 3, 2, 2];
const ROAD_BOT = [13, 12, 12, 13, 13, 12, 12, 13, 13, 13, 12, 12, 13, 12, 13, 13];

function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function roadPaint(p: PixelCanvas, v: number, cap: boolean) {
  const inDirt = (x: number, y: number) => {
    if (cap) {
      const d = Math.hypot(x + 0.5 - 7.5, y + 0.5 - 7.5);
      if (x >= 8) return d <= 7.6;
      if (d <= 7.6) return true;
    }
    return x >= 0 && x < 16 && y >= ROAD_TOP[x] && y <= ROAD_BOT[x];
  };
  const isDirtEdge = (x: number, y: number) => x >= 0 && x <= 15 ? inDirt(x, y) : true;
  // grass fringe first (behind)
  for (let x = 0; x < 16; x++) {
    if (cap && x >= 6) continue;
    for (const side of [0, 1]) {
      const edge = side === 0 ? ROAD_TOP[x] : ROAD_BOT[x];
      const dir = side === 0 ? -1 : 1;
      const h1 = hash(x, side, 3);
      if (x > 0 && x < 15 && h1 < 0.4) {
        p.set(x, edge + dir, side === 0 ? 'F' : 'f');
        if (hash(x, side, 9) < 0.35) p.set(x, edge + dir * 2, 'G');
      } else if (h1 < 0.7) p.set(x, edge + dir, side === 0 ? 'F' : 'f');
    }
  }
  if (cap) {
    // grass tufts around the round end
    for (let y = 0; y < 16; y++) for (let x = 6; x < 16; x++) {
      if (inDirt(x, y)) continue;
      const near = inDirt(x - 1, y) || inDirt(x + 1, y) || inDirt(x, y - 1) || inDirt(x, y + 1);
      if (near && hash(x, y, 5) < 0.45) p.set(x, y, hash(x, y, 8) < 0.5 ? 'F' : 'f');
    }
  }
  // dirt
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!inDirt(x, y)) continue;
    const up = !isDirtEdge(x, y - 1), dn = !isDirtEdge(x, y + 1), lf = !isDirtEdge(x - 1, y), rt = !isDirtEdge(x + 1, y);
    let c = '4';
    const n = hash(x, y, 1);
    if (n < 0.1) c = 'x'; else if (n > 0.9) c = '3';
    if (up) c = '3'; if (dn) c = 'D'; if (lf || rt) c = 'D';
    if (!up && !dn && !lf && !rt) {
      if (y === ROAD_TOP[x] + 1 || (cap && x >= 8 && y <= 2)) c = n < 0.5 ? 'x' : '4';
    }
    p.set(x, y, c);
  }
  // wheel ruts (rows fixed; ring around the turnaround)
  const rutRows = [5, 6, 9, 10];
  for (let x = 0; x < 16; x++) {
    if (cap && x >= 8) continue;
    for (const y of rutRows) {
      if (!inDirt(x, y)) continue;
      const rut = y === 5 || y === 9 ? 'D' : '3';
      const light = y === 6 || y === 10;
      p.set(x, y, light ? (hash(x, y, v + 4) < 0.25 ? 'D' : '3') : rut);
    }
    // rut breaks in the middle of the road, differing per variant
  }
  if (cap) {
    for (let y = 0; y < 16; y++) for (let x = 8; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 7.5, y + 0.5 - 7.5);
      if (d > 1.2 && d < 3.4 && inDirt(x, y)) p.set(x, y, d < 2.3 ? '3' : 'D');
    }
    p.set(7, 7, '3'); p.set(7, 8, '3');
  }
  // details per variant: pebbles, tufts, hoof/scuff marks, in columns 2..13 (never touching seams)
  const pebbles: [number, number][][] = [
    [[3, 4], [10, 8], [7, 12], [13, 5]],
    [[5, 11], [12, 4], [8, 7], [2, 8]],
    [[4, 7], [11, 12], [9, 4], [13, 9]],
  ];
  for (const [px, py] of pebbles[v % 3]) {
    if (!inDirt(px, py) || (cap && px > 9)) continue;
    p.set(px, py, '7'); p.set(px + 1, py, '6'); if (v === 1) p.set(px, py - 1, '8');
  }
  // loose dirt clumps
  const clumps: [number, number][][] = [[[6, 3], [12, 12]], [[9, 12], [4, 3]], [[13, 3], [6, 8]]];
  for (const [cx, cy] of clumps[v % 3]) {
    if (inDirt(cx, cy) && !(cap && cx > 9)) { p.set(cx, cy, 'x'); p.set(cx + 1, cy, '3'); }
  }
  // dark outline for the round cap edge
  if (cap) {
    for (let y = 0; y < 16; y++) for (let x = 8; x < 16; x++) {
      if (!inDirt(x, y)) continue;
      if (!inDirt(x + 1, y) || !inDirt(x, y - 1) || !inDirt(x, y + 1)) p.set(x, y, 'D');
    }
  }
}

export const road: DrawSprite = {
  w: 16, h: 16, frames: 3, ox: 0, oy: 0,
  draw(p, v) { roadPaint(p, v, false); },
};

export const road_end: DrawSprite = {
  w: 16, h: 16, frames: 1, ox: 0, oy: 0,
  draw(p) { roadPaint(p, 0, true); },
};

export const vehicles: Record<string, DrawSprite> = {
  truck, truck_exhaust, helicopter, helicopter_tilt, heli_cargo, helipad, road, road_end,
};
