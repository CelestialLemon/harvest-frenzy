// World sprites: buildings, vehicles, terrain, decor. See docs/DESIGN.md §5 (Agent B).
import type { SpriteDef } from '../pixel';
import { workshops } from './world/workshops';
import { buildings } from './world/buildings';
import { vehicles } from './world/vehicles';
import { terrain } from './world/terrain';
import { decor } from './world/decor';

export const sprites: Record<string, SpriteDef> = {
  ...buildings,
  ...vehicles,
  ...terrain,
  ...decor,
  ...workshops,
};
