// Sunny Savanna (levels 11–20) — warm marimba/kalimba groove with a kwela-style pennywhistle,
// D mixolydian (I–bVII–IV vamp), 108 BPM, interlocking 16th-note percussion.
// Form: intro(2) A(8) A2(8) B(8) C(8) A2(8) = 42 bars ≈ 93 s.
import type { Song } from '../sequencer';
import { rep, restBar, withLast } from './util';

const A_CH = 'D | C | G | D | D | C | G | D';
const A_LEAD =
  'a4 . d5 . f#5 e5 d5 . | e5 - - - g5 . e5 . | d5 . b4 . g4 . b4 d5 | a4 - - - - - . . | ' +
  'a4 . d5 . f#5 e5 d5 f#5 | g5 - e5 - c5 - e5 - | d5 . g5 . b5 - a5 g5 | f#5 - - - - - . .';

const B_CH = 'G | D | Em | A7 | G | D | A | A7';
const B_LEAD =
  'b5 - - g5 - - d5 - | f#5 - - - a5 - f#5 - | g5 - - e5 - - b4 - | c#5 - - - e5 - g5 - | ' +
  'b4 - d5 - g5 - - b5 | a5 - - - f#5 - d5 - | e5 - - - c#5 - a4 - | g5 - - - e5 - c#5 -';

const C_LEAD = `${rep(restBar(8), 4)} | d6 - - - - - . . | c6 - - - - - . . | b5 - - - d6 - . . | a5 - - - - - . .`;

const MAR = '1 . . 3 . . 5 . 4 . 3 . . 2 . .';
const MAR_B = '1 . 2 . 3 . 5 . 4 . 3 . 2 . 3 .';
const KAL = '. . 5 . . 6 . . 5 . . 4 . . 6 .';
const BASS = 'R . . 5 . . R . . . 5 . 8 . 5 .';
const KICK = 'X.......X.....x.';
const SHAKER = 'xoox'.repeat(4);
const WOOD = 'x..x..x...x.x...';
const C_HI = '.....x.x.....x.x';
const C_LO = '..x.......x..x..';
const C_HI_SOLO = 'x.xx.x.xx.x.xxox';
const C_LO_SOLO = '..x...x...x...x.';

export const savanna: Song = {
  title: 'savanna',
  bpm: 108,
  beats: 4,
  res: 8,
  key: 'D',
  scale: 'mixolydian',
  seed: 404,
  fx: { rev: 0.45, damp: 0.35, revWet: 1, echo: 0.75, fb: 0.3, echoWet: 0.8 },
  tracks: {
    lead: { inst: 'flute', mode: 'notes', vol: 0.3, pan: 0.05, rev: 0.25, echo: 0.12 },
    harm: { inst: 'kalimba', mode: 'harmony', of: 'lead', vol: 0.14, pan: -0.3, rev: 0.3 },
    mar: { inst: 'marimba', mode: 'arp', res: 16, lo: 57, vol: 0.24, pan: -0.2, rev: 0.15 },
    kal: { inst: 'kalimba', mode: 'arp', res: 16, lo: 69, vol: 0.13, pan: 0.3, rev: 0.3, echo: 0.15 },
    pad: { inst: 'pad_soft', mode: 'chord', lo: 55, vol: 0.09, rev: 0.4 },
    bass: { inst: 'bass_sine', mode: 'bass', res: 16, lo: 36, vol: 0.45 },
    kick: { inst: 'kick_soft', mode: 'drum', res: 16, vol: 0.34 },
    chi: { inst: 'conga_hi', mode: 'drum', res: 16, vol: 0.2, pan: 0.25, rev: 0.1 },
    clo: { inst: 'conga_lo', mode: 'drum', res: 16, vol: 0.24, pan: -0.15, rev: 0.1 },
    shaker: { inst: 'shaker', mode: 'drum', res: 16, vol: 0.2, pan: 0.35 },
    wood: { inst: 'woodblock', mode: 'drum', res: 16, vol: 0.15, pan: -0.35, rev: 0.15 },
  },
  sections: {
    intro: {
      chords: 'D | C',
      parts: { mar: MAR, bass: BASS, kick: KICK, shaker: SHAKER, wood: WOOD },
    },
    A: {
      chords: A_CH,
      parts: {
        lead: A_LEAD, mar: MAR, bass: BASS,
        kick: KICK, shaker: SHAKER, wood: WOOD, chi: C_HI, clo: C_LO,
      },
    },
    A2: {
      chords: A_CH,
      parts: {
        lead: A_LEAD, harm: '*', mar: MAR, kal: KAL, bass: BASS,
        kick: KICK, shaker: SHAKER, wood: WOOD, chi: C_HI, clo: withLast(C_LO, 8, 'x.x.x.x.x.xxx.x.'),
      },
    },
    B: {
      chords: B_CH,
      parts: {
        lead: B_LEAD, mar: MAR_B, pad: 'C - - - - - - -', bass: BASS,
        kick: KICK, shaker: SHAKER, chi: C_HI, clo: C_LO,
      },
    },
    C: {
      chords: A_CH,
      parts: {
        lead: C_LEAD, mar: MAR, kal: KAL, bass: BASS, pad: 'C - - - - - - -',
        kick: `${rep(restBar(16, true), 4)} | ${rep(KICK, 4)}`,
        shaker: SHAKER, chi: C_HI_SOLO, clo: C_LO_SOLO,
      },
    },
  },
  order: ['intro', 'A', 'A2', 'B', 'C', 'A2'],
};
