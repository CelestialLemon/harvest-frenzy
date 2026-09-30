// Pointer + keyboard input in internal (640x360 frame) coordinates; the margins map outside 0..640 / 0..360. Edge flags are cleared each frame by endFrame().
import { view } from './display';

export class Input {
  x = -100;
  y = -100;
  down = false;
  pressed = false; // went down this frame
  released = false; // went up this frame
  pressX = 0;
  pressY = 0;
  consumed = false; // a UI element used this frame's click
  inside = false;
  keys = new Set<string>();
  keysPressed = new Set<string>();
  onFirstGesture: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.x = Math.floor(((e.clientX - r.left) / r.width) * view.w) - view.ox;
      this.y = Math.floor(((e.clientY - r.top) / r.height) * view.h) - view.oy;
    };
    canvas.addEventListener('pointermove', (e) => { toLocal(e); this.inside = true; });
    canvas.addEventListener('pointerenter', () => { this.inside = true; });
    canvas.addEventListener('pointerleave', () => { this.inside = false; });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      toLocal(e);
      this.inside = true;
      this.down = true;
      this.pressed = true;
      this.pressX = this.x;
      this.pressY = this.y;
      canvas.setPointerCapture(e.pointerId);
      this.gesture();
    });
    const up = (e: PointerEvent) => {
      if (!this.down) return;
      toLocal(e);
      this.down = false;
      this.released = true;
      if (e.pointerType !== 'mouse') this.inside = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.key)) this.keysPressed.add(e.key);
      this.keys.add(e.key);
      this.gesture();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    window.addEventListener('blur', () => { this.keys.clear(); this.down = false; });
  }

  private gesture() {
    if (this.onFirstGesture) {
      const f = this.onFirstGesture;
      this.onFirstGesture = null;
      f();
    }
  }

  /** A click that started and ended inside the rect this frame. */
  clickedIn(x: number, y: number, w: number, h: number) {
    return this.pressed && !this.consumed && this.x >= x && this.y >= y && this.x < x + w && this.y < y + h;
  }

  over(x: number, y: number, w: number, h: number) {
    return this.inside && this.x >= x && this.y >= y && this.x < x + w && this.y < y + h;
  }

  key(k: string) { return this.keysPressed.has(k); }

  endFrame() {
    this.pressed = false;
    this.released = false;
    this.consumed = false;
    this.keysPressed.clear();
  }
}
