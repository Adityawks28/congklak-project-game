// Characters and story check: run with `node components/characters/pixel.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, man, pupilOffset, woman } from './pixel.ts';
import { HISTORY, RULES, SOURCES, TRADITIONAL_RULES } from '../../content/story.ts';

test('sprite sizes and palette', () => {
  for (const s of [man(), woman()]) {
    assert.equal(s.w, 22);
    assert.equal(s.h, 40);
    assert.equal(s.pixels.length, 40);
    for (const row of s.pixels) {
      assert.equal(row.length, 22);
      for (const k of row) if (k) assert.ok(k in PALETTE, k);
    }
  }
});

test('outlined in ink: every filled pixel next to empty space is ink', () => {
  for (const s of [man(), woman()]) {
    const at = (x: number, y: number) => s.pixels[y]?.[x] ?? null;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (!at(x, y)) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !at(x + dx, y + dy) && x + dx >= 0 && y + dy >= 0 && x + dx < s.w && y + dy < s.h);
      if (edge) assert.equal(at(x, y), 'K', `(${x},${y})`);
    }
  }
});

test('both smile and blush', () => {
  for (const s of [man(), woman()]) {
    const flat = s.pixels.flat();
    assert.ok(flat.includes('M'), 'smile');
    assert.ok(flat.includes('p'), 'blush');
  }
});

test('eyes fit inside the sprite', () => {
  for (const s of [man(), woman()]) {
    assert.equal(s.eyes.length, 2);
    for (const e of s.eyes) assert.ok(e.x >= 0 && e.x + 3 <= s.w && e.y >= 0 && e.y + 2 <= s.h);
  }
});

test('pupil offsets', () => {
  assert.deepEqual(pupilOffset(0, 5), { col: 1, row: 1 });
  assert.deepEqual(pupilOffset(-100, -5), { col: 0, row: 0 });
  assert.deepEqual(pupilOffset(100, 5), { col: 2, row: 1 });
  assert.deepEqual(pupilOffset(27, -1), { col: 1, row: 0 });
});

test('story text', () => {
  assert.ok(RULES.length >= 4 && RULES.length <= 5);
  assert.equal(TRADITIONAL_RULES.length, 0);
  assert.ok(HISTORY.length >= 3);
  for (const p of [...RULES, ...HISTORY]) {
    assert.ok(!/—/.test(p.text), p.text);
    const words = p.text.split(/\s+/).filter(Boolean).length;
    assert.ok(words <= 45, `${words} words: ${p.text}`);
  }
  assert.ok(SOURCES.length >= 2);
  for (const s of SOURCES) assert.match(s.url, /^https:\/\//);
  // the popular account is labelled, and then its source is listed
  const told = HISTORY.some(p => /Arab traders/.test(p.text));
  if (told) {
    assert.ok(HISTORY.some(p => /popular account/.test(p.text)));
    assert.ok(SOURCES.some(s => s.url.includes('rri.co.id')));
  }
});
