// Upgrade shop — light bossa nova in F major, 124 BPM: vibes melody, electric-piano comping,
// plucked bass, rim-click clave and brushes. I–vi–ii–V changes, B section via IV and a borrowed Eb9.
// Form: intro(2) A(8) A2(8) B(8) A2h(8) = 34 bars ≈ 66 s.
import type { Song } from '../sequencer';

const A_CH = 'Fmaj7 | Dm7 | Gm7 | C7 | Am7 | D7 | Gm7 | C7';
const A2_CH = 'Fmaj7 | Dm7 | Gm7 | C7 | Am7 | D7 | Gm7 C7 | Fmaj7';
const A_HEAD =
  'c5 . a4 . e5 - - . | . d5 f5 . a5 - - . | bb5 - - a5 g5 - f5 . | e5 - - - - . . . | ' +
  'c5 . e5 . g5 - - . | . f#5 a5 . c6 - - .';
const A1 = `${A_HEAD} | bb5 - a5 - g5 - d5 . | e5 - - - g5 . . .`;
const A2 = `${A_HEAD} | d5 . f5 . e5 . bb4 . | a4 - - - - . . .`;

const B_CH = 'Bbmaj7 | Eb9 | Am7 | D7 | Gm7 | C7 | F6 | Gm7 C7';
const B_LEAD =
  'd5 - - - f5 - a5 - | g5 - - - f5 - - . | e5 - - - c5 - a4 - | f#5 - - - a5 - c6 - | ' +
  'bb5 - - - g5 - d5 - | e5 - - - g5 - bb5 - | a5 - - - - - - . | g5 . f5 . e5 . c5 .';

const COMP = 'C - . C - . C - | . . C - . C - .';
const BASS = 'R - - 5 5 - - .';
const RIM = 'x..x..x...x..x.. | ..x..x...x......';
const KICK = 'x.....x.x.....x.';
const SHAKER = 'x.o.x.o.x.o.x.o.';
const BRUSH = '....x.......x...';

export const shop: Song = {
  title: 'shop',
  bpm: 124,
  beats: 4,
  res: 8,
  key: 'F',
  scale: 'major',
  seed: 606,
  fx: { rev: 0.5, damp: 0.45, revWet: 1, echo: 0.75, fb: 0.3, echoWet: 0.7 },
  tracks: {
    lead: { inst: 'vibes', mode: 'notes', vol: 0.34, pan: 0.1, rev: 0.28, echo: 0.1 },
    flute: { inst: 'flute', mode: 'harmony', of: 'lead', vol: 0.13, pan: -0.3, rev: 0.3 },
    ep: { inst: 'epiano', mode: 'chord', lo: 53, vol: 0.2, pan: -0.15, rev: 0.2, strum: 0.004 },
    bass: { inst: 'bass_pluck', mode: 'bass', lo: 36, vol: 0.42 },
    rim: { inst: 'rim', mode: 'drum', res: 16, vol: 0.2, pan: 0.15, rev: 0.1 },
    kick: { inst: 'kick_soft', mode: 'drum', res: 16, vol: 0.27 },
    shaker: { inst: 'shaker', mode: 'drum', res: 16, vol: 0.2, pan: 0.35 },
    brush: { inst: 'brush', mode: 'drum', res: 16, vol: 0.25, pan: -0.2 },
  },
  sections: {
    intro: {
      chords: 'Gm7 | C7',
      parts: { ep: COMP, bass: BASS, rim: RIM, shaker: SHAKER },
    },
    A: {
      chords: A_CH,
      parts: { lead: A1, ep: COMP, bass: BASS, rim: RIM, kick: KICK, shaker: SHAKER },
    },
    A2: {
      chords: A2_CH,
      parts: { lead: A2, ep: COMP, bass: BASS, rim: RIM, kick: KICK, shaker: SHAKER, brush: BRUSH },
    },
    B: {
      chords: B_CH,
      parts: { lead: B_LEAD, flute: '*', ep: COMP, bass: BASS, rim: RIM, kick: KICK, shaker: SHAKER, brush: BRUSH },
    },
    A2h: {
      chords: A2_CH,
      parts: { lead: A2, flute: '*', ep: COMP, bass: BASS, rim: RIM, kick: KICK, shaker: SHAKER, brush: BRUSH },
    },
  },
  order: ['intro', 'A', 'A2', 'B', 'A2h'],
};
