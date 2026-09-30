// UI kit: 9-slice panels, slots, buttons, icons, medals, bars, bubble, hint arrow, cursor. Agent C.
// 9-slice sprites keep their stretchable middle rows/columns perfectly uniform, so the engine may
// either stretch or tile the middle segments.
import { PixelCanvas, parseColor, type DrawSprite, type SpriteDef } from '../pixel';

const INK = parseColor('0');

type Col = string;
type Side4 = [Col | null, Col | null, Col | null, Col | null]; // top, left, bottom, right

// ---------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------

/**
 * Rounded rectangle drawn as concentric bevel layers. layers[i] = color of ring i (0 = outermost),
 * either one color or [top,left,bottom,right]. Pixels deeper than the layers get `fill`.
 */
function bevel(p: PixelCanvas, x0: number, y0: number, w: number, h: number, r: number, layers: (Col | Side4)[], fill: Col | null) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const qx = Math.max(r - x - 0.5, x + 0.5 - (w - r), 0);
    const qy = Math.max(r - y - 0.5, y + 0.5 - (h - r), 0);
    let d: number;
    let side: number; // 0 top 1 left 2 bottom 3 right
    const dl = x, dr = w - 1 - x, dt = y, db = h - 1 - y;
    if (qx > 0 && qy > 0) {
      const dist = Math.hypot(qx, qy);
      if (dist > r + 0.05) continue;
      d = Math.floor(r - dist + 0.35);
      if (d < 0) d = 0;
      const vert = qy >= qx;
      side = vert ? (dt < db ? 0 : 2) : (dl < dr ? 1 : 3);
    } else {
      d = Math.min(dl, dr, dt, db);
      side = d === dt ? 0 : d === db ? 2 : d === dl ? 1 : 3;
      // prefer the lit side on the bottom-left / top-right diagonals
      if (d === dt && d === dr) side = 0;
      if (d === db && d === dl) side = 1;
    }
    let c: Col | null;
    if (d < layers.length) {
      const L = layers[d];
      c = typeof L === 'string' ? L : L[side];
    } else c = fill;
    if (c) p.set(x0 + x, y0 + y, c);
  }
}

function mask(fn: (t: PixelCanvas) => void, w = 12, h = 12): PixelCanvas {
  const t = new PixelCanvas(w, h);
  fn(t);
  return t;
}

/** Shaded part with a 1px outline ring (ol) around it and a bottom-right shade band. */
function part(p: PixelCanvas, m: PixelCanvas, base: Col, sh?: Col | null, dk?: Col | null, ol: Col | null = '0', band = 0) {
  const o = (x: number, y: number) => m.opaque(x, y);
  if (ol) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (o(x, y)) continue;
    if (o(x - 1, y) || o(x + 1, y) || o(x, y - 1) || o(x, y + 1)) p.set(x, y, ol);
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!o(x, y)) continue;
    let c = base;
    if (sh) {
      let edge = false;
      for (let k = 1; k <= band + 1 && !edge; k++) if (!o(x + k, y) || !o(x, y + k) || !o(x + k, y + k)) edge = true;
      if (edge) c = sh;
      if (dk && (!o(x + 1, y + 1) || !o(x, y + 1))) c = dk;
    }
    p.set(x, y, c);
  }
}

function dots(p: PixelCanvas, c: Col, pts: [number, number][]) {
  for (const [x, y] of pts) p.set(x, y, c);
}

/** Thick line mask helper. */
function thick(t: PixelCanvas, pts: [number, number][], r = 1) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
      t.rect(Math.round(x - r / 2), Math.round(y - r / 2), r, r, '9');
    }
  }
}

function icon(draw: (p: PixelCanvas) => void, rim: Col | null = '0'): DrawSprite {
  return { w: 12, h: 12, ox: 6, oy: 6, draw: (p) => { draw(p); if (rim) p.innerOutline(rim); } };
}

// ---------------------------------------------------------------------------------------------
// panels & slot
// ---------------------------------------------------------------------------------------------

const ui_panel: DrawSprite = {
  w: 24, h: 24, ox: 0, oy: 0,
  draw: (p) => {
    bevel(p, 0, 0, 24, 24, 4, [
      '0',
      ['t', 'B', 'n', 'b'],
      ['B', 'B', 'n', 'n'],
      ['B', 'b', 'n', 'n'],
      ['b', 'b', 'n', 'n'],
      ['m', 'm', 'b', 'b'],
      '0',
      ['%', '%', '&', '&'],
    ], '&');
    // brass corner nails
    for (const [x, y] of [[2, 2], [20, 2], [2, 20], [20, 20]] as [number, number][]) {
      dots(p, 'Y', [[x, y], [x + 1, y], [x, y + 1]]);
      dots(p, 'y', [[x + 1, y + 1]]);
      dots(p, '9', [[x, y]]);
    }
  },
};

const ui_panel_dark: DrawSprite = {
  w: 24, h: 24, ox: 0, oy: 0,
  draw: (p) => {
    bevel(p, 0, 0, 24, 24, 3, [
      '0',
      ['b', 'n', 'm', 'm'],
      ['n', 'n', 'p', 'p'],
      ['m', 'm', 'n', 'n'],
      '0',
      ['c', 'c', '1', '1'],
    ], '1');
  },
};

const ui_slot: DrawSprite = {
  w: 22, h: 22, ox: 0, oy: 0,
  draw: (p) => {
    bevel(p, 0, 0, 22, 22, 3, [
      '3',
      ['$', '$', '%', '%'],
    ], '%');
  },
};

// ---------------------------------------------------------------------------------------------
// buttons 16x18: 9-slice inset 5 (left/right/top), 7 (bottom). Frames [normal, hover, pressed]
// ---------------------------------------------------------------------------------------------

interface Ramp { hi2: Col; hi: Col; base: Col; sh: Col; dk: Col }
const RAMPS: Record<string, Ramp> = {
  green: { hi2: 'H', hi: 'h', base: 'G', sh: 'F', dk: 'f' },
  orange: { hi2: 'z', hi: 'Y', base: 'y', sh: 'O', dk: 'n' },
  red: { hi2: '%', hi: 'o', base: 'Q', sh: 'q', dk: 'r' },
  blue: { hi2: '9', hi: 'a', base: 'W', sh: 'w', dk: 'U' },
  gray: { hi2: '9', hi: '8', base: '7', sh: '6', dk: '2' },
};

function button(r: Ramp): DrawSprite {
  return {
    w: 16, h: 18, frames: 3, ox: 0, oy: 0,
    draw: (p, f) => {
      const pressed = f === 2, hover = f === 1;
      const top = pressed ? 2 : 0;
      const h = 18 - top;
      // whole body (face + lip) as bevel, then paint the lip rows
      bevel(p, 0, top, 16, h, 3, [
        '0',
        [hover ? r.hi2 : r.hi, r.hi, r.sh, r.sh],
      ], r.base);
      if (hover) { p.hline(3, 12, top + 2, r.hi); p.set(1, top + 2, r.hi); p.set(14, top + 2, r.sh); }
      const lipRows = pressed ? 1 : 3;
      for (let y = 17 - lipRows; y < 17; y++) for (let x = 0; x < 16; x++) {
        if (p.opaque(x, y) && p.get(x, y) !== INK) p.set(x, y, r.dk);
      }
      // seam between face and lip
      const seam = 17 - lipRows - 1;
      for (let x = 0; x < 16; x++) if (p.opaque(x, seam) && p.get(x, seam) !== INK) p.set(x, seam, r.sh);
      // small gloss spark (in the top-left corner cell, outside the stretch zone)
      p.set(2, top + 2, r.hi2);
      p.set(3, top + 2, hover ? r.hi2 : r.hi);
    },
  };
}

const ui_btn_round: DrawSprite = {
  w: 20, h: 20, frames: 3, ox: 0, oy: 0,
  draw: (p, f) => {
    const r = RAMPS.green;
    const pressed = f === 2, hover = f === 1;
    const R = 8.4;
    const lip = mask((t) => t.circle(10, 10.6, R, '9'), 20, 20);
    const face = mask((t) => t.circle(10, pressed ? 10.6 : 9.2, R, '9'), 20, 20);
    const union = mask((t) => { t.blit(lip, 0, 0); t.blit(face, 0, 0); }, 20, 20);
    // outline ring around everything
    part(p, union, r.dk, null, null, '0');
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      if (!face.opaque(x, y)) continue;
      let c = r.base;
      const edgeTL = !face.opaque(x - 1, y) || !face.opaque(x, y - 1);
      const edgeBR = !face.opaque(x + 1, y) || !face.opaque(x, y + 1);
      if (edgeTL && x + y < 21) c = hover ? r.hi2 : r.hi;
      else if (edgeBR) c = r.sh;
      p.set(x, y, c);
    }
    if (hover) for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      if (!face.opaque(x, y) || x + y > 15) continue;
      const inner = !face.opaque(x - 2, y) || !face.opaque(x, y - 2);
      if (inner && p.get(x, y) === parseColor(r.base)) p.set(x, y, r.hi);
    }
    const dy = pressed ? 1 : 0;
    dots(p, r.hi2, [[5, 5 + dy], [4, 6 + dy], [6, 4 + dy]]);
  },
};

// ---------------------------------------------------------------------------------------------
// icons 12x12
// ---------------------------------------------------------------------------------------------

const icon_coin = icon((p) => {
  part(p, mask((t) => t.circle(6, 6, 5.4, '9')), 'Y', 'y', 'O', '0', 0);
  p.ring(6, 6, 3.4, 3.4, 'y');
  p.rect(5, 4, 2, 4, 'O');
  p.vline(5, 4, 7, 'y');
  dots(p, 'z', [[3, 3], [2, 4], [3, 2], [4, 2], [2, 5]]);
  dots(p, '9', [[3, 3]]);
});

function starMask(cx = 6, cy = 6.4, R = 5.9, r = 2.6) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return mask((t) => t.poly(pts, '9'));
}
const icon_star = icon((p) => {
  part(p, starMask(), 'Y', 'y', 'O', '0', 0);
  dots(p, 'z', [[5, 3], [5, 4], [4, 5], [3, 5], [6, 2]]);
  dots(p, '9', [[5, 4]]);
});
const icon_star_empty = icon((p) => {
  part(p, starMask(), '2', '1', null, '0', 0);
  dots(p, '6', [[5, 3], [5, 4], [4, 5], [3, 5], [6, 2]]);
});

const icon_clock = icon((p) => {
  part(p, mask((t) => t.circle(6, 6, 5.4, '9')), 'Q', 'q', null, '0', 0);
  part(p, mask((t) => t.circle(6, 6, 3.9, '9')), '9', '8', null, null, 0);
  dots(p, '7', [[6, 2], [2, 6], [10, 6], [6, 10]]);
  dots(p, '0', [[6, 3], [6, 4], [6, 5], [6, 6], [7, 6], [8, 6]]);
  dots(p, 'e', [[3, 2], [2, 3]]);
});

const icon_pause = icon((p) => {
  part(p, mask((t) => { t.rect(3, 2, 2, 8, '9'); t.rect(7, 2, 2, 8, '9'); }), '9', '8', null, '0');
});
const icon_play = icon((p) => {
  part(p, mask((t) => t.poly([[3, 1.5], [10.5, 6], [3, 10.5]], '9')), '9', '8', null, '0');
});

function noteMask() {
  return mask((t) => {
    t.rect(5, 1, 6, 2, '9');
    t.vline(5, 1, 8, '9');
    t.vline(10, 1, 7, '9');
    t.ellipse(3.6, 8.6, 2, 1.6, '9');
    t.ellipse(8.6, 7.6, 2, 1.6, '9');
  });
}
function slash(p: PixelCanvas) {
  const m = mask((t) => thick(t, [[1.5, 1.5], [10.5, 10.5]], 2));
  part(p, m, 'Q', null, null, '0');
}
const icon_music = icon((p) => part(p, noteMask(), '9', '8', null, '0'));
const icon_music_off = icon((p) => { part(p, noteMask(), '8', '7', null, '0'); slash(p); });

function speakerMask() {
  return mask((t) => { t.rect(1, 4, 3, 4, '9'); t.poly([[3, 4], [7, 0.5], [7, 11.5], [3, 8]], '9'); });
}
const icon_sound = icon((p) => {
  part(p, speakerMask(), '9', '8', null, '0');
  const waves = mask((t) => { t.vline(9, 4, 7, '9'); t.set(8, 3, '9'); t.set(8, 8, '9'); t.vline(11, 3, 8, '9'); t.set(10, 2, '9'); t.set(10, 9, '9'); });
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (waves.opaque(x, y)) p.set(x, y, '9');
});
const icon_sound_off = icon((p) => {
  part(p, speakerMask(), '8', '7', null, '0');
  const x = mask((t) => { thick(t, [[8, 3.5], [11, 8.5]], 1); thick(t, [[11, 3.5], [8, 8.5]], 1); });
  part(p, x, 'Q', null, null, '0');
});

const icon_check = icon((p) => {
  const m = mask((t) => thick(t, [[2, 6], [4.5, 8.5], [10, 3]], 2));
  part(p, m, 'G', 'F', null, '0');
  dots(p, 'h', [[2, 5], [3, 6], [9, 2], [8, 3]]);
});
const icon_cross = icon((p) => {
  const m = mask((t) => { thick(t, [[2.5, 2.5], [9.5, 9.5]], 2); thick(t, [[9.5, 2.5], [2.5, 9.5]], 2); });
  part(p, m, 'Q', 'q', null, '0');
  dots(p, 'o', [[2, 2], [3, 3], [9, 2]]);
});

const icon_lock = icon((p) => {
  const sh = mask((t) => { t.ring(6, 4.6, 3.4, 3.6, '9'); t.ring(6, 4.6, 2.6, 2.8, '9'); });
  sub(sh, (t) => t.rect(0, 5, 12, 7, '9'));
  part(p, sh, '8', '7', null, '0');
  const body = mask((t) => t.rect(2, 5, 8, 6, '9'));
  part(p, body, 'Y', 'y', 'O', '0', 0);
  p.hline(3, 8, 5, 'z');
  dots(p, '0', [[5, 7], [6, 7], [5, 8], [6, 8]]);
  dots(p, 'O', [[5, 9], [6, 9]]);
});

const icon_home = icon((p) => {
  const walls = mask((t) => t.rect(2, 5, 8, 6, '9'));
  part(p, walls, '9', '8', null, '0');
  const roof = mask((t) => t.poly([[0, 6.5], [6, 0.5], [12, 6.5]], '9'));
  part(p, roof, 'Q', 'q', null, '0');
  dots(p, 'o', [[5, 2], [4, 3], [3, 4]]);
  p.rect(5, 8, 2, 3, 'b');
  p.set(5, 8, 'n');
});

const icon_restart = icon((p) => {
  const ring = mask((t) => t.circle(6, 6.5, 5, '9'));
  sub(ring, (t) => { t.circle(6, 6.5, 2.3, '9'); t.rect(6, 0, 6, 7, '9'); });
  const head = mask((t) => t.poly([[5, -0.5], [9.5, 2.5], [5, 5.5]], '9'));
  const m = mask((t) => { t.blit(ring, 0, 0); t.blit(head, 0, 0); });
  part(p, m, '9', '8', null, '0');
});

const icon_up = icon((p) => {
  const m = mask((t) => { t.poly([[6, 0.5], [11.5, 6], [0.5, 6]], '9'); t.rect(4, 6, 4, 5, '9'); });
  part(p, m, 'G', 'F', null, '0');
  dots(p, 'h', [[5, 2], [4, 3], [3, 4], [5, 3]]);
  dots(p, 'H', [[5, 2]]);
});
const icon_plus = icon((p) => part(p, mask((t) => { t.rect(5, 1, 2, 10, '9'); t.rect(1, 5, 10, 2, '9'); }), '9', '8', null, '0'));
const icon_minus = icon((p) => part(p, mask((t) => t.rect(1, 5, 10, 2, '9')), '9', '8', null, '0'));

const icon_water = icon((p) => {
  const m = mask((t) => { t.circle(6, 7.3, 4, '9'); t.poly([[6, 0], [9.6, 6.5], [2.4, 6.5]], '9'); });
  part(p, m, 'W', 'w', 'U', '0', 0);
  dots(p, 'a', [[4, 6], [4, 7], [5, 5]]);
  dots(p, '9', [[4, 7]]);
});

const icon_truck = icon((p) => {
  const cargo = mask((t) => t.rect(5, 2, 6, 6, '9'));
  part(p, cargo, 'B', 'b', null, '0');
  p.hline(5, 10, 2, 't');
  p.vline(8, 3, 7, 'b');
  const cab = mask((t) => { t.rect(1, 5, 4, 4, '9'); t.rect(2, 3, 3, 2, '9'); });
  part(p, cab, 'Q', 'q', null, '0');
  dots(p, 'a', [[2, 4], [3, 4]]);
  p.hline(1, 10, 8, 'q');
  for (const x of [3, 9]) {
    part(p, mask((t) => t.circle(x + 0.5, 9.5, 1.6, '9')), '1', null, null, '0');
    p.set(x, 9, '7');
  }
});

const icon_heli = icon((p) => {
  const tail = mask((t) => { t.rect(6, 4, 5, 2, '9'); t.rect(10, 2, 1, 2, '9'); });
  part(p, tail, 'Y', 'y', null, '0');
  const body = mask((t) => t.ellipse(4.5, 6.5, 3.6, 2.8, '9'));
  part(p, body, 'Y', 'y', null, '0');
  dots(p, 'a', [[2, 5], [3, 5], [2, 6]]);
  dots(p, '9', [[2, 5]]);
  // rotor & skids
  p.hline(0, 9, 1, '0'); p.set(5, 2, '0');
  p.hline(1, 8, 11, '0'); p.set(3, 10, '0'); p.set(6, 10, '0');
});

const icon_goal = icon((p) => {
  const flag = mask((t) => t.poly([[3, 0.5], [11, 3], [3, 6.5]], '9'));
  part(p, flag, 'Q', 'q', null, '0');
  dots(p, 'o', [[4, 2], [5, 2]]);
  const pole = mask((t) => t.rect(2, 1, 1, 10, '9'));
  part(p, pole, 'B', null, null, '0');
  p.set(2, 0, 'Y');
});

const icon_menu = icon((p) => part(p, mask((t) => { t.rect(1, 1, 10, 2, '9'); t.rect(1, 5, 10, 2, '9'); t.rect(1, 9, 10, 2, '9'); }), '9', '8', null, '0'));

function arrowMask(flip: boolean) {
  const m = mask((t) => { t.poly([[5.5, 0.5], [11, 6], [5.5, 11.5]], '9'); t.rect(1, 4, 5, 4, '9'); });
  return flip ? m.flipX() : m;
}
const icon_next = icon((p) => part(p, arrowMask(false), '9', '8', null, '0'));
const icon_back = icon((p) => part(p, arrowMask(true), '9', '8', null, '0'));

function sub(m: PixelCanvas, fn: (t: PixelCanvas) => void) {
  const c = mask(fn, m.w, m.h);
  for (let i = 0; i < m.px.length; i++) if (c.px[i]) m.px[i] = 0;
  return m;
}

// ---------------------------------------------------------------------------------------------
// medals 16x20 (anchor center)
// ---------------------------------------------------------------------------------------------

function medal(disc: Ramp | null): DrawSprite {
  return {
    w: 16, h: 20, ox: 8, oy: 10,
    draw: (p) => {
      const W = 16, H = 20;
      const left = mask((t) => t.poly([[2, 0], [7, 0], [9.5, 9], [5, 9]], '9'), W, H);
      const right = mask((t) => t.poly([[9, 0], [14, 0], [11, 9], [6.5, 9]], '9'), W, H);
      const discM = mask((t) => t.circle(8, 13.5, 5.8, '9'), W, H);
      if (!disc) {
        // dashed empty slot
        const ring = mask((t) => t.ring(8, 13.5, 5.8, 5.8, '9'), W, H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (!ring.opaque(x, y)) continue;
          const a = Math.atan2(y + 0.5 - 13.5, x + 0.5 - 8);
          if (Math.floor(((a + Math.PI) / (2 * Math.PI)) * 18) % 2 === 0) p.set(x, y, '6');
        }
        for (const [x, y] of [[3, 0], [4, 2], [5, 4], [6, 6], [12, 0], [11, 2], [10, 4], [9, 6]] as [number, number][]) p.set(x, y, '6');
        for (const [x, y] of [[4, 0], [5, 2], [6, 4], [11, 0], [10, 2], [9, 4]] as [number, number][]) p.set(x, y, '6');
        return;
      }
      part(p, right, 'w', 'U', null, '0');
      part(p, left, 'Q', 'q', null, '0');
      p.vline(4, 0, 3, 'o'); p.set(5, 4, 'o');
      p.vline(11, 0, 3, 'W');
      part(p, discM, disc.base, disc.sh, disc.dk, '0', 0);
      p.ring(8, 13.5, 4.2, 4.2, disc.sh);
      // embossed star
      const st = mask((t) => {
        const pts: [number, number][] = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 === 0 ? 3.3 : 1.4;
          pts.push([8 + Math.cos(a) * rr, 13.8 + Math.sin(a) * rr]);
        }
        t.poly(pts, '9');
      }, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (st.opaque(x, y)) p.set(x, y, st.opaque(x + 1, y + 1) ? disc.hi : disc.sh);
      dots(p, disc.hi2, [[4, 10], [5, 9], [4, 11]]);
      dots(p, disc.hi, [[6, 9], [3, 12]]);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// progress bar, bubble, hint arrow, cursor
// ---------------------------------------------------------------------------------------------

const progress_bar: DrawSprite = {
  w: 8, h: 6, frames: 2, ox: 0, oy: 0,
  draw: (p, f) => {
    if (f === 0) {
      bevel(p, 0, 0, 8, 6, 1.5, ['0', ['c', 'c', '1', '1']], '1');
    } else {
      p.hline(1, 6, 1, 'h');
      p.hline(1, 6, 2, 'G');
      p.hline(1, 6, 3, 'G');
      p.hline(1, 6, 4, 'F');
      p.set(1, 1, 'G'); p.set(6, 1, 'G');
      p.set(1, 4, null); p.set(6, 4, null);
    }
  },
};

const bubble: DrawSprite = {
  w: 16, h: 16, ox: 0, oy: 0,
  draw: (p) => bevel(p, 0, 0, 16, 16, 4, ['0'], '9'),
};

const bubble_tail: SpriteDef = {
  // top row overlaps the bubble's bottom outline row: draw at y = bubbleY + bubbleH - 1
  frames: [[
    '09999990',
    '.099990.',
    '.09990..',
    '.0990...',
    '.090....',
    '.00.....',
  ]],
  ox: 0, oy: 0,
};

const arrow_hint: DrawSprite = {
  w: 12, h: 14, frames: 2, ox: 6, oy: 14, fps: 4,
  draw: (p, f) => {
    const dy = f === 0 ? 0 : 2;
    const m = new PixelCanvas(12, 14);
    m.rect(3, 1 + dy, 6, 6, '9');
    m.poly([[0.5, 6 + dy], [11.5, 6 + dy], [6, 12 + dy - (f === 1 ? 0.5 : 0)]], '9');
    part(p, m, 'Y', 'O', null, '0', 1);
    dots(p, 'z', [[4, 2 + dy], [4, 3 + dy], [4, 4 + dy], [4, 5 + dy], [2, 7 + dy]]);
    dots(p, '9', [[4, 2 + dy]]);
    p.innerOutline('0');
  },
};

const HAND = [
  '.000........',
  '09990.......',
  '09990.......',
  '09980.......',
  '0998000000..',
  '09989989980.',
  '09989989980.',
  '09999999980.',
  '09989999980.',
  '0999899980..',
  '.099999980..',
  '.0YYYYYYy0..',
  '.0yyyyyyy0..',
  '.000000000..',
];
const cursor: SpriteDef = {
  frames: [HAND, ['............', ...HAND.slice(0, 1), ...HAND.slice(2)]],
  ox: 1, oy: 1,
};

export const sprites: Record<string, SpriteDef> = {
  ui_panel, ui_panel_dark, ui_slot,
  ui_btn_green: button(RAMPS.green),
  ui_btn_orange: button(RAMPS.orange),
  ui_btn_red: button(RAMPS.red),
  ui_btn_blue: button(RAMPS.blue),
  ui_btn_gray: button(RAMPS.gray),
  ui_btn_round,
  icon_coin, icon_star, icon_star_empty, icon_clock, icon_pause, icon_play, icon_music, icon_music_off,
  icon_sound, icon_sound_off, icon_check, icon_cross, icon_lock, icon_home, icon_restart, icon_up,
  icon_plus, icon_minus, icon_water, icon_truck, icon_heli, icon_goal, icon_menu, icon_next, icon_back,
  medal_gold: medal({ hi2: '9', hi: 'z', base: 'Y', sh: 'y', dk: 'O' }),
  medal_silver: medal({ hi2: '9', hi: '9', base: '8', sh: '7', dk: '6' }),
  medal_bronze: medal({ hi2: 't', hi: 'B', base: 'b', sh: 'n', dk: 'm' }),
  medal_none: medal(null),
  progress_bar, bubble, bubble_tail, arrow_hint, cursor,
};
