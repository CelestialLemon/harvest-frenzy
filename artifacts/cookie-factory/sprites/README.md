# Cookie factory sprite

The game uses the procedural `bakery` definition in `src/art/sprites/world/workshops.ts` through the world sprite registry. The PNG is an export for inspection, not a runtime dependency.

The sprite remains 72×64 with a top-left anchor. Frame 0 is idle; frames 1–12 form the working loop at 12 FPS. Cookies and belt seams advance right through the last-to-first transition. Steam particles rise, expand, and dissolve before a new particle emerges from the chimney.

Run `node --import tsx tools/export-cookie-factory.ts` to regenerate `cookie-factory-v2.png` and its JSON frame/animation metadata. The original `cookie-factory-before.png` is a preserved baseline.

Run `npm run dev`, then open `/artifacts/cookie-factory/sprites/comparison.html` for the before-and-after animation preview. Toggle Working animation and scroll the After frame strip to inspect all twelve working frames.
