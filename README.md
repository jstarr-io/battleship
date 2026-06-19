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
npm install
npm start          # http://localhost:3000  (set PORT to override)
```

## Tests
```bash
npm test           # headless rules + AI simulation (300 games)
# Online protocol test (start a server on :3100 first):
PORT=3100 npm start &
npm run test:socket
```

## Architecture
- `server/game.js` — authoritative game state + rule validation.
- `server/ai.js` — random valid placement + hunt/target firing.
- `server/index.js` — Express static host + Socket.IO matchmaking/relay.
- `public/js/` — `app.js` (screen flow + protocol), `entry.js` (reveal gate),
  `game.js` (board UI), `countries.js` (flags + anthems), `over.js` (end scene),
  `audio.js` (Web Audio SFX/anthems).

## Bug log
See [`BUGS.md`](./BUGS.md) — every bug found during development is documented
with its root cause and fix, versioned for traceability.
