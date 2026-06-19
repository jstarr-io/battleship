# BUG-002 — Commander name clipped in game header

- **Reported by:** Devin testing (browser preview)
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = With no name entered, the in-game header showed
"Commander of United Stat" — the auto-generated name was cut off.

**bug reason** = The default name `Commander of <country>` was too long for the
fixed-width player tag and the name span did not wrap.

**applied fix** = `public/js/app.js` now defaults the name to `Commander`;
`public/css/styles.css` `.tag-name` caps its width and wraps via
`overflow-wrap: anywhere`.

**outcome** = The header renders the commander name cleanly with the country on
the line below, no clipping.
