# Undoable Counter

## Problem statement
Build an `UndoableCounter`. It shows a number and four operation buttons: `/2`, `-1`, `+1` and `x2`. Every operation is recorded, so the user can **Undo** it and **Redo** it again. A history table lists the operations that are currently applied, newest first, for example `+1 | 4 → 5`.

This is the smallest possible version of the undo/redo model behind text editors, drawing tools and form builders. Get the stack rules right here and S20 Undo/Redo Canvas becomes much easier.

## Clarifying questions to ask
- Does `/2` round? *(No. Use plain division, so `1 /2` gives `0.5`.)*
- What happens to redo after undoing and then doing something new? *(The redo stack is cleared, as in every editor.)*
- Does the history table show undone operations? *(No. It shows only the operations that are currently applied. An undone row disappears and comes back on redo.)*
- Is there a limit on history size? *(Not for the base version. See the follow-ups.)*
- Is there a Reset button? *(No.)*

## Functional requirements
- [ ] Show the current count, starting at `initialValue`.
- [ ] Four buttons, in this order: `/2`, `-1`, `+1`, `x2`. Each applies its operation to the count.
- [ ] Every operation is recorded as an entry `{ operation, oldValue, newValue }`.
- [ ] `Undo` restores the value from before the most recent applied operation. It moves that entry to the redo stack.
- [ ] `Redo` re-applies the most recently undone operation. It moves that entry back to the history.
- [ ] Undo and Redo can be repeated for many steps.
- [ ] Applying a new operation after an undo clears the redo stack.
- [ ] `Undo` is disabled when there is nothing to undo. `Redo` is disabled when there is nothing to redo.
- [ ] A table named `History` has two columns, `Operation` and `Result`. It has one row per applied operation, **newest first**. The Result cell reads `old → new`, e.g. `4 → 5`.

## Non-functional requirements
- **Accessibility:**
  - Use native `<button>`s with the visible labels above, and set `disabled` for unavailable actions.
  - The count sits in a polite live region, e.g. `<output>` or `role="status"`, so screen readers announce changes.
  - The history is a real `<table>` with a `<caption>` (or `aria-label`) and `<th>` headers.
- **Keyboard:** native button behaviour. Shortcuts are a follow-up.
- **Correctness:**
  - Keep the count, history and redo stack in one place, e.g. a `useReducer`, so they can't get out of sync.
  - Never mutate arrays in place.
  - Derive the disabled states. Don't store them.
- **UX:** a large, centred count. With no history, the table body is empty or shows a muted "No operations yet" row that has no data cells.

## Constraints
- 35 minutes. React and CSS Modules only. No state or undo libraries.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface UndoableCounterProps {
  initialValue?: number; // default 0
}
type Operation = '/2' | '-1' | '+1' | 'x2';
interface HistoryEntry {
  operation: Operation;
  oldValue: number;
  newValue: number;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `button`s named exactly `/2`, `-1`, `+1`, `x2`, `Undo` and `Redo`.
- The count is the trimmed text content of the only element with role `status`, e.g. an `<output>`. Numbers use `String(n)`, so `0.5`, not `0.50`.
- The history is a `table` named `History`. Tests read the rows that contain exactly two `cell`s: the operation (`+1`) and the result (`4 → 5`, with a `→` between single spaces). Header rows (`columnheader`s) are ignored.
- An empty placeholder row, if you add one, must be a single `<td colSpan={2}>` so it isn't counted.

## Edge cases
- Undo all the way back to `initialValue`, then Redo all the way forward.
- `x2` and `/2` on `0` still record an entry (`0 → 0`).
- Negative numbers: `-1` from `0` gives `-1`, and `/2` gives `-0.5`.
- Undo twice, do a new operation, then Redo: it must be disabled.
- Rapid clicks: every click is recorded. Use functional updates or a reducer so none are lost.

## Follow-ups
1. **Cap history at 50.** Keep at most 50 undo steps and drop the oldest. After 55 operations the table has 50 rows, and undoing 50 times leaves `Undo` disabled.
2. **Generic `useUndoable(reducer, initialState)` hook.** Extract the undo logic so any reducer becomes undoable. It should return `[state, dispatch, { undo, redo, canUndo, canRedo }]`. Rebuild the counter on top of it.
3. **Keyboard shortcuts.** `Ctrl+Z` undoes and `Ctrl+Shift+Z` redoes (`⌘` on macOS) anywhere on the page. Don't fire them while typing in a text field, and clean up the listener.
4. **Command pattern vs snapshots.** Store operations with `apply`/`invert` functions instead of old values. When is each approach better? Think about `/2` on odd numbers with integer division, large documents, and collaborative editing.

## Concepts covered
Undo/redo stacks (past / present / future) · `useReducer` with immutable updates · derived UI state · accessible data tables · the command pattern vs state snapshots.

Related: S20 Undo/Redo Drawing Canvas · J01 Todo List · ST05 Mini Redux.
