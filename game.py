"""Authoritative Battleship game logic.

Lives entirely server-side so that opponent ship positions are NEVER exposed to
a client (anti-peek rule). Ported 1:1 from the original Node implementation.
"""

from __future__ import annotations

BOARD_SIZE = 10

# Ship name -> length
SHIPS = [
    {"name": "Carrier", "size": 5},
    {"name": "Battleship", "size": 4},
    {"name": "Destroyer", "size": 3},
    {"name": "Submarine", "size": 3},
    {"name": "Patrol Boat", "size": 2},
]

ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]


def coord_label(r, c):
    return f"{ROW_LABELS[r]}-{c + 1}"


def _is_int(v):
    # Mirror Number.isInteger: reject bools and non-ints.
    return isinstance(v, int) and not isinstance(v, bool)


def validate_placement(ships):
    """Validate a placement payload: list of { name, cells:[{r,c}] }.

    Enforces: on-board, straight (h/v), contiguous, no overlap, correct fleet.
    Returns {"ok": True} or {"ok": False, "error": str}.
    """
    if not isinstance(ships, list) or len(ships) != len(SHIPS):
        return {"ok": False, "error": "You must place exactly 5 ships."}

    required = {s["name"]: s["size"] for s in SHIPS}
    seen = set()
    occupied = set()

    for ship in ships:
        if (
            not isinstance(ship, dict)
            or not isinstance(ship.get("name"), str)
            or not isinstance(ship.get("cells"), list)
        ):
            return {"ok": False, "error": "Malformed ship data."}
        name = ship["name"]
        if name not in required:
            return {"ok": False, "error": f"Unknown ship: {name}"}
        if name in seen:
            return {"ok": False, "error": f"Duplicate ship: {name}"}
        seen.add(name)

        size = required[name]
        cells = ship["cells"]
        if len(cells) != size:
            return {"ok": False, "error": f"{name} must occupy {size} cells."}

        # Bounds + integer check
        for cell in cells:
            if not isinstance(cell, dict):
                return {"ok": False, "error": "Malformed ship data."}
            r = cell.get("r")
            c = cell.get("c")
            if (
                not _is_int(r)
                or not _is_int(c)
                or r < 0
                or r >= BOARD_SIZE
                or c < 0
                or c >= BOARD_SIZE
            ):
                return {"ok": False, "error": f"{name} is off the board."}

        # Straight + contiguous
        rows = [cell["r"] for cell in cells]
        cols = [cell["c"] for cell in cells]
        same_row = all(r == rows[0] for r in rows)
        same_col = all(c == cols[0] for c in cols)
        if not same_row and not same_col:
            return {"ok": False, "error": f"{name} must be straight (no diagonals)."}
        ordered = sorted(cells, key=(lambda x: x["c"]) if same_row else (lambda x: x["r"]))
        for i in range(1, len(ordered)):
            prev = ordered[i - 1]
            cur = ordered[i]
            step = (cur["c"] - prev["c"]) if same_row else (cur["r"] - prev["r"])
            if step != 1:
                return {"ok": False, "error": f"{name} cells must be contiguous."}

        # Overlap
        for cell in cells:
            key = (cell["r"], cell["c"])
            if key in occupied:
                return {"ok": False, "error": "Ships cannot overlap."}
            occupied.add(key)

    if len(seen) != len(SHIPS):
        return {"ok": False, "error": "Missing one or more ships."}

    return {"ok": True}


def _build_player_board(ships):
    """Build internal per-player state from a validated placement."""
    cell_map = {}  # (r,c) -> ship name
    ship_cells = {}  # name -> {"remaining": set, "cells": list}
    for ship in ships:
        remaining = set()
        for cell in ship["cells"]:
            key = (cell["r"], cell["c"])
            cell_map[key] = ship["name"]
            remaining.add(key)
        ship_cells[ship["name"]] = {
            "remaining": remaining,
            "cells": [dict(c) for c in ship["cells"]],
        }
    return {"cell_map": cell_map, "ship_cells": ship_cells, "shots_received": set()}


class Game:
    def __init__(self, game_id, players):
        self.id = game_id
        # players: [{ id, country, name }]
        self.players = [dict(p, board=None, ready=False) for p in players]
        self.phase = "placing"  # placing -> playing -> finished
        self.turn_index = 0  # index into self.players whose turn it is
        self.winner = None

    def get_player(self, player_id):
        return next((p for p in self.players if p["id"] == player_id), None)

    def opponent_of(self, player_id):
        return next((p for p in self.players if p["id"] != player_id), None)

    def place_ships(self, player_id, ships):
        if self.phase != "placing":
            return {"ok": False, "error": "Not in placement phase."}
        player = self.get_player(player_id)
        if not player:
            return {"ok": False, "error": "Unknown player."}
        if player["ready"]:
            return {"ok": False, "error": "Already placed."}
        valid = validate_placement(ships)
        if not valid["ok"]:
            return valid
        player["board"] = _build_player_board(ships)
        player["ready"] = True
        all_ready = all(p["ready"] for p in self.players)
        if all_ready:
            self.phase = "playing"
            self.turn_index = 0  # first registered player fires first
        return {"ok": True, "bothReady": all_ready}

    def current_player_id(self):
        return self.players[self.turn_index]["id"]

    def fire(self, player_id, r, c):
        """Fire at the opponent of player_id at (r, c)."""
        if self.phase != "playing":
            return {"ok": False, "error": "Game not in progress."}
        if self.current_player_id() != player_id:
            return {"ok": False, "error": "Not your turn."}
        if (
            not _is_int(r)
            or not _is_int(c)
            or r < 0
            or r >= BOARD_SIZE
            or c < 0
            or c >= BOARD_SIZE
        ):
            return {"ok": False, "error": "Shot off the board."}
        opponent = self.opponent_of(player_id)
        board = opponent["board"]
        key = (r, c)
        if key in board["shots_received"]:
            return {"ok": False, "error": "You already fired at that coordinate."}
        board["shots_received"].add(key)

        hit = False
        sunk = None
        sunk_cells = None
        game_over = False
        ship_name = board["cell_map"].get(key)
        if ship_name:
            hit = True
            ship = board["ship_cells"][ship_name]
            ship["remaining"].discard(key)
            if len(ship["remaining"]) == 0:
                sunk = ship_name
                # Ship is sunk and therefore fully revealed -- safe to send cells.
                sunk_cells = [dict(cell) for cell in ship["cells"]]

        # Check win: all opponent ships sunk
        if hit:
            all_sunk = all(
                len(s["remaining"]) == 0 for s in board["ship_cells"].values()
            )
            if all_sunk:
                game_over = True
                self.phase = "finished"
                self.winner = player_id

        if not game_over:
            # Alternate turns regardless of hit/miss
            self.turn_index = (self.turn_index + 1) % len(self.players)

        return {
            "ok": True,
            "r": r,
            "c": c,
            "hit": hit,
            "sunk": sunk,
            "sunkCells": sunk_cells,
            "gameOver": game_over,
            "label": coord_label(r, c),
        }

    def reveal_ships(self, player_id):
        """Full reveal of a player's ships (only used at game over)."""
        player = self.get_player(player_id)
        if not player or not player["board"]:
            return []
        return [
            {"name": name, "cells": s["cells"]}
            for name, s in player["board"]["ship_cells"].items()
        ]
