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
  opponent: 'medium',
  speed: 'normal',
  mode: 'simple',
  sound: true,
  preview: true,
  bestOf3: false,
  names: { A: 'Player 1', B: 'Player 2' },
};

export const NAME_MAX = 16;

export function displayNames(s: Settings): Record<Player, string> {
  if (s.opponent !== 'human') return { A: 'You', B: 'Computer' };
  const shown = (p: Player) => s.names[p].trim().slice(0, NAME_MAX) || DEFAULT_SETTINGS.names[p];
  return { A: shown('A'), B: shown('B') };
}

// Saved settings come from storage, so anything may be in there.
const pickOne = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const name = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, NAME_MAX) : d);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isObject(raw)) return { ...d, names: { ...d.names } };
  const names = isObject(raw.names) ? raw.names : {};
  return {
    opponent: pickOne(raw.opponent, ['human', 'easy', 'medium', 'hard'], d.opponent),
    speed: pickOne(raw.speed, ['normal', 'fast', 'instant'], d.speed),
    mode: pickOne(raw.mode, ['simple', 'traditional'], d.mode),
    sound: bool(raw.sound, d.sound),
    preview: bool(raw.preview, d.preview),
    bestOf3: bool(raw.bestOf3, d.bestOf3),
    names: { A: name(names.A, d.names.A), B: name(names.B, d.names.B) },
  };
}

export function sanitizeTally(raw: unknown): Tally {
  const ok = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
  if (!isObject(raw) || !ok(raw.A) || !ok(raw.B) || !ok(raw.draws)) return { A: 0, B: 0, draws: 0 };
  return { A: raw.A as number, B: raw.B as number, draws: raw.draws as number };
}
