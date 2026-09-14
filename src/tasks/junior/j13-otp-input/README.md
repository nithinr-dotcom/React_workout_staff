# OTP Input

## Problem statement
Build an `OtpInput` component for entering a one-time verification code, the kind you see after "We sent a code to +91 98••••••10". It renders one small box per digit. Typing moves through the boxes on its own, Backspace walks back, and pasting a code from an SMS fills every box at once. When the last box is filled, the parent is told the full code so it can verify it.

This is a favourite in Indian product-company rounds because it looks trivial and is full of focus-management and event-ordering traps.

## Clarifying questions to ask
- Digits only, or alphanumeric codes? *(Digits only.)*
- How many boxes? *(Configurable with `length`, default 6.)*
- What happens when the user types into a box that already has a digit? *(The new digit replaces it, then focus advances.)*
- Where does a paste start filling from? *(From the box that has focus, not always from the first box.)*
- Should `onComplete` fire again if the user edits a digit of an already-complete code? *(Yes: any edit that changes the code and leaves every box filled calls it with the new code.)*
- Does the parent control the value? *(No. The component owns the digits. Controlled mode is a follow-up.)*

## Functional requirements
- [ ] Render `length` single-character text boxes (default 6), all empty initially.
- [ ] Typing a digit into a box sets that box's digit and moves focus to the next box. In the last box, focus stays.
- [ ] Typing into a box that already has a digit replaces it with the new digit (then advances).
- [ ] Non-digit characters are ignored: the box value does not change and focus does not move.
- [ ] `Backspace` in a box with a digit clears that box and keeps focus there.
- [ ] `Backspace` in an empty box moves focus to the previous box and clears it. In the first box it does nothing.
- [ ] `ArrowLeft` / `ArrowRight` move focus to the previous / next box without changing any value, and do not wrap.
- [ ] Pasting text strips every non-digit character, then writes the digits into the boxes starting at the focused box. Extra digits beyond the last box are dropped. Focus moves to the box after the last one written, or to the last box.
- [ ] A paste containing no digits changes nothing.
- [ ] `onComplete(code)` is called whenever an edit changes the code and every box is filled. A single paste that fills all boxes calls it exactly once.
- [ ] `onChange(digits)` is called with the array of box values (empty boxes are `''`) whenever the code changes.
- [ ] `disabled` disables every box. `autoFocus` focuses the first box on mount.

## Non-functional requirements
- **Accessibility:**
  - Wrap the boxes in an element with `role="group"` and the accessible name `One-time code`.
  - Each box has the accessible name `Digit N of M` (for example `Digit 2 of 6`).
  - Use `type="text"` with `inputMode="numeric"` so mobile shows a number pad. Don't use `type="number"`: it allows `e`, `+`, `-` and adds spinners.
  - Put `autoComplete="one-time-code"` on the first box so iOS/Android can offer the SMS code.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `0`–`9` | Set the focused box's digit, then focus the next box |
  | `Backspace` | Clear the focused box; if already empty, focus the previous box and clear it |
  | `ArrowLeft` / `ArrowRight` | Move focus to the previous / next box (no wrap) |
  | `Tab` / `Shift+Tab` | Native tab order through the boxes |
  | Paste (`Ctrl/Cmd+V`) | Distribute the pasted digits from the focused box onward |
- **UX:** a clear focus ring on the active box; selecting the box's content on focus is a nice touch so typing always replaces.
- **Robustness:** don't rely only on `keydown` for digits. Mobile virtual keyboards often report `key === "Unidentified"`, and OS autofill arrives as an `input`/`change` event with several characters at once.

## Constraints
- 40 minutes. React and CSS Modules only. No input-mask libraries.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface OtpInputProps {
  length?: number;                          // default 6
  onComplete?: (code: string) => void;
  onChange?: (digits: string[]) => void;
  autoFocus?: boolean;                      // default false
  disabled?: boolean;                       // default false
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The boxes are inside a `group` named `One-time code`.
- Each box is a `textbox` named `Digit N of M` (1-based `N`, `M` = `length`).
- A box's `value` is the digit it holds, or `''` when empty.
- Tests type with `userEvent` (`user.click`, `user.keyboard`) and paste with `user.paste(text)` into the focused box.
- Focus is checked with `toHaveFocus()`.
- `onComplete` is checked with `toHaveBeenCalledTimes` / `toHaveBeenCalledWith`.

## Edge cases
- Pasting `"12-34 56"` fills `123456`.
- Pasting into box 4 of 6 with `"987654"` fills boxes 4–6 with `9`, `8`, `7` and drops the rest.
- Backspace in the first, empty box.
- Typing the same digit that is already in a full code: the code didn't change, so `onComplete` need not fire.
- `length` changing between renders. Don't keep stale refs to removed boxes.
- Fast typing: each keystroke must see the latest digits, not a stale closure.

## Follow-ups
1. **Controlled mode.** Add `value` and `onChange(value: string)` so a parent can reset the code (for example after "Resend code") or prefill it. Support both modes.
2. **Error state.** Add an `error` prop: every box gets `aria-invalid="true"`, a message is linked with `aria-describedby`, and the boxes shake once. Clear the error on the next edit.
3. **Masked / alphanumeric.** Support `mask` (show `•` instead of digits) and `pattern: 'numeric' | 'alphanumeric'`. How does masking interact with paste and screen readers?
4. **Single hidden input.** Rebuild it as one real `<input maxLength={length}>` visually drawn as boxes. Compare it with the one-input-per-digit version for autofill, screen readers and caret handling.

## Concepts covered
Arrays of refs · focus management · `keydown` vs `change` vs `paste` event ordering · `clipboardData` · sanitising input · calling callbacks from event handlers rather than effects.

Related: J02 Accordion (roving focus) · J05 Signup Form · J19 Form Wizard.
