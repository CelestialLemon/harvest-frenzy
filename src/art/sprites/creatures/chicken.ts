import { PixelCanvas, type SpriteDef } from '../../pixel';
import { g, anim } from './util';

// Chicken 16x16, facing right. Parts are filled, auto-outlined, then legs drawn on top.
const BODY = [
  '................',
  '................',
  '................',
  '.9..............',
  '.99.............',
  '.899............',
  '.8899...........',
  '.889999999999...',
  '.8899888889999..',
  '..8988888899998.',
  '..8887777788888.',
  '...77888888877..',
];

const HEAD = [
  '..Q.Q..',
  '.QQQQ..',
  '.99999.',
  '999909Y',
  '999999y',
  '99999QQ',
  '9999.Q.',
];

const BODY_EAT = [
  '................',
  '................',
  '.9..............',
  '.99.............',
  '.899............',
  '.8899...........',
  '.88999999999....',
  '..899888899999..',
  '..89888888999...',
  '..8887777788....',
  '...778888877....',
];

const HEAD_PECK = [
  '...QQ.',
  '..9999Q',
  '.99999Q',
  '.99099.',
  '..999Y.',
  '...QYy.',
];
const HEAD_LOW = [
  '...Q.Q.',
  '...QQQQ',
  '..99999',
  '.999909Y',
  '9999999y',
  '9999999Q',
  '.999.QQ',
];

function part(rows: string[], x: number, y: number): PixelCanvas {
  const c = new PixelCanvas(16, 16);
  g(c, x, y, rows);
  return c;
}

type Pose = 'stand' | 'fwd' | 'back' | 'lift';
function legs(p: PixelCanvas, x: number, pose: Pose, top: number) {
  const c = 'y', d = 'O';
  for (let y = top; y <= 13; y++) p.set(x, y, c);
  if (pose === 'stand') { p.set(x, 14, c); p.set(x + 1, 14, d); p.set(x - 1, 14, d); }
  if (pose === 'fwd') { p.set(x + 1, 14, c); p.set(x + 2, 14, d); p.set(x, 14, d); }
  if (pose === 'back') { p.set(x - 1, 14, c); p.set(x, 14, d); p.set(x - 2, 14, d); }
  if (pose === 'lift') { p.set(x + 1, 13, d); p.set(x, 13, c); }
}

/** Body+head merged in one silhouette (head up), or head as its own outlined part (eating). */
function chicken(p: PixelCanvas, bob: number, hx: number, hy: number, separateHead: boolean, tailUp = 0) {
  const b = part(BODY, 0, bob - tailUp);
  if (!separateHead) {
    g(b, hx, hy + bob, HEAD);
    b.outline('0');
    p.blit(b, 0, 0);
    return;
  }
  // neck
  b.outline('0');
  p.blit(b, 0, 0);
  const h = part(HEAD, hx, hy);
  // neck stub connecting to body
  h.rect(hx - 1, hy + 2, 3, 3, '9');
  h.outline('0');
  p.blit(h, 0, 0);
}

const WALK: [Pose, Pose, number][] = [
  ['fwd', 'back', 0],
  ['stand', 'lift', -1],
  ['back', 'fwd', 0],
  ['lift', 'stand', -1],
];

export const chickenSprites: Record<string, SpriteDef> = {
  chicken_walk: anim(16, 16, 4, (p, f) => {
    const [a, b, bob] = WALK[f];
    chicken(p, bob, 8, 1, false);
    legs(p, 6, a, 12 + bob);
    legs(p, 9, b, 12 + bob);
  }, { fps: 8 }),
  chicken_eat: anim(16, 16, 2, (p, f) => {
    const b = part(BODY_EAT, 0, 1);
    if (f === 0) g(b, 7, 3, HEAD_LOW);
    else g(b, 9, 8, HEAD_PECK);
    b.outline('0');
    p.blit(b, 0, 0);
    legs(p, 6, 'stand', 12);
    legs(p, 9, 'stand', 12);
  }, { fps: 5 }),
};
