# BUG-007 — National anthem can't be stopped (stopAnthem was a no-op)

- **Reported by:** Devin Review (PR #1)
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = After a game ended, the national-anthem snippet kept playing to
completion even after leaving the game-over screen (e.g. clicking PLAY AGAIN or
when the opponent left), and a new game's anthem could overlap the previous one.
`stopAnthem()` did nothing.

**bug reason** = `playAnthem()` in `public/js/audio.js` scheduled every note
directly on the Web Audio timeline via `osc.start(start)` / `osc.stop()`, but
never kept a reference to those oscillators. `stopAnthem()` iterated an
`anthemTimers` array that was always empty (the code used pre-scheduled audio
nodes, not `setTimeout` timers), so it had nothing to cancel.

**applied fix** (`public/js/audio.js`):
- `tone()` now returns the `OscillatorNode` it creates.
- `playAnthem()` pushes every oscillator it schedules (melody + harmony) into an
  `anthemNodes` array.
- `stopAnthem()` calls `osc.stop()` on each tracked node (wrapped in try/catch
  since an already-finished node throws) and clears the array.

**outcome** = `stopAnthem()` now actually silences a playing anthem, so leaving
the game-over screen or starting a new game cuts the music immediately with no
overlap. Server self-tests remain 8/8 (frontend-only change).
