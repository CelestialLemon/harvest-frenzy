// Persistent progress in localStorage.
import type { UpgradeId, Upgrades } from './data';

export interface SaveData {
  version: 1;
  medals: number[]; // per level index: 0 none, 1 bronze, 2 silver, 3 gold
  best: number[]; // best time per level (seconds), 0 = none
  stars: number; // unspent stars
  upgrades: Upgrades;
  music: number;
  sfx: number;
  seenIntro: Record<string, boolean>;
}

const KEY = 'harvest-frenzy-save-v1';

export function defaultSave(): SaveData {
  return {
    version: 1, medals: [], best: [], stars: 0,
    upgrades: { well: 0, warehouse: 0, truck: 0, heli: 0, cage: 0 },
    music: 0.5, sfx: 0.8, seenIntro: {},
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const d = { ...defaultSave(), ...JSON.parse(raw) } as SaveData;
    d.upgrades = { ...defaultSave().upgrades, ...d.upgrades };
    return d;
  } catch {
    return defaultSave();
  }
}

export function writeSave(d: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
}

export const save: SaveData = loadSave();
export const persist = () => writeSave(save);

/** Highest unlocked level index (0-based). */
export function unlockedUpTo(): number {
  let i = 0;
  while (save.medals[i] > 0) i++;
  return i;
}

export function totalStarsEarned(): number {
  return save.medals.reduce((a, b) => a + (b || 0), 0);
}

export function upgradeLevel(id: UpgradeId) { return save.upgrades[id]; }
