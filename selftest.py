"""Headless self-test of game rules + AI. Not part of runtime."""

import sys

from ai import AIBrain, random_placement
from game import Game, validate_placement, SHIPS

_pass = 0
_fail = 0


def ok(cond, msg):
    global _pass, _fail
    if cond:
        _pass += 1
    else:
        _fail += 1
        print("FAIL:", msg)


# 1. Placement validation
good = random_placement()
ok(validate_placement(good)["ok"], "random placement should be valid")

off_board = [dict(s, cells=[dict(c) for c in s["cells"]]) for s in good]
off_board[0]["cells"][0] = {"r": -1, "c": 0}
ok(not validate_placement(off_board)["ok"], "off-board rejected")

diagonal = [
    {"name": "Carrier", "cells": [{"r": 0, "c": 0}, {"r": 1, "c": 1}, {"r": 2, "c": 2}, {"r": 3, "c": 3}, {"r": 4, "c": 4}]},
    {"name": "Battleship", "cells": [{"r": 0, "c": 6}, {"r": 0, "c": 7}, {"r": 0, "c": 8}, {"r": 0, "c": 9}]},
    {"name": "Destroyer", "cells": [{"r": 2, "c": 0}, {"r": 2, "c": 1}, {"r": 2, "c": 2}]},
    {"name": "Submarine", "cells": [{"r": 4, "c": 0}, {"r": 4, "c": 1}, {"r": 4, "c": 2}]},
    {"name": "Patrol Boat", "cells": [{"r": 6, "c": 0}, {"r": 6, "c": 1}]},
]
ok(not validate_placement(diagonal)["ok"], "diagonal rejected")

overlap = [
    {"name": "Carrier", "cells": [{"r": 0, "c": 0}, {"r": 0, "c": 1}, {"r": 0, "c": 2}, {"r": 0, "c": 3}, {"r": 0, "c": 4}]},
    {"name": "Battleship", "cells": [{"r": 0, "c": 3}, {"r": 0, "c": 4}, {"r": 0, "c": 5}, {"r": 0, "c": 6}]},
    {"name": "Destroyer", "cells": [{"r": 2, "c": 0}, {"r": 2, "c": 1}, {"r": 2, "c": 2}]},
    {"name": "Submarine", "cells": [{"r": 4, "c": 0}, {"r": 4, "c": 1}, {"r": 4, "c": 2}]},
    {"name": "Patrol Boat", "cells": [{"r": 6, "c": 0}, {"r": 6, "c": 1}]},
]
ok(not validate_placement(overlap)["ok"], "overlap rejected")

wrong_count = good[:4]
ok(not validate_placement(wrong_count)["ok"], "wrong ship count rejected")


# 2. Full game simulation between two AIs
def simulate():
    game = Game("t", [{"id": "p1"}, {"id": "p2"}])
    game.place_ships("p1", random_placement())
    game.place_ships("p2", random_placement())
    if game.phase != "playing":
        return "did not start"
    brains = {"p1": AIBrain(), "p2": AIBrain()}
    turns = 0
    while game.phase == "playing" and turns < 500:
        me = game.current_player_id()
        shot = brains[me].next_shot()
        res = game.fire(me, shot["r"], shot["c"])
        if not res["ok"]:
            return f"illegal fire: {res['error']} at {shot['r']},{shot['c']}"
        brains[me].record(shot["r"], shot["c"], res)
        turns += 1
    if game.phase != "finished":
        return f"no winner after {turns}"
    return {"winner": game.winner, "turns": turns}


crashes = 0
total_turns = 0
N = 300
for _ in range(N):
    r = simulate()
    if isinstance(r, str):
        crashes += 1
        print("SIM ISSUE:", r)
    else:
        total_turns += r["turns"]
ok(crashes == 0, f"all {N} simulated games finished cleanly (crashes={crashes})")
print(f"Avg turns to finish: {total_turns / N:.1f}")

# 3. Turn alternation + double-fire rejection
g2 = Game("t2", [{"id": "a"}, {"id": "b"}])
g2.place_ships("a", random_placement())
g2.place_ships("b", random_placement())
first = g2.current_player_id()
g2.fire(first, 0, 0)
ok(g2.current_player_id() != first, "turn alternates after a shot")
dup = g2.fire("b" if g2.current_player_id() == "a" else "a", 0, 0)
ok(not dup["ok"], "out-of-turn fire rejected")

print(f"\n{_pass} passed, {_fail} failed")
sys.exit(1 if _fail else 0)
