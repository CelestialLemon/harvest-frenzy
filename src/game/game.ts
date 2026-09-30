// Game simulation for one level. DOM-free: rendering, audio and UI observe `events` and state.
import type { SfxName } from '../audio';
import {
  ANIMALS, ITEMS, PETS, PREDATORS, REGIONS, STATS, WORKSHOPS, WORKSHOP_LEVELS,
  type AnimalId, type ItemId, type PetId, type PredatorId, type SlotId, type Upgrades, type WorkshopId,
} from './data';
import type { Goal, LevelDef } from './levels';
import {
  CELL, COLS, FIELD, HELIPAD, HELI_LAND, ROWS, SLOTS, TRUCK_HOME, WAREHOUSE, WELL, inField, inRect,
} from './layout';

export type FxKind = 'puff' | 'dust' | 'sparkle' | 'hit' | 'splash';
export type GameEvent =
  | { type: 'sfx'; name: SfxName; vol?: number; rate?: number }
  | { type: 'float'; text: string; x: number; y: number; color?: string }
  | { type: 'fx'; fx: FxKind; x: number; y: number }
  | { type: 'fly'; item: ItemId; x: number; y: number }
  | { type: 'ghost'; x: number; y: number }
  | { type: 'squash'; id: number; amount: number } // purely visual squash-and-stretch on an entity
  | { type: 'plant'; x: number; y: number }
  | { type: 'shake'; amount: number }
  | { type: 'toast'; text: string }
  | { type: 'goal'; index: number }
  | { type: 'win' };

export interface Animal {
  id: number; kind: AnimalId; x: number; y: number; dir: 1 | -1;
  state: 'fall' | 'walk' | 'idle' | 'eat';
  tx: number; ty: number; timer: number; anim: number;
  food: number; prod: number; starve: number; biteT: number; cell: number; fallH: number; seekCd: number;
  dead?: boolean;
}

export interface GroundItem { id: number; item: ItemId; x: number; y: number; age: number; life: number; z: number; vz: number; vx: number; claimed?: boolean }

export interface Predator {
  id: number; kind: PredatorId; x: number; y: number; dir: 1 | -1;
  state: 'fall' | 'land' | 'prowl' | 'attack' | 'caged' | 'flee' | 'leap';
  t: number; hits: number; freeT: number; cageT: number; fallH: number; stun: number; flash: number;
  tx: number; ty: number; anger: number; target: number; anim: number; retarget: number;
}

export interface Pet {
  id: number; kind: PetId; x: number; y: number; dir: 1 | -1;
  state: 'fall' | 'idle' | 'walk' | 'chase' | 'bark' | 'fetch';
  t: number; tx: number; ty: number; target: number; fallH: number; anim: number;
}

export interface Workshop {
  slot: SlotId; kind: WorkshopId; built: boolean; level: number; queue: number; progress: number; buildT: number; anim: number;
}

export interface Vehicle { state: 'home' | 'out' | 'back'; t: number; trip: number; cargo: Partial<Record<ItemId, number>>; value: number }

export interface GoalState { goal: Goal; progress: number; done: boolean }

export type HoverKind = 'item' | 'predator' | 'cage' | 'well' | 'slot' | 'warehouse' | 'truck' | 'heli' | 'field' | 'none';
export interface Hover { kind: HoverKind; id?: number; slot?: SlotId }

const WALK = { x0: FIELD.x + 10, x1: FIELD.x + FIELD.w - 10, y0: FIELD.y + 14, y1: FIELD.y + FIELD.h - 8 };
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export class Game {
  readonly level: LevelDef;
  readonly up: Upgrades;
  time = 0;
  money: number;
  won = false;
  wonAt = 0;
  events: GameEvent[] = [];

  water: number;
  wellCap: number;
  wellRefillT = 0;
  wellRefillTime: number;
  wellAnim = 0;

  store: Partial<Record<ItemId, number>> = {};
  storeCap: number;

  grass = new Uint8Array(COLS * ROWS);
  grow = new Float32Array(COLS * ROWS);
  grassDirty = true;

  animals: Animal[] = [];
  items: GroundItem[] = [];
  predators: Predator[] = [];
  pets: Pet[] = [];
  workshops: Workshop[] = [];
  truck: Vehicle;
  heli: Vehicle;
  goals: GoalState[];
  collected: Partial<Record<ItemId, number>> = {};
  maxMoney: number;
  predatorQueue: number[];
  stats = { produced: 0, lostAnimals: 0, expired: 0, caught: 0 };

  private nextId = 1;

  constructor(level: LevelDef, upgrades: Upgrades) {
    this.level = level;
    this.up = upgrades;
    this.money = level.money;
    this.maxMoney = level.money;
    this.wellCap = STATS.wellCap[upgrades.well];
    this.wellRefillTime = STATS.wellRefill[upgrades.well];
    this.water = this.wellCap;
    this.storeCap = STATS.warehouseCap[upgrades.warehouse];
    this.truck = { state: 'home', t: 0, trip: STATS.truckTrip[upgrades.truck], cargo: {}, value: 0 };
    this.heli = { state: 'home', t: 0, trip: STATS.heliTrip[upgrades.heli], cargo: {}, value: 0 };
    for (const [slot, kind] of Object.entries(level.slots) as [SlotId, WorkshopId][]) {
      this.workshops.push({ slot, kind, built: !!level.built?.includes(slot), level: 0, queue: 0, progress: 0, buildT: 0, anim: 0 });
    }
    this.goals = level.goals.map((goal) => ({ goal, progress: 0, done: false }));
    this.predatorQueue = [...(level.predators ?? [])].sort((a, b) => a - b);

    // starting grass patches
    const patches = level.start?.grass ?? 0;
    for (let i = 0; i < patches; i++) {
      const x = rand(FIELD.x + 40, FIELD.x + FIELD.w - 40), y = rand(FIELD.y + 40, FIELD.y + FIELD.h - 30);
      this.plantAt(x, y, true);
    }
    for (const [kind, n] of Object.entries(level.start?.animals ?? {}) as [AnimalId, number][]) {
      for (let i = 0; i < n; i++) this.spawnAnimal(kind, false);
    }
    for (const kind of level.start?.pets ?? []) this.spawnPet(kind, false);
    this.updateGoals();
  }

  // ------------------------------------------------------------------ helpers
  private emit(e: GameEvent) { this.events.push(e); }
  private sfx(name: SfxName, vol?: number, rate?: number) { this.emit({ type: 'sfx', name, vol, rate }); }
  private float(text: string, x: number, y: number, color?: string) { this.emit({ type: 'float', text, x, y, color }); }
  toast(text: string) { this.emit({ type: 'toast', text }); }

  get storeUsed() {
    let n = 0;
    for (const [id, c] of Object.entries(this.store) as [ItemId, number][]) n += c * ITEMS[id].size;
    return n;
  }
  count(id: ItemId) { return this.store[id] ?? 0; }
  get region() { return REGIONS[this.level.region]; }
  get cageClicks() { return STATS.cageClicks[this.up.cage]; }
  get cageHold() { return STATS.cageHold[this.up.cage]; }
  get truckCap() { return STATS.truckCap[this.up.truck]; }
  get heliCap() { return STATS.heliCap[this.up.heli]; }
  livingAnimals(kind?: AnimalId) { return this.animals.filter((a) => !a.dead && (!kind || a.kind === kind)).length; }

  private spend(cost: number, x?: number, y?: number): boolean {
    if (this.money < cost) {
      this.sfx('error');
      this.toast('Not enough money!');
      return false;
    }
    this.money -= cost;
    if (x !== undefined && y !== undefined && cost > 0) this.float(`-$${cost}`, x, y, '#e83b3b');
    return true;
  }

  earn(amount: number, x: number, y: number) {
    this.money += amount;
    this.maxMoney = Math.max(this.maxMoney, this.money);
    this.float(`+$${amount}`, x, y, '#f9c22b');
  }

  // ------------------------------------------------------------------ grass
  cellAt(x: number, y: number) {
    const c = Math.floor((x - FIELD.x) / CELL), r = Math.floor((y - FIELD.y) / CELL);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
    return r * COLS + c;
  }

  private plantAt(x: number, y: number, instant = false) {
    const R = 17;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cx = FIELD.x + c * CELL + CELL / 2, cy = FIELD.y + r * CELL + CELL / 2;
      // slightly squashed, ragged disc so patches look organic
      const d = Math.hypot(cx - x, (cy - y) * 1.25);
      if (d > R || (d > R - 5 && Math.random() < 0.45)) continue;
      // keep the outermost ring of the field clear (fence)
      if (c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1) continue;
      const i = r * COLS + c;
      if (instant) { this.grass[i] = 3; this.grow[i] = 0; }
      else if (this.grass[i] < 3) { this.grass[i] = Math.max(1, this.grass[i]); this.grow[i] = 0.35 + Math.random() * 0.2; }
    }
    this.grassDirty = true;
  }

  plant(x: number, y: number): boolean {
    if (!inField(x, y, 4)) return false;
    if (this.water <= 0) {
      this.sfx('no_water');
      this.toast(this.wellRefillT > 0 ? 'The well is refilling...' : 'Out of water! Click the well to refill.');
      return false;
    }
    this.water--;
    this.plantAt(x, y);
    this.sfx('plant', 0.8, rand(0.9, 1.1));
    this.emit({ type: 'fx', fx: 'splash', x, y });
    this.emit({ type: 'plant', x, y });
    return true;
  }

  private nearestGrass(x: number, y: number, maxD = 9999): number {
    let best = -1, bd = maxD;
    for (let i = 0; i < this.grass.length; i++) {
      if (!this.grass[i]) continue;
      const cx = FIELD.x + (i % COLS) * CELL + CELL / 2, cy = FIELD.y + Math.floor(i / COLS) * CELL + CELL / 2;
      const d = Math.abs(cx - x) + Math.abs(cy - y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  cellCenter(i: number): [number, number] {
    return [FIELD.x + (i % COLS) * CELL + CELL / 2, FIELD.y + Math.floor(i / COLS) * CELL + CELL / 2 + 2];
  }

  // ------------------------------------------------------------------ well
  refillWell(): boolean {
    if (this.wellRefillT > 0) return false;
    if (this.water >= this.wellCap) { this.toast('The well is already full.'); this.sfx('error'); return false; }
    if (!this.spend(STATS.wellCost, WELL.x + 28, WELL.y + 10)) return false;
    this.wellRefillT = this.wellRefillTime;
    this.sfx('well_refill');
    return true;
  }

  // ------------------------------------------------------------------ animals & pets
  buyAnimal(kind: AnimalId): boolean {
    const def = ANIMALS[kind];
    if (!this.spend(def.cost)) return false;
    this.spawnAnimal(kind, true);
    this.sfx('buy');
    this.updateGoals();
    return true;
  }

  private spawnAnimal(kind: AnimalId, drop: boolean) {
    const x = rand(WALK.x0 + 20, WALK.x1 - 20), y = rand(WALK.y0 + 20, WALK.y1 - 10);
    const a: Animal = {
      id: this.nextId++, kind, x, y, dir: Math.random() < 0.5 ? 1 : -1, state: drop ? 'fall' : 'idle',
      tx: x, ty: y, timer: rand(0.5, 2), anim: Math.random() * 10, food: 1, prod: Math.random() * 0.3, starve: 0,
      biteT: 0, cell: -1, fallH: drop ? 200 : 0, seekCd: 0,
    };
    this.animals.push(a);
    if (drop) this.sfx('drop_animal');
  }

  buyPet(kind: PetId): boolean {
    if (this.pets.some((p) => p.kind === kind)) { this.toast(`You already have a ${PETS[kind].name.toLowerCase()}.`); this.sfx('error'); return false; }
    if (!this.spend(PETS[kind].cost)) return false;
    this.spawnPet(kind, true);
    this.sfx('buy');
    return true;
  }

  private spawnPet(kind: PetId, drop: boolean) {
    const x = rand(WALK.x0 + 30, WALK.x1 - 30), y = rand(WALK.y0 + 30, WALK.y1 - 20);
    this.pets.push({ id: this.nextId++, kind, x, y, dir: 1, state: drop ? 'fall' : 'idle', t: 1, tx: x, ty: y, target: -1, fallH: drop ? 200 : 0, anim: 0 });
    if (drop) this.sfx('drop_animal');
  }

  private moveToward(e: { x: number; y: number; dir: 1 | -1 }, tx: number, ty: number, speed: number, dt: number): boolean {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) { e.x = tx; e.y = ty; return true; }
    const step = Math.min(d, speed * dt);
    e.x += (dx / d) * step;
    e.y += (dy / d) * step;
    if (Math.abs(dx) > 0.5) e.dir = dx > 0 ? 1 : -1;
    return step >= d - 0.01;
  }

  private updateAnimal(a: Animal, dt: number) {
    const def = ANIMALS[a.kind];
    a.anim += dt;
    if (a.state === 'fall') {
      a.fallH -= dt * 150;
      if (a.fallH <= 0) {
        a.fallH = 0; a.state = 'idle'; a.timer = 0.6;
        this.emit({ type: 'fx', fx: 'dust', x: a.x, y: a.y });
        this.emit({ type: 'squash', id: a.id, amount: 1 });
        this.sfx(a.kind, 0.7);
      }
      return;
    }
    // metabolism
    a.food = Math.max(0, a.food - dt / def.foodTime);
    if (a.food > 0) {
      a.starve = Math.max(0, a.starve - dt * 2);
      a.prod += dt / def.produceTime;
      if (a.prod >= 1) {
        a.prod = 0;
        this.dropItem(def.product, a.x + a.dir * 3, a.y + 1);
        this.emit({ type: 'squash', id: a.id, amount: 0.8 });
        this.stats.produced++;
        if (Math.random() < 0.5) this.sfx(a.kind, 0.45, rand(0.9, 1.15));
      }
    } else {
      a.starve += dt;
      if (a.starve >= def.starveTime) { this.killAnimal(a, 'starved'); return; }
    }

    const hungry = a.food < 0.55;
    a.seekCd -= dt;
    if (a.state === 'eat') {
      a.biteT += dt;
      if (a.biteT >= 0.45) {
        a.biteT = 0;
        if (a.cell >= 0 && this.grass[a.cell] > 0) {
          this.grass[a.cell]--;
          this.grassDirty = true;
          a.food = Math.min(1, a.food + def.bite);
        }
        if (a.food >= 0.999) { a.state = 'idle'; a.timer = rand(0.3, 1.2); a.cell = -1; }
        else if (a.cell < 0 || this.grass[a.cell] === 0) {
          const n = this.nearestGrass(a.x, a.y, 40);
          if (n >= 0) { a.cell = n; [a.tx, a.ty] = this.cellCenter(n); a.state = 'walk'; }
          else { a.state = 'idle'; a.timer = 0.2; a.cell = -1; }
        }
      }
      return;
    }
    if (hungry && a.cell < 0 && a.seekCd <= 0) {
      a.seekCd = 0.6;
      const n = this.nearestGrass(a.x, a.y);
      if (n >= 0) { a.cell = n; [a.tx, a.ty] = this.cellCenter(n); a.state = 'walk'; }
    }
    if (a.state === 'walk') {
      if (a.cell >= 0 && this.grass[a.cell] === 0) { a.cell = -1; a.seekCd = 0; a.state = 'idle'; a.timer = 0.1; return; }
      const speed = def.speed * (hungry && a.food === 0 ? 0.75 : 1);
      if (this.moveToward(a, a.tx, a.ty, speed, dt)) {
        if (a.cell >= 0) { a.state = 'eat'; a.biteT = 0; }
        else { a.state = 'idle'; a.timer = rand(0.8, 2.8); }
      }
    } else if (a.state === 'idle') {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.state = 'walk';
        a.cell = -1;
        a.tx = Math.max(WALK.x0, Math.min(WALK.x1, a.x + rand(-70, 70)));
        a.ty = Math.max(WALK.y0, Math.min(WALK.y1, a.y + rand(-50, 50)));
      }
    }
  }

  private killAnimal(a: Animal, why: 'starved' | 'eaten') {
    a.dead = true;
    this.stats.lostAnimals++;
    this.emit({ type: 'ghost', x: a.x, y: a.y - 8 });
    this.emit({ type: 'fx', fx: 'puff', x: a.x, y: a.y - 6 });
    this.sfx('animal_die');
    this.toast(why === 'starved' ? `A ${ANIMALS[a.kind].name.toLowerCase()} starved! Plant more grass.` : `A ${ANIMALS[a.kind].name.toLowerCase()} was eaten!`);
  }

  // ------------------------------------------------------------------ ground items
  dropItem(item: ItemId, x: number, y: number, spread = 0) {
    const g: GroundItem = {
      id: this.nextId++, item, x: x + rand(-spread, spread), y: y + rand(-spread / 2, spread / 2), age: 0, life: ITEMS[item].life,
      z: 6, vz: 70, vx: rand(-12, 12),
    };
    this.items.push(g);
    this.sfx('product_pop', 0.5, rand(0.9, 1.2));
    return g;
  }

  collectItem(g: GroundItem, silentFull = false): boolean {
    const def = ITEMS[g.item];
    if (this.storeUsed + def.size > this.storeCap) {
      if (!silentFull) { this.sfx('full'); this.toast('The warehouse is full! Sell goods with the truck.'); }
      return false;
    }
    this.items.splice(this.items.indexOf(g), 1);
    this.addToStore(g.item, 1, true);
    this.emit({ type: 'fly', item: g.item, x: g.x, y: g.y - g.z });
    this.sfx('collect', 0.8, rand(0.95, 1.12));
    return true;
  }

  private addToStore(item: ItemId, n: number, countsForGoal: boolean) {
    this.store[item] = (this.store[item] ?? 0) + n;
    if (countsForGoal) this.collected[item] = (this.collected[item] ?? 0) + n;
    this.updateGoals();
  }

  private itemsAt(x: number, y: number, r: number) {
    return this.items.filter((g) => dist(g.x, g.y - 5 - g.z, x, y) <= r);
  }

  // ------------------------------------------------------------------ predators
  private spawnPredator() {
    const kind = this.region.predator;
    const x = rand(FIELD.x + 50, FIELD.x + FIELD.w - 50), y = rand(FIELD.y + 30, FIELD.y + 110);
    this.predators.push({
      id: this.nextId++, kind, x, y, dir: 1, state: 'fall', t: 0, hits: 0, freeT: 0, cageT: 0, fallH: 260, stun: 0, flash: 0,
      tx: x, ty: y, anger: 1, target: -1, anim: 0, retarget: 0,
    });
  }

  private predatorAt(x: number, y: number, caged: boolean) {
    let best: Predator | null = null, bd = 1e9;
    for (const p of this.predators) {
      const isCaged = p.state === 'caged';
      if (isCaged !== caged || p.state === 'fall' || p.state === 'leap') continue;
      if (Math.abs(p.x - x) <= 17 && y <= p.y + 3 && y >= p.y - 28) {
        const d = dist(p.x, p.y - 12, x, y);
        if (d < bd) { bd = d; best = p; }
      }
    }
    return best;
  }

  hitPredator(p: Predator) {
    p.hits++;
    p.flash = 0.15;
    this.emit({ type: 'squash', id: p.id, amount: 0.7 });
    p.stun = 0.35;
    this.emit({ type: 'fx', fx: 'hit', x: p.x + rand(-6, 6), y: p.y - 14 + rand(-5, 5) });
    this.sfx('hit', 0.9, 0.9 + p.hits * 0.08);
    if (p.hits >= this.cageClicks) {
      p.state = 'caged';
      p.cageT = this.cageHold;
      p.anim = 0;
      this.emit({ type: 'fx', fx: 'puff', x: p.x, y: p.y - 10 });
      this.emit({ type: 'shake', amount: 2 });
      this.sfx('cage');
      this.float('Caught!', p.x, p.y - 34, '#fbff86');
    }
  }

  storeCage(p: Predator): boolean {
    const item = PREDATORS[p.kind].item;
    if (this.storeUsed + ITEMS[item].size > this.storeCap) {
      this.sfx('full');
      this.toast(`Need ${ITEMS[item].size} free warehouse spaces for the cage!`);
      return false;
    }
    this.predators.splice(this.predators.indexOf(p), 1);
    this.addToStore(item, 1, true);
    this.stats.caught++;
    this.emit({ type: 'fly', item, x: p.x, y: p.y - 12 });
    this.sfx('collect', 1, 0.8);
    return true;
  }

  private updatePredator(p: Predator, dt: number) {
    const def = PREDATORS[p.kind];
    p.anim += dt;
    p.flash = Math.max(0, p.flash - dt);
    switch (p.state) {
      case 'fall':
        p.fallH -= dt * 260;
        if (p.fallH <= 0) {
          p.fallH = 0; p.state = 'land'; p.t = 0.9;
          this.emit({ type: 'fx', fx: 'dust', x: p.x, y: p.y });
          this.emit({ type: 'squash', id: p.id, amount: 1.4 });
          this.emit({ type: 'shake', amount: 4 });
          this.sfx('predator_land');
          this.sfx(def.roar, 0.9);
          this.toast(`A ${def.name.toLowerCase()}! Click it quickly to cage it!`);
        }
        return;
      case 'land':
        p.t -= dt;
        if (p.t <= 0) p.state = 'prowl';
        return;
      case 'caged':
        p.cageT -= dt;
        if (p.cageT <= 0) {
          p.state = 'prowl'; p.hits = 0; p.anger = Math.min(1.8, p.anger + 0.3); p.freeT = Math.max(0, p.freeT - 10);
          this.emit({ type: 'fx', fx: 'puff', x: p.x, y: p.y - 10 });
          this.sfx('cage_break');
          this.sfx(def.roar, 0.8);
          this.toast(`The ${def.name.toLowerCase()} broke out of the cage!`);
        }
        return;
      case 'leap':
        p.fallH += dt * 320;
        if (p.fallH > 320) this.predators.splice(this.predators.indexOf(p), 1);
        return;
      case 'flee': {
        const tx = p.x < FIELD.x + FIELD.w / 2 ? FIELD.x - 10 : FIELD.x + FIELD.w + 10;
        this.moveToward(p, tx, p.y, def.speed * 3.2, dt);
        p.t -= dt;
        if (p.t <= 0 || !inField(p.x, p.y)) { p.state = 'leap'; this.emit({ type: 'fx', fx: 'dust', x: p.x, y: p.y }); }
        return;
      }
      case 'attack':
        p.t -= dt;
        if (p.t <= 0) {
          const victim = this.animals.find((a) => a.id === p.target && !a.dead);
          if (victim && dist(victim.x, victim.y, p.x, p.y) < 16) {
            this.killAnimal(victim, 'eaten');
            this.emit({ type: 'shake', amount: 2 });
          }
          p.state = 'prowl'; p.target = -1; p.retarget = 1.2;
        }
        return;
      case 'prowl': {
        p.freeT += dt;
        if (p.stun > 0) { p.stun -= dt; return; }
        if (p.freeT > 45) {
          p.state = 'leap';
          this.sfx(def.roar, 0.6);
          this.emit({ type: 'fx', fx: 'dust', x: p.x, y: p.y });
          return;
        }
        // trample products
        for (let i = this.items.length - 1; i >= 0; i--) {
          const g = this.items[i];
          if (g.z < 2 && dist(g.x, g.y, p.x, p.y) < 9) {
            this.items.splice(i, 1);
            this.emit({ type: 'fx', fx: 'puff', x: g.x, y: g.y - 4 });
            this.sfx('expire', 0.7);
          }
        }
        p.retarget -= dt;
        let target = this.animals.find((a) => a.id === p.target && !a.dead && a.state !== 'fall');
        if (!target || p.retarget <= 0) {
          p.retarget = 2;
          let bd = 1e9;
          target = undefined;
          for (const a of this.animals) {
            if (a.dead || a.state === 'fall') continue;
            const d = dist(a.x, a.y, p.x, p.y);
            if (d < bd) { bd = d; target = a; }
          }
          p.target = target ? target.id : -1;
          if (!target) { p.tx = rand(WALK.x0, WALK.x1); p.ty = rand(WALK.y0, WALK.y1); }
        }
        const speed = def.speed * p.anger;
        if (target) {
          this.moveToward(p, target.x - p.dir * 0, target.y, speed, dt);
          if (dist(target.x, target.y, p.x, p.y) < 12) { p.state = 'attack'; p.t = 0.8; p.target = target.id; this.sfx(def.roar, 0.5, 1.2); }
        } else if (this.moveToward(p, p.tx, p.ty, speed * 0.7, dt)) {
          p.tx = rand(WALK.x0, WALK.x1); p.ty = rand(WALK.y0, WALK.y1);
        }
        return;
      }
    }
  }

  // ------------------------------------------------------------------ pets
  private updatePet(pet: Pet, dt: number) {
    const def = PETS[pet.kind];
    pet.anim += dt;
    if (pet.state === 'fall') {
      pet.fallH -= dt * 150;
      if (pet.fallH <= 0) {
        pet.fallH = 0; pet.state = 'idle'; pet.t = 0.5;
        this.emit({ type: 'fx', fx: 'dust', x: pet.x, y: pet.y });
        this.emit({ type: 'squash', id: pet.id, amount: 1 });
        this.sfx(pet.kind === 'cat' ? 'meow' : 'bark', 0.7);
      }
      return;
    }
    if (pet.kind === 'dog') {
      const threat = this.predators.find((p) => p.state === 'prowl' || p.state === 'attack');
      if (threat && pet.state !== 'bark') {
        pet.state = 'chase';
        pet.target = threat.id;
      }
      if (pet.state === 'chase') {
        const p = this.predators.find((q) => q.id === pet.target);
        if (!p || !(p.state === 'prowl' || p.state === 'attack' || p.state === 'land')) { pet.state = 'idle'; pet.t = 1; return; }
        if (this.moveToward(pet, p.x - 16 * (p.x > pet.x ? 1 : -1), p.y, def.speed, dt) || dist(p.x, p.y, pet.x, pet.y) < 20) {
          pet.state = 'bark'; pet.t = 2.2; pet.dir = p.x > pet.x ? 1 : -1;
          this.sfx('bark');
        }
        return;
      }
      if (pet.state === 'bark') {
        pet.t -= dt;
        const p = this.predators.find((q) => q.id === pet.target);
        if (p && (p.state === 'prowl' || p.state === 'attack')) p.stun = Math.max(p.stun, 0.2);
        if (Math.floor((pet.t + dt) / 0.6) !== Math.floor(pet.t / 0.6)) this.sfx('bark', 0.6, rand(0.95, 1.1));
        if (pet.t <= 0) {
          if (p && (p.state === 'prowl' || p.state === 'attack')) {
            p.state = 'flee'; p.t = 3;
            this.sfx(PREDATORS[p.kind].roar, 0.5, 1.3);
            this.float('Shoo!', p.x, p.y - 30, '#fbff86');
          }
          pet.state = 'idle'; pet.t = 1.5;
        }
        return;
      }
    } else {
      // cat: fetch the nearest unclaimed product
      if (pet.state === 'fetch') {
        const g = this.items.find((i) => i.id === pet.target);
        if (!g) { pet.state = 'idle'; pet.t = 0.3; return; }
        if (this.moveToward(pet, g.x, g.y + 1, def.speed, dt)) {
          g.claimed = false;
          if (!this.collectItem(g, true)) { pet.state = 'idle'; pet.t = 3; return; }
          // scoop up whatever else lies within paw's reach
          const near = this.items.filter((o) => !o.claimed && o.z <= 1 && dist(o.x, o.y, pet.x, pet.y) < 14).slice(0, 2);
          for (const o of near) if (!this.collectItem(o, true)) break;
          pet.state = 'idle'; pet.t = 0.35;
        }
        return;
      }
      if (pet.state === 'idle' || pet.state === 'walk') {
        const free = this.storeCap - this.storeUsed;
        let best: GroundItem | null = null, bd = 1e9;
        if (free > 0) for (const g of this.items) {
          if (g.claimed || g.z > 1 || ITEMS[g.item].size > free) continue;
          const d = dist(g.x, g.y, pet.x, pet.y);
          if (d < bd) { bd = d; best = g; }
        }
        if (best && pet.t <= 0.3) {
          best.claimed = true;
          pet.target = best.id;
          pet.state = 'fetch';
          return;
        }
      }
    }
    // idle / wander
    if (pet.state === 'idle') {
      pet.t -= dt;
      if (pet.t <= 0) {
        pet.state = 'walk';
        pet.tx = Math.max(WALK.x0, Math.min(WALK.x1, pet.x + rand(-60, 60)));
        pet.ty = Math.max(WALK.y0, Math.min(WALK.y1, pet.y + rand(-40, 40)));
      }
    } else if (pet.state === 'walk') {
      if (this.moveToward(pet, pet.tx, pet.ty, def.speed * 0.5, dt)) { pet.state = 'idle'; pet.t = rand(1, 3); }
    }
  }

  // ------------------------------------------------------------------ workshops
  workshop(slot: SlotId) { return this.workshops.find((w) => w.slot === slot); }

  workshopMissing(w: Workshop): ItemId[] {
    const def = WORKSHOPS[w.kind];
    return (Object.entries(def.inputs) as [ItemId, number][]).filter(([id, n]) => this.count(id) < n).map(([id]) => id);
  }

  activateWorkshop(w: Workshop): boolean {
    const def = WORKSHOPS[w.kind];
    const r = SLOTS[w.slot];
    if (!w.built) {
      if (!this.spend(def.cost, r.x + 36, r.y + 20)) return false;
      w.built = true;
      w.buildT = 1.2;
      this.emit({ type: 'fx', fx: 'puff', x: r.x + 20, y: r.y + 40 });
      this.emit({ type: 'fx', fx: 'puff', x: r.x + 52, y: r.y + 36 });
      this.sfx('build');
      return true;
    }
    if (w.buildT > 0) return false;
    const L = WORKSHOP_LEVELS[w.level];
    if (w.queue >= L.queue) { this.sfx('error'); this.toast(`${def.name} is busy.`); return false; }
    const missing = this.workshopMissing(w);
    if (missing.length) {
      this.sfx('error');
      this.toast(`${def.name} needs ${missing.map((m) => ITEMS[m].name).join(' + ')}`);
      return false;
    }
    for (const [id, n] of Object.entries(def.inputs) as [ItemId, number][]) this.store[id] = this.count(id) - n;
    w.queue++;
    this.sfx('workshop_start');
    return true;
  }

  upgradeCost(w: Workshop): number {
    const next = WORKSHOP_LEVELS[w.level + 1];
    return next ? Math.round(WORKSHOPS[w.kind].cost * next.upgradeCost) : 0;
  }

  upgradeWorkshop(w: Workshop): boolean {
    if (!w.built || w.level >= WORKSHOP_LEVELS.length - 1) return false;
    const r = SLOTS[w.slot];
    if (!this.spend(this.upgradeCost(w), r.x + 36, r.y + 10)) return false;
    w.level++;
    this.emit({ type: 'fx', fx: 'sparkle', x: r.x + 20, y: r.y + 20 });
    this.emit({ type: 'fx', fx: 'sparkle', x: r.x + 50, y: r.y + 30 });
    this.sfx('upgrade');
    return true;
  }

  private updateWorkshop(w: Workshop, dt: number) {
    w.anim += dt;
    if (w.buildT > 0) { w.buildT = Math.max(0, w.buildT - dt); return; }
    if (w.queue <= 0) return;
    const def = WORKSHOPS[w.kind];
    w.progress += (dt * WORKSHOP_LEVELS[w.level].speed) / def.time;
    if (w.progress >= 1) {
      w.progress = 0;
      w.queue--;
      const [dx, dy] = SLOTS[w.slot].drop;
      this.dropItem(def.output, dx, dy, 10);
      this.sfx('workshop_done', 0.7);
    }
  }

  // ------------------------------------------------------------------ vehicles
  sendTruck(cargo: Partial<Record<ItemId, number>>): boolean {
    if (this.truck.state !== 'home') return false;
    let units = 0, value = 0;
    for (const [id, n] of Object.entries(cargo) as [ItemId, number][]) {
      if (!n) continue;
      if (this.count(id) < n) return false;
      units += n * ITEMS[id].size;
      value += n * ITEMS[id].price;
    }
    if (units === 0 || units > this.truckCap) return false;
    for (const [id, n] of Object.entries(cargo) as [ItemId, number][]) if (n) this.store[id] = this.count(id) - n;
    this.truck = { ...this.truck, state: 'out', t: 0, cargo: { ...cargo }, value };
    this.sfx('truck_go');
    this.updateGoals();
    return true;
  }

  orderHeli(order: Partial<Record<ItemId, number>>): boolean {
    if (this.heli.state !== 'home') return false;
    let units = 0, cost = 0;
    for (const [id, n] of Object.entries(order) as [ItemId, number][]) {
      if (!n) continue;
      units += n * ITEMS[id].size;
      cost += n * (ITEMS[id].buy ?? 0);
    }
    if (units === 0 || units > this.heliCap) return false;
    if (!this.spend(cost, HELI_LAND.x, HELI_LAND.y - 30)) return false;
    this.heli = { ...this.heli, state: 'out', t: 0, cargo: { ...order }, value: cost };
    this.sfx('heli');
    return true;
  }

  private updateVehicles(dt: number) {
    const tr = this.truck;
    if (tr.state !== 'home') {
      tr.t += dt;
      const half = tr.trip / 2;
      if (tr.state === 'out' && tr.t >= half) {
        tr.state = 'back'; tr.t = 0;
        this.earn(tr.value, TRUCK_HOME.x + 28, TRUCK_HOME.y - 4);
        this.sfx('cash');
        tr.cargo = {};
      } else if (tr.state === 'back' && tr.t >= half) {
        tr.state = 'home'; tr.t = 0;
        this.sfx('truck_back', 0.6);
      }
    }
    const he = this.heli;
    if (he.state !== 'home') {
      he.t += dt;
      const half = he.trip / 2;
      if (he.state === 'out' && he.t >= half) { he.state = 'back'; he.t = 0; this.sfx('heli', 0.5); }
      else if (he.state === 'back' && he.t >= half) {
        he.state = 'home'; he.t = 0;
        this.sfx('delivery');
        for (const [id, n] of Object.entries(he.cargo) as [ItemId, number][]) {
          for (let i = 0; i < n; i++) {
            if (this.storeUsed + ITEMS[id].size <= this.storeCap) {
              this.addToStore(id, 1, false);
              this.emit({ type: 'fly', item: id, x: HELI_LAND.x + rand(-10, 10), y: HELI_LAND.y - 6 });
            } else {
              this.dropItem(id, HELIPAD.x - 16, HELI_LAND.y, 10);
            }
          }
        }
        he.cargo = {};
      }
    }
  }

  // ------------------------------------------------------------------ goals
  updateGoals() {
    this.maxMoney = Math.max(this.maxMoney, this.money);
    this.goals.forEach((g, i) => {
      const goal = g.goal;
      let p = 0;
      if (goal.kind === 'collect') p = this.collected[goal.item] ?? 0;
      else if (goal.kind === 'animals') p = Math.max(g.progress, this.livingAnimals(goal.animal));
      else p = this.maxMoney;
      g.progress = Math.min(goal.n, p);
      if (!g.done && g.progress >= goal.n) {
        g.done = true;
        this.emit({ type: 'goal', index: i });
        this.sfx('goal');
      }
    });
    if (!this.won && this.goals.every((g) => g.done)) {
      this.won = true;
      this.wonAt = this.time;
      this.emit({ type: 'win' });
    }
  }

  medal(): 1 | 2 | 3 {
    const t = this.won ? this.wonAt : this.time;
    return t <= this.level.gold ? 3 : t <= this.level.silver ? 2 : 1;
  }

  // ------------------------------------------------------------------ input
  hover(x: number, y: number): Hover {
    const p = this.predatorAt(x, y, false);
    if (p) return { kind: 'predator', id: p.id };
    const c = this.predatorAt(x, y, true);
    if (c) return { kind: 'cage', id: c.id };
    const items = this.itemsAt(x, y, 9);
    if (items.length) return { kind: 'item', id: items[0].id };
    if (inRect(x, y, WELL)) return { kind: 'well' };
    for (const w of this.workshops) if (inRect(x, y, SLOTS[w.slot])) return { kind: 'slot', slot: w.slot };
    if (inRect(x, y, WAREHOUSE)) return { kind: 'warehouse' };
    if (this.truck.state === 'home' && inRect(x, y, { x: TRUCK_HOME.x, y: TRUCK_HOME.y, w: 56, h: 32 })) return { kind: 'truck' };
    if (inRect(x, y, { x: HELIPAD.x, y: HELIPAD.y - 20, w: HELIPAD.w, h: HELIPAD.h + 20 })) return { kind: 'heli' };
    if (inField(x, y, 4)) return { kind: 'field' };
    return { kind: 'none' };
  }

  /** Handle a click in world space. Returns a UI action for the scene when a panel should open. */
  click(x: number, y: number): 'market' | 'heli' | null {
    if (this.won) return null;
    const h = this.hover(x, y);
    switch (h.kind) {
      case 'predator': { const p = this.predators.find((q) => q.id === h.id); if (p) this.hitPredator(p); return null; }
      case 'cage': { const p = this.predators.find((q) => q.id === h.id); if (p) this.storeCage(p); return null; }
      case 'item': {
        const list = this.itemsAt(x, y, 9).sort((a, b) => dist(a.x, a.y - 5, x, y) - dist(b.x, b.y - 5, x, y));
        for (const g of list.slice(0, 3)) if (!this.collectItem(g)) break;
        return null;
      }
      case 'well': this.refillWell(); return null;
      case 'slot': { const w = this.workshop(h.slot!); if (w) this.activateWorkshop(w); return null; }
      case 'warehouse':
      case 'truck':
        if (this.truck.state !== 'home') { this.toast('The truck is on its way to town.'); this.sfx('error'); return null; }
        return 'market';
      case 'heli':
        if (!this.level.buy?.length) { this.toast('Nothing to buy in town on this farm.'); return null; }
        if (this.heli.state !== 'home') { this.toast('The helicopter is on a delivery.'); this.sfx('error'); return null; }
        return 'heli';
      case 'field': this.plant(x, y); return null;
    }
    return null;
  }

  // ------------------------------------------------------------------ main update
  update(dt: number) {
    if (!this.won) this.time += dt;
    // predators spawn schedule
    while (this.predatorQueue.length && this.time >= this.predatorQueue[0]) {
      this.predatorQueue.shift();
      if (!this.won) this.spawnPredator();
    }
    // grass growth
    for (let i = 0; i < this.grow.length; i++) {
      if (this.grow[i] <= 0) continue;
      this.grow[i] -= dt;
      if (this.grow[i] <= 0) {
        if (this.grass[i] > 0 && this.grass[i] < 3) {
          this.grass[i]++;
          this.grassDirty = true;
          if (this.grass[i] < 3) this.grow[i] = 0.35;
        }
      }
    }
    // well
    this.wellAnim += dt;
    if (this.wellRefillT > 0) {
      this.wellRefillT -= dt;
      if (this.wellRefillT <= 0) { this.wellRefillT = 0; this.water = this.wellCap; this.emit({ type: 'fx', fx: 'splash', x: WELL.x + 28, y: WELL.y + 50 }); }
    }
    for (const a of this.animals) if (!a.dead) this.updateAnimal(a, dt);
    this.animals = this.animals.filter((a) => !a.dead);
    for (const p of [...this.predators]) this.updatePredator(p, dt);
    for (const p of this.pets) this.updatePet(p, dt);
    for (const w of this.workshops) this.updateWorkshop(w, dt);
    this.updateVehicles(dt);
    // ground items: bounce + expiry
    for (let i = this.items.length - 1; i >= 0; i--) {
      const g = this.items[i];
      if (g.z > 0 || g.vz > 0) {
        g.vz -= 400 * dt;
        g.z += g.vz * dt;
        g.x += g.vx * dt;
        if (g.z <= 0) { g.z = 0; g.vz = Math.abs(g.vz) > 40 ? -g.vz * 0.35 : 0; g.vx *= 0.5; }
      }
      g.age += dt;
      if (g.age >= g.life) {
        this.items.splice(i, 1);
        this.stats.expired++;
        this.emit({ type: 'fx', fx: 'puff', x: g.x, y: g.y - 4 });
        this.sfx('expire', 0.6);
      }
    }
    this.updateGoals();
  }

  /** Remove and return pending events. */
  drain(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
