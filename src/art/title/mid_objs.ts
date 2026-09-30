// Midground props: solarpunk buildings, bridge, boat, turbines, solar farm, cable-car.
import { PixelCanvas, ramp, bay } from './kit';
import { hash, shadow } from './mid_util';
import { parseColor } from '../pixel';

type RoofKind = 'green' | 'solar' | 'terra';
type BodyKind = 'cream' | 'terra';

/** Half-ellipse cap painted with a lit ramp; returns nothing. Local canvas so the outline hugs it. */
function cap(p: PixelCanvas, cx: number, by: number, rx: number, ry: number, cols: string[], ol: string | null, seed: number, flowersOn: boolean, dith = true) {
  const w = Math.ceil(rx * 2) + 6, h = Math.ceil(ry) + 6;
  const t = new PixelCanvas(w, h);
  const c0 = w / 2, base = h - 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - c0) / (rx + 0.01), ny = (y + 0.5 - base) / (ry + 0.01);
    if (ny > 0 || nx * nx + ny * ny > 1) continue;
    const L = 0.55 - 0.45 * nx + 0.55 * ny * -0.6 + 0.4 * ny * 0.0;
    const LL = Math.min(1, Math.max(0, L + 0.25 * (-ny)));
    t.set(x, y, dith ? ramp(cols, LL, x, y) : cols[Math.min(cols.length - 1, Math.floor(LL * cols.length))]);
  }
  if (flowersOn) {
    const fc = ['Z', '9', 'Y', '#', 'A'];
    for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) if (t.opaque(x, y) && t.opaque(x, y + 1) && hash(x, y, seed) < 0.1) {
      const c = fc[Math.floor(hash(x, y, seed + 1) * fc.length)];
      t.set(x, y, c); if (hash(x, y, seed + 2) < 0.35 && t.opaque(x + 1, y)) t.set(x + 1, y, c);
    }
  }
  if (ol) t.outline(ol);
  p.blit(t, Math.round(cx - c0), Math.round(by - base));
}

/** A curved cream/terracotta house with a green, solar or terracotta roof. (x,y) = bottom centre. */
export function house(p: PixelCanvas, x: number, y: number, w: number, body: BodyKind, roof: RoofKind, seed: number, near: boolean) {
  const h = Math.max(4, Math.round(w * 0.55));
  const r = Math.max(2, Math.round(w * 0.28));
  const bc = body === 'cream' ? { base: '&', hi: '9', sh: '%', ol: 'n' } : { base: 'b', hi: 'B', sh: 'n', ol: 'm' };
  shadow(p, x + w * 0.65, y + 1, w * 0.7, Math.max(1.5, w * 0.12));
  // body mask with rounded shoulders
  const m = new PixelCanvas(w, h);
  for (let j = 0; j < h; j++) {
    let inset = 0;
    if (j < r) inset = Math.round(r - Math.sqrt(Math.max(0, r * r - (r - j - 0.5) * (r - j - 0.5))));
    for (let i = inset; i < w - inset; i++) m.set(i, j, '9');
  }
  const ox = Math.round(x - w / 2), oy = y - h;
  const o = (a: number, b: number) => m.opaque(a, b);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!o(i, j)) continue;
    let c = bc.base;
    if (near ? (!o(i + 1, j) || !o(i + 2, j) && w > 12) : !o(i + 1, j)) c = bc.sh;
    else if (!o(i - 1, j)) c = bc.hi;
    if (j === h - 1) c = bc.sh;
    p.set(ox + i, oy + j, c);
  }
  if (near) m.outline; // (outline drawn below to keep roof overlap clean)
  if (near) {
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (o(i, j)) continue;
      if (j > 3 && (o(i - 1, j) || o(i + 1, j) || o(i, j + 1)) || (j >= h - 0 && o(i, j - 1))) p.set(ox + i, oy + j, bc.ol);
    }
  }
  // door + windows
  const dx = ox + Math.round(w * 0.3);
  if (w >= 9) {
    p.rect(dx, y - Math.min(4, h - 2), 2, Math.min(4, h - 2), 'd');
    p.set(dx, y - Math.min(4, h - 2), 'n');
    const wx = ox + Math.round(w * 0.62);
    p.rect(wx, oy + Math.round(h * 0.42), 2, 2, 'Y');
    p.set(wx, oy + Math.round(h * 0.42), 'z');
    if (w >= 14) { p.rect(ox + Math.round(w * 0.12), oy + Math.round(h * 0.42), 2, 2, 'a'); p.set(ox + Math.round(w * 0.12), oy + Math.round(h * 0.42), '9'); }
  } else {
    p.set(ox + Math.round(w * 0.5), y - 2, 'd');
  }
  // roof
  const rx = w / 2 + (w >= 12 ? 2 : 1), ry = Math.max(2.5, w * 0.34);
  const ry0 = oy + 1;
  if (roof === 'green') {
    cap(p, x, ry0, rx, ry, ['f', 'F', 'G', 'h'], (near || w >= 11) ? 'f' : null, seed, w >= 9);
    // hanging lip shadow
    if (w >= 10) for (let i = -Math.floor(rx) + 1; i < rx - 1; i++) shiftDown(p, Math.round(x + i), ry0 + 1);
  } else if (roof === 'solar') {
    cap(p, x, ry0, rx, ry, ['u', 'U', 'w', 'w', 'w'], near ? 'u' : null, seed, false, false);
    // sheen diagonals (panel cell lines) on the lit blue faces
    const wv = parseColor('w');
    for (let j = 0; j < ry + 1; j++) for (let i = -Math.ceil(rx); i <= rx; i++) {
      const px = Math.round(x + i), py = ry0 - j;
      if (p.get(px, py) === wv && (px + py * 2 + 200) % 6 === 0) p.set(px, py, 'W');
    }
    if (w >= 10) { p.set(Math.round(x - rx * 0.45), Math.round(ry0 - ry * 0.65), 'a'); }
  } else {
    cap(p, x, ry0, rx, ry, ['n', 'b', 'B', 'B'], near ? 'm' : null, seed, false, false);
  }
  // wood beam under roof
  if (w >= 12) p.hline(ox + 1, ox + w - 2, oy + 2, 'b');
}
function shiftDown(p: PixelCanvas, x: number, y: number) {
  if (p.opaque(x, y)) p.set(x, y, p.get(x, y) === p.get(x, y - 1) ? 'A' : 'A');
}

/** Teal glass dome with ribs and glints. */
export function dome(p: PixelCanvas, x: number, y: number, r: number, near: boolean) {
  shadow(p, x + r * 0.9, y + 1, r * 1.1, Math.max(1.5, r * 0.22));
  const w = r * 2 + 6, h = r + 6;
  const t = new PixelCanvas(w, h);
  const cx = w / 2, by = h - 3;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const nx = (i + 0.5 - cx) / (r + 0.01), ny = (j + 0.5 - by) / (r * 0.9 + 0.01);
    if (ny > 0 || nx * nx + ny * ny > 1) continue;
    const L = 0.5 - 0.5 * nx - 0.5 * ny * 0.6 + 0.15;
    let c = ramp(['I', 'j', 'J', 'v'], Math.min(1, Math.max(0, L)), i, j);
    if (r >= 6) {
      // ribs: meridian arcs
      for (const f of [-0.55, 0, 0.55]) if (Math.abs(nx - f * Math.sqrt(Math.max(0, 1 + ny * ny * 0)) * (1 + ny * 0.0)) < 0.09 && ny < -0.05) c = nx < 0 ? 'v' : 'j';
      if (Math.abs(ny + 0.45) < 0.07) c = 'v';
    }
    t.set(i, j, c);
  }
  if (r >= 4) t.set(Math.round(cx - r * 0.45), Math.round(by - r * 0.62), '9');
  // green plants at the foot
  for (let i = 0; i < w; i++) if (t.opaque(i, by - 1)) t.set(i, by - 1, (i & 1) ? 'G' : 'F');
  if (near) t.outline('i');
  p.blit(t, Math.round(x - cx), Math.round(y - by));
  p.hline(Math.round(x - r - (near ? 1 : 0)), Math.round(x + r - 1 + (near ? 1 : 0)), y, near ? 'S' : 'x');
}

/** Communal greenhouse: barrel-vault glass over green beds. */
export function greenhouse(p: PixelCanvas, x: number, y: number, w: number, h: number) {
  shadow(p, x + w * 0.7, y + 1, w * 0.62, 2);
  const ox = Math.round(x - w / 2);
  const t = new PixelCanvas(w + 6, h + 6);
  const cx = (w + 6) / 2, by = h + 3;
  for (let j = 0; j < h + 6; j++) for (let i = 0; i < w + 6; i++) {
    const nx = (i + 0.5 - cx) / (w / 2), yy = by - (j + 0.5);
    if (yy < 0 || Math.abs(nx) > 1) continue;
    const top = h * Math.pow(1 - nx * nx, 0.5) * 0.55 + h * 0.45;
    if (yy > top) continue;
    let c = ramp(['j', 'v', 'a'], 0.5 - nx * 0.5 + (yy / h) * 0.5, i, j);
    if (yy < h * 0.5) c = ramp(['F', 'G', 'h'], 0.4 + 0.5 * bay(i * 2, j), i, j); // plants visible through glass
    if ((i - 3) % 4 === 0) c = yy < h * 0.5 ? 'C' : '9';
    if (yy >= h - 1 && false) c = 'v';
    t.set(i, j, c);
  }
  for (let i = 0; i < w + 6; i++) if (t.opaque(i, by - 1)) t.set(i, by - 1, 'b');
  t.outline('i');
  p.blit(t, ox - 3, y - by);
}

/** Water tower with rain catchment funnel and a barrel. */
export function waterTower(p: PixelCanvas, x: number, y: number, s: number) {
  const legH = Math.round(9 * s), tw = Math.round(9 * s) | 1, th = Math.round(8 * s);
  shadow(p, x + 6 * s, y + 1, 7 * s, 1.6);
  const tx = x - (tw >> 1), ty = y - legH - th;
  // legs
  p.vline(tx + 1, y - legH, y, 'n'); p.vline(tx + tw - 2, y - legH, y, 'n');
  p.line(tx + 1, y - legH, tx + tw - 2, y - 1, 'b'); p.line(tx + tw - 2, y - legH, tx + 1, y - 1, 'b');
  // tank
  for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) {
    const c = i < 2 ? 't' : i >= tw - 2 ? 'n' : (i === tw - 3 ? 'b' : 'B');
    p.set(tx + i, ty + j, c);
  }
  p.hline(tx, tx + tw - 1, ty + 2, 'n'); p.hline(tx, tx + tw - 1, ty + th - 2, 'n');
  // green cone roof
  for (let j = 0; j < Math.round(4 * s); j++) p.hline(tx - 1 + j, tx + tw + 0 - j, ty - 1 - (Math.round(4 * s) - 1 - j), j === Math.round(4 * s) - 1 ? 'h' : 'G');
  p.set(tx + 1, ty - 1, 'F');
  // gutter to a rain barrel
  p.set(tx + tw, ty + th - 1, 'a');
  p.vline(tx + tw + 1, ty + th - 1, y - 3, 'a');
  p.rect(tx + tw - 1, y - 4, 4, 4, 'w'); p.hline(tx + tw - 1, tx + tw + 2, y - 4, 'W'); p.vline(tx + tw + 2, y - 3, y - 1, 'U');
}

/** Line of glowing lanterns between two points with a light sag. */
export function lanterns(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, n: number, sag: number) {
  let px = x0, py = y0;
  for (let i = 1; i <= 24; i++) {
    const t = i / 24, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    p.line(px, py, x, y, '5'); px = x; py = y;
  }
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag) + 1;
    p.set(x, y, 'Y'); p.set(x, y + 1, 'O');
    if ((x + y) & 1) p.set(x + 1, y, 'z'); else p.set(x - 1, y, 'z');
  }
}

/** Arched white-and-wood footbridge across the river (deck spans x0..x1 at waterline y). */
export function bridge(p: PixelCanvas, x0: number, x1: number, y: number) {
  const cx = (x0 + x1) / 2, hw = (x1 - x0) / 2, rise = 15;
  const deck = (x: number) => y - 5 - rise * (1 - Math.pow((x - cx) / hw, 2));
  const openTop = (u: number) => Math.abs(u) < 0.8 ? Math.round((y - 1) - 11 * Math.pow(1 - Math.pow(u / 0.8, 2), 0.62)) : 9999;
  const ring: [number, number][] = [];
  // white ring / body with coloured deck on top
  for (let x = x0; x <= x1; x++) {
    const u = (x - cx) / hw;
    const top = Math.round(deck(x)), open = openTop(u);
    for (let yy = top; yy <= y; yy++) {
      if (yy >= open) { if (yy === open) p.set(x, yy, '6'); continue; }
      let c = '9';
      if (yy === top) c = 'B';
      else if (yy === top + 1) c = 'b';
      else if (yy >= open - 2) c = '8';
      else if (u > 0.55 && (x + yy) % 2 === 0) c = '8';
      if (yy === top + 2 && u < -0.3) c = 'z';
      p.set(x, yy, c);
      ring.push([x, yy]);
    }
    if (Math.abs(u) < 0.8 && (x - Math.round(cx)) % 7 === 0) p.set(x, open - 1, 'b');
  }
  // reflection in the water below (mirrored, dithered, darker)
  for (const [x, yy] of ring) {
    const ry = y + 1 + (y - yy) * 0.55;
    if (ry > y + 9) continue;
    if (bay(x, Math.round(ry)) < 0.6) p.set(x, Math.round(ry), yy < y - 6 ? 'U' : 'I');
  }
  for (let x = x0 + 3; x < x1 - 2; x++) if (bay(x, y + 2) < 0.4) p.set(x, y + 1, 'i');
  // abutment blocks
  p.rect(x0 - 3, y - 6, 5, 7, 'S'); p.rect(x1 - 1, y - 6, 5, 7, 'S');
  p.vline(x0 - 3, y - 6, y, 'x'); p.hline(x0 - 3, x0 + 1, y, 's'); p.hline(x1 - 1, x1 + 3, y, 's');
  p.vline(x1 + 3, y - 6, y - 1, 'C');
  // railings: posts + rail along the deck
  for (let x = x0 + 1; x <= x1 - 1; x += 4) {
    const d = Math.round(deck(x));
    p.vline(x, d - 4, d - 1, '9');
  }
  for (let x = x0 + 1; x <= x1 - 1; x++) {
    const d = Math.round(deck(x));
    p.set(x, d - 5, 'B');
    if (x % 2 === 0) p.set(x, d - 6, 't');
  }
  // hanging lanterns + flowers on the arch face
  for (const f of [0.28, 0.5, 0.72]) {
    const x = Math.round(x0 + (x1 - x0) * f), d = Math.round(deck(x));
    p.set(x, d - 6, 'Y'); p.set(x, d - 7, 'z');
  }
  for (let x = x0 + 4; x < x1 - 3; x += 5) { const d = Math.round(deck(x)) + 3; p.set(x, d, 'G'); p.set(x, d + 1, 'h'); if (x % 2) p.set(x + 1, d + 1, 'Z'); else p.set(x - 1, d, 'Y'); }
  for (let x = x0; x < x0 + 3; x++) p.set(x, Math.round(deck(x)), 'z');
}

/** Tiny solar-sail barge. (x,y) = waterline centre. */
export function boat(p: PixelCanvas, x: number, y: number) {
  p.hline(x - 5, x + 5, y, 'b'); p.hline(x - 4, x + 4, y + 1, 'n'); p.set(x - 6, y - 1, 'B'); p.set(x + 6, y - 1, 'B'); p.hline(x - 5, x + 5, y - 1, 'B');
  p.hline(x - 4, x + 4, y + 2, 'U'); // dark reflection
  p.vline(x, y - 12, y - 1, 'n');
  for (let j = 0; j < 10; j++) { const wv = Math.round(j * 0.55); p.hline(x + 1, x + 1 + wv, y - 11 + j + 0, j < 3 ? 'z' : 'w'); }
  for (let j = 3; j < 10; j++) p.set(x + 1 + Math.round(j * 0.55) - 1 + 0, y - 11 + j, 'W');
  p.set(x - 1, y - 8, 'Y'); p.set(x - 1, y - 7, 'Y'); p.set(x - 2, y - 7, 'z');
  for (let k = 3; k < 8; k++) if (bay(x + k * 5, y) < 0.4) p.set(x + k, y + 2, 'v');
}

// ---------------------------------------------------------------- turbines

/** Slender tapered tower + hub (no blades). Hub centre = (x, y - towerH). */
export function turbineTower(p: PixelCanvas, x: number, baseY: number, s: number) {
  const H = Math.round(50 * s + 2);
  const wb = Math.max(1, Math.round(3.4 * s)), wt = Math.max(1, Math.round(1.5 * s));
  const far = s < 0.4;
  for (let j = 0; j <= H; j++) {
    const t = j / H, w = Math.max(1, Math.round(wb + (wt - wb) * t));
    const y = Math.round(baseY - j);
    const x0 = Math.round(x - w / 2 + 0.01);
    for (let i = 0; i < w; i++) {
      let c = far ? '8' : '9';
      if (i === w - 1 && w > 1) c = far ? '7' : '8';
      if (w >= 4 && i === w - 2) c = '8';
      if (w >= 4 && i === w - 1) c = '7';
      p.set(x0 + i, y, c);
    }
  }
  // maintenance band + base
  if (s >= 0.6) { p.hline(Math.round(x - wb / 2), Math.round(x + wb / 2 - 1), baseY - Math.round(H * 0.3), '7'); p.hline(Math.round(x - wb / 2) - 1, Math.round(x + wb / 2), baseY, 'S'); }
  const hy = baseY - H;
  const r = Math.max(1.1, 1.8 * s);
  p.circle(x + 0.5, hy + 0.5, r, far ? '8' : '9');
  if (s >= 0.5) { p.set(Math.round(x + r * 0.5), Math.round(hy + r * 0.5), '7'); p.set(Math.round(x - r * 0.5), Math.round(hy - r * 0.5), 'a'); }
  return { x, y: hy };
}

/** Transparent square sprite of a 3-blade rotor. frame 0..3 = 0,30,60,90 degrees (loops via 3-fold symmetry). Hub at centre. */
export function makeTurbineBlades(frame: number, s: number): PixelCanvas {
  const L = 22 * s, side = Math.round(2 * L) + 4;
  const c = new PixelCanvas(side, side);
  const cx = side / 2, cy = side / 2;
  const rot = ((frame % 4) * 30 + 0) * Math.PI / 180;
  const hubR = Math.max(1.1, 1.8 * s);
  const far = s < 0.4;
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    let hit: string | null = null;
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + rot + k * (2 * Math.PI / 3);
      const ca = Math.cos(a), sa = Math.sin(a);
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca; // v>0 is the trailing (clockwise) side
      if (u < 0 || u > L) continue;
      const f = u / L;
      const hw = Math.max(0.5, (0.5 + 1.35 * s * (f < 0.18 ? 0.8 + f * 1.1 : 1 - (f - 0.18) * 0.95)) * (1 - f * 0.55)) + 0.02;
      if (Math.abs(v) > hw) continue;
      hit = f > 0.9 ? 'a' : (v > hw * 0.15 ? (far ? '7' : (s > 0.5 ? '7' : '8')) : (far ? '8' : '9'));
      if (hw < 0.9) hit = far ? '8' : '9';
    }
    if (dx * dx + dy * dy <= hubR * hubR) hit = far ? '8' : '9';
    if (hit) c.set(x, y, hit);
  }
  if (s >= 0.5) { c.set(Math.floor(cx), Math.floor(cy), 'a'); }
  return c;
}

// ---------------------------------------------------------------- misc

/** Wedge-shaped field of solar panels; rows follow constant-k lines toward the vanishing point. */
export function solarFarm(p: PixelCanvas, y0: number, y1: number, k0: number, k1: number, vpx: number, vpy: number) {
  for (let y = y0; y < y1; y++) {
    const inRow = (y - y0) % 4, rowIdx = Math.floor((y - y0) / 4);
    const xa = Math.round(vpx + k0 * (y - vpy)), xb = Math.round(vpx + k1 * (y - vpy));
    for (let x = xa; x <= xb; x++) {
      const k = (x - vpx) / Math.max(1, y - vpy);
      const cell = Math.floor(k * 46 + 200);
      let c = inRow === 0 ? 'W' : inRow === 3 ? 'h' : 'w';
      if (inRow === 1 && (cell + rowIdx * 2) % 6 === 0) c = 'a';
      if (inRow < 3 && cell % 5 === 0) c = 'U';
      if (x === xa || x === xb) c = 'u';
      p.set(x, y, c);
    }
  }
}

/** Cable-car line with pylons and gondolas. */
export function cableCar(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, sag: number, gondolas: number[]) {
  const pt = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag];
  let [px, py] = pt(0);
  for (let i = 1; i <= 40; i++) { const [x, y] = pt(i / 40); p.line(px, py, x, y, 'c'); px = x; py = y; }
  for (const [x, y] of [[x0, y0], [x1, y1]]) { p.vline(Math.round(x), Math.round(y), Math.round(y) + 6, 'n'); p.hline(Math.round(x) - 2, Math.round(x) + 2, Math.round(y), 'b'); }
  for (const t of gondolas) {
    const [x, y] = pt(t);
    const gx = Math.round(x), gy = Math.round(y);
    p.vline(gx, gy, gy + 2, '2');
    p.rect(gx - 2, gy + 3, 5, 3, 'Q'); p.hline(gx - 2, gx + 2, gy + 3, 'e'); p.set(gx - 1, gy + 4, 'a'); p.set(gx + 1, gy + 4, 'z'); p.hline(gx - 2, gx + 2, gy + 6, 'r');
  }
}
