// The two pixel characters, drawn on a 22 x 40 grid (ported from the approved
// sketch, docs/superpowers/specs/sketches/characters.html). Fills first, then
// an automatic outline in the board's ink, so they belong to the same world.

export interface Sprite {
  w: number;
  h: number;
  pixels: (string | null)[][];
  eyes: Array<{ x: number; y: number }>; // top-left of each 3 x 2 eye
}

export const PALETTE: Record<string, string> = {
  K: '#2a130a', // ink outline, pupils
  S: '#c08457', // skin
  s: '#96603a', // nose shade
  p: '#d6896a', // blush
  M: '#7a2e22', // smile
  W: '#fff6e3', // eye white
  h: '#4a3324', // brows, hair shine
  H: '#1c110b', // hair
  B: '#3d1f10', // blangkon cloth
  r: '#f2dcc0', // blangkon dots, kebaya edge
  L: '#36466a', // lurik stripe, dark
  l: '#e2d3b2', // lurik stripe, light
  J: '#7a4322', // batik jarik
  j: '#e0b77a', // batik motif
  R: '#8e2b2b', // kebaya
  Y: '#d0a03a', // gold centre panel
  y: '#f0cd74', // brooches, hairpin
  F: '#3b2416', // sandals
};

type Fill = string | ((x: number, y: number) => string);

function grid(w: number, h: number) {
  const a: (string | null)[][] = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  const set = (x: number, y: number, c: string | null) => {
    if (x >= 0 && y >= 0 && x < w && y < h) a[y][x] = c;
  };
  return {
    a,
    set,
    rect(x: number, y: number, ww: number, hh: number, c: Fill) {
      for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c);
    },
    outline() {
      const add: Array<[number, number]> = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (!a[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => a[y + dy]?.[x + dx])) add.push([x, y]);
      for (const [x, y] of add) a[y][x] = 'K';
    },
  };
}
type Grid = ReturnType<typeof grid>;

const lurik = (x: number) => (x % 2 ? 'l' : 'L');
const batik = (x: number, y: number) => ((x + 2 * y) % 5 === 0 ? 'j' : 'J');

// Face 10 wide, eyes on rows 8-9, a small smile and blushing cheeks.
function headBase(g: Grid, o: number) {
  g.rect(o + 5, 6, 10, 7, 'S');
  g.set(o + 5, 12, null);
  g.set(o + 14, 12, null);
  g.rect(o + 4, 8, 1, 2, 'S');
  g.rect(o + 15, 8, 1, 2, 'S');
  g.rect(o + 6, 7, 3, 1, 'h');
  g.rect(o + 11, 7, 3, 1, 'h');
  g.set(o + 9, 10, 's');
  g.set(o + 10, 10, 's');
  g.set(o + 8, 11, 'M');
  g.set(o + 11, 11, 'M');
  g.rect(o + 9, 12, 2, 1, 'M');
  g.set(o + 6, 10, 'p');
  g.set(o + 13, 10, 'p');
  g.rect(o + 8, 13, 4, 2, 'S');
  return [{ x: o + 6, y: 8 }, { x: o + 11, y: 8 }];
}

function lowerBody(g: Grid, o: number, top: number) {
  g.rect(o + 5, top, 10, 37 - top, batik);
  for (let y = top + 1; y < 37; y++) g.set(o + 12, y, 'j');
  g.rect(o + 6, 37, 3, 1, 'F');
  g.rect(o + 11, 37, 3, 1, 'F');
}

// A man in a blangkon (head cloth with a folded band and tucked ends), lurik shirt and jarik.
export function man(): Sprite {
  const g = grid(22, 40), o = 1;
  g.rect(o + 1, 15, 18, 2, lurik);
  g.rect(o + 1, 17, 2, 8, lurik);
  g.rect(o + 17, 17, 2, 8, lurik);
  g.rect(o + 4, 17, 12, 9, lurik);
  g.rect(o + 7, 15, 6, 1, 'L');
  g.rect(o + 1, 25, 2, 2, 'S');
  g.rect(o + 17, 25, 2, 2, 'S');
  lowerBody(g, o, 26);
  const eyes = headBase(g, o);
  g.rect(o + 5, 1, 10, 5, 'B');
  g.rect(o + 4, 2, 12, 4, 'B');
  g.rect(o + 6, 0, 8, 1, 'B');
  for (const [x, y] of [[7, 2], [11, 2], [9, 3], [13, 3], [6, 4], [10, 4]]) g.set(o + x, y, 'r');
  g.rect(o + 4, 5, 12, 1, 'J');
  g.rect(o + 2, 4, 2, 2, 'B');
  g.rect(o + 16, 4, 2, 2, 'B');
  g.outline();
  return { w: 22, h: 40, pixels: g.a, eyes };
}

// A woman in a maroon kebaya with a gold centre panel and brooches, hair in a sanggul with a pin.
export function woman(): Sprite {
  const g = grid(22, 40), o = 1;
  g.rect(o + 1, 15, 18, 2, 'R');
  g.rect(o + 1, 17, 2, 8, 'R');
  g.rect(o + 17, 17, 2, 8, 'R');
  g.rect(o + 4, 17, 12, 9, 'R');
  g.rect(o + 9, 15, 2, 3, 'S');
  for (let y = 17; y < 26; y++) {
    g.set(o + 8, y, 'r');
    g.set(o + 11, y, 'r');
    g.set(o + 9, y, 'Y');
    g.set(o + 10, y, 'Y');
  }
  for (const y of [19, 22]) {
    g.set(o + 9, y, 'y');
    g.set(o + 10, y, 'y');
  }
  g.rect(o + 1, 25, 2, 2, 'S');
  g.rect(o + 17, 25, 2, 2, 'S');
  lowerBody(g, o, 26);
  const eyes = headBase(g, o);
  g.rect(o + 5, 3, 10, 3, 'H');
  g.rect(o + 4, 4, 1, 6, 'H');
  g.rect(o + 15, 4, 1, 6, 'H');
  g.rect(o + 7, 1, 6, 2, 'H');
  g.rect(o + 8, 0, 4, 1, 'H');
  g.set(o + 8, 1, 'h');
  g.set(o + 7, 4, 'h');
  g.set(o + 8, 4, 'h');
  g.set(o + 13, 1, 'y');
  g.set(o + 14, 0, 'y');
  g.outline();
  return { w: 22, h: 40, pixels: g.a, eyes };
}

// Where the 1 px pupil sits in its 3 x 2 eye, from the pointer's offset to the eye.
export function pupilOffset(dx: number, dy: number): { col: 0 | 1 | 2; row: 0 | 1 } {
  return { col: Math.abs(dx) < 28 ? 1 : dx < 0 ? 0 : 2, row: dy < 0 ? 0 : 1 };
}
