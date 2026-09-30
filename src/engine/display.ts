// Fixed 640x360 canvas scaled with CSS (integer scale when it fits well, otherwise fractional).
export const VW = 640;
export const VH = 360;

export function createDisplay(parent: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = VW;
  canvas.height = VH;
  canvas.id = 'game';
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = false;

  const fit = () => {
    const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    const si = Math.floor(s);
    const scale = si >= 1 && si / s >= 0.84 ? si : s;
    canvas.style.width = `${Math.floor(VW * scale)}px`;
    canvas.style.height = `${Math.floor(VH * scale)}px`;
  };
  window.addEventListener('resize', fit);
  fit();
  return { canvas, ctx };
}
