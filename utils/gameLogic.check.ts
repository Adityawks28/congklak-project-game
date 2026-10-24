// Rules check: run with `node utils/gameLogic.check.ts` (Node strips the types).
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, legalMoves, newGame, startNextRound, TOTAL } from './gameLogic.ts';
import type { GameState } from './gameLogic.ts';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every state reached in one random game, starting position included.
export function randomPlayout(seed: number, start: GameState = newGame()): GameState[] {
  const rng = mulberry32(seed);
  const states = [start];
  let s = start;
  while (s.phase === 'playing' && states.length < 1000) {
    const moves = legalMoves(s);
    s = applyMove(s, moves[Math.floor(rng() * moves.length)]).state;
    states.push(s);
  }
  return states;
}

const sum = (b: number[]) => b.reduce((a, v) => a + v, 0);
const withBoard = (board: number[], extra: Partial<GameState> = {}): GameState => ({ ...newGame(), board, ...extra });

test('new game', () => {
  const s = newGame();
  assert.deepEqual(s.board, [7, 7, 7, 7, 7, 7, 7, 0, 7, 7, 7, 7, 7, 7, 7, 0]);
  assert.equal(s.turn, 'A');
  assert.equal(s.phase, 'playing');
});

test('legal moves', () => {
  assert.deepEqual(legalMoves(newGame()), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(legalMoves({ ...newGame(), turn: 'B' }), [8, 9, 10, 11, 12, 13, 14]);
  const b = newGame().board; b[2] = 0;
  assert.deepEqual(legalMoves(withBoard(b)), [0, 1, 3, 4, 5, 6]);
});

test('illegal moves throw', () => {
  const b = newGame().board; b[0] = 0;
  assert.throws(() => applyMove(newGame(), 8));
  assert.throws(() => applyMove(withBoard(b), 0));
  assert.throws(() => applyMove(newGame(), 7));
  assert.throws(() => applyMove(newGame(), 16));
  assert.throws(() => applyMove({ ...newGame(), phase: 'gameOver' }, 0));
});

test('landing in own store gives another turn', () => {
  const r = applyMove(newGame(), 0);
  assert.deepEqual(r.state.board, [0, 8, 8, 8, 8, 8, 8, 1, 7, 7, 7, 7, 7, 7, 7, 0]);
  assert.equal(r.outcome, 'extraTurn');
  assert.equal(r.state.turn, 'A');
});

test('skips the opponent store, then captures', () => {
  const b = Array(16).fill(0); b[6] = 10; b[13] = 1;
  const r = applyMove(withBoard(b), 6);
  assert.equal(r.state.board[15], 0);
  assert.equal(r.outcome, 'capture');
  assert.equal(r.captured, 3);
  assert.equal(r.state.board[7], 4);
  assert.equal(r.state.turn, 'B');
  const cap = r.frames.find(f => f.event === 'capture');
  assert.equal(cap?.active, 1);
  assert.equal(cap?.capturedFrom, 13);
});

test('relay sowing continues from a non-empty slot', () => {
  const r = applyMove(newGame(), 3);
  assert.ok(r.frames.filter(f => f.event === 'pick').length >= 2);
});

test('own empty hole with empty hole across: no capture', () => {
  const b = [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0];
  const r = applyMove(withBoard(b), 2);
  assert.equal(r.outcome, 'turnEnds');
  assert.equal(r.captured, 0);
  assert.equal(r.state.board[3], 1);
  assert.equal(r.state.turn, 'B');
});

test('game end collects the rest', () => {
  const b = [4, 0, 0, 0, 0, 1, 0, 10, 2, 0, 0, 0, 0, 0, 0, 81];
  const r = applyMove(withBoard(b), 5);
  assert.equal(r.state.phase, 'gameOver');
  assert.deepEqual(r.state.board, [0, 0, 0, 0, 0, 0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 81]);
  assert.equal(r.state.winner, 'B');
  assert.equal(r.frames.at(-1)?.event, 'end');
  assert.deepEqual(r.frames.at(-1)?.board, r.state.board);
});

test('98 marbles always', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    let s = newGame();
    const rng = mulberry32(seed);
    while (s.phase === 'playing') {
      const moves = legalMoves(s);
      const r = applyMove(s, moves[Math.floor(rng() * moves.length)]);
      for (const f of r.frames) assert.equal(sum(f.board) + f.hand, TOTAL, `seed ${seed} frame`);
      assert.equal(sum(r.state.board), TOTAL, `seed ${seed} state`);
      s = r.state;
    }
    assert.ok(s.winner !== null);
  }
});

test('record:false matches record:true', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const states = randomPlayout(seed).filter(s => s.phase === 'playing');
    const rng = mulberry32(seed * 7);
    const s = states[Math.floor(rng() * states.length)];
    const moves = legalMoves(s);
    const hole = moves[Math.floor(rng() * moves.length)];
    const full = applyMove(s, hole);
    const lean = applyMove(s, hole, { record: false });
    assert.deepEqual(lean.state, full.state);
    assert.equal(lean.outcome, full.outcome);
    assert.equal(lean.captured, full.captured);
    assert.equal(lean.lastIndex, full.lastIndex);
    assert.deepEqual(lean.frames, []);
  }
});

test('applyMove does not mutate its input', () => {
  const s = randomPlayout(42)[5];
  const before = structuredClone(s);
  applyMove(s, legalMoves(s)[0]);
  assert.deepEqual(s, before);
});

test('traditional round end', () => {
  // A plays hole 5: one marble into empty hole 6, capturing B's last marble across
  const s: GameState = { ...newGame('traditional'), board: [3, 0, 0, 0, 0, 1, 0, 50, 1, 0, 0, 0, 0, 0, 0, 43] };
  const r = applyMove(s, 5);
  assert.equal(r.outcome, 'capture');
  assert.equal(r.state.phase, 'roundOver');
  assert.equal(r.state.winner, null);
  assert.deepEqual([...r.state.board.slice(0, 7), ...r.state.board.slice(8, 15)], Array(14).fill(0));
  assert.equal(r.state.board[7], 55);
  assert.equal(sum(r.state.board), TOTAL);
});

test('refill and burn', () => {
  const s = { ...newGame('traditional'), board: [0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 38], phase: 'roundOver' as const };
  const n = startNextRound(s);
  assert.deepEqual(n.board, [7, 7, 7, 7, 7, 7, 7, 11, 0, 0, 7, 7, 7, 7, 7, 3]);
  assert.deepEqual(n.burnt.slice(8, 15), [true, true, false, false, false, false, false]);
  assert.deepEqual(n.burnt.slice(0, 7), Array(7).fill(false));
  assert.equal(n.turn, 'B');
  assert.equal(n.round, 2);
  assert.equal(n.phase, 'playing');
});

test('cannot fill a hole: game over', () => {
  const s = { ...newGame('traditional'), board: [0, 0, 0, 0, 0, 0, 0, 93, 0, 0, 0, 0, 0, 0, 0, 5], phase: 'roundOver' as const };
  const n = startNextRound(s);
  assert.equal(n.phase, 'gameOver');
  assert.equal(n.winner, 'A');
  assert.equal(n.board[7], 93);
  assert.equal(n.board[15], 5);
});

test('startNextRound needs a finished round', () => {
  assert.throws(() => startNextRound(newGame('traditional')));
});

test('burnt holes are skipped and never legal', () => {
  const burnt = Array(16).fill(false);
  burnt[8] = burnt[9] = true;
  const s: GameState = { ...newGame('traditional'), burnt, board: [1, 0, 0, 0, 0, 0, 4, 40, 0, 0, 0, 0, 0, 2, 0, 51] };
  const r = applyMove(s, 6);
  assert.deepEqual(r.state.board.slice(7, 13), [41, 0, 0, 1, 1, 1]);
  assert.equal(r.lastIndex, 12);
  assert.ok(!legalMoves({ ...r.state, board: r.state.board.map((v, i) => (i === 9 ? 3 : v)) }).includes(9));
});

test('no capture from a burnt hole across', () => {
  const burnt = Array(16).fill(false);
  burnt[11] = true; // across from hole 3
  const s: GameState = { ...newGame('traditional'), burnt, board: [0, 0, 1, 0, 0, 0, 1, 40, 2, 0, 0, 0, 0, 0, 0, 54] };
  assert.equal(applyMove(s, 2).outcome, 'turnEnds');
});

test('98 marbles across rounds', () => {
  let rounds = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const rng = mulberry32(seed);
    let s = newGame('traditional');
    for (let step = 0; step < 5000 && s.phase !== 'gameOver'; step++) {
      if (s.phase === 'roundOver') {
        s = startNextRound(s);
        rounds++;
      } else {
        const moves = legalMoves(s);
        s = applyMove(s, moves[Math.floor(rng() * moves.length)], { record: false }).state;
      }
      assert.equal(sum(s.board), TOTAL, `seed ${seed} step ${step}`);
      for (let i = 0; i < 16; i++) if (s.burnt[i]) assert.equal(s.board[i], 0);
    }
  }
  assert.ok(rounds > 300, `only ${rounds} round changes`);
});
