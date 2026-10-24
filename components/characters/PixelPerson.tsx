'use client';
// A pixel character as a button. The eyes follow the pointer through one
// shared listener (throttled to one update per frame); pupils move by
// attribute, so following never re-renders React. They blink now and then.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PALETTE, pupilOffset } from './pixel';
import type { Sprite } from './pixel';

const lookers = new Set<(x: number, y: number) => void>();
let queued = false;
let last = { x: 0, y: 0 };
function onMove(e: PointerEvent) {
  last = { x: e.clientX, y: e.clientY };
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    lookers.forEach(f => f(last.x, last.y));
  });
}
function follow(f: (x: number, y: number) => void) {
  if (lookers.size === 0) window.addEventListener('pointermove', onMove);
  lookers.add(f);
  return () => {
    lookers.delete(f);
    if (lookers.size === 0) window.removeEventListener('pointermove', onMove);
  };
}

// One <rect> per run of same-coloured pixels in a row.
function body(s: Sprite): ReactNode[] {
  const out: ReactNode[] = [];
  s.pixels.forEach((row, y) => {
    for (let x = 0; x < s.w; ) {
      const c = row[x];
      let e = x;
      while (c && e + 1 < s.w && row[e + 1] === c) e++;
      if (c) out.push(<rect key={`${x},${y}`} x={x} y={y} width={e - x + 1} height={1} fill={PALETTE[c]} />);
      x = e + 1;
    }
  });
  return out;
}

interface Props {
  sprite: Sprite;
  label: string;
  className?: string;
  onOpen(el: HTMLButtonElement): void;
}

export default memo(function PixelPerson({ sprite, label, className, onOpen }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const pupils = useRef<Array<SVGRectElement | null>>([]);
  const [blink, setBlink] = useState(false);
  const art = useMemo(() => body(sprite), [sprite]);

  useEffect(
    () =>
      follow((px, py) => {
        const box = svg.current?.getBoundingClientRect();
        if (!box || box.width === 0) return; // hidden layout
        const k = box.width / sprite.w;
        sprite.eyes.forEach((e, i) => {
          const { col, row } = pupilOffset(px - (box.left + (e.x + 1.5) * k), py - (box.top + (e.y + 1) * k));
          pupils.current[i]?.setAttribute('x', String(e.x + col));
          pupils.current[i]?.setAttribute('y', String(e.y + row));
        });
      }),
    [sprite],
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => {
          setBlink(false);
          next();
        }, 140);
      }, 2500 + Math.random() * 4000);
    };
    next();
    return () => clearTimeout(t);
  }, []);

  return (
    <button type="button" className={`px ${className ?? ''}`} aria-label={label} onClick={e => onOpen(e.currentTarget)}>
      <svg ref={svg} viewBox={`0 0 ${sprite.w} ${sprite.h}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        {art}
        {sprite.eyes.map((e, i) => (
          <rect key={`w${i}`} x={e.x} y={e.y} width={3} height={2} fill={blink ? PALETTE.S : PALETTE.W} />
        ))}
        {sprite.eyes.map((e, i) => (
          <rect
            key={`p${i}`}
            ref={el => {
              pupils.current[i] = el;
            }}
            className="pupil"
            x={e.x + 1}
            y={e.y + 1}
            width={1}
            height={1}
            fill={PALETTE.K}
            visibility={blink ? 'hidden' : undefined}
          />
        ))}
      </svg>
    </button>
  );
});
