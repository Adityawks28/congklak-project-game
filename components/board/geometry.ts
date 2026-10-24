// Board geometry in SVG units. The wide board is 1000 x 340; the tall (phone)
// board is the same board turned a quarter turn, 340 x 1000. Holes, marbles and
// counts are always placed upright in screen space; only the wooden body and
// its carving are drawn under the rotation.
import { owner } from '../../utils/gameLogic.ts';

export type Orientation = 'wide' | 'tall';
export type Point = { x: number; y: number };

export const VIEW: Record<Orientation, { w: number; h: number }> = {
  wide: { w: 1000, h: 340 },
  tall: { w: 340, h: 1000 },
};
export const HOLE_R = 37;
export const STORE_RX = 46;
export const STORE_RY = 86;
export const MARBLE_STORE_R = 10.5;
export const STORE_MAX = 30;
export const TOP_BAND = 7;
export const RIM_OFFSET: Record<Orientation, Point> = { wide: { x: 0, y: 2.5 }, tall: { x: 0, y: 2.5 } };
// Count text size per board, chosen so counts render at about 15 px or more on
// the smallest boards (768 px wide board, 360 px phone).
export const COUNT_FONT: Record<Orientation, number> = { wide: 21, tall: 25 };
// Measured in Chrome: Baloo 2 ExtraBold "88" is 1.12 em wide and its digits
// 0.643 em tall; the count's outline adds 4 units. The box must hold that.
export const COUNT_METRICS = { width: 1.12, height: 0.643, outline: 4 };
export const COUNT_BOX: Record<Orientation, { w: number; h: number }> = {
  wide: { w: 28, h: 18 },
  tall: { w: 32, h: 21 },
};
// The phone board is drawn 15% wider across so its larger counts fit beside the holes.
export const BODY_STRETCH: Record<Orientation, number> = { wide: 1, tall: 1.15 };

export const BOARD_PATH =
  'M 36 160 C 56 68 178 38 300 38 L 700 38 C 822 38 944 68 964 160 C 944 252 822 282 700 282 L 300 282 C 178 282 56 252 36 160 Z';
// Rotates wide art a quarter turn counter-clockwise; sowing stays clockwise.
export const TALL_TRANSFORM = 'matrix(0 -1 1 0 0 1000)';
export const TALL_BODY_TRANSFORM = `${TALL_TRANSFORM} translate(0 160) scale(1 ${BODY_STRETCH.tall}) translate(0 -160)`;

export const toTall = (p: Point): Point => ({ x: p.y, y: 1000 - p.x });

const col = (c: number) => Math.round(220 + c * 93.3);

function wideCenter(slot: number): Point {
  if (slot === 7) return { x: 120, y: 160 };
  if (slot === 15) return { x: 880, y: 160 };
  return owner(slot) === 'A' ? { x: col(6 - slot), y: 210 } : { x: col(slot - 8), y: 112 };
}

export function slotCenter(slot: number, o: Orientation): Point {
  const p = wideCenter(slot);
  return o === 'wide' ? p : toTall(p);
}

export function countAnchor(slot: number, o: Orientation): Point {
  const c = slotCenter(slot, o);
  const a = owner(slot) === 'A';
  return o === 'wide' ? { x: c.x, y: a ? 263 : 62 } : { x: a ? 271 : 54, y: c.y };
}

// Countable patterns: dice shapes up to 6, a flower for 7 (the starting
// count), rings after that, and a full cluster of 14 from 13 up.
export function marbleLayout(n: number, r: number = HOLE_R): Array<{ dx: number; dy: number; r: number }> {
  const pts: Array<{ dx: number; dy: number; r: number }> = [];
  const ring = (k: number, rad: number, m: number, off = 0) => {
    for (let i = 0; i < k; i++) {
      const a = off + (i * 2 * Math.PI) / k - Math.PI / 2;
      pts.push({ dx: Math.cos(a) * rad, dy: Math.sin(a) * rad, r: m });
    }
  };
  if (n <= 0) return pts;
  if (n === 1) pts.push({ dx: 0, dy: 0, r: r * 0.34 });
  else if (n === 2) ring(2, r * 0.4, r * 0.3, Math.PI / 2);
  else if (n === 3) ring(3, r * 0.42, r * 0.3);
  else if (n === 4) ring(4, r * 0.42, r * 0.28, Math.PI / 4);
  else if (n === 5) { pts.push({ dx: 0, dy: 0, r: r * 0.25 }); ring(4, r * 0.52, r * 0.25, Math.PI / 4); }
  else if (n === 6) ring(6, r * 0.5, r * 0.25);
  else if (n === 7) { pts.push({ dx: 0, dy: 0, r: r * 0.24 }); ring(6, r * 0.52, r * 0.24); }
  else if (n <= 9) { pts.push({ dx: 0, dy: 0, r: r * 0.21 }); ring(n - 1, r * 0.57, r * 0.21); }
  else if (n <= 12) { ring(3, r * 0.25, r * 0.18); ring(n - 3, r * 0.63, r * 0.18); }
  else { ring(4, r * 0.26, r * 0.17, Math.PI / 4); ring(10, r * 0.63, r * 0.17); }
  return pts;
}

// A heap filling the store from the bottom, honeycomb rows a little tighter
// than one marble apart. The store's chip shows the real number.
export function storePile(n: number, o: Orientation = 'wide'): Array<{ dx: number; dy: number }> {
  const [rx, ry] = o === 'wide' ? [STORE_RX, STORE_RY] : [STORE_RY, STORE_RX];
  const step = 0.88 * 2 * MARBLE_STORE_R;
  const want = Math.min(n, STORE_MAX);
  const pts: Array<{ dx: number; dy: number }> = [];
  for (let row = 0; pts.length < want; row++) {
    const dy = ry - 16 - row * step * 0.866;
    if (dy < -(ry - 8)) break;
    const off = row % 2 ? step / 2 : 0;
    const xs: number[] = [];
    for (let k = -6; k <= 6; k++) xs.push(k * step + off);
    xs.sort((p, q) => Math.abs(p) - Math.abs(q));
    for (const dx of xs) {
      if (pts.length >= want) break;
      if ((dx / (rx - 8)) ** 2 + (dy / (ry - 8)) ** 2 <= 1) pts.push({ dx, dy });
    }
  }
  return pts;
}
