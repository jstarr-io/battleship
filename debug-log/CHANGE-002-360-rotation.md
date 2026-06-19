# CHANGE-002 — Rotate icon supports full 360° (all four directions)

- **Requested by:** Jesse
- **Date:** 2026-06-19
- **Type:** Enhancement (follow-up to CHANGE-001)

**request** = The ⟳ icon only flipped one-dimensionally — e.g. a vertical ship
always became horizontal extending to the right. A player should be able to point
the ship in the other direction too (left / up), i.e. rotate a full 360° around
the pivot, while never letting the ship fall off the board or overlap another
ship.

**bug reason** = Rotation pivoted on the ship's top/left-most cell and only
toggled between two orientations (extend-right / extend-down). There was no notion
of a fixed pivot or of the other two directions (extend-left / extend-up).

**applied fix** (`public/js/game.js`):
- Each ship now stores a fixed `pivot` cell and a `facing` (0=East/right,
  1=South/down, 2=West/left, 3=North/up), set on placement, drag, and randomize.
- `_cellsFrom(pivot, facing, size)` lays the ship out from the pivot in any of the
  4 directions.
- `_rotateShip()` advances `facing` to the **next direction that fits**, cycling
  E→S→W→N and skipping any orientation that would go off-board or overlap (checked
  via `_valid(..., ship.name)` so the ship ignores its own squares). If none of
  the other three fit, the ship stays put with a message.
- The ⟳ icon is drawn on the pivot cell, so the ship visibly rotates around that
  fixed point.

**outcome** = Verified in-browser with a Carrier pivoted at E5: clicking ⟳ cycled
E5→E9 (right) → E5→I5 (down) → E5→E1 (left) → E5→A5 (up) → back to right, pivot
fixed at E5 throughout. Rotations that don't fit are skipped automatically, so a
ship can never be rotated off-board or onto another ship.
