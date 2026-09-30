// Title, world map and upgrade shop scenes.
import { audio } from '../audio';
import { MAP_NODES } from '../art/scenes';
import { drawBackdrop, fillView } from '../engine/display';
import { animFrame, draw, drawBC, drawTL, sprite } from '../engine/sprites';
import { COLORS, fmtTime } from '../engine/ui';
import { REGIONS, UPGRADES, type UpgradeId } from '../game/data';
import { LEVELS } from '../game/levelList';
import { defaultSave, persist, save, totalStarsEarned, unlockedUpTo } from '../game/save';
import { drawGoalIcon, goalLabel, LevelScene } from './level';
import type { App, Scene } from './scene';

// ------------------------------------------------------------------------------------------ helpers
export function startLevel(app: App, index: number) {
  const back = () => app.go(new MapScene(app, index));
  const onExit = (next?: number) => (next === undefined ? back() : startLevel(app, next));
  app.go(new LevelScene(app, index, onExit));
}

function starCounter(app: App, x: number, y: number) {
  const { ui, ctx } = app;
  drawTL(ctx, 'ui_panel_dark', 0, -100, -100); // warm cache
  ui.panel(x, y, 74, 22, true);
  draw(ctx, 'icon_star', 0, x + 13, y + 11);
  ui.text(`${save.stars}`, x + 24, y + 7, { color: '#f9c22b', outline: '#2e222f' });
}

// ------------------------------------------------------------------------------------------ title
export class TitleScene implements Scene {
  t = 0;
  confirmReset = false;
  constructor(private app: App) {}
  enter() { audio.music('title'); }

  frame(dt: number, ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    this.t += dt;
    drawBackdrop(ctx, sprite('title_bg').frames[0]);
    // drifting clouds are part of the bg; add a few hopping chickens for life
    for (let i = 0; i < 3; i++) {
      const x = ((this.t * (10 + i * 4) + i * 230) % 760) - 60;
      drawBC(ctx, 'chicken_walk', animFrame('chicken_walk', this.t + i, 8), x, 322 + i * 9);
    }
    const logo = sprite('logo');
    const lf = Math.floor(this.t * 1.5) % 4 === 0 ? 1 : 0;
    drawTL(ctx, 'logo', lf, Math.round(320 - logo.w / 2), 36 + Math.round(Math.sin(this.t * 2) * 2));

    const hasProgress = save.medals.some((m) => m > 0);
    if (ui.button('play', 250, 196, 140, 28, hasProgress ? 'Continue' : 'Play', { color: 'green', font: 'big' })) this.app.go(new MapScene(this.app));
    if (ui.button('shop', 250, 230, 140, 22, 'Upgrades', { color: 'orange', icon: 'icon_star' })) this.app.go(new ShopScene(this.app, new TitleScene(this.app)));
    const m = save.music > 0, s = save.sfx > 0;
    if (ui.iconButton('tmusic', 598, 334, m ? 'icon_music' : 'icon_music_off')) { save.music = m ? 0 : 0.5; audio.musicVolume = save.music; persist(); }
    if (ui.iconButton('tsound', 574, 334, s ? 'icon_sound' : 'icon_sound_off')) { save.sfx = s ? 0 : 0.8; audio.sfxVolume = save.sfx; persist(); }
    if (hasProgress) {
      if (!this.confirmReset) {
        if (ui.button('reset', 8, 336, 70, 18, 'Reset', { color: 'gray', font: 'small' })) this.confirmReset = true;
      } else {
        ui.text('Erase all progress?', 8, 324, { font: 'small', color: '#ffffff', outline: '#2e222f' });
        if (ui.button('resety', 8, 336, 40, 18, 'Yes', { color: 'red', font: 'small' })) {
          Object.assign(save, defaultSave(), { music: save.music, sfx: save.sfx });
          persist();
          this.confirmReset = false;
        }
        if (ui.button('resetn', 52, 336, 40, 18, 'No', { color: 'green', font: 'small' })) this.confirmReset = false;
      }
    }
    ui.text('Inspired by Farm Frenzy 3', 320, 348, { font: 'small', color: '#ffffff', outline: '#2e222f', align: 'center' });
  }
}

// ------------------------------------------------------------------------------------------ map
export class MapScene implements Scene {
  t = 0;
  selected = -1;
  constructor(private app: App, private focus = -1) {}
  enter() { audio.music('map'); }

  frame(dt: number, ctx: CanvasRenderingContext2D) {
    const { ui, input } = this.app;
    this.t += dt;
    drawBackdrop(ctx, sprite('map_bg').frames[0]);
    const unlocked = unlockedUpTo();
    // path dots between nodes
    for (let i = 0; i + 1 < MAP_NODES.length; i++) {
      const a = MAP_NODES[i], b = MAP_NODES[i + 1];
      if (i + 1 > unlocked) continue;
      const steps = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 6);
      for (let s = 1; s < steps; s++) {
        const x = Math.round(a.x + ((b.x - a.x) * s) / steps), y = Math.round(a.y + ((b.y - a.y) * s) / steps);
        ctx.fillStyle = '#fbff86';
        ctx.fillRect(x, y, 2, 2);
      }
    }
    let hoverIdx = -1;
    MAP_NODES.forEach((n, i) => {
      if (i >= LEVELS.length) return;
      const locked = i > unlocked;
      const medal = save.medals[i] ?? 0;
      const frame = locked ? 0 : medal > 0 ? 2 : 1;
      const over = !locked && input.over(n.x - 10, n.y - 10, 20, 20);
      if (over) hoverIdx = i;
      const bob = i === unlocked ? Math.round(Math.sin(this.t * 4) * 1.5) : 0;
      draw(ctx, 'map_node', frame, n.x, n.y + bob, {});
      if (over) {
        ctx.globalCompositeOperation = 'lighter';
        draw(ctx, 'map_node', frame, n.x, n.y + bob, { alpha: 0.35 });
        ctx.globalCompositeOperation = 'source-over';
      }
      if (!locked) ui.text(`${i + 1}`, n.x, n.y - 3 + bob, { font: 'small', color: '#ffffff', outline: '#2e222f', align: 'center' });
      if (medal) draw(ctx, medal === 3 ? 'medal_gold' : medal === 2 ? 'medal_silver' : 'medal_bronze', 0, n.x + 9, n.y + 8, {});
      if (i === unlocked) drawBC(ctx, 'arrow_hint', animFrame('arrow_hint', this.t, 4), n.x, n.y - 12 + Math.round(Math.sin(this.t * 6) * 2));
      if (over && this.selected < 0 && input.pressed && !input.consumed && !ui.isBlocked(input.x, input.y)) {
        input.consumed = true;
        audio.sfx('click');
        this.selected = i;
      }
    });
    if (hoverIdx >= 0 && this.selected < 0) {
      const n = MAP_NODES[hoverIdx];
      const lv = LEVELS[hoverIdx];
      ui.tooltip([`Level ${lv.id} - ${REGIONS[lv.region].name}`, ...lv.goals.map(goalLabel)], n.x, n.y - 14);
    }
    ui.hoverId = hoverIdx >= 0 ? `node${hoverIdx}` : ui.hoverId;

    // header
    ui.panel(4, 4, 250, 24, true);
    ui.text('Farm Map', 14, 9, { font: 'big', color: '#f9c22b', outline: '#2e222f' });
    ui.text(`${totalStarsEarned()}/${LEVELS.length * 3} stars earned`, 96, 12, { font: 'small', color: '#c7dcd0' });
    starCounter(this.app, 480, 5);
    if (ui.button('mshop', 558, 5, 78, 22, 'Shop', { color: 'orange', icon: 'icon_star' })) this.app.go(new ShopScene(this.app, new MapScene(this.app)));
    if (ui.iconButton('mhome', 4, 334, 'icon_home')) this.app.go(new TitleScene(this.app));

    if (this.selected >= 0) this.drawLevelCard(ctx);
    void this.focus;
  }

  private drawLevelCard(ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    const i = this.selected;
    const lv = LEVELS[i];
    ui.modalBackdrop(0.45);
    const w = 260, h = 88 + lv.goals.length * 20;
    const x = 190, y = Math.round(180 - h / 2);
    ui.panel(x, y, w, h);
    ui.text(`Level ${lv.id}`, 320, y + 10, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    ui.text(REGIONS[lv.region].name, 320, y + 26, { font: 'small', color: '#625565', align: 'center' });
    let cy = y + 36;
    for (const g of lv.goals) {
      drawGoalIcon(ctx, g, x + 26, cy + 8);
      ui.text(goalLabel(g), x + 40, cy + 4, { color: COLORS.parchmentText });
      cy += 20;
    }
    const medal = save.medals[i] ?? 0;
    const best = save.best[i];
    ui.text(`Gold ${fmtTime(lv.gold)}  Silver ${fmtTime(lv.silver)}${best ? `  Best ${fmtTime(best)}` : ''}`, x + 14, cy + 2, { font: 'small', color: '#625565' });
    if (medal) draw(ctx, medal === 3 ? 'medal_gold' : medal === 2 ? 'medal_silver' : 'medal_bronze', 0, x + w - 22, y + 18);
    if (ui.button('lplay', x + w - 94, y + h - 32, 80, 22, 'Play', { color: 'green', icon: 'icon_play' }) || this.app.input.key('Enter')) {
      startLevel(this.app, i);
    }
    if (ui.button('lback', x + 14, y + h - 32, 70, 22, 'Back', { color: 'red' }) || this.app.input.key('Escape')) this.selected = -1;
  }
}

// ------------------------------------------------------------------------------------------ shop
const UPGRADE_ICONS: Record<UpgradeId, string> = { well: 'well', warehouse: 'warehouse', truck: 'truck', heli: 'helicopter', cage: 'cage' };

export class ShopScene implements Scene {
  t = 0;
  constructor(private app: App, private back: Scene) {}
  enter() { audio.music('shop'); }

  frame(dt: number, ctx: CanvasRenderingContext2D) {
    const { ui } = this.app;
    this.t += dt;
    drawBackdrop(ctx, sprite('title_bg').frames[0]);
    fillView(ctx, 'rgba(20,12,24,0.35)');
    ui.panel(40, 14, 560, 332);
    ui.text('Upgrade Shop', 320, 24, { font: 'big', color: '#f9c22b', outline: '#2e222f', align: 'center' });
    ui.text('Spend stars earned from medals on permanent farm upgrades.', 320, 40, { font: 'small', color: '#625565', align: 'center' });
    starCounter(this.app, 510, 20);
    const ids = Object.keys(UPGRADES) as UpgradeId[];
    ids.forEach((id, i) => {
      const def = UPGRADES[id];
      const lvl = save.upgrades[id];
      const y = 54 + i * 52;
      ui.panel(56, y, 528, 48, false);
      // icon: scaled-down building
      const s = sprite(UPGRADE_ICONS[id]);
      const sc = Math.min(1, 40 / s.w, 36 / s.h) >= 1 ? 1 : 0.5;
      drawTL(ctx, UPGRADE_ICONS[id], 0, Math.round(88 - (s.w * sc) / 2), Math.round(y + 24 - (s.h * sc) / 2), { scale: sc });
      ui.text(def.name, 120, y + 8, { font: 'big', color: COLORS.parchmentText });
      ui.text(`Now: ${def.levels[lvl]}`, 120, y + 22, { font: 'small', color: '#625565' });
      if (lvl < def.costs.length) ui.text(`Next: ${def.levels[lvl + 1]}`, 120, y + 31, { font: 'small', color: '#239063' });
      else ui.text('Fully upgraded!', 120, y + 31, { font: 'small', color: '#239063' });
      for (let k = 0; k < def.levels.length; k++) draw(ctx, k <= lvl ? 'icon_star' : 'icon_star_empty', 0, 380 + k * 14, y + 24);
      if (lvl < def.costs.length) {
        const cost = def.costs[lvl];
        if (ui.button(`up_${id}`, 460, y + 12, 110, 24, `Buy ${cost}`, { color: 'green', icon: 'icon_star', disabled: save.stars < cost })) {
          save.stars -= cost;
          save.upgrades[id] = lvl + 1;
          persist();
          audio.sfx('upgrade');
        }
      }
    });
    if (ui.button('sback', 56, 318, 90, 22, 'Back', { color: 'red', icon: 'icon_back' }) || this.app.input.key('Escape')) this.app.go(this.back);
  }
}
