// Static game data: animals, products, workshops, regions, upgrades.

export type AnimalId = 'chicken' | 'sheep' | 'ostrich' | 'cow';
export type PetId = 'cat' | 'dog';
export type PredatorId = 'bear' | 'lion' | 'polar';
export type RegionId = 'meadow' | 'savanna' | 'arctic';
export type ItemId =
  | 'egg' | 'wool' | 'feather' | 'milk' | 'egg_powder' | 'flour' | 'cookie' | 'cake' | 'yarn' | 'fabric'
  | 'buttons' | 'shirt' | 'pillow' | 'hat' | 'cream' | 'cheese' | 'ice_cream' | 'bear_cage' | 'lion_cage' | 'polar_cage';
export type WorkshopId =
  | 'powder_plant' | 'bakery' | 'cake_shop' | 'spinnery' | 'loom' | 'tailor' | 'pillow_factory' | 'hat_shop'
  | 'creamery' | 'cheese_factory' | 'ice_cream_factory';
export type SlotId = 'T1' | 'T2' | 'T3' | 'R1' | 'R2' | 'R3';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  cost: number;
  product: ItemId;
  produceTime: number; // seconds of fed time per product
  foodTime: number; // seconds a full belly lasts
  bite: number; // food gained per grass bite
  starveTime: number; // seconds at empty belly before dying
  speed: number; // px/s
  size: [number, number]; // sprite w,h
  sellPrice: number;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: { id: 'chicken', name: 'Chicken', cost: 100, product: 'egg', produceTime: 8, foodTime: 12, bite: 0.25, starveTime: 12, speed: 22, size: [16, 16], sellPrice: 50 },
  sheep: { id: 'sheep', name: 'Sheep', cost: 1000, product: 'wool', produceTime: 12, foodTime: 14, bite: 0.2, starveTime: 16, speed: 16, size: [24, 20], sellPrice: 500 },
  ostrich: { id: 'ostrich', name: 'Ostrich', cost: 4000, product: 'feather', produceTime: 16, foodTime: 16, bite: 0.2, starveTime: 18, speed: 26, size: [24, 32], sellPrice: 2000 },
  cow: { id: 'cow', name: 'Cow', cost: 6000, product: 'milk', produceTime: 18, foodTime: 18, bite: 0.17, starveTime: 20, speed: 12, size: [32, 26], sellPrice: 3000 },
};

export interface PetDef { id: PetId; name: string; cost: number; speed: number; desc: string }
export const PETS: Record<PetId, PetDef> = {
  cat: { id: 'cat', name: 'Cat', cost: 1500, speed: 42, desc: 'Collects products for you' },
  dog: { id: 'dog', name: 'Dog', cost: 2000, speed: 55, desc: 'Chases predators away' },
};

export interface ItemDef {
  id: ItemId;
  name: string;
  price: number; // sell price
  buy?: number; // purchasable from town via helicopter
  size: number; // warehouse units
  life: number; // seconds on the ground before vanishing
}

const it = (id: ItemId, name: string, price: number, size = 1, life = 22, buy?: number): ItemDef => ({ id, name, price, size, life, buy });

export const ITEMS: Record<ItemId, ItemDef> = {
  egg: it('egg', 'Egg', 10),
  wool: it('wool', 'Wool', 60),
  feather: it('feather', 'Feather', 300),
  milk: it('milk', 'Milk', 400),
  egg_powder: it('egg_powder', 'Egg Powder', 35, 1, 40),
  flour: it('flour', 'Flour', 10, 1, 40, 20),
  cookie: it('cookie', 'Cookie', 120, 1, 40),
  cake: it('cake', 'Cake', 350, 1, 40),
  yarn: it('yarn', 'Yarn', 150, 1, 40),
  fabric: it('fabric', 'Fabric', 300, 1, 40),
  buttons: it('buttons', 'Buttons', 25, 1, 40, 50),
  shirt: it('shirt', 'Shirt', 650, 1, 40),
  pillow: it('pillow', 'Pillow', 1200, 1, 40),
  hat: it('hat', 'Fancy Hat', 2200, 1, 40),
  cream: it('cream', 'Cream', 900, 1, 40),
  cheese: it('cheese', 'Cheese', 2000, 1, 40),
  ice_cream: it('ice_cream', 'Ice Cream', 1500, 1, 40),
  bear_cage: it('bear_cage', 'Caged Bear', 500, 5, 999),
  lion_cage: it('lion_cage', 'Caged Lion', 600, 5, 999),
  polar_cage: it('polar_cage', 'Caged Polar Bear', 700, 5, 999),
};

export interface WorkshopDef {
  id: WorkshopId;
  name: string;
  cost: number;
  inputs: Partial<Record<ItemId, number>>;
  output: ItemId;
  time: number;
}

const ws = (id: WorkshopId, name: string, cost: number, inputs: Partial<Record<ItemId, number>>, output: ItemId, time: number): WorkshopDef => ({ id, name, cost, inputs, output, time });

export const WORKSHOPS: Record<WorkshopId, WorkshopDef> = {
  powder_plant: ws('powder_plant', 'Egg Powder Plant', 250, { egg: 1 }, 'egg_powder', 4),
  bakery: ws('bakery', 'Bakery', 600, { egg_powder: 1, flour: 1 }, 'cookie', 6),
  cake_shop: ws('cake_shop', 'Cake Shop', 1500, { cookie: 2 }, 'cake', 8),
  spinnery: ws('spinnery', 'Spinnery', 800, { wool: 1 }, 'yarn', 5),
  loom: ws('loom', 'Weaving Loom', 1500, { yarn: 1 }, 'fabric', 7),
  tailor: ws('tailor', 'Tailor', 2500, { fabric: 1, buttons: 1 }, 'shirt', 9),
  pillow_factory: ws('pillow_factory', 'Pillow Factory', 4000, { feather: 1, fabric: 1 }, 'pillow', 10),
  hat_shop: ws('hat_shop', 'Hat Shop', 6000, { feather: 1, shirt: 1 }, 'hat', 12),
  creamery: ws('creamery', 'Creamery', 5000, { milk: 1 }, 'cream', 8),
  cheese_factory: ws('cheese_factory', 'Cheese Factory', 8000, { cream: 1 }, 'cheese', 11),
  ice_cream_factory: ws('ice_cream_factory', 'Ice Cream Factory', 7000, { cream: 1, cookie: 1 }, 'ice_cream', 10),
};

/** Workshop level multipliers: speed factor, queue size, upgrade cost as a multiple of build cost. */
export const WORKSHOP_LEVELS = [
  { speed: 1, queue: 1, upgradeCost: 0 },
  { speed: 1.6, queue: 2, upgradeCost: 0.8 },
  { speed: 2.4, queue: 3, upgradeCost: 1.6 },
];

export interface PredatorDef { id: PredatorId; name: string; item: ItemId; speed: number; roar: 'bear_roar' | 'lion_roar' | 'polar_roar' }
export const PREDATORS: Record<PredatorId, PredatorDef> = {
  bear: { id: 'bear', name: 'Bear', item: 'bear_cage', speed: 13, roar: 'bear_roar' },
  lion: { id: 'lion', name: 'Lion', item: 'lion_cage', speed: 17, roar: 'lion_roar' },
  polar: { id: 'polar', name: 'Polar Bear', item: 'polar_cage', speed: 14, roar: 'polar_roar' },
};

export interface RegionDef { id: RegionId; name: string; predator: PredatorId; music: 'meadow' | 'savanna' | 'arctic'; }
export const REGIONS: Record<RegionId, RegionDef> = {
  meadow: { id: 'meadow', name: 'Green Valley', predator: 'bear', music: 'meadow' },
  savanna: { id: 'savanna', name: 'Sunny Savanna', predator: 'lion', music: 'savanna' },
  arctic: { id: 'arctic', name: 'Frosty Peaks', predator: 'polar', music: 'arctic' },
};

// ---- permanent (star shop) upgrades --------------------------------------------------------
export type UpgradeId = 'well' | 'warehouse' | 'truck' | 'heli' | 'cage';
export interface UpgradeDef { id: UpgradeId; name: string; levels: string[]; costs: number[] }
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  well: { id: 'well', name: 'Well', levels: ['5 buckets', '7 buckets, faster refill', '10 buckets, fast refill', '14 buckets, instant-ish refill'], costs: [3, 6, 10] },
  warehouse: { id: 'warehouse', name: 'Warehouse', levels: ['30 units', '45 units', '65 units', '90 units'], costs: [3, 6, 10] },
  truck: { id: 'truck', name: 'Truck', levels: ['20 units, slow', '30 units, faster', '45 units, fast', '65 units, very fast'], costs: [3, 6, 10] },
  heli: { id: 'heli', name: 'Helicopter', levels: ['6 units, slow', '10 units, faster', '16 units, fast'], costs: [3, 6] },
  cage: { id: 'cage', name: 'Cage', levels: ['5 clicks, holds 15s', '4 clicks, holds 20s', '3 clicks, holds 25s', '2 clicks, holds 30s'], costs: [3, 6, 10] },
};

export const STATS = {
  wellCap: [5, 7, 10, 14],
  wellRefill: [3, 2.4, 1.8, 1.2],
  wellCost: 20,
  warehouseCap: [30, 45, 65, 90],
  truckCap: [20, 30, 45, 65],
  truckTrip: [20, 17, 14, 11],
  heliCap: [6, 10, 16],
  heliTrip: [16, 13, 10],
  cageClicks: [5, 4, 3, 2],
  cageHold: [15, 20, 25, 30],
};

export type Upgrades = Record<UpgradeId, number>;
