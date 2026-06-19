# SECURITY-001 — Any client could crash the server with a malformed event (DoS)

- **Reported by:** Security audit
- **Date:** 2026-06-19
- **Status:** Fixed
- **Severity:** High (remote denial of service)

**bug** = Every Socket.IO event handler destructured its payload directly in the
parameter list — e.g. `socket.on('fire', ({ r, c }) => …)`,
`socket.on('placeShips', ({ ships }) => …)`, `findGame`, `playAI`. A client that
emitted one of these events with a non-object payload (`null`, or no argument at
all) caused a `TypeError: Cannot destructure property … of 'null'` to be thrown
synchronously inside the handler. Socket.IO does not wrap listeners in a
try/catch, so the throw became an uncaught exception and **crashed the entire
Node process**, taking down every in-progress game for every player. One line
from any anonymous visitor (`socket.emit('fire', null)`) was a full-server DoS.

**bug reason** = Trusting client input shape. Destructuring in the parameter
position assumes the payload is always an object; a malicious/buggy client
controls that payload entirely.

**applied fix** (`server/index.js`): added an `on(socket, event, handler)`
wrapper used for all client events. It (1) coerces any non-object payload to `{}`
before the handler runs, so destructuring can never throw, and (2) wraps the
handler body in try/catch and logs instead of letting any error escape into
Socket.IO. Downstream validation (`validatePlacement`, `Game.fire` integer/bounds
checks) already rejects bad values safely once the payload is an object.

**outcome** = Verified by emitting `fire(null)`, `placeShips` (no arg),
`findGame(42)`, `playAI('garbage')`, `fire({r:'x',c:{}})`, and
`placeShips({ships:'nope'})` against a live server: the process stayed up and
`/health` continued returning HTTP 200 (previously these crashed it). Server
self-tests 8/8; the two-client integration test still plays to one winner.
