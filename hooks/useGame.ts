'use client';
// Owns the game: state, the move animation, and settings. Every reset bumps
// a run id; a playback whose id is stale stops and never writes state.
import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseMove } from '@/utils/ai';
import { applyMove, legalMoves, newGame as freshState, startNextRound } from '@/utils/gameLogic';
import type { Board, Frame, FrameEvent, GameState, MoveResult, Player } from '@/utils/gameLogic';
import { frameDelay, playFrames } from '@/utils/playback';
import { playSound, primeSound, setSoundEnabled } from '@/utils/sound';
import { DEFAULT_SETTINGS, displayNames, sanitizeSettings, sanitizeTally } from '@/utils/settings';
import type { Settings, Tally } from '@/utils/settings';
import { SETTINGS_KEY, TALLY_KEY, load, save } from '@/utils/storage';
import { matchStatus, outcomeStatus, previewText, turnStatus } from '@/utils/text';

export interface View {
  board: Board;
  active: number | null;
  hand: number;
  flash: number[];
  event: FrameEvent | null;
  from: number | null; // where the hand was on the frame before
  step: number; // frame index, so effects can restart per frame
  stepMs: number; // how long this frame stays up
  capture: { id: number; mover: Player; slots: number[] } | null; // last capture, from the move result
}

export interface Game {
  state: GameState;
  view: View;
  busy: boolean;
  playable: number[]; // holes the person may pick right now
  status: string;
  settings: Settings;
  updateSettings(p: Partial<Settings>): void;
  play(slot: number): void;
  skip(): void;
  newGame(): void;
  undo(): void;
  canUndo: boolean;
  nextRound(): void;
  tally: Tally;
  match: { A: number; B: number } | null;
  previewOf(slot: number): { lastIndex: number; text: string } | null;
}

type FrameView = Omit<View, 'capture'>;
const idle = (board: Board): FrameView => ({ board, active: null, hand: 0, flash: [], event: null, from: null, step: -1, stepMs: 0 });
const viewOf = (f: Frame, from: number | null, step: number, stepMs: number): FrameView => ({
  board: f.board,
  active: f.active,
  hand: f.hand,
  flash: f.event === 'capture' && f.active !== null && f.capturedFrom !== undefined ? [f.active, f.capturedFrom] : [],
  event: f.event,
  from,
  step,
  stepMs,
});

export function useGame(): Game {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [state, setState] = useState<GameState>(() => freshState(DEFAULT_SETTINGS.mode));
  const [view, setView] = useState<FrameView>(() => idle(state.board));
  const [capture, setCapture] = useState<View['capture']>(null);
  const [busy, setBusy] = useState(false);
  const [lastMove, setLastMove] = useState<{ result: MoveResult; mover: Player } | null>(null);
  const [history, setHistory] = useState<GameState[]>([]); // states before each of your moves, for Undo
  const [tally, setTally] = useState<Tally>({ A: 0, B: 0, draws: 0 });
  const [match, setMatch] = useState<Record<Player, number>>({ A: 0, B: 0 });
  const [notice, setNotice] = useState<string | null>(null); // "New game: …" after a settings change
  const run = useRef(0);
  const skipping = useRef(false);

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);

  const names = displayNames(settings);
  const level = settings.opponent === 'human' ? null : settings.opponent;
  const { bestOf3 } = settings;
  const vsComputer = level !== null;
  const computerTurn = vsComputer && state.turn === 'B' && state.phase === 'playing';
  const playable = busy || computerTurn ? [] : legalMoves(state);

  // Saved settings and tally load after mount, so the server render and the first client render match.
  useEffect(() => {
    const saved = sanitizeSettings(load(SETTINGS_KEY, null));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) saved.speed = 'instant';
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of storage and a browser preference */
    setSettings(saved);
    setTally(sanitizeTally(load(TALLY_KEY, null)));
    if (saved.mode !== DEFAULT_SETTINGS.mode) {
      const fresh = freshState(saved.mode);
      setState(fresh);
      setView(idle(fresh.board));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    const runs = run;
    return () => {
      runs.current++; // unmounting cancels any move still playing
    };
  }, []);

  const recordEnd = useCallback(
    (winner: Player | 'draw') => {
      playSound('win');
      setTally(t => {
        const next = winner === 'draw' ? { ...t, draws: t.draws + 1 } : { ...t, [winner]: t[winner] + 1 };
        save(TALLY_KEY, next);
        return next;
      });
      if (bestOf3 && winner !== 'draw') setMatch(m => ({ ...m, [winner]: m[winner] + 1 }));
    },
    [bestOf3],
  );

  const move = useCallback(
    (slot: number) => {
      if (busy || !legalMoves(state).includes(slot)) return;
      const mover = state.turn;
      const result = applyMove(state, slot);
      const id = ++run.current;
      skipping.current = false;
      primeSound();
      setNotice(null);
      setBusy(true);
      let captureShown = false;
      const showCapture = () => {
        if (captureShown || result.outcome !== 'capture') return;
        captureShown = true;
        setCapture({ id, mover, slots: [result.lastIndex, 14 - result.lastIndex] });
        playSound('capture');
        navigator.vibrate?.(40);
      };
      const { frames } = result;
      const ctl = { cancelled: () => run.current !== id, skipping: () => skipping.current };
      const onFrame = (f: Frame, i: number) => {
        setView(viewOf(f, i > 0 ? frames[i - 1].active : null, i, frameDelay(f, settings.speed, frames.length)));
        if (f.event === 'drop') playSound('drop');
        if (f.event === 'capture') showCapture();
      };
      void playFrames(frames, settings.speed, ctl, onFrame).then(res => {
        if (res === 'cancelled' || run.current !== id) return;
        showCapture();
        const { phase, winner } = result.state;
        if (phase === 'gameOver' && winner) recordEnd(winner);
        else if (result.outcome === 'extraTurn') playSound('extra');
        setState(result.state);
        setView(idle(result.state.board));
        setLastMove({ result, mover });
        setBusy(false);
      });
    },
    [busy, state, settings.speed, recordEnd],
  );

  // The computer waits half a second, then moves. Any reset bumps the run id,
  // and a change of state or opponent clears the timer, so a stale move never lands.
  useEffect(() => {
    if (!level || !computerTurn || busy) return;
    const id = run.current;
    const t = setTimeout(() => {
      if (run.current === id) move(chooseMove(state, level));
    }, 500);
    return () => clearTimeout(t);
  }, [level, computerTurn, busy, state, move]);

  const play = (slot: number) => {
    if (!playable.includes(slot)) return;
    if (vsComputer) setHistory(h => [...h, state]);
    move(slot);
  };

  const reset = (to: GameState) => {
    run.current++;
    setState(to);
    setView(idle(to.board));
    setCapture(null);
    setLastMove(null);
    setNotice(null);
    setBusy(false);
  };

  const matchOver = matchStatus(match, names, vsComputer) !== '';
  const startOver = (mode = settings.mode) => {
    setHistory([]);
    if (matchOver) setMatch({ A: 0, B: 0 });
    reset(freshState(mode));
  };
  const newGame = () => startOver();

  // Changing who you play or the rules starts a new game, and the status says so.
  const updateSettings = (p: Partial<Settings>) => {
    const next = { ...settings, ...p };
    setSettings(next);
    save(SETTINGS_KEY, next);
    if (p.bestOf3 !== undefined && p.bestOf3 !== settings.bestOf3) setMatch({ A: 0, B: 0 });
    const opponentChanged = p.opponent !== undefined && p.opponent !== settings.opponent;
    const modeChanged = p.mode !== undefined && p.mode !== settings.mode;
    if (!opponentChanged && !modeChanged) return;
    if (opponentChanged && (p.opponent === 'human') !== (settings.opponent === 'human')) {
      // the sides change meaning (Player 1 vs You), so the old wins no longer apply
      const zero = { A: 0, B: 0, draws: 0 };
      setTally(zero);
      save(TALLY_KEY, zero);
    }
    setMatch({ A: 0, B: 0 });
    startOver(next.mode);
    const who = next.opponent === 'human' ? 'for two players' : `against the computer (${next.opponent[0].toUpperCase()}${next.opponent.slice(1)})`;
    setNotice(opponentChanged ? `New game ${who}.` : `New game with ${next.mode} rules.`);
  };

  // Traditional: refill and start the next round, or end the game if someone cannot.
  const nextRound = () => {
    if (state.phase !== 'roundOver') return;
    const next = startNextRound(state);
    setHistory([]);
    reset(next);
    if (next.phase === 'gameOver' && next.winner) recordEnd(next.winner);
    else setNotice(`Round ${next.round} begins.`);
  };

  const previewOf = (slot: number) => {
    if (!settings.preview || !playable.includes(slot)) return null;
    const r = applyMove(state, slot); // recorded: the hint needs the frames to spot a relay
    return { lastIndex: r.lastIndex, text: previewText(r) };
  };

  const canUndo = vsComputer && history.length > 0 && state.phase !== 'gameOver';
  const undo = () => {
    if (!canUndo) return;
    setHistory(history.slice(0, -1));
    reset(history[history.length - 1]);
  };

  const turnText = turnStatus(state, names, vsComputer);
  let status = turnText;
  if (notice) status = `${notice} ${turnText}`;
  else if (lastMove) {
    const out = outcomeStatus(lastMove.result, lastMove.mover, names, vsComputer);
    const extraOnly = lastMove.result.outcome === 'extraTurn' && state.phase === 'playing';
    status = extraOnly ? out : [out, turnText].filter(Boolean).join(' ');
  }
  if (state.phase === 'gameOver' && bestOf3) status = [status, matchStatus(match, names, vsComputer)].filter(Boolean).join(' ');

  return {
    state,
    view: { ...view, capture },
    busy,
    playable,
    status,
    settings,
    updateSettings,
    play,
    skip: () => {
      skipping.current = true;
    },
    newGame,
    undo,
    canUndo,
    nextRound,
    tally,
    match: bestOf3 ? match : null,
    previewOf,
  };
}
