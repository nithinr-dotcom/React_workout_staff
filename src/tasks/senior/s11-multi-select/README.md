# Multi-select Dropdown

## Problem statement
Build a `MultiSelect` component: a text input that filters a dropdown list of options, where the user can pick any number of them. Selected options appear as removable "chips" next to the input. It must be fully usable with a keyboard and a screen reader, close when the user clicks elsewhere, and be controlled by its parent (`value` / `onChange`).

Think of the "Labels" picker in Jira or the "Assignees" picker in GitHub.

## Clarifying questions to ask
- Controlled or uncontrolled? *(Controlled: the parent passes `value` and receives `onChange(next)`.)*
- Does the list close after each pick? *(No. It stays open so several options can be picked in a row.)*
- Is filtering case-sensitive? Prefix or substring? *(Case-insensitive substring match on `label`.)*
- Should the filter text clear after picking an option? *(Yes.)*
- In what order are chips shown? *(Selection order, i.e. the order of `value`.)*
- Are options loaded asynchronously? *(No, they're passed in. Async loading is a follow-up.)*
- Can the user create new options that aren't in the list? *(No.)*

## Functional requirements
- [ ] Render a visible label and a filter input. The input is the combobox.
- [ ] Render one chip per selected value, in `value` order. Each chip shows the option label and has a remove button.
- [ ] The listbox opens when the user clicks the input, types in it, or presses `ArrowDown`/`ArrowUp` in it.
- [ ] While open, the listbox shows every option whose label contains the filter text (case-insensitive). With no matches, it shows `No options`.
- [ ] Clicking an option toggles it: unselected options are appended to the end of `value`; selected options are removed. The listbox stays open.
- [ ] After toggling an option (by mouse or keyboard) the filter text is cleared and focus stays in (or returns to) the input.
- [ ] One option at a time is "active" (visually highlighted). Keyboard navigation moves the active option; `Enter` toggles it.
- [ ] Clicking a chip's remove button removes that value without opening the listbox, and moves focus to the input.
- [ ] `Backspace` in an empty input removes the last selected value.
- [ ] `Escape` closes the listbox and focus stays on the input.
- [ ] Clicking (pointer down) anywhere outside the component closes the listbox.
- [ ] Options not in `options` but present in `value` are ignored (no chip, not passed back).

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with a listbox popup.
  - The input has `role="combobox"`, `aria-expanded`, `aria-controls` (pointing at the listbox) and `aria-autocomplete="list"`.
  - DOM focus stays in the input. The active option is exposed with `aria-activedescendant` on the input.
  - The popup has `role="listbox"`, `aria-multiselectable="true"` and is labelled by the same label.
  - Each option has `role="option"` and `aria-selected="true|false"`.
  - Chip remove buttons have a descriptive accessible name (not just "×").
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowDown` | Open if closed (active = first option). If open, move active to the next option, wrapping to the first. |
  | `ArrowUp` | Open if closed (active = last option). If open, move active to the previous option, wrapping to the last. |
  | `Home` / `End` | While open, move active to the first / last visible option. |
  | `Enter` | Toggle the active option. |
  | `Escape` | Close the listbox. |
  | `Backspace` | When the input is empty, remove the last selected value. |
  | `Tab` | Close the listbox and move focus on normally. Never trap focus. |
- When the filter text changes, the active option resets to the first match.
- The active option is scrolled into view (`scrollIntoView({ block: 'nearest' })`).
- **Performance:** filtering is derived from props and filter text during render. Don't mirror it in state. It should stay responsive with ~250 options.
- **Styling:** chips wrap onto multiple lines; the active option has a clear highlight distinct from the selected checkmark.

## Constraints
- 70 minutes. React and CSS Modules only. No headless-UI or select libraries.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface MultiSelectOption { value: string; label: string }
interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  value: string[];                   // selection order
  onChange: (next: string[]) => void;
  placeholder?: string;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The input is a `combobox` whose accessible name is `label`, with `aria-expanded="true|false"`.
- The open popup is a `listbox` whose accessible name is `label` and which has `aria-multiselectable="true"`. When closed, `queryByRole('listbox')` returns `null` (not rendered, or hidden with the `hidden` attribute).
- Each option is an `option` whose accessible name is its `label`, with `aria-selected="true|false"`.
- The combobox's `aria-activedescendant` equals the `id` of the active option element.
- Each chip has a `button` named `Remove <label>` (e.g. `Remove React`).
- With no matching options the listbox contains the text `No options`.
- Tests render the component inside a small wrapper that holds `value` in `useState` and also spies on `onChange`.
- Click-outside is simulated with `user.click(document.body)`.

## Edge cases
- Two options with the same label but different values.
- `value` contains an id that isn't in `options`.
- `options` changes while the listbox is open and the active option disappears.
- Filter text that matches nothing, then `Enter` (nothing happens).
- Removing a chip while the listbox is open.
- Two instances on one page must not share ids. Use `useId`.
- A mousedown on an option must not close the listbox before the click registers (blur ordering).

## Follow-ups
1. **Select all.** Add a "Select all" row at the top of the listbox that selects every *visible* (filtered) option, or clears them if all are selected. Expose its mixed state accessibly.
2. **Async options.** Accept `loadOptions(query, { signal })` instead of `options`. Debounce, cancel stale requests, show a loading row, and keep labels for selected values that are no longer in the current results.
3. **Max selections.** Add `maxSelected`. When reached, unselected options become `aria-disabled` and a polite live region announces the limit.
4. **Grouped options.** Support option groups (`role="group"` with a label) while keeping arrow navigation flat across groups.
5. **Large lists.** Options come from a 10,000-row list. What breaks first, and how would you virtualize the listbox while keeping `aria-activedescendant` valid?

## Concepts covered
The combobox/listbox APG pattern · `aria-activedescendant` vs roving tabindex · controlled components · click-outside with a document listener and refs · blur vs mousedown ordering · derived state.

Related: S02 Autocomplete · J02 Accordion · S01 Modal Dialog (focus management).
