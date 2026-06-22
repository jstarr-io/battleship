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

This project was built and maintained using [Devin](https://devin.ai), an
autonomous AI software engineer by Cognition AI. Both Devin Cloud (remote
sessions) and Devin's local capabilities were used throughout development.

### Development Workflow

- **Initial build** — Devin wrote the entire codebase from scratch: server-side
  game logic, A.I. opponent, Socket.IO matchmaking, client-side UI, canvas
  animations, Web Audio synthesis, and the entry gate challenge.
- **Feature implementation** — Each feature request from the user (ship
  rotation, dynamite explosions, online queue fallback, flag rendering, etc.)
  was implemented by Devin in a separate branch with a documented PR.
- **Backend migration** — Devin migrated the entire backend from Node.js
  (Express + Socket.IO) to Python (Flask + Flask-SocketIO) while preserving
  the exact same Socket.IO event protocol so the client required zero changes.
- **UI redesign** — Devin researched Anduril's website design language, then
  implemented a complete visual overhaul (pure black, Inter font, uppercase
  typography, 0 border-radius, no glass-morphism) as a review-first PR.
- **Deployment** — Devin created the Railway project, configured the build
  pipeline, set environment variables, generated the public domain, and
  verified the live deployment — all via Railway's GraphQL API.

### Bug Discovery & Fixing

- **Manual playtesting** — Devin played through the game end-to-end (entry
  gate, country select, placement, battle, game-over) acting as a human user
  to find bugs the user might miss.
- **Devin Review** — An automated code-review bot that runs on every PR. It
  found BUG-007 (anthem couldn't be stopped) and BUG-008 (event listener
  accumulation) which Devin then verified in code and fixed.
- **Security audit** — Devin audited the server code and found two exploitable
  DoS vectors (SECURITY-001: malformed payload crash, SECURITY-002: unbounded
  game creation) plus missing HTTP security headers (SECURITY-003).
- **User-reported bugs** — The user reported bugs during live testing (duplicate
  ship placement, flag rendering, queue stuck forever, etc.) and Devin
  diagnosed root causes, implemented fixes, and documented each one.

### PR & Documentation Workflow

Every change follows a structured process:
1. Branch off `main` with a descriptive branch name
2. Implement + test locally (selftest, sockettest, browser verification)
3. Open a PR with a detailed description
4. Devin Review runs automatically and flags potential issues
5. Fix any findings, then merge to `main` (auto-deploys to Railway)
6. Log the bug/change in `debug-log/` with: bug, root cause, fix, outcome

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

```
battleship/
├── app.py                  # Flask server + Flask-SocketIO event handlers
│                           #   - Static file serving
│                           #   - Socket.IO matchmaking & game relay
│                           #   - Security headers (CSP, X-Frame-Options, etc.)
│                           #   - Defensive event wrapper (prevents malformed payload crashes)
│
├── game.py                 # Authoritative game state & rule engine
│                           #   - Board setup, ship placement validation
│                           #   - Fire resolution (hit/miss/sunk)
│                           #   - Anti-cheat: ship positions hidden until sunk
│                           #   - Turn management
│
├── ai.py                   # A.I. opponent
│                           #   - Random valid fleet placement
│                           #   - Hunt/target firing strategy
│
├── public/                 # Static client files (served by Flask)
│   ├── index.html          # Single-page app shell (all screens in one HTML file)
│   ├── css/
│   │   └── styles.css      # Anduril-inspired design system
│   │                       #   Pure black #000, Inter font, uppercase, 0 border-radius
│   ├── js/
│   │   ├── app.js          # Screen flow controller + Socket.IO protocol handler
│   │   ├── entry.js        # Entry gate: canvas fog wipe + answer validation
│   │   ├── game.js         # Board UI: grid rendering, ship SVG overlays,
│   │   │                   #   placement (drag, rotate), firing, hit/miss pins,
│   │   │                   #   dynamite explosion canvas animation
│   │   ├── countries.js    # 29 WWI nations: flag SVG markup + anthem note sequences
│   │   ├── over.js         # Game-over canvas scene: ocean, ships, waving flags
│   │   └── audio.js        # Web Audio API: tone/noise synthesis, SFX, anthem player
│   ├── assets/
│   │   └── unclesam.jpg    # J.M. Flagg's 1917 recruiting poster
│   └── vendor/
│       └── socket.io.min.js  # Vendored Socket.IO client (strict CSP compliance)
│
├── debug-log/              # Bug & change audit trail (one file per item)
│   ├── README.md           # Index table of all tracked items
│   ├── BUG-001-*.md        # Bug reports (symptom, root cause, fix, outcome)
│   ├── CHANGE-001-*.md     # Feature changes
│   └── SECURITY-001-*.md   # Security fixes
│
├── selftest.py             # Headless test: rules validation + 300-game A.I. sim
├── sockettest.py           # Integration test: two Socket.IO clients play a full game
├── requirements.txt        # Python dependencies (Flask, Flask-SocketIO, Gunicorn, Eventlet)
├── Procfile                # Railway/Heroku start command
├── railway.toml            # Railway build & deploy config (Nixpacks)
└── LICENSE
```

### Data Flow

```
Browser (vanilla JS)                    Server (Python/Flask)
─────────────────────                   ─────────────────────
  app.js                                  app.py
    ├── entry.js (fog gate)                 ├── on('playAI')  → new Game + AI
    ├── game.js  (board UI)                 ├── on('findGame') → matchmaking queue
    ├── over.js  (end scene)                │     └── 8s timeout → AI fallback
    └── audio.js (SFX)                      ├── on('deploy')  → validate placement
                                            ├── on('fire')    → game.fire()
    Socket.IO ◄─────────────────────►       │     └── emit result + turn
                                            └── game.py (rules engine)
                                                  └── ai.py (opponent logic)
```

### Key Design Decisions

- **Server-authoritative** — All game logic runs on the server. The client
  sends intents (`fire`, `deploy`); the server validates and responds with
  results. Enemy ship positions are never leaked to the client.
- **Single-process with in-memory state** — Games live in a Python dict keyed
  by socket ID. This keeps the architecture simple but means the app runs as a
  single Gunicorn worker (no horizontal scaling). Suitable for the current
  player base.
- **No framework on the client** — Vanilla JS with ES modules keeps the bundle
  at zero build steps. Each screen is a `<section>` toggled via CSS; `app.js`
  manages the screen state machine.
- **Synthesized audio** — All sounds (gunfire, explosions, splashes, anthems)
  are generated in real-time via the Web Audio API. No audio files to load or
  license.
- **Vendored Socket.IO client** — The browser client is served from
  `public/vendor/` instead of a CDN, allowing a strict `script-src 'self'` CSP
  with no exceptions.

---

## Deploy (Railway)

The app auto-deploys from `main` to Railway. `Procfile` + `railway.toml` define
the Gunicorn start command; Railway builds from `requirements.txt` via Nixpacks
and injects `$PORT`.

Live URL: [web-production-872b6.up.railway.app](https://web-production-872b6.up.railway.app)

---

## License

See [LICENSE](./LICENSE).
