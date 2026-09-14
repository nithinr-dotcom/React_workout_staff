# Traffic Light

## Problem statement
Build a `TrafficLight` component. It shows three lamps stacked vertically, and exactly one is lit. The light cycles **red → green → yellow → red → …** forever. Each colour stays on for its own configurable duration.

The UI is trivial. The interviewer wants to see a clean timer model: one pending timer at a time, driven by the current state, cleaned up on unmount, and not leaking or doubling up when React re-runs effects.

## Clarifying questions to ask
- What's the order? *(Red → green → yellow → red. Yellow comes after green.)*
- Are the durations fixed? *(No. They come from props, with defaults of red 4000 ms, green 3000 ms and yellow 1000 ms.)*
- Can the light start on a colour other than red? *(Yes, via `initialColor`.)*
- Do we need pedestrian buttons, or a pause? *(Not in the base version. See the follow-ups.)*

## Functional requirements
- [ ] Render three lamps (red, yellow, green, top to bottom). Only the current colour is lit. The others are dimmed.
- [ ] Start on `initialColor` (default `red`).
- [ ] After the current colour's duration, move to the next colour in the cycle: red → green → yellow → red.
- [ ] `durations` can override any subset of the defaults (`{ red: 4000, green: 3000, yellow: 1000 }`).
- [ ] Render a text description of the current state: `Current light: Red`, `Current light: Green` or `Current light: Yellow`. It may be visually hidden.
- [ ] On unmount, no timers are left pending.

## Non-functional requirements
- **Accessibility:**
  - The lamps are decorative (`aria-hidden`), because colour alone must not carry meaning.
  - The `Current light: …` text is the accessible source of truth.
  - Don't make it an `aria-live` region that interrupts every few seconds. Screen-reader users can read it when they need it.
- **Timers:**
  - At most one pending timer at any moment.
  - Don't use a 1-second `setInterval` that counts seconds. Schedule the next change from the current colour's duration.
  - Must behave correctly under React Strict Mode, where effects mount, unmount and mount again.
- **Keyboard:** no interactive elements in the base version.
- **Styling:** a dark housing, round lamps, and a glow on the lit lamp.

## Constraints
- 30 minutes. React and CSS Modules only.
- No mock API.

## Data / API contract
```ts
type LightColor = 'red' | 'yellow' | 'green';
type LightDurations = Record<LightColor, number>;
const DEFAULT_DURATIONS: LightDurations = { red: 4000, green: 3000, yellow: 1000 };
interface TrafficLightProps {
  durations?: Partial<LightDurations>;
  initialColor?: LightColor; // default 'red'
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Tests use `vi.useFakeTimers()` (faking `setTimeout`/`setInterval`) and advance time inside `act`, one phase at a time.
- The state is read with `getByText('Current light: Red' | 'Current light: Green' | 'Current light: Yellow')`.
- A colour must not change before its full duration has elapsed, and must change once it has.
- After `unmount()`, `vi.getTimerCount()` is `0`.

## Edge cases
- A duration of `0`: move on at the next tick, without an infinite synchronous loop.
- `durations` is passed as a new object literal on every parent render. The timer must not restart on each render and push the change back forever.
- Strict Mode double-mount: exactly one timer.

## Follow-ups
1. **Live duration changes.** When `durations` changes while a light is on, apply the new duration to the *current* light, counting the time already elapsed. How do you avoid restarting the timer when the object identity changes but the values don't?
2. **Pause / resume.** Add a toggle button (`Pause` / `Resume`, with `aria-pressed`). Resuming continues with the remaining time, not the full duration.
3. **Config-driven machine.** Accept `sequence: { color: string; duration: number }[]` (for example, a flashing yellow at night, or a 4-light UK sequence with red+amber). The component shouldn't know about specific colours.
4. **Pedestrian request.** Add a `Request crossing` button that shortens the current green to at most 1000 ms remaining.

## Concepts covered
`useEffect` cleanup · `setTimeout` chains vs `setInterval` · modelling a finite state machine as a transition table · stable dependencies for object props · testing with fake timers.

Related: J07 Stopwatch & Countdown · J16 Grid Lights · J12 Image Carousel (autoplay).
