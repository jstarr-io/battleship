"""AI opponent: valid random ship placement + hunt/target firing strategy.

Ported 1:1 from the original Node implementation.
"""

from __future__ import annotations

import random

from game import BOARD_SIZE, SHIPS


def random_placement():
    """Generate a valid, non-overlapping random fleet placement."""
    occupied = set()
    ships = []
    for spec in SHIPS:
        name, size = spec["name"], spec["size"]
        placed = False
        guard = 0
        while not placed and guard < 1000:
            guard += 1
            horizontal = random.random() < 0.5
            r = random.randrange(BOARD_SIZE)
            c = random.randrange(BOARD_SIZE)
            cells = []
            fits = True
            for i in range(size):
                rr = r if horizontal else r + i
                cc = c + i if horizontal else c
                if rr >= BOARD_SIZE or cc >= BOARD_SIZE or (rr, cc) in occupied:
                    fits = False
                    break
                cells.append({"r": rr, "c": cc})
            if fits:
                for cell in cells:
                    occupied.add((cell["r"], cell["c"]))
                ships.append({"name": name, "cells": cells})
                placed = True
    return ships


class AIBrain:
    def __init__(self):
        self.tried = set()  # (r,c) already fired
        self.targets = []  # candidate cells to try next (target mode)
        self.hits_on_current = []  # unsunk hits, used to extend along a line

    @staticmethod
    def _in_bounds(r, c):
        return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE

    def next_shot(self):
        # Target mode: pull from queue if any valid remain
        while self.targets:
            t = self.targets.pop()
            if (t["r"], t["c"]) not in self.tried and self._in_bounds(t["r"], t["c"]):
                return t
        # Hunt mode: parity search (checkerboard) for unfired cells
        candidates = []
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if (r, c) in self.tried:
                    continue
                if (r + c) % 2 == 0:
                    candidates.append({"r": r, "c": c})
        if candidates:
            return random.choice(candidates)
        # Fallback: any remaining cell
        remaining = [
            {"r": r, "c": c}
            for r in range(BOARD_SIZE)
            for c in range(BOARD_SIZE)
            if (r, c) not in self.tried
        ]
        return random.choice(remaining) if remaining else {"r": 0, "c": 0}

    def record(self, r, c, result):
        self.tried.add((r, c))
        if result.get("hit"):
            self.hits_on_current.append({"r": r, "c": c})
            if result.get("sunk"):
                # Ship sunk: clear target focus and start fresh
                self.hits_on_current = []
                self.targets = []
                return
            self._queue_around(r, c)

    def _queue_around(self, r, c):
        # If we have 2+ collinear hits, prioritize extending along that line.
        if len(self.hits_on_current) >= 2:
            same_row = all(h["r"] == self.hits_on_current[0]["r"] for h in self.hits_on_current)
            same_col = all(h["c"] == self.hits_on_current[0]["c"] for h in self.hits_on_current)
            if same_row:
                cols = [h["c"] for h in self.hits_on_current]
                self._maybe_target(r, min(cols) - 1)
                self._maybe_target(r, max(cols) + 1)
                return
            if same_col:
                rows = [h["r"] for h in self.hits_on_current]
                self._maybe_target(min(rows) - 1, c)
                self._maybe_target(max(rows) + 1, c)
                return
        # Otherwise probe all four neighbors.
        self._maybe_target(r - 1, c)
        self._maybe_target(r + 1, c)
        self._maybe_target(r, c - 1)
        self._maybe_target(r, c + 1)

    def _maybe_target(self, r, c):
        if self._in_bounds(r, c) and (r, c) not in self.tried:
            self.targets.append({"r": r, "c": c})
