'use client';
// The end of a game, as a native modal dialog: it takes focus, closes on
// Escape, and the browser returns focus to where it was.
import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  text: string;
  onPlayAgain(): void;
  onClose(): void;
}

export default function GameOverDialog({ open, title, text, onPlayAgain, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="game-over-title" onClose={onClose}>
      <h2 id="game-over-title">{title}</h2>
      <p>{text}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" className="btn" onClick={() => ref.current?.close()}>
          Look at the board
        </button>
      </div>
    </dialog>
  );
}
