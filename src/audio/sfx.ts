// Sound effects: each is a list of synthesized voices rendered once into a mono buffer,
// peak-normalized to -3 dBFS, then played back at `gain` (the per-effect mix level).
import type { SfxName } from './index';
import { mtof, renderVoices, normalizePeak, type Pt, type Voice } from './dsp';

export const SFX_SR = 44100;
export const SFX_PEAK = 0.708; // -3 dBFS

export interface SfxDef {
  /** mix level (0..1) applied at playback */
  gain: number;
  /** random playback-rate variation (± fraction) so repeats don't sound robotic */
  jitter?: number;
  /** max simultaneous voices of this effect (default 4) */
  max?: number;
  /** min seconds between two triggers of this effect (default 0.03) */
  gap?: number;
  voices: () => Voice[];
}

// ---------------------------------------------------------------------------------------------
// helpers

/** percussive: attack a, then flat (shape via `decay`) and cut at len */
const hit = (len: number, a = 0.002): Pt[] => [[0, 0], [a, 1], [Math.max(a, len - 0.02), 1], [len, 0]];
/** simple attack / hold / release */
const ahr = (a: number, h: number, r: number, s = 1): Pt[] => [[0, 0], [a, s], [a + h, s], [a + h + r, 0]];

/** FM bell */
const bell = (t: number, f: number, gain: number, tau = 0.45, ratio = 2, idx = 1.2): Voice => ({
  t, wave: 'fm', f, fm: { ratio, index: [[0, idx], [0.35, idx * 0.1]] }, amp: hit(Math.min(2.5, tau * 5)), len: Math.min(2.5, tau * 5), decay: tau, gain,
});

/** soft sine blip */
const blip = (t: number, f0: number, f1: number, len: number, gain: number): Voice => ({
  t, wave: 'sine', f: [[0, f0], [len * 0.6, f1]], amp: [[0, 0], [0.002, 1], [len, 0]], len, gain,
});

/** short filtered noise burst */
const noiseHit = (t: number, len: number, gain: number, filt: Partial<Voice>): Voice => ({
  t, wave: 'noise', f: 0, amp: hit(len, 0.0008), len, decay: len / 3, gain, ...filt,
});

/** mellow "brass" note for the fanfare */
const brass = (t: number, m: number, dur: number, gain: number): Voice => {
  const f = mtof(m);
  return {
    t, wave: 'saw', detune: 6, f: [[0, f * 0.985], [0.03, f]], vib: [0.15, 5.5, 0.25],
    amp: [[0, 0], [0.02, 1], [0.12, 0.8], [dur, 0.75], [dur + 0.12, 0]], len: dur + 0.12,
    lp: [[0, f * 1.5], [0.05, Math.min(6000, f * 6)], [dur, f * 3.2]], q: 0.8, gain,
  };
};

/** cartoon vocal syllable: source → formant bank */
const syl = (t: number, len: number, f: Voice['f'], f1: Voice['f'], f2: Voice['f'], gain: number, extra: Partial<Voice> = {}): Voice => ({
  t, wave: 'pulse', duty: 0.3, f, len, gain,
  amp: [[0, 0], [Math.min(0.01, len * 0.1), 1], [len * 0.6, 0.75], [len, 0]],
  formants: [{ f: f1, q: 5, g: 1 }, { f: f2, q: 7, g: 0.6 }, { f: 3000, q: 8, g: 0.18 }],
  ...extra,
});

// ---------------------------------------------------------------------------------------------

export const SFX: Record<SfxName, SfxDef> = {
  // ---- UI -------------------------------------------------------------------------------------
  click: {
    gain: 0.32, gap: 0.02,
    voices: () => [
      blip(0, 1900, 1300, 0.035, 1),
      noiseHit(0, 0.008, 0.35, { hp: 3000 }),
    ],
  },
  hover: {
    gain: 0.12, gap: 0.06, max: 2,
    voices: () => [blip(0, 2600, 2400, 0.022, 1)],
  },
  page: {
    gain: 0.3, gap: 0.05,
    voices: () => [
      { wave: 'noise', f: 0, bp: [[0, 1800], [0.15, 4500]], q: 0.8, amp: [[0, 0], [0.06, 1], [0.18, 0]], len: 0.19 },
      { wave: 'noise', f: 0, hp: 5000, amp: [[0, 0], [0.1, 0.5], [0.2, 0]], len: 0.2, gain: 0.3 },
    ],
  },
  pause: {
    gain: 0.3,
    voices: () => [blip(0, 988, 988, 0.07, 1), blip(0.075, 740, 740, 0.1, 0.9)],
  },
  tick: {
    gain: 0.28, gap: 0.05,
    voices: () => [
      noiseHit(0, 0.015, 1, { bp: 3500, q: 3 }),
      { wave: 'sine', f: 2200, amp: hit(0.02, 0.0005), len: 0.02, decay: 0.006, gain: 0.4 },
    ],
  },
  error: {
    gain: 0.28, gap: 0.12, max: 2,
    voices: () => [
      { wave: 'pulse', detune: 12, f: 262, amp: ahr(0.008, 0.07, 0.02), len: 0.1, lp: 900, gain: 0.8 },
      { wave: 'pulse', detune: 12, f: [[0, 208], [0.16, 196]], t: 0.1, amp: ahr(0.008, 0.12, 0.05), len: 0.18, lp: 800, gain: 0.8 },
      { wave: 'tri', f: 104, t: 0.1, amp: ahr(0.008, 0.12, 0.05), len: 0.18, gain: 0.4 },
    ],
  },
  full: {
    gain: 0.26, gap: 0.2, max: 1,
    voices: () => [
      { wave: 'pulse', f: 180, amp: ahr(0.008, 0.08, 0.02), len: 0.1, lp: 700, gain: 1 },
      { wave: 'pulse', f: 160, t: 0.13, amp: ahr(0.008, 0.08, 0.03), len: 0.11, lp: 650, gain: 0.9 },
    ],
  },

  // ---- economy --------------------------------------------------------------------------------
  coin: {
    gain: 0.4, jitter: 0.02,
    voices: () => [
      { wave: 'pulse', f: 988, amp: ahr(0.002, 0.05, 0.01), len: 0.065, lp: 6000, gain: 0.7 },
      { wave: 'pulse', f: 1319, t: 0.065, amp: hit(0.4), len: 0.4, decay: 0.12, lp: 6000, gain: 0.7 },
    ],
  },
  buy: {
    gain: 0.45,
    voices: () => [
      bell(0, 784, 0.6, 0.35), bell(0.05, 1047, 0.6, 0.35), bell(0.1, 1319, 0.6, 0.4), bell(0.15, 1568, 0.7, 0.5),
      { wave: 'noise', f: 0, hp: 7000, t: 0.15, amp: [[0, 0], [0.05, 1], [0.4, 0]], len: 0.4, trem: [30, 0.6], gain: 0.06 },
    ],
  },
  cash: {
    gain: 0.55,
    voices: () => [
      noiseHit(0, 0.03, 0.8, { bp: 1800, q: 2 }),
      { wave: 'sine', f: 3200, amp: hit(0.02, 0.0005), len: 0.02, decay: 0.006, gain: 0.3 },
      { wave: 'sine', t: 0.05, f: [[0, 180], [0.05, 90]], amp: hit(0.08), len: 0.08, decay: 0.03, gain: 0.7 },
      noiseHit(0.05, 0.04, 0.3, { lp: 800 }),
      { t: 0.09, wave: 'fm', f: 2093, fm: { ratio: 1.41, index: [[0, 2.5], [0.5, 0.4]] }, amp: hit(1.0), len: 1.0, decay: 0.3, gain: 0.45 },
      { t: 0.09, wave: 'fm', f: 2637, fm: { ratio: 1.41, index: [[0, 2], [0.5, 0.3]] }, amp: hit(0.9), len: 0.9, decay: 0.28, gain: 0.3 },
      blip(0.18, 3600, 3500, 0.06, 0.14), blip(0.26, 4200, 4100, 0.05, 0.12), blip(0.33, 3900, 3850, 0.05, 0.1),
      blip(0.41, 4500, 4400, 0.05, 0.08),
    ],
  },
  delivery: {
    gain: 0.5,
    voices: () => [bell(0, 784, 0.7, 0.45), bell(0.12, 1047, 0.7, 0.45), bell(0.24, 1319, 0.8, 0.6)],
  },

  // ---- farm actions -----------------------------------------------------------------------------
  collect: {
    gain: 0.42, jitter: 0.07, max: 4, gap: 0.025,
    voices: () => [
      { wave: 'sine', f: [[0, 520], [0.035, 1180], [0.12, 1250]], amp: hit(0.15, 0.003), len: 0.15, decay: 0.06 },
      { wave: 'tri', f: [[0, 1040], [0.035, 2360]], amp: hit(0.06, 0.003), len: 0.06, decay: 0.02, gain: 0.25 },
    ],
  },
  product_pop: {
    gain: 0.3, jitter: 0.08, max: 4,
    voices: () => [
      { wave: 'sine', f: [[0, 250], [0.04, 700]], amp: [[0, 0], [0.002, 1], [0.08, 0]], len: 0.08 },
      noiseHit(0, 0.02, 0.3, { bp: 1500, q: 1 }),
    ],
  },
  plant: {
    gain: 0.42, jitter: 0.05, max: 3,
    voices: () => [
      { wave: 'noise', f: 0, bp: [[0, 700], [0.18, 2600], [0.35, 1400]], q: 1.2, amp: [[0, 0], [0.08, 1], [0.35, 0]], len: 0.36, gain: 0.6 },
      blip(0.12, 900, 1800, 0.05, 0.5), blip(0.2, 1200, 2300, 0.045, 0.4), blip(0.27, 1000, 2000, 0.045, 0.3),
    ],
  },
  no_water: {
    gain: 0.45, gap: 0.15, max: 2,
    voices: () => [
      { wave: 'tri', f: [[0, 160], [0.12, 95]], amp: hit(0.15), len: 0.15, decay: 0.05 },
      noiseHit(0, 0.05, 0.5, { lp: 500 }),
      { wave: 'sine', f: 330, amp: hit(0.1), len: 0.1, decay: 0.035, gain: 0.25 },
      { wave: 'tri', t: 0.14, f: [[0, 130], [0.1, 80]], amp: hit(0.14), len: 0.14, decay: 0.045, gain: 0.6 },
    ],
  },
  well_refill: {
    gain: 0.5, max: 2,
    voices: () => [
      // rope creaks
      {
        wave: 'saw', f: [[0, 70], [0.25, 95]], jitter: [30, 1.5], amp: [[0, 0], [0.05, 1], [0.26, 0.7], [0.3, 0]], len: 0.3,
        formants: [{ f: 1100, q: 6, g: 1 }, { f: 2400, q: 8, g: 0.5 }], gain: 0.5,
      },
      {
        wave: 'saw', t: 0.3, f: [[0, 85], [0.2, 65]], jitter: [30, 1.5], amp: [[0, 0], [0.04, 1], [0.18, 0.6], [0.22, 0]], len: 0.22,
        formants: [{ f: 1000, q: 6, g: 1 }, { f: 2300, q: 8, g: 0.5 }], gain: 0.4,
      },
      // splash + thump + bubbles
      { t: 0.55, wave: 'noise', f: 0, bp: [[0, 2500], [0.3, 900]], q: 0.8, amp: hit(0.4, 0.005), len: 0.4, decay: 0.12, gain: 0.9 },
      noiseHit(0.55, 0.15, 0.5, { lp: 600 }),
      blip(0.7, 700, 1400, 0.05, 0.3), blip(0.78, 900, 1700, 0.05, 0.25), blip(0.88, 800, 1500, 0.05, 0.2),
    ],
  },
  drop_animal: {
    gain: 0.5, max: 3,
    voices: () => [
      { wave: 'noise', f: 0, bp: [[0, 400], [0.25, 1600], [0.4, 700]], q: 1.5, amp: [[0, 0], [0.25, 1], [0.4, 0]], len: 0.4, gain: 0.6 },
      { t: 0.38, wave: 'sine', f: [[0, 130], [0.12, 50]], amp: hit(0.2), len: 0.2, decay: 0.08 },
      noiseHit(0.38, 0.05, 0.4, { lp: 400 }),
    ],
  },
  workshop_start: {
    gain: 0.45, max: 2,
    voices: () => [
      { wave: 'sine', f: [[0, 160], [0.1, 70]], amp: hit(0.18), len: 0.18, decay: 0.06 },
      noiseHit(0, 0.03, 0.5, { bp: 1800, q: 2 }),
      noiseHit(0.12, 0.015, 0.35, { bp: 3000, q: 4 }),
      noiseHit(0.17, 0.015, 0.35, { bp: 3200, q: 4 }),
      noiseHit(0.22, 0.015, 0.35, { bp: 3000, q: 4 }),
      { t: 0.1, wave: 'saw', f: [[0, 80], [0.4, 160]], lp: 600, amp: [[0, 0], [0.1, 0.5], [0.45, 0]], len: 0.45, gain: 0.3 },
    ],
  },
  workshop_done: {
    gain: 0.45, max: 2,
    voices: () => [bell(0, 1319, 0.8, 0.45), bell(0.1, 1976, 0.5, 0.4)],
  },
  build: {
    gain: 0.5, max: 1,
    voices: () => {
      const hammer = (t: number, f: number): Voice[] => [
        { t, wave: 'sine', f: [[0, f], [0.05, f * 0.6]], amp: hit(0.08, 0.001), len: 0.08, decay: 0.03 },
        noiseHit(t, 0.03, 0.6, { bp: 2200, q: 1.5 }),
      ];
      return [
        ...hammer(0, 420), ...hammer(0.18, 440), ...hammer(0.36, 400),
        { t: 0.56, wave: 'tri', f: 784, amp: ahr(0.005, 0.06, 0.02), len: 0.09, gain: 0.5 },
        { t: 0.65, wave: 'tri', f: 1047, amp: hit(0.35), len: 0.35, decay: 0.15, gain: 0.5 },
      ];
    },
  },
  upgrade: {
    gain: 0.5, max: 1,
    voices: () => [
      { wave: 'sine', f: [[0, 400], [0.5, 1600]], vib: [0.3, 12, 0], amp: [[0, 0], [0.05, 0.6], [0.5, 0.6], [0.55, 0]], len: 0.55, gain: 0.35 },
      bell(0, 523, 0.5, 0.3), bell(0.09, 659, 0.5, 0.3), bell(0.18, 784, 0.5, 0.3), bell(0.27, 1047, 0.55, 0.35),
      bell(0.36, 1319, 0.6, 0.5),
      { wave: 'noise', f: 0, hp: 7000, amp: [[0, 0], [0.3, 1], [0.7, 0]], len: 0.7, trem: [25, 0.7], gain: 0.1 },
    ],
  },

  // ---- animals --------------------------------------------------------------------------------
  chicken: {
    gain: 0.45, jitter: 0.06, max: 3, gap: 0.08,
    voices: () => [
      syl(0, 0.07, [[0, 520], [0.07, 440]], [[0, 700], [0.07, 900]], 1800, 1, { jitter: [50, 0.8] }),
      syl(0.12, 0.07, [[0, 540], [0.07, 450]], [[0, 700], [0.07, 900]], 1800, 0.9, { jitter: [50, 0.8] }),
      syl(0.26, 0.05, [[0, 470], [0.05, 500]], 700, 1700, 0.7),
      syl(0.33, 0.22, [[0, 560], [0.06, 760], [0.22, 540]], [[0, 800], [0.1, 1000], [0.22, 850]], [[0, 1700], [0.22, 1900]], 1, { jitter: [40, 0.6] }),
      noiseHit(0, 0.01, 0.2, { bp: 2500 }), noiseHit(0.12, 0.01, 0.2, { bp: 2500 }),
    ],
  },
  sheep: {
    gain: 0.5, jitter: 0.06, max: 2, gap: 0.15,
    voices: () => [
      {
        wave: 'saw', f: [[0, 310], [0.08, 360], [0.55, 330], [0.7, 300]], vib: [0.6, 9, 0.08], trem: [9, 0.45],
        formants: [
          { f: [[0, 300], [0.07, 800], [0.6, 700]], q: 5, g: 1 },
          { f: [[0, 900], [0.07, 1250], [0.6, 1700]], q: 7, g: 0.7 },
          { f: 2600, q: 8, g: 0.3 },
        ],
        amp: [[0, 0], [0.03, 1], [0.55, 0.8], [0.7, 0]], len: 0.7,
      },
      { wave: 'noise', f: 0, bp: 1300, q: 1.5, trem: [9, 0.5], amp: [[0, 0], [0.05, 1], [0.6, 0.5], [0.7, 0]], len: 0.7, gain: 0.08 },
    ],
  },
  cow: {
    gain: 0.55, jitter: 0.05, max: 2, gap: 0.3,
    voices: () => [
      {
        wave: 'saw', f: [[0, 105], [0.15, 125], [0.8, 118], [1.2, 92]], vib: [0.25, 4, 0.4],
        formants: [
          { f: [[0, 250], [0.25, 380], [1.0, 420], [1.2, 300]], q: 4, g: 1 },
          { f: [[0, 600], [0.3, 850], [1.2, 700]], q: 5, g: 0.6 },
          { f: 2400, q: 6, g: 0.12 },
        ],
        amp: [[0, 0], [0.12, 1], [0.9, 0.85], [1.2, 0]], len: 1.22,
      },
      { wave: 'sine', f: [[0, 105], [0.15, 125], [0.8, 118], [1.2, 92]], amp: [[0, 0], [0.15, 1], [0.9, 0.8], [1.2, 0]], len: 1.22, gain: 0.3 },
    ],
  },
  ostrich: {
    gain: 0.5, jitter: 0.05, max: 2, gap: 0.2,
    voices: () => [
      syl(0, 0.19, [[0, 260], [0.05, 300], [0.18, 240]], 650, 1500, 1, { jitter: [40, 0.8], duty: 0.3 }),
      { wave: 'sine', f: [[0, 110], [0.18, 90]], amp: ahr(0.02, 0.12, 0.05), len: 0.19, gain: 0.35 },
      syl(0.24, 0.2, [[0, 280], [0.05, 310], [0.2, 220]], 620, 1450, 0.9, { jitter: [40, 0.8], duty: 0.3 }),
      { t: 0.24, wave: 'sine', f: [[0, 110], [0.2, 85]], amp: ahr(0.02, 0.13, 0.05), len: 0.2, gain: 0.35 },
    ],
  },
  bark: {
    gain: 0.5, jitter: 0.05, max: 2, gap: 0.1,
    voices: () => {
      const woof = (t: number, k: number): Voice[] => [
        {
          t, wave: 'saw', f: [[0, 480 * k], [0.03, 560 * k], [0.12, 330 * k]], jitter: [60, 1],
          formants: [{ f: [[0, 900], [0.12, 600]], q: 3, g: 1 }, { f: [[0, 1600], [0.12, 1100]], q: 5, g: 0.6 }],
          amp: [[0, 0], [0.006, 1], [0.06, 0.6], [0.13, 0]], len: 0.13,
        },
        noiseHit(t, 0.06, 0.3, { bp: 1200, q: 1 }),
      ];
      return [...woof(0, 1), ...woof(0.19, 0.93)];
    },
  },
  meow: {
    gain: 0.45, jitter: 0.06, max: 2, gap: 0.2,
    voices: () => [{
      wave: 'saw', f: [[0, 480], [0.15, 760], [0.45, 620], [0.6, 480]], vib: [0.3, 6, 0.3],
      formants: [
        { f: [[0, 300], [0.12, 450], [0.35, 800], [0.6, 650]], q: 5, g: 1 },
        { f: [[0, 1900], [0.15, 2300], [0.4, 1300], [0.6, 1100]], q: 7, g: 0.7 },
      ],
      amp: [[0, 0], [0.05, 0.7], [0.15, 1], [0.5, 0.7], [0.62, 0]], len: 0.62,
    }],
  },
  animal_die: {
    gain: 0.42, max: 2,
    voices: () => [{
      wave: 'sine', vib: [0.35, 6, 0.6],
      f: [[0, 740], [0.24, 700], [0.28, 660], [0.52, 620], [0.56, 587], [0.8, 560], [1.15, 440]],
      amp: [[0, 0], [0.02, 1], [0.24, 0.8], [0.27, 0.2], [0.29, 1], [0.51, 0.8], [0.54, 0.2], [0.57, 1], [1.0, 0.7], [1.2, 0]],
      len: 1.2,
    }, {
      wave: 'tri',
      f: [[0, 740], [0.24, 700], [0.28, 660], [0.52, 620], [0.56, 587], [0.8, 560], [1.15, 440]],
      amp: [[0, 0], [0.02, 1], [0.24, 0.8], [0.27, 0.2], [0.29, 1], [0.51, 0.8], [0.54, 0.2], [0.57, 1], [1.0, 0.7], [1.2, 0]],
      len: 1.2, gain: 0.15,
    }],
  },

  // ---- predators ------------------------------------------------------------------------------
  predator_land: {
    gain: 0.8, max: 2,
    voices: () => [
      { wave: 'sine', f: [[0, 95], [0.3, 32]], amp: hit(0.5, 0.003), len: 0.5, decay: 0.18 },
      { wave: 'noise', f: 0, lp: [[0, 900], [0.3, 200]], amp: hit(0.4), len: 0.4, decay: 0.1, gain: 0.6 },
      { wave: 'noise', f: 60, lp: 300, amp: [[0, 0], [0.01, 1], [0.6, 0]], len: 0.6, gain: 0.3 },
      noiseHit(0.05, 0.08, 0.12, { bp: 2500, q: 1 }),
    ],
  },
  bear_roar: {
    gain: 0.7, max: 1, gap: 0.5,
    voices: () => [
      {
        wave: 'saw', f: [[0, 85], [0.2, 115], [0.8, 100], [1.1, 70]], jitter: [35, 1.2], trem: [32, 0.35],
        formants: [{ f: [[0, 400], [0.3, 600], [1.1, 450]], q: 3, g: 1 }, { f: [[0, 800], [0.3, 1000], [1.1, 800]], q: 4, g: 0.6 }],
        amp: [[0, 0], [0.15, 1], [0.8, 0.9], [1.15, 0]], len: 1.15,
      },
      { wave: 'noise', f: 0, bp: [[0, 500], [0.4, 900], [1.1, 500]], q: 1.5, trem: [20, 0.4], amp: [[0, 0], [0.15, 1], [0.8, 0.9], [1.15, 0]], len: 1.15, gain: 0.35 },
      { wave: 'sine', f: [[0, 55], [1.1, 45]], amp: [[0, 0], [0.2, 1], [0.8, 0.8], [1.15, 0]], len: 1.15, gain: 0.35 },
    ],
  },
  lion_roar: {
    gain: 0.7, max: 1, gap: 0.5,
    voices: () => [
      {
        wave: 'saw', f: [[0, 120], [0.25, 200], [0.6, 170], [1.2, 90]], jitter: [45, 1.5], trem: [38, 0.4],
        formants: [{ f: [[0, 450], [0.3, 800], [1.2, 500]], q: 3, g: 1 }, { f: [[0, 1000], [0.3, 1400], [1.2, 900]], q: 4, g: 0.6 }],
        amp: [[0, 0], [0.12, 1], [0.7, 0.9], [1.25, 0]], len: 1.25,
      },
      { wave: 'noise', f: 0, bp: [[0, 700], [0.3, 1300], [1.2, 600]], q: 1.2, trem: [25, 0.4], amp: [[0, 0], [0.12, 1], [0.7, 0.8], [1.25, 0]], len: 1.25, gain: 0.4 },
      { wave: 'sine', f: [[0, 60], [1.2, 48]], amp: [[0, 0], [0.2, 1], [0.8, 0.7], [1.25, 0]], len: 1.25, gain: 0.3 },
    ],
  },
  polar_roar: {
    gain: 0.7, max: 1, gap: 0.5,
    voices: () => [
      noiseHit(0, 0.15, 0.6, { bp: 700, q: 1.5 }),
      {
        t: 0.08, wave: 'saw', f: [[0, 75], [0.25, 95], [0.9, 85], [1.2, 60]], jitter: [30, 1.3], trem: [28, 0.35],
        formants: [{ f: [[0, 350], [0.3, 520], [1.2, 380]], q: 3, g: 1 }, { f: [[0, 700], [0.3, 900], [1.2, 650]], q: 4, g: 0.6 }],
        amp: [[0, 0], [0.15, 1], [0.9, 0.85], [1.2, 0]], len: 1.2,
      },
      { t: 0.08, wave: 'noise', f: 0, bp: [[0, 600], [0.4, 1000], [1.2, 500]], q: 1, trem: [18, 0.4], amp: [[0, 0], [0.15, 1], [0.9, 0.9], [1.2, 0]], len: 1.2, gain: 0.55 },
      { t: 0.08, wave: 'sine', f: [[0, 50], [1.2, 42]], amp: [[0, 0], [0.2, 1], [0.9, 0.7], [1.2, 0]], len: 1.2, gain: 0.35 },
    ],
  },
  hit: {
    gain: 0.5, jitter: 0.08, max: 3, gap: 0.04,
    voices: () => [
      { wave: 'sine', f: [[0, 900], [0.1, 260]], amp: hit(0.14, 0.001), len: 0.14, decay: 0.05 },
      { wave: 'tri', f: [[0, 1800], [0.08, 500]], amp: hit(0.08, 0.001), len: 0.08, decay: 0.025, gain: 0.3 },
      noiseHit(0, 0.02, 0.5, { bp: 1200, q: 2 }),
    ],
  },
  cage: {
    gain: 0.5, max: 2,
    voices: () => [
      { wave: 'fm', f: 480, fm: { ratio: 1.414, index: [[0, 3], [0.4, 0.5]] }, amp: hit(0.8, 0.001), len: 0.8, decay: 0.22, gain: 0.6 },
      { wave: 'fm', f: 1330, fm: { ratio: 2.76, index: [[0, 2], [0.3, 0.2]] }, amp: hit(0.5, 0.001), len: 0.5, decay: 0.12, gain: 0.35 },
      noiseHit(0, 0.03, 0.4, { hp: 3000 }),
      { t: 0.12, wave: 'fm', f: 520, fm: { ratio: 1.414, index: [[0, 2.5], [0.4, 0.4]] }, amp: hit(0.7, 0.001), len: 0.7, decay: 0.2, gain: 0.45 },
      noiseHit(0.12, 0.025, 0.3, { hp: 3000 }),
    ],
  },
  cage_break: {
    gain: 0.6, max: 1,
    voices: () => [
      { wave: 'noise', f: 0, hp: [[0, 1500], [0.8, 4000]], amp: hit(1.0), len: 1.0, decay: 0.25, gain: 0.5 },
      { wave: 'fm', f: 470, fm: { ratio: 1.414, index: [[0, 4], [0.5, 0.5]] }, amp: hit(0.9, 0.001), len: 0.9, decay: 0.25, gain: 0.5 },
      { t: 0.05, wave: 'fm', f: 890, fm: { ratio: 2.76, index: [[0, 3], [0.4, 0.3]] }, amp: hit(0.7, 0.001), len: 0.7, decay: 0.18, gain: 0.4 },
      { t: 0.12, wave: 'fm', f: 1270, fm: { ratio: 1.73, index: [[0, 3], [0.4, 0.3]] }, amp: hit(0.6, 0.001), len: 0.6, decay: 0.15, gain: 0.35 },
      { wave: 'sine', f: [[0, 120], [0.15, 60]], amp: hit(0.25), len: 0.25, decay: 0.08, gain: 0.6 },
      blip(0.3, 3000, 2000, 0.06, 0.2), blip(0.45, 2600, 1800, 0.06, 0.16), blip(0.6, 3300, 2400, 0.05, 0.12),
      blip(0.72, 2800, 2000, 0.05, 0.08),
    ],
  },

  // ---- vehicles ---------------------------------------------------------------------------------
  truck_go: {
    gain: 0.5, max: 1,
    voices: () => [
      ...[0, 0.16].flatMap((t) => [349, 440].map((f): Voice => ({
        t, wave: 'pulse', duty: 0.4, detune: 8, f, amp: ahr(0.005, 0.09, 0.02), len: 0.12, lp: 2200, gain: 0.45,
      }))),
      {
        t: 0.3, wave: 'saw', f: [[0, 45], [0.35, 90], [0.7, 75], [1.2, 110]], lp: 700, trem: [22, 0.35],
        amp: [[0, 0], [0.1, 1], [1.0, 0.8], [1.3, 0]], len: 1.3, gain: 0.8,
      },
      { t: 0.3, wave: 'noise', f: 180, lp: 500, amp: [[0, 0], [0.1, 1], [1.0, 0.8], [1.3, 0]], len: 1.3, gain: 0.35 },
    ],
  },
  truck_back: {
    gain: 0.45, max: 1,
    voices: () => [0, 0.2].flatMap((t) => [349, 440].map((f): Voice => ({
      t, wave: 'pulse', duty: 0.4, detune: 8, f: [[0, f * 0.97], [0.03, f]], amp: ahr(0.006, 0.12, 0.03), len: 0.16, lp: 2000, gain: 0.5,
    }))),
  },
  heli: {
    gain: 0.45, max: 1,
    voices: () => [
      { wave: 'noise', f: 0, lp: 900, trem: [13, 0.85], amp: [[0, 0], [0.2, 1], [0.7, 1], [1.0, 0]], len: 1.0, gain: 0.8 },
      { wave: 'saw', f: 60, lp: 250, trem: [13, 0.5], amp: [[0, 0], [0.2, 1], [0.7, 1], [1.0, 0]], len: 1.0, gain: 0.4 },
    ],
  },

  // ---- rewards ----------------------------------------------------------------------------------
  goal: {
    gain: 0.5, max: 1,
    voices: () => [
      ...[523, 659, 784].map((f, i): Voice => ({ t: i * 0.08, wave: 'pulse', f, amp: ahr(0.004, 0.07, 0.02), len: 0.1, lp: 4000, gain: 0.5 })),
      { t: 0.24, wave: 'pulse', f: 1047, amp: hit(0.45), len: 0.45, decay: 0.18, lp: 4500, gain: 0.5 },
      ...[262, 330, 392, 523].map((f, i): Voice => ({ t: i * 0.08, wave: 'tri', f, amp: ahr(0.004, i === 3 ? 0.3 : 0.07, 0.03), len: i === 3 ? 0.35 : 0.1, gain: 0.35 })),
      blip(0.35, 2093, 2093, 0.12, 0.2), blip(0.42, 2637, 2637, 0.15, 0.16),
    ],
  },
  win: {
    gain: 0.8, max: 1,
    voices: () => {
      const v: Voice[] = [];
      // "ta-ta-ta TAAA — ta TA — TAAAAA"
      [0, 0.13, 0.26].forEach((t) => v.push(brass(t, 67, 0.09, 0.35), brass(t, 72, 0.09, 0.25)));
      [60, 64, 67, 72].forEach((m) => v.push(brass(0.39, m, 0.5, 0.25)));
      [57, 65, 69, 72].forEach((m) => v.push(brass(0.95, m, 0.2, 0.24)));
      [59, 62, 67, 71].forEach((m) => v.push(brass(1.18, m, 0.2, 0.24)));
      [60, 64, 67, 72, 76].forEach((m) => v.push(brass(1.41, m, 1.55, 0.22)));
      // bass
      [[0.39, 48, 0.5], [0.95, 41, 0.2], [1.18, 43, 0.2], [1.41, 48, 1.55]].forEach(([t, m, d]) =>
        v.push({ t, wave: 'tri', f: mtof(m), amp: ahr(0.005, d, 0.1), len: d + 0.12, gain: 0.5 }));
      // drums: kicks, snare roll, crash
      [0.39, 1.41].forEach((t) => v.push({ t, wave: 'sine', f: [[0, 150], [0.05, 60], [0.3, 45]], amp: hit(0.3), len: 0.3, decay: 0.12, gain: 0.7 }));
      for (let t = 0.95, k = 0; t < 1.38; t += 0.036, k++) v.push(noiseHit(t, 0.06, 0.12 + k * 0.012, { bp: 2200, q: 0.8 }));
      v.push({ t: 1.41, wave: 'noise', f: 0, hp: 4500, amp: hit(1.8, 0.002), len: 1.8, decay: 0.5, gain: 0.3 });
      // sparkle arpeggio over the final chord
      [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => v.push(bell(1.55 + i * 0.08, f, 0.22, 0.35)));
      return v;
    },
  },
  medal: {
    gain: 0.5, max: 1,
    voices: () => [
      bell(0, 1568, 0.6, 0.5), bell(0, 1572, 0.4, 0.5),
      { wave: 'sine', f: 3136, amp: hit(0.8), len: 0.8, decay: 0.25, gain: 0.25 },
      { wave: 'noise', f: 0, hp: 8000, trem: [30, 0.6], amp: [[0, 0], [0.02, 1], [0.5, 0]], len: 0.5, gain: 0.08 },
    ],
  },
  star: {
    gain: 0.42, jitter: 0.03, max: 3,
    voices: () => [
      ...[1319, 1661, 1976, 2637].map((f, i) => ({ ...blip(i * 0.05, f, f, 0.2, 0.6), decay: 0.08 })),
      ...[1319, 1661, 1976, 2637].map((f, i) => ({ ...blip(0.25 + i * 0.05, f, f, 0.2, 0.2), decay: 0.08 })),
    ],
  },
  expire: {
    gain: 0.35, max: 3,
    voices: () => [
      noiseHit(0, 0.012, 0.8, { bp: 2500, q: 1 }),
      { wave: 'noise', f: 0, hp: 2000, trem: [45, 0.8], amp: hit(0.35, 0.005), len: 0.35, decay: 0.08, gain: 0.5 },
      { wave: 'sine', f: [[0, 1400], [0.25, 300]], amp: [[0, 0], [0.005, 1], [0.25, 0]], len: 0.25, gain: 0.45 },
    ],
  },
};

export const SFX_NAMES = Object.keys(SFX) as SfxName[];

/** Render an effect to a normalized mono buffer. */
export function renderSfx(name: SfxName, sr = SFX_SR): Float32Array {
  const def = SFX[name];
  const buf = renderVoices(def.voices(), sr);
  normalizePeak([buf], SFX_PEAK);
  return buf;
}

