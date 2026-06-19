# BUG-006 — "Play Online" stuck in queue forever

- **Reported by:** Jesse
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = Clicking **PLAY ONLINE** left the player on the "IN QUEUE — AWAITING
ANOTHER COMMANDER…" screen indefinitely. Unless a second human happened to click
PLAY ONLINE at the same time, the player was never matched and could never start
a game.

**bug reason** = Matchmaking in `server/index.js` only ever paired two humans.
The first player to search was stored in `waitingPlayer` and the server just
emitted `waiting`; there was no fallback, so a lone player sat in the queue
forever when no second human arrived.

**applied fix** (`server/index.js`):
- Added a `MATCH_TIMEOUT_MS` (8s) fallback. When a player is parked in the
  queue, a timer is armed; if no human opponent joins before it fires, the player
  is automatically dropped into a live A.I. match (`startAIGame`), so nobody is
  ever stuck.
- Extracted `startAIGame()` (shared by `playAI` and the queue fallback) and
  `clearWaiting()` (clears the pending timer whenever the waiting slot is
  resolved — paired, cancelled, or disconnected) to prevent dangling timers /
  ghost matches.
- Hardened pairing with a `waitingPlayer.socket.id !== socket.id` guard so a
  single socket can't be matched against itself.

**outcome** = Verified two ways: (1) Solo — clicked PLAY ONLINE with no one else
in the queue and was auto-matched against "Admiral A.I. — Bulgaria" after ~8s,
landing on PREPARE YOUR FLEET. (2) Two clients — the `sockettest.js` integration
test (two humans joining 100ms apart) still pairs them human-vs-human and plays
to exactly one winner (PASS). Server self-tests remain 8/8.
