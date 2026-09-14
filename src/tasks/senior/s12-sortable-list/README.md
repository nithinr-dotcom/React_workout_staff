# Sortable Drag & Drop List

## Problem statement
Build a `SortableList`: a vertical list whose items can be reordered. Mouse and touch users drag items to a new position. Keyboard and screen-reader users get an equivalent flow: pick an item up, move it with the arrow keys, then drop it or cancel. Every step is announced in a live region. When a reorder is committed, the component calls `onReorder` with the new order.

This is the interaction behind a Jira backlog, a Trello column or a playlist editor. Interviewers usually let you choose between the HTML5 Drag and Drop API and pointer events, then push hard on the keyboard path.

## Clarifying questions to ask
- Who owns the order after mount? *(The component. `items` is the initial order; `onReorder` reports committed changes.)*
- Is `onReorder` called on every intermediate move or only on drop? *(Only when a reorder is committed, i.e. dropped. Never on cancel.)*
- Should a keyboard move reorder the list live, or only show a placeholder? *(Live: the item moves in the DOM as the user presses arrows.)*
- Is dragging between multiple lists required? *(No. See the follow-ups.)*
- Horizontal lists? *(Vertical only.)*
- Touch support? *(Nice to have. Pointer events give it for free.)*

## Functional requirements
- [ ] Render the items in order as a list. Each item shows its label and a drag handle button.
- [ ] **Pointer:** dragging an item (by the handle or the whole row, your choice) and releasing it over another position moves it there and calls `onReorder` once with the new order. The dragged item is visually distinct and the drop position is indicated.
- [ ] **Keyboard grab:** `Space` on a handle picks the item up. The handle reports the grabbed state and the live region announces it.
- [ ] **Keyboard move:** while grabbed, `ArrowUp` / `ArrowDown` move the item one position. The list reorders immediately, focus stays on the moved item's handle, and each move is announced.
- [ ] Moving past the first or last position does nothing (no wrap).
- [ ] **Keyboard drop:** `Space` while grabbed drops the item, calls `onReorder` once with the new order, and announces the drop. If the final position equals the starting position, still announce the drop but do not call `onReorder`.
- [ ] **Keyboard cancel:** `Escape` while grabbed restores the order from before the grab, does not call `onReorder`, and announces the cancellation.
- [ ] Arrow keys do nothing to the order when no item is grabbed.
- [ ] Pressing `Tab` / `Shift+Tab` while grabbed cancels the grab (same as `Escape`) and lets focus move on normally. Careful: don't implement this as "cancel on blur" without checking, because some browsers blur an element while React moves its DOM node.

## Non-functional requirements
- **Accessibility:**
  - The list is a `<ul>`/`<ol>` (role `list`) named by `label`; items are `listitem`s.
  - Each handle is a `<button>` named `Reorder <label>`, with `aria-pressed="true"` while its item is grabbed and `"false"` otherwise.
  - Handles have `aria-describedby` pointing at hidden instructions (e.g. "Press Space to pick up, arrow keys to move, Space to drop, Escape to cancel").
  - One polite live region (`role="status"`) carries announcements. Each announcement **replaces** the previous text.
  - Announcement strings (positions are 1-based, `n` = item count):

    | Event | Text |
    |---|---|
    | Grab | `Picked up <label>. Position <p> of <n>.` |
    | Move | `<label> moved to position <p> of <n>.` |
    | Drop | `<label> dropped at position <p> of <n>.` |
    | Cancel | `Reorder cancelled. <label> returned to position <p> of <n>.` |
- **Keyboard:**

  | Key | Not grabbed | Grabbed |
  |---|---|---|
  | `Tab` / `Shift+Tab` | Move between handles (native) | Cancels the grab, then moves focus |
  | `Space` | Pick up the focused item | Drop the item |
  | `ArrowUp` / `ArrowDown` | Nothing | Move the item one position up / down |
  | `Escape` | Nothing | Cancel and restore the original position |
- **Focus:** after every keyboard move the moved item's handle must still have DOM focus. Re-ordering DOM nodes can drop focus in some browsers, so verify it.
- **Performance:** moving one item must not remount other items (stable `key`s). Pointer-move handlers should not cause a full re-render on every pixel; only re-render when the target index changes.
- **Styling:** grabbed item is lifted (shadow/outline); drop indicator line during pointer drag; `cursor: grab`/`grabbing`; respects `prefers-reduced-motion` if you animate.

## Constraints
- 75 minutes. React and CSS Modules only. No drag-and-drop libraries (`dnd-kit`, `react-beautiful-dnd`, etc.).
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface SortableItem { id: string; label: string }
interface SortableListProps {
  items: SortableItem[];                          // initial order
  onReorder?: (items: SortableItem[]) => void;    // committed reorders only
  label?: string;                                 // default "Sortable list"
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The list is a `list` named by `label`; each item is a `listitem` whose text contains its label. Tests read the order from `getAllByRole('listitem')`.
- Each handle is a `button` named `Reorder <label>` with `aria-pressed="true|false"`.
- The live region is the single element with `role="status"`; tests assert its full text with `toHaveTextContent` using the exact strings above.
- Tests focus a handle with `.focus()` and drive the keyboard with `user.keyboard(' ')`, `{ArrowDown}`, `{ArrowUp}`, `{Escape}`. Space may be handled either on `keydown` or through the native button `click`; both work with `userEvent`.
- `onReorder` is asserted with the array of item objects in the new order.
- Pointer dragging is not covered by the automated tests (jsdom has no layout). Verify it in the Playground.

## Edge cases
- A single-item list: grab and drop announce position 1 of 1, and `onReorder` is not called.
- Grab, move down, move back up, drop: the order is unchanged, so `onReorder` is not called.
- `Escape` after several moves restores the order from before the grab, not the previous step.
- Pressing `Space` on a different handle while one item is grabbed (e.g. via mouse click): drop or cancel the first one consistently.
- Pointer drag released outside the list: cancel.
- Labels containing the same words (don't match items by label).

## Follow-ups
1. **Multiple lists.** Allow dragging items between two lists (e.g. "Backlog" and "Sprint"), by pointer and by keyboard (`ArrowLeft`/`ArrowRight` moves to the other list). Who owns the state now?
2. **Controlled mode.** Add `order`/`onReorder` controlled props so the parent can persist and roll back (e.g. a failed PATCH). Handle an optimistic update that the server rejects.
3. **Animation.** Animate items sliding into place when the order changes using the FLIP technique, without a library. Respect `prefers-reduced-motion`.
4. **Auto-scroll.** In a scrollable container with 200 items, auto-scroll when a pointer drag nears the top or bottom edge. How do you keep it smooth?
5. **Touch.** HTML5 DnD doesn't fire on touch devices. Explain the trade-offs between HTML5 DnD and pointer events and what you'd ship.

## Concepts covered
HTML5 DnD (`draggable`, `dataTransfer`, `dragover` + `preventDefault`) vs pointer events with `setPointerCapture` · keyboard-accessible drag alternatives · `aria-live` announcements · focus preservation across DOM moves · stable keys · immutable array move.

Related: S18 Kanban Board · S13 Selectable Cells (pointer tracking) · S01 Modal Dialog (focus management).
