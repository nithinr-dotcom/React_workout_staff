# Timer utilities: sleep, setInterval via setTimeout, clearAllTimeouts, fake clock

## Problem statement
Timers look simple until an interviewer asks you to rebuild them. This task bundles the timer questions that keep showing up in frontend rounds:

1. **`sleep(ms, { signal })`**: a promise that resolves after `ms` and can be cancelled with an `AbortSignal`. It's the warm-up.
2. **`mySetInterval(fn, ms)` / `myClearInterval(id)`**: `setInterval`, built only on `setTimeout`. The catch is that a simple `setTimeout` chain drifts: every late callback pushes all later ones back.
3. **`createPausableInterval(fn, ms)`**: an interval you can pause and resume without losing your place in the current period, like a slideshow or an OTP resend countdown.
4. **`trackedSetTimeout` / `trackedClearTimeout` / `clearAllTimeouts()`**: a `setTimeout` wrapper that remembers every pending timeout, so one call can cancel them all.
5. **`createFakeClock()`**: your own tiny version of the fake timers that Jest and Vitest give you. It has `setTimeout`, `clearTimeout`, `now()` and `tick(ms)`, and `tick` runs due timers in time order, including timers scheduled while it runs.

## Clarifying questions to ask
- What does `sleep` reject with? *(A `DOMException` whose `name` is `'AbortError'`, both when the signal is already aborted and when it aborts while waiting.)*
- When is `fn` first called by `mySetInterval`? *(After `ms`, like the native one. Not immediately.)*
- What does "no drift" mean exactly? *(Call number `n` is scheduled for `start + n * ms`, measured with `Date.now()` or `performance.now()`. One late callback can make the next call late, but lateness must not add up over time.)*
- What should `myClearInterval` accept? *(The id returned by `mySetInterval`, which must stay the same for the whole life of the interval. Unknown ids and `undefined` are a no-op.)*
- When does a pausable interval start? *(Immediately when it's created, with the first call after `ms`.)*
- What does `clearAllTimeouts` clear? *(Only timeouts created through `trackedSetTimeout` that haven't run or been cleared yet. It doesn't patch `window.setTimeout`; that's follow-up 3.)*
- Where does the fake clock start, and what order do timers run in? *(At `startTime`, default `0`. Earliest due time first. Timers due at the same time run in the order they were created.)*

## Functional requirements
### sleep
- [ ] `sleep(ms)` resolves with `undefined` after `ms` milliseconds.
- [ ] If `signal` is already aborted, the promise rejects with an `AbortError` and no timer is left behind.
- [ ] If `signal` aborts while waiting, the promise rejects with an `AbortError` and clears its timer.

### mySetInterval / myClearInterval
- [ ] `mySetInterval(fn, ms)` calls `fn` every `ms` milliseconds, starting `ms` after the call. Returns a numeric id.
- [ ] Uses only `setTimeout` and `clearTimeout`. The native `setInterval` must never be called.
- [ ] Call `n` is aimed at `start + n * ms`, so the delays don't accumulate when callbacks run late.
- [ ] `myClearInterval(id)` stops the interval, and no timer is left pending. This must also work when called **from inside `fn`**.
- [ ] Unknown ids and `undefined` are a no-op. Separate intervals are independent.

### createPausableInterval
- [ ] Starts ticking immediately, calling `fn` every `ms`.
- [ ] `pause()` stops it and remembers how much of the current period was left. Pausing twice is a no-op.
- [ ] `resume()` calls `fn` after the remembered remaining time, then continues every `ms`. Resuming when not paused is a no-op and must not create a second timer.
- [ ] `clear()` stops it for good. After `clear()`, `resume()` does nothing and no timer is pending.

### trackedSetTimeout / clearAllTimeouts
- [ ] `trackedSetTimeout(fn, ms, ...args)` behaves like `setTimeout`: it calls `fn(...args)` after `ms` and returns an id.
- [ ] `trackedClearTimeout(id)` cancels one tracked timeout.
- [ ] `clearAllTimeouts()` cancels every pending tracked timeout. Timeouts created afterwards work normally.

### createFakeClock
- [ ] `createFakeClock(startTime = 0)` returns a clock whose `now()` starts at `startTime`.
- [ ] `clock.setTimeout(fn, ms = 0, ...args)` never runs anything by itself. It returns a unique positive id.
- [ ] `clock.tick(ms)` runs every timer due at or before `now() + ms`, earliest first, ties in creation order. Afterwards `now()` is exactly the old `now() + ms`.
- [ ] While a timer's callback runs, `now()` returns that timer's due time.
- [ ] Timers scheduled by a callback during `tick` also run in the same `tick` if they're due inside the window, in the right order relative to the timers already waiting.
- [ ] `clock.clearTimeout(id)` cancels a pending timer, including when called from another callback during `tick`. Unknown ids and `undefined` are a no-op.
- [ ] The fake clock never uses the real `setTimeout`.

## Non-functional requirements
- No libraries.
- **No leaks:** every settled, cleared or fired timer is forgotten. `trackedSetTimeout` must not keep ids of timeouts that already ran, and `sleep` removes its abort listener.
- **Late binding:** call the global `setTimeout` when a timer is created, not a copy saved when the module loads. The tests install fake timers per test.
- **Fake clock performance:** `tick(10_000)` with a few timers must not loop once per millisecond.
- **Types:** keep the signatures in `types.ts`.

## Constraints
- 75 minutes.
- Export `sleep`, `mySetInterval`, `myClearInterval`, `createPausableInterval`, `trackedSetTimeout`, `trackedClearTimeout`, `clearAllTimeouts` and `createFakeClock` as named exports from `Solution.ts`.
- Don't use `setInterval` anywhere.

## Data / API contract
```ts
type TimerCallback = (...args: any[]) => void;
type TimeoutId = ReturnType<typeof setTimeout>;

interface PausableInterval {
  pause(): void;
  resume(): void;
  clear(): void;
}

interface FakeClock {
  setTimeout(fn: TimerCallback, ms?: number, ...args: unknown[]): number;
  clearTimeout(id: number | undefined): void;
  now(): number;
  tick(ms: number): void;
  setInterval(fn: TimerCallback, ms: number, ...args: unknown[]): number; // follow-up 1
  clearInterval(id: number | undefined): void;                          // follow-up 1
  runAll(): number;                                                      // follow-up 2
}

function sleep(ms: number, options?: { signal?: AbortSignal }): Promise<void>;
function mySetInterval(fn: () => void, ms: number): number;
function myClearInterval(id: number | undefined): void;
function createPausableInterval(fn: () => void, ms: number): PausableInterval;
function trackedSetTimeout(fn: TimerCallback, ms?: number, ...args: unknown[]): TimeoutId;
function trackedClearTimeout(id: TimeoutId | undefined): void;
function clearAllTimeouts(): void;
function createFakeClock(startTime?: number): FakeClock;
```

## Test contract
- Tests import every function as a **named export** and use `vi.useFakeTimers()` with `vi.advanceTimersByTime` / `vi.advanceTimersByTimeAsync`.
- "No timer left behind" is checked with `vi.getTimerCount() === 0`.
- A spy on `globalThis.setInterval` must never be called.
- The drift test replaces `Date.now` and `performance.now` with a clock that runs 30ms further ahead after every callback. Measure elapsed time with either of them. The first five calls must each be within 35ms of `n * ms`.
- An abort is recognised by `error.name === 'AbortError'`.
- Fake clock tests drive time only through the clock's own methods, and check that `vi.getTimerCount()` stays `0`.
- Follow-up tests (`npm run test:followups -- s42`):
  - **1:** `clock.setInterval` / `clock.clearInterval`.
  - **2:** `clock.runAll()` returns the number of timers it ran and throws on a timer that reschedules itself forever.

## Edge cases
- `sleep(0)` still resolves asynchronously.
- `myClearInterval` called inside `fn` for its own id: no extra call may follow.
- A callback slower than `ms`: the next call happens as soon as possible, not twice to catch up.
- Pausing right after a callback ran (a full period left) and pausing just before one (almost nothing left).
- `trackedClearTimeout` on a timeout that already fired.
- Fake clock: a callback scheduling `clock.setTimeout(fn, 0)` during `tick` runs it in the same `tick`; `tick(0)` runs timers due exactly now.
- Fake clock: a callback that throws. What happens to `now()` and the remaining timers? *(Not tested; decide and say.)*

## Follow-ups
1. **Fake intervals.** Add `clock.setInterval(fn, ms, ...args)` and `clock.clearInterval(id)`. An interval re-queues itself after each run and keeps its place in time order relative to timeouts. What should `setInterval(fn, 0)` do inside `tick`?
2. **`runAll()` with a loop guard.** Add `clock.runAll()`, which keeps running the earliest timer (moving `now()` to it) until none are left, and returns how many ran. A timer that keeps rescheduling itself must not hang the test: throw after 1,000 timers. Compare with `vi.runAllTimers()` and `vi.runOnlyPendingTimers()`.
3. **Patch the real global.** The BFE and Dream11 versions of `clearAllTimeouts` patch `window.setTimeout` and `window.clearTimeout` directly. Implement `installTimeoutTracking()` that returns an `uninstall` function. What breaks when a third-party script, React or your test runner also creates timeouts? How do you restore the originals safely if two libraries patch in a different order?
4. **Background tabs.** Browsers throttle timers in hidden tabs to about once per second, or less. When the tab becomes visible again, should your drift-free interval fire all the missed calls, fire once, or skip to the next slot? Add an option for it and use `document.visibilityState` in the discussion.
5. **React.** Write `useInterval(callback, delay | null)` on top of `createPausableInterval`: the latest callback is always used without restarting the timer, and `null` pauses. Why does putting `callback` in the effect's dependency array cause drift?

## Concepts covered
`setTimeout` chains vs `setInterval` · timer drift and scheduling against absolute time · AbortSignal cleanup · pause/resume state machines · stable ids over changing timer handles · monkey-patching and tracking resources · how fake timers work (a time-ordered queue) · re-entrancy during `tick`.

Related: J23 debounce · J24 throttle · J07 Stopwatch & countdown · S32 retry with backoff (abortable sleep).
