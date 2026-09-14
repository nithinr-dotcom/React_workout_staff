# Accordion

## Problem statement
Build a reusable `Accordion` component. It gets a list of sections, each with a title and content. Clicking a section's header shows or hides its content. By default only one section can be open at a time. With `allowMultiple`, any number of sections can be open.

## Clarifying questions to ask
- Can all sections be closed at once, or must one always stay open? *(Assume all can be closed.)*
- Is the content plain text or arbitrary React nodes? *(Plain strings for now. See the follow-ups.)*
- Should open state be controlled by the parent or owned by the component? *(Owned by the component, with `defaultOpenIds` as the starting value.)*
- Are animations required? *(Nice to have, not required.)*

## Functional requirements
- [ ] Render one header per item, in order.
- [ ] Clicking a header toggles its panel.
- [ ] Single mode (default): opening one section closes the section that was open.
- [ ] `allowMultiple`: sections open and close independently.
- [ ] `defaultOpenIds` sets which sections start open. In single mode only the first id counts.
- [ ] With an empty `items` array, render the text `No sections`.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
  - Each header is a `<button>` inside a heading element.
  - The button has `aria-expanded` and `aria-controls`.
  - The panel has `role="region"` and `aria-labelledby` pointing at its button.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Enter` / `Space` | Toggle the focused section (native button behaviour) |
  | `ArrowDown` / `ArrowUp` | Move focus to the next / previous header, wrapping around |
  | `Home` / `End` | Move focus to the first / last header |
- Collapsed panels are not rendered, or are hidden with the `hidden` attribute.
- **Styling:** a visible focus ring, and a chevron that rotates when a section is open.

## Constraints
- 35 minutes. React and CSS Modules only.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface AccordionItem { id: string; title: string; content: string }
interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;     // default false
  defaultOpenIds?: string[];   // default []
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Each header is a `button` whose accessible name is the item `title`, with `aria-expanded="true|false"`.
- An open panel is a `region` whose accessible name is the item `title` and whose text contains the `content`.
- A closed panel's content is not visible: `not.toBeVisible()` passes, or the panel is not in the DOM.
- An empty list renders the text `No sections`.

## Edge cases
- Duplicate titles: ids must come from `item.id`, never from the title.
- `defaultOpenIds` containing an id that isn't in `items`.
- `items` changing while a removed section was open.
- Two accordions on one page must not share generated ids. Use `useId`.

## Follow-ups
1. **Controlled mode.** Add optional `openIds` and `onChange(openIds)` props. When `openIds` is passed, the parent owns the state. Support both modes without duplicating logic.
2. **Rich content.** `content` may be a `ReactNode`, and panels should mount lazily: a panel's content renders for the first time when it first opens, then stays mounted.
3. **Animation.** Animate the height when opening and closing without measuring the DOM in JavaScript. Hint: `grid-template-rows: 0fr → 1fr`.
4. **Disabled sections.** An item with `disabled: true` cannot be toggled, but its header can still be focused with the arrow keys.

## Concepts covered
Controlled vs uncontrolled state · `Set` for multi-select state · `useId` · refs to a list of elements · the ARIA accordion pattern · roving keyboard focus.

Related: J03 Tabs · ST01 Design-system Select (compound components).
