# Data Table: sort, filter, paginate

## Problem statement
Build a reusable, generic `DataTable` component. The caller passes a `columns` config and an array of `rows`. The table lets the user sort by a column, search across columns, narrow rows with a single select filter (for example, by role), and page through the results.

All data is already on the client: this task is about deriving the visible rows from a few pieces of UI state correctly and efficiently. The Playground feeds it the 120 `USERS` from the mock dataset.

## Clarifying questions to ask
- Is data filtered and sorted on the client or the server? *(Client. The whole dataset is in `rows`. Server mode is a follow-up.)*
- Single-column or multi-column sort? *(Single column. Multi-column is a follow-up.)*
- What does clicking a sorted header do? *(Cycles ascending → descending → unsorted.)*
- What does search match against? *(The raw value of every configured column, case-insensitive substring. Not columns that aren't in `columns`.)*
- What happens to the current page when the search, filter or page size changes? *(Go back to page 1.)*
- Should the table be generic over the row type? *(Yes. `key` must be a property of the row type.)*

## Functional requirements
- [ ] Render a `<table>` with a `<caption>` showing `caption`, one header cell per column (in order), and one body row per visible row.
- [ ] A cell shows `column.render(row)` when `render` is given, otherwise `String(row[column.key])`.
- [ ] **Sorting.** A `sortable` column's header contains a button. Clicking it cycles that column through ascending → descending → unsorted. Clicking a different sortable column sorts by that column ascending.
- [ ] Sorting compares raw values: numbers numerically, everything else as strings with a natural, case-insensitive comparison (`"item 9"` before `"item 10"`). Unsorted order is the original `rows` order. Rows that compare equal keep their original relative order.
- [ ] Sorting applies to the whole filtered dataset, not only the current page.
- [ ] **Search.** A search input labelled `Search` keeps rows where any configured column's raw value contains the trimmed query, ignoring case.
- [ ] **Filter.** When `filter` is given, render a select labelled `filter.label`. Its first option is `All` (no filtering), followed by each distinct value of `row[filter.key]` in `rows`, sorted alphabetically. Search and filter combine (AND).
- [ ] **Pagination.** Show `pageSize` rows per page. `Previous page` and `Next page` buttons move one page and are disabled on the first and last page.
- [ ] A select labelled `Rows per page` lists `pageSizeOptions`. The initial size is `initialPageSize`, or the first option.
- [ ] Show the text `Page X of Y` (at least `Page 1 of 1`).
- [ ] Show the text `Showing A–B of N`, where A and B are the 1-based positions of the first and last visible row and N is the number of rows matching search + filter. Use an en dash (`–`). When nothing matches, show `Showing 0 of 0`.
- [ ] Changing the search, filter, sort or page size returns to page 1.
- [ ] When nothing matches, render a single body row whose cell spans all columns and reads `No results`.
- [ ] If `rows` shrinks so that the current page no longer exists, show the last page that does.

## Non-functional requirements
- **Accessibility:** follow the [APG Sortable Table example](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/).
  - Use real table semantics: `<table>`, `<caption>`, `<thead>`, `<th scope="col">`, `<tbody>`, `<td>`.
  - The sorted column's header has `aria-sort="ascending"` or `aria-sort="descending"`. Other headers have no `aria-sort`, or `aria-sort="none"`.
  - The sort control is a `<button>` inside the `<th>` whose accessible name is the header text. Any arrow icon is `aria-hidden`.
  - The `Showing …` summary is announced politely when it changes (`aria-live="polite"`).
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves through search, filter, sortable headers, page size and pagination buttons in DOM order |
  | `Enter` / `Space` on a header | Advances that column's sort (native button behaviour) |

- **Performance:** filtering, sorting and slicing are derived during render, never copied into state. They must not re-run when unrelated state changes (for example, only the page changed → don't re-sort). Never mutate the `rows` prop.
- **UX:** header buttons show a sort indicator. The table doesn't jump in width between pages (use `table-layout` or fixed widths). Numbers are right-aligned.

## Constraints
- 75 minutes. React and CSS Modules only. No table or data-grid libraries.
- The component is generic over `Row`. Keep the types in `types.ts`.
- Data comes from props. The Playground uses `USERS` from `src/mocks/data/datasets.ts`.

## Data / API contract
```ts
type RowId = string | number;

interface Column<Row> {
  key: keyof Row & string;
  header: string;
  sortable?: boolean;                  // default false
  render?: (row: Row) => ReactNode;    // display only; sort/search use row[key]
}

interface TableFilter<Row> {
  key: keyof Row & string;
  label: string;                       // e.g. "Role"
}

interface DataTableProps<Row extends { id: RowId }> {
  columns: Column<Row>[];
  rows: Row[];
  caption: string;
  filter?: TableFilter<Row>;
  pageSizeOptions?: number[];          // default [10, 25, 50]
  initialPageSize?: number;            // default pageSizeOptions[0]
}
```
Default-export the component from `Solution.tsx`. Use `row.id` as the React key.

## Test contract
- `table` named by `caption`, with exactly one header row. Body rows are the remaining `row`s; body cells have role `cell` (`<td>`).
- Each column header is a `columnheader` named by `header`. A sortable header contains a `button` with the same name. A non-sortable header has no button.
- `aria-sort` is `ascending` or `descending` on the sorted `columnheader`. It is absent or `none` everywhere else.
- Controls: a textbox or searchbox labelled `Search`; a select labelled with `filter.label` whose options include `All`; a select labelled `Rows per page`; buttons `Previous page` and `Next page` (disabled at the ends).
- Texts: `Page X of Y`, `Showing A–B of N` (en dash) or `Showing 0 of 0`, and `No results`. Each text is the full text content of one element.

## Edge cases
- Empty `rows`: `No results`, `Showing 0 of 0`, `Page 1 of 1`, both pagination buttons disabled.
- Mixed or missing values in a column (`null`, `undefined`): don't crash. Keep them together at the end in both directions.
- Booleans (`active`) and ISO dates (`joinedAt`) sort sensibly as strings.
- The last page is partially filled: `Showing 21–25 of 25`.
- Search with only whitespace means no search.
- A `render` function that returns a badge or link: search still uses the raw value, not the rendered text.
- The `rows` prop identity changes on every parent render: derived data must still be correct (and ideally not thrash).

## Follow-ups
1. **Server-side mode.** Switch to `getUsers(query)` from `src/mocks/api.ts`. Sort, search, filter and page are sent to the server. Debounce the search, cancel stale requests, keep showing the previous page while the next one loads, and show an error row with Retry.
2. **URL state.** Sync sort, search, filter, page and page size to the query string so that a refreshed or shared link restores the same view. Back/Forward should work.
3. **Multi-column sort.** `Shift`+click adds a secondary sort key. Show the sort priority in the header and explain what `aria-sort` can and can't express here.
4. **Row selection.** Add a checkbox column with a header "select all on this page" checkbox that becomes indeterminate on partial selection. What should happen to the selection when the filter changes?
5. **10,000 rows.** Profile it. Where does time go? Consider virtualizing the body, a sticky header, and moving search to `useDeferredValue`.

## Concepts covered
Generic components in TypeScript · config-driven rendering · derived state vs duplicated state · `useMemo` pipelines (filter → sort → paginate) · stable sort · `aria-sort` · resetting dependent state when inputs change (without an effect).

Related: J11 Pagination · J25 hooks pack (`useDebounce`) · S04 Virtualized List · S07 Nested Checkboxes.
