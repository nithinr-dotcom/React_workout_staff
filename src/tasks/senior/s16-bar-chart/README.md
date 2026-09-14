# Interactive Bar Chart

## Problem statement
Build a `BarChart` component with plain SVG. No charting library. It draws one vertical bar per datum, scaled to a "nice" maximum, with a y-axis of labelled ticks and category labels along the x-axis. Hovering or focusing a bar shows a tooltip with its label and value. Keyboard users can move between bars with the arrow keys, and a toggle sorts the bars by value.

Atlassian asks a version of this for sprint velocity charts. Expect questions about scales, SVG coordinates, and how to make a chart accessible.

## Clarifying questions to ask
- Can values be negative? *(No, assume values are ≥ 0. Negative values are a follow-up.)*
- What should the y-axis maximum be? *(A "nice" number at or above the largest value, see below, so ticks are round.)*
- Fixed size or responsive? *(Responsive: the SVG uses a `viewBox` and fills its container's width.)*
- Where does the tooltip render? *(Your choice: inside the SVG or as positioned HTML over it.)*
- How are values formatted? *(With `valueFormatter`, defaulting to `String(value)`.)*
- Animations? *(Nice to have.)*

## Functional requirements
- [ ] Render the chart inside a `<figure>` whose `<figcaption>` is `title`, and name the figure with `aria-labelledby` pointing at the caption.
- [ ] Render one bar per datum, in `data` order, left to right, with equal widths and gaps, and the category label under each bar.
- [ ] **Scale:** `niceMax` is the smallest number of the form `1`, `2` or `5` × 10ⁿ that is ≥ the largest value (e.g. 37 → 50, 120 → 200, 5 → 5, 0.3 → 0.5). If every value is 0, use `niceMax = 1`.
- [ ] Bar height is proportional to `value / niceMax` of the plot area's height. A value of 0 renders a zero-height bar that is still focusable.
- [ ] **Y-axis:** 6 ticks at `0, niceMax/5, … , niceMax`, each with a gridline and a label formatted with `valueFormatter`.
- [ ] **Tooltip:** hovering a bar or focusing it shows a tooltip containing the bar's label and formatted value, positioned near the bar. Moving the pointer out, blurring, or pressing `Escape` hides it. Only one tooltip is visible at a time.
- [ ] **Keyboard:** every bar is reachable with `Tab`. `ArrowRight`/`ArrowLeft` move focus to the next/previous bar (no wrap), `Home`/`End` to the first/last.
- [ ] **Sort toggle:** a `Sort by value` toggle button. When on, bars are ordered by value descending (ties keep `data` order); when off, `data` order is restored. Bars must be in the new order in the DOM, so Tab and arrow order match what is on screen.
- [ ] With empty `data`, render the title and the text `No data` instead of the chart.

## Non-functional requirements
- **Accessibility:**
  - Each bar is a focusable SVG element (`tabIndex={0}`) with `aria-label="<label>: <formatted value>"`, e.g. `Sprint 42: 34`.
  - The tooltip has `role="tooltip"` and the focused bar references it with `aria-describedby` while it is visible.
  - Decorative parts (gridlines, tick marks) are `aria-hidden`.
  - The sort toggle is a `<button>` with `aria-pressed`.
  - Visible focus indicator on bars (SVG `outline` support is patchy; consider a stroke).
- **Responsive:** the `<svg>` has a `viewBox="0 0 width height"`, `width="100%"`, and no fixed pixel height, so it scales with its container. Text stays readable.
- **Performance:** scale and tick computation are derived with `useMemo` from `data`. Hovering one bar must not re-sort or rebuild the scale.
- **Styling:** leave margins for axis labels; long category labels are truncated or rotated, not overlapping.

## Constraints
- 75 minutes. React, SVG and CSS Modules only. No D3, Recharts, Chart.js, etc.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface BarDatum { label: string; value: number }
interface BarChartProps {
  title: string;
  data: BarDatum[];
  width?: number;                          // viewBox width, default 600
  height?: number;                         // viewBox height, default 300
  valueFormatter?: (value: number) => string;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The chart is a `figure` named by `title`. jsdom doesn't derive a figure's name from `<figcaption>`, so link them explicitly with `aria-labelledby`.
- Bars are found with `getAllByLabelText(/^<label>: /)` / `getByLabelText('<label>: <formatted>')`. The labelled element **is the `<rect>`** of the bar, with `tabindex="0"` and a numeric `height` attribute; tests compare heights between bars as ratios, so any plot height works.
- Tick labels are SVG `<text>` found with `getByText`. For data whose max is 37, the texts `0`, `10`, `20`, `30`, `40`, `50` exist. Don't render bar values as visible text that duplicates tick labels.
- The tooltip is the element with `role="tooltip"`. When hidden it is either not in the DOM or has the `hidden` attribute, so `queryByRole('tooltip')` returns `null`.
- The sort toggle is a `button` named `Sort by value` with `aria-pressed="true|false"`.
- Empty data shows the text `No data`.
- The `<svg>` element has a `viewBox` attribute.
- Hover is simulated with `user.hover`/`user.unhover`; focus with `.focus()` on a bar.

## Edge cases
- A single bar.
- All values equal to 0.
- Very small (`0.3`) and very large (`1_530_000`) maxima.
- 50 bars in a narrow container: bar width must not go negative.
- Duplicate labels: keys and ids can't come from the label alone (and index keys break focus when sorting).
- `data` changing while a tooltip is open for a bar that disappears.

## Follow-ups
1. **Negative values.** Support negative values with a zero baseline in the middle of the plot and a nice minimum.
2. **Grouped / stacked bars.** Accept series (`committed` vs `completed` points per sprint) and render grouped or stacked bars with a legend that can toggle series.
3. **Animated transitions.** Animate bar heights and positions when data or sort order changes, and respect `prefers-reduced-motion`.
4. **Screen-reader data table.** Provide an accessible alternative: a visually hidden `<table>` with the same data, or a "View as table" toggle. Compare that with per-bar labels.
5. **Tooltip edge collision.** Keep the tooltip inside the chart when a bar is at the far left or right, and above the bar unless there is no room.

## Concepts covered
SVG coordinate system (y grows downward) · `viewBox` responsiveness · linear scales · nice-number ticks · accessible SVG (`tabIndex`, `aria-label`, `role="tooltip"`) · roving focus with arrow keys · derived sorted data with `useMemo`.

Related: S08 Data Table (sorting) · S04 Virtualized List · S13 Selectable Cells.
