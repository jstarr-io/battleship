// AI opponent: valid random ship placement + hunt/target firing strategy.
import { BOARD_SIZE, SHIPS } from './game.js';

function randInt(n) {
  return Math.floor(Math.random() * n);
}

// Generate a valid, non-overlapping random fleet placement.
export function randomPlacement() {
  const occupied = new Set();
  const ships = [];
  for (const { name, size } of SHIPS) {
    let placed = false;
    let guard = 0;
    while (!placed && guard++ < 1000) {
      const horizontal = Math.random() < 0.5;
      const r = randInt(BOARD_SIZE);
      const c = randInt(BOARD_SIZE);
      const cells = [];
      let fits = true;
      for (let i = 0; i < size; i++) {
        const rr = horizontal ? r : r + i;
        const cc = horizontal ? c + i : c;
        if (rr >= BOARD_SIZE || cc >= BOARD_SIZE || occupied.has(`${rr},${cc}`)) {
          fits = false;
          break;
        }
        cells.push({ r: rr, c: cc });
      }
      if (fits) {
        cells.forEach((cell) => occupied.add(`${cell.r},${cell.c}`));
        ships.push({ name, cells });
        placed = true;
      }
    }
  }
  return ships;
}

export class AIBrain {
  constructor() {
    this.tried = new Set(); // "r,c" already fired
    this.targets = []; // candidate cells to try next (target mode)
    this.hitsOnCurrent = []; // unsunk hits, used to extend along a line
  }

  _key(r, c) {
    return `${r},${c}`;
  }

  _inBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  nextShot() {
    // Target mode: pull from queue if any valid remain
    while (this.targets.length) {
      const t = this.targets.pop();
      if (!this.tried.has(this._key(t.r, t.c)) && this._inBounds(t.r, t.c)) {
        return t;
      }
    }
    // Hunt mode: parity search (checkerboard) for unfired cells
    const candidates = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.tried.has(this._key(r, c))) continue;
        if ((r + c) % 2 === 0) candidates.push({ r, c });
      }
    }
    if (candidates.length) return candidates[randInt(candidates.length)];
    // Fallback: any remaining cell
    const all = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!this.tried.has(this._key(r, c))) all.push({ r, c });
      }
    }
    return all.length ? all[randInt(all.length)] : { r: 0, c: 0 };
  }

  record(r, c, result) {
    this.tried.add(this._key(r, c));
    if (result.hit) {
      this.hitsOnCurrent.push({ r, c });
      if (result.sunk) {
        // Ship sunk: clear target focus and start fresh
        this.hitsOnCurrent = [];
        this.targets = [];
        return;
      }
      this._queueAround(r, c);
    }
  }

  _queueAround(r, c) {
    // If we have 2+ collinear hits, prioritize extending along that line.
    if (this.hitsOnCurrent.length >= 2) {
      const sameRow = this.hitsOnCurrent.every((h) => h.r === this.hitsOnCurrent[0].r);
      const sameCol = this.hitsOnCurrent.every((h) => h.c === this.hitsOnCurrent[0].c);
      if (sameRow) {
        const cols = this.hitsOnCurrent.map((h) => h.c);
        const minC = Math.min(...cols);
        const maxC = Math.max(...cols);
        this._maybeTarget(r, minC - 1);
        this._maybeTarget(r, maxC + 1);
        return;
      }
      if (sameCol) {
        const rows = this.hitsOnCurrent.map((h) => h.r);
        const minR = Math.min(...rows);
        const maxR = Math.max(...rows);
        this._maybeTarget(minR - 1, c);
        this._maybeTarget(maxR + 1, c);
        return;
      }
    }
    // Otherwise probe all four neighbors.
    this._maybeTarget(r - 1, c);
    this._maybeTarget(r + 1, c);
    this._maybeTarget(r, c - 1);
    this._maybeTarget(r, c + 1);
  }

  _maybeTarget(r, c) {
    if (this._inBounds(r, c) && !this.tried.has(this._key(r, c))) {
      this.targets.push({ r, c });
    }
  }
}
