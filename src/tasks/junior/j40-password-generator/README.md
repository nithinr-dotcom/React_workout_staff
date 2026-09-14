# Password Generator with Strength Meter

## Problem statement
Build a `PasswordGenerator`, like the ones in password managers and signup pages. The user picks a length with a slider and chooses which kinds of characters to include: uppercase, lowercase, numbers and symbols. **Generate** creates a password and shows it in a read-only field. **Copy** puts it on the clipboard and briefly confirms with `Copied!`. A strength meter rates the generated password as `Weak`, `Medium` or `Strong`.

Randomness is injected through a `random` prop so the component can be tested deterministically.

## Clarifying questions to ask
- Is a password generated on first render? *(No. The field is empty until the first click on Generate.)*
- Does changing the settings regenerate automatically? *(No. Only Generate creates a new password. The meter rates the password that is shown.)*
- Which options are checked initially? *(All four.)*
- What is the length range? *(4 to 32, default 12 or `defaultLength`.)*
- What exactly counts as a symbol? *(The 25 characters listed under Data / API contract.)*
- Must every selected set appear in the password? *(Yes, at least one character from each selected set.)*
- What happens if the user tries to uncheck the last checked option? *(It stays checked. Disabling it or ignoring the click are both fine.)*
- How long does `Copied!` stay? *(2 seconds after the latest copy.)*

## Functional requirements
- [ ] A range slider labelled `Length` (min 4, max 32, step 1) starting at `defaultLength`. Show the current value next to it.
- [ ] Four checkboxes labelled `Uppercase`, `Lowercase`, `Numbers` and `Symbols`, all checked initially.
- [ ] At least one checkbox always stays checked.
- [ ] A `Generate` button creates a password of exactly the selected length, using only characters from the selected sets.
- [ ] The password contains at least one character from **each** selected set.
- [ ] Each character is picked from a string `s` as `s[Math.floor(random() * s.length)]`. Use only the injected `random`, never `Math.random` directly.
- [ ] The password is shown in a read-only text input labelled `Password`. It is empty before the first Generate.
- [ ] A `Copy` button writes the password with `navigator.clipboard.writeText`. It is disabled while there is no password.
- [ ] After a successful copy, show the text `Copied!`. It disappears 2 seconds after the latest copy.
- [ ] Once a password exists, show a strength meter named `Password strength` with the visible text `Weak`, `Medium` or `Strong`.
- [ ] Strength rule. Let `classes` be the number of character kinds (uppercase, lowercase, digit, symbol) that actually appear in the password:
  - `Weak`: length < 8, **or** `classes` is 1.
  - `Strong`: length ≥ 12 **and** `classes` ≥ 3.
  - `Medium`: everything else.

## Non-functional requirements
- **Accessibility:**
  - The slider, checkboxes and password field all have visible `<label>`s.
  - The strength indicator uses `role="meter"` (or a native `<meter>`, or a labelled `role="progressbar"`) with an accessible name and a text value. Don't rely on colour alone.
  - `Copied!` is announced politely, e.g. inside `role="status"`.
- **Keyboard:** native controls only: arrow keys move the slider, `Space` toggles checkboxes, `Enter`/`Space` press buttons.
- **Correctness:**
  - Clear the `Copied!` timeout on unmount and when copying again.
  - If the clipboard write fails, don't show `Copied!`.
  - Derive the strength from the password during render. Don't store it in separate state.
- **UX:** a monospace password field, and a coloured bar for the meter as well as the text.

## Constraints
- 40 minutes. React and CSS Modules only. No password or randomness libraries.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface PasswordGeneratorProps {
  random?: () => number; // [0, 1), default Math.random
  defaultLength?: number; // default 12
}
type Strength = 'Weak' | 'Medium' | 'Strong';

// Character sets, in this order:
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';
```
Default-export the component from `Solution.tsx`.

## Test contract
- The slider is a `slider` whose name starts with `Length`. Tests set it with `fireEvent.change(slider, { target: { value: '16' } })`.
- The checkboxes are `checkbox`es named `Uppercase`, `Lowercase`, `Numbers` and `Symbols`.
- `button`s named `Generate` and `Copy`.
- The password is a `textbox` named `Password` with the `readonly` attribute.
- Tests replace `navigator.clipboard` with a stub whose `writeText` resolves, then wait for the text `Copied!`.
- The meter is a `meter` (or `progressbar`) named `Password strength`. The rating is found with `getByText('Weak' | 'Medium' | 'Strong')`.
- Tests inject a seeded `random` and check character membership, length and set coverage. They never assert an exact password, except with `random={() => 0}` and a single set (every pick is the first character of that set).
- Tests use fake timers for the 2-second `Copied!` timeout.

## Edge cases
- Length 4 with all four sets: every character must come from a different set.
- Unchecking options after generating doesn't change the shown password or its rating.
- Copy clicked twice within 2 seconds: `Copied!` stays for 2 seconds after the second click.
- `navigator.clipboard` missing (non-secure context) or `writeText` rejecting.
- A `random` that returns values very close to 1 must never produce an index equal to `s.length`.

## Follow-ups
1. **Secure randomness.** Replace `Math.random` with `crypto.getRandomValues`. Explain why `byte % n` is biased when `n` doesn't divide 256, and remove the bias. Keep `random` injectable for tests.
2. **Exclude ambiguous characters.** Add a checkbox labelled `Exclude ambiguous characters`, unchecked by default. When checked, generated passwords never contain `I`, `l`, `1`, `O`, `0` or `o`.
3. **Passphrase mode.** Add a mode switch that generates `N` random words from a word list, with a separator and an option to capitalise. The strength meter must still make sense.
4. **Entropy-based strength.** Rate strength by estimated entropy (`length × log2(poolSize)`) with thresholds, and show the bits. Explain why counting character kinds overrates `Aa1!aaaaaaaa`.

## Concepts covered
Controlled range and checkbox inputs · enforcing an invariant (at least one option) · injecting randomness for deterministic tests · the Clipboard API and async feedback · timeouts with cleanup · derived values · `role="meter"`.

Related: J05 Signup Form with Validation · J17 Mortgage Calculator · J10 Progress Bar.
