'use client';
// Owns the game: state, the move animation, and settings. Every reset bumps
// a run id; a playback whose id is stale stops and never writes state.
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMove, legalMoves, newGame as freshState } from '@/utils/gameLogic';
import type { Board, Frame, FrameEvent, GameState, MoveResult, Player } from '@/utils/gameLogic';
import { frameDelay, playFrames } from '@/utils/playback';
import { playSound, primeSound, setSoundEnabled } from '@/utils/sound';
import { DEFAULT_SETTINGS, displayNames } from '@/utils/settings';
import type { Settings, Tally } from '@/utils/settings';
import { outcomeStatus, turnStatus } from '@/utils/text';

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
  const run = useRef(0);
  const skipping = useRef(false);

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);

  const names = displayNames(settings);
  const vsComputer = settings.opponent !== 'human';

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser preference
      setSettings(s => ({ ...s, speed: 'instant' }));
    }
    const runs = run;
    return () => {
      runs.current++; // unmounting cancels any move still playing
    };
  }, []);

  const play = useCallback(
    (slot: number) => {
      if (busy || !legalMoves(state).includes(slot)) return;
      const mover = state.turn;
      const result = applyMove(state, slot);
      const id = ++run.current;
      skipping.current = false;
      primeSound();
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
        if (result.state.phase === 'gameOver') playSound('win');
        else if (result.outcome === 'extraTurn') playSound('extra');
        setState(result.state);
        setView(idle(result.state.board));
        setLastMove({ result, mover });
        setBusy(false);
      });
    },
    [busy, state, settings.speed],
  );

  const newGame = useCallback(() => {
    run.current++;
    const fresh = freshState(settings.mode);
    setState(fresh);
    setView(idle(fresh.board));
    setCapture(null);
    setLastMove(null);
    setBusy(false);
  }, [settings.mode]);

  const turnText = turnStatus(state, names, vsComputer);
  let status = turnText;
  if (!busy && lastMove) {
    const out = outcomeStatus(lastMove.result, lastMove.mover, names, vsComputer);
    const extraOnly = lastMove.result.outcome === 'extraTurn' && state.phase === 'playing';
    status = extraOnly ? out : [out, turnText].filter(Boolean).join(' ');
  }

  return {
    state,
    view: { ...view, capture },
    busy,
    status,
    settings,
    updateSettings: p => setSettings(s => ({ ...s, ...p })),
    play,
    skip: () => {
      skipping.current = true;
    },
    newGame,
    undo: () => {},
    canUndo: false,
    nextRound: () => {},
    tally: { A: 0, B: 0, draws: 0 },
    match: null,
    previewOf: () => null,
  };
}
