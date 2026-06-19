# BUG-005 — Game-over flag shows only its base color (no emblem)

- **Reported by:** Jesse
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = On the game-over screen, the waving flag on the winning ship (and the
sinking loser's) showed only the flag's solid base color — e.g. Brazil rendered
as a plain green rectangle, missing its yellow diamond and blue globe — so the
nation wasn't recognizable.

**bug reason** = `over.js` loads each flag as an SVG (from `flagHTML`) into an
`Image`, then slices it into vertical strips with `drawImage`. The flag SVGs only
declare a `viewBox` (no `width`/`height`), so the canvas gave the image an
ambiguous/large default intrinsic size. The strip code sampled a hard-coded
60×40 source region, which only covered the flag's top-left corner — usually just
the background color.

**applied fix** (`public/js/over.js`):
- `flagImage()` injects an explicit `width="240" height="160"` onto the SVG so the
  rasterized image has a known resolution.
- `drawShip()` now slices using the image's actual `naturalWidth/naturalHeight`
  instead of the hard-coded 60×40, so every strip samples the full flag.

**outcome** = Verified by rendering the game-over scene with Brazil as the winner:
the full Brazilian flag (green field, yellow diamond, blue globe) waves on the
winning ship, and the sinking British Empire ship shows a recognizable Union
Jack. Fix applies to both winning and losing flags for all nations.
