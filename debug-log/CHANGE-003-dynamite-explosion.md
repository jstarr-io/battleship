# CHANGE-003 — Whole-ship dynamite explosion on sink

- **Requested by:** Jesse
- **Date:** 2026-06-19
- **Status:** Done

**change** = When a ship is sunk, play a large dynamite-style explosion across
**every cell of that ship** — on the targeting grid when you sink an enemy ship,
and on your own waters when one of yours is sunk. (First pass only detonated the
single final coordinate; Jesse asked for the whole ship and a bigger, more
dramatic boom.)

**reason added** = Feature request — make sinking a ship feel impactful and make
it obvious which ship (and which cells) just went down.

**applied change:**
- `server/game.js`: when a hit reduces a ship's remaining cells to zero, capture
  the ship's full cell list as `sunkCells` and include it in the fire result.
  This is safe with the anti-peek rule because a sunk ship is already fully
  revealed.
- `server/index.js`: forward `sunkCells` on the `fireResult` and `incomingFire`
  payloads (and the A.I. firing path).
- `public/js/game.js`: `_explodeShip(grid, cells)` chains `_explode()` across all
  cells with a 70ms stagger; call sites fall back to the single hit cell if
  `sunkCells` is absent.
- `public/css/styles.css`: scaled-up blast — white flash, larger fireball core,
  dual expanding shockwave rings, ~18 shrapnel fragments thrown further, and a
  bigger smoke plume.

**outcome** = Verified live (vs A.I. and recorded for Jesse): whole-ship
detonations chain across each cell on both grids (e.g. Carrier 5, Battleship 4,
Destroyer 3). Server self-tests remain 8/8.
