'use client';
// The end of a game or a round, as a native modal dialog: it takes focus,
// closes on Escape, and the browser returns focus to where it was.
import { useEffect, useId, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  text: string;
  actionLabel?: string;
  onPlayAgain(): void;
  onClose(): void;
}

export default function GameOverDialog({ open, title, text, actionLabel = 'Play again', onPlayAgain, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Set when we close it because `open` went false: only a person closing it counts as dismissing.
  const closedByProp = useRef(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) {
      closedByProp.current = true;
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClose={() => {
        if (closedByProp.current) closedByProp.current = false;
        else onClose();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p>{text}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
          {actionLabel}
        </button>
        <button type="button" className="btn" onClick={() => ref.current?.close()}>
          Look at the board
        </button>
      </div>
    </dialog>
  );
}
