// Storage check: run with `node utils/storage.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, save } from './storage.ts';

test('throwing storage gives the fallback', () => {
  assert.deepEqual(load('k', { a: 1 }, { getItem() { throw new Error('denied'); } }), { a: 1 });
});
test('corrupt JSON gives the fallback', () => {
  assert.equal(load('k', 5, { getItem: () => '{oops' }), 5);
});
test('missing key gives the fallback', () => {
  assert.equal(load('k', 5, { getItem: () => null }), 5);
});
test('a saved value comes back', () => {
  const m = new Map<string, string>();
  save('k', { a: 2 }, { setItem: (k, v) => void m.set(k, v) });
  assert.deepEqual(load('k', null, { getItem: k => m.get(k) ?? null }), { a: 2 });
});
test('save swallows errors', () => {
  save('k', 1, { setItem() { throw new Error('full'); } });
});
test('no storage at all (server render) gives the fallback', () => {
  assert.equal(load('k', 7), 7);
  save('k', 1);
});
