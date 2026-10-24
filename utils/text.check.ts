// UI text check: run with `node utils/text.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { holeLabel, matchStatus, outcomeStatus, previewText, storeLabel, turnStatus } from './text.ts';
import { applyMove, newGame } from './gameLogic.ts';
import type { GameState } from './gameLogic.ts';

const vsCpu = { names: { A: 'You', B: 'Computer' }, vsComputer: true };
const friends = { names: { A: 'Sari', B: 'Budi' }, vsComputer: false };

test('hole labels', () => {
  assert.equal(holeLabel(0, 7, { burnt: false, ...vsCpu }), 'Your hole 1, 7 marbles');
  assert.equal(holeLabel(14, 1, { burnt: false, ...vsCpu }), "Computer's hole 7, 1 marble");
  assert.equal(holeLabel(9, 0, { burnt: true, ...friends }), "Budi's hole 2, burnt");
  assert.equal(holeLabel(3, 0, { burnt: false, ...friends }), "Sari's hole 4, 0 marbles");
});

test('store labels', () => {
  assert.equal(storeLabel('A', 12, vsCpu), 'Your store, 12 marbles');
  assert.equal(storeLabel('B', 1, friends), "Budi's store, 1 marble");
});

test('no em dash in generated text', () => {
  const all: string[] = [];
  for (const o of [vsCpu, friends]) {
    for (let slot = 0; slot < 16; slot++) {
      if (slot === 7 || slot === 15) continue;
      for (let n = 0; n <= 3; n++) all.push(holeLabel(slot, n, { burnt: n === 0, ...o }));
    }
    all.push(storeLabel('A', 3, o), storeLabel('B', 0, o));
  }
  assert.ok(!/\u2014/.test(all.join('\n')));
});

test('turn status', () => {
  assert.match(turnStatus(newGame(), vsCpu.names, true), /Your turn/);
  assert.match(turnStatus({ ...newGame(), turn: 'B' }, vsCpu.names, true), /Computer/);
  assert.equal(turnStatus(newGame(), friends.names, false), "Sari's turn.");
});

test('game over status gives the score', () => {
  const over: GameState = { ...newGame(), phase: 'gameOver', winner: 'A', board: [0, 0, 0, 0, 0, 0, 0, 52, 0, 0, 0, 0, 0, 0, 0, 46] };
  const t = turnStatus(over, vsCpu.names, true);
  assert.match(t, /You win/);
  assert.match(t, /52/);
  assert.match(t, /46/);
  assert.match(turnStatus({ ...over, winner: 'B', board: [0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 58] }, friends.names, false), /Budi wins, 58 to 40/);
  assert.match(turnStatus({ ...over, winner: 'draw', board: [0, 0, 0, 0, 0, 0, 0, 49, 0, 0, 0, 0, 0, 0, 0, 49] }, friends.names, false), /draw/);
});

test('outcome status', () => {
  const extra = applyMove(newGame(), 0);
  assert.match(outcomeStatus(extra, 'A', vsCpu.names, true), /go again/);
  const b = Array(16).fill(0); b[2] = 1; b[11] = 9; b[9] = 1; b[6] = 1;
  const cap = applyMove({ ...newGame(), board: b }, 2);
  assert.equal(cap.captured, 10);
  assert.match(outcomeStatus(cap, 'A', vsCpu.names, true), /captured 10 marbles/);
  assert.match(outcomeStatus(cap, 'A', friends.names, false), /^Sari captured 10 marbles/);
  const plain = applyMove({ ...newGame(), board: [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0] }, 2);
  assert.equal(plain.outcome, 'turnEnds');
  assert.equal(outcomeStatus(plain, 'A', vsCpu.names, true), '');
});

test('a store landing that ends the game does not say go again', () => {
  const b = Array(16).fill(0); b[6] = 1; b[7] = 50; b[8] = 47;
  const r = applyMove({ ...newGame(), board: b }, 6);
  assert.equal(r.outcome, 'extraTurn');
  assert.equal(r.state.phase, 'gameOver');
  assert.equal(outcomeStatus(r, 'A', vsCpu.names, true), '');
});

test('preview text', () => {
  assert.equal(previewText(applyMove(newGame(), 0)), 'Lands in your store: go again');
  // hole 4 from the start relays once, then captures 9
  assert.equal(previewText(applyMove(newGame(), 3)), 'Keeps going, then captures 9 marbles');
  assert.equal(previewText(applyMove({ ...newGame(), board: [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0] }, 2)), 'Stops in your hole 4');
  const b = Array(16).fill(0); b[6] = 2; b[0] = 1; b[12] = 1;
  assert.equal(previewText(applyMove({ ...newGame(), board: b }, 6)), 'Ends on the other side');
});

test('match status names the winner at 2 wins', () => {
  assert.equal(matchStatus({ A: 1, B: 1 }, vsCpu.names, true), '');
  assert.equal(matchStatus({ A: 2, B: 1 }, vsCpu.names, true), 'You win the match, 2 to 1!');
  assert.equal(matchStatus({ A: 0, B: 2 }, vsCpu.names, true), 'The computer wins the match, 2 to 0.');
  assert.equal(matchStatus({ A: 1, B: 2 }, friends.names, false), 'Budi wins the match, 2 to 1!');
});

test('status text has no em dash', () => {
  const all = [
    turnStatus(newGame(), vsCpu.names, true), turnStatus({ ...newGame(), turn: 'B' }, friends.names, false),
    outcomeStatus(applyMove(newGame(), 0), 'A', friends.names, false),
  ].join('\n');
  assert.ok(!/\u2014/.test(all));
});
