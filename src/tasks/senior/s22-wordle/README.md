# Wordle

## Problem statement
Build a playable clone of Wordle. The player has 6 attempts to guess a secret 5-letter word. After each valid guess, every letter is marked:
- **correct:** the right letter in the right spot.
- **present:** the letter is in the word, but in a different spot.
- **absent:** the letter isn't in the word, or all of its copies are already accounted for.

The player types with the physical keyboard or clicks an on-screen keyboard. Each on-screen key shows the best status known for its letter.

The secret word comes in as a prop so games are deterministic. The scoring logic must also be exported as a pure function, because the duplicate-letter rules are where most candidates slip up, and the interviewer will test it directly.

## Clarifying questions to ask
- Must guesses be real words? *(Yes. Only words in the `words` list are accepted. Anything else shows `Not in word list` and doesn't use up an attempt.)*
- How do duplicate letters score? *(Like the real game. See the functional requirements. For example, guessing `lists` against `links` gives the first `s` **absent** and the last `s` **correct**.)*
- Is input case-sensitive? *(No. Store and compare in lowercase. How letters look on screen is up to you.)*
- Is there a flip animation? *(Optional. Tests don't wait for animations, so status must be applied immediately.)*
- Is hard mode needed? *(No. It's a follow-up.)*
- Should progress survive a reload? *(No. It's a follow-up.)*

## Functional requirements
- [ ] Render 6 rows of 5 tiles. The current row fills as the player types.
- [ ] Letters `a`–`z` (either case) append to the current row, up to 5 letters. Extra letters are ignored.
- [ ] `Backspace` removes the last letter of the current row. It never edits a submitted row.
- [ ] `Enter` submits the current row:
  - With fewer than 5 letters, show `Not enough letters` and keep the row.
  - If the word isn't in `words`, show `Not in word list` and keep the row, so the player can backspace and fix it.
  - Otherwise the row is locked, its tiles get statuses, and play moves to the next row.
- [ ] `scoreGuess(guess, answer)` returns 5 statuses and handles duplicate letters:
  - Letters in the exact position are `correct` first, whatever their order in the word.
  - The remaining guess letters, from left to right, are `present` only while the answer still has an unmatched copy of that letter. Otherwise they are `absent`.
- [ ] `getKeyStatuses(guesses, answer)` gives every guessed letter its best status across all guesses, where `correct` > `present` > `absent`. A key's status is only ever upgraded, never downgraded. Letters never guessed are missing from the record.
- [ ] The on-screen keyboard has a button for each letter `a`–`z`, plus `Enter` and `Backspace` buttons. They behave exactly like the physical keys.
- [ ] A guess equal to the answer wins: show `You win!`.
- [ ] Using up the 6th guess without winning loses: show `The word was ` followed by the answer in UPPERCASE, for example `The word was REACT`.
- [ ] After a win or a loss, all input (physical and on-screen) is ignored.
- [ ] A transient message (`Not enough letters` / `Not in word list`) clears on the next letter or Backspace.

## Non-functional requirements
- **Accessibility:**
  - Colour is never the only signal. Each tile in a submitted row, and each keyboard key with a known status, carries the status in its accessible name (see the Test contract).
  - Each board row is a `role="group"` with a name (`Guess 1`…`Guess 6`), so screen-reader users can move between rows.
  - Messages appear in a live region (`role="status"`), so errors and results get announced.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `a`–`z` / `A`–`Z` | Append a letter to the current row (max 5) |
  | `Backspace` | Delete the last letter of the current row |
  | `Enter` | Submit the current row |
  | `Ctrl`/`Cmd`/`Alt` + any key | Ignored, so browser shortcuts like `Cmd+R` still work |
  | `Tab` / `Enter` / `Space` on an on-screen key | Native button behaviour |

- The physical keyboard works without focusing anything: listen on `window`, and remove the listener on unmount.
- Pressing `Enter` while an on-screen key has focus must not both submit **and** type that key. Pick a strategy and be ready to explain it.
- **Performance:** scoring is O(word length). Look words up in a `Set`, not with `Array.includes` on every submit.
- **Styling:** a CSS Grid board, and the three statuses in clearly different colours with enough contrast, such as green, yellow and grey.

## Constraints
- 60 minutes. React and CSS Modules only.
- No mock API. The default word list is `WORDS` from `src/mocks/data/datasets.ts`.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports the component and also exports `scoreGuess` and `getKeyStatuses` as named exports.

## Data / API contract
```ts
type LetterStatus = 'correct' | 'present' | 'absent';

interface WordleProps {
  answer: string;    // 5 lowercase letters
  words?: string[];  // default: WORDS
}

// Named exports from Solution.tsx
function scoreGuess(guess: string, answer: string): LetterStatus[];
function getKeyStatuses(guesses: string[], answer: string): Record<string, LetterStatus>;
```

## Test contract
- The named exports `scoreGuess` and `getKeyStatuses` are unit-tested directly with lowercase 5-letter strings.
- `getKeyStatuses` is compared with `toEqual`, so include only letters that have been guessed, keyed in lowercase.
- Board rows: `getByRole('group', { name: 'Guess N' })` for N = 1…6. A row's text content, with whitespace removed and lowercased, equals the letters typed into it. Empty tiles contain no text.
- In a submitted row, each tile has an accessible label `<LETTER> <status>` with the letter in uppercase, for example `R correct`, `E present`, `B absent`. Tests query these with `getByLabelText` inside the row.
- The on-screen keyboard has a `button` per letter. Its accessible name is the uppercase letter (`R`) while the status is unknown, and `<LETTER> <status>` once known (`R correct`). There are also buttons named `Enter` and `Backspace`.
- One element with `role="status"` holds the current message: `Not enough letters`, `Not in word list`, `You win!` or `The word was REACT`. It may be empty when there is no message.
- Physical keys are sent with `userEvent.keyboard` while focus is on `document.body`.

## Edge cases
- Guesses and answers with repeated letters: `error`, `hooks`, `array`.
- The answer isn't in `words`. It should still be guessable, so treat the answer as always allowed.
- Typing a 6th letter, or pressing Backspace on an empty row.
- Holding a key down (`event.repeat`) shouldn't enter a flood of letters. Decide whether to allow it.
- Key events that come from inside a text input elsewhere on the page, like the Playground's controls.
- The `answer` prop changes mid-game. The Playground remounts with `key` instead. Explain why that's simpler.

## Follow-ups
1. **Hard mode.** When `hardMode` is on, every later guess must reuse all revealed hints: `correct` letters in the same spot, and `present` letters somewhere. Reject a guess with a message such as `2nd letter must be R` or `Guess must contain E`.
2. **Persist the daily game.** Save the guesses to `localStorage` under a key derived from the answer (or date), and restore them on reload, including the locked rows and key colours. Explain what happens when the word list changes between releases.
3. **Reveal animation.** Flip the tiles one after another when a row is submitted, and update the keyboard colours only after the last tile flips. Keep it testable: the status must be in the DOM immediately, even while the animation plays. Respect `prefers-reduced-motion`.
4. **Share results.** After the game ends, add a `Share` button that copies an emoji grid (🟩🟨⬛) to the clipboard with `navigator.clipboard.writeText`. Handle the permission failing.
5. **Statistics.** Track games played, win percentage, current and best streak, and a guess-distribution histogram across sessions.

## Concepts covered
A pure scoring function with letter counting (two passes) · status precedence (`correct` > `present` > `absent`) · a global `keydown` listener with cleanup · derived state (key colours computed from guesses, not stored) · accessible names that carry colour information · live regions.

Related: J14 Tic-Tac-Toe · J15 Memory Game · S24 Snake (global key handling) · S25 2048 (pure update functions).
