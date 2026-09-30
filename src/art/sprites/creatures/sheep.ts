import { PixelCanvas, type SpriteDef } from '../../pixel';
import { g, anim, leg } from './util';

// Sheep 24x20 facing right: fluffy wool cloud, dark face and legs.
const W = 24, H = 20;

// Fleece = overlapping wool lumps in a brick pattern. Lower rows drawn first so each upper lump's
// shaded underside overlaps the lump below -> scalloped "fish scale" wool with a bumpy silhouette.
const LUMP = ['.999.', '99999', '89998', '.888.'];
const LUMP_DARK = ['.888.', '88888', '78887', '.777.'];
const ROWS: [number, number[], boolean][] = [
  [11, [3, 7, 11, 15], true],
  [8, [1, 5, 9, 13, 16], false],
  [5, [3, 7, 11, 14], false],
  [3, [7, 11], false],
];

function wool(p: PixelCanvas, dy: number) {
  const c = new PixelCanvas(W, H);
  for (const [y, xs, dark] of ROWS) for (const x of xs) g(c, x, y + dy, dark ? LUMP_DARK : LUMP);
  p.blit(c, 0, 0);
}

// Head: dark face facing right, wool tuft on top, floppy ear.
const HEAD = [
  '...99....',
  '..9998...',
  '..222222.',
  '5122222222',
  '.5122990222',
  '..222290222',
  '...22222222',
  '....2222221',
  '.....1111.',
];
const HEAD_DOWN = [
  '..999.....',
  '.99982....',
  '5122222...',
  '.512222222',
  '..222992222',
  '..222290222',
  '...22222221',
  '....222211.',
];

function sheep(p: PixelCanvas, f: number, eat: number) {
  const walk: [number, number, number, number][] = [
    // dxA, dxB, bob, lift (0 none, 1 pair A, 2 pair B)
    [1, -1, 0, 0], [0, 0, -1, 2], [-1, 1, 0, 0], [0, 0, -1, 1],
  ];
  const [dA, dB, bob, lift] = eat >= 0 ? [0, 0, 0, 0] : walk[f];
  const c = new PixelCanvas(W, H);
  const hip = 14 + bob;
  const la = lift === 1 ? 17 : 18, lb = lift === 2 ? 17 : 18;
  // far legs (darker)
  leg(c, 13, hip, lb - 1, dB, '1', '0');
  leg(c, 7, hip, la - 1, dA, '1', '0');
  // near legs
  leg(c, 15, hip, la, dA, '2', '1');
  leg(c, 4, hip, lb, dB, '2', '1');
  wool(c, bob);
  if (eat < 0) g(c, 13, 3 + bob, HEAD);
  else if (eat === 0) g(c, 13, 8, HEAD_DOWN);
  else g(c, 13, 11, HEAD_DOWN);
  c.outline('0');
  p.blit(c, 0, 0);
}

export const sheepSprites: Record<string, SpriteDef> = {
  sheep_walk: anim(W, H, 4, (p, f) => sheep(p, f, -1), { fps: 7 }),
  sheep_eat: anim(W, H, 2, (p, f) => sheep(p, 0, f), { fps: 4 }),
};
