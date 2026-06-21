# CHANGE-005 — Ship Silhouettes Replace Dots

**Change:** Replace flat colored-dot ship representation with distinct ship silhouettes on the placement grid.

**Reason:** The old gray dots looked antiquated and made it hard to distinguish ship types at a glance. Modern games use recognizable shapes.

**Applied fix:**
- Each placed ship cell now carries `data-ship-type`, `data-ship-orient`, and `data-ship-seg` (bow/mid/stern) attributes.
- CSS renders ship-type-specific hull colors: Carrier (olive), Battleship (steel-blue), Destroyer (bronze), Submarine (teal), Patrol Boat (mauve).
- Bow cells get a rounded front (border-radius 50%), stern cells get a tapered back (40% radius), mid cells are flat.
- Inner hull detail strip (raised center) and turret/mast dots on mid cells add recognizable detail per type.
- Fleet list buttons show a colored left-edge indicator matching their hull color, with ship-shaped glyphs (◀▬▶).

**Outcome:** Ships are immediately recognizable by shape and color on the grid. Placement, drag, rotate, and randomize all render correctly.
