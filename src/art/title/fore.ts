// Foreground layer of the solarpunk title screen: near ground, path, river bank, hero house (left),
// giant tree (right), framing foliage, drifting life and a soft vignette.
import { PixelCanvas, rng, ramp, bay } from './kit';
import { topL, topR, bankL, bankR, pathX, pathW, tuft, flower, dandelion, puff, leaf, blob, dth, dimRect } from './fore_util';
import { drawHouse, drawBeds } from './fore_house';
import { drawTreeBack, drawTreeFront, drawFenceAndSunflowers } from './fore_tree';
import { drawRiverBank, drawLife, drawFrame } from './fore_life';

const GRASS = ['f', 'F', 'G', 'h', 'H'];

function groundTone(x: number, y: number) {
  let t = 0.5 + 0.13 * Math.sin(x * 0.05 + y * 0.07) + 0.09 * Math.sin(x * 0.13 - y * 0.06 + 1.3);
  // converging mown stripes toward the vanishing point
  const u = (x - 320) / Math.max(8, y - 186);
  t += (Math.floor(u * 2.2) & 1) * 0.07;
  // golden light on distant/upper ground, deeper and richer near the viewer
  t += (300 - y) * 0.004;
  return t;
}

function paintGround(p: PixelCanvas, side: 'L' | 'R') {
  const x0 = side === 'L' ? 0 : 200, x1 = side === 'L' ? 300 : 640;
  for (let x = x0; x < x1; x++) {
    const top = Math.round(side === 'L' ? topL(x) : topR(x));
    for (let y = top; y < 360; y++) {
      if (side === 'L' && y >= 300 && x >= bankL(y)) continue;
      if (side === 'R' && y >= 300 && x <= bankR(y)) continue;
      if (y < 300 && ((side === 'L' && x > 262) || (side === 'R' && x < 378))) continue;
      const d = y - top;
      let t = groundTone(x, y);
      // rim-lit crest, darker toward the bottom (vignette handled later)
      t += Math.max(0, 5 - d) * 0.06;
      p.set(x, y, ramp(GRASS, Math.max(0.05, Math.min(0.95, t * 0.9 + 0.08)), x, y));
    }
  }
}

function grassDetail(p: PixelCanvas, r: () => number) {
  // blades + tufts: dense at the top crest and in the extreme corners, sparse in the chicken lane
  const place = (x0: number, x1: number, y0: number, y1: number, n: number, hMin: number, hMax: number) => {
    for (let i = 0; i < n; i++) {
      const x = Math.round(x0 + r() * (x1 - x0)), y = Math.round(y0 + r() * (y1 - y0));
      const inRiver = y >= 298 && x > bankL(y) - 3 && x < bankR(y) + 3;
      if (inRiver) continue;
      if (y >= 300 && Math.abs(x - pathX(y)) < pathW(y) + 2) continue;
      tuft(p, x, y, hMin + r() * (hMax - hMin), r);
    }
  };
  place(0, 256, 292, 322, 60, 3, 5);
  place(0, 256, 346, 359, 26, 5, 8);
  place(0, 40, 322, 346, 4, 4, 6);
  place(230, 300, 300, 320, 10, 2, 4);
  place(380, 640, 292, 322, 60, 3, 5);
  place(380, 640, 346, 359, 26, 5, 8);
  place(600, 640, 322, 346, 4, 4, 6);
  place(380, 460, 300, 320, 10, 2, 4);
  // bright blade highlights (single vertical strokes catching the sun) scattered on the lawn
  for (let i = 0; i < 260; i++) {
    const left = r() < 0.5;
    const x = Math.round(left ? r() * 250 : 395 + r() * 245), y = Math.round(292 + r() * 66);
    if (y >= 300 && (x > bankL(y) - 2 && x < bankR(y) + 2)) continue;
    if (y >= 300 && Math.abs(x - pathX(y)) < pathW(y) + 3) continue;
    if (y < 300 && ((left && x > 258) || (!left && x < 380))) continue;
    if (y < topL(x) && left) continue;
    if (y < topR(x) && !left) continue;
    const lane = y >= 322 && y <= 345;
    if (lane && r() < 0.6) continue;
    const c = r() < 0.5 ? 'h' : 'f';
    p.set(x, y, c); if (!lane) p.set(x, y - 1, c === 'h' ? 'H' : 'F');
  }
}

/** flowers & clover clusters on the lawns */
function meadow(p: PixelCanvas, r: () => number) {
  const kinds: [string, string, string, string][] = [
    ['X', 'Z', 'T', 'Y'], // pink
    ['N', 'A', 'M', 'Y'], // lilac
    ['Y', 'z', 'y', 'd'], // yellow
    ['9', '9', '8', 'Y'], // white
  ];
  const cluster = (cx: number, cy: number, n: number, spread: number, big: boolean) => {
    const pts: [number, number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * spread;
      const k = Math.floor(r() * 4);
      pts.push([Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.55), k, big && r() < 0.5 ? 3 : r() < 0.5 ? 2 : 1]);
    }
    pts.sort((a, b) => a[1] - b[1]);
    for (const [x, y, k, s] of pts) {
      if (y >= 300 && x > bankL(y) - 4 && x < bankR(y) + 4) continue;
      if (y >= 300 && Math.abs(x - pathX(y)) < pathW(y) + 3) continue;
      // stem + leaves
      for (let j = 1; j <= s + 2; j++) p.set(x, y + j, j > 2 ? 'f' : 'F');
      p.set(x - 1, y + 2, 'G'); p.set(x + 1, y + 3, 'F');
      const [petal, hi, sh, c] = kinds[k];
      if (k === 2 && s === 1) dandelion(p, x, y); else flower(p, x, y, s, petal, hi, sh, c);
    }
  };
  // left lawn: big clumps at the bottom-left and around the path
  cluster(24, 352, 9, 22, true); cluster(118, 354, 6, 16, true); cluster(196, 350, 5, 14, false);
  cluster(38, 306, 8, 18, false); cluster(168, 322, 4, 10, false); cluster(214, 316, 5, 10, false);
  cluster(90, 326, 3, 8, false); cluster(8, 330, 4, 8, false);
  // right lawn
  cluster(610, 352, 10, 24, true); cluster(468, 354, 7, 18, true); cluster(530, 351, 4, 12, false);
  cluster(440, 318, 6, 12, false); cluster(500, 326, 4, 12, false); cluster(408, 328, 3, 8, false);
  // clover leaves (three-lobed) on the lawn
  for (let i = 0; i < 26; i++) {
    const x = Math.round(r() < 0.5 ? r() * 240 : 400 + r() * 236), y = Math.round(300 + r() * 58);
    if (x > bankL(y) - 3 && x < bankR(y) + 3) continue;
    if (Math.abs(x - pathX(y)) < pathW(y) + 3) continue;
    if (y >= 322 && y <= 345) continue;
    p.set(x - 1, y, 'G'); p.set(x + 1, y, 'F'); p.set(x, y - 1, 'h'); p.set(x, y, 'F');
  }
}

function paintPath(p: PixelCanvas, r: () => number) {
  const earth = ['n', 'b', 'B', 't'];
  for (let y = 300; y < 361; y++) {
    const cx = pathX(y), w = pathW(y);
    for (let x = Math.floor(cx - w - 3); x <= Math.ceil(cx + w + 3); x++) {
      if (x >= bankL(y) - 1) continue;
      const d = Math.abs(x + 0.5 - cx) / w;
      if (d > 1.15) continue;
      // grassy fringe with dithered transition into earth
      if (d > 1) { if (dth(x, y, 0.5)) p.set(x, y, 'F'); continue; }
      const edgeSide = (x + 0.5 - cx) / w; // -1 left, +1 right
      let t = 0.62 - edgeSide * 0.18 + (1 - d) * 0.15 + 0.06 * Math.sin(y * 0.4 + x * 0.05);
      if (d > 0.88) t -= 0.25; // shaded rut edges
      p.set(x, y, ramp(earth, Math.max(0, Math.min(1, t)), x, y));
    }
  }
  // pebbles/dirt speckle sparse
  for (let i = 0; i < 70; i++) {
    const y = Math.round(304 + r() * 56), x = Math.round(pathX(y) + (r() - 0.5) * pathW(y) * 1.5);
    if (y >= 322 && y <= 345 && r() < 0.7) continue;
    if (x >= bankL(y) - 2) continue;
    p.set(x, y, r() < 0.5 ? 'd' : 't');
  }
  // stepping stones: flat ovals shrinking toward the valley
  const ys = [354, 342, 331, 322, 315, 310, 306];
  ys.forEach((y, i) => {
    const w = pathW(y), cx = pathX(y) + (i % 2 ? 1 : -1) * w * 0.3;
    const rx = Math.max(2, w * 0.42), ry = Math.max(1, rx * 0.42);
    for (let yy = Math.floor(y - ry - 1); yy <= y + ry + 1; yy++) for (let xx = Math.floor(cx - rx - 1); xx <= cx + rx + 1; xx++) {
      const nx = (xx + 0.5 - cx) / (rx + 0.4), ny = (yy + 0.5 - (y - 0.5)) / (ry + 0.4);
      if (nx * nx + ny * ny <= 1) {
        const top = nx * 0.4 + ny * 0.9 < -0.1;
        p.set(xx, yy, top ? (nx < -0.2 ? '9' : '8') : '7');
      }
      const ny2 = (yy + 0.5 - (y + 0.5)) / (ry + 0.4);
      if (nx * nx + ny2 * ny2 <= 1 && nx * nx + ny * ny > 1) p.set(xx, yy, '6'); // side face
    }
    if (rx > 3) { p.set(Math.round(cx - rx * 0.4), Math.round(y - ry * 0.3), '9'); }
  });
}

/** soft darker bottom band + corner vignette by ordered dithering */
function vignette(p: PixelCanvas) {
  for (let y = 300; y < 360; y++) for (let x = 0; x < 640; x++) {
    const dc = Math.abs(x - 320) / 320;
    let d = 0;
    if (y > 346) d = ((y - 346) / 14) * 0.62;
    d += Math.max(0, dc - 0.7) * 1.0 * Math.max(0, (y - 300) / 60);
    if (d <= 0.02) continue;
    if (!dth(x, y, d)) continue;
    const inRiver = y >= 300 && x > bankL(y) && x < bankR(y);
    const v = p.get(x, y);
    if (v >>> 24 === 0) continue;
    // darken along the ramp: swap for a dark cousin
    const c = darker(v);
    p.set(x, y, inRiver ? 'u' : c);
  }
}

const DARK: Record<string, string> = {};
function darker(v: number): string {
  // choose by luminance-ish classification of the packed colour
  const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
  const l = r * 0.3 + g * 0.55 + b * 0.15;
  const key = `${r >> 4},${g >> 4},${b >> 4}`;
  if (DARK[key]) return DARK[key];
  let c: string;
  if (g > r && g >= b) c = l > 140 ? 'F' : l > 100 ? 'f' : 'C';
  else if (r > g) c = l > 150 ? 'n' : 'm';
  else c = l > 150 ? 'U' : 'u';
  if (l < 60) c = 'p';
  return (DARK[key] = c);
}

export function drawFore(p: PixelCanvas) {
  const r = rng(2024);
  paintGround(p, 'L');
  paintGround(p, 'R');
  paintPath(p, r);
  drawRiverBank(p, r);
  drawTreeBack(p, r);
  drawHouse(p, r);
  grassDetail(p, r);
  meadow(p, r);
  drawBeds(p, r);
  drawTreeFront(p, r);
  drawFenceAndSunflowers(p, r);
  drawFrame(p, r);
  drawLife(p, r);
  vignette(p);
  void bay; void flower; void puff; void leaf; void blob; void dimRect;
}
