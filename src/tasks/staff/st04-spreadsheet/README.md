# Spreadsheet with formulas

## Problem statement
Build a small spreadsheet with a 26 × 50 grid (columns `A`–`Z`, rows `1`–`50`). Users select cells, type values or formulas like `=A1+B2*2` and `=SUM(A1:A5)`, and see results update live.

The UI is the easy half. The real exercise is the **engine**:
- parse formulas
- build a dependency graph
- after an edit, recompute **only the cells that depend on it**, in topological order
- detect cycles and report errors the way users expect

Keep the engine a plain TypeScript module with no React, exposed through `createSheetEngine()` and `evaluateSheet()`, so it can be unit-tested and later moved to a Worker.

## Clarifying questions to ask
- Which formula features? *(Numbers, cell references, `+ - * /`, parentheses, unary minus and `SUM(...)` with ranges and/or single arguments. More functions are a follow-up.)*
- Are references case-sensitive? *(No. `=a1` is `A1`.)*
- What is an empty cell worth in arithmetic? *(0.)*
- What about text in arithmetic? *(`#VALUE!`. `SUM` skips text and empty cells, like Excel.)*
- Does the UI need virtualization for 1,300 cells? *(No. Rendering has to stay cheap, though. See the performance requirements.)*
- Undo, copy/paste, persistence? *(Follow-ups.)*

## Functional requirements
### Engine
- [ ] **Raw input.** Input not starting with `=` is a literal. A trimmed string that parses as a finite number becomes a number, `""` becomes `null` (empty), and anything else stays text.
- [ ] **Formulas.** Operator precedence: `*` and `/` bind tighter than `+` and `-`, and both are left-associative. Parentheses and unary minus are supported. Whitespace is ignored.
- [ ] **References.** `A1`…`Z50`. A reference outside the grid (for example `A51` or `AA1`) makes the formula `#REF!`. An empty referenced cell is `0` in arithmetic.
- [ ] **`SUM`.** Arguments are ranges (`A1:B3`, any corner order), references or numbers, separated by commas. Empty and text cells are skipped.
- [ ] **Errors.**
  - `#DIV/0!` for division by zero.
  - `#VALUE!` for text used in arithmetic.
  - `#NAME?` for an unknown function.
  - `#ERROR!` for a formula that doesn't parse.
  - A formula that reads an error cell yields that same error (propagation).
- [ ] **Cycles.** Every cell on a cycle (including a self-reference) is `#CYCLE!`, and cells that depend on a cycle get `#CYCLE!` through propagation. Breaking the cycle recovers all of them on the next edit.
- [ ] **Incremental recompute.** `setCell` recomputes the edited cell and its **transitive dependents only**, each after its own dependencies, and returns their ids in that order. Unrelated cells are not re-evaluated.
- [ ] `evaluateSheet(cells)` evaluates a batch of raw inputs and returns a value for every key.

### UI
- [ ] Column headers `A`–`Z`, row headers `1`–`50`. Cells show computed values. Errors show their code, for example `#CYCLE!`.
- [ ] One cell is selected at a time (initially `A1`). Clicking selects. Arrow keys move the selection, clamped at the edges.
- [ ] `Enter`, `F2` or double-click starts editing the selected cell in a text box pre-filled with the **raw** input. Typing a printable character on a selected cell starts editing and replaces the content with that character.
- [ ] While editing: `Enter` commits and moves the selection down one row, `Tab` commits and moves right, and `Escape` cancels (the raw input is unchanged).
- [ ] Only cells whose values changed re-render after a commit.

## Non-functional requirements
- **Accessibility:** [APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).
  - The grid has `role="grid"` and an accessible name (default `Spreadsheet`).
  - Column headers use `role="columnheader"` named `A`…`Z`. Each data row starts with a `role="rowheader"` named `1`…`50`, followed by 26 `role="gridcell"` elements.
  - The selected cell has `aria-selected="true"` and keyboard focus (roving tabindex or `aria-activedescendant`, your choice).
  - The editor is a `textbox` whose accessible name is the cell id (for example `A1`).
- **Keyboard:**

  | Key | Not editing | Editing |
  |---|---|---|
  | Arrow keys | Move selection | Move the caret in the text box |
  | `Enter` / `F2` | Start editing | `Enter`: commit, then move down |
  | `Tab` | Move right (`Shift+Tab` moves left) | Commit, then move right |
  | `Escape` | — | Cancel edit |
  | `Delete` / `Backspace` | Clear the cell | Normal text editing |
  | Printable character | Start editing with that character | Normal typing |

- **Performance:** editing `A1` when 500 cells depend on it recomputes exactly those 500 and re-renders only cells whose values changed. The component must not re-render all 1,300 cells. A deep chain of 1,000 dependencies (`A2==A1+1`, …) must not overflow the stack.
- **UX:** numbers right-aligned, text left-aligned, errors styled distinctly. The raw formula is visible while editing.

## Constraints
- 120 minutes. React and CSS Modules only. No formula or grid libraries, and no `eval` / `new Function`.
- `types.ts` is the minimal contract. Add what you like (undo, `getDependents`) but don't break it.
- `Solution.tsx` exports `default` (the component), `createSheetEngine` and `evaluateSheet`.

## Data / API contract
```ts
type CellId = string;                   // "A1".."Z50"
type CellErrorCode = '#CYCLE!' | '#REF!' | '#VALUE!' | '#DIV/0!' | '#NAME?' | '#ERROR!';
interface CellError { error: CellErrorCode }
type CellValue = number | string | null | CellError;
interface SheetSize { rows?: number; cols?: number }   // defaults 50 × 26

interface SheetEngine {
  readonly rows: number;
  readonly cols: number;
  setCell(id: CellId, raw: string): CellId[];   // recomputed ids, in evaluation order
  getRaw(id: CellId): string;
  getValue(id: CellId): CellValue;
  subscribe(listener: (changed: CellId[]) => void): () => void;
}

function createSheetEngine(options?: SheetSize): SheetEngine;
function evaluateSheet(cells: Record<CellId, string>, options?: SheetSize): Record<CellId, CellValue>;

interface SpreadsheetProps {
  engine?: SheetEngine;
  initialCells?: Record<CellId, string>;
  'aria-label'?: string;                 // default "Spreadsheet"
}
```

## Test contract
- Engine tests call `evaluateSheet` and `createSheetEngine` directly. Errors are compared with `toEqual({ error: '#CYCLE!' })`.
- `setCell`'s return value is checked for membership (dependents included, unrelated cells excluded) and relative order (a cell after its dependencies). Duplicates aren't expected.
- UI tests render `<Spreadsheet initialCells={…} />` and locate cell `B3` as the 2nd `gridcell` within the 4th `row` of the grid. Row 1 is the header row.
- Cell text content is the displayed value. Numbers use `String(value)` (for example `80`, `-10`) and errors show their code.
- Editing: after `Enter` or `F2` on a selected cell, `getByRole('textbox', { name: 'A1' })` has the raw input as its value. After commit or cancel, no textbox is present.
- After clicking a cell, keyboard events are sent with `user.keyboard`, so focus must be inside the grid.

## Edge cases
- `=A1` inside A1 (self-cycle), and two-cell cycles that are later broken.
- A range with reversed corners, `=SUM(B3:A1)`.
- Deleting a cell that others reference: dependents recompute and see `0`.
- A formula that references a cycle but isn't part of it.
- Floating point: `=0.1+0.2` displays `0.30000000000000004`, or would you format it? *(Your call. Document it.)*
- A formula referencing text directly, `=A1` where A1 is `hello`. *(Returns the text. Arithmetic on it is `#VALUE!`.)*
- Rapid edits while a large recompute is running (if you make it async).

## Follow-ups
1. **Undo / redo.** Ctrl+Z / Ctrl+Shift+Z across edits, including multi-cell pastes as a single step. Command objects or snapshots?
2. **Copy / paste ranges.** Shift+Arrow range selection, copy as TSV, and paste with relative reference adjustment (`=A1` pasted one row down becomes `=A2`). How do `$A$1` absolute references fit your parser?
3. **Virtualization to 1M × 1k.** Which engine data structures still work at that size? How do you keep the dependency graph sparse?
4. **Recompute in a Worker.** Move the engine off the main thread. What's the message protocol, and how do you keep the UI consistent while a recompute is pending?
5. **Collaboration.** Two users edit the same sheet. Is last-write-wins per cell good enough? What about formula cells that depend on each other?

## Concepts covered
Tokenizing and recursive-descent parsing · ASTs and evaluation · adjacency lists for dependencies and dependents · Kahn's algorithm / DFS topological sort · cycle detection · incremental recomputation · external stores with per-cell subscriptions (`useSyncExternalStore`) · grid keyboard editing.

Related: ST03 10k-row Data Grid · ST07 Hooks from scratch.

## Design discussion prompts
- Walk through your data structures for dependencies and dependents. What must be updated when a formula changes from `=A1+B1` to `=C1`?
- How do you find the cells to recompute and their order? What's the complexity for one edit, and what's the worst case?
- How and when do you detect cycles: at edit time, during evaluation, or both? How do cells recover when a cycle is broken?
- How does React learn which cells changed? Compare lifting state to the grid, context, and an external store with per-cell subscriptions.
- The engine has no React dependency. What does that buy you, and what did it cost in wiring?
- How would you test the parser: example-based, table-driven, or property-based (fuzzing random expressions against a reference evaluator)?
- How would you ship formula functions as plugins (`registerFunction('AVG', …)`) without letting a slow function freeze the sheet?
