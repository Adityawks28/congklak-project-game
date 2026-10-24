// Every sentence the game shows or announces lives here, so it can be checked.
import { HOLES, STORE, opponent, owner } from './gameLogic.ts';
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
  if (s.phase === 'roundOver') return `Round ${s.round} is over.`;
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

// What a move would do, for the preview hint. Needs the move's frames, to see a relay.
export function previewText(r: MoveResult): string {
  const relayed = r.frames.filter(f => f.event === 'pick').length > 1;
  const mover = owner(r.frames[0]?.active ?? 0);
  let what: string;
  if (r.outcome === 'extraTurn') what = r.state.phase === 'playing' ? 'lands in your store: go again' : 'lands in your store';
  else if (r.outcome === 'capture') what = `captures ${marbles(r.captured)}`;
  else if (owner(r.lastIndex) === mover) what = `stops in your hole ${r.lastIndex - (mover === 'A' ? 0 : 8) + 1}`;
  else what = 'ends on the other side';
  const text = relayed ? `keeps going, then ${what}` : what;
  return text[0].toUpperCase() + text.slice(1);
}

// Best of 3: '' until a side has 2 wins.
export function matchStatus(m: Record<Player, number>, names: Record<Player, string>, vsComputer: boolean): string {
  const win: Player | null = m.A >= 2 ? 'A' : m.B >= 2 ? 'B' : null;
  if (!win) return '';
  const score = `${m[win]} to ${m[win === 'A' ? 'B' : 'A']}`;
  if (vsComputer) return win === 'A' ? `You win the match, ${score}!` : `The computer wins the match, ${score}.`;
  return `${names[win]} wins the match, ${score}!`;
}

// Traditional: what the round's end means, for the round dialog.
export function roundSummary(prev: GameState, next: GameState, names: Record<Player, string>, vsComputer: boolean): string {
  const w = { names, vsComputer };
  const parts = [`Round ${prev.round} is over: ${names.A} ${prev.board[STORE.A]}, ${names.B} ${prev.board[STORE.B]}.`];
  if (next.phase === 'gameOver') {
    const loser = opponent(next.winner === 'B' ? 'B' : 'A');
    parts.push(`${subject(loser, w)} cannot fill a single hole, so the game is over.`);
    return parts.join(' ');
  }
  for (const p of ['A', 'B'] as const) {
    const n = HOLES[p].filter(h => next.burnt[h]).length;
    const side = vsComputer ? (p === 'A' ? 'your' : "the computer's") : `${names[p]}'s`;
    if (n) parts.push(`${n === 1 ? '1 hole' : `${n} holes`} on ${side} side ${n === 1 ? 'is' : 'are'} burnt.`);
  }
  const starts = vsComputer && next.turn === 'A' ? 'start' : 'starts';
  parts.push(`${subject(next.turn, w)} ${starts} round ${next.round}.`);
  return parts.join(' ');
}
