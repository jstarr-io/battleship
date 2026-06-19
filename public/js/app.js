// Orchestrates screens (entry -> country -> lobby -> game -> over),
// country selection, and the Socket.IO protocol with the server.

import { initEntry } from './entry.js';
import { COUNTRY_NAMES, flagHTML } from './countries.js';
import { BattleshipUI } from './game.js';
import { playGameOver, stopGameOver } from './over.js';
import { unlockAudio, sfxClick } from './audio.js';

const socket = io();

const state = {
  country: null,
  name: 'Anonymous',
  you: null,
  opp: null,
};

let ui = null;

function show(screenId) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._id);
  toast._id = setTimeout(() => t.classList.add('hidden'), ms);
}

// --- Entry gate ---
initEntry(() => {
  unlockAudio();
  buildCountryGrid();
  show('screen-country');
});

// --- Country select ---
function buildCountryGrid() {
  const grid = document.getElementById('country-grid');
  if (grid.childElementCount) return;
  COUNTRY_NAMES.forEach((name) => {
    const card = document.createElement('button');
    card.className = 'country-card';
    card.innerHTML = `${flagHTML(name)}<span class="country-name">${name}</span>`;
    card.addEventListener('click', () => {
      unlockAudio();
      sfxClick();
      document.querySelectorAll('.country-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.country = name;
      const banner = document.getElementById('selected-banner');
      banner.classList.remove('hidden');
      banner.innerHTML = `${flagHTML(name)}<span>You command: <strong>${name}</strong></span>`;
      document.getElementById('btn-play-ai').disabled = false;
      document.getElementById('btn-play-online').disabled = false;
    });
    grid.appendChild(card);
  });

  document.getElementById('btn-play-ai').addEventListener('click', () => {
    if (!state.country) return;
    captureName();
    socket.emit('playAI', { country: state.country, name: state.name });
  });
  document.getElementById('btn-play-online').addEventListener('click', () => {
    if (!state.country) return;
    captureName();
    socket.emit('findGame', { country: state.country, name: state.name });
    document.getElementById('lobby-status').textContent = 'SCANNING THE SEAS FOR AN OPPONENT…';
    show('screen-lobby');
  });
}

function captureName() {
  const v = document.getElementById('player-name').value.trim();
  state.name = v || 'Commander';
}

document.getElementById('btn-cancel-search').addEventListener('click', () => {
  socket.emit('cancelSearch');
  show('screen-country');
});

document.getElementById('btn-again').addEventListener('click', () => {
  stopGameOver();
  resetGameScreen();
  show('screen-country');
});

// --- Socket protocol ---
socket.on('waiting', () => {
  document.getElementById('lobby-status').textContent = 'IN QUEUE — AWAITING ANOTHER COMMANDER…';
});

socket.on('gameStart', ({ you, opponent, ships }) => {
  state.you = you;
  state.opp = opponent;
  resetGameScreen();
  ui = new BattleshipUI({
    onReady: (fleet) => socket.emit('placeShips', { ships: fleet }),
    onFire: (r, c) => socket.emit('fire', { r, c }),
  });
  ui.setHeader(you, opponent);
  ui.setupPlacement(ships);
  document.getElementById('turn-indicator').textContent = 'PREPARE YOUR FLEET';
  show('screen-game');
});

socket.on('placeAccepted', () => ui && ui.onPlaceAccepted());
socket.on('placeError', ({ error }) => ui && ui.onPlaceError(error));
socket.on('waitingForOpponentPlacement', () => toast('Fleet locked. Waiting for the enemy to deploy…'));
socket.on('battleStart', () => ui && ui.onBattleStart());
socket.on('turn', ({ yourTurn }) => ui && ui.setTurn(yourTurn));
socket.on('fireResult', (d) => ui && ui.onFireResult(d));
socket.on('fireError', ({ error }) => {
  if (ui) ui.firing = false;
  toast(error);
});
socket.on('incomingFire', (d) => ui && ui.onIncomingFire(d));

socket.on('gameOver', ({ youWon, youCountry, oppCountry }) => {
  const title = document.getElementById('over-title');
  const sub = document.getElementById('over-sub');
  if (youWon) {
    title.textContent = `VICTORY — ${youCountry.toUpperCase()} RULES THE WAVES`;
    title.className = 'over-title win';
    sub.textContent = `${oppCountry} sinks beneath the cold Atlantic.`;
  } else {
    title.textContent = `DEFEAT — ${oppCountry.toUpperCase()} CLAIMS THE SEAS`;
    title.className = 'over-title lose';
    sub.textContent = `Your ${youCountry} fleet slips below the surface…`;
  }
  show('screen-over');
  const canvas = document.getElementById('over-canvas');
  playGameOver(canvas, { youWon, youCountry, oppCountry });
});

socket.on('opponentLeft', () => {
  toast('Your opponent abandoned the battle. Returning to port.');
  setTimeout(() => {
    stopGameOver();
    resetGameScreen();
    show('screen-country');
  }, 2200);
});

function resetGameScreen() {
  document.getElementById('battle-log').innerHTML = '';
  document.getElementById('placement-panel').classList.remove('hidden');
  document.querySelectorAll('#placement-panel .placement-controls .btn').forEach((b) => (b.disabled = false));
  const ind = document.getElementById('turn-indicator');
  ind.className = 'turn-indicator';
  if (ui) ui.reset();
}
