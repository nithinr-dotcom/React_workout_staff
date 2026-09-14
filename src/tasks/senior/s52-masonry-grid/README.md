# Masonry Photo Grid

## Problem statement
Build a Pinterest-style masonry grid of photos. All columns have the same width, but each photo keeps its own aspect ratio, so columns have different heights. Each new photo goes into whichever column is currently **shortest**, so the columns stay roughly level.

Split the work in two:
- `computeMasonry(items, columnCount, columnWidth, gap)`: a **pure** function that returns a pixel position for every item.
- `<Masonry />`: a component that works out how many columns fit in its container, calls `computeMasonry`, and absolutely positions each photo. It asks for more photos when the user scrolls near the end.

The DOM order of the photos must stay the same as the input order, whatever column each one lands in. That way keyboard and screen reader users read the photos in the order the data gave them.

## Clarifying questions to ask
- Do we know image sizes before they load? *(Yes. Every item has intrinsic `width` and `height`, as a real API would return. Unknown sizes are follow-up 2.)*
- Plain CSS columns (`column-count`) or JS layout? *(JS layout. CSS columns fill top-to-bottom, column by column, which scrambles reading order and reshuffles everything when you append items.)*
- How is the column count chosen? *(As many columns of at least `minColumnWidth` as fit, counting gaps, and at least one. A `columns` prop forces a fixed count.)*
- If two columns are equally short, which one wins? *(The leftmost.)*
- Should the layout animate when columns change? *(Nice to have, not required.)*
- How do we know when to load more? *(A sentinel element after the grid, watched by an IntersectionObserver.)*

## Functional requirements
- [ ] `computeMasonry` scales each item to `columnWidth`, keeping its aspect ratio: `height = columnWidth × item.height / item.width`.
- [ ] Items are placed in input order. Each goes to the column with the smallest current height; ties go to the leftmost column.
- [ ] An item's `x` is `column × (columnWidth + gap)`. Its `y` is the column's height so far, with `gap` between stacked items (no gap above the first item).
- [ ] `computeMasonry` returns one position per item, in input order, and doesn't mutate its input.
- [ ] The component derives the column count from the container width: the largest `n ≥ 1` such that `n × minColumnWidth + (n − 1) × gap ≤ width`. The column width then fills the container exactly: `(width − (n − 1) × gap) / n`.
- [ ] `columns` overrides the derived count.
- [ ] If `width` is passed, use it. Otherwise measure the container with a `ResizeObserver` and re-layout when it resizes.
- [ ] Each photo's box is sized from the layout **before** the image loads (no layout shift). The list itself is as tall as its tallest column.
- [ ] When a sentinel after the grid comes into view and `hasMore` is true, call `onLoadMore` once. Don't call it again until `items` grows.

## Non-functional requirements
- **Accessibility:**
  - The grid is a list labelled `label`. Each photo is a list item with an `<img>` whose `alt` is the item's `alt`.
  - DOM order equals input order, so tab and reading order don't jump between columns.
  - Announce newly loaded photos politely (optional), e.g. "20 more photos loaded".
- **Keyboard:** no custom keys. If photos contain links or buttons, the native tab order follows the input order.
- **Performance:**
  - The layout is O(items × columns). Memoize it on items, column count, column width and gap.
  - Resizing the window must not re-render on every pixel when the column count and width are unchanged. Consider rounding widths.
  - Use `loading="lazy"` and `decoding="async"` on images.
- **Styling:** rounded photo cards, a subtle placeholder colour while an image loads, and a smooth fade-in.

## Constraints
- 75 minutes. React and CSS Modules only. No masonry or virtualisation libraries.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports `Masonry` and also exports `computeMasonry`.

## Data / API contract
```ts
interface MasonryItem { id: string; width: number; height: number } // intrinsic size
interface Photo extends MasonryItem { src: string; alt: string }
interface MasonryPosition { id: string; column: number; x: number; y: number; width: number; height: number }

function computeMasonry(items: MasonryItem[], columnCount: number, columnWidth: number, gap: number): MasonryPosition[];

interface MasonryProps {
  items: Photo[];
  minColumnWidth: number;
  columns?: number;       // fixed column count, overrides minColumnWidth
  gap?: number;           // default 16
  width?: number;         // container width; measured with ResizeObserver when omitted
  onLoadMore?: () => void;
  hasMore?: boolean;      // default false
  label?: string;         // default 'Photos'
}
```

## Test contract
- `computeMasonry` is unit-tested with small numbers. Values are compared with `toBeCloseTo`.
- The component renders a `list` named `label` (default `Photos`) with one `listitem` per photo, in input order. Each item contains an `img` whose accessible name is `alt`.
- jsdom has no layout, so tests read the **inline style** of each `listitem`. Position every item with inline `position: absolute` plus `left`, `top`, `width` and `height` in px (not `transform`). The `list` has an inline `height` in px equal to its tallest column.
- Without a `width` prop, tests replace `ResizeObserver` with a fake and call its callback with `[{ contentRect: { width } }]`. Read the width from `entry.contentRect.width`.
- Infinite loading: tests replace `IntersectionObserver` with a fake, then call its callback with `[{ isIntersecting: true, target }]` for every observed element.

## Edge cases
- `items` is empty: an empty list with height 0, and no crash.
- Container narrower than `minColumnWidth`: one column that fills the container.
- A very tall panorama next to many small photos: later photos keep filling the shorter columns.
- An item with `width` 0 or missing dimensions: don't divide by zero. Fall back to a square.
- The column count changes on resize: every position is recomputed, and DOM order doesn't change.
- `onLoadMore` fires, then the sentinel stays visible because the new page is small: it may fire again only after `items` has grown.

## Follow-ups
1. **Thousands of items.** The feed has 10,000 photos. Only render items whose `y` range is near the viewport. Explain why masonry makes this harder than a regular list: you can't compute row offsets, but you do know every position after layout. How do you find the visible items quickly?
2. **Unknown image heights.** The API stops sending `width`/`height`. Render placeholders, measure each image on load, then re-layout without making the page jump under the user.
3. **Reading order vs visual order.** A user tabs through the grid and focus jumps from the bottom of column 1 to the top of column 2. Compare the trade-offs: DOM order = input order (what you built), DOM order = column order, or a roving-tabindex grid with arrow keys that follow the visual layout.
4. **CSS instead of JS.** Compare your solution with `grid-template-rows: masonry` (and `display: grid-lanes`), with CSS `columns`, and with a flexbox column-per-column approach. What does each do to reading order, appending items and browser support?
5. **Variable spans.** Some featured photos should span two columns. How does shortest-column-first change?

## Concepts covered
Greedy shortest-column packing · a pure layout function that is trivial to unit test · deriving layout from container width with `ResizeObserver` · reserving space with known aspect ratios to avoid CLS · absolute positioning vs CSS columns · IntersectionObserver sentinels · DOM order vs visual order.

Related: S03 Infinite Scroll · S04 Virtualized List · J12 Image Carousel.
