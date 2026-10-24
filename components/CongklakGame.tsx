'use client';
import { useState } from 'react';
import Board from './board/Board';
import { applyMove, legalMoves, newGame } from '@/utils/gameLogic';

const NAMES = { A: 'Player 1', B: 'Player 2' };

export default function CongklakGame() {
  const [state, setState] = useState(() => newGame());
  const status =
    state.phase === 'gameOver'
      ? state.winner === 'draw' ? "It's a draw." : `${NAMES[state.winner ?? 'A']} wins.`
      : `${NAMES[state.turn]}'s turn`;

  return (
    <div className="game">
      <header className="game-head">
        <h1>Congklak</h1>
        <p className="tagline">The Indonesian game of holes and marbles. Play a friend or the computer.</p>
      </header>
      <p className="status">{status}</p>
      <Board
        board={state.board}
        burnt={state.burnt}
        playable={legalMoves(state)}
        active={null}
        flash={[]}
        preview={null}
        names={NAMES}
        vsComputer={false}
        busy={false}
        onPick={slot => setState(s => applyMove(s, slot).state)}
        onPreview={() => {}}
        onSkip={() => {}}
      />
      <button type="button" className="btn" onClick={() => setState(newGame())}>
        New game
      </button>
    </div>
  );
}
