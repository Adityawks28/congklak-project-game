// Board geometry check: run with `node components/board/geometry.check.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BODY_STRETCH, COUNT_BOX, COUNT_FONT, COUNT_METRICS, HOLE_R, RIM_OFFSET, STORE_MAX, STORE_RX, STORE_RY, TOP_BAND,
  countAnchor, marbleLayout, slotCenter, storePile, toTall,
} from './geometry.ts';
import type { Orientation, Point } from './geometry.ts';

const HOLE_SLOTS = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14];
const both: Orientation[] = ['wide', 'tall'];

// Top edge of BOARD_PATH (wide): a cubic from (36,160) to (300,38), flat to 700, mirrored.
function bodyTop(x: number): number {
  if (x > 500) return bodyTop(1000 - x);
  if (x >= 300) return 38;
  const P = [[36, 160], [56, 68], [178, 38], [300, 38]];
  const at = (t: number, k: 0 | 1) =>
    (1 - t) ** 3 * P[0][k] + 3 * (1 - t) ** 2 * t * P[1][k] + 3 * (1 - t) * t ** 2 * P[2][k] + t ** 3 * P[3][k];
  let lo = 0, hi = 1;
  for (let n = 0; n < 50; n++) { const mid = (lo + hi) / 2; if (at(mid, 0) < x) lo = mid; else hi = mid; }
  return at(lo, 1);
}
const bodyBottom = (x: number) => 320 - bodyTop(x);
const toWide = (p: Point): Point => ({ x: 1000 - p.y, y: p.x });

function boxCorners(c: Point, o: Orientation): Point[] {
  const { w, h } = COUNT_BOX[o];
  return [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => ({ x: c.x + (sx * w) / 2, y: c.y + (sy * h) / 2 }));
}
function boxHitsCircle(c: Point, o: Orientation, center: Point, r: number): boolean {
  const { w, h } = COUNT_BOX[o];
  const nx = Math.max(c.x - w / 2, Math.min(center.x, c.x + w / 2));
  const ny = Math.max(c.y - h / 2, Math.min(center.y, c.y + h / 2));
  return Math.hypot(nx - center.x, ny - center.y) < r;
}

test('wide slot centres', () => {
  assert.deepEqual(slotCenter(6, 'wide'), { x: 220, y: 210 });
  assert.deepEqual(slotCenter(0, 'wide'), { x: 780, y: 210 });
  assert.deepEqual(slotCenter(8, 'wide'), { x: 220, y: 112 });
  assert.deepEqual(slotCenter(14, 'wide'), { x: 780, y: 112 });
  assert.deepEqual(slotCenter(7, 'wide'), { x: 120, y: 160 });
  assert.deepEqual(slotCenter(15, 'wide'), { x: 880, y: 160 });
});

test('tall: A on the right column, A store at the bottom', () => {
  for (const i of [0, 1, 2, 3, 4, 5, 6]) assert.equal(slotCenter(i, 'tall').x, 210);
  for (const i of [8, 9, 10, 11, 12, 13, 14]) assert.equal(slotCenter(i, 'tall').x, 112);
  assert.equal(slotCenter(7, 'tall').y, 880);
  assert.equal(slotCenter(15, 'tall').y, 120);
  assert.deepEqual(toTall({ x: 120, y: 160 }), { x: 160, y: 880 });
});

test('sowing stays clockwise when tall', () => {
  // Shoelace sum over slots 0..15 in sowing order; in SVG (y down) a positive sum is clockwise.
  const area = (o: Orientation) => {
    let a = 0;
    for (let i = 0; i < 16; i++) {
      const p = slotCenter(i, o), q = slotCenter((i + 1) % 16, o);
      a += p.x * q.y - q.x * p.y;
    }
    return a;
  };
  assert.ok(area('wide') > 0);
  assert.ok(area('tall') > 0);
});

test('marble counts', () => {
  assert.equal(marbleLayout(0).length, 0);
  for (let n = 1; n <= 12; n++) assert.equal(marbleLayout(n).length, n);
  for (const n of [13, 20, 60]) assert.equal(marbleLayout(n).length, 14);
});

test('7 is a flower', () => {
  const m = marbleLayout(7);
  assert.ok(m.some(p => p.dx === 0 && p.dy === 0));
  const d = m.filter(p => p.dx !== 0 || p.dy !== 0).map(p => Math.hypot(p.dx, p.dy));
  assert.equal(d.length, 6);
  for (const v of d) assert.ok(Math.abs(v - d[0]) < 0.01);
});

test('marbles stay inside the hole', () => {
  for (let n = 0; n <= 60; n++) for (const p of marbleLayout(n)) assert.ok(Math.hypot(p.dx, p.dy) + p.r <= HOLE_R - 2, `n=${n}`);
});

test('store pile', () => {
  for (const o of both) {
    assert.equal(storePile(5, o).length, 5);
    assert.equal(storePile(98, o).length, STORE_MAX);
    const [rx, ry] = o === 'wide' ? [STORE_RX, STORE_RY] : [STORE_RY, STORE_RX];
    for (const p of storePile(98, o)) assert.ok((p.dx / (rx - 8)) ** 2 + (p.dy / (ry - 8)) ** 2 <= 1, `${o} ${p.dx},${p.dy}`);
    // the pile fills from the bottom: the first marble is the lowest
    const pile = storePile(STORE_MAX, o);
    assert.ok(pile.every(p => p.dy <= pile[0].dy));
  }
});

test('the count box holds a two-digit count at its font size', () => {
  for (const o of both) {
    const f = COUNT_FONT[o];
    assert.ok(COUNT_BOX[o].w >= COUNT_METRICS.width * f + COUNT_METRICS.outline, `${o} width`);
    assert.ok(COUNT_BOX[o].h >= COUNT_METRICS.height * f + COUNT_METRICS.outline, `${o} height`);
  }
});

test('counts sit on the wood face, clear of holes, rims, stores and the top band', () => {
  for (const o of both) {
    for (const slot of HOLE_SLOTS) {
      const c = countAnchor(slot, o);
      for (const other of [...HOLE_SLOTS, 7, 15]) {
        const h = slotCenter(other, o);
        const isStore = other === 7 || other === 15;
        // stores: treat the ellipse's narrow half-width plus margin as a keep-out circle at each end
        if (isStore) {
          const [rx, ry] = o === 'wide' ? [STORE_RX, STORE_RY] : [STORE_RY, STORE_RX];
          for (const corner of boxCorners(c, o)) assert.ok(((corner.x - h.x) / (rx + 3)) ** 2 + ((corner.y - h.y) / (ry + 3)) ** 2 > 1, `${o} slot ${slot} hits store ${other}`);
          continue;
        }
        assert.ok(!boxHitsCircle(c, o, h, HOLE_R + 2), `${o} slot ${slot} hits hole ${other}`);
        const rim = { x: h.x + RIM_OFFSET[o].x, y: h.y + RIM_OFFSET[o].y };
        assert.ok(!boxHitsCircle(c, o, rim, HOLE_R + 3), `${o} slot ${slot} hits rim of ${other}`);
      }
      for (const corner of boxCorners(c, o)) {
        const w = o === 'wide' ? corner : toWide(corner);
        const s = BODY_STRETCH[o];
        const top = 160 - (160 - bodyTop(w.x)) * s, bottom = 160 + (bodyBottom(w.x) - 160) * s;
        assert.ok(w.y >= top + TOP_BAND * s + 1, `${o} slot ${slot} on the top band (${w.x.toFixed(1)}, ${w.y.toFixed(1)})`);
        assert.ok(w.y <= bottom - 2, `${o} slot ${slot} off the bottom edge`);
      }
    }
  }
});
