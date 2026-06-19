# BUG-004 — Ships could be placed more than once (duplicates during setup)

- **Reported by:** Jesse (manual test of v1, vs A.I.)
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = During fleet setup, a player could keep dropping ships on the board
even after all 5 were placed and crossed off in the fleet list, producing
duplicate/ghost ships on the grid. A game could begin from a visually invalid
board.

**bug reason** = `_activeShip()` fell back to the currently-indexed ship even
when it was already placed, so the click-to-place handler would re-drop an
already-placed ship at a new location. It overwrote `ship.cells` without clearing
the ship's previous cells from the occupancy map or the grid, leaving the old
squares marked as ship cells — the visible "duplicates."

**applied fix** (`public/js/game.js`, `public/css/styles.css`):
- `_activeShip()` now returns `null` once every ship is placed, so clicking the
  grid no longer drops anything.
- The grid click handler ignores clicks on already-occupied cells and no-ops when
  there is no unplaced ship; the fleet-list handler ignores clicks on placed
  ships.
- Placement/removal were centralized in `_commitShip()` / `_removeShipCells()`
  so a ship's old squares are always cleared before it is re-placed.
- Added the requested reposition flow: **drag a placed ship** to move it. Drag
  shows a live valid/invalid preview, ignores the dragged ship's own squares when
  checking validity, and rejects drops that go off-board or overlap another ship
  (the ship stays put). CSS gives placed ships a grab/grabbing cursor.

**outcome** = Verified in-browser: placing all 5 ships then clicking empty cells
adds nothing (exactly 5 ships, no duplicates); dragging a ship moves it with no
leftover ghost cells; an overlapping/off-board drop is rejected with
"Could not move there — kept the ship in place."; and READY FOR BATTLE starts the
game with the final, valid fleet. The server's authoritative placement check
(exactly 5 ships, correct sizes, no overlap) remains a second line of defense.
