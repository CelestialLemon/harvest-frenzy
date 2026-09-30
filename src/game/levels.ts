// Level definitions (types). The actual level list lives in levelList.ts.
import type { AnimalId, ItemId, PetId, RegionId, SlotId, WorkshopId } from './data';

export type Goal =
  | { kind: 'collect'; item: ItemId; n: number }
  | { kind: 'animals'; animal: AnimalId; n: number }
  | { kind: 'money'; n: number };

export interface LevelDef {
  id: number;
  region: RegionId;
  money: number;
  animals: AnimalId[]; // buyable in the bottom bar
  pets?: PetId[]; // buyable pets
  slots: Partial<Record<SlotId, WorkshopId>>; // what can be built where
  built?: SlotId[]; // slots that start already built
  buy?: ItemId[]; // supplies purchasable via helicopter
  start?: { animals?: Partial<Record<AnimalId, number>>; grass?: number; pets?: PetId[] };
  goals: Goal[];
  gold: number; // seconds
  silver: number; // seconds
  predators?: number[]; // spawn times in seconds
  intro?: string; // text shown on the level intro card
  tutorial?: boolean;
}
