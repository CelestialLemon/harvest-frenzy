// River bank, water reflections, framing foliage and drifting life for the foreground layer.
import { PixelCanvas, ramp, bay, rng } from './kit';
import { blob, leaf, flower, glow, dth, bankL, bankR, bez, tuft, puff } from './fore_util';

function rock(p: PixelCanvas, x: number, y: number, w: number, h: number, moss = true) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const nx = (i + 0.5 - w / 2) / (w / 2), ny = (j + 0.5 - h * 0.55) / (h * 0.55);
    const rr = nx * nx + ny * ny * 1.1; if (rr > 1) continue;
    const l = -nx * 0.6 - ny * 0.7 + Math.sqrt(1 - Math.min(1, rr)) * 0.5;
    let c = ramp(['u', '2', '6', '7', '8'], Math.max(0, Math.min(1, l * 0.55 + 0.42)), x + i, y + j);
    if (moss && j < h * 0.4 && ((i * 3 + j * 5) % 7 < 3) && l > -0.1) c = ((i + j) & 1) ? 'G' : 'F';
    p.set(x + i, y + j, c);
  }
  p.set(x + 1, y + 1, moss ? 'h' : '9');
  for (let i = 1; i < w - 1; i++) p.set(x + i, y + h, 'i'); // water contact shadow
}

function reeds(p: PixelCanvas, x: number, y: number, n: number, h: number, r: () => number, cattail = true) {
  const hs: number[] = [];
  for (let i = 0; i < n; i++) hs.push(i);
  for (let i = 0; i < n; i++) {
    const bx = x + (i - n / 2) * 2 + Math.round((r() - 0.5) * 2);
    const hh = h * (0.6 + r() * 0.5), lean = (r() - 0.5) * 0.5 + (bx - x) * 0.03;
    for (let s = 0; s < hh; s++) {
      const xx = Math.round(bx + lean * s * 0.35 + Math.sin(s * 0.12 + i) * 0.5);
      const t = s / hh;
      p.set(xx, y - s, t < 0.3 ? 'f' : t < 0.75 ? 'F' : 'G');
      if (s < hh * 0.6 && s % 2 === 0) p.set(xx - 1, y - s, 'h');
    }
    const tx = Math.round(bx + lean * hh * 0.35 + Math.sin(hh * 0.12 + i) * 0.5), ty = Math.round(y - hh);
    if (cattail && i % 2 === 0) {
      for (let j = 0; j < 5; j++) { p.set(tx, ty - j, j === 4 ? 'B' : 'n'); p.set(tx + 1, ty - j, j === 4 ? 'd' : 'd'); }
      p.set(tx, ty - 1, 'b'); p.set(tx, ty - 3, 'b'); p.set(tx, ty - 6, 'B');
    }
  }
  // wide blades
  for (let i = 0; i < 3; i++) leaf(p, x + (i - 1) * 3, y, -1.57 + (i - 1) * 0.55, h * 0.55, 3.5, ['F', 'G', 'h', 'H'], (i - 1) * 0.2);
}

function lilyPad(p: PixelCanvas, cx: number, cy: number, rx: number, flowerCol: string | null) {
  const ry = Math.max(1.5, rx * 0.4);
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny > 1) continue;
    if (nx > 0.1 && Math.abs(ny) < 0.25) continue; // notch
    const l = -nx * 0.4 - ny * 0.6;
    p.set(x, y, l > 0.35 ? 'h' : l > -0.15 ? 'G' : 'F');
  }
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const nx = (x + 0.5 - cx) / rx; const yy = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - nx * nx)) + 0.6); if (dth(x, yy, 0.7)) p.set(x, yy, 'i'); }
  if (flowerCol) {
    p.set(cx - 1, cy - 1, 'Z'); p.set(cx, cy - 2, flowerCol === 'pink' ? 'A' : '9'); p.set(cx + 1, cy - 1, 'X'); p.set(cx, cy - 1, 'Y'); p.set(cx - 1, cy, 'X'); p.set(cx + 1, cy, 'T');
  }
}

function duck(p: PixelCanvas, x: number, y: number, male: boolean, dir: number) {
  const s = dir;
  const bx = (dx: number) => x + dx * s;
  // body
  for (let i = -3; i <= 3; i++) { p.set(bx(i), y, male ? '8' : 'B'); p.set(bx(i), y + 1, male ? '7' : 'b'); }
  for (let i = -2; i <= 3; i++) p.set(bx(i), y - 1, male ? '9' : 't');
  p.set(bx(-4), y - 1, male ? '8' : 'b'); p.set(bx(-4), y - 2, male ? '7' : 'n'); p.set(bx(-3), y - 2, male ? '9' : 'b'); // tail
  p.set(bx(2), y, male ? 'n' : 'b'); p.set(bx(3), y, male ? 'n' : 'b'); // breast
  // head
  p.set(bx(4), y - 2, male ? 'i' : 'n'); p.set(bx(4), y - 3, male ? 'I' : 'b'); p.set(bx(3), y - 3, male ? 'j' : 'B'); p.set(bx(5), y - 2, male ? 'I' : 'b');
  p.set(bx(5), y - 3, male ? 'i' : 'n'); p.set(bx(6), y - 2, 'Y'); p.set(bx(3), y - 2, male ? '9' : 'b'); p.set(bx(4), y - 4, male ? 'I' : 'B');
  p.set(bx(5), y - 3, '0');
  // reflection + ripple
  for (let i = -4; i <= 4; i++) if (dth(x + i, y + 2, 0.6)) p.set(x + i, y + 2, 'I');
  for (let i = -6; i <= 6; i++) if ((i & 1) === 0) p.set(x + i, y + 3, 'a');
}

function butterfly(p: PixelCanvas, x: number, y: number, w1: string, w2: string, hi: string) {
  p.set(x - 2, y - 1, w1); p.set(x - 3, y - 2, w1); p.set(x - 2, y - 2, hi); p.set(x - 1, y, w2); p.set(x - 2, y, w1);
  p.set(x + 2, y - 1, w1); p.set(x + 3, y - 2, w1); p.set(x + 2, y - 2, hi); p.set(x + 1, y, w2); p.set(x + 2, y, w1);
  p.set(x - 1, y + 1, w2); p.set(x + 1, y + 1, w2); p.set(x - 2, y + 1, w1); p.set(x + 2, y + 1, w1);
  p.set(x, y - 1, '0'); p.set(x, y, '0'); p.set(x, y + 1, '0'); p.set(x - 1, y - 2, '0'); p.set(x + 1, y - 2, '0');
}

export function drawRiverBank(p: PixelCanvas, r: () => number) {
  const rr = rng(4242);
  // ---- water: bank shade (dither only) and a few soft reflections over the mid layer's river ----
  for (let y = 303; y < 360; y++) {
    const xl = bankL(y), xr = bankR(y);
    for (let x = Math.ceil(xl); x < xr; x++) {
      const dl = x - xl, dr = xr - x;
      const sh = Math.max(0, 1 - Math.min(dl, dr) / (5 + (y - 300) * 0.22));
      if (dth(x, y, sh * 0.8)) p.set(x, y, dl < dr ? 'I' : 'i');
      if (dth(x, y, sh * 0.3) && Math.min(dl, dr) < 2) p.set(x, y, 'i');
    }
    // sparse warm/cool glints
    if (y % 5 === 0) {
      const x0 = Math.round(xl + 10 + rr() * (xr - xl - 20)), len = 2 + Math.floor(rr() * (2 + (y - 300) / 10));
      const c = rr() < 0.5 ? 'v' : 'J';
      for (let i = 0; i < len; i++) p.set(x0 + i, y, i === 0 || i === len - 1 ? 'j' : c);
    }
  }

  // ---- banks: grassy overhang with a thin earthen lip ----
  for (let y = 300; y < 361; y++) {
    const xl = Math.round(bankL(y)), xr = Math.round(bankR(y));
    const t = (y - 300) / 60;
    p.set(xl - 3, y, 'h'); p.set(xl - 2, y, 'H'); p.set(xl - 1, y, 'D');
    p.set(xl, y, 'd'); if (t > 0.3 || (y & 1)) p.set(xl + 1, y, 'n');
    if (t > 0.5) p.set(xl + 2, y, dth(xl + 2, y, 0.5) ? 'n' : 'i');
    p.set(xr + 2, y, 'G'); p.set(xr + 1, y, 'F'); p.set(xr, y, 'd'); p.set(xr - 1, y, 'n');
    if (t > 0.3) p.set(xr - 2, y, dth(xr - 2, y, 0.5) ? 'd' : 'i');
  }
  // small wooden jetty at the end of the footpath
  {
    const y0 = 303, x0 = Math.round(bankL(303)) - 12;
    for (let x = x0; x < x0 + 26; x++) {
      p.set(x, y0, x % 4 === 0 ? 'n' : 't'); p.set(x, y0 + 1, x % 4 === 0 ? 'p' : 'B'); p.set(x, y0 + 2, 'b'); p.set(x, y0 + 3, 'd');
      if (dth(x, y0 + 4, 0.6)) p.set(x, y0 + 4, 'i');
    }
    for (const dx of [14, 25]) { p.vline(x0 + dx, y0 - 3, y0 + 6, 'B'); p.vline(x0 + dx + 1, y0 - 3, y0 + 6, 'n'); p.set(x0 + dx, y0 - 4, 't'); }
    p.line(x0 + 14, y0 - 3, x0 + 25, y0 - 3, 'd');
    for (let i = 0; i < 3; i++) p.set(x0 + 26 + i, y0 + 3, i === 1 ? 'a' : 'v');
  }
  // pebbles along the shore
  for (let i = 0; i < 26; i++) {
    const y = 302 + Math.floor(rr() * 56), left = i % 2 === 0;
    const x = Math.round(left ? bankL(y) - 4 - rr() * 4 : bankR(y) + 3 + rr() * 6);
    p.set(x, y, '8'); p.set(x + 1, y, '7'); p.set(x, y + 1, '6');
  }
  // rocks and reeds
  rock(p, 244, 342, 9, 6); rock(p, 237, 348, 6, 4); rock(p, 251, 316, 5, 4);
  rock(p, 414, 346, 10, 7); rock(p, 426, 352, 7, 5); rock(p, 396, 313, 5, 4);
  reeds(p, 248, 332, 6, 30, rr); reeds(p, 258, 307, 4, 18, rr); reeds(p, 231, 354, 5, 26, rr);
  reeds(p, 407, 330, 6, 32, rr); reeds(p, 392, 308, 4, 16, rr); reeds(p, 438, 356, 6, 28, rr);
  // lily pads with flowers
  lilyPad(p, 282, 344, 6, 'pink'); lilyPad(p, 292, 350, 4, null); lilyPad(p, 268, 338, 4, null);
  lilyPad(p, 368, 341, 6, 'white'); lilyPad(p, 380, 349, 5, null); lilyPad(p, 352, 353, 4, null); lilyPad(p, 260, 353, 5, null);
  lilyPad(p, 383, 326, 3, null);
  // ducks on the river
  duck(p, 306, 327, true, 1); duck(p, 316, 329, false, 1);
  void r; void bay; void blob;
}

function fern(p: PixelCanvas, bx: number, by: number, ang: number, len: number, w: number, curve: number) {
  // main leaf with shading; warm rim light along the top-left
  leaf(p, bx, by, ang, len, w, ['C', 'f', 'F', 'G'], curve);
  leaf(p, bx, by, ang - 0.06, len * 0.94, w * 0.35, ['F', 'G', 'h', 'H'], curve);
}

export function drawFrame(p: PixelCanvas, r: () => number) {
  const rr = rng(31337);
  // bottom-left fronds
  const bl: [number, number, number, number, number, number][] = [
    [-6, 366, -1.15, 46, 15, 0.25], [4, 368, -0.85, 50, 16, 0.2], [-8, 362, -0.5, 44, 14, 0.15], [10, 366, -1.4, 40, 13, 0.3], [-2, 370, -1.65, 36, 12, 0.2], [18, 370, -0.4, 30, 11, 0.2],
  ];
  for (const [x, y, a, l, w, c] of bl) fern(p, x, y, a, l, w, c);
  // bottom-right fronds (mirrored)
  const br: [number, number, number, number, number, number][] = [
    [646, 366, Math.PI + 1.15, 46, 15, -0.25], [636, 368, Math.PI + 0.85, 50, 16, -0.2], [648, 362, Math.PI + 0.5, 44, 14, -0.15], [630, 366, Math.PI + 1.4, 40, 13, -0.3], [642, 370, Math.PI + 1.65, 36, 12, -0.2], [622, 370, Math.PI + 0.4, 30, 11, -0.2],
  ];
  for (const [x, y, a, l, w, c] of br) fern(p, x, y, a, l, w, c);
  // top-left hanging leaves + vine strands with flowers
  const tl: [number, number, number, number, number, number][] = [
    [-4, -8, 1.1, 44, 14, -0.2], [8, -10, 1.35, 36, 12, -0.15], [20, -10, 1.6, 30, 11, 0.1], [32, -8, 1.85, 22, 9, 0.2],
    [-10, 2, 0.75, 38, 13, -0.25], [-6, 14, 0.4, 30, 11, -0.2], [14, -12, 1.2, 46, 12, -0.1],
  ];
  for (const [x, y, a, l, w, c] of tl) fern(p, x, y, a, l, w, c);
  const strand = (x: number, len: number, fl: string) => {
    for (let j = 0; j < len; j++) { p.set(x + Math.round(Math.sin(j * 0.35 + x) * 1.2), j, j % 5 === 4 ? 'h' : 'G'); if (j % 6 === 3) { p.set(x - 1 + Math.round(Math.sin(j * 0.35 + x) * 1.2), j + 1, 'F'); p.set(x + 1 + Math.round(Math.sin(j * 0.35 + x) * 1.2), j, 'h'); } }
    flower(p, x + Math.round(Math.sin(len * 0.35 + x) * 1.2), len + 1, 1, fl, 'A', 'T', 'Y');
  };
  strand(38, 26, 'X'); strand(46, 16, 'N'); strand(52, 30, 'Z'); strand(58, 10, 'Y');
  // top-right hanging leaves (mirrored)
  const tr: [number, number, number, number, number, number][] = [
    [644, -8, Math.PI - 1.1, 44, 14, 0.2], [632, -10, Math.PI - 1.35, 36, 12, 0.15], [620, -10, Math.PI - 1.6, 30, 11, -0.1], [608, -8, Math.PI - 1.85, 22, 9, -0.2],
    [650, 2, Math.PI - 0.75, 38, 13, 0.25], [646, 14, Math.PI - 0.4, 30, 11, 0.2], [626, -12, Math.PI - 1.2, 46, 12, 0.1],
  ];
  for (const [x, y, a, l, w, c] of tr) fern(p, x, y, a, l, w, c);
  strand(601, 22, 'N'); strand(593, 12, 'Z'); strand(587, 26, 'X');
  void r; void rr; void bez; void tuft;
}

export function drawLife(p: PixelCanvas, r: () => number) {
  const rr = rng(555);
  // sleeping cat curled on top of the rain barrel
  {
    const x = 6, y = 284;
    for (let j = 0; j < 6; j++) for (let i = 0; i < 14; i++) {
      const nx = (i + 0.5 - 7) / 7, ny = (j + 0.5 - 3.6) / 3.2; if (nx * nx + ny * ny > 1) continue;
      const l = -nx * 0.5 - ny * 0.7;
      p.set(x + i, y + j, l > 0.4 ? 't' : l > -0.2 ? 'B' : 'b');
    }
    for (let i = 3; i < 12; i += 3) { p.set(x + i, y + 1, 'n'); p.set(x + i, y + 2, 'n'); }
    // head + ear + tail
    p.set(x - 1, y + 3, 'b'); p.set(x, y + 4, 'n'); p.set(x + 1, y + 2, 'B'); p.set(x + 1, y + 1, 'b'); p.set(x + 2, y, 'B'); p.set(x, y + 2, 'n');
    p.set(x + 12, y + 4, 'B'); p.set(x + 13, y + 3, 'b'); p.set(x + 14, y + 4, 't'); p.set(x + 13, y + 5, 'n'); p.set(x + 12, y + 5, 'n');
    p.set(x + 1, y + 3, '0'); p.set(x + 2, y + 3, 'n');
  }
  // butterflies
  butterfly(p, 152, 296, 'Y', 'O', 'z');
  butterfly(p, 205, 279, 'N', 'M', 'A');
  butterfly(p, 452, 286, 'W', 'w', 'a');
  butterfly(p, 92, 337, 'Z', 'X', '9');
  butterfly(p, 520, 336, 'Y', 'y', 'z');
  // bees
  const bee = (x: number, y: number) => { p.set(x, y, 'Y'); p.set(x + 1, y, '0'); p.set(x + 2, y, 'Y'); p.set(x + 1, y - 1, '9'); p.set(x, y - 1, 'a'); };
  bee(48, 322); bee(126, 330); bee(236, 300); bee(430, 296); bee(560, 322); bee(72, 302);
  // dandelion seeds drifting on the breeze (toward the right, away from the sun)
  const seeds: [number, number][] = [[212, 270], [232, 290], [246, 268], [196, 305], [420, 272], [438, 300], [402, 286], [462, 262], [180, 318], [504, 275]];
  for (const [x, y] of seeds) {
    p.set(x, y, '9'); p.set(x - 1, y - 1, '8'); p.set(x + 1, y - 1, '8'); p.set(x, y - 2, '9'); p.set(x, y + 1, '7');
  }
  puff(p, 224, 276); puff(p, 448, 284);
  // glowing pollen motes near the sun side (right of the valley)
  for (let i = 0; i < 34; i++) {
    const x = Math.round(392 + rr() * 90), y = Math.round(236 + rr() * 76);
    if (x < 446 && y < 264) continue;
    const big = rr() < 0.3;
    if (big) { glow(p, x, y, 4, 'z', null, 0.6); p.set(x, y, '9'); p.set(x + 1, y, 'z'); p.set(x, y + 1, 'z'); }
    else { p.set(x, y, rr() < 0.5 ? 'z' : 'Y'); }
  }
  // a few motes on the left too
  for (let i = 0; i < 14; i++) { const x = Math.round(180 + rr() * 70), y = Math.round(262 + rr() * 50); p.set(x, y, rr() < 0.5 ? 'z' : '9'); }
  void r; void bez;
}
