# BATTLESHIP · 1917

A real-time, multiplayer Battleship web game set in World War I. Dark war-room
aesthetic inspired by Anduril's defense-tech design language. Play head-to-head
online or against an A.I. opponent.

**Live:** [web-production-872b6.up.railway.app](https://web-production-872b6.up.railway.app)

---

## About the Game

### Premise

1917 — the Great War rages. You are a naval commander. Deploy your fleet on a
10x10 grid, then take turns firing at the enemy's waters. Sink all five enemy
ships to win. The losing fleet sinks beneath the waves while the victor's flag
flies and anthem plays.

### Rules

| Rule | Detail |
|------|--------|
| **Board** | 10x10 grid; columns 1-10, rows A-J |
| **Fleet** | Carrier (5), Battleship (4), Destroyer (3), Submarine (3), Patrol Boat (2) |
| **Placement** | Ships placed in straight lines, no overlapping. Click the rotate icon on any placed ship to cycle through 4 orientations (E/S/W/N). Drag to reposition. |
| **Turns** | Alternating single shots. Fire at an enemy coordinate; server responds with hit or miss. |
| **Pins** | Red pin = hit, white pin = miss |
| **Sinking** | When every cell of a ship is hit, it's announced as sunk with a whole-ship dynamite explosion |
| **Win condition** | Sink all 5 enemy ships |
| **Anti-cheat** | Server-authoritative: enemy ship positions are never sent to the client until the ship is sunk, making peeking impossible |

### Game Flow

1. **Entry checkpoint** — Wipe the fog off J.M. Flagg's 1917 "Uncle Sam — I Want
   You" recruiting poster, then answer "Who is this?" (Uncle Sam) to enlist.
2. **Choose your nation** — Pick from 29 WWI-era powers, each with its own flag
   and a synthesized national anthem melody.
3. **Deploy your fleet** — Place ships manually (click grid cells, rotate with
   the per-ship icon) or click RANDOMIZE. Press READY FOR BATTLE when set.
4. **Battle** — Fire at the enemy's grid. Hits, misses, and sunk announcements
   appear in the battle log. A whole-ship dynamite explosion plays when a ship
   is sunk.
5. **Victory / Defeat** — Canvas-rendered ocean scene: the winner's ship sails
   with its flag waving and anthem playing; the loser's ship sinks.

### Multiplayer

- **PLAY ONLINE** — Real-time matchmaking via Socket.IO. Two players clicking
  PLAY ONLINE within ~8 seconds are paired for a head-to-head match.
- **A.I. fallback** — If no human opponent joins within ~8 seconds, you're
  automatically matched against "Admiral A.I." so you're never stuck waiting.
- **VS A.I.** — Play a local game against the hunt/target A.I. at any time.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Server** | Python 3 (Flask + Flask-SocketIO), Gunicorn with Eventlet worker |
| **Client** | Vanilla JavaScript ES modules, HTML5, CSS3 |
| **Real-time** | Socket.IO (WebSocket transport with long-polling fallback) |
| **Canvas** | HTML5 Canvas for the entry fog reveal, dynamite explosions, and game-over ocean scene |
| **Audio** | Web Audio API (all SFX and national anthems synthesized in-browser, no audio files) |
| **Ship graphics** | SVG overlays positioned on the CSS grid (top-down naval vessel silhouettes) |
| **UI framework** | None (no React/Vue/Angular) — vanilla JS + CSS with Anduril-inspired design: pure black background, Inter/Helvetica font, all-uppercase wide-spaced typography, 0 border-radius |
| **Security** | CSP (`script-src 'self'`), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, defensive Socket.IO event wrapper |
| **Hosting** | Railway (Nixpacks build, auto-deploy from `main`) |
| **Version control** | GitHub (`jstarr-io/battleship`) |

---

## Getting Started

### Prerequisites

- Python 3.10+
- pip

### Local Development

```bash
# Clone the repo
git clone https://github.com/jstarr-io/battleship.git
cd battleship

# Install dependencies
pip install -r requirements.txt

# Start the dev server
python app.py
# => Battleship server listening on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser to play.

Set `PORT` environment variable to override the default port:
```bash
PORT=8080 python app.py
```

### Production (Railway / Gunicorn)

```bash
gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:$PORT --timeout 120
```

This is what `Procfile` and `railway.toml` configure for Railway's auto-deploy.

### Running Tests

```bash
# Headless rules + AI simulation (300 games)
python selftest.py

# Online protocol test (two-client Socket.IO integration)
PORT=3100 python app.py &
URL=http://localhost:3100 python sockettest.py
```

---

## How Devin Was Used

This project was built using AI-assisted development tools:

**Devin Cloud** was used for major implementation and infrastructure work:
- Build the full-stack codebase from scratch (Flask server, game engine, A.I. opponent, client UI, Canvas animations, Web Audio synthesis)
- Migrate the backend from Node.js to Python (Flask + Flask-SocketIO)
- Implement the Anduril-inspired UI redesign and SVG ship silhouettes
- Run end-to-end playtesting in a headless browser with screen recordings
- Deploy to Railway via the GraphQL API (project creation, domain setup, env config)
- Conduct a security audit (found and fixed DoS vectors + missing HTTP headers)
- Automated code review via Devin Review on every PR

**Devin Local** was used for rapid iteration and real-time collaboration:
- Receive and triage live bug reports during user playtesting sessions
- Implement quick feature additions (rotate icons, explosions, queue fallback)
- Translate design direction (reference images, Anduril's site) into implementation tasks
- Coordinate PR review feedback and trigger targeted fixes

Both modes enabled rapid prototyping and iteration on game mechanics. AI assistance helped maintain consistent code architecture, thorough documentation, and a structured PR workflow throughout.

---

## Bug Tracking

All bugs, features, and security fixes are documented in
[`debug-log/`](./debug-log), one file per item. Each entry records:

- **bug** — what went wrong (observed symptom)
- **bug reason** — the root cause
- **applied fix** — the code change made
- **outcome** — verified result after the fix

| ID | Title | Found by |
|----|-------|----------|
| BUG-001 | Entry "Who is this?" question never appears | Devin testing |
| BUG-002 | Commander name clipped in game header | Devin testing |
| BUG-003 | Public link fails with Cloudflare error 1033 | User |
| BUG-004 | Ships could be placed more than once (duplicates/ghosts) | User |
| BUG-005 | Game-over flag shows only base color, no emblem | User |
| BUG-006 | "Play Online" stuck in queue forever | User |
| BUG-007 | National anthem couldn't be stopped (`stopAnthem` no-op) | Devin Review |
| BUG-008 | Placement button listeners accumulate across replays | Devin Review |
| SECURITY-001 | Malformed socket payload crashes server (remote DoS) | Security audit |
| SECURITY-002 | Single client could create unlimited games | Security audit |
| SECURITY-003 | Missing HTTP security headers | Security audit |

| ID | Feature | Requested by |
|----|---------|--------------|
| CHANGE-001 | Per-ship rotate icon (replaces ORIENT button) | User |
| CHANGE-002 | 360-degree rotation (4 directions: E/S/W/N) | User |
| CHANGE-003 | Whole-ship dynamite explosion on sink | User |
| CHANGE-004 | Backend migration: Node.js to Python | User |
| CHANGE-006 | Glass-morphism UI overhaul | User |

Full details and the index table are in
[`debug-log/README.md`](./debug-log/README.md).

---

## Architecture & Structure

| Component | File(s) | Role |
|-----------|---------|------|
| **Server** | `app.py` | Flask + Flask-SocketIO — static hosting, matchmaking, game relay, security headers |
| **Game engine** | `game.py` | Server-authoritative rules, placement validation, fire resolution, anti-cheat |
| **A.I. opponent** | `ai.py` | Random fleet placement + hunt/target firing strategy |
| **Client shell** | `public/index.html` | Single-page app — all screens as `<section>` elements toggled by JS |
| **Screen flow** | `public/js/app.js` | Screen state machine + Socket.IO protocol handler |
| **Board UI** | `public/js/game.js` | Grid rendering, SVG ship overlays, placement/rotation, firing, explosions |
| **Entry gate** | `public/js/entry.js` | Canvas fog wipe + answer validation |
| **Nations** | `public/js/countries.js` | 29 WWI flags (SVG) + anthem note sequences |
| **Game over** | `public/js/over.js` | Canvas ocean scene with sailing/sinking ships and waving flags |
| **Audio** | `public/js/audio.js` | Web Audio API — all SFX and anthems synthesized, no audio files |
| **Styles** | `public/css/styles.css` | Anduril-inspired design system (black, Inter, uppercase, 0 radius) |
| **Bug log** | `debug-log/` | One file per bug/change/security fix with root cause and outcome |

All game logic is **server-authoritative** — the client sends intents (`fire`,
`deploy`), the server validates and responds. Enemy ship positions are never
sent to the client until sunk. State is held in-memory (single Gunicorn worker,
no database).

---

## Deploy (Railway)

The app auto-deploys from `main` to Railway. `Procfile` + `railway.toml` define
the Gunicorn start command; Railway builds from `requirements.txt` via Nixpacks
and injects `$PORT`.

Live URL: [web-production-872b6.up.railway.app](https://web-production-872b6.up.railway.app)

---

## License

See [LICENSE](./LICENSE).
