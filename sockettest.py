"""Integration test of the online (human-vs-human) protocol against a running
server. Two Socket.IO clients matchmake, place fleets, and play to a winner.

Run the server first:  PORT=3100 python app.py
Then:                  URL=http://localhost:3100 python sockettest.py
"""

import os
import sys
import threading
import time

import socketio

from ai import AIBrain, random_placement

URL = os.environ.get("URL", "http://localhost:3100")


class Client:
    def __init__(self, country, name):
        self.country = country
        self.name = name
        self.brain = AIBrain()
        self.my_turn = False
        self.won = None
        self.sio = socketio.Client()
        self._wire()

    def _wire(self):
        sio = self.sio

        @sio.on("gameStart")
        def on_game_start(_data):
            sio.emit("placeShips", {"ships": random_placement()})

        @sio.on("turn")
        def on_turn(data):
            self.my_turn = bool(data.get("yourTurn"))
            if self.my_turn:
                self._fire()

        @sio.on("fireResult")
        def on_fire_result(d):
            self.brain.record(d["r"], d["c"], d)

        @sio.on("gameOver")
        def on_game_over(d):
            self.won = bool(d.get("youWon"))
            done.set()

        @sio.on("opponentLeft")
        def on_opp_left(_=None):
            print(f"{self.name}: opponent left")

    def _fire(self):
        if not self.my_turn:
            return
        shot = self.brain.next_shot()
        self.sio.emit("fire", {"r": shot["r"], "c": shot["c"]})

    def connect(self):
        self.sio.connect(URL)

    def find_game(self):
        self.sio.emit("findGame", {"country": self.country, "name": self.name})


done = threading.Event()
results_seen = 0
results_lock = threading.Lock()


def main():
    a = Client("United States", "Alice")
    b = Client("Germany", "Bob")
    a.connect()
    b.connect()

    a.find_game()
    time.sleep(0.1)
    b.find_game()

    finished = done.wait(timeout=20)
    # Give the second gameOver a moment to land.
    time.sleep(0.5)
    a.sio.disconnect()
    b.sio.disconnect()

    if not finished or a.won is None or b.won is None:
        print(f"FAIL: timed out before game finished (Alice={a.won}, Bob={b.won})")
        sys.exit(1)

    exactly_one_winner = a.won != b.won
    print(f"Alice won: {a.won}, Bob won: {b.won}")
    print(
        "PASS: exactly one winner, both notified"
        if exactly_one_winner
        else "FAIL: winner mismatch"
    )
    sys.exit(0 if exactly_one_winner else 1)


if __name__ == "__main__":
    main()
