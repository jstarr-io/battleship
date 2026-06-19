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
    this._setMsg('Place your fleet. Click a cell to drop the highlighted ship.');
    this._updateReadyBtn();
  }

  _wireControls() {
    document.getElementById('btn-orient').addEventListener('click', () => {
      sfxClick();
      this.placement.orientation = this.placement.orientation === 'H' ? 'V' : 'H';
      document.getElementById('btn-orient').textContent =
        'ORIENT: ' + (this.placement.orientation === 'H' ? 'HORIZONTAL' : 'VERTICAL');
    });
    document.getElementById('btn-random').addEventListener('click', () => {
      sfxClick();
      this._randomize();
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      sfxClick();
      this._resetPlacement();
    });
    document.getElementById('btn-ready').addEventListener('click', () => {
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
      el.innerHTML = `<span class="fleet-name">${s.name}</span><span class="fleet-pips">${'▪'.repeat(
        s.size
      )}</span>`;
      el.addEventListener('click', () => {
        sfxClick();
        this.placement.activeIndex = i;
        this._renderFleetList();
      });
      list.appendChild(el);
    });
  }

  _activeShip() {
    const p = this.placement;
    if (!p.ships[p.activeIndex] || p.ships[p.activeIndex].placed) {
      const next = p.ships.findIndex((s) => !s.placed);
      if (next >= 0) p.activeIndex = next;
    }
    return p.ships[p.activeIndex];
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
    this.own.cells.forEach((cl) => {
      cl.addEventListener('mouseenter', () => {
        if (this.placed) return;
        const ship = this._activeShip();
        if (!ship) return;
        const r = +cl.dataset.r;
        const c = +cl.dataset.c;
        const cells = this._cellsFor(ship, r, c);
        const ok = this._valid(cells);
        this._clearPreview();
        cells.forEach(({ r: rr, c: cc }) => {
          if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return;
          const el = this.own.at(rr, cc);
          el.classList.add(ok ? 'preview-ok' : 'preview-bad');
        });
      });
      cl.addEventListener('click', () => {
        if (this.placed) return;
        const ship = this._activeShip();
        if (!ship) return;
        const r = +cl.dataset.r;
        const c = +cl.dataset.c;
        const cells = this._cellsFor(ship, r, c);
        if (!this._valid(cells)) {
          this._setMsg('Invalid spot — keep ships on the grid and unstacked.', true);
          return;
        }
        sfxClick();
        ship.placed = true;
        ship.cells = cells;
        cells.forEach(({ r: rr, c: cc }) => {
          this.placement.occupied.set(`${rr},${cc}`, ship.name);
          const el = this.own.at(rr, cc);
          el.classList.add('ship');
          el.dataset.ship = ship.name;
        });
        this._clearPreview();
        this._renderFleetList();
        this._updateReadyBtn();
        if (this._allPlaced()) {
          this._setMsg('Fleet ready. Press READY FOR BATTLE.');
        }
      });
    });
    this.own.host.addEventListener('mouseleave', () => this._clearPreview());
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
    });
    this.placement.activeIndex = 0;
    this.own.cells.forEach((c) => {
      c.classList.remove('ship');
      delete c.dataset.ship;
    });
    this._renderFleetList();
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
          cells.forEach(({ r: rr, c: cc }) => {
            occ.set(`${rr},${cc}`, ship.name);
            const el = this.own.at(rr, cc);
            el.classList.add('ship');
            el.dataset.ship = ship.name;
          });
          placed = true;
        }
      }
    }
    this._renderFleetList();
    this._updateReadyBtn();
    this._setMsg('Fleet randomized. Adjust or press READY FOR BATTLE.');
  }

  onPlaceAccepted() {
    this.placed = true;
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
