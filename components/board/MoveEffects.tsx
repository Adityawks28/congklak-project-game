'use client';
// What happens during a move, drawn over the board: the hand bubble, the
// marble hopping to its hole, and the capture burst (pulse, marbles flying
// to the store, the TEMBAK! cloud). Motion is CSS, so reduced motion turns it off.
import type { CSSProperties } from 'react';
import { STORE } from '@/utils/gameLogic';
import type { View } from '@/hooks/useGame';
import { cloudPath } from '../cloudPath';
import { Marble } from './HoleArt';
import { HOLE_R, slotCenter } from './geometry';
import type { Orientation, Point } from './geometry';

const isStore = (slot: number) => slot === STORE.A || slot === STORE.B;
const px = (v: number) => `${Math.round(v)}px`;

// Beside the active slot: on the line between the two rows, or at the far end of a store.
function bubbleAt(slot: number, o: Orientation): Point {
  const c = slotCenter(slot, o);
  if (o === 'wide') return isStore(slot) ? { x: c.x, y: c.y + 58 } : { x: c.x, y: 161 };
  return isStore(slot) ? { x: c.x + 62, y: c.y } : { x: 161, y: c.y };
}

// The cloud sits off the outer end of the store, half over the board's edge.
function cloudAt(store: number, o: Orientation): Point {
  const c = slotCenter(store, o);
  if (o === 'wide') return { x: c.x, y: 50 };
  return { x: c.x, y: store === STORE.A ? 952 : 48 };
}

const CLOUD = { wide: { w: 136, h: 74, font: 24 }, tall: { w: 156, h: 84, font: 27 } };

export default function MoveEffects({ view, orientation: o }: { view: View; orientation: Orientation }) {
  const { active, from, hand, step, stepMs, capture } = view;
  const hop = view.event === 'drop' && active !== null && from !== null && from !== active && stepMs > 0;
  return (
    <g className="fx" pointerEvents="none">
      {hop && <Hop key={`hop-${step}`} from={slotCenter(from, o)} to={slotCenter(active, o)} ms={stepMs} />}
      {capture && <CaptureBurst key={`cap-${capture.id}`} slots={capture.slots} store={STORE[capture.mover]} o={o} />}
      {hand > 0 && active !== null && <HandBubble at={bubbleAt(active, o)} n={hand} o={o} />}
    </g>
  );
}

function Hop({ from, to, ms }: { from: Point; to: Point; ms: number }) {
  const style = { '--dx': px(from.x - to.x), '--dy': px(from.y - to.y), animationDuration: `${Math.round(ms * 0.9)}ms` } as CSSProperties;
  return (
    <g transform={`translate(${to.x} ${to.y})`}>
      <g className="fx-hop" style={style}>
        <Marble x={0} y={0} r={11} />
      </g>
    </g>
  );
}

function HandBubble({ at, n, o }: { at: Point; n: number; o: Orientation }) {
  const font = o === 'wide' ? 15 : 19;
  const text = `in hand: ${n}`;
  const w = Math.round(text.length * font * 0.56 + 16), h = Math.round(font * 1.7);
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill="var(--chip)" stroke="var(--ink)" strokeWidth={2.5} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={font} fontWeight={800} fill="var(--ink)">
        {text}
      </text>
    </g>
  );
}

function CaptureBurst({ slots, store, o }: { slots: number[]; store: number; o: Orientation }) {
  const s = slotCenter(store, o);
  const c = cloudAt(store, o);
  const cloud = CLOUD[o];
  // 3 marbles leave the hole across, 2 the landing hole, a little apart.
  const fliers = [0, 1, 1, 0, 1].map((k, i) => {
    const p = slotCenter(slots[k], o);
    const a = i * 1.3;
    return { x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, delay: i * 70 };
  });
  return (
    <g>
      {slots.map(slot => {
        const p = slotCenter(slot, o);
        return <circle key={slot} className="fx-pulse" cx={p.x} cy={p.y} r={HOLE_R + 5} fill="none" stroke="var(--count)" strokeWidth={6} />;
      })}
      {fliers.map((f, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <g className="fx-fly" style={{ '--dx': px(f.x - s.x), '--dy': px(f.y - s.y), animationDelay: `${f.delay}ms` } as CSSProperties}>
            <Marble x={0} y={0} r={10} />
          </g>
        </g>
      ))}
      <g className="fx-cloud" transform={`translate(${c.x - cloud.w / 2} ${c.y - cloud.h / 2})`}>
        <g className="fx-cloud-pop">
          <path d={cloudPath(cloud.w, cloud.h)} fill="#fff" stroke="var(--ink)" strokeWidth={3.5} />
          <text x={cloud.w / 2} y={cloud.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={cloud.font} fontWeight={800} fill="var(--ink)">
            TEMBAK!
          </text>
        </g>
      </g>
    </g>
  );
}
