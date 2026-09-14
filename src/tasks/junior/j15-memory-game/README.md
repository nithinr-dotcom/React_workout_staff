# Memory Card Game

## Problem statement
Build a `MemoryGame` (also called Concentration). Every symbol appears on exactly two cards, and all cards start face down in a shuffled grid. The player flips two cards per move:
- If the two symbols match, both cards stay face up for the rest of the game.
- If they don't match, both stay visible for `mismatchDelay` ms and then flip back face down. The player can't flip anything else during that delay.

A counter shows how many moves the player has made. When every pair is found, a win message appears. A **Restart** button deals a fresh shuffled game at any time.

Randomness is injected through the `shuffle` prop, so tests (and you) can play a known layout.

## Clarifying questions to ask
- What counts as a move? *(Flipping the second card of a pair. Flipping the first card doesn't count.)*
- What happens if the player clicks the same face-up card twice? *(Nothing, and it doesn't count as a move.)*
- Can the player click a third card to skip the mismatch delay? *(No. Input is locked until the cards flip back. "Click to skip" is a follow-up.)*
- How is the deck built before shuffling? *(`symbols` in order, followed by `symbols` again in the same order: `['A', 'B']` becomes `A, B, A, B`.)*
- Is there a timer or a score? *(Only the moves counter for now.)*

## Functional requirements
- [ ] Build the deck: `symbols` followed by `symbols` again, each card with a unique `id`. Pass it to `shuffle` and render the cards in the order `shuffle` returns.
- [ ] Call `shuffle` when a game starts: on mount and on every Restart. Default `shuffle` is a uniform random shuffle that doesn't mutate its input.
- [ ] All cards start face down. The moves counter starts at 0.
- [ ] Clicking a face-down card flips it face up.
- [ ] When a second card is flipped, the move counter goes up by 1.
  - Same symbol: both cards become **matched** and stay face up.
  - Different symbols: both stay face up for `mismatchDelay` ms (default 1000), then flip face down.
- [ ] While a mismatched pair is showing, clicks on any card are ignored.
- [ ] Clicks on matched cards, or on the one card that is already face up, are ignored.
- [ ] When all cards are matched, show `You won in N moves!`.
- [ ] A `Restart` button resets the moves to 0, turns every card face down, clears any pending flip-back and deals a new shuffle.

## Non-functional requirements
- **Accessibility:**
  - Every card is a native `<button>`. A face-down card's accessible name must **not** reveal its symbol.
  - Matched cards should be `disabled` or `aria-disabled="true"`.
  - Announce the result of each move and the win message in a polite live region (`role="status"`), for example "Match!" or "No match".
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between cards and Restart |
  | `Enter` / `Space` | Flip the focused card |

- **Timers:** clear the flip-back timer on unmount and on Restart. A stale timer must never flip cards in a new game.
- **Styling:** a responsive grid with a flip animation (`transform: rotateY`). Respect `prefers-reduced-motion`.

## Constraints
- 45 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface MemoryCard {
  id: string;     // unique per card
  symbol: string; // shared by the two cards of a pair
}

interface MemoryGameProps {
  symbols?: string[];                              // default: 8 emoji → 16 cards
  shuffle?: (cards: MemoryCard[]) => MemoryCard[]; // default: random, non-mutating
  mismatchDelay?: number;                          // default 1000 (ms)
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Cards are `button`s. `N` is the card's 1-based position in the order `shuffle` returned:
  - face down: `Card N, face down`
  - face up and not yet matched: `Card N, <symbol>` (for example `Card 3, A`)
  - matched: `Card N, <symbol>, matched`
- The moves counter reads `Moves: N`. It stays visible after the game is won.
- The win message is the text `You won in N moves!`.
- A `button` named `Restart`.
- Tests pass `shuffle` (usually identity or reverse), so the deck for `symbols={['A', 'B', 'C']}` is `A, B, C, A, B, C`. They use fake timers to advance past `mismatchDelay`.
- Clicks on locked cards may be ignored, or the cards may be disabled. Tests only check the names and the counter afterwards.

## Edge cases
- A fast double click on one face-down card must not count as a move, or as a match with itself.
- Clicking a third card during the mismatch delay: ignored, with no extra flip and no extra move.
- Restart during the mismatch delay: the old timer must not flip cards in the new game.
- Unmount during the delay: no "state update on unmounted component" and no leaked timer.
- `symbols` with a single entry: one move wins.

## Follow-ups
1. **Click to skip the delay.** Instead of ignoring clicks during a mismatch, a click on a third card flips the mismatched pair back immediately and flips the clicked card.
2. **Timer and best score.** Show elapsed time from the first flip to the win. Persist the best (fewest moves) result per deck size in `localStorage`.
3. **Difficulty levels.** Offer 4×4, 6×6 and 8×8 boards. Explain why the default shuffle must be unbiased, and why `array.sort(() => Math.random() - 0.5)` is not.
4. **Match N.** Generalise to matching triples (`matchSize` prop). What in your state model had to change?

## Concepts covered
Modelling game phases (idle, one flipped, two flipped/locked, won) · timers with cleanup · injecting randomness for testability · Fisher–Yates shuffle · deriving the win state from card state.

Related: J14 Tic-Tac-Toe · J16 Grid Lights · J06 Traffic Light.
