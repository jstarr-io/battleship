// Gameplay UI: dual 10x10 boards, drag-free click placement, firing, pins,
// ship-sunk announcements, battle log. Pure view layer; all rules are
// enforced server-side. Emits onReady(ships) and onFire(r,c) callbacks.

import { flagHTML } from './countries.js';
import { sfxHit, sfxMiss, sfxSunk, sfxClick } from './audio.js';

const SIZE = 10;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Top-down ship silhouette SVG paths (horizontal, bow pointing LEFT).
// Each path is drawn in a viewBox of [shipLength*100 x 100].
// Shapes mimic classic Battleship board-game pieces viewed from above.
const SHIP_PATHS = {
  carrier: {
    hull: 'M 5,50 L 35,15 L 70,15 L 70,12 L 460,12 L 480,18 L 495,35 L 495,65 L 480,82 L 460,88 L 70,88 L 70,85 L 35,85 Z',
    details: [
      // Flight deck rectangle
      'M 80,18 L 440,18 L 440,82 L 80,82 Z',
      // Deck center line
      'M 80,50 L 440,50',
      // Cross lines on deck
      'M 140,18 L 140,82', 'M 220,18 L 220,82', 'M 300,18 L 300,82', 'M 380,18 L 380,82',
      // Island superstructure (starboard)
      'M 320,12 L 320,5 L 380,5 L 380,12',
    ]
  },
  battleship: {
    hull: 'M 5,50 L 30,20 L 60,16 L 360,16 L 380,22 L 393,35 L 393,65 L 380,78 L 360,84 L 60,84 L 30,80 Z',
    details: [
      // Forward turret A
      'M 75,36 A 14,14 0 1,1 75,64 A 14,14 0 1,1 75,36 Z',
      'M 75,50 L 45,50',
      // Forward turret B
      'M 130,36 A 14,14 0 1,1 130,64 A 14,14 0 1,1 130,36 Z',
      'M 130,50 L 100,50',
      // Bridge superstructure
      'M 185,25 L 185,12 L 230,12 L 230,25',
      'M 185,75 L 185,88 L 230,88 L 230,75',
      // Aft turret X
      'M 290,36 A 14,14 0 1,1 290,64 A 14,14 0 1,1 290,36 Z',
      'M 290,50 L 315,50',
      // Aft turret Y
      'M 345,36 A 14,14 0 1,1 345,64 A 14,14 0 1,1 345,36 Z',
      'M 345,50 L 370,50',
    ]
  },
  destroyer: {
    hull: 'M 5,50 L 30,22 L 55,18 L 260,18 L 278,25 L 292,38 L 292,62 L 278,75 L 260,82 L 55,82 L 30,78 Z',
    details: [
      // Forward gun
      'M 65,38 A 12,12 0 1,1 65,62 A 12,12 0 1,1 65,38 Z',
      'M 65,50 L 38,50',
      // Bridge
      'M 125,18 L 125,10 L 165,10 L 165,18',
      // Aft gun
      'M 230,38 A 12,12 0 1,1 230,62 A 12,12 0 1,1 230,38 Z',
      'M 230,50 L 257,50',
      // Funnel
      'M 190,22 L 190,14 L 205,14 L 205,22',
    ]
  },
  submarine: {
    hull: 'M 8,50 C 8,32 30,18 60,18 L 240,18 C 270,18 292,32 292,50 C 292,68 270,82 240,82 L 60,82 C 30,82 8,68 8,50 Z',
    details: [
      // Conning tower (raised fairwater)
      'M 125,18 L 125,6 L 175,6 L 175,18',
      // Periscopes
      'M 140,6 L 140,2', 'M 160,6 L 160,2',
      // Forward diving planes
      'M 50,18 L 40,10 M 50,82 L 40,90',
      // Aft planes
      'M 250,18 L 260,10 M 250,82 L 260,90',
      // Hull centerline
      'M 60,50 L 240,50',
    ]
  },
  'patrol-boat': {
    hull: 'M 5,50 L 25,25 L 45,22 L 158,22 L 175,30 L 192,42 L 192,58 L 175,70 L 158,78 L 45,78 L 25,75 Z',
    details: [
      // Bridge
      'M 85,22 L 85,14 L 115,14 L 115,22',
      // Forward gun
      'M 45,38 A 10,10 0 1,1 45,62 A 10,10 0 1,1 45,38 Z',
      'M 45,50 L 25,50',
      // Aft gun
      'M 150,40 A 8,8 0 1,1 150,60 A 8,8 0 1,1 150,40 Z',
      'M 150,50 L 168,50',
    ]
  }
};

// Create an SVG element for a ship overlay on the grid.
function createShipSVG(shipType, orient, size) {
  const pathData = SHIP_PATHS[shipType];
  if (!pathData) return null;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const vbW = size * 100;
  const vbH = 100;
  svg.setAttribute('viewBox', `0 0 ${orient === 'H' ? vbW : vbH} ${orient === 'H' ? vbH : vbW}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('ship-overlay');
  svg.dataset.shipType = shipType;

  const g = document.createElementNS(ns, 'g');
  // For vertical ships, rotate the horizontal paths 90° around (50,50)
  if (orient === 'V') {
    g.setAttribute('transform', `rotate(90, ${vbH / 2}, ${vbH / 2})`);
  }

  // Hull path
  const hull = document.createElementNS(ns, 'path');
  hull.setAttribute('d', pathData.hull);
  hull.classList.add('ship-hull-path');
  g.appendChild(hull);

  // Detail paths
  pathData.details.forEach(d => {
    const detail = document.createElementNS(ns, 'path');
    detail.setAttribute('d', d);
    detail.classList.add('ship-detail-path');
    g.appendChild(detail);
  });

  svg.appendChild(g);
  return svg;
}

function makeGrid(hostId) {
  const host = document.getElementById(hostId);
  host.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';

  // corner
  grid.appendChild(cell('grid-corner'));
  // column headers 1..10
  for (let c = 0; c < SIZE; c++) {
    const h = cell('grid-head');
    h.textContent = c + 1;
    grid.appendChild(h);
  }
  // rows
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    const rh = cell('grid-head');
    rh.textContent = ROW_LABELS[r];
    grid.appendChild(rh);
    for (let c = 0; c < SIZE; c++) {
      const cl = cell('grid-cell');
      cl.dataset.r = r;
      cl.dataset.c = c;
      grid.appendChild(cl);
      cells.push(cl);
    }
  }
  host.appendChild(grid);
  return { host, grid, cells, at: (r, c) => cells[r * SIZE + c] };
}

function cell(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

export class BattleshipUI {
  constructor({ onReady, onFire }) {
    this.onReady = onReady;
    this.onFire = onFire;
    this.shipDefs = [];
    this.reset();
    this._wireControls();
    this._wireDragListeners();
  }

  reset() {
    this.own = makeGrid('board-own');
    this.tracking = makeGrid('board-tracking');
    this.placement = {
      ships: [],
      orientation: 'H',
      occupied: new Map(), // "r,c" -> shipName
      activeIndex: 0,
    };
    this.myTurn = false;
    this.placed = false;
    this.firing = false;
    this._clearLog();
    this._wireOwnHover();
    this._wireTrackingClicks();
  }

  setHeader(you, opp) {
    const youTag = document.getElementById('tag-you');
    const oppTag = document.getElementById('tag-opp');
    youTag.innerHTML = `${flagHTML(you.country)}<div class="tag-meta"><span class="tag-name">${escapeHtml(
      you.name
    )}</span><span class="tag-country">${escapeHtml(you.country)}</span></div>`;
    oppTag.innerHTML = `<div class="tag-meta right"><span class="tag-name">${escapeHtml(
      opp.name
    )}</span><span class="tag-country">${escapeHtml(opp.country)}</span></div>${flagHTML(opp.country)}`;
  }

  setupPlacement(shipDefs) {
    this.shipDefs = shipDefs;
    this.placement.ships = shipDefs.map((s) => ({ ...s, placed: false, cells: [] }));
    this.placement.activeIndex = 0;
    this._renderFleetList();
    document.getElementById('placement-panel').classList.remove('hidden');
    this._setMsg('Place your fleet — click to drop, drag to move, ⟳ to rotate.');
    this._updateReadyBtn();
  }

  _wireControls() {
    // A fresh BattleshipUI is built per game while these buttons persist in the
    // DOM, so replace each node first to drop listeners bound to prior instances.
    const rebind = (id, handler) => {
      const old = document.getElementById(id);
      const fresh = old.cloneNode(true);
      old.parentNode.replaceChild(fresh, old);
      fresh.addEventListener('click', handler);
    };
    rebind('btn-random', () => {
      sfxClick();
      this._randomize();
    });
    rebind('btn-reset', () => {
      sfxClick();
      this._resetPlacement();
    });
    rebind('btn-ready', () => {
      if (!this._allPlaced()) return;
      sfxClick();
      const ships = this.placement.ships.map((s) => ({ name: s.name, cells: s.cells }));
      this.onReady(ships);
    });
  }

  _renderFleetList() {
    const list = document.getElementById('fleet-list');
    list.innerHTML = '';
    this.placement.ships.forEach((s, i) => {
      const el = document.createElement('button');
      el.className = 'fleet-item' + (s.placed ? ' placed' : '') + (i === this.placement.activeIndex ? ' active' : '');
      const pips = '◀' + '▬'.repeat(s.size - 2) + '▶';
      el.innerHTML = `<span class="fleet-name">${s.name}</span><span class="fleet-pips">${pips}</span>`;
      el.addEventListener('click', () => {
        if (s.placed) return; // placed ships are repositioned by dragging
        sfxClick();
        this.placement.activeIndex = i;
        this._renderFleetList();
      });
      list.appendChild(el);
    });
  }

  // The ship currently queued for placement, or null if all are placed.
  _activeShip() {
    const p = this.placement;
    const cur = p.ships[p.activeIndex];
    if (cur && !cur.placed) return cur;
    const next = p.ships.findIndex((s) => !s.placed);
    if (next >= 0) {
      p.activeIndex = next;
      return p.ships[next];
    }
    return null;
  }

  _cellsFor(ship, r, c) {
    const cells = [];
    for (let i = 0; i < ship.size; i++) {
      const rr = this.placement.orientation === 'H' ? r : r + i;
      const cc = this.placement.orientation === 'H' ? c + i : c;
      cells.push({ r: rr, c: cc });
    }
    return cells;
  }

  _valid(cells, ignoreName = null) {
    for (const { r, c } of cells) {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
      const occ = this.placement.occupied.get(`${r},${c}`);
      if (occ && occ !== ignoreName) return false;
    }
    return true;
  }

  _wireOwnHover() {
    this.drag = null;
    this._hoverCell = null;
    this.own.cells.forEach((cl) => {
      const r = +cl.dataset.r;
      const c = +cl.dataset.c;

      cl.addEventListener('mouseenter', () => {
        if (this.placed) return;
        this._hoverCell = { r, c };
        if (this.drag) {
          this._previewCells(this._dragCells(r, c), this.drag.ship.name);
          return;
        }
        const ship = this._activeShip();
        if (!ship) {
          this._clearPreview();
          return;
        }
        this._previewCells(this._cellsFor(ship, r, c));
      });

      // Begin dragging an already-placed ship to reposition it.
      cl.addEventListener('mousedown', (e) => {
        if (this.placed) return;
        const name = cl.dataset.ship;
        if (!name) return;
        e.preventDefault();
        this._startDrag(name, r, c);
      });

      // Click an empty cell to drop the queued (unplaced) ship.
      cl.addEventListener('click', () => {
        if (this.placed || this.drag) return;
        if (cl.dataset.ship) return; // occupied cell: not a placement target
        const ship = this._activeShip();
        if (!ship) return;
        const cells = this._cellsFor(ship, r, c);
        if (!this._valid(cells)) {
          this._setMsg('Invalid spot — keep ships on the grid and unstacked.', true);
          return;
        }
        sfxClick();
        this._commitShip(ship, cells);
        ship.pivot = { r, c };
        ship.facing = this.placement.orientation === 'H' ? 0 : 1;
        this._clearPreview();
        this._renderFleetList();
        this._renderShipIcons();
        this._updateReadyBtn();
        if (this._allPlaced()) this._setMsg('Fleet ready. Press READY FOR BATTLE.');
      });
    });

    this.own.host.addEventListener('mouseleave', () => {
      this._hoverCell = null;
      if (!this.drag) this._clearPreview();
    });
  }

  _previewCells(cells, ignoreName = null) {
    const ok = this._valid(cells, ignoreName);
    this._clearPreview();
    cells.forEach(({ r, c }) => {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
      this.own.at(r, c).classList.add(ok ? 'preview-ok' : 'preview-bad');
    });
  }

  // Place ship cells onto the board + occupancy map.
  _commitShip(ship, cells) {
    ship.placed = true;
    ship.cells = cells;
    const orient = cells.length < 2 || cells[0].r === cells[1].r ? 'H' : 'V';
    const sorted = orient === 'H'
      ? [...cells].sort((a, b) => a.c - b.c)
      : [...cells].sort((a, b) => a.r - b.r);
    cells.forEach(({ r, c }) => {
      this.placement.occupied.set(`${r},${c}`, ship.name);
      const el = this.own.at(r, c);
      el.classList.add('ship');
      el.dataset.ship = ship.name;
      el.dataset.shipType = ship.name.toLowerCase().replace(/\s+/g, '-');
      el.dataset.shipOrient = orient;
      const idx = sorted.findIndex(s => s.r === r && s.c === c);
      if (idx === 0) el.dataset.shipSeg = 'bow';
      else if (idx === sorted.length - 1) el.dataset.shipSeg = 'stern';
      else el.dataset.shipSeg = 'mid';
    });
    this._addShipOverlay(ship, sorted, orient);
  }

  _removeShipCells(ship) {
    ship.cells.forEach(({ r, c }) => {
      this.placement.occupied.delete(`${r},${c}`);
      const el = this.own.at(r, c);
      el.classList.remove('ship');
      delete el.dataset.ship;
      delete el.dataset.shipType;
      delete el.dataset.shipOrient;
      delete el.dataset.shipSeg;
    });
    this._removeShipOverlay(ship);
  }

  // Add SVG ship silhouette overlay positioned on the grid.
  _addShipOverlay(ship, sorted, orient) {
    this._removeShipOverlay(ship);
    const shipType = ship.name.toLowerCase().replace(/\s+/g, '-');
    const svg = createShipSVG(shipType, orient, ship.size);
    if (!svg) return;
    svg.dataset.overlayFor = ship.name;
    // Position using CSS grid placement (row+2, col+2 accounts for header row/col)
    const anchor = sorted[0];
    if (orient === 'H') {
      svg.style.gridRow = `${anchor.r + 2} / ${anchor.r + 3}`;
      svg.style.gridColumn = `${anchor.c + 2} / ${anchor.c + ship.size + 2}`;
    } else {
      svg.style.gridRow = `${anchor.r + 2} / ${anchor.r + ship.size + 2}`;
      svg.style.gridColumn = `${anchor.c + 2} / ${anchor.c + 3}`;
    }
    this.own.grid.appendChild(svg);
  }

  _removeShipOverlay(ship) {
    const existing = this.own.grid.querySelector(`[data-overlay-for="${ship.name}"]`);
    if (existing) existing.remove();
  }

  _shipOrient(ship) {
    return ship.cells.length < 2 || ship.cells[0].r === ship.cells[1].r ? 'H' : 'V';
  }

  // Top/left-most cell of a ship — the pivot used for rotation.
  _shipAnchor(ship) {
    return [...ship.cells].sort((a, b) => a.r - b.r || a.c - b.c)[0];
  }

  // Persistent rotate (⟳) icons on each placed ship, shown only during setup.
  _renderShipIcons() {
    this.own.host.querySelectorAll('.ship-rotate').forEach((b) => b.remove());
    if (this.placed) return;
    this.placement.ships.forEach((ship) => {
      if (!ship.placed) return;
      const pivot = ship.pivot || this._shipAnchor(ship);
      const cell = this.own.at(pivot.r, pivot.c);
      const btn = document.createElement('button');
      btn.className = 'ship-rotate';
      btn.type = 'button';
      btn.title = `Rotate ${ship.name}`;
      btn.textContent = '⟳';
      const stop = (e) => e.stopPropagation();
      btn.addEventListener('mousedown', stop);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._rotateShip(ship);
      });
      cell.appendChild(btn);
    });
  }

  // Ship cells laid out from a fixed pivot in one of 4 directions.
  // facing: 0=East (right), 1=South (down), 2=West (left), 3=North (up).
  _cellsFrom(pivot, facing, size) {
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const [dr, dc] = dirs[facing];
    const cells = [];
    for (let i = 0; i < size; i++) cells.push({ r: pivot.r + dr * i, c: pivot.c + dc * i });
    return cells;
  }

  _shipFacing(ship) {
    if (ship.facing != null) return ship.facing;
    return this._shipOrient(ship) === 'H' ? 0 : 1;
  }

  // Rotate around the ship's pivot to the next orientation that fits,
  // cycling right -> down -> left -> up and skipping invalid ones.
  _rotateShip(ship) {
    const pivot = ship.pivot || this._shipAnchor(ship);
    const cur = this._shipFacing(ship);
    for (let k = 1; k <= 3; k++) {
      const facing = (cur + k) % 4;
      const cells = this._cellsFrom(pivot, facing, ship.size);
      if (this._valid(cells, ship.name)) {
        sfxClick();
        this._removeShipCells(ship);
        this._commitShip(ship, cells);
        ship.pivot = pivot;
        ship.facing = facing;
        this._renderShipIcons();
        this._setMsg(`${ship.name} rotated.`);
        return;
      }
    }
    this._setMsg(`Can't rotate ${ship.name} — no room without going off-board or overlapping.`, true);
  }

  _startDrag(name, gr, gc) {
    const ship = this.placement.ships.find((s) => s.name === name);
    if (!ship || !ship.placed) return;
    const orient = this._shipOrient(ship);
    const sorted = [...ship.cells].sort((a, b) => (orient === 'H' ? a.c - b.c : a.r - b.r));
    const offset = sorted.findIndex((cell) => cell.r === gr && cell.c === gc);
    this.drag = { ship, orient, offset: offset < 0 ? 0 : offset };
    this._setMsg(`Repositioning ${ship.name} — release over a valid spot.`);
    this._previewCells(this._dragCells(gr, gc), ship.name);
  }

  _dragCells(r, c) {
    const { ship, orient, offset } = this.drag;
    const cells = [];
    for (let i = 0; i < ship.size; i++) {
      if (orient === 'H') cells.push({ r, c: c - offset + i });
      else cells.push({ r: r - offset + i, c });
    }
    return cells;
  }

  _endDrag() {
    if (!this.drag) return;
    const { ship } = this.drag;
    const hover = this._hoverCell;
    if (hover) {
      const cells = this._dragCells(hover.r, hover.c);
      if (this._valid(cells, ship.name)) {
        this._removeShipCells(ship);
        this._commitShip(ship, cells);
        ship.pivot = this._shipAnchor(ship);
        ship.facing = this._shipOrient(ship) === 'H' ? 0 : 1;
        this._renderShipIcons();
        sfxClick();
        this._setMsg(this._allPlaced() ? 'Fleet ready. Press READY FOR BATTLE.' : 'Ship moved.');
      } else {
        this._setMsg('Could not move there — kept the ship in place.', true);
      }
    }
    this.drag = null;
    this._clearPreview();
  }

  _wireDragListeners() {
    // Released anywhere (incl. off-grid) ends an in-progress drag.
    document.addEventListener('mouseup', () => this._endDrag());
  }

  _clearPreview() {
    this.own.cells.forEach((c) => c.classList.remove('preview-ok', 'preview-bad'));
  }

  _allPlaced() {
    return this.placement.ships.length > 0 && this.placement.ships.every((s) => s.placed);
  }

  _updateReadyBtn() {
    document.getElementById('btn-ready').disabled = !this._allPlaced();
  }

  _resetPlacement() {
    this.placement.occupied.clear();
    this.placement.ships.forEach((s) => {
      this._removeShipOverlay(s);
      s.placed = false;
      s.cells = [];
      s.pivot = null;
      s.facing = null;
    });
    this.placement.activeIndex = 0;
    this.own.cells.forEach((c) => {
      c.classList.remove('ship');
      delete c.dataset.ship;
      delete c.dataset.shipType;
      delete c.dataset.shipOrient;
      delete c.dataset.shipSeg;
    });
    this._renderFleetList();
    this._renderShipIcons();
    this._updateReadyBtn();
    this._setMsg('Cleared. Place your fleet again.');
  }

  _randomize() {
    this._resetPlacement();
    const occ = this.placement.occupied;
    for (const ship of this.placement.ships) {
      let placed = false;
      let guard = 0;
      while (!placed && guard++ < 1000) {
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        const cells = [];
        let ok = true;
        for (let i = 0; i < ship.size; i++) {
          const rr = horiz ? r : r + i;
          const cc = horiz ? c + i : c;
          if (rr >= SIZE || cc >= SIZE || occ.has(`${rr},${cc}`)) {
            ok = false;
            break;
          }
          cells.push({ r: rr, c: cc });
        }
        if (ok) {
          ship.placed = true;
          ship.cells = cells;
          ship.pivot = { r, c };
          ship.facing = horiz ? 0 : 1;
          const orient = horiz ? 'H' : 'V';
          const sorted = orient === 'H'
            ? [...cells].sort((a, b) => a.c - b.c)
            : [...cells].sort((a, b) => a.r - b.r);
          cells.forEach(({ r: rr, c: cc }) => {
            occ.set(`${rr},${cc}`, ship.name);
            const el = this.own.at(rr, cc);
            el.classList.add('ship');
            el.dataset.ship = ship.name;
            el.dataset.shipType = ship.name.toLowerCase().replace(/\s+/g, '-');
            el.dataset.shipOrient = orient;
            const idx = sorted.findIndex(s => s.r === rr && s.c === cc);
            if (idx === 0) el.dataset.shipSeg = 'bow';
            else if (idx === sorted.length - 1) el.dataset.shipSeg = 'stern';
            else el.dataset.shipSeg = 'mid';
          });
          this._addShipOverlay(ship, sorted, orient);
          placed = true;
        }
      }
    }
    this._renderFleetList();
    this._renderShipIcons();
    this._updateReadyBtn();
    this._setMsg('Fleet randomized. Adjust or press READY FOR BATTLE.');
  }

  onPlaceAccepted() {
    this.placed = true;
    this._renderShipIcons(); // removes rotate icons now that ships are locked
    document.querySelectorAll('#placement-panel .placement-controls .btn').forEach((b) => (b.disabled = true));
    this._setMsg('Fleet locked in. Awaiting the enemy…');
  }

  onPlaceError(msg) {
    this._setMsg(msg || 'Placement rejected.', true);
  }

  onBattleStart() {
    document.getElementById('placement-panel').classList.add('hidden');
    this.log('Battle commences!', 'sys');
  }

  setTurn(yourTurn) {
    this.myTurn = yourTurn;
    const ind = document.getElementById('turn-indicator');
    ind.textContent = yourTurn ? 'YOUR MOVE — FIRE!' : "ENEMY'S MOVE…";
    ind.className = 'turn-indicator ' + (yourTurn ? 'active' : 'waiting');
    this.tracking.host.classList.toggle('armed', yourTurn);
  }

  _wireTrackingClicks() {
    this.tracking.cells.forEach((cl) => {
      cl.addEventListener('click', () => {
        if (!this.myTurn || this.firing) return;
        if (cl.classList.contains('hit') || cl.classList.contains('miss')) return;
        const r = +cl.dataset.r;
        const c = +cl.dataset.c;
        this.firing = true;
        this.onFire(r, c);
      });
    });
  }

  // Result of OUR shot, shown on tracking grid.
  onFireResult(d) {
    this.firing = false;
    const el = this.tracking.at(d.r, d.c);
    if (d.hit) {
      el.classList.add('hit');
      el.innerHTML = '<span class="pin red"></span>';
      sfxHit();
      this.log(`You fired ${d.label} — HIT.`, 'hit');
      if (d.sunk) {
        sfxSunk();
        this._explodeShip(this.tracking, d.sunkCells || [{ r: d.r, c: d.c }]);
        this.log(`You SUNK the enemy ${d.sunk}!`, 'sunk');
        this._announce(`ENEMY ${d.sunk.toUpperCase()} SUNK!`);
      }
    } else {
      el.classList.add('miss');
      el.innerHTML = '<span class="pin white"></span>';
      sfxMiss();
      this.log(`You fired ${d.label} — miss.`, 'miss');
    }
  }

  // ENEMY shot landing on OUR waters.
  onIncomingFire(d) {
    const el = this.own.at(d.r, d.c);
    if (d.hit) {
      el.classList.add('hit');
      el.insertAdjacentHTML('beforeend', '<span class="pin red"></span>');
      sfxHit();
      this.log(`Enemy fired ${d.label} — HIT on your fleet.`, 'hit');
      if (d.sunk) {
        sfxSunk();
        this._explodeShip(this.own, d.sunkCells || [{ r: d.r, c: d.c }]);
        this.log(`Your ${d.sunk} was SUNK!`, 'sunk');
        this._announce(`YOUR ${d.sunk.toUpperCase()} SUNK!`, true);
      }
    } else {
      el.classList.add('miss');
      el.insertAdjacentHTML('beforeend', '<span class="pin white"></span>');
      sfxMiss();
      this.log(`Enemy fired ${d.label} — miss.`, 'miss');
    }
  }

  // Detonate the whole sunk ship: a staggered chain of blasts, one per cell.
  _explodeShip(grid, cells) {
    if (!grid || !Array.isArray(cells) || cells.length === 0) return;
    cells.forEach((cell, i) => {
      const el = grid.at(cell.r, cell.c);
      setTimeout(() => this._explode(el), i * 70);
    });
  }

  // Big dynamite blast on a single cell: flash + fireball + shockwave + shrapnel + smoke.
  _explode(el) {
    if (!el) return;
    const boom = document.createElement('div');
    boom.className = 'boom';
    const flash = document.createElement('span');
    flash.className = 'boom-flash';
    boom.appendChild(flash);
    const ring = document.createElement('span');
    ring.className = 'boom-ring';
    boom.appendChild(ring);
    const ring2 = document.createElement('span');
    ring2.className = 'boom-ring ring2';
    boom.appendChild(ring2);
    const smoke = document.createElement('span');
    smoke.className = 'boom-smoke';
    boom.appendChild(smoke);
    const frags = 18;
    for (let i = 0; i < frags; i++) {
      const p = document.createElement('span');
      p.className = 'boom-frag';
      const ang = (Math.PI * 2 * i) / frags + Math.random() * 0.4;
      const dist = 42 + Math.random() * 34;
      p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
      p.style.animationDelay = `${Math.floor(Math.random() * 60)}ms`;
      boom.appendChild(p);
    }
    const core = document.createElement('span');
    core.className = 'boom-core';
    boom.appendChild(core);
    el.appendChild(boom);
    setTimeout(() => boom.remove(), 1300);
  }

  _announce(text, bad = false) {
    const ind = document.getElementById('turn-indicator');
    const prev = ind.textContent;
    ind.textContent = text;
    ind.classList.add(bad ? 'flash-bad' : 'flash-good');
    setTimeout(() => {
      ind.classList.remove('flash-bad', 'flash-good');
      ind.textContent = prev;
    }, 1400);
  }

  log(text, kind = 'sys') {
    const logEl = document.getElementById('battle-log');
    const line = document.createElement('div');
    line.className = 'log-line ' + kind;
    line.textContent = text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  _clearLog() {
    const logEl = document.getElementById('battle-log');
    if (logEl) logEl.innerHTML = '';
  }

  _setMsg(text, bad = false) {
    const el = document.getElementById('placement-msg');
    el.textContent = text;
    el.className = 'placement-msg' + (bad ? ' bad' : '');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
