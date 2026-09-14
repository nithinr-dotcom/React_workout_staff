# Calendar Day/Week View with Overlapping Events

## Problem statement
Build the week view of a calendar app, like Google Calendar. Seven day columns sit next to a time gutter (`00:00` to `23:00`). Each event is a block whose vertical position and height match its start and end times. When events overlap in time, they sit side by side and share the column's width.

The heart of this question is Facebook's classic **layOutDay** puzzle. Write it as a pure function, `layoutEvents(events)`, which takes one day's events (in minutes since midnight) and returns where each block goes. The `WeekView` component is a thin layer on top: it splits events by day, calls `layoutEvents` for each day and positions the blocks.

Layout rules (from the original puzzle):
1. Two events **collide** when their time ranges overlap. An event ending at `10:00` does not collide with one starting at `10:00`.
2. Colliding events never overlap horizontally.
3. Every colliding event has the **same width** as every event it collides with. Because this applies transitively, a whole chain of colliding events (a *cluster*) shares one width.
4. Subject to rules 2 and 3, each event is as **wide as possible**.
5. Placement: each event takes the leftmost column that is free when it starts, considering the events that start before it.

Example: 09:00–10:00, 09:30–10:30 and 10:15–11:00 form one cluster that needs two columns. So all three are 50% wide: the first at left 0%, the second at 50%, the third back at 0%. A separate 13:00–14:00 event is 100% wide.

## Clarifying questions to ask
- What units does the layout function use? *(Minutes since local midnight in, minutes for `top`/`height` and percentages for `left`/`width` out. The component converts to pixels or CSS.)*
- Should an event expand into empty columns to its right, like Google Calendar does? *(No. Every event in a cluster has the same width, as in the Facebook puzzle. Expansion is a good follow-up discussion.)*
- Which day does the week start on? *(Whatever `weekStart` is. The view shows 7 days from that local midnight.)*
- Can an event cross midnight or last all day? *(Not in the base version. Assume events start and end on the same day. Multi-day events are follow-up 2.)*
- Where does "now" come from? *(A `now` prop that returns a `Date`, defaulting to the real clock. Tests always pass it.)*
- How tall is an hour? *(Your choice. A fixed pixel height per hour, e.g. 48px, is fine.)*

## Functional requirements
- [ ] `layoutEvents(events)` returns exactly one `{ id, top, height, left, width }` per input event and never mutates the input.
- [ ] `top` is the start in minutes; `height` is `end - start` in minutes.
- [ ] `left` and `width` are percentages that satisfy the layout rules above: an event that collides with nothing is `left 0`, `width 100`.
- [ ] The component renders a time gutter with 24 hour labels `00:00` … `23:00`.
- [ ] It renders 7 day columns starting at `weekStart`, each with a header like `Mon 14`.
- [ ] Each event that falls inside the week appears in its day's column, positioned from `layoutEvents`. Events outside the week are not rendered.
- [ ] Each event is a button that shows the title and time. Clicking it calls `onEventClick(event)` with the original event object.
- [ ] Inside a day, event buttons appear in DOM (and tab) order sorted by start time, whatever order they came in.
- [ ] When `now()` falls inside the displayed week, a horizontal now-indicator line is drawn in today's column at the current time. It moves every minute. It isn't rendered for other weeks.
- [ ] On mount, the scroll container scrolls so that `08:00` is at the top.

## Non-functional requirements
- **Accessibility:**
  - Each day column is a `group` labelled with the full date, so screen reader users know which day an event belongs to.
  - Events are native `<button>`s with a full accessible name (title plus start and end time), because a block's position means nothing to a screen reader.
  - The now indicator has a text label with the current time.
  - Colour is never the only way to tell events apart; the title is always visible when the block is tall enough.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move through events, day by day, each day in start-time order |
  | `Enter` / `Space` | Open the focused event (`onEventClick`) |

- **Performance:** `layoutEvents` should be O(n log n) for one day. Recompute layouts only when `events` or `weekStart` change, not every minute when the now line moves.
- **Styling:** the gutter and day headers stay visible while the grid scrolls vertically (sticky). Hour lines on the grid. Short events (15 minutes) still show at least a sliver and keep their accessible name.

## Constraints
- 90 minutes. React and CSS Modules only. No date or calendar libraries.
- Keep the public types in `types.ts` unchanged. `Solution.tsx` default-exports `WeekView` and also exports `layoutEvents`.

## Data / API contract
```ts
interface TimedEvent { id: string; start: number; end: number } // minutes since midnight
interface EventLayout {
  id: string;
  top: number;    // minutes (= start)
  height: number; // minutes (= end - start)
  left: number;   // percent 0–100
  width: number;  // percent 0–100
}
function layoutEvents(events: TimedEvent[]): EventLayout[];

interface CalendarEvent { id: string; title: string; start: Date; end: Date } // local time
interface WeekViewProps {
  events: CalendarEvent[];
  weekStart: Date;                         // local midnight of the first day
  onEventClick?: (event: CalendarEvent) => void;
  now?: () => Date;                        // default () => new Date()
}
```

## Test contract
- `layoutEvents` is unit-tested with minute values. Results are looked up by `id`, so output order doesn't matter. Percentages are compared with `toBeCloseTo` (e.g. `33.33`).
- One test lays out a larger generated day and checks the rules as properties: colliding events never overlap horizontally, colliding events have equal widths, and every width equals `100 / columnsNeeded` for its cluster.
- Tests use `weekStart = new Date(2026, 8, 14)` (Monday 14 September 2026, local time).
- Each day column is a `group` whose accessible name is the date formatted with `toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })`, e.g. `Monday, September 14`.
- Each event is a `button` named `<title>, HH:MM to HH:MM` in 24-hour time, e.g. `Standup, 09:00 to 09:30`. Set it with `aria-label` if the visible text differs.
- The gutter shows each hour label as its own text node, e.g. `getByText('08:00')`.
- The now indicator is found with `getByLabelText('Current time, HH:MM')`, e.g. `Current time, 10:15`, inside today's `group`. Tests advance fake timers by 60 seconds and expect the label to update.
- Scrolling to 08:00 is not tested (jsdom has no layout).

## Edge cases
- Events passed in any order, including several with the same start time.
- Touching events (`end === start`) share no width.
- A long event that collides with two short events that don't collide with each other: all three are 50% wide.
- A chain where A collides with B and B with C, but A and C don't collide: still one cluster.
- A 5-minute event: it needs a minimum rendered height, but `layoutEvents` still returns the true `height`.
- `weekStart` in a week with a daylight-saving change: step days with `setDate(d + 1)`, not by adding 24 hours of milliseconds.
- `events` changes while the view is mounted: layouts recompute and the now line keeps ticking.

## Follow-ups
1. **Drag to reschedule.** Drag an event up/down (and across days) with the pointer. Snap to 15-minute steps, show a ghost while dragging, and call `onEventChange(id, { start, end })` on drop. Escape cancels. Offer a keyboard alternative too.
2. **All-day and multi-day events.** Add an all-day row above the grid. Events that span midnight are split into per-day segments in the grid, and multi-day all-day events stretch across columns in the all-day row.
3. **Create by dragging on empty space.** Press on an empty slot and drag to draw a new event, snapped to 15 minutes, then open a small "New event" popover to name it.
4. **Timezones and DST.** Add a `timeZone` prop so the grid shows another zone than the browser's. What happens on the 23-hour and 25-hour days, and to an event that starts at 02:30 on a spring-forward day?
5. **Expand into free space.** Change the layout so an event stretches right over columns that are empty for its whole duration (Google Calendar style). Which of the original rules does this break?

## Concepts covered
Interval collision · sweep line over sorted starts · greedy column packing · clusters as connected components · pure layout logic separated from rendering · local-time `Date` arithmetic · sticky headers in a scroll container · an injected clock with a minute tick.

Related: S14 Date Picker · S04 Virtualized List · S18 Kanban Board.
