# CHANGE-006 — Glass-Morphism UI Overhaul

**Change:** Modernize the entire UI with a frosted-glass (glass-morphism) design system.

**Reason:** The flat opaque panels looked antiquated. Modern UIs use translucent layered surfaces with backdrop blur to create depth and visual hierarchy.

**Applied fix:**
- Introduced `--glass`, `--glass-border`, `--gold-glow`, `--radius`, `--shadow` CSS custom properties for a consistent glass system.
- All major panels (board blocks, placement panel, battle log, toast, country cards, fleet items) now use `backdrop-filter: blur()` with semi-transparent backgrounds.
- Buttons get a larger border-radius (6px), gold glow shadow on hover; secondary buttons are glass-backed.
- Inputs gain glass backgrounds with a gold focus ring.
- Background uses dual radial-gradients for depth.
- Country cards float with lift + glow on hover.
- Turn indicator uses a gradient gold surface when active.
- Consistent 12px border-radius throughout via `--radius`.

**Outcome:** The UI feels modern, layered, and polished while retaining the dark navy WWI theme. All game functionality unchanged.
