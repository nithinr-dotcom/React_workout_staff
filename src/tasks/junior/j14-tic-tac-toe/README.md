# Tic-Tac-Toe (N×N)

## Problem statement
Build a two-player `TicTacToe` game played on one device. The board is `size × size` cells (3 by default). Players take turns, starting with **X**. A player wins by filling a full row, a full column or either full diagonal with their mark. If every cell is filled and nobody has won, the game is a draw. A status line always tells the players what is happening, and a **Reset** button starts a new game.

Interviewers use this to see how you model a grid, whether you store or derive state, and whether your win check works for any `size`, not only 3.

## Clarifying questions to ask
- Who moves first? *(Always X.)*
- On a 4×4 board, how many in a row wins? *(The full line: `size` in a row. "K in a row" is a follow-up.)*
- What happens when someone clicks after the game is over? *(Nothing. The board is frozen until Reset.)*
- Should the winner be stored in state or computed? *(Your call, but be ready to justify it.)*
- Does `size` change during a game? *(Assume it doesn't. Mention what you'd do if it did.)*

## Functional requirements
- [ ] Render `size × size` cells. `size` defaults to `3`.
- [ ] X moves first, then players alternate.
- [ ] Clicking an empty cell places the current player's mark in it.
- [ ] Clicking a filled cell does nothing, and the turn does not change.
- [ ] Detect a win on any row, any column, the main diagonal (top-left to bottom-right) and the anti-diagonal (top-right to bottom-left), for any `size`.
- [ ] Detect a draw: every cell filled and no winner.
- [ ] Show status text: `Next player: X` / `Next player: O` during play, `Winner: X` / `Winner: O` after a win, `Draw` after a draw.
- [ ] After the game ends, clicking any cell does nothing.
- [ ] A `Reset` button clears the board, and X moves next.

## Non-functional requirements
- **Accessibility:**
  - Each cell is a native `<button>` with an accessible name describing its position and content (see Test contract). Visible text alone (`X`, `O` or nothing) isn't enough, because an empty button has no name.
  - The status line is a live region (`role="status"`) so screen readers announce turns and results.
  - Cells that can't be played (filled cells, or every cell after the game ends) should be `disabled` or `aria-disabled`.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between cells and the Reset button (native order) |
  | `Enter` / `Space` | Play the focused cell (native button behaviour) |

- **Performance:** checking for a winner after a move is O(size²) or better. Don't precompute every possible line for huge boards if it's not needed, but be ready to discuss the trade-off.
- **Styling:** a square grid built with CSS Grid (`grid-template-columns: repeat(size, …)`), big tap targets, and a visible focus ring.

## Constraints
- 40 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type Player = 'X' | 'O';
type Cell = Player | null;

interface TicTacToeProps {
  size?: number; // default 3
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Each cell is a `button` named `Row R, Column C, empty`, `Row R, Column C, X` or `Row R, Column C, O`. `R` and `C` start at 1, with row 1 at the top and column 1 on the left.
- An element with `role="status"` contains exactly one of: `Next player: X`, `Next player: O`, `Winner: X`, `Winner: O`, `Draw`.
- A `button` named `Reset`.
- Tests may check that a cell's name did not change after a click. They don't require cells to be `disabled`.

## Edge cases
- `size = 1`: the first move wins.
- A move that completes a line on the very last empty cell is a **win**, not a draw.
- Two quick clicks on the same empty cell must place only one mark.
- Deriving the next player from the board (count the marks) vs storing it: both work, but they must never disagree.

## Follow-ups
1. **Time travel.** Keep a history of moves. Show a list of buttons `Go to game start`, `Go to move 1`, `Go to move 2`, …. Clicking one restores that board. Making a new move from a past board discards the "future" moves.
2. **K in a row.** Add a `winLength` prop (default `size`), for example a 10×10 board where 5 in a row wins (Gomoku). Check only the lines through the last move, so each check is O(winLength) instead of scanning the whole board.
3. **Highlight the winning line.** Visually mark the cells that make up the winning line and append `, winning` to their accessible names.
4. **Computer opponent.** Add a `vsComputer` mode where O plays automatically after a short delay. Start with random empty cells, then discuss minimax for 3×3 and why it doesn't scale to large boards.

## Concepts covered
Modelling a 2D grid as a flat array or an array of rows · deriving winner, draw and next player from the board instead of syncing extra state · immutable updates · generating accessible names for grid cells.

Related: J15 Memory Card Game · J16 Grid Lights.
