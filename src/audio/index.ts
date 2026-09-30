// Harvest Frenzy audio — all sound synthesized in code (see docs/DESIGN.md §5, Agent D).
//
//   audio.unlock()                 call on the first user gesture (also auto-hooked on pointerdown/keydown)
//   audio.sfx(name, { vol, rate }) fire-and-forget sound effect (no-op before unlock)
//   audio.music(track | null)      crossfade to a looping track (request is remembered before unlock)
//   audio.musicVolume / sfxVolume  0..1, applied immediately
//   audio.prefetch(track)          optional: start rendering a track early (e.g. while a level loads)
//
// Implementation: SFX are pre-rendered lazily into AudioBuffers (sfx.ts, cached; all warmed up in the
// background after unlock). Music is sequenced from pattern data (songs/*.ts) and rendered to a seamless
// stereo loop in a Web Worker (render.worker.ts; falls back to time-sliced main-thread rendering).
import { SFX, SFX_NAMES, SFX_SR, renderSfx } from './sfx';
import { SONGS } from './songs';
import { renderSong } from './sequencer';
import type { RenderRequest, RenderResponse } from './render.worker';

export type SfxName = 'click' | 'hover' | 'buy' | 'coin' | 'cash' | 'collect' | 'plant' | 'no_water' | 'well_refill'
  | 'drop_animal' | 'chicken' | 'sheep' | 'ostrich' | 'cow' | 'product_pop' | 'workshop_start' | 'workshop_done'
  | 'build' | 'upgrade' | 'error' | 'predator_land' | 'bear_roar' | 'lion_roar' | 'polar_roar' | 'hit' | 'cage'
  | 'cage_break' | 'animal_die' | 'truck_go' | 'truck_back' | 'heli' | 'delivery' | 'goal' | 'win' | 'medal'
  | 'star' | 'full' | 'bark' | 'meow' | 'page' | 'pause' | 'expire' | 'tick';
export type MusicTrack = 'title' | 'map' | 'meadow' | 'savanna' | 'arctic' | 'shop';

/** Music bus trim: rendered songs are loudness-normalized; this keeps them sitting below the SFX. */
const MUSIC_TRIM = 0.7;
const MASTER_GAIN = 1.2;
const XFADE = 1.0;
const MAX_CACHED_TRACKS = 3;

interface RawTrack { sr: number; L: Float32Array; R: Float32Array; loopStart: number; loopEnd: number }
interface TrackBuf { buf: AudioBuffer; loopStart: number; loopEnd: number }
interface Playing { track: MusicTrack; src: AudioBufferSourceNode; gain: GainNode }
interface Voice { src: AudioBufferSourceNode; gain: GainNode }

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

function rampTo(p: AudioParam, v: number, now: number, dur: number): void {
  const cur = p.value;
  p.cancelScheduledValues(now);
  p.setValueAtTime(cur, now);
  p.linearRampToValueAtTime(v, now + dur);
}

class AudioSystem {
  private ctx: AudioContext | null = null;
  private failed = false;
  private unlocked = false;
  private pausedByVisibility = false;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicVol = 0.5;
  private sfxVol = 0.8;

  private sfxBufs = new Map<SfxName, AudioBuffer>();
  private sfxVoices = new Map<SfxName, Voice[]>();
  private sfxLast = new Map<SfxName, number>();

  private want: MusicTrack | null = null;
  private cur: Playing | null = null;
  private bufs = new Map<MusicTrack, TrackBuf>();
  private raw = new Map<MusicTrack, Promise<RawTrack>>();

  private worker: Worker | null | undefined;
  private reqId = 0;
  private waiters = new Map<number, { resolve: (r: RawTrack) => void; reject: (e: unknown) => void }>();

  // ---- volumes ----------------------------------------------------------------------------------
  get musicVolume(): number { return this.musicVol; }
  set musicVolume(v: number) {
    this.musicVol = clamp01(v);
    if (this.ctx && this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVol * MUSIC_TRIM, this.ctx.currentTime, 0.02);
  }
  get sfxVolume(): number { return this.sfxVol; }
  set sfxVolume(v: number) {
    this.sfxVol = clamp01(v);
    if (this.ctx && this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.02);
  }

  // ---- context ----------------------------------------------------------------------------------
  unlock(): void {
    if (this.failed || typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) { this.failed = true; return; }
      try {
        this.ctx = new Ctor({ latencyHint: 'interactive' });
      } catch {
        this.failed = true;
        return;
      }
      this.buildGraph(this.ctx);
      document.addEventListener('visibilitychange', () => this.onVisibility());
    }
    const ctx = this.ctx;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      // iOS/Safari: starting a (silent) buffer inside the gesture fully unlocks output
      try {
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, 22050);
        s.connect(ctx.destination);
        s.start();
      } catch { /* ignore */ }
      this.applyMusic();
      this.warmSfx();
    }
  }

  private buildGraph(ctx: AudioContext): void {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 10;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(comp);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol * MUSIC_TRIM;
    this.musicBus.connect(this.master);
  }

  private onVisibility(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') {
        this.pausedByVisibility = true;
        ctx.suspend().catch(() => {});
      }
    } else if (this.pausedByVisibility) {
      this.pausedByVisibility = false;
      ctx.resume().catch(() => {});
    }
  }

  // ---- sfx --------------------------------------------------------------------------------------
  sfx(name: SfxName, opts?: { vol?: number; rate?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.unlocked || !this.sfxBus || ctx.state === 'closed' || document.hidden) return;
    const def = SFX[name];
    if (!def || this.sfxVol <= 0) return;
    const vol = opts?.vol ?? 1;
    if (!(vol > 0)) return;
    const now = ctx.currentTime;
    const last = this.sfxLast.get(name);
    if (last !== undefined && now - last < (def.gap ?? 0.03)) return;
    const buf = this.sfxBuffer(name);
    if (!buf) return;
    this.sfxLast.set(name, now);

    let list = this.sfxVoices.get(name);
    if (!list) this.sfxVoices.set(name, (list = []));
    const max = def.max ?? 4;
    while (list.length >= max) {
      const old = list.shift()!;
      old.gain.gain.setTargetAtTime(0, now, 0.012);
      try { old.src.stop(now + 0.08); } catch { /* already stopped */ }
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const j = def.jitter ?? 0;
    const rate = (opts?.rate ?? 1) * (1 + (Math.random() * 2 - 1) * j);
    src.playbackRate.value = Math.min(4, Math.max(0.25, Number.isFinite(rate) ? rate : 1));
    const g = ctx.createGain();
    g.gain.value = Math.min(2, vol) * def.gain;
    src.connect(g).connect(this.sfxBus);
    const voice: Voice = { src, gain: g };
    const l = list;
    l.push(voice);
    src.onended = () => {
      const i = l.indexOf(voice);
      if (i >= 0) l.splice(i, 1);
      g.disconnect();
    };
    src.start(now);
  }

  private sfxBuffer(name: SfxName): AudioBuffer | null {
    const have = this.sfxBufs.get(name);
    if (have) return have;
    if (!this.ctx) return null;
    try {
      const data = renderSfx(name, SFX_SR);
      const b = this.ctx.createBuffer(1, data.length, SFX_SR);
      b.getChannelData(0).set(data);
      this.sfxBufs.set(name, b);
      return b;
    } catch {
      return null;
    }
  }

  /** Pre-render all effects in small idle slices so the first play of each is instant. */
  private warmSfx(): void {
    const todo = SFX_NAMES.filter((n) => !this.sfxBufs.has(n));
    const step = () => {
      const t = performance.now();
      while (todo.length && performance.now() - t < 4) this.sfxBuffer(todo.shift()!);
      if (todo.length) setTimeout(step, 30);
    };
    setTimeout(step, 50);
  }

  // ---- music ------------------------------------------------------------------------------------
  music(track: MusicTrack | null): void {
    if (track !== null && !(track in SONGS)) return;
    if (track === this.want) return;
    this.want = track;
    if (track) this.loadRaw(track).catch(() => {}); // start rendering right away, even before unlock
    if (this.unlocked) this.applyMusic();
  }

  prefetch(track: MusicTrack): void {
    if (track in SONGS && !this.bufs.has(track)) this.loadRaw(track).catch(() => {});
  }

  get currentTrack(): MusicTrack | null { return this.want; }
  get isUnlocked(): boolean { return this.unlocked; }

  private applyMusic(): void {
    const want = this.want;
    if ((this.cur?.track ?? null) === want) return;
    if (want === null) {
      this.fadeOutCurrent();
      return;
    }
    this.loadBuffer(want).then(
      (tb) => {
        if (this.want === want && (this.cur?.track ?? null) !== want) this.startTrack(want, tb);
      },
      () => { /* rendering failed: stay silent rather than throwing */ },
    );
  }

  private startTrack(track: MusicTrack, tb: TrackBuf): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = tb.buf;
    src.loop = true;
    src.loopStart = tb.loopStart;
    src.loopEnd = tb.loopEnd;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(1, now + (this.cur ? XFADE : 0.5));
    src.connect(g).connect(this.musicBus);
    src.start(now + 0.01);
    this.fadeOutCurrent();
    this.cur = { track, src, gain: g };
  }

  private fadeOutCurrent(): void {
    const c = this.cur;
    const ctx = this.ctx;
    this.cur = null;
    if (!c || !ctx) return;
    const now = ctx.currentTime;
    rampTo(c.gain.gain, 0, now, XFADE);
    try { c.src.stop(now + XFADE + 0.05); } catch { /* ignore */ }
    c.src.onended = () => c.gain.disconnect();
  }

  private loadBuffer(track: MusicTrack): Promise<TrackBuf> {
    const have = this.bufs.get(track);
    if (have) {
      this.bufs.delete(track); // LRU touch
      this.bufs.set(track, have);
      return Promise.resolve(have);
    }
    return this.loadRaw(track).then((r) => {
      const existing = this.bufs.get(track);
      if (existing) return existing;
      const ctx = this.ctx;
      if (!ctx) throw new Error('no audio context');
      const buf = ctx.createBuffer(2, r.L.length, r.sr);
      buf.getChannelData(0).set(r.L);
      buf.getChannelData(1).set(r.R);
      const tb: TrackBuf = { buf, loopStart: r.loopStart, loopEnd: r.loopEnd };
      this.raw.delete(track); // raw samples no longer needed
      this.bufs.set(track, tb);
      this.evict();
      return tb;
    });
  }

  private evict(): void {
    for (const k of this.bufs.keys()) {
      if (this.bufs.size <= MAX_CACHED_TRACKS) break;
      if (k !== this.want && k !== this.cur?.track) this.bufs.delete(k);
    }
  }

  private loadRaw(track: MusicTrack): Promise<RawTrack> {
    let p = this.raw.get(track);
    if (!p) {
      p = this.renderViaWorker(track).catch(() => this.renderOnMainThread(track));
      p.catch(() => this.raw.delete(track));
      this.raw.set(track, p);
    }
    return p;
  }

  private getWorker(): Worker | null {
    if (this.worker !== undefined) return this.worker;
    try {
      const w = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (ev: MessageEvent<RenderResponse>) => {
        const m = ev.data;
        const wt = this.waiters.get(m.id);
        if (!wt) return;
        this.waiters.delete(m.id);
        if (m.ok) wt.resolve(m);
        else wt.reject(new Error(m.error));
      };
      w.onerror = (e) => {
        e.preventDefault();
        this.worker = null;
        w.terminate();
        for (const wt of this.waiters.values()) wt.reject(new Error('audio worker failed'));
        this.waiters.clear();
      };
      this.worker = w;
    } catch {
      this.worker = null;
    }
    return this.worker;
  }

  private renderViaWorker(track: MusicTrack): Promise<RawTrack> {
    const w = typeof Worker !== 'undefined' ? this.getWorker() : null;
    if (!w) return Promise.reject(new Error('no worker'));
    return new Promise<RawTrack>((resolve, reject) => {
      const id = ++this.reqId;
      this.waiters.set(id, { resolve, reject });
      const req: RenderRequest = { id, track };
      w.postMessage(req);
    });
  }

  /** Fallback: render in ~6 ms slices so the game keeps running smoothly. */
  private renderOnMainThread(track: MusicTrack): Promise<RawTrack> {
    return new Promise<RawTrack>((resolve, reject) => {
      const gen = renderSong(SONGS[track]);
      const step = () => {
        const end = performance.now() + 6;
        try {
          for (;;) {
            const r = gen.next();
            if (r.done) {
              resolve(r.value);
              return;
            }
            if (performance.now() > end) break;
          }
        } catch (e) {
          reject(e);
          return;
        }
        setTimeout(step, 0);
      };
      setTimeout(step, 0);
    });
  }
}

const sys = new AudioSystem();

export const audio = {
  get musicVolume(): number { return sys.musicVolume; },
  set musicVolume(v: number) { sys.musicVolume = v; },
  get sfxVolume(): number { return sys.sfxVolume; },
  set sfxVolume(v: number) { sys.sfxVolume = v; },
  /** Create/resume the AudioContext. Call from a user gesture (pointerdown / keydown). Idempotent. */
  unlock(): void { sys.unlock(); },
  /** Play a sound effect. `vol` multiplies the effect's mix level, `rate` is a pitch/speed multiplier. */
  sfx(name: SfxName, opts?: { vol?: number; rate?: number }): void { sys.sfx(name, opts); },
  /** Crossfade to a looping track, or fade out with null. Safe to call before unlock (starts once unlocked). */
  music(track: MusicTrack | null): void { sys.music(track); },
  /** Start rendering a track ahead of time (optional). */
  prefetch(track: MusicTrack): void { sys.prefetch(track); },
  /** The most recently requested track. */
  get currentTrack(): MusicTrack | null { return sys.currentTrack; },
  /** False until the first user gesture: browsers keep audio silent until then. */
  get unlocked(): boolean { return sys.isUnlocked; },
};

// Safety net: unlock on the first gesture even if the engine forgets (also recovers iOS interruptions).
if (typeof window !== 'undefined') {
  const h = () => audio.unlock();
  for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(ev, h, { capture: true, passive: true });
}
