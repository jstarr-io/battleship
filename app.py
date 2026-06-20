"""WWI Battleship server — Flask + Flask-SocketIO.

Python port of the original Node/Express/Socket.IO server. The Socket.IO
protocol (event names + payloads) is identical, so the existing browser client
runs unchanged. All authoritative game state lives here (anti-peek rule).
"""

from __future__ import annotations

import eventlet

eventlet.monkey_patch()

import functools
import os
import random

from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO

from ai import AIBrain, random_placement
from game import SHIPS, Game

PORT = int(os.environ.get("PORT", 3000))
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

app = Flask(__name__, static_folder=PUBLIC_DIR, static_url_path="")
socketio = SocketIO(app, async_mode="eventlet", cors_allowed_origins="*")


# --- Security headers (mirrors the Node middleware) ---
@app.after_request
def set_security_headers(resp):
    resp.headers["Content-Security-Policy"] = "; ".join(
        [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
        ]
    )
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    resp.headers.pop("Server", None)
    return resp


@app.route("/")
def index():
    return send_from_directory(PUBLIC_DIR, "index.html")


@app.route("/health")
def health():
    return {"ok": True}


# --- State ---
waiting_player = None  # { sid, country, name, token }
games = {}  # game_id -> { game, ai, ai_id }
socket_game = {}  # sid -> game_id
connected = set()  # sids of connected clients
_game_counter = 0
_token_counter = 0

AI_ID = "__AI__"
AI_NAME = "Admiral A.I."
# If no human opponent joins within this window, match the waiting player
# against the A.I. so nobody is ever stuck in the queue.
MATCH_TIMEOUT_S = 8


def _new_game_id():
    global _game_counter
    _game_counter += 1
    return f"g{_game_counter}"


def _new_token():
    global _token_counter
    _token_counter += 1
    return _token_counter


def clear_waiting():
    global waiting_player
    waiting_player = None


def pick_ai_country(human_country):
    pool = [
        c
        for c in [
            "Germany", "Austria-Hungary", "Ottoman Empire", "Bulgaria", "France",
            "British Empire", "Russia", "United States", "Italy", "Japan",
        ]
        if c != human_country
    ]
    return random.choice(pool)


def public_ship_list():
    return [{"name": s["name"], "size": s["size"]} for s in SHIPS]


def start_ai_game(human):
    ai_country = pick_ai_country(human["country"])
    ai_player = {"sid": None, "id": AI_ID, "country": ai_country, "name": AI_NAME}
    start_game(human, ai_player, AIBrain())


def start_game(p1, p2, ai_brain=None):
    game_id = _new_game_id()
    game = Game(
        game_id,
        [
            {"id": p1.get("id", p1["sid"]), "country": p1["country"], "name": p1["name"]},
            {"id": p2.get("id", p2["sid"]), "country": p2["country"], "name": p2["name"]},
        ],
    )
    ai_id = p2.get("id", p2["sid"]) if ai_brain else None
    record = {"game": game, "ai": ai_brain, "ai_id": ai_id}
    games[game_id] = record

    for sid in (p1.get("sid"), p2.get("sid")):
        if sid:
            socket_game[sid] = game_id

    emit_game_start(record)

    # If AI, place its ships immediately.
    if ai_brain:
        game.place_ships(ai_id, random_placement())
    return record


def emit_game_start(record):
    game = record["game"]
    for p in game.players:
        if p["id"] == record["ai_id"]:
            continue
        opp = game.opponent_of(p["id"])
        socketio.emit(
            "gameStart",
            {
                "gameId": game.id,
                "you": {"country": p["country"], "name": p["name"]},
                "opponent": {"country": opp["country"], "name": opp["name"]},
                "ships": public_ship_list(),
            },
            to=p["id"],
        )


def emit_turn_state(record):
    game = record["game"]
    current_id = game.current_player_id()
    for p in game.players:
        if p["id"] == record["ai_id"]:
            continue
        socketio.emit("turn", {"yourTurn": p["id"] == current_id}, to=p["id"])


def handle_game_over(record):
    game = record["game"]
    winner_id = game.winner
    for p in game.players:
        if p["id"] == record["ai_id"]:
            continue
        opp = game.opponent_of(p["id"])
        socketio.emit(
            "gameOver",
            {
                "youWon": p["id"] == winner_id,
                "youCountry": p["country"],
                "oppCountry": opp["country"],
                # Reveal opponent fleet only now that the game is over.
                "opponentShips": game.reveal_ships(opp["id"]),
            },
            to=p["id"],
        )
    games.pop(game.id, None)


def maybe_run_ai(record):
    """Drive the AI turn(s) until it's the human's turn again or game ends."""
    game = record["game"]
    if not record["ai"]:
        return
    if game.phase != "playing":
        return
    if game.current_player_id() != record["ai_id"]:
        return
    socketio.start_background_task(_run_ai_turn, record)


def _run_ai_turn(record):
    socketio.sleep(0.7 + random.random() * 0.6)
    game = record["game"]
    ai = record["ai"]
    ai_id = record["ai_id"]
    if game.id not in games:
        return
    if game.phase != "playing" or game.current_player_id() != ai_id:
        return
    shot = ai.next_shot()
    result = game.fire(ai_id, shot["r"], shot["c"])
    if not result["ok"]:
        return
    ai.record(shot["r"], shot["c"], result)

    human_id = game.opponent_of(ai_id)["id"]
    socketio.emit(
        "incomingFire",
        {
            "r": result["r"],
            "c": result["c"],
            "hit": result["hit"],
            "sunk": result["sunk"],
            "sunkCells": result["sunkCells"],
            "label": result["label"],
        },
        to=human_id,
    )

    if result["gameOver"]:
        handle_game_over(record)
        return
    emit_turn_state(record)
    maybe_run_ai(record)


def socket_in_live_game(sid):
    """True if this socket is already in a live (unfinished) game.

    Stops a single client from spawning unlimited games (resource-exhaustion DoS).
    """
    record = games.get(socket_game.get(sid))
    return bool(record) and record["game"].phase != "finished"


def safe_handler(fn):
    """Ignore malformed payloads and never let a thrown error escape a handler."""

    @functools.wraps(fn)
    def wrapper(payload=None):
        try:
            data = payload if isinstance(payload, dict) else {}
            return fn(data)
        except Exception as err:  # noqa: BLE001
            app.logger.error("[%s] handler error: %s", fn.__name__, err)

    return wrapper


@socketio.on("connect")
def on_connect():
    connected.add(request.sid)


@socketio.on("findGame")
@safe_handler
def on_find_game(data):
    global waiting_player
    sid = request.sid
    if socket_in_live_game(sid):
        return
    country = str(data.get("country") or "Unknown")[:40]
    name = str(data.get("name") or "Anonymous")[:24]

    if waiting_player and waiting_player["sid"] in connected and waiting_player["sid"] != sid:
        p1 = waiting_player
        clear_waiting()
        start_game(p1, {"sid": sid, "country": country, "name": name})
    else:
        clear_waiting()
        token = _new_token()
        waiting_player = {"sid": sid, "country": country, "name": name, "token": token}
        socketio.emit("waiting", to=sid)
        socketio.start_background_task(_match_timeout, sid, token)


def _match_timeout(sid, token):
    socketio.sleep(MATCH_TIMEOUT_S)
    global waiting_player
    if waiting_player and waiting_player["sid"] == sid and waiting_player.get("token") == token:
        human = waiting_player
        waiting_player = None
        if sid in connected:
            start_ai_game(human)


@socketio.on("playAI")
@safe_handler
def on_play_ai(data):
    global waiting_player
    sid = request.sid
    if socket_in_live_game(sid):
        return
    if waiting_player and waiting_player["sid"] == sid:
        clear_waiting()
    country = str(data.get("country") or "Unknown")[:40]
    name = str(data.get("name") or "Anonymous")[:24]
    start_ai_game({"sid": sid, "id": sid, "country": country, "name": name})


@socketio.on("placeShips")
@safe_handler
def on_place_ships(data):
    sid = request.sid
    record = games.get(socket_game.get(sid))
    if not record:
        return
    res = record["game"].place_ships(sid, data.get("ships"))
    if not res["ok"]:
        socketio.emit("placeError", {"error": res["error"]}, to=sid)
        return
    socketio.emit("placeAccepted", to=sid)
    if res.get("bothReady"):
        for p in record["game"].players:
            if p["id"] == record["ai_id"]:
                continue
            socketio.emit("battleStart", to=p["id"])
        emit_turn_state(record)
        maybe_run_ai(record)
    else:
        socketio.emit("waitingForOpponentPlacement", to=sid)


@socketio.on("fire")
@safe_handler
def on_fire(data):
    sid = request.sid
    record = games.get(socket_game.get(sid))
    if not record:
        return
    game = record["game"]
    result = game.fire(sid, data.get("r"), data.get("c"))
    if not result["ok"]:
        socketio.emit("fireError", {"error": result["error"]}, to=sid)
        return
    payload = {
        "r": result["r"],
        "c": result["c"],
        "hit": result["hit"],
        "sunk": result["sunk"],
        "sunkCells": result["sunkCells"],
        "label": result["label"],
    }
    socketio.emit("fireResult", payload, to=sid)
    opp = game.opponent_of(sid)
    if opp["id"] != record["ai_id"]:
        socketio.emit("incomingFire", payload, to=opp["id"])
    if result["gameOver"]:
        handle_game_over(record)
        return
    emit_turn_state(record)
    maybe_run_ai(record)


@socketio.on("cancelSearch")
@safe_handler
def on_cancel_search(_data):
    global waiting_player
    if waiting_player and waiting_player["sid"] == request.sid:
        clear_waiting()


@socketio.on("disconnect")
def on_disconnect():
    global waiting_player
    sid = request.sid
    connected.discard(sid)
    if waiting_player and waiting_player["sid"] == sid:
        clear_waiting()
    record = games.get(socket_game.get(sid))
    if record:
        opp = record["game"].opponent_of(sid)
        if opp and opp["id"] != record["ai_id"]:
            socketio.emit("opponentLeft", to=opp["id"])
        games.pop(record["game"].id, None)
    socket_game.pop(sid, None)


if __name__ == "__main__":
    print(f"Battleship server listening on http://localhost:{PORT}")
    socketio.run(app, host="0.0.0.0", port=PORT)
