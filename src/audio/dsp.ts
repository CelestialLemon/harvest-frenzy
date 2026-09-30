// Pure-JS DSP core shared by SFX and music rendering.
// No WebAudio dependency: everything renders into Float32Arrays, so the exact same code runs in the
// browser (main thread or worker) and in Node (tools/audio_check.ts).

export type Pt = readonly [number, number];
/** A constant, or breakpoints [time (s), value] (held flat outside the given range). */
export type Curve = number | readonly Pt[];

export type Wave = 'sine' | 'tri' | 'saw' | 'pulse' | 'noise' | 'fm';

export interface Formant { f: Curve; q: number; g: number }

/** One synthesized "voice": oscillator → (formant bank | SVF lp/bp) → SVF hp → envelope. */
export interface Voice {
  /** start offset in seconds (used when a sound is made of several voices) */
  t?: number;
  /** rendered length in seconds */
  len: number;
  wave: Wave;
  /** frequency in Hz (breakpoints interpolated exponentially). For 'noise': sample&hold rate, 0 = white. */
  f: Curve;
  /** amplitude envelope (linear breakpoints) */
  amp: Curve;
  gain?: number;
  /** additional exponential decay time-constant (s) multiplied onto `amp` */
  decay?: number;
  /** pulse width (0..1) for 'pulse' */
  duty?: number;
  /** cents: adds a second, detuned oscillator (chorus) */
  detune?: number;
  /** vibrato [depth in semitones, rate Hz, delay s] (fades in over 0.25s after delay) */
  vib?: readonly [number, number, number?];
  /** random pitch wobble [rate Hz, depth semitones] (growls, creaks, animal voices) */
  jitter?: readonly [number, number];
  /** amplitude modulation [rate Hz, depth 0..1] */
  trem?: readonly [number, number];
  /** FM (wave 'fm'): modulator = carrier * ratio, index = modulation depth (radians) */
  fm?: { ratio: number; index: Curve };
  /** state-variable low-pass cutoff (Hz) */
  lp?: Curve;
  /** state-variable band-pass centre (Hz) — ignored if lp is set */
  bp?: Curve;
  /** resonance of lp/bp (default 0.707) */
  q?: number;
  /** state-variable high-pass cutoff (Hz) */
  hp?: Curve;
  /** parallel band-pass formant bank (applied instead of lp/bp) */
  formants?: readonly Formant[];
  seed?: number;
}

export const TAU = Math.PI * 2;

export function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sequential reader for a Curve (time must be non-decreasing between calls). */
class CurveReader {
  private readonly pts: readonly Pt[] | null;
  private readonly c: number;
  private readonly log: boolean;
  private i = 0;
  constructor(curve: Curve, log = false) {
    if (typeof curve === 'number') {
      this.pts = null;
      this.c = curve;
    } else {
      this.pts = curve.length ? curve : null;
      this.c = curve.length ? curve[0][1] : 0;
    }
    this.log = log;
  }
  at(t: number): number {
    const p = this.pts;
    if (p === null) return this.c;
    const last = p.length - 1;
    while (this.i < last && t >= p[this.i + 1][0]) this.i++;
    if (this.i >= last) return p[last][1];
    if (t <= p[0][0]) return p[0][1];
    const a = p[this.i];
    const b = p[this.i + 1];
    const span = b[0] - a[0];
    const u = span > 0 ? (t - a[0]) / span : 1;
    if (this.log && a[1] > 0 && b[1] > 0) return a[1] * Math.pow(b[1] / a[1], u);
    return a[1] + (b[1] - a[1]) * u;
  }
}

/** Topology-preserving-transform state variable filter (Zavalishin). */
class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private k = 1.414;
  set(fc: number, q: number, sr: number): void {
    const f = Math.min(Math.max(fc, 10), sr * 0.45);
    const g = Math.tan((Math.PI * f) / sr);
    this.k = 1 / Math.max(q, 0.05);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  /** mode 0 = lp, 1 = bp, 2 = hp */
  run(x: number, mode: number): number {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    if (mode === 0) return v2;
    if (mode === 1) return v1;
    return x - this.k * v1 - v2;
  }
}

function blep(t: number, dt: number): number {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

function osc(wave: Wave, ph: number, dt: number, duty: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(TAU * ph);
    case 'tri':
      return 4 * Math.abs(ph - 0.5) - 1;
    case 'saw':
      return 2 * ph - 1 - blep(ph, dt);
    case 'pulse': {
      let s = ph < duty ? 1 : -1;
      s += blep(ph, dt);
      let p2 = ph - duty;
      if (p2 < 0) p2 += 1;
      s -= blep(p2, dt);
      return s;
    }
    default:
      return 0;
  }
}

const CR = 16; // control-rate interval in samples

/**
 * Render a voice additively into `out` starting at sample `offset`.
 * Returns the number of samples written.
 */
export function synth(v: Voice, sr: number, out: Float32Array, offset = 0, gain = 1): number {
  const total = Math.round(v.len * sr);
  const n = Math.min(total, out.length - offset);
  if (n <= 0 || offset < 0) return 0;
  const g0 = (v.gain ?? 1) * gain;
  if (g0 === 0) return 0;

  const inv = 1 / sr;
  const fR = new CurveReader(v.f, true);
  const aR = new CurveReader(v.amp);
  const lpR = v.lp !== undefined ? new CurveReader(v.lp, true) : null;
  const bpR = !lpR && v.bp !== undefined ? new CurveReader(v.bp, true) : null;
  const hpR = v.hp !== undefined ? new CurveReader(v.hp, true) : null;
  const ixR = v.fm ? new CurveReader(v.fm.index) : null;
  const fms = v.formants ?? null;
  const fmR = fms ? fms.map((fm) => new CurveReader(fm.f, true)) : null;
  const fmF = fms ? fms.map(() => new Svf()) : null;
  const q = v.q ?? 0.707;
  const svf = lpR || bpR ? new Svf() : null;
  const svfMode = lpR ? 0 : 1;
  const hpf = hpR ? new Svf() : null;
  const rand = rng(v.seed ?? 0x5eed);
  const wave = v.wave;
  const duty = v.duty ?? 0.5;
  const detRatio = v.detune ? Math.pow(2, v.detune / 1200) : 0;
  const ratio = v.fm ? v.fm.ratio : 0;
  const decMul = v.decay ? Math.exp(-1 / (v.decay * sr)) : 1;
  const vib = v.vib;
  const jit = v.jitter;
  const trem = v.trem;

  let ph = 0;
  let ph2 = 0.37;
  let mph = 0;
  let inc = 0;
  let inc2 = 0;
  let index = 0;
  let hold = 0;
  let tremV = 1;
  let dec = 1;
  let jitCur = 0;
  let jitTarget = 0;
  let jitPh = 1;
  const fadeIn = Math.min(16, n);
  const fadeOut = Math.min(64, n);

  for (let i = 0; i < n; i++) {
    if (i % CR === 0) {
      const t = i * inv;
      let f = fR.at(t);
      if (vib) {
        const vt = t - (vib[2] ?? 0);
        if (vt > 0) f *= Math.pow(2, (vib[0] * Math.sin(TAU * vib[1] * vt) * Math.min(1, vt / 0.25)) / 12);
      }
      if (jit) {
        jitPh += (jit[0] * CR) / sr;
        if (jitPh >= 1) {
          jitPh -= 1;
          jitTarget = (rand() * 2 - 1) * jit[1];
        }
        jitCur += (jitTarget - jitCur) * 0.35;
        f *= Math.pow(2, jitCur / 12);
      }
      inc = f * inv;
      inc2 = inc * detRatio;
      if (ixR) index = ixR.at(t);
      if (svf) svf.set((lpR ?? bpR)!.at(t), q, sr);
      if (hpf) hpf.set(hpR!.at(t), 0.707, sr);
      if (fmR && fmF && fms) for (let k = 0; k < fmR.length; k++) fmF[k].set(fmR[k].at(t), fms[k].q, sr);
      if (trem) tremV = 1 - trem[1] * (0.5 - 0.5 * Math.cos(TAU * trem[0] * t));
    }

    let s: number;
    if (wave === 'noise') {
      if (inc <= 0) s = rand() * 2 - 1;
      else {
        ph += inc;
        if (ph >= 1 || i === 0) {
          ph -= Math.floor(ph);
          hold = rand() * 2 - 1;
        }
        s = hold;
      }
    } else if (wave === 'fm') {
      s = Math.sin(TAU * ph + index * Math.sin(TAU * mph));
      mph += inc * ratio;
      if (mph >= 1) mph -= Math.floor(mph);
      ph += inc;
      if (ph >= 1) ph -= 1;
      if (detRatio) {
        s = 0.5 * (s + Math.sin(TAU * ph2 + index * Math.sin(TAU * mph)));
        ph2 += inc2;
        if (ph2 >= 1) ph2 -= 1;
      }
    } else {
      s = osc(wave, ph, inc, duty);
      ph += inc;
      if (ph >= 1) ph -= 1;
      if (detRatio) {
        s = 0.5 * (s + osc(wave, ph2, inc2, duty));
        ph2 += inc2;
        if (ph2 >= 1) ph2 -= 1;
      }
    }

    if (fmF && fms) {
      let y = 0;
      for (let k = 0; k < fmF.length; k++) y += fmF[k].run(s, 1) * fms[k].g;
      s = y;
    } else if (svf) s = svf.run(s, svfMode);
    if (hpf) s = hpf.run(s, 2);

    let a = aR.at(i * inv) * dec * tremV;
    dec *= decMul;
    if (i < fadeIn) a *= i / fadeIn;
    if (i >= n - fadeOut) a *= (n - i) / fadeOut;
    out[offset + i] += s * a * g0;
  }
  return n;
}

/** Render a list of voices (each with its own `t` offset) into a new mono buffer. */
export function renderVoices(voices: readonly Voice[], sr: number, len?: number): Float32Array {
  let end = len ?? 0;
  if (len === undefined) for (const v of voices) end = Math.max(end, (v.t ?? 0) + v.len);
  const out = new Float32Array(Math.ceil(end * sr) + 1);
  voices.forEach((v, i) => synth(v.seed === undefined ? { ...v, seed: 7919 * (i + 1) } : v, sr, out, Math.round((v.t ?? 0) * sr)));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Buffer utilities & effects

export function peakOf(...chans: Float32Array[]): number {
  let p = 0;
  for (const c of chans) for (let i = 0; i < c.length; i++) {
    const a = Math.abs(c[i]);
    if (a > p) p = a;
  }
  return p;
}

export function rmsOf(chans: Float32Array[], from = 0, to?: number): number {
  let s = 0;
  let n = 0;
  for (const c of chans) {
    const end = to ?? c.length;
    for (let i = from; i < end; i++) s += c[i] * c[i];
    n += Math.max(0, end - from);
  }
  return n ? Math.sqrt(s / n) : 0;
}

export function scale(chans: Float32Array[], g: number): void {
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= g;
}

/** Normalize so the absolute peak equals `target` (linear). */
export function normalizePeak(chans: Float32Array[], target: number): number {
  const p = peakOf(...chans);
  if (p > 0) scale(chans, target / p);
  return p;
}

/** Soft-knee limiter: samples above `knee` are smoothly compressed so they never exceed `ceil`. */
export function softLimit(chans: Float32Array[], knee: number, ceil: number): number {
  const range = ceil - knee;
  let touched = 0;
  for (const c of chans) for (let i = 0; i < c.length; i++) {
    const x = c[i];
    const a = Math.abs(x);
    if (a > knee) {
      c[i] = Math.sign(x) * (knee + range * Math.tanh((a - knee) / range));
      touched++;
    }
  }
  return touched;
}

/** One-pole DC blocker / gentle high-pass. */
export function dcBlock(c: Float32Array, sr: number, fc = 25): void {
  const r = Math.exp((-TAU * fc) / sr);
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < c.length; i++) {
    const x = c[i];
    const y = x - x1 + r * y1;
    x1 = x;
    y1 = y;
    c[i] = y;
  }
}

/**
 * Small Freeverb-style stereo reverb: mono send in → added to L/R.
 * size 0..1 (room size), damp 0..1 (high-frequency damping), wet = output gain.
 */
export function reverb(send: Float32Array, L: Float32Array, R: Float32Array, sr: number, size: number, damp: number, wet: number): void {
  const k = sr / 44100;
  const combL = [1116, 1277, 1422, 1557].map((d) => Math.round(d * k));
  const combR = [1188, 1356, 1491, 1617].map((d) => Math.round(d * k));
  const apL = [556, 441].map((d) => Math.round(d * k));
  const apR = [579, 464].map((d) => Math.round(d * k));
  const fb = 0.7 + 0.26 * size;
  const d1 = damp * 0.4;
  const d2 = 1 - d1;
  const inG = 0.12;
  const run = (combs: number[], aps: number[], out: Float32Array) => {
    const cb = combs.map((d) => new Float32Array(d));
    const ci = combs.map(() => 0);
    const cs = combs.map(() => 0);
    const ab = aps.map((d) => new Float32Array(d));
    const ai = aps.map(() => 0);
    for (let i = 0; i < send.length; i++) {
      const x = send[i] * inG;
      let y = 0;
      for (let c = 0; c < cb.length; c++) {
        const buf = cb[c];
        const o = buf[ci[c]];
        cs[c] = o * d2 + cs[c] * d1;
        buf[ci[c]] = x + cs[c] * fb;
        if (++ci[c] >= buf.length) ci[c] = 0;
        y += o;
      }
      for (let a = 0; a < ab.length; a++) {
        const buf = ab[a];
        const bo = buf[ai[a]];
        const o = -y + bo;
        buf[ai[a]] = y + bo * 0.5;
        if (++ai[a] >= buf.length) ai[a] = 0;
        y = o;
      }
      out[i] += y * wet;
    }
  };
  run(combL, apL, L);
  run(combR, apR, R);
}

/** Ping-pong feedback delay with darkening repeats: mono send in → added to L/R. */
export function echo(send: Float32Array, L: Float32Array, R: Float32Array, sr: number, time: number, fb: number, wet: number): void {
  const d = Math.max(1, Math.round(time * sr));
  const bl = new Float32Array(d);
  const br = new Float32Array(d);
  let idx = 0;
  let lpL = 0;
  let lpR = 0;
  const c = 0.55; // one-pole lowpass coefficient in the feedback path
  for (let i = 0; i < send.length; i++) {
    const dl = bl[idx];
    const dr = br[idx];
    lpL += (dr - lpL) * c;
    lpR += (dl - lpR) * c;
    bl[idx] = send[i] + lpL * fb;
    br[idx] = lpR * fb;
    if (++idx >= d) idx = 0;
    L[i] += dl * wet;
    R[i] += dr * wet;
  }
}
