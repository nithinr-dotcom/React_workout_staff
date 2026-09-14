# Whack-a-Mole

## Problem statement
Build a `WhackAMole` game. The board is a 3×3 grid of holes. Pressing **Start** begins a round that lasts `duration` seconds (30 by default). During the round, a mole pops up in a random hole every `popInterval` ms and stays up for `upTime` ms. Whacking (clicking) a visible mole scores a point and sends it back down straight away. When the countdown reaches zero the game ends, the final score shows, and **Play again** starts a new round.

Interviewers use this to see how you coordinate several timers (countdown, pop-ups, hide-after-delay), avoid stale closures, and clean everything up when the game ends or the component unmounts.

## Clarifying questions to ask
- How many moles can be up at once? *(One. `upTime` is always shorter than `popInterval`, so a mole is down before the next pops up. Several moles is follow-up 1.)*
- When does the first mole appear? *(`popInterval` ms after Start, then every `popInterval` ms.)*
- Can a mole pop up in the same hole twice in a row? *(Yes. The hole is simply `Math.floor(random() * 9)`.)*
- Is there a penalty for clicking an empty hole? *(No. It does nothing.)*
- What happens to a mole that is up when time runs out? *(It goes down. No more moles appear, and holes can't be whacked.)*
- Does the game speed up? *(Not in the base version. See follow-up 2.)*

## Functional requirements
- [ ] Render 9 holes in a 3×3 grid, a `Start` button, `Score: 0` and `Time left: <duration>`.
- [ ] Before Start, no moles appear and the countdown doesn't move.
- [ ] Start begins the round: the Start button goes away (or is disabled), and the countdown decreases by 1 every second.
- [ ] Every `popInterval` ms, one mole pops up in hole `Math.floor(random() * 9)` (holes are numbered 0–8 in reading order internally, 1–9 in names). Call `random` exactly once per pop-up.
- [ ] A mole goes back down after `upTime` ms if it isn't whacked.
- [ ] Clicking a visible mole adds 1 to the score and hides that mole immediately. Clicking the same hole again scores nothing.
- [ ] Clicking an empty hole does nothing.
- [ ] When the countdown reaches 0: hide any mole, stop pop-ups, and show `Game over! Final score: N` and a `Play again` button. Holes can't be whacked.
- [ ] `Play again` resets the score to 0 and the countdown to `duration`, and starts a new round immediately.
- [ ] Unmounting stops every timer.

## Non-functional requirements
- **Accessibility:**
  - Each hole is a native `<button>` whose accessible name says whether a mole is in it (see Test contract). Players using a screen reader can't see the emoji.
  - The game-over message is announced (for example `role="alert"` or a `status` live region). The per-second countdown is **not** in a live region, because announcing it every second is noise.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between holes and buttons |
  | `Enter` / `Space` | Whack the focused hole, or press Start / Play again |

- **Correctness:** timer callbacks must not read stale `score` or mole values. Two fast clicks on the same mole must score one point.
- **Styling:** a 3×3 CSS Grid with big round holes, and a mole that rises with a `transform` transition. Honour `prefers-reduced-motion`.

## Constraints
- 40 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface WhackAMoleProps {
  duration?: number;      // seconds, default 30
  popInterval?: number;   // ms between pop-ups, default 1000
  upTime?: number;        // ms a mole stays up, default 700 (always < popInterval)
  random?: () => number;  // default Math.random, called once per pop-up
}

// Follow-up 3
const HIGH_SCORE_STORAGE_KEY = 'j37-whack-a-mole:high-score';
```
Default-export the component from `Solution.tsx`.

## Test contract
- Nine `button`s named `Hole N, empty` or `Hole N, mole`, with `N` from 1 to 9 in reading order (top-left is 1, bottom-right is 9). So `random() = 0.45` puts the mole in `Hole 5`.
- A `button` named `Start` before the first round, and a `button` named `Play again` after a round ends.
- Text `Score: N` and text `Time left: N` (whole seconds), each as the full text of one element.
- After a round ends, the text `Game over! Final score: N` (it may be split across elements).
- Tests use `vi.useFakeTimers({ shouldAdvanceTime: true })`, advance time well inside each window (never exactly on a boundary), and check `vi.getTimerCount()` is `0` after unmount.
- Follow-up 3: text `High score: N`, stored under `HIGH_SCORE_STORAGE_KEY`.

## Edge cases
- Whacking a mole just before its hide timer fires: the hide timer must not cause trouble (for example hiding the *next* mole early).
- Clicking a hole in the same instant the game ends must not add a point.
- `Play again` while old timers are still scheduled: timers from the previous round must never touch the new round.
- `duration` shorter than `popInterval`: the round ends without any mole appearing.
- The `random` prop changing identity on every render must not restart the round.

## Follow-ups
1. **Multiple moles.** Several moles can be up at once, each with its own random up time. A mole never pops up in a hole that is already occupied. Discuss how your state and timers change: one timer per mole, or a single game loop?
2. **Difficulty ramp.** The game speeds up as it goes: every 10 seconds, `popInterval` and `upTime` shrink by 20%, down to a floor. Keep the countdown exactly on time while the pop-up rhythm changes.
3. **High score.** Show `High score: N`, persisted in `localStorage` under `HIGH_SCORE_STORAGE_KEY`. Read it on mount, and update it at game over only when the new score beats it. Handle a missing or corrupt stored value.
4. **Keyboard play with a numpad layout.** Keys `7 8 9 / 4 5 6 / 1 2 3` whack the matching hole in the same layout as a numeric keypad, without having to focus the holes. Explain how to avoid double-handling when a hole button also has focus.

## Concepts covered
Modelling game phases (`idle`, `playing`, `over`) · coordinating intervals and timeouts · stale closures and functional state updates · cleaning up timers on phase change and unmount · injecting randomness for deterministic tests · accessible names for grid buttons.

Related: J15 Memory Card Game · J16 Grid Lights · J07 Stopwatch & Countdown · S24 Snake.
