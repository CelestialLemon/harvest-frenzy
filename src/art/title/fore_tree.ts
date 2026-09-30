// RIGHT hero: enormous friendly tree with treehouse, rope bridge, ladder, lanterns, fruit; fence, sunflowers, hives.
import { PixelCanvas, ramp, bay, rng } from './kit';
import { blob, flower, leaf, glow, bez, dth, tuft } from './fore_util';

const TX = 576; // trunk centre at ground
const GROUND_Y = 316;
const BARK = ['p', 'd', 'n', 'b', 'B'];
const LEAF = ['f', 'F', 'G', 'h', 'H'];

const trunkC = (y: number) => TX - 3 * Math.sin((GROUND_Y - y) / 40);
const trunkW = (y: number) => 15 + 12 * Math.exp(-(GROUND_Y - y) / 12) + Math.max(0, (215 - y)) * 0.05;

/** cast shadow of the tree on the lawn, falling right/down */
export function drawTreeBack(p: PixelCanvas, r: () => number) {
  for (let y = 296; y < 340; y++) for (let x = 470; x < 640; x++) {
    const cy = 318 + (x - 560) * 0.02;
    const nx = (x - 585) / 88, ny = (y - cy) / 17;
    const d = nx * nx + ny * ny;
    if (d > 1) continue;
    if (y > 322 && dth(x, y, 0.5)) continue; // keep the chicken lane light
    if (dth(x, y, (1 - d) * 1.1)) p.set(x, y, y > 322 ? 'F' : 'f');
  }
  void r;
}

function drawTrunk(p: PixelCanvas) {
  for (let y = 170; y <= GROUND_Y + 2; y++) {
    const cx = trunkC(y), hw = trunkW(y);
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const u = (x + 0.5 - cx) / hw; // -1..1
      if (Math.abs(u) > 1) continue;
      let t = 0.86 - (u + 1) * 0.42;
      // vertical groove bark texture: interrupted lines
      const col = (x * 3 + Math.floor((y + x * 5) / 11) * 5) % 8;
      if (col === 0) t -= 0.28;
      if (col === 1) t += 0.08;
      // subtle horizontal bulges
      t += 0.06 * Math.sin(y * 0.35 + x * 0.2);
      let c = ramp(BARK, Math.max(0, Math.min(1, t)), x, y);
      if (u < -0.92) c = 'B';
      if (u < -0.98) c = 't';
      if (u > 0.9) c = 'p';
      p.set(x, y, c);
    }
  }
  // moss on the shaded-up side near the roots and a knot-hole
  for (let y = 270; y <= GROUND_Y; y++) {
    const cx = trunkC(y), hw = trunkW(y);
    for (let x = Math.floor(cx - hw); x < cx - hw + 7; x++) {
      const m = 0.5 + 0.5 * Math.sin(y * 0.4 + x);
      if ((y - 270) * 0.02 + m * 0.5 > 0.8 - (x - (cx - hw)) * 0.07 && dth(x, y, 0.7)) p.set(x, y, x < cx - hw + 2 ? 'h' : 'G');
    }
  }
  const kx = 583, ky = 262;
  for (let j = -4; j <= 4; j++) for (let i = -2; i <= 2; i++) if ((i / 2.4) ** 2 + (j / 4.4) ** 2 <= 1) p.set(kx + i, ky + j, j < -1 ? 'p' : j < 2 ? 'd' : 'n');
  p.set(kx - 2, ky + 3, 'B'); p.set(kx - 1, ky + 4, 'b');
  // roots flaring over the ground
  const root = (x0: number, dir: number, len: number, y: number) => {
    for (let i = 0; i < len; i++) {
      const rx = x0 + dir * i, ry = y + Math.round(i * 0.25) - (i < 4 ? 1 : 0);
      const th = Math.max(1, 5 - Math.floor(i * 0.3));
      for (let j = 0; j < th; j++) p.set(rx, ry - j + 2, j === th - 1 ? 'p' : j === 0 ? (dir < 0 ? 'B' : 'd') : ramp(['d', 'n', 'b'], 0.6 - (dir > 0 ? 0.3 : 0), rx, ry - j));
    }
  };
  root(TX - 24, -1, 22, GROUND_Y - 2); root(TX - 20, -1, 12, GROUND_Y - 6); root(TX + 22, 1, 20, GROUND_Y - 3);
}

function canopy(p: PixelCanvas, r: () => number) {
  const cx = 578, cy = 122, rx = 102, ry = 82;
  const inside = (x: number, y: number) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    return nx * nx + ny * ny < 1.05 + 0.1 * Math.sin(x * 0.11 + y * 0.07);
  };
  // dark base layer so gaps between clusters read as deep shade
  const mask = new PixelCanvas(640, 360);
  for (let y = 30; y < 215; y++) for (let x = 440; x < 640; x++) if (inside(x, y)) mask.set(x, y, '9');
  // clusters
  const blobs: [number, number, number, number][] = [];
  for (let gy = 42; gy < 210; gy += 11) for (let gx = 452; gx < 660; gx += 12) {
    const x = gx + (r() - 0.5) * 9 + ((gy / 11) & 1) * 5, y = gy + (r() - 0.5) * 7;
    if (!inside(x, y)) continue;
    const edge = inside(x - 12, y) && inside(x + 12, y) && inside(x, y - 12) && inside(x, y + 12);
    blobs.push([x, y, (edge ? 12 : 8) + r() * 4, (edge ? 10 : 7) + r() * 3]);
  }
  // extra scallops to make the lower/left silhouette lumpy
  for (let a = 0.55; a < 2.7; a += 0.16) {
    const x = cx + Math.cos(a) * rx * 0.96 * (a > 1.6 ? 1 : 1), y = cy + Math.sin(a) * ry * 0.98;
    blobs.push([x, y, 7 + r() * 3, 6 + r() * 2]);
  }
  blobs.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  // big lobes give the canopy large-scale light and shadow structure
  const lobes: [number, number, number][] = [[500, 150, 30], [538, 96, 36], [596, 62, 40], [608, 130, 42], [545, 150, 32], [500, 100, 30], [590, 176, 30], [640, 90, 34], [560, 55, 30]];
  for (let y = 30; y < 215; y++) for (let x = 440; x < 640; x++) if (mask.opaque(x, y)) p.set(x, y, ramp(['C', 'f'], 0.5 - (x - cx) * 0.003, x, y));
  for (const [x, y, rr, rv] of blobs) {
    let best = 0, bd = 1e9;
    lobes.forEach(([lx, ly, lr], i) => { const d = Math.hypot(x - lx, y - ly) / lr; if (d < bd) { bd = d; best = i; } });
    const [lx, ly, lr] = lobes[best];
    const lit = (-(x - lx) * 0.6 - (y - ly) * 0.7) / lr; // -1.3..1.3
    const bias = Math.max(-0.46, Math.min(0.26, lit * 0.36 - 0.27)) - ((y - cy) / ry) * 0.1 - ((x - cx) / rx) * 0.07;
    blob(p, x, y, rr, rv, LEAF, bias);
    if (lit > 0.15 && r() < 0.7) { p.set(Math.round(x - rr * 0.5), Math.round(y - rv * 0.7), 'H'); p.set(Math.round(x - rr * 0.35), Math.round(y - rv * 0.78), 'h'); }
  }
  // outline along the outside of the silhouette bottom/right in deep green
  for (let y = 30; y < 222; y++) for (let x = 440; x < 640; x++) {
    if (mask.opaque(x, y)) continue;
    // find whether a blob pixel neighbours: use p opacity vs what was there? mask only approximates; use blobs proximity
  }
  // small leaves clusters poking out on lit edges
  for (let i = 0; i < 46; i++) {
    const a = 1.2 + r() * 3.6, x = cx + Math.cos(a) * rx * 0.99, y = cy + Math.sin(a) * ry * 0.99;
    if (x < 456) continue;
    leaf(p, x, y, a + (r() - 0.5) * 0.8, 5 + r() * 3, 3.2, ['F', 'G', 'h', 'H']);
  }
  // pink blossoms & white specks
  for (let i = 0; i < 40; i++) {
    const x = Math.round(cx - rx + r() * rx * 2), y = Math.round(cy - ry + r() * ry * 1.9);
    if (!inside(x, y) || !p.opaque(x, y)) continue;
    const k = r();
    flower(p, x, y, 1, k < 0.5 ? 'Z' : k < 0.8 ? '9' : 'A', 'A', k < 0.5 ? 'X' : '8', 'z');
  }
  return { cx, cy, rx, ry, inside };
}

function fruit(p: PixelCanvas, x: number, y: number, col: 'red' | 'orange' | 'pink') {
  const cs = col === 'red' ? ['R', 'Q', 'e', '%'] : col === 'orange' ? ['n', 'O', 'y', 'z'] : ['T', '#', 'Z', '&'];
  p.set(x, y - 1, cs[1]); p.set(x + 1, y - 1, cs[1]); p.set(x - 1, y, cs[1]); p.set(x, y, cs[2]); p.set(x + 1, y, cs[1]); p.set(x + 2, y, cs[0]);
  p.set(x - 1, y + 1, cs[1]); p.set(x, y + 1, cs[1]); p.set(x + 1, y + 1, cs[0]); p.set(x + 2, y + 1, cs[0]); p.set(x, y + 2, cs[0]); p.set(x + 1, y + 2, cs[0]);
  p.set(x - 1, y - 1, cs[3]); p.set(x, y - 2, 'f'); p.set(x + 1, y - 2, 'G');
}

function lantern(p: PixelCanvas, x: number, y: number, string = 0) {
  glow(p, x, y + 3, 11, 'z', 'Y', 0.9);
  for (let j = 1; j <= string; j++) p.set(x, y - j, 'd');
  p.set(x, y - 1, 'n'); p.set(x - 1, y, 'n'); p.set(x, y, 'n'); p.set(x + 1, y, 'n');
  p.rect(x - 2, y + 1, 5, 5, 'y'); p.rect(x - 1, y + 1, 3, 5, 'Y'); p.rect(x - 1, y + 2, 2, 3, 'z'); p.set(x, y + 3, '9');
  p.set(x - 2, y + 1, 'n'); p.set(x + 2, y + 1, 'n'); p.rect(x - 2, y + 6, 5, 1, 'n'); p.set(x, y + 7, 'n');
  p.set(x - 2, y + 4, 'O'); p.set(x + 2, y + 5, 'O');
}

function treehouse(p: PixelCanvas, r: () => number) {
  const py = 234; // platform top
  // support brace + branch under platform
  for (let i = 0; i < 26; i++) { p.set(560 - i, py + 4 + Math.round(i * 0.15), 'n'); p.set(560 - i, py + 5 + Math.round(i * 0.15), 'p'); }
  for (let i = 0; i < 16; i++) { p.set(562 - i, py + 22 - Math.round(i * 1.0), 'n'); p.set(563 - i, py + 22 - Math.round(i * 1.0), 'd'); p.set(561 - i, py + 22 - Math.round(i * 1.0), 'b'); }
  // platform planks
  for (let x = 490; x <= 562; x++) {
    p.set(x, py, x % 6 === 0 ? 'n' : 't'); p.set(x, py + 1, x % 6 === 0 ? 'p' : 'B'); p.set(x, py + 2, 'b'); p.set(x, py + 3, 'n'); p.set(x, py + 4, 'd');
  }
  // cabin
  const cx0 = 526, cx1 = 558, cTop = 208;
  for (let y = cTop; y < py; y++) for (let x = cx0; x <= cx1; x++) {
    const plank = (x - cx0) % 5 === 0;
    p.set(x, y, plank ? 'n' : ramp(['n', 'b', 'B', 't'], 0.78 - (x - cx0) / (cx1 - cx0) * 0.55 + (y - cTop) * 0.004, x, y));
  }
  // cabin roof: triangular green
  for (let y = 190; y < cTop + 3; y++) {
    const half = 3 + (y - 190) * 1.05;
    for (let x = Math.floor(542 - half); x <= 542 + half; x++) {
      const d = y - 190;
      let c = ramp(['f', 'F', 'G', 'h'], 0.55 + (542 - x) * 0.012 - d * 0.005, x, y);
      if (x <= 542 - half + 1.6) c = 'H';
      if (y >= cTop + 1) c = 'f';
      p.set(x, y, c);
    }
  }
  flower(p, 536, 200, 1, 'X', 'Z', 'T', 'Y'); flower(p, 548, 203, 1, 'N', 'A', 'M', 'Y'); flower(p, 541, 194, 1, 'Y', 'z', 'y', 'n');
  // round window (glowing) and small door
  p.ellipse(541, 220, 5.5, 5.5, 'n'); p.ellipse(541, 220, 4.4, 4.4, 'B');
  for (let y = 215; y <= 225; y++) for (let x = 536; x <= 546; x++) { const d = Math.hypot(x - 540.5, y - 219.5); if (d <= 3.8) p.set(x, y, ramp(['y', 'Y', 'z'], 0.3 + (1 - d / 4) * 0.8, x, y)); }
  p.hline(537, 545, 220, 'b'); p.vline(541, 216, 224, 'b'); p.set(539, 218, '9');
  glow(p, 541, 220, 12, 'z', 'Y', 0.55);
  p.ellipse(541, 220, 4.4, 4.4, 'B'); // re-frame after glow
  for (let y = 215; y <= 225; y++) for (let x = 536; x <= 546; x++) { const d = Math.hypot(x - 540.5, y - 219.5); if (d <= 3.8) p.set(x, y, ramp(['y', 'Y', 'z'], 0.3 + (1 - d / 4) * 0.8, x, y)); }
  p.hline(537, 545, 220, 'b'); p.vline(541, 216, 224, 'b'); p.set(539, 218, '9');
  // railing on the left part
  for (let x = 492; x <= 524; x += 8) { p.vline(x, py - 9, py - 1, 'B'); p.vline(x + 1, py - 9, py - 1, 'n'); }
  p.hline(492, 525, py - 9, 'B'); p.hline(492, 525, py - 8, 'n'); p.hline(492, 525, py - 4, 'b');
  // bunting from cabin roof to railing
  const bun = bez(492, py - 9, 508, py - 2, 528, 200, 24);
  bun.forEach(([x, y], i) => { p.set(x, y, 'd'); if (i % 3 === 1) { const c = ['Q', 'Y', 'J', 'N'][(i / 3 | 0) % 4]; p.set(x, y + 1, c); p.set(x + 1, y + 1, c); p.set(x, y + 2, c); } });
  // potted flower on platform, little watering can
  p.rect(503, py - 5, 5, 5, 'n'); p.hline(503, 507, py - 5, 'b'); p.set(504, py - 7, 'G'); p.set(505, py - 8, 'X'); p.set(506, py - 7, 'h'); p.set(505, py - 6, 'F'); p.set(507, py - 8, 'Z');
  // rope ladder to the ground
  {
    const lx = 514;
    for (let y = py + 5; y < 314; y++) {
      const sway = Math.round(Math.sin((y - py) * 0.05) * 1.4);
      p.set(lx + sway, y, 'B'); p.set(lx + 6 + sway, y, 'b');
      if ((y - py) % 5 === 0) for (let x = 1; x < 6; x++) p.set(lx + x + sway, y, x % 2 ? 'B' : 'n');
    }
    p.set(lx, py + 5, 'B'); p.set(lx + 6, py + 5, 'B');
  }
  // rope bridge to a stake on the left
  {
    const sx = 447, sy = 271;
    const top = bez(491, py - 4, 470, py + 22, sx, sy - 6, 40);
    const low = bez(491, py + 1, 470, py + 27, sx, sy, 40);
    top.forEach(([x, y]) => p.set(x, y, 'B')); low.forEach(([x, y]) => p.set(x, y, 'n'));
    for (let i = 1; i < 40; i++) {
      const [x, y] = top[i], [, y2] = low[i];
      if (i % 3 === 0) { p.vline(Math.round(x), Math.round(y), Math.round(y2), 'd'); p.set(x, y2 + 1, 'B'); p.set(x + 1, y2 + 1, 't'); }
      else p.set(x, y2 + 1, 'b');
    }
    // stake post with a lantern
    for (let y = sy - 12; y < 296; y++) { p.set(sx - 1, y, 'B'); p.set(sx, y, 'b'); p.set(sx + 1, y, 'n'); }
    p.set(sx - 1, sy - 13, 't'); p.set(sx, sy - 13, 'B'); p.set(sx + 1, sy - 13, 'b');
    lantern(p, sx + 5, sy - 16, 4);
    p.line(sx + 1, sy - 8, sx + 5, sy - 12, 'd');
  }
  void r;
}

export function drawTreeFront(p: PixelCanvas, r: () => number) {
  const rr = rng(77);
  drawTrunk(p);
  // big branch stubs into canopy behind foliage
  for (const [x0, y0, x1, y1, w] of [[560, 212, 512, 180, 6], [592, 205, 626, 166, 6], [566, 190, 520, 152, 5]] as const) {
    for (let i = 0; i <= 30; i++) {
      const x = x0 + (x1 - x0) * i / 30, y = y0 + (y1 - y0) * i / 30;
      for (let k = 0; k < w - Math.floor(i / 8); k++) p.set(x, y + k - 2, k === 0 ? 'B' : k >= w - 2 - Math.floor(i / 8) ? 'd' : 'b');
    }
  }
  const c = canopy(p, rr);
  treehouse(p, rr);
  // trunk over-branch: bark colour fringe where the canopy hangs down to the trunk
  // fruit in the lower canopy
  const fr: [number, number, 'red' | 'orange' | 'pink'][] = [[482, 176, 'red'], [498, 188, 'red'], [520, 150, 'orange'], [606, 196, 'red'], [622, 176, 'orange'], [546, 176, 'red'], [504, 130, 'pink'], [588, 160, 'orange'], [610, 130, 'red'], [472, 150, 'orange'], [560, 168, 'pink'], [630, 200, 'red']];
  for (const [x, y, k] of fr) if (c.inside(x, y)) fruit(p, x, y, k);
  // string of lanterns among branches
  lantern(p, 484, 190, 9); lantern(p, 508, 200, 11); lantern(p, 566, 196, 6); lantern(p, 604, 208, 8);
  lantern(p, 496, 212, 4); lantern(p, 528, 206, 3);
  // hanging vines with flowers under the canopy edge
  for (let x = 476; x < 640; x += 7 + Math.floor(rr() * 5)) {
    // find the lowest canopy pixel of this column near the bottom
    let yb = -1; for (let y = 215; y > 100; y--) if (p.opaque(x, y) && c.inside(x, y - 4)) { yb = y; break; }
    if (yb < 0) continue;
    if (x > 545 && x < 595) continue;
    const len = 6 + Math.floor(rr() * 16);
    for (let j = 0; j < len; j++) {
      const vx = x + Math.round(Math.sin(j * 0.5 + x) * 0.8);
      p.set(vx, yb + j, j % 4 === 3 ? 'h' : j < 3 ? 'F' : 'G');
      if (j % 4 === 1) { p.set(vx - 1, yb + j + 1, 'F'); p.set(vx + 1, yb + j, 'G'); }
    }
    const fx = x, fy = yb + len;
    flower(p, fx, fy, 1, rr() < 0.5 ? 'X' : 'N', rr() < 0.5 ? 'Z' : 'A', 'T', 'Y');
  }
  void r; void bay; void tuft; void GROUND_Y;
}

export function drawFenceAndSunflowers(p: PixelCanvas, r: () => number) {
  const rr = rng(99);
  // ---- beehives (two stacked hive boxes on a small stand) ----
  const hive = (x: number, y: number) => {
    for (let k = 0; k < 3; k++) {
      const yy = y - k * 6;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 12; i++) {
        let c = 'Y';
        if (i < 2) c = 'z'; else if (i > 8) c = 'y';
        if (j === 0) c = 'B'; if (j === 5) c = i > 8 ? 'n' : 'O';
        p.set(x + i, yy + j, c);
      }
    }
    p.rect(x + 4, y + 3, 4, 2, 'p'); p.set(x + 5, y + 2, 'd');
    p.rect(x - 2, y - 18, 16, 2, 'b'); p.hline(x - 2, x + 13, y - 18, 'B'); p.hline(x - 1, x + 12, y - 16, 'n'); p.hline(x + 1, x + 10, y - 19, 'B');
    p.rect(x, y + 6, 2, 4, 'n'); p.rect(x + 10, y + 6, 2, 4, 'n'); p.hline(x - 1, x + 12, y + 6, 'd');
  };
  hive(444, 302);
  // bees around the hive
  const bee = (x: number, y: number) => { p.set(x, y, 'Y'); p.set(x + 1, y, '0'); p.set(x + 2, y, 'Y'); p.set(x + 1, y - 1, '9'); p.set(x, y - 1, 'a'); };
  bee(462, 296); bee(438, 290); bee(458, 284); bee(468, 306);

  // ---- fence / bean trellis converging toward the vanishing point ----
  const posts: number[] = [];
  for (let i = 0; i < 9; i++) posts.push(Math.round(468 + Math.pow(i / 8, 0.8) * 76));
  const base = (x: number) => 298 + (x - 430) * 0.15;
  const ph = (x: number) => 15 + (x - 430) * 0.13;
  // rails first
  for (let x = 466; x <= 546; x++) {
    for (const f of [0.3, 0.65]) { const y = Math.round(base(x) - ph(x) * f); p.set(x, y, 'B'); p.set(x, y + 1, 'n'); }
  }
  for (const x of posts) {
    const b = Math.round(base(x)), h = Math.round(ph(x));
    for (let y = b - h; y <= b; y++) { p.set(x, y, 'B'); p.set(x + 1, y, 'b'); p.set(x + 2, y, 'n'); }
    p.set(x, b - h - 1, 't'); p.set(x + 1, b - h - 1, 'B'); p.set(x + 2, b - h - 1, 'b');
    // trellis pole: bean vine spiral
    let vx = x + 1;
    for (let y = b; y > b - h - 6; y--) {
      vx = x + 1 + Math.round(Math.sin((b - y) * 0.6) * 2);
      p.set(vx, y, (b - y) % 5 < 2 ? 'h' : 'G');
      if ((b - y) % 6 === 3) { p.set(vx + 2, y, 'F'); p.set(vx + 3, y - 1, 'G'); p.set(vx + 3, y, 'h'); p.set(vx - 2, y + 1, 'F'); }
      if ((b - y) % 9 === 4) { p.set(vx, y + 1, 'X'); p.set(vx + 1, y + 1, 'Z'); }
      if ((b - y) % 11 === 7) { p.set(vx - 1, y, 'F'); p.set(vx - 1, y + 1, 'G'); p.set(vx - 1, y + 2, 'G'); p.set(vx - 1, y + 3, 'F'); }
    }
    // stake grass
    tuft(p, x + 1, b + 2, 3, rr);
  }

  // ---- sunflowers taller than a person ----
  const sun = (x: number, top: number, rad: number, tilt: number) => {
    // stem
    for (let y = top + rad; y < 322; y++) { p.set(x, y, 'G'); p.set(x + 1, y, 'F'); p.set(x + 2, y, 'f'); }
    // leaves
    for (let k = 0; k < 4; k++) {
      const ly = top + rad + 12 + k * 14;
      leaf(p, x + 1, ly, k % 2 ? -0.3 : Math.PI + 0.3, 12 - k, 6, ['f', 'F', 'G', 'h'], k % 2 ? -0.2 : 0.2);
    }
    // petals ring
    for (let a = 0; a < 26; a++) {
      const ang = a / 26 * Math.PI * 2;
      for (let s = rad - 3; s <= rad + 2; s++) {
        const x2 = x + 1 + Math.cos(ang) * s * (1 - tilt * 0.15), y2 = top + rad + Math.sin(ang) * s * 0.92;
        const lit = -Math.cos(ang) * 0.6 - Math.sin(ang) * 0.6;
        p.set(x2, y2, s === rad + 2 ? 'y' : lit > 0.35 ? 'z' : lit > -0.1 ? 'Y' : 'y');
      }
    }
    // disc
    for (let j = -rad + 3; j <= rad - 3; j++) for (let i = -rad + 3; i <= rad - 3; i++) {
      const d = Math.hypot(i, j) / (rad - 3); if (d > 1) continue;
      const lit = (-i - j) / (rad * 1.2);
      p.set(x + 1 + i, top + rad + j, ramp(['p', 'd', 'n', 'b'], 0.4 + lit * 0.4 + (d < 0.35 ? 0 : 0.06 * ((i + j) & 1)), i + 20, j + 20));
    }
    p.set(x - rad + 5, top + 3, 'B');
  };
  sun(606, 244, 8, 0); sun(621, 232, 9, 0);
  sun(631, 262, 6, 0);
  // bee on the sunflower
  bee(603, 232);
  void r;
}
