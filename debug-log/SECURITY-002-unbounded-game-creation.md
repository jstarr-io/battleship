# SECURITY-002 — A single client could create unlimited games (resource exhaustion)

- **Reported by:** Security audit
- **Date:** 2026-06-19
- **Status:** Fixed
- **Severity:** Medium (resource-exhaustion DoS / memory leak)

**bug** = A client could repeatedly emit `playAI` (or `findGame`) to spawn an
unbounded number of `Game` objects. Each new game was stored in the server-wide
`games` Map and `socket.data.gameId` was overwritten to point at the newest one.
On `disconnect` only the *current* `socket.data.gameId` game was deleted, so
every earlier game that socket created leaked permanently. A loop of
`socket.emit('playAI', {...})` would grow server memory without bound.

**bug reason** = No guard against starting a new game while the socket was already
in one, and cleanup keyed only off the latest `gameId`, leaving orphaned games
unreachable and never freed.

**applied fix** (`server/index.js`):
- Added `socketInLiveGame(socket)` and made `findGame` / `playAI` return early if
  the socket already has an unfinished game, so a socket can hold at most one
  active game at a time (the previous game must finish or the socket disconnect
  before a new one starts).
- `playAI` now also clears the socket from the `waitingPlayer` slot if it was
  queued, preventing a stale waiting entry.

**outcome** = One socket can no longer accumulate games; spamming `playAI`/
`findGame` is a no-op while a game is live, so the `games` Map can't be grown
without bound by a single client. Server self-tests 8/8; two-client integration
test still passes.
