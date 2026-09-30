// STUB — to be replaced by the art agent. See docs/DESIGN.md §5 (Agent C).
import type { DrawSprite } from './pixel';
export const titleBackground: DrawSprite = { w: 640, h: 360, ox: 0, oy: 0, draw: (p) => { p.rect(0, 0, 640, 200, 'a'); p.rect(0, 200, 640, 160, 'h'); } };
export const logo: DrawSprite = { w: 300, h: 80, ox: 0, oy: 0, frames: 2, draw: (p) => p.rect(0, 0, 300, 80, 'Y') };
export const mapBackground: DrawSprite = { w: 640, h: 360, ox: 0, oy: 0, draw: (p) => { p.rect(0, 0, 640, 360, 'h'); } };
export const MAP_NODES: { x: number; y: number }[] = Array.from({ length: 30 }, (_, i) => ({ x: 40 + (i % 10) * 60, y: 300 - Math.floor(i / 10) * 110 - (i % 2) * 20 }));
export const mapNode: DrawSprite = { w: 20, h: 20, frames: 3, ox: 10, oy: 10, draw: (p, f) => { p.circle(10, 10, 8, f === 0 ? '7' : f === 1 ? 'Y' : 'G'); } };
