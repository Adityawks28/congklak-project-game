// Settings check: run with `node utils/settings.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, addResult, displayNames, sanitizeSettings, sanitizeTallies, sanitizeTally, tallyKind } from './settings.ts';

test('bad values fall back', () => {
  const s = sanitizeSettings({ speed: 'warp', opponent: 'god', sound: 'yes', names: { A: '', B: 'x'.repeat(50) } });
  assert.equal(s.speed, 'normal');
  assert.equal(s.opponent, 'medium');
  assert.equal(s.sound, true);
  assert.equal(s.names.A, 'Player 1');
  assert.equal(s.names.B.length, 16);
});
test('good values are kept', () => {
  const good = { opponent: 'human', speed: 'fast', mode: 'simple', sound: false, preview: false, bestOf3: true, names: { A: ' Sari ', B: 'Budi' } };
  assert.deepEqual(sanitizeSettings(good), { ...good, names: { A: 'Sari', B: 'Budi' } });
});
test('non-objects give defaults', () => {
  assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(sanitizeSettings('x'), DEFAULT_SETTINGS);
  assert.deepEqual(sanitizeSettings({ names: 'x' }), DEFAULT_SETTINGS);
  assert.notEqual(sanitizeSettings(null), DEFAULT_SETTINGS); // a copy, safe to change
});
test('tally keeps non-negative integers only', () => {
  assert.deepEqual(sanitizeTally({ A: 3, B: 1, draws: 2 }), { A: 3, B: 1, draws: 2 });
  assert.deepEqual(sanitizeTally({ A: -1, B: 1.5, draws: '2' }), { A: 0, B: 0, draws: 0 });
  assert.deepEqual(sanitizeTally(undefined), { A: 0, B: 0, draws: 0 });
});
test('blank names show the defaults', () => {
  const s = { ...DEFAULT_SETTINGS, opponent: 'human' as const, names: { A: '  ', B: 'Budi' } };
  assert.deepEqual(displayNames(s), { A: 'Player 1', B: 'Budi' });
  assert.deepEqual(displayNames(DEFAULT_SETTINGS), { A: 'You', B: 'Computer' });
  // maxLength stops typing, not every input method: the display caps names too
  assert.equal(displayNames({ ...s, names: { A: 'x'.repeat(30), B: 'Budi' } }).A.length, 16);
});
test('playing a friend and playing the computer keep separate tallies', () => {
  const zero = { A: 0, B: 0, draws: 0 };
  const t = sanitizeTallies({ computer: { A: 2, B: 1, draws: 0 }, human: { A: 0, B: 3, draws: 1 } });
  assert.deepEqual(addResult(t, 'human', 'A'), { computer: { A: 2, B: 1, draws: 0 }, human: { A: 1, B: 3, draws: 1 } });
  assert.deepEqual(addResult(t, 'computer', 'draw'), { computer: { A: 2, B: 1, draws: 1 }, human: t.human });
  assert.equal(tallyKind('hard'), 'computer');
  assert.equal(tallyKind('human'), 'human');
  assert.deepEqual(sanitizeTallies('x'), { computer: zero, human: zero });
  assert.deepEqual(sanitizeTallies({ computer: { A: -1, B: 0, draws: 0 }, human: { A: 4, B: 0, draws: 0 } }), { computer: zero, human: { A: 4, B: 0, draws: 0 } });
});
