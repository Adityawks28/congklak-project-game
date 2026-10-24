// Every sentence the game shows or announces lives here, so it can be checked.
import { owner } from './gameLogic.ts';
import type { Player } from './gameLogic.ts';

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
