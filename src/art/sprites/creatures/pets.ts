import { PixelCanvas, type SpriteDef } from '../../pixel';
import { anim, g, leg } from './util';

// ---------------------------------------------------------------------------------------------
// Cat 16x14: orange tabby. Palette: t = highlight, y = base, b = stripes/shade, & = cream muzzle/belly.
const CW = 16, CH = 14;

const CAT_HEAD = [
  'y...y.',
  'yy.yy.',
  'tyyyyy',
  'y0yb0y',
  'yy&Z&y',
  '.&&&&.',
];

const CAT_BODY = [
  '..tbttbt..',
  'yyybyybyy.',
  'yyyyyyyyy.',
  '.yy&&&&y..',
];

function catWalk(p: PixelCanvas, f: number) {
  const sw: [number, number, number, number][] = [[1, -1, 0, 0], [0, 0, -1, 2], [-1, 1, 0, 0], [0, 0, -1, 1]];
  const [dA, dB, bob, lift] = sw[f];
  const c = new PixelCanvas(CW, CH);
  const top = 9 + bob;
  const la = lift === 1 ? 11 : 12, lb = lift === 2 ? 11 : 12;
  // far legs (darker)
  leg(c, 9, top, lb - 1, dB, 'b', 'b', 1);
  leg(c, 5, top, la - 1, dA, 'b', 'b', 1);
  g(c, 2, 6 + bob, CAT_BODY);
  // tail: curls up behind
  const tailSway = f % 2 === 0 ? 0 : 1;
  c.set(2, 6 + bob, 'y'); c.set(1, 5 + bob, 'y'); c.set(1, 4 + bob, 'y'); c.set(1 + tailSway, 3 + bob, 'b'); c.set(1 + tailSway, 2 + bob, 'b');
  // near legs
  leg(c, 10, top, la, dA, 'y', 't', 1);
  leg(c, 4, top, lb, dB, 'y', 't', 1);
  g(c, 9, 1 + bob, CAT_HEAD);
  c.outline('0');
  p.blit(c, 0, 0);
}

const CAT_SIT = [
  '......y...y.',
  '......yy.yy.',
  '......tyyyyy',
  '......y0yb0y',
  '......yy&Z&y',
  '.....tt&&&&.',
  '....tyyy&&y.',
  '....yybyy&y.',
  '....ybyyy&y.',
  '...yyybyy&y.',
  '...yyyyyy&&.',
  '....yyy&&.&&',
];

function catIdle(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(CW, CH);
  g(c, 2, 1, CAT_SIT);
  // tail wrapping on the ground, tip swishes
  if (f === 0) {
    c.hline(1, 4, 12, 'y'); c.set(1, 11, 'y'); c.set(1, 10, 'b'); c.set(2, 9, 'b');
  } else {
    c.hline(1, 4, 12, 'y'); c.set(0 + 1, 11, 'y'); c.set(0 + 1, 11, 'b'); c.set(1, 12, 'y'); c.set(1, 11, 'b');
    c.set(2, 11, 'b');
  }
  c.outline('0');
  p.blit(c, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// Dog 20x16: brown & white farm dog (collie-ish). b = brown base, B = highlight, n = shade, 9/8 = white.
const DW = 20, DH = 16;

const DOG_BODY = [
  '..BBBBBBBB....',
  '.bbbbbbbbbb9..',
  'bbbnbbbbbb999.',
  'nbbbbbbbb8999.',
  '.nnn888888899.',
];
const DOG_HEAD = [
  '..bBBb..',
  '.bBBbbb.',
  'nnbb0b99',
  'nnbbb991',
  '.nbb9999',
  '..b9999.',
  '...99...',
];
const DOG_HEAD_BARK = [
  '..bBBb..',
  '.bBBbbb.',
  'nnbb0b99',
  'nnbbb991',
  '.nbb99qq',
  '..b99qZ.',
  '...999..',
];

function dogBase(c: PixelCanvas, bob: number, tail: number) {
  g(c, 2, 6 + bob, DOG_BODY);
  // tail: up and wagging
  const t = [[[2, 6], [1, 5], [1, 4], [0, 3]], [[2, 6], [1, 5], [2, 4], [2, 3]]][tail];
  t.forEach(([x, y], i) => c.set(x + 1, y + bob, i === 3 ? '9' : 'b'));
}

function dogLegs(c: PixelCanvas, dA: number, dB: number, bob: number, lift: number) {
  const top = 10 + bob;
  const la = lift === 1 ? 13 : 14, lb = lift === 2 ? 13 : 14;
  leg(c, 12, top, lb - 1, dB, 'n', 'n', 2);
  leg(c, 5, top, la - 1, dA, 'n', 'n', 2);
  leg(c, 14, top, la, dA, '9', '8', 2);
  leg(c, 3, top, lb, dB, 'b', '9', 2);
}

function dogWalk(p: PixelCanvas, f: number) {
  const sw: [number, number, number, number][] = [[1, -1, 0, 0], [0, 0, -1, 2], [-1, 1, 0, 0], [0, 0, -1, 1]];
  const [dA, dB, bob, lift] = sw[f];
  const c = new PixelCanvas(DW, DH);
  dogLegs(c, dA, dB, bob, lift);
  dogBase(c, bob, f % 2);
  g(c, 11, 2 + bob, DOG_HEAD);
  // tongue out while running
  c.set(16, 8 + bob, 'Z');
  c.outline('0');
  p.blit(c, 0, 0);
}

function dogBark(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(DW, DH);
  dogLegs(c, 0, 0, 0, 0);
  dogBase(c, 0, f);
  if (f === 0) g(c, 11, 2, DOG_HEAD);
  else g(c, 11, 1, DOG_HEAD_BARK);
  c.outline('0');
  p.blit(c, 0, 0);
}

const DOG_SIT = [
  '........bBBb..',
  '.......bBBbbb.',
  '......nnbb0b99',
  '......nnbbb991',
  '.......nbb9999',
  '......bbb9999.',
  '.....bbbb99...',
  '....Bbbbb99...',
  '....bbbbb99...',
  '...bbbnbb99...',
  '...bbbbnb99...',
  '...nbbb9n99...',
  '...nnn99.99...',
];

function dogIdle(p: PixelCanvas, f: number) {
  const c = new PixelCanvas(DW, DH);
  g(c, 2, 1, DOG_SIT);
  // wagging tail on the ground behind
  if (f === 0) { c.set(4, 13, 'b'); c.set(3, 13, 'b'); c.set(2, 12, 'b'); c.set(1, 11, '9'); }
  else { c.set(4, 13, 'b'); c.set(3, 13, 'b'); c.set(2, 13, 'b'); c.set(1, 13, '9'); }
  // ear flop / head tilt
  if (f === 1) { c.set(9, 4, null); c.set(9, 5, null); c.set(9, 6, 'n'); c.set(10, 6, 'n'); }
  c.outline('0');
  p.blit(c, 0, 0);
}

export const petSprites: Record<string, SpriteDef> = {
  cat_walk: anim(CW, CH, 4, catWalk, { fps: 8 }),
  cat_idle: anim(CW, CH, 2, catIdle, { fps: 2 }),
  dog_walk: anim(DW, DH, 4, dogWalk, { fps: 9 }),
  dog_bark: anim(DW, DH, 2, dogBark, { fps: 5 }),
  dog_idle: anim(DW, DH, 2, dogIdle, { fps: 4 }),
};
