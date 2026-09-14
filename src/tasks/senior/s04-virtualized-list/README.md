# Virtualized List

## Problem statement
The product team wants to show 10,000 rows in a scrollable list. Rendering all of them makes the first paint slow and scrolling janky. Build a `VirtualizedList` component that **only mounts the rows the user can see**, plus a few extra rows above and below (overscan), while the scrollbar still behaves as if every row were there.

Every row has the same fixed height. The consumer tells you how many rows there are and how to render row `index`.

## Clarifying questions to ask
- Do all rows have the same height? *(Yes, `itemHeight` px. Variable heights are a follow-up.)*
- Is the viewport height fixed or does it fill its parent? *(Fixed, via the `height` prop.)*
- Vertical only, or a grid? *(Vertical only.)*
- Does the consumer need to scroll to a specific row programmatically? *(Not in the base version. See the follow-ups.)*
- How much overscan? *(3 rows above and below by default, configurable.)*
- Can `itemCount` change while mounted? *(Yes, e.g. after a filter. Handle it.)*

## Functional requirements
- [ ] Render a scroll container exactly `height` px tall with vertical scrolling.
- [ ] The scrollable content is `itemCount × itemHeight` px tall, so the scrollbar size and position are correct.
- [ ] Mount only rows in the visible window plus `overscan` rows on each side, clamped to `[0, itemCount - 1]`.
  - First visible row: `floor(scrollTop / itemHeight)`.
  - Last visible row: the last row whose top edge is above `scrollTop + height`.
- [ ] Each mounted row is `itemHeight` px tall and sits at its true vertical offset (`index × itemHeight`), using absolute positioning, `transform`, or top/bottom spacer elements.
- [ ] Recompute the window when the container scrolls.
- [ ] Call `renderItem(index)` only for mounted rows.
- [ ] When `itemCount` is `0`, render the text `No items` instead of the list.
- [ ] If `itemCount` shrinks below the current window, don't render rows at or beyond `itemCount`.

## Non-functional requirements
- **Accessibility:**
  - The scroll container has `role="list"` and `aria-label={label}`, and is keyboard-focusable (`tabIndex={0}`) so it can be scrolled with the arrow keys.
  - Each mounted row has `role="listitem"`, `aria-setsize={itemCount}` and `aria-posinset={index + 1}`, because assistive tech can't count rows that aren't in the DOM.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowUp` / `ArrowDown`, `PageUp` / `PageDown`, `Home` / `End` (container focused) | Native scrolling. The window must follow. |
- **Performance:**
  - Scrolling must not re-render rows that were already mounted and didn't move (stable keys by `index`).
  - The work per scroll event is O(visible rows), never O(itemCount).
  - Avoid layout reads in render; read `scrollTop` from the scroll event.
  - Scrolling 10,000 rows in the Playground should hold 60 fps on a mid-range laptop.
- **UX:** no blank flashes at normal scroll speeds (that's what overscan is for).

## Constraints
- 60 minutes. React and CSS Modules only. No `react-window`, `react-virtual` or similar.
- `content-visibility: auto` is not an acceptable substitute for this exercise (discuss it instead).
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface VirtualizedListProps {
  itemCount: number;
  itemHeight: number;                     // px
  height: number;                         // px, viewport height
  renderItem: (index: number) => ReactNode;
  overscan?: number;                      // default 3
  label: string;                          // accessible name
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The scroll container is the element with role `list` and accessible name `label`, with inline style `height: <height>px`.
- Tests scroll by setting `list.scrollTop = N` and firing a `scroll` event on that same element. They then wait (`findBy…` / `waitFor`) for the new rows, so throttling with `requestAnimationFrame` is allowed.
- Tests render rows as text `Row <index>` and look for them with `getByText`.
- Mounted rows have role `listitem` with `aria-posinset` and `aria-setsize`.
- Tests allow slack on exact boundaries: rows well outside `window ± overscan` must not be mounted, rows inside it must be.
- An empty list renders the text `No items`.

## Edge cases
- `scrollTop` beyond the content height (momentum scrolling, or `itemCount` just shrank).
- `height` smaller than `itemHeight`: one partially visible row.
- `overscan = 0`.
- `itemCount` less than a screenful: no virtualization is visible, every row renders.
- `renderItem` is a new function on every parent render. The list should still work, and you should be able to explain the performance cost.

## Follow-ups
1. **Variable row heights.** Replace `itemHeight` with `getItemHeight(index)`. Precompute prefix offsets and use binary search to find the first visible row. What is the cost of a height change at index 0?
2. **Measured heights.** Heights aren't known until rows render (e.g. wrapping text). Estimate first, measure mounted rows with `ResizeObserver`, and keep the scroll position stable when measurements above the viewport change.
3. **`scrollToIndex`.** Expose an imperative handle (`ref.current.scrollToIndex(i, { align: 'start' | 'center' | 'auto' })`) with `useImperativeHandle`.
4. **Keyboard row navigation.** Make rows selectable with `ArrowUp`/`ArrowDown` using `aria-activedescendant`. The active row must stay mounted and scroll into view even when it's far from the current window.
5. **Grid virtualization.** Virtualize both rows and columns for a 10,000 × 50 spreadsheet. What changes in the math, and how do sticky headers work?

## Concepts covered
Windowing math · scroll events and `scrollTop` · absolute positioning vs spacer elements · overscan · stable keys · render cost vs DOM size · ARIA `aria-setsize` / `aria-posinset`.

Related: S03 Infinite Scroll Feed · S08 Data Table · J11 Pagination.
