'use client';
// The manga cloud a character opens: a native modal dialog (takes focus,
// closes on Escape or a click outside, gives focus back to the character).
// Wide screens get a scalloped cloud beside the head; narrow ones a
// full-width panel above the characters.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Mode } from '@/utils/gameLogic';
import { HISTORY, RULES, SOURCES, TRADITIONAL_RULES } from '@/content/story';
import type { Panel } from '@/content/story';
import { cloudPath } from '../cloudPath';

type View = { topic: null } | { topic: 'rules' | 'history'; page: number };

const CLOUD = { w: 500, h: 420 };
const NARROW = 600;

interface Placement {
  style: CSSProperties;
  tail: string; // polygon points, in the dialog's own coordinates
  cloud: boolean;
}

function place(anchor: HTMLElement): Placement {
  const r = anchor.getBoundingClientRect();
  const head = { x: r.left + r.width / 2, y: r.top + r.height * 0.2 };
  const vw = window.innerWidth, vh = window.innerHeight;
  if (vw < NARROW) {
    const bottom = Math.max(8, vh - r.top + 14);
    const tx = Math.min(Math.max(head.x - 16, 28), vw - 28) - 16; // tail x inside the panel
    return {
      // top: auto undoes the modal dialog's built-in top: 0, so bottom places it
      style: { left: 16, right: 16, top: 'auto', bottom, width: 'auto', maxHeight: vh - bottom - 8 },
      tail: `${tx - 10},0 ${tx + 10},0 ${tx},14`,
      cloud: false,
    };
  }
  const right = head.x < vw / 2; // cloud to the right of a character on the left
  const left = Math.min(Math.max(right ? head.x + 44 : head.x - 44 - CLOUD.w, 8), vw - CLOUD.w - 8);
  const top = Math.min(Math.max(head.y - CLOUD.h * 0.4, 8), vh - CLOUD.h - 8);
  const hx = head.x - left, hy = head.y - top;
  const ex = right ? 26 : CLOUD.w - 26, ey = Math.min(Math.max(hy, 120), CLOUD.h - 120);
  return {
    style: { left, top, width: CLOUD.w, height: CLOUD.h },
    tail: `${ex},${ey - 22} ${ex},${ey + 22} ${hx + (right ? 14 : -14)},${hy}`,
    cloud: true,
  };
}

export default function StoryCloud({ anchor, mode, onClose }: { anchor: HTMLElement; mode: Mode; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<View>({ topic: null });
  const [p, setP] = useState<Placement | null>(null);
  const rules = mode === 'traditional' && TRADITIONAL_RULES.length ? TRADITIONAL_RULES : RULES;

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measured from the DOM before paint
    setP(place(anchor));
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, [anchor]);

  useEffect(() => {
    const close = () => ref.current?.close();
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  // Move focus to the new view's first button, so Enter keeps paging.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-first]')?.focus();
  }, [view]);

  // History ends on its own sources page (null), so every panel fits the cloud.
  const panels: Array<Panel | null> = view.topic === 'rules' ? rules : view.topic === 'history' ? [...HISTORY, null] : [];
  const page = view.topic ? view.page : 0;
  const lastPage = page === panels.length - 1;
  const title = view.topic === 'rules' ? 'Congklak rules' : 'History and origin';

  return (
    <dialog
      ref={ref}
      className={`story ${p?.cloud ? 'story-cloud' : 'story-panel'}`}
      style={p?.style}
      aria-label="Ask about congklak"
      onClose={() => {
        onClose();
        anchor.focus();
      }}
      onClick={e => {
        // A click on the backdrop targets the dialog itself, outside its box. Clicks made
        // with the keyboard report (0, 0), so the target check comes first.
        const b = ref.current?.getBoundingClientRect();
        if (e.target !== ref.current || !b) return;
        if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) ref.current?.close();
      }}
    >
      {p && (
        <svg className="story-shape" aria-hidden="true" focusable="false">
          {/* the tail first, so the cloud's edge closes it off */}
          <polygon points={p.tail} fill="#fff" stroke="var(--ink)" strokeWidth={3.5} strokeLinejoin="round" />
          {p.cloud && <path d={cloudPath(CLOUD.w, CLOUD.h)} fill="#fff" stroke="var(--ink)" strokeWidth={3.5} />}
        </svg>
      )}
      <div className="story-inner">
        {view.topic === null ? (
          <>
            <p className="story-hello">Halo! What would you like to know?</p>
            <button type="button" className="btn story-btn" data-first onClick={() => setView({ topic: 'rules', page: 0 })}>
              1. Congklak rules
            </button>
            <button type="button" className="btn story-btn" onClick={() => setView({ topic: 'history', page: 0 })}>
              2. History and origin
            </button>
          </>
        ) : (
          <>
            <h2 className="story-title">
              {title} <span className="story-count">{page + 1} of {panels.length}</span>
            </h2>
            {panels[page] ? (
              <p className="story-text">{panels[page].text}</p>
            ) : (
              <p className="story-text">Where these facts come from:</p>
            )}
            {!panels[page] && (
              <ul className="story-sources">
                {SOURCES.map(s => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <div className="story-nav">
              <button type="button" className="btn" onClick={() => setView(page === 0 ? { topic: null } : { topic: view.topic, page: page - 1 })}>
                Back
              </button>
              {lastPage ? (
                <button type="button" className="btn btn-primary" data-first onClick={() => setView({ topic: null })}>
                  Menu
                </button>
              ) : (
                <button type="button" className="btn btn-primary" data-first onClick={() => setView({ topic: view.topic, page: page + 1 })}>
                  Next
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
