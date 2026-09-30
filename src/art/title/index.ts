// Solarpunk title screen: three painter's-algorithm layers (far → near) composed into one 640x360 backdrop.
import { PixelCanvas } from '../pixel';
import { drawSky } from './sky';
import { drawMid } from './mid';
import { drawFore } from './fore';

export type TitleLayer = 'sky' | 'mid' | 'fore' | 'all';

/** Draw the title background onto p (640x360). `only` is for previews of a single layer. */
export function drawTitleScene(p: PixelCanvas, only: TitleLayer = 'all') {
  if (only === 'all' || only === 'sky') drawSky(p);
  if (only === 'all' || only === 'mid') drawMid(p);
  if (only === 'all' || only === 'fore') drawFore(p);
}
