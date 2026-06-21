// Gameplay UI: dual 10x10 boards, drag-free click placement, firing, pins,
// ship-sunk announcements, battle log. Pure view layer; all rules are
// enforced server-side. Emits onReady(ships) and onFire(r,c) callbacks.

import { flagHTML } from './countries.js';
import { sfxHit, sfxMiss, sfxSunk, sfxClick } from './audio.js';

const SIZE = 10;
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

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
    cells.forEach(({ r, c }, i) => {
      this.placement.occupied.set(`${r},${c}`, ship.name);
      const el = this.own.at(r, c);
      el.classList.add('ship');
      el.dataset.ship = ship.name;
      // Ship segment metadata for silhouette rendering
      el.dataset.shipType = ship.name.toLowerCase().replace(/\s+/g, '-');
      el.dataset.shipOrient = orient;
      if (i === 0) el.dataset.shipSeg = 'bow';
      else if (i === cells.length - 1) el.dataset.shipSeg = 'stern';
      else el.dataset.shipSeg = 'mid';
    });
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
          cells.forEach(({ r: rr, c: cc }, i) => {
            occ.set(`${rr},${cc}`, ship.name);
            const el = this.own.at(rr, cc);
            el.classList.add('ship');
            el.dataset.ship = ship.name;
            el.dataset.shipType = ship.name.toLowerCase().replace(/\s+/g, '-');
            el.dataset.shipOrient = orient;
            if (i === 0) el.dataset.shipSeg = 'bow';
            else if (i === cells.length - 1) el.dataset.shipSeg = 'stern';
            else el.dataset.shipSeg = 'mid';
          });
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
