'use client';
// The board: drawn art plus a real button over every hole. Both the wide and
// the tall (phone) board are rendered; CSS shows the one that fits. Holes that
// can't be played are aria-disabled and out of the Tab order, not disabled, so
// a screen reader still reads them and focus is not lost after a move.
import type { CSSProperties, ReactNode } from 'react';
import { HOLES, STORE } from '@/utils/gameLogic';
import type { Player } from '@/utils/gameLogic';
import { holeLabel, storeLabel } from '@/utils/text';
import { HOLE_R, STORE_RX, STORE_RY, VIEW, slotCenter } from './geometry';
import type { Orientation } from './geometry';
import { Body, Hole, Store } from './HoleArt';

export interface BoardProps {
  board: number[];
  burnt: boolean[];
  playable: number[];
  active: number | null;
  flash: number[];
  preview: number | null;
  names: Record<Player, string>;
  vsComputer: boolean;
  busy: boolean;
  onPick(slot: number): void;
  onPreview(slot: number | null): void;
  onSkip(): void;
  overlay?: (o: Orientation) => ReactNode;
}

const HOLE_SLOTS = [...HOLES.A, ...HOLES.B];
// Buttons go in reading order (top to bottom, left to right) so Tab follows the eye.
const READING_ORDER: Record<Orientation, number[]> = {
  wide: readingOrder('wide'),
  tall: readingOrder('tall'),
};
function readingOrder(o: Orientation): number[] {
  return [...HOLE_SLOTS].sort((a, b) => {
    const p = slotCenter(a, o), q = slotCenter(b, o);
    return p.y - q.y || p.x - q.x;
  });
}
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

function place(slot: number, o: Orientation): CSSProperties {
  const v = VIEW[o];
  const c = slotCenter(slot, o);
  const isStore = slot === STORE.A || slot === STORE.B;
  const [rx, ry] = !isStore ? [HOLE_R, HOLE_R] : o === 'wide' ? [STORE_RX, STORE_RY] : [STORE_RY, STORE_RX];
  return { left: pct((c.x - rx) / v.w), top: pct((c.y - ry) / v.h), width: pct((2 * rx) / v.w), height: pct((2 * ry) / v.h) };
}

function BoardView({ o, p }: { o: Orientation; p: BoardProps }) {
  const v = VIEW[o];
  const who = { names: p.names, vsComputer: p.vsComputer };
  const flag = (on: boolean) => (on ? '' : undefined);
  const legend =
    o === 'wide'
      ? `${p.names.A}: near row and the left store. ${p.names.B}: far row and the right store.`
      : `${p.names.A}: right column and the bottom store. ${p.names.B}: left column and the top store.`;
  return (
    <div className={`board-${o}`}>
      <div className="board-art">
        <svg viewBox={`0 0 ${v.w} ${v.h}`} aria-hidden="true" focusable="false">
          <Body o={o} />
          <Store slot={STORE.A} o={o} n={p.board[STORE.A]} />
          <Store slot={STORE.B} o={o} n={p.board[STORE.B]} />
          {HOLE_SLOTS.map(slot => <Hole key={slot} slot={slot} o={o} n={p.board[slot]} burnt={p.burnt[slot]} />)}
          {p.overlay?.(o)}
        </svg>
        {READING_ORDER[o].map(slot => (
          <button
            key={slot}
            type="button"
            className="hole-btn"
            style={place(slot, o)}
            aria-disabled={!p.playable.includes(slot)}
            tabIndex={p.playable.includes(slot) ? 0 : -1}
            data-playable={flag(p.playable.includes(slot))}
            data-active={flag(p.active === slot)}
            data-flash={flag(p.flash.includes(slot))}
            data-preview={flag(p.preview === slot)}
            aria-label={holeLabel(slot, p.board[slot], { burnt: p.burnt[slot], ...who })}
            onClick={e => {
              e.stopPropagation();
              if (p.playable.includes(slot)) p.onPick(slot);
            }}
            onMouseEnter={() => p.onPreview(slot)}
            onMouseLeave={() => p.onPreview(null)}
            onFocus={() => p.onPreview(slot)}
            onBlur={() => p.onPreview(null)}
          />
        ))}
        {(['A', 'B'] as const).map(pl => (
          <div
            key={pl}
            role="img"
            className="store-slot"
            style={place(STORE[pl], o)}
            data-active={flag(p.active === STORE[pl])}
            data-flash={flag(p.flash.includes(STORE[pl]))}
            data-preview={flag(p.preview === STORE[pl])}
            aria-label={storeLabel(pl, p.board[STORE[pl]], who)}
          />
        ))}
      </div>
      <p className="board-legend">{legend}</p>
    </div>
  );
}

export default function Board(p: BoardProps) {
  return (
    <div className="board" data-busy={p.busy ? '' : undefined} onClick={p.busy ? p.onSkip : undefined}>
      <BoardView o="wide" p={p} />
      <BoardView o="tall" p={p} />
    </div>
  );
}
