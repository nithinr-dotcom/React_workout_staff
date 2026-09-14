# Pagination

## Problem statement
Build a controlled `Pagination` component for a results table with many pages. It shows Previous and Next buttons, the first and last page, the current page with a few neighbours, and an ellipsis wherever pages are skipped:

```
‹ Prev   1  …  4  [5]  6  …  20   Next ›
```

The parent owns the current page, and the component only reports what the user clicked. Put the "which items to show" logic in a pure, exported function, `getPageItems`, so it can be tested without rendering.

## Clarifying questions to ask
- Who owns the current page? *(The parent. The component is fully controlled.)*
- Buttons or links? *(Buttons that call `onPageChange`. Links and URL sync are a follow-up.)*
- Must the number of items stay constant as you page, to avoid layout shift? *(Not for the base version. It's follow-up 1.)*
- Should an ellipsis ever hide a single page? *(No. If the gap is exactly one page, show that page instead.)*
- What if `totalPages` is 0? *(Render nothing.)*

## Functional requirements
- [ ] `getPageItems(totalPages, currentPage, siblingCount = 1)` returns the ordered list of page numbers and `'ellipsis'` markers:
  - Always include page `1` and page `totalPages`.
  - Include every page from `currentPage - siblingCount` to `currentPage + siblingCount` that lies within `1..totalPages`.
  - Between two consecutive included pages that are two apart, include the page between them instead of an ellipsis.
  - Between two consecutive included pages that are more than two apart, insert one `'ellipsis'`.
  - `totalPages <= 0` returns `[]`. A `currentPage` outside `1..totalPages` is clamped first.
- [ ] The component renders a Previous button, then the items (page buttons and ellipses), then a Next button.
- [ ] Clicking a page button calls `onPageChange(page)`. Clicking the current page does nothing.
- [ ] Previous calls `onPageChange(currentPage - 1)` and is disabled on page 1. Next calls `onPageChange(currentPage + 1)` and is disabled on the last page.
- [ ] The current page is visually distinct.
- [ ] `totalPages === 0` renders nothing.

Worked examples with `siblingCount = 1`:

| totalPages | currentPage | Items |
|---|---|---|
| 20 | 5 | `1 … 4 5 6 … 20` |
| 20 | 1 | `1 2 … 20` |
| 20 | 4 | `1 2 3 4 5 … 20` |
| 20 | 20 | `1 … 19 20` |
| 7 | 4 | `1 2 3 4 5 6 7` |
| 1 | 1 | `1` |

## Non-functional requirements
- **Accessibility:**
  - Wrap everything in a `<nav>` landmark with `aria-label="Pagination"`.
  - Page buttons show the number but are named `Page N`.
  - The current page has `aria-current="page"`.
  - The Previous and Next buttons are named `Previous page` / `Next page`, even if they only show an icon.
  - Ellipses aren't focusable and are hidden from assistive tech.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between enabled buttons (disabled buttons are skipped) |
  | `Enter` / `Space` | Activate the focused button (native behaviour) |
- **UX:** buttons at least 32×32px, a clear focus ring, and disabled buttons that look disabled.

## Constraints
- 40 minutes. React and CSS Modules only.
- `Solution.tsx` default-exports `Pagination` and also has a named export `getPageItems`.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
type PageItem = number | 'ellipsis';

interface PaginationProps {
  totalPages: number;
  currentPage: number;                     // 1-based
  onPageChange: (page: number) => void;
  siblingCount?: number;                   // default 1
}

export function getPageItems(totalPages: number, currentPage: number, siblingCount?: number): PageItem[];
export default function Pagination(props: PaginationProps): JSX.Element | null;
```

## Test contract
- `getPageItems` is called directly and compared with `toEqual`, for example `[1, 'ellipsis', 4, 5, 6, 'ellipsis', 20]`.
- A `navigation` landmark named `Pagination`.
- `button`s named `Previous page` and `Next page` that are `disabled` at the edges.
- Page `button`s named `Page N`. The current one has `aria-current="page"`; the others don't have `aria-current`.
- Each ellipsis renders the text `…` (U+2026). Tests count them with `getAllByText('…')`.
- `totalPages={0}` renders no `navigation` landmark.
- `onPageChange` is a `vi.fn()` checked with `toHaveBeenCalledWith` / `not.toHaveBeenCalled`.

## Edge cases
- `siblingCount = 0` on page 5 of 20: `1 … 5 … 20`.
- A large `siblingCount` that covers every page: no ellipses.
- `currentPage` greater than `totalPages`, for example after a filter shrinks the results.
- `totalPages = 2`: no ellipsis is possible.
- Page numbers must be unique React keys, but the two ellipses need keys too.

## Follow-ups
1. **Constant width.** Always render the same number of items (`2 × siblingCount + 5` when there are enough pages), so the controls don't jump as you page. Near an edge, show extra pages instead of an ellipsis (MUI's behaviour).
2. **URL sync.** Store the page in `?page=N` with react-router so the back button and shared links work. Render real `<a href>` links. What changes for accessibility and SEO?
3. **Page size and summary.** Add a "Rows per page" select and the text `Showing 21–30 of 195`. Changing the page size keeps the first visible row on screen.
4. **Jump to page.** Add a small "Go to page" input that validates the number and clamps it into range.

## Concepts covered
Separating a pure algorithm from rendering · controlled components · `<nav>` landmarks · `aria-current` · handling boundaries and bad input.

Related: J22 Job Board (load more) · J14 Tic-Tac-Toe (pure logic helpers) · J18 Transfer List.
