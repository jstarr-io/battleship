# Bug Log

This file documents every bug discovered during development and testing, plus
how it was fixed. Each entry is versioned so behavior changes are traceable.

## Format
- **ID** — short slug
- **Version found / fixed**
- **Symptom** — what went wrong
- **Root cause**
- **Fix** — what changed (file/function)

---

## v0.1.0 — Initial build

### BUG-001 — Entry "Who is this?" question never appears
- **Version found:** v0.1.0 · **Fixed:** v0.1.1
- **Symptom:** Even after wiping nearly all the fog off the Uncle Sam poster in
  the browser preview, the "Who is this?" question never unlocked.
- **Root cause:** The eraser brush used a fully-soft radial gradient
  (alpha 1 → 0), so wiped pixels rarely reached full transparency. The reveal
  detector counted only pixels with `alpha < 40` and required 55% of them, a
  threshold the soft brush could not realistically reach.
- **Fix:** `public/js/entry.js` — gave the eraser a solid core
  (`addColorStop(0.7, rgba(0,0,0,1))`) so wiped areas become fully transparent,
  counted pixels with `alpha < 128` as cleared, and lowered the reveal trigger
  to 50%.

### BUG-002 — Commander name clipped in the game header
- **Version found:** v0.1.0 · **Fixed:** v0.1.1
- **Symptom:** With no name entered, the in-game header showed
  "Commander of United Stat" — the auto-generated name was cut off.
- **Root cause:** Default name `Commander of <country>` was too long for the
  fixed-width player tag and the name span did not wrap.
- **Fix:** `public/js/app.js` defaults the name to `Commander`; `styles.css`
  `.tag-name` now caps width and wraps via `overflow-wrap: anywhere`.
