# Congklak Storybook Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the congklak game with the approved Storybook-ink board, two pixel characters with a story cloud, a computer opponent, phone layout, Traditional rules, and all 31 audit fixes.

**Architecture:** Pure TypeScript modules hold everything testable (rules engine, AI, board geometry, sprites, text, playback, settings) and are checked with plain `node file.check.ts` scripts using `node:test`. React components render SVG art plus real HTML buttons over the holes; one `useGame` hook owns state, playback, the computer's turns and persistence. Wide and tall boards are both rendered and switched by CSS media query, so there is no hydration mismatch.

**Tech Stack:** Next.js 16 (static export, GitHub Pages), React 19, TypeScript, plain CSS tokens in `app/globals.css` (Tailwind stays installed for layout utilities), Web Audio API, `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-10-24-congklak-storybook-redesign-design.md` (approved). Read it before any task; sketches it references are in `docs/superpowers/specs/sketches/`.

## Global Constraints

- Static export, production basePath `/congklak-project-game` (keep the existing `next.config.ts` logic). No server code.
- No new runtime dependencies. Art is SVG drawn in code; sound is Web Audio.
- All UI text in English. No em dash character (U+2014) in any UI text.
- Every interactive control at least 44 x 44 px, with a visible `:focus-visible` ring (3 px solid `--ink`, offset 2 px).
- Text contrast at least 4.5:1 (3:1 only for bold text 19 px and up). Hole counts `#fff4dc` with ink outline sit only on the wood face `#9a5530`, never on the top band `#c47a48` or a rim highlight `#d99060`.
- Palette tokens (verbatim from the spec): ink `#2a130a`, paper `#f1e4cc`, wood top `#c47a48`, wood face `#9a5530`, wood side `#5e2e16`, rim `#d99060`, hole `#3a1a0c`, hole shade `#1f0d05`, carve `#5e2e16`, marble `#2f9e4a`, marble light `#8fe49a`, marble line `#0f3a1a`, count text `#fff4dc`, chip `#f7e6c4`.
- One font family: Baloo 2 via `next/font/google`. Fixed light theme, no dark mode.
- Pure modules (`utils/*.ts`, `components/board/geometry.ts`, `components/characters/pixel.ts`, `content/story.ts`) import nothing from React or Next, use `import type` for type-only imports, put `.ts` on relative imports, and avoid `enum` and `namespace` (Node type stripping runs the checks).
- `localStorage` reads and writes wrapped in try/catch; the game works with storage unavailable.
- `prefers-reduced-motion: reduce`: no blink, hop, pulse or flying marbles; default speed `instant`.
- History text uses only the facts checked in the spec. Nothing else.
- Every task ends with a commit of its own files once its checks pass (the owner asked for multiple commits, then push and merge): imperative subject of 72 characters or fewer, one or two lines, no AI attribution or trailers of any kind. Work stays on `feat/aditya/storybook-redesign`; Task 11 pushes, opens the PR and merges.
- Player A is "Player 1 / You": holes 0..6, store 7, near row (bottom on wide, right column on tall). Player B: holes 8..14, store 15. The computer always plays B.

## Review Focus

1. Rapid input while a move animates (clicking holes, New Game, Undo, changing opponent or rules): no overlapping playbacks, no stale frame written after a reset. Pinned in Task 5 (playback cancel check) and Task 5/7 click-throughs.
2. New Game or a switch to two players while the computer is "thinking": the computer must not move afterwards. Pinned in Task 7.
3. `localStorage` throwing or holding corrupt or out-of-range values: defaults load, nothing crashes. Pinned in Task 8 (`storage.check.ts`, `settings.check.ts`).
4. Very large counts (40+ in a hole, 98 in a store): marbles stay inside their hole, the number stays readable. Pinned in Task 3 (`geometry.check.ts`).
5. A 16-character player name at 360 px: no overflow, labels still fit. Pinned in Task 8.

---

### Task 1: Project setup and cleanup

**Files:**
- Modify: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

**Interfaces:**
- Produces: CSS custom properties `--ink --paper --wood-top --wood --wood-side --rim --hole --hole-shade --carve --marble --marble-light --marble-line --count --chip` and `--font-baloo`; `tsconfig` option `allowImportingTsExtensions: true`.

- [ ] **Step 1: Update dependencies**

Run: `npm install next@16 react@19 react-dom@19 && npm install -D eslint-config-next@16 @types/react@19 @types/react-dom@19`
Expected: `package.json` shows `next` `16.4.x` or newer 16.x.

- [ ] **Step 2: Audit production dependencies**

Run: `npm audit --omit=dev`
Expected: `found 0 vulnerabilities`. If not, run `npm audit fix` (never `--force`) and record what remains and why.

- [ ] **Step 3: Set the workspace root**

In `next.config.ts` add `turbopack: { root: path.resolve(__dirname) }` (import `path` from `node:path`; if `__dirname` is undefined in this config format, use `import.meta.dirname`).

- [ ] **Step 4: Allow `.ts` import extensions**

Add `"allowImportingTsExtensions": true` to `compilerOptions` in `tsconfig.json`.

- [ ] **Step 5: Font, metadata, tokens**

`app/layout.tsx`: replace Geist with `Baloo_2` (`subsets: ['latin']`, `weight: ['500','600','700','800']`, `variable: '--font-baloo'`), keep `lang="en"`, metadata `title: 'Congklak'`, `description: 'The Indonesian game of holes and marbles. Play a friend or the computer.'`.
`app/globals.css`: keep `@import "tailwindcss";`, add the tokens on `:root`, `body { background: var(--paper); color: var(--ink); font-family: var(--font-baloo), system-ui, sans-serif; }`, the global `:focus-visible` rule, and a `.sr-only` utility.

- [ ] **Step 6: Delete the starter leftovers** listed under Files.

- [ ] **Step 7: Verify**

Run: `npm run build` → succeeds. Run: `npm run lint` → 0 errors (the 3 old `<img>` warnings may remain until Task 4).
Restart the dev server (`npm run dev`) → its log has no "inferred your workspace root" warning.

---

### Task 2: Rules engine (Simple) and its check

**Files:**
- Rewrite: `utils/gameLogic.ts`
- Create: `utils/gameLogic.check.ts`
- Modify: `package.json` (script), `.github/workflows/ci.yml`

**Interfaces:**
- Produces (all exported from `utils/gameLogic.ts`):
  - `type Player = 'A' | 'B'`, `type Mode = 'simple' | 'traditional'`, `type Board = number[]` (16 slots)
  - `const STORE: Record<Player, number>` = `{ A: 7, B: 15 }`; `const HOLES: Record<Player, number[]>` = A `[0..6]`, B `[8..14]`; `const SEEDS_PER_HOLE = 7`; `const TOTAL = 98`
  - `interface GameState { board: Board; burnt: boolean[]; turn: Player; mode: Mode; round: number; phase: 'playing' | 'roundOver' | 'gameOver'; winner: Player | 'draw' | null }`
  - `type FrameEvent = 'pick' | 'drop' | 'capture' | 'end'`; `interface Frame { board: Board; active: number | null; hand: number; event: FrameEvent; capturedFrom?: number }`
  - `type Outcome = 'extraTurn' | 'capture' | 'turnEnds'`; `interface MoveResult { state: GameState; frames: Frame[]; outcome: Outcome; captured: number; lastIndex: number }`
  - `newGame(mode?: Mode): GameState`, `opponent(p: Player): Player`, `owner(slot: number): Player`, `sideTotal(board: Board, p: Player): number`, `legalMoves(s: GameState): number[]`, `applyMove(s: GameState, hole: number, opts?: { record?: boolean }): MoveResult`

Rules: sow one per slot with increasing index mod 16, skipping the opponent's store and (later) burnt holes. Last marble in own store: `extraTurn`, same player. Last marble in a slot that now holds more than 1: pick it all up and keep sowing (`pick` frame). Last marble in own empty hole with marbles across (`14 - i`): capture both into own store (`capture` frame, `capturedFrom = 14 - i`). Otherwise `turnEnds`. After the move, if either side is empty: move every remaining hole's marbles to its owner's store, `phase: 'gameOver'`, winner by store (equal: `'draw'`), and append an `end` frame with that board. `record: false` returns `frames: []` and the same state. Never mutate the input. `captured` counts both holes' marbles (the landing marble plus the opposite hole). Guard: if one move passes 5000 drops, end the turn there (`turnEnds`) with a `ponytail:` comment; no playout in the checks should reach it.

- [ ] **Step 1: Write the failing check** `utils/gameLogic.check.ts` with `node:test`, a seeded `mulberry32(seed)` RNG and `randomPlayout(seed)` helper. Tests:

```ts
test('new game', () => { const s = newGame(); assert.deepEqual(s.board, [7,7,7,7,7,7,7,0,7,7,7,7,7,7,7,0]); assert.equal(s.turn, 'A'); assert.equal(s.phase, 'playing'); });
test('legal moves', () => { assert.deepEqual(legalMoves(newGame()), [0,1,2,3,4,5,6]); /* turn B -> [8..14]; empty holes excluded */ });
test('illegal moves throw', () => { /* opponent hole 8, empty hole, store 7, index 16, phase gameOver: each assert.throws */ });
test('landing in own store gives another turn', () => {
  const r = applyMove(newGame(), 0);
  assert.deepEqual(r.state.board, [0,8,8,8,8,8,8,1,7,7,7,7,7,7,7,0]); assert.equal(r.outcome, 'extraTurn'); assert.equal(r.state.turn, 'A');
});
test('skips the opponent store, then captures', () => {
  const b = Array(16).fill(0); b[6] = 10; b[13] = 1;
  const r = applyMove({ ...newGame(), board: b }, 6);
  assert.equal(r.state.board[15], 0); assert.equal(r.outcome, 'capture'); assert.equal(r.captured, 3); assert.equal(r.state.board[7], 4); assert.equal(r.state.turn, 'B');
});
test('relay sowing continues from a non-empty slot', () => { const r = applyMove(newGame(), 3); assert.ok(r.frames.filter(f => f.event === 'pick').length >= 2); });
test('own empty hole with empty hole across: no capture', () => { /* b[2]=1, b[3]=0, b[11]=0, other B holes 1 -> last marble in 3: outcome 'turnEnds', captured 0, board[3] === 1 */ });
test('game end collects the rest', () => { /* craft: A move empties B side -> phase gameOver, holes all 0, stores sum 98, winner by store, last frame event 'end' */ });
test('98 marbles always', () => { /* 2000 seeded playouts: every state sums to 98; every frame: sum(board) + hand === 98 */ });
test('record:false matches record:true', () => { /* 200 seeded positions: deepEqual states, frames [] */ });
test('applyMove does not mutate its input', () => { /* deep copy before, deepEqual after */ });
```

- [ ] **Step 2: Run it to see it fail**

Run: `node utils/gameLogic.check.ts`
Expected: FAIL (missing exports).

- [ ] **Step 3: Implement the engine** in `utils/gameLogic.ts` to the interfaces and rules above.

- [ ] **Step 4: Run it to see it pass**

Run: `node utils/gameLogic.check.ts`
Expected: all tests pass, exit code 0.

- [ ] **Step 5: Wire the check into scripts and CI**

`package.json`: `"check": "node utils/gameLogic.check.ts"` (later tasks append `&& node <file>`). `ci.yml`: `node-version: "24"`, add `- run: npm run check` before Lint.
Run: `npm run check` → passes.

---

### Task 3: Board geometry

**Files:**
- Create: `components/board/geometry.ts`, `components/board/geometry.check.ts`
- Modify: `package.json` (append to `check`)

**Interfaces:**
- Consumes: `Player`, `owner` from `utils/gameLogic.ts`.
- Produces:
  - `type Orientation = 'wide' | 'tall'`; `type Point = { x: number; y: number }`
  - `const VIEW: Record<Orientation, { w: number; h: number }>` = wide `{1000, 340}`, tall `{340, 1000}`
  - `const HOLE_R = 37`, `STORE_RX = 46`, `STORE_RY = 86`, `MARBLE_STORE_R = 10.5`
  - `const BOARD_PATH` (the wide board outline from the sketch: `M 36 160 C 56 68 178 38 300 38 L 700 38 C 822 38 944 68 964 160 C 944 252 822 282 700 282 L 300 282 C 178 282 56 252 36 160 Z`)
  - `const TALL_TRANSFORM = 'matrix(0 -1 1 0 0 1000)'` (rotates wide art 90 degrees counter-clockwise; keeps sowing clockwise)
  - `toTall(p: Point): Point` = `(y, 1000 - x)`
  - `slotCenter(slot: number, o: Orientation): Point`: wide holes `x = round(220 + col * 93.3)`; B hole `i` at col `i - 8`, `y = 112`; A hole `i` at col `6 - i`, `y = 210`; store A `(120, 160)`, store B `(880, 160)`; tall = `toTall(wide)`
  - `countAnchor(slot: number, o: Orientation): Point` (text centre): wide B row `y = 59`, A row `y = 263`, same `x` as the hole; tall = `toTall(wide)` (text itself is always drawn upright)
  - `marbleLayout(n: number, r?: number): Array<{ dx: number; dy: number; r: number }>`: spec patterns (1..6 dice, 7 flower, 8..9 ring plus centre, 10..12 two rings, 13+ a packed cluster of exactly 14); `r` defaults to `HOLE_R`
  - `const STORE_MAX = 30`; `storePile(n: number): Array<{ dx: number; dy: number }>`: honeycomb from the bottom, spacing about 0.9 of a marble's diameter (a slight heap), at most `STORE_MAX` shown (the chip shows the real number)

- [ ] **Step 1: Write the failing check** `components/board/geometry.check.ts`:

```ts
test('wide slot centres', () => { assert.deepEqual(slotCenter(6,'wide'), {x:220,y:210}); assert.deepEqual(slotCenter(0,'wide'), {x:780,y:210}); assert.deepEqual(slotCenter(8,'wide'), {x:220,y:112}); assert.deepEqual(slotCenter(14,'wide'), {x:780,y:112}); assert.deepEqual(slotCenter(7,'wide'), {x:120,y:160}); assert.deepEqual(slotCenter(15,'wide'), {x:880,y:160}); });
test('tall: A on the right column, A store at the bottom', () => { for (const i of [0,1,2,3,4,5,6]) assert.equal(slotCenter(i,'tall').x, 210); for (const i of [8,9,10,11,12,13,14]) assert.equal(slotCenter(i,'tall').x, 112); assert.equal(slotCenter(7,'tall').y, 880); assert.equal(slotCenter(15,'tall').y, 120); });
test('sowing stays clockwise when tall', () => { /* signed area of the polygon through slots 0..15 in index order has the same sign in wide and tall */ });
test('marble counts', () => { assert.equal(marbleLayout(0).length, 0); for (let n = 1; n <= 12; n++) assert.equal(marbleLayout(n).length, n); for (const n of [13, 20, 60]) assert.equal(marbleLayout(n).length, 14); });
test('7 is a flower', () => { const m = marbleLayout(7); assert.ok(m.some(p => p.dx === 0 && p.dy === 0)); /* the other six share one distance from the centre (+-0.01) */ });
test('marbles stay inside the hole', () => { for (let n = 0; n <= 60; n++) for (const p of marbleLayout(n)) assert.ok(Math.hypot(p.dx, p.dy) + p.r <= HOLE_R - 2); });
test('store pile', () => { assert.equal(storePile(5).length, 5); assert.equal(storePile(98).length, STORE_MAX); for (const p of storePile(98)) assert.ok((p.dx / (STORE_RX - 8)) ** 2 + (p.dy / (STORE_RY - 8)) ** 2 <= 1); });
test('counts sit on the wood face', () => {
  /* for every hole slot (wide): a 26 x 22 box centred on countAnchor does not intersect any hole circle of radius HOLE_R + 3
     or any store ellipse (+3), lies between y 46 and 276 (clear of the 7-unit top band and the bottom edge), and x between 180 and 820 */
});
```

- [ ] **Step 2: Run it to see it fail** → `node components/board/geometry.check.ts` → FAIL.
- [ ] **Step 3: Implement** `components/board/geometry.ts` (port `layout()` and the store pile from `sketches/board-styles.html`, adjusting until the checks hold).
- [ ] **Step 4: Run it to see it pass** → all pass. Append it to the `check` script; `npm run check` passes.

---

### Task 4: Static board, page shell, instant play

**Files:**
- Create: `components/board/Board.tsx`, `components/board/HoleArt.tsx`, `components/CongklakGame.tsx`, `utils/text.ts`, `utils/text.check.ts`
- Modify: `app/page.tsx`, `app/globals.css`, `.github/workflows/ci.yml` (remove the unused `NEXT_PUBLIC_BASE_PATH` env), `package.json` (append check)
- Delete: `components/CongklakBoard.tsx`, `public/shell-icon.png`, `public/wood-pattern.jpg`

**Interfaces:**
- Consumes: Task 2 engine, Task 3 geometry.
- Produces:
  - `utils/text.ts`: `holeLabel(slot: number, count: number, o: { burnt: boolean; names: Record<Player, string>; vsComputer: boolean }): string` and `storeLabel(p: Player, count: number, o: { names: Record<Player, string>; vsComputer: boolean }): string`. Hole number = `slot - (A ? 0 : 8) + 1`. Owner word: vs computer "Your" / "Computer's", otherwise `${name}'s`. Count: "1 marble" / "N marbles"; burnt: "burnt".
  - `components/board/Board.tsx`: `export default function Board(p: BoardProps)` with
    `interface BoardProps { board: number[]; burnt: boolean[]; playable: number[]; active: number | null; flash: number[]; preview: number | null; names: Record<Player, string>; vsComputer: boolean; busy: boolean; onPick(slot: number): void; onPreview(slot: number | null): void; onSkip(): void; overlay?: (o: Orientation) => React.ReactNode }`

Board renders two containers, `.board-wide` and `.board-tall`; CSS shows `.board-tall` only under `@media (max-width: 700px) and (orientation: portrait)` and hides the other with `display: none`. Each container: the Storybook-ink SVG (body, side thickness, top band, vines, end curls, holes with rim highlight and shade crescent, marbles from `marbleLayout`, store piles, painted counts at `countAnchor`, store chips) drawn from `sketches/board-styles.html` option A, with decorations under `TALL_TRANSFORM` for tall; plus one absolutely positioned HTML `<button>` per hole (centre and diameter as % of `VIEW`), `disabled` unless in `playable`, `aria-label` from `holeLabel`; stores get `role="img"` and `storeLabel`. Clicking the board background while `busy` calls `onSkip`. Board width is capped (wide: `max-width: 960px`).
`CongklakGame.tsx` (this task): title "Congklak" (real text, Baloo 2 800, no letter spacing), one line "The Indonesian game of holes and marbles. Play a friend or the computer.", a status line, and the Board wired to `useState(newGame())` with `applyMove` applied instantly (no animation yet) and a plain "New game" button.

- [ ] **Step 1: Write the failing check** `utils/text.check.ts`:

```ts
test('hole labels', () => {
  const names = { A: 'You', B: 'Computer' };
  assert.equal(holeLabel(0, 7, { burnt: false, names, vsComputer: true }), 'Your hole 1, 7 marbles');
  assert.equal(holeLabel(14, 1, { burnt: false, names, vsComputer: true }), "Computer's hole 7, 1 marble");
  assert.equal(holeLabel(9, 0, { burnt: true, names: { A: 'Sari', B: 'Budi' }, vsComputer: false }), "Budi's hole 2, burnt");
  assert.equal(storeLabel('A', 12, { names, vsComputer: true }), 'Your store, 12 marbles');
});
test('no em dash in generated text', () => { /* every label for slots 0..15, counts 0..3 */ assert.ok(!/—/.test(all)); });
```

- [ ] **Step 2: Run it to see it fail**, then **Step 3: implement `utils/text.ts`**, then **Step 4: pass** and append to `check`.
- [ ] **Step 5: Build `Board.tsx`, `HoleArt.tsx`, `CongklakGame.tsx`, update `app/page.tsx`, delete the old component and images.**
- [ ] **Step 6: Verify in the browser** (dev server, Chrome tab on `localhost:3000`)
  - Widths 360, 390, 768, 1440, 3440: load the page in a same-origin `<iframe>` of that width (window resizing may not apply) and assert `document.documentElement.scrollWidth <= innerWidth`; screenshot each. Tall board appears at 360 and 390 portrait, wide at the others.
  - Every hole button measures at least 44 x 44 px (`getBoundingClientRect`) at 360 and 768.
  - Run the antislop contrast script (`python3 ~/.claude/skills/antislop-human/contrast-check.py FG BG`) for every text colour pair on the page; all pass for their size.
  - Clicking a playable hole plays the move instantly; the board total stays 98.
  - `npm run lint` → 0 problems; `npm run build` succeeds.

---

### Task 5: Playback, game flow, game over

**Files:**
- Create: `utils/playback.ts`, `utils/playback.check.ts`, `utils/settings.ts`, `hooks/useGame.ts`, `components/GameOverDialog.tsx`
- Modify: `utils/text.ts` (+check), `components/CongklakGame.tsx`, `package.json` (append check)

**Interfaces:**
- Consumes: engine, Board.
- Produces:
  - `utils/playback.ts`: `type Speed = 'normal' | 'fast' | 'instant'`; `const FRAME_MS: Record<Speed, number>` = `{ normal: 250, fast: 90, instant: 0 }`; `frameDelay(f: Frame, speed: Speed): number` (capture frames 3x); `interface PlaybackControl { cancelled(): boolean; skipping(): boolean }`; `playFrames(frames: Frame[], speed: Speed, ctl: PlaybackControl, onFrame: (f: Frame, i: number) => void, sleep?: (ms: number) => Promise<void>): Promise<'done' | 'cancelled'>`. Before each frame: cancelled → return `'cancelled'` without calling `onFrame`; skipping or `instant` → `onFrame(last frame)` once, return `'done'`.
  - `utils/settings.ts`: `type Level = 'easy' | 'medium' | 'hard'`; `type Opponent = 'human' | Level`; `interface Tally { A: number; B: number; draws: number }`; `interface Settings { opponent: Opponent; speed: Speed; mode: Mode; sound: boolean; preview: boolean; bestOf3: boolean; names: Record<Player, string> }`; `DEFAULT_SETTINGS` = `{ opponent: 'human', speed: 'normal', mode: 'simple', sound: true, preview: true, bestOf3: false, names: { A: 'Player 1', B: 'Player 2' } }` (Task 7 changes `opponent` to `'medium'`); `displayNames(s: Settings): Record<Player, string>` (vs computer: `{ A: 'You', B: 'Computer' }`).
  - `utils/text.ts` adds `turnStatus(s: GameState, names: Record<Player, string>, vsComputer: boolean): string` and `outcomeStatus(r: MoveResult, mover: Player, names: Record<Player, string>, vsComputer: boolean): string` (extra turn, capture with count, game over with score).
  - `hooks/useGame.ts`: `useGame(): Game`, `interface View { board: Board; active: number | null; hand: number; flash: number[]; event: FrameEvent | null }`, `interface Game { state: GameState; view: View; busy: boolean; status: string; settings: Settings; updateSettings(p: Partial<Settings>): void; play(slot: number): void; skip(): void; newGame(): void; undo(): void; canUndo: boolean; nextRound(): void; tally: Tally; match: { A: number; B: number } | null; previewOf(slot: number): { lastIndex: number; text: string } | null }`. In this task `undo`, `nextRound`, `previewOf`, `tally`, `match` are stubs that later tasks fill (`canUndo: false`, `previewOf` returns null, `tally` zeros, `match: null`). Each `newGame`/`undo` bumps a run id; playback checks it through `PlaybackControl.cancelled`. `play` is ignored while `busy` or when the slot is not legal. A capture frame sets `flash` to `[active, capturedFrom]`. Under reduced motion the initial speed is `instant`.
  - `components/GameOverDialog.tsx`: native `<dialog>` opened with `showModal()`, shows winner and score, "Play again" button (focused), closes on Escape.

- [ ] **Step 1: Write the failing check** `utils/playback.check.ts` with a fake `sleep` that records delays and resolves at once:

```ts
test('normal plays every frame in order', async () => { /* 5 frames: onFrame called 5 times with i 0..4; recorded delays equal frameDelay per frame */ });
test('instant shows only the last frame', async () => { /* onFrame called once, with frames[4] */ });
test('cancel stops before the next frame', async () => { /* cancelled() true after 3rd onFrame: result 'cancelled', onFrame called exactly 3 times */ });
test('skip jumps to the last frame', async () => { /* skipping() true after 2nd onFrame: 3 calls total, last is frames[4], result 'done' */ });
test('capture frames last three times as long', () => { assert.equal(frameDelay({ ...f, event: 'capture' }, 'normal'), 750); });
```

- [ ] **Step 2: Run it to see it fail**, **Step 3: implement `utils/playback.ts`**, **Step 4: pass**, append to `check`.
- [ ] **Step 5: Add `turnStatus`/`outcomeStatus` tests** to `utils/text.check.ts` (vs computer turn: contains "Your turn"; a capture of 9 by A: contains "9"; game over 52 to 46: contains "52" and "46"; no em dash), see them fail, implement, see them pass.
- [ ] **Step 6: Implement `settings.ts`, `useGame.ts`, `GameOverDialog.tsx`; wire `CongklakGame`** (status line in an `aria-live="polite"` element; New Game button; Board `active`/`flash`/`busy`/`onSkip`).
- [ ] **Step 7: Verify in the browser**
  - A move at Normal takes roughly `frames x 250 ms`; clicking the board mid-move jumps to the end.
  - Review Focus 1: start a move, click three other holes fast, then New Game mid-move; after 3 s the board is all 7s with empty stores and the status says it is Player 1's turn.
  - Play a full game at Fast to the end: game over dialog opens with focus on "Play again"; Escape closes it.
  - With reduced motion emulated (DevTools rendering panel, or `matchMedia` override), the first move resolves instantly.

---

### Task 6: Move effects and sound

**Files:**
- Create: `components/board/MoveEffects.tsx`, `utils/sound.ts`
- Modify: `components/board/Board.tsx`, `hooks/useGame.ts`, `app/globals.css`

**Interfaces:**
- Consumes: `View` from `useGame`, geometry.
- Produces: `MoveEffects({ view, orientation, names, vsComputer }: { view: View; orientation: Orientation; names: Record<Player, string>; vsComputer: boolean })` rendered through `BoardProps.overlay`; `utils/sound.ts`: `setSoundEnabled(on: boolean): void`, `playSound(kind: 'drop' | 'capture' | 'extra' | 'win'): void` (creates its `AudioContext` lazily on first call, no-op when disabled or when `AudioContext` is missing).

Effects: a hand bubble ("in hand: N", `hand > 0`) placed beside `view.active`; a single marble that hops from the previous active slot to the current one over the frame delay; on a capture, both flashing slots pulse twice, 5 small marbles fly to the store, and a small "TEMBAK!" cloud (same scalloped shape as the story cloud; put `cloudPath(w, h): string` in `components/cloudPath.ts` here so Task 9 reuses it) appears by the store for about 1 s. Sound per frame event: `drop` per drop frame (throttled to one per 40 ms at Fast), `capture` on capture, `extra` when the outcome is `extraTurn`, `win` at game over. `navigator.vibrate?.(40)` on capture. Reduced motion: no hop, pulse or flight; the TEMBAK cloud still shows (static).

- [ ] **Step 1: Implement `utils/sound.ts`** and call it from `useGame` on frame events and outcomes; `setSoundEnabled(settings.sound)` on change.
- [ ] **Step 2: Implement `MoveEffects.tsx`**, flash classes in `Board.tsx`, keyframes and reduced-motion overrides in `globals.css`.
- [ ] **Step 3: Verify in the browser**
  - Find a capture (play until one happens, or set a crafted state through a temporary dev-only hook, removed afterwards): both slots pulse, marbles fly to the store, TEMBAK appears, status names the count.
  - The hand bubble sits next to the active hole on wide and tall boards.
  - In the console, wrap `window.AudioContext` to count constructions: with sound off, a full move constructs none; with sound on, exactly one.
  - Reduced motion emulated: no hop or flight, the TEMBAK cloud still appears.

---

### Task 7: Computer opponent and undo

**Files:**
- Create: `utils/ai.ts`, `utils/ai.check.ts`
- Modify: `hooks/useGame.ts`, `utils/settings.ts`, `package.json` (append check)

**Interfaces:**
- Consumes: engine (`applyMove` with `record: false`, `legalMoves`), `Level` from `utils/settings.ts`.
- Produces: `chooseMove(s: GameState, level: Level, rng?: () => number): number`.
  - easy: uniform random legal move.
  - medium: maximise `(own store gain - opponent store gain) + (outcome === 'extraTurn' ? 3 : 0)` for this one move; ties broken by `rng`.
  - hard: minimax with alpha-beta, depth 5 moves (an extra turn keeps the same side maximising), evaluation `store[me] - store[them]`; `gameOver` scores `+-1000 + difference`; `roundOver` scores the difference.

`useGame`: when `state.turn === 'B'`, the opponent is a level, the phase is `playing` and nothing is animating, wait 500 ms, then `chooseMove` and play it, guarded by the run id so New Game, Undo or switching to two players cancels a pending move. Undo (vs computer only): a stack of states taken before each of the human's moves; `undo()` cancels playback and any pending computer move and restores the last snapshot; `canUndo` = vs computer, stack not empty, phase not `gameOver`. `DEFAULT_SETTINGS.opponent` becomes `'medium'`.

- [ ] **Step 1: Write the failing check** `utils/ai.check.ts`:

```ts
test('always legal', () => { /* 300 seeded random positions, both sides, every level: legalMoves(s).includes(chooseMove(s, level, rng)) */ });
test('medium takes the extra turn over nothing', () => {
  const b = Array(16).fill(0); b[6] = 1; b[0] = 1; b[10] = 3;
  assert.equal(chooseMove({ ...newGame(), board: b }, 'medium', () => 0), 6);
});
test('medium takes a big capture over an extra turn', () => {
  const b = Array(16).fill(0); b[6] = 1; b[2] = 1; b[11] = 9; b[9] = 1;
  assert.equal(chooseMove({ ...newGame(), board: b }, 'medium', () => 0), 2);
});
test('hard beats easy', () => { /* 20 seeded games, hard alternating sides: hard wins >= 16 */ });
test('hard is quick', () => { /* chooseMove(newGame(), 'hard') under 300 ms */ });
```

- [ ] **Step 2: Run it to see it fail**, **Step 3: implement `utils/ai.ts`**, **Step 4: pass**, append to `check`.
- [ ] **Step 5: Wire the computer turn and undo into `useGame`**, show an Undo button only vs computer.
- [ ] **Step 6: Verify in the browser**
  - A full game against each level ends with the game over dialog.
  - Review Focus 2: make a move, and while "Computer is thinking" press New Game; wait 2 s: the board is fresh and the computer did not move. Repeat by switching to two players mid-think (after Task 8 adds the control; until then, by calling `updateSettings` from a temporary dev button, removed afterwards).
  - Undo after the computer's reply restores the board from before your move; Undo mid-animation leaves no stray frames.

---

### Task 8: Controls, persistence, preview, tally, names

**Files:**
- Create: `utils/storage.ts`, `utils/storage.check.ts`, `utils/settings.check.ts`, `components/ControlBar.tsx`
- Modify: `utils/settings.ts`, `utils/text.ts` (+check), `hooks/useGame.ts`, `components/board/Board.tsx`, `components/CongklakGame.tsx`, `package.json` (append checks)

**Interfaces:**
- Produces:
  - `utils/storage.ts`: `load<T>(key: string, fallback: T, store?: Pick<Storage, 'getItem'>): T` (returns `fallback` on any throw or invalid JSON); `save(key: string, value: unknown, store?: Pick<Storage, 'setItem'>): void` (swallows errors). Keys `'congklak.settings'`, `'congklak.tally'`.
  - `utils/settings.ts` adds `sanitizeSettings(raw: unknown): Settings` (unknown or wrong-typed fields fall back to `DEFAULT_SETTINGS`; names trimmed and cut to 16 characters, empty becomes the default) and `sanitizeTally(raw: unknown): Tally` (non-negative integers, else zeros).
  - `utils/text.ts` adds `previewText(r: MoveResult, mover: Player, names: Record<Player, string>, vsComputer: boolean): string` (store: "Lands in your store: go again"; capture: "Captures N from across"; relay: names where it finally stops; other side: "Ends on the other side").
  - `ControlBar({ game }: { game: Game })`: always visible: New game, Undo (vs computer only), Sound toggle (`aria-pressed`); a native `<details>` "Settings" holding Opponent (Two players / Computer: Easy / Medium / Hard), Speed (Normal / Fast / Instant), Rules (Simple only until Task 10), Move preview (checkbox), Best of 3 (checkbox), and two name inputs (`maxLength={16}`, two-player mode only). Changing opponent or rules starts a new game and says so in the status.

`useGame`: settings load from storage through `sanitizeSettings` after mount and save on change; tally loads, increments at game over, saves; best of 3 keeps `match` and announces the match winner at 2. `previewOf(slot)` uses `applyMove(..., { record: false })` and `previewText`; Board shows a dashed ring on `preview` and the hint text under the status line (not in the live region) on hover or focus of a playable hole when preview is on and nothing is animating.

- [ ] **Step 1: Write the failing checks**

```ts
// utils/storage.check.ts
test('throwing storage gives the fallback', () => { assert.deepEqual(load('k', { a: 1 }, { getItem() { throw new Error('denied'); } }), { a: 1 }); });
test('corrupt JSON gives the fallback', () => { assert.equal(load('k', 5, { getItem: () => '{oops' }), 5); });
test('save swallows errors', () => { save('k', 1, { setItem() { throw new Error('full'); } }); });
// utils/settings.check.ts
test('bad values fall back', () => { const s = sanitizeSettings({ speed: 'warp', opponent: 'god', sound: 'yes', names: { A: '', B: 'x'.repeat(50) } }); assert.equal(s.speed, 'normal'); assert.equal(s.opponent, 'medium'); assert.equal(s.sound, true); assert.equal(s.names.A, 'Player 1'); assert.equal(s.names.B.length, 16); });
test('non-objects give defaults', () => { assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS); assert.deepEqual(sanitizeSettings('x'), DEFAULT_SETTINGS); });
// utils/text.check.ts (add)
test('preview text', () => { assert.equal(previewText(applyMove(newGame(), 0, { record: false }), 'A', { A: 'You', B: 'Computer' }, true), 'Lands in your store: go again'); });
```

- [ ] **Step 2: Run them to see them fail**, **Step 3: implement**, **Step 4: pass**, append to `check`.
- [ ] **Step 5: Build `ControlBar`, wire persistence, preview, tally, best of 3, names.**
- [ ] **Step 6: Verify in the browser**
  - Every control does what its label says (record each one: control -> observed effect).
  - Reload keeps settings and tally. In the console, make `localStorage.getItem` throw and reload: the game loads with defaults, no console error from the app.
  - Review Focus 5: two players, name "Abcdefghijklmnop" (16 characters) at 360 px: no horizontal scroll, labels fit.
  - Preview ring and hint appear on hover and on keyboard focus, not during animation, not when preview is off.

---

### Task 9: Characters and the story cloud

**Files:**
- Create: `components/characters/pixel.ts`, `components/characters/pixel.check.ts`, `components/characters/PixelPerson.tsx`, `components/characters/StoryCloud.tsx`, `content/story.ts`
- Modify: `components/CongklakGame.tsx`, `app/globals.css`, `package.json` (append check)

**Interfaces:**
- Produces:
  - `pixel.ts`: `interface Sprite { w: number; h: number; pixels: (string | null)[][]; eyes: Array<{ x: number; y: number }> }`; `PALETTE: Record<string, string>`; `man(): Sprite`, `woman(): Sprite` (ported from `mas()` and `mbak()` in `sketches/characters.html`, including the smile and blush from `headBase`; auto-outline in ink); `pupilOffset(dx: number, dy: number): { col: 0 | 1 | 2; row: 0 | 1 }` (`|dx| < 28` → col 1, `dx < 0` → 0, else 2; `dy < 0` → row 0, else 1).
  - `content/story.ts`: `interface Panel { text: string }`; `RULES: Panel[]` (4 to 5 panels, Simple rules exactly as implemented); `TRADITIONAL_RULES: Panel[]` (empty until Task 10); `HISTORY: Panel[]` (only the spec's checked facts; the popular "Arab traders" account, if used, says "a popular account says"); `SOURCES: Array<{ label: string; url: string }>` = Museum Sonobudoyo `https://sonobudoyo.jogjaprov.go.id/en/tulisan/read/congklak-dan-dakon-jejak-permainan-kuno-yang-tetap-hidup-hingga-kini`, Wikipedia `https://en.wikipedia.org/wiki/Southeast_Asian_mancala`, and RRI `https://rri.co.id/en/art-and-culture/1777942/faq.html` only if the popular account is used. Each panel at most 45 words.
  - `PixelPerson({ sprite, label, onOpen, scale }: { sprite: Sprite; label: string; onOpen(el: HTMLButtonElement): void; scale: number })`: a `<button>` with the sprite as crisp-edged SVG, eyes driven by one shared `pointermove` listener (rAF-throttled), blink every 2.5 to 6.5 s unless reduced motion.
  - `StoryCloud({ anchor, mode, onClose }: { anchor: HTMLElement; mode: Mode; onClose(): void })`: native `<dialog>` with `showModal()` and a transparent backdrop, the scalloped cloud (`cloudPath` from the sketch) with a tail to the anchor's head, views: menu ("1. Congklak rules", "2. History and origin") → panels with Back / Next and "2 of 5"; the last history panel lists `SOURCES` as links. Escape or a backdrop click closes; focus returns to the anchor; a window resize closes it. On the tall layout it opens as a full-width panel above the characters.

Placement: wide: the man left of the board, the woman right, feet on one ground line, sprite scale 5; tall: both in a row under the board, scale 3. Labels: "Ask the man in the blangkon about congklak", "Ask the woman in the kebaya about congklak". They are decoration: they never cover the board or controls.

- [ ] **Step 1: Write the failing check** `components/characters/pixel.check.ts`:

```ts
test('sprite sizes and palette', () => { for (const s of [man(), woman()]) { assert.equal(s.w, 22); assert.equal(s.h, 40); for (const row of s.pixels) for (const k of row) if (k) assert.ok(k in PALETTE); } });
test('eyes fit inside the sprite', () => { for (const s of [man(), woman()]) for (const e of s.eyes) assert.ok(e.x >= 0 && e.x + 3 <= s.w && e.y >= 0 && e.y + 2 <= s.h); });
test('pupil offsets', () => { assert.deepEqual(pupilOffset(0, 5), { col: 1, row: 1 }); assert.deepEqual(pupilOffset(-100, -5), { col: 0, row: 0 }); assert.deepEqual(pupilOffset(100, 5), { col: 2, row: 1 }); });
test('story text', () => { /* no em dash in RULES, HISTORY; every panel <= 45 words; SOURCES non-empty https URLs */ });
```

- [ ] **Step 2: Run it to see it fail**, **Step 3: implement `pixel.ts` and `content/story.ts`**, **Step 4: pass**, append to `check`.
- [ ] **Step 5: Build `PixelPerson`, `StoryCloud`, place them in `CongklakGame`.**
- [ ] **Step 6: Verify in the browser**
  - Pupils move with real pointer events (dispatch `pointermove` at the top-left and bottom-right corners; read the pupil `x`/`y` attributes change).
  - Click, and Tab + Enter, open the cloud; every rules and history panel reachable with Next/Back; source links open the right URLs; Escape closes and focus returns to the character.
  - At 390 px the cloud fits on screen; resizing with the cloud open closes it.
  - The rules panels match the engine (read them against Task 2's rules).

---

### Task 10: Traditional rules

**Files:**
- Modify: `utils/gameLogic.ts`, `utils/gameLogic.check.ts`, `hooks/useGame.ts`, `components/board/Board.tsx`, `components/board/HoleArt.tsx`, `components/ControlBar.tsx`, `content/story.ts`, `utils/text.ts` (+check)
- Create: `components/RoundDialog.tsx`

**Interfaces:**
- Produces: `startNextRound(s: GameState): GameState` (requires `phase: 'roundOver'`); `utils/text.ts` adds `roundSummary(prev: GameState, next: GameState, names: Record<Player, string>, vsComputer: boolean): string`.

Rules (spec, "My calls"): in `traditional` mode a move that empties either side's unburnt holes collects the rest to the owners' stores and sets `phase: 'roundOver'` (not `gameOver`). `startNextRound`: each player refills holes starting from the one nearest their own store (A: 6, 5, ..., 0; B: 14, 13, ..., 8) with 7 each while the store holds at least 7; unfilled holes become `burnt`; leftovers stay in the store; `round + 1`; `turn` = the player with fewer marbles in store (tie: `'A'`); a player who fills no hole ends the game (`phase: 'gameOver'`, the other wins). Sowing skips burnt holes for both players; burnt holes are never legal moves and never capture targets. The Simple rules details (clockwise, no capture opposite an empty hole, no first-lap rule) are unchanged.

- [ ] **Step 1: Add failing tests** to `utils/gameLogic.check.ts`:

```ts
test('traditional round end', () => { /* traditional state where A's move empties B's side: phase 'roundOver', holes all 0, sum 98 */ });
test('refill and burn', () => {
  const s = { ...newGame('traditional'), board: [0,0,0,0,0,0,0,60, 0,0,0,0,0,0,0,38], phase: 'roundOver' as const };
  const n = startNextRound(s);
  assert.deepEqual(n.board, [7,7,7,7,7,7,7,11, 0,0,7,7,7,7,7,3]); assert.deepEqual(n.burnt.slice(8, 15), [true,true,false,false,false,false,false]); assert.equal(n.turn, 'B'); assert.equal(n.round, 2); assert.equal(n.phase, 'playing');
});
test('cannot fill a hole: game over', () => { /* stores A 93, B 5 -> phase 'gameOver', winner 'A' */ });
test('burnt holes are skipped and never legal', () => { /* burnt 8 and 9; A sows past them: they stay 0; legalMoves for B excludes them */ });
test('98 marbles across rounds', () => { /* 300 seeded traditional games with startNextRound at each roundOver: every state sums to 98 */ });
```

- [ ] **Step 2: See them fail**, **Step 3: implement**, **Step 4: see all of `npm run check` pass** (AI checks included: `chooseMove` must stay legal with burnt holes).
- [ ] **Step 5: UI**: burnt holes drawn as a dark sealed hole with a cracked mark (no count, label "burnt"); `RoundDialog` (native `<dialog>`) shows `roundSummary` and "Start round N"; enable "Traditional" in the Rules select; add `TRADITIONAL_RULES` panels (refill, burnt holes, who starts, how it ends) shown in the cloud when the mode is traditional; `roundSummary` test (no em dash, names the round number).
- [ ] **Step 6: Verify in the browser**: play Traditional at Instant vs Easy through at least one round change: the dialog shows, burnt holes render and are skipped, the computer still moves legally, the cloud shows the Traditional panels.

---

### Task 11: README and final verification

**Files:**
- Rewrite: `README.md`

- [ ] **Step 1: README**: what the game is, the live link, how to play in 5 lines (matching `RULES`), Simple vs Traditional in two lines, `npm install`, `npm run dev`, `npm run check`, `npm run build`, and where the design document lives.
- [ ] **Step 2: Gates**: `npm run check`, `npm run lint`, `npm run build` all pass; paste their output.
- [ ] **Step 3: Serve the production build under its base path**

Run (scratchpad dir as `$S`): `mkdir -p $S/site && ln -sfn "$PWD/out" $S/site/congklak-project-game && python3 -m http.server 4173 -d $S/site`
Open `http://localhost:4173/congklak-project-game/`; no 404s in the network panel.
- [ ] **Step 4: Full click-through on that build** (record each item: action -> result): every control, both characters' clouds and every panel and source link, a full game against each level, a capture, an extra turn, New Game mid-move, Undo, mute, speed change, best of 3, Traditional through one round change; console free of app errors.
- [ ] **Step 5: Widths and keyboard**: 360, 390, 768, 1440, 3440 via iframe: no horizontal scroll, nothing clipped, controls at least 44 px; a keyboard-only game and both clouds.
- [ ] **Step 6: Contrast**: run the contrast script for every text colour pair; paste results.
- [ ] **Step 7: antislop Delivery Gate** report, every line with evidence.
- [ ] **Step 8: Commit the README**, then `git log --oneline main..HEAD` shows one commit per task.
- [ ] **Step 9: Push and open the PR**: `git push -u origin feat/aditya/storybook-redesign`, then `gh pr create --base main` with a body listing what changed and the evidence (no AI attribution line). Wait for the PR's CI run: `gh pr checks --watch` → all pass.
- [ ] **Step 10: Merge** with a merge commit so the per-task commits stay in history: `gh pr merge --merge --delete-branch=false`. Watch the deploy run on `main` (`gh run watch`) → success.
- [ ] **Step 11: Smoke test the live site** (`https://adityawks28.github.io/congklak-project-game/`): it loads the new board, no 404s, one game move, one cloud opens. Report to the owner with every gate's evidence.
