// "Harvest Frenzy" main theme — bright, bouncy oom-pah in C major, 116 BPM.
// Form: intro(2) A(8) A2(8) B(8) A3(8) = 34 bars ≈ 70 s.
import type { Song } from '../sequencer';
import { rep, restBar, withFirst, withLast } from './util';

// A: question/answer folk-dance tune. Chord tones on beats 1 & 3.
const A_7 =
  'c5 d5 e5 c5 g5 - e5 . | d5 . b4 . g4 - . . | a4 b4 c5 a4 e5 - c5 . | f5 . e5 . c5 - . . | ' +
  'c5 d5 e5 c5 g5 - e5 . | g5 . f5 . d5 - b4 . | a4 c5 f5 a5 g5 f5 d5 b4';
const A_END = `${A_7} | c5 - - - . . . .`;
const A_PICKUP = `${A_7} | c5 - - - . e5 f5 g5`; // leads into B's a5
const A_CH = 'C | G | Am | F | C | G7 | F G | C';

// B: broader, lyrical, goes to IV and vi then turns around on G7.
const B_LEAD =
  'a5 - - g5 f5 - c5 - | d5 - - - g5 - b5 - | b5 - - a5 g5 - e5 - | a5 - - - e5 - c5 - | ' +
  'd5 - f5 - a5 - c6 - | b5 - - a5 g5 - d5 - | c6 - g5 - a5 - c6 - | d6 - b5 - g5 - d5 -';
const B_CH = 'F | G | Em | Am | Dm7 | G | C/E F | G7';

const E16 = restBar(16, true);
const KICK = 'X.......x.......';
const KICK2 = 'X.......x.x.....';
const SNARE = '....x.......x...';
const SNARE_FILL = '....x.....o.xoxX';
const HAT = 'x.o.x.o.x.o.x.o.';
const CRASH_BAR = 'X...............';

export const title: Song = {
  title: 'title',
  bpm: 116,
  beats: 4,
  res: 8,
  key: 'C',
  scale: 'major',
  seed: 101,
  fx: { rev: 0.45, damp: 0.45, revWet: 1, echo: 0.75, fb: 0.3, echoWet: 0.8 },
  tracks: {
    lead: { inst: 'pulse_lead', mode: 'notes', vol: 0.32, pan: 0.08, rev: 0.18, echo: 0.12 },
    harm: { inst: 'flute', mode: 'harmony', of: 'lead', vol: 0.13, pan: -0.3, rev: 0.25 },
    glock: { inst: 'glock', mode: 'notes', oct: 1, vol: 0.07, pan: 0.35, rev: 0.3 },
    arp: { inst: 'pluck', mode: 'arp', lo: 60, vol: 0.15, pan: -0.3, rev: 0.15, echo: 0.1 },
    stab: { inst: 'chuck', mode: 'chord', lo: 55, vol: 0.3, pan: 0.25, strum: 0.007 },
    pad: { inst: 'pad', mode: 'chord', lo: 53, vol: 0.1, rev: 0.35 },
    bass: { inst: 'bass', mode: 'bass', lo: 36, vol: 0.4 },
    kick: { inst: 'kick', mode: 'drum', res: 16, vol: 0.36 },
    snare: { inst: 'snare', mode: 'drum', res: 16, vol: 0.42, rev: 0.12 },
    hat: { inst: 'hat', mode: 'drum', res: 16, vol: 0.3, pan: 0.2 },
    crash: { inst: 'crash', mode: 'drum', res: 16, vol: 0.2, pan: -0.1, rev: 0.2 },
  },
  sections: {
    intro: {
      chords: 'C | G7',
      parts: {
        arp: '1 2 3 4 5 4 3 2',
        bass: 'R . . . R . 5 .',
        kick: KICK,
        hat: HAT,
        snare: withLast(E16, 2, '............xoxX'),
      },
    },
    A: {
      chords: A_CH,
      parts: {
        lead: A_END,
        bass: 'R . 5 . R . 5 .',
        stab: '. C . C . C . C',
        kick: KICK,
        snare: withLast(SNARE, 8, SNARE_FILL),
        hat: HAT,
        crash: withFirst(CRASH_BAR, 8, E16),
      },
    },
    A2: {
      chords: A_CH,
      parts: {
        lead: A_PICKUP,
        harm: '*',
        arp: '1 3 2 3 1 3 2 3',
        bass: 'R . 5 . R . 5 .',
        stab: '. C . C . C . C',
        kick: rep(`${KICK} | ${KICK2}`, 4),
        snare: withLast(SNARE, 8, SNARE_FILL),
        hat: HAT,
      },
    },
    B: {
      chords: B_CH,
      parts: {
        lead: B_LEAD,
        harm: '*',
        pad: 'C - - - - - - -',
        arp: '1 3 2 3 1 3 2 3',
        bass: 'R - - 5 R - 5 -',
        kick: KICK,
        snare: withLast('........x.......', 8, '........x.xoxoxX'),
        hat: 'x...x...x...x...',
        crash: withFirst(CRASH_BAR, 8, E16),
      },
    },
    A3: {
      chords: A_CH,
      parts: {
        lead: A_END,
        harm: '*',
        glock: A_END,
        arp: '1 3 2 3 1 3 2 3',
        bass: 'R . 5 . R . 5 .',
        stab: '. C . C . C . C',
        pad: 'C - - - - - - -',
        kick: rep(`${KICK} | ${KICK2}`, 4),
        snare: withLast(SNARE, 8, SNARE_FILL),
        hat: HAT,
        crash: withFirst(CRASH_BAR, 8, E16),
      },
    },
  },
  order: ['intro', 'A', 'A2', 'B', 'A3'],
};
