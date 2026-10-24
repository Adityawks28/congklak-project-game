// Every sentence the game shows or announces lives here, so it can be checked.
import { STORE, owner } from './gameLogic.ts';
import type { GameState, MoveResult, Player } from './gameLogic.ts';

type Who = { names: Record<Player, string>; vsComputer: boolean };

const possessive = (p: Player, w: Who) => (w.vsComputer ? (p === 'A' ? 'Your' : "Computer's") : `${w.names[p]}'s`);
export const marbles = (n: number) => (n === 1 ? '1 marble' : `${n} marbles`);

export function holeLabel(slot: number, count: number, o: Who & { burnt: boolean }): string {
  const p = owner(slot);
  const number = slot - (p === 'A' ? 0 : 8) + 1;
  return `${possessive(p, o)} hole ${number}, ${o.burnt ? 'burnt' : marbles(count)}`;
}

export function storeLabel(p: Player, count: number, o: Who): string {
  return `${possessive(p, o)} store, ${marbles(count)}`;
}

const subject = (p: Player, w: Who) => (w.vsComputer ? (p === 'A' ? 'You' : 'The computer') : w.names[p]);

export function turnStatus(s: GameState, names: Record<Player, string>, vsComputer: boolean): string {
  const w = { names, vsComputer };
  const a = s.board[STORE.A], b = s.board[STORE.B];
  if (s.phase === 'gameOver') {
    if (s.winner === 'draw') return `It's a draw, ${a} to ${b}.`;
    const win = s.winner === 'B' ? 'B' : 'A';
    const [hi, lo] = win === 'A' ? [a, b] : [b, a];
    if (vsComputer) return win === 'A' ? `You win, ${hi} to ${lo}!` : `The computer wins, ${hi} to ${lo}.`;
    return `${names[win]} wins, ${hi} to ${lo}!`;
  }
  if (vsComputer) return s.turn === 'A' ? 'Your turn.' : "Computer's turn.";
  return `${possessive(s.turn, w)} turn.`;
}

// What the move just did, or '' when the turn simply passes.
export function outcomeStatus(r: MoveResult, mover: Player, names: Record<Player, string>, vsComputer: boolean): string {
  const w = { names, vsComputer };
  const who = subject(mover, w);
  if (r.outcome === 'capture') return `${who} captured ${marbles(r.captured)}.`;
  if (r.outcome === 'extraTurn' && r.state.phase === 'playing') {
    if (!vsComputer) return `${who} landed in the store: go again.`;
    return mover === 'A' ? 'You landed in your store: go again.' : 'The computer landed in its store and goes again.';
  }
  return '';
}
