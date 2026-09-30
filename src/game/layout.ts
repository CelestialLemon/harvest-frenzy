// Screen layout constants (internal 640x360 resolution).
import type { SlotId } from './data';

export const W = 640;
export const H = 360;
export const TOP_BAR = 20;
export const BOTTOM_BAR = 320;

export const CELL = 8;
export const FIELD = { x: 136, y: 96, w: 376, h: 216 };
export const COLS = FIELD.w / CELL; // 47
export const ROWS = FIELD.h / CELL; // 27

export interface Rect { x: number; y: number; w: number; h: number }

export const SLOTS: Record<SlotId, Rect & { drop: [number, number] }> = {
  T1: { x: 214, y: 26, w: 72, h: 64, drop: [250, 104] },
  T2: { x: 298, y: 26, w: 72, h: 64, drop: [334, 104] },
  T3: { x: 382, y: 26, w: 72, h: 64, drop: [418, 104] },
  R1: { x: 552, y: 26, w: 72, h: 64, drop: [534, 76] },
  R2: { x: 552, y: 112, w: 72, h: 64, drop: [534, 162] },
  R3: { x: 552, y: 198, w: 72, h: 64, drop: [534, 248] },
};

export const WELL = { x: 142, y: 26, w: 56, h: 64 };
export const WAREHOUSE = { x: 12, y: 142, w: 112, h: 80 };
export const HELIPAD = { x: 38, y: 58, w: 56, h: 24 };
export const HELI_LAND = { x: 66, y: 70 }; // where the heli sits (bottom-center of heli sprite roughly)
export const TRUCK_HOME = { x: 40, y: 262 }; // top-left of the parked truck sprite
export const ROAD_Y = 266;
export const WAREHOUSE_DOOR = { x: 68, y: 214 };

export function inRect(x: number, y: number, r: Rect) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function inField(x: number, y: number, margin = 0) {
  return x >= FIELD.x + margin && y >= FIELD.y + margin && x < FIELD.x + FIELD.w - margin && y < FIELD.y + FIELD.h - margin;
}
