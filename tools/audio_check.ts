// Audio verification: validates SFX / music definitions, analyses harmony, renders everything
// offline with the real synth code (src/audio/dsp.ts is pure JS) and checks levels, NaNs, loop seams.
//
// Usage: npx tsx tools/audio_check.ts [--no-wav] [--mix] [--only name,name] [--fast]
//   writes WAVs to tools/out/audio/ (listen to them!)
//   --mix   : per-track loudness table for each song (mixing aid)
//   --fast  : skip music rendering (definitions + harmony + sfx only)
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SFX, SFX_NAMES, renderSfx, SFX_PEAK } from '../src/audio/sfx';
import { SONGS, MUSIC_TRACKS } from '../src/audio/songs';
import {
  compileSong, renderSong, runSync, parseChords, SCALES, pcOf, LOOP_TAIL, type Song, type NoteEvent,
} from '../src/audio/sequencer';

const args = process.argv.slice(2);
const WAV = !args.includes('--no-wav');
const MIX = args.includes('--mix');
const FAST = args.includes('--fast');
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1].split(',') : null;
const OUT = resolve('tools/out/audio');
if (WAV) mkdirSync(OUT, { recursive: true });

let errors = 0;
let warnings = 0;
const err = (m: string) => { errors++; console.log(`  ✗ ${m}`); };
const warn = (m: string) => { warnings++; console.log(`  ! ${m}`); };
const db = (x: number) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');

function wav(path: string, chans: Float32Array[], sr: number): void {
  const n = chans[0].length;
  const nc = chans.length;
  const buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i]));
    buf.writeInt16LE(Math.round(s * 32767), o);
    o += 2;
  }
  writeFileSync(path, buf);
}

function weightedRms(c: Float32Array, sr: number): number {
  const r = Math.exp((-2 * Math.PI * 150) / sr);
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0, sum = 0;
  for (let i = 0; i < c.length; i++) {
    const y = c[i] - x1 + r * y1;
    x1 = c[i]; y1 = y;
    const z = y - x2 + r * y2;
    x2 = y; y2 = z;
    sum += z * z;
  }
  return Math.sqrt(sum / c.length);
}

function badSamples(c: Float32Array): number {
  let bad = 0;
  for (let i = 0; i < c.length; i++) if (!Number.isFinite(c[i])) bad++;
  return bad;
}

// ---------------------------------------------------------------------------------------------
// 1. contract completeness
const CONTRACT_SFX = ['click', 'hover', 'buy', 'coin', 'cash', 'collect', 'plant', 'no_water', 'well_refill',
  'drop_animal', 'chicken', 'sheep', 'ostrich', 'cow', 'product_pop', 'workshop_start', 'workshop_done',
  'build', 'upgrade', 'error', 'predator_land', 'bear_roar', 'lion_roar', 'polar_roar', 'hit', 'cage',
  'cage_break', 'animal_die', 'truck_go', 'truck_back', 'heli', 'delivery', 'goal', 'win', 'medal',
  'star', 'full', 'bark', 'meow', 'page', 'pause', 'expire', 'tick'];
const CONTRACT_MUSIC = ['title', 'map', 'meadow', 'savanna', 'arctic', 'shop'];

console.log('== contract');
for (const n of CONTRACT_SFX) if (!(n in SFX)) err(`missing sfx '${n}'`);
for (const n of SFX_NAMES) if (!CONTRACT_SFX.includes(n)) err(`unexpected sfx '${n}'`);
for (const n of CONTRACT_MUSIC) if (!(n in SONGS)) err(`missing music '${n}'`);
for (const n of MUSIC_TRACKS) if (!CONTRACT_MUSIC.includes(n)) err(`unexpected music '${n}'`);
console.log(`  ${SFX_NAMES.length} sfx, ${MUSIC_TRACKS.length} music tracks`);

// ---------------------------------------------------------------------------------------------
// 2. songs: structure + harmony
const RANGES: Record<string, [number, number]> = {
  notes: [55, 100], harmony: [50, 96], bass: [28, 60], arp: [48, 100], chord: [45, 84], drum: [0, 127],
};

function analyseHarmony(song: Song, events: NoteEvent[]): void {
  const keyPc = pcOf(song.key);
  const scalePcs = SCALES[song.scale].map((i) => (keyPc + i) % 12);
  const barDur = (60 / song.bpm) * song.beats;
  // chord lookup by absolute time
  const tl: { t0: number; t1: number; pcs: number[]; name: string }[] = [];
  let t = 0;
  for (const s of song.order) {
    const chords = parseChords(song.sections[s].chords, s);
    for (const c of chords) tl.push({ t0: t + c.start * barDur, t1: t + c.end * barDur, pcs: c.chord.pcs, name: c.chord.name });
    t += Math.round(chords[chords.length - 1].end) * barDur;
  }
  const chordAt = (x: number) => tl.find((c) => x >= c.t0 - 0.02 && x < c.t1 - 0.02) ?? tl[tl.length - 1];

  for (const [name, tr] of Object.entries(song.tracks)) {
    const evs = events.filter((e) => e.track === name);
    if (!evs.length) { warn(`track '${name}' never plays`); continue; }
    const [lo, hi] = RANGES[tr.mode];
    for (const e of evs) if (e.midi < lo || e.midi > hi) err(`${name}: note ${e.midi} out of range ${lo}-${hi} (${e.where})`);
    if (tr.mode !== 'notes' && tr.mode !== 'harmony') continue;
    let strong = 0;
    let strongCt = 0;
    const offenders: string[] = [];
    const outOfScale: string[] = [];
    for (const e of evs) {
      const pc = e.midi % 12;
      const ch = chordAt(e.barPos * barDur + 0.001);
      const isStrong = song.beats === 3 ? e.beat < 0.01 : Math.abs(e.beat) < 0.01 || Math.abs(e.beat - 2) < 0.01;
      if (isStrong) {
        strong++;
        if (ch.pcs.includes(pc)) strongCt++;
        else offenders.push(`${e.where} beat ${e.beat + 1}: midi ${e.midi} over ${ch.name}`);
      }
      if (!scalePcs.includes(pc) && !ch.pcs.includes(pc)) outOfScale.push(`${e.where}: midi ${e.midi} over ${ch.name}`);
    }
    const pct = strong ? (100 * strongCt) / strong : 100;
    console.log(`  ${name.padEnd(8)} ${String(evs.length).padStart(4)} notes, strong-beat chord tones ${pct.toFixed(0)}%`);
    if (pct < 85) warn(`${name}: only ${pct.toFixed(0)}% chord tones on strong beats`);
    for (const o of offenders.slice(0, 6)) console.log(`      non-chord strong beat: ${o}`);
    for (const o of outOfScale.slice(0, 6)) err(`${name}: out-of-scale note ${o}`);
  }
  // clashes: simultaneous notes a minor 2nd / minor 9th apart between melodic tracks on strong beats
  const mel = events.filter((e) => ['notes', 'harmony'].includes(song.tracks[e.track].mode));
  let clashes = 0;
  for (const a of mel) for (const b of mel) {
    if (a === b || a.track >= b.track) continue;
    if (Math.min(a.t + a.dur, b.t + b.dur) - Math.max(a.t, b.t) < 0.05) continue;
    const iv = Math.abs(a.midi - b.midi) % 12;
    if (iv === 1 || iv === 11) clashes++;
  }
  if (clashes) warn(`${clashes} overlapping semitone clashes between melodic tracks`);
}

const songsToCheck = MUSIC_TRACKS.filter((n) => !ONLY || ONLY.includes(n));
for (const name of songsToCheck) {
  const song = SONGS[name];
  console.log(`\n== music '${name}'  (${song.bpm} BPM, ${song.beats}/4, key ${song.key} ${song.scale})`);
  let comp;
  try {
    comp = compileSong(song);
  } catch (e) {
    err((e as Error).message);
    continue;
  }
  console.log(`  ${comp.bars} bars, ${comp.length.toFixed(1)} s, ${comp.events.length} events, order ${song.order.join(' ')}`);
  if (comp.length < 45) err(`too short (${comp.length.toFixed(1)} s < 45 s)`);
  if (comp.length > 110) warn(`long (${comp.length.toFixed(1)} s)`);
  for (const [tn, tr] of Object.entries(song.tracks)) if (tr.mode === 'harmony' && !(tr.of && song.tracks[tr.of])) err(`harmony track ${tn} has bad source`);
  analyseHarmony(song, comp.events);

  if (FAST) continue;
  const t0 = performance.now();
  const r = runSync(renderSong(song, { extraTail: 1 }));
  const ms = performance.now() - t0;
  const bad = badSamples(r.L) + badSamples(r.R);
  if (bad) err(`${bad} NaN/Inf samples`);
  const peak = Math.max(...[r.L, r.R].map((c) => c.reduce((m, x) => Math.max(m, Math.abs(x)), 0)));
  console.log(`  render ${ms.toFixed(0)} ms @ ${r.sr} Hz; RMS ${db(r.stats.rms)} dBFS, peak ${db(peak)} dBFS, ` +
    `limited ${(100 * r.stats.limited / (r.L.length * 2)).toFixed(3)}% samples`);
  if (peak > 0.75) err(`peak ${db(peak)} dBFS above -2.5 dBFS`);
  // seam: content at loopEnd.. (pass-2 continuation) must equal content at loopStart..
  const a0 = Math.round(r.loopStart * r.sr);
  const b0 = Math.round(r.loopEnd * r.sr);
  const span = Math.round(0.9 * r.sr);
  let diff = 0;
  let ref = 0;
  for (let i = 0; i < span; i++) {
    for (const c of [r.L, r.R]) {
      diff = Math.max(diff, Math.abs(c[a0 + i] - c[b0 + i]));
      ref = Math.max(ref, Math.abs(c[a0 + i]));
    }
  }
  const seamDb = 20 * Math.log10((diff + 1e-9) / (ref + 1e-9));
  console.log(`  loop seam: max deviation ${seamDb.toFixed(1)} dB relative to signal (loop ${r.loopStart.toFixed(2)}–${r.loopEnd.toFixed(2)} s)`);
  if (seamDb > -40) err(`loop seam not clean (${seamDb.toFixed(1)} dB)`);
  if (WAV) {
    // write two loops so the seam can be auditioned: [0, loopEnd) + [loopStart, loopStart + 12s)
    const extra = Math.round(12 * r.sr);
    const n = b0 + extra;
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    L.set(r.L.subarray(0, b0)); R.set(r.R.subarray(0, b0));
    L.set(r.L.subarray(a0, a0 + extra), b0); R.set(r.R.subarray(a0, a0 + extra), b0);
    wav(`${OUT}/music_${name}.wav`, [L, R], r.sr);
  }
  if (MIX) {
    console.log('  mix (solo loudness rel. full mix: raw RMS | weighted = 12 dB/oct HP @150 Hz, ~ear on small speakers):');
    const full = runSync(renderSong(song, { raw: true }));
    const tot = full.stats.rms;
    const totW = weightedRms(full.L, full.sr);
    for (const tn of Object.keys(song.tracks)) {
      const s = runSync(renderSong(song, { raw: true, solo: [tn] }));
      console.log(`    ${tn.padEnd(8)} ${db(s.stats.rms / tot).padStart(6)} dB | ${db(weightedRms(s.L, s.sr) / totW).padStart(6)} dB`);
    }
  }
}
void LOOP_TAIL;

// ---------------------------------------------------------------------------------------------
// 3. SFX
console.log('\n== sfx');
for (const name of SFX_NAMES) {
  if (ONLY && !ONLY.includes(name)) continue;
  const def = SFX[name];
  let buf: Float32Array;
  try {
    buf = renderSfx(name);
  } catch (e) {
    err(`${name}: ${(e as Error).message}`);
    continue;
  }
  const bad = badSamples(buf);
  let peak = 0;
  let sq = 0;
  for (const x of buf) { peak = Math.max(peak, Math.abs(x)); sq += x * x; }
  const rms = Math.sqrt(sq / buf.length);
  const tailAbs = Math.max(...Array.from(buf.subarray(buf.length - 8)).map(Math.abs));
  const headAbs = Math.abs(buf[0]);
  const eff = rms * def.gain;
  console.log(`  ${name.padEnd(15)} ${(buf.length / 44100).toFixed(2)} s  peak ${db(peak)}  rms ${db(rms).padStart(5)}  ` +
    `at gain ${def.gain.toFixed(2)} → ${db(eff).padStart(5)} dBFS rms`);
  if (bad) err(`${name}: ${bad} NaN/Inf samples`);
  if (Math.abs(peak - SFX_PEAK) > 0.01) err(`${name}: peak ${peak.toFixed(3)} != ${SFX_PEAK}`);
  if (tailAbs > 0.01 || headAbs > 0.01) err(`${name}: does not start/end at silence (head ${headAbs.toFixed(3)}, tail ${tailAbs.toFixed(3)})`);
  if (buf.length / 44100 > 4) warn(`${name}: long (${(buf.length / 44100).toFixed(1)} s)`);
  if (WAV) wav(`${OUT}/sfx_${name}.wav`, [buf], 44100);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)${WAV ? `; WAVs in ${OUT}` : ''}`);
process.exit(errors ? 1 : 0);
