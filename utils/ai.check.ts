// Computer opponent check: run with `node utils/ai.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseMove } from './ai.ts';
import { applyMove, legalMoves, newGame } from './gameLogic.ts';
import type { GameState, Player } from './gameLogic.ts';
import type { Level } from './settings.ts';

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(xs: T[], rng: () => number) => xs[Math.floor(rng() * xs.length)];
const levels: Level[] = ['easy', 'medium', 'hard'];

test('always legal', () => {
  const rng = mulberry32(7);
  let checked = 0;
  while (checked < 300) {
    let s = newGame();
    const steps = Math.floor(rng() * 40);
    for (let i = 0; i < steps && s.phase === 'playing'; i++) s = applyMove(s, pick(legalMoves(s), rng), { record: false }).state;
    if (s.phase !== 'playing') continue;
    for (const level of levels) assert.ok(legalMoves(s).includes(chooseMove(s, level, rng)), `${level} on ${s.board} (${s.turn})`);
    checked++;
  }
});

test('medium takes the extra turn over nothing', () => {
  const b = Array(16).fill(0); b[6] = 1; b[0] = 1; b[10] = 3;
  assert.equal(chooseMove({ ...newGame(), board: b }, 'medium', () => 0), 6);
});

test('medium takes a big capture over an extra turn', () => {
  const b = Array(16).fill(0); b[6] = 1; b[2] = 1; b[11] = 9; b[9] = 1;
  assert.equal(chooseMove({ ...newGame(), board: b }, 'medium', () => 0), 2);
});

test('medium plays for side B too', () => {
  const b = Array(16).fill(0); b[14] = 1; b[8] = 1; b[3] = 3;
  assert.equal(chooseMove({ ...newGame(), board: b, turn: 'B' }, 'medium', () => 0), 14);
});

test('hard beats easy', () => {
  let wins = 0;
  for (let g = 0; g < 20; g++) {
    const rng = mulberry32(100 + g);
    const hardSide: Player = g % 2 === 0 ? 'A' : 'B';
    let s: GameState = newGame();
    while (s.phase === 'playing') s = applyMove(s, chooseMove(s, s.turn === hardSide ? 'hard' : 'easy', rng), { record: false }).state;
    if (s.winner === hardSide) wins++;
  }
  assert.ok(wins >= 16, `hard won ${wins} of 20`);
});

test('hard is quick', () => {
  const t0 = performance.now();
  chooseMove(newGame(), 'hard');
  const ms = performance.now() - t0;
  assert.ok(ms < 300, `${ms.toFixed(0)} ms`);
});
