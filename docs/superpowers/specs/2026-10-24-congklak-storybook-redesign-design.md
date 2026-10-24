# Congklak: Storybook redesign and fixes

Date: 2026-10-24. Owner: Aditya. Status: approved by the owner 2026-10-24.

## Intent

The live game (https://adityawks28.github.io/congklak-project-game/) works on a
desktop for two people at one screen, but it is slow, breaks on phones, and the
art (a dark AI-looking carved wood photo with one shell icon per hole) is not
the owner's taste. This redesign makes it a game people actually want to play
for a few rounds: fast, readable, playable alone against the computer, playable
on a phone, and with a hand-drawn look of its own.

Success looks like: a friend opens the link on their phone, understands the
rules from the characters, plays the computer, and the marbles are easy to see
and count at every step.

## Evidence behind the fixes (measured 2026-10-24)

- One move on the live site took 21.0 s. A simulation of 3,000 random games
  with the current rules: about 17 animation frames per move on average, the
  worst single move 361 frames (about 6 minutes at 1 s per frame), about 35
  moves per game. No move looped forever (cap 100,000 drops, 0 hits in
  105,024 moves).
- At a 386 px viewport the board is 794 px wide; both stores sit off screen
  and the left one cannot be scrolled to.
- Pressing New Game during a move lets the old animation keep writing onto
  the fresh board.
- Seed count badge contrast 2.64:1, player labels about 1.9:1, subtitle
  3.65:1, footer 1.46:1.

## Goals

All 31 audit items, plus the new art direction. Grouped:

**A. Broken things**
1. Animation speed: Normal about 250 ms per marble, Fast about 90 ms,
   Instant (no animation). Tapping or clicking the board skips to the end of
   the current move. *(builder's call on exact timings)*
2. Phones: no horizontal overflow at 360 px and up; everything reachable.
   See Layout.
3. New Game (and any reset) cancels a running move cleanly. No stale
   animation may write state after a reset.
4. Every text and number meets WCAG AA (4.5:1 normal, 3:1 large), checked
   with the antislop contrast script, not by eye.
5. Captures are visible (see Capture moment), and the marbles-in-hand
   indicator sits next to the hole being sown, not pinned to the page top.
6. Screen readers: each hole is a button named like "Your hole 3, 7 marbles"
   or "Computer's hole 5, 0 marbles"; turn and event messages go through a
   polite live region; the title is real text, not spaced letters; the
   character cloud and the game over screen are dialogs that take focus,
   close on Escape, and return focus.
7. Language: English only. All UI text in English.
8. How to play: lives in the characters' clouds (see Characters).
9. `prefers-reduced-motion`: no blinking, no hopping marble, no pulses;
   moves resolve with a short fade or instantly.
10. Rules variants: see Rules.

**B. Fun**
11. Speed setting + skip (same as 1).
12. Play the computer: Easy, Medium, Hard. Or two players on one device.
13. Real marbles drawn in every hole (see Board).
14. Sound: a short "tok" per marble drop, a heavier clack on capture, a
    rising chime on an extra turn. Synthesized with the Web Audio API, no
    audio files. Mute toggle, remembered in `localStorage`.
15. Moving hand: a small bubble with the number of marbles in hand travels
    with the hole being sown.
16. Capture moment: the landing hole and the hole across both flash, the
    captured marbles fly to the store, and a short "TEMBAK!" cloud appears.
17. Move preview: hovering or focusing one of your holes marks the hole
    where the last marble would land and says what would happen ("lands in
    your store: go again"). On by default, can be turned off. *(my call)*
18. Score tally across games (wins per side) and an optional best-of-3,
    saved in `localStorage`.
19. Traditional rules option (see Rules).
20. Undo the last move, only when playing the computer (undoes your move and
    the computer's reply).
21. Short vibration on capture where `navigator.vibrate` exists; editable
    player names (defaults "Player 1" / "Player 2", or "You" / "Computer").

**C. Look**
22. No spaced-letter title, no wide-tracked uppercase labels.
23. One font family chosen on purpose (see Type); remove the unused Geist
    fonts.
24. Remove filler copy ("Nusantara Heritage Edition", "Digital Folklore
    2026"). Replace with one true line about the game.
25. No blur effects on the board.
26. The wood photo goes away entirely (replaced by the drawn board).

**D. Code**
27. A runnable rules check (plain Node, asserts): marbles always total 98,
    the opponent's store is skipped, landing in your store gives another
    turn, relay sowing continues on a non-empty hole, capture takes both
    holes, game end collects the rest, plus the Traditional-mode round
    logic. Runs in CI before the build.
28. Drop `public/shell-icon.png` (294 KB) and `public/wood-pattern.jpg`
    (560 KB, actually WebP) once nothing uses them.
29. Delete the create-next-app leftovers: `public/file.svg`, `globe.svg`,
    `next.svg`, `vercel.svg`, `window.svg`; replace the boilerplate README
    with a real one (what it is, how to play, how to run, live link).
30. Update Next.js to the latest 16.x and React to match; resolve what
    `npm audit` reports for production dependencies.
31. Set `turbopack.root` in `next.config.ts` so the stray
    `~/package-lock.json` in the owner's home folder no longer confuses the
    workspace root. Do not delete that file.

## Non-goals

- Online multiplayer, accounts, any backend.
- Indonesian translation or a language switch.
- A dark theme (see Theme).

## Anti-goals (would make this a failure even if it runs)

- Any history fact without a source, or invented quotes, dates, or names.
- Counts that are hard to read or marbles that blend into the holes.
- A move that makes the player wait with no way to skip.
- Anything cut off or sideways-scrolling on a phone.
- The generic AI look: glow everywhere, gradients, glass blur, emoji as
  decoration, spaced uppercase labels.

## Constraints

- Next.js 16 static export (`output: 'export'`) deployed to GitHub Pages
  under `/congklak-project-game` by the existing workflow. No server code.
- No new runtime dependencies unless something cannot be done in a few lines.
  Art is SVG drawn in code; sound is Web Audio.
- UI text: no em dash characters (antislop R-02). Tap targets at least 44 px.
  Everything usable by keyboard with a visible focus ring.
- The owner's laptop had a full disk earlier today (about 4 GB free now);
  avoid large caches or downloads.
- Commits only when the owner asks; no AI attribution in commits.

## What the owner decided

**Board: "Storybook ink"** (picked from three mockups). Follows the owner's
reference photo of a long carved wooden congklak:

- Long board with tapered, rounded ends; 2 rows of 7 round holes; a tall
  oval store at each end.
- Drawn like a picture book: bold dark outlines (ink `#2a130a`, about 3.5
  units at a 1000-wide viewBox), flat warm wood (top `#c47a48`, face
  `#9a5530`, side thickness `#5e2e16`), a lighter rim catching light under
  each hole (`#d99060`), dark holes (`#3a1a0c`) with a darker inner shadow
  crescent at the top (`#1f0d05`), carved vine-and-leaf lines along both
  long edges and small curls at the ends (`#5e2e16`).
- Marbles are green glass: body `#2f9e4a`, light lobe `#8fe49a`, white
  highlight, dark outline `#0f3a1a`.
- Each hole's count is painted on the wood next to it in light text with a
  dark outline (above the hole for the far row, below for the near row).
  Store counts sit in a cream chip (`#f7e6c4`, dark text).
- Contrast, measured with the antislop script: `#fff4dc` on the wood face
  `#9a5530` is 5.17:1 (passes for small text even without the outline);
  on the light top band `#c47a48` it is 3.09:1 and on the rim highlight
  `#d99060` 2.37:1. So counts must sit fully on the wood face and never
  overlap the top band or a rim highlight, at any screen size. The dark
  outline stays as extra insurance. Store chips: `#2a130a` on `#f7e6c4` is
  14.27:1.
- Marble arrangement keeps small counts countable at a glance: 1 to 6 as
  dice patterns, 7 as a flower (one centre, six around), 8 to 9 as a ring
  plus centre, 10 to 12 as two rings, 13 and up as a packed cluster with the
  number doing the work. Stores show a pile filling from the bottom.
- Reference sketches: `sketches/board-styles.html` (option A is the chosen
  one) and `sketches/characters.html` (scene A, both standing, is the chosen
  one) next to this document. They are HTML fragments made for a preview
  tool, so open them for the drawing code, not as finished pages. The
  builder rebuilds them as React components; the sketches are not shipped.

**Characters: two pixel-art neighbours**, standing beside the board as
decoration (the owner removed a third character and chose no wheelchair):

- A man in a blangkon (batik head cloth with a folded band and tucked
  ends), a striped lurik shirt and a batik jarik (wrap cloth).
- A woman in a maroon kebaya with a gold centre panel and brooches, hair in
  a sanggul (bun) with a pin, and a batik jarik.
- Both smile slightly, with a touch of blush on the cheeks.
- Retro pixel style: drawn on a small grid (about 22 x 40) and scaled up
  with crisp edges; outlines in the same ink colour as the board so they
  belong to the same world.
- Their eyes follow the pointer (3 x 2 eye, 1 px pupil, six positions) and
  they blink every few seconds (not under reduced motion).
- Clicking or tapping one (or Tab + Enter) opens a manga-style cloud with a
  scalloped edge and a tail pointing at the character, offering:
  1. **Congklak rules**: shown as 4 to 5 short panels with Next / Back, not
     one long block.
  2. **History and origin**: short panels written from at least two
     reliable sources, each fact traceable; the last panel lists the sources
     as links. Facts already checked (2026-10-24), to be used and nothing
     beyond them without a new source:
     - It belongs to the mancala family of "sowing" games (Museum
       Sonobudoyo, Yogyakarta; Wikipedia "Southeast Asian mancala").
     - Names: dakon or dhakon in Java, dentuman lamban in Lampung, makaotan,
       maggaleceng, aggalacang or nogarata in Sulawesi (Sonobudoyo);
       congkak in Malaysia, sungka in the Philippines (Wikipedia).
     - Boards are carved wood, long and boat-shaped; the small holes are
       called sawah (fields), the big end holes lumbung or gunung
       (granaries) (Sonobudoyo, Wikipedia).
     - Pieces were cowrie shells, pebbles or tamarind seeds; a 7-hole board
       uses 98 (Wikipedia, Sonobudoyo).
     - In Javanese tradition dakon was especially popular among girls,
       including princesses at the royal courts (Sonobudoyo).
     - How mancala reached Southeast Asia is unknown; one idea is Austronesian
       trade routes with South Asia, and Indonesia has the most variants in the
       region (Wikipedia). A popular account credits Arab traders (RRI); if
       used, it is labelled as a popular account.
     - Not used: the claim that Raffles first described dakon in 1817 (only
       a fan wiki says so; not checked against his text), and any "oldest
       board" claim (the scholarship disagrees).

**Language:** English.

## My calls (the owner can overturn any of these)

- **Rules default:** "Simple" (today's rules): the game ends as soon as
  either side is empty and each player banks what is left on their side.
- **Traditional rules option:** several rounds. Checked 2026-10-24 against
  Wikipedia "Southeast Asian mancala" (read in full); the "7 per hole, from
  the left" refill detail comes from search summaries of Singapore's NLB
  Infopedia and a rulespal congkak rulebook, which the builder should open
  and confirm:
  a round ends when a player has no marbles left in their holes, and the
  marbles still on the board go to the other player's store. At the start of
  the next round each player refills their holes left to right with 7 from
  their store; holes they cannot fill are burnt and skipped by both players
  for that round, and leftover marbles stay in the store. The player who lost
  the round starts the next one. The game ends when a player cannot fill a
  single hole; the other player wins. Sources describe a marble dropped into
  a burnt hole "by accident" going to the opponent; a digital game has no
  accidents, so burnt holes are simply skipped. *(my call)* The in-game rules
  panels must match what is implemented.
- **Unchanged rules details, in both modes:** sowing goes clockwise (the
  current behaviour); landing in your own empty hole with an empty hole
  across ends the turn without a capture; there is no "first lap" capture
  restriction; no simultaneous first move. Traditional mode adds only rounds
  and burnt holes on top of these. If a source disagrees with this
  document, this document wins, and the rules panels describe exactly what
  is implemented.
- **Build order:** everything on Simple rules first; Traditional mode last,
  so the rest never waits on it.
- **Deployed check:** before merge, a local production build served under
  `/congklak-project-game` gets the full click-through. The live site is
  checked after the owner merges (the workflow deploys on push to `main`;
  there is no preview site, and none will be set up).
- **Computer opponent:** Easy picks a random legal move; Medium picks the
  move that banks the most this turn (an extra turn counts as a bonus);
  Hard searches a few moves ahead (minimax with alpha-beta on store
  difference, extra turns handled). The computer waits about half a second
  before moving so it reads as "thinking".
- **Theme:** one fixed light theme, cream paper background (`#f1e4cc`).
  Reason: the art is a picture book, and the page is its paper. No toggle.
- **Type:** one family, Baloo 2 via `next/font/google` (self-hosted at build,
  so it works on Pages). Reason: its round, heavy shapes match the ink
  outlines, and its numerals are wide and easy to count.
- **Layout, wide screens:** title and a compact control bar on top
  (opponent, speed, rules, sound, New Game), status line above the board,
  board in the middle, the man on the left and the woman on the right,
  standing on the same ground line. Width capped so it does not sprawl on
  the owner's 3440 px monitor.
- **Layout, phones (portrait, narrow):** the board stands upright like the
  reference photo (stores at top and bottom, two columns of 7 holes), still
  sown clockwise; the two characters stand in a row under the board; the
  cloud opens as a panel above them that fits the screen.
- **Who is who:** Player 1 / You own the near row (bottom on wide screens,
  right column on phones) and the store on their left, as today.
- **Dials (antislop):** energy 2, rhythm 1 (a single game screen), motion 2.

## Left to the builder

- Component and file structure, state management, animation technique.
- Exact timings, sound shapes, and copy wording within the rules above.
- How the rules check is wired into CI (a Node version that runs it).

## How we know it is done

- The rules check passes, `npm run lint` is clean, `npm run build` succeeds.
- A recorded click-through in a browser on the local production build
  (and a short smoke test on the live site after the owner merges): every
  control, every character cloud panel, a full game against each
  computer level, a capture, an extra turn, New Game mid-move, undo, mute,
  speed change, Traditional mode through one round change.
- At 360 px, 390 px, 768 px, 1440 px and 3440 px widths: no horizontal
  scroll, nothing clipped, tap targets at least 44 px.
- Keyboard-only run of a full game and both clouds.
- Contrast script output for every text colour pair.
- The antislop Delivery Gate report with evidence for each line.
- The owner signs off before anything is merged or deployed.
