# Progress Bars Queue

## Problem statement
Build a `ProgressQueue` component with an **Add** button. Each click appends a new progress bar that fills from 0% to 100% over `duration` milliseconds.

At most `concurrency` bars (default 3) can fill at the same time. Extra bars wait in a first-in, first-out queue at 0% and start as soon as a running bar finishes. A **Pause** button freezes every running bar where it is. **Resume** continues from exactly that point. **Reset** clears everything.

This is a classic escalation question: interviewers usually start with "one bar that fills", then add "several bars", then "only 3 at a time", then "pause and resume".

## Clarifying questions to ask
- Does a queued bar start from 0 when a slot frees up? *(Yes. Queued bars show 0% until they start.)*
- Does paused time count towards `duration`? *(No. A bar fills after `duration` ms of running time.)*
- If I add a bar while paused, does it start? *(No. It waits until Resume, and then only if a slot is free.)*
- Which queued bar starts first? *(The oldest one: FIFO by creation order.)*
- Do finished bars stay on screen? *(Yes, at 100%, until Reset.)*
- Is the fill a CSS animation or JS-driven? *(Your call, but `aria-valuenow` must stay accurate while it fills, so the progress value has to live in JavaScript.)*

## Functional requirements
- [ ] Render `Add`, `Pause` and `Reset` buttons, and no bars initially.
- [ ] `Add` appends a bar named `Bar 1`, `Bar 2`, … in creation order.
- [ ] A running bar's progress grows linearly with running time and reaches 100% after `duration` ms.
- [ ] At most `concurrency` bars are running at once. The remaining unfinished bars are queued at 0%.
- [ ] When a running bar reaches 100%, the oldest queued bar starts right away.
- [ ] A bar added while there is a free slot starts immediately.
- [ ] `Pause` freezes all running bars and its label changes to `Resume`. While paused, no bar makes progress, including newly added ones.
- [ ] `Resume` continues every bar from its paused progress. Time spent paused doesn't count.
- [ ] `Reset` removes every bar, restarts numbering at `Bar 1`, and leaves the component un-paused.
- [ ] No timers keep running when nothing is filling (everything finished, paused, or no bars), or after unmount.

## Non-functional requirements
- **Accessibility:** follow the [`progressbar` role](https://www.w3.org/TR/wai-aria-1.2/#progressbar).
  - Each bar has `role="progressbar"`, an accessible name (`Bar N`), `aria-valuemin="0"`, `aria-valuemax="100"` and an integer `aria-valuenow` (rounded down, so it only reads `100` when the bar is really done).
  - Optionally, `aria-valuetext` such as `Queued`, `45%` or `Done`.
  - The pause toggle is one `<button>`; its visible label says what clicking it will do.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves between Add, Pause/Resume and Reset |
  | `Enter` / `Space` | Activates the focused button (native) |

- **Accuracy:** progress is based on measured elapsed time, not on counting ticks. Timers are throttled in background tabs and a tick can arrive late, but a bar still finishes after `duration` ms of running time.
- **Performance:** one ticker for the whole component, not one timer per bar. It stops when nothing is running.
- **UX:** queued, running and finished bars look different (for example grey track, coloured fill, green when done). Show the percentage next to each bar.

## Constraints
- 60 minutes. React and CSS Modules only.
- Drive progress with `setTimeout`, `setInterval` or `requestAnimationFrame`, and measure time with `performance.now()` or `Date.now()`. The tests use Vitest fake timers, which control all of these.
- No data fetching: there's no mock API for this task.

## Data / API contract
```ts
interface ProgressQueueProps {
  duration?: number;     // ms of running time to fill one bar, default 2000
  concurrency?: number;  // max bars filling at once, default 3
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Buttons named `Add`, `Pause` (named `Resume` while paused) and `Reset`.
- Each bar is a `progressbar` named `Bar N` (1-based, creation order) with `aria-valuemin="0"`, `aria-valuemax="100"` and an integer `aria-valuenow`.
- Tests use `vi.useFakeTimers({ shouldAdvanceTime: true })` and `act(() => vi.advanceTimersByTime(ms))`, and allow a few percent of tolerance for tick granularity. For example, halfway through `duration` they expect a value between 35 and 65.

## Edge cases
- Clicking `Add` ten times quickly: exactly `concurrency` bars move.
- Pause right before a bar would finish, then Resume: it finishes after the remaining time, not a full `duration`.
- A late tick with a large gap (for example 5 seconds): progress clamps at 100% and never goes above it.
- `Reset` while bars are running and paused: no timer left behind, and the next `Add` starts fresh.
- Unmount while bars are running: no "state update on unmounted component" and no leaked intervals.
- `concurrency` or `duration` props change while bars are running (describe what you'd do).

## Follow-ups
1. **Per-bar controls.** Each bar gets its own pause/resume and cancel. A cancelled queued bar is removed, and a cancelled running bar frees its slot immediately.
2. **Real work instead of timers.** Replace the fake fill with real async jobs (for example uploads with `onProgress`) through a generic `createQueue({ concurrency })` utility that has no React in it. How do cancellation and retries fit in?
3. **Pure CSS fill.** Could the fill be a CSS animation that is paused with `animation-play-state`? What do you gain (fewer renders) and lose (`aria-valuenow`, knowing when a bar finished)?
4. **Priority.** `Add urgent` puts a bar at the front of the queue without interrupting running bars.
5. **Persistence.** Survive a page reload: store enough state to resume the queue, and explain why you store elapsed time rather than "percent" or start timestamps.

## Concepts covered
Timers in React and effect cleanup · measuring elapsed time vs counting ticks · deriving "running" and "queued" from one array instead of syncing several · `useReducer` for event-driven state · concurrency limiting · deterministic tests with fake timers.

Related: J23 debounce · J25 hooks pack (`useInterval`) · S10 Toast Notification System (timer pause on hover).
