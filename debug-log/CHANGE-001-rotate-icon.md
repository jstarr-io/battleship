# CHANGE-001 — Per-ship rotate icon during setup (replaces ORIENT button)

- **Requested by:** Jesse
- **Date:** 2026-06-19
- **Type:** Enhancement (follow-up to BUG-004)

**request** = During setup, each placed ship should have a small persistent icon
to flip it between horizontal and vertical. This also removes the need for the
global ORIENT: HORIZONTAL/VERTICAL button. Icons should only exist during setup —
once battle begins, ships can't move, so no icon is needed.

**applied change** (`public/js/game.js`, `public/index.html`,
`public/css/styles.css`):
- Removed the `#btn-orient` button and its handler. New ships now drop
  horizontally by default; orientation is changed per-ship via the icon.
- `_renderShipIcons()` draws a gold ⟳ button on each placed ship's anchor
  (top/left-most) cell. It is re-rendered after every placement change (place,
  drag, rotate, randomize, reset) and cleared in `onPlaceAccepted()` when the
  fleet locks in.
- `_flipShip()` rotates a ship around its anchor, validating against bounds and
  other ships (ignoring the ship's own squares). Invalid rotations are rejected
  with a message and the ship stays put.
- The icon stops click/mousedown propagation so it doesn't start a drag or a
  placement on the underlying cell.

**outcome** = Verified in-browser: ⟳ icons appear on placed ships during setup;
clicking flips H↔V; a rotation that would overlap/leave the board is rejected
("Can't rotate … off-board or overlap."); the ORIENT button is gone; and all
icons disappear once READY FOR BATTLE locks the fleet.
