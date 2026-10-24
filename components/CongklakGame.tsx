'use client';
import { useState } from 'react';
import Board from './board/Board';
import PixelPerson from './characters/PixelPerson';
import StoryCloud from './characters/StoryCloud';
import { man, woman } from './characters/pixel';
import ControlBar from './ControlBar';
import GameOverDialog from './GameOverDialog';
import MoveEffects from './board/MoveEffects';
import PaperDecor, { TitleSprig } from './PaperDecor';
import { useGame } from '@/hooks/useGame';
import { STORE, startNextRound } from '@/utils/gameLogic';
import type { GameState } from '@/utils/gameLogic';
import { displayNames } from '@/utils/settings';
import { matchStatus, roundSummary } from '@/utils/text';

const MAN = man();
const WOMAN = woman();

export default function CongklakGame() {
  const game = useGame();
  const names = displayNames(game.settings);
  const vsComputer = game.settings.opponent !== 'human';
  // The dialog shows once per finished game; a new game is a new state object.
  const [dismissed, setDismissed] = useState<GameState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [asking, setAsking] = useState<HTMLElement | null>(null);
  const preview = hover === null ? null : game.previewOf(hover);
  const { state } = game;
  const over = state.phase === 'gameOver';
  const winner = state.winner;
  const title =
    winner === 'draw' ? "It's a draw" : vsComputer ? (winner === 'A' ? 'You win!' : 'The computer wins') : `${names[winner ?? 'A']} wins!`;
  const score = `Final score: ${names.A} ${state.board[STORE.A]}, ${names.B} ${state.board[STORE.B]}.`;
  const matchText = game.match ? matchStatus(game.match, names, vsComputer) : '';
  const { tally, match } = game;
  const roundOver = state.phase === 'roundOver';
  const upcoming = roundOver ? startNextRound(state) : null;

  return (
    <>
    <PaperDecor />
    <div className="game">
      <header className="game-head">
        <h1>
          <TitleSprig side="left" />
          Congklak
          <TitleSprig side="right" />
        </h1>
        <p className="tagline">The Indonesian game of holes and marbles. Play a friend or the computer.</p>
      </header>
      <ControlBar game={game} />
      <p className="status" aria-live="polite">
        {game.status}
      </p>
      {/* Skip lives here, not in the button row: this line is empty during a move, so nothing shifts. */}
      <p className="hint">
        {game.busy ? (
          <button type="button" className="btn" onClick={game.skip}>
            Skip
          </button>
        ) : (
          preview?.text
        )}
      </p>
      <div className="scene">
        <PixelPerson sprite={MAN} className="char-man" label="Ask the man in the blangkon about congklak" onOpen={setAsking} />
        <Board
        board={game.view.board}
        burnt={state.burnt}
        playable={game.playable}
        active={game.view.active}
        flash={game.view.flash}
        preview={preview?.lastIndex ?? null}
        names={names}
        vsComputer={vsComputer}
        busy={game.busy}
        onPick={game.play}
        onPreview={setHover}
        onSkip={game.skip}
        overlay={o => <MoveEffects view={game.view} orientation={o} />}
        />
        <PixelPerson sprite={WOMAN} className="char-woman" label="Ask the woman in the kebaya about congklak" onOpen={setAsking} />
      </div>
      {asking && <StoryCloud anchor={asking} mode={game.settings.mode} onClose={() => setAsking(null)} />}
      <p className="tally">
        Wins: {names.A} {tally.A}, {names.B} {tally.B}. Draws: {tally.draws}.
        {match && ` Best of 3: ${names.A} ${match.A}, ${names.B} ${match.B}.`}
      </p>
      <GameOverDialog
        open={over && dismissed !== state}
        title={title}
        text={matchText ? `${score} ${matchText}` : score}
        onPlayAgain={game.newGame}
        onClose={() => setDismissed(state)}
      />
      <GameOverDialog
        open={roundOver && dismissed !== state}
        title={`Round ${state.round} is over`}
        text={upcoming ? roundSummary(state, upcoming, names, vsComputer) : ''}
        actionLabel={upcoming?.phase === 'gameOver' ? 'See the result' : `Start round ${state.round + 1}`}
        onPlayAgain={game.nextRound}
        onClose={() => setDismissed(state)}
      />
    </div>
    </>
  );
}
