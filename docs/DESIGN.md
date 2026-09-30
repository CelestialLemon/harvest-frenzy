# Harvest Frenzy — Design & Asset Contract

A pixel-art time-management farming game inspired by *Farm Frenzy 3* (Melesta / Alawar).
Tech: Vite + TypeScript, Canvas 2D, WebAudio. No runtime asset files: all art is generated in code
from pixel grids / procedural draw functions; all audio is synthesized in code.

## 1. Core loop (what the player does)

1. Click empty field ground → plants a patch of grass (uses 1 bucket of water from the **well**).
2. Buy animals from the bottom bar (they drop into the field). Animals wander, eat grass, and
   periodically **produce** a product that drops on the ground.
3. Click products to collect them → they fly into the **warehouse** (limited capacity).
   Products left on the ground too long blink and vanish.
4. Build **workshops** on building sites (costs money). Click a workshop to process
   warehouse goods into more valuable goods (e.g. egg → egg powder → cookie → cake).
   Output drops on the ground in front of the workshop; collect it.
5. Click the **truck** (or warehouse) to load goods and send them to town to sell for cash.
6. Click the **helicopter pad** to buy supplies from town (flour, buttons) needed by some recipes.
7. **Predators** (bear / lion / polar bear) drop from the sky, kill animals and trample products.
   Click a predator repeatedly to trap it in a cage, click the cage to store it in the warehouse,
   then sell it via the truck. A **dog** chases predators away; a **cat** collects products.
8. Animals that stay hungry too long (no grass) die.
9. Each level has **goals** (collect N of product X, own N animals at once, have $X cash).
   Completing all goals ends the level. Medal by elapsed time: gold / silver / bronze.
10. Medals award **stars**, spent in the between-level **Upgrade Shop** on permanent upgrades
    (well, warehouse, truck, helicopter, cage).

## 2. Screen & layout

Internal resolution **640×360**, scaled up by CSS (integer when possible, `image-rendering: pixelated`).
Everything (including text) is drawn at 1:1 internal pixels.

```
y=0   ┌──────────────────────── HUD top bar (0..20): goals · level name · menu ──────────────────┐
      │ HELI PAD (20,24)   │ WELL(140,26) │ SLOT T1(214,26) │ T2(298,26) │ T3(382,26) │ SLOT R1(548,26) │
      │                    ├──────────────────────── FIELD ─────────────────────────┤             │
      │ WAREHOUSE (10,150) │   x 136..512, y 96..314 — grass is planted here        │ SLOT R2(548,112)│
      │                    │   animals / predators / products live here             │ SLOT R3(548,198)│
      │ TRUCK on road      │                                                        │ decor        │
y=320 └──────────── bottom bar (320..360): buy animals / pets · cash · timer+medals ─────────────┘
```

View: 3/4 top-down "diorama" (like Farm Frenzy): characters seen from the side with a slight top-down tilt,
buildings show front facade + roof. Light comes from the **top-left**. Shadows are drawn by the engine
(dark translucent ellipse under characters), so sprites should NOT include ground shadows unless noted.

## 3. Pixel art style guide (all art agents)

- Palette: **Resurrect 64** only (`src/art/palette.ts`, chars → colors). Use per-sprite `pal` overrides
  only for mapping extra chars to palette colors (never to off-palette hex, except fully custom UI alpha).
- Outlines: 1px dark outline around every character, item and building (`'0'` ink or a darker hue of the
  local color — "selective outlining" looks nicest: e.g. `'n'`/`'m'` on wood, `'f'` on greens).
- Chunky, readable silhouettes. Bright, saturated, cheerful — Farm Frenzy is cute and cartoony.
- 2–4 shades per material (highlight top-left, shadow bottom-right). Avoid pillow-shading and noise.
- Characters face **right** by default; the engine mirrors them for left.
- Animation frames must share the same canvas size and anchor; keep the body stable between frames.
- Default anchor is bottom-center (feet). Items/icons/UI use center or top-left anchors as specified.
- Sprite format: see `src/art/pixel.ts` — either `GridSprite` (string grids, one char per pixel, '.' transparent)
  or `DrawSprite` (procedural `draw(p: PixelCanvas, frame)` with helpers: rect, ellipse, poly, line, grid,
  dither, outline, innerOutline, blit...). Mixing is fine (draw() can call `p.grid(...)` for detail).
- Every sprite module exports `export const sprites: Record<string, SpriteDef> = {...}`.
- Preview: `npx tsx tools/preview.ts src/art/sprites/<module>.ts --scale 4 [--bg #hex] [--only name*]`
  writes `tools/out/<module>.png`. **Open the PNG with the Read tool and iterate until it looks great.**
  Check against the backgrounds the sprite will actually sit on (grass `#91db69`/`#1ebc73`, soil `#cd683d`,
  sand `#fbb954`, snow `#c7dcd0`, UI parchment `#fdcbb0`).

## 4. Content tables

### Regions
| id | name | levels | ground | predator | new stuff |
|----|------|--------|--------|----------|-----------|
| meadow | Green Valley | 1–10 | lush grass, flowers, oaks | bear | chicken, sheep; powder plant, bakery, cake shop, spinnery, loom, tailor |
| savanna | Sunny Savanna | 11–20 | sand/dry grass, acacias | lion | ostrich; pillow factory, hat shop |
| arctic | Frosty Peaks | 21–30 | snow, pines, ice | polar_bear | cow; creamery, cheese factory, ice cream factory |

### Animals
| id | cost | product | produce every (fed seconds) |
|----|------|---------|-----------------------------|
| chicken | $100 | egg | 8 |
| sheep | $1,000 | wool | 12 |
| ostrich | $4,000 | feather | 16 |
| cow | $6,000 | milk | 18 |

Pets: **cat** (collects products) $1,500 · **dog** (chases predators) $2,000.

### Products (sell price, warehouse units)
egg 10 · wool 60 · feather 300 · milk 400 · egg_powder 35 · flour (buy 20 / sell 10) · cookie 120 · cake 350 ·
yarn 150 · fabric 300 · buttons (buy 50 / sell 25) · shirt 650 · pillow 1200 · hat 2200 · cream 900 ·
cheese 2000 · ice_cream 1500 · caged bear 500 / lion 600 / polar bear 700 (5 units each).

### Workshops (build cost, recipe, seconds at level 1)
| id | name | build | recipe | time |
|----|------|-------|--------|------|
| powder_plant | Egg Powder Plant | 250 | egg → egg_powder | 4 |
| bakery | Bakery | 600 | egg_powder + flour → cookie | 6 |
| cake_shop | Cake Shop | 1500 | cookie ×2 → cake | 8 |
| spinnery | Spinnery | 800 | wool → yarn | 5 |
| loom | Weaving Loom | 1500 | yarn → fabric | 7 |
| tailor | Tailor | 2500 | fabric + buttons → shirt | 9 |
| pillow_factory | Pillow Factory | 4000 | feather + fabric → pillow | 10 |
| hat_shop | Hat Shop | 6000 | feather + shirt → hat | 12 |
| creamery | Creamery | 5000 | milk → cream | 8 |
| cheese_factory | Cheese Factory | 8000 | cream → cheese | 11 |
| ice_cream_factory | Ice Cream Factory | 7000 | cream + cookie → ice_cream | 10 |

In-level upgrades (money): workshop level 2 (x1.6 speed, queue 2) and 3 (x2.4 speed, queue 3).

## 5. Sprite contract (names, sizes, frames, anchors)

Unless stated: anchor = bottom-center. "fN" = N frames. All characters face right.

### Agent A — `src/art/sprites/creatures.ts` (animals, predators, pets, effects, grass)
| name | size | frames | notes |
|------|------|--------|-------|
| chicken_walk | 16×16 | f4 | white hen, red comb, yellow beak/legs |
| chicken_eat | 16×16 | f2 | pecking (head down) |
| sheep_walk | 24×20 | f4 | fluffy white/cream wool, dark face & legs |
| sheep_eat | 24×20 | f2 | grazing head down |
| ostrich_walk | 24×32 | f4 | black body, white wing/tail plumes, pink neck/legs |
| ostrich_eat | 24×32 | f2 | neck bent down |
| cow_walk | 32×26 | f4 | white with black patches, pink snout, small horns, bell optional |
| cow_eat | 32×26 | f2 | grazing |
| bear_walk | 32×28 | f4 | brown bear on all fours |
| bear_attack | 32×28 | f2 | rearing up / swiping, mouth open |
| bear_caged | 32×28 | f2 | sitting, grabbing/struggling (engine draws cage over it) |
| bear_fall | 32×28 | f1 | falling from the sky, limbs spread, surprised |
| lion_walk / lion_attack / lion_caged / lion_fall | 32×26 | f4/f2/f2/f1 | mane |
| polar_walk / polar_attack / polar_caged / polar_fall | 32×28 | f4/f2/f2/f1 | white/pale-blue bear |
| cat_walk | 16×14 | f4 | orange tabby |
| cat_idle | 16×14 | f2 | sitting, tail swish |
| dog_walk | 20×16 | f4 | brown/white farm dog |
| dog_bark | 20×16 | f2 | mouth open |
| dog_idle | 20×16 | f2 | sitting, tail wag |
| ghost | 12×14 | f2 | little angel spirit that floats up when an animal dies |
| parachute | 24×18 | f1 | anchor bottom-center; animals hang under it when dropped in |
| grass | 10×12 | f6 | anchor (5,11). frames = [stage1a, stage1b, stage2a, stage2b, stage3a, stage3b]; drawn per 8×8 field cell (cell bottom-center = anchor); stage3 = lush tuft; must tile nicely when dense |
| fx_puff | 16×16 | f5 | smoke/poof, anchor center (8,8) |
| fx_dust | 24×10 | f4 | landing dust cloud |
| fx_sparkle | 9×9 | f4 | anchor center |
| fx_hit | 13×13 | f3 | comic hit burst (clicking a predator), anchor center |
| fx_splash | 16×10 | f4 | water splash when planting grass |
| icon_hungry | 11×11 | f1 | thought bubble with grass blade (shown above hungry animal), anchor bottom-center |

### Agent B — `src/art/sprites/world.ts` (buildings, vehicles, terrain, decor). Anchor TOP-LEFT (ox:0, oy:0) for buildings & tiles.
| name | size | frames | notes |
|------|------|--------|-------|
| well | 56×64 | f4 | stone well with wooden roof & crank; f0 idle, f1–f3 cranking bucket (refill anim) |
| warehouse | 112×80 | f4 | barn/storehouse; frames = upgrade tiers 1..4 (bigger/fancier each tier) |
| truck | 56×32 | f4 | farm pickup truck facing LEFT; f0-f1 empty (wheel anim), f2-f3 loaded with crates |
| helicopter | 56×36 | f3 | small cargo helicopter facing LEFT, rotor animation |
| helipad | 56×24 | f1 | wooden/stone pad with H |
| build_site | 72×64 | f1 | empty dirt plot with stakes/rope and a small "for sale" sign board (engine writes the price) |
| powder_plant, bakery, cake_shop, spinnery, loom, tailor, pillow_factory, hat_shop, creamery, cheese_factory, ice_cream_factory | 72×64 each | f3 | f0 idle, f1-f2 working (smoke, spinning wheel, moving parts). Each must be visually distinct & communicate its product (sign with product icon). Base footprint touches bottom rows |
| cage | 36×32 | f2 | iron cage bars (front overlay, transparent interior); f1 = dented/breaking |
| ground_meadow / ground_savanna / ground_arctic | 16×16 | f4 | background ground tiles (variants), must tile seamlessly |
| field_meadow / field_savanna / field_arctic | 16×16 | f4 | field soil tiles inside the pen (tilled earth / dry earth / frozen earth) |
| fence_h | 16×12 | f1 | wooden fence segment, horizontal |
| fence_v | 6×16 | f1 | vertical fence segment (side of pen) |
| fence_post | 6×12 | f1 | corner post |
| road | 16×16 | f2 | dirt road tile (horizontal), tiles seamlessly left-right |
| tree_oak | 40×48 | f1 | anchor bottom-center (ox 20, oy 48) — decor uses bottom-center |
| bush | 20×14 | f1 | bottom-center |
| flowers | 8×6 | f3 | bottom-center, variants |
| rock | 14×10 | f1 | bottom-center |
| acacia | 56×44 | f1 | bottom-center |
| baobab | 36×52 | f1 | bottom-center |
| dry_bush | 18×12 | f1 | bottom-center |
| pine_snow | 32×48 | f1 | bottom-center |
| ice_rock | 20×14 | f1 | bottom-center |
| snowman | 16×22 | f1 | bottom-center |
| pond | 48×24 | f2 | bottom-center, shimmering water |
| sign_town | 16×20 | f1 | bottom-center, arrow sign pointing left "TOWN" (tiny) |

### Agent C — `src/art/sprites/items.ts`, `src/art/sprites/ui.ts`, `src/art/font.ts`, `src/art/scenes.ts`
Items (`items.ts`): 16×16, f1, anchor center (8,8): egg, wool, milk, feather, egg_powder, flour, cookie, cake,
yarn, fabric, buttons, shirt, pillow, hat, cream, cheese, ice_cream, bear_cage, lion_cage, polar_cage.
Also `crate` 12×10 (wooden crate, anchor center) used in truck/heli UI.

UI (`ui.ts`):
| name | size | frames | notes |
|------|------|--------|-------|
| ui_panel | 24×24 | f1 | 9-slice (inset 8): wooden frame w/ parchment interior (interior uniform so it stretches) |
| ui_panel_dark | 24×24 | f1 | 9-slice (inset 8): dark translucent-looking wood/leather for HUD bars |
| ui_slot | 22×22 | f1 | inset item slot (for item grids) |
| ui_btn_green / ui_btn_orange / ui_btn_red / ui_btn_blue / ui_btn_gray | 16×18 | f3 | 9-slice (inset 5 left/right/top, 7 bottom): [normal, hover, pressed]; 2px darker bottom lip for 3D; pressed = lip gone/shifted |
| ui_btn_round | 20×20 | f3 | round icon button (anchor top-left) |
| icon_coin, icon_star, icon_star_empty, icon_clock, icon_pause, icon_play, icon_music, icon_music_off, icon_sound, icon_sound_off, icon_check, icon_cross, icon_lock, icon_home, icon_restart, icon_up, icon_plus, icon_minus, icon_water, icon_truck, icon_heli, icon_goal, icon_menu, icon_next, icon_back | 12×12 | f1 | anchor center (6,6) |
| medal_gold / medal_silver / medal_bronze / medal_none | 16×20 | f1 | anchor center; medal_none = empty dashed slot |
| progress_bar | 8×6 | f2 | 9-slice-ish (inset 3): f0 empty trough, f1 fill |
| bubble | 16×16 | f1 | 9-slice (inset 5) speech bubble (white w/ outline), anchor top-left; tail drawn separately: `bubble_tail` 8×6 |
| arrow_hint | 12×14 | f2 | bouncing tutorial arrow pointing DOWN, anchor bottom-center |
| cursor | 12×14 | f2 | f0 pointer glove, f1 pressed; anchor top-left (hotspot 1,1) |

Font (`font.ts`) — crisp bitmap fonts, full printable ASCII (32–126), drawn from glyph grids:
```ts
export type FontName = 'small' | 'normal' | 'big';   // small ≈ 3×5 caps+digits, normal ≈ 5×7 proportional (upper+lower), big ≈ 8×10 bold (titles)
export interface TextOpts { font?: FontName; color?: string; outline?: string | null; shadow?: string | null; align?: 'left'|'center'|'right'; }
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts?: TextOpts): void; // x,y = top-left (or top-center/right by align)
export function measureText(text: string, font?: FontName): number;  // width in px (without outline)
export function lineHeight(font?: FontName): number;
export function wrapText(text: string, maxWidth: number, font?: FontName): string[];
```
Must cache tinted glyph atlases per (font,color). `outline` draws the 8-neighbour outline (1px); `shadow` draws 1px down-right.
`small` may map lowercase to uppercase.

Scenes (`scenes.ts`):
```ts
export const titleBackground: DrawSprite;        // 640×360 idyllic farm scene (sky, hills, barn, fence, fields). Leave the upper-middle area calm for the logo and the lower-middle for buttons.
export const logo: DrawSprite;                   // ~300×80 "HARVEST FRENZY" chunky title logo (anchor top-left), 2 frames (shine)
export const mapBackground: DrawSprite;          // 640×360 world map: 3 regions (meadow bottom-left → savanna middle → arctic top-right) linked by a winding dirt path
export const MAP_NODES: { x: number; y: number }[]; // 30 level node centers along that path, in order (levels 1..30), all within 24..616 × 30..340
export const mapNode: DrawSprite;                // 20×20 level node sign/marker; frames: [locked, open, completed]; anchor center
```

### Agent D — `src/audio/` (all synthesized with WebAudio, no files)
```ts
// src/audio/index.ts
export type SfxName = 'click' | 'hover' | 'buy' | 'coin' | 'cash' | 'collect' | 'plant' | 'no_water' | 'well_refill'
  | 'drop_animal' | 'chicken' | 'sheep' | 'ostrich' | 'cow' | 'product_pop' | 'workshop_start' | 'workshop_done'
  | 'build' | 'upgrade' | 'error' | 'predator_land' | 'bear_roar' | 'lion_roar' | 'polar_roar' | 'hit' | 'cage'
  | 'cage_break' | 'animal_die' | 'truck_go' | 'truck_back' | 'heli' | 'delivery' | 'goal' | 'win' | 'medal'
  | 'star' | 'full' | 'bark' | 'meow' | 'page' | 'pause' | 'expire' | 'tick';
export type MusicTrack = 'title' | 'map' | 'meadow' | 'savanna' | 'arctic' | 'shop';
export const audio: {
  unlock(): void;                    // call on first user gesture (resume AudioContext)
  sfx(name: SfxName, opts?: { vol?: number; rate?: number }): void;   // rate = pitch multiplier
  music(track: MusicTrack | null): void;  // crossfade to track (looping); null = fade out
  musicVolume: number;  sfxVolume: number;  // 0..1, setters apply immediately
};
```

## 6. Level goals & medals
- Goal kinds: `{ kind:'collect', item, n }` (cumulative collected into warehouse this level),
  `{ kind:'animals', animal, n }` (own N at the same time), `{ kind:'money', n }` (cash ≥ N at any moment).
- Medals: finish ≤ gold time → gold (3★), ≤ silver time → silver (2★), else bronze (1★). Replays award only the improvement.

## 7. Star shop (permanent)
well (capacity 5/7/10/14, refill time 3/2.4/1.8/1.2s) · warehouse (30/45/65/90 units) · truck (20/30/45/65 units, trip 20/17/14/11s) ·
helicopter (6/10/16 units, trip 16/13/10s) · cage (clicks to trap 5/4/3/2, cage holds 15/20/25/30s).
Costs per next level: 3★, 6★, 10★.
