// Frosty Peaks (levels 21–30) — cozy winter waltz in Bb major, 3/4 at 96 BPM.
// Celesta melody, music-box arps, soft strings, sleigh bells on beats 2 & 3.
// Form: intro(2) A(8) A2(8) B(8) A2h(8) C(8) = 42 bars ≈ 79 s.
import type { Song } from '../sequencer';
import { withFirst } from './util';

const A_CH = 'Bb | Gm | Eb | F | Bb | Gm | Cm7 | F7';
const A_HEAD =
  'f5 - - d5 bb4 - | d5 - - - g5 - | g5 - - f5 eb5 - | c5 - - - - - | ' +
  'f5 - - d5 bb4 - | d5 - - - bb5 - | bb5 - - g5 eb5 -';
const A1 = `${A_HEAD} | a4 - c5 - eb5 -`; // turnaround back into A
const A2 = `${A_HEAD} | f5 - - - - -`;

const B_CH = 'Eb | F | Dm7 | Gm | Cm7 | F7 | Bb | Bb';
const B_LEAD =
  'g5 - - - bb5 - | a5 - - - c6 - | a5 - - f5 d5 - | bb4 - - - d5 - | ' +
  'eb5 - - - g5 - | a5 - - - c6 - | bb5 - - - - - | - - - - . .';

const C_CH = 'Gm | Eb | Bb | F | Gm | Eb | Cm7 | F7';

const JINGLE = '....x...x...';
const TRI_BAR = 'x...........';
const EMPTY12 = '............';

export const arctic: Song = {
  title: 'arctic',
  bpm: 96,
  beats: 3,
  res: 6,
  key: 'Bb',
  scale: 'major',
  seed: 505,
  fx: { rev: 0.7, damp: 0.3, revWet: 1.1, echo: 1, fb: 0.35, echoWet: 0.8 },
  tracks: {
    lead: { inst: 'celesta', mode: 'notes', vol: 0.36, pan: 0.05, rev: 0.35, echo: 0.15 },
    harm: { inst: 'musicbox', mode: 'harmony', of: 'lead', vol: 0.14, pan: -0.3, rev: 0.4 },
    glock: { inst: 'glock', mode: 'arp', lo: 70, vol: 0.09, pan: 0.3, rev: 0.4, echo: 0.2 },
    box: { inst: 'musicbox', mode: 'arp', lo: 65, vol: 0.16, pan: -0.2, rev: 0.35 },
    pah: { inst: 'pluck', mode: 'chord', lo: 55, vol: 0.11, pan: 0.2, strum: 0.01 },
    pad: { inst: 'pad_soft', mode: 'chord', lo: 53, vol: 0.14, rev: 0.5 },
    bass: { inst: 'bass_sine', mode: 'bass', lo: 36, vol: 0.4 },
    jingle: { inst: 'jingle', mode: 'drum', res: 12, vol: 0.24, pan: 0.3, rev: 0.2 },
    tri: { inst: 'triangle', mode: 'drum', res: 12, vol: 0.2, pan: -0.3, rev: 0.4 },
  },
  sections: {
    intro: {
      chords: 'Bb | F7',
      parts: { box: '1 2 3 4 3 2', bass: 'R - - - - -', jingle: JINGLE, tri: withFirst(TRI_BAR, 2, EMPTY12) },
    },
    A: {
      chords: A_CH,
      parts: {
        lead: A1, bass: 'R - - - - -', pah: '. . C - C -', pad: 'C - - - - -', jingle: JINGLE,
        tri: withFirst(TRI_BAR, 8, EMPTY12),
      },
    },
    A2: {
      chords: A_CH,
      parts: {
        lead: A2, bass: 'R - - - - -', pah: '. . C - C -', pad: 'C - - - - -', glock: '. . . 6 . 5',
        jingle: JINGLE,
      },
    },
    B: {
      chords: B_CH,
      parts: {
        lead: B_LEAD, bass: 'R - - - 5 -', pah: '. . C - C -', pad: 'C - - - - -', box: '1 . 3 . 5 .',
        jingle: JINGLE, tri: withFirst(TRI_BAR, 8, EMPTY12),
      },
    },
    A2h: {
      chords: A_CH,
      parts: {
        lead: A2, harm: '*', bass: 'R - - - - -', pah: '. . C - C -', pad: 'C - - - - -', glock: '. . . 6 . 5',
        jingle: JINGLE,
      },
    },
    C: {
      chords: C_CH,
      parts: {
        box: '1 2 3 5 4 3', glock: '. . 6 . 5 .', pad: 'C - - - - -', bass: 'R - - - - -', jingle: '....x.......',
        tri: withFirst(TRI_BAR, 8, EMPTY12),
      },
    },
  },
  order: ['intro', 'A', 'A2', 'B', 'A2h', 'C'],
};
