// Player-facing settings and their defaults.
import type { Mode, Player } from './gameLogic.ts';
import type { Speed } from './playback.ts';

export type Level = 'easy' | 'medium' | 'hard';
export type Opponent = 'human' | Level;

export interface Tally {
  A: number;
  B: number;
  draws: number;
}

export interface Settings {
  opponent: Opponent;
  speed: Speed;
  mode: Mode;
  sound: boolean;
  preview: boolean;
  bestOf3: boolean;
  names: Record<Player, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  opponent: 'human',
  speed: 'normal',
  mode: 'simple',
  sound: true,
  preview: true,
  bestOf3: false,
  names: { A: 'Player 1', B: 'Player 2' },
};

export function displayNames(s: Settings): Record<Player, string> {
  return s.opponent === 'human' ? s.names : { A: 'You', B: 'Computer' };
}
