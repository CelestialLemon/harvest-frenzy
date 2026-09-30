// Tiny tracker: song data (chords + pattern strings) → note events → rendered stereo loop.
//
// PART STRING GRAMMAR (whitespace separated, '|' = bar line, validated per bar):
//   notes mode   : c5 f#4 bb3 …  explicit notes (letter, optional #/b, octave)
//   bass mode    : R (root, or slash bass) 3 5 7 8 (octave) L (fifth below) + explicit notes
//   arp mode     : 1..9 = index into the (voice-led) chord voicing, extending up by octaves + explicit notes
//   chord mode   : C = strike the whole voice-led chord
//   drum mode    : X (accent) x (normal) o (ghost) — spaces optional, one char per step
//   harmony mode : any non-empty string = "on": follows track `of`, a consonant chord tone / diatonic 3rd below
//   common       : '-' tie/hold, '.' rest, [a b c] = subdivide one step into equal parts
// A part may be shorter than its section if its bar count divides the section's (it repeats).
//
// CHORD STRING: bars separated by '|'; tokens inside a bar split the bar evenly; '%' repeats previous bar.
import { rng, synth, reverb, echo, dcBlock, rmsOf, peakOf, scale, softLimit } from './dsp';
import { INSTRUMENTS, type InstName } from './instruments';

export type Mode = 'notes' | 'bass' | 'arp' | 'chord' | 'drum' | 'harmony';

export interface TrackDef {
  inst: InstName;
  mode: Mode;
  vol: number;
  pan?: number;
  /** reverb send */
  rev?: number;
  /** echo send */
  echo?: number;
  /** register anchor (midi): lowest root for bass, lower bound of chord/arp voicings */
  lo?: number;
  /** steps per bar (default: song.res) */
  res?: number;
  /** chord strum spread per note (s) */
  strum?: number;
  /** harmony: source track name */
  of?: string;
  /** duration multiplier */
  gate?: number;
  /** notes mode: transpose explicit notes by this many octaves */
  oct?: number;
  /** timing humanize amount in seconds (default 0.006, drums 0.003) */
  hum?: number;
}

export interface Section {
  chords: string;
  parts: Record<string, string>;
}

export interface Song {
  title: string;
  bpm: number;
  /** beats per bar (4 or 3) */
  beats: number;
  /** default steps per bar */
  res: number;
  /** swing amount (fraction of an 8th note the off-beat 8th is delayed by) */
  swing?: number;
  /** tonic, e.g. 'G' */
  key: string;
  scale: 'major' | 'mixolydian' | 'minor' | 'dorian';
  tracks: Record<string, TrackDef>;
  sections: Record<string, Section>;
  order: string[];
  fx: { rev: number; damp?: number; revWet?: number; echo?: number; fb?: number; echoWet?: number };
  seed?: number;
}

export interface NoteEvent {
  t: number;
  dur: number;
  midi: number;
  vel: number;
  track: string;
  seed: number;
  /** section name + bar (for diagnostics) */
  where: string;
  /** position within bar in beats (for diagnostics) */
  beat: number;
  /** exact (un-humanized) position in bars from the song start */
  barPos: number;
}

export interface ChordInfo {
  name: string;
  root: number;
  bass: number;
  ivs: number[];
  pcs: number[];
}

export const SCALES: Record<Song['scale'], number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const LETTER: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

export function pcOf(name: string): number {
  const m = /^([A-Ga-g])([#b]?)$/.exec(name);
  if (!m) throw new Error(`bad pitch class '${name}'`);
  let pc = LETTER[m[1].toLowerCase()];
  if (m[2] === '#') pc++;
  if (m[2] === 'b') pc--;
  return (pc + 12) % 12;
}

const NOTE_RE = /^([a-g])([#b]?)(-?\d)$/;
export function parseNote(tok: string): number | null {
  const m = NOTE_RE.exec(tok);
  if (!m) return null;
  let pc = LETTER[m[1]];
  if (m[2] === '#') pc++;
  if (m[2] === 'b') pc--;
  return (parseInt(m[3], 10) + 1) * 12 + pc;
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9], dim: [0, 3, 6], m7b5: [0, 3, 6, 10], sus4: [0, 5, 7], sus2: [0, 2, 7], add9: [0, 4, 7, 14],
  '9': [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], '7sus4': [0, 5, 7, 10], aug: [0, 4, 8],
  '69': [0, 4, 7, 9, 14],
};

export function parseChord(sym: string): ChordInfo {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym);
  if (!m) throw new Error(`bad chord '${sym}'`);
  const ivs = QUALITIES[m[2]];
  if (!ivs) throw new Error(`unknown chord quality '${m[2]}' in '${sym}'`);
  const root = pcOf(m[1]);
  const bass = m[3] ? pcOf(m[3]) : root;
  const pcs = [...new Set(ivs.map((i) => (root + i) % 12))];
  return { name: sym, root, bass, ivs, pcs };
}

// ---------------------------------------------------------------------------------------------
// Part parsing

interface Atom {
  /** start in steps (fractional for subdivisions) */
  pos: number;
  size: number;
  tok: string;
}

function tokenize(s: string): string[] {
  return s.replace(/\|/g, ' | ').replace(/\[/g, ' [ ').replace(/\]/g, ' ] ').trim().split(/\s+/).filter(Boolean);
}

/** Parse a part into atoms; validates per-bar step counts. Returns atoms and bar count. */
export function parsePart(src: string, res: number, drum: boolean, ctx: string): { atoms: Atom[]; bars: number } {
  let toks: string[];
  if (drum) {
    toks = [];
    for (const ch of src.replace(/\s+/g, '')) toks.push(ch === '|' ? '|' : ch);
  } else toks = tokenize(src);
  const atoms: Atom[] = [];
  let pos = 0;
  let barStart = 0;
  let barNo = 1;
  let explicitBars = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '|') {
      explicitBars = true;
      if (Math.abs(pos - barStart - res) > 1e-6) throw new Error(`${ctx}: bar ${barNo} has ${pos - barStart} steps, expected ${res}`);
      barStart = pos;
      barNo++;
      continue;
    }
    if (t === '[') {
      const group: string[] = [];
      i++;
      while (i < toks.length && toks[i] !== ']') group.push(toks[i++]);
      if (i >= toks.length) throw new Error(`${ctx}: unclosed '['`);
      if (!group.length) throw new Error(`${ctx}: empty group`);
      const sz = 1 / group.length;
      group.forEach((g, k) => atoms.push({ pos: pos + k * sz, size: sz, tok: g }));
      pos += 1;
      continue;
    }
    if (t === ']') throw new Error(`${ctx}: stray ']'`);
    atoms.push({ pos, size: 1, tok: t });
    pos += 1;
  }
  if (explicitBars && Math.abs(pos - barStart - res) > 1e-6) throw new Error(`${ctx}: bar ${barNo} has ${pos - barStart} steps, expected ${res}`);
  const bars = pos / res;
  if (Math.abs(bars - Math.round(bars)) > 1e-6) throw new Error(`${ctx}: ${pos} steps is not a whole number of ${res}-step bars`);
  return { atoms, bars: Math.round(bars) };
}

/** Chord timeline: array of { start (bars), end (bars), chord }. */
export function parseChords(src: string, ctx: string): { start: number; end: number; chord: ChordInfo }[] {
  const bars = src.split('|').map((b) => b.trim().split(/\s+/).filter(Boolean));
  const out: { start: number; end: number; chord: ChordInfo }[] = [];
  let prev: string[] | null = null;
  bars.forEach((toks, b) => {
    if (toks.length === 1 && toks[0] === '%') {
      if (!prev) throw new Error(`${ctx}: '%' with no previous bar`);
      toks = prev;
    }
    if (!toks.length) throw new Error(`${ctx}: empty chord bar ${b + 1}`);
    toks.forEach((sym, k) => {
      try {
        out.push({ start: b + k / toks.length, end: b + (k + 1) / toks.length, chord: parseChord(sym) });
      } catch (e) {
        throw new Error(`${ctx}: bar ${b + 1}: ${(e as Error).message}`);
      }
    });
    prev = toks;
  });
  return out;
}

function chordAt(tl: { start: number; end: number; chord: ChordInfo }[], barPos: number): ChordInfo {
  for (const c of tl) if (barPos >= c.start - 1e-9 && barPos < c.end - 1e-9) return c.chord;
  return tl[tl.length - 1].chord;
}

// ---------------------------------------------------------------------------------------------
// Voicing helpers

/** Close-position voicings (all inversions) with lowest note ≥ lo; ≤4 notes (drops the 5th of 5-note chords). */
function voicings(ch: ChordInfo, lo: number): number[][] {
  let ivs = ch.ivs.map((i) => i % 12);
  ivs = [...new Set(ivs)];
  if (ivs.length > 4) ivs = ivs.filter((i) => i !== 7);
  const pcs = ivs.map((i) => (ch.root + i) % 12);
  const res: number[][] = [];
  for (let k = 0; k < pcs.length; k++) {
    const rot = [...pcs.slice(k), ...pcs.slice(0, k)];
    let n = lo + ((rot[0] - lo) % 12 + 12) % 12;
    const v = [n];
    for (let j = 1; j < rot.length; j++) {
      n = n + 1 + ((rot[j] - (n + 1)) % 12 + 12) % 12;
      v.push(n);
    }
    res.push(v);
  }
  return res;
}

function voiceLead(ch: ChordInfo, lo: number, prev: number[] | null): number[] {
  const cands = voicings(ch, lo);
  const centre = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  let best = cands[0];
  let bestD = Infinity;
  for (const c of cands) {
    let d: number;
    if (prev && prev.length === c.length) d = c.reduce((a, n, i) => a + Math.abs(n - prev[i]), 0);
    else if (prev) d = Math.abs(centre(c) - centre(prev)) * c.length;
    else d = Math.abs(centre(c) - (lo + 7));
    // keep things from drifting upward forever: mild penalty for high voicings
    d += Math.max(0, c[c.length - 1] - (lo + 16)) * 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function place(pc: number, lo: number): number {
  return lo + ((pc - lo) % 12 + 12) % 12;
}

// ---------------------------------------------------------------------------------------------
// Compilation

export interface Compiled {
  events: NoteEvent[];
  /** loop length in seconds */
  length: number;
  bars: number;
  barDur: number;
  /** section start times (s) keyed by order index */
  sectionStarts: number[];
}

function metricAccent(beat: number, beats: number): number {
  if (beat < 1e-6) return 1;
  const frac = beat - Math.floor(beat);
  if (frac < 1e-6) return beats === 4 && Math.abs(beat - 2) < 1e-6 ? 0.9 : 0.83;
  if (Math.abs(frac - 0.5) < 1e-6) return 0.74;
  return 0.68;
}

const DRUM_VEL: Record<string, number> = { X: 1, x: 0.72, o: 0.42 };

export function compileSong(song: Song): Compiled {
  const beatDur = 60 / song.bpm;
  const barDur = beatDur * song.beats;
  const rand = rng(song.seed ?? 1234);
  const events: NoteEvent[] = [];
  const prevVoicing: Record<string, number[] | null> = {};
  const sectionStarts: number[] = [];
  let t0 = 0;
  let totalBars = 0;
  let evSeed = 1;

  const keyPc = pcOf(song.key);
  const scalePcs = SCALES[song.scale].map((i) => (keyPc + i) % 12);

  for (const secName of song.order) {
    const sec = song.sections[secName];
    if (!sec) throw new Error(`${song.title}: unknown section '${secName}'`);
    const tl = parseChords(sec.chords, `${song.title}/${secName} chords`);
    const secBars = Math.round(tl[tl.length - 1].end);
    sectionStarts.push(t0);
    const secEvents: Record<string, NoteEvent[]> = {};

    // non-harmony tracks first, then harmony tracks (which read their source's events)
    const names = Object.keys(sec.parts).sort((a, b) => {
      const ha = song.tracks[a]?.mode === 'harmony' ? 1 : 0;
      const hb = song.tracks[b]?.mode === 'harmony' ? 1 : 0;
      return ha - hb;
    });
    for (const tname of names) {
      const src = sec.parts[tname];
      const tr = song.tracks[tname];
      const ctx = `${song.title}/${secName}/${tname}`;
      if (!tr) throw new Error(`${ctx}: unknown track`);
      if (!(tr.inst in INSTRUMENTS)) throw new Error(`${ctx}: unknown instrument '${tr.inst}'`);
      const list: NoteEvent[] = (secEvents[tname] = []);
      if (!src || !src.trim()) continue;

      if (tr.mode === 'harmony') {
        const from = tr.of ? secEvents[tr.of] : undefined;
        if (!from) throw new Error(`${ctx}: harmony source '${tr.of}' has no part in this section`);
        for (const e of from) {
          const ch = chordAt(tl, e.barPos - totalBars + 1e-6);
          const h = harmonize(e.midi, ch, scalePcs);
          if (h === null) continue;
          list.push({ ...e, midi: h, vel: e.vel * 0.9, track: tname, seed: evSeed++ });
        }
        events.push(...list);
        continue;
      }

      const res = tr.res ?? song.res;
      const drum = tr.mode === 'drum';
      const { atoms, bars } = parsePart(src, res, drum, ctx);
      if (bars === 0 || secBars % bars !== 0) throw new Error(`${ctx}: part is ${bars} bars, section is ${secBars} bars`);
      const stepDur = barDur / res;
      const hum = tr.hum ?? (drum ? 0.003 : 0.006);
      const lo = tr.lo ?? (tr.mode === 'bass' ? 36 : 55);

      for (let rep = 0; rep < secBars / bars; rep++) {
        // open note(s) being extended by ties
        let open: NoteEvent[] = [];
        let openChord: ChordInfo | null = null;
        let lastTok = '';
        const close = () => {
          open = [];
          openChord = null;
        };
        for (const a of atoms) {
          const stepPos = rep * bars * res + a.pos;
          const barIdx = Math.floor(stepPos / res + 1e-9);
          const inBar = stepPos - barIdx * res;
          const beat = (inBar / res) * song.beats;
          let tok = a.tok;
          if (tok === '-') {
            // held bass notes / chords re-articulate when the harmony changes underneath them
            const restrike = (tr.mode === 'bass' || tr.mode === 'chord') && open.length > 0 && openChord !== null
              && parseNote(lastTok) === null && chordAt(tl, stepPos / res) !== openChord;
            if (!restrike) {
              for (const e of open) e.dur += a.size * stepDur;
              continue;
            }
            tok = lastTok;
          }
          if (tok === '.') {
            close();
            continue;
          }
          // timing
          let t = t0 + stepPos * stepDur;
          const sw = song.swing ?? 0;
          if (sw && Math.abs(inBar - Math.round(inBar)) < 1e-9) {
            const eighths = res / (song.beats * 2);
            const r = Math.round(inBar);
            if (eighths === 1 && r % 2 === 1) t += sw * stepDur;
            else if (eighths === 2 && r % 4 === 2) t += sw * 2 * stepDur;
          }
          t += (rand() * 2 - 1) * hum;
          const velH = 1 + (rand() * 2 - 1) * 0.06;
          const where = `${secName} bar ${barIdx + 1}`;
          const dur = a.size * stepDur;

          if (drum) {
            const v = DRUM_VEL[tok];
            if (v === undefined) throw new Error(`${ctx}: bad drum char '${tok}'`);
            close();
            list.push({ t, dur, midi: 60, vel: v * velH, track: tname, seed: evSeed++, where, beat, barPos: totalBars + stepPos / res });
            continue;
          }

          const barPos = stepPos / res;
          const ch = chordAt(tl, barPos);
          const acc = metricAccent(beat, song.beats) * velH;
          let midis: number[] = [];
          const explicit = parseNote(tok);
          if (explicit !== null) midis = [explicit + 12 * (tr.oct ?? 0)];
          else if (tr.mode === 'bass') {
            const rootN = place(ch.root, lo);
            const bassN = place(ch.bass, lo);
            const third = ch.ivs.find((i) => i === 3 || i === 4) ?? 4;
            const sev = ch.ivs.find((i) => i === 10 || i === 11);
            const map: Record<string, number> = {
              R: bassN, '3': rootN + third, '5': rootN + 7, '7': sev !== undefined ? rootN + sev : rootN + 12, '8': bassN + 12, L: rootN - 5,
            };
            if (!(tok in map)) throw new Error(`${ctx}: bad bass token '${tok}'`);
            midis = [map[tok]];
          } else if (tr.mode === 'arp') {
            if (!/^[1-9]$/.test(tok)) throw new Error(`${ctx}: bad arp token '${tok}'`);
            const v = (prevVoicing[tname] = voiceLead(ch, lo, prevVoicing[tname] ?? null));
            const i = parseInt(tok, 10) - 1;
            midis = [v[i % v.length] + 12 * Math.floor(i / v.length)];
          } else if (tr.mode === 'chord') {
            if (tok !== 'C') throw new Error(`${ctx}: bad chord token '${tok}'`);
            midis = (prevVoicing[tname] = voiceLead(ch, lo, prevVoicing[tname] ?? null));
          } else throw new Error(`${ctx}: bad note token '${tok}'`);

          lastTok = tok;
          openChord = ch;
          open = midis.map((m, k) => {
            const e: NoteEvent = {
              t: t + (tr.strum ?? 0) * k, dur, midi: m, vel: acc, track: tname, seed: evSeed++, where, beat,
              barPos: totalBars + stepPos / res,
            };
            list.push(e);
            return e;
          });
        }
      }
      for (const e of list) e.dur *= tr.gate ?? 1;
      events.push(...list);
    }
    t0 += secBars * barDur;
    totalBars += secBars;
  }
  for (const e of events) if (e.t < 0) e.t = 0;
  events.sort((a, b) => a.t - b.t);
  return { events, length: t0, bars: totalBars, barDur, sectionStarts };
}

/** A consonant note below `m`: a chord tone 3–9 semitones down (thirds/sixths first), else a diatonic third. */
export function harmonize(m: number, ch: ChordInfo, scalePcs: number[]): number | null {
  const pref = [3, 4, 8, 9, 5];
  const isChordTone = ch.pcs.includes(((m % 12) + 12) % 12);
  if (isChordTone) {
    for (const d of pref) if (ch.pcs.includes((((m - d) % 12) + 12) % 12)) return m - d;
  }
  // passing tone: diatonic third below
  for (const d of [3, 4]) {
    const pc = (((m - d) % 12) + 12) % 12;
    if (scalePcs.includes(pc)) return m - d;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Rendering

export const MUSIC_SR = 32000;
/** Seconds of tail rendered after the loop so the loop point is seamless (see renderSong). */
export const LOOP_TAIL = 4;
/** Target loudness of rendered music (RMS, linear) and the peak ceiling (-3 dBFS). */
export const MUSIC_RMS = 0.14;
export const PEAK_CEIL = 0.708;

export interface RenderedSong {
  sr: number;
  L: Float32Array;
  R: Float32Array;
  /** loop points in seconds: play from 0, loop [loopStart, loopEnd) forever */
  loopStart: number;
  loopEnd: number;
  stats: { rms: number; peakPre: number; limited: number; events: number; length: number };
}

export interface RenderOpts {
  sr?: number;
  /** only render these tracks (for mix analysis) */
  solo?: string[];
  /** render extra tail (checker uses this to verify the seam) */
  extraTail?: number;
  /** skip loudness normalization (mix analysis) */
  raw?: boolean;
}

/**
 * Render a song as a seamless loop. Layout of the returned buffer (L = song length, T = LOOP_TAIL):
 *   [0, L)     : pass 1 of the song (tails ring past L)
 *   [L, L+T)   : first T seconds of pass 2, summed with pass 1's tails
 * Playback: start at 0, loop [T, L+T). The jump L+T → T is seamless because both positions carry
 * the same content (song time T) and every note/effect tail from the previous pass has died out.
 * Yields progress (0..1) periodically so callers can time-slice.
 */
export function* renderSong(song: Song, opts: RenderOpts = {}): Generator<number, RenderedSong, void> {
  const sr = opts.sr ?? MUSIC_SR;
  const comp = compileSong(song);
  // whole number of samples so pass 2 lands on exactly the same sample grid as pass 1
  const L = Math.round(comp.length * sr) / sr;
  const T = LOOP_TAIL + (opts.extraTail ?? 0);
  const N = Math.ceil((L + T) * sr);
  const outL = new Float32Array(N);
  const outR = new Float32Array(N);
  const rev = new Float32Array(N);
  const ech = new Float32Array(N);
  let scratch = new Float32Array(sr * 3);

  const evs = comp.events.filter((e) => !opts.solo || opts.solo.includes(e.track));
  const all = [...evs, ...evs.filter((e) => e.t < T).map((e) => ({ ...e, t: e.t + L }))];
  let n = 0;
  for (const e of all) {
    const tr = song.tracks[e.track];
    const inst = INSTRUMENTS[tr.inst];
    const voices = inst(e.midi, Math.min(1.2, e.vel), e.dur, e.seed);
    const pan = Math.max(-1, Math.min(1, tr.pan ?? 0));
    const ang = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(ang) * Math.SQRT2 * tr.vol;
    const gr = Math.sin(ang) * Math.SQRT2 * tr.vol;
    const sRev = (tr.rev ?? 0) * tr.vol;
    const sEch = (tr.echo ?? 0) * tr.vol;
    for (const v of voices) {
      const start = Math.round((e.t + (v.t ?? 0)) * sr);
      if (start >= N) continue;
      const len = Math.min(Math.ceil(v.len * sr), N - start);
      if (scratch.length < len) scratch = new Float32Array(len);
      scratch.fill(0, 0, len);
      const vv = v.seed === undefined ? { ...v, seed: e.seed } : v;
      const w = synth(vv, sr, scratch, 0, 1);
      for (let i = 0; i < w; i++) {
        const s = scratch[i];
        const j = start + i;
        outL[j] += s * gl;
        outR[j] += s * gr;
        if (sRev) rev[j] += s * sRev;
        if (sEch) ech[j] += s * sEch;
      }
    }
    if (++n % 48 === 0) yield (0.85 * n) / all.length;
  }
  if (song.fx.echo) echo(ech, outL, outR, sr, song.fx.echo * (60 / song.bpm), song.fx.fb ?? 0.35, song.fx.echoWet ?? 1);
  yield 0.88;
  reverb(rev, outL, outR, sr, song.fx.rev, song.fx.damp ?? 0.4, song.fx.revWet ?? 1);
  yield 0.96;
  dcBlock(outL, sr);
  dcBlock(outR, sr);

  const s0 = Math.floor(T * sr);
  const rms = rmsOf([outL, outR], s0, Math.min(N, s0 + Math.floor(L * sr)));
  const peakPre = peakOf(outL, outR);
  let limited = 0;
  if (!opts.raw && rms > 0) {
    let g = MUSIC_RMS / rms;
    // never push peaks more than ~2.5 dB into the soft limiter
    g = Math.min(g, (PEAK_CEIL * 1.35) / peakPre);
    scale([outL, outR], g);
    limited = softLimit([outL, outR], PEAK_CEIL * 0.8, PEAK_CEIL);
  }
  return {
    sr, L: outL, R: outR, loopStart: T - (opts.extraTail ?? 0), loopEnd: L + T - (opts.extraTail ?? 0),
    stats: { rms: rmsOf([outL, outR], s0, Math.min(N, s0 + Math.floor(L * sr))), peakPre, limited, events: all.length, length: L },
  };
}

/** Run a render generator to completion synchronously. */
export function runSync<T>(gen: Generator<number, T, void>): T {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}
