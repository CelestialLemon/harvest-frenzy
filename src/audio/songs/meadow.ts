// Green Valley (levels 1–10) — relaxed bluegrass-flavoured chiptune in G major, 120 BPM.
// Banjo rolls, boom-chuck bass/guitar, fiddle tune; a whistle-led C section gives the ears a rest.
// Form: intro(2) A(8) A2(8) B(8) C(8) A2h(8) = 42 bars = 84 s.
import type { Song } from '../sequencer';
import { withLast } from './util';

const A_CH = 'G | C | G | D7 | G | C | G D | G';
const A_HEAD =
  'd5 . b4 d5 g5 - d5 . | e5 . c5 e5 g5 - e5 . | d5 . b4 . g4 . b4 d5 | c5 b4 a4 . f#4 - . .';
const A1 = `${A_HEAD} | d5 . b4 d5 g5 - b5 . | c6 . b5 a5 g5 - e5 . | d5 . g5 . a5 . f#5 . | g5 - - - . . . .`;
const A2 = `${A_HEAD} | b5 . a5 g5 d5 - b4 . | c5 . e5 g5 c6 - g5 . | b5 . a5 g5 a5 . f#5 d5 | g5 - - - . . . .`;

const B_CH = 'C | G | C | D | C | G | Am D7 | G';
const B_LEAD =
  'e5 - - - g5 - e5 . | d5 - - - b4 - g4 . | c5 . e5 . g5 - - . | f#5 . a5 . d6 - a5 . | ' +
  'e5 - - . g5 . e5 . | d5 - - . b4 . g4 . | a4 . c5 . d5 . f#5 . | g5 - - - . . . .';

const C_CH = 'Em | C | G | D | Em | C | Am7 | D7';
const C_LEAD =
  'b4 - - - - - - - | c5 - - - e5 - - - | d5 - - - - - b4 - | a4 - - - - - - - | ' +
  'g5 - - - - - e5 - | e5 - - - g5 - - - | a4 - c5 - e5 - g5 - | f#5 - - - - - . .';

const ROLL = '1 3 5 1 3 5 2 4';
const KICK = 'x.......x.......';
const RIM = '....x.......x...';
const SHAKER = 'x.o.x.o.x.o.x.o.';

export const meadow: Song = {
  title: 'meadow',
  bpm: 120,
  beats: 4,
  res: 8,
  swing: 0.08,
  key: 'G',
  scale: 'major',
  seed: 303,
  fx: { rev: 0.4, damp: 0.5, revWet: 1, echo: 0.75, fb: 0.28, echoWet: 0.7 },
  tracks: {
    fiddle: { inst: 'fiddle', mode: 'notes', vol: 0.29, pan: 0.1, rev: 0.18, echo: 0.08 },
    whistle: { inst: 'flute', mode: 'notes', vol: 0.3, pan: 0.05, rev: 0.3, echo: 0.12 },
    harm: { inst: 'flute', mode: 'harmony', of: 'fiddle', vol: 0.15, pan: -0.3, rev: 0.25 },
    banjo: { inst: 'banjo', mode: 'arp', lo: 55, vol: 0.16, pan: -0.28, rev: 0.12 },
    chuck: { inst: 'chuck', mode: 'chord', lo: 55, vol: 0.26, pan: 0.3, strum: 0.008 },
    pad: { inst: 'pad_soft', mode: 'chord', lo: 55, vol: 0.1, rev: 0.4 },
    bass: { inst: 'bass_pluck', mode: 'bass', lo: 36, vol: 0.42 },
    kick: { inst: 'kick_soft', mode: 'drum', res: 16, vol: 0.3 },
    rim: { inst: 'rim', mode: 'drum', res: 16, vol: 0.22, pan: 0.1 },
    shaker: { inst: 'shaker', mode: 'drum', res: 16, vol: 0.18, pan: 0.35 },
  },
  sections: {
    intro: {
      chords: 'G | D7',
      parts: { banjo: ROLL, bass: 'R . . . L . . .', chuck: '. . C . . . C .', shaker: SHAKER },
    },
    A: {
      chords: A_CH,
      parts: {
        fiddle: A1, banjo: ROLL, bass: 'R . . . L . . .', chuck: '. . C . . . C .',
        kick: KICK, rim: RIM, shaker: SHAKER,
      },
    },
    A2: {
      chords: A_CH,
      parts: {
        fiddle: A2, banjo: ROLL, bass: 'R . . . L . . .', chuck: '. . C . . . C .', pad: 'C - - - - - - -',
        kick: KICK, rim: withLast(RIM, 8, '....x.......x.x.'), shaker: SHAKER,
      },
    },
    B: {
      chords: B_CH,
      parts: {
        fiddle: B_LEAD, banjo: ROLL, bass: 'R . . . 5 . . .', chuck: '. . C . . . C .', pad: 'C - - - - - - -',
        kick: KICK, rim: RIM, shaker: SHAKER,
      },
    },
    C: {
      chords: C_CH,
      parts: {
        whistle: C_LEAD, banjo: '1 . 3 . 5 . 3 .', pad: 'C - - - - - - -', bass: 'R - - - L - - -',
        kick: 'x...............', shaker: SHAKER,
      },
    },
    A2h: {
      chords: A_CH,
      parts: {
        fiddle: A2, harm: '*', banjo: ROLL, bass: 'R . . . L . . .', chuck: '. . C . . . C .',
        kick: KICK, rim: withLast(RIM, 8, '....x.......x.x.'), shaker: SHAKER,
      },
    },
  },
  order: ['intro', 'A', 'A2', 'B', 'C', 'A2h'],
};
