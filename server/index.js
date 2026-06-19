import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { Game, SHIPS } from './game.js';
import { randomPlacement, AIBrain } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- State ---
let waitingPlayer = null; // { socket, country, name }
const games = new Map(); // gameId -> { game, ai? }
let gameCounter = 0;

const AI_ID = '__AI__';
const AI_NAME = 'Admiral A.I.';
// If no human opponent joins within this window, match the waiting player
// against the A.I. so nobody is ever stuck in the queue.
const MATCH_TIMEOUT_MS = 8000;

function newGameId() {
  return `g${++gameCounter}`;
}

function clearWaiting() {
  if (waitingPlayer && waitingPlayer.timer) clearTimeout(waitingPlayer.timer);
  waitingPlayer = null;
}

function startAIGame(human) {
  const aiCountry = pickAICountry(human.country);
  const ai = { socket: null, socketId: AI_ID, country: aiCountry, name: AI_NAME };
  startGame(human, ai, new AIBrain());
}

function publicShipList() {
  return SHIPS.map((s) => ({ name: s.name, size: s.size }));
}

function startGame(p1, p2, aiBrain = null) {
  const id = newGameId();
  const game = new Game(id, [
    { id: p1.socketId, country: p1.country, name: p1.name },
    { id: p2.socketId, country: p2.country, name: p2.name },
  ]);
  const record = { game, ai: aiBrain, aiId: aiBrain ? p2.socketId : null };
  games.set(id, record);

  for (const sock of [p1.socket, p2.socket]) {
    if (!sock) continue;
    sock.data.gameId = id;
  }

  // Notify each human player with their own + opponent identity
  emitGameStart(record);

  // If AI, place its ships immediately.
  if (aiBrain) {
    game.placeShips(p2.socketId, randomPlacement());
  }
  return record;
}

function emitGameStart(record) {
  const { game } = record;
  for (const p of game.players) {
    if (p.id === record.aiId) continue;
    const opp = game.opponentOf(p.id);
    io.to(p.id).emit('gameStart', {
      gameId: game.id,
      you: { country: p.country, name: p.name },
      opponent: { country: opp.country, name: opp.name },
      ships: publicShipList(),
    });
  }
}

function emitTurnState(record) {
  const { game } = record;
  const currentId = game.currentPlayerId();
  for (const p of game.players) {
    if (p.id === record.aiId) continue;
    io.to(p.id).emit('turn', { yourTurn: p.id === currentId });
  }
}

function handleGameOver(record) {
  const { game } = record;
  const winnerId = game.winner;
  for (const p of game.players) {
    if (p.id === record.aiId) continue;
    const opp = game.opponentOf(p.id);
    io.to(p.id).emit('gameOver', {
      youWon: p.id === winnerId,
      youCountry: p.country,
      oppCountry: opp.country,
      // Reveal opponent fleet only now that the game is over.
      opponentShips: game.revealShips(opp.id),
    });
  }
  games.delete(game.id);
}

// Drive the AI turn(s) until it's the human's turn again or game ends.
function maybeRunAI(record) {
  const { game, ai, aiId } = record;
  if (!ai) return;
  if (game.phase !== 'playing') return;
  if (game.currentPlayerId() !== aiId) return;

  setTimeout(() => {
    if (!games.has(game.id)) return;
    if (game.phase !== 'playing' || game.currentPlayerId() !== aiId) return;
    const shot = ai.nextShot();
    const result = game.fire(aiId, shot.r, shot.c);
    if (!result.ok) return;
    ai.record(shot.r, shot.c, result);

    const humanId = game.opponentOf(aiId).id;
    io.to(humanId).emit('incomingFire', {
      r: result.r,
      c: result.c,
      hit: result.hit,
      sunk: result.sunk,
      sunkCells: result.sunkCells,
      label: result.label,
    });

    if (result.gameOver) {
      handleGameOver(record);
      return;
    }
    emitTurnState(record);
    // If AI somehow still to move (shouldn't, turns alternate), recurse.
    maybeRunAI(record);
  }, 700 + Math.random() * 600);
}

io.on('connection', (socket) => {
  socket.on('findGame', ({ country, name }) => {
    country = String(country || 'Unknown').slice(0, 40);
    name = String(name || 'Anonymous').slice(0, 24);

    if (waitingPlayer && waitingPlayer.socket.connected && waitingPlayer.socket.id !== socket.id) {
      const p1 = waitingPlayer;
      clearWaiting();
      const p2 = { socket, socketId: socket.id, country, name };
      startGame(
        { socket: p1.socket, socketId: p1.socket.id, country: p1.country, name: p1.name },
        p2
      );
    } else {
      clearWaiting();
      const human = { socket, socketId: socket.id, country, name };
      const timer = setTimeout(() => {
        // Still waiting and connected after the window -> give them an A.I. match.
        if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
          waitingPlayer = null;
          if (socket.connected) startAIGame(human);
        }
      }, MATCH_TIMEOUT_MS);
      waitingPlayer = { socket, socketId: socket.id, country, name, timer };
      socket.emit('waiting');
    }
  });

  socket.on('playAI', ({ country, name }) => {
    country = String(country || 'Unknown').slice(0, 40);
    name = String(name || 'Anonymous').slice(0, 24);
    startAIGame({ socket, socketId: socket.id, country, name });
  });

  socket.on('placeShips', ({ ships }) => {
    const record = games.get(socket.data.gameId);
    if (!record) return;
    const res = record.game.placeShips(socket.id, ships);
    if (!res.ok) {
      socket.emit('placeError', { error: res.error });
      return;
    }
    socket.emit('placeAccepted');
    if (res.bothReady) {
      // Both placed -> begin firing phase.
      for (const p of record.game.players) {
        if (p.id === record.aiId) continue;
        io.to(p.id).emit('battleStart');
      }
      emitTurnState(record);
      maybeRunAI(record);
    } else {
      socket.emit('waitingForOpponentPlacement');
    }
  });

  socket.on('fire', ({ r, c }) => {
    const record = games.get(socket.data.gameId);
    if (!record) return;
    const { game } = record;
    const result = game.fire(socket.id, r, c);
    if (!result.ok) {
      socket.emit('fireError', { error: result.error });
      return;
    }
    // Tell shooter their result.
    socket.emit('fireResult', {
      r: result.r,
      c: result.c,
      hit: result.hit,
      sunk: result.sunk,
      sunkCells: result.sunkCells,
      label: result.label,
    });
    // Tell opponent (if human) they were fired upon.
    const opp = game.opponentOf(socket.id);
    if (opp.id !== record.aiId) {
      io.to(opp.id).emit('incomingFire', {
        r: result.r,
        c: result.c,
        hit: result.hit,
        sunk: result.sunk,
        sunkCells: result.sunkCells,
        label: result.label,
      });
    }
    if (result.gameOver) {
      handleGameOver(record);
      return;
    }
    emitTurnState(record);
    maybeRunAI(record);
  });

  socket.on('cancelSearch', () => {
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
      clearWaiting();
    }
  });

  socket.on('disconnect', () => {
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
      clearWaiting();
    }
    const record = games.get(socket.data.gameId);
    if (record) {
      const opp = record.game.opponentOf(socket.id);
      if (opp && opp.id !== record.aiId) {
        io.to(opp.id).emit('opponentLeft');
      }
      games.delete(record.game.id);
    }
  });
});

function pickAICountry(humanCountry) {
  const pool = [
    'Germany', 'Austria-Hungary', 'Ottoman Empire', 'Bulgaria', 'France',
    'British Empire', 'Russia', 'United States', 'Italy', 'Japan',
  ].filter((c) => c !== humanCountry);
  return pool[Math.floor(Math.random() * pool.length)];
}

server.listen(PORT, () => {
  console.log(`Battleship server listening on http://localhost:${PORT}`);
});
