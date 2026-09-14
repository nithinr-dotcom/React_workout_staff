# Calculator

## Problem statement
Build a `Calculator` that behaves like a basic pocket calculator. It has a display and a keypad with the digits `0`–`9`, the four operators, `=`, `AC` (all clear), `⌫` (backspace), `.` (decimal point) and `±` (toggle sign). The physical keyboard works too.

The calculator uses **immediate execution**: each operator is applied as soon as the next operator or `=` is pressed, strictly left to right. So `2 + 3 × 4 =` shows `20`, not `14`. Operator precedence is a follow-up.

Interviewers use this to see how you model a small state machine (entering a number, waiting for the next operand, showing a result, error) and whether you can do it without `eval`.

## Clarifying questions to ask
- Does it follow operator precedence, or evaluate as you go? *(As you go, left to right, like a basic pocket calculator. `2 + 3 × 4 =` is `20`. Precedence is follow-up 1.)*
- What does pressing `=` again do? *(It repeats the last operation with the same second operand: `2 + 3 = =` shows `5`, then `8`.)*
- What happens on divide by zero? *(The display shows `Error`. The next digit or `.` starts a fresh calculation, and `AC` clears it.)*
- What if I press two operators in a row? *(The second one replaces the first: `6 + × 2 =` is `12`.)*
- How do we deal with floating-point noise like `0.1 + 0.2`? *(Results are rounded to at most 12 significant digits, with trailing zeros removed, so the display shows `0.3`.)*
- Is there a digit limit or a history? *(No limit is required. A history tape is a follow-up.)*

## Functional requirements
- [ ] The display starts at `0`.
- [ ] Typing digits builds the current number. A leading `0` is replaced: `0` then `7` shows `7`.
- [ ] `.` adds a decimal point. A second `.` in the same number is ignored. Pressing `.` when a new number is due shows `0.`.
- [ ] Pressing an operator after a number, when an operator is already pending, calculates the pending operation and shows the result (`2 + 3 ×` shows `5`).
- [ ] Pressing an operator straight after another operator replaces it.
- [ ] After an operator or `=`, the next digit starts a new number.
- [ ] `=` calculates the pending operation and shows the result. With nothing pending and no previous operation, it does nothing.
- [ ] Pressing `=` again repeats the last operator and second operand on the current result.
- [ ] Pressing an operator after `=` continues from the result (`2 + 3 = × 2 =` is `10`).
- [ ] Division by zero shows `Error`. While `Error` shows, operators, `=`, `⌫` and `±` do nothing. A digit or `.` starts a fresh calculation.
- [ ] Results show at most 12 significant digits, with trailing zeros removed (`0.1 + 0.2 =` shows `0.3`). Negative numbers use a plain hyphen-minus: `-5`.
- [ ] `⌫` removes the last character of the number being typed. Removing the last digit leaves `0`. It does nothing to a calculated result.
- [ ] `±` negates the displayed number. `0` stays `0`.
- [ ] `AC` resets everything: display `0`, no pending operator, no remembered operation.
- [ ] Keyboard: `0`–`9`, `.`, `+`, `-`, `*`, `/`, `Enter` or `=` (equals), `Backspace` (⌫), `Escape` (AC). It works without focusing the calculator first.
- [ ] No `eval`, `new Function` or other string evaluation.

## Non-functional requirements
- **Accessibility:**
  - Every key is a native `<button>`. Symbol keys need an `aria-label` (see Test contract), because screen readers read `×`, `÷` and `⌫` unreliably.
  - The display is an `<output>` element (implicit role `status`), so results are announced.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `0`–`9`, `.` | Enter a digit or the decimal point |
  | `+` `-` `*` `/` | Choose an operator |
  | `Enter` / `=` | Equals |
  | `Backspace` | Delete the last typed character |
  | `Escape` | All clear |
  | `Tab` then `Enter` / `Space` | Press the focused key (native button behaviour) |

- **Correctness:** keep the maths in a pure function that takes a state and a key and returns the next state. The same function should serve clicks and key presses.
- **Styling:** a 4-column CSS Grid keypad, a right-aligned display that doesn't overflow for long numbers, and a visible focus ring.

## Constraints
- 45 minutes. React and CSS Modules only.
- No `eval`, no `new Function`, no maths or expression-parsing libraries.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type Operator = '+' | '-' | '*' | '/';

interface CalculatorProps {
  precedence?: boolean; // follow-up 1, default false
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The display is the only element with role `status`. Its trimmed text content is exactly the displayed value, for example `0`, `12.5`, `-5` or `Error`. Show any "pending expression" line outside it.
- Keys are `button`s with these accessible names:
  - Digits: `0` … `9`.
  - `Decimal point`, `Toggle sign`, `Add`, `Subtract`, `Multiply`, `Divide`, `Equals`, `All clear`, `Backspace`.
- Tests type on the keyboard with nothing focused, so listen on `document` or `window`.
- Tests spy on `globalThis.eval` and expect it never to be called.

## Edge cases
- `Enter` while a keypad button has focus must not press both that button and `=`.
- Keys pressed with `Ctrl`, `Meta` or `Alt` held (e.g. `Ctrl+R`) must be ignored, not treated as input.
- `=` straight after an operator (`5 + =`): decide what it does. Common calculators use the displayed number as the second operand (`10`).
- `⌫` on `-5` or `0.` should leave `0`, not `-` or an empty display.
- `0 × -5` should show `0`, not `-0`.
- Very large or very small results (`999999999999 × 999999999999`): the display must not break the layout.

## Follow-ups
1. **Operator precedence.** With the `precedence` prop, `=` evaluates the whole expression the user typed with normal precedence, so `2 + 3 × 4 =` is `14`. Tokenise the input and use the shunting-yard algorithm (or two stacks). Still no `eval`.
2. **History tape.** Keep a list of finished calculations such as `2 + 3 = 5`. Clicking an entry loads its result into the display. Cap it at 20 entries.
3. **Memory keys.** Add `MC`, `MR`, `M+` and `M−`, with an `M` indicator on the display while memory holds a non-zero value.
4. **Scientific mode.** Add a toggle that reveals `√`, `x²`, `%`, `1/x` and parentheses. Discuss how parentheses change your state model and why they push you towards follow-up 1's parser.

## Concepts covered
Modelling UI as a state machine with a pure reducer · immediate execution vs precedence parsing · floating-point rounding for display · global `keydown` listeners with cleanup · accessible names for symbol buttons · `<output>` as a live region.

Related: J17 Mortgage Calculator · J07 Stopwatch & Countdown · ST04 Spreadsheet with formulas (expression parsing).
