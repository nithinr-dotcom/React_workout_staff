# Masked Input (card / phone)

## Problem statement
Build a `MaskedInput` that formats what the user types according to a `mask`. In the mask, `#` is a digit slot and every other character is a literal. For example, with `(###) ###-####` typing `4155552671` shows `(415) 555-2671`. The parent receives only the raw digits through `onChange`.

Formatting on every keystroke is the easy half. The hard half, and what interviewers probe, is keeping the **caret** where the user expects it when they edit in the middle, delete next to a literal, or paste.

## Clarifying questions to ask
- Which placeholder characters exist? *(Only `#` for a digit. Letters are a follow-up.)*
- Are trailing literals shown before the user types the next digit? *(No. Literals appear only when a digit follows them, so `415` shows `(415`, not `(415) `.)*
- What happens to digits beyond the mask's capacity? *(They're dropped.)*
- Controlled or uncontrolled? *(Uncontrolled with `defaultValue` (raw digits) and `onChange(raw)`. Controlled is a follow-up.)*
- When exactly is `onChange` called? *(Whenever the raw digits change, and only then.)*
- Should non-digit keystrokes show an error? *(No. They're silently ignored.)*

## Functional requirements
- [ ] Render a text input labelled `label`, with `inputMode="numeric"` and the given `placeholder` and `autoComplete`.
- [ ] The displayed value is the raw digits poured into the mask's `#` slots from left to right. A literal is shown only if at least one digit comes after it in the mask (leading literals like `(` appear with the first digit).
- [ ] Non-digit characters the user types or pastes are ignored.
- [ ] Digits beyond the number of `#` slots are dropped.
- [ ] `defaultValue` (raw digits) is formatted on first render.
- [ ] `onChange(rawDigits)` is called whenever the raw digits change, and not when they don't (e.g. typing a letter, or typing when the mask is full).
- [ ] **Caret, insertion:** typing a digit in the middle inserts it at that position, shifts later digits right, and leaves the caret immediately after the inserted digit. If the mask is already full, nothing changes and the caret doesn't jump to the end.
- [ ] **Caret, deletion:** `Backspace` directly after a literal deletes the digit before that literal (not the literal), and `Delete` directly before a literal deletes the digit after it. Afterwards the caret sits where the deleted digit was (e.g. `4242 |4242` + `Backspace` → `424|4 242`).
- [ ] **Selection:** typing or pasting over a selected range replaces the digits in that range.
- [ ] **Paste:** pasting text extracts its digits and inserts them at the caret (or over the selection). Only as many pasted digits as there are free slots are inserted; existing digits are never pushed out. The caret ends after the last inserted digit.

## Non-functional requirements
- **Accessibility:**
  - A real `<label>` associated with the input. The mask should be discoverable: set `placeholder` or an `aria-describedby` hint such as "Format: (###) ###-####".
  - Don't set `maxLength` to the formatted length and call it done: it breaks paste of unformatted text.
  - Screen readers announce the input's value; avoid re-writing it on every render when nothing changed.
- **Mobile:** `inputMode="numeric"` for the digit keypad. Android keyboards often send `insertText`/composition events instead of `keydown`, so derive changes from the input's value (via `onChange`/`beforeinput`), not only from key codes.
- **Performance:** formatting is O(mask length). Don't format twice per keystroke.
- **Styling:** use a monospace or `font-variant-numeric: tabular-nums` so digits don't jump.

## Constraints
- 60 minutes. React and CSS Modules only. No masking libraries (`imask`, `react-input-mask`, `cleave.js`).
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface MaskedInputProps {
  label: string;
  mask: string;                        // '#' = digit, anything else literal
  defaultValue?: string;               // raw digits
  onChange?: (rawDigits: string) => void;
  placeholder?: string;
  autoComplete?: string;
}
```
Default-export the component from `Solution.tsx`.

Formatting examples:

| mask | raw digits | display |
|---|---|---|
| `#### #### #### ####` | `42424` | `4242 4` |
| `#### #### #### ####` | `4242` | `4242` |
| `(###) ###-####` | `4` | `(4` |
| `(###) ###-####` | `415` | `(415` |
| `(###) ###-####` | `4155` | `(415) 5` |
| `(###) ###-####` | `4155552671` | `(415) 555-2671` |
| `##/##` | `12` | `12` |

## Test contract
- The input is a `textbox` named by `label`. Tests read `input.value` and `input.selectionStart`.
- Typing uses `userEvent.type`/`userEvent.keyboard`; pasting uses `userEvent.paste`.
- Caret tests set the caret with `user.type(input, text, { initialSelectionStart, initialSelectionEnd })` or `input.setSelectionRange()`, then assert `selectionStart` inside `waitFor`, so setting the caret in `useLayoutEffect`, `useEffect` or `requestAnimationFrame` all work.
- `onChange` is a spy. Tests assert its last call and, where stated, its call count.

## Edge cases
- The mask starts with literals (`(`) or ends with literals (`)`).
- Consecutive literals (`) ` in a phone mask) when deleting backwards.
- Selecting everything and typing one digit.
- Pasting into a full input (nothing changes, no `onChange`).
- Pasting `+1 (415) 555-2671`: the leading country code digit is kept as a normal digit. Decide and state what you'd do in production.
- Browser autofill writes a fully formatted value in one go.
- Undo (`Cmd+Z`) after reformatting. What does the browser do with a programmatically set value?

## Follow-ups
1. **Card brand detection.** Detect Visa (`4`), Mastercard (`51–55`, `2221–2720`), Amex (`34`, `37`) from the leading digits, show the brand, and switch Amex to the `#### ###### #####` mask while keeping the caret stable.
2. **Luhn validation.** Validate card numbers with the Luhn checksum on blur, expose the error with `aria-invalid` and `aria-describedby`.
3. **Controlled mode.** Add `value` (raw digits) and support both modes. What happens to the caret when the parent rewrites the value?
4. **Custom tokens.** Support `A` (letter) and `*` (alphanumeric) slots, e.g. UK postcodes or licence plates, via a token map prop.
5. **Composition and IME.** Explain what breaks with composition events and Android GBoard, and how `beforeinput` with `inputType` helps.

## Concepts covered
Raw vs display value · mapping caret positions between raw and formatted strings · `selectionStart`/`setSelectionRange` · `useLayoutEffect` to avoid caret flicker · `onPaste` and `ClipboardEvent` · `beforeinput`/`inputType` · uncontrolled vs controlled inputs.

Related: J23 debounce (input events) · S11 Multi-select Dropdown · S02 Autocomplete.
