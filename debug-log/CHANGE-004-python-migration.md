# CHANGE-004 — Migrate the server to Python + deploy to the cloud (Railway)

- **Requested by:** Jesse
- **Date:** 2026-06-19
- **Status:** Done

**change** = Migrate the entire backend from Node.js (Express + Socket.IO) to
Python, and deploy the app to the cloud on Railway. The browser client stays
HTML/CSS/JS (browsers cannot run Python); only the **server** is rewritten. The
Socket.IO event protocol (event names + payload shapes) is kept identical, so the
existing client runs unchanged.

**reason added** = User request: standardize the backend on Python and host the
game publicly in the cloud instead of an ephemeral dev tunnel.

**applied change:**
- **`game.py`** (was `server/game.js`): 1:1 port of the authoritative game logic
  — `SHIPS`, `coord_label`, `validate_placement`, and the `Game` class
  (placement, turn alternation, fire resolution, win detection, sunk-cell reveal).
  Coordinate keys moved from `"r,c"` strings to `(r, c)` tuples.
- **`ai.py`** (was `server/ai.js`): port of `random_placement` and the `AIBrain`
  hunt/target strategy (parity hunt + collinear-extension targeting).
- **`app.py`** (was `server/index.js`): Flask + Flask-SocketIO server.
  - Same handlers: `findGame`, `playAI`, `placeShips`, `fire`, `cancelSearch`,
    `disconnect`, plus `connect`.
  - Same 8s matchmaking timeout → A.I. fallback, implemented with
    `socketio.start_background_task` + `socketio.sleep` and a token to invalidate
    stale timers. A.I. move delay (0.7–1.3s) uses the same mechanism.
  - Same security hardening carried over: `safe_handler` wrapper coerces
    non-dict payloads to `{}` and swallows handler exceptions (SECURITY-001);
    `socket_in_live_game` guard prevents unbounded game creation (SECURITY-002);
    `after_request` sets the full CSP + `X-Frame-Options`/`nosniff`/etc.
    (SECURITY-003).
  - Per-socket game lookup uses `request.sid`; emits target a client via its sid
    room (`to=sid`). A.I. "player" has no socket and is skipped on every emit.
- **`public/index.html`** + **`public/vendor/socket.io.min.js`**: the JS Socket.IO
  client used to be auto-served by the Node server at `/socket.io/socket.io.js`.
  python-socketio does not serve that file, so the browser client (v4.8.3) is now
  vendored and loaded from `vendor/socket.io.min.js` (keeps it under the strict
  `script-src 'self'` CSP — no CDN).
- **`selftest.py`** / **`sockettest.py`**: ports of the Node rule-sim and
  two-client online protocol tests.
- **Tooling/deploy:** `requirements.txt` (Flask, Flask-SocketIO, python-socketio,
  python-engineio, eventlet, gunicorn), `Procfile` and `railway.toml`
  (`gunicorn --worker-class eventlet -w 1 app:app`), `.python-version`. Removed
  the Node sources (`server/*.js`), `package.json`, and `package-lock.json`.

**outcome** = `python selftest.py` is 8/8; the two-client online integration test
(`sockettest.py`) passes (exactly one winner, both notified). The server serves
with the same CSP/security headers (`/health` 200). Verified in-browser: entry
fog reveal, country select, vs-A.I. game to completion, explosions, and the
game-over flag scene all work.

Deployed to **Railway** (project `battleship-wwi`, built with Nixpacks from
`requirements.txt` + `railway.toml`). Live URL:
**https://battleship-wwi-production.up.railway.app**. Confirmed live end-to-end:
`/health` returns 200 with the full CSP/security headers, and a real-time vs-A.I.
game (Socket.IO over Railway's edge) runs through placement → battle → fire/AI
turn handoff with a clean browser console.
