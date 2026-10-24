'use client';
// The always-visible buttons in one centred row; Settings opens its panel below.
// (A <details> summary cannot share a row with the other buttons.)
import { useId, useState } from 'react';
import type { Game } from '@/hooks/useGame';
import type { Mode } from '@/utils/gameLogic';
import type { Speed } from '@/utils/playback';
import { NAME_MAX } from '@/utils/settings';
import type { Opponent } from '@/utils/settings';

export default function ControlBar({ game }: { game: Game }) {
  const s = game.settings;
  const set = game.updateSettings;
  const vsComputer = s.opponent !== 'human';
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="controls">
      <div className="actions">
        <button type="button" className="btn" onClick={game.newGame}>
          New game
        </button>
        {game.state.phase === 'roundOver' && (
          <button type="button" className="btn btn-primary" onClick={game.nextRound}>
            Start round {game.state.round + 1}
          </button>
        )}
        {vsComputer && (
          <button type="button" className="btn" aria-disabled={!game.canUndo} onClick={game.undo}>
            Undo
          </button>
        )}
        <button type="button" className="btn" aria-pressed={s.sound} onClick={() => set({ sound: !s.sound })}>
          Sound <span aria-hidden="true">{s.sound ? 'on' : 'off'}</span>
        </button>
        <button
          type="button" className="btn settings-toggle" aria-expanded={open} aria-controls={panelId}
          onClick={() => setOpen(o => !o)}
        >
          Settings
        </button>
      </div>
      <div id={panelId} className="settings-body" hidden={!open}>
        <label className="field">
          Opponent
          <select value={s.opponent} onChange={e => set({ opponent: e.target.value as Opponent })}>
            <option value="human">Two players</option>
            <option value="easy">Computer: Easy</option>
            <option value="medium">Computer: Medium</option>
            <option value="hard">Computer: Hard</option>
          </select>
        </label>
        <label className="field">
          Speed
          <select value={s.speed} onChange={e => set({ speed: e.target.value as Speed })}>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
            <option value="instant">Instant</option>
          </select>
        </label>
        <label className="field">
          Rules
          <select value={s.mode} onChange={e => set({ mode: e.target.value as Mode })}>
            <option value="simple">Simple</option>
            <option value="traditional">Traditional (rounds)</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.preview} onChange={e => set({ preview: e.target.checked })} />
          Move preview
        </label>
        <label className="check">
          <input type="checkbox" checked={s.bestOf3} onChange={e => set({ bestOf3: e.target.checked })} />
          Best of 3
        </label>
        {!vsComputer &&
          (['A', 'B'] as const).map((p, i) => (
            <label key={p} className="field">
              Player {i + 1} name
              <input
                type="text"
                maxLength={NAME_MAX}
                value={s.names[p]}
                placeholder={`Player ${i + 1}`}
                onChange={e => set({ names: { ...s.names, [p]: e.target.value } })}
              />
            </label>
          ))}
      </div>
    </div>
  );
}
