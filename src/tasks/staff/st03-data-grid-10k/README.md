# 10k-row Data Grid

## Problem statement
Your team's admin console shows customer accounts in a table. Big tenants have 10,000+ accounts and 20 columns, and the current `<table>` renders all 200,000 cells. The page freezes for seconds, and scrolling janks.

Build a `DataGrid` that stays smooth at that size:
- **row and column virtualization**: only cells near the viewport exist in the DOM
- a **sticky header row** and a **sticky first column**
- **sorting** that doesn't freeze the page
- the **ARIA grid** pattern with keyboard cell navigation

Sample data is in `data.ts` (`generateRows()` → 10,000 rows, `COLUMNS` → 20 columns).

This is a performance-architecture interview. Expect to justify every number: overscan, what re-renders on scroll, and how you measured.

## Clarifying questions to ask
- Are row heights fixed? *(Yes, `rowHeight` for every row including the header. Variable heights are a follow-up.)*
- Are column widths fixed? *(Yes, `column.width`. Resizing is a follow-up.)*
- Is the data client-side, or paged from a server? *(All client-side for this exercise. Discuss the server-side variant.)*
- Is the viewport size known? *(Yes: `width` and `height` props. Measuring with `ResizeObserver` is a follow-up.)*
- Multi-column sort? *(No, single column, cycling none → ascending → descending → none.)*
- Is editing required? *(No. It's a read-only grid.)*

## Functional requirements
- [ ] The grid is a `width` × `height` scroll container. Its scrollable area matches the full data size: `rows.length × rowHeight` plus the header row, and the sum of column widths.
- [ ] Only rows and columns that intersect the viewport, plus `overscan` extra on each side, are in the DOM. This holds after any scroll position.
- [ ] The header row stays visible during vertical scroll. The first column stays visible during horizontal scroll, and the top-left header cell stays pinned on both axes.
- [ ] Cells display `column.format(value)` when `format` is provided, otherwise `String(value)`.
- [ ] Each column header contains a button named by `column.title`. Clicking it cycles the sort for that column: ascending → descending → none. Sorting a different column starts at ascending. Numbers compare numerically, strings with `localeCompare`, and the sort is stable.
- [ ] **Sorting must not block input.** While a 10k-row sort runs, typing in an input elsewhere on the page stays responsive. Measure it, and record the number in DESIGN.md.
- [ ] Keyboard navigation per the table below. Exactly one element in the grid is in the tab order: the active cell, which starts as the first data cell. The header row takes part in navigation. When a header is active, focus goes to its sort button, and `Enter` / `Space` sorts.
- [ ] Clicking a cell makes it the active cell and focuses it.

## Non-functional requirements
- **Accessibility:** [APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) (data grid).
  - The scroll container has `role="grid"`, `aria-label`, `aria-rowcount` = `rows.length + 1` (the header row counts) and `aria-colcount` = `columns.length`.
  - Every rendered row has `role="row"` and a 1-based `aria-rowindex`. The header row is `1`, and the first data row is `2`.
  - Header cells have `role="columnheader"` and `aria-sort` (`ascending` / `descending` when sorted). Data cells have `role="gridcell"`. Every cell has a 1-based `aria-colindex`.
  - Sort indicators are `aria-hidden`. Announce sort changes politely (a live region is fine).
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowUp` / `ArrowDown` | Move the active cell one row, clamped. Scroll it into view |
  | `ArrowLeft` / `ArrowRight` | Move the active cell one column, clamped. Scroll it into view |
  | `Home` / `End` | First / last cell in the row |
  | `Ctrl+Home` / `Ctrl+End` | First / last cell in the grid |
  | `PageUp` / `PageDown` | Move by the number of fully visible rows |
  | `Tab` | Leaves the grid. There's one tab stop |

- **Performance budget** (production build, 4× CPU throttle in DevTools):
  - Initial render of 10k × 20: under 100 ms scripting.
  - Scrolling: no long tasks over 50 ms, and ~60 fps on a laptop. At most one React commit per animation frame from scroll.
  - DOM size: fewer than 1,000 cell elements at any time for a 900 × 500 viewport.
  - Sort: input latency (INP) under 200 ms while sorting. Say whether you used `useTransition`, chunking or a Worker, and why.
  - The active cell survives being scrolled out of the DOM and back in.

## Constraints
- 120 minutes. React and CSS Modules only. No virtualization or grid libraries.
- `types.ts` is the minimal contract. You may add props (`getRowId`, `onSortChange`, `renderCell`) but don't break it.
- Default-export `DataGrid` from `Solution.tsx`.
- jsdom has no layout. Your virtualization window must come from `scrollTop` / `scrollLeft` plus the `width`, `height`, `rowHeight` and `column.width` props, not from measuring the DOM.

## Data / API contract
```ts
type CellValue = string | number;
type Row = Record<string, CellValue>;
interface Column {
  key: string;
  title: string;
  width: number;
  format?: (value: CellValue) => string;
}
interface DataGridProps {
  rows: Row[];
  columns: Column[];
  'aria-label': string;
  height: number;       // viewport px; the grid element scrolls
  width: number;
  rowHeight?: number;   // default 32 (header too)
  overscan?: number;    // default 3, rows and columns
}
```

## Test contract
- Tests use generated rows where `row['c' + j]` is the string `r{i}c{j}` (for example `r5000c0`), except column `c1`, which holds distinct numbers. Columns are titled `Col {j}` and are 100 px wide. The grid is 800 × 400 with `rowHeight` 32. Some tests use 50 columns.
- The grid is found with `getByRole('grid', { name })`. **It is the element that scrolls.** Tests scroll with `fireEvent.scroll(grid, { target: { scrollTop, scrollLeft } })`.
- DOM boundedness is checked by counting `[role="row"]` in the grid (fewer than 40) and `[role="gridcell"]` per row (fewer than 30 when there are 50 columns).
- Rows are located with `[role="row"][aria-rowindex="N"]` and cells within them with `[aria-colindex="M"]`.
- Sorting clicks `getByRole('button', { name: 'Col 1' })` and reads `aria-sort` on the `columnheader` that contains it. Assertions run inside `waitFor`, so async sorting is fine.
- The active cell has DOM focus. Tests click a data cell's text, then check `document.activeElement` (a `gridcell`) and its text after arrow keys.
- An empty `rows` array renders the text `No rows`.

## Edge cases
- `rows` is empty: render the header and the text `No rows`.
- `rows` changes while scrolled deep into the grid (for example after a filter). Clamp the scroll position and the active cell.
- A sort is in flight when another sort click arrives. Only the latest result may be applied.
- The viewport is larger than the content, on either axis.
- Very long cell text: truncate with an ellipsis, don't grow the row.
- The active cell is scrolled out of the DOM and then back in. Focus should be restorable, and the tab stop must not disappear.
- Browser max element height (~33M px in Chrome): what happens at 1M rows?

## Follow-ups
1. **Web Worker sort.** Move sorting to a Worker. Transfer only what's needed (an index permutation, not the rows). Discuss serialization cost vs `useTransition`, and cancellation.
2. **Variable row heights.** Rows measure themselves after render. How do you map `scrollTop` to a row index without an O(n) scan, and how do you stop the scrollbar jumping?
3. **Column resize and reorder.** Drag to resize, with keyboard support. Which memoized pieces get invalidated?
4. **Server-side data.** 5M rows, fetched in pages of 200 as you scroll. How do placeholders, cache eviction and sort (now server-side) change the design?
5. **Range selection and copy.** Shift+click / Shift+Arrow selection and copying as TSV. How do you represent a selection that's mostly outside the DOM?

## Concepts covered
Windowing math (first and last visible index from scroll offset) · spacer elements vs absolute transforms · `position: sticky` in a scroll container · coalescing scroll to animation frames · `useTransition` / `useDeferredValue` / Workers for heavy CPU work · stable sorting · roving tabindex under virtualization · ARIA grid row and column indices.

Related: ST04 Spreadsheet · ST01 Select (virtualized options follow-up).

## Design discussion prompts
- Walk through what happens between a scroll event and the next paint. How many React renders, and which components re-render?
- Absolutely positioned cells with `transform`, or spacer rows/columns in normal flow? What are the consequences for sticky headers and accessibility?
- How did you choose `overscan`? What's the cost of too little (blank flashes during fast scroll) vs too much?
- `useTransition`, time-slicing by hand, or a Web Worker for sort: when is each the right call? What's the break-even data size for a Worker?
- How do screen readers cope with a virtualized grid? What do `aria-rowcount` and `aria-rowindex` buy you, and what still doesn't work?
- Your grid becomes a shared component used by 15 teams. Which APIs do you expose for custom cells without letting teams destroy scroll performance?
- How would you catch a scroll-performance regression in CI?
- Would you ever render a real `<table>`? What do you lose and gain?
