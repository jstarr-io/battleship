// Authoritative Battleship game logic. Lives entirely server-side so that
// opponent ship positions are NEVER exposed to a client (anti-peek rule).

export const BOARD_SIZE = 10;

// Ship name -> length
export const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Destroyer', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Patrol Boat', size: 2 },
];

export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function coordLabel(r, c) {
  return `${ROW_LABELS[r]}-${c + 1}`;
}

// Validate a placement payload: array of { name, cells:[{r,c}] }.
// Enforces: on-board, straight (h/v), contiguous, no overlap, correct fleet.
export function validatePlacement(ships) {
  if (!Array.isArray(ships) || ships.length !== SHIPS.length) {
    return { ok: false, error: 'You must place exactly 5 ships.' };
  }

  const required = new Map(SHIPS.map((s) => [s.name, s.size]));
  const seen = new Set();
  const occupied = new Set();

  for (const ship of ships) {
    if (!ship || typeof ship.name !== 'string' || !Array.isArray(ship.cells)) {
      return { ok: false, error: 'Malformed ship data.' };
    }
    if (!required.has(ship.name)) {
      return { ok: false, error: `Unknown ship: ${ship.name}` };
    }
    if (seen.has(ship.name)) {
      return { ok: false, error: `Duplicate ship: ${ship.name}` };
    }
    seen.add(ship.name);

    const size = required.get(ship.name);
    if (ship.cells.length !== size) {
      return { ok: false, error: `${ship.name} must occupy ${size} cells.` };
    }

    // Bounds + integer check
    for (const cell of ship.cells) {
      if (
        !Number.isInteger(cell.r) ||
        !Number.isInteger(cell.c) ||
        cell.r < 0 ||
        cell.r >= BOARD_SIZE ||
        cell.c < 0 ||
        cell.c >= BOARD_SIZE
      ) {
        return { ok: false, error: `${ship.name} is off the board.` };
      }
    }

    // Straight + contiguous
    const rows = ship.cells.map((c) => c.r);
    const cols = ship.cells.map((c) => c.c);
    const sameRow = rows.every((r) => r === rows[0]);
    const sameCol = cols.every((c) => c === cols[0]);
    if (!sameRow && !sameCol) {
      return { ok: false, error: `${ship.name} must be straight (no diagonals).` };
    }
    const sorted = [...ship.cells].sort((a, b) => (sameRow ? a.c - b.c : a.r - b.r));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const step = sameRow ? cur.c - prev.c : cur.r - prev.r;
      if (step !== 1) {
        return { ok: false, error: `${ship.name} cells must be contiguous.` };
      }
    }

    // Overlap
    for (const cell of ship.cells) {
      const key = `${cell.r},${cell.c}`;
      if (occupied.has(key)) {
        return { ok: false, error: 'Ships cannot overlap.' };
      }
      occupied.add(key);
    }
  }

  if (seen.size !== SHIPS.length) {
    return { ok: false, error: 'Missing one or more ships.' };
  }

  return { ok: true };
}

// Build internal per-player state from a validated placement.
function buildPlayerBoard(ships) {
  // cellMap: "r,c" -> ship name. shipCells: name -> Set of remaining (unhit) keys
  const cellMap = new Map();
  const shipCells = new Map();
  for (const ship of ships) {
    const remaining = new Set();
    for (const cell of ship.cells) {
      const key = `${cell.r},${cell.c}`;
      cellMap.set(key, ship.name);
      remaining.add(key);
    }
    shipCells.set(ship.name, { remaining, cells: ship.cells.map((c) => ({ ...c })) });
  }
  return { cellMap, shipCells, shotsReceived: new Set() };
}

export class Game {
  constructor(id, players) {
    this.id = id;
    // players: [{ id, country, name }]
    this.players = players.map((p) => ({ ...p, board: null, ready: false }));
    this.phase = 'placing'; // placing -> playing -> finished
    this.turnIndex = 0; // index into this.players whose turn it is
    this.winner = null;
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId);
  }

  opponentOf(playerId) {
    return this.players.find((p) => p.id !== playerId);
  }

  placeShips(playerId, ships) {
    if (this.phase !== 'placing') return { ok: false, error: 'Not in placement phase.' };
    const player = this.getPlayer(playerId);
    if (!player) return { ok: false, error: 'Unknown player.' };
    if (player.ready) return { ok: false, error: 'Already placed.' };
    const valid = validatePlacement(ships);
    if (!valid.ok) return valid;
    player.board = buildPlayerBoard(ships);
    player.ready = true;
    const allReady = this.players.every((p) => p.ready);
    if (allReady) {
      this.phase = 'playing';
      this.turnIndex = 0; // first registered player fires first
    }
    return { ok: true, bothReady: allReady };
  }

  currentPlayerId() {
    return this.players[this.turnIndex].id;
  }

  // Fire at the opponent of `playerId` at (r,c).
  fire(playerId, r, c) {
    if (this.phase !== 'playing') return { ok: false, error: 'Game not in progress.' };
    if (this.currentPlayerId() !== playerId) return { ok: false, error: 'Not your turn.' };
    if (
      !Number.isInteger(r) ||
      !Number.isInteger(c) ||
      r < 0 ||
      r >= BOARD_SIZE ||
      c < 0 ||
      c >= BOARD_SIZE
    ) {
      return { ok: false, error: 'Shot off the board.' };
    }
    const opponent = this.opponentOf(playerId);
    const board = opponent.board;
    const key = `${r},${c}`;
    if (board.shotsReceived.has(key)) {
      return { ok: false, error: 'You already fired at that coordinate.' };
    }
    board.shotsReceived.add(key);

    let hit = false;
    let sunk = null;
    let sunkCells = null;
    let gameOver = false;
    const shipName = board.cellMap.get(key);
    if (shipName) {
      hit = true;
      const ship = board.shipCells.get(shipName);
      ship.remaining.delete(key);
      if (ship.remaining.size === 0) {
        sunk = shipName;
        // Ship is sunk and therefore fully revealed — safe to send its cells.
        sunkCells = ship.cells.map((cell) => ({ ...cell }));
      }
    }

    // Check win: all opponent ships sunk
    if (hit) {
      const allSunk = [...board.shipCells.values()].every((s) => s.remaining.size === 0);
      if (allSunk) {
        gameOver = true;
        this.phase = 'finished';
        this.winner = playerId;
      }
    }

    if (!gameOver) {
      // Alternate turns regardless of hit/miss
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    }

    return { ok: true, r, c, hit, sunk, sunkCells, gameOver, label: coordLabel(r, c) };
  }

  // Full reveal of a player's ships (only used at game over).
  revealShips(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !player.board) return [];
    return [...player.board.shipCells.entries()].map(([name, s]) => ({
      name,
      cells: s.cells,
    }));
  }
}
