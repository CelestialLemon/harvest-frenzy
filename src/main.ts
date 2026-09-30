import './style.css';
import { audio } from './audio';
import { createDisplay } from './engine/display';
import { Input } from './engine/input';
import { draw, preloadAll } from './engine/sprites';
import { UI } from './engine/ui';
import { save } from './game/save';
import { MapScene, startLevel, TitleScene } from './scenes/menus';
import { SceneManager, type App } from './scenes/scene';

const root = document.getElementById('app')!;
const { canvas, ctx } = createDisplay(root);
const input = new Input(canvas);
const ui = new UI(ctx, input);
const scenes = new SceneManager();

audio.musicVolume = save.music;
audio.sfxVolume = save.sfx;
input.onFirstGesture = () => audio.unlock();

const app: App = { ctx, input, ui, time: 0, go: (s) => scenes.go(s) };
(window as unknown as { app: App; scenes: SceneManager }).app = app;
(window as unknown as { scenes: SceneManager; audio: typeof audio }).scenes = scenes;
(window as unknown as { audio: typeof audio }).audio = audio;

preloadAll();
const params = new URLSearchParams(location.search);
if (params.has('level')) startLevel(app, Math.max(0, +params.get('level')! - 1));
else if (params.has('map')) scenes.go(new MapScene(app));
else scenes.go(new TitleScene(app));

let touch = false;
canvas.addEventListener('pointerdown', (e) => { touch = e.pointerType !== 'mouse'; });

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  app.time += dt;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1a1220';
  ctx.fillRect(0, 0, 640, 360);
  ui.beginFrame();
  scenes.frame(dt, ctx, input);
  if (!touch && input.inside) draw(ctx, 'cursor', input.down ? 1 : 0, input.x, input.y);
  input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// pause audio when the tab is hidden
document.addEventListener('visibilitychange', () => {
  const lv = (scenes.current as { panel?: unknown } | null);
  if (document.hidden && lv && 'panel' in lv && lv.panel === null) (lv as { panel: string }).panel = 'pause';
});
