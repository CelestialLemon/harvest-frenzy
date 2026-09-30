import { PixelCanvas, type SpriteDef } from '../../pixel';
import { anim, thick } from './util';

// Predators: bear (32x28), polar bear (32x28), lion (32x26). All built from one parametric rig so
// every pose is consistent: walk f4 (all fours), attack f2 (rear up & swipe), caged f2 (sitting,
// grabbing bars), fall f1 (spread-eagle, surprised).

interface Species {
  h: number;
  hi: string; base: string; lo: string; // fur ramp
  muz: string; muzLo: string; // muzzle / belly
  pad: string; claw: string; nose: string;
  mane?: { hi: string; base: string; lo: string };
  hump: boolean;
  legW: number;
  earIn: string;
}

const BEAR: Species = {
  h: 28, hi: 'b', base: 'n', lo: 'r', muz: 'B', muzLo: 'b', pad: 'r', claw: '8', nose: '0',
  hump: true, legW: 4, earIn: 'r',
};
const POLAR: Species = {
  h: 28, hi: '9', base: '9', lo: 'a', muz: '8', muzLo: '7', pad: 'W', claw: '6', nose: '0',
  hump: true, legW: 4, earIn: 'a',
};
const LION: Species = {
  h: 26, hi: 't', base: 'B', lo: 'b', muz: '&', muzLo: 't', pad: 'n', claw: '8', nose: 'E',
  mane: { hi: 'b', base: 'n', lo: 'r' }, hump: false, legW: 3, earIn: 'n',
};

const W = 32;

/** Shade a single-color shape: rim-light top(-left), shadow bottom(-right). */
function shade(c: PixelCanvas, mask: PixelCanvas, hi: string, lo: string, loDepth = 1, hiDepth = 1) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!mask.opaque(x, y)) continue;
    let top = false;
    for (let d = 1; d <= hiDepth; d++) if (!mask.opaque(x, y - d)) top = true;
    if (top || (!mask.opaque(x - 1, y) && !mask.opaque(x - 1, y - 1))) c.set(x, y, hi);
    let bottom = false;
    for (let d = 1; d <= loDepth; d++) if (!mask.opaque(x, y + d)) bottom = true;
    if (bottom || !mask.opaque(x + 1, y) && !mask.opaque(x + 1, y + 1)) c.set(x, y, lo);
  }
}

/** Draw a shape via fn into a mask, fill with base, shade, then blit into target. */
function blob(target: PixelCanvas, fn: (m: PixelCanvas) => void, sp: { hi: string; base: string; lo: string }, loDepth = 1, hiDepth = 1) {
  const m = new PixelCanvas(target.w, target.h);
  fn(m);
  const c = new PixelCanvas(target.w, target.h);
  for (let i = 0; i < m.px.length; i++) if (m.px[i] >>> 24) c.px[i] = 1;
  c.clear();
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.opaque(x, y)) c.set(x, y, sp.base);
  shade(c, m, sp.hi, sp.lo, loDepth, hiDepth);
  target.blit(c, 0, 0);
}

/** A separately outlined part composited over the canvas (gives an internal contour line). */
function part(target: PixelCanvas, fn: (m: PixelCanvas) => void) {
  const c = new PixelCanvas(target.w, target.h);
  fn(c);
  c.outline('0');
  target.blit(c, 0, 0);
}

function limb(m: PixelCanvas, pts: [number, number][], w: number) {
  thick(m, pts.map(([x, y]) => [x - Math.floor(w / 2), y - Math.floor(w / 2)] as [number, number]), w, '9');
}

// ---------------------------------------------------------------------------------------------
// Side view (walk)

function sideHead(c: PixelCanvas, sp: Species, hx: number, hy: number) {
  // mane behind head (lion)
  if (sp.mane) {
    const cx = hx - 2, cy = hy + 0.5;
    part(c, (m) => blob(m, (mm) => {
      mm.circle(cx, cy, 5.8, '9');
      for (let a = 0; a < 11; a++) {
        const t = (a / 11) * Math.PI * 2 + 0.3;
        mm.circle(cx + Math.cos(t) * 5.8, cy + Math.sin(t) * 5.6, 1.8, '9');
      }
    }, sp.mane!, 2, 2));
    for (const [dx, dy] of [[-6, 0], [-5, 3], [-2, 5], [-5, -3], [-2, -5]]) { c.set(cx + dx, cy + dy, sp.mane.lo); c.set(cx + dx + 1, cy + dy + 1, sp.mane.lo); }
  }
  if (sp.mane) hx += 1;
  const r = sp.mane ? 3.6 : 4.6;
  const mx = hx + r - 0.2, my = hy + 1.3;
  part(c, (m) => {
    blob(m, (mm) => {
      mm.circle(hx, hy, r, '9');
      mm.circle(hx - 2.2, hy - r + 0.3, 1.8, '9'); // ear
      mm.ellipse(mx, my, sp.mane ? 2.2 : 2.6, sp.mane ? 1.7 : 2, '9'); // snout
    }, sp);
    m.set(hx - 2.2, hy - r + 0.3, sp.earIn);
    // muzzle color
    m.ellipse(mx + 0.3, my, sp.mane ? 1.8 : 2.2, sp.mane ? 1.3 : 1.6, sp.muz);
    m.hline(Math.round(mx - 1), Math.round(mx + 1), Math.round(my + 1), sp.muzLo);
    // nose at snout tip
    const nx = Math.round(mx + 2), ny = Math.round(my - 1);
    m.rect(nx, ny, 2, 2, sp.nose);
    m.set(nx + 1, ny + 1, sp.muz);
    // mouth line
    m.set(nx - 1, ny + 2, sp.muzLo);
    // eye with glint
    m.rect(hx + 1, hy - 2, 1, 2, '0');
    m.set(hx + 2, hy - 2, '0');
    m.set(hx + 1, hy - 2, '2');
  });
}

function walk(p: PixelCanvas, sp: Species, f: number) {
  const gy = sp.h - 2;
  const bob = f % 2 === 1 ? -1 : 0;
  const cy = gy - 11 + bob + (sp.mane ? 0 : 0);
  // leg swings: pair A = near-front + far-back, pair B = far-front + near-back
  const k = sp.mane ? 2 : 1;
  const sw: [number, number, number][] = [[k, -k, 0], [0, 0, 2], [-k, k, 0], [0, 0, 1]];
  const [dA, dB, lift] = sw[f];
  const lw = sp.legW;
  const legTop = cy + 2;
  const drawLeg = (m: PixelCanvas, x: number, dx: number, lifted: boolean, far: boolean) => {
    const foot = gy - (far ? 1 : 0) - (lifted ? 2 : 0);
    const knee = Math.round((legTop + foot) / 2);
    limb(m, [[x, legTop], [x + dx / 2, knee], [x + dx, foot - Math.floor(lw / 2) + (lw > 3 ? 1 : 0)]], lw);
  };
  const c = new PixelCanvas(W, sp.h);
  const legTone = (far: boolean) => (far ? { hi: sp.lo, base: sp.lo, lo: sp.pad } : { hi: sp.base, base: sp.base, lo: sp.lo });
  // far legs
  blob(c, (m) => {
    drawLeg(m, 21, dB, lift === 2, true);
    drawLeg(m, 10, dA, lift === 1, true);
  }, legTone(true));
  // tail
  if (sp.mane) {
    thick(c, [[4, cy], [2, cy - 3], [2, cy - 6]], 1, sp.lo);
    c.ellipse(2, cy - 7, 1.4, 1.6, sp.mane.base);
  } else c.circle(4, cy - 1, 1.6, sp.lo);
  // body
  blob(c, (m) => {
    m.ellipse(13, cy, sp.hump ? 9 : 9.5, sp.hump ? 6.2 : 4.8, '9');
    if (sp.hump) m.circle(16.5, cy - 1.8, 5.5, '9');
  }, sp, 2, 2);
  // fur tufts
  for (const [x, y] of [[8, 0], [9, 1], [13, 1], [14, 2], [11, -2]] as [number, number][]) c.set(x, cy + y, sp.lo);
  // near legs
  blob(c, (m) => {
    drawLeg(m, 18, dA, lift === 1, false);
    drawLeg(m, 7, dB, lift === 2, false);
  }, legTone(false));
  // paws: darker bottom row
  for (let x = 0; x < W; x++) {
    for (const y of [gy, gy - 1]) {
      if (c.opaque(x, y) && !c.opaque(x, y + 1)) c.set(x, y, sp.pad);
    }
  }
  c.outline('0');
  sideHead(c, sp, 23, cy - 2);
  p.blit(c, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Front / 3-4 face for rearing, sitting, falling.

type Expr = 'roar' | 'angry' | 'shout' | 'surprised';

function frontHead(c: PixelCanvas, sp: Species, hx: number, hy: number, expr: Expr) {
  const lion = !!sp.mane;
  if (sp.mane) {
    part(c, (m) => blob(m, (mm) => {
      mm.circle(hx, hy + 0.5, 6.2, '9');
      for (let a = 0; a < 12; a++) {
        const t = (a / 12) * Math.PI * 2;
        mm.circle(hx + Math.cos(t) * 6, hy + 0.5 + Math.sin(t) * 5.8, 1.7, '9');
      }
    }, sp.mane!, 1, 1));
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2 + 0.26;
      c.set(hx + Math.cos(t) * 5.6, hy + 0.5 + Math.sin(t) * 5.4, sp.mane.lo);
    }
  }
  const rx = lion ? 4.4 : 5.2, ry = lion ? 4 : 4.4;
  const face = (m: PixelCanvas) => blob(m, (mm) => {
    mm.ellipse(hx, hy, rx, ry, '9');
    const ex = lion ? 3.6 : 4, ey = lion ? 3.6 : 4, er = lion ? 1.4 : 1.9;
    mm.circle(hx - ex, hy - ey, er, '9');
    mm.circle(hx + ex, hy - ey, er, '9');
  }, sp);
  if (lion) part(c, face); else face(c);
  if (!lion) { c.set(hx - 4, hy - 4, sp.earIn); c.set(hx + 4, hy - 4, sp.earIn); }
  // muzzle
  c.ellipse(hx, hy + 2.2, 2.8, 1.9, sp.muz);
  c.hline(hx - 2, hx + 1, hy + 4, sp.muzLo);
  // nose
  c.rect(hx - 1, hy + 1, 2, 1, sp.nose);
  c.set(hx - 1, hy + 2, sp.nose); c.set(hx, hy + 2, sp.nose);
  c.set(hx - 1, hy + 1, sp.nose === '0' ? '2' : sp.nose); // nose shine
  // eyes
  const ex = [hx - 3, hx + 2];
  if (expr === 'surprised') {
    for (const x of ex) { c.rect(x, hy - 2, 2, 2, '9'); c.set(x + (x < hx ? 1 : 0), hy - 1, '0'); c.set(x + (x < hx ? 1 : 0), hy - 2, '0'); }
    // round "O" mouth
    c.rect(hx - 1, hy + 3, 2, 2, 'q');
  } else {
    for (const x of ex) c.rect(x, hy - 2, 2, 2, '0');
    c.set(ex[0] + 1, hy - 2, '9'); c.set(ex[1], hy - 2, '9'); // glint
    // angry brows slanting down to the middle
    c.set(ex[0] - 1, hy - 4, '0'); c.set(ex[0], hy - 3, '0'); c.set(ex[0] + 1, hy - 3, '0');
    c.set(ex[1] + 2, hy - 4, '0'); c.set(ex[1] + 1, hy - 3, '0'); c.set(ex[1], hy - 3, '0');
    if (expr === 'roar' || expr === 'shout') {
      c.rect(hx - 2, hy + 3, 4, 3, 'q');
      c.hline(hx - 1, hx, hy + 5, 'Q'); // tongue
      c.set(hx - 2, hy + 3, '9'); c.set(hx + 1, hy + 3, '9'); // fangs
    } else {
      c.hline(hx - 1, hx, hy + 3, '0');
    }
  }
}

function paw(c: PixelCanvas, sp: Species, x: number, y: number, claws: 'up' | 'down' | 'side') {
  if (claws === 'up') for (const dx of [-1, 0, 1]) c.set(x + dx, y - 2, sp.claw);
  if (claws === 'down') for (const dx of [-1, 0, 1]) c.set(x + dx, y + 2, sp.claw);
  if (claws === 'side') for (const dy of [-1, 0, 1]) c.set(x + 2, y + dy, sp.claw);
}

function attack(p: PixelCanvas, sp: Species, f: number) {
  const gy = sp.h - 2;
  const c = new PixelCanvas(W, sp.h);
  const bt = sp.h === 26 ? 2 : 0; // lion slightly smaller canvas
  // far arm
  const farEnd: [number, number] = f === 0 ? [21, 3 + bt] : [26, 10];
  blob(c, (m) => limb(m, [[14, 12 + bt], [17, 8 + bt], farEnd], 3), { hi: sp.lo, base: sp.lo, lo: sp.lo });
  paw(c, sp, farEnd[0], farEnd[1], f === 0 ? 'up' : 'side');
  // far hind leg
  blob(c, (m) => limb(m, [[10, gy - 5], [9, gy - 1]], 4), { hi: sp.lo, base: sp.lo, lo: sp.pad });
  // tail
  if (sp.mane) { thick(c, [[7, gy - 4], [4, gy - 2], [2, gy - 4]], 1, sp.lo); c.circle(2, gy - 5, 1.5, sp.mane.base); }
  // body (upright, leaning back a touch)
  blob(c, (m) => {
    m.ellipse(13, gy - 9, 6.5, 8.5 - bt / 2, '9');
  }, sp, 2);
  // belly
  c.ellipse(15, gy - 8, 3, 5 - bt / 2, sp.muz);
  c.vline(17, gy - 11, gy - 5, sp.muzLo);
  // near hind leg with big foot pointing forward
  blob(c, (m) => {
    limb(m, [[13, gy - 4], [14, gy - 1]], 4);
    m.rect(14, gy - 1, 5, 2, '9');
  }, { hi: sp.base, base: sp.base, lo: sp.lo });
  c.hline(14, 18, gy, sp.pad);
  // head
  frontHead(c, sp, 16, 7 + bt, f === 0 ? 'roar' : 'shout');
  c.outline('0');
  // near arm as its own outlined part so it reads in front of the body
  part(c, (m) => {
    const end: [number, number] = f === 0 ? [26, 4 + bt] : [28, 14];
    blob(m, (mm) => limb(mm, [[16, 13 + bt], [20, 10 + bt], end], 4), sp);
    // paw pad
    m.circle(end[0], end[1], 2, sp.base);
    m.set(end[0], end[1], sp.muz);
    paw(m, sp, end[0], end[1], f === 0 ? 'up' : 'side');
  });
  // swipe motion lines on f1
  if (f === 1) {
    for (const [x, y] of [[29, 8], [30, 9], [30, 11], [29, 17], [30, 16]] as [number, number][]) if (!c.opaque(x, y)) c.set(x, y, '9');
  }
  p.blit(c, 0, 0);
}

function caged(p: PixelCanvas, sp: Species, f: number) {
  const gy = sp.h - 2;
  const c = new PixelCanvas(W, sp.h);
  const bt = sp.h === 26 ? 2 : 0;
  const sh = f === 1 ? 1 : 0; // shake sideways
  // arms up grabbing (drawn behind head/body top, in front of body sides)
  const lion = !!sp.mane;
  const lEnd: [number, number] = lion ? (f === 0 ? [4, 3] : [3, 6]) : f === 0 ? [6, 4 + bt] : [5, 7 + bt];
  const rEnd: [number, number] = lion ? (f === 0 ? [28, 5] : [29, 2]) : f === 0 ? [26, 6 + bt] : [27, 3 + bt];
  const arms = () => {
    for (const [s, e] of [[[11 + sh, gy - 11], lEnd], [[21 + sh, gy - 11], rEnd]] as [[number, number], [number, number]][]) {
      part(c, (m) => {
        blob(m, (mm) => limb(mm, [s, e], 4), sp);
        m.circle(e[0], e[1], 2, sp.base);
        paw(m, sp, e[0], e[1], 'up');
      });
    }
  };
  if (lion) arms(); // lion: arms reach up behind the big mane
  // body sitting
  blob(c, (m) => m.ellipse(16 + sh, gy - 7, 8, 7.5 - bt / 2, '9'), sp, 2);
  c.ellipse(16 + sh, gy - 6, 4.2, 4.5 - bt / 2, sp.muz);
  c.hline(13 + sh, 18 + sh, gy - 2, sp.muzLo);
  // feet (soles facing viewer)
  for (const fx of [10, 22]) {
    blob(c, (m) => m.ellipse(fx + sh, gy - 1, 3, 2, '9'), sp);
    c.ellipse(fx + sh, gy - 1, 1.6, 1, sp.muz);
    for (const dx of [-2, 0, 2]) c.set(fx + sh + dx, gy - 3, sp.muzLo);
  }
  if (sp.mane) { thick(c, [[23 + sh, gy - 1], [27, gy - 2], [29, gy - 5]], 1, sp.lo); c.circle(29, gy - 6, 1.5, sp.mane.base); }
  frontHead(c, sp, 16 + sh, 10 + bt / 2, f === 0 ? 'angry' : 'shout');
  c.outline('0');
  if (!lion) arms();
  p.blit(c, 0, 0);
}

function fall(p: PixelCanvas, sp: Species) {
  const c = new PixelCanvas(W, sp.h);
  const bt = sp.h === 26 ? 1 : 0;
  const lion = !!sp.mane;
  const arms = () => {
    for (const [s, e] of [[[11, 13 - bt], [3, 7 - bt]], [[21, 13 - bt], [29, 7 - bt]]] as [[number, number], [number, number]][]) {
      part(c, (m) => {
        blob(m, (mm) => limb(mm, [s, e], 4), sp);
        m.circle(e[0], e[1], 1.8, sp.base);
        paw(m, sp, e[0], e[1], 'up');
      });
    }
  };
  if (lion) arms();
  // legs spread down
  blob(c, (m) => {
    limb(m, [[12, 19 - bt], [8, 24 - bt]], 4);
    limb(m, [[20, 19 - bt], [24, 24 - bt]], 4);
  }, sp);
  for (const x of [8, 24]) { c.ellipse(x, 24.5 - bt, 1.6, 1, sp.muz); }
  if (sp.mane) { thick(c, [[16, 22 - bt], [16, 25 - bt]], 1, sp.lo); c.circle(16, 25 - bt, 1.3, sp.mane.base); }
  blob(c, (m) => m.ellipse(16, 16 - bt, 6.5, 6, '9'), sp, 2);
  c.ellipse(16, 17 - bt, 3.5, 3.5, sp.muz);
  frontHead(c, sp, 16, 8, 'surprised');
  c.outline('0');
  if (!lion) arms(); // arms flung up/out
  // wind streaks above (falling)
  for (const [x, y] of [[6, 1], [6, 2], [26, 1], [26, 2], [16, 0]] as [number, number][]) if (!c.opaque(x, y)) c.set(x, y, '9');
  p.blit(c, 0, 0);
}

function set(prefix: string, sp: Species): Record<string, SpriteDef> {
  return {
    [`${prefix}_walk`]: anim(W, sp.h, 4, (p, f) => walk(p, sp, f), { fps: 6 }),
    [`${prefix}_attack`]: anim(W, sp.h, 2, (p, f) => attack(p, sp, f), { fps: 4 }),
    [`${prefix}_caged`]: anim(W, sp.h, 2, (p, f) => caged(p, sp, f), { fps: 5 }),
    [`${prefix}_fall`]: anim(W, sp.h, 1, (p) => fall(p, sp), { fps: 1 }),
  };
}

export const predatorSprites: Record<string, SpriteDef> = {
  ...set('bear', BEAR),
  ...set('lion', LION),
  ...set('polar', POLAR),
};
