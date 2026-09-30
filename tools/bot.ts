// Headless balance bot: plays levels through the Game simulation with a limited click rate.
// Usage: npx tsx tools/bot.ts [levels e.g. 1-10] [--runs 5] [--apm 120] [--stars auto|N] [--nopets] [--verbose] [--json]
import { Game, type GroundItem } from '../src/game/game';
import { LEVELS } from '../src/game/levelList';
import { ANIMALS, ITEMS, PETS, UPGRADES, WORKSHOPS, WORKSHOP_LEVELS, type AnimalId, type ItemId, type UpgradeId, type Upgrades } from '../src/game/data';
import { FIELD } from '../src/game/layout';

const args = process.argv.slice(2);
let range = [1, LEVELS.length];
let runs = 5, apm = 130, starsArg = 'auto', verbose = false, json = false, pets = true;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--runs') runs = +args[++i];
  else if (a === '--apm') apm = +args[++i];
  else if (a === '--stars') starsArg = args[++i];
  else if (a === '--verbose') verbose = true;
  else if (a === '--json') json = true;
  else if (a === '--nopets') pets = false;
  else if (/^\d+(-\d+)?$/.test(a)) { const [x, y] = a.split('-').map(Number); range = [x, y ?? x]; }
}

const ORDER: UpgradeId[] = ['warehouse', 'truck', 'well', 'cage', 'heli', 'warehouse', 'truck', 'well', 'cage', 'heli', 'warehouse', 'truck', 'well', 'cage'];
function upgradesFor(stars: number): Upgrades {
  const u: Upgrades = { well: 0, warehouse: 0, truck: 0, heli: 0, cage: 0 };
  for (const id of ORDER) {
    const cost = UPGRADES[id].costs[u[id]];
    if (cost === undefined || cost > stars) break;
    stars -= cost;
    u[id]++;
  }
  return u;
}

function runLevel(idx: number, up: Upgrades) {
  const lv = LEVELS[idx];
  const g = new Game(lv, up);
  const dt = 0.05;
  const actionGap = 60 / apm;
  let cd = 1.5; // time to read the intro
  const wsDefs = g.workshops.map((w) => WORKSHOPS[w.kind]);
  const inputs = new Set<ItemId>();
  for (const d of wsDefs) for (const k of Object.keys(d.inputs) as ItemId[]) inputs.add(k);
  const goalAnimals = new Map<AnimalId, number>();
  for (const gl of lv.goals) if (gl.kind === 'animals') goalAnimals.set(gl.animal, gl.n);

  const goalNeeds = () => {
    const need = new Set<ItemId>();
    const add = (id: ItemId) => {
      if (need.has(id)) return;
      need.add(id);
      for (const d of wsDefs) if (d.output === id) for (const k of Object.keys(d.inputs) as ItemId[]) add(k);
    };
    for (const gs of g.goals) if (!gs.done && gs.goal.kind === 'collect') add(gs.goal.item);
    for (const gs of g.goals) if (!gs.done && gs.goal.kind === 'money') for (const d of wsDefs) add(d.output);
    return need;
  };
  const act = (): boolean => {
    const need = goalNeeds();
    const cands: { score: number; run: () => boolean }[] = [];
    const add = (score: number, run: () => boolean) => cands.push({ score, run });
    const space = g.storeCap - g.storeUsed;
    const living = g.animals.filter((a) => a.state !== 'fall');

    // predators
    const free = g.predators.find((p) => p.state === 'prowl' || p.state === 'attack' || p.state === 'land');
    if (free) add(100, () => { g.hitPredator(free); return true; });
    const caged = g.predators.find((p) => p.state === 'caged');
    if (caged && space >= 5) add(caged.cageT < 5 ? 95 : 60, () => g.storeCage(caged));

    // feeding: hungry animals without grass nearby
    const grassNear = (x: number, y: number, r: number) => {
      for (let i = 0; i < g.grass.length; i++) {
        if (!g.grass[i]) continue;
        const [cx, cy] = g.cellCenter(i);
        if (Math.abs(cx - x) + Math.abs(cy - y) < r) return true;
      }
      return false;
    };
    const hungry = living.filter((a) => a.food < 0.45 && !grassNear(a.x, a.y, 50)).sort((a, b) => b.starve - a.starve);
    if (hungry.length) {
      const a = hungry[0];
      const urg = 75 + Math.min(20, a.starve * 2);
      if (g.water > 0) add(urg, () => g.plant(Math.max(FIELD.x + 16, Math.min(FIELD.x + FIELD.w - 16, a.x)), Math.max(FIELD.y + 16, Math.min(FIELD.y + FIELD.h - 16, a.y))));
      else if (g.wellRefillT <= 0 && g.money >= 20) add(urg + 1, () => g.refillWell());
    }
    if (g.water === 0 && g.wellRefillT <= 0 && g.money >= 20) add(45, () => g.refillWell());
    // general grass supply
    let grassTotal = 0;
    for (let i = 0; i < g.grass.length; i++) grassTotal += g.grass[i];
    if (g.water > 0 && living.length && grassTotal < 9 * living.length) {
      const a = living[Math.floor(Math.random() * living.length)];
      const x = Math.max(FIELD.x + 16, Math.min(FIELD.x + FIELD.w - 16, a.x + (Math.random() - 0.5) * 30));
      const y = Math.max(FIELD.y + 16, Math.min(FIELD.y + FIELD.h - 16, a.y + (Math.random() - 0.5) * 20));
      if (g.grass[g.cellAt(x, y)] < 2) add(grassTotal < 4 * living.length ? 70 : 42, () => g.plant(x, y));
    }

    // collecting
    if (space > 0 && g.items.length) {
      // value an item: goal chain items and pricey goods matter; surplus cheap raw goods can be left to rot
      const worth = (i: GroundItem) => (need.has(i.item) ? 2 : 0) + (ITEMS[i.item].price >= 50 ? 1 : 0);
      const it = [...g.items].filter((i) => i.z < 2 && ITEMS[i.item].size <= space)
        .sort((a, b) => worth(b) - worth(a) || (a.life - a.age) - (b.life - b.age))[0] as GroundItem | undefined;
      if (it) {
        const left = it.life - it.age;
        const w = worth(it);
        const base = w >= 2 ? 50 : w === 1 ? 46 : 34;
        add(left < 6 && w ? base + 28 : base + Math.min(15, g.items.length), () => {
          const near = g.items.filter((o) => o !== it && o.z < 2 && Math.hypot(o.x - it.x, o.y - it.y) < 9).slice(0, 2);
          for (const o of [it, ...near]) if (!g.collectItem(o, true)) break;
          return true;
        });
      }
    }

    // workshops
    for (const w of g.workshops) {
      if (!w.built || w.buildT > 0) continue;
      if (w.queue >= WORKSHOP_LEVELS[w.level].queue || g.workshopMissing(w).length) continue;
      const out = WORKSHOPS[w.kind].output;
      const useful = need.has(out);
      const eatsNeeded = (Object.keys(WORKSHOPS[w.kind].inputs) as ItemId[]).some((k) => need.has(k) && g.count(k) < 3);
      if (!useful && eatsNeeded) continue;
      const direct = g.goals.some((x) => !x.done && x.goal.kind === 'collect' && x.goal.item === out);
      add((direct ? 80 : useful ? 68 : 38) - w.queue * 10, () => g.activateWorkshop(w));
    }
    const unbuilt = g.workshops.filter((w) => !w.built).sort((a, b) => +need.has(WORKSHOPS[b.kind].output) - +need.has(WORKSHOPS[a.kind].output) || WORKSHOPS[a.kind].cost - WORKSHOPS[b.kind].cost)[0];
    if (unbuilt && g.money >= WORKSHOPS[unbuilt.kind].cost + 100) add(need.has(WORKSHOPS[unbuilt.kind].output) ? 72 : 45, () => g.activateWorkshop(unbuilt));

    // helicopter supplies
    if (g.heli.state === 'home' && lv.buy?.length) {
      const needBuy = lv.buy.filter((id) => g.count(id) < 2 && g.workshops.some((w) => w.built && WORKSHOPS[w.kind].inputs[id]));
      if (needBuy.length) add(needBuy.some((id) => g.count(id) === 0) ? 70 : 58, () => {
        const order: Partial<Record<ItemId, number>> = {};
        const per = Math.floor(g.heliCap / needBuy.length);
        let cost = 0;
        for (const id of needBuy) {
          const n = Math.max(0, Math.min(per, Math.floor((g.money - cost - 50) / (ITEMS[id].buy ?? 1))));
          if (n > 0) { order[id] = n; cost += n * (ITEMS[id].buy ?? 0); }
        }
        return Object.keys(order).length > 0 && g.orderHeli(order);
      });
    }

    // animals
    const defaults: Record<AnimalId, number> = { chicken: 8, sheep: 5, ostrich: 3, cow: 3 };
    // save up for goal animals still to buy before spending on extras
    const savingFor = [...goalAnimals].filter(([k, n]) => g.livingAnimals(k) < n).reduce((m, [k]) => Math.max(m, ANIMALS[k].cost), 0);
    const reserveForBuild = Math.max(unbuilt ? WORKSHOPS[unbuilt.kind].cost : 0, savingFor);
    for (const k of [...lv.animals].sort((a, b) => ANIMALS[b].cost - ANIMALS[a].cost)) {
      const goalN = goalAnimals.get(k) ?? 0;
      const goalOpen = goalN > 0 && !g.goals.find((x) => x.goal.kind === 'animals' && x.goal.animal === k)?.done;
      const target = Math.max(goalN, defaults[k]);
      if (g.livingAnimals(k) >= target) continue;
      const supplier = need.has(ANIMALS[k].product) && g.livingAnimals(k) < 2;
      if ((goalOpen || supplier) && g.money >= ANIMALS[k].cost) add(supplier && g.livingAnimals(k) === 0 ? 82 : 66, () => g.buyAnimal(k));
      else if (g.money >= ANIMALS[k].cost + reserveForBuild && hungry.length === 0) add(40, () => g.buyAnimal(k));
    }

    // pets: a cat once products pile up, a dog on predator-heavy farms
    if (pets && lv.pets?.includes('cat') && !g.pets.some((p) => p.kind === 'cat') && g.items.length >= 4 && g.money >= PETS.cat.cost + reserveForBuild + 200) add(64, () => g.buyPet('cat'));
    if (pets && lv.pets?.includes('dog') && !g.pets.some((p) => p.kind === 'dog') && (lv.predators?.length ?? 0) >= 3 && g.money >= PETS.dog.cost + reserveForBuild + 200) add(56, () => g.buyPet('dog'));

    // truck
    if (g.truck.state === 'home') {
      const cargo: Partial<Record<ItemId, number>> = {};
      let units = 0, value = 0;
      const tight = space < 4;
      const sellable = (Object.entries(g.store) as [ItemId, number][])
        .map(([id, n]) => [id, inputs.has(id) ? Math.max(0, n - (tight ? 2 : need.has(id) ? 8 : 3)) : n] as [ItemId, number])
        .filter(([, n]) => n > 0)
        .sort((a, b) => ITEMS[b[0]].price - ITEMS[a[0]].price);
      for (const [id, n] of sellable) {
        const k = Math.min(n, Math.floor((g.truckCap - units) / ITEMS[id].size));
        if (k > 0) { cargo[id] = k; units += k * ITEMS[id].size; value += k * ITEMS[id].price; }
      }
      const moneyGoal = lv.goals.find((x) => x.kind === 'money');
      const needCash = (moneyGoal && g.money < moneyGoal.n) || (unbuilt && g.money < WORKSHOPS[unbuilt.kind].cost) || g.money < 300;
      if (units > 0) {
        if (tight && g.items.length) add(85, () => g.sendTruck(cargo));
        else if (g.storeUsed >= g.storeCap * 0.6 || units >= g.truckCap * 0.7) add(52, () => g.sendTruck(cargo));
        else if (needCash && value >= 60) add(44, () => g.sendTruck(cargo));
      }
    }

    // upgrades when rich
    for (const w of g.workshops) {
      const c = g.upgradeCost(w);
      if (w.built && c && w.queue >= WORKSHOP_LEVELS[w.level].queue && g.money > c * 3) add(30, () => g.upgradeWorkshop(w));
    }

    cands.sort((a, b) => b.score - a.score);
    for (const c of cands) if (c.run()) return true;
    return false;
  };

  let t = 0, fullT = 0, busyT = 0, acts = 0;
  const goalAt: number[] = lv.goals.map(() => Infinity);
  while (!g.won && t < 1500) {
    g.update(dt);
    t += dt;
    cd -= dt;
    if (g.storeUsed >= g.storeCap - 1) fullT += dt;
    if (cd <= 0) {
      if (act()) { cd = actionGap * (0.8 + Math.random() * 0.4); acts++; busyT += cd; }
    }
    g.goals.forEach((x, i) => { if (x.done && !isFinite(goalAt[i])) goalAt[i] = t; });
    g.drain();
  }
  if (verbose) {
    const gs = g.goals.map((x) => `${x.goal.kind}:${'item' in x.goal ? x.goal.item : 'animal' in x.goal ? x.goal.animal : ''}=${x.progress}/${x.goal.n}`).join(' ');
    const an = lv.animals.map((k) => `${k}:${g.livingAnimals(k)}`).join(' ');
    console.log(`   L${lv.id} t=${Math.round(t)} won=${g.won} $${Math.round(g.money)} | ${gs} | ${an} | store ${g.storeUsed}/${g.storeCap} ${JSON.stringify(g.store)} | ws ${g.workshops.map((w) => w.kind + (w.built ? 'B' : '-') + w.level).join(',')}`);
  }
  return {
    won: g.won, time: g.won ? g.wonAt : Infinity, lost: g.stats.lostAnimals, expired: g.stats.expired, caught: g.stats.caught, money: g.money,
    produced: g.stats.produced, full: fullT / t, busy: Math.min(1, busyT / t), goalAt,
  };
}

const medians: Record<number, number> = {};
console.log(`apm=${apm} runs=${runs}`);
console.log('lvl  up(W/T/w/c/h)   median  min   max   | gold silver | lost exp/prod full busy | goal times | verdict');
for (let L = range[0]; L <= range[1]; L++) {
  const idx = L - 1;
  const stars = starsArg === 'auto' ? Math.round(idx * 2.2) : +starsArg;
  const up = upgradesFor(stars);
  const res = Array.from({ length: runs }, () => runLevel(idx, up)).sort((a, b) => a.time - b.time);
  const med = res[Math.floor(runs / 2)];
  medians[L] = med.time;
  const lv = LEVELS[idx];
  const f = (x: number) => (isFinite(x) ? String(Math.round(x)).padStart(5) : '  DNF');
  const verdict = med.time <= lv.gold ? 'EASY(gold)' : med.time <= lv.silver ? 'ok(silver)' : isFinite(med.time) ? 'HARD' : 'FAIL';
  console.log(`${String(L).padStart(3)}  ${up.warehouse}/${up.truck}/${up.well}/${up.cage}/${up.heli}         ${f(med.time)} ${f(res[0].time)} ${f(res[runs - 1].time)} | ${String(lv.gold).padStart(4)} ${String(lv.silver).padStart(5)} | ${String(med.lost).padStart(4)} ${String(med.expired).padStart(3)}/${String(med.produced).padEnd(4)} ${String(Math.round(med.full * 100)).padStart(3)}% ${String(Math.round(med.busy * 100)).padStart(3)}% | ${med.goalAt.map((x) => (isFinite(x) ? Math.round(x) : '-')).join('/')} | ${verdict}${verbose ? ' ' + JSON.stringify(med) : ''}`);
}

if (json) console.log('JSON' + JSON.stringify(medians));
