// Dev-only audio preview page: `npm run dev`, then open /src/audio/preview.html
import { audio, type MusicTrack } from './index';
import { SFX_NAMES } from './sfx';
import { MUSIC_TRACKS } from './songs';

const $ = (id: string) => document.getElementById(id)!;
const status = $('status');

function button(parent: HTMLElement, label: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => {
    audio.unlock();
    onClick(b);
  };
  parent.appendChild(b);
  return b;
}

const musicButtons: HTMLButtonElement[] = [];
for (const t of [...MUSIC_TRACKS, null] as (MusicTrack | null)[]) {
  musicButtons.push(button($('music'), t ?? 'stop', (b) => {
    const t0 = performance.now();
    audio.music(t);
    musicButtons.forEach((x) => x.classList.toggle('on', x === b && t !== null));
    status.textContent = t ? `requested '${t}' (rendering on first request…) ${Math.round(performance.now() - t0)} ms` : 'music stopped';
  }));
}
for (const n of SFX_NAMES) button($('sfx'), n, () => audio.sfx(n));

($('mv') as HTMLInputElement).oninput = (e) => { audio.musicVolume = +(e.target as HTMLInputElement).value; };
($('sv') as HTMLInputElement).oninput = (e) => { audio.sfxVolume = +(e.target as HTMLInputElement).value; };
