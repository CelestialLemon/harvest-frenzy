// Renders a Game's world (background, buildings, entities, effects). HUD lives in hud.ts.
import { drawText } from '../art/font';
import { animFrame, draw, drawBC, frameCount, has, sprite } from '../engine/sprites';
import { ITEMS, type ItemId, type RegionId } from './data';
import type { FxKind, Game, GameEvent, Hover } from './game';
import {
  CELL, COLS, FIELD, HELIPAD, HELI_LAND, ROWS, SLOTS, TRUCK_HOME, WAREHOUSE, WAREHOUSE_DOOR, WELL,
} from './layout';

interface Particle { name: string; x: number; y: number; t: number; dur: number; frames: number }
interface Floater { text: string; x: number; y: number; t: number; color: string }
interface Flyer { item: ItemId; x0: number; y0: number; x1: number; y1: number; t: number; dur: number }
interface Ghost { x: number; y: number; t: number }

const FX_SPRITE: Record<FxKind, string> = { puff: 'fx_puff', dust: 'fx_dust', sparkle: 'fx_sparkle', hit: 'fx_hit', splash: 'fx_splash' };

function hash(i: number) {
  let x = (i * 374761393) ^ 0x5bd1e995;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}

const DECOR: Record<RegionId, [string, number, number][]> = {
  meadow: [
    ['tree_oak', 500, 92], ['bush', 118, 56], ['flowers', 10, 108], ['bush', 20, 132], ['flowers', 104, 122], ['rock', 90, 104],
    ['pond', 586, 304], ['bush', 540, 280], ['flowers', 624, 272], ['flowers', 12, 312], ['flowers', 120, 314], ['rock', 628, 318],
    ['tree_oak', 20, 48], ['flowers', 470, 88], ['bush', 530, 312], ['flowers', 216, 20],
  ],
  savanna: [
    ['acacia', 498, 94], ['dry_bush', 116, 56], ['rock', 16, 108], ['dry_bush', 100, 128], ['rock', 70, 118],
    ['baobab', 596, 314], ['dry_bush', 540, 290], ['rock', 628, 276], ['dry_bush', 14, 314], ['rock', 116, 316],
    ['dry_bush', 20, 44], ['rock', 470, 88], ['dry_bush', 548, 318],
  ],
  arctic: [
    ['pine_snow', 500, 94], ['ice_rock', 116, 56], ['pine_snow', 22, 52], ['snowman', 104, 132], ['ice_rock', 20, 124],
    ['pine_snow', 604, 316], ['snowman', 552, 300], ['ice_rock', 628, 276], ['ice_rock', 14, 314], ['pine_snow', 124, 318], ['ice_rock', 470, 88],
  ],
};

export class WorldRenderer {
  private bg: HTMLCanvasElement;
  private front: HTMLCanvasElement;
  private grassCanvas: HTMLCanvasElement;
  particles: Particle[] = [];
  floaters: Floater[] = [];
  flyers: Flyer[] = [];
  ghosts: Ghost[] = [];
  shake = 0;
  time = 0;
  warehouseBump = 0;

  constructor(private game: Game, warehouseTier: number) {
    this.bg = document.createElement('canvas');
    this.bg.width = 640; this.bg.height = 360;
    this.front = document.createElement('canvas');
    this.front.width = 640; this.front.height = 360;
    this.grassCanvas = document.createElement('canvas');
    this.grassCanvas.width = FIELD.w + 8; this.grassCanvas.height = FIELD.h + 8;
    this.buildBackground(warehouseTier);
  }

  private buildBackground(tier: number) {
    const region = this.game.level.region;
    const c = this.bg.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const g = `ground_${region}`, f = `field_${region}`;
    const gn = frameCount(g), fn = frameCount(f);
    for (let y = 0; y < 360; y += 16) for (let x = 0; x < 640; x += 16) {
      const h = hash(x * 131 + y * 7);
      draw(c, g, (h % 7 === 0 ? 1 + (h >> 4) % Math.max(1, gn - 1) : 0), x + sprite(g).ox, y + sprite(g).oy);
    }
    for (let y = FIELD.y; y < FIELD.y + FIELD.h; y += 16) for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += 16) {
      const h = hash(x * 17 + y * 911);
      const s = sprite(f);
      c.save();
      c.beginPath(); c.rect(FIELD.x, FIELD.y, FIELD.w, FIELD.h); c.clip();
      draw(c, f, (h % 5 === 0 ? 1 + (h >> 3) % Math.max(1, fn - 1) : 0), x + s.ox, y + s.oy);
      c.restore();
    }
    // road from the left edge to the truck
    const rs = sprite('road');
    for (let x = 0; x < 128; x += 16) draw(c, 'road', (x / 16) % 2, x + rs.ox, 280 + rs.oy);
    // decor
    for (const [name, x, y] of DECOR[region]) draw(c, name, hash(x + y) % frameCount(name), x, y);
    draw(c, 'sign_town', 0, 10, 282);
    // fences: top + sides (back layer)
    const fh = sprite('fence_h'), fv = sprite('fence_v'), fp = sprite('fence_post');
    for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += 16) draw(c, 'fence_h', 0, x + fh.ox, FIELD.y - 10 + fh.oy);
    for (let y = FIELD.y - 4; y < FIELD.y + FIELD.h; y += 16) {
      draw(c, 'fence_v', 0, FIELD.x - 4 + fv.ox, y + fv.oy);
      draw(c, 'fence_v', 0, FIELD.x + FIELD.w - 2 + fv.ox, y + fv.oy);
    }
    draw(c, 'fence_post', 0, FIELD.x - 4 + fp.ox, FIELD.y - 12 + fp.oy);
    draw(c, 'fence_post', 0, FIELD.x + FIELD.w - 2 + fp.ox, FIELD.y - 12 + fp.oy);
    // helipad + warehouse are static
    const hp = sprite('helipad');
    draw(c, 'helipad', 0, HELIPAD.x + hp.ox, HELIPAD.y + hp.oy);
    this.drawWarehouse(c, tier);

    // front layer: bottom fence
    const fc = this.front.getContext('2d')!;
    fc.imageSmoothingEnabled = false;
    for (let x = FIELD.x; x < FIELD.x + FIELD.w; x += 16) draw(fc, 'fence_h', 0, x + fh.ox, FIELD.y + FIELD.h - 2 + fh.oy);
    draw(fc, 'fence_post', 0, FIELD.x - 4 + fp.ox, FIELD.y + FIELD.h - 4 + fp.oy);
    draw(fc, 'fence_post', 0, FIELD.x + FIELD.w - 2 + fp.ox, FIELD.y + FIELD.h - 4 + fp.oy);
  }

  private tier = 0;
  private drawWarehouse(c: CanvasRenderingContext2D, tier: number) {
    this.tier = tier;
    const s = sprite('warehouse');
    draw(c, 'warehouse', tier, WAREHOUSE.x + s.ox, WAREHOUSE.y + s.oy);
  }

  private redrawGrass() {
    const g = this.game;
    const c = this.grassCanvas.getContext('2d')!;
    c.clearRect(0, 0, this.grassCanvas.width, this.grassCanvas.height);
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      const i = r * COLS + col;
      const st = g.grass[i];
      if (!st) continue;
      const frame = (st - 1) * 2 + (hash(i) & 1);
      draw(c, 'grass', frame, col * CELL + CELL / 2 + 4, r * CELL + CELL + 4);
    }
    g.grassDirty = false;
  }

  // ------------------------------------------------------------ events
  handle(e: GameEvent) {
    switch (e.type) {
      case 'fx': {
        const name = FX_SPRITE[e.fx];
        const n = frameCount(name);
        this.particles.push({ name, x: e.x, y: e.y, t: 0, dur: n / 12, frames: n });
        break;
      }
      case 'float': this.floaters.push({ text: e.text, x: e.x, y: e.y, t: 0, color: e.color ?? '#ffffff' }); break;
      case 'fly': this.flyers.push({ item: e.item, x0: e.x, y0: e.y, x1: WAREHOUSE_DOOR.x, y1: WAREHOUSE_DOOR.y - 20, t: 0, dur: 0.55 }); break;
      case 'ghost': this.ghosts.push({ x: e.x, y: e.y, t: 0 }); break;
      case 'shake': this.shake = Math.max(this.shake, e.amount); break;
    }
  }

  update(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 12);
    this.warehouseBump = Math.max(0, this.warehouseBump - dt * 4);
    for (const p of this.particles) p.t += dt;
    this.particles = this.particles.filter((p) => p.t < p.dur);
    for (const f of this.floaters) { f.t += dt; f.y -= dt * 18; }
    this.floaters = this.floaters.filter((f) => f.t < 1.3);
    for (const f of this.flyers) f.t += dt;
    this.flyers = this.flyers.filter((f) => {
      if (f.t >= f.dur) { this.warehouseBump = 1; return false; }
      return true;
    });
    for (const g of this.ghosts) { g.t += dt; g.y -= dt * 20; }
    this.ghosts = this.ghosts.filter((g) => g.t < 2);
  }

  shakeOffset(): [number, number] {
    if (this.shake <= 0) return [0, 0];
    const s = Math.ceil(this.shake);
    return [Math.round((Math.random() * 2 - 1) * s), Math.round((Math.random() * 2 - 1) * s)];
  }

  // ------------------------------------------------------------ drawing
  private shadow(c: CanvasRenderingContext2D, x: number, y: number, w: number, alpha = 0.28) {
    c.fillStyle = `rgba(30,20,40,${alpha})`;
    const h = Math.max(2, Math.round(w / 3.2));
    const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
    // pixel ellipse: rows with shrinking width
    for (let j = 0; j < h; j++) {
      const t = (j + 0.5) / h * 2 - 1;
      const rw = Math.round(w * Math.sqrt(1 - t * t));
      c.fillRect(Math.round(x - rw / 2), y0 + j, rw, 1);
    }
    void x0;
  }

  private highlight(c: CanvasRenderingContext2D, name: string, frame: number, x: number, y: number, flip = false) {
    c.globalCompositeOperation = 'lighter';
    draw(c, name, frame, x, y, { flip, alpha: 0.3 + 0.1 * Math.sin(this.time * 10) });
    c.globalCompositeOperation = 'source-over';
  }

  draw(c: CanvasRenderingContext2D, hover: Hover) {
    const g = this.game;
    c.drawImage(this.bg, 0, 0);
    if (g.grassDirty) this.redrawGrass();
    c.drawImage(this.grassCanvas, FIELD.x - 4, FIELD.y - 4);

    // warehouse bump (re-draw on top with a squash when an item arrives)
    if (this.warehouseBump > 0) {
      const s = sprite('warehouse');
      const k = Math.sin(this.warehouseBump * Math.PI) * 0.03;
      c.save();
      c.translate(WAREHOUSE.x + s.w / 2, WAREHOUSE.y + s.h);
      c.scale(1 + k, 1 + k * 0.5); // grow only, so the static copy in bg never peeks out
      // origin is the sprite's bottom-centre; place its top-left at (-w/2, -h)
      draw(c, 'warehouse', this.tier, -s.w / 2 + s.ox, -s.h + s.oy);
      c.restore();
    }
    if (hover.kind === 'warehouse' || (hover.kind === 'truck')) {
      const s = sprite('warehouse');
      this.highlight(c, 'warehouse', this.tier, WAREHOUSE.x + s.ox, WAREHOUSE.y + s.oy);
    }

    // well
    const ws = sprite('well');
    const wellFrame = g.wellRefillT > 0 ? 1 + Math.floor(this.time * 8) % 3 : 0;
    draw(c, 'well', wellFrame, WELL.x + ws.ox, WELL.y + ws.oy);
    if (hover.kind === 'well') this.highlight(c, 'well', wellFrame, WELL.x + ws.ox, WELL.y + ws.oy);

    // workshops / build sites
    for (const w of g.workshops) {
      const r = SLOTS[w.slot];
      if (!w.built || w.buildT > 0) {
        const bs = sprite('build_site');
        draw(c, 'build_site', 0, r.x + bs.ox, r.y + bs.oy);
        if (w.buildT > 0) {
          const k = 1 - w.buildT / 1.2;
          const s = sprite(w.kind);
          c.save();
          c.beginPath(); c.rect(r.x - 4, r.y + r.h - Math.round(r.h * k), r.w + 8, r.h); c.clip();
          draw(c, w.kind, 0, r.x + s.ox, r.y + s.oy);
          c.restore();
        } else if (hover.kind === 'slot' && hover.slot === w.slot) this.highlight(c, 'build_site', 0, r.x + bs.ox, r.y + bs.oy);
        continue;
      }
      const s = sprite(w.kind);
      const working = w.queue > 0;
      const frame = working ? 1 + (Math.floor(this.time * 6) % Math.max(1, s.frames.length - 1)) : 0;
      let yOff = 0;
      if (working && w.progress > 0.92) yOff = Math.round(Math.sin(this.time * 60));
      draw(c, w.kind, frame, r.x + s.ox, r.y + s.oy + yOff);
      if (hover.kind === 'slot' && hover.slot === w.slot) this.highlight(c, w.kind, frame, r.x + s.ox, r.y + s.oy);
    }

    // truck at home
    const ts = sprite('truck');
    if (g.truck.state === 'home') {
      draw(c, 'truck', 0, TRUCK_HOME.x + ts.ox, TRUCK_HOME.y + ts.oy);
      if (hover.kind === 'truck' || hover.kind === 'warehouse') this.highlight(c, 'truck', 0, TRUCK_HOME.x + ts.ox, TRUCK_HOME.y + ts.oy);
    } else {
      const half = g.truck.trip / 2;
      const k = Math.min(1, g.truck.t / half);
      const outX = -70;
      const e = g.truck.state === 'out' ? k * k : 1 - (1 - k) * (1 - k);
      const x = g.truck.state === 'out' ? TRUCK_HOME.x + (outX - TRUCK_HOME.x) * e : outX + (TRUCK_HOME.x - outX) * e;
      const loaded = g.truck.state === 'out';
      const fr = (loaded ? 2 : 0) + (Math.floor(this.time * 10) % 2);
      if (x > -60) draw(c, 'truck', fr, x + ts.ox, TRUCK_HOME.y + ts.oy + (Math.floor(this.time * 10) % 2), { flip: g.truck.state === 'back' });
    }

    // helicopter on pad
    const hs = sprite('helicopter');
    const hox = hs.ox - hs.w / 2, hoy = hs.oy - hs.h; // convert bottom-center placement to the sprite's anchor
    if (g.heli.state === 'home') {
      draw(c, 'helicopter', 0, HELI_LAND.x + hox, HELI_LAND.y + hoy);
      if (hover.kind === 'heli') this.highlight(c, 'helicopter', 0, HELI_LAND.x + hox, HELI_LAND.y + hoy);
    }

    // y-sorted field entities
    type Drawable = { y: number; fn: () => void };
    const list: Drawable[] = [];
    for (const it of g.items) {
      list.push({
        y: it.y - 0.5, fn: () => {
          const expiring = it.life - it.age < 5;
          if (expiring && Math.floor(this.time * 8) % 2 === 0) return;
          this.shadow(c, it.x, it.y, 10, 0.22);
          const bob = hover.kind === 'item' && hover.id === it.id ? -1 : 0;
          draw(c, it.item, 0, it.x, it.y - 7 - Math.round(it.z) + bob);
          if (bob) this.highlight(c, it.item, 0, it.x, it.y - 7 - Math.round(it.z) + bob);
        },
      });
    }
    for (const a of g.animals) {
      list.push({
        y: a.y, fn: () => {
          const walkName = `${a.kind}_walk`;
          const fall = a.state === 'fall';
          const sy = a.y - Math.round(a.fallH);
          this.shadow(c, a.x, a.y, a.kind === 'chicken' ? 12 : a.kind === 'cow' ? 26 : 18, fall ? 0.15 : 0.28);
          let name = walkName, frame = 0;
          if (a.state === 'walk') frame = animFrame(walkName, a.anim, 8);
          else if (a.state === 'eat') { name = `${a.kind}_eat`; frame = animFrame(name, a.anim, 4); }
          if (fall) draw(c, 'parachute', 0, a.x, sy - sprite(walkName).h + 4);
          const flip = a.dir < 0;
          // starving: blink red-ish by alternating alpha
          draw(c, name, frame, a.x, sy, { flip });
          if (a.food <= 0 && !fall) {
            const urgent = a.starve > 6;
            if (!urgent || Math.floor(this.time * 6) % 2 === 0) draw(c, 'icon_hungry', 0, a.x + (flip ? -4 : 4), sy - sprite(walkName).h - 1);
          }
        },
      });
    }
    for (const p of g.predators) {
      list.push({
        y: p.y, fn: () => {
          const base = p.kind;
          const sy = p.y - Math.round(p.fallH);
          this.shadow(c, p.x, p.y, 26, p.fallH > 0 ? 0.12 : 0.3);
          const flip = p.dir < 0;
          let name = `${base}_walk`, frame = 0;
          if (p.state === 'fall' || p.state === 'leap') name = `${base}_fall`;
          else if (p.state === 'attack' || p.state === 'land') { name = `${base}_attack`; frame = animFrame(name, p.anim, 6); }
          else if (p.state === 'caged') { name = `${base}_caged`; frame = animFrame(name, p.anim, 5); }
          else if (p.stun <= 0) frame = animFrame(name, p.anim, p.state === 'flee' ? 14 : 7);
          const jx = p.flash > 0 ? Math.round(Math.random() * 2 - 1) : 0;
          draw(c, name, frame, p.x + jx, sy, { flip });
          if (p.flash > 0) {
            c.globalCompositeOperation = 'lighter';
            draw(c, name, frame, p.x + jx, sy, { flip, alpha: 0.7 });
            c.globalCompositeOperation = 'source-over';
          }
          if (p.state === 'caged') {
            const cf = p.cageT < 4 ? 1 : 0;
            const shakeX = p.cageT < 4 ? Math.round(Math.sin(this.time * 40)) : 0;
            drawBC(c, 'cage', cf, p.x + shakeX, p.y + 3);
            if (hover.kind === 'cage' && hover.id === p.id) { const cs = sprite('cage'); this.highlight(c, 'cage', cf, Math.round(p.x + shakeX - cs.w / 2) + cs.ox, p.y + 3 - cs.h + cs.oy); }
          } else if (hover.kind === 'predator' && hover.id === p.id) this.highlight(c, name, frame, p.x, sy, flip);
        },
      });
    }
    for (const pet of g.pets) {
      list.push({
        y: pet.y, fn: () => {
          const sy = pet.y - Math.round(pet.fallH);
          this.shadow(c, pet.x, pet.y, pet.kind === 'cat' ? 12 : 14, 0.28);
          let name = `${pet.kind}_idle`, frame = animFrame(name, pet.anim, 3);
          if (pet.state === 'walk' || pet.state === 'chase' || pet.state === 'fetch') { name = `${pet.kind}_walk`; frame = animFrame(name, pet.anim, pet.state === 'walk' ? 7 : 12); }
          else if (pet.state === 'bark') { name = 'dog_bark'; frame = animFrame(name, pet.anim, 6); }
          if (pet.state === 'fall') { name = `${pet.kind}_idle`; frame = 0; draw(c, 'parachute', 0, pet.x, sy - sprite(name).h + 4); }
          draw(c, name, frame, pet.x, sy, { flip: pet.dir < 0 });
        },
      });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.fn();

    c.drawImage(this.front, 0, 0);

    // flying helicopter
    if (g.heli.state !== 'home') {
      const half = g.heli.trip / 2;
      const k = Math.min(1, g.heli.t / half);
      let x: number, y: number;
      if (g.heli.state === 'out') { const e = k * k; x = HELI_LAND.x - 120 * e; y = HELI_LAND.y - 30 * Math.min(1, k * 4) - 60 * e; }
      else { const e = 1 - (1 - k) * (1 - k); x = HELI_LAND.x - 120 * (1 - e); y = HELI_LAND.y - 30 * Math.min(1, (1 - k) * 4) - 60 * (1 - e); }
      if (x > -40) draw(c, 'helicopter', animFrame('helicopter', this.time, 16), x + hox, y + hoy);
    }

    // effects
    for (const p of this.particles) draw(c, p.name, Math.min(p.frames - 1, Math.floor((p.t / p.dur) * p.frames)), p.x, p.y);
    for (const gh of this.ghosts) draw(c, 'ghost', animFrame('ghost', gh.t, 4), gh.x + Math.round(Math.sin(gh.t * 5) * 3), gh.y, { alpha: 1 - gh.t / 2 });
    for (const f of this.flyers) {
      const k = f.t / f.dur;
      const e = k * k * (3 - 2 * k);
      const x = f.x0 + (f.x1 - f.x0) * e;
      const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 40;
      draw(c, f.item, 0, x, y + 8 - 8);
    }
    for (const f of this.floaters) {
      const a = f.t < 1 ? 1 : 1 - (f.t - 1) / 0.3;
      c.globalAlpha = Math.max(0, a);
      drawText(c, f.text, Math.round(f.x), Math.round(f.y), { color: f.color, outline: '#2e222f', align: 'center' });
      c.globalAlpha = 1;
    }
  }
}

export function itemName(id: ItemId) { return ITEMS[id].name; }
export { has };
