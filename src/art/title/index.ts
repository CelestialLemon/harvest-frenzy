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

// ---- animated overlays drawn by the title scene on top of the baked background ----
import type { DrawSprite } from '../pixel';
import { makeCloudSprites, makeAirshipSprite } from './sky';
import { TURBINES, makeTurbineBlades } from './mid';

export { TURBINES };
export const titleBackgroundSprite: DrawSprite = { w: 640, h: 360, ox: 0, oy: 0, draw: (p) => drawTitleScene(p) };

const clouds = makeCloudSprites();
const airship = makeAirshipSprite();
const asDraw = (c: PixelCanvas): DrawSprite => ({ w: c.w, h: c.h, ox: 0, oy: 0, draw: (p) => p.blit(c, 0, 0) });

/** Sprites registered with the engine: title_cloud0.., title_airship, title_rotor0.. (4 frames each, hub at centre). */
export const titleOverlaySprites: Record<string, DrawSprite> = {
  title_airship: asDraw(airship),
  ...Object.fromEntries(clouds.map((c, i) => [`title_cloud${i}`, asDraw(c)])),
  ...Object.fromEntries(TURBINES.map((t, i) => {
    const side = makeTurbineBlades(0, t.s).w;
    const d: DrawSprite = { w: side, h: side, ox: side >> 1, oy: side >> 1, frames: 4, fps: 6, draw: (p, f) => p.blit(makeTurbineBlades(f, t.s), 0, 0) };
    return [`title_rotor${i}`, d];
  })),
};
export const CLOUD_COUNT = clouds.length;
