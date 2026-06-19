// Headless self-test of game rules + AI. Not part of runtime.
import { Game, validatePlacement, SHIPS, BOARD_SIZE } from './game.js';
import { randomPlacement, AIBrain } from './ai.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL:', msg); } }

// 1. Placement validation
const good = randomPlacement();
ok(validatePlacement(good).ok, 'random placement should be valid');

const offBoard = JSON.parse(JSON.stringify(good));
offBoard[0].cells[0] = { r: -1, c: 0 };
ok(!validatePlacement(offBoard).ok, 'off-board rejected');

const diagonal = [
  { name: 'Carrier', cells: [{r:0,c:0},{r:1,c:1},{r:2,c:2},{r:3,c:3},{r:4,c:4}] },
  { name: 'Battleship', cells: [{r:0,c:6},{r:0,c:7},{r:0,c:8},{r:0,c:9}] },
  { name: 'Destroyer', cells: [{r:2,c:0},{r:2,c:1},{r:2,c:2}] },
  { name: 'Submarine', cells: [{r:4,c:0},{r:4,c:1},{r:4,c:2}] },
  { name: 'Patrol Boat', cells: [{r:6,c:0},{r:6,c:1}] },
];
ok(!validatePlacement(diagonal).ok, 'diagonal rejected');

const overlap = [
  { name: 'Carrier', cells: [{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:0,c:3},{r:0,c:4}] },
  { name: 'Battleship', cells: [{r:0,c:3},{r:0,c:4},{r:0,c:5},{r:0,c:6}] },
  { name: 'Destroyer', cells: [{r:2,c:0},{r:2,c:1},{r:2,c:2}] },
  { name: 'Submarine', cells: [{r:4,c:0},{r:4,c:1},{r:4,c:2}] },
  { name: 'Patrol Boat', cells: [{r:6,c:0},{r:6,c:1}] },
];
ok(!validatePlacement(overlap).ok, 'overlap rejected');

const wrongCount = good.slice(0, 4);
ok(!validatePlacement(wrongCount).ok, 'wrong ship count rejected');

// 2. Full game simulation between two AIs
function simulate() {
  const game = new Game('t', [{ id: 'p1' }, { id: 'p2' }]);
  game.placeShips('p1', randomPlacement());
  game.placeShips('p2', randomPlacement());
  if (game.phase !== 'playing') return 'did not start';
  const brains = { p1: new AIBrain(), p2: new AIBrain() };
  let turns = 0;
  while (game.phase === 'playing' && turns < 500) {
    const me = game.currentPlayerId();
    const shot = brains[me].nextShot();
    const res = game.fire(me, shot.r, shot.c);
    if (!res.ok) return 'illegal fire: ' + res.error + ' at ' + shot.r + ',' + shot.c;
    brains[me].record(shot.r, shot.c, res);
    turns++;
  }
  if (game.phase !== 'finished') return 'no winner after ' + turns;
  return { winner: game.winner, turns };
}

let crashes = 0, totalTurns = 0;
const N = 300;
for (let i = 0; i < N; i++) {
  const r = simulate();
  if (typeof r === 'string') { crashes++; console.log('SIM ISSUE:', r); }
  else totalTurns += r.turns;
}
ok(crashes === 0, `all ${N} simulated games finished cleanly (crashes=${crashes})`);
console.log(`Avg turns to finish: ${(totalTurns / N).toFixed(1)}`);

// 3. Turn alternation + double-fire rejection
const g2 = new Game('t2', [{ id: 'a' }, { id: 'b' }]);
g2.placeShips('a', randomPlacement());
g2.placeShips('b', randomPlacement());
const first = g2.currentPlayerId();
g2.fire(first, 0, 0);
ok(g2.currentPlayerId() !== first, 'turn alternates after a shot');
const dup = g2.fire(g2.currentPlayerId() === 'a' ? 'b' : 'a', 0, 0);
ok(!dup.ok, 'out-of-turn fire rejected');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
