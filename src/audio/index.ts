// STUB — to be replaced by the audio agent. See docs/DESIGN.md §5 (Agent D).
export type SfxName = 'click' | 'hover' | 'buy' | 'coin' | 'cash' | 'collect' | 'plant' | 'no_water' | 'well_refill'
  | 'drop_animal' | 'chicken' | 'sheep' | 'ostrich' | 'cow' | 'product_pop' | 'workshop_start' | 'workshop_done'
  | 'build' | 'upgrade' | 'error' | 'predator_land' | 'bear_roar' | 'lion_roar' | 'polar_roar' | 'hit' | 'cage'
  | 'cage_break' | 'animal_die' | 'truck_go' | 'truck_back' | 'heli' | 'delivery' | 'goal' | 'win' | 'medal'
  | 'star' | 'full' | 'bark' | 'meow' | 'page' | 'pause' | 'expire' | 'tick';
export type MusicTrack = 'title' | 'map' | 'meadow' | 'savanna' | 'arctic' | 'shop';
export const audio = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  unlock() {},
  sfx(_name: SfxName, _opts?: { vol?: number; rate?: number }) {},
  music(_track: MusicTrack | null) {},
};
