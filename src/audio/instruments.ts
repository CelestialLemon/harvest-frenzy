// Tracker instruments: each maps a note (midi, velocity 0..1, duration s) to one or more voices.
// Levels: a single note at vel 1 peaks around 0.5–1.0; the song mix (track vol) balances them.
import { mtof, type Pt, type Voice } from './dsp';

export type InstFn = (midi: number, vel: number, dur: number, seed: number) => Voice[];

/** Attack/decay/sustain/release breakpoints. `gate` = time the key is held. */
export function adsr(a: number, d: number, s: number, gate: number, r: number): Pt[] {
  const g = Math.max(gate, a + d);
  return [[0, 0], [a, 1], [a + d, s], [g, s], [g + r, 0]];
}

/** Percussive envelope: instant-ish attack, held at 1 (shape comes from `decay`), cut at `len`. */
function hit(len: number, a = 0.002): Pt[] {
  return [[0, 0], [a, 1], [Math.max(a, len - 0.03), 1], [len, 0]];
}

const clampLen = (x: number) => Math.min(x, 2.6);

/** Plucked/struck note: rings for `ring` s but damps shortly after note-off if the gate is long. */
function pluckEnv(dur: number, ring: number, rel = 0.08): { amp: Pt[]; len: number } {
  const g = Math.min(Math.max(dur, 0.05), ring);
  const len = clampLen(g + rel);
  return { amp: [[0, 0], [0.002, 1], [g, 1], [len, 0]], len };
}

const nyq = 15000; // keep partials safely below Nyquist at 32 kHz

const DEFS = {
  // ---- leads -----------------------------------------------------------------------------
  /** bright square/pulse lead with delayed vibrato and a soft low-pass (title theme) */
  pulse_lead: (m, v, d) => {
    const f = mtof(m);
    return [{
      wave: 'pulse', duty: 0.25, f: [[0, f * 0.985], [0.025, f]], vib: [0.18, 5.5, 0.18],
      amp: adsr(0.008, 0.14, 0.72, d * 0.92, 0.09), len: d + 0.12,
      lp: [[0, Math.min(6500, f * 7)], [0.2, Math.min(4200, f * 4.5)]], q: 0.8, gain: 0.55 * v,
    }];
  },
  /** bowed "fiddle": nasal pulse, chorus detune, slide-in, singing vibrato (meadow) */
  fiddle: (m, v, d) => {
    const f = mtof(m);
    return [{
      wave: 'pulse', duty: 0.36, detune: 7, f: [[0, f * 0.978], [0.045, f]], vib: [0.22, 5.8, 0.14],
      amp: adsr(0.03, 0.18, 0.78, d * 0.95, 0.11), len: d + 0.14,
      lp: Math.min(4200, f * 4.5), q: 0.9, gain: 0.55 * v,
    }];
  },
  /** soft ocarina/flute: sine + triangle body + breathy chiff */
  flute: (m, v, d) => {
    const f = mtof(m);
    const amp = adsr(0.045, 0.1, 0.85, d * 0.95, 0.14);
    return [
      { wave: 'sine', f, vib: [0.14, 5, 0.22], amp, len: d + 0.15, gain: 0.75 * v },
      { wave: 'tri', f, vib: [0.14, 5, 0.22], amp, len: d + 0.15, gain: 0.22 * v },
      { wave: 'noise', f: 0, bp: Math.min(f * 2, 9000), q: 3, amp: [[0, 0], [0.015, 1], [0.08, 0.25], [d, 0.2], [d + 0.1, 0]], len: d + 0.1, gain: 0.07 * v },
    ];
  },
  /** vibraphone: sine + 4th partial, tremolo motor */
  vibes: (m, v, d) => {
    const f = mtof(m);
    const { amp, len } = pluckEnv(d, 1.6, 0.3);
    return [
      { wave: 'sine', f, amp, len, decay: 1.2, trem: [5, 0.28], gain: 0.8 * v },
      { wave: 'sine', f: Math.min(f * 4, nyq), amp: hit(0.4), len: 0.4, decay: 0.12, gain: 0.14 * v },
    ];
  },
  /** celesta: harmonic bell, gentle */
  celesta: (m, v, d) => {
    const f = mtof(m);
    const { amp, len } = pluckEnv(d, 1.8, 0.25);
    return [
      { wave: 'sine', f, amp, len, decay: 0.95, gain: 0.8 * v },
      { wave: 'sine', f: f * 2, amp: hit(0.8), len: 0.8, decay: 0.3, gain: 0.14 * v },
      { wave: 'sine', f: Math.min(f * 4, nyq), amp: hit(0.3), len: 0.3, decay: 0.07, gain: 0.18 * v },
    ];
  },
  /** glockenspiel: bright inharmonic sparkle */
  glock: (m, v) => {
    const f = mtof(m);
    return [
      { wave: 'sine', f, amp: hit(1.8), len: 1.8, decay: 0.6, gain: 0.7 * v },
      { wave: 'sine', f: Math.min(f * 2.76, nyq), amp: hit(0.6), len: 0.6, decay: 0.16, gain: 0.22 * v },
      { wave: 'sine', f: Math.min(f * 5.4, nyq), amp: hit(0.2), len: 0.2, decay: 0.045, gain: 0.12 * v },
    ];
  },
  /** music box: pure tine with light upper partials */
  musicbox: (m, v) => {
    const f = mtof(m);
    return [
      { wave: 'sine', f, amp: hit(2.2), len: 2.2, decay: 0.9, gain: 0.75 * v },
      { wave: 'sine', f: Math.min(f * 3, nyq), amp: hit(0.5), len: 0.5, decay: 0.2, gain: 0.1 * v },
      { wave: 'sine', f: Math.min(f * 5.04, nyq), amp: hit(0.15), len: 0.15, decay: 0.05, gain: 0.08 * v },
    ];
  },

  // ---- plucks / mallets -------------------------------------------------------------------
  /** banjo-ish twang: narrow pulse, closing low-pass, fast decay */
  banjo: (m, v) => {
    const f = mtof(m);
    return [
      {
        wave: 'pulse', duty: 0.22, f: [[0, f * 1.01], [0.012, f]], amp: hit(0.6), len: 0.6, decay: 0.2,
        lp: [[0, Math.min(8000, f * 11)], [0.18, f * 2.6]], q: 1.3, gain: 0.6 * v,
      },
      { wave: 'saw', f: f * 2, amp: hit(0.12), len: 0.12, decay: 0.04, lp: 6000, gain: 0.12 * v },
    ];
  },
  /** soft harp/guitar pluck */
  pluck: (m, v, d) => {
    const f = mtof(m);
    const { amp, len } = pluckEnv(d, 1.2, 0.1);
    return [
      { wave: 'tri', f, amp, len, decay: 0.45, gain: 0.7 * v },
      { wave: 'saw', f, amp, len, decay: 0.2, lp: [[0, Math.min(7000, f * 6)], [0.2, f * 1.5]], gain: 0.25 * v },
    ];
  },
  /** muted guitar "chuck" for off-beat chords */
  chuck: (m, v) => {
    const f = mtof(m);
    return [{ wave: 'saw', f, amp: [[0, 0], [0.002, 1], [0.06, 0.35], [0.13, 0]], len: 0.13, lp: 1700, q: 0.9, gain: 0.45 * v }];
  },
  /** marimba: sine + 4x partial, pitch-dependent decay */
  marimba: (m, v) => {
    const f = mtof(m);
    const tau = Math.min(0.7, Math.max(0.16, 0.42 * Math.sqrt(262 / f)));
    const len = Math.min(tau * 4.5, 2.2);
    return [
      { wave: 'sine', f, amp: hit(len), len, decay: tau, gain: 0.8 * v },
      { wave: 'sine', f: Math.min(f * 4, nyq), amp: hit(0.2), len: 0.2, decay: 0.035, gain: 0.28 * v },
      { wave: 'sine', f: Math.min(f * 9.9, nyq), amp: hit(0.05), len: 0.05, decay: 0.01, gain: 0.07 * v },
    ];
  },
  /** kalimba: sine tine with inharmonic ping and slight pitch settle */
  kalimba: (m, v) => {
    const f = mtof(m);
    return [
      { wave: 'sine', f: [[0, f * 1.006], [0.02, f]], amp: hit(2.0), len: 2.0, decay: 0.65, gain: 0.75 * v },
      { wave: 'sine', f: Math.min(f * 5.95, nyq), amp: hit(0.25), len: 0.25, decay: 0.05, gain: 0.16 * v },
      { wave: 'sine', f: f * 2, amp: hit(0.8), len: 0.8, decay: 0.22, gain: 0.08 * v },
    ];
  },
  /** electric piano (FM tine) */
  epiano: (m, v, d) => {
    const f = mtof(m);
    const { amp, len } = pluckEnv(d, 2.0, 0.18);
    return [
      { wave: 'fm', f, fm: { ratio: 1, index: [[0, 1.3 * v + 0.3], [0.35, 0.45], [1.5, 0.2]] }, amp, len, decay: 1.3, gain: 0.55 * v },
      { wave: 'sine', f: Math.min(f * 7, nyq), amp: hit(0.08), len: 0.08, decay: 0.02, gain: 0.06 * v },
    ];
  },

  // ---- pads -------------------------------------------------------------------------------
  /** warm detuned-saw pad */
  pad: (m, v, d) => {
    const f = mtof(m);
    return [{
      wave: 'saw', detune: 9, f, vib: [0.06, 4.2, 0.3], amp: adsr(0.35, 0.4, 0.75, d, 0.7), len: clampLen(d + 0.75),
      lp: Math.min(3000, 800 + f * 1.4), q: 0.6, gain: 0.35 * v,
    }];
  },
  /** very soft triangle pad (map / arctic strings) */
  pad_soft: (m, v, d) => {
    const f = mtof(m);
    return [
      { wave: 'tri', detune: 8, f, vib: [0.08, 4.5, 0.35], amp: adsr(0.5, 0.3, 0.8, d, 0.9), len: clampLen(d + 0.95), gain: 0.45 * v },
      { wave: 'saw', f: f * 1.003, amp: adsr(0.6, 0.3, 0.8, d, 0.9), len: clampLen(d + 0.95), lp: Math.min(2200, f * 3), q: 0.5, gain: 0.12 * v },
    ];
  },

  // ---- basses -----------------------------------------------------------------------------
  /** triangle bass with a little filtered pulse on top so it reads on small speakers */
  bass: (m, v, d) => {
    const f = mtof(m);
    const amp = adsr(0.004, 0.12, 0.8, d * 0.9, 0.05);
    return [
      { wave: 'tri', f, amp, len: d + 0.06, gain: 0.85 * v },
      { wave: 'pulse', duty: 0.5, f, amp, len: d + 0.06, lp: 380 + f, q: 0.7, gain: 0.25 * v },
    ];
  },
  /** plucked upright-ish bass (country / bossa) */
  bass_pluck: (m, v, d) => {
    const f = mtof(m);
    const g = Math.min(Math.max(d * 0.92, 0.08), 1.4);
    const amp: Pt[] = [[0, 0], [0.004, 1], [g, 1], [g + 0.06, 0]];
    return [
      { wave: 'tri', f, amp, len: g + 0.06, decay: 0.7, gain: 0.85 * v },
      { wave: 'sine', f: f * 2, amp, len: g + 0.06, decay: 0.12, gain: 0.25 * v },
      { wave: 'pulse', duty: 0.5, f, amp, len: g + 0.06, decay: 0.25, lp: f * 3, gain: 0.14 * v },
    ];
  },
  /** round sine bass (map / arctic) */
  bass_sine: (m, v, d) => {
    const f = mtof(m);
    const amp = adsr(0.012, 0.2, 0.8, d * 0.95, 0.14);
    return [
      { wave: 'sine', f, amp, len: d + 0.15, gain: 0.85 * v },
      { wave: 'sine', f: f * 2, amp, len: d + 0.15, gain: 0.2 * v },
      { wave: 'tri', f, amp, len: d + 0.15, gain: 0.2 * v },
    ];
  },

  // ---- drums (midi ignored) -----------------------------------------------------------------
  kick: (_m, v) => [
    { wave: 'sine', f: [[0, 160], [0.04, 72], [0.3, 45]], amp: hit(0.3), len: 0.3, decay: 0.12, gain: v },
    { wave: 'noise', f: 0, lp: 3000, amp: [[0, 0], [0.001, 1], [0.012, 0]], len: 0.014, gain: 0.22 * v },
  ],
  kick_soft: (_m, v) => [
    { wave: 'sine', f: [[0, 120], [0.05, 58], [0.25, 45]], amp: hit(0.26), len: 0.26, decay: 0.1, gain: 0.85 * v },
  ],
  snare: (_m, v) => [
    { wave: 'noise', f: 0, bp: [[0, 2300], [0.15, 1600]], q: 0.7, amp: hit(0.18, 0.001), len: 0.18, decay: 0.055, gain: 0.7 * v },
    { wave: 'tri', f: [[0, 205], [0.05, 172]], amp: hit(0.1, 0.001), len: 0.1, decay: 0.04, gain: 0.45 * v },
  ],
  rim: (_m, v) => [
    { wave: 'sine', f: 820, amp: hit(0.05, 0.0005), len: 0.05, decay: 0.016, gain: 0.6 * v },
    { wave: 'noise', f: 0, hp: 2200, amp: hit(0.02, 0.0005), len: 0.02, decay: 0.006, gain: 0.35 * v },
  ],
  clave: (_m, v) => [
    { wave: 'sine', f: 2450, amp: hit(0.08, 0.0005), len: 0.08, decay: 0.028, gain: 0.5 * v },
  ],
  woodblock: (_m, v) => [
    { wave: 'sine', f: [[0, 1050], [0.02, 950]], amp: hit(0.07, 0.0005), len: 0.07, decay: 0.022, gain: 0.55 * v },
    { wave: 'sine', f: 1900, amp: hit(0.03, 0.0005), len: 0.03, decay: 0.01, gain: 0.2 * v },
  ],
  hat: (_m, v) => [
    { wave: 'noise', f: 0, hp: 7500, amp: hit(0.05, 0.0005), len: 0.05, decay: 0.014, gain: 0.5 * v },
  ],
  ohat: (_m, v) => [
    { wave: 'noise', f: 0, hp: 6500, amp: hit(0.35, 0.001), len: 0.35, decay: 0.11, gain: 0.38 * v },
  ],
  shaker: (_m, v) => [
    { wave: 'noise', f: 0, bp: 7000, q: 0.8, amp: [[0, 0], [0.018, 1], [0.07, 0]], len: 0.07, gain: 0.5 * v },
  ],
  brush: (_m, v) => [
    { wave: 'noise', f: 0, bp: [[0, 2500], [0.14, 4200]], q: 0.6, amp: [[0, 0], [0.02, 1], [0.16, 0]], len: 0.16, gain: 0.45 * v },
  ],
  conga_hi: (_m, v) => [
    { wave: 'sine', f: [[0, 470], [0.03, 385]], amp: hit(0.35), len: 0.35, decay: 0.09, gain: 0.8 * v },
    { wave: 'noise', f: 0, bp: 2200, q: 1.2, amp: hit(0.02, 0.0005), len: 0.02, decay: 0.005, gain: 0.25 * v },
  ],
  conga_lo: (_m, v) => [
    { wave: 'sine', f: [[0, 300], [0.04, 228]], amp: hit(0.45), len: 0.45, decay: 0.14, gain: 0.9 * v },
    { wave: 'noise', f: 0, bp: 1500, q: 1.2, amp: hit(0.02, 0.0005), len: 0.02, decay: 0.005, gain: 0.18 * v },
  ],
  cowbell: (_m, v) => [
    { wave: 'pulse', f: 562, amp: hit(0.3, 0.001), len: 0.3, decay: 0.07, lp: 2600, hp: 450, gain: 0.3 * v },
    { wave: 'pulse', f: 845, amp: hit(0.3, 0.001), len: 0.3, decay: 0.07, lp: 2600, hp: 450, gain: 0.3 * v },
  ],
  jingle: (_m, v) => [
    { wave: 'noise', f: 0, hp: 5500, trem: [26, 0.7], amp: hit(0.3, 0.003), len: 0.3, decay: 0.09, gain: 0.45 * v },
    { wave: 'sine', f: 5230, amp: hit(0.25), len: 0.25, decay: 0.08, gain: 0.07 * v },
    { wave: 'sine', f: 6870, amp: hit(0.2), len: 0.2, decay: 0.06, gain: 0.06 * v },
  ],
  triangle: (_m, v) => [
    { wave: 'sine', f: 4700, amp: hit(1.2), len: 1.2, decay: 0.45, gain: 0.22 * v },
    { wave: 'sine', f: 6950, amp: hit(0.6), len: 0.6, decay: 0.2, gain: 0.08 * v },
  ],
  tom: (_m, v) => [
    { wave: 'sine', f: [[0, 190], [0.12, 128]], amp: hit(0.4), len: 0.4, decay: 0.16, gain: 0.85 * v },
  ],
  crash: (_m, v) => [
    { wave: 'noise', f: 0, hp: 4500, amp: hit(1.6, 0.002), len: 1.6, decay: 0.45, gain: 0.3 * v },
    { wave: 'noise', f: 0, bp: 8000, q: 0.8, amp: hit(0.8, 0.002), len: 0.8, decay: 0.2, gain: 0.15 * v },
  ],
} satisfies Record<string, InstFn>;

export type InstName = keyof typeof DEFS;
export const INSTRUMENTS: Record<InstName, InstFn> = DEFS;
