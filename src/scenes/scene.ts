// Scene manager with fade transitions.
import type { Input } from '../engine/input';
import type { UI } from '../engine/ui';

export interface Scene {
  enter?(): void;
  leave?(): void;
  /** Update + draw + handle UI in one pass. */
  frame(dt: number, ctx: CanvasRenderingContext2D): void;
}

export interface App {
  ctx: CanvasRenderingContext2D;
  input: Input;
  ui: UI;
  go(scene: Scene): void;
  time: number;
}

export class SceneManager {
  current: Scene | null = null;
  private next: Scene | null = null;
  private fade = 0; // 0..1 overlay alpha
  private dir: 0 | 1 | -1 = 0;

  go(scene: Scene) {
    if (!this.current) {
      this.current = scene;
      scene.enter?.();
      this.fade = 1;
      this.dir = -1;
      return;
    }
    this.next = scene;
    this.dir = 1;
  }

  get transitioning() { return this.dir !== 0; }

  frame(dt: number, ctx: CanvasRenderingContext2D, input: Input) {
    if (this.dir === 1) {
      this.fade += dt * 5;
      if (this.fade >= 1) {
        this.fade = 1;
        this.current?.leave?.();
        this.current = this.next;
        this.next = null;
        this.current?.enter?.();
        this.dir = -1;
      }
    } else if (this.dir === -1) {
      this.fade -= dt * 4;
      if (this.fade <= 0) { this.fade = 0; this.dir = 0; }
    }
    if (this.transitioning) input.consumed = true; // no clicks during fades
    this.current?.frame(dt, ctx);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(20,12,24,${this.fade})`;
      ctx.fillRect(0, 0, 640, 360);
    }
  }
}
