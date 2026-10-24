// The computer opponent. Easy plays at random, Medium takes the best single
// move, Hard looks 5 moves ahead (minimax with alpha-beta pruning: it skips
// lines that cannot change the choice).
import { STORE, applyMove, legalMoves, opponent } from './gameLogic.ts';
import type { GameState, Player } from './gameLogic.ts';
import type { Level } from './settings.ts';

const DEPTH = 5;

function diff(s: GameState, me: Player): number {
  return s.board[STORE[me]] - s.board[STORE[opponent(me)]];
}

function best(moves: number[], score: (m: number) => number, rng: () => number): number {
  let top = -Infinity, ties: number[] = [];
  for (const m of moves) {
    const v = score(m);
    if (v > top) [top, ties] = [v, [m]];
    else if (v === top) ties.push(m);
  }
  return ties[Math.floor(rng() * ties.length)];
}

function search(s: GameState, me: Player, depth: number, alpha: number, beta: number): number {
  if (s.phase === 'gameOver') {
    const d = diff(s, me);
    return d === 0 ? 0 : Math.sign(d) * 1000 + d;
  }
  if (s.phase === 'roundOver' || depth === 0) return diff(s, me);
  // an extra turn keeps the same side moving, so whose turn it is decides max or min
  const maximise = s.turn === me;
  let v = maximise ? -Infinity : Infinity;
  for (const m of legalMoves(s)) {
    const child = search(applyMove(s, m, { record: false }).state, me, depth - 1, alpha, beta);
    if (maximise) {
      v = Math.max(v, child);
      alpha = Math.max(alpha, v);
    } else {
      v = Math.min(v, child);
      beta = Math.min(beta, v);
    }
    if (alpha >= beta) break;
  }
  return v;
}

export function chooseMove(s: GameState, level: Level, rng: () => number = Math.random): number {
  const moves = legalMoves(s);
  const me = s.turn;
  if (level === 'easy') return moves[Math.floor(rng() * moves.length)];
  if (level === 'medium') {
    return best(moves, m => {
      const r = applyMove(s, m, { record: false });
      return diff(r.state, me) - diff(s, me) + (r.outcome === 'extraTurn' ? 3 : 0);
    }, rng);
  }
  return best(moves, m => search(applyMove(s, m, { record: false }).state, me, DEPTH - 1, -Infinity, Infinity), rng);
}
