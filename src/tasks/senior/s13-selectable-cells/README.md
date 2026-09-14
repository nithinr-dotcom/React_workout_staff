# Selectable Cells

## Problem statement
Build a `SelectableCells` grid with `rows × cols` cells. The user presses the mouse button on a cell and drags across the grid; every cell inside the rectangle between the start cell and the cell under the pointer is highlighted as they drag. Releasing the button commits the selection and reports it through `onSelectionChange`.

This is the core of spreadsheet range selection, calendar time-slot pickers and cinema seat maps.

## Clarifying questions to ask
- Does a new drag replace the previous selection or add to it? *(Replace. Adding with Cmd/Ctrl is a follow-up.)*
- What does a plain click (press and release on one cell) do? *(Selects just that cell.)*
- What if the mouse is released outside the grid? *(Commit the current rectangle anyway.)*
- What if the pointer leaves the grid while dragging? *(The rectangle keeps the last cell that was entered.)*
- Is `onSelectionChange` called during the drag? *(No, only on release.)*
- Can the selection be cleared? *(Not required; a new click replaces it.)*
- Touch support? *(Nice to have.)*

## Functional requirements
- [ ] Render a grid of `rows` rows and `cols` columns.
- [ ] Pressing the primary button on a cell starts a selection anchored at that cell. The previous selection is replaced immediately (the preview shows only the new rectangle).
- [ ] While the button is held, entering any cell updates the rectangle to span from the anchor to that cell. Dragging back shrinks it.
- [ ] The rectangle is normalised: dragging up and/or left from the anchor works the same as down/right.
- [ ] Cells in the current rectangle are highlighted and marked selected during the drag (live preview).
- [ ] Releasing the button (anywhere in the document, including outside the grid) commits the selection and calls `onSelectionChange` once, with all selected cells in row-major order.
- [ ] After release, entering cells does not change the selection.
- [ ] A press and release on the same cell selects exactly that cell.
- [ ] The drag must not select page text.

## Non-functional requirements
- **Accessibility:**
  - The container has `role="grid"`, an accessible name from `label`, and `aria-multiselectable="true"`.
  - Rows have `role="row"`; cells have `role="gridcell"` with `aria-selected="true|false"`.
  - Each cell has an accessible name `Row <r>, Column <c>` using **1-based** numbers (for example via `aria-label`).
  - Keyboard selection is a follow-up, but think about how the grid pattern's roving tabindex would fit.
- **Performance:** a 50×50 grid (2,500 cells) should drag smoothly. Avoid re-rendering every cell on every pointer movement when the rectangle hasn't changed, and avoid storing a derived `Set` of selected cells in state when two corners are enough.
- **Robustness:** listeners attached to `document`/`window` are removed on unmount and after each drag.
- **Styling:** selected cells have a clear fill; `user-select: none` on the grid; a visible anchor cell is a nice touch.

## Constraints
- 60 minutes. React and CSS Modules only.
- Use mouse events or pointer events, your choice.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface CellCoord { row: number; col: number }   // zero-based
interface SelectableCellsProps {
  rows: number;
  cols: number;
  label?: string;                                   // default "Selectable cells"
  onSelectionChange?: (cells: CellCoord[]) => void; // on commit, row-major order
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The grid is a `grid` named by `label`. Cells are `gridcell`s named `Row <r>, Column <c>` (1-based) with `aria-selected="true"` or `"false"` (never missing).
- `onSelectionChange` receives **zero-based** coordinates, row-major order.
- jsdom has no layout, so tests simulate a drag with `fireEvent` and fire both pointer and mouse flavours of each event, so either implementation works:
  - start: `pointerDown` then `mouseDown` on the start cell (primary button, `buttons: 1`).
  - move: `pointerEnter` / `pointerOver` / `mouseEnter` / `mouseOver` on each cell passed through (`buttons: 1`). React Testing Library's `fireEvent.mouseEnter` also dispatches `mouseover`, which is what React's `onMouseEnter` listens to.
  - end: `pointerUp` then `mouseUp` on the end cell, or on `document.body` for "released outside".
- Because both flavours are fired, starting a drag twice on the same cell, entering the same cell twice, or receiving a second release after the drag has ended must be harmless (still exactly one `onSelectionChange` call per drag).
- Tests don't rely on `elementFromPoint` or coordinates.

## Edge cases
- `rows` or `cols` of 0 renders an empty grid without crashing.
- `rows`/`cols` shrink while a selection includes cells that no longer exist.
- Release happens outside the browser window (you won't get `mouseup`): handle `buttons === 0` on the next move, or `pointercancel`/`lostpointercapture`.
- Right-click (secondary button) should not start a selection.
- Dragging over the grid gap/border between cells.

## Follow-ups
1. **Additive selection.** Cmd/Ctrl+drag adds a new rectangle to the existing selection; Cmd/Ctrl+click toggles a single cell. What data structure do you use now?
2. **Shift+click.** Shift+click extends the selection from the last anchor to the clicked cell, like a spreadsheet.
3. **Keyboard.** Implement the APG grid pattern: roving tabindex, arrow keys move the active cell, Shift+arrows extend the selection, Space selects.
4. **Large grids.** A 1,000×1,000 grid. Virtualise rows and columns, and explain how the rectangle model makes that possible when a set of selected ids wouldn't.
5. **Touch.** Make it work with touch without breaking page scroll. Discuss `touch-action` and pointer capture (and why `pointerenter` stops firing on other cells once you capture).

## Concepts covered
Mouse/pointer event lifecycle · global listeners with cleanup · pointer capture pitfalls · transient (drag) vs committed state · rectangle normalisation with `Math.min`/`Math.max` · deriving selection from two corners · ARIA grid with `aria-selected`.

Related: S12 Sortable Drag & Drop List · S04 Virtualized List · S14 Date Picker (grid keyboard).
