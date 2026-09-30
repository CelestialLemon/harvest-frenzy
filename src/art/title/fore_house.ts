// LEFT hero: cosy solarpunk farmhouse + greenhouse annex, barrel, bike, beds, turbine, laundry.
import { PixelCanvas, ramp, bay } from './kit';
import { blob, flower, leaf, glow, thick, bez, dth, tuft } from './fore_util';

const WALL = ['6', 'A', '&', 'z'];
const WOOD = ['d', 'n', 'b', 'B', 't'];
const GREEN = ['f', 'F', 'G', 'h', 'H'];

/** angled solar panel (parallelogram rising to the right by `slant`) */
export function panel(p: PixelCanvas, x: number, y: number, w: number, h: number, slant: number) {
  const topAt = (i: number) => Math.round(y - (slant * i) / (w - 1));
  // legs
  for (let i = 0; i < w; i++) {
    const t = topAt(i);
    for (let j = 0; j < h; j++) {
      const yy = t + j;
      let c = 'U';
      const cell = (i % 6 === 5) || (j % 5 === 4);
      if (cell) c = 'u';
      // diagonal sheen streak
      const d = (i * 0.9 - j * 1.6 + 40) % 22;
      if (!cell && d < 2.2) c = d < 1 ? 'a' : 'W';
      else if (!cell && j < h / 2 && i < w * 0.65) c = (i + j) % 7 === 0 ? 'w' : 'w';
      else if (!cell && j >= h / 2) c = 'U';
      if (j === 0) c = 'a'; // rim light on the top edge
      if (j === h - 1) c = '2';
      if (i === 0) c = j === 0 ? '9' : '7';
      if (i === w - 1) c = '2';
      p.set(x + i, yy, c);
    }
  }
  p.set(x + 1, topAt(1), '9');
}

function wallT(x: number, y: number, x0: number, x1: number, yTop: number) {
  let t = 0.78 - ((x - x0) / (x1 - x0)) * 0.42;
  t -= Math.max(0, 7 - (y - yTop)) * 0.06; // eave shadow
  return t;
}

function turbine(p: PixelCanvas, hx: number, hy: number, baseY: number, ang: number) {
  // mast (tapered, rim lit)
  for (let y = hy; y < baseY; y++) { p.set(hx, y, '9'); p.set(hx + 1, y, '8'); if (y > hy + 6) p.set(hx + 2, y, '7'); }
  // blades
  for (let k = 0; k < 3; k++) {
    const a = ang + k * 2.0944;
    for (let s = 2; s <= 15; s++) {
      const bx = hx + 0.5 + Math.cos(a) * s, by = hy + 0.5 + Math.sin(a) * s;
      const wd = s < 7 ? 1.4 : 1.0;
      p.set(bx, by, s > 12 ? '8' : '9');
      if (wd > 1.2) p.set(bx + 0.9 * -Math.sin(a), by + 0.9 * Math.cos(a), '7');
    }
  }
  p.set(hx, hy, '7'); p.set(hx + 1, hy, '8'); p.set(hx, hy - 1, '9'); p.set(hx + 1, hy - 1, '9'); p.set(hx, hy + 1, '6'); p.set(hx + 1, hy + 1, '6');
}

function roundWindow(p: PixelCanvas, cx: number, cy: number, rad: number) {
  // frame
  p.ellipse(cx, cy, rad + 1.6, rad + 1.6, 'n');
  p.ellipse(cx, cy, rad + 0.6, rad + 0.6, 'B');
  for (let y = cy - rad - 1; y <= cy + rad + 1; y++) for (let x = cx - rad - 1; x <= cx + rad + 1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > rad) continue;
    const t = 1 - d / rad;
    p.set(x, y, ramp(['y', 'Y', 'z'], 0.25 + t * 0.85, x, y));
  }
  // mullions
  for (let i = -rad; i <= rad; i++) { p.set(cx + i, cy, 'b'); p.set(cx, cy + i, 'b'); }
  p.set(cx - 1, cy - 1, '9'); p.set(cx - rad + 1, cy - 1, 'z');
  // sill flowers
  p.set(cx - 1, cy + rad + 2, 'n'); p.set(cx, cy + rad + 2, 'n'); p.set(cx + 1, cy + rad + 2, 'n');
  p.set(cx - 1, cy + rad + 1, 'X'); p.set(cx + 1, cy + rad + 1, 'N'); p.set(cx, cy + rad + 1, 'Y');
}

function hangingPlanter(p: PixelCanvas, x: number, y: number, len: number, r: () => number, col: [string, string, string]) {
  p.line(x - 2, y, x - 1, y + len, 'n'); p.line(x + 3, y, x + 2, y + len, 'n');
  // pot
  p.rect(x - 2, y + len, 6, 4, 'b'); p.rect(x - 2, y + len, 6, 1, 'B'); p.rect(x + 2, y + len + 1, 2, 3, 'n'); p.rect(x - 2, y + len + 3, 6, 1, 'n');
  // foliage + flowers
  for (let i = -3; i <= 4; i++) { p.set(x + i, y + len - 1, i < 0 ? 'G' : 'F'); if (i % 2 === 0) p.set(x + i, y + len - 2, 'h'); }
  flower(p, x, y + len - 3, 1, col[0], col[1], col[2], 'Y'); flower(p, x + 3, y + len - 2, 1, col[0], col[1], col[2], 'Y');
  for (let i = 0; i < 3; i++) { const vx = x - 2 + i * 3, vl = 4 + Math.floor(r() * 6); for (let j = 0; j < vl; j++) p.set(vx + (j % 3 === 2 ? 1 : 0), y + len + 4 + j, j % 4 === 3 ? 'h' : j > 3 ? 'F' : 'G'); p.set(vx, y + len + 3 + vl, col[0]); }
}

export function drawHouse(p: PixelCanvas, r: () => number) {
  // ---- cast shadows on the lawn (fall right and down) ----
  for (let y = 302; y < 322; y++) for (let x = 6; x < 176; x++) {
    const edge = 116 - (y - 302) * -1.6;
    const inside = x > 18 && x < 130 + (y - 302) * 2.2;
    if (!inside) continue;
    const dpt = 0.85 - (y - 302) * 0.03;
    if (dth(x, y, dpt)) p.set(x, y, y > 314 ? 'F' : 'f');
  }

  // ---- background props: turbine + solar sunflower tree ----
  turbine(p, 30, 214, 258, 0.35);
  // solar sunflower tree
  {
    const sx = 178, base = 302;
    for (let y = 244; y < base; y++) { p.set(sx, y, y % 9 === 0 ? 'c' : '2'); p.set(sx + 1, y, 'c'); }
    // curved branches with discs
    const disc = (cx: number, cy: number, rad: number) => {
      for (let y = -rad; y <= rad; y++) for (let x = -rad - 1; x <= rad + 1; x++) {
        if ((x / (rad + 1.2)) ** 2 + (y / (rad * 0.62)) ** 2 > 1) continue;
        const l = x - y * 0.6;
        p.set(cx + x, cy + y, l < -rad * 0.8 ? 'a' : l < 0 ? 'W' : l < rad * 0.7 ? 'w' : 'U');
      }
      p.set(cx - 1, cy - 1, '9'); p.set(cx, cy, 'u');
      for (let x = -rad; x <= rad; x += 2) p.set(cx + x, cy + Math.round(rad * 0.6), '2');
    };
    disc(178, 240, 7);
    for (const [bx, by, dx] of [[178, 268, -11], [178, 276, 10]] as const) {
      for (const [x, y] of bez(178, by + 6, 178 + dx * 0.4, by - 4, 178 + dx, by - 12, 12)) p.set(x, y, 'c');
      disc(178 + dx, by - 15, 5);
    }
    p.set(178, 244, 'c'); p.set(177, 244, '2');
  }

  // ---- greenhouse annex (arched glass) ----
  {
    const ax0 = 116, ax1 = 168, base = 312;
    const topAt = (x: number) => 268 + Math.pow((x - (ax0 + ax1) / 2) / ((ax1 - ax0) / 2), 2) * 16;
    for (let x = ax0; x <= ax1; x++) {
      const t0 = Math.round(topAt(x));
      for (let y = t0; y < base; y++) {
        const d = y - t0;
        const gx = (x - ax0) % 9, gy = (y - 268) % 11;
        let c: string;
        const lit = 1 - (x - ax0) / (ax1 - ax0);
        c = ramp(['i', 'I', 'j', 'J'], 0.25 + lit * 0.4 + (1 - d / 40) * 0.25, x, y);
        // sky reflection gradient + streak
        if ((x + y * 0.7) % 17 < 2) c = 'v';
        // plants inside
        if (y > base - 14 && ((x * 7 + y) % 11 < 6) && d > 4) c = ((x >> 1) + y) % 3 === 0 ? 'h' : 'G';
        if (y > base - 6 && ((x * 5) % 9 < 3)) c = 'Q';
        if (gx === 0 || (gy === 0)) c = 'b';
        if (gx === 0 && x % 18 === 0) c = 'B';
        if (d < 2) c = d === 0 ? 'z' : 'B';
        if (x === ax0) c = 'B'; if (x === ax1) c = 'n';
        p.set(x, y, c);
      }
    }
    // base sill + ribs highlight
    p.rect(ax0 - 1, base - 3, ax1 - ax0 + 3, 3, 'n'); p.hline(ax0 - 1, ax1 + 1, base - 3, 'B');
    // wooden ridge cap vines
    for (let x = ax0; x <= ax1; x += 5) { const t = Math.round(topAt(x)); p.set(x, t - 1, 'G'); p.set(x + 1, t - 1, 'h'); p.set(x + 1, t - 2, 'H'); }
    // solar panel on its top
    panel(p, 122, 262, 20, 8, 7);
    panel(p, 144, 258, 20, 8, 5);
    for (const lx of [126, 132, 148, 156]) { p.set(lx, 271, 'c'); p.set(lx, 270, '2'); }
  }

  // ---- main house wall ----
  const wx0 = 22, wx1 = 114, wtop = 262, wbase = 308;
  for (let y = wtop; y < wbase; y++) for (let x = wx0; x <= wx1; x++) {
    // curved corners
    const cx = x < wx0 + 4 ? wx0 + 4 - x : x > wx1 - 4 ? x - (wx1 - 4) : 0;
    if (y > wbase - 3 && cx > 0) continue;
    p.set(x, y, ramp(WALL, Math.max(0, Math.min(1, wallT(x, y, wx0, wx1, wtop) + 0.06 * Math.sin(y * 0.6 + x * 0.1))), x, y));
  }
  // stone footing
  for (let x = wx0; x <= wx1; x++) for (let y = wbase - 4; y < wbase; y++) p.set(x, y, ((x + (y & 1) * 3) % 6 < 5) ? (y === wbase - 4 ? 'x' : (x < 60 ? 'S' : 's')) : 'C');
  // wooden beams
  const beamX = [wx0, 42, 74, wx1 - 1];
  for (const bx of beamX) for (let y = wtop; y < wbase - 4; y++) { p.set(bx, y, 'B'); p.set(bx + 1, y, 'b'); p.set(bx + 2, y, 'n'); }
  for (let x = wx0; x <= wx1; x++) { p.set(x, wtop + 6, 'b'); p.set(x, wtop + 7, 'n'); p.set(x, wtop + 5, 'B'); }
  // diagonal brace
  for (let i = 0; i < 12; i++) { p.set(42 + 3 + i, wbase - 5 - i, 'b'); p.set(42 + 4 + i, wbase - 5 - i, 'n'); }

  // windows
  roundWindow(p, 33, 286, 5);
  roundWindow(p, 88, 286, 5);
  // arched door
  {
    const dx = 52, dw = 14, dtop = 279;
    for (let y = dtop; y < wbase - 3; y++) for (let x = dx; x < dx + dw; x++) {
      const arch = y < dtop + 7 ? Math.abs(x + 0.5 - (dx + dw / 2)) > Math.sqrt(Math.max(0, 49 - (dtop + 7 - y) ** 2)) : false;
      if (arch) continue;
      const plank = (x - dx) % 4 === 0;
      p.set(x, y, ramp(['n', 'b', 'B'], 0.65 - (x - dx) * 0.03 - (plank ? 0.35 : 0), x, y));
    }
    p.set(dx + 10, 293, 'Y'); p.set(dx + 10, 294, 'y');
    // step + lantern
    p.rect(dx - 1, wbase - 3, dw + 2, 3, '7'); p.hline(dx - 1, dx + dw, wbase - 3, '8');
    p.set(dx + dw + 3, 280, 'n'); p.set(dx + dw + 3, 281, 'Y'); p.set(dx + dw + 3, 282, 'z'); p.set(dx + dw + 3, 283, 'y');
    glow(p, dx + dw + 3, 282, 7, 'z', null, 0.7);
    p.set(dx + dw + 3, 281, 'z'); p.set(dx + dw + 3, 282, '9');
  }

  // ---- thick green roof ----
  {
    const rx0 = 10, rx1 = 126;
    const top = (x: number) => 236 + Math.pow((x - 66) / 56, 2) * 22;
    const bot = (x: number) => 268 + (Math.abs(x - 68) > 52 ? (Math.abs(x - 68) - 52) * -0.5 : 0);
    for (let x = rx0; x <= rx1; x++) {
      const t0 = Math.round(top(x)), b0 = Math.round(bot(x));
      for (let y = t0; y < b0; y++) {
        const d = y - t0, e = b0 - y;
        let c: string;
        if (d < 2) c = ramp(['G', 'h', 'H', 'z'], 0.55 + (1 - (x - rx0) / (rx1 - rx0)) * 0.35 - d * 0.25, x, y);
        else if (e <= 3) c = e === 1 ? 'i' : e === 2 ? 'f' : 'C';
        else c = ramp(GREEN, 0.4 + (1 - (x - rx0) / (rx1 - rx0)) * 0.3 - d * 0.03 + 0.12 * Math.sin(x * 0.5 + y * 0.9), x, y);
        p.set(x, y, c);
      }
      // scalloped grassy lower fringe: drooping tufts
      if (x % 3 === 0) { p.set(x, b0, 'F'); if (x % 6 === 0) p.set(x, b0 + 1, 'G'); }
    }
    // dark eave underside line + wood fascia
    for (let x = rx0 + 2; x <= rx1 - 2; x++) { const b0 = Math.round(bot(x)); p.set(x, b0 + 1, 'p'); p.set(x, b0 + 2, x % 2 ? 'E' : 'p'); }
    // roof flowers (clusters) and small shrubs
    const cols: [string, string, string, string][] = [['X', 'Z', 'T', 'Y'], ['N', 'A', 'M', 'Y'], ['Y', 'z', 'y', 'n'], ['9', '9', '8', 'Y']];
    for (let i = 0; i < 26; i++) {
      const x = Math.round(rx0 + 5 + r() * (rx1 - rx0 - 10));
      const y = Math.round(top(x) + 3 + r() * 6);
      const k = Math.floor(r() * 4);
      flower(p, x, y, r() < 0.4 ? 2 : 1, cols[k][0], cols[k][1], cols[k][2], cols[k][3]);
    }
    // little grass tufts along the crest
    for (let x = rx0 + 3; x < rx1 - 2; x += 4) { const y = Math.round(top(x)); p.set(x, y - 1, 'h'); p.set(x + 1, y - 2, 'H'); p.set(x - 1, y - 1, 'G'); }
    // hanging vines from the eave
    for (let i = 0; i < 9; i++) {
      const vx = rx0 + 6 + Math.round(i * 12.5 + r() * 6), vy = Math.round(bot(vx)) + 2, vl = 3 + Math.floor(r() * 8);
      if (vx > 64 && vx < 76) continue;
      for (let j = 0; j < vl; j++) p.set(vx + (j % 4 === 3 ? 1 : 0), vy + j, j < 2 ? 'F' : j % 3 === 0 ? 'h' : 'G');
      if (i % 3 === 1) { p.set(vx, vy + vl, 'Z'); p.set(vx + 1, vy + vl, 'X'); }
    }
    // solar panels on the ridge
    panel(p, 70, 232, 20, 9, 5);
    panel(p, 92, 234, 20, 9, 4);
    for (const lx of [74, 82, 97, 106]) { p.set(lx, 241 + (lx > 90 ? 2 : 0), 'c'); p.set(lx, 242 + (lx > 90 ? 2 : 0), '2'); }
    // little dormer vent window + chimney-less skylight glass (teal dome)
    for (let y = 0; y < 8; y++) for (let x = 0; x < 15; x++) {
      const nx = (x - 7) / 7.4, ny = (y - 7.5) / 7.8; if (nx * nx + ny * ny > 1) continue;
      p.set(28 + x, 236 + y + 4, ramp(['I', 'j', 'J', 'v'], 0.75 - nx * 0.3 - ny * 0.4, x, y));
    }
    p.ring(35.5, 247.5, 7.5, 7.8, 'B'); p.set(32, 243, '9'); p.set(33, 242, 'v');
  }

  // hanging planters below the eave
  hangingPlanter(p, 30, 270, 4, r, ['X', 'Z', 'T']);
  hangingPlanter(p, 60, 270, 3, r, ['N', 'A', 'M']);
  hangingPlanter(p, 104, 270, 4, r, ['Y', 'z', 'y']);

  // ---- rain barrel with downspout ----
  {
    const bx = 8, by = 288, bw = 14, bh = 20;
    // downspout from the eave
    for (let y = 268; y < by; y++) { p.set(21, y, '7'); p.set(22, y, '6'); }
    p.set(21, by - 1, '8'); p.set(20, by, '7'); p.set(19, by, '7');
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const nx = (x + 0.5 - bw / 2) / (bw / 2); const bulge = 1 - Math.pow(Math.abs(y - bh / 2) / (bh / 2), 3) * 0.12;
      if (Math.abs(nx) > bulge) continue;
      let t = 0.75 - (nx + 1) * 0.36;
      let c = ramp(['n', 'b', 'B', 't'], t, x, y);
      if (y === 4 || y === bh - 5 || y === 0 || y === bh - 1) c = ramp(['2', '6', '7', '8'], t, x, y);
      p.set(bx + x, by + y, c);
    }
    // water lip + rim highlight
    p.rect(bx, by - 1, bw, 2, '6'); p.hline(bx + 1, bx + bw - 2, by - 1, '8'); p.hline(bx + 2, bx + bw - 3, by, 'a');
    p.set(bx + 2, by - 1, '9');
  }

  // ---- bicycle leaning on the wall ----
  {
    const cx0 = 98, cy0 = 300;
    const wheel = (cx: number, cy: number) => {
      p.ring(cx, cy, 6.5, 6.5, 'c');
      p.set(cx - 5, cy - 4, '2'); p.set(cx - 4, cy - 5, '2');
      for (let a = 0; a < 6; a++) { p.set(cx + Math.round(Math.cos(a * 1.047) * 3), cy + Math.round(Math.sin(a * 1.047) * 3), '6'); }
      p.set(cx, cy, 'Y');
    };
    wheel(cx0 - 6, cy0 + 1); wheel(cx0 + 10, cy0 + 1);
    // frame in red-orange
    p.line(cx0 - 6, cy0 + 1, cx0, cy0 - 5, 'Q'); p.line(cx0, cy0 - 5, cx0 + 8, cy0 - 5, 'e'); p.line(cx0 + 8, cy0 - 5, cx0 + 10, cy0 + 1, 'Q');
    p.line(cx0 - 6, cy0 + 1, cx0 + 2, cy0 + 1, 'R'); p.line(cx0 + 2, cy0 + 1, cx0, cy0 - 5, 'Q'); p.line(cx0 + 2, cy0 + 1, cx0 + 8, cy0 - 5, 'R');
    p.hline(cx0 - 3, cx0 - 1, cy0 - 7, 'c'); p.set(cx0, cy0 - 6, 'R');
    p.line(cx0 + 8, cy0 - 5, cx0 + 7, cy0 - 8, '2'); p.hline(cx0 + 5, cx0 + 8, cy0 - 9, 'c');
    // basket with flowers
    p.rect(cx0 + 10, cy0 - 7, 5, 3, 'B'); p.set(cx0 + 11, cy0 - 8, 'X'); p.set(cx0 + 13, cy0 - 8, 'Y'); p.set(cx0 + 12, cy0 - 9, 'N'); p.set(cx0 + 14, cy0 - 8, 'G');
  }
}

export function drawBeds(p: PixelCanvas, r: () => number) {
  const bed = (x0: number, x1: number, y0: number, kind: number) => {
    // soil top surface + wooden front planks
    for (let x = x0; x <= x1; x++) {
      p.set(x, y0 + 5, 'd'); p.set(x, y0 + 6, x % 2 ? 'd' : 'n');
      for (let j = 7; j < 13; j++) {
        const plank = j === 10;
        p.set(x, y0 + j, plank ? 'n' : ramp(['n', 'b', 'B'], 0.7 - (x - x0) / (x1 - x0) * 0.35 - (j > 10 ? 0.15 : 0), x, y0 + j));
      }
      p.set(x, y0 + 7, 'B');
    }
    for (let j = 5; j < 13; j++) { p.set(x0, y0 + j, 'B'); p.set(x1, y0 + j, 'n'); }
    // plants
    for (let x = x0 + 3; x < x1 - 2; x += 6) {
      const py = y0 + 3 + (x % 3);
      if (kind === 0) { // cabbages / lettuce
        blob(p, x + 1, py, 3.4, 3, ['F', 'G', 'h', 'H'], 0.05);
        p.set(x, py - 1, 'z');
      } else if (kind === 1) { // tomato stakes
        p.line(x, y0 + 5, x, y0 - 9, 'B'); p.line(x + 1, y0 + 5, x + 1, y0 - 8, 'n');
        for (let j = 0; j < 4; j++) { leaf(p, x - 3, y0 - 6 + j * 3, 0.2 + j * 0.05, 4, 3, ['F', 'G', 'h']); leaf(p, x + 2, y0 - 5 + j * 3, 3.0 - j * 0.05, 4, 3, ['F', 'G', 'h']); }
        p.set(x - 1, y0 - 2, 'Q'); p.set(x - 2, y0 - 2, 'e'); p.set(x - 1, y0 - 1, 'R'); p.set(x + 3, y0 - 4, 'Q'); p.set(x + 3, y0 - 3, 'R'); p.set(x + 2, y0 - 4, 'o');
      } else { // carrot tops + sprouts
        for (let k = -1; k <= 1; k++) leaf(p, x + 1, y0 + 5, -1.57 + k * 0.5, 7, 2.6, ['F', 'G', 'h']);
        p.set(x + 1, y0 + 5, 'O'); p.set(x, y0 + 5, 'y');
      }
    }
  };
  bed(26, 62, 309, 0);
  bed(70, 108, 309, 1);
  // small watering can beside the beds
  const cx = 116, cy = 316;
  p.rect(cx, cy, 6, 5, '6'); p.hline(cx, cx + 5, cy, '8'); p.rect(cx + 6, cy + 1, 1, 1, '7'); p.line(cx + 6, cy + 1, cx + 9, cy - 2, '7'); p.set(cx - 1, cy + 1, '7'); p.set(cx - 1, cy + 3, '7'); p.set(cx - 2, cy + 2, '7');
  p.hline(cx, cx + 5, cy + 4, '2');
  void bay; void thick; void tuft;
}
