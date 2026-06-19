// Integration test of the online (human-vs-human) protocol against a running
// server. Two socket.io clients matchmake, place fleets, and play to a winner.
// Run the server first: `PORT=3100 node server/index.js`.
import { io } from 'socket.io-client';
import { randomPlacement, AIBrain } from './ai.js';

const URL = process.env.URL || 'http://localhost:3100';

function client(country, name) {
  const sock = io(URL, { forceNew: true });
  const state = { sock, country, name, ships: null, myTurn: false, brain: new AIBrain(), done: null, won: null };
  sock.on('gameStart', ({ ships }) => {
    state.ships = ships;
    // Build a fleet from randomPlacement (names match server ship set).
    sock.emit('placeShips', { ships: randomPlacement() });
  });
  sock.on('turn', ({ yourTurn }) => {
    state.myTurn = yourTurn;
    if (yourTurn) setTimeout(() => fire(state), 5);
  });
  sock.on('fireResult', (d) => state.brain.record(d.r, d.c, d));
  sock.on('gameOver', ({ youWon }) => {
    state.won = youWon;
    if (state.done) state.done();
  });
  sock.on('opponentLeft', () => console.log(`${name}: opponent left`));
  return state;
}

function fire(state) {
  if (!state.myTurn) return;
  const shot = state.brain.nextShot();
  state.sock.emit('fire', { r: shot.r, c: shot.c });
}

const a = client('United States', 'Alice');
const b = client('Germany', 'Bob');

a.sock.emit('findGame', { country: a.country, name: a.name });
setTimeout(() => b.sock.emit('findGame', { country: b.country, name: b.name }), 100);

const results = {};
function check() {
  if (a.won === null || b.won === null) return;
  const exactlyOneWinner = a.won !== b.won;
  console.log(`Alice won: ${a.won}, Bob won: ${b.won}`);
  console.log(exactlyOneWinner ? 'PASS: exactly one winner, both notified' : 'FAIL: winner mismatch');
  a.sock.close();
  b.sock.close();
  process.exit(exactlyOneWinner ? 0 : 1);
}
a.done = check;
b.done = check;

setTimeout(() => {
  console.log('FAIL: timed out before game finished');
  process.exit(1);
}, 15000);
