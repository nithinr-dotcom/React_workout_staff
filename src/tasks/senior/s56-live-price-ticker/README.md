# Live Price Ticker / Order Book

## Problem statement
Build the live prices table from a trading app, like a slice of the Coinbase Pro UI. Each row is an instrument, with columns for symbol, price, change and change %. Prices stream in from a `subscribe` function.

When a price goes up, its cell flashes green for about 600ms. When it goes down, the cell flashes red. If another tick arrives during a flash, the flash starts over. The user can sort by change % (biggest gainers or losers first), and can pause and resume the stream.

A real feed can send hundreds of ticks per second, far more often than the screen repaints. Collect bursts and update the table **at most once per animation frame**. Interviewers mostly want to see that you avoid a render per tick.

## Clarifying questions to ask
- What does the feed look like? *(`subscribe(onTick)` returns an `unsubscribe` function. Each tick is `{ symbol, price }`. Ticks for unknown symbols are ignored.)*
- What is "change" measured against? *(Each instrument's `open` price. Before the first tick, the price shown is `open`, so change is 0.)*
- If several ticks for one symbol arrive in the same frame, which wins? *(The last one. The flash direction compares it with the price currently on screen.)*
- Does the sort order update live as prices move? *(Yes. Rows re-sort on every frame while a sort is active. Follow-up discussion: is that good UX?)*
- What does Pause do: stop rendering, or stop the subscription? *(Unsubscribe. Resume subscribes again. Prices shown while paused stay frozen.)*
- Locale? *(`en-US` formatting through `Intl.NumberFormat`. The currency comes from the `currency` prop.)*

## Functional requirements
- [ ] Render a table with columns `Symbol`, `Price`, `Change`, `Change %` and one row per instrument, in input order. Show the instrument name next to the symbol.
- [ ] Subscribe on mount and unsubscribe on unmount. Cancel any pending frame on unmount.
- [ ] Buffer incoming ticks and apply them on the next animation frame (`requestAnimationFrame`). A burst of ticks in the same frame causes one render, and the latest price per symbol wins.
- [ ] Price = latest price. Change = price − open. Change % = change ÷ open.
- [ ] Formatting uses `Intl.NumberFormat('en-US', …)`:
  - Price: currency style, e.g. `$64,251.50`.
  - Change: 2 decimals with a sign except for zero, e.g. `+1.50`, `-2.25`, `0.00`.
  - Change %: percent style with 2 decimals and a sign except for zero, e.g. `+0.75%`, `-1.20%`, `0.00%`.
  - Create formatters once, not per cell per render.
- [ ] When a row's price rises, its price cell flashes "up" (green). When it falls, it flashes "down" (red). An unchanged price doesn't start a flash. The flash ends 600ms after the latest change. A new change during a flash restarts it (and switches direction if needed).
- [ ] The `Change %` column header is a sort button. The first click sorts descending (biggest gain first), and each later click toggles between ascending and descending. While sorted, rows re-order as prices change.
- [ ] A `Pause` button unsubscribes and changes to `Resume`. `Resume` subscribes again and changes back to `Pause`.

## Non-functional requirements
- **Accessibility:**
  - Use a real `<table>` with a caption and `<th scope="col">` headers.
  - The sorted column header has `aria-sort="ascending"` or `"descending"`. The sort button's name stays `Change %`; any arrow icon is `aria-hidden`.
  - Don't put the table in a live region, because announcing every tick would be unusable. Direction must not rely on colour alone: the change is signed, and you can add an arrow.
  - Respect `prefers-reduced-motion`: swap the flash for a static tint.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between the sort button and `Pause`/`Resume` |
  | `Enter` / `Space` | Toggle sort or pause (native button behaviour) |

- **Performance:**
  - At most one React commit per animation frame, however many ticks arrive.
  - Keep the tick buffer in a ref, not in state.
  - Rows whose price didn't change in a frame shouldn't re-render (memoized rows).
  - Restarting the CSS flash animation needs a trick, because re-adding the same class does nothing. Know at least one way to do it.
- **Styling:** use tabular numbers (`font-variant-numeric: tabular-nums`) so digits don't jiggle. Right-align numeric columns. The flash is a background animation that fades out.

## Constraints
- 75 minutes. React and CSS Modules only. No data-grid or animation libraries.
- Keep the public types in `types.ts` unchanged.
- `data.ts` exports `INSTRUMENTS` and `createFakeFeed(instruments, options)`, a random-walk feed that sends ticks in bursts. The Playground uses it; tests use their own fake feed.

## Data / API contract
```ts
interface Tick { symbol: string; price: number }
type Subscribe = (onTick: (tick: Tick) => void) => () => void;
interface Instrument { symbol: string; name: string; open: number }

interface PriceTickerProps {
  instruments: Instrument[];
  subscribe: Subscribe;
  currency?: string; // default 'USD'
}
```

## Test contract
- Tests use `vi.useFakeTimers()`, which also fakes `requestAnimationFrame` (a frame every 16ms). They advance about 20ms inside `act` to flush a frame, so batch with `requestAnimationFrame`, not `setTimeout(0)` or microtasks.
- The fake feed keeps a set of listeners. `subscribe` and the returned `unsubscribe` are spies. Each tick is delivered inside `act`.
- The table is a `table` named `Live prices`. Column headers are `columnheader`s named `Symbol`, `Price`, `Change` and `Change %`.
- Rows are found by the symbol text, which must be its own element (`getByText('AAPL')`). Price, change and change % are each their own cell's text, e.g. `$203.50`, `+3.50`, `+1.75%`.
- **Flash:** while flashing, the price text's element or one of its ancestors in the row has `data-flash="up"` or `data-flash="down"`. When the flash ends, that attribute is removed. Tests use `closest('[data-flash]')`. Style your flash from this attribute.
- **Sort:** a `button` named `Change %` inside the `Change %` header. The header's `aria-sort` becomes `descending`, then `ascending`.
- Buttons `Pause` / `Resume`.
- **Coalescing:** a test wraps the ticker in `<Profiler>` and counts commits while 8 ticks arrive 2ms apart (16ms in total, so at most two frames). It expects at most 2 commits.

## Edge cases
- Up then down within the same frame, ending below the displayed price: one "down" flash.
- A tick with the same price as displayed: no flash, no re-render of that row.
- A tick for a symbol not in `instruments`: ignored.
- Unmount with a frame pending: the rAF callback must not set state after unmount.
- Pause while a flash is running: the flash still finishes.
- `subscribe` prop changes (a new feed): unsubscribe from the old one and subscribe to the new one.
- `open` is 0: avoid `Infinity%`.

## Follow-ups
1. **Order book.** Add bids and asks panels next to the ticker. The feed now sends `{ side, price, size }` updates, where size 0 removes the level. Aggregate levels by a selectable price increment (0.01 / 0.1 / 1), keep the top 15 on each side sorted correctly, and show the spread.
2. **Depth bars.** Behind each order-book row, draw a horizontal bar proportional to the cumulative size up to that level. Make sure bar widths don't force a layout on every frame.
3. **Only visible rows subscribe.** There are 2,000 instruments and the feed lets you subscribe per symbol. Subscribe only to the rows in the viewport (IntersectionObserver or virtualization), with some hysteresis so fast scrolling doesn't churn subscriptions.
4. **Reconnect and stale indicator.** The feed can drop. Show `Live` / `Reconnecting…` / `Stale (last update 12s ago)`. Reconnect with exponential backoff and jitter, and grey out prices older than 5 seconds.

## Concepts covered
Subscriptions in effects with cleanup · batching high-frequency updates with `requestAnimationFrame` · refs for data that shouldn't trigger renders · restarting CSS animations · `Intl.NumberFormat` currency and percent styles with `signDisplay` · derived, stable sorting · `aria-sort` · memoized rows.

Related: S19 Chat UI · ST10 Real-time Notification Feed · S08 Data Table.
