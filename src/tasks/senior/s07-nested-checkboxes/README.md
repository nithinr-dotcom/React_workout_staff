# Nested Checkboxes

## Problem statement
Build a `NestedCheckboxes` component that renders a tree of checkboxes, like a permissions editor or a category filter. Checking a parent checks everything under it. A parent's box always reflects its descendants: **checked** when all of them are checked, **indeterminate** when only some are, and **unchecked** when none are. Parents with children can be expanded and collapsed.

The tree can be any depth. The parent component only cares about which **leaf** ids are selected.

## Clarifying questions to ask
- What is the source of truth: the checked state of every node, or only the leaves? *(Only the leaves. Parent state is always derived.)*
- Can a parent be checked while having zero leaves under it? *(A node with no children, or `children: []`, is itself a leaf.)*
- What does clicking an indeterminate parent do? *(It selects all of its descendant leaves, matching the native checkbox behaviour.)*
- Controlled or uncontrolled? *(Uncontrolled with `defaultSelectedIds`, reporting changes through `onChange`. Controlled mode is a follow-up.)*
- Are parents expanded initially? *(Yes, everything starts expanded.)*
- Does collapsing a parent change what's selected? *(No.)*

## Functional requirements
- [ ] Render one checkbox per node, labelled with `label`, nested under its parent.
- [ ] `defaultSelectedIds` sets the initially selected leaves. Parent states are derived from them. Ids that aren't leaves or don't exist are ignored.
- [ ] Checking a leaf selects it; unchecking deselects it.
- [ ] Checking a parent (from unchecked or indeterminate) selects **all** descendant leaves. Unchecking a checked parent deselects all of them.
- [ ] A parent is checked when all its descendant leaves are selected, indeterminate when some are, and unchecked when none are. This propagates through every ancestor level.
- [ ] Each node with children has a toggle button that expands or collapses its children. All nodes start expanded.
- [ ] Collapsing hides the children but keeps their selection. Re-expanding shows the same state.
- [ ] After every user change, call `onChange` with the selected leaf ids in depth-first tree order. Don't call it on mount.

## Non-functional requirements
- **Accessibility:**
  - Use native `<input type="checkbox">` with a `<label>`.
  - Set the DOM `indeterminate` property through a ref. There is no HTML attribute for it. An indeterminate checkbox is not `checked`.
  - Toggle buttons have `aria-expanded` and `aria-controls` pointing at the group of children, and an accessible name of `Toggle <label>`.
  - Use nested lists (`ul`/`li`) or `role="group"` so the hierarchy is exposed.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between checkboxes and toggle buttons in order |
  | `Space` on a checkbox | Toggle it (native) |
  | `Enter` / `Space` on a toggle button | Expand or collapse (native) |
- **Performance:** a toggle is O(size of the subtree + depth) of work, not a full re-scan per rendered node. The tree may have ~2,000 nodes.
- **Styling:** each level is indented, and the toggle shows a chevron that rotates when expanded.

## Constraints
- 60 minutes. React and CSS Modules only.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface CheckboxNode {
  id: string;
  label: string;
  children?: CheckboxNode[]; // missing or [] → leaf
}
interface NestedCheckboxesProps {
  nodes: CheckboxNode[];
  defaultSelectedIds?: string[];                  // leaf ids
  onChange?: (selectedLeafIds: string[]) => void; // depth-first tree order
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Every node is a `checkbox` whose accessible name is its `label`.
- Checked: `toBeChecked()`. Indeterminate: `toBePartiallyChecked()` (the `indeterminate` DOM property is `true`) and not `toBeChecked()`. Unchecked: neither.
- Every node with children has a `button` named `Toggle <label>` with `aria-expanded="true|false"`.
- Children of a collapsed node are not rendered, or are hidden with the `hidden` attribute (tests use `queryByRole('checkbox', { name })`, which ignores hidden elements; CSS classes are not applied in tests).
- `onChange` receives leaf ids in depth-first order and is not called during the initial render.

## Edge cases
- A parent with `children: []` behaves as a leaf.
- A single child: the parent is never indeterminate.
- Deep trees (5+ levels): the indeterminate state must reach the root.
- `defaultSelectedIds` includes a parent id: ignore it rather than selecting its subtree.
- Duplicate labels in different branches: key everything by `id`.
- `nodes` changes after mount and a selected leaf no longer exists: drop it from the next `onChange`.

## Follow-ups
1. **Controlled mode.** Add `selectedIds` + `onChange` for a parent-owned selection, supporting both modes without duplicating logic.
2. **Search filter.** Add a search box that shows only matching nodes and their ancestors. What should "check parent" mean while a filter hides some children: all descendants, or only the visible ones?
3. **Tree keyboard pattern.** Convert to the [ARIA treeview pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) with `aria-checked="mixed"`, a single tab stop, and arrow-key navigation.
4. **Huge trees.** 50,000 nodes. Where does your current approach spend time? Precompute parent pointers and leaf counts, keep a selected-count per node, and update only ancestors on toggle.
5. **Disabled nodes.** A disabled leaf can't change. How do parent "check all" and the derived state treat it?

## Concepts covered
Recursive components · deriving parent state instead of storing it · `Set` of selected leaves · depth-first traversal · `indeterminate` through a ref effect · stable ordering for `onChange`.

Related: S05 File Explorer · S06 Nested Comments · J02 Accordion.
