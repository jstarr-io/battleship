# BUG-001 — Entry "Who is this?" question never appears

- **Reported by:** Devin testing (browser preview)
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = After wiping nearly all the fog off the Uncle Sam poster, the
"Who is this?" question never unlocked, so the user could not enter the site.

**bug reason** = The eraser brush used a fully-soft radial gradient (alpha 1 → 0),
so wiped pixels rarely reached full transparency. The reveal detector only
counted pixels with `alpha < 40` and required 55% of them — a threshold the soft
brush could not realistically reach.

**applied fix** = In `public/js/entry.js`, gave the eraser a solid core
(`addColorStop(0.7, rgba(0,0,0,1))`) so wiped areas become fully transparent,
counted pixels with `alpha < 128` as cleared, and lowered the reveal trigger to
50%.

**outcome** = Wiping ~half the poster now reliably reveals Uncle Sam and shows
the question. Verified in the browser: entering "Uncle Sam" advances to country
selection.
