# Transfer List

## Problem statement
Build a `TransferList`: two side-by-side lists of checkable items with buttons between them. This is the "dual listbox" you see in permission editors and column pickers. Users tick items in either list and move them to the other side. Each list has a **select all** checkbox. It is checked when every item in that list is ticked, unchecked when none are, and **indeterminate** when only some are.

## Clarifying questions to ask
- Where do moved items go in the destination list? *(Appended to the end, in the order they appeared in the source list.)*
- Do moved items stay ticked? *(No. They arrive unticked.)*
- Is the order of each list otherwise preserved? *(Yes. Moving items never reorders the items that stay.)*
- Are items unique? *(Yes, plain strings that are unique across both lists. Generic items with ids are a follow-up.)*
- Are the initial props controlled? *(No. They're initial values only, and the component owns the lists after mount.)*

## Functional requirements
- [ ] Render two lists titled `leftTitle` (default `Available`) and `rightTitle` (default `Selected`), each item with a checkbox.
- [ ] Ticking or unticking an item's checkbox toggles its selection.
- [ ] Four buttons between the lists:
  - `Move selected right` moves the ticked items from left to right.
  - `Move selected left` moves the ticked items from right to left.
  - `Move all right` moves every left item to the right.
  - `Move all left` moves every right item to the left.
- [ ] Moved items are appended to the destination in source order, and arrive unticked.
- [ ] Selections in the other list are not affected by a move.
- [ ] Disable `Move selected …` when nothing is ticked in its source list. Disable `Move all …` when its source list is empty.
- [ ] Each list has a `Select all` checkbox:
  - checked when every item in that list is ticked (and the list isn't empty)
  - unchecked when none are
  - **indeterminate** when some but not all are
  - clicking it when unchecked or indeterminate ticks everything; clicking it when checked unticks everything
  - disabled when the list is empty
- [ ] An empty list shows the text `No items`.

## Non-functional requirements
- **Accessibility:**
  - Each list is a `<fieldset>` whose `<legend>` is the list title, or an element with `role="group"` and `aria-labelledby`.
  - Each item checkbox is labelled by the item text.
  - The move buttons may show arrows (`>`, `>>`) but must have the full accessible names above (`aria-label`).
  - Set the indeterminate state through the DOM `indeterminate` property. It has no HTML attribute, so you'll need a ref.
  - Consider showing a `2/5 selected` count next to each title. Keep it outside the `<legend>`, so the group's accessible name stays exactly the title.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between checkboxes and buttons |
  | `Space` | Toggle the focused checkbox (native) |
  | `Enter` / `Space` | Activate the focused move button (native) |

- **Performance:** keep selection lookups O(1), for example with a `Set`. Lists of about 1,000 items should still feel instant.
- **Styling:** two equal columns with the buttons stacked between them. On narrow screens, stack everything vertically.

## Constraints
- 40 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface TransferListProps {
  leftItems: string[];   // initial left items
  rightItems: string[];  // initial right items
  leftTitle?: string;    // default 'Available'
  rightTitle?: string;   // default 'Selected'
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Each list is a `group` named by its title (`Available` / `Selected` by default). Tests scope queries with `within(getByRole('group', { name }))`.
- Inside a group:
  - each item is a `checkbox` named by the item text
  - the select-all box is a `checkbox` named `Select all`
  - tests read item order from all the checkboxes in the group, excluding `Select all`
- The partially selected state is checked with `toBePartiallyChecked()`, which reads the `indeterminate` property or `aria-checked="mixed"`.
- `button`s named `Move selected right`, `Move selected left`, `Move all right` and `Move all left`.
- An empty list contains the text `No items`.

## Edge cases
- Moving every item out of a list: the select-all box must become unchecked and disabled, not stay checked.
- Ticking every item one by one should check select-all.
- Ticking items in both lists, then moving right: the right list's existing ticks are kept, and moved items arrive unticked.
- Both initial lists empty.

## Follow-ups
1. **Add item.** Each list gets a text input and an `Add` button (or Enter) that appends a new item. Reject blank and duplicate names with an inline error.
2. **Filter.** Add a search box above each list that filters visible items. What should `Select all` and `Move selected` do with ticked items that are filtered out? Justify your choice.
3. **Generic items.** Make the component generic: `TransferList<T>` with `getKey` and `renderItem` props, and a controlled mode (`value` + `onChange`).
4. **Listbox semantics.** Rebuild each list as an APG multi-select `listbox` with `Shift+Arrow` range selection, instead of checkboxes. Compare the two in the design discussion.

## Concepts covered
Keeping two lists and two selections in sync · `Set`-based selection · the indeterminate checkbox (a DOM property with no attribute) · deriving disabled states instead of storing them · immutable array updates.

Related: J01 Todo List · J02 Accordion.
