import { PixelCanvas, type SpriteDef } from '../../pixel';
import { anim, thick, g } from './util';

// Ostrich 24x32 facing right: black puffy body, white plumes, long pink neck & legs.
const W = 24, H = 32;

type LegPose = { knee: [number, number]; foot: [number, number] };

function ostLeg(p: PixelCanvas, hip: [number, number], pose: LegPose, col: string, shade: string) {
  const [hx, hy] = hip;
  const k: [number, number] = [hx + pose.knee[0], hy + pose.knee[1]];
  const f: [number, number] = [hx + pose.foot[0], hy + pose.foot[1]];
  thick(p, [[hx, hy], k], 2, col); // thigh
  thick(p, [[k[0], k[1] + 1], f], 1, col); // shin
  p.set(k[0] + 1, k[1] + 1, shade); // knee joint
  // toes pointing forward
  p.rect(f[0], f[1], 3, 1, col);
  p.set(f[0] + 2, f[1], shade);
}

function body(c: PixelCanvas, by: number) {
  // tail plume (white, fanned up-left)
  c.poly([[1, 9 + by], [6, 12 + by], [6, 17 + by], [2, 15 + by], [0.5, 12 + by]], '9');
  c.ellipse(10.5, 16 + by, 7.5, 4.6, '1');
  c.ellipse(9.5, 14 + by, 5.5, 1.8, '2');
  c.hline(7, 11, 12 + by, '6');
  // white wing plume on the side with scalloped lower edge
  c.ellipse(9.5, 17 + by, 4.6, 1.8, '9');
  c.hline(6, 13, 18 + by, '8');
  for (const x of [6, 9, 12]) c.set(x, 19 + by, '8');
  // tail shade
  c.set(2, 14 + by, '8'); c.set(3, 15 + by, '8'); c.set(4, 15 + by, '8'); c.set(1, 11 + by, '8');
  // ragged belly feathers
  for (const x of [5, 8, 11, 14]) c.set(x, 21 + by, '1');
}

const HEAD = [
  '.%ZZZ...',
  '%ZZ90Z..',
  'ZZZ00Ztt',
  '.ZZZZZtB',
  '..ZZ....',
];
const HEAD_DOWN = [
  '..ZZ...',
  '.%ZZZZ.',
  '%ZZ90ZZ',
  'ZZZ00ZZ',
  '.ZZZZt.',
  '....tB.',
];

function ostrich(p: PixelCanvas, by: number, near: LegPose, far: LegPose, neck: [number, number][], head: string[], hp: [number, number]) {
  const c = new PixelCanvas(W, H);
  ostLeg(c, [9, 20 + by], far, 'X', 'T');
  body(c, by);
  thick(c, neck, 2, 'Z');
  g(c, hp[0], hp[1], head);
  ostLeg(c, [12, 20 + by], near, 'Z', 'X');
  c.outline('0');
  p.blit(c, 0, 0);
}

// Leg poses relative to hip (hip y = 20). Ground contact at y=30.
const P = {
  fwd: (by: number): LegPose => ({ knee: [2, 4], foot: [2, 10 - by] }),
  back: (by: number): LegPose => ({ knee: [0, 4], foot: [-3, 10 - by] }),
  mid: (by: number): LegPose => ({ knee: [1, 4], foot: [-1, 10 - by] }),
  lift: (by: number): LegPose => ({ knee: [3, 3], foot: [1, 7 - by] }),
};

export const ostrichSprites: Record<string, SpriteDef> = {
  ostrich_walk: anim(W, H, 4, (p, f) => {
    const by = f % 2 === 1 ? -1 : 0;
    const poses: [LegPose, LegPose][] = [
      [P.fwd(by), P.back(by)],
      [P.mid(by), P.lift(by)],
      [P.back(by), P.fwd(by)],
      [P.lift(by), P.mid(by)],
    ];
    const [n, fa] = poses[f];
    const hx = f % 2 === 0 ? 1 : 0; // head sways forward on contact frames
    ostrich(p, by, n, fa, [[15, 15 + by], [16, 11 + by], [16 + hx, 7 + by], [16 + hx, 5 + by]], HEAD, [14 + hx, 2 + by]);
  }, { fps: 8 }),
  ostrich_eat: anim(W, H, 2, (p, f) => {
    if (f === 0) {
      ostrich(p, 0, P.mid(0), P.back(0), [[15, 15], [17, 13], [19, 15], [19, 18]], HEAD_DOWN, [17, 18]);
    } else {
      ostrich(p, 0, P.mid(0), P.back(0), [[15, 15], [18, 13], [19, 16], [19, 23]], HEAD_DOWN, [17, 23]);
    }
  }, { fps: 4 }),
};
