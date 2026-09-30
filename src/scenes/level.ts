// In-level scene: runs the Game simulation, draws the world and all HUD / panels.
import { audio } from '../audio';
import { view } from '../engine/display';
import { animFrame, draw, drawBC, drawNine, drawTL, sprite } from '../engine/sprites';
import { COLORS, fmtMoney, fmtTime } from '../engine/ui';
import { ANIMALS, ITEMS, PETS, REGIONS, STATS, WORKSHOPS, WORKSHOP_LEVELS, type AnimalId, type ItemId, type PetId } from '../game/data';
import { Game, type Hover } from '../game/game';
import { HELIPAD, HELI_LAND, SLOTS, TRUCK_HOME, WAREHOUSE, WELL, FIELD } from '../game/layout';
import { LEVELS } from '../game/levelList';
import type { Goal } from '../game/levels';
import { WorldRenderer } from '../game/render';
import { persist, save } from '../game/save';
import type { App, Scene } from './scene';

type Panel = 'intro' | 'market' | 'heli' | 'pause' | 'win' | null;

interface Toast { text: string; t: number }

export function goalIcon(g: Goal): string {
  if (g.kind === 'collect') return g.item;
  if (g.kind === 'animals') return `${g.animal}_walk`;
  return 'icon_coin';
}

const UNCOUNTABLE = new Set<ItemId>(['wool', 'milk', 'egg_powder', 'flour', 'fabric', 'cream', 'cheese', 'ice_cream', 'yarn']);
const CAGED: Partial<Record<ItemId, string>> = { bear_cage: 'bear', lion_cage: 'lion', polar_cage: 'polar bear' };
export function itemPlural(id: ItemId, n: number): string {
  const caged = CAGED[id];
  if (caged) return n === 1 ? `caged ${caged}` : `caged ${caged}s`;
  const name = ITEMS[id].name.toLowerCase();
  if (n === 1 || UNCOUNTABLE.has(id)) return name;
  return name + 's';
}

export function goalLabel(g: Goal): string {
  if (g.kind === 'collect') return `Collect ${g.n} ${itemPlural(g.item, g.n)}`;
  if (g.kind === 'animals') return `Have ${g.n} ${ANIMALS[g.animal].name.toLowerCase()}${g.n > 1 ? (g.animal === 'sheep' ? '' : g.animal === 'ostrich' ? 'es' : 's') : ''}`;
  return `Have ${fmtMoney(g.n)}`;
}

/** Draw an icon for a goal centered at (x,y), fitting ~16px. */
export function drawGoalIcon(ctx: CanvasRenderingContext2D, g: Goal, x: number, y: number) {
  if (g.kind === 'animals') {
    const name = `${g.animal}_walk`;
    const s = sprite(name);
    const sc = s.h > 18 ? 0.5 : 1;
    draw(ctx, name, 0, x, y + Math.round((s.h * sc) / 2), { scale: sc });
  } else if (g.kind === 'money') draw(ctx, 'icon_coin', 0, x, y);
  else draw(ctx, g.item, 0, x, y);
}

export class LevelScene implements Scene {
  game: Game;
  world: WorldRenderer;
  panel: Panel = 'intro';
  hover: Hover = { kind: 'none' };
  toasts: Toast[] = [];
  cargo: Partial<Record<ItemId, number>> = {};
  order: Partial<Record<ItemId, number>> = {};
  winT = 0;
  starsGained = 0;
  prevMedal = 0;
  goalFlash: number[] = [];
  lastTick = -1;
  tutorialStep = 0;
  tutorialT = 0;
  shownMoney = -1;
  moneyPulse = 0;

  constructor(private app: App, public index: number, private onExit: (next?: number) => void) {
    this.game = new Game(LEVELS[index], { ...save.upgrades });
    this.world = new WorldRenderer(this.game, save.upgrades.warehouse);
  }

  get level() { return LEVELS[this.index]; }

  enter() {
    audio.music(REGIONS[this.level.region].music);
  }

  // ---------------------------------------------------------------- main frame
  frame(dt: number, ctx: CanvasRenderingContext2D) {
    const { input, ui } = this.app;
    const running = this.panel === null && !(this.game.won && this.winT > 1.4);
    if (input.key('Escape') || input.key('p')) {
      if (this.panel === null) { this.panel = 'pause'; audio.sfx('pause'); }
      else if (this.panel === 'pause' || this.panel === 'market' || this.panel === 'heli') { this.panel = null; audio.sfx('pause'); }
    }
    if (running) {
      this.game.update(Math.min(dt, 0.05));
    }
    for (const e of this.game.drain()) {
      if (e.type === 'sfx') audio.sfx(e.name, { vol: e.vol, rate: e.rate });
      else if (e.type === 'toast') this.toast(e.text);
      else if (e.type === 'goal') this.goalFlash[e.index] = 1.2;
      else if (e.type === 'win') this.onWin();
      else this.world.handle(e);
    }
    if (running || this.game.won) this.world.update(dt);
    if (this.game.won) this.winT += dt;
    if (this.game.won && this.winT > 1.4 && this.panel === null) { this.panel = 'win'; this.winT = 1.41; audio.sfx('win'); }

    // world
    this.hover = this.panel === null && input.inside && input.y > 20 && input.y < 320 ? this.game.hover(input.x, input.y) : { kind: 'none' };
    const [sx, sy] = this.world.shakeOffset();
    ctx.save();
    ctx.translate(sx, sy);
    this.world.draw(ctx, this.hover);
    this.drawWorldOverlays(ctx);
    ctx.restore();

    // HUD
    this.drawTopBar(ctx);
    this.drawBottomBar(ctx, dt);
    this.drawToasts(ctx, dt);
    if (this.level.tutorial && this.panel === null) this.drawTutorial(ctx, dt);
    if (this.panel === null) this.drawHoverTooltip(ctx);

    // panels
    switch (this.panel) {
      case 'intro': this.drawIntro(ctx); break;
      case 'market': this.drawMarket(ctx); break;
      case 'heli': this.drawHeli(ctx); break;
      case 'pause': this.drawPause(ctx); break;
      case 'win': this.drawWin(ctx, dt); break;
    }

    // world click
    if (this.panel === null && input.pressed && !input.consumed && !ui.isBlocked(input.x, input.y) && input.y > 20 && input.y < 320) {
      const action = this.game.click(input.x, input.y);
      if (action === 'market') this.openMarket();
      else if (action === 'heli') this.openHeli();
    }
    ui.playHover();
  }

  toast(text: string) {
    const existing = this.toasts.find((t) => t.text === text);
    if (existing) { existing.t = 0; return; }
    this.toasts.push({ text, t: 0 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  private onWin() {
    const medal = this.game.medal();
    this.prevMedal = save.medals[this.index] ?? 0;
    this.starsGained = Math.max(0, medal - this.prevMedal);
    save.medals[this.index] = Math.max(this.prevMedal, medal);
    const t = Math.round(this.game.wonAt);
    if (!save.best[this.index] || t < save.best[this.index]) save.best[this.index] = t;
    save.stars += this.starsGained;
    persist();
    audio.music(null);
  }

  private openMarket() {
    this.cargo = {};
    this.panel = 'market';
    audio.sfx('page');
  }

  private openHeli() {
    this.order = {};
    this.panel = 'heli';
    audio.sfx('page');
  }

  // ---------------------------------------------------------------- world overlays
  private drawWorldOverlays(ctx: CanvasRenderingContext2D) {
    const g = this.game;
    const { ui } = this.app;
    const t = this.world.time;
    // planting preview ring
    if (this.hover.kind === 'field' && this.panel === null) {
      const { x: mx, y: my } = this.app.input;
      ctx.fillStyle = g.water > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(232,59,59,0.9)';
      for (let i = 0; i < 24; i++) {
        if (i % 2) continue;
        const a = (i / 24) * Math.PI * 2 + t * 0.8;
        ctx.fillRect(Math.round(mx + Math.cos(a) * 16), Math.round(my + Math.sin(a) * 13), 1, 1);
      }
    }
    // well water meter
    const wx = WELL.x + 4, wy = WELL.y + WELL.h + 1;
    if (g.wellRefillT > 0) ui.progress(wx + 10, wy, 36, 3, 1 - g.wellRefillT / g.wellRefillTime, '#4d9be6');
    else ui.progress(wx + 10, wy, 36, 3, g.water / g.wellCap, g.water === 0 ? '#e83b3b' : '#4d9be6');
    draw(ctx, 'icon_water', 0, wx + 4, wy + 1);
    if (g.water === 0 && g.wellRefillT <= 0 && Math.floor(t * 3) % 2 === 0) {
      ui.text('REFILL!', WELL.x + 28, WELL.y - 2, { font: 'small', color: '#fbff86', outline: '#2e222f', align: 'center' });
    }

    // warehouse capacity
    const used = g.storeUsed, cap = g.storeCap;
    const bx = WAREHOUSE.x + 22, by = WAREHOUSE.y + WAREHOUSE.h + 2;
    ui.progress(bx, by, 68, 4, used / cap, used >= cap ? '#e83b3b' : used / cap > 0.75 ? '#f79617' : '#1ebc73');
    ui.text(`${used}/${cap}`, bx + 34, by + 6, { font: 'small', color: '#ffffff', outline: '#2e222f', align: 'center' });

    // workshops
    for (const w of g.workshops) {
      const r = SLOTS[w.slot];
      const def = WORKSHOPS[w.kind];
      if (!w.built) {
        const afford = g.money >= def.cost;
        const label = fmtMoney(def.cost);
        const lw = ui.measure(label, 'small') + 6;
        const lx = r.x + r.w / 2 - lw / 2, ly = r.y + r.h - 16;
        ctx.fillStyle = '#2e222f';
        ctx.fillRect(lx - 1, ly - 1, lw + 2, 9);
        ctx.fillStyle = afford ? '#239063' : '#625565';
        ctx.fillRect(lx, ly, lw, 7);
        ui.text(label, r.x + r.w / 2, ly + 1, { font: 'small', color: afford ? '#ffffff' : '#c7dcd0', align: 'center' });
        continue;
      }
      if (w.buildT > 0) continue;
      // progress + queue
      if (w.queue > 0) {
        ui.progress(r.x + 14, r.y + r.h + 1, 44, 3, w.progress, '#f9c22b');
      }
      const maxQ = WORKSHOP_LEVELS[w.level].queue;
      if (maxQ > 1) for (let i = 0; i < maxQ; i++) {
        ctx.fillStyle = '#2e222f';
        ctx.fillRect(r.x + 60 + i * 0, r.y + r.h - 4 - i * 5, 5, 4);
        ctx.fillStyle = i < w.queue ? '#f9c22b' : '#625565';
        ctx.fillRect(r.x + 61, r.y + r.h - 3 - i * 5, 3, 2);
      }
      // level stars
      for (let i = 0; i < w.level; i++) draw(ctx, 'icon_star', 0, r.x + 8 + i * 9, r.y + 6, {});
      // upgrade badge
      if (w.level < WORKSHOP_LEVELS.length - 1 && this.panel === null) {
        const cost = g.upgradeCost(w);
        const afford = g.money >= cost;
        const ux = r.x + r.w - 14, uy = r.y + 1;
        const over = this.app.input.over(ux - 2, uy - 2, 16, 16);
        if (afford || over) {
          const bob = afford ? Math.round(Math.sin(t * 5)) : 0;
          draw(ctx, 'icon_up', 0, ux + 6, uy + 6 + bob, { alpha: afford ? 1 : 0.55 });
          if (over) {
            ui.hoverId = `up_${w.slot}`;
            ui.tooltip([`Upgrade to level ${w.level + 2}: ${fmtMoney(cost)}`, `Faster, and ${WORKSHOP_LEVELS[w.level + 1].queue} jobs in queue`], ux, uy + 14, { below: true });
          }
          if (ui.hit(ux - 2, uy - 2, 16, 16)) g.upgradeWorkshop(w);
        }
      }
    }

    // truck trip timer
    if (g.truck.state !== 'home') {
      const total = g.truck.trip;
      const elapsed = (g.truck.state === 'out' ? 0 : total / 2) + g.truck.t;
      ui.progress(TRUCK_HOME.x + 8, TRUCK_HOME.y + 16, 40, 3, elapsed / total, '#f9c22b');
      draw(ctx, 'icon_truck', 0, TRUCK_HOME.x + 2, TRUCK_HOME.y + 17);
    } else if (g.storeUsed / g.storeCap >= 0.75 && Math.floor(t * 2) % 2 === 0) {
      drawBC(ctx, 'arrow_hint', animFrame('arrow_hint', t, 4), TRUCK_HOME.x + 28, TRUCK_HOME.y + 2);
    }
    // heli timer
    if (g.heli.state !== 'home') {
      const total = g.heli.trip;
      const elapsed = (g.heli.state === 'out' ? 0 : total / 2) + g.heli.t;
      ui.progress(HELIPAD.x + 8, HELIPAD.y + HELIPAD.h + 2, 40, 3, elapsed / total, '#4d9be6');
    }
    // cage timers
    for (const p of g.predators) {
      if (p.state === 'caged') ui.progress(p.x - 12, p.y + 5, 24, 2, p.cageT / g.cageHold, p.cageT < 4 ? '#e83b3b' : '#f9c22b');
      else if (p.hits > 0 && p.state !== 'fall' && p.state !== 'leap') {
        for (let i = 0; i < g.cageClicks; i++) {
          ctx.fillStyle = '#2e222f';
          ctx.fillRect(p.x - g.cageClicks * 3 + i * 6, p.y - 34, 5, 4);
          ctx.fillStyle = i < p.hits ? '#f9c22b' : '#625565';
          ctx.fillRect(p.x - g.cageClicks * 3 + i * 6 + 1, p.y - 33, 3, 2);
        }
      }
    }
  }

  // ---------------------------------------------------------------- HUD bars
  private drawTopBar(ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    const g = this.game;
    // bars reach the window edges when the window is wider/taller than the frame
    drawNine(ctx, 'ui_panel_dark', 0, -view.ox - 4, -view.oy - 6, view.w + 8, view.oy + 28, [8, 8, 8, 8]);
    ui.block(-view.ox, -view.oy, view.w, view.oy + 20);
    let x = 6;
    ui.text('GOALS', x, 7, { font: 'small', color: '#c7dcd0' });
    x += 26;
    g.goals.forEach((gs, i) => {
      const flash = this.goalFlash[i] ?? 0;
      if (flash > 0) this.goalFlash[i] = flash - 1 / 60;
      drawGoalIcon(ctx, gs.goal, x + 8, 10);
      const label = gs.goal.kind === 'money' ? `${fmtMoney(gs.progress)}/${fmtMoney(gs.goal.n)}` : `${gs.progress}/${gs.goal.n}`;
      const col = gs.done ? '#91db69' : '#ffffff';
      ui.text(label, x + 18, 6, { color: flash > 0 && Math.floor(flash * 10) % 2 ? '#fbff86' : col, outline: '#2e222f' });
      if (gs.done) draw(ctx, 'icon_check', 0, x + 12, 14);
      const w = 18 + ui.measure(label) + 12;
      if (this.app.input.over(x, 0, w, 20)) ui.tooltip([goalLabel(gs.goal)], x + w / 2, 20, { below: true });
      x += w;
    });
    ui.text(`LEVEL ${this.level.id}`, 598, 7, { font: 'small', color: '#c7dcd0', align: 'right' });
    if (ui.iconButton('pause', 616, 0, 'icon_pause') && this.panel === null) { this.panel = 'pause'; audio.sfx('pause'); }
  }

  private drawBottomBar(ctx: CanvasRenderingContext2D, dt: number) {
    const { ui, input } = this.app;
    const g = this.game;
    drawNine(ctx, 'ui_panel_dark', 0, -view.ox - 4, 318, view.w + 8, view.h - view.oy - 318 + 4, [8, 8, 8, 8]);
    ui.block(-view.ox, 320, view.w, view.h - view.oy - 320);
    let x = 5;
    const buy = (id: string, spriteName: string, cost: number, label: string, tip: string[], onClick: () => void, disabled = false) => {
      const afford = g.money >= cost && !disabled;
      const clicked = ui.button(id, x, 322, 46, 36, '', { color: afford ? 'green' : 'gray', sfx: false });
      const s = sprite(spriteName);
      const sc = s.h > 24 ? 0.75 : 1;
      const pressed = input.over(x, 322, 46, 36) && input.down ? 1 : 0;
      draw(ctx, spriteName, input.over(x, 322, 46, 36) ? animFrame(spriteName, this.world.time, 8) : 0, x + 23, 348 + pressed, { scale: sc === 1 ? 1 : undefined });
      ui.text(label, x + 23, 349 + pressed, { font: 'small', color: afford ? '#fbff86' : '#c7dcd0', outline: '#2e222f', align: 'center' });
      if (input.over(x, 322, 46, 36)) ui.tooltip(tip, x + 23, 320);
      if (clicked && this.panel === null) onClick();
      x += 49;
    };
    for (const a of this.level.animals) {
      const def = ANIMALS[a];
      buy(`buy_${a}`, `${a}_walk`, def.cost, fmtMoney(def.cost), [`${def.name} - ${fmtMoney(def.cost)}`, `Lays ${ITEMS[def.product].name.toLowerCase()} (${fmtMoney(ITEMS[def.product].price)})`], () => this.game.buyAnimal(a as AnimalId));
    }
    for (const p of this.level.pets ?? []) {
      const def = PETS[p];
      const owned = g.pets.some((q) => q.kind === p);
      buy(`buy_${p}`, `${p}_idle`, def.cost, owned ? 'OWNED' : fmtMoney(def.cost), [`${def.name} - ${fmtMoney(def.cost)}`, def.desc], () => this.game.buyPet(p as PetId), owned);
    }

    // money
    const mx = Math.max(x + 8, 300);
    if (this.shownMoney < 0) this.shownMoney = g.money;
    const diff = g.money - this.shownMoney;
    if (Math.abs(diff) >= 1) {
      if (diff > 0) this.moneyPulse = 1;
      this.shownMoney += Math.sign(diff) * Math.max(1, Math.abs(diff) * Math.min(1, dt * 8));
    } else this.shownMoney = g.money;
    this.moneyPulse = Math.max(0, this.moneyPulse - dt * 3);
    draw(ctx, 'icon_coin', 0, mx + 6, 339 - Math.round(this.moneyPulse * 2));
    ui.text(fmtMoney(Math.round(this.shownMoney)), mx + 15, 333, { font: 'big', color: this.moneyPulse > 0.5 ? '#fbff86' : '#f9c22b', outline: '#2e222f' });

    // timer + medals
    const tx = 506;
    draw(ctx, 'icon_clock', 0, tx + 6, 333);
    const time = g.won ? g.wonAt : g.time;
    ui.text(fmtTime(time), tx + 15, 328, { color: '#ffffff', outline: '#2e222f' });
    const medal = g.medal();
    const name = medal === 3 ? 'medal_gold' : medal === 2 ? 'medal_silver' : 'medal_bronze';
    const limit = medal === 3 ? this.level.gold : medal === 2 ? this.level.silver : 0;
    draw(ctx, name, 0, tx + 118, 339);
    if (limit) {
      const left = limit - time;
      ui.text(`${medal === 3 ? 'GOLD' : 'SILVER'} ${fmtTime(left)}`, tx + 15, 341, { font: 'small', color: left < 15 ? '#e83b3b' : '#c7dcd0' });
      ui.progress(tx + 15, 349, 90, 3, left / (medal === 3 ? this.level.gold : this.level.silver - this.level.gold), medal === 3 ? '#f9c22b' : '#c7dcd0');
      const sec = Math.ceil(left);
      if (sec <= 10 && sec > 0 && sec !== this.lastTick && !g.won && this.panel === null) { this.lastTick = sec; audio.sfx('tick', { vol: 0.5 }); }
    } else ui.text('BRONZE', tx + 15, 341, { font: 'small', color: '#c7dcd0' });
    if (input.over(tx, 322, 130, 36)) ui.tooltip([`Gold: under ${fmtTime(this.level.gold)}`, `Silver: under ${fmtTime(this.level.silver)}`], tx + 60, 320);
  }

  private drawToasts(ctx: CanvasRenderingContext2D, dt: number) {
    const { ui } = this.app;
    let y = 26;
    for (const t of this.toasts) {
      t.t += dt;
      const a = t.t < 2.4 ? 1 : 1 - (t.t - 2.4) / 0.5;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      const w = ui.measure(t.text) + 16;
      drawNine(ctx, 'ui_panel_dark', 0, 320 - w / 2, y, w, 19, [8, 8, 8, 8]);
      ui.text(t.text, 320, y + 5, { color: '#fbff86', align: 'center' });
      ctx.globalAlpha = 1;
      y += 20;
    }
    this.toasts = this.toasts.filter((t) => t.t < 2.9);
  }

  private drawHoverTooltip(ctx: CanvasRenderingContext2D) {
    const { ui, input } = this.app;
    const g = this.game;
    const h = this.hover;
    void ctx;
    switch (h.kind) {
      case 'item': {
        const it = g.items.find((i) => i.id === h.id);
        if (it) ui.tooltip([`${ITEMS[it.item].name} ${fmtMoney(ITEMS[it.item].price)}`], it.x, it.y - 18, { font: 'small' });
        break;
      }
      case 'well':
        ui.tooltip(g.wellRefillT > 0 ? ['Refilling...'] : [`Well: ${g.water}/${g.wellCap} buckets`, `Click to refill (${fmtMoney(STATS.wellCost)})`], WELL.x + 28, WELL.y + 70, { below: true });
        break;
      case 'warehouse': case 'truck':
        ui.tooltip([`Warehouse ${g.storeUsed}/${g.storeCap}`, g.truck.state === 'home' ? 'Click to sell goods in town' : 'The truck is away'], WAREHOUSE.x + 56, WAREHOUSE.y);
        break;
      case 'heli':
        if (this.level.buy?.length) ui.tooltip(['Helicopter', g.heli.state === 'home' ? 'Click to buy supplies' : 'On a delivery...'], HELI_LAND.x, HELIPAD.y + 30, { below: true });
        break;
      case 'predator': {
        const p = g.predators.find((q) => q.id === h.id);
        if (p) ui.tooltip([`Click! ${p.hits}/${g.cageClicks}`], p.x, p.y - 36, { font: 'small' });
        break;
      }
      case 'cage': {
        const p = g.predators.find((q) => q.id === h.id);
        if (p) ui.tooltip([`Store in warehouse (${ITEMS[`${p.kind}_cage` as ItemId].size} spaces)`, `Sells for ${fmtMoney(ITEMS[`${p.kind}_cage` as ItemId].price)}`], p.x, p.y - 34, { font: 'small' });
        break;
      }
      case 'slot': {
        const w = g.workshop(h.slot!);
        if (!w || ui.hoverId.startsWith('up_')) break;
        this.drawRecipeTip(ctx, w.kind, w.built, SLOTS[w.slot].x + 36, SLOTS[w.slot].y + SLOTS[w.slot].h, w.level);
        break;
      }
    }
    void input;
  }

  private drawRecipeTip(ctx: CanvasRenderingContext2D, kind: keyof typeof WORKSHOPS, built: boolean, x: number, y: number, level: number) {
    const { ui } = this.app;
    const g = this.game;
    const def = WORKSHOPS[kind];
    const inputs = Object.entries(def.inputs) as [ItemId, number][];
    const w = 150, h = built ? 52 : 60;
    let bx = Math.round(x - w / 2);
    bx = Math.max(2, Math.min(638 - w, bx));
    const by = Math.min(318 - h, y + 4);
    drawNine(ctx, 'bubble', 0, bx, by, w, h, [5, 5, 5, 5]);
    ui.text(built ? `${def.name}${level ? ` Lv${level + 1}` : ''}` : `Build ${def.name}`, bx + 6, by + 5, { color: COLORS.parchmentText });
    let ix = bx + 8;
    const iy = by + 18; // top of the icon row
    inputs.forEach(([id, n], i) => {
      if (i) { ui.text('+', ix + 1, iy + 4, { color: COLORS.parchmentText }); ix += 9; }
      drawTL(ctx, id, 0, ix, iy);
      if (n > 1) ui.text(`x${n}`, ix + 12, iy + 10, { font: 'small', color: '#ffffff', outline: '#2e222f' });
      const have = g.count(id);
      ui.text(`${have}`, ix + 8, iy + 18, { font: 'small', color: have >= n ? '#239063' : '#b33831', align: 'center' });
      ix += n > 1 ? 22 : 18;
    });
    // arrow
    ctx.fillStyle = '#625565';
    ctx.fillRect(ix + 1, iy + 7, 8, 2);
    ctx.fillRect(ix + 7, iy + 5, 1, 6);
    ctx.fillRect(ix + 8, iy + 6, 1, 4);
    ctx.fillRect(ix + 9, iy + 7, 1, 2);
    ix += 13;
    drawTL(ctx, def.output, 0, ix, iy);
    ui.text(fmtMoney(ITEMS[def.output].price), ix + 19, iy + 5, { font: 'small', color: '#239063' });
    const secs = (def.time / WORKSHOP_LEVELS[level].speed).toFixed(1).replace('.0', '');
    if (built) ui.text(`${secs}s - click to produce`, bx + 6, by + 42, { font: 'small', color: '#625565' });
    else {
      ui.text(`${secs}s per item`, bx + 6, by + 42, { font: 'small', color: '#625565' });
      ui.text(`Click to build: ${fmtMoney(def.cost)}`, bx + 6, by + 50, { font: 'small', color: g.money >= def.cost ? '#239063' : '#b33831' });
    }
  }

  // ---------------------------------------------------------------- tutorial (level 1)
  private drawTutorial(ctx: CanvasRenderingContext2D, dt: number) {
    const g = this.game;
    const { ui } = this.app;
    this.tutorialT += dt;
    type Step = { text: string; at: () => [number, number] | null; done: () => boolean };
    const firstEgg = () => g.items.find((i) => i.item === 'egg');
    const steps: Step[] = [
      { text: 'Click empty ground in the field to plant grass. Chickens love it!', at: () => [FIELD.x + 250, FIELD.y + 150], done: () => g.water < g.wellCap },
      { text: 'Your chicken eats grass and lays eggs. Click an egg to collect it!', at: () => { const e = firstEgg(); return e ? [e.x, e.y - 12] : null; }, done: () => (g.collected.egg ?? 0) > 0 },
      { text: 'Buy another chicken with the button below.', at: () => [28, 322], done: () => g.animals.length >= 2 },
      { text: 'Keep the grass growing and collect 6 eggs. When the well runs dry, click it to refill!', at: () => (g.water <= 1 ? [WELL.x + 28, WELL.y + 4] : null), done: () => g.won },
    ];
    while (this.tutorialStep < steps.length && steps[this.tutorialStep].done()) { this.tutorialStep++; this.tutorialT = 0; }
    const s = steps[this.tutorialStep];
    if (!s) return;
    const lines = ui.wrap(s.text, 236);
    const w = 256, h = lines.length * ui.lh() + 18;
    const bx = 320 - w / 2 + 40, by = 244;
    drawNine(ctx, 'ui_panel', 0, bx, by, w, h, [8, 8, 8, 8]);
    lines.forEach((l, i) => ui.text(l, bx + 10, by + 9 + i * ui.lh(), { color: COLORS.parchmentText }));
    draw(ctx, 'chicken_walk', animFrame('chicken_walk', this.tutorialT, 4), bx - 4, by + h - 2);
    const at = s.at();
    if (at) drawBC(ctx, 'arrow_hint', animFrame('arrow_hint', this.tutorialT, 4), at[0], at[1] - 2 + Math.round(Math.sin(this.tutorialT * 6) * 2));
  }

  // ---------------------------------------------------------------- panels
  private drawIntro(ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    ui.modalBackdrop(0.45);
    const lv = this.level;
    const w = 300, lines = lv.intro ? ui.wrap(lv.intro, w - 28) : [];
    const h = 96 + lines.length * ui.lh() + lv.goals.length * 20;
    const x = 320 - w / 2, y = Math.round(180 - h / 2);
    ui.panel(x, y, w, h);
    ui.text(`Level ${lv.id}`, 320, y + 10, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    ui.text(REGIONS[lv.region].name, 320, y + 26, { font: 'small', color: '#625565', align: 'center' });
    let cy = y + 38;
    lines.forEach((l) => { ui.text(l, x + 14, cy, { color: COLORS.parchmentText }); cy += ui.lh(); });
    cy += 4;
    for (const gl of lv.goals) {
      drawGoalIcon(ctx, gl, x + 26, cy + 8);
      ui.text(goalLabel(gl), x + 40, cy + 4, { color: COLORS.parchmentText });
      cy += 20;
    }
    draw(ctx, 'medal_gold', 0, x + 24, cy + 10);
    ui.text(fmtTime(lv.gold), x + 36, cy + 6, { color: COLORS.parchmentText });
    draw(ctx, 'medal_silver', 0, x + 94, cy + 10);
    ui.text(fmtTime(lv.silver), x + 106, cy + 6, { color: COLORS.parchmentText });
    if (ui.button('start', x + w - 96, y + h - 34, 80, 22, 'Start!', { color: 'green' }) || this.app.input.key('Enter') || this.app.input.key(' ')) {
      this.panel = null;
    }
  }

  private cargoUnits(c: Partial<Record<ItemId, number>>) {
    return (Object.entries(c) as [ItemId, number][]).reduce((a, [id, n]) => a + n * ITEMS[id].size, 0);
  }

  private drawMarket(ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    const g = this.game;
    ui.modalBackdrop();
    const stock = (Object.entries(g.store) as [ItemId, number][]).filter(([, n]) => n > 0);
    const rows = Math.max(1, Math.ceil(Math.min(12, stock.length) / 2));
    const w = 400, h = 82 + rows * 30, x = 120, y = Math.round(172 - h / 2);
    ui.panel(x, y, w, h);
    drawTL(ctx, 'truck', 0, x + 10, y + 4);
    ui.text('Sell in Town', 320, y + 9, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    const cap = g.truckCap;
    const units = this.cargoUnits(this.cargo);
    if (!stock.length) ui.text('The warehouse is empty.', 320, y + 42, { color: COLORS.parchmentText, align: 'center' });
    stock.slice(0, 12).forEach(([id, have], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = x + 14 + col * 188, cy = y + 36 + row * 30;
      drawNine(ctx, 'ui_slot', 0, cx, cy, 182, 27, [6, 6, 6, 6]);
      draw(ctx, id, 0, cx + 13, cy + 13);
      const n = this.cargo[id] ?? 0;
      ui.text(ITEMS[id].name, cx + 24, cy + 4, { font: 'small', color: COLORS.parchmentText });
      ui.text(`x${have - n}  ${fmtMoney(ITEMS[id].price)}`, cx + 24, cy + 14, { font: 'small', color: '#625565' });
      const size = ITEMS[id].size;
      if (ui.button(`m_${id}`, cx + 104, cy + 4, 18, 19, '-', { color: 'red', disabled: n <= 0 })) this.cargo[id] = n - 1;
      ui.text(`${n}`, cx + 131, cy + 8, { color: n ? '#239063' : COLORS.parchmentText, align: 'center' });
      if (ui.button(`p_${id}`, cx + 140, cy + 4, 18, 19, '+', { color: 'green', disabled: n >= have || units + size > cap })) this.cargo[id] = n + 1;
      if (ui.button(`a_${id}`, cx + 160, cy + 4, 18, 19, '', { color: 'blue', icon: 'icon_up', disabled: n >= have || units + size > cap })) {
        const fit = Math.floor((cap - units) / size);
        this.cargo[id] = n + Math.min(have - n, fit);
      }
    });
    const value = (Object.entries(this.cargo) as [ItemId, number][]).reduce((a, [id, n]) => a + n * ITEMS[id].price, 0);
    const fy = y + h - 36;
    ui.text(`Truck load ${units}/${cap}`, x + 16, fy, { font: 'small', color: COLORS.parchmentText });
    ui.progress(x + 16, fy + 9, 110, 5, units / cap, '#f9c22b');
    ui.text(`Total: ${fmtMoney(value)}`, x + 140, fy + 4, { color: '#239063' });
    if (ui.button('fill', x + 222, fy - 2, 50, 22, 'Fill', { color: 'blue', disabled: !stock.length })) {
      // fill truck with the most valuable goods first (per unit of space)
      this.cargo = {};
      let u = 0;
      const sorted = [...stock].sort((a, b) => ITEMS[b[0]].price / ITEMS[b[0]].size - ITEMS[a[0]].price / ITEMS[a[0]].size);
      for (const [id, have] of sorted) {
        const size = ITEMS[id].size;
        const n = Math.min(have, Math.floor((cap - u) / size));
        if (n > 0) { this.cargo[id] = n; u += n * size; }
      }
    }
    if (ui.button('go', x + 278, fy - 2, 58, 22, 'Go!', { color: 'green', disabled: units === 0 })) {
      if (g.sendTruck(this.cargo)) this.panel = null;
    }
    if (ui.button('close', x + 342, fy - 2, 44, 22, '', { color: 'red', icon: 'icon_cross' })) this.panel = null;
  }

  private drawHeli(ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    const g = this.game;
    ui.modalBackdrop();
    const buyable = this.level.buy ?? [];
    const w = 280, h = 110 + buyable.length * 30, x = 180, y = Math.round(180 - h / 2);
    ui.panel(x, y, w, h);
    ui.text('Buy Supplies', 320, y + 9, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    const cap = g.heliCap;
    const units = this.cargoUnits(this.order);
    let cost = 0;
    for (const [id, n] of Object.entries(this.order) as [ItemId, number][]) cost += n * (ITEMS[id].buy ?? 0);
    buyable.forEach((id, i) => {
      const cx = x + 14, cy = y + 34 + i * 30;
      drawNine(ctx, 'ui_slot', 0, cx, cy, w - 28, 27, [6, 6, 6, 6]);
      draw(ctx, id, 0, cx + 13, cy + 13);
      const n = this.order[id] ?? 0;
      ui.text(ITEMS[id].name, cx + 26, cy + 4, { color: COLORS.parchmentText });
      ui.text(`${fmtMoney(ITEMS[id].buy ?? 0)} each - have ${g.count(id)}`, cx + 26, cy + 15, { font: 'small', color: '#625565' });
      const price = ITEMS[id].buy ?? 0;
      if (ui.button(`hm_${id}`, cx + 160, cy + 4, 20, 19, '-', { color: 'red', disabled: n <= 0 })) this.order[id] = n - 1;
      ui.text(`${n}`, cx + 191, cy + 8, { color: n ? '#239063' : COLORS.parchmentText, align: 'center' });
      if (ui.button(`hp_${id}`, cx + 202, cy + 4, 20, 19, '+', { color: 'green', disabled: units + ITEMS[id].size > cap || cost + price > g.money })) this.order[id] = n + 1;
      if (ui.button(`ha_${id}`, cx + 224, cy + 4, 20, 19, '', { color: 'blue', icon: 'icon_up', disabled: units + ITEMS[id].size > cap || cost + price > g.money })) {
        const fit = Math.min(Math.floor((cap - units) / ITEMS[id].size), Math.floor((g.money - cost) / Math.max(1, price)));
        this.order[id] = n + Math.max(0, fit);
      }
    });
    const fy = y + h - 40;
    ui.text(`Cargo ${units}/${cap}`, x + 16, fy, { font: 'small', color: COLORS.parchmentText });
    ui.progress(x + 16, fy + 9, 80, 5, units / cap, '#4d9be6');
    ui.text(`Cost: ${fmtMoney(cost)}`, x + 106, fy + 3, { color: cost > g.money ? '#b33831' : '#239063' });
    if (ui.button('hgo', x + 16, fy + 16, 120, 20, 'Order!', { color: 'green', disabled: units === 0 || cost > g.money })) {
      if (g.orderHeli(this.order)) this.panel = null;
    }
    if (ui.button('hclose', x + w - 76, fy + 16, 60, 20, 'Close', { color: 'red' })) this.panel = null;
  }

  private drawPause(ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    ui.modalBackdrop();
    const w = 200, h = 170, x = 220, y = 95;
    ui.panel(x, y, w, h);
    ui.text('Paused', 320, y + 10, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    if (ui.button('resume', x + 30, y + 32, 140, 22, 'Resume', { color: 'green' })) this.panel = null;
    if (ui.button('restart', x + 30, y + 58, 140, 22, 'Restart level', { color: 'orange' })) this.onExit(this.index);
    const m = save.music > 0, s = save.sfx > 0;
    if (ui.button('music', x + 30, y + 84, 68, 22, 'Music', { color: m ? 'blue' : 'gray', icon: m ? 'icon_music' : 'icon_music_off' })) {
      save.music = m ? 0 : 0.5; audio.musicVolume = save.music; persist();
    }
    if (ui.button('sound', x + 102, y + 84, 68, 22, 'Sound', { color: s ? 'blue' : 'gray', icon: s ? 'icon_sound' : 'icon_sound_off' })) {
      save.sfx = s ? 0 : 0.8; audio.sfxVolume = save.sfx; persist();
    }
    if (ui.button('quit', x + 30, y + 110, 140, 22, 'Quit to map', { color: 'red' })) this.onExit();
    void ctx;
  }

  private drawWin(ctx: CanvasRenderingContext2D, dt: number) {
    const { ui } = this.app;
    const g = this.game;
    this.winT += dt;
    ui.modalBackdrop(0.5);
    const w = 280, h = 190, x = 180, y = 80;
    const k = Math.min(1, (this.winT - 1.4) * 4);
    const yy = Math.round(y + (1 - k) * 40);
    ctx.globalAlpha = k;
    ui.panel(x, yy, w, h);
    ui.text('Level Complete!', 320, yy + 10, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    const medal = g.medal();
    const mn = medal === 3 ? 'medal_gold' : medal === 2 ? 'medal_silver' : 'medal_bronze';
    const pulse = 1 + (this.winT < 2.2 ? Math.max(0, 2.2 - this.winT) : 0);
    draw(ctx, mn, 0, 320, yy + 58, { scale: Math.round(2 * pulse) });
    ui.text(medal === 3 ? 'GOLD MEDAL' : medal === 2 ? 'SILVER MEDAL' : 'BRONZE MEDAL', 320, yy + 88, { color: COLORS.parchmentText, align: 'center' });
    ui.text(`Time ${fmtTime(g.wonAt)}${save.best[this.index] ? `   Best ${fmtTime(save.best[this.index])}` : ''}`, 320, yy + 102, { font: 'small', color: '#625565', align: 'center' });
    // stars
    for (let i = 0; i < 3; i++) {
      const got = i < medal;
      const appear = this.winT - 1.8 - i * 0.25;
      if (appear > 0 && appear < dt + 0.001 && got) audio.sfx('star', { rate: 1 + i * 0.12 });
      draw(ctx, got && appear > 0 ? 'icon_star' : 'icon_star_empty', 0, 300 + i * 20, yy + 122, { scale: 1 });
    }
    const st = g.stats;
    ui.text(`Products ${st.produced}   Caught ${st.caught}   Lost animals ${st.lostAnimals}`, 320, yy + 144, { font: 'small', color: '#625565', align: 'center' });
    ui.text(this.starsGained > 0 ? `+${this.starsGained} star${this.starsGained > 1 ? 's' : ''} for upgrades!` : 'No new stars - beat your medal for more!', 320, yy + 133, { font: 'small', color: this.starsGained ? '#239063' : '#625565', align: 'center' });
    ctx.globalAlpha = 1;
    if (k >= 1) {
      if (ui.button('wmap', x + 14, yy + h - 34, 76, 22, 'Map', { color: 'blue', icon: 'icon_home' })) this.onExit();
      if (ui.button('wretry', x + 100, yy + h - 34, 76, 22, 'Replay', { color: 'orange', icon: 'icon_restart' })) this.onExit(this.index);
      const hasNext = this.index + 1 < LEVELS.length;
      if (hasNext && ui.button('wnext', x + 186, yy + h - 34, 80, 22, 'Next', { color: 'green', icon: 'icon_next' })) this.onExit(this.index + 1);
    }
    void drawTL;
  }
}
