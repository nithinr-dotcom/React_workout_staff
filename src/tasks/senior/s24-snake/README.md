# Snake

## Problem statement
Build the classic Snake game on a square grid. The snake moves one cell on every tick. The player steers with the arrow keys or WASD. Eating food makes the snake one cell longer and adds a point. Running into a wall or into itself ends the game.

This is really a question about **game loops in React**. Keep all the rules in a pure `step(state, direction)` function that you can unit-test without timers or the DOM. Make the component a thin shell that owns the timer, the keyboard input and the rendering. Randomness is injected, so food placement is deterministic in tests.

## Clarifying questions to ask
- Does the game start immediately, or on a key press? *(Immediately on mount.)*
- Do walls kill, or does the snake wrap to the other side? *(Walls kill. Wrapping is a follow-up.)*
- What happens if the player presses the opposite direction (e.g. `Left` while moving right)? *(It's ignored. The snake can never reverse into its own neck.)*
- If the player presses two keys within one tick (e.g. `Up` then `Left`), is the second one lost? *(No. Turns are buffered and applied one per tick.)*
- Does the speed increase as the snake grows? *(No. It's a follow-up.)*
- Where does food appear? *(On a free cell chosen by `random`. See `placeFood`.)*

## Functional requirements
- [ ] `createInitialState(size, random)` returns:
  - a snake of length 3 with its head at `(⌊size/2⌋, ⌊size/2⌋)` and its body extending to the **left**, for example `[{x:5,y:5},{x:4,y:5},{x:3,y:5}]` for `size = 10`;
  - `direction: 'right'`, `score: 0` and `status: 'playing'`;
  - `food` from `placeFood(snake, size, random)`.
- [ ] `placeFood(snake, size, random)` lists the free cells in row-major order (`y` ascending, then `x` ascending). It returns `free[Math.floor(random() * free.length)]`, or `null` if there are no free cells.
- [ ] `step(state, direction, random)`:
  - [ ] If `state.status` is `'over'`, it returns `state` unchanged (the same object is fine).
  - [ ] If `direction` is the opposite of `state.direction`, it keeps `state.direction`. Otherwise the new direction is `direction`.
  - [ ] It moves the head one cell in that direction. `up` is `y - 1` and `right` is `x + 1`.
  - [ ] If the new head is outside the grid, the result has `status: 'over'` and the same `snake`, `food` and `score`.
  - [ ] If the new head is on the food, the snake grows (the tail stays), `score` goes up by 1, and new food is placed with `placeFood(newSnake, size, random)`.
  - [ ] Otherwise the snake moves: the head is added and the tail is removed.
  - [ ] If the new head hits a body segment that is still there after the move, the game is over, with the same `snake`, `food` and `score`. The head **may** move into the cell the tail is leaving on this tick. It may **not** when the snake is growing.
  - [ ] It never mutates `state` or its arrays.
- [ ] The component starts playing on mount and calls `step` every `tickMs`.
- [ ] Keys (`ArrowUp/Down/Left/Right` and `W/A/S/D`, either case) queue a turn. Each tick uses **at most one** queued turn. A key is dropped if it equals, or is the opposite of, the last queued direction (or the current direction when the queue is empty). The queue holds at most 3 turns.
- [ ] `Space` toggles pause. While paused, no ticks run and `Paused` is shown. Direction keys pressed while paused are ignored.
- [ ] It shows `Score: N` at all times.
- [ ] On game over, it stops the loop and shows `Game over` and a `Play again` button, which resets to a fresh initial state and starts playing.
- [ ] Timers are cleaned up on unmount, pause and game over, so none leak.

## Non-functional requirements
- **Accessibility:**
  - Put the score and the game-over and pause messages in a live region (`role="status"`). Don't announce every tick.
  - Give the board an accessible name, e.g. `role="img"` with `aria-label="Snake board"`. A cell-by-cell grid is too noisy for a real-time game.
  - `Play again` is a native button that receives focus when the game ends.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowUp` / `W` | Queue a turn up |
  | `ArrowDown` / `S` | Queue a turn down |
  | `ArrowLeft` / `A` | Queue a turn left |
  | `ArrowRight` / `D` | Queue a turn right |
  | `Space` | Pause / resume |
  | `Enter` on `Play again` | Restart (native button behaviour) |

- Listen for keys on `window`, so the game works without focusing the board. Call `preventDefault` on arrow keys and `Space` so the page doesn't scroll, but don't swallow keys typed into form fields.
- **Performance:** each tick is O(snake length). For example, you might use a `Set` of `"x,y"` strings for collisions on large grids. Rendering a 20×20 grid every 80ms must not drop frames, so render cells cheaply and avoid re-creating handlers per cell.
- **Correctness under React:** watch out for stale closures. The interval callback must see the latest state and the input queue. A `useReducer`, or refs combined with a functional update, are both valid. Be ready to justify your choice.
- **Styling:** a CSS Grid board with distinct colours for the head, body and food.

## Constraints
- 60 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports the component and also exports `createInitialState`, `step` and `placeFood` as named exports.

## Data / API contract
```ts
type Direction = 'up' | 'down' | 'left' | 'right';
interface Point { x: number; y: number }   // x = column (0 left), y = row (0 top)

interface SnakeState {
  size: number;
  snake: Point[];          // head first
  direction: Direction;
  food: Point | null;
  score: number;
  status: 'playing' | 'over';
}

interface SnakeProps {
  size?: number;           // default 15
  tickMs?: number;         // default 150
  random?: () => number;   // default Math.random
}

// Named exports from Solution.tsx
function createInitialState(size: number, random?: () => number): SnakeState;
function step(state: SnakeState, direction: Direction, random?: () => number): SnakeState;
function placeFood(snake: Point[], size: number, random: () => number): Point | null;
```

## Test contract
- The pure functions are unit-tested with hand-built `SnakeState` objects, compared with `toEqual`.
- UI tests call `vi.useFakeTimers()` **before** `render`. They advance time with `act(() => vi.advanceTimersByTime(ms))`, and send keys with `fireEvent.keyDown(document.body, { key })`, where `key` is `ArrowUp`, `w`, `' '`, and so on. The event bubbles to `window`.
- Ticks happen at `tickMs`, `2 × tickMs`, … after mount (or after resuming). The first move is **not** immediate.
- Visible texts, each the complete text of its own element so `getByText` matches exactly: `Score: N`, `Paused` (only while paused) and `Game over` (only after a collision). Plus a `button` named `Play again`.
- UI tests pass `random={() => 0}`, which puts the food in the first free cell in row-major order.

## Edge cases
- Pressing `Up` then `Left` within one tick while moving right. Without a buffer, `Left` would overwrite `Up` and be rejected as a reversal, so the turn gets lost.
- Pressing `Up` then `Down` within one tick while moving right. `Up` is queued, and `Down` reverses the last *queued* direction, so `Down` is dropped. If you compared only against the current direction, `Down` would sit in the queue and waste a tick's turn (a following `Left` would arrive one tick late).
- Chasing your own tail: moving into the cell the tail just left is legal.
- The snake fills the whole grid, so `placeFood` returns `null`. Nothing should crash.
- `tickMs` or `size` props change mid-game. The Playground remounts with `key`. Say what you'd do otherwise.
- A browser tab in the background throttles timers. The game shouldn't "catch up" with a burst of moves.

## Follow-ups
1. **Wrap-around mode.** Add a `wrap` prop. When it's set, leaving one edge brings the head back in on the opposite edge. Do it in `step`, without duplicating the collision logic.
2. **Speed-up and high score.** Shorten the tick by 5% each time the snake eats, with a sensible minimum. Persist the best score in `localStorage` and show `Best: N`.
3. **requestAnimationFrame loop.** Replace `setInterval` with a `requestAnimationFrame` loop that uses a fixed-timestep accumulator. Explain the difference in drift, background-tab behaviour and smoothness.
4. **Touch controls.** Support swipe gestures with pointer events. Pick a sensible minimum swipe distance, and swipes must go through the same input buffer.
5. **Replays.** Record the sequence of turns (with tick numbers) and the random seed, then replay the exact game. Explain why a pure `step` and an injected `random` make this almost free.

## Concepts covered
A pure reducer-style `step` function · game loops with `setInterval` and cleanup · stale closures, refs and `useReducer` · an input queue (one turn per tick) · global key listeners · injected randomness for deterministic tests · immutable array updates.

Related: J07 Stopwatch · J16 Grid Lights · S22 Wordle (global key handling) · S25 2048 (pure move function).
