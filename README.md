# Harvest Frenzy

A pixel-art farming time-management game for the browser, inspired by **Farm Frenzy 3** (Melesta / Alawar).

Plant grass, raise chickens, sheep, ostriches and cows, turn their products into cookies, cakes, shirts, hats,
pillows, cheese and ice cream, sell them in town with your truck, and keep bears, lions and polar bears away from
your herd. 30 levels over three regions, with gold/silver/bronze medals and a star-powered upgrade shop.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Dev URL shortcuts: `?level=12` jumps straight into a level, `?map` opens the map.

## How to play

| Action | How |
|---|---|
| Plant grass | Click empty ground in the fenced field (uses 1 bucket of water) |
| Refill the well | Click the well ($20) |
| Buy animals / pets | Bottom bar buttons |
| Collect products | Click them before they vanish — they fly into the warehouse |
| Build / use workshops | Click an empty lot to build; click a workshop to process goods; the ↑ badge upgrades it |
| Sell goods | Click the truck or the warehouse, load goods, press **Go!** |
| Buy supplies | Click the helicopter (flour, buttons) |
| Predators | Click them repeatedly to cage them, click the cage to store it, then sell it |
| Pause | `Esc` / `P` or the pause button |

Medals depend on how fast you complete all goals. Medals give stars, spent in the **Upgrade Shop** on
permanent improvements (bigger well, warehouse, truck, helicopter, stronger cages).

## Tech

- Vite + TypeScript, Canvas 2D at a fixed 640×360 internal resolution, scaled with nearest-neighbour.
- **No asset files**: every sprite is pixel art defined in code (`src/art/`, string grids + procedural drawing on
  the Resurrect 64 palette); all music and sound effects are synthesized with WebAudio (`src/audio/`).
- `src/game/game.ts` is a DOM-free simulation, so levels can be balanced headlessly.

## Tools

```bash
npx tsx tools/preview.ts src/art/sprites/creatures.ts --scale 4   # sprite contact sheet -> tools/out/*.png
npx tsx tools/bot.ts 1-30 --runs 5                                # balance bot: plays every level, reports times vs medal targets
npx tsx tools/shot.ts '[{"wait":1500},{"shot":"title"}]'          # headless Chrome screenshot driver
```

See `docs/DESIGN.md` for the full design, content tables and art contract.
