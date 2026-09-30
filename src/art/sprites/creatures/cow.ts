import { PixelCanvas, type SpriteDef } from '../../pixel';
import { anim, g, leg } from './util';

// Cow 32x26 facing right: white with black patches, pink muzzle, small horns, cowbell.
const W = 32, H = 26;

function torso(c: PixelCanvas, by: number) {
  const y = 7 + by;
  // body: rounded box
  c.rect(4, y + 1, 19, 9, '9');
  c.rect(5, y, 17, 11, '9');
  c.rect(6, y - 1, 12, 1, '9'); // slight hump over shoulders/back
  // shading: belly + rump
  c.hline(5, 21, y + 10, '8');
  c.hline(4, 22, y + 9, '8');
  c.vline(22, y + 1, y + 9, '8');
  // black patches (clipped to body)
  const patch = (cx: number, cy: number, rx: number, ry: number) => {
    const t = new PixelCanvas(W, H);
    t.ellipse(cx, cy + by, rx, ry, '1');
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (t.opaque(xx, yy) && c.opaque(xx, yy)) c.set(xx, yy, '1');
  };
  patch(9, 10, 3.6, 2.8);
  patch(17.5, 8, 2.6, 2);
  patch(15, 15.5, 2.4, 1.6);
  patch(5, 15, 1.6, 1.8);
  // patch highlights (sheen)
  c.paint(7, 9 + by, '2'); c.paint(8, 8 + by, '2');
  c.paint(17, 7 + by, '2');
  // udder
  c.rect(9, y + 11, 4, 1, 'Z');
  c.set(9, y + 12, 'X'); c.set(12, y + 12, 'X');
  // tail
  c.vline(3, y + 1, y + 8, '8');
  c.rect(2, y + 8, 2, 2, '1');
  c.set(3, y + 10, '1');
}

const HEAD = [
  '..4...4...',
  '..&4.&4...',
  '.999999...',
  'ZX91999...',
  '.9990999..',
  '..999999..',
  '..99ZZZZZ.',
  '..9ZZZZZZ.',
  '...ZZTZZT.',
  '...XZZZZX.',
  '....XXXX..',
];
const HEAD_DOWN = [
  '..4.......',
  '.&4..4....',
  'ZX99&4....',
  '.999999...',
  '..9199999.',
  '..9909999.',
  '...999ZZZ.',
  '...9ZZZZZZ',
  '....ZZTZZT',
  '....XZZZZX',
  '.....XXXX.',
];

function bell(c: PixelCanvas, x: number, y: number) {
  c.rect(x, y, 2, 2, 'Y');
  c.set(x + 1, y + 1, 'y');
  c.set(x, y + 2, 'y');
  c.set(x + 1, y + 2, 'y');
}

function cow(p: PixelCanvas, f: number, eat: number) {
  const walk: [number, number, number, number][] = [
    [1, -1, 0, 0], [0, 0, -1, 2], [-1, 1, 0, 0], [0, 0, -1, 1],
  ];
  const [dA, dB, bob, lift] = eat >= 0 ? [0, 0, 0, 0] : walk[f];
  const c = new PixelCanvas(W, H);
  const hip = 17 + bob;
  const la = lift === 1 ? 23 : 24, lb = lift === 2 ? 23 : 24;
  // far legs
  leg(c, 17, hip, lb - 1, dB, '7', '1', 3, 2);
  leg(c, 8, hip, la - 1, dA, '7', '1', 3, 2);
  // near legs
  leg(c, 19, hip, la, dA, '9', '1', 3, 2);
  leg(c, 5, hip, lb, dB, '9', '1', 3, 2);
  // knee shade on near legs
  torso(c, bob);
  if (eat < 0) {
    g(c, 20, 2 + bob, HEAD);
    bell(c, 21, 15 + bob);
  } else {
    g(c, 20, eat === 0 ? 6 : 12, HEAD_DOWN);
    bell(c, 20, 16);
  }
  c.outline('0');
  p.blit(c, 0, 0);
}

export const cowSprites: Record<string, SpriteDef> = {
  cow_walk: anim(W, H, 4, (p, f) => cow(p, f, -1), { fps: 6 }),
  cow_eat: anim(W, H, 2, (p, f) => cow(p, 0, f), { fps: 3 }),
};
