// UI text check: run with `node utils/text.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { holeLabel, storeLabel } from './text.ts';

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
