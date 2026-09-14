# Stopwatch & Countdown

## Problem statement
Build one component with two tools side by side:

1. A **stopwatch** with millisecond precision, start/stop, laps and reset.
2. A **countdown** where the user enters minutes and seconds, then starts, pauses and resets it. A callback fires when it reaches zero.

The trap is timing. `setInterval(() => setMs(ms + 10), 10)` drifts: browsers throttle timers, callbacks run late, and background tabs pause them. The elapsed time must be computed from a clock, and the interval should only trigger re-renders.

## Clarifying questions to ask
- How precise must the display be? *(The stopwatch shows milliseconds, `mm:ss.mmm`. The countdown shows whole seconds, `mm:ss`.)*
- Can the clock be read directly? *(Read time only through the `now()` prop, which defaults to `performance.now()`, so tests can control it.)*
- Should the countdown show `00:03` or `00:02` when 2.4 s remain? *(`00:03`. Round up, so `00:00` appears only at the end.)*
- What are the lap times: splits since the previous lap, or total time? *(Splits since the previous lap, or since the start for lap 1. Newest first.)*
- Hours? *(Not needed. Minutes keep counting past 59, for example `75:00.000`.)*

## Functional requirements

**Stopwatch** (a section with the heading **Stopwatch**)
- [ ] The display starts at `00:00.000`.
- [ ] **Start** begins timing and is replaced by **Stop** while running. **Stop** freezes the display. **Start** again resumes from the frozen value.
- [ ] **Lap** is enabled only while running. It adds an entry `Lap N` with the split time since the previous lap. The newest lap is shown first.
- [ ] **Reset** is enabled only when stopped with a non-zero time. It sets the display back to `00:00.000` and clears the laps.
- [ ] While running, the display refreshes at least every 50 ms. The shown value is always *(clock now − start)* plus the previously accumulated time. It is never a sum of interval ticks.

**Countdown** (a section with the heading **Countdown**)
- [ ] Two number inputs, **Minutes** (0–99) and **Seconds** (0–59). They are disabled while the countdown is running or paused.
- [ ] The display shows the remaining time as `mm:ss`, rounded up to whole seconds. Before the first start, it shows the input values.
- [ ] **Start** begins counting down, and is disabled when the total is 0. While running it's replaced by **Pause**. After a pause, **Start** resumes from the remaining time.
- [ ] **Reset** stops the countdown and restores the entered duration.
- [ ] When the remaining time reaches 0: show `00:00`, stop, show the text `Time's up!`, and call `onCountdownComplete` exactly once. Detect this within 250 ms of the clock reaching the end.
- [ ] While running, the display refreshes at least every 250 ms.

**Both**
- [ ] No intervals or animation frames are left running after unmount, or while stopped.

## Non-functional requirements
- **Accessibility:**
  - Each tool is a `<section>` labelled by its heading, so it has the `region` role.
  - Each display has `role="timer"`.
  - The laps are a list labelled `Laps`.
  - `Time's up!` is announced with `role="alert"`.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Reach every button and input in order |
  | `Enter` / `Space` | Activate the focused button (native) |
- **Performance:** only the component that displays the time should re-render on each tick.
- **Styling:** use a monospace or `font-variant-numeric: tabular-nums` display, so digits don't jitter.

## Constraints
- 45 minutes. React and CSS Modules only.
- Read time **only** via the `now` prop. Using `Date.now()` directly will break the tests.

## Data / API contract
```ts
interface StopwatchCountdownProps {
  now?: () => number;                 // default () => performance.now()
  onCountdownComplete?: () => void;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `region`s named `Stopwatch` and `Countdown`. Tests query inside each with `within(...)`.
- Inside each region: one `timer`, whose text contains the formatted time.
- Stopwatch `button`s: `Start`, `Stop`, `Lap`, `Reset`. Only one of `Start` / `Stop` is present at a time.
- Laps: a `list` named `Laps`. Each `listitem` contains `Lap N` and the split as `mm:ss.mmm`. The newest is first.
- Countdown: `spinbutton`s labelled `Minutes` and `Seconds`, and `button`s `Start`, `Pause`, `Reset`. Only one of `Start` / `Pause` is present at a time.
- Completion text `Time's up!`, inside `role="alert"`.
- Tests fake `setTimeout`/`setInterval`/`requestAnimationFrame`, inject `now`, and move the injected clock and the fake timers forward separately, advancing timers in small `act()` slices. For example, the clock jumps 1234 ms while timers advance only 100 ms, which exposes tick-counting.

## Edge cases
- Clicking Start → Stop → Start quickly: the accumulated time must not be lost or counted twice.
- Laps recorded after a stop/resume: the split excludes the time spent stopped.
- Seconds input `75`, or an empty input: clamp or treat as 0, and never show `NaN`.
- A countdown that is paused exactly at zero, or reset after completing.
- The tab is in the background for a minute: when it comes back, the display jumps straight to the correct value.

## Follow-ups
1. **Hours and formatting.** Show `h:mm:ss.mmm` once an hour has passed, and localise the lap list with `Intl.NumberFormat`.
2. **Extract hooks.** Pull `useStopwatch(now)` and `useCountdown(durationMs, { now, onComplete })` out of the component and unit-test them with `renderHook`.
3. **requestAnimationFrame.** Drive the stopwatch display with `requestAnimationFrame` instead of an interval. Discuss the trade-offs: background tabs, battery, and re-render cost.
4. **Persist across reloads.** Keep a running stopwatch running through a page reload, by storing the start timestamp (wall clock) rather than elapsed ms.

## Concepts covered
Drift-free elapsed time (timestamps, not tick counts) · `useRef` for mutable timing data · `setInterval` cleanup · deriving display strings from state · formatting with `padStart` · callbacks that fire exactly once.

Related: J06 Traffic Light · J23 debounce · J24 throttle.
