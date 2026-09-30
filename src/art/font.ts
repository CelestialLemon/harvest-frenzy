// STUB — to be replaced by the art agent (bitmap fonts). See docs/DESIGN.md §5 (Agent C).
export type FontName = 'small' | 'normal' | 'big';
export interface TextOpts { font?: FontName; color?: string; outline?: string | null; shadow?: string | null; align?: 'left' | 'center' | 'right'; }
const SIZE: Record<FontName, number> = { small: 6, normal: 8, big: 12 };
export function lineHeight(font: FontName = 'normal') { return SIZE[font] + 2; }
let mctx: CanvasRenderingContext2D | null = null;
export function measureText(text: string, font: FontName = 'normal'): number {
  mctx ??= document.createElement('canvas').getContext('2d')!;
  mctx.font = `${SIZE[font]}px monospace`;
  return Math.ceil(mctx.measureText(text).width);
}
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TextOpts = {}) {
  const font = o.font ?? 'normal';
  ctx.font = `${SIZE[font]}px monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = o.align ?? 'left';
  if (o.outline) { ctx.fillStyle = o.outline; for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) ctx.fillText(text, x + dx, y + dy); }
  ctx.fillStyle = o.color ?? '#fff';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}
export function wrapText(text: string, maxWidth: number, font: FontName = 'normal'): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (measureText(t, font) > maxWidth && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
