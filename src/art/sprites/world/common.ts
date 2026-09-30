// Shared drawing helpers for world sprites (buildings, vehicles, terrain, decor).
import { PixelCanvas, type Color } from '../../pixel';

export type Shades = { d: string; m: string; l: string; h?: string; o?: string };

/** Draw into a scratch layer, outline it, then composite onto p (selective outlining per part). */
export function part(p: PixelCanvas, fn: (q: PixelCanvas) => void, ol: Color = '0', diag = false) {
  const q = new PixelCanvas(p.w, p.h);
  fn(q);
  if (ol) q.outline(ol, diag);
  p.blit(q, 0, 0);
}

/** Paint only on already-opaque pixels inside a rect. */
export function paintRect(p: PixelCanvas, x: number, y: number, w: number, h: number, c: Color) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.paint(x + i, y + j, c);
}

/** Recolor pixels of the shape that touch transparency on a given side ('l','r','t','b'). */
export function edgeShade(p: PixelCanvas, side: 'l' | 'r' | 't' | 'b', c: Color, x0 = 0, y0 = 0, x1 = p.w - 1, y1 = p.h - 1) {
  const src = p.px.slice();
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < p.w && y < p.h && src[y * p.w + x] >>> 24 > 0;
  const [dx, dy] = side === 'l' ? [-1, 0] : side === 'r' ? [1, 0] : side === 't' ? [0, -1] : [0, 1];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (op(x, y) && !op(x + dx, y + dy)) p.set(x, y, c);
  }
}

/** Horizontal lap-siding boards. */
export function planksH(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, bh = 4, seed = 1) {
  for (let j = 0; j < h; j++) {
    const row = Math.floor(j / bh), k = j % bh;
    for (let i = 0; i < w; i++) {
      let c = s.m;
      if (k === 0) c = s.l;
      else if (k === bh - 1) c = s.d;
      // staggered vertical joints
      const joint = ((i + row * 7 + seed * 3) % 17) === 0;
      if (joint && k !== bh - 1) c = s.d;
      p.paint(x + i, y + j, c);
    }
  }
}

/** Vertical boards. */
export function planksV(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, bw = 4) {
  for (let i = 0; i < w; i++) {
    const k = i % bw;
    for (let j = 0; j < h; j++) {
      let c = s.m;
      if (k === 0) c = s.l;
      else if (k === bw - 1) c = s.d;
      p.paint(x + i, y + j, c);
    }
  }
}

/** Brick wall. mortar = s.l (light) ; bricks m with d shadow bottom-right, h highlight top-left. */
export function bricks(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, bw = 6, bh = 3) {
  for (let j = 0; j < h; j++) {
    const row = Math.floor(j / bh), k = j % bh;
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let i = 0; i < w; i++) {
      const q = (i + off) % bw;
      let c = s.m;
      if (k === bh - 1 || q === bw - 1) c = s.l; // mortar
      else if (k === 0 && q === 0 && s.h) c = s.h;
      else if (k === bh - 2 && bh > 2) c = (q > bw / 2 ? s.d : s.m);
      p.paint(x + i, y + j, c);
    }
  }
}

/** Irregular stone blocks (rows of varying widths). */
export function stones(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, sh = 4, seed = 3) {
  let r = seed;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  for (let row = 0; row * sh < h; row++) {
    let cx = -Math.floor(rnd() * 4);
    while (cx < w) {
      const bw = 4 + Math.floor(rnd() * 5);
      const tone = rnd();
      for (let j = 0; j < sh; j++) for (let i = 0; i < bw; i++) {
        const px = cx + i, py = row * sh + j;
        if (px < 0 || px >= w || py >= h) continue;
        let c = tone < 0.3 && s.o ? s.o : s.m;
        if (j === sh - 1 || i === bw - 1) c = s.d;
        else if (j === 0 || i === 0) c = s.l;
        if (j === 0 && i === 0 && s.h) c = s.h;
        p.paint(x + px, y + py, c);
      }
      cx += bw;
    }
  }
}

/** Shingle texture on an existing shape region (rows of scalloped/square shingles). */
export function shingles(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, rh = 3, sw = 4, style: 'square' | 'scallop' = 'square') {
  for (let j = 0; j < h; j++) {
    const row = Math.floor(j / rh), k = j % rh;
    const off = row % 2 ? Math.floor(sw / 2) : 0;
    for (let i = 0; i < w; i++) {
      const q = (i + off) % sw;
      let c = s.m;
      if (style === 'square') {
        if (k === rh - 1) c = s.d;
        else if (q === sw - 1 && k > 0) c = s.d;
        else if (k === 0 && q < sw - 1 && s.l) c = q === 0 && s.h ? s.h : s.l;
      } else {
        // scallop: rounded bottoms
        const edge = k === rh - 1 && (q === 0 || q === sw - 1);
        if (k === rh - 1 && !edge) c = s.d;
        else if (edge) c = s.m;
        else if (k === 0) c = s.l;
        if (k === rh - 2 && (q === 0 || q === sw - 1)) c = s.d;
      }
      p.paint(x + i, y + j, c);
    }
  }
}

export interface WinOpts { frame?: string; glass?: string; glass2?: string; shine?: string; sill?: string; cross?: boolean; lit?: boolean; shutters?: string; arch?: boolean }

/** Window with frame, glass, highlight, optional mullions, sill and shutters. (x,y,w,h = outer frame). */
export function win(p: PixelCanvas, x: number, y: number, w: number, h: number, o: WinOpts = {}) {
  const fr = o.frame ?? '9';
  const g1 = o.lit ? 'Y' : (o.glass ?? 'W');
  const g2 = o.lit ? 'y' : (o.glass2 ?? 'w');
  const sh = o.lit ? 'z' : (o.shine ?? 'a');
  if (o.shutters) {
    part(p, (q) => {
      q.rect(x - 3, y, 3, h, o.shutters!);
      q.rect(x + w, y, 3, h, o.shutters!);
      q.hline(x - 3, x - 1, y + Math.floor(h / 2), '0');
      q.hline(x + w, x + w + 2, y + Math.floor(h / 2), '0');
    }, null);
    p.vline(x - 3, y, y + h - 1, '0'); p.vline(x + w + 2, y, y + h - 1, '0');
  }
  p.rect(x - 1, y - 1, w + 2, h + 2, '0');
  p.rect(x, y, w, h, fr);
  if (o.arch) { p.set(x - 1, y, '0'); p.set(x + w, y, '0'); p.set(x, y, '0'); p.set(x + w - 1, y, '0'); }
  // glass
  const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const c = j < gh / 2 ? g1 : g2;
    p.set(gx + i, gy + j, c);
  }
  if (o.arch && gw > 2) { p.set(gx, gy, fr); p.set(gx + gw - 1, gy, fr); }
  // diagonal shine
  for (let k = 0; k < Math.min(gw, gh); k++) {
    const sx = gx + 1 + k, sy = gy + gh - 2 - k;
    if (sx < gx + gw && sy >= gy && k >= 1 && k <= 2) p.set(sx, sy, sh);
  }
  p.set(gx, gy, sh);
  if (o.cross !== false && gw >= 4) {
    p.vline(x + Math.floor(w / 2), gy, gy + gh - 1, fr);
    if (gh >= 4) p.hline(gx, gx + gw - 1, y + Math.floor(h / 2), fr);
  }
  if (o.sill !== undefined || true) {
    const sc = o.sill ?? fr;
    p.hline(x - 2, x + w + 1, y + h + 1, '0');
    p.hline(x - 1, x + w, y + h, sc);
    p.set(x - 2, y + h, '0'); p.set(x + w + 1, y + h, '0');
  }
}

/** Plank door (x,y top-left of the outer outline). */
export function door(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades, knob = 'Y', arch = true) {
  part(p, (q) => {
    q.rect(x, y, w, h, s.m);
    if (arch) { q.set(x, y, null); q.set(x + w - 1, y, null); }
    planksV(q, x, y, w, h, s, 3);
    // cross brace
    for (let i = 0; i < w; i++) q.paint(x + i, y + Math.floor(h / 2), s.d);
    q.paint(x + w - 3, y + Math.floor(h / 2) + 1, knob);
  }, '0');
}

/** Rising smoke puffs from chimney top (x,y), drifting up-right. t = 0|1 working phase. */
export function smoke(p: PixelCanvas, x: number, y: number, t: number, big = 1.3, cols: [string, string, string] = ['9', '8', '7']) {
  const puffs = t === 0
    ? [{ dx: 0, dy: 2, r: 1.6 }, { dx: 2, dy: 6, r: 2.4 }, { dx: 5, dy: 11, r: 3 }]
    : [{ dx: 1, dy: 3, r: 2 }, { dx: 3, dy: 8, r: 2.8 }, { dx: 7, dy: 13, r: 2.6 }];
  part(p, (q) => {
    for (const pf of puffs) q.ellipse(x + pf.dx * big, y - pf.dy * big, pf.r * big, pf.r * big * 0.9, cols[0]);
    const src = q.px.slice();
    for (let yy = 0; yy < q.h; yy++) for (let xx = 0; xx < q.w; xx++) {
      if (!(src[yy * q.w + xx] >>> 24)) continue;
      const below = yy + 1 < q.h && src[(yy + 1) * q.w + xx] >>> 24;
      const right = xx + 1 < q.w && src[yy * q.w + xx + 1] >>> 24;
      if (!below || !right) q.set(xx, yy, cols[1]);
    }
  }, cols[2]);
}

/** Small icon grid lookup for workshop signs (drawn with outline chars included). */
export const ICONS: Record<string, string[]> = {
  egg: [
    '..000..',
    '.09990.',
    '0999980',
    '0999980',
    '0998880',
    '.08880.',
    '..000..',
  ],
  cookie: [
    '..000..',
    '.0Bt0B0',
    '0tBnBB0',
    '0BBBnt0',
    '0nBtBB0',
    '.0bBnb0',
    '..000..',
  ],
  cake: [
    '...Q...',
    '..0Z0..',
    '.09Z990',
    '.0XXXX0',
    '0999999',
    '0XXXXXX',
    '0000000',
  ],
  yarn: [
    '..000..',
    '.0#X#0.',
    '0#X#X#0',
    '0X#X#X0',
    '0#X#X#0',
    '.0X#X00',
    '..000.0',
  ],
  fabric: [
    '0000000',
    '0NMNMN0',
    '0MNMNM0',
    '0NMNMN0',
    '0MNMNM0',
    '0000000',
    '.0P0...',
  ],
  shirt: [
    '.00.00.',
    '0W909W0',
    '0WW9WW0',
    '.0W9W0.',
    '.0W9W0.',
    '.0WWW0.',
    '.00000.',
  ],
  pillow: [
    '0.....0',
    '.00000.',
    '.09990.',
    '.09A90.',
    '.09990.',
    '.00000.',
    '0.....0',
  ],
  hat: [
    '.00000.',
    '.01110.',
    '.01110.',
    '.0QQQ0.',
    '0000000',
    '0111110',
    '.00000.',
  ],
  cream: [
    '.00000.',
    '0999990',
    '.09a90.',
    '.09990.',
    '.09a900',
    '.09990.',
    '.00000.',
  ],
  cheese: [
    '....00.',
    '..00YY0',
    '00YYYY0',
    '0YyYYy0',
    '0YYYyY0',
    '0yYYYY0',
    '0000000',
  ],
  icecream: [
    '..000..',
    '.0Z#Z0.',
    '0#ZZZ#0',
    '0XXXXX0',
    '.0tBt0.',
    '..0t0..',
    '...0...',
  ],
};

/** Painted sign board with an icon. (x,y) top-left of board incl. outline. */
export function signBoard(p: PixelCanvas, x: number, y: number, w: number, h: number, icon: string, board: Shades = { d: 'n', m: 'B', l: 't' }, bg = '&') {
  p.rect(x, y, w, h, '0');
  p.rect(x + 1, y + 1, w - 2, h - 2, board.m);
  p.hline(x + 1, x + w - 2, y + 1, board.l);
  p.hline(x + 1, x + w - 2, y + h - 2, board.d);
  p.vline(x + w - 2, y + 1, y + h - 2, board.d);
  p.rect(x + 2, y + 2, w - 4, h - 4, bg);
  const g = ICONS[icon];
  const ix = x + Math.floor((w - 7) / 2), iy = y + Math.floor((h - 7) / 2);
  p.grid(ix, iy, g);
}

/** Stone foundation strip. */
export function foundation(p: PixelCanvas, x: number, y: number, w: number, h: number, s: Shades = { d: '2', m: '6', l: '7', h: '8' }) {
  part(p, (q) => {
    q.rect(x, y, w, h, s.m);
    stones(q, x, y, w, h, s, 3, 7);
  }, '0');
}

/**
 * Side-gable / hip roof seen in 3/4 view: trapezoid from ridge (yTop) down to eave (yEave).
 * x0..x1 = eave extent (inclusive). inset = how much the ridge is narrower on each side.
 */
export function hipRoof(p: PixelCanvas, x0: number, x1: number, yTop: number, yEave: number, inset: number, s: Shades,
  o: { rh?: number; sw?: number; style?: 'square' | 'scallop'; ol?: string; fascia?: string; ridge?: string } = {}) {
  part(p, (q) => {
    q.poly([[x0 + inset, yTop], [x1 + 1 - inset, yTop], [x1 + 1, yEave + 1], [x0, yEave + 1]], s.m);
    shingles(q, x0, yTop + 2, x1 - x0 + 1, yEave - yTop - 1, s, o.rh ?? 3, o.sw ?? 4, o.style ?? 'square');
    // ridge cap
    for (let i = x0; i <= x1; i++) { q.paint(i, yTop, o.ridge ?? s.h ?? s.l); q.paint(i, yTop + 1, s.l); }
    // eave fascia
    for (let i = x0; i <= x1; i++) q.paint(i, yEave, o.fascia ?? s.d);
    // slanted ends: light on left edge, dark on right edge
    edgeShade(q, 'l', s.h ?? s.l);
    edgeShade(q, 'r', s.d);
  }, o.ol ?? '0');
}

/**
 * Front-gable roof (inverted V band) : peak at (cx, yPeak), eaves at y = yEave spanning x0..x1.
 * thick = visible roof depth (vertical thickness of the band).
 */
export function gableRoof(p: PixelCanvas, x0: number, x1: number, yEave: number, yPeak: number, thick: number, cx: number, sl: Shades, sr: Shades, ol = '0') {
  part(p, (q) => {
    // left plane
    q.poly([[x0, yEave + 1], [cx, yPeak + 1], [cx, yPeak - thick], [x0, yEave - thick]], sl.m);
    q.poly([[cx, yPeak + 1], [x1 + 1, yEave + 1], [x1 + 1, yEave - thick], [cx, yPeak - thick]], sr.m);
    // shingle rows following slope: stripe by distance from eave line
    const W = x1 - x0 + 1;
    for (let y = yPeak - thick - 2; y <= yEave + 1; y++) for (let x = x0; x <= x1; x++) {
      if (!q.opaque(x, y)) continue;
      const left = x < cx;
      const s = left ? sl : sr;
      // distance along slope from the bottom edge of band
      const t = left ? (x - x0) / (cx - x0) : (x1 - x) / (x1 - cx);
      const edgeY = yEave + 1 - t * (yEave - yPeak); // bottom edge y at this x
      const d = Math.floor(edgeY - y);
      const k = ((d % 3) + 3) % 3;
      const col = ((left ? x : W - x) + Math.floor(d / 3) * 2) % 4;
      let c = s.m;
      if (k === 0) c = s.d; else if (k === 2) c = s.l;
      if (col === 0 && k === 1) c = s.d;
      q.set(x, y, c);
    }
    // bottom edge (fascia) and top ridge highlight
    edgeShade(q, 'b', sl.d, x0, 0, cx - 1);
    edgeShade(q, 'b', sr.d, cx, 0, x1);
    edgeShade(q, 't', sl.h ?? sl.l, x0, 0, cx - 1);
    edgeShade(q, 't', sr.l, cx, 0, x1);
  }, ol);
}

/** Vertical cylinder banding (light from left). cols = [dark, mid, light, highlight]. Paints only inside. */
export function cylShade(p: PixelCanvas, x: number, y: number, w: number, h: number, cols: [string, string, string, string]) {
  for (let i = 0; i < w; i++) {
    const t = (i + 0.5) / w;
    let c = cols[1];
    if (t < 0.12) c = cols[1];
    else if (t < 0.22) c = cols[2];
    else if (t < 0.34) c = cols[3];
    else if (t < 0.46) c = cols[2];
    else if (t > 0.82) c = cols[0];
    for (let j = 0; j < h; j++) p.paint(x + i, y + j, c);
  }
}

/** Spoked wheel. angle in radians. */
export function wheel(p: PixelCanvas, cx: number, cy: number, r: number, angle: number, spokes: number, rim: Shades, hub = 'Y', ol = '0') {
  part(p, (q) => {
    q.ellipse(cx, cy, r, r, rim.m);
    q.ellipse(cx, cy, r - 2, r - 2, null);
    for (let k = 0; k < spokes; k++) {
      const a = angle + (k * Math.PI * 2) / spokes;
      q.line(Math.round(cx - 0.5), Math.round(cy - 0.5), Math.round(cx - 0.5 + Math.cos(a) * (r - 1.5)), Math.round(cy - 0.5 + Math.sin(a) * (r - 1.5)), rim.d);
    }
    q.ellipse(cx, cy, 1.6, 1.6, hub);
    // rim shading: highlight top-left of rim, dark bottom-right
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      if (d > r - 2.2 && d <= r + 0.5 && q.opaque(x, y)) q.set(x, y, dx + dy < -r * 0.5 ? rim.l : dx + dy > r * 0.6 ? rim.d : rim.m);
    }
  }, ol);
}

/** Tiny 4-point sparkle. */
export function sparkle(p: PixelCanvas, x: number, y: number, big = false, c = '9') {
  p.set(x, y, c); p.set(x - 1, y, 'z'); p.set(x + 1, y, 'z'); p.set(x, y - 1, 'z'); p.set(x, y + 1, 'z');
  if (big) { p.set(x - 2, y, 'Y'); p.set(x + 2, y, 'Y'); p.set(x, y - 2, 'Y'); p.set(x, y + 2, 'Y'); }
}

/**
 * Roof band following a facade profile y = yAt(x) (the eave/gable edge), extending `thick` px upward.
 * Left of cx uses sl shades, right uses sr. Shingle rows follow the profile.
 */
export function bandRoof(p: PixelCanvas, x0: number, x1: number, yAt: (x: number) => number, thick: number, cx: number, sl: Shades, sr: Shades, ol = '0') {
  part(p, (q) => {
    for (let x = x0; x <= x1; x++) {
      const yb = Math.round(yAt(x));
      const s = x < cx ? sl : sr;
      for (let d = 0; d <= thick; d++) {
        const y = yb - d;
        const k = d % 3;
        let c = k === 0 ? s.d : k === 2 ? s.l : s.m;
        if (k === 1 && ((x - x0) + Math.floor(d / 3) * 2) % 4 === 0) c = s.d;
        if (d === thick) c = s.h ?? s.l;
        if (d === 0) c = s.d;
        q.set(x, y, c);
      }
    }
  }, ol);
}
