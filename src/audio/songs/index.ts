import type { MusicTrack } from '../index';
import type { Song } from '../sequencer';
import { title } from './title';
import { map } from './map';
import { meadow } from './meadow';
import { savanna } from './savanna';
import { arctic } from './arctic';
import { shop } from './shop';

export const SONGS: Record<MusicTrack, Song> = { title, map, meadow, savanna, arctic, shop };
export const MUSIC_TRACKS = Object.keys(SONGS) as MusicTrack[];
