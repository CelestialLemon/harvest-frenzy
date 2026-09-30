// Web Worker: renders music tracks off the main thread and transfers the sample data back.
import { SONGS } from './songs';
import { renderSong, runSync, MUSIC_SR } from './sequencer';
import type { MusicTrack } from './index';

export interface RenderRequest { id: number; track: MusicTrack }
export type RenderResponse =
  | { id: number; ok: true; sr: number; L: Float32Array; R: Float32Array; loopStart: number; loopEnd: number }
  | { id: number; ok: false; error: string };

const post = (msg: RenderResponse, transfer: Transferable[] = []) =>
  (self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage(msg, transfer);

self.onmessage = (ev: MessageEvent<RenderRequest>) => {
  const { id, track } = ev.data;
  try {
    const r = runSync(renderSong(SONGS[track], { sr: MUSIC_SR }));
    post({ id, ok: true, sr: r.sr, L: r.L, R: r.R, loopStart: r.loopStart, loopEnd: r.loopEnd }, [r.L.buffer, r.R.buffer]);
  } catch (e) {
    post({ id, ok: false, error: String(e) });
  }
};
