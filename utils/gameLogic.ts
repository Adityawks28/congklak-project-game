// Congklak rules. Slots: A holes 0-6, A store 7, B holes 8-14, B store 15.
// Sowing walks up the indexes (clockwise on the board) and skips the
// opponent's store. The hole across from hole i is 14 - i.

export type Player = 'A' | 'B';
export type Mode = 'simple' | 'traditional';
export type Board = number[];

export const STORE: Record<Player, number> = { A: 7, B: 15 };
export const HOLES: Record<Player, number[]> = {
  A: [0, 1, 2, 3, 4, 5, 6],
  B: [8, 9, 10, 11, 12, 13, 14],
};
export const SEEDS_PER_HOLE = 7;
export const TOTAL = 98;

export interface GameState {
  board: Board;
  burnt: boolean[];
  turn: Player;
  mode: Mode;
  round: number;
  phase: 'playing' | 'roundOver' | 'gameOver';
  winner: Player | 'draw' | null;
}

export type FrameEvent = 'pick' | 'drop' | 'capture' | 'end';

export interface Frame {
  board: Board;
  active: number | null;
  hand: number;
  event: FrameEvent;
  capturedFrom?: number;
}

export type Outcome = 'extraTurn' | 'capture' | 'turnEnds';

export interface MoveResult {
  state: GameState;
  frames: Frame[];
  outcome: Outcome;
  captured: number;
  lastIndex: number;
}

// ponytail: guard against an endless relay; never reached in 2000 random games.
const MAX_DROPS = 5000;

export const opponent = (p: Player): Player => (p === 'A' ? 'B' : 'A');
export const owner = (slot: number): Player => (slot < 8 ? 'A' : 'B');
export const sideTotal = (board: Board, p: Player): number =>
  HOLES[p].reduce((n, i) => n + board[i], 0);

export function newGame(mode: Mode = 'simple'): GameState {
  const board = Array(16).fill(SEEDS_PER_HOLE);
  board[STORE.A] = 0;
  board[STORE.B] = 0;
  return { board, burnt: Array(16).fill(false), turn: 'A', mode, round: 1, phase: 'playing', winner: null };
}

export function legalMoves(s: GameState): number[] {
  if (s.phase !== 'playing') return [];
  return HOLES[s.turn].filter(i => s.board[i] > 0 && !s.burnt[i]);
}

export function applyMove(s: GameState, hole: number, opts: { record?: boolean } = {}): MoveResult {
  if (!legalMoves(s).includes(hole)) throw new Error(`Illegal move: hole ${hole}`);
  const record = opts.record ?? true;
  const me = s.turn;
  const board = [...s.board];
  const frames: Frame[] = [];
  const snap = (active: number | null, hand: number, event: FrameEvent, capturedFrom?: number) => {
    if (!record) return;
    const f: Frame = { board: [...board], active, hand, event };
    if (capturedFrom !== undefined) f.capturedFrom = capturedFrom;
    frames.push(f);
  };

  let hand = board[hole];
  board[hole] = 0;
  snap(hole, hand, 'pick');
  let i = hole;
  let drops = 0;
  let outcome: Outcome = 'turnEnds';
  let captured = 0;

  for (;;) {
    while (hand > 0) {
      i = (i + 1) % 16;
      if (i === STORE[opponent(me)] || s.burnt[i]) continue;
      board[i]++;
      hand--;
      drops++;
      snap(i, hand, 'drop');
    }
    if (i === STORE[me]) {
      outcome = 'extraTurn';
      break;
    }
    if (board[i] > 1 && drops < MAX_DROPS) {
      hand = board[i];
      board[i] = 0;
      snap(i, hand, 'pick');
      continue;
    }
    const across = 14 - i;
    if (owner(i) === me && board[i] === 1 && board[across] > 0) {
      captured = board[i] + board[across];
      board[STORE[me]] += captured;
      board[i] = 0;
      board[across] = 0;
      outcome = 'capture';
      snap(i, 0, 'capture', across);
    }
    break;
  }

  const state: GameState = { ...s, board, turn: outcome === 'extraTurn' ? me : opponent(me) };
  if (sideTotal(board, 'A') === 0 || sideTotal(board, 'B') === 0) {
    for (const p of ['A', 'B'] as const) {
      for (const h of HOLES[p]) {
        board[STORE[p]] += board[h];
        board[h] = 0;
      }
    }
    state.phase = 'gameOver';
    state.winner = board[STORE.A] > board[STORE.B] ? 'A' : board[STORE.B] > board[STORE.A] ? 'B' : 'draw';
    snap(null, 0, 'end');
  }
  return { state, frames, outcome, captured, lastIndex: i };
}
