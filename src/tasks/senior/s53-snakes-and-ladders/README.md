# Snakes & Ladders

## Problem statement
Build a Snakes & Ladders game for 2–4 players on a 10×10 board.

The squares are numbered 1 to 100 in a **boustrophedon** ("as the ox ploughs") pattern:
- The bottom row runs 1 → 10 from left to right.
- The next row up runs 11 → 20 from right to left.
- The rows keep alternating, so 100 is in the top-left corner.

Players start off the board, on square 0. On their turn a player presses **Roll dice** and moves forward by the roll:
- If they land on the bottom of a ladder, they climb to its top.
- If they land on a snake's head, they slide down to its tail.

The first player to land **exactly** on 100 wins.

The board's snakes and ladders are passed in as maps, and the dice use an injected `random` function so games are reproducible. Keep the rules in a pure `applyMove(state, roll)` function, with the component as a thin layer on top.

## Clarifying questions to ask
- What if a roll would take a player past 100? *(They don't move. The turn still passes, unless they rolled a 6.)*
- What does a 6 do? *(The same player rolls again, whether or not they could move. There is no "three 6s" penalty.)*
- Do jumps chain? What if a ladder's top is a snake's head? *(No chaining. Apply at most one jump per move.)*
- Where do players start? *(On square 0, off the board. A roll of 4 lands on square 4.)*
- Can two players share a square? *(Yes. There is no capturing.)*
- Can a ladder lead straight to 100? *(Yes, and that's a win.)*
- Do we need to validate the board config? *(Not in the base version. It's follow-up 1.)*

## Functional requirements
- [ ] `applyMove(state, roll)` returns a **new** state for the player at `state.current`. It never mutates the input.
- [ ] The player moves from `p` to `p + roll`. If the new square is a ladder bottom or a snake head, they then move to the other end of that jump.
- [ ] If `p + roll > 100`, the player stays on `p`.
- [ ] Reaching 100 (directly or up a ladder) sets `winner` to the current player's index. Once there is a winner, `applyMove` returns the state unchanged.
- [ ] After a roll of 6 (and no win), `current` stays the same. Otherwise `current` passes to the next player, wrapping around.
- [ ] The component renders the board as 10 rows of 10 numbered squares in boustrophedon order, top row first. Squares with a ladder or snake show where it goes.
- [ ] Each player has a token, drawn on their square. Players on square 0 wait in a "Start" area off the board.
- [ ] A turn indicator reads `Player N's turn`, or `Player N wins` once the game is over.
- [ ] `Roll dice` rolls `Math.floor(random() * 6) + 1`, applies the move and announces it (see the Test contract). After a win the button is disabled.
- [ ] `New game` puts every player back on square 0, clears the announcement and gives the turn to Player 1.
- [ ] The `players` prop sets the number of players (2–4).

## Non-functional requirements
- **Accessibility:**
  - The board is a table named `Board`, with rows and cells in visual order (top row first), so screen reader users can explore it.
  - Each square's accessible name starts with its number and mentions any jump, e.g. `Square 4, ladder to 14`.
  - Tokens have text alternatives (`Player 1`), and each player also has a distinct shape or letter, not only a colour.
  - Every move is announced in a polite live region (`role="status"`), because the board changing silently tells a screen reader user nothing.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between `Roll dice` and `New game` (native order) |
  | `Enter` / `Space` | Roll the dice or start a new game (native button behaviour) |

- **Performance:** trivial. Derive the board layout (square number → row and column) once, not on every render.
- **Styling:** lay the board out with CSS Grid (a `<table>` can use `display: grid` too) and SVG lines or simple markers for snakes and ladders. Colour each player's token. Show the last roll as a die face.

## Constraints
- 60 minutes. React and CSS Modules only.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports the component and also exports `applyMove`.
- The Playground passes demo boards from `data.ts`.

## Data / API contract
```ts
type Jumps = Record<number, number>;            // { from: to }
interface Board { snakes: Jumps; ladders: Jumps }
interface GameState {
  board: Board;
  positions: number[];      // index 0 = Player 1; 0 = not on the board yet
  current: number;          // index of the player to roll
  winner: number | null;    // index of the winner
}
function applyMove(state: GameState, roll: number): GameState;

interface SnakesAndLaddersProps {
  players?: number;         // 2–4, default 2
  snakes: Jumps;
  ladders: Jumps;
  random?: () => number;    // [0, 1), default Math.random
}
```

## Test contract
- `applyMove` is unit-tested with hand-built `GameState` objects.
- Tests pass `random` so each roll is known. A roll is exactly `Math.floor(random() * 6) + 1`, called once per `Roll dice` click.
- The board is a `table` named `Board` with 10 `row`s of 10 `cell`s each, top row first.
- Each square is a `cell` whose accessible name starts with `Square N` and continues with `, ladder to X` or `, snake to X` when there is one, e.g. `Square 4, ladder to 14`. Tests match with `/^Square 4\b/`. Use `aria-label` on the cell.
- Each token is an element with `role="img"` named `Player N`, inside the square's `cell`. Players on square 0 are not inside any cell.
- Buttons are named `Roll dice` and `New game`.
- The turn indicator is an element whose text is exactly `Player N's turn` or `Player N wins`.
- The move announcement is in a `role="status"` element that is always rendered (empty before the first roll and after `New game`). Tests check that it *contains* one of these:
  - `Player N rolled R, moved to S`
  - `Player N rolled R, climbed a ladder from A to B`
  - `Player N rolled R, slid down a snake from A to B`
  - `Player N rolled R, needs an exact roll, stays on S`

  `A` is the square landed on, and `B` is where the jump ends. You may add more text, e.g. ` Roll again!` or ` Player 1 wins!`.

## Edge cases
- A roll from 0 onto a ladder bottom, e.g. square 1.
- A player sitting on 99 rolls 1 → wins. Rolls 2–5 → stays. Rolls 6 → stays and rolls again.
- A ladder to 100 wins, and so does landing on 100 directly.
- Two or more players on the same square: both tokens are visible.
- Clicking `Roll dice` quickly many times must apply exactly one move per click.
- The `players` prop changes mid-game: restarting is acceptable.

## Follow-ups
1. **Validate the board.** Write `validateBoard(snakes, ladders)` and show a clear error instead of the board when the config is invalid. Invalid configs include: a snake head on 100, a jump that starts or ends outside 1–100, a square that is both a ladder bottom and a snake head, a ladder that goes down or a snake that goes up, and cycles (a ladder's top is a snake's head that leads back to the ladder's bottom). Which of these only matter if jumps chain?
2. **Animate the token.** Move the token square by square along the boustrophedon path, then along the ladder or snake. Disable `Roll dice` while it animates, and respect `prefers-reduced-motion`. Keep `applyMove` pure: the animation is a view concern.
3. **Bot players.** Add `bots: number[]` (player indexes). A bot rolls automatically about 800ms after its turn starts. It must stop cleanly on `New game` and on unmount.
4. **Undo last turn.** Add an `Undo` button that restores the state before the last roll, including after a win. Store a history of states, or of rolls to replay, and discuss the trade-offs.

## Concepts covered
A pure reducer for game rules · mapping a square number to (row, column) on a boustrophedon grid · injecting randomness for deterministic tests · turn and extra-turn rules · deriving the UI from state · polite live regions for announcements · table semantics for a board.

Related: S23 Connect Four · J14 Tic-Tac-Toe · S25 2048.
