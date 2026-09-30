// World map — gentle, wandering travel tune in F major, 90 BPM.
// Form: intro(2) A(8) B(8) A2(8) C(4) = 30 bars ≈ 80 s.
import type { Song } from '../sequencer';

const A_CH = 'F | Am | Bb | F | Gm7 | Am7 | Bb | C';
const A_LEAD =
  'c5 - - a4 c5 - d5 c5 | e5 - - - - - d5 c5 | d5 - - - f5 - d5 - | c5 - - - - - . . | ' +
  'bb4 - - - d5 - g5 - | a5 - - - g5 - e5 - | f5 - - - d5 - bb4 - | c5 - - - - - . .';

const B_CH = 'Dm | Bb | F | C | Dm | Bb | Gm7 | C7';
const B_LEAD =
  'a4 - d5 - f5 - e5 d5 | d5 - - - - - . . | c5 - f5 - a5 - g5 f5 | e5 - - - - - . . | ' +
  'f5 - e5 - d5 - a4 - | bb4 - d5 - f5 - - - | f5 - - - d5 - bb4 - | c5 - - - e5 - g5 -';

const SHAKER = 'x.o.x.o.x.o.x.o.';
const KICK = 'x.......o.......';

export const map: Song = {
  title: 'map',
  bpm: 90,
  beats: 4,
  res: 8,
  key: 'F',
  scale: 'major',
  seed: 202,
  fx: { rev: 0.6, damp: 0.5, revWet: 1.1, echo: 0.75, fb: 0.35, echoWet: 0.8 },
  tracks: {
    lead: { inst: 'flute', mode: 'notes', vol: 0.34, pan: 0.05, rev: 0.3, echo: 0.15 },
    harm: { inst: 'kalimba', mode: 'harmony', of: 'lead', vol: 0.15, pan: -0.25, rev: 0.3 },
    mar: { inst: 'marimba', mode: 'arp', lo: 57, vol: 0.19, pan: -0.2, rev: 0.2 },
    kal: { inst: 'kalimba', mode: 'arp', lo: 69, vol: 0.11, pan: 0.3, rev: 0.35, echo: 0.2 },
    pad: { inst: 'pad_soft', mode: 'chord', lo: 53, vol: 0.14, rev: 0.45 },
    bass: { inst: 'bass_sine', mode: 'bass', lo: 36, vol: 0.4 },
    shaker: { inst: 'shaker', mode: 'drum', res: 16, vol: 0.25, pan: 0.3 },
    kick: { inst: 'kick_soft', mode: 'drum', res: 16, vol: 0.28 },
    rim: { inst: 'rim', mode: 'drum', res: 16, vol: 0.25, pan: -0.15, rev: 0.2 },
  },
  sections: {
    intro: {
      chords: 'Bb | C',
      parts: {
        mar: '1 2 3 5 4 3 2 3',
        pad: 'C - - - - - - -',
        bass: 'R - - - - - - -',
      },
    },
    A: {
      chords: A_CH,
      parts: {
        lead: A_LEAD,
        mar: '1 2 3 5 4 3 2 3',
        pad: 'C - - - - - - -',
        bass: 'R - - - 5 - 3 -',
        shaker: SHAKER,
        kick: KICK,
      },
    },
    B: {
      chords: B_CH,
      parts: {
        lead: B_LEAD,
        mar: '1 . 3 . 2 . 4 .',
        kal: '. 4 . 5 . 6 . 5',
        pad: 'C - - - - - - -',
        bass: 'R - 5 - 8 - 5 -',
        shaker: SHAKER,
        kick: KICK,
        rim: '........x.......',
      },
    },
    A2: {
      chords: A_CH,
      parts: {
        lead: A_LEAD,
        harm: '*',
        mar: '1 2 3 5 4 3 2 3',
        kal: '. . 5 . . 6 . .',
        pad: 'C - - - - - - -',
        bass: 'R - - - 5 - 3 -',
        shaker: SHAKER,
        kick: KICK,
        rim: '........x.......',
      },
    },
    C: {
      chords: 'Gm7 | Am7 | Bbmaj7 | C',
      parts: {
        mar: '1 2 3 4 5 4 3 2',
        kal: '5 . . 6 . . 7 .',
        pad: 'C - - - - - - -',
        bass: 'R - - - - - - -',
        shaker: SHAKER,
      },
    },
  },
  order: ['intro', 'A', 'B', 'A2', 'C'],
};
