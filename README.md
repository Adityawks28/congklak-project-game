# Congklak

The Indonesian game of holes and marbles, in the browser. Play a friend on
one device, or the computer at Easy, Medium or Hard.

Play it: https://adityawks28.github.io/congklak-project-game/

## How to play

1. Each side has 7 small holes and one big store. Every small hole starts with 7 marbles, 98 in all.
2. On your turn, scoop up all the marbles in one of your holes and drop them one at a time into the next holes, going clockwise: into your own store, never your rival's.
3. Last marble in your store: go again. Last marble in a hole that has marbles: scoop them up and keep sowing.
4. Last marble in an empty hole on your side: capture it and everything in the hole across. If that hole is empty, your turn ends.
5. The game ends when either side is empty. Each player adds what is left on their side to their store, and the bigger store wins.

## Rules options

- **Simple** (the default): one game, played as above.
- **Traditional**: several rounds. After each round, players refill their holes with 7 marbles each from their stores; holes they cannot fill are burnt (skipped by both players) for that round. The game ends when someone cannot fill a single hole.

The two pixel characters beside the board explain the rules and the game's
history, with links to the sources, in a speech cloud.

## Run it locally

Needs Node.js 24, the version CI uses.

```bash
npm install
npm run dev     # http://localhost:3000
npm run check   # rules, layout, computer opponent and text checks (node:test)
npm run lint
npm run build   # the static site in out/, as deployed
```

Every push to `main` runs the checks, lint and build, then publishes `out/`
to GitHub Pages (`.github/workflows/ci.yml`).

## Where things live

- `utils/gameLogic.ts`: the rules, as pure functions (`utils/gameLogic.check.ts` checks them).
- `utils/ai.ts`: the computer opponent.
- `hooks/useGame.ts`: game state, move playback, settings and the saved tally.
- `components/board/`: the drawn board and the move effects.
- `components/characters/` and `content/story.ts`: the two characters and what they say.
- Design document: `docs/superpowers/specs/2026-10-24-congklak-storybook-redesign-design.md`
- Implementation plan: `docs/superpowers/plans/2026-10-24-congklak-storybook-redesign.md`
