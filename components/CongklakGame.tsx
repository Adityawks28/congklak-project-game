'use client';
import { useState } from 'react';
import Board from './board/Board';
import GameOverDialog from './GameOverDialog';
import MoveEffects from './board/MoveEffects';
import { useGame } from '@/hooks/useGame';
import { STORE } from '@/utils/gameLogic';
import type { GameState } from '@/utils/gameLogic';
import { displayNames } from '@/utils/settings';

export default function CongklakGame() {
  const game = useGame();
  const names = displayNames(game.settings);
  const vsComputer = game.settings.opponent !== 'human';
  // The dialog shows once per finished game; a new game is a new state object.
  const [dismissed, setDismissed] = useState<GameState | null>(null);
  const { state } = game;
  const over = state.phase === 'gameOver';
  const winner = state.winner;
  const title =
    winner === 'draw' ? "It's a draw" : vsComputer ? (winner === 'A' ? 'You win!' : 'The computer wins') : `${names[winner ?? 'A']} wins!`;
  const score = `Final score: ${names.A} ${state.board[STORE.A]}, ${names.B} ${state.board[STORE.B]}.`;

  return (
    <div className="game">
      <header className="game-head">
        <h1>Congklak</h1>
        <p className="tagline">The Indonesian game of holes and marbles. Play a friend or the computer.</p>
      </header>
      <p className="status" aria-live="polite">
        {game.status}
      </p>
      <Board
        board={game.view.board}
        burnt={state.burnt}
        playable={game.playable}
        active={game.view.active}
        flash={game.view.flash}
        preview={null}
        names={names}
        vsComputer={vsComputer}
        busy={game.busy}
        onPick={game.play}
        onPreview={() => {}}
        onSkip={game.skip}
        overlay={o => <MoveEffects view={game.view} orientation={o} />}
      />
      <div className="actions">
        <button type="button" className="btn" onClick={game.newGame}>
          New game
        </button>
        {vsComputer && (
          <button type="button" className="btn" aria-disabled={!game.canUndo} onClick={game.undo}>
            Undo
          </button>
        )}
        <button type="button" className="btn" style={{ visibility: game.busy ? 'visible' : 'hidden' }} onClick={game.skip}>
          Skip
        </button>
      </div>
      <GameOverDialog
        open={over && dismissed !== state}
        title={title}
        text={score}
        onPlayAgain={game.newGame}
        onClose={() => setDismissed(state)}
      />
    </div>
  );
}
