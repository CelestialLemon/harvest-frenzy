// Screen layout constants (internal 640x360 resolution), arranged like Farm Frenzy 3:
// workshops in a column on each side, the well at the top of the pen, the warehouse at the bottom-centre
// with the truck parked on the road to its left and the helipad to its right.
import type { SlotId } from './data';

export const W = 640;
export const H = 360;
export const TOP_BAR = 20;
export const BOTTOM_BAR = 320;

export const CELL = 8;
export const FIELD = { x: 88, y: 84, w: 464, h: 168 };
export const COLS = FIELD.w / CELL; // 58
export const ROWS = FIELD.h / CELL; // 21

export interface Rect { x: number; y: number; w: number; h: number }

// T* = left column, R* = right column (top to bottom). drop = where finished goods land, just inside the pen.
export const SLOTS: Record<SlotId, Rect & { drop: [number, number] }> = {
  T1: { x: 6, y: 24, w: 72, h: 64, drop: [FIELD.x + 18, 104] },
  T2: { x: 6, y: 104, w: 72, h: 64, drop: [FIELD.x + 16, 158] },
  T3: { x: 6, y: 184, w: 72, h: 64, drop: [FIELD.x + 16, 234] },
  R1: { x: 562, y: 24, w: 72, h: 64, drop: [FIELD.x + FIELD.w - 18, 104] },
  R2: { x: 562, y: 104, w: 72, h: 64, drop: [FIELD.x + FIELD.w - 16, 158] },
  R3: { x: 562, y: 184, w: 72, h: 64, drop: [FIELD.x + FIELD.w - 16, 234] },
};

export const WELL = { x: 292, y: 20, w: 56, h: 64 };
export const WAREHOUSE = { x: 264, y: 238, w: 112, h: 80 };
export const WAREHOUSE_DOOR = { x: 320, y: 306 };
export const ROAD_Y = 286; // top of the road tiles
export const ROAD_END = 256; // x where the road ends (by the warehouse)
export const TRUCK_HOME = { x: 196, y: 272 }; // top-left of the parked truck sprite
export const HELIPAD = { x: 452, y: 276, w: 64, h: 28 };
export const HELI_LAND = { x: 484, y: 296 }; // bottom-centre of the parked helicopter

export function inRect(x: number, y: number, r: Rect) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function inField(x: number, y: number, margin = 0) {
  return x >= FIELD.x + margin && y >= FIELD.y + margin && x < FIELD.x + FIELD.w - margin && y < FIELD.y + FIELD.h - margin;
}
