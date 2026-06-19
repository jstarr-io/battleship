# Debug Log

A historical log of every bug identified (by the user or during testing) and how
it was resolved. One file per bug, newest tracked in the table below.

Each entry uses this format:

- **bug** = what went wrong (observed symptom)
- **bug reason** = the root cause
- **applied fix** = the change made to fix it
- **outcome** = the verified result after the fix

| ID | Title | Reported by | Status |
|----|-------|-------------|--------|
| BUG-001 | Entry "Who is this?" question never appears | Devin testing | Fixed |
| BUG-002 | Commander name clipped in game header | Devin testing | Fixed |
| BUG-003 | Public link fails with Cloudflare error 1033 | Jesse | Fixed |
| BUG-004 | Ships could be placed more than once (duplicates) | Jesse | Fixed |
| CHANGE-001 | Per-ship rotate icon (replaces ORIENT button) | Jesse | Done |
| CHANGE-002 | Rotate icon supports full 360° (4 directions) | Jesse | Done |
| BUG-005 | Game-over flag shows only base color (no emblem) | Jesse | Fixed |
| BUG-006 | "Play Online" stuck in queue forever (added A.I. fallback) | Jesse | Fixed |
