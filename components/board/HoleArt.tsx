// Storybook-ink drawings of the board's parts: marbles, holes, stores, body.
import { memo } from 'react';
import {
  BOARD_PATH, COUNT_FONT, HOLE_R, MARBLE_STORE_R, STORE_RX, STORE_RY, TALL_BODY_TRANSFORM,
  countAnchor, marbleLayout, slotCenter, storePile,
} from './geometry';
import type { Orientation } from './geometry';

const f = (v: number) => Math.round(v * 10) / 10;

export function Marble({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={f(x)} cy={f(y)} r={f(r)} fill="var(--marble)" stroke="var(--marble-line)" strokeWidth={1.8} />
      <circle cx={f(x - r * 0.22)} cy={f(y - r * 0.22)} r={f(r * 0.48)} fill="var(--marble-light)" opacity={0.85} />
      <ellipse
        cx={f(x - r * 0.38)} cy={f(y - r * 0.42)} rx={f(r * 0.24)} ry={f(r * 0.14)}
        transform={`rotate(-35 ${f(x - r * 0.38)} ${f(y - r * 0.42)})`} fill="#fff"
      />
    </g>
  );
}

export const Hole = memo(function Hole({ slot, o, n, burnt }: { slot: number; o: Orientation; n: number; burnt: boolean }) {
  const { x, y } = slotCenter(slot, o);
  const c = countAnchor(slot, o);
  const R = HOLE_R;
  if (burnt) {
    // Traditional rules: a hole nobody could refill, sealed and cracked for the round.
    const crack = `M ${x - 22} ${y - 12} L ${x - 7} ${y - 1} L ${x - 13} ${y + 8} L ${x + 2} ${y + 20} M ${x - 7} ${y - 1} L ${x + 9} ${y - 9} L ${x + 22} ${y + 3}`;
    return (
      <g>
        <circle cx={x} cy={y + 2.5} r={R + 3} fill="var(--rim)" opacity={0.75} />
        <circle cx={x} cy={y} r={R} fill="var(--hole-shade)" stroke="var(--ink)" strokeWidth={3.5} />
        <path d={crack} fill="none" stroke="var(--rim)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y + 2.5} r={R + 3} fill="var(--rim)" opacity={0.75} />
      <circle cx={x} cy={y} r={R} fill="var(--hole)" stroke="var(--ink)" strokeWidth={3.5} />
      <path d={`M ${x - R} ${y} A ${R} ${R} 0 0 1 ${x + R} ${y} A ${f(R * 1.45)} ${f(R * 1.45)} 0 0 0 ${x - R} ${y} Z`} fill="var(--hole-shade)" />
      {marbleLayout(n).map((m, i) => <Marble key={i} x={x + m.dx} y={y + m.dy + 2} r={m.r} />)}
      <text
        x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={COUNT_FONT[o]}
        fill="var(--count)" stroke="var(--ink)" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke"
      >
        {n}
      </text>
    </g>
  );
});

export const Store = memo(function Store({ slot, o, n }: { slot: number; o: Orientation; n: number }) {
  const { x, y } = slotCenter(slot, o);
  const [rx, ry] = o === 'wide' ? [STORE_RX, STORE_RY] : [STORE_RY, STORE_RX];
  // The chip sits at the far end of a wide store and in the middle of a tall one.
  const chip = o === 'wide' ? { x, y: y - 60 } : { x, y };
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx={rx + 3} ry={ry + 3} fill="var(--rim)" opacity={0.75} />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="var(--hole)" stroke="var(--ink)" strokeWidth={3.5} />
      <path d={`M ${x - rx} ${y} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} A ${f(rx * 1.3)} ${f(ry * 1.1)} 0 0 0 ${x - rx} ${y} Z`} fill="var(--hole-shade)" />
      {storePile(n, o).map((p, i) => <Marble key={i} x={x + p.dx} y={y + p.dy} r={MARBLE_STORE_R} />)}
      <rect x={chip.x - 26} y={chip.y - 17} width={52} height={34} rx={9} fill="var(--chip)" stroke="var(--ink)" strokeWidth={2} />
      <text x={chip.x} y={chip.y} textAnchor="middle" dominantBaseline="central" fontWeight={800} fontSize={26} fill="var(--ink)">
        {n}
      </text>
    </g>
  );
});

function Vine({ x1, x2, y, flip }: { x1: number; x2: number; y: number; flip: number }) {
  let d = `M ${x1} ${y}`;
  const leaves = [];
  for (let x = x1; x < x2; x += 30) {
    const up = ((x - x1) / 30) % 2 === 0 ? -1 : 1;
    const ly = y + up * 9 * flip;
    d += ` Q ${x + 15} ${ly} ${x + 30} ${y}`;
    const cy = f(ly + up * 6 * flip);
    leaves.push(<ellipse key={x} cx={x + 15} cy={cy} rx={7} ry={3.2} transform={`rotate(${up * flip * 40} ${x + 15} ${cy})`} fill="var(--carve)" />);
  }
  return (
    <g>
      <path d={d} fill="none" stroke="var(--carve)" strokeWidth={3} strokeLinecap="round" />
      {leaves}
    </g>
  );
}

function Curl({ x, y, dir }: { x: number; y: number; dir: number }) {
  const s = { fill: 'none', stroke: 'var(--carve)', strokeWidth: 3, strokeLinecap: 'round' as const };
  return (
    <g>
      <path d={`M ${x} ${y} c ${dir * -8} -14 ${dir * -26} -10 ${dir * -24} 4 c ${dir * 2} 10 ${dir * 14} 10 ${dir * 14} 2`} {...s} />
      <path d={`M ${x} ${y + 40} c ${dir * -8} 14 ${dir * -26} 10 ${dir * -24} -4 c ${dir * 2} -10 ${dir * 14} -10 ${dir * 14} -2`} {...s} />
    </g>
  );
}

// The wooden body with its carving, drawn in wide coordinates and turned for tall.
export const Body = memo(function Body({ o }: { o: Orientation }) {
  const clip = `board-clip-${o}`;
  return (
    <g transform={o === 'tall' ? TALL_BODY_TRANSFORM : undefined}>
      {o === 'wide' && <ellipse cx={500} cy={312} rx={440} ry={16} fill="#000" opacity={0.16} />}
      <defs>
        <clipPath id={clip}>
          <path d={BOARD_PATH} />
        </clipPath>
      </defs>
      <path d={BOARD_PATH} transform="translate(0 18)" fill="var(--wood-side)" stroke="var(--ink)" strokeWidth={3.5} />
      <path d={BOARD_PATH} fill="var(--wood-top)" />
      <g clipPath={`url(#${clip})`}>
        <path d={BOARD_PATH} transform="translate(0 7)" fill="var(--wood)" />
      </g>
      <path d={BOARD_PATH} fill="none" stroke="var(--ink)" strokeWidth={3.5} />
      <Vine x1={198} x2={798} y={62} flip={1} />
      <Vine x1={198} x2={798} y={260} flip={-1} />
      <Curl x={70} y={140} dir={-1} />
      <Curl x={930} y={140} dir={1} />
    </g>
  );
});
