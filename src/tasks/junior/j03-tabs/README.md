# Tabs

## Problem statement
Build a reusable `Tabs` component. It gets a list of tabs, each with a label and content. It shows a row of tab buttons and the content of the selected tab.

Getting a row of buttons working takes ten minutes. What the interviewer is checking is whether you know the WAI-ARIA tabs pattern: the roles, the relationships between tabs and panels, and the keyboard model where only one tab is in the page's Tab order.

## Clarifying questions to ask
- Does moving focus with the arrow keys also select the tab, or does the user press `Enter`? *(It selects the tab straight away. This is called automatic activation. Manual activation is a follow-up.)*
- Horizontal or vertical? *(Horizontal. Vertical is a follow-up.)*
- Who owns the selected tab, the parent or the component? *(The component, starting from `defaultTabId`.)*
- Do hidden panels stay mounted? *(Either is fine for now.)*
- Is there always at least one tab? *(No. Handle an empty list.)*

## Functional requirements
- [ ] Render one tab per item, in order, inside a tab list.
- [ ] Exactly one tab is selected. On first render it's the tab with `defaultTabId`, or the first tab if that id is missing or unknown.
- [ ] Clicking a tab selects it.
- [ ] Only the selected tab's panel is shown.
- [ ] Arrow keys, `Home` and `End` move focus between tabs and select the newly focused tab (see the table below).
- [ ] With an empty `tabs` array, render the text `No tabs`.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
  - The container has `role="tablist"`. Each tab is a `<button>` with `role="tab"`, `aria-selected` and `aria-controls` pointing at its panel.
  - Each panel has `role="tabpanel"` and `aria-labelledby` pointing at its tab.
  - **Roving tabindex:** the selected tab has `tabIndex=0` and every other tab has `tabIndex=-1`. Pressing `Tab` from outside lands on the selected tab, and pressing `Tab` again leaves the tab list.
  - The panel has `tabIndex=0`, so keyboard users can reach it even when its content has nothing focusable.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowRight` | Focus and select the next tab. Wraps from last to first. |
  | `ArrowLeft` | Focus and select the previous tab. Wraps from first to last. |
  | `Home` / `End` | Focus and select the first / last tab |
  | `Tab` | Move focus out of the tab list and into the active panel |
- Inactive panels are not rendered, or are hidden with the `hidden` attribute.
- **Ids:** two `Tabs` on one page must not produce duplicate ids.
- **Styling:** a clear indicator for the selected tab, and a visible focus ring.

## Constraints
- 35 minutes. React and CSS Modules only.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface TabItem { id: string; label: string; content: string }
interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string; // falls back to the first tab
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- One `tablist`. Each tab is a `tab` whose accessible name is its `label`, with `aria-selected="true|false"`.
- Selected tab: `tabindex="0"`. Other tabs: `tabindex="-1"`.
- The visible panel is a `tabpanel` whose accessible name is the selected tab's label and whose text contains its `content`. Exactly one `tabpanel` is accessible at a time. Hidden panels are not counted.
- Each tab's `aria-controls` matches the `id` of its panel.
- After the tabs, pressing `Tab` moves focus to the `tabpanel`.
- An empty list renders the text `No tabs`.

## Edge cases
- `defaultTabId` that doesn't match any tab.
- A single tab: the arrow keys keep focus on it.
- Duplicate labels: ids must come from `tab.id`.
- The `tabs` prop changes and the selected tab is removed. Fall back to the first tab instead of rendering nothing.

## Follow-ups
1. **Manual activation.** Add `activation?: 'automatic' | 'manual'`. In manual mode the arrow keys only move focus, and `Enter` or `Space` selects the focused tab. How does the roving tabindex change?
2. **Controlled mode.** Add optional `selectedId` and `onChange(id)` props, so a parent can own the selection (for example, to sync it with the URL).
3. **Lazy panels.** `content` becomes a `ReactNode`. A panel's content mounts the first time its tab is selected and then stays mounted, so its state survives switching tabs.
4. **Vertical orientation.** Add `orientation?: 'horizontal' | 'vertical'`. Vertical tabs use `ArrowUp` / `ArrowDown` and set `aria-orientation` on the tab list.
5. **Compound API and closable tabs.** Razorpay and Atlassian ask this version. Redesign the API as compound components (`<Tabs><Tabs.List><Tabs.Tab id>…</Tabs.List><Tabs.Panel id>…</Tabs.Panel></Tabs>`) that share state through context. Support both controlled and uncontrolled use. Let the user add and close tabs at runtime; when the selected tab closes, select its neighbour and move focus to it. Why compound components rather than an `items` prop? When would `useReducer` help?

## Concepts covered
The ARIA tabs pattern · roving tabindex · refs to a list of elements · `useId` for id relationships · automatic vs manual activation · deriving a valid selection from props.

Related: J02 Accordion · J12 Image Carousel · ST01 Design-system Select.
