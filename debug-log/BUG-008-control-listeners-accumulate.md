# BUG-008 — Placement control listeners accumulate across games

- **Reported by:** Devin Review (PR #1)
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = Playing more than one game per session (via PLAY AGAIN) caused the
placement control buttons — RANDOMIZE, RESET, READY FOR BATTLE — to fire their
action multiple times per click (e.g. randomize/reset twice, and READY emitting
`placeShips` more than once), with the click SFX stacking too.

**bug reason** = A fresh `BattleshipUI` is constructed on every `gameStart`
(`app.js`), and its constructor calls `_wireControls()`, which did
`addEventListener('click', …)` on the persistent `#btn-random` / `#btn-reset` /
`#btn-ready` DOM nodes. Those nodes are never recreated between games, so each new
game added another listener bound to a new UI instance — handlers accumulated
game over game. (The board grids don't have this issue because `makeGrid()`
rebuilds their cells via `innerHTML = ''` each game.)

**applied fix** (`public/js/game.js`): `_wireControls()` now replaces each button
node with a clone (`cloneNode(true)` + `replaceChild`) before attaching its
listener. Cloning drops all previously-bound listeners, guaranteeing exactly one
handler — bound to the current UI instance — regardless of how many games have
been played.

**outcome** = Each control fires exactly once per click no matter how many games
are played in a session; READY emits a single `placeShips`. Server self-tests
remain 8/8 (frontend-only change).
