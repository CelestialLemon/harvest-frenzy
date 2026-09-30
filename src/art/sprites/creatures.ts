// Creature sprites (Agent A): animals, predators, pets, effects, grass. See docs/DESIGN.md §5.
import type { SpriteDef } from '../pixel';
import { chickenSprites } from './creatures/chicken';
import { sheepSprites } from './creatures/sheep';
import { ostrichSprites } from './creatures/ostrich';
import { cowSprites } from './creatures/cow';
import { predatorSprites } from './creatures/predators';
import { petSprites } from './creatures/pets';
import { miscSprites } from './creatures/misc';

export const sprites: Record<string, SpriteDef> = {
  ...chickenSprites,
  ...sheepSprites,
  ...ostrichSprites,
  ...cowSprites,
  ...predatorSprites,
  ...petSprites,
  ...miscSprites,
};
