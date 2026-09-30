// Renders a Game's world (background, buildings, entities, effects, ambient life). HUD lives in the level scene.
// Everything here is presentation only: it reads Game state and GameEvents and never changes the simulation.
import { drawBackdrop } from '../engine/display';
import { drawText } from '../art/font';
import { animFrame, draw, drawBC, frameCount, has, sprite } from '../engine/sprites';
import { ITEMS, type ItemId, type RegionId } from './data';
import type { FxKind, Game, GameEvent, Hover, Vehicle } from './game';
import {
  CELL, COLS, FIELD, HELIPAD, HELI_LAND, ROAD_END, ROAD_Y, ROWS, SLOTS, TRUCK_HOME, WAREHOUSE, WAREHOUSE_DOOR, WELL,
} from './layout';

interface Particle {
  name: string; x: number; y: number; t: number; dur: number; frames: number;
  vx: number; vy: number; scale: number; alpha: number; fade: boolean;
}
interface Floater { text: string; x: number; y: number; t: number; color: string }
interface Flyer { item: ItemId; x0: number; y0: number; x1: number; y1: number; t: number; dur: number; trail: number }
interface Coin { x0: number; y0: number; t: number; dur: number; delay: number; arc: number }
interface Ghost { x: number; y: number; t: number }
interface Squash { t: number; amount: number }
interface Butterfly { x: number; y: number; tx: number; ty: number; t: number; phase: number }
interface Bird { x: number; y: number; vx: number; phase: number }
interface Cloud { x: number; y: number; w: number; h: number; speed: number }
interface Flake { x: number; y: number; vy: number; phase: number }

const FX_SPRITE: Record<FxKind, string> = { puff: 'fx_puff', dust: 'fx_dust', sparkle: 'fx_sparkle', hit: 'fx_hit', splash: 'fx_splash' };

// Truck / helicopter choreography (seconds). Trips are always longer than the on-screen part.
const TRUCK_START = 0.45; // engine rev before pulling away
const TRUCK_DRIVE = 2.4; // time to drive off (or back on) screen
const TRUCK_TURN = 0.4; // cartoon turn-around after parking
const TRUCK_OFF = -80;
const HELI_SPOOL = 0.8, HELI_LIFT = 0.7, HELI_FLY = 2.4; // outbound
const HELI_IN = 2.4, HELI_HOVER = 0.6, HELI_DESCEND = 0.7; // inbound (ends exactly when the trip ends)
const HELI_SPINDOWN = 1.2;

function hash(i: number) {
  let x = (i * 374761393) ^ 0x5bd1e995;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeIn = (k: number) => k * k;
const easeOut = (k: number) => 1 - (1 - k) * (1 - k);
const easeInOut = (k: number) => k * k * (3 - 2 * k);
const easeOutBack = (k: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
/** Damped spring: 1 at t=0, oscillates back to 0. */
const spring = (t: number, freq = 22, damp = 7) => Math.exp(-t * damp) * Math.cos(t * freq);

type Decor = [string, number, number];
// Decor is authored for the meadow and swapped per region. Anchors are bottom-centre.
const DECOR: Decor[] = [
  // strip above the pen, around the well
  ['tree_oak', 108, 70], ['bush', 146, 72], ['flowers', 170, 60], ['pond', 226, 70], ['flowers', 270, 64], ['rock', 190, 72],
  ['bush', 372, 70], ['flowers', 394, 58], ['tree_oak', 432, 70], ['rock', 462, 70], ['flowers', 486, 62], ['tree_oak', 528, 70],
  // left, around the road
  ['bush', 150, 280], ['flowers', 120, 270], ['rock', 96, 282], ['flowers', 22, 262], ['bush', 44, 268],
  ['flowers', 30, 318], ['flowers', 96, 316], ['bush', 150, 318], ['rock', 224, 318],
  // between warehouse and helipad, and right
  ['bush', 402, 272], ['flowers', 420, 300], ['rock', 400, 316], ['flowers', 440, 262],
  ['tree_oak', 588, 306], ['flowers', 540, 272], ['bush', 548, 314], ['flowers', 628, 262], ['rock', 628, 318],
];
const REGION_SWAP: Record<RegionId, Record<string, string | null>> = {
  meadow: {},
  savanna: { tree_oak: 'acacia', bush: 'dry_bush', flowers: 'rock' },
  arctic: { tree_oak: 'pine_snow', bush: 'ice_rock', flowers: null, pond: 'snowman', rock: 'ice_rock' },
};
// fillers for workshop slots a level doesn't use (relative to the slot's top-left)
const SLOT_FILL: Decor[][] = [
  [['tree_oak', 24, 56], ['bush', 52, 58], ['flowers', 44, 40], ['rock', 12, 60]],
  [['bush', 18, 40], ['tree_oak', 48, 60], ['flowers', 16, 58], ['flowers', 30, 50]],
  [['pond', 36, 44], ['bush', 60, 60], ['flowers', 12, 60], ['rock', 24, 58]],
];

export class WorldRenderer {
  private bg: HTMLCanvasElement;
  private ground: HTMLCanvasElement; // plain ground tiles, reflected into the window margins
  private front: HTMLCanvasElement;
  particles: Particle[] = [];
  floaters: Floater[] = [];
  flyers: Flyer[] = [];
  coins: Coin[] = [];
  ghosts: Ghost[] = [];
  shake = 0;
  time = 0;
  warehouseBump = 0;
  /** Where coins fly to (the HUD money counter); set by the level scene. */
  coinTarget: [number, number] = [320, 338];
  /** Raised when coins land, so the HUD can pulse. */
  coinHits = 0;

  private tier = 0;
  private squash = new Map<number, Squash>();
  private turns = new Map<number, { dir: number; t: number }>();
  private grassStage: Uint8Array;
  private grassPop: Float32Array;
  private workshopState = new Map<string, { queue: number; pop: number; smoke: number; built: boolean }>();
  private chimney = new Map<string, [number, number]>();
  private prevTruck: Vehicle['state'] = 'home';
  private prevHeli: Vehicle['state'] = 'home';
  private heliHomeT = 99;
  private heliRotor = 0;
  private truckFx = 0;
  private heliFx = 0;
  private glintT = 1;
  private butterflies: Butterfly[] = [];
  private birds: Bird[] = [];
  private birdT = 6;
  private clouds: Cloud[] = [];
  private flakes: Flake[] = [];

  constructor(private game: Game, warehouseTier: number) {
    this.bg = document.createElement('canvas');
    this.bg.width = 640; this.bg.height = 360;
    this.ground = document.createElement('canvas');
    this.ground.width = 640; this.ground.height = 360;
    this.front = document.createElement('canvas');
    this.front.width = 640; this.front.height = 360;
    this.grassStage = new Uint8Array(COLS * ROWS);
    this.grassPop = new Float32Array(COLS * ROWS);
    this.grassStage.set(game.grass);
    this.tier = warehouseTier;
    this.buildBackground();
    this.initAmbient();
  }

  private get region(): RegionId { return this.game.level.region; }

  private buildBackground() {
    const region = this.region;
    const c = this.bg.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const g = `ground_${region}`, f = `field_${region}`;
    const gn = frameCount(g), fn = frameCount(f);
    for (let y = 0; y < 360; y += 16) for (let x = 0; x < 640; x += 16) {
      const h = hash(x * 131 + y * 7);
      draw(c, g, (h % 7 === 0 ? 1 + (h >> 4) % Math.max(1, gn - 1) : 0), x + sprite(g).ox, y + sprite(g).oy);
    }
    this.ground.getContext('2d')!.drawImage(this.bg, 0, 0);
    c.save();
    c.beginPath(); c.rect(FIELD.x, FIELD.y, FIELD.w, FIELD.h); c.clip();
    for (let y = FIELD.y; y < FIELD.y + FIELD.h; y += 16) for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += 16) {
      const h = hash(x * 17 + y * 911);
      const s = sprite(f);
      draw(c, f, (h % 5 === 0 ? 1 + (h >> 3) % Math.max(1, fn - 1) : 0), x + s.ox, y + s.oy);
    }
    // soft inner shade along the top and left edges so the pen reads as sunk-in
    c.fillStyle = 'rgba(46,34,47,0.10)';
    c.fillRect(FIELD.x, FIELD.y, FIELD.w, 3);
    c.fillRect(FIELD.x, FIELD.y, 2, FIELD.h);
    c.restore();

    // road from the left edge to the truck's parking spot
    const rn = frameCount('road');
    for (let x = 0; x < ROAD_END - 16; x += 16) draw(c, 'road', hash(x) % rn, x + sprite('road').ox, ROAD_Y + sprite('road').oy);
    if (has('road_end')) draw(c, 'road_end', 0, ROAD_END - 16 + sprite('road_end').ox, ROAD_Y + sprite('road_end').oy);
    else draw(c, 'road', 0, ROAD_END - 16 + sprite('road').ox, ROAD_Y + sprite('road').oy);

    // decor (+ fillers for unused workshop slots)
    const swap = REGION_SWAP[region];
    const decor: Decor[] = [...DECOR];
    const used = new Set(this.game.workshops.map((w) => w.slot));
    Object.entries(SLOTS).forEach(([id, r], i) => {
      if (used.has(id as keyof typeof SLOTS)) return;
      for (const [n, dx, dy] of SLOT_FILL[(i + this.game.level.id) % SLOT_FILL.length]) decor.push([n, r.x + dx, r.y + dy]);
    });
    decor.sort((a, b) => a[2] - b[2]);
    for (const [name0, x, y] of decor) {
      const name = name0 in swap ? swap[name0] : name0;
      if (!name || !has(name)) continue;
      draw(c, name, hash(x * 3 + y) % frameCount(name), x, y);
    }
    draw(c, 'sign_town', 0, 14, ROAD_Y + 2);

    // fences: top + sides (back layer)
    const fh = sprite('fence_h'), fv = sprite('fence_v'), fp = sprite('fence_post');
    for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += 16) draw(c, 'fence_h', 0, x + fh.ox, FIELD.y - 10 + fh.oy);
    for (let y = FIELD.y - 4; y < FIELD.y + FIELD.h; y += 16) {
      draw(c, 'fence_v', 0, FIELD.x - 4 + fv.ox, y + fv.oy);
      draw(c, 'fence_v', 0, FIELD.x + FIELD.w - 2 + fv.ox, y + fv.oy);
    }
    draw(c, 'fence_post', 0, FIELD.x - 4 + fp.ox, FIELD.y - 12 + fp.oy);
    draw(c, 'fence_post', 0, FIELD.x + FIELD.w - 2 + fp.ox, FIELD.y - 12 + fp.oy);
    const hp = sprite('helipad');
    // the helipad sprite may have lights that blink; frame 0 goes in the background
    draw(c, 'helipad', 0, HELIPAD.x + hp.ox, HELIPAD.y + hp.oy);

    // front layer: bottom fence
    const fc = this.front.getContext('2d')!;
    fc.imageSmoothingEnabled = false;
    for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += 16) draw(fc, 'fence_h', 0, x + fh.ox, FIELD.y + FIELD.h - 2 + fh.oy);
    draw(fc, 'fence_post', 0, FIELD.x - 4 + fp.ox, FIELD.y + FIELD.h - 4 + fp.oy);
    draw(fc, 'fence_post', 0, FIELD.x + FIELD.w - 2 + fp.ox, FIELD.y + FIELD.h - 4 + fp.oy);
  }

  private initAmbient() {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 3; i++) this.clouds.push({ x: rnd(-200, 640), y: rnd(40, 300), w: rnd(110, 180), h: rnd(40, 64), speed: rnd(4, 7) });
    if (this.region === 'meadow' && has('butterfly')) {
      for (let i = 0; i < 4; i++) {
        const x = rnd(40, 600), y = rnd(40, 300);
        this.butterflies.push({ x, y, tx: x, ty: y, t: 0, phase: Math.random() * 6 });
      }
    }
    if (this.region === 'arctic') for (let i = 0; i < 70; i++) this.flakes.push({ x: rnd(-20, 660), y: rnd(0, 360), vy: rnd(10, 22), phase: Math.random() * 6 });
  }

  // ------------------------------------------------------------ events
  private spawn(name: string, x: number, y: number, o: Partial<Particle> = {}) {
    if (!has(name)) return;
    const n = frameCount(name);
    this.particles.push({ name, x, y, t: 0, dur: n / 12, frames: n, vx: 0, vy: 0, scale: 1, alpha: 1, fade: false, ...o });
  }

  handle(e: GameEvent) {
    switch (e.type) {
      case 'fx': this.spawn(FX_SPRITE[e.fx], e.x, e.y); break;
      case 'float': this.floaters.push({ text: e.text, x: e.x, y: e.y, t: 0, color: e.color ?? '#ffffff' }); break;
      case 'fly': {
        const d = Math.hypot(WAREHOUSE_DOOR.x - e.x, WAREHOUSE_DOOR.y - e.y);
        this.flyers.push({ item: e.item, x0: e.x, y0: e.y, x1: WAREHOUSE_DOOR.x, y1: WAREHOUSE_DOOR.y - 24, t: 0, dur: 0.45 + d / 900, trail: 0 });
        break;
      }
      case 'ghost': this.ghosts.push({ x: e.x, y: e.y, t: 0 }); break;
      case 'shake': this.shake = Math.max(this.shake, e.amount); break;
      case 'squash': this.squash.set(e.id, { t: 0, amount: e.amount }); break;
      case 'plant': this.spawn('fx_ring', e.x, e.y + 2, { dur: 0.35 }); break;
    }
  }

  update(dt: number) {
    const g = this.game;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 12);
    this.warehouseBump = Math.max(0, this.warehouseBump - dt * 3);
    for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter((p) => p.t < p.dur);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 1.3);
    for (const f of this.flyers) {
      f.t += dt;
      f.trail -= dt;
      if (f.trail <= 0 && f.t < f.dur * 0.85) {
        f.trail = 0.05;
        const [x, y] = this.flyerPos(f);
        this.spawn('fx_star', x + (Math.random() * 6 - 3), y + (Math.random() * 6 - 3), { dur: 0.3 });
      }
    }
    this.flyers = this.flyers.filter((f) => {
      if (f.t >= f.dur) { this.warehouseBump = 1; return false; }
      return true;
    });
    for (const c of this.coins) c.t += dt;
    this.coins = this.coins.filter((c) => {
      if (c.t >= c.delay + c.dur) { this.coinHits++; return false; }
      return true;
    });
    for (const gh of this.ghosts) { gh.t += dt; gh.y -= dt * 20; }
    this.ghosts = this.ghosts.filter((gh) => gh.t < 2);
    for (const [id, s] of this.squash) { s.t += dt; if (s.t > 0.8) this.squash.delete(id); }
    for (const [id, s] of this.turns) s.t += dt, void id;

    // grass growth pops
    for (let i = 0; i < g.grass.length; i++) {
      if (g.grass[i] !== this.grassStage[i]) {
        if (g.grass[i] > this.grassStage[i]) this.grassPop[i] = 0.28;
        this.grassStage[i] = g.grass[i];
      }
      if (this.grassPop[i] > 0) this.grassPop[i] = Math.max(0, this.grassPop[i] - dt);
    }

    this.updateWorkshops(dt);
    this.updateVehicles(dt);
    this.updateItems(dt);
    this.updateAmbient(dt);
  }

  private flyerPos(f: Flyer): [number, number] {
    const k = clamp01(f.t / f.dur);
    const e = easeInOut(k);
    const x = f.x0 + (f.x1 - f.x0) * e;
    const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * (30 + Math.abs(f.x1 - f.x0) * 0.12);
    return [x, y];
  }

  private chimneyOf(kind: string): [number, number] {
    let c = this.chimney.get(kind);
    if (c) return c;
    // the highest opaque pixel of the idle frame is (nearly always) the chimney or roof ornament
    const s = sprite(kind);
    const img = s.frames[0].getContext('2d')!.getImageData(0, 0, s.w, s.h).data;
    c = [s.w / 2, 4];
    outer: for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (img[(y * s.w + x) * 4 + 3] > 0) { c = [x + 1, y]; break outer; }
    this.chimney.set(kind, c);
    return c;
  }

  private updateWorkshops(dt: number) {
    for (const w of this.game.workshops) {
      let st = this.workshopState.get(w.slot);
      if (!st) { st = { queue: w.queue, pop: 0, smoke: 0, built: w.built && w.buildT <= 0 }; this.workshopState.set(w.slot, st); }
      const r = SLOTS[w.slot];
      const ready = w.built && w.buildT <= 0;
      if (ready && !st.built) {
        // construction finished: bounce + dust
        st.pop = 0.5;
        for (let i = 0; i < 5; i++) this.spawn('fx_puff', r.x + 8 + i * 14, r.y + r.h - 4, { vy: -10, dur: 0.5 });
        this.shake = Math.max(this.shake, 1.5);
      }
      st.built = ready;
      if (w.queue < st.queue) {
        st.pop = 0.4;
        for (let i = 0; i < 3; i++) this.spawn('fx_star', r.x + 16 + Math.random() * 40, r.y + 10 + Math.random() * 30, { dur: 0.35 });
      }
      st.queue = w.queue;
      st.pop = Math.max(0, st.pop - dt);
      if (ready && w.queue > 0) {
        st.smoke -= dt;
        if (st.smoke <= 0) {
          st.smoke = 0.45;
          const [cx, cy] = this.chimneyOf(w.kind);
          const s = sprite(w.kind);
          this.spawn(has('fx_smoke') ? 'fx_smoke' : 'fx_puff', r.x - s.ox + cx, r.y - s.oy + cy - 2, { vx: 3 + Math.random() * 3, vy: -14, dur: 1.3, scale: 1 });
        }
      }
    }
  }

  // ------------------------------------------------------------ vehicles
  /** Where the truck is drawn right now. */
  private truckPose() {
    const tr = this.game.truck;
    const half = tr.trip / 2;
    let x = TRUCK_HOME.x, speed = 0, flip = false, loaded = false, sx = 1, hop = 0, rev = 0;
    if (tr.state === 'out') {
      loaded = true;
      if (tr.t < TRUCK_START) rev = 1;
      else {
        const k = clamp01((tr.t - TRUCK_START) / TRUCK_DRIVE);
        x = TRUCK_HOME.x + (TRUCK_OFF - TRUCK_HOME.x) * easeIn(k);
        speed = k < 1 ? 2 * k : 0;
      }
    } else if (tr.state === 'back') {
      const start = half - TRUCK_TURN - TRUCK_DRIVE;
      if (tr.t < start) x = TRUCK_OFF;
      else if (tr.t < start + TRUCK_DRIVE) {
        const k = clamp01((tr.t - start) / TRUCK_DRIVE);
        x = TRUCK_OFF + (TRUCK_HOME.x - TRUCK_OFF) * easeOut(k);
        speed = 2 * (1 - k);
        flip = true;
      } else {
        // parked facing right: flip around like a cartoon (squash to a sliver, hop, face left again)
        const k = clamp01((tr.t - start - TRUCK_DRIVE) / TRUCK_TURN);
        sx = Math.cos(k * Math.PI);
        flip = sx < 0;
        sx = Math.max(0.08, Math.abs(sx));
        hop = Math.sin(k * Math.PI) * 4;
      }
    }
    return { x, speed, flip, loaded, sx, hop, rev };
  }

  private heliPose() {
    const he = this.game.heli;
    const half = he.trip / 2;
    const base = { x: HELI_LAND.x, y: HELI_LAND.y, alt: 0, spin: 0, tilt: false, flip: false, sx: 1, cargo: false, visible: true };
    if (he.state === 'home') {
      base.spin = clamp01(1 - this.heliHomeT / HELI_SPINDOWN);
      return base;
    }
    const groundTarget = { x: -70, y: 150 };
    if (he.state === 'out') {
      const t = he.t;
      base.spin = clamp01(t / HELI_SPOOL);
      if (t < HELI_SPOOL) return base;
      const lt = t - HELI_SPOOL;
      if (lt < HELI_LIFT) { base.alt = 24 * easeInOut(lt / HELI_LIFT); return base; }
      const k = clamp01((lt - HELI_LIFT) / HELI_FLY);
      if (k >= 1) { base.visible = false; return base; }
      const e = easeIn(k);
      base.x = HELI_LAND.x + (groundTarget.x - HELI_LAND.x) * e;
      base.y = HELI_LAND.y + (groundTarget.y - HELI_LAND.y) * e;
      base.alt = 24 + 120 * e;
      base.tilt = true;
      return base;
    }
    // back: fly in from the left carrying the order, turn around while hovering, then set down
    const t = he.t;
    const start = half - HELI_IN - HELI_HOVER - HELI_DESCEND;
    base.spin = 1;
    base.cargo = true;
    if (t < start) { base.visible = false; return base; }
    if (t < start + HELI_IN) {
      const k = clamp01((t - start) / HELI_IN);
      const e = easeOut(k);
      base.x = groundTarget.x + (HELI_LAND.x - groundTarget.x) * e;
      base.y = groundTarget.y + (HELI_LAND.y - groundTarget.y) * e;
      base.alt = 144 - 114 * e;
      base.tilt = k < 0.85;
      base.flip = true;
      return base;
    }
    if (t < start + HELI_IN + HELI_HOVER) {
      const k = clamp01((t - start - HELI_IN) / HELI_HOVER);
      base.alt = 30 + Math.sin(k * Math.PI * 2) * 1.5;
      const c = Math.cos(k * Math.PI);
      base.flip = c > 0;
      base.sx = Math.max(0.08, Math.abs(c));
      return base;
    }
    const k = clamp01((t - start - HELI_IN - HELI_HOVER) / HELI_DESCEND);
    base.alt = 30 * (1 - easeInOut(k));
    return base;
  }

  private updateVehicles(dt: number) {
    const g = this.game;
    // truck: coins when it reaches town; exhaust + dust while driving
    if (this.prevTruck === 'out' && g.truck.state === 'back') this.spawnCoins();
    this.prevTruck = g.truck.state;
    const tp = this.truckPose();
    this.truckFx -= dt;
    if (this.truckFx <= 0 && g.truck.state !== 'home' && tp.x > TRUCK_OFF + 10) {
      const moving = tp.speed > 0.15;
      if (moving || tp.rev) {
        this.truckFx = moving ? 0.07 : 0.12;
        const rear = tp.flip ? tp.x : tp.x + 54; // exhaust sits at the back of the truck
        this.spawn(has('truck_exhaust') ? 'truck_exhaust' : 'fx_puff', rear, TRUCK_HOME.y + 27, { vx: tp.flip ? -10 : 10, vy: -8, dur: 0.5, scale: has('truck_exhaust') ? 1 : 0.5 });
        if (moving) this.spawn('fx_dust', rear - (tp.flip ? -6 : 6), TRUCK_HOME.y + 33, { vx: tp.flip ? -6 : 6, dur: 0.45, scale: 0.6, fade: true });
      }
    }
    // helicopter: rotor phase, downwash dust near the pad
    if (this.prevHeli !== 'home' && g.heli.state === 'home') this.heliHomeT = 0;
    this.prevHeli = g.heli.state;
    this.heliHomeT += dt;
    const hp = this.heliPose();
    this.heliRotor += dt * 22 * hp.spin;
    this.heliFx -= dt;
    if (this.heliFx <= 0 && hp.visible && hp.spin > 0.5 && hp.alt < 40 && (g.heli.state !== 'home' || this.heliHomeT < 0.5)) {
      this.heliFx = 0.12;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.spawn('fx_dust', hp.x + side * (20 + Math.random() * 8), hp.y + 2, { vx: side * 30, dur: 0.4, scale: 0.7, fade: true });
    }
  }

  private spawnCoins() {
    const v = this.game.truck.value;
    const n = Math.max(3, Math.min(12, Math.round(v / 60)));
    for (let i = 0; i < n; i++) this.coins.push({ x0: 6, y0: ROAD_Y + 4 - Math.random() * 10, t: 0, dur: 0.8 + Math.random() * 0.25, delay: i * 0.07, arc: 30 + Math.random() * 40 });
  }

  private updateItems(dt: number) {
    this.glintT -= dt;
    if (this.glintT <= 0 && this.game.items.length) {
      this.glintT = 0.6 + Math.random() * 0.8;
      const it = this.game.items[Math.floor(Math.random() * this.game.items.length)];
      this.spawn('fx_star', it.x + 4, it.y - 12 - it.z, { dur: 0.3 });
    }
  }

  private updateAmbient(dt: number) {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.w / 2 > 660) { c.x = -c.w; c.y = 40 + Math.random() * 260; }
    }
    for (const b of this.butterflies) {
      b.t -= dt;
      if (b.t <= 0) { b.t = 1.5 + Math.random() * 2.5; b.tx = Math.max(20, Math.min(620, b.x + (Math.random() * 160 - 80))); b.ty = Math.max(40, Math.min(310, b.y + (Math.random() * 100 - 50))); }
      b.x += (b.tx - b.x) * dt * 0.7;
      b.y += (b.ty - b.y) * dt * 0.7;
      b.phase += dt;
    }
    this.birdT -= dt;
    if (this.birdT <= 0 && has('bird')) {
      this.birdT = 14 + Math.random() * 16;
      const y = 40 + Math.random() * 120, dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 3; i++) this.birds.push({ x: dir > 0 ? -20 - i * 14 : 660 + i * 14, y: y + (i % 2) * 8 + i * 3, vx: dir * (46 + Math.random() * 6), phase: Math.random() * 3 });
    }
    for (const b of this.birds) { b.x += b.vx * dt; b.phase += dt; }
    this.birds = this.birds.filter((b) => b.x > -60 && b.x < 700);
    for (const f of this.flakes) {
      f.y += f.vy * dt; f.phase += dt;
      if (f.y > 362) { f.y = -4; f.x = Math.random() * 680 - 20; }
    }
  }

  /** True while the vehicle is away from its parking spot (so the HUD can show its trip there). */
  truckAway() { return this.truckPose().x < TRUCK_HOME.x - 40; }
  heliAway() { const h = this.heliPose(); return !h.visible || Math.hypot(h.x - HELI_LAND.x, h.alt) > 40; }

  shakeOffset(): [number, number] {
    if (this.shake <= 0) return [0, 0];
    const s = Math.ceil(this.shake);
    return [Math.round((Math.random() * 2 - 1) * s), Math.round((Math.random() * 2 - 1) * s)];
  }

  // ------------------------------------------------------------ drawing helpers
  private shadow(c: CanvasRenderingContext2D, x: number, y: number, w: number, alpha = 0.28, flat = 3.2) {
    if (w < 2 || alpha <= 0.01) return;
    c.fillStyle = `rgba(30,20,40,${alpha})`;
    const h = Math.max(2, Math.round(w / flat));
    const y0 = Math.round(y - h / 2);
    for (let j = 0; j < h; j++) {
      const t = (j + 0.5) / h * 2 - 1;
      const rw = Math.round(w * Math.sqrt(1 - t * t));
      c.fillRect(Math.round(x - rw / 2), y0 + j, rw, 1);
    }
  }

  /** Draw a sprite scaled / rotated about a pivot (defaults to its anchor). Falls back to a crisp draw when untransformed. */
  private drawX(c: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number,
    o: { flip?: boolean; sx?: number; sy?: number; rot?: number; alpha?: number; px?: number; py?: number } = {}) {
    const sx = o.sx ?? 1, sy = o.sy ?? 1, rot = o.rot ?? 0;
    if (Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01 && Math.abs(rot) < 0.01) {
      draw(c, name, frame, x, y, { flip: o.flip, alpha: o.alpha });
      return;
    }
    const px = o.px ?? x, py = o.py ?? y;
    c.save();
    c.translate(Math.round(px), Math.round(py));
    if (rot) c.rotate(rot);
    c.scale(sx, sy);
    draw(c, name, frame, x - Math.round(px), y - Math.round(py), { flip: o.flip, alpha: o.alpha });
    c.restore();
  }

  private highlight(c: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number, flip = false) {
    c.globalCompositeOperation = 'lighter';
    draw(c, name, frame, x, y, { flip, alpha: 0.3 + 0.1 * Math.sin(this.time * 10) });
    c.globalCompositeOperation = 'source-over';
  }

  /** Squash-and-stretch factors for an entity id ([sx, sy]), plus turn-around squeeze when it changes direction. */
  private squashOf(id: number, dir: number): [number, number] {
    let sx = 1, sy = 1;
    const s = this.squash.get(id);
    if (s) {
      const k = spring(s.t) * 0.22 * s.amount;
      sx += k; sy -= k;
    }
    const tn = this.turns.get(id);
    if (!tn) this.turns.set(id, { dir, t: 1 });
    else if (tn.dir !== dir) { tn.dir = dir; tn.t = 0; }
    else if (tn.t < 0.14) sx *= 0.35 + 0.65 * (tn.t / 0.14);
    return [sx, sy];
  }

  private drawGrass(c: CanvasRenderingContext2D) {
    const g = this.game;
    const t = this.time;
    // a soft ground blob under every planted cell first, so a patch reads as one connected lush area
    if (has('grass_base')) {
      for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
        const st = g.grass[r * COLS + col];
        if (st) draw(c, 'grass_base', st - 1, FIELD.x + col * CELL + CELL / 2, FIELD.y + r * CELL + CELL);
      }
    }
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      const i = r * COLS + col;
      const st = g.grass[i];
      if (!st) continue;
      const frame = (st - 1) * 2 + (hash(i) & 1);
      const x = FIELD.x + col * CELL + CELL / 2, y = FIELD.y + r * CELL + CELL;
      // a gust rolls across the pen: tall grass leans a pixel as it passes
      const sway = st === 3 ? Math.round(Math.sin(t * 1.7 - col * 0.32 + r * 0.18) * 0.9) : 0;
      const pop = this.grassPop[i];
      if (pop > 0) {
        const k = 1 - pop / 0.28;
        const s = 0.6 + 0.4 * easeOutBack(k);
        this.drawX(c, 'grass', frame, x, y, { sx: s, sy: s });
      } else draw(c, 'grass', frame, x + sway, y);
    }
  }

  // ------------------------------------------------------------ main draw
  draw(c: CanvasRenderingContext2D, hover: Hover) {
    const g = this.game;
    const t = this.time;
    drawBackdrop(c, this.ground);
    c.drawImage(this.bg, 0, 0);
    // helipad landing lights
    if (frameCount('helipad') > 1 && Math.floor(t * 2) % 2 === 1) {
      const hp = sprite('helipad');
      draw(c, 'helipad', 1, HELIPAD.x + hp.ox, HELIPAD.y + hp.oy);
    }
    this.drawGrass(c);

    // well (bobs while cranking)
    const ws = sprite('well');
    const refilling = g.wellRefillT > 0;
    const wellFrame = refilling ? 1 + Math.floor(t * 8) % Math.max(1, ws.frames.length - 1) : 0;
    if (refilling) {
      const k = Math.sin(t * 16) * 0.02;
      this.drawX(c, 'well', wellFrame, WELL.x + ws.ox, WELL.y + ws.oy, { sx: 1 - k, sy: 1 + k, px: WELL.x + ws.w / 2, py: WELL.y + ws.h });
    } else draw(c, 'well', wellFrame, WELL.x + ws.ox, WELL.y + ws.oy);
    if (hover.kind === 'well') this.highlight(c, 'well', wellFrame, WELL.x + ws.ox, WELL.y + ws.oy);

    this.drawWorkshops(c, hover);
    this.drawTruck(c, hover);
    const heli = this.heliPose();
    if (heli.visible && heli.alt < 1) this.drawHeli(c, heli, hover);
    this.drawEntities(c, hover);

    c.drawImage(this.front, 0, 0);
    this.drawWarehouse(c, hover);
    if (heli.visible && heli.alt >= 1) this.drawHeli(c, heli, hover);

    // ambient: cloud shadows drift over everything on the ground
    for (const cl of this.clouds) this.shadow(c, cl.x, cl.y, cl.w, 0.07);
    this.drawEffects(c);
    this.drawAmbient(c);
  }

  private drawWorkshops(c: CanvasRenderingContext2D, hover: Hover) {
    const g = this.game;
    const t = this.time;
    for (const w of g.workshops) {
      const r = SLOTS[w.slot];
      const st = this.workshopState.get(w.slot);
      if (!w.built || w.buildT > 0) {
        const bs = sprite('build_site');
        draw(c, 'build_site', 0, r.x + bs.ox, r.y + bs.oy);
        if (w.buildT > 0) {
          const k = 1 - w.buildT / 1.2;
          const s = sprite(w.kind);
          c.save();
          c.beginPath(); c.rect(r.x - 4, r.y + r.h - Math.round(r.h * k), r.w + 8, r.h); c.clip();
          draw(c, w.kind, 0, r.x + s.ox + Math.round(Math.sin(t * 50)), r.y + s.oy);
          c.restore();
          if (Math.random() < 0.3) this.spawn('fx_puff', r.x + Math.random() * r.w, r.y + r.h - Math.round(r.h * k), { dur: 0.4, scale: 0.6 });
        } else if (hover.kind === 'slot' && hover.slot === w.slot) this.highlight(c, 'build_site', 0, r.x + bs.ox, r.y + bs.oy);
        continue;
      }
      const s = sprite(w.kind);
      const working = w.queue > 0;
      const frame = working ? 1 + (Math.floor(t * 6) % Math.max(1, s.frames.length - 1)) : 0;
      // working buildings "breathe"; finishing a product (or construction) gives a springy pop
      let sx = 1, sy = 1;
      if (working) { const k = Math.sin(t * 9 + r.y) * 0.022; sx -= k * 0.6; sy += k; }
      if (st && st.pop > 0) { const k = spring(0.5 - st.pop, 20, 5) * 0.07; sx += k; sy -= k; }
      this.drawX(c, w.kind, frame, r.x + s.ox, r.y + s.oy, { sx, sy, px: r.x + s.w / 2, py: r.y + s.h });
      if (hover.kind === 'slot' && hover.slot === w.slot) this.highlight(c, w.kind, frame, r.x + s.ox, r.y + s.oy);
    }
  }

  private whTop = -1;
  /** Screen y of the warehouse's highest opaque pixel (tiers differ a lot in height). */
  warehouseTop(): number {
    if (this.whTop < 0) {
      const s = sprite('warehouse');
      const img = s.frames[this.tier % s.frames.length].getContext('2d')!.getImageData(0, 0, s.w, s.h).data;
      let top = 0;
      outer: for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (img[(y * s.w + x) * 4 + 3] > 0) { top = y; break outer; }
      this.whTop = WAREHOUSE.y + top;
    }
    return this.whTop;
  }

  private drawWarehouse(c: CanvasRenderingContext2D, hover: Hover) {
    const s = sprite('warehouse');
    const x = WAREHOUSE.x + s.ox, y = WAREHOUSE.y + s.oy;
    const k = this.warehouseBump > 0 ? spring(1 - this.warehouseBump, 24, 4) * 0.05 * this.warehouseBump : 0;
    this.drawX(c, 'warehouse', this.tier, x, y, { sx: 1 + k, sy: 1 - k, px: WAREHOUSE.x + s.w / 2, py: WAREHOUSE.y + s.h });
    if (hover.kind === 'warehouse' || hover.kind === 'truck') this.highlight(c, 'warehouse', this.tier, x, y);
  }

  private drawTruck(c: CanvasRenderingContext2D, hover: Hover) {
    const g = this.game;
    const ts = sprite('truck');
    const p = this.truckPose();
    if (p.x <= TRUCK_OFF + 2) return;
    const n = ts.frames.length;
    const perSet = n >= 8 ? 4 : 2;
    const wheel = p.speed > 0.05 ? Math.floor(this.time * (6 + 18 * p.speed)) % perSet : 0;
    const frame = (p.loaded ? perSet : 0) + wheel;
    // bumps in the road while moving; engine shudder while revving
    const bump = p.speed > 0.1 ? (Math.floor(this.time * 12) % 3 === 0 ? 1 : 0) : 0;
    const jx = p.rev ? (Math.floor(this.time * 30) % 2) : 0;
    const x = Math.round(p.x) + jx, y = TRUCK_HOME.y - bump - Math.round(p.hop);
    this.shadow(c, x + ts.w / 2, TRUCK_HOME.y + ts.h - 2, ts.w - 4, 0.22, 7);
    this.drawX(c, 'truck', frame, x + ts.ox, y + ts.oy, { flip: p.flip, sx: p.sx, px: x + ts.w / 2, py: y + ts.h });
    if (g.truck.state === 'home' && (hover.kind === 'truck' || hover.kind === 'warehouse')) this.highlight(c, 'truck', frame, x + ts.ox, y + ts.oy);
  }

  private drawHeli(c: CanvasRenderingContext2D, h: ReturnType<WorldRenderer['heliPose']>, hover: Hover) {
    const tilt = h.tilt && has('helicopter_tilt');
    const name = tilt ? 'helicopter_tilt' : 'helicopter';
    const s = sprite(name);
    const n = s.frames.length;
    let frame = 0;
    if (tilt) frame = Math.floor(this.heliRotor) % n;
    else if (h.spin > 0.12) frame = n > 1 ? 1 + (Math.floor(this.heliRotor) % (n - 1)) : 0;
    // ground shadow shrinks and fades with altitude
    const sh = Math.max(0, 1 - h.alt / 160);
    this.shadow(c, h.x, h.y - 1, 44 * (0.5 + 0.5 * sh), 0.25 * sh, 5);
    const bob = h.alt > 2 ? Math.round(Math.sin(this.time * 5) * 1) : 0;
    const x = Math.round(h.x - s.w / 2), y = Math.round(h.y - h.alt - s.h) + bob;
    if (h.cargo && h.alt > 4 && has('heli_cargo')) {
      const cs = sprite('heli_cargo');
      const swing = Math.sin(this.time * 3.2) * 0.12;
      this.drawX(c, 'heli_cargo', 0, x + s.w / 2, y + s.h - 4, { rot: swing, px: x + s.w / 2, py: y + s.h - 4 });
      void cs;
    }
    this.drawX(c, name, frame, x + s.ox, y + s.oy, { flip: h.flip, sx: h.sx, px: x + s.w / 2, py: y + s.h });
    if (hover.kind === 'heli' && this.game.heli.state === 'home') this.highlight(c, name, frame, x + s.ox, y + s.oy);
  }

  private drawEntities(c: CanvasRenderingContext2D, hover: Hover) {
    const g = this.game;
    const t = this.time;
    type Drawable = { y: number; fn: () => void };
    const list: Drawable[] = [];
    for (const it of g.items) {
      list.push({
        y: it.y - 0.5, fn: () => {
          const left = it.life - it.age;
          if (left < 5 && Math.floor(t * (left < 2 ? 12 : 6)) % 2 === 0) return;
          this.shadow(c, it.x, it.y, 10, 0.22);
          const bob = hover.kind === 'item' && hover.id === it.id ? -1 : 0;
          const y = it.y - 7 - Math.round(it.z) + bob;
          const k = clamp01(it.age / 0.3);
          if (k < 1) { const s = 0.3 + 0.7 * easeOutBack(k); this.drawX(c, it.item, 0, it.x, y, { sx: s, sy: s, py: it.y }); }
          else draw(c, it.item, 0, it.x, y);
          if (bob) this.highlight(c, it.item, 0, it.x, y);
        },
      });
    }
    for (const a of g.animals) {
      list.push({
        y: a.y, fn: () => {
          const walkName = `${a.kind}_walk`;
          const ws = sprite(walkName);
          const fall = a.state === 'fall';
          const sy0 = a.y - Math.round(a.fallH);
          this.shadow(c, a.x, a.y, (a.kind === 'chicken' ? 12 : a.kind === 'cow' ? 26 : 18) * (1 - Math.min(0.6, a.fallH / 300)), fall ? 0.14 : 0.28);
          let name = walkName, frame = 0;
          if (a.state === 'walk') frame = animFrame(walkName, a.anim, 8);
          else if (a.state === 'eat') { name = `${a.kind}_eat`; frame = animFrame(name, a.anim, 4); }
          const flip = a.dir < 0;
          let [sx, sy] = this.squashOf(a.id, a.dir);
          // idle animals breathe; walkers get a little hop in their step
          let lift = 0;
          if (a.state === 'idle') sy *= 1 + Math.sin(a.anim * 3 + a.id) * 0.03;
          else if (a.state === 'walk') lift = Math.abs(Math.sin(a.anim * 10)) > 0.7 ? 1 : 0;
          if (fall) {
            // swing under the parachute
            const rot = Math.sin(a.anim * 3.2) * 0.14;
            const top = sy0 - ws.h - 10;
            this.drawX(c, 'parachute', 0, a.x, sy0 - ws.h + 4, { rot, px: a.x, py: top });
            this.drawX(c, name, frame, a.x, sy0, { flip, rot, px: a.x, py: top });
          } else this.drawX(c, name, frame, a.x, sy0 - lift, { flip, sx, sy, py: sy0 });
          if (a.food <= 0 && !fall) {
            const urgent = a.starve > 6;
            const by = Math.round(Math.sin(t * 4 + a.id) * 1.5);
            if (!urgent || Math.floor(t * 6) % 2 === 0) draw(c, 'icon_hungry', 0, a.x + (flip ? -4 : 4), sy0 - ws.h - 1 + by);
          }
        },
      });
    }
    for (const p of g.predators) {
      list.push({
        y: p.y, fn: () => {
          const base = p.kind;
          const sy0 = p.y - Math.round(p.fallH);
          this.shadow(c, p.x, p.y, 26 * (1 - Math.min(0.7, p.fallH / 300)), p.fallH > 0 ? 0.12 + 0.18 * (1 - Math.min(1, p.fallH / 260)) : 0.3);
          const flip = p.dir < 0;
          let name = `${base}_walk`, frame = 0, rot = 0;
          if (p.state === 'fall' || p.state === 'leap') { name = `${base}_fall`; rot = Math.sin(p.anim * 7) * 0.22; }
          else if (p.state === 'attack' || p.state === 'land') { name = `${base}_attack`; frame = animFrame(name, p.anim, 6); }
          else if (p.state === 'caged') { name = `${base}_caged`; frame = animFrame(name, p.anim, 5); }
          else if (p.stun <= 0) frame = animFrame(name, p.anim, p.state === 'flee' ? 14 : 7);
          const jx = p.flash > 0 ? Math.round(Math.random() * 2 - 1) : 0;
          const [sx, sy] = this.squashOf(p.id, p.dir);
          const ps = sprite(name);
          this.drawX(c, name, frame, p.x + jx, sy0, { flip, sx, sy, rot, px: p.x + jx, py: rot ? sy0 - ps.h / 2 : sy0 });
          if (p.flash > 0) {
            c.globalCompositeOperation = 'lighter';
            this.drawX(c, name, frame, p.x + jx, sy0, { flip, sx, sy, alpha: 0.7 });
            c.globalCompositeOperation = 'source-over';
          }
          if (p.state === 'caged') {
            const cf = p.cageT < 4 ? 1 : 0;
            const shakeX = p.cageT < 4 ? Math.round(Math.sin(t * 40)) : 0;
            drawBC(c, 'cage', cf, p.x + shakeX, p.y + 3);
            if (hover.kind === 'cage' && hover.id === p.id) { const cs = sprite('cage'); this.highlight(c, 'cage', cf, Math.round(p.x + shakeX - cs.w / 2) + cs.ox, p.y + 3 - cs.h + cs.oy); }
          } else if (hover.kind === 'predator' && hover.id === p.id) this.highlight(c, name, frame, p.x, sy0, flip);
        },
      });
    }
    for (const pet of g.pets) {
      list.push({
        y: pet.y, fn: () => {
          const sy0 = pet.y - Math.round(pet.fallH);
          this.shadow(c, pet.x, pet.y, (pet.kind === 'cat' ? 12 : 14) * (1 - Math.min(0.6, pet.fallH / 300)), 0.28);
          let name = `${pet.kind}_idle`, frame = animFrame(name, pet.anim, 3);
          if (pet.state === 'walk' || pet.state === 'chase' || pet.state === 'fetch') { name = `${pet.kind}_walk`; frame = animFrame(name, pet.anim, pet.state === 'walk' ? 7 : 12); }
          else if (pet.state === 'bark') { name = 'dog_bark'; frame = animFrame(name, pet.anim, 6); }
          const [sx, sy] = this.squashOf(pet.id, pet.dir);
          if (pet.state === 'fall') {
            name = `${pet.kind}_idle`; frame = 0;
            const h = sprite(name).h;
            const rot = Math.sin(pet.anim * 3.2) * 0.14, top = sy0 - h - 10;
            this.drawX(c, 'parachute', 0, pet.x, sy0 - h + 4, { rot, px: pet.x, py: top });
            this.drawX(c, name, frame, pet.x, sy0, { flip: pet.dir < 0, rot, px: pet.x, py: top });
          } else {
            const lift = pet.state !== 'idle' && pet.state !== 'bark' && Math.abs(Math.sin(pet.anim * 12)) > 0.7 ? 1 : 0;
            this.drawX(c, name, frame, pet.x, sy0 - lift, { flip: pet.dir < 0, sx, sy, py: sy0 });
          }
        },
      });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.fn();
  }

  private drawEffects(c: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const k = p.t / p.dur;
      const frame = Math.min(p.frames - 1, Math.floor(k * p.frames));
      const alpha = p.fade ? p.alpha * (1 - k) : p.alpha;
      if (p.scale === 1) draw(c, p.name, frame, p.x, p.y, { alpha: alpha < 1 ? alpha : undefined });
      else this.drawX(c, p.name, frame, p.x, p.y, { sx: p.scale, sy: p.scale, alpha: alpha < 1 ? alpha : undefined });
    }
    for (const gh of this.ghosts) draw(c, 'ghost', animFrame('ghost', gh.t, 4), gh.x + Math.round(Math.sin(gh.t * 5) * 3), gh.y, { alpha: 1 - gh.t / 2 });
    for (const f of this.flyers) {
      const k = clamp01(f.t / f.dur);
      const [x, y] = this.flyerPos(f);
      const s = k < 0.5 ? 1 + 0.35 * Math.sin(k * Math.PI) : 1.35 - 0.75 * (k - 0.5) * 2 + 0.35 * (Math.sin(k * Math.PI) - 1);
      this.drawX(c, f.item, 0, x, y, { sx: s, sy: s });
    }
    for (const f of this.floaters) {
      const k = Math.min(1, f.t / 0.9);
      const y = f.y - 22 * (1 - Math.pow(1 - k, 3));
      const a = f.t < 1 ? 1 : 1 - (f.t - 1) / 0.3;
      c.globalAlpha = Math.max(0, a);
      drawText(c, f.text, Math.round(f.x), Math.round(y - (f.t < 0.12 ? 2 * Math.sin((f.t / 0.12) * Math.PI) : 0)), { color: f.color, outline: '#2e222f', align: 'center' });
      c.globalAlpha = 1;
    }
  }

  private drawAmbient(c: CanvasRenderingContext2D) {
    const t = this.time;
    for (const b of this.butterflies) {
      const y = b.y + Math.sin(b.phase * 4) * 3;
      draw(c, 'butterfly', animFrame('butterfly', b.phase, 12), b.x, y);
    }
    for (const b of this.birds) {
      this.shadow(c, b.x + 20, b.y + 140, 6, 0.12);
      draw(c, 'bird', animFrame('bird', b.phase, 10), b.x, b.y + Math.sin(b.phase * 3) * 2, { flip: b.vx < 0 });
    }
    if (this.flakes.length) {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (const f of this.flakes) c.fillRect(Math.round(f.x + Math.sin(f.phase * 1.5) * 4), Math.round(f.y), f.vy > 18 ? 2 : 1, f.vy > 18 ? 2 : 1);
    }
    void t;
  }

  /** Drawn above the HUD: coins flying from town into the money counter. */
  drawOverlay(c: CanvasRenderingContext2D) {
    const [tx, ty] = this.coinTarget;
    for (const coin of this.coins) {
      const lt = coin.t - coin.delay;
      if (lt < 0) continue;
      const k = clamp01(lt / coin.dur);
      const e = easeIn(k);
      const x = coin.x0 + (tx - coin.x0) * easeInOut(k);
      const y = coin.y0 + (ty - coin.y0) * e - Math.sin(k * Math.PI) * coin.arc;
      if (has('fx_coin')) draw(c, 'fx_coin', animFrame('fx_coin', lt, 14), x, y);
      else draw(c, 'icon_coin', 0, x, y);
    }
  }
}

export function itemName(id: ItemId) { return ITEMS[id].name; }
export { has };
