// Vehicles: farm truck & cargo helicopter (both face LEFT). Anchor top-left.
import { PixelCanvas, type DrawSprite } from '../../pixel';
import { part, planksH, planksV, edgeShade, type Shades } from './common';

const WOOD: Shades = { d: 'n', m: 'b', l: 'B', h: 't' };

function tire(p: PixelCanvas, cx: number, cy: number, phase: number) {
  part(p, (q) => {
    q.circle(cx, cy, 5.5, '1');
    // tread notches
    for (let k = 0; k < 8; k++) {
      const a = phase * (Math.PI / 8) + (k * Math.PI) / 4;
      q.set(Math.floor(cx + Math.cos(a) * 4.8), Math.floor(cy + Math.sin(a) * 4.8), '2');
    }
    q.circle(cx, cy, 3, '7');
    q.circle(cx, cy, 2, '8');
    q.set(Math.floor(cx) - 1, Math.floor(cy) - 2, '9');
    // bolts
    for (let k = 0; k < 4; k++) {
      const a = phase * (Math.PI / 4) + (k * Math.PI) / 2 + Math.PI / 4;
      q.set(Math.floor(cx + Math.cos(a) * 1.6), Math.floor(cy + Math.sin(a) * 1.6), '6');
    }
    q.set(Math.floor(cx), Math.floor(cy), '2');
  }, '0');
}

function crate(p: PixelCanvas, x: number, y: number, w: number, h: number) {
  part(p, (q) => {
    q.rect(x, y, w, h, 'b');
    planksH(q, x, y, w, h, WOOD, 3);
    q.vline(x, y, y + h - 1, 'B'); q.vline(x + w - 1, y, y + h - 1, 'n');
    q.line(x + 1, y + h - 2, x + w - 2, y + 1, 'n');
  });
}

export const truck: DrawSprite = {
  w: 56, h: 32, frames: 4, fps: 8, ox: 0, oy: 0,
  draw(p, f) {
    const loaded = f >= 2, ph = f % 2;
    const bob = 0;
    // cargo (behind bed rails)
    if (loaded) {
      crate(p, 41, 1, 12, 13);
      crate(p, 30, 4, 11, 10);
      // sack slumped on top-left crate + a milk can
      part(p, (q) => { q.ellipse(34.5, 4, 4, 3, 't'); q.rect(33, 0, 3, 2, 't'); q.hline(33, 35, 1, 'B'); for (let x = 35; x < 39; x++) q.paint(x, 5, 'B'); });
      part(p, (q) => { q.rect(46, 0, 5, 1, '7'); q.hline(46, 50, 0, '8'); });
    }
    // bed: stake rails
    part(p, (q) => {
      for (const x of [29, 36, 43, 50, 53]) { q.rect(x, 8 + bob, 2, 8, 'b'); q.vline(x, 8 + bob, 15 + bob, 'B'); }
      q.rect(29, 8 + bob, 26, 2, 'b'); q.hline(29, 54, 8 + bob, 'B'); q.hline(29, 54, 9 + bob, 'n');
      q.rect(29, 12 + bob, 26, 2, 'b'); q.hline(29, 54, 12 + bob, 'B');
    });
    // body
    part(p, (q) => {
      // bed box
      q.rect(28, 15, 27, 9, 'R');
      // cab
      q.poly([[14, 24], [14, 7], [16, 4], [27, 4], [29, 7], [29, 24]], 'R');
      // hood (rounded nose)
      q.poly([[2, 24], [2, 16], [4, 13], [15, 12], [15, 24]], 'R');
      // shading
      for (let y = 0; y < 26; y++) for (let x = 0; x < 56; x++) {
        if (!q.opaque(x, y)) continue;
        let c = 'Q';
        if (y >= 21) c = 'R';
        if (y === 23) c = 'r';
        q.set(x, y, c);
      }
      edgeShade(q, 't', 'o'); edgeShade(q, 'l', 'e', 0, 0, 20, 25);
      // hood highlight line and cab shine
      q.hline(5, 13, 14, 'o'); q.hline(4, 12, 15, 'e');
      // white stripe
      q.hline(3, 54, 18, '9'); q.hline(3, 54, 19, '8');
      // bed panel seams
      q.vline(28, 15, 23, 'R'); q.vline(41, 15, 23, 'R'); q.vline(54, 15, 23, 'R');
      // door seam + handle
      q.vline(15, 8, 22, 'R'); q.set(25, 16, '8'); q.set(24, 16, '8');
    });
    // window with driver
    part(p, (q) => {
      q.poly([[16, 13], [16, 8], [18, 6], [27, 6], [27, 13]], 'a');
      q.rect(22, 6, 5, 7, 'W');
      q.set(17, 8, '9'); q.set(18, 7, '9');
    }, null);
    // driver: straw hat + face looking left
    p.grid(18, 6, [
      '.tttt..',
      'ttBttt.',
      '.&&&0..',
      '.0&&&..',
      '.&&&w..',
      '.wwww..',
      '.wwww..',
    ].map((r) => r + '..').map((r) => r.slice(0, 9)).map((r, i) => r), {});
    p.set(19, 8, '&');
    // grille + headlight + bumper
    p.vline(2, 17, 21, '1'); p.vline(3, 18, 21, '2');
    part(p, (q) => { q.rect(2, 14, 3, 3, 'Y'); q.set(2, 14, 'z'); }, '0');
    part(p, (q) => { q.rect(0, 22, 6, 3, '7'); q.hline(0, 5, 22, '8'); q.rect(52, 22, 4, 3, '7'); q.hline(52, 55, 22, '8'); }, '0');
    // tail light
    p.set(54, 16, 'Y'); p.set(54, 17, 'O');
    // fender arches (dark)
    part(p, (q) => { q.ellipse(13, 24, 7.5, 5, '1'); q.ellipse(42, 24, 7.5, 5, '1'); q.rect(0, 25, 56, 7, null); }, null);
    tire(p, 13, 25.5, ph);
    tire(p, 42, 25.5, ph);
    // exhaust puff while driving (empty frames show a tiny puff alternating)
    if (ph === 1) { p.set(55, 22, '8'); p.set(55, 21, '9'); }
  },
};

export const helicopter: DrawSprite = {
  w: 56, h: 36, frames: 3, fps: 16, ox: 0, oy: 0,
  draw(p, f) {
    // tail boom
    part(p, (q) => {
      q.poly([[30, 15], [50, 17], [50, 21], [30, 25]], 'Y');
      for (let y = 0; y < 36; y++) for (let x = 30; x < 52; x++) if (q.opaque(x, y) && y >= 20) q.set(x, y, 'y');
      edgeShade(q, 't', 'z');
    });
    // tail fin
    part(p, (q) => {
      q.poly([[46, 18], [50, 7], [54, 7], [53, 20]], 'Q');
      edgeShade(q, 'l', 'e'); edgeShade(q, 'r', 'R');
    });
    // tail rotor
    part(p, (q) => {
      if (f === 0) { q.line(48, 11, 54, 17, '2'); }
      else if (f === 1) { q.line(47, 14, 55, 14, '2'); }
      else { q.line(48, 17, 54, 11, '2'); }
      q.circle(51, 14, 1.2, '7');
    }, null);
    // mast
    part(p, (q) => { q.rect(22, 5, 4, 7, '7'); q.vline(22, 5, 11, '8'); q.vline(25, 5, 11, '6'); });
    // skids
    part(p, (q) => {
      q.line(12, 26, 10, 31, '7'); q.line(30, 26, 32, 31, '7');
      q.hline(6, 40, 32, '7'); q.hline(6, 40, 31, '8'); q.set(5, 31, '7'); q.set(4, 30, '7');
    });
    // body
    part(p, (q) => {
      q.ellipse(20, 20, 16, 9.5, 'Y');
      q.rect(20, 12, 13, 15, 'Y');
      q.ellipse(31, 20, 5, 7, 'Y');
      for (let y = 0; y < 36; y++) for (let x = 0; x < 40; x++) {
        if (!q.opaque(x, y)) continue;
        if (y >= 25) q.set(x, y, 'y');
        else if (y >= 23) q.set(x, y, x % 2 ? 'Y' : 'Y');
      }
      edgeShade(q, 't', 'z');
      // red stripe
      for (let x = 0; x < 40; x++) { q.paint(x, 22, 'Q'); q.paint(x, 23, 'R'); }
      // door outline
      q.strokeRect(20, 13, 9, 12, 'y');
      q.set(27, 19, '6');
    });
    // cockpit glass (front/left)
    part(p, (q) => {
      q.ellipse(13, 18, 9, 7, 'W');
      q.rect(13, 11, 10, 11, null); q.rect(0, 21, 30, 10, null);
      for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) {
        if (!q.opaque(x, y)) continue;
        const dx = x - 13, dy = y - 17;
        if (dx + dy < -8) q.set(x, y, 'a');
      }
      q.set(8, 14, '9'); q.set(9, 13, '9'); q.set(7, 16, '9');
    }, '0');
    // door window
    part(p, (q) => { q.rect(22, 15, 5, 4, 'W'); q.set(22, 15, 'a'); q.set(23, 15, 'a'); }, null);
    // pilot silhouette
    p.grid(14, 13, ['.YY.', 'Y&&.', '&0&.', '.&&.'], {});
    // rotor hub + main rotor
    part(p, (q) => {
      q.rect(20, 3, 8, 3, '2'); q.hline(20, 27, 3, '7');
      if (f === 0) { q.hline(1, 54, 3, '6'); q.hline(1, 54, 4, '2'); }
      else if (f === 1) { q.hline(10, 44, 4, '2'); q.hline(6, 48, 3, '8'); }
      else { q.hline(3, 52, 4, '6'); q.hline(3, 52, 5, '2'); }
    }, null);
    if (f === 1) { for (let x = 2; x < 54; x += 3) p.set(x, 2, '8'); }
    p.set(24, 2, '0'); p.set(23, 2, '0');
    void planksV;
  },
};

export const vehicles: Record<string, DrawSprite> = { truck, helicopter };
