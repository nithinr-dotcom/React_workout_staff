# 2048

## Problem statement
Build the 2048 puzzle game. A 4×4 board holds numbered tiles. Pressing an arrow key slides every tile as far as it can go in that direction. When two tiles with the same value collide, they merge into one tile with double the value, and the player scores that new value. After every move that changes the board, a new tile (`2` or `4`) appears on a random empty cell. The player wins by making a `2048` tile and loses when no move is possible.

Most of the difficulty is in the **merge rules**. Implement them as a pure `move(board, direction)` function and unit-test it. The component handles the keyboard, the score, spawning with an injected random source, and the win and lose states.

## Clarifying questions to ask
- Can a tile merge twice in one move? *(No. `[2, 2, 4, 0]` moved left becomes `[4, 4, 0, 0]`, not `[8, 0, 0, 0]`.)*
- With three equal tiles in a row, which pair merges? *(The pair nearest the wall you're moving toward. `[2, 2, 2, 0]` left becomes `[4, 2, 0, 0]`, and right becomes `[0, 0, 2, 4]`.)*
- Does a new tile spawn after a move that changes nothing? *(No.)*
- What are the odds of a 4? *(10%. `random` decides.)*
- After reaching 2048, can the player keep playing? *(The base version shows the win message. `Keep going` is a follow-up.)*
- Are animations required? *(No. Sliding animations are a follow-up.)*

## Functional requirements
- [ ] `move(board, direction)` returns `{ board, score, moved }` and never mutates the input:
  - [ ] Every tile slides as far as possible toward `direction`.
  - [ ] Two equal adjacent tiles (ignoring the gaps between them) merge into their sum. The merge closest to the destination wall happens first.
  - [ ] A tile created by a merge can't merge again in the same move.
  - [ ] `score` is the sum of all tiles created by merges in this move. It is `0` when nothing merged.
  - [ ] `moved` is `false` when the result is identical to the input.
- [ ] `spawnTile(board, random)` returns a new board with one tile added:
  - The **first** `random()` call picks the cell: list the empty cells in row-major order and take `empty[Math.floor(random() * empty.length)]`.
  - The **second** `random()` call picks the value: `< 0.9` gives `2`, otherwise `4`.
  - If there are no empty cells, it returns a board equal to the input and doesn't call `random`.
- [ ] `hasWon(board)` is `true` if any tile is `≥ 2048`.
- [ ] `canMove(board)` is `true` if there's an empty cell or two equal tiles are adjacent horizontally or vertically.
- [ ] The component:
  - [ ] Starts from `initialBoard` when it is given, with no extra tiles. Otherwise it starts from an empty board with **two** tiles spawned one after the other.
  - [ ] Handles the arrow keys on `window`. Each move that changes the board adds its score and spawns one tile. A move that changes nothing does neither.
  - [ ] Shows `Score: N`.
  - [ ] Shows `You win!` once the board contains a 2048 tile. Further moves are ignored in the base version.
  - [ ] Shows `Game over` whenever `canMove` is false, including for an `initialBoard` that is already stuck.
  - [ ] Has a `New game` button, always visible, that resets the score to 0 and starts from an empty board with two spawned tiles. It ignores `initialBoard`.

## Non-functional requirements
- **Accessibility:**
  - Each cell has an accessible name giving its position and value (see the Test contract), so the board can be read without seeing it.
  - Score changes and the win and game-over messages are announced with a live region (`role="status"`). Don't announce the whole board after every move.
  - `New game` is a native button.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown` | Slide the tiles |
  | `Tab` → `New game`, `Enter` / `Space` | Restart (native button behaviour) |

- Call `preventDefault` on arrow keys so the page doesn't scroll. Ignore arrows while focus is in a form field such as a `<select>`.
- **Code quality:** don't write four near-identical loops. Reduce to a single "slide one line left" function and derive the other directions by reversing and/or transposing. Be ready to explain the trick.
- **Styling:** a CSS Grid board, a tile colour for each value, and a readable font size for 4-digit numbers.

## Constraints
- 60 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports the component and also exports `move`, `spawnTile`, `hasWon` and `canMove` as named exports.

## Data / API contract
```ts
type Board = number[][];                              // 4 × 4, 0 = empty, board[row][column]
type MoveDirection = 'left' | 'right' | 'up' | 'down';
interface MoveResult { board: Board; score: number; moved: boolean }

interface Game2048Props {
  random?: () => number;   // default Math.random
  initialBoard?: Board;    // skip the two initial spawns
}

// Named exports from Solution.tsx
function move(board: Board, direction: MoveDirection): MoveResult;
function spawnTile(board: Board, random: () => number): Board;
function hasWon(board: Board): boolean;
function canMove(board: Board): boolean;
```

## Test contract
- The pure functions are unit-tested with hand-built 4×4 boards, compared with `toEqual`.
- Cells: each of the 16 cells has an accessible label `Row R, Column C, N` for a tile, or `Row R, Column C, empty` for an empty cell. `R` and `C` are 1-based, with row 1 at the top. Tests use `getByLabelText` / `getAllByLabelText`.
- Visible texts, each the complete text of its own element: `Score: N`, `You win!` and `Game over`. There is also a `button` named `New game`.
- UI tests pass `random={() => 0}`, so a spawned tile is always a `2` in the first empty cell in row-major order. They send keys with `userEvent.keyboard('{ArrowLeft}')` while focus is on `document.body`.

## Edge cases
- `[2, 2, 2, 2]` becomes `[4, 4, 0, 0]`, and `[4, 4, 8, 0]` becomes `[8, 8, 0, 0]`. Neither result merges again.
- `[2, 0, 2, 4]` moved left becomes `[4, 4, 0, 0]`, because gaps don't block a merge.
- A full board can still have moves, as long as two equal neighbours are adjacent.
- A move that only merges, e.g. `[2, 2, 0, 0]` moved left, counts as moved even though nothing slid.
- `initialBoard` passed as a literal in the Playground. Never mutate props.
- Holding an arrow key down: moves happen on every repeat. That's fine, as long as each keydown applies exactly one move.

## Follow-ups
1. **Keep going.** After `You win!`, show a `Keep going` button that dismisses the message and allows play to continue. The message must not appear again during the same game.
2. **Undo.** Add an `Undo` button that restores the previous board **and** score, one level deep. Explain why storing the RNG state (or pre-spawn boards) matters if undo must be deterministic.
3. **Animations.** Give tiles stable ids so React can animate them sliding to their new positions with CSS transforms. Merged tiles "pop". Explain why the board-of-numbers model makes this hard, and how you'd change the model.
4. **Swipe support.** Support touch swipes with pointer events, using a minimum distance and dominant-axis detection, and reuse the same `move`.
5. **Best score & persistence.** Persist the board, score and best score in `localStorage`, and restore them on reload. Validate the stored shape before trusting it.

## Concepts covered
A pure move function · reducing four directions to one with reverse and transpose · merge-once rules · deterministic randomness via injection · derived status (`hasWon`, `canMove`) · global key handling with cleanup · immutable 2D updates.

Related: S23 Connect Four · S24 Snake · S22 Wordle · J16 Grid Lights.
