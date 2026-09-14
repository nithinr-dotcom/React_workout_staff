# Design-system Select / Combobox

## Problem statement
You're on the design-system team. Product teams keep building their own dropdowns, and each one breaks keyboard and screen-reader users in a different way. Build the `Select` that replaces them all.

It's a **compound component**: consumers compose the parts they need.

```tsx
<Select defaultValue="banana" name="fruit" onValueChange={track}>
  <Select.Label>Fruit</Select.Label>
  <Select.Trigger placeholder="Pick a fruit" />
  <Select.Options>
    <Select.Option value="apple">Apple</Select.Option>
    <Select.Option value="banana">Banana</Select.Option>
    <Select.Option value="durian" disabled>Durian</Select.Option>
  </Select.Options>
</Select>
```

It must work controlled and uncontrolled, implement the WAI-ARIA **select-only combobox** pattern (including typeahead), and submit its value with a native `<form>`. The popup renders inline (no portal) and is positioned under the trigger with CSS.

In a staff round the working component is half the job. The other half is defending the API: why compound components, how parts talk to each other, and how the API will change over time.

## Clarifying questions to ask
- Single or multiple selection? *(Single. Multi-select is a follow-up.)*
- Can the user type free text, or only pick from options? *(Select-only. There's no text input. Typing jumps to matching options.)*
- Must the popup escape `overflow: hidden` ancestors (portal)? *(Not for the base version. Render it inline and discuss the tradeoff.)*
- Can options be wrapped in arbitrary elements or fragments (groups, separators)? *(Assume options may be nested inside other elements. Don't rely on `Children.map` over direct children only.)*
- What does the trigger show before the popup has ever opened? *(The selected option's label. The component must know option labels even while the listbox is closed.)*
- Is `onValueChange` called when a controlled parent passes a new `value`? *(No. It's called only for user interaction.)*

## Functional requirements
- [ ] `Select.Trigger` renders the combobox. It shows the selected option's label, or `placeholder` when nothing is selected.
- [ ] `Select.Label` labels the combobox.
- [ ] Clicking the trigger toggles the listbox. The listbox contains one option per `Select.Option`, in document order.
- [ ] Clicking an enabled option selects it, calls `onValueChange(value)`, closes the listbox and keeps focus on the combobox.
- [ ] Uncontrolled: `defaultValue` sets the initial selection and the component owns the state after that.
- [ ] Controlled: when `value` is defined (including `null`), the displayed selection always follows `value`. User picks only call `onValueChange`.
- [ ] Disabled options can't be selected by mouse or keyboard, and keyboard navigation skips them.
- [ ] Keyboard support as in the table below, including **typeahead**: typing characters in quick succession (within ~500 ms of each other) moves to the first enabled option whose label starts with the typed string, case-insensitively.
- [ ] Clicking outside, or the combobox losing focus, closes the listbox without changing the value.
- [ ] With `name`, the current value is part of the surrounding form's submission (`new FormData(form).get(name)`). When nothing is selected the submitted value is `''`.
- [ ] `disabled` on the root makes the combobox non-interactive (`aria-disabled="true"`, or native `disabled` if you use a button).

## Non-functional requirements
- **Accessibility:** follow the [APG select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).
  - The trigger has `role="combobox"`, `aria-expanded`, `aria-controls` (pointing at the listbox), `aria-haspopup="listbox"` and is labelled by `Select.Label`.
  - DOM focus **stays on the combobox** while the listbox is open. The active option is conveyed with `aria-activedescendant`.
  - The listbox has `role="listbox"`. Each option has `role="option"`, a unique id, `aria-selected`, and `aria-disabled="true"` when disabled.
  - The active option is visually distinct from the selected option.
- **Keyboard:**

  | Key | Closed | Open |
  |---|---|---|
  | `ArrowDown` / `ArrowUp` | Open; the active option is the selected one (or the first enabled) | Move active option to the next / previous enabled option (no wrap) |
  | `Enter` / `Space` | Open | Select the active option and close |
  | `Home` / `End` | Open with first / last enabled option active | Move to first / last enabled option |
  | `Escape` | — | Close without changing the value |
  | `Tab` | Normal tab order | Select the active option, close, and move focus on |
  | Printable characters | Open and typeahead | Typeahead |

- **Performance:** a Select with 500 options opens without noticeable delay. Moving the active option must not re-render every option. Be ready to say how you'd verify that.
- **Multiple instances:** two Selects on one page never share ids (`useId`).
- **Styling:** visible focus ring. The active option scrolls into view.

## Constraints
- 110 minutes. React and CSS Modules only. No headless UI libraries.
- No portal for the base version.
- `types.ts` is the **minimal** contract that tests rely on. You may add props or parts (for example `onOpenChange` or `Select.Group`) but don't break what's there.
- Default-export `Select` from `Solution.tsx`, with `Label`, `Trigger`, `Options` and `Option` attached as static properties.

## Data / API contract
```ts
interface SelectRootProps {
  value?: string | null;          // controlled; null = nothing selected
  defaultValue?: string | null;   // uncontrolled initial value
  onValueChange?: (value: string) => void;
  name?: string;                  // form field name
  disabled?: boolean;
  children: ReactNode;
}
interface SelectLabelProps { children: ReactNode }
interface SelectTriggerProps { placeholder?: string; className?: string }
interface SelectOptionsProps { children: ReactNode; className?: string }
interface SelectOptionProps {
  value: string;
  disabled?: boolean;
  textValue?: string;             // typeahead / trigger text when children isn't a string
  children: ReactNode;
}
interface SelectComponent extends FC<SelectRootProps> {
  Label: FC<SelectLabelProps>;
  Trigger: FC<SelectTriggerProps>;
  Options: FC<SelectOptionsProps>;
  Option: FC<SelectOptionProps>;
}
```

## Test contract
- The trigger is found with `getByRole('combobox', { name: <label text> })`. Its text content contains the selected label or the placeholder.
- The trigger has `aria-expanded="true|false"`.
- While closed, `queryByRole('listbox')` returns `null`. Unmount the listbox or hide it with `hidden` / `display: none`.
- While open, options are found with `getByRole('option', { name: <label> })`. Decorations such as check marks must be `aria-hidden` or pure CSS, so an option's accessible name equals its label. The selected option has `aria-selected="true"` and a disabled option has `aria-disabled="true"`.
- The active option is the element whose `id` equals the combobox's `aria-activedescendant`.
- After a click selection, the combobox has focus.
- Form test: the Select is rendered inside a `<form>` and the test reads `new FormData(form).get(name)`.
- Typeahead tests type with `user.keyboard('bl')` with no delay between keys.

## Edge cases
- `defaultValue` or `value` that matches no option: show the placeholder, and don't crash.
- Options that mount or unmount while the listbox is open (async-loaded options).
- The selected option is disabled: it still displays as selected, but can't be re-selected.
- Every option is disabled: arrow keys do nothing, and nothing is active.
- Typeahead where several options share a prefix (`Blueberry`, `Blackberry`): repeating the same character (`b`, `b`) cycles through matches.
- Controlled parent that ignores `onValueChange`: the UI must not drift from `value`.
- Two Selects with the same option values on one page.

## Follow-ups
1. **`asChild` / polymorphic trigger.** Let consumers render their own element as the trigger (`<Select.Trigger asChild><MyButton/></Select.Trigger>`) while keeping all ARIA, refs and handlers. Discuss prop merging, ref composition and the TypeScript cost.
2. **Portal + collision handling.** Render the listbox in a portal so it escapes `overflow: hidden`, flipping above the trigger when there isn't room. How do outside-click and focus logic change? (See ST02.)
3. **Multi-select.** `Select multiple` with `value: string[]`. Which keyboard and ARIA semantics change? Is it still the same component?
4. **Virtualized options.** Support 10,000 options. What breaks with `aria-activedescendant` when the active option isn't in the DOM?
5. **Searchable combobox.** Add an editable input that filters the options (APG "combobox with listbox popup"). Which parts of your internals are reusable?

## Concepts covered
Compound components with context · controlled vs uncontrolled state in one hook · collection registration (knowing option labels while closed) · `aria-activedescendant` focus management · typeahead buffers with timers · hidden inputs for form participation · `useId`.

Related: J02 Accordion · ST02 Popover positioning · ST08 Form Builder.

## Design discussion prompts
- Why compound components rather than an `options={[...]}` prop? When would you offer both, and how do you keep them from diverging?
- How does `Select.Trigger` know the label of the selected option before `Select.Options` has ever rendered? Compare context registration, `Children` traversal, and a separate data prop.
- How do you keep every option from re-rendering when the active option changes? What does your context value look like?
- What's your versioning and deprecation strategy if you later need to rename `onValueChange` or change `null` semantics?
- How would you test the accessibility contract across 40 consuming teams? Where do unit tests stop and axe or screen-reader manual testing start?
- A team says "the dropdown is clipped inside our modal". Walk through the options: portal, `position: fixed`, the top layer (`popover` attribute or `<dialog>`). What are the tradeoffs?
- How would you migrate 200 usages of three legacy dropdowns to this one? Consider codemods, adapters and metrics.
- What would you expose for styling: `className` per part, data attributes (`data-state="open"`), CSS variables, or style props? Why?
