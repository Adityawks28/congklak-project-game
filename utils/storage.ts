// localStorage that never throws: private windows, blocked storage and old
// or hand-edited values all fall back instead of breaking the game.
const browser = (): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

export const SETTINGS_KEY = 'congklak.settings';
export const TALLY_KEY = 'congklak.tally';

export function load<T>(key: string, fallback: T, store: Pick<Storage, 'getItem'> | undefined = browser()): T {
  try {
    const raw = store?.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown, store: Pick<Storage, 'setItem'> | undefined = browser()): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // full or blocked storage: the game still works, it just forgets
  }
}
