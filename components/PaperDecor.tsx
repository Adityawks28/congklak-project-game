// The page around the board, drawn like the board: a kawung batik border (the
// motif on the characters' jarik cloth), carved vine sprigs like the board's rim,
// and a few loose marbles. Decoration only: hidden from screen readers, never clickable.
import { Marble } from './board/HoleArt';

const LEAF = { rx: 9, ry: 4.2, fill: 'var(--marble)', fillOpacity: 0.6, stroke: 'var(--marble-line)', strokeOpacity: 0.55, strokeWidth: 1.2 };
const VINE = { fill: 'none', stroke: 'var(--carve)', strokeOpacity: 0.5, strokeWidth: 3, strokeLinecap: 'round' as const };

function Leaf({ x, y, a, r = 1 }: { x: number; y: number; a: number; r?: number }) {
  return <ellipse cx={x} cy={y} {...LEAF} rx={LEAF.rx * r} ry={LEAF.ry * r} transform={`rotate(${a} ${x} ${y})`} />;
}

function Band({ id, bottom }: { id: string; bottom?: boolean }) {
  return (
    <svg className={bottom ? 'decor-band decor-band-bottom' : 'decor-band'} height="38" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
          <g fill="var(--rim)" fillOpacity={0.35} stroke="var(--wood)" strokeOpacity={0.5} strokeWidth={1.5}>
            <ellipse cx="16" cy="7.5" rx="4.5" ry="6.5" />
            <ellipse cx="16" cy="24.5" rx="4.5" ry="6.5" />
            <ellipse cx="7.5" cy="16" rx="6.5" ry="4.5" />
            <ellipse cx="24.5" cy="16" rx="6.5" ry="4.5" />
          </g>
          <g fill="var(--wood)" fillOpacity={0.55}>
            <circle cx="16" cy="16" r="2" />
            <circle cx="0" cy="0" r="2" />
            <circle cx="32" cy="0" r="2" />
            <circle cx="0" cy="32" r="2" />
            <circle cx="32" cy="32" r="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="32" fill={`url(#${id})`} />
      <line x1="0" x2="100%" y1="35" y2="35" stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={2} />
    </svg>
  );
}

// One vine sprig, drawn for the top-left corner and mirrored for the others.
// Marbles are placed by mirrored coordinates but drawn upright, so their shine stays top-left.
const W = 180;
const H = 140;
function Corner({ at, marbles }: { at: 'tl' | 'tr' | 'bl' | 'br'; marbles: Array<[number, number, number]> }) {
  const sx = at.endsWith('r') ? -1 : 1;
  const sy = at.startsWith('b') ? -1 : 1;
  return (
    <svg className={`decor-corner decor-${at}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <g transform={`translate(${sx < 0 ? W : 0} ${sy < 0 ? H : 0}) scale(${sx} ${sy})`}>
        <path d="M 0 18 C 34 14 52 30 70 44 C 92 61 118 62 132 48 C 142 38 136 24 124 26 C 115 28 115 40 124 41" {...VINE} />
        <path d="M 22 16 C 30 40 22 64 34 86 C 42 100 58 98 58 86 C 58 77 48 75 45 82" {...VINE} />
        <Leaf x={38} y={14} a={-15} />
        <Leaf x={58} y={42} a={40} />
        <Leaf x={92} y={48} a={-20} />
        <Leaf x={108} y={66} a={15} />
        <Leaf x={16} y={46} a={75} />
        <Leaf x={36} y={66} a={-65} />
      </g>
      {marbles.map(([x, y, r]) => (
        <Marble key={`${x},${y}`} x={sx < 0 ? W - x : x} y={sy < 0 ? H - y : y} r={r} />
      ))}
    </svg>
  );
}

// Small vine flourishes either side of the title, at every width.
export function TitleSprig({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'left';
  return (
    <svg className="title-sprig" viewBox="0 0 64 32" aria-hidden="true" focusable="false">
      <g transform={flip ? 'translate(64 0) scale(-1 1)' : undefined}>
        <path d="M 2 17 C 14 17 22 7 34 9 C 44 11 46 23 38 25 C 32 26 31 19 36 18" {...VINE} strokeOpacity={0.7} />
        <Leaf x={16} y={10} a={-25} r={0.8} />
        <Leaf x={24} y={23} a={30} r={0.8} />
      </g>
      <Marble x={flip ? 9 : 55} y={18} r={5.5} />
    </svg>
  );
}

export default function PaperDecor() {
  return (
    <>
      <Band id="kawung-top" />
      <Band id="kawung-bottom" bottom />
      <Corner at="tl" marbles={[[150, 96, 9], [128, 116, 7]]} />
      <Corner at="tr" marbles={[[146, 92, 8], [164, 112, 9], [132, 118, 6]]} />
      <Corner at="bl" marbles={[[138, 98, 9], [160, 120, 7], [116, 120, 6]]} />
      <Corner at="br" marbles={[[152, 104, 9], [130, 122, 7]]} />
    </>
  );
}
