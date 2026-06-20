# BATTLESHIP · 1917

An online multiplayer, WWI-themed Battleship web app. Dark, war-room aesthetic.
Play against another human (online matchmaking) or against the A.I.

## Features
- **Entry checkpoint** — wipe the fog off J. M. Flagg's 1917 *Uncle Sam — I Want
  You* poster, then answer **"Who is this?"** (Uncle Sam) to enlist.
- **Pick your nation** — all 29 WWI-era powers, each with its own flag + a short
  national-anthem melody.
- **Online play or vs A.I.** — real-time matchmaking over Socket.IO, or a
  hunt/target A.I. opponent.
- **Classic rules** — 10×10 board (letters vertical, numbers horizontal), a
  5-ship fleet (Carrier 5, Battleship 4, Destroyer 3, Submarine 3, Patrol Boat
  2), straight-only non-overlapping placement, alternating shots, red/white
  pins, hit/miss + ship-sunk announcements, and a separate targeting grid to
  record your shots.
- **Server-authoritative anti-cheat** — opponent ship positions are never sent
  to the client until the game is over, so peeking is impossible.
- **Victory scene** — the winning nation's ship sails the ocean with its flag
  waving and anthem playing while the loser sinks beneath the waves.

## Run
```bash
pip install -r requirements.txt
python app.py        # http://localhost:3000  (set PORT to override)
```
For production (and on Railway) it runs under gunicorn with an eventlet worker:
```bash
gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:$PORT
```

## Tests
```bash
python selftest.py   # headless rules + AI simulation (300 games)
# Online protocol test (start a server on :3100 first):
PORT=3100 python app.py &
URL=http://localhost:3100 python sockettest.py
```

## Architecture
The **server** is Python (Flask + Flask-SocketIO); the **browser client** is
vanilla JS/HTML/CSS (browsers can't run Python). The Socket.IO event protocol is
identical to the original Node implementation.
- `game.py` — authoritative game state + rule validation.
- `ai.py` — random valid placement + hunt/target firing.
- `app.py` — Flask static host + Flask-SocketIO matchmaking/relay + security headers.
- `public/js/` — `app.js` (screen flow + protocol), `entry.js` (reveal gate),
  `game.js` (board UI), `countries.js` (flags + anthems), `over.js` (end scene),
  `audio.js` (Web Audio SFX/anthems).
- `public/vendor/socket.io.min.js` — vendored Socket.IO browser client (served
  locally so it loads under the strict `script-src 'self'` CSP).

## Deploy (Railway)
`Procfile` + `railway.toml` define the gunicorn start command; Railway builds
from `requirements.txt` via Nixpacks and injects `$PORT`.

## Bug log
See [`debug-log/`](./debug-log) — one file per item (bug / reason / applied fix /
outcome), indexed in [`debug-log/README.md`](./debug-log/README.md). Covers every
bug, change, and security fix found during development.
