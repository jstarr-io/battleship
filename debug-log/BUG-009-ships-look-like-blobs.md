# BUG-009 — Ships Look Like Colored Blobs, Not Actual Ships

**Bug:** During placement, the ship representations on the grid look like colored rectangular blobs rather than recognizable battleship game pieces. They lack distinctive vessel shapes and structural details.

**Bug Reason:** The initial silhouette implementation used only border-radius with flat single-color backgrounds — no hull shaping gradients, no structural details (turrets, flight decks, conning towers), and no 3D depth cues. The result looked like rounded colored rectangles instead of actual ships.

**Applied Fix:**
- Redesigned hull shapes with more pronounced border-radius (50% bow tip, 30% stern taper) that clearly reads as a vessel.
- Added 3D hull gradients (lighter deck edges → darker hull center) for convex/cylindrical appearance.
- Added deck center-line accent strip (::before) running the length of each ship.
- Per-type structural details via ::after pseudo-element:
  - Carrier: repeating dashed flight deck markings with border frame.
  - Battleship: visible gun turret circles (radial-gradient) on mid/bow segments.
  - Destroyer: smaller turret dots.
  - Submarine: raised rectangular conning tower on mid cell.
  - Patrol Boat: small bridge element on bow.
- Added water-line shadow (inset bottom + outer drop) for floating-on-sea effect.
- Introduced `--ship-accent` CSS variable for highlight/detail colors per ship type.

**Outcome:** Ships are now instantly recognizable as distinct naval vessel types matching the classic Battleship board game aesthetic — pointed bows, tapered sterns, visible deck structures, and type-specific detailing (turrets, flight decks, conning towers).
