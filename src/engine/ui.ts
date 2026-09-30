// Immediate-mode UI widgets drawn with the pixel UI kit.
import { audio } from '../audio';
import { drawText, measureText, lineHeight, wrapText, type FontName, type TextOpts } from '../art/font';
import { fillView, view } from './display';
import { draw, drawNine, has } from './sprites';
import type { Input } from './input';

export type BtnColor = 'green' | 'orange' | 'red' | 'blue' | 'gray';

export const COLORS = {
  ink: '#2e222f',
  parchmentText: '#3e3546',
  white: '#ffffff',
  gold: '#f9c22b',
  red: '#e83b3b',
  green: '#1ebc73',
  dim: '#7f708a',
  cream: '#fdcbb0',
};

export function fmtMoney(n: number) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function fmtTime(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export class UI {
  hoverId = '';
  private lastHover = '';
  constructor(public ctx: CanvasRenderingContext2D, public input: Input) {}

  private blocks: [number, number, number, number][] = [];

  beginFrame() {
    this.lastHover = this.hoverId;
    this.hoverId = '';
    this.blocks = [];
  }

  /** True when (x,y) is covered by UI drawn this frame (world clicks there are ignored). */
  isBlocked(x: number, y: number) {
    return this.blocks.some(([bx, by, bw, bh]) => x >= bx && y >= by && x < bx + bw && y < by + bh);
  }

  text(t: string, x: number, y: number, o?: TextOpts) { drawText(this.ctx, t, x, y, o); }
  measure(t: string, f?: FontName) { return measureText(t, f); }
  lh(f?: FontName) { return lineHeight(f); }
  wrap(t: string, w: number, f?: FontName) { return wrapText(t, w, f); }

  /** Marks the area as UI so clicks there don't reach the world (checked via isBlocked). */
  block(x: number, y: number, w: number, h: number) {
    this.blocks.push([x, y, w, h]);
  }

  panel(x: number, y: number, w: number, h: number, dark = false) {
    drawNine(this.ctx, dark ? 'ui_panel_dark' : 'ui_panel', 0, x, y, w, h, [8, 8, 8, 8]);
    this.block(x, y, w, h);
  }

  /** Full-screen dim + block (for modals). */
  modalBackdrop(alpha = 0.55) {
    fillView(this.ctx, `rgba(20,12,24,${alpha})`);
    this.block(-view.ox, -view.oy, view.w, view.h);
  }

  /** Returns true when clicked. */
  button(id: string, x: number, y: number, w: number, h: number, label: string, o: { color?: BtnColor; disabled?: boolean; font?: FontName; icon?: string; sfx?: boolean } = {}): boolean {
    const inp = this.input;
    const disabled = !!o.disabled;
    const color: BtnColor = disabled ? 'gray' : o.color ?? 'green';
    const over = inp.over(x, y, w, h);
    if (over) this.hoverId = id;
    const pressed = over && inp.down && !disabled;
    const frame = pressed ? 2 : over && !disabled ? 1 : 0;
    const name = `ui_btn_${color}`;
    if (has(name)) drawNine(this.ctx, name, frame, x, y, w, h, [5, 5, 5, 7]);
    else { this.ctx.fillStyle = '#1ebc73'; this.ctx.fillRect(x, y, w, h); }
    const dy = pressed ? 1 : 0;
    const font = o.font ?? 'normal';
    const lhh = lineHeight(font);
    const textW = measureText(label, font);
    const iconW = o.icon ? 13 : 0;
    const total = textW + iconW + (o.icon && label ? 2 : 0);
    let cx = Math.round(x + (w - total) / 2);
    const cy = Math.round(y + (h - 2 - lhh) / 2) + dy + 1;
    if (o.icon) { draw(this.ctx, o.icon, 0, cx + 6, Math.round(y + (h - 2) / 2) + dy); cx += iconW + 2; }
    if (label) drawText(this.ctx, label, cx, cy, { font, color: disabled ? '#c7dcd0' : '#ffffff', outline: disabled ? '#625565' : '#2e222f' });
    if (over && inp.pressed && !inp.consumed) {
      inp.consumed = true;
      if (disabled) { audio.sfx('error', { vol: 0.5 }); return false; }
      if (o.sfx !== false) audio.sfx('click');
      return true;
    }
    return false;
  }

  /** Round icon button (20x20). */
  iconButton(id: string, x: number, y: number, icon: string, o: { disabled?: boolean } = {}): boolean {
    const inp = this.input;
    const over = inp.over(x, y, 20, 20);
    if (over) this.hoverId = id;
    const pressed = over && inp.down;
    draw(this.ctx, 'ui_btn_round', pressed ? 2 : over ? 1 : 0, x, y);
    draw(this.ctx, icon, 0, x + 10, y + 10 + (pressed ? 1 : 0), { alpha: o.disabled ? 0.5 : 1 });
    if (over && inp.pressed && !inp.consumed) {
      inp.consumed = true;
      audio.sfx('click');
      return !o.disabled;
    }
    return false;
  }

  /** Invisible hit area. */
  hit(x: number, y: number, w: number, h: number) {
    if (this.input.clickedIn(x, y, w, h)) { this.input.consumed = true; return true; }
    return false;
  }

  progress(x: number, y: number, w: number, h: number, t: number, fill = '#1ebc73', back = '#3e3546') {
    const c = this.ctx;
    c.fillStyle = '#2e222f';
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = back;
    c.fillRect(x, y, w, h);
    const fw = Math.round(w * Math.max(0, Math.min(1, t)));
    if (fw > 0) {
      c.fillStyle = fill;
      c.fillRect(x, y, fw, h);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(x, y, fw, 1);
    }
  }

  /** Speech-bubble tooltip anchored above (x,y) (clamped to screen). */
  tooltip(lines: string[], x: number, y: number, o: { font?: FontName; icons?: (string | null)[]; below?: boolean } = {}) {
    const font = o.font ?? 'normal';
    const lhh = lineHeight(font);
    const w = Math.max(...lines.map((l, i) => measureText(l, font) + (o.icons?.[i] ? 14 : 0))) + 12;
    const h = lines.length * lhh + 9;
    let bx = Math.round(x - w / 2);
    bx = Math.max(2, Math.min(638 - w, bx));
    let by = o.below ? y + 8 : y - h - 6;
    by = Math.max(22, Math.min(318 - h, by));
    drawNine(this.ctx, 'bubble', 0, bx, by, w, h, [5, 5, 5, 5]);
    lines.forEach((l, i) => {
      let tx = bx + 6;
      const icon = o.icons?.[i];
      if (icon) { draw(this.ctx, icon, 0, tx + 6, by + 5 + i * lhh + lhh / 2 - 1, { scale: 0.75 }); tx += 14; }
      drawText(this.ctx, l, tx, by + 5 + i * lhh, { font, color: COLORS.parchmentText });
    });
  }

  playHover() {
    if (this.hoverId && this.hoverId !== this.lastHover) audio.sfx('hover', { vol: 0.35 });
  }
}
