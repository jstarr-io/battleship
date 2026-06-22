---
name: testing-battleship-ui
description: Test the Battleship game UI end-to-end. Use when verifying visual/UI changes to the placement screen, ship rendering, rotation, or game flow.
---

# Testing Battleship UI

## Quick Start

1. Start the server: `python app.py` (runs on localhost:3000)
2. Navigate through entry gate: wipe fog on canvas → type "uncle sam" → pick a nation → click PLAY VS A.I.
3. You're now on the placement screen where ships are visible

## Key UI Paths

### Entry Gate
- Wipe cursor across the poster canvas until ~60% is revealed
- Answer "uncle sam" (case-insensitive) to proceed
- Wrong answers show "Incorrect" but don't block retries

### Country Select
- Click any nation card to select
- PLAY buttons are disabled until a nation is chosen
- Commander name field is optional

### Placement Screen (main testing target for ship UI)
- Click RANDOMIZE to place all 5 ships instantly
- Ships can be dragged to reposition
- Each ship has a ⟳ rotate button (top-right of pivot cell)
- Rotation cycles through 4 directions (E→S→W→N), skipping invalid positions
- READY FOR BATTLE enables once all 5 ships are placed

### Battle Phase
- Click enemy grid cells to fire
- Red pin = hit, white pin = miss
- "SUNK" announcements appear for both sides
- Dynamite explosion chains across all cells of a sunk ship
- Turn alternation: your grid is disabled during "ENEMY'S MOVE..."

### Game Over
- Winning ship + flag displayed with national anthem
- Losing ship sinks animation

## Ship Visual Verification

Ships should look like distinct naval vessels, NOT colored blobs:
- **Carrier** (5 cells, olive/green): Flight deck dashed markings (::after pseudo)
- **Battleship** (4 cells, steel-blue/gray): Circular gun turret on mid cells
- **Submarine** (3 cells, teal/blue): Rectangular conning tower on mid cell
- **Destroyer** (3 cells, bronze): Pointed hull shape
- **Patrol Boat** (2 cells, pink/mauve): Small shaped vessel

Each ship should have:
- Pointed/rounded bow (border-radius ~50%)
- Tapered stern (border-radius ~30%)
- 3D hull gradient (deck→hull→deck)
- Deck center-line (lighter strip via ::before)

## Bow/Stern Orientation Rule

The positional sort fix ensures:
- **Horizontal ships**: Bow is ALWAYS the leftmost cell, stern is rightmost
- **Vertical ships**: Bow is ALWAYS the topmost cell, stern is bottommost
- This holds regardless of internal facing direction (E/S/W/N)

If bow/stern appear inverted after rotation, the positional sort in `_commitShip`/`_randomize` may be broken.

## Rotate Button Testing

- All 5 ⟳ buttons should be 18x18px, visible, not clipped
- Each click advances to the next valid orientation
- Invalid rotations (off-board or overlap) are silently skipped
- If no valid rotation exists, ship stays put with a status message

## Grid Label Verification

Row labels (A-J) must appear only in the leftmost column; column labels (1-10) only in the top row. If labels appear scattered across the grid or inside ship areas, the CSS grid auto-placement might be broken — check that `makeGrid()` in `game.js` assigns explicit `gridRow`/`gridColumn` to every element (corner, headers, cells). Ship SVG overlays also use explicit grid placement, and without explicit placement on all items, auto-placement can push headers to unexpected positions.

To verify: RANDOMIZE ships, then zoom into the YOUR WATERS grid. All 10 row labels should be vertically stacked in a narrow leftmost column, clearly separate from ship graphics.

## Programmatic Grid Label Verification via Playwright CDP

The most reliable way to verify grid labels is programmatically via Playwright CDP (avoids relying on visual zoom):

```js
// Install: cd /tmp && npm install playwright
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:29229');
  const page = browser.contexts()[0].pages()[0];
  const result = await page.evaluate(() => {
    const grids = document.querySelectorAll('.grid');
    return Array.from(grids).map((g, i) => {
      const heads = g.querySelectorAll('.grid-head');
      return {
        parentId: g.parentElement?.id,
        heads: Array.from(heads).map(el => ({
          t: el.textContent, r: el.style.gridRow, c: el.style.gridColumn
        }))
      };
    });
  });
  // Verify: row labels A-J should all have gridColumn="1"
  // Verify: col labels 1-10 should all have gridRow="1"
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
```

Grid parent IDs: `board-tracking` (targeting grid), `board-own` (your waters).

## Browser Console Verification

Useful commands for programmatic checks:
```js
// Check ship cell metadata
document.querySelectorAll('[data-ship-type="carrier"]').forEach((c, i) => 
  console.log(c.dataset.shipSeg, c.dataset.shipOrient));

// Click a rotate button programmatically
document.querySelector('button[title="Rotate Carrier"]').click();

// Verify all rotate buttons exist and are visible
document.querySelectorAll('.ship-rotate').forEach(btn => 
  console.log(btn.title, btn.getBoundingClientRect()));
```

## Window Coordinate Mapping

The browser viewport is 1600x1069 (actual) but the computer tool uses 1024x768 (scaled). When clicking precise small targets like rotate buttons, use the browser console to click programmatically instead of guessing coordinates:
```js
document.querySelector('button[title="Rotate Submarine"]').click();
```

## Online Mode Testing

- PLAY ONLINE auto-matches vs A.I. after ~8 seconds if no human joins
- Two browser tabs can test human-vs-human (coordinate timing within 8s)
- Turn sync, anti-peek, and both-sided sunk announcements should work across clients

## Anduril Design Checks

The UI follows Anduril's defense-tech aesthetic. Verify across all screens:
- Pure black `#000` background (not navy or dark gray)
- All-uppercase text with wide letter-spacing
- Sharp edges: `border-radius: 0` on all panels, buttons, inputs
- White-on-black monochrome scheme
- No glass-morphism, blur effects, or decorative shadows
- Inter font (may fall back to system sans-serif if CSP blocks Google Fonts)

## Known Console Warnings (Not Bugs)

- **CSP font-block**: `Refused to load the stylesheet` for Google Fonts — this is expected with the strict `style-src 'self'` policy. The Inter font falls back to system sans-serif. Not a JS error.
- **Canvas2D readback**: `Multiple readback operations using getImageData` — performance hint for the entry gate fog wipe canvas. Informational only.

## Game-Over Flag Verification

The flag on the game-over canvas should show the full national design (e.g., Russian tricolor stripes, not just a solid color block). If the flag shows only a base color, the `blob:` URL for the SVG flag might be blocked by CSP — check that `img-src` includes `blob:`.

## Full Playthrough Checklist

For a complete end-to-end test, cover these phases in order:
1. Entry gate: fog wipe → wrong answer rejection → correct answer
2. Country selection: pick nation, enter commander name, verify button states
3. Ship placement: RANDOMIZE, verify silhouettes, test rotation
4. Battle: fire shots, verify red/white pins, confirm sunk announcements
5. Game over: verify canvas scene, flag rendering, victory/defeat text
6. Play Online: queue screen → A.I. fallback after ~8s
7. Console: confirm no JS runtime errors throughout

## Production Testing

The live production site is at https://web-production-872b6.up.railway.app. When testing against production, you don't need to start a local server — just navigate directly to the URL. All the same UI paths and verification steps apply.

## Devin Secrets Needed

None — the app runs entirely locally with no external auth required for testing.