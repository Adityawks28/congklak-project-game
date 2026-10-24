// Playback check: run with `node utils/playback.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAME_MS, MOVE_CAP_MS, frameDelay, playFrames } from './playback.ts';
import type { Frame } from './gameLogic.ts';

const frame = (i: number, event: Frame['event'] = 'drop'): Frame => ({ board: Array(16).fill(i), active: i, hand: 0, event });
const five = [frame(0, 'pick'), frame(1), frame(2), frame(3), frame(4)];

function recorder() {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => { delays.push(ms); } };
}

test('normal plays every frame in order, with no wait after the last', async () => {
  const seen: number[] = [];
  const r = recorder();
  const res = await playFrames(five, 'normal', { cancelled: () => false, skipping: () => false }, (_f, i) => seen.push(i), r.sleep);
  assert.equal(res, 'done');
  assert.deepEqual(seen, [0, 1, 2, 3, 4]);
  assert.deepEqual(r.delays, five.slice(0, -1).map(f => frameDelay(f, 'normal', five.length)));
});

test('instant shows only the last frame', async () => {
  const seen: Frame[] = [];
  const r = recorder();
  await playFrames(five, 'instant', { cancelled: () => false, skipping: () => false }, f => seen.push(f), r.sleep);
  assert.deepEqual(seen, [five[4]]);
  assert.deepEqual(r.delays, []);
});

test('cancel stops before the next frame', async () => {
  let calls = 0;
  const res = await playFrames(five, 'normal', { cancelled: () => calls >= 3, skipping: () => false }, () => { calls++; }, recorder().sleep);
  assert.equal(res, 'cancelled');
  assert.equal(calls, 3);
});

test('skip jumps to the last frame', async () => {
  const seen: Frame[] = [];
  const res = await playFrames(five, 'normal', { cancelled: () => false, skipping: () => seen.length >= 2 }, f => seen.push(f), recorder().sleep);
  assert.equal(res, 'done');
  assert.equal(seen.length, 3);
  assert.equal(seen[2], five[4]);
});

test('capture frames pause three times as long', () => {
  assert.equal(frameDelay(frame(1, 'capture'), 'normal', 5), 750);
  assert.equal(frameDelay(frame(1, 'capture'), 'fast', 5), 270);
  assert.equal(frameDelay(frame(1), 'normal', 5), FRAME_MS.normal);
});

test('long moves speed up to fit the cap', () => {
  assert.equal(frameDelay(frame(1), 'normal', 100), MOVE_CAP_MS.normal / 100);
  assert.equal(frameDelay(frame(1), 'fast', 100), MOVE_CAP_MS.fast / 100);
  assert.equal(frameDelay(frame(1), 'normal', 40), FRAME_MS.normal);
  // a 330-frame move (the longest seen in 2000 random games) stays near the cap
  const total = Array.from({ length: 330 }, (_, i) => frameDelay(frame(i), 'normal', 330)).reduce((a, b) => a + b, 0);
  assert.ok(total <= MOVE_CAP_MS.normal + 1);
});

test('an empty move is done at once', async () => {
  assert.equal(await playFrames([], 'normal', { cancelled: () => false, skipping: () => false }, () => assert.fail(), recorder().sleep), 'done');
});
