// The canvas covers the whole window. Scenes are authored for a 640x360 frame that is scaled to fit (fractional scale)
// and centered; the context is translated so (0,0) is the frame's top-left, and the margins around it (negative
// coordinates / beyond 640x360) are filled by scenes: backgrounds via drawBackdrop, overlays via fillView.
export const VW = 640;
export const VH = 360;

/** Visible canvas size (w, h) in frame pixels and where the 640x360 frame sits inside it (ox, oy). */
export const view = { w: VW, h: VH, ox: 0, oy: 0 };

export function createDisplay(parent: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const fit = () => {
    const ww = window.innerWidth, wh = window.innerHeight;
    const s = Math.min(ww / VW, wh / VH);
    view.w = Math.max(VW, Math.ceil(ww / s - 1e-6));
    view.h = Math.max(VH, Math.ceil(wh / s - 1e-6));
    view.ox = Math.floor((view.w - VW) / 2);
    view.oy = Math.floor((view.h - VH) / 2);
    canvas.width = view.w;
    canvas.height = view.h;
    canvas.style.width = `${view.w * s}px`;
    canvas.style.height = `${view.h * s}px`;
  };
  window.addEventListener('resize', fit);
  fit();
  return { canvas, ctx };
}

/** Fills the whole visible canvas (frame + margins). */
export function fillView(ctx: CanvasRenderingContext2D, style: string) {
  ctx.fillStyle = style;
  ctx.fillRect(-view.ox, -view.oy, view.w, view.h);
}

/** Draws a 640x360 background at the frame, reflected across each edge so it continues seamlessly into the margins. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, img: CanvasImageSource) {
  const mx = view.ox > 0 ? 1 : 0, my = view.oy > 0 ? 1 : 0;
  for (let j = -my; j <= my; j++) for (let i = -mx; i <= mx; i++) {
    ctx.save();
    // a reflection about x=0 (left) or x=VW (right) is scale(-1) about 0 or 2*VW; same for y
    ctx.translate(i > 0 ? 2 * VW : 0, j > 0 ? 2 * VH : 0);
    ctx.scale(i ? -1 : 1, j ? -1 : 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}
