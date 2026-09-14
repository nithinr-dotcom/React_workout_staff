# Connect Four

## Problem statement
Build a two-player Connect Four game. The board is 6 rows by 7 columns and stands upright. Players take turns choosing a column, and their disc falls to the lowest empty slot in that column. The first player to line up **four** discs horizontally, vertically or diagonally wins. If the board fills up with no winner, the game is a draw.

Red always moves first. Keep the rules in pure functions (`createBoard`, `dropDisc`, `getWinner`, `isDraw`) that are exported and unit-tested, with the component as a thin layer on top.

## Clarifying questions to ask
- Who moves first? *(Red.)*
- How does a player choose a column: by clicking a cell or a button above the column? *(A button per column, `Drop in column N`. Clicking any cell in a column is a nice extra.)*
- Should the win be checked by scanning the whole board or only around the last disc? *(Either is fine for 6×7. Be ready to discuss the trade-off for larger boards.)*
- Is the board size configurable? *(`rows` and `columns` props, default 6 and 7. The win length stays 4.)*
- Is an AI opponent needed? *(No. It's a follow-up.)*

## Functional requirements
- [ ] `createBoard(rows = 6, columns = 7)` returns a `rows × columns` grid of `null`. Every row is a separate array.
- [ ] `dropDisc(board, column, player)` returns a **new** board with the disc in the lowest empty row of that 0-based column. The input board is never mutated.
- [ ] `dropDisc` returns `null` when the column is full or out of range.
- [ ] `getWinner(board)` returns the player with 4 in a row: horizontally, vertically, diagonally down-right (↘) or diagonally up-right (↗). Otherwise `null`. Lines don't wrap around edges.
- [ ] `isDraw(board)` is `true` only when every slot is filled and there is no winner.
- [ ] The component renders the board with one "Drop" button per column, a status line and a `Reset` button.
- [ ] Clicking `Drop in column N` drops the current player's disc into that column, then passes the turn to the other player.
- [ ] A full column's button is disabled. After a win or a draw, every drop button is disabled.
- [ ] The status reads `Red to move` or `Yellow to move` during play, then `Red wins`, `Yellow wins` or `Draw` at the end.
- [ ] `Reset` clears the board and gives the move back to Red.

## Non-functional requirements
- **Accessibility:**
  - Each slot has an accessible name giving its position and contents (see the Test contract), so the board makes sense without colour.
  - The drop buttons are native `<button>`s with clear names.
  - The status line is a live region (`role="status"`).
  - Nice extra: after a drop, announce where the disc landed, e.g. "Red disc placed in row 4, column 3".
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between the drop buttons and Reset (native order) |
  | `Enter` / `Space` | Drop into the focused column (native button behaviour) |
  | `ArrowLeft` / `ArrowRight` *(optional)* | Move focus to the previous or next drop button |

- **Performance:** checking only the lines through the last disc is O(1) per move. A full-board scan is O(rows × columns). Explain which you chose.
- **Styling:** the classic blue board with round slots, using CSS Grid. Show a hover or focus preview of which column you're about to play. A falling animation is optional.

## Constraints
- 45 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports the component and also exports `createBoard`, `dropDisc`, `getWinner` and `isDraw` as named exports.

## Data / API contract
```ts
type Player = 'red' | 'yellow';
type Cell = Player | null;
type Board = Cell[][];            // board[row][column]; row 0 is the TOP row

interface ConnectFourProps { rows?: number; columns?: number } // defaults 6, 7

// Named exports from Solution.tsx
function createBoard(rows?: number, columns?: number): Board;
function dropDisc(board: Board, column: number, player: Player): Board | null; // column is 0-based
function getWinner(board: Board): Player | null;
function isDraw(board: Board): boolean;
```

## Test contract
- The pure functions are unit-tested with hand-built boards: `board[row][column]`, row 0 at the top, `'red' | 'yellow' | null`.
- Drop buttons: `button` named `Drop in column 1` … `Drop in column 7`. These names are 1-based, left to right.
- Slots: every slot has an accessible label `Row R, Column C, empty`, `Row R, Column C, red` or `Row R, Column C, yellow`. `R` and `C` are 1-based, with row 1 at the top. Tests use `getByLabelText`.
- One element with `role="status"` contains exactly one of `Red to move`, `Yellow to move`, `Red wins`, `Yellow wins` or `Draw`.
- A `button` named `Reset`.
- When a drop is not allowed, the button is `disabled`.

## Edge cases
- Four in a row that is also part of five in a row.
- A diagonal that touches the board edge, e.g. starting at row 0 or ending at the last column.
- Three in a row at the end of one row plus one at the start of the next row. This is **not** a win.
- The last slot on the board completes a four. That's a win, not a draw.
- Rapid double-clicks on a drop button must not place two discs for the same player.
- Non-square boards (`rows ≠ columns`) catch row/column mix-ups.

## Follow-ups
1. **Highlight the winning line.** Change `getWinner` (or add `getWinningLine`) so it also returns the four `[row, column]` coordinates, and highlight them. Their accessible names should mention it, e.g. `Row 3, Column 4, red, winning`.
2. **Connect N.** Add a `connect` prop (default 4). Make sure the win check stays efficient when you only look at lines through the last disc.
3. **Undo.** Add an `Undo` button that takes back the last move, including a winning move. Store the moves, not board snapshots, and derive the board from them. Discuss the trade-offs.
4. **Computer opponent.** Add a single-player mode where Yellow is played by a simple AI: win if possible, otherwise block Red's immediate win, otherwise prefer the centre column. Keep it pure and testable. Run the move after a short delay so the UI doesn't feel instant.
5. **Keyboard-first play.** Use a roving-tabindex column selector: one tab stop, `ArrowLeft`/`ArrowRight` move a hover disc, and `Enter` drops it.

## Concepts covered
Modelling a 2D grid (`board[row][col]`) · immutable nested updates · direction vectors for line scanning · deriving status (`winner`, `draw`, `current player`) instead of storing it · pure logic separated from React · accessible names for visual state.

Related: J14 Tic-Tac-Toe · S25 2048 · S22 Wordle.
