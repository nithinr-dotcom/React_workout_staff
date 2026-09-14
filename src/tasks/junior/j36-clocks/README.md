# Digital & Analog Clock

## Problem statement
Build a `Clock` component that shows the current time and keeps ticking. It has two modes:

- **Digital** (`mode="digital"`) shows `HH:MM:SS`. A toggle switches between 24-hour and 12-hour time.
- **Analog** (`mode="analog"`) shows a round face with an hour hand, a minute hand and a second hand that rotate to the right angles.

A naive `setInterval(tick, 1000)` started at a random moment can show a seconds value up to a second late, and it drifts. Your clock must update right when the wall clock's second changes.

## Clarifying questions to ask
- 12-hour or 24-hour by default? *(24-hour. A `24-hour` toggle button switches to 12-hour with `AM`/`PM`.)*
- Leading zeros? *(Always two digits for hours, minutes and seconds in both formats: `09:05:03`, `02:05:09 PM`.)*
- How does 12-hour show midnight and noon? *(`12:00:00 AM` and `12:00:00 PM`.)*
- Does the hour hand jump each hour or move smoothly? *(It moves with the minutes: at 2:30 it sits halfway between 2 and 3. The minute hand likewise moves with the seconds. The second hand ticks once per second. A smooth sweep is a follow-up.)*
- Which time zone? *(The user's local zone. Time zones are follow-up 1.)*
- Should the 7-segment look from GreatFrontEnd be used for digits? *(Not required. It's follow-up 3.)*

## Functional requirements
- [ ] Read the time only through `now()` (default `() => new Date()`).
- [ ] Render the current time straight away on mount, with no blank first second.
- [ ] Update when the wall clock's second changes: the first update happens at the next whole-second boundary, and then once per second from there.
- [ ] Stop every timer on unmount.
- [ ] **Digital:** show `HH:MM:SS` in 24-hour mode. A toggle button named `24-hour` (pressed by default) switches to `hh:MM:SS AM|PM`.
- [ ] **Analog:** render an hour hand, a minute hand and a second hand, each rotated clockwise from 12 o'clock:
  - The second hand moves 6° per second.
  - The minute hand moves 6° per minute plus a share for the seconds.
  - The hour hand moves 30° per hour (12-hour dial) plus a share for the minutes.
- [ ] Both modes wrap the time in a `<time>` element whose `dateTime` is the 24-hour `HH:MM:SS`.
- [ ] Switching the `mode` prop swaps the view without restarting the timing logic in a broken state.

### Examples
| Time | Digital 24h | Digital 12h | Hour hand | Minute hand | Second hand |
|---|---|---|---|---|---|
| 03:00:00 | `03:00:00` | `03:00:00 AM` | 90° | 0° | 0° |
| 14:30:45 | `14:30:45` | `02:30:45 PM` | ~75° | 184.5° | 270° |
| 00:00:00 | `00:00:00` | `12:00:00 AM` | 0° | 0° | 0° |

## Non-functional requirements
- **Accessibility:**
  - The toggle is a `<button>` with `aria-pressed`. Its label stays `24-hour` whether pressed or not.
  - The digital time must not be announced every second. Don't put it in a live region.
  - In analog mode, a visually hidden text inside the `<time>` element gives screen reader users the time.
  - Each hand has `role="img"` and an `aria-label` that states its angle (see Test contract). That also lets tests check your maths without reading CSS.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Focus the `24-hour` toggle (digital mode) |
  | `Enter` / `Space` | Toggle 12h / 24h (native button behaviour) |

- **Performance:** at most one timer running per clock, and one render per second. Hands rotate with `transform: rotate()` (compositor-friendly), not by changing `top`/`left`.
- **Styling:** tabular numbers (`font-variant-numeric: tabular-nums`) so digits don't jiggle, and a circular face with the hands pivoting from the centre (`transform-origin`).

## Constraints
- 40 minutes. React and CSS Modules only. No date libraries.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type ClockMode = 'digital' | 'analog';

interface ClockProps {
  mode: ClockMode;
  now?: () => Date;   // default () => new Date()
  timeZone?: string;  // follow-up 1
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Each clock renders exactly one `<time>` element. Its `dateTime` attribute is `HH:MM:SS` in 24-hour format.
- **Digital:** the `<time>` element's text content (whitespace-normalised) contains `HH:MM:SS` in 24-hour mode, or `hh:MM:SS AM` / `hh:MM:SS PM` in 12-hour mode.
- **Digital:** a `button` named `24-hour` with `aria-pressed="true"` by default and `"false"` after one click.
- **Analog:** three elements with role `img` named `Hour hand at N degrees`, `Minute hand at N degrees` and `Second hand at N degrees`. `N` is a number from 0 up to (not including) 360. It may be rounded to one decimal place.
- Tests use `vi.useFakeTimers()` with `vi.setSystemTime(...)`, and also pass `now` explicitly. The tolerance is ±0.5° for the hour hand and ±0.1° for the other two.
- Tests check `vi.getTimerCount()` is `0` after unmount.

## Edge cases
- Mounting at `14:05:09.700`: the display must read `14:05:10` about 300 ms later, not 1000 ms later.
- A browser tab in the background throttles timers. When it wakes, the next tick must show the correct time rather than "catching up" one second at a time.
- An inline `now={() => …}` prop is a new function every render. Your effect must not tear down and restart its timer on every render because of it.
- Midnight rollover from `23:59:59` to `00:00:00`: the hour hand goes from almost 360° back to 0°. If you animate rotation with a CSS transition, the hand spins backwards all the way round. Say how you'd avoid that.

## Follow-ups
1. **World clock.** Add a `timeZone` prop (an IANA name like `Asia/Tokyo`) and show the time in that zone, for both modes and for `dateTime`. Use `Intl.DateTimeFormat` with `formatToParts`, not hand-written offsets, because of daylight saving time. Then render a row of clocks for several cities.
2. **Smooth sweeping second hand.** In analog mode, make the second hand sweep continuously using `requestAnimationFrame`, including milliseconds. Update the hand's transform through a ref instead of React state so you don't re-render 60 times a second. Pause when the tab is hidden.
3. **7-segment digits.** Draw each digit as seven segments that turn on and off (the GreatFrontEnd Digital Clock look), built from CSS only, with the digits still readable by screen readers.
4. **Alarm.** Let the user set an alarm time. When the clock reaches it, show an `alert` exactly once, even if the tab was asleep across the exact second.

## Concepts covered
Timers aligned to the wall clock (a `setTimeout` chain vs `setInterval`) · effect cleanup · injecting `now()` for deterministic tests · deriving display strings and angles from a single `Date` · `<time dateTime>` · compositor-friendly `transform: rotate()` · `aria-pressed` toggle buttons.

Related: J07 Stopwatch & Countdown · J06 Traffic Light · J10 Progress Bar.
