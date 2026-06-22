# BUG-010 — Grid row labels displaced by ship SVG overlays

## Bug
Row/column labels (A-J, 1-10) on the "YOUR WATERS" grid appear scattered across
the grid instead of staying in the header column/row. Letters like B, C, D, E
float inside the ship area, making the grid look broken.

## Root Cause
Ship SVG overlays are appended as children of the CSS grid container with explicit
`gridRow`/`gridColumn` placement. CSS grid auto-placement then skips the cells
occupied by the overlays, pushing the auto-placed row headers and data cells to
unexpected positions.

## Applied Fix
Assigned explicit `gridRow` and `gridColumn` to every grid element (corner,
column headers, row headers, and data cells) in `makeGrid()`. With all items
explicitly placed, the ship SVG overlays no longer interfere with layout. Also
slightly reduced header column width (26px → 22px) and label opacity for a
cleaner look.

## Outcome
Row labels stay fixed in the leftmost column and column labels stay in the top
row regardless of ship placement. Grid layout is stable and labels are clearly
separate from the ship area.

## Found By
User report (screenshot showing letters scattered across YOUR WATERS grid).
